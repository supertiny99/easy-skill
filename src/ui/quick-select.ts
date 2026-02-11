import prompts from 'prompts';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { downloadSkill, listLocalSkills, skillExists, removeSkill } from '../lib/skill/downloader';
import { linkSkillToIDE, unlinkSkillFromIDE, getLinkedSkills, checkSymlinkStatus, SUPPORTED_IDES } from '../lib/skill/linker';
import { getRemoteBranches, exploreRepository, copySkillFromExplore, cleanupExplore } from '../lib/skill/explorer';
import { browseAndSelect } from './skill-browser';
import { SkillSource, IDEType } from '../lib/skill/schema';

const SKILLS_DIR = 'skills';

export async function quickSelect(): Promise<void> {
  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      { title: '📥 Download skill', value: 'download' },
      { title: '🔗 Link skill to IDE', value: 'link' },
      { title: '🗑️  Unlink skill from IDE', value: 'unlink' },
      { title: '📋 List skills', value: 'list' },
      { title: '❌ Remove skill', value: 'remove' },
      { title: '🚪 Exit', value: 'exit' }
    ]
  });

  if (!action || action === 'exit') return;

  switch (action) {
    case 'download':
      await downloadAction();
      break;
    case 'link':
      await linkAction();
      break;
    case 'unlink':
      await unlinkAction();
      break;
    case 'list':
      await listAction();
      break;
    case 'remove':
      await removeAction();
      break;
  }
}

async function downloadAction(): Promise<void> {
  const { sourceType } = await prompts({
    type: 'select',
    name: 'sourceType',
    message: 'Select source type:',
    choices: [
      { title: '🐙 Git repository (smart explore)', value: 'git' },
      { title: '📁 Local directory', value: 'local' }
    ]
  });

  if (!sourceType) return;

  if (sourceType === 'git') {
    await downloadFromGitAction();
  } else {
    await downloadFromLocalAction();
  }
}

async function downloadFromGitAction(): Promise<void> {
  // Step 1: Get Git URL
  const { url } = await prompts({
    type: 'text',
    name: 'url',
    message: 'Git repository URL:',
    validate: (val: string) => val.trim().length > 0 || 'URL is required'
  });

  if (!url) return;

  // Step 2: Fetch and select branch
  console.log(chalk.blue('\n🔍 Fetching branches...'));
  let selectedBranch: string | undefined;

  try {
    const branches = await getRemoteBranches(url);
    if (branches.length > 1) {
      const { branch } = await prompts({
        type: 'select',
        name: 'branch',
        message: 'Select branch:',
        choices: branches.map(b => ({
          title: b.isDefault ? `⭐ ${b.name} (default)` : `   ${b.name}`,
          value: b.name
        }))
      });
      if (!branch) return;
      selectedBranch = branch;
    } else if (branches.length === 1) {
      selectedBranch = branches[0].name;
      console.log(chalk.gray(`  Using branch: ${selectedBranch}`));
    }
  } catch (err: any) {
    console.log(chalk.yellow(`  Could not fetch branches: ${err.message}`));
    console.log(chalk.gray('  Will use default branch'));
  }

  // Step 3: Explore repository and find skills
  console.log(chalk.blue('\n🔍 Exploring repository...'));
  let exploreResult;
  try {
    exploreResult = await exploreRepository(url, selectedBranch);
  } catch (err: any) {
    console.error(chalk.red(`Error: ${err.message}`));
    return;
  }

  // Step 4: Interactive directory browser
  const selectedSkills = await browseAndSelect(exploreResult.tempPath);

  if (selectedSkills.length === 0) {
    console.log(chalk.yellow('No skills selected'));
    await cleanupExplore(exploreResult.tempPath);
    return;
  }

  const targetDir = path.join(process.cwd(), SKILLS_DIR);

  // Step 5: Pre-check for conflicts and let user resolve
  const skillsToInstall: { skill: typeof selectedSkills[0]; finalId: string }[] = [];
  const existingSkills: typeof selectedSkills = [];

  for (const skill of selectedSkills) {
    if (await skillExists(targetDir, skill.name)) {
      existingSkills.push(skill);
    } else {
      skillsToInstall.push({ skill, finalId: skill.name });
    }
  }

  // Handle conflicts if any
  if (existingSkills.length > 0) {
    console.log(chalk.yellow(`\n⚠ ${existingSkills.length} skill(s) already exist:`));
    existingSkills.forEach((s: { name: string }) => console.log(chalk.gray(`   - ${s.name}`)));

    const { conflictAction } = await prompts({
      type: 'select',
      name: 'conflictAction',
      message: 'How to handle existing skills?',
      choices: [
        { title: '🔄 Overwrite all', value: 'overwrite' },
        { title: '✏️ Rename conflicting skills', value: 'rename' },
        { title: '⏭️ Skip existing, install new only', value: 'skip' },
        { title: '↩️ Go back and reselect', value: 'reselect' },
        { title: '❌ Cancel', value: 'cancel' }
      ]
    });

    if (!conflictAction || conflictAction === 'cancel') {
      await cleanupExplore(exploreResult.tempPath);
      return;
    }

    if (conflictAction === 'reselect') {
      // Recursive call to reselect
      return downloadFromGitAction();
    }

    if (conflictAction === 'overwrite') {
      for (const skill of existingSkills) {
        skillsToInstall.push({ skill, finalId: skill.name });
      }
    } else if (conflictAction === 'rename') {
      for (const skill of existingSkills) {
        const { newName } = await prompts({
          type: 'text',
          name: 'newName',
          message: `Rename "${skill.name}" to:`,
          initial: `${skill.name}-new`,
          validate: async (val: string) => {
            if (!val.trim()) return 'Name is required';
            if (await skillExists(targetDir, val.trim())) return `"${val}" also exists`;
            return true;
          }
        });
        if (newName) {
          skillsToInstall.push({ skill, finalId: newName.trim() });
        }
      }
    }
    // 'skip' - existing skills not added to skillsToInstall
  }

  if (skillsToInstall.length === 0) {
    console.log(chalk.yellow('\nNo skills to install'));
    await cleanupExplore(exploreResult.tempPath);
    return;
  }

  console.log(chalk.blue(`\n📦 Installing ${skillsToInstall.length} skill(s)...`));

  const installedSkills: { path: string; id: string }[] = [];

  // Step 6: Install each skill
  for (const { skill, finalId } of skillsToInstall) {
    console.log(chalk.gray(`  Installing "${finalId}"...`));

    try {
      const destPath = await copySkillFromExplore(
        exploreResult.tempPath,
        skill.path,
        targetDir,
        finalId
      );
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

  // Ask about symlinks for all installed skills
  const { createLinks } = await prompts({
    type: 'confirm',
    name: 'createLinks',
    message: 'Create symlinks to IDE skill directories?',
    initial: true
  });

  if (createLinks) {
    const { ides } = await prompts({
      type: 'multiselect',
      name: 'ides',
      message: 'Select IDEs to link:',
      choices: SUPPORTED_IDES.map(ide => ({
        title: ide === 'claude' ? '🤖 Claude (.claude/skills)'
             : ide === 'trae' ? '🚀 Trae (.trae/skills)'
             : '🌊 Windsurf (.windsurf/skills)',
        value: ide,
        selected: true
      })),
      instructions: false,
      hint: '- Space to select. Return to submit'
    });

    if (ides && ides.length > 0) {
      for (const { path: skillPath, id: skillId } of installedSkills) {
        for (const ide of ides as IDEType[]) {
          try {
            await linkSkillToIDE(skillPath, skillId, ide);
            console.log(chalk.green(`  ✓ ${skillId} -> ${ide}`));
          } catch (err: any) {
            console.error(chalk.red(`  ✗ ${skillId} -> ${ide}: ${err.message}`));
          }
        }
      }
    }
  }
}

async function downloadFromGitManual(url: string, branch?: string): Promise<void> {
  const answers = await prompts([
    {
      type: 'text',
      name: 'subdir',
      message: 'Subdirectory (optional, for monorepos):'
    },
    {
      type: 'text',
      name: 'skillId',
      message: 'Skill ID (folder name):',
      validate: (val: string) => val.trim().length > 0 || 'Skill ID is required'
    }
  ]);

  if (!answers.skillId) return;

  const source: SkillSource = {
    type: 'git',
    url,
    branch: branch || undefined,
    subdir: answers.subdir || undefined
  };

  const targetDir = path.join(process.cwd(), SKILLS_DIR);

  if (await skillExists(targetDir, answers.skillId)) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `Skill "${answers.skillId}" already exists. Overwrite?`,
      initial: false
    });
    if (!overwrite) {
      console.log(chalk.yellow('Cancelled'));
      return;
    }
  }

  console.log(chalk.blue(`\nDownloading skill "${answers.skillId}"...`));

  try {
    const skill = await downloadSkill(source, targetDir, answers.skillId);
    console.log(chalk.green(`✓ Skill downloaded to: ${skill.localPath}`));

    const { createLinks } = await prompts({
      type: 'confirm',
      name: 'createLinks',
      message: 'Create symlinks to IDE skill directories?',
      initial: true
    });

    if (createLinks) {
      await createLinksForSkill(skill.localPath!, answers.skillId);
    }
  } catch (err: any) {
    console.error(chalk.red(`Error: ${err.message}`));
  }
}

async function downloadFromLocalAction(): Promise<void> {
  const answers = await prompts([
    {
      type: 'text',
      name: 'path',
      message: 'Local path:',
      validate: (val: string) => val.trim().length > 0 || 'Path is required'
    },
    {
      type: 'text',
      name: 'skillId',
      message: 'Skill ID (folder name):',
      validate: (val: string) => val.trim().length > 0 || 'Skill ID is required'
    }
  ]);

  if (!answers.path || !answers.skillId) return;

  const source: SkillSource = { type: 'local', url: answers.path };
  const targetDir = path.join(process.cwd(), SKILLS_DIR);

  if (await skillExists(targetDir, answers.skillId)) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `Skill "${answers.skillId}" already exists. Overwrite?`,
      initial: false
    });
    if (!overwrite) {
      console.log(chalk.yellow('Cancelled'));
      return;
    }
  }

  console.log(chalk.blue(`\nDownloading skill "${answers.skillId}"...`));

  try {
    const skill = await downloadSkill(source, targetDir, answers.skillId);
    console.log(chalk.green(`✓ Skill downloaded to: ${skill.localPath}`));

    const { createLinks } = await prompts({
      type: 'confirm',
      name: 'createLinks',
      message: 'Create symlinks to IDE skill directories?',
      initial: true
    });

    if (createLinks) {
      await createLinksForSkill(skill.localPath!, answers.skillId);
    }
  } catch (err: any) {
    console.error(chalk.red(`Error: ${err.message}`));
  }
}

async function createLinksForSkill(skillPath: string, skillId: string): Promise<void> {
  const { ides } = await prompts({
    type: 'multiselect',
    name: 'ides',
    message: 'Select IDEs to link:',
    choices: SUPPORTED_IDES.map(ide => ({
      title: ide === 'claude' ? '🤖 Claude (.claude/skills)'
           : ide === 'trae' ? '🚀 Trae (.trae/skills)'
           : '🌊 Windsurf (.windsurf/skills)',
      value: ide,
      selected: true
    })),
    instructions: false,
    hint: '- Space to select. Return to submit'
  });

  if (!ides || ides.length === 0) {
    console.log(chalk.yellow('No IDEs selected'));
    return;
  }

  for (const ide of ides as IDEType[]) {
    try {
      const link = await linkSkillToIDE(skillPath, skillId, ide);
      console.log(chalk.green(`✓ Linked to ${ide}: ${link.targetPath}`));
    } catch (err: any) {
      console.error(chalk.red(`✗ Failed to link to ${ide}: ${err.message}`));
    }
  }
}

async function linkAction(): Promise<void> {
  const targetDir = path.join(process.cwd(), SKILLS_DIR);
  const skills = await listLocalSkills(targetDir);

  if (skills.length === 0) {
    console.log(chalk.yellow('No skills found. Download a skill first.'));
    return;
  }

  console.log(chalk.gray('  Press [a] to toggle all, [space] to select, [enter] to confirm\n'));

  const { selectedSkills } = await prompts({
    type: 'multiselect',
    name: 'selectedSkills',
    message: 'Select skills to link:',
    choices: skills.map(s => ({ title: `📦 ${s}`, value: s, selected: false })),
    instructions: false,
    hint: '- [space] select, [a] toggle all, [enter] confirm'
  });

  if (!selectedSkills || selectedSkills.length === 0) {
    console.log(chalk.yellow('No skills selected'));
    return;
  }

  // Select IDEs
  const { ides } = await prompts({
    type: 'multiselect',
    name: 'ides',
    message: 'Select IDEs to link:',
    choices: SUPPORTED_IDES.map(ide => ({
      title: ide === 'claude' ? '🤖 Claude (.claude/skills)'
           : ide === 'trae' ? '🚀 Trae (.trae/skills)'
           : '🌊 Windsurf (.windsurf/skills)',
      value: ide,
      selected: true
    })),
    instructions: false,
    hint: '- [space] select, [a] toggle all, [enter] confirm'
  });

  if (!ides || ides.length === 0) {
    console.log(chalk.yellow('No IDEs selected'));
    return;
  }

  console.log(chalk.blue(`\n🔗 Linking ${selectedSkills.length} skill(s) to ${ides.length} IDE(s)...`));

  for (const skillId of selectedSkills) {
    const skillPath = path.join(targetDir, skillId);
    for (const ide of ides as IDEType[]) {
      try {
        await linkSkillToIDE(skillPath, skillId, ide);
        console.log(chalk.green(`  ✓ ${skillId} -> ${ide}`));
      } catch (err: any) {
        console.error(chalk.red(`  ✗ ${skillId} -> ${ide}: ${err.message}`));
      }
    }
  }

  console.log(chalk.green(`\n✓ Linked ${selectedSkills.length} skill(s)`));
}

async function unlinkAction(): Promise<void> {
  // Select IDEs first
  const { ides } = await prompts({
    type: 'multiselect',
    name: 'ides',
    message: 'Select IDEs to unlink from:',
    choices: SUPPORTED_IDES.map(ide => ({
      title: ide === 'claude' ? '🤖 Claude'
           : ide === 'trae' ? '🚀 Trae'
           : '🌊 Windsurf',
      value: ide,
      selected: true
    })),
    instructions: false,
    hint: '- [space] select, [a] toggle all, [enter] confirm'
  });

  if (!ides || ides.length === 0) {
    console.log(chalk.yellow('No IDEs selected'));
    return;
  }

  // Collect all linked skills from selected IDEs
  const allLinks: { skillId: string; ide: IDEType; sourcePath?: string }[] = [];
  for (const ide of ides as IDEType[]) {
    const linkedSkills = await getLinkedSkills(ide);
    for (const link of linkedSkills) {
      allLinks.push({ skillId: link.skillId, ide, sourcePath: link.sourcePath || undefined });
    }
  }

  if (allLinks.length === 0) {
    console.log(chalk.yellow('No skills linked to selected IDEs'));
    return;
  }

  // Dedupe by skillId for display, but track which IDEs
  const skillMap = new Map<string, { ides: IDEType[]; sourcePath?: string }>();
  for (const link of allLinks) {
    if (!skillMap.has(link.skillId)) {
      skillMap.set(link.skillId, { ides: [link.ide], sourcePath: link.sourcePath });
    } else {
      skillMap.get(link.skillId)!.ides.push(link.ide);
    }
  }

  console.log(chalk.gray('  Press [a] to toggle all, [space] to select, [enter] to confirm\n'));

  const { selectedSkills } = await prompts({
    type: 'multiselect',
    name: 'selectedSkills',
    message: 'Select skills to unlink:',
    choices: Array.from(skillMap.entries()).map(([skillId, info]) => ({
      title: `🔗 ${skillId}`,
      description: `IDEs: ${info.ides.join(', ')}`,
      value: skillId,
      selected: false
    })),
    instructions: false,
    hint: '- [space] select, [a] toggle all, [enter] confirm'
  });

  if (!selectedSkills || selectedSkills.length === 0) {
    console.log(chalk.yellow('No skills selected'));
    return;
  }

  console.log(chalk.blue(`\n🔓 Unlinking ${selectedSkills.length} skill(s)...`));

  for (const skillId of selectedSkills) {
    const info = skillMap.get(skillId);
    if (info) {
      for (const ide of info.ides) {
        try {
          await unlinkSkillFromIDE(skillId, ide);
          console.log(chalk.green(`  ✓ ${skillId} <- ${ide}`));
        } catch (err: any) {
          console.error(chalk.red(`  ✗ ${skillId} <- ${ide}: ${err.message}`));
        }
      }
    }
  }

  console.log(chalk.green(`\n✓ Unlinked ${selectedSkills.length} skill(s)`));
}

async function listAction(): Promise<void> {
  const targetDir = path.join(process.cwd(), SKILLS_DIR);
  const skills = await listLocalSkills(targetDir);

  console.log(chalk.bold('\n📦 Local Skills:'));
  if (skills.length === 0) {
    console.log(chalk.gray('  No skills found'));
  } else {
    for (const skillId of skills) {
      console.log(`  - ${skillId}`);

      // Check symlink status for each IDE
      for (const ide of SUPPORTED_IDES) {
        const status = await checkSymlinkStatus(skillId, ide);
        if (status.exists) {
          const icon = status.valid ? chalk.green('✓') : chalk.red('✗');
          console.log(chalk.gray(`      ${icon} ${ide}: linked`));
        }
      }
    }
  }

  // Show linked skills per IDE
  console.log(chalk.bold('\n🔗 IDE Links:'));
  for (const ide of SUPPORTED_IDES) {
    const linkedSkills = await getLinkedSkills(ide);
    const ideName = ide === 'claude' ? 'Claude'
                  : ide === 'trae' ? 'Trae'
                  : 'Windsurf';
    console.log(chalk.cyan(`  ${ideName}:`));
    if (linkedSkills.length === 0) {
      console.log(chalk.gray('    No skills linked'));
    } else {
      for (const link of linkedSkills) {
        const valid = link.sourcePath && await fs.pathExists(link.sourcePath);
        const icon = valid ? chalk.green('✓') : chalk.red('✗');
        console.log(`    ${icon} ${link.skillId}`);
        if (link.sourcePath) {
          console.log(chalk.gray(`      -> ${link.sourcePath}`));
        }
      }
    }
  }
  console.log('');
}

async function removeAction(): Promise<void> {
  const targetDir = path.join(process.cwd(), SKILLS_DIR);
  const skills = await listLocalSkills(targetDir);

  if (skills.length === 0) {
    console.log(chalk.yellow('No skills found.'));
    return;
  }

  const { skillId } = await prompts({
    type: 'select',
    name: 'skillId',
    message: 'Select skill to remove:',
    choices: skills.map(s => ({ title: `📦 ${s}`, value: s }))
  });

  if (!skillId) return;

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

  // Remove symlinks first
  for (const ide of SUPPORTED_IDES) {
    const status = await checkSymlinkStatus(skillId, ide);
    if (status.exists) {
      await unlinkSkillFromIDE(skillId, ide);
      console.log(chalk.gray(`  Unlinked from ${ide}`));
    }
  }

  // Remove skill directory
  await removeSkill(targetDir, skillId);
  console.log(chalk.green(`✓ Removed skill "${skillId}"`));
}
