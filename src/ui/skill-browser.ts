import prompts from 'prompts';
import chalk from 'chalk';
import path from 'path';
import { SkillCandidate, DirectoryEntry, getDirectoryEntries } from '../lib/skill/explorer';

interface BrowseAction {
  action: 'navigate' | 'toggle' | 'confirm' | 'cancel';
  path?: string;
  entry?: DirectoryEntry;
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

    // Build choices
    const choices: { title: string; description?: string; value: BrowseAction }[] = [];

    // ⬆️ Back to parent (only when not at root)
    if (currentPath) {
      choices.push({
        title: chalk.gray('⬆️  ..'),
        description: 'back',
        value: { action: 'navigate', path: path.dirname(currentPath) === '.' ? '' : path.dirname(currentPath) }
      });
    }

    // 📁 Browsable directories
    for (const entry of entries) {
      if (entry.type === 'directory') {
        choices.push({
          title: `📁 ${entry.name}`,
          description: entry.description || undefined,
          value: { action: 'navigate', path: entry.path }
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
        choices.push({
          title: `${check} ${icon} ${nameDisplay}`,
          description: entry.description || `Path: ${entry.path}`,
          value: { action: 'toggle', path: entry.path, entry }
        });
      }
    }

    // ✅ Confirm (with count)
    const selectedCount = selected.size;
    choices.push({
      title: selectedCount > 0
        ? chalk.green(`✅ Confirm download (${selectedCount} selected)`)
        : chalk.gray(`✅ Confirm download (${selectedCount} selected)`),
      value: { action: 'confirm' }
    });

    // ❌ Cancel
    choices.push({
      title: chalk.red('❌ Cancel'),
      value: { action: 'cancel' }
    });

    const { choice } = await prompts({
      type: 'select',
      name: 'choice',
      message: `Browse & select skills:`,
      choices,
      hint: 'Navigate directories or toggle selections'
    });

    // Ctrl+C or no choice
    if (!choice) {
      return [];
    }

    switch (choice.action) {
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
