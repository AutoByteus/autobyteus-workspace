import type { RunProjection, RunProjectionActivityEntry, RunProjectionConversationEntry } from "../../run-history/projection/run-projection-types.js";
import type { SelfEvolutionSkillTarget } from "../domain/models.js";
import type { SelfEvolutionTargetContext } from "./self-evolution-target-context-resolver.js";

const MAX_CONVERSATION_ITEMS = 14;
const MAX_ACTIVITY_ITEMS = 12;
const MAX_SIGNAL_ITEMS = 8;
const MAX_TEXT_LENGTH = 700;

type FeedbackSignalKind = "durable_skill_update" | "correction";

export class SelfEvolutionWorkHistoryProjector {
  render(input: {
    targetContext: SelfEvolutionTargetContext;
    projection: RunProjection;
    skillTargets: SelfEvolutionSkillTarget[];
  }): { anonymizedWorkHistory: string; feedbackSignals: string[]; privacyWarnings: string[] } {
    const feedbackSignals = this.extractFeedbackSignals(input.projection);
    const lines: string[] = [];
    lines.push("[WORK_HISTORY_TO_LEARN_FROM]");
    lines.push("Worker goal:");
    lines.push(`- Target worker role: ${this.clean(input.targetContext.targetAgentDefinition.description || input.targetContext.agentName)}`);
    if (input.projection.summary) {
      lines.push(`- Work summary: ${this.clean(input.projection.summary)}`);
    }
    lines.push(`- Configured skill packages available to the worker: ${input.skillTargets.map((target) => target.skillName).join(", ") || "none"}`);

    lines.push("");
    lines.push("Important interaction history:");
    for (const entry of input.projection.conversation.slice(-MAX_CONVERSATION_ITEMS)) {
      const line = this.renderConversationEntry(entry);
      if (line) {
        lines.push(`- ${line}`);
      }
    }

    lines.push("");
    lines.push("Tool and validation outcomes:");
    for (const activity of input.projection.activities.slice(-MAX_ACTIVITY_ITEMS)) {
      const line = this.renderActivity(activity);
      if (line) {
        lines.push(`- ${line}`);
      }
    }

    lines.push("");
    lines.push("Feedback and improvement signals:");
    if (feedbackSignals.length === 0) {
      lines.push("- No explicit correction signal was detected; look for reusable process improvements only if the work history supports them.");
    } else {
      for (const signal of feedbackSignals) {
        lines.push(`- ${signal}`);
      }
    }

    return {
      anonymizedWorkHistory: lines.join("\n"),
      feedbackSignals,
      privacyWarnings: [
        "Do not copy secrets, credentials, private messages, proprietary details, one-off file paths, or transient user specifics into durable skills.",
        "Use the work history as anonymized experience evidence, not as raw memory to preserve verbatim.",
      ],
    };
  }

  private renderConversationEntry(entry: RunProjectionConversationEntry): string | null {
    const content = this.clean(entry.content ?? entry.toolError ?? "");
    if (!content) {
      return null;
    }
    const role = entry.role === "user"
      ? "User"
      : entry.role === "assistant"
        ? "Worker"
        : entry.toolName
          ? `Tool ${entry.toolName}`
          : "Work note";
    return `${role}: ${content}`;
  }

  private renderActivity(activity: RunProjectionActivityEntry): string | null {
    if (activity.kind !== "tool") {
      return null;
    }
    const digest = this.clean(activity.contextText || activity.error || "");
    return `Tool ${activity.toolName} ${activity.status}${digest ? `: ${digest}` : ""}`;
  }

  private extractFeedbackSignals(projection: RunProjection): string[] {
    const signals: string[] = [];
    for (const entry of projection.conversation) {
      const content = entry.content ?? entry.toolError ?? "";
      const signalKind = this.classifyFeedbackSignal(content);
      if (!signalKind) {
        continue;
      }
      const cleaned = this.clean(content);
      if (!cleaned) {
        continue;
      }
      signals.push(this.renderFeedbackSignal(signalKind, cleaned));
    }
    return signals.slice(-MAX_SIGNAL_ITEMS);
  }

  private classifyFeedbackSignal(content: string): FeedbackSignalKind | null {
    if (this.isExplicitDurableSkillUpdate(content)) {
      return "durable_skill_update";
    }
    if (/\b(wrong|failed|error|fix|correction|incorrect|regression|should have|missed|missing)\b/i.test(content)) {
      return "correction";
    }
    return null;
  }

  private isExplicitDurableSkillUpdate(content: string): boolean {
    if ([
      /\bdurable[_\s-]*skill[_\s-]*update\s*:/i,
      /\bskill[_\s-]*update\s*:/i,
    ].some((pattern) => pattern.test(content))) {
      return true;
    }

    const hasForwardLookingContext = [
      /\b(?:future|next|subsequent)\s+(?:answers?|responses?|runs?)\b/i,
      /\b(?:from now on|going forward|in future)\b/i,
    ].some((pattern) => pattern.test(content));

    const hasDurableUpdateContext = [
      /\b(?:durable[_\s-]*skill|skill|durable)\s+(?:update|updated|updates|correction|corrections|corrected|change|changes|changed)\b/i,
      /\b(?:update|correct|change|revise)\s+(?:the\s+)?(?:durable\s+)?skill\b/i,
      /\b(?:update|correct|change|revise)\s+(?:the\s+)?durable\b/i,
    ].some((pattern) => pattern.test(content));

    const hasConcreteBehaviorDirective = [
      /\b(?:answer|respond)\s+(?:with|exactly)\b/i,
      /\b(?:must|should|always)\s+(?:answer|respond|use|say|be|return|include)\b/i,
      /\b(?:is|are)\s+now\b/i,
    ].some((pattern) => pattern.test(content));

    return hasConcreteBehaviorDirective && (hasForwardLookingContext || hasDurableUpdateContext);
  }

  private renderFeedbackSignal(kind: FeedbackSignalKind, cleaned: string): string {
    if (kind === "durable_skill_update") {
      return `Explicit durable skill update requested: ${cleaned}`;
    }
    return cleaned;
  }

  private clean(value: string): string {
    return value
      .replace(/\b(Authorization\s*[:=]\s*)(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]+/gi, "$1$2 <redacted-token>")
      .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer <redacted-token>")
      .replace(/\b([A-Z0-9_]*(?:API[_-]?KEY|TOKEN|PASSWORD|SECRET)[A-Z0-9_]*\b["']?\s*[:=]\s*)(["']?)[^\s'",;}]+\2?/gi, "$1<redacted-secret>")
      .replace(/\b((?:api[_-]?key|access[_-]?token|auth[_-]?token|password|secret)\b["']?\s*[:=]\s*)(["']?)[^\s'",;}]+\2?/gi, "$1<redacted-secret>")
      .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|sk-ant-[A-Za-z0-9_-]{12,}|AIza[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]{16,}|xox[baprs]-[A-Za-z0-9-]{16,})\b/g, "<redacted-secret>")
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "<redacted-email>")
      .replace(/\/(?:Users|home|private\/tmp|tmp)\/[^\s'"`]+/g, "<redacted-path>")
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "<redacted-id>")
      .replace(/\b(?:turn|trace|tool[_-]?call|invocation|provider[_-]?event|source[_-]?run|target[_-]?run|team[_-]?run|member[_-]?run|run)[_-]?[A-Za-z0-9-]{6,}\b/gi, "<redacted-id>")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_TEXT_LENGTH);
  }
}
