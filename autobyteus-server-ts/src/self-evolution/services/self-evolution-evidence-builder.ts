import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { RAW_TRACES_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { AgentRunViewProjectionService, getAgentRunViewProjectionService } from "../../run-history/services/agent-run-view-projection-service.js";
import { TeamMemberRunViewProjectionService, getTeamMemberRunViewProjectionService } from "../../run-history/services/team-member-run-view-projection-service.js";
import type { RunProjection } from "../../run-history/projection/run-projection-types.js";
import type { SelfEvolutionEvidencePackage } from "../domain/models.js";
import type { SelfEvolutionTargetContext } from "./self-evolution-target-context-resolver.js";
import type { SelfEvolutionSkillTarget } from "../domain/models.js";

const MAX_CONVERSATION_ITEMS = 12;
const MAX_ACTIVITY_ITEMS = 10;

export class SelfEvolutionEvidenceBuilder {
  constructor(private readonly deps: {
    agentRunViewProjectionService?: AgentRunViewProjectionService;
    teamMemberRunViewProjectionService?: TeamMemberRunViewProjectionService;
  } = {}) {}

  async build(input: {
    targetContext: SelfEvolutionTargetContext;
    skillTargets: SelfEvolutionSkillTarget[];
  }): Promise<{ evidence: SelfEvolutionEvidencePackage; evidenceSummaryHash: string }> {
    const projection = await this.loadProjection(input.targetContext);
    const rawTracePaths = await this.resolveRawTracePaths(input.targetContext.memoryDir);
    const runHistorySummary = this.buildSummary(input.targetContext, projection, input.skillTargets);
    const evidence: SelfEvolutionEvidencePackage = {
      target: input.targetContext.target,
      sourceRunIds: input.targetContext.sourceRunIds,
      runMetadataPath: input.targetContext.runMetadataPath,
      rawTracePaths,
      runHistorySummary,
      feedbackSignals: this.extractFeedbackSignals(projection),
      privacyWarnings: [
        "Treat traces as sensitive evidence.",
        "Do not copy secrets, credentials, private messages, proprietary details, one-off file paths, or transient user specifics into durable skills.",
      ],
    };
    return {
      evidence,
      evidenceSummaryHash: crypto.createHash("sha256").update(runHistorySummary).digest("hex"),
    };
  }

  private async loadProjection(context: SelfEvolutionTargetContext): Promise<RunProjection> {
    if (context.target.kind === "agent_run") {
      return this.agentRunViewProjectionService.getProjection(context.target.runId);
    }
    const memberProjection = await this.teamMemberRunViewProjectionService.getProjection(
      context.target.teamRunId,
      (context.targetMetadata as { memberRouteKey?: string }).memberRouteKey ?? context.target.memberRunId,
    );
    return {
      runId: memberProjection.agentRunId,
      conversation: memberProjection.conversation,
      activities: memberProjection.activities,
      summary: memberProjection.summary,
      lastActivityAt: memberProjection.lastActivityAt,
    };
  }

  private async resolveRawTracePaths(memoryDir: string): Promise<string[]> {
    const candidates = [path.join(memoryDir, RAW_TRACES_MEMORY_FILE_NAME)];
    const existing: string[] = [];
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        existing.push(candidate);
      } catch {
        // Raw trace files are references only; absence is not fatal.
      }
    }
    return existing;
  }

  private buildSummary(
    context: SelfEvolutionTargetContext,
    projection: RunProjection,
    skillTargets: SelfEvolutionSkillTarget[],
  ): string {
    const lines: string[] = [];
    lines.push(`Target agent: ${context.agentName} (${context.agentDefinitionId})`);
    lines.push(`Target kind: ${context.target.kind}`);
    lines.push(`Source run IDs: ${context.sourceRunIds.join(", ")}`);
    lines.push(`Workspace: ${context.workspaceRootPath}`);
    lines.push(`Configured skills: ${skillTargets.map((target) => target.skillName).join(", ") || "none"}`);
    if (projection.summary) {
      lines.push(`Run summary: ${projection.summary}`);
    }

    lines.push("Conversation digest:");
    for (const entry of projection.conversation.slice(-MAX_CONVERSATION_ITEMS)) {
      const role = entry.role ?? entry.kind;
      const content = this.compactText(entry.content ?? entry.toolError ?? "");
      if (content) {
        lines.push(`- ${role}: ${content}`);
      }
    }

    lines.push("Tool/activity digest:");
    for (const activity of projection.activities.slice(-MAX_ACTIVITY_ITEMS)) {
      if (activity.kind !== "tool") {
        continue;
      }
      lines.push(`- ${activity.toolName} ${activity.status}: ${this.compactText(activity.contextText || activity.error || "")}`);
    }
    return lines.join("\n");
  }

  private extractFeedbackSignals(projection: RunProjection): string[] {
    const signals: string[] = [];
    for (const entry of projection.conversation) {
      const content = (entry.content ?? "").toLowerCase();
      if (/\b(wrong|failed|error|fix|correction|incorrect|regression)\b/.test(content)) {
        signals.push(this.compactText(entry.content ?? ""));
      }
    }
    return signals.slice(-8);
  }

  private compactText(value: string): string {
    return value.replace(/\s+/g, " ").trim().slice(0, 600);
  }

  private get agentRunViewProjectionService(): AgentRunViewProjectionService {
    return this.deps.agentRunViewProjectionService ?? getAgentRunViewProjectionService();
  }

  private get teamMemberRunViewProjectionService(): TeamMemberRunViewProjectionService {
    return this.deps.teamMemberRunViewProjectionService ?? getTeamMemberRunViewProjectionService();
  }
}
