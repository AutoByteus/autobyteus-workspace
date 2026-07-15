import fs from "node:fs/promises";
import path from "node:path";
import type { SkillImprovementTargetContext } from "../skill-improvement-target-context-resolver.js";
import type { SkillImprovementImproverSessionState } from "../../domain/improver-session.js";

const STATE_FILE_NAME = "improver_session.json";

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
      const parsed = JSON.parse(raw) as SkillImprovementImproverSessionState;
      return parsed && parsed.schemaVersion === 1 ? parsed : null;
    } catch (error) {
      if (String(error).includes("ENOENT")) {
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
