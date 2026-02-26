import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SkillRegistry } from '../../../src/skills/registry.js';

const createTempDir = (): string => {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skill-registry-int-'));
};

const removeDir = (dir: string) => {
  fs.rmSync(dir, { recursive: true, force: true });
};

describe('SkillRegistry (integration)', () => {
  beforeEach(() => {
    (SkillRegistry as any).instance = undefined;
  });

  it('registers and lists skills', () => {
    const tempDir = createTempDir();
    const skillPath = path.join(tempDir, 'skill');
    fs.mkdirSync(skillPath);
    fs.writeFileSync(path.join(skillPath, 'SKILL.md'), '---\nname: skill\ndescription: desc\n---\ncontent');

    const registry = new SkillRegistry();
    registry.registerSkillFromPath(skillPath);

    expect(registry.listSkills().length).toBe(1);

    removeDir(tempDir);
  });
});
