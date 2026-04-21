import type { ObservedRunLifecycleEvent } from "../../runtime-management/domain/observed-run-lifecycle-event.js";
import { AgentRunService, getAgentRunService } from "../../agent-execution/services/agent-run-service.js";
import { TeamRunService, getTeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import type { BoundRunRuntimeDescriptor } from "../domain/models.js";

export class ApplicationBoundRunLifecycleGateway {
  constructor(
    private readonly dependencies: {
      agentRunService?: AgentRunService;
      teamRunService?: TeamRunService;
    } = {},
  ) {}

  private get agentRunService(): AgentRunService {
    return this.dependencies.agentRunService ?? getAgentRunService();
  }

  private get teamRunService(): TeamRunService {
    return this.dependencies.teamRunService ?? getTeamRunService();
  }

  async observeBoundRun(
    bindingRuntime: BoundRunRuntimeDescriptor,
    listener: (event: ObservedRunLifecycleEvent) => void,
  ): Promise<(() => void) | null> {
    if (bindingRuntime.runtimeSubject === "AGENT_RUN") {
      return this.agentRunService.observeAgentRunLifecycle(bindingRuntime.runId, listener);
    }
    return this.teamRunService.observeTeamRunLifecycle(bindingRuntime.runId, listener);
  }
}
