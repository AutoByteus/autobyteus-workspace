import type { DefaultLaunchConfig } from "../../launch-preferences/default-launch-config.js";
import {
  cloneCollaborationHandoffs,
  type CollaborationHandoff,
} from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { DefinitionSourceDescriptor } from "../../collaboration-definition-admission/domain/definition-source-descriptor.js";

export type TeamMemberRefScope = "shared" | "team_local" | "application_owned";
export type AgentTeamDefinitionOwnershipScope = "shared" | "agent_org_owned" | "application_owned";

export class TeamMember {
  memberName: string;
  ref: string;
  refScope: TeamMemberRefScope;

  constructor(options: {
    memberName: string;
    ref: string;
    refScope: TeamMemberRefScope;
  }) {
    this.memberName = options.memberName;
    this.ref = options.ref;
    this.refScope = options.refScope;
  }
}

export class AgentTeamDefinition {
  id?: string | null;
  name: string;
  description: string;
  instructions: string;
  category?: string;
  nodes: TeamMember[];
  coordinatorMemberName: string;
  handoffs: CollaborationHandoff[];
  avatarUrl?: string | null;
  defaultLaunchConfig: DefaultLaunchConfig | null;
  ownershipScope: AgentTeamDefinitionOwnershipScope;
  ownerTeamId?: string | null;
  ownerTeamName?: string | null;
  ownerOrgId?: string | null;
  ownerOrgName?: string | null;
  ownerApplicationId?: string | null;
  ownerApplicationName?: string | null;
  ownerPackageId?: string | null;
  ownerLocalApplicationId?: string | null;
  revision: string | null;
  source: DefinitionSourceDescriptor | null;

  constructor(options: {
    name: string;
    description: string;
    instructions: string;
    category?: string;
    nodes: TeamMember[];
    coordinatorMemberName: string;
    handoffs?: readonly CollaborationHandoff[] | null;
    id?: string | null;
    avatarUrl?: string | null;
    defaultLaunchConfig?: DefaultLaunchConfig | null;
    ownershipScope?: AgentTeamDefinitionOwnershipScope;
    ownerTeamId?: string | null;
    ownerTeamName?: string | null;
    ownerOrgId?: string | null;
    ownerOrgName?: string | null;
    ownerApplicationId?: string | null;
    ownerApplicationName?: string | null;
    ownerPackageId?: string | null;
    ownerLocalApplicationId?: string | null;
    revision?: string | null;
    source?: DefinitionSourceDescriptor | null;
  }) {
    this.name = options.name;
    this.description = options.description;
    this.instructions = options.instructions;
    this.category = options.category;
    this.nodes = options.nodes;
    this.coordinatorMemberName = options.coordinatorMemberName;
    this.handoffs = cloneCollaborationHandoffs(options.handoffs ?? []);
    this.id = options.id ?? null;
    this.avatarUrl = options.avatarUrl ?? null;
    this.defaultLaunchConfig = options.defaultLaunchConfig ?? null;
    this.ownershipScope = options.ownershipScope ?? "shared";
    this.ownerTeamId = options.ownerTeamId ?? null;
    this.ownerTeamName = options.ownerTeamName ?? null;
    this.ownerOrgId = options.ownerOrgId ?? null;
    this.ownerOrgName = options.ownerOrgName ?? null;
    this.ownerApplicationId = options.ownerApplicationId ?? null;
    this.ownerApplicationName = options.ownerApplicationName ?? null;
    this.ownerPackageId = options.ownerPackageId ?? null;
    this.ownerLocalApplicationId = options.ownerLocalApplicationId ?? null;
    this.revision = options.revision ?? null;
    this.source = options.source ?? null;
  }
}

export class AgentTeamDefinitionUpdate {
  name?: string | null;
  description?: string | null;
  instructions?: string | null;
  category?: string | null;
  nodes?: TeamMember[] | null;
  coordinatorMemberName?: string | null;
  handoffs?: CollaborationHandoff[] | null;
  avatarUrl?: string | null;
  defaultLaunchConfig?: DefaultLaunchConfig | null;
  expectedRevision?: string | null;

  constructor(options: {
    name?: string | null;
    description?: string | null;
    instructions?: string | null;
    category?: string | null;
    nodes?: TeamMember[] | null;
    coordinatorMemberName?: string | null;
    handoffs?: readonly CollaborationHandoff[] | null;
    avatarUrl?: string | null;
    defaultLaunchConfig?: DefaultLaunchConfig | null;
    expectedRevision?: string | null;
  } = {}) {
    this.name = options.name ?? null;
    this.description = options.description ?? null;
    this.instructions = options.instructions ?? null;
    this.category = options.category ?? null;
    this.nodes = options.nodes ?? null;
    this.coordinatorMemberName = options.coordinatorMemberName ?? null;
    this.handoffs = options.handoffs === undefined || options.handoffs === null
      ? null
      : cloneCollaborationHandoffs(options.handoffs);
    this.avatarUrl = options.avatarUrl ?? null;
    this.defaultLaunchConfig = options.defaultLaunchConfig;
    this.expectedRevision = options.expectedRevision ?? null;
  }
}
