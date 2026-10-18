// Seeds an isolated instance's memory dir for the remove-nested-task-team DS-002 real-app check:
// two readable standalone collaboration trees (host-a/child-a, host-c/child-c) written by the
// worktree build's own store, and one unreadable tree (host-b, truncated JSON).
// Usage: node seed-standalone-trees.mjs <worktree server dist dir> <memory dir>
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [distDir, memoryDir] = process.argv.slice(2);
if (!distDir || !memoryDir) throw new Error("usage: seed-standalone-trees.mjs <server dist dir> <memory dir>");
const load = (relative) => import(pathToFileURL(path.join(distDir, relative)).href);
const { StandaloneRootPackageStore } = await load("standalone-agent-run-root/persistence/standalone-root-package-store.js");
const { getStandaloneRootDirPath, getStandaloneRootTreePath } = await load("standalone-agent-run-root/persistence/standalone-root-tree-path.js");

const launch = { runtimeKind: "autobyteus", llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath: null };
const treeOf = (hostRunId, childRunId) => ({
  subjectKind: "agent",
  createdAt: "2026-10-17T00:00:00.000Z",
  host: { address: "/host", agentRunId: hostRunId, agentDefinitionId: "host-definition" },
  taskExecutions: [{
    address: "/reviewer", agentRunId: childRunId, platformAgentRunId: null, delegatorAgentRunId: hostRunId,
    startedAt: "2026-10-17T00:01:00.000Z", source: { kind: "agent", agentDefinitionId: "reviewer", launchConfiguration: launch },
  }],
});

const store = new StandaloneRootPackageStore();
for (const [host, child] of [["rnt-host-a", "rnt-child-a"], ["rnt-host-c", "rnt-child-c"]]) {
  const result = await store.writeTree(getStandaloneRootDirPath(memoryDir, host), treeOf(host, child));
  if (result.outcome !== "committed") throw new Error(`write ${host}: ${JSON.stringify(result)}`);
}
const brokenDir = getStandaloneRootDirPath(memoryDir, "rnt-host-b");
await fs.mkdir(brokenDir, { recursive: true });
await fs.writeFile(getStandaloneRootTreePath(brokenDir), JSON.stringify(treeOf("rnt-host-b", "rnt-child-b")).slice(0, 80));
console.log(JSON.stringify({ seeded: ["rnt-host-a", "rnt-host-b (truncated)", "rnt-host-c"], memoryDir }));
