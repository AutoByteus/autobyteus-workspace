import fs from "node:fs/promises";
import path from "node:path";
import type { SkillImprovementTargetContext } from "../skill-improvement-target-context-resolver.js";
import type {
  SkillImprovementImproverSessionState,
  SkillImprovementImproverSessionStateStatus,
} from "../../domain/improver-session.js";
import type { SkillImprovementTargetRef } from "../../domain/models.js";

const STATE_FILE_NAME = "improver_session.json";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const textOrNull = (value: unknown): string | null => typeof value === "string" ? value : null;
const STATUSES: ReadonlySet<string> = new Set<SkillImprovementImproverSessionStateStatus>(["active", "replaced", "unavailable"]);

const readTarget = (value: unknown): SkillImprovementTargetRef | null => {
  const target = asRecord(value);
  if (target?.kind === "agent_run" && typeof target.runId === "string") return { kind: "agent_run", runId: target.runId };
  if (target?.kind === "team_member_run" && typeof target.teamRunId === "string" && typeof target.agentRunId === "string") {
    return { kind: "team_member_run", teamRunId: target.teamRunId, agentRunId: target.agentRunId };
  }
  return null;
};

const readLastRequest = (value: unknown): SkillImprovementImproverSessionState["lastRequest"] => {
  const request = asRecord(value);
  if (!request || typeof request.improvementRunId !== "string" || typeof request.requestedAt !== "string") return null;
  return {
    improvementRunId: request.improvementRunId,
    requestedAt: request.requestedAt,
    postedAt: textOrNull(request.postedAt),
    workJournalEvidenceHash: textOrNull(request.workJournalEvidenceHash),
  };
};

/**
 * Projection of the known fields (guideline §3). A file without a readable target or status is
 * absent; fields this version does not know (from older versions) are dropped and disappear
 * on the next save.
 */
const readSessionState = (value: unknown): SkillImprovementImproverSessionState | null => {
  const state = asRecord(value);
  const target = readTarget(state?.target);
  if (!state || !target || typeof state.status !== "string" || !STATUSES.has(state.status)) return null;
  const journal = asRecord(state.workJournal);
  return {
    target,
    status: state.status as SkillImprovementImproverSessionStateStatus,
    currentImproverRunId: textOrNull(state.currentImproverRunId),
    priorImproverRunIds: Array.isArray(state.priorImproverRunIds)
      ? state.priorImproverRunIds.filter((runId): runId is string => typeof runId === "string")
      : [],
    improverAgentDefinitionId: textOrNull(state.improverAgentDefinitionId),
    runtimeKind: textOrNull(state.runtimeKind),
    llmModelIdentifier: textOrNull(state.llmModelIdentifier),
    workspaceRootPath: textOrNull(state.workspaceRootPath),
    memoryRootPath: textOrNull(state.memoryRootPath),
    workJournal: {
      rootPath: textOrNull(journal?.rootPath),
      manifestPath: textOrNull(journal?.manifestPath),
      lastEvidenceHash: textOrNull(journal?.lastEvidenceHash),
    },
    lastRequest: readLastRequest(state.lastRequest),
    updatedAt: textOrNull(state.updatedAt) ?? "",
  };
};

const atomicWriteJson = async (filePath: string, payload: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  await fs.rename(tmpPath, filePath);
};

export class SkillImprovementImproverSessionStore {
  getTargetRootPath(context: SkillImprovementTargetContext): string {
    return path.join(context.memoryDir, "skill_improvement");
  }

  getImproverSessionPath(context: SkillImprovementTargetContext): string {
    return path.join(this.getTargetRootPath(context), STATE_FILE_NAME);
  }

  getStatePath(context: SkillImprovementTargetContext): string {
    return this.getImproverSessionPath(context);
  }

  async load(context: SkillImprovementTargetContext): Promise<SkillImprovementImproverSessionState | null> {
    try {
      const raw = await fs.readFile(this.getStatePath(context), "utf-8");
      return readSessionState(JSON.parse(raw));
    } catch (error) {
      if (String(error).includes("ENOENT") || error instanceof SyntaxError) {
        return null;
      }
      throw error;
    }
  }

  async write(context: SkillImprovementTargetContext, state: SkillImprovementImproverSessionState): Promise<SkillImprovementImproverSessionState> {
    const next = { ...state, updatedAt: new Date().toISOString() };
    await atomicWriteJson(this.getStatePath(context), next);
    return next;
  }
}
