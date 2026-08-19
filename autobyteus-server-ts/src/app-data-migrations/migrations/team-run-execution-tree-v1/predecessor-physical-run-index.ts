import fs from "node:fs/promises";
import path from "node:path";

const ignored = new Set([
  "raw_traces", "working_context", "working_context_snapshots", "external_context",
  "artifacts", "logs", "skills", "memory", "turns",
]);

/** Migration-only physical evidence: a run ID must occur at one directory path. */
export class PredecessorPhysicalRunIndex {
  private readonly relativeByRunId = new Map<string, readonly string[]>();

  static async build(rootDir: string, runIds: ReadonlySet<string>): Promise<PredecessorPhysicalRunIndex> {
    const index = new PredecessorPhysicalRunIndex();
    await index.visit(path.resolve(rootDir), [], runIds);
    return index;
  }

  getRelativeSegments(runId: string): readonly string[] | null {
    return this.relativeByRunId.get(runId.trim()) ?? null;
  }

  private async visit(current: string, relative: readonly string[], runIds: ReadonlySet<string>): Promise<void> {
    let entries: import("node:fs").Dirent[];
    try { entries = await fs.readdir(current, { withFileTypes: true }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || ignored.has(entry.name) || entry.name.startsWith(".")) continue;
      const nextRelative = [...relative, entry.name];
      if (runIds.has(entry.name)) {
        const existing = this.relativeByRunId.get(entry.name);
        if (existing && JSON.stringify(existing) !== JSON.stringify(nextRelative)) {
          throw new Error(`Physical AgentRun '${entry.name}' appears in more than one TeamRun path.`);
        }
        this.relativeByRunId.set(entry.name, Object.freeze(nextRelative));
        continue;
      }
      await this.visit(path.join(current, entry.name), nextRelative, runIds);
    }
  }
}
