import type { MemoryExplorerSourceInput } from '~/types/memory';

/**
 * Memory search and the memory index as the Memory page shows them (work-journal-search). The server's
 * `memorySearch`, `memoryIndexStatus` and Work Journal reads are mapped into these shapes by the stores.
 */

/** The four steps of the indexing pipeline. */
export type StepId = 'runs' | 'journals' | 'text' | 'meaning';
export type StepState = 'waiting' | 'running' | 'done' | 'failed';
export interface IndexStep { id: StepId; state: StepState; done: number; total: number; message?: string | null }
/** `building` also covers the Meaning index embedding in the background after the steps finished. */
export type IndexPhase = 'needs_index' | 'building' | 'ready' | 'failed';
export interface IndexStatus {
  phase: IndexPhase;
  steps: IndexStep[];
  /** The embedding model the Meaning index was built with, and the one chosen on Server Settings → Embedding now. */
  builtWithModel: string | null;
  activeModel: string;
  updatedAt: string | null;
  runCount: number;
  /** Search reads the text index: it can answer as soon as the index has any content. */
  textIndexHasContent: boolean;
}

export type MatchKind = 'text' | 'meaning';

/** How the page opens a result: the run's memory view by its identity, or its folder for a run no record names. */
export type MemoryRunSubject =
  | { kind: 'AGENT'; runId: string; agentDefinitionId: string | null }
  | { kind: 'TEAM_MEMBER'; teamRunId: string; agentRunId: string }
  | { kind: 'ORG_MEMBER'; orgRunId: string; agentRunId: string }
  | { kind: 'RUN_FOLDER'; runKey: string };

export interface SearchMatch {
  /** The journal file's name in the run's Work Journal. */
  file: string;
  fromLine: number;
  toLine: number;
  day: string | null;
  snippet: string[];
  kind: MatchKind;
  /** The search words found in the matched lines (a text match); empty for a meaning match, which has no label. */
  matchedWords: string[];
}

export interface SearchResult {
  runId: string;
  agentName: string;
  /** The team or org the run was part of, for the heading. */
  team: { name: string; kind: 'team' | 'org' } | null;
  member: string | null;
  workspace: string | null;
  firstDay: string | null;
  latestDay: string | null;
  matches: SearchMatch[];
  subject: MemoryRunSubject;
}

export interface SearchOutcome {
  cue: string;
  results: SearchResult[];
  /** The query's words that occur in no indexed journal (empty while the Text index is incomplete). */
  wordsNotFound: string[];
}

/** One file of a run's Work Journal, as the file rail lists it. */
export interface JournalFileInfo {
  name: string;
  lines: number;
  sizeKb: number;
  firstDay: string | null;
  lastDay: string | null;
  days: Array<{ day: string; line: number }>;
  open: boolean;
}

/** Which run's Work Journal the view reads (a run known only by its folder is always local). */
export type JournalSubject =
  | { kind: 'agent'; runId: string; source: MemoryExplorerSourceInput }
  | { kind: 'team'; teamRunId: string; agentRunId: string; source: MemoryExplorerSourceInput }
  | { kind: 'org'; orgRunId: string; agentRunId: string; source: MemoryExplorerSourceInput }
  | { kind: 'folder'; runKey: string };
