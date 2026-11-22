import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LocalMemoryExportScanner } from "../../../src/memory-sync/source/local-memory-export-scanner.js";

/**
 * autobyteus-587 AC-011 (DEC-007): files an agent received from another node are copies of that node's files, not the
 * run's memory: Memory Sync never exports an agent folder's `received_files/`. The run's message log, which names them,
 * still syncs.
 */
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });

describe("LocalMemoryExportScanner: received files", () => {
  it("leaves out every agent's received_files folder, a standalone run's and a Team member's, and keeps the rest", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-scan-"));
    roots.push(memoryDir);
    const write = async (relative: string) => {
      const file = path.join(memoryDir, relative);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, "x");
    };
    await write("agents/pm_1/communication_messages_active.jsonl");
    await write("agents/pm_1/received_files/publisher_r1/cut.mp4");
    await write("agent_teams/team_1/lead_1/raw_traces.jsonl");
    await write("agent_teams/team_1/lead_1/received_files/assistant_a1/brief.pdf");
    const { files } = await new LocalMemoryExportScanner({ getMemoryDir: () => memoryDir }).scan();
    expect(files.map((file) => `${file.kind}/${file.relativePath}`)).toEqual([
      "agent_teams/team_1/lead_1/raw_traces.jsonl",
      "agents/pm_1/communication_messages_active.jsonl",
    ]);
  });
});
