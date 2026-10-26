import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import WorkJournalTab from '../WorkJournalTab.vue';
import { useMemoryJournalStore } from '~/stores/memoryJournalStore';
import { useMemorySearchStore } from '~/stores/memorySearchStore';

const FILE = { name: 'work_journal_active.md', lines: 6200, sizeKb: 512, firstDay: '2026-08-25', lastDay: '2026-08-27', days: [{ day: '2026-08-25', line: 5 }], open: true };

const setup = () => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
  const store = useMemoryJournalStore();
  const search = useMemorySearchStore();
  return { store, search, mountIt: () => mount(WorkJournalTab, { global: { plugins: [pinia] } }) };
};

describe('WorkJournalTab', () => {
  it('a local run without a Work Journal offers to index memory (R-6)', async () => {
    const { store, mountIt } = setup();
    store.subject = { kind: 'agent', runId: 'run-1', source: { type: 'LOCAL' } };
    store.missing = true;
    const wrapper = mountIt();
    expect(wrapper.find('[data-test="work-journal-missing"]').exists()).toBe(true);
    await wrapper.get('[data-test="work-journal-open-index"]').trigger('click');
    expect(wrapper.emitted('openIndex')).toHaveLength(1);
  });

  it('an imported run without a Work Journal only says so', () => {
    const { store, mountIt } = setup();
    store.subject = { kind: 'agent', runId: 'run-1', source: { type: 'IMPORTED', memorySyncSourceId: 'docker-1' } as never };
    store.missing = true;
    const wrapper = mountIt();
    expect(wrapper.find('[data-test="work-journal-missing"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="work-journal-open-index"]').exists()).toBe(false);
  });

  it('opened from a result: banner, highlighted matched lines, file marker, Match buttons for the run’s two matches', async () => {
    const { store, search, mountIt } = setup();
    store.subject = { kind: 'agent', runId: 'run-1', source: { type: 'LOCAL' } };
    store.runId = 'run-1';
    store.files = [FILE];
    store.selectedFile = FILE.name;
    store.from = 801;
    store.to = 1100;
    store.lines = [
      { n: 811, text: '[2026-08-27]' },
      { n: 812, text: '[03:56:08] User: set up DDNS [↗](../raw_traces_active.jsonl#rt_1)' },
      { n: 813, text: '[--:--:--] Command: crontab -l → exit 0' },
      { n: 814, text: '            [↗](../raw_traces_active.jsonl#rt_2)' },
    ];
    store.focus = { file: FILE.name, fromLine: 812, toLine: 813, cue: 'ddns', kind: 'text', strength: 'strong' };
    search.outcome = { cue: 'ddns', weakOnly: false, results: [{
      runId: 'run-1', agentName: 'Codex', team: null, member: null, workspace: null, firstDay: null, latestDay: null, subject: { kind: 'AGENT', runId: 'run-1', agentDefinitionId: null },
      matches: [
        { file: FILE.name, fromLine: 812, toLine: 813, day: '2026-08-27', snippet: [], kind: 'text', strength: 'strong' },
        { file: FILE.name, fromLine: 4000, toLine: 4002, day: '2026-08-26', snippet: [], kind: 'meaning', strength: 'fair' },
      ],
    }] };
    const wrapper = mountIt();
    expect(wrapper.find('[data-test="work-journal-found"]').exists()).toBe(true);
    const matched = wrapper.findAll('[data-line]').filter((row) => row.classes().includes('bg-amber-50')).map((row) => row.attributes('data-line'));
    expect(matched).toEqual(['812', '813']);
    // `[--:--:--]` entries read as entries (time, then the bold action).
    expect(wrapper.get('[data-line="813"]').find('.font-semibold').text()).toBe('Command:');
    expect(wrapper.get('[data-line="814"]').find('.text-gray-300').exists()).toBe(true);
    // A trailing raw-trace link is split off and de-emphasised.
    expect(wrapper.get('[data-line="812"] [data-test="work-journal-raw-link"]').text()).toBe('[↗](../raw_traces_active.jsonl#rt_1)');
    expect(wrapper.get('[data-line="812"]').text()).toContain('User: set up DDNS');
    expect(wrapper.find('[data-test="work-journal-file-marker"]').exists()).toBe(true);
    const buttons = wrapper.findAll('[data-test="work-journal-match"]');
    expect(buttons).toHaveLength(2);
    await buttons[1]!.trigger('click');
    expect(store.gotoLine).toHaveBeenCalledWith(4000);
    expect(store.focus).toMatchObject({ fromLine: 4000, kind: 'meaning' });
  });

  it('a large file loads in windows: earlier/later buttons, the range and the large-file note', async () => {
    const { store, mountIt } = setup();
    store.subject = { kind: 'agent', runId: 'run-1', source: { type: 'LOCAL' } };
    store.files = [FILE];
    store.selectedFile = FILE.name;
    store.from = 301;
    store.to = 600;
    store.lines = [{ n: 301, text: 'x' }];
    const wrapper = mountIt();
    expect(wrapper.find('[data-test="work-journal-earlier"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="work-journal-later"]').exists()).toBe(true);
    await wrapper.get('[data-test="work-journal-later"]').trigger('click');
    expect(store.loadLater).toHaveBeenCalled();
    await wrapper.get('[data-test="work-journal-line"]').setValue(5000);
    await wrapper.get('form').trigger('submit');
    expect(store.gotoLine).toHaveBeenCalledWith(5000);
    expect(wrapper.text()).toContain('Large file');
  });
});
