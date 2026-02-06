import path from 'path';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import { SkillSource, SkillInfo } from './schema';

const git = simpleGit();

export async function downloadSkill(
  source: SkillSource,
  targetDir: string,
  skillId: string
): Promise<SkillInfo> {
  const skillPath = path.join(targetDir, skillId);

  if (source.type === 'git') {
    return downloadFromGit(source, skillPath, skillId);
  } else if (source.type === 'local') {
    return copyFromLocal(source, skillPath, skillId);
  } else {
    throw new Error(`Unsupported source type: ${source.type}`);
  }
}

async function downloadFromGit(
  source: SkillSource,
  targetPath: string,
  skillId: string
): Promise<SkillInfo> {
  // Ensure parent directory exists
  await fs.ensureDir(path.dirname(targetPath));

  // Remove existing if present
  if (await fs.pathExists(targetPath)) {
    await fs.remove(targetPath);
  }

  // Clone repository
  const cloneOptions: string[] = ['--depth', '1'];
  if (source.branch) {
    cloneOptions.push('--branch', source.branch);
  }

  await git.clone(source.url, targetPath, cloneOptions);

  // If subdir specified, move contents up
  if (source.subdir) {
    const subdirPath = path.join(targetPath, source.subdir);
    if (await fs.pathExists(subdirPath)) {
      const tempPath = `${targetPath}_temp`;
      await fs.move(subdirPath, tempPath);
      await fs.remove(targetPath);
      await fs.move(tempPath, targetPath);
    }
  }

  // Remove .git folder to save space
  const gitDir = path.join(targetPath, '.git');
  if (await fs.pathExists(gitDir)) {
    await fs.remove(gitDir);
  }

  return {
    id: skillId,
    name: skillId,
    source,
    localPath: targetPath
  };
}

async function copyFromLocal(
  source: SkillSource,
  targetPath: string,
  skillId: string
): Promise<SkillInfo> {
  const sourcePath = source.subdir
    ? path.join(source.url, source.subdir)
    : source.url;

  if (!(await fs.pathExists(sourcePath))) {
    throw new Error(`Source path not found: ${sourcePath}`);
  }

  await fs.ensureDir(path.dirname(targetPath));

  if (await fs.pathExists(targetPath)) {
    await fs.remove(targetPath);
  }

  await fs.copy(sourcePath, targetPath);

  return {
    id: skillId,
    name: skillId,
    source,
    localPath: targetPath
  };
}

export async function skillExists(targetDir: string, skillId: string): Promise<boolean> {
  const skillPath = path.join(targetDir, skillId);
  return fs.pathExists(skillPath);
}

export async function removeSkill(targetDir: string, skillId: string): Promise<void> {
  const skillPath = path.join(targetDir, skillId);
  if (await fs.pathExists(skillPath)) {
    await fs.remove(skillPath);
  }
}

export async function listLocalSkills(targetDir: string): Promise<string[]> {
  if (!(await fs.pathExists(targetDir))) {
    return [];
  }

  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
}
