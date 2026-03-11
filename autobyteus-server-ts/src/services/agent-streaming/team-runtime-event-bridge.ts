import type { TeamRunMemberBinding } from "../../run-history/domain/team-models.js";
import {
  getTeamRuntimeBindingRegistry,
  type TeamRuntimeBindingRegistry,
} from "../../agent-team-execution/services/team-runtime-binding-registry.js";
import {
  getRuntimeAdapterRegistry,
  type RuntimeAdapterRegistry,
} from "../../runtime-execution/runtime-adapter-registry.js";
import {
  getRuntimeEventMessageMapper,
  type RuntimeEventMessageMapper,
} from "./runtime-event-message-mapper.js";
import { createErrorMessage, ServerMessage, ServerMessageType } from "./models.js";

const normalizeStatus = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim().toUpperCase() : null;

const deriveTeamStatus = (memberStatuses: string[]): "IDLE" | "PROCESSING" | "ERROR" | null => {
  if (memberStatuses.length === 0) {
    return null;
  }

  if (memberStatuses.some((status) => status === "ERROR")) {
    return "ERROR";
  }

  if (
    memberStatuses.some(
      (status) =>
        status !== "IDLE" &&
        status !== "UNINITIALIZED" &&
        status !== "SHUTDOWN_COMPLETE",
    )
  ) {
    return "PROCESSING";
  }

  return "IDLE";
};

export interface TeamRuntimeBridgeMemberStatusSnapshot {
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
  currentStatus: string;
}

export interface TeamRuntimeBridgeStatusSnapshot {
  teamRunId: string;
  currentStatus: "IDLE" | "PROCESSING" | "ERROR" | null;
  members: TeamRuntimeBridgeMemberStatusSnapshot[];
}

export class TeamRuntimeEventBridge {
  private readonly bindingRegistry: TeamRuntimeBindingRegistry;
  private readonly runtimeAdapterRegistry: RuntimeAdapterRegistry;
  private readonly runtimeEventMessageMapper: RuntimeEventMessageMapper;

  constructor(
    bindingRegistry: TeamRuntimeBindingRegistry = getTeamRuntimeBindingRegistry(),
    runtimeAdapterRegistry: RuntimeAdapterRegistry = getRuntimeAdapterRegistry(),
    runtimeEventMessageMapper: RuntimeEventMessageMapper = getRuntimeEventMessageMapper(),
  ) {
    this.bindingRegistry = bindingRegistry;
    this.runtimeAdapterRegistry = runtimeAdapterRegistry;
    this.runtimeEventMessageMapper = runtimeEventMessageMapper;
  }

  subscribeTeam(
    teamRunId: string,
    onMessage: (message: ServerMessage) => void,
  ): () => Promise<void> {
    const runtimeBindings = this.bindingRegistry.getTeamBindings(teamRunId);
    const unsubscribers = runtimeBindings.map((binding) =>
      this.subscribeMember(binding, onMessage),
    );

    return async () => {
      for (const unsubscribe of unsubscribers) {
        try {
          unsubscribe();
        } catch {
          // best effort cleanup
        }
      }
    };
  }

  getInitialSnapshotMessages(teamRunId: string): ServerMessage[] {
    const snapshot = this.getCurrentStatusSnapshot(teamRunId);
    const memberStatusMessages = snapshot.members.map(
      (member) =>
        new ServerMessage(ServerMessageType.AGENT_STATUS, {
          new_status: member.currentStatus,
          old_status: null,
          agent_name: member.memberName,
          agent_id: member.memberRunId,
        }),
    );

    if (!snapshot.currentStatus) {
      return memberStatusMessages;
    }

    return [
      new ServerMessage(ServerMessageType.TEAM_STATUS, {
        new_status: snapshot.currentStatus,
        old_status: null,
      }),
      ...memberStatusMessages,
    ];
  }

  getCurrentStatusSnapshot(teamRunId: string): TeamRuntimeBridgeStatusSnapshot {
    const bindings = this.bindingRegistry.getTeamBindings(teamRunId);
    const members: TeamRuntimeBridgeMemberStatusSnapshot[] = [];

    for (const binding of bindings) {
      let adapter;
      try {
        adapter = this.runtimeAdapterRegistry.resolveAdapter(binding.runtimeKind);
      } catch {
        continue;
      }

      const normalizedStatus =
        normalizeStatus(adapter.getRunStatus?.(binding.memberRunId)) ??
        (adapter.isRunActive?.(binding.memberRunId) ? "IDLE" : null);

      if (!normalizedStatus) {
        continue;
      }

      members.push({
        memberRouteKey: binding.memberRouteKey,
        memberName: binding.memberName,
        memberRunId: binding.memberRunId,
        currentStatus: normalizedStatus,
      });
    }

    return {
      teamRunId,
      currentStatus: deriveTeamStatus(members.map((member) => member.currentStatus)),
      members,
    };
  }

  private subscribeMember(
    binding: TeamRunMemberBinding,
    onMessage: (message: ServerMessage) => void,
  ): () => void {
    let adapter;
    try {
      adapter = this.runtimeAdapterRegistry.resolveAdapter(binding.runtimeKind);
    } catch (error) {
      onMessage(
        createErrorMessage(
          "TEAM_RUNTIME_EVENT_BRIDGE_ERROR",
          `Runtime adapter not found for '${binding.runtimeKind}': ${String(error)}`,
        ),
      );
      return () => {};
    }

    if (!adapter.subscribeToRunEvents) {
      onMessage(
        createErrorMessage(
          "TEAM_RUNTIME_EVENT_BRIDGE_ERROR",
          `Runtime '${binding.runtimeKind}' does not support event subscriptions.`,
        ),
      );
      return () => {};
    }

    return adapter.subscribeToRunEvents(
      binding.memberRunId,
      (event: unknown) => {
        try {
          const mapped = this.runtimeEventMessageMapper.mapForRuntime(binding.runtimeKind, event);
          const payload =
            mapped.payload && typeof mapped.payload === "object"
              ? mapped.payload
              : {};

          onMessage(
            new ServerMessage(mapped.type as ServerMessageType, {
              ...payload,
              agent_name: binding.memberName,
              agent_id: binding.memberRunId,
            }),
          );
        } catch (error) {
          onMessage(
            createErrorMessage(
              "TEAM_RUNTIME_EVENT_BRIDGE_ERROR",
              `Failed mapping runtime member event: ${String(error)}`,
            ),
          );
        }
      },
    );
  }
}

let cachedTeamRuntimeEventBridge: TeamRuntimeEventBridge | null = null;

export const getTeamRuntimeEventBridge = (): TeamRuntimeEventBridge => {
  if (!cachedTeamRuntimeEventBridge) {
    cachedTeamRuntimeEventBridge = new TeamRuntimeEventBridge();
  }
  return cachedTeamRuntimeEventBridge;
};
