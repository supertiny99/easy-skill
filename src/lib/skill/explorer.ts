import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import simpleGit from 'simple-git';

const git = simpleGit();

export interface RemoteBranch {
  name: string;
  isDefault: boolean;
}

export interface SkillCandidate {
  name: string;
  path: string;
  hasSkillFile: boolean;
  description?: string;
}

export interface RepoExploreResult {
  branches: RemoteBranch[];
  skills: SkillCandidate[];
  tempPath: string;
}

/**
 * Get remote branches from a Git repository URL
 */
export async function getRemoteBranches(url: string): Promise<RemoteBranch[]> {
  try {
    const result = await git.listRemote(['--heads', url]);
    const branches: RemoteBranch[] = [];
    const lines = result.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const match = line.match(/refs\/heads\/(.+)$/);
      if (match) {
        const name = match[1];
        branches.push({
          name,
          isDefault: name === 'main' || name === 'master'
        });
      }
    }

    // Sort: default branches first, then alphabetically
    branches.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });

    return branches;
  } catch (err: any) {
    throw new Error(`Failed to fetch branches: ${err.message}`);
  }
}

/**
 * Clone repository to temp directory and explore its structure
 */
export async function exploreRepository(
  url: string,
  branch?: string
): Promise<RepoExploreResult> {
  const tempDir = path.join(os.tmpdir(), `easy-skill-explore-${Date.now()}`);

  try {
    // Shallow clone
    const cloneOptions: string[] = ['--depth', '1'];
    if (branch) {
      cloneOptions.push('--branch', branch);
    }

    await git.clone(url, tempDir, cloneOptions);

    // Find skill candidates
    const skills = await findSkillCandidates(tempDir);

    // Get branches if not already provided
    let branches: RemoteBranch[] = [];
    if (!branch) {
      branches = await getRemoteBranches(url);
    }

    return {
      branches,
      skills,
      tempPath: tempDir
    };
  } catch (err: any) {
    // Cleanup on error
    await fs.remove(tempDir).catch(() => {});
    throw new Error(`Failed to explore repository: ${err.message}`);
  }
}

/**
 * Find skill candidates in a directory
 * Recursively scans all directories to find skills
 */
async function findSkillCandidates(repoPath: string, maxDepth: number = 3): Promise<SkillCandidate[]> {
  const candidates: SkillCandidate[] = [];
  const skipDirs = new Set(['node_modules', 'dist', 'build', '.git', 'test', 'tests', '__tests__', 'docs', 'coverage', '.vscode', '.idea']);

  async function scanDirectory(dirPath: string, relativePath: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || skipDirs.has(entry.name.toLowerCase())) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        const entryRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;

        const candidate = await checkSkillCandidate(entry.name, fullPath, entryRelativePath);
        if (candidate) {
          candidates.push(candidate);
        }

        // Recursively scan subdirectories
        await scanDirectory(fullPath, entryRelativePath, depth + 1);
      }
    } catch (err) {
      // Ignore permission errors
    }
  }

  // Start scanning from root
  await scanDirectory(repoPath, '', 0);

  // Check if root itself is a skill
  const rootCandidate = await checkSkillCandidate(
    path.basename(repoPath),
    repoPath,
    '.'
  );
  if (rootCandidate && rootCandidate.hasSkillFile) {
    candidates.unshift(rootCandidate);
  }

  // Sort by path depth (shallower first), then alphabetically
  candidates.sort((a, b) => {
    const depthA = a.path.split('/').length;
    const depthB = b.path.split('/').length;
    if (depthA !== depthB) return depthA - depthB;
    return a.path.localeCompare(b.path);
  });

  return candidates;
}

/**
 * Check if a directory is a skill candidate
 */
async function checkSkillCandidate(
  name: string,
  dirPath: string,
  relativePath?: string
): Promise<SkillCandidate | null> {
  // Look for skill indicator files
  const skillIndicators = [
    'skill.json',
    'skill.yaml',
    'skill.yml',
    'skill.md',
    'SKILL.md',
    'index.md',
    'README.md'
  ];

  let hasSkillFile = false;
  let description: string | undefined;

  for (const indicator of skillIndicators) {
    const indicatorPath = path.join(dirPath, indicator);
    if (await fs.pathExists(indicatorPath)) {
      hasSkillFile = true;

      // Try to read description from skill.json
      if (indicator === 'skill.json') {
        try {
          const content = await fs.readJson(indicatorPath);
          description = content.description || content.name;
        } catch {}
      }
      // Try to read first line/title from markdown as description
      else if (indicator.endsWith('.md')) {
        try {
          const content = await fs.readFile(indicatorPath, 'utf-8');
          const lines = content.split('\n');
          // First try to get the title (# heading)
          const titleLine = lines.find(l => l.trim().startsWith('# '));
          if (titleLine) {
            description = titleLine.replace(/^#\s*/, '').trim().substring(0, 100);
          } else {
            // Otherwise get first non-empty, non-heading line
            const firstLine = lines.find(l => l.trim() && !l.startsWith('#'));
            if (firstLine) {
              description = firstLine.trim().substring(0, 100);
            }
          }
        } catch {}
      }
      break;
    }
  }

  // Always include directories that have content files (even without skill indicator)
  const files = await fs.readdir(dirPath);
  const contentFiles = files.filter(f => 
    !f.startsWith('.') && 
    (f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml'))
  );

  // Skip empty directories or directories without any useful files
  if (contentFiles.length === 0 && !hasSkillFile) {
    return null;
  }

  return {
    name,
    path: relativePath || name,
    hasSkillFile,
    description
  };
}

/**
 * Copy skill from temp explore directory to target
 */
export async function copySkillFromExplore(
  tempPath: string,
  skillPath: string,
  targetDir: string,
  skillId: string
): Promise<string> {
  const sourcePath = skillPath === '.' ? tempPath : path.join(tempPath, skillPath);
  const destPath = path.join(targetDir, skillId);

  await fs.ensureDir(path.dirname(destPath));

  if (await fs.pathExists(destPath)) {
    await fs.remove(destPath);
  }

  await fs.copy(sourcePath, destPath);

  // Remove .git if exists
  const gitDir = path.join(destPath, '.git');
  if (await fs.pathExists(gitDir)) {
    await fs.remove(gitDir);
  }

  return destPath;
}

/**
 * Cleanup temp explore directory
 */
export async function cleanupExplore(tempPath: string): Promise<void> {
  try {
    await fs.remove(tempPath);
  } catch {}
}
