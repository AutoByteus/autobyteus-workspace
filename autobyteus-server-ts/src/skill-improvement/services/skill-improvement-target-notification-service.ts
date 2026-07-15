import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import { normalizeAgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { SkillImprovementNotificationSummary, SkillImprovementSkillTarget, SkillImprovementTargetRef } from "../domain/models.js";

export class SkillImprovementTargetNotificationService {
  constructor(private readonly agentRunManager: Pick<AgentRunManager, "getActiveRun"> = AgentRunManager.getInstance()) {}

  async notify(input: {
    improvementRunId: string;
    target: SkillImprovementTargetRef;
    skillTargets: SkillImprovementSkillTarget[];
  }): Promise<SkillImprovementNotificationSummary> {
    if (input.target.kind !== "agent_run") {
      return {
        status: "next_run_only",
        message: "Team member active reload is not implemented in the MVP; future runs load any updated skills.",
      };
    }

    const activeRun = this.agentRunManager.getActiveRun(input.target.runId);
    if (!activeRun) {
      return { status: "next_run_only", message: "Target run is inactive; future runs load any updated skills." };
    }
    const status = normalizeAgentApiStatus(activeRun.getStatusSnapshot().status);
    if (status !== "idle") {
      return { status: "skipped_busy", message: `Target run is ${status}; notification is next-run only.` };
    }

    const message = [
      "Improve skills finished for this run.",
      "Future runs will use any updated skill guidance. No changes may have been made.",
    ].join("\n\n");

    try {
      activeRun.emitLocalEvent({
        eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION,
        runId: activeRun.runId,
        payload: {
          sender_id: "system.skill_improvement",
          content: message,
        },
        statusHint: null,
      });
      return { status: "sent_active_idle", message };
    } catch (error) {
      return { status: "failed", message, error: String(error) };
    }
  }
}
