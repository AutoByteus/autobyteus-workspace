import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { createHeadingSlugger, githubHeadingSlug } from '~/utils/markdownHeadingAnchors';

// autobyteus-480 REQ-001 / AC-001: GitHub's heading slug rule and duplicate numbering.

describe('githubHeadingSlug', () => {
  it.each([
    ['The Approach: Spine First, Practices In Context', 'the-approach-spine-first-practices-in-context'],
    ['1. Approved Behavior And Production Reality', '1-approved-behavior-and-production-reality'],
    ['15. One Vocabulary: One Word, One Meaning; One Meaning, One Word', '15-one-vocabulary-one-word-one-meaning-one-meaning-one-word'],
    ['Foo & Bar', 'foo--bar'],
    ['A -- B', 'a----b'],
    ["What's new?", 'whats-new'],
    ['snake_case_name', 'snake_case_name'],
    ['Hello 👋 World', 'hello--world'],
    ['Ünïcödé Straße', 'ünïcödé-straße'],
    ['Привет Мир', 'привет-мир'],
    ['日本語 見出し', '日本語-見出し'],
    ['v1.5 (beta)', 'v15-beta'],
  ])('%j → %j', (text, slug) => {
    expect(githubHeadingSlug(text)).toBe(slug);
  });
});

describe('createHeadingSlugger', () => {
  it('numbers repeated headings in order, per document', () => {
    const slug = createHeadingSlugger();
    expect(['Notes', 'Notes', 'Notes', 'Notes 1'].map(slug)).toEqual(['notes', 'notes-1', 'notes-2', 'notes-1-1']);
    expect(createHeadingSlugger()('Notes')).toBe('notes');
  });

  it("resolves every Contents entry of design-principles.md to exactly one heading", () => {
    const source = readFileSync(path.resolve(process.cwd(), 'utils/__tests__/fixtures/design-principles.md'), 'utf8');
    const slug = createHeadingSlugger();
    const headingSlugs = source.split('\n')
      .filter((line) => /^#{1,6} /.test(line))
      .map((line) => slug(line.replace(/^#{1,6} /, '').trim()));
    const contentsAnchors = [...source.matchAll(/\]\(#([^)]+)\)/g)].map((match) => match[1]);

    expect(contentsAnchors.length).toBeGreaterThan(20);
    for (const anchor of contentsAnchors) {
      expect(headingSlugs.filter((headingSlug) => headingSlug === anchor), anchor).toHaveLength(1);
    }
  });
});
