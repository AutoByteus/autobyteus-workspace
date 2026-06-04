import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { normalizeAgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { SelfEvolutionChangeSummary, SelfEvolutionNotificationSummary, SelfEvolutionTargetRef } from "../domain/models.js";

export class SelfEvolutionTargetNotificationService {
  constructor(private readonly agentRunManager: Pick<AgentRunManager, "getActiveRun"> = AgentRunManager.getInstance()) {}

  async notify(input: {
    evolutionRunId: string;
    target: SelfEvolutionTargetRef;
    changeSummary: SelfEvolutionChangeSummary | null;
  }): Promise<SelfEvolutionNotificationSummary> {
    if (input.target.kind !== "agent_run") {
      return {
        status: "next_run_only",
        message: "Team member active reload is not implemented in the MVP; future runs load changed skills.",
      };
    }

    const activeRun = this.agentRunManager.getActiveRun(input.target.runId);
    if (!activeRun) {
      return { status: "next_run_only", message: "Target run is inactive; future runs load changed skills." };
    }
    const status = normalizeAgentApiStatus(activeRun.getStatusSnapshot().status);
    if (status !== "idle") {
      return { status: "skipped_busy", message: `Target run is ${status}; notification is next-run only.` };
    }

    const changed = input.changeSummary?.changedSkillPaths ?? [];
    const message = [
      `Your configured skill files were updated by self-evolution run ${input.evolutionRunId}.`,
      changed.length ? `Changed skills/files:\n${changed.map((entry) => `- ${entry}`).join("\n")}` : "No changed skill files were detected.",
      "Please reload or re-read the affected skills before continuing when relevant.",
    ].join("\n\n");

    try {
      const result = await activeRun.postUserMessage(new AgentInputUserMessage(message, SenderType.SYSTEM));
      if (!result.accepted) {
        return { status: "failed", message, error: result.message ?? "Runtime rejected notification." };
      }
      return { status: "sent_active_idle", message };
    } catch (error) {
      return { status: "failed", message, error: String(error) };
    }
  }
}
