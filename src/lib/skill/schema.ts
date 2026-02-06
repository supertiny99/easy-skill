export interface SkillSource {
  type: 'git' | 'local' | 'url';
  url: string;
  branch?: string;
  subdir?: string;
}

export interface SkillInfo {
  id: string;
  name: string;
  description?: string;
  source: SkillSource;
  localPath?: string;
  linkedTo?: string[];
}

export interface SkillRegistry {
  skills: SkillInfo[];
  lastUpdated?: string;
}

export type IDEType = 'claude' | 'trae';

export interface LinkTarget {
  ide: IDEType;
  skillId: string;
  sourcePath: string;
  targetPath: string;
}

export const IDE_SKILL_PATHS: Record<IDEType, string> = {
  claude: '.claude/skills',
  trae: '.trae/skills'
};

export const SUPPORTED_IDES: IDEType[] = ['claude', 'trae'];
