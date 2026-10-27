import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { JOURNAL_WINDOW, useMemoryJournalStore } from '~/stores/memoryJournalStore';

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }));

type Window = { journalFile?: string | null; start: number; end: number };
const FILES = [
  { journalFile: 'work_journal_000001.md', state: 'CLOSED', sizeBytes: 81_920, lineCount: 1200, days: [{ day: '2026-08-25', line: 5 }, { day: '2026-08-26', line: 700 }] },
  { journalFile: 'work_journal_active.md', state: 'OPEN', sizeBytes: 2048, lineCount: 40, days: [{ day: '2026-08-27', line: 5 }] },
];

/** A server that answers every Work Journal read with its files and the requested window (latest file by default). */
const journalServer = (options: { missing?: boolean } = {}) => {
  const reads: Array<{ name: string; variables: Record<string, unknown> }> = [];
  const query = vi.fn(({ query: document, variables }: { query: { definitions: Array<{ name?: { value: string } }> }; variables: Record<string, unknown> }) => {
    const name = document.definitions[0]!.name!.value;
    reads.push({ name, variables });
    const window = variables.workJournal as Window;
    const file = FILES.find((f) => f.journalFile === window.journalFile) ?? FILES[FILES.length - 1]!;
    const end = Math.min(file.lineCount, window.end);
    const journal = options.missing ? null : {
      files: FILES, selectedFile: file.journalFile, start: window.start, end, lineCount: file.lineCount,
      lines: Array.from({ length: Math.max(0, end - window.start + 1) }, (_, i) => `line ${window.start + i}`),
    };
    const data = name === 'GetRunFolderWorkJournal' ? { runFolderWorkJournal: journal }
      : { getAgentRunMemoryView: { runId: 'r', workJournal: journal }, getTeamMemberRunMemoryView: { runId: 'r', workJournal: journal }, getAgentOrgMemberRunMemoryView: { runId: 'r', workJournal: journal } };
    return Promise.resolve({ data });
  });
  vi.mocked(getApolloClient).mockReturnValue({ query } as never);
  return reads;
};

const LOCAL = { type: 'LOCAL' as const };

describe('memoryJournalStore', () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => vi.mocked(getApolloClient).mockReset());

  it('opened plainly, shows the first file from line 1 with its files, sizes, days and Active flag', async () => {
    const reads = journalServer();
    const store = useMemoryJournalStore();
    await store.open({ kind: 'agent', runId: 'run-1', source: LOCAL }, 'run-1', null);
    expect(store.selectedFile).toBe('work_journal_000001.md');
    expect([store.from, store.to]).toEqual([1, JOURNAL_WINDOW]);
    expect(store.lines[0]).toEqual({ n: 1, text: 'line 1' });
    expect(store.files).toEqual([
      { name: 'work_journal_000001.md', lines: 1200, sizeKb: 80, firstDay: '2026-08-25', lastDay: '2026-08-26', days: [{ day: '2026-08-25', line: 5 }, { day: '2026-08-26', line: 700 }], open: false },
      { name: 'work_journal_active.md', lines: 40, sizeKb: 2, firstDay: '2026-08-27', lastDay: '2026-08-27', days: [{ day: '2026-08-27', line: 5 }], open: true },
    ]);
    expect(reads.map((read) => read.name)).toEqual(['GetAgentRunWorkJournal', 'GetAgentRunWorkJournal']);
    expect(reads[0]!.variables).toMatchObject({ runId: 'run-1', source: LOCAL, workJournal: { journalFile: null, start: 1, end: 300 } });
  });

  it('opened from a result, reads one window around the matched lines of that file and jumps to them', async () => {
    const reads = journalServer();
    const store = useMemoryJournalStore();
    await store.open({ kind: 'team', teamRunId: 'team-1', agentRunId: 'lead-1', source: LOCAL }, 'lead-1', { file: 'work_journal_000001.md', fromLine: 812, toLine: 815, cue: 'ddns', kind: 'text', words: ['ddns'] });
    expect(reads).toHaveLength(1);
    expect(reads[0]).toMatchObject({ name: 'GetTeamMemberRunWorkJournal', variables: { teamRunId: 'team-1', agentRunId: 'lead-1', workJournal: { journalFile: 'work_journal_000001.md', start: 662, end: 961 } } });
    expect(store.selectedFile).toBe('work_journal_000001.md');
    expect(store.jump?.line).toBe(812);
    expect(store.lines.some((line) => line.n === 812)).toBe(true);
  });

  it('goes to a line (clamped), loads earlier and later lines, and switches files', async () => {
    journalServer();
    const store = useMemoryJournalStore();
    await store.open({ kind: 'org', orgRunId: 'org-1', agentRunId: 'a-1', source: LOCAL }, 'a-1', null);
    await store.gotoLine(5000);
    expect([store.from, store.to]).toEqual([901, 1200]);
    expect(store.jump?.line).toBe(1200);
    await store.loadEarlier();
    expect([store.from, store.to]).toEqual([601, 1200]);
    expect(store.lines[0]).toEqual({ n: 601, text: 'line 601' });
    await store.gotoLine(1);
    await store.loadLater();
    expect([store.from, store.to]).toEqual([1, 600]);
    await store.selectFile('work_journal_active.md');
    expect([store.selectedFile, store.from, store.to]).toEqual(['work_journal_active.md', 1, 40]);
  });

  it('reads a run known only by its folder through its run key', async () => {
    const reads = journalServer();
    const store = useMemoryJournalStore();
    await store.open({ kind: 'folder', runKey: 'agent_teams/old/member' }, 'member', null);
    expect(reads[0]).toMatchObject({ name: 'GetRunFolderWorkJournal', variables: { runKey: 'agent_teams/old/member' } });
    expect(reads[0]!.variables).not.toHaveProperty('source');
  });

  it('marks a run without a Work Journal as missing', async () => {
    journalServer({ missing: true });
    const store = useMemoryJournalStore();
    await store.open({ kind: 'agent', runId: 'run-1', source: LOCAL }, 'run-1', null);
    expect(store.missing).toBe(true);
    expect(store.files).toEqual([]);
  });
});
