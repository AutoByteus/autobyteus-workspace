import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import { getAgentOrgRunExecutionTreePath } from "../../../src/run-history/store/agent-org-run-execution-tree-path.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { getTeamRunExecutionTreePath } from "../../../src/run-history/store/team-run-execution-tree-path.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

/**
 * Run history written before the run-level skill access mode was removed still carries
 * `skillAccessMode`. It must load (the value is ignored) and must not be written again.
 */
type Json = Record<string, unknown>;
const STORED_MODES = ["PRELOADED_ONLY", "NONE"] as const;
const LAUNCH_KEYS = ["autoExecuteTools", "llmConfig", "llmModelIdentifier", "runtimeKind", "workspaceRootPath"];
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Adds the stored legacy key to every launch configuration in a tree, as old writers did. */
const withStoredMode = <T>(tree: T, mode: string): T => {
  const copy = clone(tree);
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    for (const [key, child] of Object.entries(value)) {
      if (key === "launchConfiguration" || key === "defaultLaunchConfiguration") (child as Json).skillAccessMode = mode;
      else visit(child);
    }
  };
  visit(copy);
  return copy;
};

const launchConfigurationsOf = (tree: unknown): Json[] => {
  const found: Json[] = [];
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    for (const [key, child] of Object.entries(value)) {
      if (key === "launchConfiguration" || key === "defaultLaunchConfiguration") found.push(child as Json);
      else visit(child);
    }
  };
  visit(tree);
  return found;
};

const teamTree = () => testExecutionTree({
  rootTeamRunId: "team-run",
  rootTeamDefinitionId: "team-definition",
  coordinatorAddress: "/coordinator",
  children: [
    testAgentNode("/coordinator", { agentRunId: "coordinator-run" }),
    testAgentNode("/reviewer", { agentRunId: "reviewer-run" }),
  ],
});

const orgTree = () => testAgentOrgExecutionTree({
  orgRunId: "org-run",
  members: [
    testOrgAgentNode("/director", "director-run"),
    testOrgTeamNode({
      address: "/team",
      teamRunId: "team-run",
      coordinatorAddress: "/team/lead",
      members: [testOrgAgentNode("/team/lead", "team-lead-run")],
    }),
  ],
});

describe("run history stored with the removed skillAccessMode field", () => {
  let memoryDir: string;
  beforeEach(async () => { memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "removed-skill-access-mode-")); });
  afterEach(async () => { await fs.rm(memoryDir, { recursive: true, force: true }); });

  it.each(STORED_MODES)("loads agent run metadata stored with %s and drops the value on the next save", async (mode) => {
    const store = new AgentRunMetadataStore(memoryDir);
    const stored = {
      runId: "run-1",
      agentDefinitionId: "agent-definition",
      workspaceRootPath: "/tmp/workspace",
      memoryDir: path.join(memoryDir, "agents", "run-1"),
      llmModelIdentifier: "model-1",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: mode,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: "thread-1",
      preparedAt: "2026-05-01T09:00:00.000Z",
      preparedExpiresAt: "2026-05-02T09:00:00.000Z",
      startedAt: "2026-05-01T09:05:00.000Z",
      applicationExecutionContext: null,
    };
    await fs.mkdir(path.dirname(store.getMetadataPath("run-1")), { recursive: true });
    await fs.writeFile(store.getMetadataPath("run-1"), JSON.stringify(stored), "utf-8");

    const metadata = await store.readMetadata("run-1");

    expect(metadata).toMatchObject({ runId: "run-1", llmModelIdentifier: "model-1", runtimeKind: RuntimeKind.CODEX_APP_SERVER });
    expect(metadata).not.toHaveProperty("skillAccessMode");

    await store.writeMetadata("run-1", metadata!);
    const rewritten = JSON.parse(await fs.readFile(store.getMetadataPath("run-1"), "utf-8")) as Json;
    expect(rewritten).not.toHaveProperty("skillAccessMode");
    expect(Object.keys(rewritten).sort()).toEqual(Object.keys(stored).filter((key) => key !== "skillAccessMode").sort());
  });

  it.each(STORED_MODES)("loads a team execution tree stored with %s and writes launch configurations without it", async (mode) => {
    const teamMemoryDir = path.join(memoryDir, "team");
    await fs.mkdir(teamMemoryDir, { recursive: true });
    await fs.writeFile(getTeamRunExecutionTreePath(teamMemoryDir), JSON.stringify(withStoredMode(teamTree(), mode)), "utf-8");
    const store = new TeamRunExecutionTreeStore();

    const tree = await store.read(teamMemoryDir, "team-run");

    expect(tree).toEqual(validateTeamRunExecutionTreePayload(teamTree(), "team-run"));
    expect(launchConfigurationsOf(tree)).toHaveLength(3);

    await store.write(teamMemoryDir, tree!);
    const rewritten = JSON.parse(await fs.readFile(getTeamRunExecutionTreePath(teamMemoryDir), "utf-8")) as Json;
    expect(launchConfigurationsOf(rewritten).map((launch) => Object.keys(launch).sort())).toEqual([LAUNCH_KEYS, LAUNCH_KEYS, LAUNCH_KEYS]);
  });

  it.each(STORED_MODES)("loads an agent-org execution tree stored with %s and writes launch configurations without it", async (mode) => {
    const orgMemoryDir = path.join(memoryDir, "org");
    await fs.mkdir(orgMemoryDir, { recursive: true });
    await fs.writeFile(getAgentOrgRunExecutionTreePath(orgMemoryDir), JSON.stringify(withStoredMode(orgTree(), mode)), "utf-8");
    const store = new AgentOrgRunExecutionTreeStore();

    const tree = await store.read(orgMemoryDir, "org-run");

    expect(tree).toEqual(validateAgentOrgRunExecutionTreePayload(orgTree(), "org-run"));
    expect(launchConfigurationsOf(tree)).toHaveLength(4);

    await store.write(orgMemoryDir, tree!);
    const rewritten = JSON.parse(await fs.readFile(getAgentOrgRunExecutionTreePath(orgMemoryDir), "utf-8")) as Json;
    expect(launchConfigurationsOf(rewritten).map((launch) => Object.keys(launch).sort())).toEqual([LAUNCH_KEYS, LAUNCH_KEYS, LAUNCH_KEYS, LAUNCH_KEYS]);
  });

  it("writes new records of every kind without the field", async () => {
    const teamMemoryDir = path.join(memoryDir, "new-team");
    const orgMemoryDir = path.join(memoryDir, "new-org");
    await fs.mkdir(teamMemoryDir, { recursive: true });
    await fs.mkdir(orgMemoryDir, { recursive: true });

    await new TeamRunExecutionTreeStore().write(teamMemoryDir, validateTeamRunExecutionTreePayload(teamTree(), "team-run"));
    await new AgentOrgRunExecutionTreeStore().write(orgMemoryDir, validateAgentOrgRunExecutionTreePayload(orgTree(), "org-run"));

    for (const filePath of [getTeamRunExecutionTreePath(teamMemoryDir), getAgentOrgRunExecutionTreePath(orgMemoryDir)]) {
      expect(await fs.readFile(filePath, "utf-8")).not.toContain("skillAccessMode");
    }
  });
});
