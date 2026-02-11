import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { IDEType, IDE_SKILL_PATHS, LinkTarget, SUPPORTED_IDES } from './schema';

export function getIDESkillsPath(ide: IDEType, projectRoot?: string): string {
  const basePath = projectRoot || process.cwd();
  return path.join(basePath, IDE_SKILL_PATHS[ide]);
}

export function getGlobalIDESkillsPath(ide: IDEType): string {
  const homeDir = os.homedir();
  return path.join(homeDir, IDE_SKILL_PATHS[ide]);
}

export async function createSymlink(
  sourcePath: string,
  targetPath: string
): Promise<void> {
  const isWindows = process.platform === 'win32';

  // Ensure target parent directory exists
  await fs.ensureDir(path.dirname(targetPath));

  // Remove existing symlink or file
  if (await fs.pathExists(targetPath)) {
    const stat = await fs.lstat(targetPath);
    if (stat.isSymbolicLink() || stat.isFile()) {
      await fs.remove(targetPath);
    } else if (stat.isDirectory()) {
      throw new Error(`Target path is a directory, not a symlink: ${targetPath}`);
    }
  }

  // Create symlink with platform-specific handling
  if (isWindows) {
    try {
      // Windows: Try junction first (no admin privileges required)
      await fs.symlink(sourcePath, targetPath, 'junction');
    } catch (junctionErr: any) {
      try {
        // Fallback to dir symlink (requires admin privileges or developer mode)
        await fs.symlink(sourcePath, targetPath, 'dir');
      } catch (symlinkErr: any) {
        throw new Error(
          `无法创建符号链接到 ${targetPath}\n` +
          `原因: ${symlinkErr.message}\n` +
          `解决方案:\n` +
          `  1. 以管理员身份运行终端\n` +
          `  2. 或启用 Windows 开发者模式（设置 > 更新和安全 > 开发者选项）\n` +
          `  3. 或使用 Windows 10/11 创建者更新及以上版本`
        );
      }
    }
  } else {
    // Unix systems: Use standard dir symlink
    await fs.symlink(sourcePath, targetPath, 'dir');
  }
}

export async function removeSymlink(targetPath: string): Promise<void> {
  if (await fs.pathExists(targetPath)) {
    const stat = await fs.lstat(targetPath);
    if (stat.isSymbolicLink()) {
      await fs.remove(targetPath);
    }
  }
}

export async function linkSkillToIDE(
  skillPath: string,
  skillId: string,
  ide: IDEType,
  projectRoot?: string
): Promise<LinkTarget> {
  const absoluteSkillPath = path.resolve(skillPath);
  const ideSkillsDir = getIDESkillsPath(ide, projectRoot);
  const targetPath = path.join(ideSkillsDir, skillId);

  await createSymlink(absoluteSkillPath, targetPath);

  return {
    ide,
    skillId,
    sourcePath: absoluteSkillPath,
    targetPath
  };
}

export async function unlinkSkillFromIDE(
  skillId: string,
  ide: IDEType,
  projectRoot?: string
): Promise<void> {
  const ideSkillsDir = getIDESkillsPath(ide, projectRoot);
  const targetPath = path.join(ideSkillsDir, skillId);
  await removeSymlink(targetPath);
}

export async function getLinkedSkills(
  ide: IDEType,
  projectRoot?: string
): Promise<{ skillId: string; targetPath: string; sourcePath: string | null }[]> {
  const ideSkillsDir = getIDESkillsPath(ide, projectRoot);

  if (!(await fs.pathExists(ideSkillsDir))) {
    return [];
  }

  const entries = await fs.readdir(ideSkillsDir, { withFileTypes: true });
  const result: { skillId: string; targetPath: string; sourcePath: string | null }[] = [];

  for (const entry of entries) {
    const fullPath = path.join(ideSkillsDir, entry.name);
    let sourcePath: string | null = null;

    if (entry.isSymbolicLink()) {
      try {
        sourcePath = await fs.readlink(fullPath);
      } catch {
        sourcePath = null;
      }
    }

    result.push({
      skillId: entry.name,
      targetPath: fullPath,
      sourcePath
    });
  }

  return result;
}

export async function checkSymlinkStatus(
  skillId: string,
  ide: IDEType,
  projectRoot?: string
): Promise<{ exists: boolean; valid: boolean; sourcePath: string | null }> {
  const ideSkillsDir = getIDESkillsPath(ide, projectRoot);
  const targetPath = path.join(ideSkillsDir, skillId);

  if (!(await fs.pathExists(targetPath))) {
    return { exists: false, valid: false, sourcePath: null };
  }

  try {
    const stat = await fs.lstat(targetPath);
    if (!stat.isSymbolicLink()) {
      return { exists: true, valid: false, sourcePath: null };
    }

    const sourcePath = await fs.readlink(targetPath);
    const sourceExists = await fs.pathExists(sourcePath);

    return { exists: true, valid: sourceExists, sourcePath };
  } catch {
    return { exists: true, valid: false, sourcePath: null };
  }
}

export { SUPPORTED_IDES, IDE_SKILL_PATHS };
