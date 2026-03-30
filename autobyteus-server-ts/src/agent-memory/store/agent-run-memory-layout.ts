import fs from "node:fs/promises";
import path from "node:path";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

export class AgentRunMemoryLayout {
  private readonly runsRootDir: string;

  constructor(memoryDir: string) {
    this.runsRootDir = path.join(memoryDir, "agents");
  }

  getRunsRootDirPath(): string {
    return this.runsRootDir;
  }

  getRunDirPath(runId: string): string {
    const normalizedRunId = normalizeRequiredString(runId, "runId");
    const candidate = path.resolve(this.runsRootDir, normalizedRunId);
    const root = path.resolve(this.runsRootDir);
    if (!candidate.startsWith(`${root}${path.sep}`)) {
      throw new Error("Invalid run directory path.");
    }
    return candidate;
  }

  async ensureRunSubtree(runId: string): Promise<void> {
    await fs.mkdir(this.getRunDirPath(runId), { recursive: true });
  }
}
