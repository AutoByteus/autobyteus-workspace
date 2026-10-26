import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import {
  GET_AGENT_ORG_MEMBER_RUN_WORK_JOURNAL,
  GET_AGENT_RUN_WORK_JOURNAL,
  GET_RUN_FOLDER_WORK_JOURNAL,
  GET_TEAM_MEMBER_RUN_WORK_JOURNAL,
} from '~/graphql/queries/memorySearchQueries';
import type { MemoryExplorerSourceInput } from '~/types/memory';
import type { JournalFileInfo, JournalSubject } from '~/types/memorySearch';

/**
 * The Work Journal view of one run (work-journal-search): a run's journal is several Markdown files and a file can
 * be several MB, so lines are read from the server in windows around a line and shown one window at a time.
 */
export const JOURNAL_WINDOW = 300;

export interface JournalFocus {
  file: string;
  fromLine: number;
  toLine: number;
  cue?: string | null;
  kind?: 'text' | 'meaning' | null;
  strength?: 'strong' | 'fair' | 'weak' | null;
}

type ServerJournal = {
  files: Array<{ journalFile: string; state: string; sizeBytes: number; lineCount: number; days: Array<{ day: string; line: number }> }>;
  selectedFile: string | null;
  start: number;
  end: number;
  lineCount: number;
  lines: string[];
};
type Window = { file: string | null; start: number; end: number };

interface JournalState {
  subject: JournalSubject | null;
  /** The run ID the journal belongs to (the search result's run). */
  runId: string | null;
  files: JournalFileInfo[];
  /** The run has no Work Journal yet (it is made by the memory index build or by the run's next turn). */
  missing: boolean;
  loading: boolean;
  error: string | null;
  selectedFile: string | null;
  from: number;
  to: number;
  lines: Array<{ n: number; text: string }>;
  focus: JournalFocus | null;
  /** Bumped on every jump so the view scrolls even when the same line is chosen again. */
  jump: { line: number; token: number } | null;
  requestId: number;
}

const toFileInfo = (file: ServerJournal['files'][number]): JournalFileInfo => ({
  name: file.journalFile,
  lines: file.lineCount,
  sizeKb: Math.max(1, Math.round(file.sizeBytes / 1024)),
  firstDay: file.days[0]?.day ?? null,
  lastDay: file.days[file.days.length - 1]?.day ?? null,
  days: file.days.map(day => ({ day: day.day, line: day.line })),
  open: file.state === 'OPEN',
});

const sourceOf = (subject: JournalSubject): MemoryExplorerSourceInput | undefined => (subject.kind === 'folder' ? undefined : subject.source);

/** One read: the run's journal files and the lines of one window. */
const readJournal = async (subject: JournalSubject, window: Window): Promise<ServerJournal | null> => {
  const workJournal = { journalFile: window.file, start: window.start, end: window.end };
  const client = getApolloClient();
  const read = async (query: unknown, variables: Record<string, unknown>, pick: (data: any) => ServerJournal | null) => {
    const { data, errors } = await client.query<any>({ query: query as any, variables: { ...variables, workJournal }, fetchPolicy: 'network-only' });
    if (errors?.length) throw new Error(errors.map(e => e.message).join(', '));
    return pick(data);
  };
  switch (subject.kind) {
    case 'agent': return read(GET_AGENT_RUN_WORK_JOURNAL, { runId: subject.runId, source: sourceOf(subject) }, data => data.getAgentRunMemoryView?.workJournal ?? null);
    case 'team': return read(GET_TEAM_MEMBER_RUN_WORK_JOURNAL, { teamRunId: subject.teamRunId, agentRunId: subject.agentRunId, source: sourceOf(subject) }, data => data.getTeamMemberRunMemoryView?.workJournal ?? null);
    case 'org': return read(GET_AGENT_ORG_MEMBER_RUN_WORK_JOURNAL, { orgRunId: subject.orgRunId, agentRunId: subject.agentRunId, source: sourceOf(subject) }, data => data.getAgentOrgMemberRunMemoryView?.workJournal ?? null);
    default: return read(GET_RUN_FOLDER_WORK_JOURNAL, { runKey: subject.runKey }, data => data.runFolderWorkJournal ?? null);
  }
};

const toLines = (journal: ServerJournal) => journal.lines.map((text, i) => ({ n: journal.start + i, text }));
const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const useMemoryJournalStore = defineStore('memoryJournalStore', {
  state: (): JournalState => ({
    subject: null, runId: null, files: [], missing: false, loading: false, error: null, selectedFile: null,
    from: 1, to: 0, lines: [], focus: null, jump: null, requestId: 0,
  }),

  getters: {
    current: (state): JournalFileInfo | null => state.files.find(f => f.name === state.selectedFile) ?? null,
    /** Files that hold the matched lines, for the marker in the file list. */
    focusFile: (state): string | null => state.focus?.file ?? null,
  },

  actions: {
    /** Opens a run's Work Journal: at the matched lines when it comes from a result, else the first file's first lines. */
    async open(subject: JournalSubject, runId: string, focus: JournalFocus | null) {
      const requestId = ++this.requestId;
      this.subject = subject;
      this.runId = runId;
      this.focus = focus;
      this.loading = true;
      this.error = null;
      this.missing = false;
      try {
        const around = focus ? this.windowAround(focus.fromLine, Number.MAX_SAFE_INTEGER) : { start: 1, end: JOURNAL_WINDOW };
        let journal = await readJournal(subject, { file: focus?.file ?? null, ...around });
        if (requestId !== this.requestId) return;
        // Opened plainly, the reader starts at the first file (the server answers with the latest one).
        const first = journal?.files[0]?.journalFile;
        if (journal && !focus && first && journal.selectedFile !== first) {
          journal = await readJournal(subject, { file: first, start: 1, end: JOURNAL_WINDOW });
          if (requestId !== this.requestId) return;
        }
        this.missing = !journal;
        this.files = journal ? journal.files.map(toFileInfo) : [];
        this.applyWindow(journal, focus ? focus.fromLine : null);
      } catch (error) {
        if (requestId !== this.requestId) return;
        this.files = [];
        this.lines = [];
        this.error = errorText(error);
      } finally {
        if (requestId === this.requestId) this.loading = false;
      }
    },

    /** A 300-line window centred on `line`, within the file. */
    windowAround(line: number, lineCount: number): { start: number; end: number } {
      const clamped = Math.min(Math.max(1, line), Math.max(1, lineCount));
      const half = Math.floor(JOURNAL_WINDOW / 2);
      let start = Math.max(1, clamped - half);
      const end = Math.min(lineCount, start + JOURNAL_WINDOW - 1);
      start = Math.max(1, end - JOURNAL_WINDOW + 1);
      return { start, end };
    },

    applyWindow(journal: ServerJournal | null, scrollTo: number | null) {
      if (!journal || !journal.selectedFile) {
        this.selectedFile = null;
        this.lines = [];
        this.from = 1;
        this.to = 0;
        return;
      }
      this.selectedFile = journal.selectedFile;
      this.lines = toLines(journal);
      this.from = journal.start;
      this.to = journal.end;
      const token = (this.jump?.token ?? 0) + 1;
      const line = scrollTo === null ? this.from : Math.min(Math.max(1, scrollTo), journal.lineCount);
      this.jump = { line, token };
    },

    /** Reads the window around `line` in the selected file and scrolls to it. */
    async showAround(line: number, scroll: boolean) {
      const file = this.current;
      if (!file || !this.subject) return;
      const requestId = ++this.requestId;
      try {
        const journal = await readJournal(this.subject, { file: file.name, ...this.windowAround(line, file.lines) });
        if (requestId !== this.requestId) return;
        if (journal) this.files = journal.files.map(toFileInfo);
        this.applyWindow(journal, scroll ? line : null);
      } catch (error) {
        if (requestId === this.requestId) this.error = errorText(error);
      }
    },

    async selectFile(name: string, line = 1) {
      if (!this.files.some(f => f.name === name)) return;
      this.selectedFile = name;
      await this.showAround(line, line > 1);
    },

    async gotoLine(line: number) {
      if (!Number.isFinite(line)) return;
      await this.showAround(Math.round(line), true);
    },

    async loadEarlier() {
      const file = this.current;
      if (!file || !this.subject || this.from <= 1) return;
      const start = Math.max(1, this.from - JOURNAL_WINDOW);
      const journal = await this.readMore({ file: file.name, start, end: this.from - 1 });
      if (!journal) return;
      this.lines = [...toLines(journal), ...this.lines];
      this.from = journal.start;
    },

    async loadLater() {
      const file = this.current;
      if (!file || !this.subject || this.to >= file.lines) return;
      const journal = await this.readMore({ file: file.name, start: this.to + 1, end: Math.min(file.lines, this.to + JOURNAL_WINDOW) });
      if (!journal) return;
      this.lines = [...this.lines, ...toLines(journal)];
      this.to = journal.end;
    },

    async readMore(window: Window): Promise<ServerJournal | null> {
      const requestId = ++this.requestId;
      try {
        const journal = await readJournal(this.subject!, window);
        if (requestId !== this.requestId || !journal || journal.selectedFile !== window.file) return null;
        this.files = journal.files.map(toFileInfo);
        return journal;
      } catch (error) {
        if (requestId === this.requestId) this.error = errorText(error);
        return null;
      }
    },

    clear() {
      this.requestId += 1;
      this.subject = null; this.runId = null; this.files = []; this.missing = false; this.selectedFile = null;
      this.lines = []; this.focus = null; this.error = null; this.jump = null; this.loading = false;
    },
  },
});
