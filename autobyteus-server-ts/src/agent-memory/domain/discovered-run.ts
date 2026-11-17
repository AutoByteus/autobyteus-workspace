import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

/** How the Memory page opens a run: by the subject identity of its memory view (one per run kind). */
export type MemoryRunSubject =
  | Readonly<{ kind: "AGENT"; runId: string; agentDefinitionId: string | null }>
  | Readonly<{ kind: "TEAM_MEMBER"; teamRunId: string; agentRunId: string }>
  | Readonly<{ kind: "ORG_MEMBER"; orgRunId: string; agentRunId: string }>
  /** A run folder no record attributes (old-format team folders, agent-root collaboration members). */
  | Readonly<{ kind: "RUN_FOLDER"; runKey: string }>;

/**
 * What a run's records say about its agent definition. `unattributed`: no record names one (old folders without
 * records, agent-root collaboration folders). `unreadable`: the record that would name it exists but cannot be read
 * (`record` is its file name); discovery logs it (DESIGN.md rule 7).
 */
export type RunAttribution =
  | Readonly<{ kind: "attributed"; agentDefinitionId: string }>
  | Readonly<{ kind: "unattributed" }>
  | Readonly<{ kind: "unreadable"; record: string; reason: string }>;

/**
 * One run folder as run-folder discovery attributes it from its records (names, workspace and runtime as recorded).
 * `runKey` is the folder's path relative to the memory folder, for example `agent_teams/team_x/member_y`.
 */
export type DiscoveredRun = Readonly<{
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
  /** The run the folder belongs to at the top: the folder's family and first segment. */
  root: RootExecutionIdentity;
  /** Which agent definition the run's records name, or why none is named. */
  attribution: RunAttribution;
  /** The start its records hold: run metadata or history row for an agent run, the tree's creation for a member. */
  recordedStartAt: string | null;
}>;
