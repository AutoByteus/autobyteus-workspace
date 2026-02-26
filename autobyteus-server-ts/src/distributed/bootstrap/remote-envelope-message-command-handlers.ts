import { AgentInputUserMessage } from "autobyteus-ts";
import type { InterAgentMessageRequestEvent } from "autobyteus-ts/agent-team/events/agent-team-events.js";
import type { TeamCommandIngressError } from "../ingress/team-command-ingress-service.js";
import {
  dispatchInterAgentMessageViaTeamManager,
} from "../routing/worker-local-dispatch.js";
import { dispatchToWorkerOwnedMemberIfEligible } from "../routing/worker-owned-member-dispatch-orchestrator.js";
import type { TeamEnvelope } from "../envelope/envelope-builder.js";
import type { RemoteMemberExecutionGatewayDependencies } from "../worker-execution/remote-member-execution-gateway.js";
import {
  getPayloadRecord,
  normalizeUserMessageInput,
} from "./bootstrap-payload-normalization.js";
import { WorkerRunLifecycleCoordinator } from "./worker-run-lifecycle-coordinator.js";
import {
  normalizeRequiredString,
  type ResolveBoundRuntimeTeam,
} from "./remote-envelope-command-handler-common.js";
import type { RunScopedTeamBindingRegistry } from "../runtime-binding/run-scoped-team-binding-registry.js";

export type CreateRemoteEnvelopeMessageCommandHandlersDependencies = {
  selfNodeId: string;
  runScopedTeamBindingRegistry: Pick<RunScopedTeamBindingRegistry, "tryResolveRun">;
  workerRunLifecycleCoordinator: WorkerRunLifecycleCoordinator;
  resolveBoundRuntimeTeam: ResolveBoundRuntimeTeam;
  onTeamDispatchUnavailable: (code: string, message: string) => TeamCommandIngressError;
};

export const createRemoteEnvelopeMessageCommandHandlers = (
  deps: CreateRemoteEnvelopeMessageCommandHandlersDependencies,
): Pick<
  RemoteMemberExecutionGatewayDependencies,
  "dispatchUserMessage" | "dispatchInterAgentMessage"
> => ({
  dispatchUserMessage: async (envelope: TeamEnvelope) => {
    const payload = getPayloadRecord(envelope.payload);
    const targetAgentName = normalizeRequiredString(
      String(payload.targetAgentName ?? ""),
      "payload.targetAgentName",
    );
    const bound = deps.resolveBoundRuntimeTeam({
      teamRunId: envelope.teamRunId,
    });
    const team = bound.team;
    const userMessage = normalizeUserMessageInput(payload.userMessage);

    const localDispatch = await dispatchToWorkerOwnedMemberIfEligible({
      selfNodeId: deps.selfNodeId,
      teamRunId: envelope.teamRunId,
      targetMemberName: targetAgentName,
      runScopedTeamBindingRegistry: deps.runScopedTeamBindingRegistry,
      workerManagedRunIds: deps.workerRunLifecycleCoordinator.getWorkerManagedRunIds(),
      team,
      dispatch: async (localRoutingPort) =>
        localRoutingPort.dispatchUserMessage({
          targetAgentName,
          userMessage,
        }),
    });
    if (localDispatch.handled) {
      return;
    }
    if (!team.postMessage) {
      throw deps.onTeamDispatchUnavailable(
        "TEAM_DISPATCH_UNAVAILABLE",
        `Team definition '${bound.teamDefinitionId}' does not support postMessage dispatch.`,
      );
    }
    await team.postMessage(userMessage, targetAgentName);
  },
  dispatchInterAgentMessage: async (envelope: TeamEnvelope) => {
    const payload = getPayloadRecord(envelope.payload);
    const recipientName = normalizeRequiredString(
      String(payload.recipientName ?? ""),
      "payload.recipientName",
    );
    const content = normalizeRequiredString(String(payload.content ?? ""), "payload.content");
    const messageType = normalizeRequiredString(
      String(payload.messageType ?? ""),
      "payload.messageType",
    );
    const senderAgentId = normalizeRequiredString(
      String(payload.senderAgentId ?? ""),
      "payload.senderAgentId",
    );
    const bound = deps.resolveBoundRuntimeTeam({
      teamRunId: envelope.teamRunId,
    });
    const team = bound.team;

    const localDispatch = await dispatchToWorkerOwnedMemberIfEligible({
      selfNodeId: deps.selfNodeId,
      teamRunId: envelope.teamRunId,
      targetMemberName: recipientName,
      runScopedTeamBindingRegistry: deps.runScopedTeamBindingRegistry,
      workerManagedRunIds: deps.workerRunLifecycleCoordinator.getWorkerManagedRunIds(),
      team,
      dispatch: async (localRoutingPort) =>
        localRoutingPort.dispatchInterAgentMessageRequest({
          senderAgentId,
          recipientName,
          content,
          messageType,
        }),
    });
    if (localDispatch.handled) {
      return;
    }

    const handledByTeamManager = await dispatchInterAgentMessageViaTeamManager({
      team,
      event: {
        senderAgentId,
        recipientName,
        content,
        messageType,
      } as InterAgentMessageRequestEvent,
    });
    if (handledByTeamManager) {
      return;
    }
    if (!team.postMessage) {
      throw deps.onTeamDispatchUnavailable(
        "TEAM_DISPATCH_UNAVAILABLE",
        `Team definition '${bound.teamDefinitionId}' cannot route inter-agent messages.`,
      );
    }
    await team.postMessage(
      AgentInputUserMessage.fromDict({ content, context_files: null }),
      recipientName,
    );
  },
});
