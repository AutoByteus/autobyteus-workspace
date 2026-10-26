import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { MEMORY_INDEX_STATUS, MEMORY_SEARCH } from '~/graphql/queries/memorySearchQueries';
import { REBUILD_MEMORY_INDEX, START_MEMORY_INDEXING } from '~/graphql/mutations/memorySearchMutations';
import type {
  IndexPhase,
  IndexStatus,
  IndexStep,
  MemoryRunSubject,
  SearchMatch,
  SearchOutcome,
  SearchResult,
  StepId,
  StepState,
  Strength,
} from '~/types/memorySearch';

/**
 * Memory search and the memory index as the Memory page sees them (work-journal-search): the search reads the
 * server's memory index; the index status is read again about every 2 s while a build (or the Meaning index in
 * the background) is running, and once otherwise.
 */
export type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';
/** The three tabs of the Memory page. */
export type MemorySection = 'search' | 'browse' | 'index';

type ServerStep = { step: string; state: string; done: number; total: number; unit: string; failureMessage?: string | null };
type ServerStatus = {
  state: string;
  steps: ServerStep[];
  runCount: number;
  journalFileCount: number;
  updatedAt?: string | null;
  textIndexHasContent: boolean;
  activeModelId: string;
  meaningIndexModelId?: string | null;
  meaningNote?: string | null;
};
type ServerSubject = { kind: string; runId?: string | null; agentDefinitionId?: string | null; teamRunId?: string | null; orgRunId?: string | null; agentRunId?: string | null; runKey?: string | null };
type ServerMatch = { journalFileName: string; lineStart: number; lineEnd: number; day?: string | null; snippet: string; matchedBy: string; strength: string };
export type ServerSearchResult = {
  agent: string; team?: string | null; member?: string | null; org?: string | null; runId: string; workspace?: string | null;
  firstDay?: string | null; latestDay?: string | null; subject: ServerSubject; matches: ServerMatch[];
};

interface MemorySearchState {
  query: string;
  status: SearchStatus;
  outcome: SearchOutcome | null;
  error: string | null;
  /** How much of memory the search read when it ran. */
  coverage: { textPct: number; meaningPct: number } | null;
  index: IndexStatus | null;
  indexError: string | null;
  requestId: number;
}

/** Status reads while a build runs (the spec's "about every 2 s"). */
export const MEMORY_INDEX_POLL_MS = 2000;
const STEP_IDS: Record<string, StepId> = { FIND_RUNS: 'runs', JOURNALS: 'journals', TEXT_INDEX: 'text', MEANING_INDEX: 'meaning' };
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let statusRequest: Promise<void> | null = null;

const pct = (done: number, total: number) => (total ? Math.floor((done / total) * 100) : 0);

const toStep = (step: ServerStep): IndexStep => ({
  id: STEP_IDS[step.step] ?? 'runs',
  state: step.state.toLowerCase() as StepState,
  done: step.done,
  total: step.total,
  message: step.failureMessage ?? null,
});

/** The server's state, with the Meaning index still embedding after a build shown as a running last step. */
export const toIndexStatus = (status: ServerStatus): IndexStatus => {
  const steps = status.steps.map(toStep);
  let phase: IndexPhase = status.state === 'NOT_INDEXED' ? 'needs_index'
    : status.state === 'BUILDING' ? 'building'
      : status.state === 'FAILED' ? 'failed' : 'ready';
  const meaning = steps.find(step => step.id === 'meaning');
  if (status.state === 'READY' && meaning && meaning.state !== 'failed' && meaning.done < meaning.total) {
    phase = 'building';
    meaning.state = 'running';
  }
  return {
    phase,
    steps,
    builtWithModel: status.meaningIndexModelId ?? null,
    activeModel: status.activeModelId,
    updatedAt: status.updatedAt ?? null,
    runCount: status.runCount,
    textIndexHasContent: status.textIndexHasContent,
  };
};

const toSubject = (subject: ServerSubject): MemoryRunSubject => {
  if (subject.kind === 'TEAM_MEMBER') return { kind: 'TEAM_MEMBER', teamRunId: subject.teamRunId ?? '', agentRunId: subject.agentRunId ?? '' };
  if (subject.kind === 'ORG_MEMBER') return { kind: 'ORG_MEMBER', orgRunId: subject.orgRunId ?? '', agentRunId: subject.agentRunId ?? '' };
  if (subject.kind === 'RUN_FOLDER') return { kind: 'RUN_FOLDER', runKey: subject.runKey ?? '' };
  return { kind: 'AGENT', runId: subject.runId ?? '', agentDefinitionId: subject.agentDefinitionId ?? null };
};

const toMatch = (match: ServerMatch): SearchMatch => ({
  file: match.journalFileName,
  fromLine: match.lineStart,
  toLine: match.lineEnd,
  day: match.day ?? null,
  snippet: match.snippet.split('\n'),
  kind: match.matchedBy === 'MEANING' ? 'meaning' : 'text',
  strength: match.strength.toLowerCase() as Strength,
});

export const toSearchResult = (result: ServerSearchResult): SearchResult => {
  const group = result.org && result.team ? `${result.org} / ${result.team}` : result.org ?? result.team ?? null;
  return {
    runId: result.runId,
    agentName: result.agent,
    team: group ? { name: group, kind: result.org ? 'org' : 'team' } : null,
    member: result.member ?? null,
    workspace: result.workspace ?? null,
    firstDay: result.firstDay ?? null,
    latestDay: result.latestDay ?? null,
    matches: result.matches.map(toMatch),
    subject: toSubject(result.subject),
  };
};

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const useMemorySearchStore = defineStore('memorySearchStore', {
  state: (): MemorySearchState => ({ query: '', status: 'idle', outcome: null, error: null, coverage: null, index: null, indexError: null, requestId: 0 }),

  getters: {
    step: (state) => (id: StepId) => state.index?.steps.find(s => s.id === id) ?? null,
    textPct(): number { const s = this.step('text'); return s ? pct(s.done, s.total) : 0; },
    meaningPct(): number { const s = this.step('meaning'); return s ? pct(s.done, s.total) : 0; },
    /** Search reads the text index: it works as soon as any journal is in it. */
    searchReady: (state): boolean => !!state.index?.textIndexHasContent,
    isBuilding: (state) => state.index?.phase === 'building',
    modelChanged: (state) => !!state.index && state.index.phase === 'ready' && !!state.index.builtWithModel && state.index.builtWithModel !== state.index.activeModel,
  },

  actions: {
    /** Reads the index status (one read at a time); keeps reading while a build runs. */
    loadIndexStatus(): Promise<void> {
      if (statusRequest) return statusRequest;
      statusRequest = (async () => {
        try {
          const { data, errors } = await getApolloClient().query<{ memoryIndexStatus: ServerStatus }>({ query: MEMORY_INDEX_STATUS, fetchPolicy: 'network-only' });
          if (errors?.length) throw new Error(errors.map(e => e.message).join(', '));
          this.index = toIndexStatus(data.memoryIndexStatus);
          this.indexError = null;
        } catch (error) {
          this.indexError = errorText(error);
        } finally {
          statusRequest = null;
        }
        this.schedulePoll();
      })();
      return statusRequest;
    },

    schedulePoll() {
      if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
      if (this.index?.phase !== 'building') return;
      pollTimer = setTimeout(() => { pollTimer = null; void this.loadIndexStatus(); }, MEMORY_INDEX_POLL_MS);
    },

    /** Leaving the Memory page stops the status reads. */
    stopPolling() {
      if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    },

    /** Index now / Try again: only by the user's click. */
    async startIndex() {
      if (this.isBuilding) return;
      await this.runIndexCommand(START_MEMORY_INDEXING);
    },

    async rebuild() {
      if (this.isBuilding) return;
      await this.runIndexCommand(REBUILD_MEMORY_INDEX);
    },

    async runIndexCommand(mutation: typeof START_MEMORY_INDEXING) {
      try {
        const { errors } = await getApolloClient().mutate({ mutation });
        if (errors?.length) throw new Error(errors.map(e => e.message).join(', '));
        this.indexError = null;
      } catch (error) {
        this.indexError = errorText(error);
      }
      await this.loadIndexStatus();
    },

    async runSearch(cue: string) {
      const query = cue.trim();
      this.query = query;
      if (!query) { this.clearSearch(); return; }
      const requestId = ++this.requestId;
      this.status = 'loading';
      this.error = null;
      try {
        if (!this.index) await this.loadIndexStatus();
        const { data, errors } = await getApolloClient().query<{ memorySearch: { results: ServerSearchResult[] } }>({
          query: MEMORY_SEARCH,
          variables: { query },
          fetchPolicy: 'network-only',
        });
        if (requestId !== this.requestId) return;
        if (errors?.length) throw new Error(errors.map(e => e.message).join(', '));
        const results = data.memorySearch.results.map(toSearchResult);
        const matches = results.flatMap(result => result.matches);
        this.outcome = { cue: query, results, weakOnly: matches.length > 0 && matches.every(match => match.strength === 'weak') };
        this.coverage = { textPct: this.textPct, meaningPct: this.meaningPct };
        this.status = 'ready';
      } catch {
        if (requestId !== this.requestId) return;
        // The page shows its own message ("The search could not be completed.") with Retry.
        this.status = 'error';
        this.error = null;
      }
    },

    clearSearch() {
      this.requestId += 1;
      this.query = '';
      this.status = 'idle';
      this.outcome = null;
      this.error = null;
      this.coverage = null;
    },
  },
});
