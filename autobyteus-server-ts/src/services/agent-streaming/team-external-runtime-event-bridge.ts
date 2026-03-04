import type { TeamRunMemberBinding } from "../../run-history/domain/team-models.js";
import {
  getTeamRuntimeBindingRegistry,
  type TeamRuntimeBindingRegistry,
} from "../../agent-team-execution/services/team-runtime-binding-registry.js";
import {
  getExternalRuntimeEventSourceRegistry,
  type ExternalRuntimeEventSourceRegistry,
} from "../../runtime-execution/external-runtime-event-source-registry.js";
import {
  getRuntimeEventMessageMapper,
  type RuntimeEventMessageMapper,
} from "./runtime-event-message-mapper.js";
import { createErrorMessage, ServerMessage, type ServerMessageType } from "./models.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export interface TeamExternalRuntimeMemberEvent {
  teamRunId: string;
  binding: TeamRunMemberBinding;
  event: unknown;
}

export class TeamExternalRuntimeEventBridge {
  private readonly bindingRegistry: TeamRuntimeBindingRegistry;
  private readonly externalRuntimeEventSourceRegistry: ExternalRuntimeEventSourceRegistry;
  private readonly runtimeEventMessageMapper: RuntimeEventMessageMapper;

  constructor(
    bindingRegistry: TeamRuntimeBindingRegistry = getTeamRuntimeBindingRegistry(),
    externalRuntimeEventSourceRegistry: ExternalRuntimeEventSourceRegistry =
      getExternalRuntimeEventSourceRegistry(),
    runtimeEventMessageMapper: RuntimeEventMessageMapper = getRuntimeEventMessageMapper(),
  ) {
    this.bindingRegistry = bindingRegistry;
    this.externalRuntimeEventSourceRegistry = externalRuntimeEventSourceRegistry;
    this.runtimeEventMessageMapper = runtimeEventMessageMapper;
  }

  subscribeTeam(
    teamRunId: string,
    onMessage: (message: ServerMessage) => void,
    onRuntimeEvent?: (input: TeamExternalRuntimeMemberEvent) => void | Promise<void>,
  ): () => Promise<void> {
    const externalBindings = this.bindingRegistry
      .getTeamBindings(teamRunId)
      .filter((binding) => binding.runtimeKind !== "autobyteus");

    const unsubscribers = externalBindings
      .map((binding) => this.trySubscribeMember(teamRunId, binding, onMessage, onRuntimeEvent))
      .filter((unsubscribe): unsubscribe is () => void => typeof unsubscribe === "function");

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

  private trySubscribeMember(
    teamRunId: string,
    binding: TeamRunMemberBinding,
    onMessage: (message: ServerMessage) => void,
    onRuntimeEvent?: (input: TeamExternalRuntimeMemberEvent) => void | Promise<void>,
  ): (() => void) | null {
    try {
      const source = this.externalRuntimeEventSourceRegistry.resolveSource(binding.runtimeKind);
      return source.subscribeToRunEvents(binding.memberRunId, (event: unknown) => {
        if (onRuntimeEvent) {
          void Promise.resolve(onRuntimeEvent({ teamRunId, binding, event })).catch((error) => {
            logger.warn(
              `Failed handling team member runtime reference event for '${binding.memberRunId}': ${String(error)}`,
            );
          });
        }
        try {
          const mapped = this.runtimeEventMessageMapper.map(event);
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
              "TEAM_EXTERNAL_RUNTIME_EVENT_BRIDGE_ERROR",
              `Failed mapping external member event: ${String(error)}`,
            ),
          );
        }
      });
    } catch (error) {
      logger.warn(
        `Failed subscribing team member runtime events for '${binding.memberRunId}' (${binding.runtimeKind}): ${String(error)}`,
      );
      onMessage(
        createErrorMessage(
          "TEAM_EXTERNAL_RUNTIME_SOURCE_UNAVAILABLE",
          `External runtime source unavailable for '${binding.runtimeKind}'.`,
        ),
      );
      return null;
    }
  }
}

let cachedTeamExternalRuntimeEventBridge: TeamExternalRuntimeEventBridge | null = null;

export const getTeamExternalRuntimeEventBridge = (): TeamExternalRuntimeEventBridge => {
  if (!cachedTeamExternalRuntimeEventBridge) {
    cachedTeamExternalRuntimeEventBridge = new TeamExternalRuntimeEventBridge();
  }
  return cachedTeamExternalRuntimeEventBridge;
};

// Backward-compatible aliases while callers migrate to runtime-neutral naming.
export { TeamExternalRuntimeEventBridge as TeamCodexRuntimeEventBridge };
export const getTeamCodexRuntimeEventBridge = getTeamExternalRuntimeEventBridge;
