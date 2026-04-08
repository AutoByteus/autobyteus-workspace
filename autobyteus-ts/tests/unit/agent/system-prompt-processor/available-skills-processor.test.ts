import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AvailableSkillsProcessor } from '../../../../src/agent/system-prompt-processor/available-skills-processor.js';
import { SkillRegistry } from '../../../../src/skills/registry.js';
import { Skill } from '../../../../src/skills/model.js';
import { SkillAccessMode } from '../../../../src/agent/context/skill-access-mode.js';

const makeContext = () => ({
  agentId: 'agent-1',
  config: { skills: [] as string[], skillAccessMode: undefined as SkillAccessMode | undefined }
});

const tempDirs: string[] = [];

const createSkillRoot = () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'available-skills-'));
  tempDirs.push(tempDir);
  const skillRoot = path.join(tempDir, 'preloaded');
  fs.mkdirSync(path.join(skillRoot, 'references'), { recursive: true });
  fs.writeFileSync(path.join(skillRoot, 'design-principles.md'), 'design', 'utf8');
  fs.writeFileSync(
    path.join(skillRoot, 'references', 'common-design-patterns.md'),
    'patterns',
    'utf8'
  );
  return skillRoot;
};

describe('AvailableSkillsProcessor', () => {
  beforeEach(() => {
    const registry = new SkillRegistry();
    registry.clear();
  });

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
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
    expect(result).toContain('To load a skill not shown in detail below, use the `load_skill` tool.');
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
    expect(result).not.toContain('To load a skill not shown in detail below, use the `load_skill` tool.');
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
    const skillRoot = createSkillRoot();
    const skill = new Skill(
      'preloaded',
      'desc',
      [
        'Read [design-principles.md](design-principles.md).',
        'Read [patterns](references/common-design-patterns.md).'
      ].join('\n'),
      skillRoot
    );
    (registry as any).skills.set('preloaded', skill);

    const context = makeContext();
    context.config.skills = ['preloaded'];

    const processor = new AvailableSkillsProcessor();
    const result = processor.process('Original', {}, 'test_agent', context);

    expect(result).toContain(`**Skill Base Path:** \`${skillRoot}\``);
    expect(result).toContain('### Critical Rules for Using Skills');
    expect(result).toContain(
      'Resolvable Markdown links are already rewritten to absolute filesystem paths before injection.'
    );
    expect(result).toContain(
      'plain-text relative references or unresolved targets may still appear in skill instructions.'
    );
    expect(result).toContain('`Skill Base Path` + `Relative Path` = `Absolute Path`');
    expect(result).not.toContain('To load a skill not shown in detail below, use the `load_skill` tool.');
    expect(result).toContain('Relative: `./scripts/run.sh`');
    expect(result).toContain('Relative: `scripts/run.sh`');
    expect(result).toContain(
      `[design-principles.md](${path.join(skillRoot, 'design-principles.md')})`
    );
    expect(result).toContain(
      `[patterns](${path.join(skillRoot, 'references', 'common-design-patterns.md')})`
    );
  });
});
