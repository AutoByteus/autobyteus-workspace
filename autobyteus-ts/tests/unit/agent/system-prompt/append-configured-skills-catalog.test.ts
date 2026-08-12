import path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import { appendConfiguredSkillsCatalog } from '../../../../src/agent/system-prompt/append-configured-skills-catalog.js';
import { SkillRegistry } from '../../../../src/skills/registry.js';
import { Skill } from '../../../../src/skills/model.js';
import { SkillAccessMode } from '../../../../src/agent/context/skill-access-mode.js';

const makeContext = () => ({
  agentId: 'test_agent',
  config: { skills: [] as string[], skillAccessMode: undefined as SkillAccessMode | undefined }
});

const expectedSkillsBlock = (catalogEntries: string): string => `\n\n## Skills

### Skill Catalog

${catalogEntries}

### Rules for Using Skills

- Use a configured skill whenever it applies to the task.
- When no configured skill applies, use the best available general approach.
- When an applicable configured skill covers only part of the task, follow it for the covered part and use another available technique for the uncovered part.
- Before beginning work governed by a skill, read its \`SKILL.md\` from the exact path listed above.
- Resolve every relative path mentioned by a skill from the directory containing that skill's \`SKILL.md\`.
`;

describe('appendConfiguredSkillsCatalog', () => {
  beforeEach(() => {
    new SkillRegistry().clear();
  });

  it('returns the original prompt unchanged when no skills are configured', () => {
    expect(appendConfiguredSkillsCatalog('Original Prompt', makeContext())).toBe('Original Prompt');
  });

  it('does not advertise registry-only skills when no skills are configured', () => {
    const registry = new SkillRegistry();
    (registry as any).skills.set(
      'registry_only',
      new Skill('registry_only', 'Registry only', 'REGISTRY_ONLY_BODY', '/registry/only')
    );

    expect(appendConfiguredSkillsCatalog('Original', makeContext())).toBe('Original');
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

    expect(appendConfiguredSkillsCatalog('Original', context)).toBe('Original');
  });

  it('returns the original prompt unchanged when configured names do not resolve', () => {
    const context = makeContext();
    context.config.skills = ['missing'];

    expect(appendConfiguredSkillsCatalog('Original', context)).toBe('Original');
  });

  it('omits configured entries with blank required metadata', () => {
    const registry = new SkillRegistry();
    (registry as any).skills.set('invalid', new Skill('invalid', '   ', 'BODY', '/invalid'));
    const context = makeContext();
    context.config.skills = ['invalid'];

    expect(appendConfiguredSkillsCatalog('Original', context)).toBe('Original');
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

    const result = appendConfiguredSkillsCatalog('Original', context);

    expect(result).toBe(`Original${expectedSkillsBlock(catalogEntries)}`);
    expect(result).not.toContain('UNIQUE_SKILL_A_BODY');
    expect(result).not.toContain('UNIQUE_SKILL_B_BODY');
    expect(result).not.toContain('UNCONFIGURED_BODY');
    expect(result).not.toContain('[reference](references/a.md)');
    expect(result).not.toContain('Skill Details');
  });
});
