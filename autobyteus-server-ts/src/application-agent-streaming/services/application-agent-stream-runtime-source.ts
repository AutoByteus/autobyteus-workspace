import type { ApplicationExecutionProducer } from "@autobyteus/application-sdk-contracts";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { isAgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { TeamRunEventSourceType } from "../../agent-team-execution/domain/team-run-event.js";
import type { TeamAgentExecutionBinding } from "../../agent-team-execution/domain/team-agent-execution-binding.js";
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
    const selectedAddress = descriptor.address.target.kind === "AGENT_TEAM_MEMBER"
      ? descriptor.address.target.memberAddress
      : null;
    return run.subscribeToEvents((event) => {
      try {
        if (selectedAddress) {
          if (event.eventSourceType !== TeamRunEventSourceType.AGENT) return;
          if (event.execution.executionAddress.memberAddress !== selectedAddress) return;
        }
        const producer = event.eventSourceType === TeamRunEventSourceType.AGENT
          ? resolveTeamAgentProducer(descriptor, event.execution)
          : null;
        if (event.eventSourceType === TeamRunEventSourceType.AGENT && !producer) return;
        listener({ source: "AGENT_TEAM", event, producer });
      } catch { /* source isolation */ }
    });
  }
}

const resolveTeamAgentProducer = (
  descriptor: AuthorizedApplicationAgentTargetDescriptor,
  execution: TeamAgentExecutionBinding,
): ApplicationExecutionProducer | null => {
  if (execution.kind !== "persistent_agent") {
    const base = descriptor.producers.find((producer) =>
      producer.executionAddress.memberAddress === execution.executionAddress.memberAddress,
    );
    return {
      executionAddress: execution.executionAddress,
      displayName: base?.displayName ?? null,
      runtimeKind: "AGENT_TEAM_MEMBER",
    };
  }
  return descriptor.producers.find((producer) =>
    producer.executionAddress.memberAddress === execution.executionAddress.memberAddress,
  ) ?? null;
};
