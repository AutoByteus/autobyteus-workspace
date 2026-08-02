import path from 'path';
import { describe, it, expect, beforeEach } from 'vitest';
import { AvailableSkillsProcessor } from '../../../../src/agent/system-prompt-processor/available-skills-processor.js';
import { SkillRegistry } from '../../../../src/skills/registry.js';
import { Skill } from '../../../../src/skills/model.js';
import { SkillAccessMode } from '../../../../src/agent/context/skill-access-mode.js';

const makeContext = () => ({
  agentId: 'agent-1',
  config: { skills: [] as string[], skillAccessMode: undefined as SkillAccessMode | undefined }
});

const expectedSkillsBlock = (catalogEntries: string): string => `\n\n## Agent Skills

### Skill Catalog

${catalogEntries}

### Rules for Using Skills

- Use a configured skill whenever it applies to the task.
- When no configured skill applies, use the best available general approach.
- When an applicable configured skill covers only part of the task, follow it for the covered part and use another available technique for the uncovered part.
- Before beginning work governed by a skill, read its \`SKILL.md\` from the exact path listed above.
- Resolve every relative path mentioned by a skill from the directory containing that skill's \`SKILL.md\`.
`;

describe('AvailableSkillsProcessor', () => {
  beforeEach(() => {
    new SkillRegistry().clear();
  });

  it('returns the original prompt unchanged when no skills are configured', () => {
    const result = new AvailableSkillsProcessor().process(
      'Original Prompt',
      {},
      'test_agent',
      makeContext()
    );

    expect(result).toBe('Original Prompt');
  });

  it('does not advertise registry-only skills when no skills are configured', () => {
    const registry = new SkillRegistry();
    (registry as any).skills.set(
      'registry_only',
      new Skill('registry_only', 'Registry only', 'REGISTRY_ONLY_BODY', '/registry/only')
    );

    const result = new AvailableSkillsProcessor().process(
      'Original',
      {},
      'test_agent',
      makeContext()
    );

    expect(result).toBe('Original');
  });

  it('returns the original prompt unchanged when skill access mode is NONE', () => {
    const registry = new SkillRegistry();
    (registry as any).skills.set(
      'configured',
      new Skill('configured', 'Configured skill', 'CONFIGURED_BODY', '/configured')
    );
    const context = makeContext();
    context.config.skills = ['configured'];
    context.config.skillAccessMode = SkillAccessMode.NONE;

    const result = new AvailableSkillsProcessor().process(
      'Original',
      {},
      'test_agent',
      context
    );

    expect(result).toBe('Original');
  });

  it('returns the original prompt unchanged when configured names do not resolve', () => {
    const context = makeContext();
    context.config.skills = ['missing'];

    const result = new AvailableSkillsProcessor().process(
      'Original',
      {},
      'test_agent',
      context
    );

    expect(result).toBe('Original');
  });

  it('renders the exact configured catalog contract in configured order without skill bodies', () => {
    const registry = new SkillRegistry();
    const relativeRoot = path.join('relative', 'skill-a');
    const absoluteRoot = path.resolve('/absolute/skill-b');
    (registry as any).skills.set(
      'skill-a',
      new Skill(
        'skill-a',
        'First configured skill.',
        'UNIQUE_SKILL_A_BODY [reference](references/a.md)',
        relativeRoot
      )
    );
    (registry as any).skills.set(
      'skill-b',
      new Skill('skill-b', 'Second configured skill.', 'UNIQUE_SKILL_B_BODY', absoluteRoot)
    );
    (registry as any).skills.set(
      'unconfigured',
      new Skill('unconfigured', 'Not configured.', 'UNCONFIGURED_BODY', '/unconfigured')
    );
    const context = makeContext();
    context.config.skills = ['skill-b', 'skill-a'];
    context.config.skillAccessMode = SkillAccessMode.PRELOADED_ONLY;
    const catalogEntries = [
      '- **skill-b**: Second configured skill.',
      `  - **SKILL.md:** \`${path.resolve(absoluteRoot, 'SKILL.md')}\``,
      '- **skill-a**: First configured skill.',
      `  - **SKILL.md:** \`${path.resolve(relativeRoot, 'SKILL.md')}\``
    ].join('\n');

    const result = new AvailableSkillsProcessor().process(
      'Original',
      {},
      'test_agent',
      context
    );

    expect(result).toBe(`Original${expectedSkillsBlock(catalogEntries)}`);
    expect(result).not.toContain('UNIQUE_SKILL_A_BODY');
    expect(result).not.toContain('UNIQUE_SKILL_B_BODY');
    expect(result).not.toContain('UNCONFIGURED_BODY');
    expect(result).not.toContain('[reference](references/a.md)');
    expect(result).not.toContain('Skill Details');
  });
});
