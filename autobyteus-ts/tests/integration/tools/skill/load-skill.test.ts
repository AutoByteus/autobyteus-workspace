import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SkillRegistry } from '../../../../src/skills/registry.js';
import { defaultToolRegistry, ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { registerLoadSkillTool } from '../../../../src/tools/skill/load-skill.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';

const TOOL_NAME = 'load_skill';

const createTempDir = (): string => {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skill-tool-int-'));
};

const removeDir = (dir: string) => {
  fs.rmSync(dir, { recursive: true, force: true });
};

describe('load_skill tool (integration)', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerLoadSkillTool();
    (SkillRegistry as any).instance = undefined;
    new SkillRegistry().clear();
  });

  afterEach(() => {
    new SkillRegistry().clear();
  });

  it('returns formatted content for registered skill', async () => {
    const tempDir = createTempDir();
    const skillPath = path.join(tempDir, 'sample_skill');
    fs.mkdirSync(skillPath);
    fs.writeFileSync(path.join(skillPath, 'SKILL.md'), '---\nname: sample_skill\ndescription: Sample skill\n---\nBody content');

    const registry = new SkillRegistry();
    registry.registerSkillFromPath(skillPath);

    const toolInstance = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
    const result = await toolInstance.execute({ agentId: 'agent' }, { skill_name: 'sample_skill' });

    expect(result).toContain('## Skill: sample_skill');
    expect(result).toContain(`Root Path: ${skillPath}`);

    removeDir(tempDir);
  });
});
