import prompts from 'prompts';
import chalk from 'chalk';
import path from 'path';
import { SkillCandidate, DirectoryEntry, getDirectoryEntries } from '../lib/skill/explorer';

interface BrowseAction {
  action: 'navigate' | 'toggle' | 'toggle_all' | 'confirm' | 'cancel' | 'search';
  isAction: boolean;
  path?: string;
  entry?: DirectoryEntry;
}

interface BrowseChoice {
  title: string;
  description?: string;
  value: BrowseAction;
  searchName?: string;
  searchDescription?: string;
}

function suggestChoices(input: string, choices: BrowseChoice[]): BrowseChoice[] {
  if (!input) return choices;
  const query = input.toLowerCase();
  return choices.filter(choice => {
    const name = (choice.searchName || '').toLowerCase();
    const desc = (choice.searchDescription || '').toLowerCase();
    return name.includes(query) || desc.includes(query);
  });
}

/**
 * Interactive directory browser for selecting skills from a repository
 * Returns selected SkillCandidate[] for download
 */
export async function browseAndSelect(tempPath: string): Promise<SkillCandidate[]> {
  let currentPath = '';
  const selected = new Set<string>();
  const candidateMap = new Map<string, DirectoryEntry>();

  while (true) {
    const entries = await getDirectoryEntries(tempPath, currentPath);

    // Show current path
    const displayPath = currentPath || '(root)';
    console.log(chalk.cyan(`\n📍 ${displayPath}`));

    if (entries.length === 0) {
      console.log(chalk.yellow('  empty directory'));
      // Auto-navigate back if empty
      if (currentPath) {
        currentPath = path.dirname(currentPath);
        if (currentPath === '.') currentPath = '';
        continue;
      }
      return [];
    }

    // Cache entries for later use
    for (const entry of entries) {
      candidateMap.set(entry.path, entry);
    }

    // Build content choices (used by both main select and search autocomplete)
    const contentChoices: BrowseChoice[] = [];

    // 📁 Browsable directories
    for (const entry of entries) {
      if (entry.type === 'directory') {
        contentChoices.push({
          title: `📁 ${entry.name}`,
          description: entry.description || undefined,
          value: { action: 'navigate', isAction: false, path: entry.path },
          searchName: entry.name,
          searchDescription: entry.description
        });
      }
    }

    // ✨ Skills and 📄 Resources (selectable)
    for (const entry of entries) {
      if (entry.type === 'skill' || entry.type === 'resource') {
        const isSelected = selected.has(entry.path);
        const check = isSelected ? chalk.green('◉') : chalk.gray('◯');
        const icon = entry.type === 'skill' ? '✨' : '📄';
        const nameDisplay = isSelected ? chalk.green(entry.name) : entry.name;
        contentChoices.push({
          title: `${check} ${icon} ${nameDisplay}`,
          description: entry.description || `Path: ${entry.path}`,
          value: { action: 'toggle', isAction: false, path: entry.path, entry },
          searchName: entry.name,
          searchDescription: entry.description
        });
      }
    }

    // Build main select choices
    const choices: BrowseChoice[] = [];

    // ⬆️ Back to parent (only when not at root)
    if (currentPath) {
      choices.push({
        title: chalk.gray('⬆️  ..'),
        description: 'back',
        value: { action: 'navigate', isAction: true, path: path.dirname(currentPath) === '.' ? '' : path.dirname(currentPath) }
      });
    }

    // 🔍 Search (only when there are content items to search)
    if (contentChoices.length > 0) {
      choices.push({
        title: chalk.blue(`🔍 Search (${contentChoices.length} items)`),
        description: 'type to filter by name or description',
        value: { action: 'search' as const, isAction: true }
      });
    }

    // Add content choices to main list
    choices.push(...contentChoices);

    // 🔘 Toggle all (only when there are selectable items in current level)
    const selectableEntries = entries.filter(e => e.type === 'skill' || e.type === 'resource');
    if (selectableEntries.length > 0) {
      const allSelected = selectableEntries.every(e => selected.has(e.path));
      choices.push({
        title: allSelected
          ? chalk.yellow(`🔘 Deselect all (${selectableEntries.length} items)`)
          : chalk.yellow(`🔘 Select all (${selectableEntries.length} items)`),
        value: { action: 'toggle_all' as const, isAction: true }
      });
    }

    // ✅ Confirm (with count)
    const selectedCount = selected.size;
    choices.push({
      title: selectedCount > 0
        ? chalk.green(`✅ Confirm download (${selectedCount} selected)`)
        : chalk.gray(`✅ Confirm download (${selectedCount} selected)`),
      value: { action: 'confirm', isAction: true }
    });

    // ❌ Cancel
    choices.push({
      title: chalk.red('❌ Cancel'),
      value: { action: 'cancel', isAction: true }
    });

    let forceConfirm = false;
    const onKeypress = (_ch: string, key: any) => {
      if (key?.name === 'tab') {
        forceConfirm = true;
        process.nextTick(() => {
          process.stdin.emit('keypress', '\r', { name: 'return' });
        });
      }
    };
    process.stdin.on('keypress', onKeypress);

    const { choice } = await prompts({
      type: 'select',
      name: 'choice',
      message: `Browse & select skills:`,
      choices,
      hint: '↑↓ navigate, Enter select, Tab confirm'
    });

    process.stdin.removeListener('keypress', onKeypress);

    if (forceConfirm) {
      if (selected.size === 0) {
        console.log(chalk.yellow('  No items selected yet'));
      } else {
        return Array.from(selected).map(selectedPath => {
          const entry = candidateMap.get(selectedPath)!;
          return {
            name: entry.name,
            path: entry.path,
            hasSkillFile: entry.type === 'skill',
            description: entry.description
          };
        });
      }
      continue;
    }

    // Ctrl+C or no choice
    if (!choice) {
      return [];
    }

    switch (choice.action) {
      case 'search': {
        const { searchChoice } = await prompts({
          type: 'autocomplete',
          name: 'searchChoice',
          message: 'Search skills:',
          choices: contentChoices,
          suggest: (input: string, choices: BrowseChoice[]) => Promise.resolve(suggestChoices(input, choices)),
          limit: 20,
          hint: 'Type to filter, ↑↓ navigate, Enter select, Esc cancel'
        } as any);
        if (searchChoice) {
          if (searchChoice.action === 'navigate') {
            currentPath = searchChoice.path || '';
          } else if (searchChoice.action === 'toggle' && searchChoice.path) {
            if (selected.has(searchChoice.path)) {
              selected.delete(searchChoice.path);
            } else {
              selected.add(searchChoice.path);
            }
          }
        }
        break;
      }

      case 'navigate':
        currentPath = choice.path || '';
        break;

      case 'toggle':
        if (choice.path) {
          if (selected.has(choice.path)) {
            selected.delete(choice.path);
          } else {
            selected.add(choice.path);
          }
        }
        break;

      case 'toggle_all': {
        const currentSelectables = entries.filter(e => e.type === 'skill' || e.type === 'resource');
        const allCurrentSelected = currentSelectables.every(e => selected.has(e.path));
        for (const entry of currentSelectables) {
          if (allCurrentSelected) {
            selected.delete(entry.path);
          } else {
            selected.add(entry.path);
          }
        }
        break;
      }

      case 'confirm':
        if (selected.size === 0) {
          console.log(chalk.yellow('  No items selected yet'));
          break;
        }
        // Convert selected paths to SkillCandidate[]
        return Array.from(selected).map(selectedPath => {
          const entry = candidateMap.get(selectedPath)!;
          return {
            name: entry.name,
            path: entry.path,
            hasSkillFile: entry.type === 'skill',
            description: entry.description
          };
        });

      case 'cancel':
        return [];
    }
  }
}
