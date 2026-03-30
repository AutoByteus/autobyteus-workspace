import { ServerMessage, ServerMessageType } from "./models.js";

type TeamLike = Record<string, unknown>;
type NativeTeamMemberLike = {
  agentId?: string;
  currentStatus?: unknown;
  context?: {
    config?: {
      name?: unknown;
    };
  } | null;
};

export interface TeamRuntimeMemberStatusSnapshot {
  memberRouteKey: string | null;
  memberName: string;
  memberRunId: string | null;
  currentStatus: string;
}

export interface TeamRuntimeStatusSnapshot {
  teamRunId: string;
  currentStatus: string | null;
  members: TeamRuntimeMemberStatusSnapshot[];
}

export interface TeamRuntimeBridgeStatusSnapshot {
  teamRunId: string;
  currentStatus: string | null;
  members: TeamRuntimeMemberStatusSnapshot[];
}

export interface TeamRuntimeEventBridge {
  getCurrentStatusSnapshot(teamRunId: string): TeamRuntimeBridgeStatusSnapshot;
}

const getNoopTeamRuntimeEventBridge = (): TeamRuntimeEventBridge => ({
  getCurrentStatusSnapshot: (teamRunId) => ({
    teamRunId,
    currentStatus: null,
    members: [],
  }),
});

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asNativeTeamMembers = (team: TeamLike | null): NativeTeamMemberLike[] => {
  if (!team) {
    return [];
  }

  const directContext = (team as { context?: { agents?: unknown } }).context ?? null;
  const runtimeContext =
    (team as { runtime?: { context?: { agents?: unknown } } }).runtime?.context ?? null;
  const context = directContext ?? runtimeContext;
  const agents = context?.agents;
  return Array.isArray(agents) ? (agents as NativeTeamMemberLike[]) : [];
};

const buildNativeSnapshot = (
  teamRunId: string,
  team: TeamLike | null,
): TeamRuntimeStatusSnapshot => {
  const members: TeamRuntimeMemberStatusSnapshot[] = [];

  for (const member of asNativeTeamMembers(team)) {
    const memberStatus = asNonEmptyString(member.currentStatus);
    const memberName = asNonEmptyString(member.context?.config?.name);
    if (!memberStatus || !memberName) {
      continue;
    }

    members.push({
      memberRouteKey: null,
      memberName,
      memberRunId: asNonEmptyString(member.agentId),
      currentStatus: memberStatus,
    });
  }

  return {
    teamRunId,
    currentStatus: asNonEmptyString((team as { currentStatus?: unknown } | null)?.currentStatus),
    members,
  };
};

const toInitialMessages = (snapshot: TeamRuntimeStatusSnapshot): ServerMessage[] => {
  const messages: ServerMessage[] = [];
  if (snapshot.currentStatus) {
    messages.push(
      new ServerMessage(ServerMessageType.TEAM_STATUS, {
        new_status: snapshot.currentStatus,
        old_status: null,
      }),
    );
  }

  for (const member of snapshot.members) {
    messages.push(
      new ServerMessage(ServerMessageType.AGENT_STATUS, {
        new_status: member.currentStatus,
        old_status: null,
        agent_name: member.memberName,
        ...(member.memberRunId ? { agent_id: member.memberRunId } : {}),
      }),
    );
  }

  return messages;
};

export class TeamRuntimeStatusSnapshotService {
  constructor(
    private readonly teamMemberRuntimeEventBridge: TeamRuntimeEventBridge =
      getNoopTeamRuntimeEventBridge(),
  ) {}

  getSnapshot(input: {
    teamRunId: string;
    runtimeMode: "native_team" | "member_runtime";
    team?: TeamLike | null;
  }): TeamRuntimeStatusSnapshot {
    if (input.runtimeMode === "member_runtime") {
      return this.fromBridgeSnapshot(
        this.teamMemberRuntimeEventBridge.getCurrentStatusSnapshot(input.teamRunId),
      );
    }

    return buildNativeSnapshot(input.teamRunId, input.team ?? null);
  }

  getInitialMessages(input: {
    teamRunId: string;
    runtimeMode: "native_team" | "member_runtime";
    team?: TeamLike | null;
  }): ServerMessage[] {
    return toInitialMessages(this.getSnapshot(input));
  }

  private fromBridgeSnapshot(snapshot: TeamRuntimeBridgeStatusSnapshot): TeamRuntimeStatusSnapshot {
    return {
      teamRunId: snapshot.teamRunId,
      currentStatus: snapshot.currentStatus,
      members: snapshot.members.map((member) => ({
        memberRouteKey: member.memberRouteKey,
        memberName: member.memberName,
        memberRunId: member.memberRunId,
        currentStatus: member.currentStatus,
      })),
    };
  }
}

let cachedTeamRuntimeStatusSnapshotService: TeamRuntimeStatusSnapshotService | null = null;

export const getTeamRuntimeStatusSnapshotService = (): TeamRuntimeStatusSnapshotService => {
  if (!cachedTeamRuntimeStatusSnapshotService) {
    cachedTeamRuntimeStatusSnapshotService = new TeamRuntimeStatusSnapshotService();
  }
  return cachedTeamRuntimeStatusSnapshotService;
};
