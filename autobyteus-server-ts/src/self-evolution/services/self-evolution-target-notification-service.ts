import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { normalizeAgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { SelfEvolutionNotificationSummary, SelfEvolutionSkillTarget, SelfEvolutionTargetRef } from "../domain/models.js";

export class SelfEvolutionTargetNotificationService {
  constructor(private readonly agentRunManager: Pick<AgentRunManager, "getActiveRun"> = AgentRunManager.getInstance()) {}

  async notify(input: {
    evolutionRunId: string;
    target: SelfEvolutionTargetRef;
    skillTargets: SelfEvolutionSkillTarget[];
  }): Promise<SelfEvolutionNotificationSummary> {
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

    const skillRoots = input.skillTargets
      .filter((target) => target.isWritable)
      .map((target) => `- ${target.skillName}: ${target.skillRootPath}`);
    const message = [
      `A self-evolution run completed for your configured skill playbooks: ${input.evolutionRunId}.`,
      skillRoots.length ? `Affected skill packages:\n${skillRoots.join("\n")}` : "No writable skill package was listed for active reload.",
      "Please reload or re-read the affected skills before continuing when relevant.",
      "Helper-run completion does not by itself prove downstream improvement; use the updated skills only when they are relevant.",
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
