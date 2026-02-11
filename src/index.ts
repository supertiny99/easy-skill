#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import prompts from 'prompts';
import path from 'path';
import fs from 'fs-extra';
import { quickSelect } from './ui/quick-select';
import { downloadSkill, listLocalSkills, removeSkill, skillExists } from './lib/skill/downloader';
import { linkSkillToIDE, unlinkSkillFromIDE, getLinkedSkills, checkSymlinkStatus, SUPPORTED_IDES } from './lib/skill/linker';
import { IDEType, SkillSource } from './lib/skill/schema';
import { exploreRepository, copySkillFromExplore, cleanupExplore, SkillCandidate } from './lib/skill/explorer';

const SKILLS_DIR = 'skills';
const program = new Command();

program
  .name('easy-skill')
  .description('TUI tool for managing skills - download, organize and create symlinks')
  .version('1.0.0');

// Default action: TUI quick select
program
  .action(async () => {
    await quickSelect();
  });

// Download command
program
  .command('download <url>')
  .alias('dl')
  .description('Download skill(s) from git repository (smart explore)')
  .option('-b, --branch <branch>', 'Git branch')
  .option('-s, --subdir <subdir>', 'Subdirectory in the repository')
  .option('-i, --id <id>', 'Skill ID (folder name)')
  .option('-l, --link', 'Create symlinks after download')
  .option('-a, --all', 'Download all discovered skills without prompting')
  .action(async (url: string, options: any) => {
    const targetDir = path.join(process.cwd(), SKILLS_DIR);

    // Precise download: when both --subdir and --id are specified, use legacy direct download
    if (options.subdir && options.id) {
      try {
        const source: SkillSource = { type: 'git', url, branch: options.branch, subdir: options.subdir };
        if (await skillExists(targetDir, options.id)) {
          const { overwrite } = await prompts({ type: 'confirm', name: 'overwrite', message: `Skill "${options.id}" exists. Overwrite?`, initial: false });
          if (!overwrite) { console.log(chalk.yellow('Cancelled')); return; }
        }
        console.log(chalk.blue(`Downloading skill "${options.id}"...`));
        const skill = await downloadSkill(source, targetDir, options.id);
        console.log(chalk.green(`✓ Downloaded to: ${skill.localPath}`));
        if (options.link) {
          for (const ide of SUPPORTED_IDES) {
            try { const link = await linkSkillToIDE(skill.localPath!, options.id, ide); console.log(chalk.green(`✓ Linked to ${ide}: ${link.targetPath}`)); }
            catch (err: any) { console.error(chalk.red(`✗ Failed to link to ${ide}: ${err.message}`)); }
          }
        }
      } catch (err: any) { console.error(chalk.red(`Error: ${err.message}`)); process.exit(1); }
      return;
    }

    // Smart explore mode
    let exploreResult;
    try {
      console.log(chalk.blue('🔍 Exploring repository...'));
      exploreResult = await exploreRepository(url, options.branch);
    } catch (err: any) {
      console.error(chalk.red(`Error exploring repository: ${err.message}`));
      process.exit(1);
    }

    // 0 candidates
    if (exploreResult.skills.length === 0) {
      console.error(chalk.red('No skill candidates found in repository'));
      await cleanupExplore(exploreResult.tempPath);
      process.exit(1);
    }

    let selectedSkills: SkillCandidate[];

    if (exploreResult.skills.length === 1) {
      // 1 candidate: auto-select
      const skill = exploreResult.skills[0];
      console.log(chalk.green(`  Found 1 skill: ${skill.name}${skill.description ? ` - ${skill.description}` : ''}`));
      selectedSkills = [skill];
    } else if (options.all) {
      // --all: select all
      console.log(chalk.green(`  Found ${exploreResult.skills.length} skills, downloading all (--all)`));
      selectedSkills = exploreResult.skills;
    } else {
      // Multiple candidates: interactive multiselect
      console.log(chalk.green(`  Found ${exploreResult.skills.length} skill candidate(s)`));

      const { picked } = await prompts({
        type: 'multiselect',
        name: 'picked',
        message: 'Select skills to download:',
        choices: exploreResult.skills.map(s => ({
          title: s.hasSkillFile ? `✨ ${s.name}` : `📁 ${s.name}`,
          description: s.description || `Path: ${s.path}`,
          value: s,
          selected: false
        })),
        instructions: false,
        hint: '- [space] select, [a] toggle all, [enter] confirm'
      });

      if (!picked || picked.length === 0) {
        console.log(chalk.yellow('No skills selected'));
        await cleanupExplore(exploreResult.tempPath);
        return;
      }
      selectedSkills = picked;
    }

    // Install selected skills
    const installedSkills: { path: string; id: string }[] = [];
    console.log(chalk.blue(`\n📦 Installing ${selectedSkills.length} skill(s)...`));

    for (const skill of selectedSkills) {
      const finalId = options.id && selectedSkills.length === 1 ? options.id : skill.name;

      // Conflict check
      if (await skillExists(targetDir, finalId)) {
        if (options.all) {
          // --all mode: auto-overwrite
        } else {
          const { overwrite } = await prompts({ type: 'confirm', name: 'overwrite', message: `Skill "${finalId}" exists. Overwrite?`, initial: false });
          if (!overwrite) {
            console.log(chalk.yellow(`  Skipped "${finalId}"`));
            continue;
          }
        }
      }

      try {
        const destPath = await copySkillFromExplore(exploreResult.tempPath, skill.path, targetDir, finalId);
        console.log(chalk.green(`  ✓ ${finalId}`));
        installedSkills.push({ path: destPath, id: finalId });
      } catch (err: any) {
        console.error(chalk.red(`  ✗ ${finalId}: ${err.message}`));
      }
    }

    // Cleanup temp directory
    await cleanupExplore(exploreResult.tempPath);

    if (installedSkills.length === 0) {
      console.log(chalk.yellow('\nNo skills were installed'));
      return;
    }

    console.log(chalk.green(`\n✓ Installed ${installedSkills.length} skill(s)`));

    // Link handling
    if (options.link) {
      // --link: auto-link to all IDEs
      for (const { path: skillPath, id: skillId } of installedSkills) {
        for (const ide of SUPPORTED_IDES) {
          try { await linkSkillToIDE(skillPath, skillId, ide); console.log(chalk.green(`  ✓ ${skillId} -> ${ide}`)); }
          catch (err: any) { console.error(chalk.red(`  ✗ ${skillId} -> ${ide}: ${err.message}`)); }
        }
      }
    } else {
      // Prompt for linking
      const { createLinks } = await prompts({ type: 'confirm', name: 'createLinks', message: 'Create symlinks to IDE skill directories?', initial: true });
      if (createLinks) {
        const { ides } = await prompts({
          type: 'multiselect',
          name: 'ides',
          message: 'Select IDEs to link:',
          choices: SUPPORTED_IDES.map(ide => ({
            title: ide === 'claude' ? '🤖 Claude (.claude/skills)' : ide === 'trae' ? '🚀 Trae (.trae/skills)' : '🌊 Windsurf (.windsurf/skills)',
            value: ide,
            selected: true
          })),
          instructions: false,
          hint: '- Space to select. Return to submit'
        });
        if (ides && ides.length > 0) {
          for (const { path: skillPath, id: skillId } of installedSkills) {
            for (const ide of ides as IDEType[]) {
              try { await linkSkillToIDE(skillPath, skillId, ide); console.log(chalk.green(`  ✓ ${skillId} -> ${ide}`)); }
              catch (err: any) { console.error(chalk.red(`  ✗ ${skillId} -> ${ide}: ${err.message}`)); }
            }
          }
        }
      }
    }
  });

// Link command
program
  .command('link <skill-id>')
  .description('Create symlinks for a skill')
  .option('--claude', 'Link to .claude/skills')
  .option('--trae', 'Link to .trae/skills')
  .option('--windsurf', 'Link to .windsurf/skills')
  .option('-a, --all', 'Link to all supported IDEs')
  .action(async (skillId: string, options: any) => {
    try {
      const targetDir = path.join(process.cwd(), SKILLS_DIR);
      const skillPath = path.join(targetDir, skillId);

      if (!(await fs.pathExists(skillPath))) {
        console.error(chalk.red(`Skill "${skillId}" not found in ${SKILLS_DIR}/`));
        process.exit(1);
      }

      let ides: IDEType[] = [];
      if (options.all) {
        ides = [...SUPPORTED_IDES];
      } else {
        if (options.claude) ides.push('claude');
        if (options.trae) ides.push('trae');
        if (options.windsurf) ides.push('windsurf');
      }

      if (ides.length === 0) {
        ides = [...SUPPORTED_IDES]; // Default to all
      }

      for (const ide of ides) {
        try {
          const link = await linkSkillToIDE(skillPath, skillId, ide);
          console.log(chalk.green(`✓ Linked to ${ide}: ${link.targetPath}`));
        } catch (err: any) {
          console.error(chalk.red(`✗ Failed to link to ${ide}: ${err.message}`));
        }
      }
    } catch (err: any) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// Unlink command
program
  .command('unlink <skill-id>')
  .description('Remove symlinks for a skill')
  .option('--claude', 'Unlink from .claude/skills')
  .option('--trae', 'Unlink from .trae/skills')
  .option('--windsurf', 'Unlink from .windsurf/skills')
  .option('-a, --all', 'Unlink from all IDEs')
  .action(async (skillId: string, options: any) => {
    try {
      let ides: IDEType[] = [];
      if (options.all) {
        ides = [...SUPPORTED_IDES];
      } else {
        if (options.claude) ides.push('claude');
        if (options.trae) ides.push('trae');
        if (options.windsurf) ides.push('windsurf');
      }

      if (ides.length === 0) {
        ides = [...SUPPORTED_IDES];
      }

      for (const ide of ides) {
        const status = await checkSymlinkStatus(skillId, ide);
        if (status.exists) {
          await unlinkSkillFromIDE(skillId, ide);
          console.log(chalk.green(`✓ Unlinked from ${ide}`));
        } else {
          console.log(chalk.gray(`  Not linked to ${ide}`));
        }
      }
    } catch (err: any) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .alias('ls')
  .description('List all skills and their links')
  .action(async () => {
    try {
      const targetDir = path.join(process.cwd(), SKILLS_DIR);
      const skills = await listLocalSkills(targetDir);

      console.log(chalk.bold('\n📦 Local Skills:'));
      if (skills.length === 0) {
        console.log(chalk.gray('  No skills found'));
      } else {
        for (const skillId of skills) {
          console.log(`  - ${chalk.cyan(skillId)}`);
          for (const ide of SUPPORTED_IDES) {
            const status = await checkSymlinkStatus(skillId, ide);
            if (status.exists) {
              const icon = status.valid ? chalk.green('✓') : chalk.red('✗');
              console.log(chalk.gray(`      ${icon} ${ide}`));
            }
          }
        }
      }

      console.log(chalk.bold('\n🔗 IDE Links:'));
      for (const ide of SUPPORTED_IDES) {
        const linkedSkills = await getLinkedSkills(ide);
        console.log(chalk.cyan(`  ${ide}:`));
        if (linkedSkills.length === 0) {
          console.log(chalk.gray('    No skills linked'));
        } else {
          for (const link of linkedSkills) {
            const valid = link.sourcePath && await fs.pathExists(link.sourcePath);
            const icon = valid ? chalk.green('✓') : chalk.red('✗');
            console.log(`    ${icon} ${link.skillId}`);
          }
        }
      }
      console.log('');
    } catch (err: any) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// Remove command
program
  .command('remove <skill-id>')
  .alias('rm')
  .description('Remove a skill and its symlinks')
  .option('-f, --force', 'Skip confirmation')
  .action(async (skillId: string, options: any) => {
    try {
      const targetDir = path.join(process.cwd(), SKILLS_DIR);

      if (!(await skillExists(targetDir, skillId))) {
        console.error(chalk.red(`Skill "${skillId}" not found`));
        process.exit(1);
      }

      if (!options.force) {
        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: `Remove skill "${skillId}" and its symlinks?`,
          initial: false
        });
        if (!confirm) {
          console.log(chalk.yellow('Cancelled'));
          return;
        }
      }

      // Remove symlinks
      for (const ide of SUPPORTED_IDES) {
        const status = await checkSymlinkStatus(skillId, ide);
        if (status.exists) {
          await unlinkSkillFromIDE(skillId, ide);
          console.log(chalk.gray(`  Unlinked from ${ide}`));
        }
      }

      // Remove skill
      await removeSkill(targetDir, skillId);
      console.log(chalk.green(`✓ Removed skill "${skillId}"`));
    } catch (err: any) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

program.parse();
