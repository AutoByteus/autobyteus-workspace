import { describe, it, expect, beforeEach } from 'vitest';
import { AvailableSkillsProcessor } from '../../../../src/agent/system-prompt-processor/available-skills-processor.js';
import { SkillRegistry } from '../../../../src/skills/registry.js';
import { Skill } from '../../../../src/skills/model.js';
import { SkillAccessMode } from '../../../../src/agent/context/skill-access-mode.js';

const makeContext = () => ({
  agentId: 'agent-1',
  config: { skills: [] as string[], skillAccessMode: undefined as SkillAccessMode | undefined }
});

describe('AvailableSkillsProcessor', () => {
  beforeEach(() => {
    const registry = new SkillRegistry();
    registry.clear();
  });

  it('returns prompt unchanged when no skills exist', () => {
    const processor = new AvailableSkillsProcessor();
    const prompt = 'Original Prompt';

    const result = processor.process(prompt, {}, 'test_agent', makeContext());

    expect(result).toBe(prompt);
  });

  it('injects skill catalog without details when not preloaded', () => {
    const registry = new SkillRegistry();
    const skill = new Skill('test_skill', 'desc', 'body', '/path');
    (registry as any).skills.set('test_skill', skill);

    const processor = new AvailableSkillsProcessor();
    const result = processor.process('Original', {}, 'test_agent', makeContext());

    expect(result).toContain('Original');
    expect(result).toContain('## Agent Skills');
    expect(result).toContain('Skill Catalog');
    expect(result).toContain('- **test_skill**: desc');
    expect(result).not.toContain('body');
  });

  it('uses preloaded-only catalog mode when configured', () => {
    const registry = new SkillRegistry();
    const skillA = new Skill('preloaded', 'preloaded desc', 'PRELOADED_BODY', '/path/a');
    const skillB = new Skill('other', 'other desc', 'OTHER_BODY', '/path/b');
    (registry as any).skills.set('preloaded', skillA);
    (registry as any).skills.set('other', skillB);

    const context = makeContext();
    context.config.skills = ['preloaded'];
    context.config.skillAccessMode = SkillAccessMode.PRELOADED_ONLY;

    const processor = new AvailableSkillsProcessor();
    const result = processor.process('Original', {}, 'test_agent', context);

    expect(result).toContain('- **preloaded**: preloaded desc');
    expect(result).not.toContain('- **other**: other desc');
    expect(result).toContain('PRELOADED_BODY');
    expect(result).not.toContain('OTHER_BODY');
  });

  it('skips skills section when mode is NONE', () => {
    const registry = new SkillRegistry();
    const skill = new Skill('test_skill', 'desc', 'body', '/path');
    (registry as any).skills.set('test_skill', skill);

    const context = makeContext();
    context.config.skillAccessMode = SkillAccessMode.NONE;

    const processor = new AvailableSkillsProcessor();
    const result = processor.process('Original', {}, 'test_agent', context);

    expect(result).toBe('Original');
  });

  it('injects detailed section for preloaded skills', () => {
    const registry = new SkillRegistry();
    const skill = new Skill('preloaded', 'desc', 'FULL_BODY', '/path');
    (registry as any).skills.set('preloaded', skill);

    const context = makeContext();
    context.config.skills = ['preloaded'];

    const processor = new AvailableSkillsProcessor();
    const result = processor.process('Original', {}, 'test_agent', context);

    expect(result).toContain('**Root Path:** `/path`');
    expect(result).toContain('### Critical Rules for Using Skills');
    expect(result).toContain("standard tools resolve relative paths against the User's Workspace");
    expect(result).toContain('Relative: `./scripts/run.sh`');
    expect(result).toContain('Relative: `scripts/run.sh`');
    expect(result).toContain('FULL_BODY');
  });
});
