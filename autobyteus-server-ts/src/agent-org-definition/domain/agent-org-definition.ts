import type { DefaultLaunchConfig } from "../../launch-preferences/default-launch-config.js";
import {
  cloneCollaborationHandoffs,
  type CollaborationHandoff,
} from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { DefinitionSourceDescriptor } from "../../collaboration-definition-admission/domain/definition-source-descriptor.js";

export type AgentOrgMemberRefScope = "shared" | "org_local" | "application_owned";

export class AgentOrgMember {
  memberName: string;
  ref: string;
  refType: "agent" | "agent_team";
  refScope: AgentOrgMemberRefScope;

  constructor(input: {
    memberName: string;
    ref: string;
    refType: "agent" | "agent_team";
    refScope: AgentOrgMemberRefScope;
  }) {
    this.memberName = input.memberName;
    this.ref = input.ref;
    this.refType = input.refType;
    this.refScope = input.refScope;
  }
}

export class AgentOrgDefinition {
  id: string | null;
  name: string;
  description: string;
  instructions: string;
  category: string | null;
  members: AgentOrgMember[];
  handoffs: CollaborationHandoff[];
  avatarUrl: string | null;
  defaultLaunchConfig: DefaultLaunchConfig | null;
  revision: string | null;
  source: DefinitionSourceDescriptor | null;

  constructor(input: {
    id?: string | null;
    name: string;
    description: string;
    instructions: string;
    category?: string | null;
    members: readonly AgentOrgMember[];
    handoffs?: readonly CollaborationHandoff[] | null;
    avatarUrl?: string | null;
    defaultLaunchConfig?: DefaultLaunchConfig | null;
    revision?: string | null;
    source?: DefinitionSourceDescriptor | null;
  }) {
    this.id = input.id?.trim() || null;
    this.name = input.name;
    this.description = input.description;
    this.instructions = input.instructions;
    this.category = input.category?.trim() || null;
    this.members = input.members.map((member) => new AgentOrgMember(member));
    this.handoffs = cloneCollaborationHandoffs(input.handoffs ?? []);
    this.avatarUrl = input.avatarUrl?.trim() || null;
    this.defaultLaunchConfig = input.defaultLaunchConfig
      ? {
          llmModelIdentifier: input.defaultLaunchConfig.llmModelIdentifier,
          runtimeKind: input.defaultLaunchConfig.runtimeKind,
          llmConfig: input.defaultLaunchConfig.llmConfig
            ? structuredClone(input.defaultLaunchConfig.llmConfig)
            : null,
        }
      : null;
    this.revision = input.revision ?? null;
    this.source = input.source ?? null;
  }
}

export class AgentOrgDefinitionUpdate {
  constructor(readonly values: Partial<Pick<AgentOrgDefinition,
    | "name"
    | "description"
    | "instructions"
    | "category"
    | "members"
    | "handoffs"
    | "avatarUrl"
    | "defaultLaunchConfig"
  >> & { expectedRevision: string }) {}
}
