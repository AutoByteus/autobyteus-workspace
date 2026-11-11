import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { emptyStandaloneRootTree, type StandaloneRootTreeFile } from "../../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { StandaloneRootPackageStore } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { validateStandaloneRootTreePayload } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-tree-schema.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { buildTeamRunConfigFromExecutionTree } from "../../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { effectiveCopyAgentLaunch } from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { resetRootRunPackageReadinessIndex } from "../../../../src/run-history/services/root-run-package-readiness-index.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";
import { testOrgLaunchConfiguration } from "../../../fixtures/current-agent-org-run-fixtures.js";

/**
 * autobyteus-348 (contract §1, §2, §6; D-2): the pending switch and a copy's chosen runtime are stored on the records that hold a
 * member's binding and read back exactly; records written before them read as before.
 */
const T0 = "2026-11-01T09:00:00.000Z";
const HOST = "host-run";
const launch = testOrgLaunchConfiguration("/workspace");
const pending = {
  switchId: "7c1e5a52-3c1e-4c8a-9d0b-1f2a3b4c5d6e",
  from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: { effort: "low" }, platformAgentRunId: "sess-1" },
};
const choice = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null, selectedAt: T0 };

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => { resetRootRunPackageReadinessIndex(root); return fs.rm(root, { recursive: true, force: true }); }));
});
const readJson = async (file: string): Promise<Record<string, any>> => JSON.parse(await fs.readFile(file, "utf8"));

const agentCopy = (extra: Record<string, unknown> = {}) => ({
  address: "/code_reviewer", agentRunId: "reviewer-run", platformAgentRunId: null, delegatorAgentRunId: HOST, startedAt: T0,
  source: { kind: "agent", agentDefinitionId: "code-reviewer", launchConfiguration: launch }, ...extra,
});
const teamCopy = (memberExtra: Record<string, unknown> = {}) => ({
  address: "/product_team", teamRunId: "team-run", delegatorAgentRunId: HOST, startedAt: T0,
  members: [
    { address: "/product_team/lead", agentRunId: "team-run-lead", platformAgentRunId: "provider-lead", ...memberExtra },
    { address: "/product_team/designer", agentRunId: "team-run-designer", platformAgentRunId: null },
  ],
  taskExecutions: [],
  source: { kind: "agent_team", teamDefinitionId: "product-team", coordinatorAddress: "/product_team/lead",
    members: [{ address: "/product_team/lead", agentDefinitionId: "lead", launchConfiguration: launch, followsTeam: true },
      { address: "/product_team/designer", agentDefinitionId: "designer", launchConfiguration: launch, followsTeam: false }],
    handoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["deliver"] }], defaultLaunchConfiguration: launch },
});
const hostTree = (taskExecutions: unknown[]): StandaloneRootTreeFile => validateStandaloneRootTreePayload({
  ...emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: HOST, agentDefinitionId: "assistant" }, createdAt: T0 }),
  taskExecutions,
}, HOST);
const standalone = async () => {
  const memory = await fs.mkdtemp(path.join(os.tmpdir(), "member-pending-switch-"));
  roots.push(memory);
  const layout = new AgentMemoryLayout(memory);
  return { memory, dir: layout.getAgentRunCollaborationDirPath(HOST), store: new StandaloneRootPackageStore() };
};

describe("a delegated Agent copy's choice and pending switch", () => {
  it("are kept in its own file, beside the unchanged started launch, and compose back exactly", async () => {
    const f = await standalone();
    const tree = hostTree([agentCopy({ userLaunchSelection: choice, pendingRuntimeSwitch: pending })]);
    expect((await f.store.writeTree(f.dir, tree)).outcome).toBe("committed");

    const own = await readJson(path.join(f.memory, "agents", "reviewer-run", "run_metadata.json"));
    expect(own.runtimeKind).toBe(launch.runtimeKind); // M-3: the started values never change
    expect(own.taskAgent.userLaunchSelection).toEqual(choice);
    expect(own.taskAgent.pendingRuntimeSwitch).toEqual(pending);
    expect(await f.store.readTree(f.dir, HOST)).toEqual(tree);
  });

  it("a record without them reads and writes as before (no keys added)", async () => {
    const f = await standalone();
    const tree = hostTree([agentCopy()]);
    await f.store.writeTree(f.dir, tree);
    const own = await readJson(path.join(f.memory, "agents", "reviewer-run", "run_metadata.json"));
    expect(Object.hasOwn(own.taskAgent, "pendingRuntimeSwitch")).toBe(false);
    expect(Object.hasOwn(own.taskAgent, "userLaunchSelection")).toBe(false);
    expect(await f.store.readTree(f.dir, HOST)).toEqual(tree);
  });

  it("a malformed pending switch makes that record unreadable instead of being dropped", () => {
    expect(() => hostTree([agentCopy({ pendingRuntimeSwitch: { switchId: "x", from: {} } })])).toThrow();
    expect(() => hostTree([agentCopy({ userLaunchSelection: { ...choice, runtimeKind: "claude" } })])).toThrow(/runtimeKind/);
  });
});

describe("a delegated Team copy's member choice and pending switch", () => {
  it("are kept in the Team copy's own tree and compose back exactly", async () => {
    const f = await standalone();
    const tree = hostTree([teamCopy({ userLaunchSelection: choice, pendingRuntimeSwitch: pending })]);
    expect((await f.store.writeTree(f.dir, tree)).outcome).toBe("committed");
    const ownTeam = await readJson(path.join(f.memory, "agent_teams", "team-run", "team_run_execution_tree.json"));
    const lead = ownTeam.rootTeam.members.find((member: any) => member.agentRunId === "team-run-lead");
    expect(lead.pendingRuntimeSwitch).toEqual(pending);
    expect(lead.userLaunchSelection).toEqual(choice);
    expect(lead.launchConfiguration).toEqual(launch);
    expect(await f.store.readTree(f.dir, HOST)).toEqual(tree);
  });
});

describe("a configured member of a Team or Org run", () => {
  it("keeps the pending switch through the Team tree, and the config built from it", () => {
    const switched = testAgentNode("/reviewer", {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", platformAgentRunId: null, pendingRuntimeSwitch: pending,
    });
    const tree = testExecutionTree({ children: [testAgentNode("/lead"), switched], coordinatorAddress: "/lead" });
    const member = tree.rootTeam.members.find((candidate) => candidate.agentRunId === switched.agentRunId)!;
    expect(member.pendingRuntimeSwitch).toEqual(pending);
    expect(validateTeamRunExecutionTreePayload(JSON.parse(JSON.stringify(tree)), tree.rootTeam.teamRunId)).toEqual(tree);
    const config = buildTeamRunConfigFromExecutionTree(tree);
    expect(config.rootTeam.children.find((child) => child.agentRunId === switched.agentRunId)?.pendingRuntimeSwitch).toEqual(pending);
    expect(config.rootTeam.children.find((child) => child.agentRunId !== switched.agentRunId)?.pendingRuntimeSwitch).toBeUndefined();
  });

  it("is refused when its pending switch is malformed (that run only)", () => {
    const tree = testExecutionTree({ children: [testAgentNode("/lead")], coordinatorAddress: "/lead" });
    const raw = JSON.parse(JSON.stringify(tree));
    raw.rootTeam.members[0].pendingRuntimeSwitch = { switchId: "x" };
    expect(() => validateTeamRunExecutionTreePayload(raw, tree.rootTeam.teamRunId)).toThrow();
  });
});

describe("the copy launch rule with a chosen runtime", () => {
  it("yields the chosen runtime, and the started one when the choice carries none", () => {
    expect(effectiveCopyAgentLaunch({ started: launch, agentSelection: choice }).launch)
      .toEqual({ ...launch, runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null });
    const { runtimeKind: _omitted, ...withoutRuntime } = choice;
    expect(effectiveCopyAgentLaunch({ started: launch, agentSelection: withoutRuntime }).launch.runtimeKind).toBe(launch.runtimeKind);
    expect(effectiveCopyAgentLaunch({ started: launch, followsTeam: true, teamSelection: choice }).launch.runtimeKind).toBe(RuntimeKind.CODEX_APP_SERVER);
    expect(effectiveCopyAgentLaunch({ started: launch, followsTeam: false, teamSelection: choice }).launch.runtimeKind).toBe(launch.runtimeKind);
  });
});
