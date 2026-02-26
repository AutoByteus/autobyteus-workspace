import { NodeType } from "./enums.js";

export class TeamMember {
  memberName: string;
  referenceId: string;
  referenceType: NodeType;
  homeNodeId: string | null;

  constructor(options: {
    memberName: string;
    referenceId: string;
    referenceType: NodeType;
    homeNodeId?: string | null;
  }) {
    this.memberName = options.memberName;
    this.referenceId = options.referenceId;
    this.referenceType = options.referenceType;
    this.homeNodeId = options.homeNodeId ?? null;
  }
}

export class AgentTeamDefinition {
  id?: string | null;
  name: string;
  description: string;
  nodes: TeamMember[];
  coordinatorMemberName: string;
  role?: string | null;
  avatarUrl?: string | null;

  constructor(options: {
    name: string;
    description: string;
    nodes: TeamMember[];
    coordinatorMemberName: string;
    id?: string | null;
    role?: string | null;
    avatarUrl?: string | null;
  }) {
    this.name = options.name;
    this.description = options.description;
    this.nodes = options.nodes;
    this.coordinatorMemberName = options.coordinatorMemberName;
    this.id = options.id ?? null;
    this.role = options.role ?? null;
    this.avatarUrl = options.avatarUrl ?? null;
  }
}

export class AgentTeamDefinitionUpdate {
  name?: string | null;
  description?: string | null;
  role?: string | null;
  nodes?: TeamMember[] | null;
  coordinatorMemberName?: string | null;
  avatarUrl?: string | null;

  constructor(options: {
    name?: string | null;
    description?: string | null;
    role?: string | null;
    nodes?: TeamMember[] | null;
    coordinatorMemberName?: string | null;
    avatarUrl?: string | null;
  } = {}) {
    this.name = options.name ?? null;
    this.description = options.description ?? null;
    this.role = options.role ?? null;
    this.nodes = options.nodes ?? null;
    this.coordinatorMemberName = options.coordinatorMemberName ?? null;
    this.avatarUrl = options.avatarUrl ?? null;
  }
}
