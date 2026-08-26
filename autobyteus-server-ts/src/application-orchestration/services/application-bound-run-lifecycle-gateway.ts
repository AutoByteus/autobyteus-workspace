import type { ObservedRunLifecycleEvent } from "../../runtime-management/domain/observed-run-lifecycle-event.js";
import type {
  ApplicationAgentExecution,
  ApplicationTeamExecution,
} from "../../application-platform/execution/application-execution-scope-contracts.js";
import type { BoundRunRuntimeDescriptor } from "../domain/models.js";

export class ApplicationBoundRunLifecycleGateway {
  constructor(
    private readonly dependencies: {
      agentExecution: ApplicationAgentExecution;
      teamExecution: ApplicationTeamExecution;
    },
  ) {}

  private get agentExecution(): ApplicationAgentExecution {
    return this.dependencies.agentExecution;
  }

  private get teamExecution(): ApplicationTeamExecution {
    return this.dependencies.teamExecution;
  }

  async observeBoundRun(
    bindingRuntime: BoundRunRuntimeDescriptor,
    listener: (event: ObservedRunLifecycleEvent) => void,
  ): Promise<(() => void) | null> {
    if (bindingRuntime.runtimeSubject === "AGENT_RUN") {
      return this.agentExecution.observeAgentRunLifecycle(bindingRuntime.agentRunId, listener);
    }
    return this.teamExecution.observeTeamRunLifecycle(bindingRuntime.teamRunId, listener);
  }
}
