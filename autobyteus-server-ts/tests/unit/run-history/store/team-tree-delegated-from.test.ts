import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { emptyStandaloneRootTree } from "../../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { resetRootRunPackageReadinessIndex } from "../../../../src/run-history/services/root-run-package-readiness-index.js";
import { STANDALONE_ROOT_TREE_SHAPE, TEAM_RUN_TREE_SHAPE } from "../../../../src/run-history/store/coordinating-tree-shapes.js";
import { agentRunIdsOfTree } from "../../../../src/run-history/store/task-execution-tree-split.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

/**
 * autobyteus-247 design § On-Disk Data Model: a Team run a peer started carries `delegatedFrom` on its tree (tolerant
 * read: absent means not peer-started; exact write), and `agentRunIdsOfTree` is the one message-endpoint rule: it adds
 * every member of a remote Team link, and the delegator of a back-link (stored on a Team tree; given for a standalone
 * run, whose back-link is in `run_metadata.json`).
 */

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => { resetRootRunPackageReadinessIndex(root); return fs.rm(root, { recursive: true, force: true }); }));
});
const T0 = "2026-10-21T10:00:00.000Z";
const delegatedFrom = { nodeId: "srv_node_a", coordinatingRun: { kind: "agent_team" as const, runId: "team_a" }, delegatorAgentRunId: "lead_a" };
const base = () => testExecutionTree({ rootTeamRunId: "team-b", coordinatorAddress: "/lead",
  children: [testAgentNode("/lead", { agentRunId: "lead-b" }), testAgentNode("/writer", { agentRunId: "writer-b" })] });
const teamDir = async () => {
  const memory = await fs.mkdtemp(path.join(os.tmpdir(), "team-delegated-from-"));
  roots.push(memory);
  return new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: "team-b", ancestorTeamRunIds: [] });
};

describe("delegatedFrom on a Team run tree", () => {
  it("is written with its exact keys when present and read back; absent stays absent", async () => {
    const store = new TeamRunExecutionTreeStore();
    const dir = await teamDir();
    const tree = validateTeamRunExecutionTreePayload({ ...base(), delegatedFrom }, "team-b");
    expect((await store.write(dir, tree)).outcome).toBe("committed");
    const raw = JSON.parse(await fs.readFile(path.join(dir, "team_run_execution_tree.json"), "utf8"));
    expect(raw.delegatedFrom).toEqual(delegatedFrom);
    expect(Object.keys(raw.delegatedFrom)).toEqual(["nodeId", "coordinatingRun", "delegatorAgentRunId"]);
    expect((await store.read(dir, "team-b"))?.delegatedFrom).toEqual(delegatedFrom);

    const plain = validateTeamRunExecutionTreePayload(base(), "team-b");
    expect("delegatedFrom" in plain).toBe(false);
    await store.write(dir, plain);
    expect("delegatedFrom" in JSON.parse(await fs.readFile(path.join(dir, "team_run_execution_tree.json"), "utf8"))).toBe(false);
  });

  it("refuses a malformed section (the tree is unreadable, as a malformed run_metadata.json is)", () => {
    expect(() => validateTeamRunExecutionTreePayload({ ...base(), delegatedFrom: { nodeId: "srv_node_a" } }, "team-b")).toThrow(/coordinatingRun/);
  });
});

describe("agentRunIdsOfTree: the one message-endpoint rule", () => {
  it("adds every member of a remote Team link, and the delegator of the Team tree's own back-link", () => {
    const linked = validateTeamRunExecutionTreePayload({ ...base(), delegatedFrom, rootTeam: { ...base().rootTeam, remoteTaskExecutions: [{
      kind: "agent_team", address: "/studio_team", teamRunId: "studio-c", nodeId: "srv_node_c", coordinatorAddress: "/studio_team/lead",
      members: [{ address: "/studio_team/lead", agentRunId: "studio-lead" }, { address: "/studio_team/writer", agentRunId: "studio-writer" }],
      delegatorAgentRunId: "lead-b", startedAt: T0,
    }] } }, "team-b");
    expect([...agentRunIdsOfTree(TEAM_RUN_TREE_SHAPE, linked)].sort()).toEqual(["lead-b", "lead_a", "studio-lead", "studio-writer", "writer-b"]);
    expect(agentRunIdsOfTree(TEAM_RUN_TREE_SHAPE, validateTeamRunExecutionTreePayload(base(), "team-b")).has("lead_a")).toBe(false);
  });

  it("takes a standalone run's back-link as given (it is stored in run_metadata.json, not in the tree)", () => {
    const tree = emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: "host", agentDefinitionId: "assistant" }, createdAt: T0 });
    expect([...agentRunIdsOfTree(STANDALONE_ROOT_TREE_SHAPE, tree)]).toEqual(["host"]);
    expect([...agentRunIdsOfTree(STANDALONE_ROOT_TREE_SHAPE, tree, { ...delegatedFrom, coordinatingRun: { kind: "agent", runId: "lead_a" } })].sort()).toEqual(["host", "lead_a"]);
  });
});
