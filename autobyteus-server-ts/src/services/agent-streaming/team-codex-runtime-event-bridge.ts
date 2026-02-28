import type { TeamRunMemberBinding } from "../../run-history/domain/team-models.js";
import {
  getTeamRuntimeBindingRegistry,
  type TeamRuntimeBindingRegistry,
} from "../../agent-team-execution/services/team-runtime-binding-registry.js";
import {
  getCodexAppServerRuntimeService,
  type CodexRuntimeEvent,
  type CodexAppServerRuntimeService,
} from "../../runtime-execution/codex-app-server/codex-app-server-runtime-service.js";
import {
  getRuntimeEventMessageMapper,
  type RuntimeEventMessageMapper,
} from "./runtime-event-message-mapper.js";
import { createErrorMessage, ServerMessage, type ServerMessageType } from "./models.js";

export class TeamCodexRuntimeEventBridge {
  private readonly bindingRegistry: TeamRuntimeBindingRegistry;
  private readonly codexRuntimeService: CodexAppServerRuntimeService;
  private readonly runtimeEventMessageMapper: RuntimeEventMessageMapper;

  constructor(
    bindingRegistry: TeamRuntimeBindingRegistry = getTeamRuntimeBindingRegistry(),
    codexRuntimeService: CodexAppServerRuntimeService = getCodexAppServerRuntimeService(),
    runtimeEventMessageMapper: RuntimeEventMessageMapper = getRuntimeEventMessageMapper(),
  ) {
    this.bindingRegistry = bindingRegistry;
    this.codexRuntimeService = codexRuntimeService;
    this.runtimeEventMessageMapper = runtimeEventMessageMapper;
  }

  subscribeTeam(
    teamRunId: string,
    onMessage: (message: ServerMessage) => void,
  ): () => Promise<void> {
    const codexBindings = this.bindingRegistry
      .getTeamBindings(teamRunId)
      .filter((binding) => binding.runtimeKind === "codex_app_server");
    const unsubscribers = codexBindings.map((binding) =>
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
    return this.codexRuntimeService.subscribeToRunEvents(
      binding.memberRunId,
      (event: CodexRuntimeEvent) => {
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
              "TEAM_CODEX_EVENT_BRIDGE_ERROR",
              `Failed mapping codex member event: ${String(error)}`,
            ),
          );
        }
      },
    );
  }
}

let cachedTeamCodexRuntimeEventBridge: TeamCodexRuntimeEventBridge | null = null;

export const getTeamCodexRuntimeEventBridge = (): TeamCodexRuntimeEventBridge => {
  if (!cachedTeamCodexRuntimeEventBridge) {
    cachedTeamCodexRuntimeEventBridge = new TeamCodexRuntimeEventBridge();
  }
  return cachedTeamCodexRuntimeEventBridge;
};
