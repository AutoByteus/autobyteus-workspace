import type { ApplicationExecutionProducer } from "@autobyteus/application-sdk-contracts";
import type { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { isAgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { TeamRunEventSourceType } from "../../agent-team-execution/domain/team-run-event.js";
import type { TeamAgentExecutionBinding } from "../../agent-team-execution/domain/team-agent-execution-binding.js";
import type { ApplicationAgentStreamSourceEvent } from "../domain/application-agent-streaming-models.js";
import type {
  ApplicationExecutionStreaming,
  ResolvedApplicationAgentExecutionTarget,
} from "../../application-platform/execution/application-execution-scope-contracts.js";
import { ApplicationAgentStreamingEstablishmentError } from "../domain/application-agent-streaming-models.js";

const runtimeNotActive = (): ApplicationAgentStreamingEstablishmentError =>
  new ApplicationAgentStreamingEstablishmentError("RUNTIME_NOT_ACTIVE");

export class ApplicationAgentStreamRuntimeSource implements ApplicationExecutionStreaming {
  constructor(private readonly dependencies: {
    agentRunManager: Pick<AgentRunManager, "getActiveRun">;
    teamRunManager: Pick<AgentTeamRunManager, "getActiveTeamRun">;
  }) {}

  attach(
    target: ResolvedApplicationAgentExecutionTarget,
    listener: (event: ApplicationAgentStreamSourceEvent) => void,
  ): () => void {
    if (target.subject === "AGENT_RUN") {
      const run = this.dependencies.agentRunManager.getActiveRun(target.agentRunId);
      if (!run) throw runtimeNotActive();
      return run.subscribeToEvents((event) => {
        if (!isAgentRunEvent(event)) return;
        try { listener({ source: "AGENT", event, producer: target.producer }); } catch { /* source isolation */ }
      });
    }

    const run = this.dependencies.teamRunManager
      .getActiveTeamRun(target.teamRunId);
    if (!run) throw runtimeNotActive();
    return run.subscribeToEvents(({ event }) => {
      try {
        if (target.targetAgentRunId) {
          if (event.eventSourceType !== TeamRunEventSourceType.AGENT) return;
          if (event.execution.agentRunId !== target.targetAgentRunId) return;
        }
        const producer = event.eventSourceType === TeamRunEventSourceType.AGENT
          ? resolveTeamAgentProducer(target, event.execution)
          : null;
        if (event.eventSourceType === TeamRunEventSourceType.AGENT && !producer) return;
        listener({ source: "AGENT_TEAM", event, producer });
      } catch { /* source isolation */ }
    });
  }
}

const resolveTeamAgentProducer = (
  target: Extract<ResolvedApplicationAgentExecutionTarget, { subject: "TEAM_RUN" }>,
  execution: TeamAgentExecutionBinding,
): ApplicationExecutionProducer | null => {
  return target.producers.find((producer) =>
    producer.agentRunId === execution.agentRunId,
  ) ?? null;
};
