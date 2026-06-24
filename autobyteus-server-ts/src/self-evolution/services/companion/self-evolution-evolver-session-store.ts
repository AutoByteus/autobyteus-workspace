import fs from "node:fs/promises";
import path from "node:path";
import type { SelfEvolutionTargetContext } from "../self-evolution-target-context-resolver.js";
import type { SelfEvolutionEvolverSessionState } from "../../domain/evolver-session.js";

const STATE_FILE_NAME = "evolver_session.json";

const atomicWriteJson = async (filePath: string, payload: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  await fs.rename(tmpPath, filePath);
};

export class SelfEvolutionEvolverSessionStore {
  getTargetRootPath(context: SelfEvolutionTargetContext): string {
    return path.join(context.memoryDir, "self_evolution");
  }

  getEvolverSessionPath(context: SelfEvolutionTargetContext): string {
    return path.join(this.getTargetRootPath(context), STATE_FILE_NAME);
  }

  getStatePath(context: SelfEvolutionTargetContext): string {
    return this.getEvolverSessionPath(context);
  }

  async load(context: SelfEvolutionTargetContext): Promise<SelfEvolutionEvolverSessionState | null> {
    try {
      const raw = await fs.readFile(this.getStatePath(context), "utf-8");
      const parsed = JSON.parse(raw) as SelfEvolutionEvolverSessionState;
      return parsed && parsed.schemaVersion === 1 ? parsed : null;
    } catch (error) {
      if (String(error).includes("ENOENT")) {
        return null;
      }
      throw error;
    }
  }

  async write(context: SelfEvolutionTargetContext, state: SelfEvolutionEvolverSessionState): Promise<SelfEvolutionEvolverSessionState> {
    const next = { ...state, updatedAt: new Date().toISOString() };
    await atomicWriteJson(this.getStatePath(context), next);
    return next;
  }
}
