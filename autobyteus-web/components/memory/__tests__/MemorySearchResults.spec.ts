import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import MemorySearchResults from '../MemorySearchResults.vue';
import type { SearchOutcome, SearchResult } from '~/types/memorySearch';

const result = (overrides: Partial<SearchResult> = {}): SearchResult => ({
  runId: 'codex_45ce', agentName: 'Codex', team: null, member: null, workspace: '/w/home', firstDay: '2026-08-25', latestDay: '2026-08-27',
  subject: { kind: 'AGENT', runId: 'codex_45ce', agentDefinitionId: 'codex' },
  matches: [
    { file: 'work_journal_active.md', fromLine: 812, toLine: 814, day: '2026-08-27', snippet: ['User: set up DDNS', 'Command: crontab -l'], kind: 'text', matchedWords: ['ddns', 'crontab'] },
    { file: 'work_journal_000001.md', fromLine: 40, toLine: 42, day: '2026-08-25', snippet: ['User: home.example.org'], kind: 'meaning', matchedWords: [] },
  ],
  ...overrides,
});
const outcome = (overrides: Partial<SearchOutcome> = {}): SearchOutcome => ({ cue: 'ddns', results: [result()], wordsNotFound: [], ...overrides });
const mountResults = (props: Record<string, unknown> = {}) => mount(MemorySearchResults, {
  props: { query: 'ddns', status: 'ready', outcome: outcome(), error: null, coverage: { textPct: 100, meaningPct: 100 }, ...props },
});

describe('MemorySearchResults', () => {
  it('shows one card per run with its run ID and workspace on one line, days and 1–2 matches with file, lines, found words and snippet', async () => {
    const wrapper = mountResults({ outcome: outcome({ results: [result({ team: { name: 'Software Team', kind: 'team' }, member: 'lead' })] }) });
    const card = wrapper.get('[data-test="memory-result"]');
    expect(card.get('h3').text()).toBe('Codex · Software Team / lead');
    expect(card.text()).toContain('codex_45ce · /w/home');
    expect(card.get('[data-test="memory-result-days"]').text()).not.toMatch(/mentioned/i);
    const matches = card.findAll('[data-test="memory-match"]');
    expect(matches).toHaveLength(2);
    expect(matches[0]!.text()).toContain('work_journal_active.md');
    expect(matches[0]!.findAll('[data-test="memory-snippet"] div').map((line) => line.text())).toEqual(['User: set up DDNS', 'Command: crontab -l']);
    // A text match lists its words; a meaning match carries no label; no grade and no separate open line.
    expect(matches[0]!.get('[data-test="memory-match-words"]').text()).toBe('Words: ddns, crontab');
    expect(matches[1]!.find('[data-test="memory-match-words"]').exists()).toBe(false);
    expect(card.text()).not.toMatch(/strong|fair|weak|meaning|open at/i);
    expect(wrapper.find('[data-test="memory-search-some-not-found"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="memory-search-coverage"]').exists()).toBe(false);

    await matches[1]!.trigger('click');
    expect(wrapper.emitted('open')?.[0]?.[1]).toMatchObject({ file: 'work_journal_000001.md', fromLine: 40 });
    await card.get('button').trigger('click');
    expect(wrapper.emitted('open')?.[1]?.[1]).toMatchObject({ fromLine: 812 });
  });

  it('names the words found in no journal: gray when some were found, amber when no match holds any word', () => {
    const some = mountResults({ outcome: outcome({ wordsNotFound: ['cloudflare'] }) });
    expect(some.get('[data-test="memory-search-some-not-found"]').text()).toBe('Not found in your memory: cloudflare.');
    expect(some.find('[data-test="memory-search-none-found"]').exists()).toBe(false);

    const meaningOnly = result({ matches: [{ file: 'a.md', fromLine: 1, toLine: 2, day: null, snippet: ['x'], kind: 'meaning', matchedWords: [] }] });
    const none = mountResults({ outcome: outcome({ results: [meaningOnly], wordsNotFound: ['purple', 'elephant'] }) });
    expect(none.get('[data-test="memory-search-none-found"]').text()).toBe('None of these words appear in your memory: purple, elephant.');
    expect(none.findAll('[data-test="memory-result"]')).toHaveLength(1);
    expect(none.find('[data-test="memory-match-words"]').exists()).toBe(false);
  });

  it('says there were no matches and suggests other words, never that nothing is in memory', () => {
    const wrapper = mountResults({ outcome: outcome({ results: [] }) });
    expect(wrapper.find('[data-test="memory-search-none"]').exists()).toBe(true);
    expect(wrapper.text()).not.toMatch(/nothing in memory/i);
  });

  it('says how much the index covers while it is incomplete', () => {
    // The server names no word as not found while the Text index is incomplete: only the coverage note shows.
    const partial = mountResults({ coverage: { textPct: 40, meaningPct: 0 } });
    expect(partial.find('[data-test="memory-search-coverage"]').exists()).toBe(true);
    expect(partial.find('[data-test="memory-search-some-not-found"]').exists()).toBe(false);
    expect(mountResults({ coverage: { textPct: 100, meaningPct: 60 } }).find('[data-test="memory-search-coverage"]').exists()).toBe(true);
  });

  it('shows the error with Retry, and the searching state', async () => {
    const failed = mountResults({ status: 'error', outcome: null });
    expect(failed.find('[data-test="memory-search-error"]').exists()).toBe(true);
    await failed.get('[data-test="memory-search-error"] button').trigger('click');
    expect(failed.emitted('retry')).toHaveLength(1);
    expect(mountResults({ status: 'loading', outcome: null }).find('[data-test="memory-result"]').exists()).toBe(false);
  });

  it('leaves out days a run or match does not have, and a match day the card already says', () => {
    const wrapper = mountResults({ outcome: outcome({ results: [result({ firstDay: null, latestDay: null, matches: [{ file: 'a.md', fromLine: 1, toLine: 2, day: null, snippet: ['x'], kind: 'text', matchedWords: ['x'] }] })] }) });
    expect(wrapper.find('[data-test="memory-result-days"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="memory-match-day"]').exists()).toBe(false);
    // One day for the whole run: its matches do not repeat it; a range: each match says its day.
    const oneDay = mountResults({ outcome: outcome({ results: [result({ firstDay: '2026-08-27', matches: [result().matches[0]!] })] }) });
    expect(oneDay.find('[data-test="memory-match-day"]').exists()).toBe(false);
    expect(mountResults().findAll('[data-test="memory-match-day"]')).toHaveLength(2);
  });
});
