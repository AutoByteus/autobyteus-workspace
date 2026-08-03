import { TeamRunEventSourceType, type TeamRunStatusUpdateData } from "../../domain/team-run-event.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { MixedTeamRunContext } from "./mixed-team-run-context.js";
import type { MixedTeamEventBus } from "./mixed-team-event-bus.js";
import type { AgentApiStatus } from "../../../agent-execution/domain/agent-status-payload.js";

export class MixedTeamStatusPublisher {
  private rootOfflinePublished = false;
  private lastStatus: string | null = "INITIALIZING";

  constructor(private readonly eventBus: MixedTeamEventBus) {}

  publishRootOffline(context: TeamRunContext<MixedTeamRunContext>): void {
    if (this.rootOfflinePublished) return;
    this.rootOfflinePublished = true;
    this.publish(context, "offline");
    this.lastStatus = "offline";
  }

  publishIfChanged(input: {
    context: TeamRunContext<MixedTeamRunContext> | null;
    terminating: boolean;
    status: () => AgentApiStatus;
  }): void {
    if (!input.context || input.terminating) return;
    const nextStatus = input.status();
    if (nextStatus === this.lastStatus) return;
    this.publish(input.context, nextStatus);
    this.lastStatus = nextStatus;
  }

  reset(): void {
    this.lastStatus = null;
  }

  private publish(context: TeamRunContext<MixedTeamRunContext>, status: AgentApiStatus): void {
    this.eventBus.publish({
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: context.runId,
      sourcePath: [],
      data: { status } satisfies TeamRunStatusUpdateData,
    });
  }
}
