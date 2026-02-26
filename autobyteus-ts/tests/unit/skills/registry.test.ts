import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SkillRegistry } from '../../../src/skills/registry.js';

const createTempDir = (): string => {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skill-registry-'));
};

const removeDir = (dir: string) => {
  fs.rmSync(dir, { recursive: true, force: true });
};

describe('SkillRegistry', () => {
  beforeEach(() => {
    (SkillRegistry as any).instance = undefined;
    new SkillRegistry().clear();
  });

  afterEach(() => {
    new SkillRegistry().clear();
  });

  it('behaves as a singleton', () => {
    const registry1 = new SkillRegistry();
    const registry2 = new SkillRegistry();
    expect(registry1).toBe(registry2);
  });

  it('registers skill from path', () => {
    const tempDir = createTempDir();
    const skillPath = path.join(tempDir, 'my_skill');
    fs.mkdirSync(skillPath);
    fs.writeFileSync(path.join(skillPath, 'SKILL.md'), '---\nname: my_skill\ndescription: test\n---\ncontent');

    const registry = new SkillRegistry();
    const skill = registry.registerSkillFromPath(skillPath);

    expect(skill.name).toBe('my_skill');
    expect(registry.getSkill('my_skill')).toBe(skill);
    expect(registry.listSkills()).toHaveLength(1);

    removeDir(tempDir);
  });

  it('discovers skills in a directory', () => {
    const tempDir = createTempDir();
    const skill1 = path.join(tempDir, 'skill1');
    const skill2 = path.join(tempDir, 'skill2');
    fs.mkdirSync(skill1);
    fs.mkdirSync(skill2);
    fs.writeFileSync(path.join(skill1, 'SKILL.md'), '---\nname: skill1\ndescription: desc for skill1\n---\ncontent');
    fs.writeFileSync(path.join(skill2, 'SKILL.md'), '---\nname: skill2\ndescription: desc for skill2\n---\ncontent');
    fs.mkdirSync(path.join(tempDir, 'not_a_skill'));

    const registry = new SkillRegistry();
    registry.discoverSkills(tempDir);

    expect(registry.listSkills()).toHaveLength(2);
    expect(registry.getSkill('skill1')).toBeTruthy();
    expect(registry.getSkill('skill2')).toBeTruthy();
    expect(registry.getSkill('not_a_skill')).toBeUndefined();

    removeDir(tempDir);
  });
});
