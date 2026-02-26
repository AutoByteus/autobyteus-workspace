import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SkillLoader } from '../../../src/skills/loader.js';

const createTempDir = (): string => {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skill-loader-'));
};

const removeDir = (dir: string) => {
  fs.rmSync(dir, { recursive: true, force: true });
};

describe('SkillLoader', () => {
  it('loads a valid skill', () => {
    const tempDir = createTempDir();
    const skillContent = `---\nname: test_skill\ndescription: A skill for testing\n---\n# Content\nThis is the skill body.\n`;
    fs.writeFileSync(path.join(tempDir, 'SKILL.md'), skillContent, 'utf-8');

    const skill = SkillLoader.loadSkill(tempDir);

    expect(skill.name).toBe('test_skill');
    expect(skill.description).toBe('A skill for testing');
    expect(skill.content).toBe('# Content\nThis is the skill body.');
    expect(skill.rootPath).toBe(tempDir);

    removeDir(tempDir);
  });

  it('loads skill with forgiving format', () => {
    const tempDir = createTempDir();
    const skillContent = `  ---  \nNAME:  flexible_skill  \nDescription:   A very flexible description  \n---\nBody starts here.\n`;
    fs.writeFileSync(path.join(tempDir, 'SKILL.md'), skillContent, 'utf-8');

    const skill = SkillLoader.loadSkill(tempDir);

    expect(skill.name).toBe('flexible_skill');
    expect(skill.description).toBe('A very flexible description');
    expect(skill.content).toBe('Body starts here.');

    removeDir(tempDir);
  });

  it('throws when SKILL.md is missing', () => {
    const tempDir = createTempDir();
    expect(() => SkillLoader.loadSkill(tempDir)).toThrow('SKILL.md not found');
    removeDir(tempDir);
  });

  it('throws on invalid format', () => {
    const tempDir = createTempDir();
    const skillContent = 'name: invalid\ndescription: missing dashes\n---\ncontent';
    fs.writeFileSync(path.join(tempDir, 'SKILL.md'), skillContent, 'utf-8');

    expect(() => SkillLoader.loadSkill(tempDir)).toThrow('Could not find frontmatter block');

    removeDir(tempDir);
  });

  it('throws on missing metadata', () => {
    const tempDir = createTempDir();
    const skillContent = '---\nname: incomplete\n---\ncontent';
    fs.writeFileSync(path.join(tempDir, 'SKILL.md'), skillContent, 'utf-8');

    expect(() => SkillLoader.loadSkill(tempDir)).toThrow("Missing 'description'");

    removeDir(tempDir);
  });
});
