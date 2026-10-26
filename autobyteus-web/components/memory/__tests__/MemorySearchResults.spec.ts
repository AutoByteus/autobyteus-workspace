import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import MemorySearchResults from '../MemorySearchResults.vue';
import type { SearchOutcome, SearchResult } from '~/types/memorySearch';

const result = (overrides: Partial<SearchResult> = {}): SearchResult => ({
  runId: 'codex_45ce', agentName: 'Codex', team: null, member: null, workspace: '/w/home', firstDay: '2026-08-25', latestDay: '2026-08-27',
  subject: { kind: 'AGENT', runId: 'codex_45ce', agentDefinitionId: 'codex' },
  matches: [
    { file: 'work_journal_active.md', fromLine: 812, toLine: 814, day: '2026-08-27', snippet: ['User: set up DDNS', 'Command: crontab -l'], kind: 'text', strength: 'strong' },
    { file: 'work_journal_000001.md', fromLine: 40, toLine: 42, day: '2026-08-25', snippet: ['User: home.example.org'], kind: 'meaning', strength: 'fair' },
  ],
  ...overrides,
});
const outcome = (overrides: Partial<SearchOutcome> = {}): SearchOutcome => ({ cue: 'ddns', results: [result()], weakOnly: false, ...overrides });
const mountResults = (props: Record<string, unknown> = {}) => mount(MemorySearchResults, {
  props: { query: 'ddns', status: 'ready', outcome: outcome(), error: null, coverage: { textPct: 100, meaningPct: 100 }, ...props },
});

describe('MemorySearchResults', () => {
  it('shows one card per run with its run ID, workspace, days and 1–2 matches with file, lines, kind, strength and snippet', async () => {
    const wrapper = mountResults({ outcome: outcome({ results: [result({ team: { name: 'Software Team', kind: 'team' }, member: 'lead' })] }) });
    const card = wrapper.get('[data-test="memory-result"]');
    expect(card.get('h3').text()).toBe('Codex · Software Team / lead');
    expect(card.text()).toContain('codex_45ce');
    expect(card.text()).toContain('/w/home');
    const matches = card.findAll('[data-test="memory-match"]');
    expect(matches).toHaveLength(2);
    expect(matches[0]!.text()).toContain('work_journal_active.md');
    expect(matches[0]!.findAll('[data-test="memory-snippet"] div').map((line) => line.text())).toEqual(['User: set up DDNS', 'Command: crontab -l']);
    expect(wrapper.find('[data-test="memory-search-weak"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="memory-search-coverage"]').exists()).toBe(false);

    await matches[1]!.trigger('click');
    expect(wrapper.emitted('open')?.[0]?.[1]).toMatchObject({ file: 'work_journal_000001.md', fromLine: 40 });
    await card.get('button').trigger('click');
    expect(wrapper.emitted('open')?.[1]?.[1]).toMatchObject({ fromLine: 812 });
  });

  it('says when only weak matches were found, and still lists them', () => {
    const weak = result({ matches: [{ file: 'a.md', fromLine: 1, toLine: 2, day: null, snippet: ['x'], kind: 'text', strength: 'weak' }] });
    const wrapper = mountResults({ outcome: outcome({ results: [weak], weakOnly: true }) });
    expect(wrapper.find('[data-test="memory-search-weak"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-test="memory-result"]')).toHaveLength(1);
  });

  it('says there were no matches and suggests other words, never that nothing is in memory', () => {
    const wrapper = mountResults({ outcome: outcome({ results: [] }) });
    expect(wrapper.find('[data-test="memory-search-none"]').exists()).toBe(true);
    expect(wrapper.text()).not.toMatch(/nothing in memory/i);
  });

  it('says how much the index covers while it is incomplete', () => {
    expect(mountResults({ coverage: { textPct: 40, meaningPct: 0 } }).find('[data-test="memory-search-coverage"]').exists()).toBe(true);
    expect(mountResults({ coverage: { textPct: 100, meaningPct: 60 } }).find('[data-test="memory-search-coverage"]').exists()).toBe(true);
  });

  it('shows the error with Retry, and the searching state', async () => {
    const failed = mountResults({ status: 'error', outcome: null });
    expect(failed.find('[data-test="memory-search-error"]').exists()).toBe(true);
    await failed.get('[data-test="memory-search-error"] button').trigger('click');
    expect(failed.emitted('retry')).toHaveLength(1);
    expect(mountResults({ status: 'loading', outcome: null }).find('[data-test="memory-result"]').exists()).toBe(false);
  });

  it('leaves out days a run or match does not have', () => {
    const wrapper = mountResults({ outcome: outcome({ results: [result({ firstDay: null, latestDay: null, matches: [{ file: 'a.md', fromLine: 1, toLine: 2, day: null, snippet: ['x'], kind: 'text', strength: 'fair' }] })] }) });
    expect(wrapper.find('[data-test="memory-result-days"]').exists()).toBe(false);
  });
});
