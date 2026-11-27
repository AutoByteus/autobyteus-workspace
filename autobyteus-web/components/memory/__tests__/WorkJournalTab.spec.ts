import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import WorkJournalTab from '../WorkJournalTab.vue';
import { useMemoryJournalStore } from '~/stores/memoryJournalStore';
import { useMemorySearchStore } from '~/stores/memorySearchStore';

const FILE = { name: 'work_journal_active.md', lines: 6200, sizeKb: 512, firstDay: '2026-08-25', lastDay: '2026-08-27', days: [{ day: '2026-08-25', line: 5 }], open: true };
const OLDER = { name: 'work_journal_000001.md', lines: 300, sizeKb: 24, firstDay: '2026-08-20', lastDay: '2026-08-21', days: [{ day: '2026-08-20', line: 2 }], open: false };

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

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
    store.files = [FILE, OLDER];
    store.selectedFile = FILE.name;
    store.from = 801;
    store.to = 1100;
    store.lines = [
      { n: 811, text: '[2026-08-27]' },
      { n: 812, text: '[03:56:08] User: set up DDNS [↗](../raw_traces_active.jsonl#rt_1)' },
      { n: 813, text: '[--:--:--] Command: crontab -l → exit 0' },
      { n: 814, text: '            [↗](../raw_traces_active.jsonl#rt_2)' },
    ];
    store.focus = { file: FILE.name, fromLine: 812, toLine: 813, cue: 'ddns', kind: 'text', words: ['ddns', 'home'] };
    search.outcome = { cue: 'ddns', wordsNotFound: [], results: [{
      runId: 'run-1', agentName: 'Codex', team: null, member: null, workspace: null, firstDay: null, latestDay: null, subject: { kind: 'AGENT', runId: 'run-1', agentDefinitionId: null },
      matches: [
        { file: FILE.name, fromLine: 812, toLine: 813, day: '2026-08-27', snippet: [], kind: 'text', matchedWords: ['ddns', 'home'] },
        { file: FILE.name, fromLine: 4000, toLine: 4002, day: '2026-08-26', snippet: [], kind: 'meaning', matchedWords: [] },
      ],
    }] };
    const wrapper = mountIt();
    // The banner names the cue and the lines with their found words; a meaning match shows only its lines.
    expect(wrapper.get('[data-test="work-journal-found"]').text()).toContain('lines 812–813 · Words: ddns, home');
    expect(wrapper.get('[data-test="work-journal-found"]').text()).not.toMatch(/strong|meaning/i);
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

  const opened = (files: typeof FILE[]) => {
    const context = setup();
    context.store.subject = { kind: 'agent', runId: 'run-1', source: { type: 'LOCAL' } };
    context.store.files = files;
    context.store.selectedFile = files[0]!.name;
    context.store.from = 1;
    context.store.to = 3;
    context.store.lines = [{ n: 1, text: '[06:00:00] User: hello' }, { n: 2, text: '           HTTP/2 200' }, { n: 3, text: 'tail' }];
    return context;
  };

  it('one journal file: no file list and no picker; its header names it (autobyteus-608 DC-008, VIS-012)', () => {
    const wrapper = opened([FILE]).mountIt();
    expect(wrapper.find('nav').exists()).toBe(false);
    expect(wrapper.find('[data-test="work-journal-file-select"]').exists()).toBe(false);
    const name = wrapper.get('[data-test="work-journal-file-name"]');
    expect(name.text()).toBe('work_journal_active.md');
    expect(name.classes()).not.toContain('hidden');
  });

  it('2+ journal files: the list at ≥ 1280 px, below it the header picker in place of the name; choosing a file loads it (TR-005, VIS-013, VIS-015)', async () => {
    const { store, mountIt } = opened([FILE, OLDER]);
    const wrapper = mountIt();
    expect(wrapper.get('nav').classes()).toEqual(expect.arrayContaining(['hidden', 'xl:block']));
    expect(wrapper.findAll('[data-test="work-journal-file"]')).toHaveLength(2);
    expect(wrapper.get('[data-test="work-journal-file-name"]').classes()).toEqual(expect.arrayContaining(['hidden', 'xl:block']));
    const picker = wrapper.get('select[data-test="work-journal-file-select"]');
    expect(picker.element.parentElement?.classList.contains('xl:hidden')).toBe(true);
    expect(picker.findAll('option').map((option) => option.text())).toEqual(['work_journal_active.md (Active)', 'work_journal_000001.md']);
    expect(wrapper.get('label[for="work-journal-file-select"]').classes()).toContain('sr-only');
    await picker.setValue('work_journal_000001.md');
    expect(store.selectFile).toHaveBeenCalledWith('work_journal_000001.md');
  });

  it('Jump to day is the same picker; Go to line jumps on Enter with no Go button and no spinner (DC-009)', async () => {
    const { store, mountIt } = opened([FILE]);
    const wrapper = mountIt();
    const day = wrapper.get('select[data-test="work-journal-day"]');
    expect(day.classes()).toEqual(expect.arrayContaining(['appearance-none', 'text-xs']));
    expect(day.element.parentElement?.querySelector('[data-icon="heroicons:chevron-down-20-solid"]')).not.toBeNull();
    await day.setValue('5');
    expect(store.gotoLine).toHaveBeenCalledWith(5);

    expect(wrapper.find('form button').exists()).toBe(false);
    const line = wrapper.get('[data-test="work-journal-line"]');
    expect(line.classes()).toContain('no-spinner');
    expect(line.attributes('enterkeyhint')).toBe('go');
  });

  it('fills the remaining height with its lines, not the viewport; a detail line indents by its leading spaces (DC-008)', () => {
    const wrapper = opened([FILE]).mountIt();
    const lines = wrapper.get('[data-test="work-journal-lines"]');
    expect(lines.classes()).toEqual(expect.arrayContaining(['grow', 'basis-0', 'overflow-auto']));
    expect(lines.attributes('class')).not.toMatch(/vh/);
    const detail = wrapper.get('[data-line="2"] .journal-detail');
    expect(detail.text()).toBe('HTTP/2 200');
    expect((detail.element as HTMLElement).style.getPropertyValue('--indent')).toBe('11ch');
  });
});
