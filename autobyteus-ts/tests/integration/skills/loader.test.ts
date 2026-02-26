import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SkillLoader } from '../../../src/skills/loader.js';

const createTempDir = (): string => {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skill-loader-int-'));
};

const removeDir = (dir: string) => {
  fs.rmSync(dir, { recursive: true, force: true });
};

describe('SkillLoader (integration)', () => {
  it('loads skill from disk', () => {
    const tempDir = createTempDir();
    const skillContent = `---\nname: disk_skill\ndescription: Disk skill\n---\nBody content`;
    fs.writeFileSync(path.join(tempDir, 'SKILL.md'), skillContent, 'utf-8');

    const skill = SkillLoader.loadSkill(tempDir);

    expect(skill.name).toBe('disk_skill');
    expect(skill.description).toBe('Disk skill');
    expect(skill.content).toBe('Body content');

    removeDir(tempDir);
  });
});
