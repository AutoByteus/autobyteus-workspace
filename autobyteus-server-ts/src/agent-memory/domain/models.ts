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

export type AgentWithMemorySummary = {
  attribution: AgentMemoryAttribution;
  agentDefinitionId?: string | null;
  displayName: string;
  stableId: string;
  runCount: number;
  latestMemoryAt?: string | null;
  memory: MemoryAvailabilitySummary;
};

export type AgentRunMemorySummary = {
  runId: string;
  agentDefinitionId?: string | null;
  agentName?: string | null;
  summary?: string | null;
  workspaceRootPath?: string | null;
  createdAt?: string | null;
  lastUpdatedAt?: string | null;
  memory: MemoryAvailabilitySummary;
};

export type AgentTeamWithMemorySummary = {
  teamDefinitionId: string;
  teamDefinitionName: string;
  teamRunCount: number;
  memberMemoryCount: number;
  latestMemoryAt?: string | null;
  memory: MemoryAvailabilitySummary;
  /** At least one listed run of the definition is a task team (delegated). */
  isTaskTeam: boolean;
  /** The agent that started its task runs, when they share one. */
  startedByAgentName: string | null;
};

export type CollaborationMemberExecutionKind = "CONFIGURED" | "TASK_AGENT" | "TASK_TEAM_MEMBER";

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
  /** The run is a task team: delegated by an agent, listed while its coordinating run links it. */
  isTaskTeam: boolean;
  /** The agent that started the task team, as recorded. */
  startedByAgentName: string | null;
};

export type AgentOrgWithMemorySummary = {
  orgDefinitionId: string;
  orgDefinitionName: string;
  orgRunCount: number;
  memberMemoryCount: number;
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
