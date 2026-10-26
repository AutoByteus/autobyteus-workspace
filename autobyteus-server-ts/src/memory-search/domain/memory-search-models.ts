import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

/** How the Memory page opens a run: by the subject identity of its memory view (one per run kind). */
export type MemoryRunSubject =
  | Readonly<{ kind: "AGENT"; runId: string; agentDefinitionId: string | null }>
  | Readonly<{ kind: "TEAM_MEMBER"; teamRunId: string; agentRunId: string }>
  | Readonly<{ kind: "ORG_MEMBER"; orgRunId: string; agentRunId: string }>
  /** A run folder no record attributes (old-format team folders, agent-root collaboration members). */
  | Readonly<{ kind: "RUN_FOLDER"; runKey: string }>;

/**
 * One run folder known to the memory index, with its names and runtime as recorded at the time (R-012).
 * `runKey` is the folder's path relative to the memory folder, for example `agent_teams/team_x/member_y`.
 */
export type MemoryRun = Readonly<{
  runKey: string;
  /** The run folder's name (the agent run ID). */
  runId: string;
  memoryDir: string;
  agentName: string;
  teamName: string | null;
  memberName: string | null;
  orgName: string | null;
  workspace: string | null;
  runtimeKind: RuntimeKind | null;
  subject: MemoryRunSubject;
}>;

/** Whole journal entries of one file, at most 2,000 characters (a longer entry split by lines). */
export type JournalChunk = Readonly<{
  lineStart: number;
  lineEnd: number;
  day: string | null;
  text: string;
}>;

/** One request, reply or action a journal card was built from, located in the file and in the card text. */
export type JournalCardPart = Readonly<{
  kind: "request" | "reply" | "action";
  lineStart: number;
  lineEnd: number;
  day: string | null;
  offset: number;
  length: number;
}>;

/** The short text that represents one journal file in the meaning index, with its parts. */
export type JournalCard = Readonly<{
  text: string;
  parts: readonly JournalCardPart[];
}>;

export type MemoryMatchStrength = "strong" | "fair" | "weak";

export type MemorySearchMatch = Readonly<{
  /** The journal file's absolute path, to open with a file tool. */
  journalFile: string;
  lineStart: number;
  lineEnd: number;
  day: string | null;
  snippet: string;
  matchedBy: "text" | "meaning";
  strength: MemoryMatchStrength;
}>;

/** One run found by memory search: who, where, when, a citable source line and its matches (newest first). */
export type MemorySearchRunResult = Readonly<{
  agent: string;
  team: string | null;
  member: string | null;
  org: string | null;
  runId: string;
  workspace: string | null;
  firstDay: string | null;
  latestDay: string | null;
  source: string;
  matches: readonly MemorySearchMatch[];
  subject: MemoryRunSubject;
}>;

export type MemorySearchResult = Readonly<{
  results: readonly MemorySearchRunResult[];
  /** While the index is incomplete or not built: how much it covers. */
  coverage: string | null;
  /** When every match is weak: say so and suggest other words. */
  note: string | null;
}>;

export type MemoryIndexStepName = "findRuns" | "journals" | "textIndex" | "meaningIndex";
export type MemoryIndexStepState = "waiting" | "running" | "done" | "failed";

export type MemoryIndexStep = Readonly<{
  step: MemoryIndexStepName;
  state: MemoryIndexStepState;
  done: number;
  total: number;
  unit: "runs" | "journalFiles";
  failureMessage: string | null;
}>;

export type MemoryIndexState = "notIndexed" | "building" | "ready" | "failed" | "modelChanged";

export type MemoryIndexStatus = Readonly<{
  state: MemoryIndexState;
  steps: readonly MemoryIndexStep[];
  runCount: number;
  journalFileCount: number;
  updatedAt: string | null;
  textIndexHasContent: boolean;
  activeModelId: string;
  meaningIndexModelId: string | null;
  /** Why the Meaning index is not kept current right now, when it is not (model changed or not downloaded). */
  meaningNote: string | null;
}>;
