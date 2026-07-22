import type { ApplicationExecutionProducer } from "@autobyteus/application-sdk-contracts";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { isAgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { TeamRunEventSourceType, type TeamRunAgentEventPayload } from "../../agent-team-execution/domain/team-run-event.js";
import type { AuthorizedApplicationAgentTargetDescriptor } from "../../application-orchestration/services/application-agent-target-authorization-service.js";
import type { ApplicationAgentStreamSourceEvent } from "../domain/application-agent-streaming-models.js";
import { ApplicationAgentStreamingEstablishmentError } from "../domain/application-agent-streaming-models.js";

const runtimeNotActive = (): ApplicationAgentStreamingEstablishmentError =>
  new ApplicationAgentStreamingEstablishmentError("RUNTIME_NOT_ACTIVE");

export class ApplicationAgentStreamRuntimeSource {
  constructor(private readonly dependencies: {
    agentRunManager?: Pick<AgentRunManager, "getActiveRun">;
    teamRunManager?: Pick<AgentTeamRunManager, "getActiveRun">;
  } = {}) {}

  attach(
    descriptor: AuthorizedApplicationAgentTargetDescriptor,
    listener: (event: ApplicationAgentStreamSourceEvent) => void,
  ): () => void {
    if (descriptor.runtimeSubject === "AGENT_RUN") {
      const run = (this.dependencies.agentRunManager ?? AgentRunManager.getInstance())
        .getActiveRun(descriptor.runtimeRunId);
      const producer = descriptor.producers[0];
      if (!run || !producer) throw runtimeNotActive();
      return run.subscribeToEvents((event) => {
        if (!isAgentRunEvent(event)) return;
        try { listener({ source: "AGENT", event, producer }); } catch { /* source isolation */ }
      });
    }

    const run = (this.dependencies.teamRunManager ?? AgentTeamRunManager.getInstance())
      .getActiveRun(descriptor.runtimeRunId);
    if (!run) throw runtimeNotActive();
    const selectedRouteKey = descriptor.address.target.kind === "AGENT_TEAM_MEMBER"
      ? descriptor.address.target.memberRouteKey
      : null;
    return run.subscribeToEvents((event) => {
      try {
        if (selectedRouteKey) {
          if (event.eventSourceType !== TeamRunEventSourceType.AGENT) return;
          const payload = event.data as TeamRunAgentEventPayload;
          const producerRouteKey = payload.taskAgentInstance?.logicalMember.memberRouteKey
            ?? payload.memberRouteKey;
          if (producerRouteKey !== selectedRouteKey) return;
        }
        const producer = event.eventSourceType === TeamRunEventSourceType.AGENT
          ? resolveTeamAgentProducer(descriptor, event.data as TeamRunAgentEventPayload)
          : null;
        if (event.eventSourceType === TeamRunEventSourceType.AGENT && !producer) return;
        listener({ source: "AGENT_TEAM", event, producer });
      } catch { /* source isolation */ }
    });
  }
}

const resolveTeamAgentProducer = (
  descriptor: AuthorizedApplicationAgentTargetDescriptor,
  payload: TeamRunAgentEventPayload,
): ApplicationExecutionProducer | null => {
  const task = payload.taskAgentInstance ?? null;
  if (task) {
    return {
      runId: task.taskAgentRunId,
      memberRouteKey: task.logicalMember.memberRouteKey,
      memberName: task.logicalMember.memberName,
      displayName: task.logicalMember.memberName,
      runtimeKind: "AGENT_TEAM_MEMBER",
      teamPath: [...task.logicalMember.memberPath],
    };
  }
  return descriptor.producers.find((producer) => producer.memberRouteKey === payload.memberRouteKey) ?? null;
};
