import { Field, InputType, Int, ObjectType, registerEnumType } from "type-graphql";
import { MemoryRunSubject } from "./memory-run-subject.js";

export enum AgentMemoryAttribution {
  DEFINITION = "DEFINITION",
  UNATTRIBUTED = "UNATTRIBUTED",
}

registerEnumType(AgentMemoryAttribution, {
  name: "AgentMemoryAttribution",
});

export enum MemoryExplorerSourceType {
  LOCAL = "LOCAL",
  IMPORTED = "IMPORTED",
}

registerEnumType(MemoryExplorerSourceType, {
  name: "MemoryExplorerSourceType",
});

export enum CollaborationMemberExecutionKind {
  CONFIGURED = "CONFIGURED",
}

registerEnumType(CollaborationMemberExecutionKind, {
  name: "CollaborationMemberExecutionKind",
});

export enum CollaborationMemoryGroupKind {
  CONFIGURED_TEAM = "CONFIGURED_TEAM",
  TASK_TEAM = "TASK_TEAM",
}

registerEnumType(CollaborationMemoryGroupKind, {
  name: "CollaborationMemoryGroupKind",
});

@InputType()
export class MemoryExplorerSourceInput {
  @Field(() => MemoryExplorerSourceType)
  type!: MemoryExplorerSourceType;

  @Field(() => String, { nullable: true })
  memorySyncSourceId?: string | null;
}

@ObjectType()
export class MemoryExplorerSourceOption {
  @Field(() => String)
  key!: string;

  @Field(() => MemoryExplorerSourceType)
  type!: MemoryExplorerSourceType;

  @Field(() => String)
  label!: string;

  @Field(() => String, { nullable: true })
  memorySyncSourceId?: string | null;

  @Field(() => String, { nullable: true })
  displayName?: string | null;

  @Field(() => Boolean)
  readOnly!: boolean;

  @Field(() => String, { nullable: true })
  lastImportedAt?: string | null;

  @Field(() => String, { nullable: true })
  lastSyncStatus?: string | null;
}

@ObjectType()
export class MemoryAvailabilitySummary {
  @Field(() => String, { nullable: true })
  latestMemoryAt?: string | null;

  @Field(() => Boolean)
  hasWorkJournal!: boolean;

  @Field(() => Boolean)
  hasRawTraces!: boolean;

  @Field(() => Boolean)
  hasRawArchive!: boolean;
}

@InputType()
export class AgentWithMemorySelectorInput {
  @Field(() => AgentMemoryAttribution)
  attribution!: AgentMemoryAttribution;

  @Field(() => String, { nullable: true })
  agentDefinitionId?: string | null;
}

@ObjectType()
export class AgentWithMemorySummary {
  @Field(() => AgentMemoryAttribution)
  attribution!: AgentMemoryAttribution;

  @Field(() => String, { nullable: true })
  agentDefinitionId?: string | null;

  @Field(() => String)
  displayName!: string;

  @Field(() => String)
  stableId!: string;

  @Field(() => Int)
  runCount!: number;

  @Field(() => String, { nullable: true })
  latestMemoryAt?: string | null;
}

@ObjectType()
export class AgentWithMemoryPage {
  @Field(() => [AgentWithMemorySummary])
  entries!: AgentWithMemorySummary[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;

  @Field(() => Int)
  totalPages!: number;
}

@ObjectType()
export class AgentEpisodePlace {
  /** `TEAM` or `ORG`. */
  @Field(() => String)
  kind!: "TEAM" | "ORG";

  @Field(() => String, { nullable: true })
  name?: string | null;
}

/** One episode of an agent (autobyteus-554): one of its runs from any place it works. */
@ObjectType()
export class AgentEpisode {
  @Field(() => String)
  runId!: string;

  @Field(() => MemoryRunSubject)
  subject!: MemoryRunSubject;

  /** Null for the agent's own run. */
  @Field(() => AgentEpisodePlace, { nullable: true })
  place?: AgentEpisodePlace | null;

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => String, { nullable: true })
  taskTitle?: string | null;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;

  @Field(() => String, { nullable: true })
  lastActivityAt?: string | null;

  @Field(() => MemoryAvailabilitySummary)
  memory!: MemoryAvailabilitySummary;
}

@ObjectType()
export class AgentEpisodePage {
  @Field(() => [AgentEpisode])
  entries!: AgentEpisode[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;

  @Field(() => Int)
  totalPages!: number;
}

export enum MemoryGroupKind {
  TEAM = "TEAM",
  ORG = "ORG",
}

registerEnumType(MemoryGroupKind, { name: "MemoryGroupKind" });

export enum MemoryGroupMemberKind {
  AGENT = "AGENT",
  TEAM = "TEAM",
}

registerEnumType(MemoryGroupMemberKind, { name: "MemoryGroupMemberKind" });

/** A member of a team or org on its Memory page. */
@ObjectType()
export class MemoryGroupMember {
  @Field(() => MemoryGroupMemberKind)
  kind!: MemoryGroupMemberKind;

  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  /** An agent that is a shared definition: one memory wherever it appears. */
  @Field(() => Boolean)
  shared!: boolean;

  /** A team member's own member count; null for an agent. */
  @Field(() => Int, { nullable: true })
  memberCount?: number | null;
}

@ObjectType()
export class AgentTeamWithMemorySummary {
  @Field(() => String)
  teamDefinitionId!: string;

  @Field(() => String)
  teamDefinitionName!: string;

  @Field(() => Int)
  teamRunCount!: number;

  @Field(() => Int)
  memberMemoryCount!: number;

  /** Members of the definition (this node), else of its newest stored run. */
  @Field(() => Int, { nullable: true })
  memberCount?: number | null;

  @Field(() => String, { nullable: true })
  latestMemoryAt?: string | null;

  @Field(() => MemoryAvailabilitySummary)
  memory!: MemoryAvailabilitySummary;
}

@ObjectType()
export class AgentTeamWithMemoryPage {
  @Field(() => [AgentTeamWithMemorySummary])
  entries!: AgentTeamWithMemorySummary[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;

  @Field(() => Int)
  totalPages!: number;
}

@ObjectType()
export class CollaborationMemoryGroup {
  @Field(() => String)
  teamRunId!: string;

  @Field(() => String)
  address!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => CollaborationMemoryGroupKind)
  kind!: CollaborationMemoryGroupKind;

  @Field(() => String, { nullable: true })
  startedAt?: string | null;
}

@ObjectType()
export class CollaborationMemberMemoryTargetSummary {
  @Field(() => String)
  memberAddress!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => String)
  agentRunId!: string;

  @Field(() => String, { nullable: true })
  agentDefinitionId?: string | null;

  @Field(() => CollaborationMemberExecutionKind)
  executionKind!: CollaborationMemberExecutionKind;

  @Field(() => String, { nullable: true })
  startedAt?: string | null;

  @Field(() => [CollaborationMemoryGroup])
  groupPath!: CollaborationMemoryGroup[];

  @Field(() => String, { nullable: true })
  lastUpdatedAt?: string | null;

  @Field(() => MemoryAvailabilitySummary)
  memory!: MemoryAvailabilitySummary;
}

@ObjectType()
export class AgentTeamRunMemorySummary {
  @Field(() => String)
  teamRunId!: string;

  @Field(() => String)
  teamDefinitionId!: string;

  @Field(() => String)
  teamDefinitionName!: string;

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;

  @Field(() => String, { nullable: true })
  createdAt?: string | null;

  @Field(() => String, { nullable: true })
  lastUpdatedAt?: string | null;

  @Field(() => MemoryAvailabilitySummary)
  memory!: MemoryAvailabilitySummary;

  @Field(() => [CollaborationMemberMemoryTargetSummary])
  memberTargets!: CollaborationMemberMemoryTargetSummary[];
}

@ObjectType()
export class AgentTeamRunMemoryPage {
  @Field(() => [AgentTeamRunMemorySummary])
  entries!: AgentTeamRunMemorySummary[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;

  @Field(() => Int)
  totalPages!: number;
}

@ObjectType()
export class AgentOrgWithMemorySummary {
  @Field(() => String)
  orgDefinitionId!: string;

  @Field(() => String)
  orgDefinitionName!: string;

  @Field(() => Int)
  orgRunCount!: number;

  @Field(() => Int)
  memberMemoryCount!: number;

  /** Members of the definition (this node), else of its newest stored run. */
  @Field(() => Int, { nullable: true })
  memberCount?: number | null;

  @Field(() => String, { nullable: true })
  latestMemoryAt?: string | null;

  @Field(() => MemoryAvailabilitySummary)
  memory!: MemoryAvailabilitySummary;
}

@ObjectType()
export class AgentOrgWithMemoryPage {
  @Field(() => [AgentOrgWithMemorySummary])
  entries!: AgentOrgWithMemorySummary[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;

  @Field(() => Int)
  totalPages!: number;
}

@ObjectType()
export class AgentOrgRunMemorySummary {
  @Field(() => String)
  orgRunId!: string;

  @Field(() => String)
  orgDefinitionId!: string;

  @Field(() => String)
  orgDefinitionName!: string;

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;

  @Field(() => String, { nullable: true })
  createdAt?: string | null;

  @Field(() => String, { nullable: true })
  lastUpdatedAt?: string | null;

  @Field(() => MemoryAvailabilitySummary)
  memory!: MemoryAvailabilitySummary;

  @Field(() => [CollaborationMemberMemoryTargetSummary])
  memberTargets!: CollaborationMemberMemoryTargetSummary[];
}

@ObjectType()
export class AgentOrgRunMemoryPage {
  @Field(() => [AgentOrgRunMemorySummary])
  entries!: AgentOrgRunMemorySummary[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;

  @Field(() => Int)
  totalPages!: number;
}
