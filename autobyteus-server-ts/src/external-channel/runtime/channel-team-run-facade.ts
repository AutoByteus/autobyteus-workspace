import type { ChannelBinding } from "../domain/models.js";
import type { ChannelRunDispatchResult } from "./channel-run-dispatch-result.js";
import { ChannelBindingRunLauncher } from "./channel-binding-run-launcher.js";
import {
  getTeamLiveMessagePublisher,
  type TeamLiveMessagePublisher,
} from "../../services/agent-streaming/team-live-message-publisher.js";
import {
  getTeamRunService,
  type TeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";
import { buildAgentInputMessage } from "./channel-agent-input-message-builder.js";
import { startTeamDispatchTurnCapture } from "./channel-dispatch-turn-capture.js";
import {
  ChannelDispatchLockRegistry,
  getChannelDispatchLockRegistry,
} from "./channel-dispatch-lock-registry.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import {
  getRuntimeMemberContexts,
  type TeamMemberRuntimeContext,
} from "../../agent-team-execution/domain/team-run-context.js";
import {
  buildMemberRouteKeyFromPath,
  selectorFromMemberRouteKey,
} from "../../agent-team-execution/domain/team-run-member-identity.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export type ChannelTeamRunFacadeDependencies = {
  runLauncher?: ChannelBindingRunLauncher;
  teamRunService?: TeamRunService;
  teamLiveMessagePublisher?: TeamLiveMessagePublisher;
  dispatchLockRegistry?: ChannelDispatchLockRegistry;
};

export class ChannelTeamRunFacade {
  private readonly runLauncher: ChannelBindingRunLauncher;
  private readonly teamRunService: TeamRunService;
  private readonly teamLiveMessagePublisher: TeamLiveMessagePublisher;
  private readonly dispatchLockRegistry: ChannelDispatchLockRegistry;

  constructor(
    deps: ChannelTeamRunFacadeDependencies = {},
  ) {
    this.runLauncher = deps.runLauncher ?? new ChannelBindingRunLauncher();
    this.teamRunService =
      deps.teamRunService ?? getTeamRunService();
    this.teamLiveMessagePublisher =
      deps.teamLiveMessagePublisher ?? getTeamLiveMessagePublisher();
    this.dispatchLockRegistry =
      deps.dispatchLockRegistry ?? getChannelDispatchLockRegistry();
  }

  async dispatchToTeamBinding(
    binding: ChannelBinding,
    envelope: import("autobyteus-ts/external-channel/external-message-envelope.js").ExternalMessageEnvelope,
  ): Promise<ChannelRunDispatchResult> {
    const teamRunId = await this.runLauncher.resolveOrStartTeamRun(binding);
    return this.dispatchLockRegistry.runExclusive(
      `team:${teamRunId}`,
      async () => {
        const teamRun = await this.teamRunService.resolveTeamRun(teamRunId);
        if (!teamRun) {
          throw new Error(`Team run '${teamRunId}' is not active.`);
        }
        const subscribeToEvents = teamRun.subscribeToEvents.bind(teamRun);
        const turnCapture = startTeamDispatchTurnCapture(
          subscribeToEvents,
          binding.targetNodeName ?? null,
        );
        let result;
        try {
          const targetNodeName = normalizeOptionalString(binding.targetNodeName ?? null);
          result = await teamRun.postMessage(
            buildAgentInputMessage(envelope),
            targetNodeName ? selectorFromMemberRouteKey(targetNodeName) : null,
          );
        } catch (error) {
          turnCapture.dispose();
          throw error;
        }
        if (!result.accepted) {
          turnCapture.dispose();
          throw new Error(result.message ?? `Team run '${teamRunId}' rejected the message.`);
        }
        const directTurnId = normalizeOptionalString(result.turnId ?? null);
        const directMemberRunId = normalizeOptionalString(result.memberRunId ?? null);
        let capturedTurn = null;
        if (directTurnId && directMemberRunId) {
          turnCapture.dispose();
          capturedTurn = {
            turnId: directTurnId,
            memberRunId: directMemberRunId,
            memberName:
              normalizeOptionalString(result.memberName ?? null) ??
              normalizeOptionalString(binding.targetNodeName ?? null),
          };
        } else {
          capturedTurn = await turnCapture.promise;
        }
        const turnId = normalizeOptionalString(capturedTurn?.turnId ?? directTurnId);
        const memberRunId = normalizeOptionalString(
          capturedTurn?.memberRunId ?? directMemberRunId,
        );
        if (!turnId || !memberRunId) {
          throw new Error(
            `Team run '${teamRunId}' accepted external channel dispatch without authoritative member/turn correlation.`,
          );
        }
        await this.teamRunService.recordRunActivity(teamRun, {
          summary: envelope.content,
          lastKnownStatus: "ACTIVE",
          lastActivityAt: new Date().toISOString(),
        });
        try {
          const targetMemberRouteKey = normalizeOptionalString(binding.targetNodeName ?? null);
          this.teamLiveMessagePublisher.publishExternalUserMessage({
            teamRunId,
            envelope,
            ...resolveExternalDispatchMemberIdentity(teamRun, {
              memberRunId,
              targetMemberRouteKey,
              memberName:
                normalizeOptionalString(capturedTurn?.memberName ?? null) ??
                normalizeOptionalString(result.memberName ?? null) ??
                targetMemberRouteKey,
            }),
          });
        } catch (error) {
          logger.warn(
            `Team run '${teamRunId}': failed to publish external user message to the live team frontend stream. Continuing because provider reply routing depends on ingress receipt persistence.`,
            error,
          );
        }

        return {
          dispatchTargetType: "TEAM",
          teamRunId,
          memberRunId,
          memberName:
            normalizeOptionalString(capturedTurn?.memberName ?? null) ??
            normalizeOptionalString(result.memberName ?? null) ??
            normalizeOptionalString(binding.targetNodeName ?? null),
          turnId,
          dispatchedAt: new Date(),
        };
      },
    );
  }
}

const normalizeOptionalString = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveExternalDispatchMemberIdentity = (
  teamRun: TeamRun,
  input: {
    memberRunId: string | null;
    targetMemberRouteKey: string | null;
    memberName: string | null;
  },
): {
  agentName: string | null;
  agentId: string | null;
  memberRouteKey: string | null;
  memberPath: string[] | null;
  sourceRouteKey: string | null;
  sourcePath: string[] | null;
} => {
  const runtimeContext = findRuntimeMemberContext(teamRun, input);
  const routeKey =
    runtimeContext?.memberRouteKey ??
    normalizeRouteKey(input.targetMemberRouteKey);
  const path = runtimeContext?.memberPath ?? routeKeyToMemberPath(routeKey);

  return {
    agentName: runtimeContext?.memberName ?? input.memberName,
    agentId: runtimeContext?.memberRunId ?? input.memberRunId,
    memberRouteKey: routeKey,
    memberPath: path,
    sourceRouteKey: routeKey,
    sourcePath: path,
  };
};

const findRuntimeMemberContext = (
  teamRun: TeamRun,
  input: {
    memberRunId: string | null;
    targetMemberRouteKey: string | null;
  },
): TeamMemberRuntimeContext | null => {
  const contexts = getRuntimeMemberContexts(teamRun.getRuntimeContext());
  if (input.memberRunId) {
    const byRunId = contexts.find(
      (context) => context.memberRunId === input.memberRunId,
    );
    if (byRunId) {
      return byRunId;
    }
  }

  const targetMemberRouteKey = normalizeRouteKey(input.targetMemberRouteKey);
  if (!targetMemberRouteKey) {
    return null;
  }
  return contexts.find((context) => context.memberRouteKey === targetMemberRouteKey) ?? null;
};

const normalizeRouteKey = (routeKey: string | null): string | null => {
  if (!routeKey) {
    return null;
  }
  try {
    const selector = selectorFromMemberRouteKey(routeKey);
    return selector.kind === "route_key" ? selector.memberRouteKey : null;
  } catch {
    return null;
  }
};

const routeKeyToMemberPath = (routeKey: string | null): string[] | null =>
  routeKey ? buildMemberRouteKeyFromPath(routeKey.split("/")).split("/") : null;
