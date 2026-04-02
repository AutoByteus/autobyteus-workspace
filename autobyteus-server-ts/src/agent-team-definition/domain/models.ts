export type TeamMemberRefScope = "shared" | "team_local";

export class TeamMember {
  memberName: string;
  ref: string;
  refType: "agent" | "agent_team";
  refScope?: TeamMemberRefScope | null;

  constructor(options: {
    memberName: string;
    ref: string;
    refType: "agent" | "agent_team";
    refScope?: TeamMemberRefScope | null;
  }) {
    this.memberName = options.memberName;
    this.ref = options.ref;
    this.refType = options.refType;
    this.refScope = options.refType === "agent" ? options.refScope ?? null : null;
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
  avatarUrl?: string | null;

  constructor(options: {
    name: string;
    description: string;
    instructions: string;
    category?: string;
    nodes: TeamMember[];
    coordinatorMemberName: string;
    id?: string | null;
    avatarUrl?: string | null;
  }) {
    this.name = options.name;
    this.description = options.description;
    this.instructions = options.instructions;
    this.category = options.category;
    this.nodes = options.nodes;
    this.coordinatorMemberName = options.coordinatorMemberName;
    this.id = options.id ?? null;
    this.avatarUrl = options.avatarUrl ?? null;
  }
}

export class AgentTeamDefinitionUpdate {
  name?: string | null;
  description?: string | null;
  instructions?: string | null;
  category?: string | null;
  nodes?: TeamMember[] | null;
  coordinatorMemberName?: string | null;
  avatarUrl?: string | null;

  constructor(options: {
    name?: string | null;
    description?: string | null;
    instructions?: string | null;
    category?: string | null;
    nodes?: TeamMember[] | null;
    coordinatorMemberName?: string | null;
    avatarUrl?: string | null;
  } = {}) {
    this.name = options.name ?? null;
    this.description = options.description ?? null;
    this.instructions = options.instructions ?? null;
    this.category = options.category ?? null;
    this.nodes = options.nodes ?? null;
    this.coordinatorMemberName = options.coordinatorMemberName ?? null;
    this.avatarUrl = options.avatarUrl ?? null;
  }
}
