import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RemoveSkillImprovementDataMigration } from "../../../src/app-data-migrations/migrations/remove-skill-improvement-data-migration.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

/**
 * IR-005 (integration with autobyteus-205): the Skill Improvement data removal reads `run_metadata.json` to find
 * helper runs and never rewrites it. A run a peer node delegated to this node (`delegatedFrom`) is not a helper
 * run, so it, its metadata and its history row stay exactly as they were, and the current store still reads
 * its back-link.
 */

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });

const RUN = "publisher_7f3a9c";
const delegatedFrom = Object.freeze({ nodeId: "srv_node_a", coordinatingRun: Object.freeze({ kind: "agent_team" as const, runId: "team_a" }), delegatorAgentRunId: "lead_run" });
const metadata = (memoryDir: string): AgentRunMetadata => ({
  runId: RUN, agentDefinitionId: "publisher", workspaceRootPath: "/workspace", memoryDir,
  llmModelIdentifier: "model-1", llmConfig: null, autoExecuteTools: false, runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: null, preparedAt: "2026-10-20T10:00:00.000Z", preparedExpiresAt: "2026-10-21T10:00:00.000Z",
  startedAt: "2026-10-20T10:00:05.000Z", applicationExecutionContext: null, delegatedFrom,
});

describe("a run started by a peer node across the Skill Improvement data removal", () => {
  it("keeps the run, its run_metadata.json byte for byte, its history row and its delegatedFrom", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "delegated-run-migration-"));
    roots.push(root);
    const memory = path.join(root, "memory");
    const agents = path.join(root, "agents");
    const runDir = path.join(memory, "agents", RUN);
    await fs.mkdir(runDir, { recursive: true });
    await fs.mkdir(agents, { recursive: true });
    const store = new AgentRunMetadataStore(memory);
    await store.writeMetadata(RUN, metadata(runDir));
    const metadataPath = store.getMetadataPath(RUN);
    const metadataText = await fs.readFile(metadataPath, "utf8");
    expect(JSON.parse(metadataText).delegatedFrom).toEqual(delegatedFrom);
    const indexPath = path.join(memory, "run_history_index.json");
    const indexText = `${JSON.stringify([{ runId: RUN, agentDefinitionId: "publisher", agentName: "Publisher" }], null, 2)}\n`;
    await fs.writeFile(indexPath, indexText);

    await new RemoveSkillImprovementDataMigration(memory, agents).execute();

    expect(await fs.readFile(metadataPath, "utf8")).toBe(metadataText);
    expect(await fs.readFile(indexPath, "utf8")).toBe(indexText);
    expect((await store.readMetadata(RUN))?.delegatedFrom).toEqual(delegatedFrom);
  });
});
