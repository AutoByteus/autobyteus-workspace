import fs from "node:fs";
import path from "node:path";

export type AgyRunCapsule = Readonly<{
  /** The capsule folder (`…/<runId>/agy-project`), a scripted AGY process's cwd. */
  path: string;
  /** The workspace folder its manifest names, resolved when it exists. */
  workspacePath: string;
}>;

/** The manifest, or null while the capsule is not complete: the server writes the folder first and `manifest.json` last. */
const readManifest = (capsule: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(fs.readFileSync(path.join(capsule, "manifest.json"), "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/**
 * The AGY run capsule of `runId` under a server's memory folder, or null until it is complete. Callers wait for it
 * (`until`); a capsule still being written is skipped, not read.
 */
export const findAgyRunCapsule = (memoryDir: string, runId: string): AgyRunCapsule | null => {
  const walk = (dir: string): AgyRunCapsule | null => {
    for (const entry of fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (entry.name !== "agy-project") {
        const found = walk(full);
        if (found) return found;
        continue;
      }
      const manifest = readManifest(full);
      if (manifest?.runId !== runId) continue;
      const workspacePath = String(manifest.workspacePath);
      return { path: full, workspacePath: fs.existsSync(workspacePath) ? fs.realpathSync(workspacePath) : workspacePath };
    }
    return null;
  };
  return walk(memoryDir);
};
