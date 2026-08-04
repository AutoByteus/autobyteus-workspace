import { Field, InputType, Int, ObjectType, registerEnumType } from "type-graphql";

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

@InputType()
export class MemoryExplorerSourceInput {
  @Field(() => MemoryExplorerSourceType)
  type!: MemoryExplorerSourceType;

  @Field(() => String, { nullable: true })
  sourceNodeId?: string | null;
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
  sourceNodeId?: string | null;

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
  hasWorkingContext!: boolean;

  @Field(() => Boolean)
  hasEpisodic!: boolean;

  @Field(() => Boolean)
  hasSemantic!: boolean;

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

  @Field(() => MemoryAvailabilitySummary)
  memory!: MemoryAvailabilitySummary;
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
export class AgentRunMemorySummary {
  @Field(() => String)
  runId!: string;

  @Field(() => String, { nullable: true })
  agentDefinitionId?: string | null;

  @Field(() => String, { nullable: true })
  agentName?: string | null;

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
}

@ObjectType()
export class AgentRunMemoryPage {
  @Field(() => [AgentRunMemorySummary])
  entries!: AgentRunMemorySummary[];

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
export class AgentTeamWithMemorySummary {
  @Field(() => String)
  teamDefinitionId!: string;

  @Field(() => String)
  teamDefinitionName!: string;

  @Field(() => Int)
  teamRunCount!: number;

  @Field(() => Int)
  memberMemoryCount!: number;

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
export class TeamMemberMemoryTargetSummary {
  @Field(() => String)
  memberAddress!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => String)
  agentRunId!: string;

  @Field(() => String, { nullable: true })
  agentDefinitionId?: string | null;

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

  @Field(() => [TeamMemberMemoryTargetSummary])
  memberTargets!: TeamMemberMemoryTargetSummary[];
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
