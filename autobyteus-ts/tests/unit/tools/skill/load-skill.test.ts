import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SkillRegistry } from '../../../../src/skills/registry.js';
import { defaultToolRegistry, ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { registerLoadSkillTool } from '../../../../src/tools/skill/load-skill.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import { SkillAccessMode } from '../../../../src/agent/context/skill-access-mode.js';

const TOOL_NAME = 'load_skill';

const createTempDir = (): string => {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skill-tool-'));
};

const removeDir = (dir: string) => {
  fs.rmSync(dir, { recursive: true, force: true });
};

describe('load_skill tool', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerLoadSkillTool();
    (SkillRegistry as any).instance = undefined;
    new SkillRegistry().clear();
  });

  afterEach(() => {
    new SkillRegistry().clear();
  });

  it('loads a skill by name', async () => {
    const tempDir = createTempDir();
    const skillPath = path.join(tempDir, 'test_skill');
    fs.mkdirSync(skillPath);
    fs.writeFileSync(path.join(skillPath, 'SKILL.md'), '---\nname: test_skill\ndescription: A test skill\n---\nBody of the skill.');

    const registry = new SkillRegistry();
    registry.registerSkillFromPath(skillPath);

    const toolInstance = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
    const result = await toolInstance.execute({ agentId: 'test_agent' }, { skill_name: 'test_skill' });

    expect(result).toContain('## Skill: test_skill');
    expect(result).toContain(`Root Path: ${skillPath}`);
    expect(result).toContain('CRITICAL: Path Resolution');
    expect(result).toContain('Body of the skill.');

    removeDir(tempDir);
  });

  it('loads a skill by path', async () => {
    const tempDir = createTempDir();
    const skillPath = path.join(tempDir, 'test_skill');
    fs.mkdirSync(skillPath);
    fs.writeFileSync(path.join(skillPath, 'SKILL.md'), '---\nname: test_skill\ndescription: A test skill\n---\nBody of the skill.');

    const toolInstance = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
    const result = await toolInstance.execute({ agentId: 'test_agent' }, { skill_name: skillPath });

    expect(result).toContain('## Skill: test_skill');
    expect(result).toContain(`Root Path: ${skillPath}`);
    expect(result).toContain('CRITICAL: Path Resolution');
    expect(result).toContain('Body of the skill.');

    removeDir(tempDir);
  });

  it('throws when skill is not found', async () => {
    const toolInstance = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
    await expect(toolInstance.execute({ agentId: 'test_agent' }, { skill_name: 'non_existent' }))
      .rejects
      .toThrow("Skill 'non_existent' not found");
  });

  it('blocks non-preloaded skill loads in PRELOADED_ONLY mode', async () => {
    const tempDir = createTempDir();
    const skillPath = path.join(tempDir, 'test_skill');
    fs.mkdirSync(skillPath);
    fs.writeFileSync(path.join(skillPath, 'SKILL.md'), '---\nname: test_skill\ndescription: A test skill\n---\nBody of the skill.');

    const registry = new SkillRegistry();
    registry.registerSkillFromPath(skillPath);

    const toolInstance = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
    await expect(
      toolInstance.execute(
        { agentId: 'test_agent', config: { skills: ['other_skill'], skillAccessMode: SkillAccessMode.PRELOADED_ONLY } },
        { skill_name: 'test_skill' }
      )
    ).rejects.toThrow("is not preloaded for this agent");

    removeDir(tempDir);
  });

  it('blocks all skill loads when mode is NONE', async () => {
    const toolInstance = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
    await expect(
      toolInstance.execute(
        { agentId: 'test_agent', config: { skills: ['test_skill'], skillAccessMode: SkillAccessMode.NONE } },
        { skill_name: 'test_skill' }
      )
    ).rejects.toThrow('Skill loading is disabled');
  });
});
