import type { MemoryRunSubject } from "./discovered-run.js";
import type { ContextFileReference } from "autobyteus-ts/agent/message/context-file-reference.js";
import type { RawTraceMedia } from "autobyteus-ts/memory/models/raw-trace-item.js";

type MemoryTraceEventBase = {
  id?: string | null;
  traceType: string;
  sourceEvent?: string | null;
  content?: string | null;
  toolName?: string | null;
  toolCallId?: string | null;
  toolArgs?: Record<string, unknown> | null;
  toolResult?: unknown | null;
  toolError?: string | null;
  media?: RawTraceMedia | null;
  messageId?: string;
  dedupeKey?: string;
  senderId?: string | null;
  ts: number;
};

export type MemoryTurnTraceEvent = MemoryTraceEventBase & {
  scope: "turn";
  fileAttachments?: readonly ContextFileReference[];
  turnId: string;
  seq: number;
};

export type MemoryRunTraceEvent = MemoryTraceEventBase & {
  scope: "run";
  id: string;
  traceType: "system_instruction";
  sourceEvent: "SYSTEM_INSTRUCTIONS_SUPPLIED";
  content: string;
  turnId: null;
  seq: null;
};

export type MemoryTraceEvent = MemoryTurnTraceEvent | MemoryRunTraceEvent;

export type RawTraceFileSummary = {
  fileName: string;
  kind: "active" | "segment";
  recordCount: number;
  segmentIndex?: number | null;
  firstTimestamp?: number | null;
  lastTimestamp?: number | null;
};

export type AgentMemoryView = {
  runId: string;
  rawTraces?: MemoryTraceEvent[] | null;
  rawTraceFiles?: RawTraceFileSummary[] | null;
  selectedRawTraceFileName?: string | null;
};

export type AgentMemoryAttribution = "DEFINITION" | "UNATTRIBUTED";

/** What a run's memory holds, for the Memory page: its Work Journal and its raw traces (active, archived). */
export type MemoryAvailabilitySummary = {
  latestMemoryAt?: string | null;
  hasWorkJournal: boolean;
  hasRawTraces: boolean;
  hasRawArchive: boolean;
};

export type MemoryAvailabilityBuildResult = {
  availability: MemoryAvailabilitySummary;
  latestMemoryMtime: number;
  /** A working-context snapshot exists (not shown on the page; it still keeps the run listed). */
  hasWorkingContextSnapshot: boolean;
};

export type AgentWithMemorySelector = {
  attribution: AgentMemoryAttribution;
  agentDefinitionId?: string | null;
};

/** An Agents card on the Memory page (autobyteus-554): the agent, its run count and its latest change. */
export type AgentWithMemorySummary = {
  attribution: AgentMemoryAttribution;
  agentDefinitionId?: string | null;
  displayName: string;
  stableId: string;
  runCount: number;
  latestMemoryAt?: string | null;
};

/** Where an episode ran: a team or org run it was a member of. */
export type AgentEpisodePlace = Readonly<{ kind: "TEAM" | "ORG"; name: string | null }>;

/**
 * One episode of an agent (autobyteus-554): one of its runs, from any place it works. `place` is null for the agent's
 * own (standalone or delegated) run. `subject` opens the run's memory view.
 */
export type AgentEpisode = Readonly<{
  runId: string;
  subject: MemoryRunSubject;
  place: AgentEpisodePlace | null;
  summary: string | null;
  taskTitle: string | null;
  workspaceRootPath: string | null;
  lastActivityAt: string | null;
  memory: MemoryAvailabilitySummary;
}>;

export type MemoryGroupKind = "TEAM" | "ORG";

/** A member of a team or org on its Memory page: an agent (shared or local) or, in an org, a team. */
export type MemoryGroupMember = Readonly<{
  kind: "AGENT" | "TEAM";
  id: string;
  name: string;
  /** An agent that is a shared (standalone) definition: one memory wherever it appears. */
  shared: boolean;
  /** A team member's own member count; null for an agent. */
  memberCount: number | null;
}>;

export type AgentTeamWithMemorySummary = {
  teamDefinitionId: string;
  teamDefinitionName: string;
  teamRunCount: number;
  memberMemoryCount: number;
  /** Members of the definition (local), else of its newest stored run; null when neither is known. */
  memberCount: number | null;
  latestMemoryAt?: string | null;
  memory: MemoryAvailabilitySummary;
};

export type CollaborationMemberExecutionKind = "CONFIGURED";

export type CollaborationMemoryGroupKind = "CONFIGURED_TEAM" | "TASK_TEAM";

/** A configured or task team on a member's path; `teamRunId` is its identity (addresses may repeat). */
export type CollaborationMemoryGroup = {
  teamRunId: string;
  address: string;
  displayName: string;
  kind: CollaborationMemoryGroupKind;
  startedAt: string | null;
};

export type CollaborationMemberMemoryTargetSummary = {
  memberAddress: string;
  displayName: string;
  agentRunId: string;
  agentDefinitionId?: string | null;
  executionKind: CollaborationMemberExecutionKind;
  /** Task agents only. */
  startedAt?: string | null;
  /** Outermost first; the root team or org is never a group. */
  groupPath: readonly CollaborationMemoryGroup[];
  lastUpdatedAt?: string | null;
  memory: MemoryAvailabilitySummary;
};

export type AgentTeamRunMemorySummary = {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  summary?: string | null;
  workspaceRootPath?: string | null;
  createdAt?: string | null;
  lastUpdatedAt?: string | null;
  memory: MemoryAvailabilitySummary;
  memberTargets: CollaborationMemberMemoryTargetSummary[];
};

export type AgentOrgWithMemorySummary = {
  orgDefinitionId: string;
  orgDefinitionName: string;
  orgRunCount: number;
  memberMemoryCount: number;
  /** Members of the definition (local), else of its newest stored run; null when neither is known. */
  memberCount: number | null;
  latestMemoryAt?: string | null;
  memory: MemoryAvailabilitySummary;
};

export type AgentOrgRunMemorySummary = {
  orgRunId: string;
  orgDefinitionId: string;
  orgDefinitionName: string;
  summary?: string | null;
  workspaceRootPath?: string | null;
  createdAt?: string | null;
  lastUpdatedAt?: string | null;
  memory: MemoryAvailabilitySummary;
  memberTargets: CollaborationMemberMemoryTargetSummary[];
};

export type MemoryExplorerPage<T> = {
  entries: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
