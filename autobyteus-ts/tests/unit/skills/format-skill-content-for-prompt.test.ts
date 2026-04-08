import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { Skill } from '../../../src/skills/model.js';
import {
  formatSkillContentForPrompt,
  rewriteResolvableMarkdownLinks
} from '../../../src/skills/format-skill-content-for-prompt.js';

const tempDirs: string[] = [];

function createSkillFixture(): { root: string; skillRoot: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-format-'));
  tempDirs.push(root);
  const skillRoot = path.join(root, 'agents', 'architect-designer');
  fs.mkdirSync(path.join(skillRoot, 'references'), { recursive: true });
  fs.mkdirSync(path.join(root, 'agents', 'architect-reviewer', 'references'), { recursive: true });
  fs.writeFileSync(path.join(skillRoot, 'design-principles.md'), 'design', 'utf8');
  fs.writeFileSync(
    path.join(skillRoot, 'references', 'common-design-patterns.md'),
    'patterns',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, 'agents', 'architect-reviewer', 'references', 'spine-first-design-examples.md'),
    'examples',
    'utf8'
  );
  return { root, skillRoot };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('formatSkillContentForPrompt', () => {
  it('rewrites resolvable relative markdown links to absolute paths', () => {
    const { skillRoot } = createSkillFixture();
    const input = [
      '- Read [design-principles.md](design-principles.md).',
      '- Read [patterns](references/common-design-patterns.md).',
      '- Read [examples](../architect-reviewer/references/spine-first-design-examples.md).'
    ].join('\n');

    const result = rewriteResolvableMarkdownLinks(input, skillRoot);

    expect(result).toContain(
      `[design-principles.md](${path.join(skillRoot, 'design-principles.md')})`
    );
    expect(result).toContain(
      `[patterns](${path.join(skillRoot, 'references', 'common-design-patterns.md')})`
    );
    expect(result).toContain(
      `[examples](${path.join(
        path.dirname(skillRoot),
        'architect-reviewer',
        'references',
        'spine-first-design-examples.md'
      )})`
    );
  });

  it('leaves external, absolute, anchor, and missing targets unchanged', () => {
    const { skillRoot } = createSkillFixture();
    const absoluteTarget = path.join(skillRoot, 'design-principles.md');
    const input = [
      '- [external](https://example.com)',
      '- [anchor](#section)',
      `- [absolute](${absoluteTarget})`,
      '- [missing](missing.md)'
    ].join('\n');

    const result = rewriteResolvableMarkdownLinks(input, skillRoot);

    expect(result).toContain('[external](https://example.com)');
    expect(result).toContain('[anchor](#section)');
    expect(result).toContain(`[absolute](${absoluteTarget})`);
    expect(result).toContain('[missing](missing.md)');
  });

  it('formats a skill by rewriting only its markdown targets', () => {
    const { skillRoot } = createSkillFixture();
    const skill = new Skill(
      'architect-designer',
      'desc',
      '- Read [design-principles.md](design-principles.md).',
      skillRoot
    );

    const result = formatSkillContentForPrompt(skill);

    expect(result).toContain(
      `[design-principles.md](${path.join(skillRoot, 'design-principles.md')})`
    );
  });
});
