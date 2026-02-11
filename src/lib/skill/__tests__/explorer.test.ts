import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { getDirectoryEntries } from '../explorer';

let tempDir: string;

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `es-test-${Date.now()}`);
  await fs.ensureDir(tempDir);
});

afterEach(async () => {
  await fs.remove(tempDir);
});

describe('getDirectoryEntries', () => {
  it('should classify directory with skill indicator as skill', async () => {
    const skillDir = path.join(tempDir, 'my-skill');
    await fs.ensureDir(skillDir);
    await fs.writeFile(path.join(skillDir, 'skill.md'), '# My Skill\nA great skill');

    const entries = await getDirectoryEntries(tempDir);
    const entry = entries.find(e => e.name === 'my-skill');

    expect(entry).toBeDefined();
    expect(entry!.type).toBe('skill');
    expect(entry!.description).toBe('My Skill');
  });

  it('should classify directory with subdirs but no skill file as directory', async () => {
    const parentDir = path.join(tempDir, 'parent');
    const childDir = path.join(parentDir, 'child');
    await fs.ensureDir(childDir);
    await fs.writeFile(path.join(childDir, 'readme.md'), '# Child');

    const entries = await getDirectoryEntries(tempDir);
    const entry = entries.find(e => e.name === 'parent');

    expect(entry).toBeDefined();
    expect(entry!.type).toBe('directory');
  });

  it('should classify directory with content files but no subdirs and no skill file as resource', async () => {
    const resDir = path.join(tempDir, 'resources');
    await fs.ensureDir(resDir);
    await fs.writeFile(path.join(resDir, 'data.json'), '{}');

    const entries = await getDirectoryEntries(tempDir);
    const entry = entries.find(e => e.name === 'resources');

    expect(entry).toBeDefined();
    expect(entry!.type).toBe('resource');
  });

  it('should filter out empty directories', async () => {
    const emptyDir = path.join(tempDir, 'empty');
    await fs.ensureDir(emptyDir);

    const entries = await getDirectoryEntries(tempDir);
    const entry = entries.find(e => e.name === 'empty');

    expect(entry).toBeUndefined();
  });

  it('should detect root as skill when it has skill indicator', async () => {
    await fs.writeFile(path.join(tempDir, 'skill.md'), '# Root Skill');

    const entries = await getDirectoryEntries(tempDir);
    const rootEntry = entries.find(e => e.path === '.');

    expect(rootEntry).toBeDefined();
    expect(rootEntry!.type).toBe('skill');
  });

  it('should not show root skill entry when root has no skill file', async () => {
    const childDir = path.join(tempDir, 'child');
    await fs.ensureDir(childDir);
    await fs.writeFile(path.join(childDir, 'skill.md'), '# Child');

    const entries = await getDirectoryEntries(tempDir);
    const rootEntry = entries.find(e => e.path === '.');

    expect(rootEntry).toBeUndefined();
  });

  it('should return entries for a subdirectory via relativePath', async () => {
    const parentDir = path.join(tempDir, 'skills');
    const skillA = path.join(parentDir, 'skill-a');
    const skillB = path.join(parentDir, 'skill-b');
    await fs.ensureDir(skillA);
    await fs.ensureDir(skillB);
    await fs.writeFile(path.join(skillA, 'skill.md'), '# Skill A');
    await fs.writeFile(path.join(skillB, 'index.md'), '# Skill B');

    const entries = await getDirectoryEntries(tempDir, 'skills');

    expect(entries.length).toBe(2);
    expect(entries.every(e => e.type === 'skill')).toBe(true);
    expect(entries.map(e => e.name).sort()).toEqual(['skill-a', 'skill-b']);
  });

  it('should skip hidden and system directories', async () => {
    await fs.ensureDir(path.join(tempDir, '.git'));
    await fs.ensureDir(path.join(tempDir, 'node_modules'));
    await fs.ensureDir(path.join(tempDir, '.vscode'));
    const validDir = path.join(tempDir, 'valid');
    await fs.ensureDir(validDir);
    await fs.writeFile(path.join(validDir, 'skill.md'), '# Valid');

    const entries = await getDirectoryEntries(tempDir);
    const names = entries.map(e => e.name);

    expect(names).not.toContain('.git');
    expect(names).not.toContain('node_modules');
    expect(names).not.toContain('.vscode');
    expect(names).toContain('valid');
  });

  it('should sort directories first, then skills, then resources', async () => {
    // Resource (has content file, no skill file, no subdirs)
    const resDir = path.join(tempDir, 'aaa-resource');
    await fs.ensureDir(resDir);
    await fs.writeFile(path.join(resDir, 'data.json'), '{}');

    // Skill
    const skillDir = path.join(tempDir, 'bbb-skill');
    await fs.ensureDir(skillDir);
    await fs.writeFile(path.join(skillDir, 'skill.md'), '# Skill');

    // Directory (has subdirs)
    const dirDir = path.join(tempDir, 'ccc-dir');
    const subDir = path.join(dirDir, 'sub');
    await fs.ensureDir(subDir);
    await fs.writeFile(path.join(subDir, 'readme.md'), '# Sub');

    const entries = await getDirectoryEntries(tempDir);
    const types = entries.map(e => e.type);

    expect(types).toEqual(['directory', 'skill', 'resource']);
  });
});
