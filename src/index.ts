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
  .description('Download a skill from git repository')
  .option('-b, --branch <branch>', 'Git branch')
  .option('-s, --subdir <subdir>', 'Subdirectory in the repository')
  .option('-i, --id <id>', 'Skill ID (folder name)')
  .option('-l, --link', 'Create symlinks after download')
  .action(async (url: string, options: any) => {
    try {
      const skillId = options.id || path.basename(url, '.git').replace(/^skill-/, '');
      const targetDir = path.join(process.cwd(), SKILLS_DIR);

      const source: SkillSource = {
        type: 'git',
        url,
        branch: options.branch,
        subdir: options.subdir
      };

      if (await skillExists(targetDir, skillId)) {
        const { overwrite } = await prompts({
          type: 'confirm',
          name: 'overwrite',
          message: `Skill "${skillId}" exists. Overwrite?`,
          initial: false
        });
        if (!overwrite) {
          console.log(chalk.yellow('Cancelled'));
          return;
        }
      }

      console.log(chalk.blue(`Downloading skill "${skillId}"...`));
      const skill = await downloadSkill(source, targetDir, skillId);
      console.log(chalk.green(`✓ Downloaded to: ${skill.localPath}`));

      if (options.link) {
        for (const ide of SUPPORTED_IDES) {
          try {
            const link = await linkSkillToIDE(skill.localPath!, skillId, ide);
            console.log(chalk.green(`✓ Linked to ${ide}: ${link.targetPath}`));
          } catch (err: any) {
            console.error(chalk.red(`✗ Failed to link to ${ide}: ${err.message}`));
          }
        }
      }
    } catch (err: any) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// Link command
program
  .command('link <skill-id>')
  .description('Create symlinks for a skill')
  .option('--claude', 'Link to .claude/skills')
  .option('--trae', 'Link to .trae/skills')
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
  .option('-a, --all', 'Unlink from all IDEs')
  .action(async (skillId: string, options: any) => {
    try {
      let ides: IDEType[] = [];
      if (options.all) {
        ides = [...SUPPORTED_IDES];
      } else {
        if (options.claude) ides.push('claude');
        if (options.trae) ides.push('trae');
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
