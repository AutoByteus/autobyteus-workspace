import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LocalMemoryExportScanner } from "../../../src/memory-sync/source/local-memory-export-scanner.js";

/** org-teams-follow-definition, design R-5: an Org container's unit runs are not synced (as an Org's memory was not; FU-001). */
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

const write = async (file: string, content: string) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, content); };

describe("LocalMemoryExportScanner: Org container units", () => {
  it("skips agent and Team runs whose own file names an Org container; syncs every other run as before", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-sync-units-"));
    dirs.push(memoryDir);
    const containedIn = { orgRunId: "sdd_org_1", address: "/concierge" };
    await write(path.join(memoryDir, "agents", "concierge_1", "run_metadata.json"), JSON.stringify({ runId: "concierge_1", containedIn }));
    await write(path.join(memoryDir, "agents", "concierge_1", "raw_traces.jsonl"), "{}\n");
    await write(path.join(memoryDir, "agents", "solo_1", "run_metadata.json"), JSON.stringify({ runId: "solo_1" }));
    await write(path.join(memoryDir, "agents", "solo_1", "raw_traces.jsonl"), "{}\n");
    await write(path.join(memoryDir, "agent_teams", "set_team_1", "team_run_execution_tree.json"), JSON.stringify({ containedIn: { orgRunId: "sdd_org_1", address: "/set" } }));
    await write(path.join(memoryDir, "agent_teams", "set_team_1", "lead_1", "raw_traces.jsonl"), "{}\n");
    await write(path.join(memoryDir, "agent_teams", "team_1", "team_run_execution_tree.json"), JSON.stringify({ rootTeam: {} }));
    const { files } = await new LocalMemoryExportScanner({ getMemoryDir: () => memoryDir }).scan();
    const paths = files.map((file) => `${file.kind}/${file.relativePath}`);
    expect(paths.some((entry) => entry.includes("concierge_1") || entry.includes("set_team_1"))).toBe(false);
    expect(paths).toEqual(expect.arrayContaining(["agents/solo_1/raw_traces.jsonl", "agent_teams/team_1/team_run_execution_tree.json"]));
  });
});
