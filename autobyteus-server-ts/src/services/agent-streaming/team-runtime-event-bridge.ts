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
import { createErrorMessage, ServerMessage, type ServerMessageType } from "./models.js";

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
