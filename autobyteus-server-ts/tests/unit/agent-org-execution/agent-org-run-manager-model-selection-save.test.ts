import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { noDelegations } from "../../helpers/no-delegations.js";
import { writeStoredOrgContainer } from "../../helpers/stored-org-container.js";
import { AgentOrgRunManager } from "../../../src/agent-org-execution/services/agent-org-run-manager.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { RunModelSelectionService } from "../../../src/llm-management/services/run-model-selection-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { NO_ON_DEMAND_MODELS } from "../../helpers/explicit-host-collaborators.js";

/**
 * CRR-001 CR-001: `AgentOrgRunManager`'s own stopped save of a configured Agent (direct, or a mounted Team's member)
 * went through no unit or integration test before this fix. A real native capacity mismatch on such a member used to
 * build a preview tree with the shared switch rule before validation had decided a continuation, which threw and
 * failed the whole save (INTERNAL_ERROR) for every Org member model save.
 */
const view = (rows: readonly { model_identifier: string }[]) => ({ offeredModels: rows,
  findExactCurrent: (id: string) => rows.find((row) => row.model_identifier === id) ?? null });

const memoryDirs: string[] = [];
afterEach(async () => { await Promise.all(memoryDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

const harness = async () => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-org-run-manager-model-save-"));
  memoryDirs.push(memoryDir);
  await writeStoredOrgContainer(memoryDir, {
    orgRunId: "org-1",
    units: [
      { kind: "agent", address: "/direct", runId: "direct-run" },
      { kind: "agent_team", address: "/team", runId: "team-1", coordinatorAddress: "/lead", members: [{ address: "/lead", agentRunId: "lead-run" }] },
    ],
  });
  // The fixture always writes "test-model"; give the direct agent and the Team member their own native binding and session.
  const layout = new AgentMemoryLayout(memoryDir);
  const agents = new AgentRunMetadataStore(memoryDir);
  const direct = await agents.readMetadata("direct-run");
  await agents.writeMetadata("direct-run", { ...direct!, runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "large", platformAgentRunId: "session-direct" });
  const teamDir = layout.getTeamDirPath({ rootTeamRunId: "team-1", ancestorTeamRunIds: [] });
  const teams = new TeamRunExecutionTreeStore();
  const teamTree = (await teams.read(teamDir, "team-1"))!;
  await teams.write(teamDir, { ...teamTree, rootTeam: { ...teamTree.rootTeam, members: teamTree.rootTeam.members.map((member) =>
    member.address === "/lead" ? { ...member, platformAgentRunId: "session-lead",
      launchConfiguration: { ...member.launchConfiguration, runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "large" } } : member) } });
  const catalog = { runtimeModelSelectionCatalog: async () => view(["small", "equal", "large"].map((model_identifier) => ({ model_identifier }))) };
  const capacity = { resolveMany: () => ({ small: 128000, equal: 128000, large: 272000 }) };
  const modelSelectionValidator = new RunModelSelectionService(catalog as never, NO_ON_DEMAND_MODELS, capacity as never);
  const manager = new AgentOrgRunManager({
    memoryDir, delegationIndex: noDelegations(), containers: {} as never,
    workspaces: { ensureWorkspaceByRootPath: async (p: string) => ({ getBasePath: () => p }) } as never,
    modelSelectionValidator,
  });
  return { manager, memoryDir, agents, teams, teamDir };
};

describe("AgentOrgRunManager's stopped save of a configured Agent (autobyteus-53, CRR-001 CR-001)", () => {
  it("a direct member on a decreasing native model hands over with a same-runtime pending switch, validated against its own baseline", async () => {
    const h = await harness();
    const result = await h.manager.updateStoppedRunConfig({ orgRunId: "org-1",
      selectionPatches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress: "/direct", runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "small", llmConfig: null }],
      teamWorkspacePatches: [] });
    expect(result).toMatchObject({ outcome: "UPDATED", success: true, fieldErrors: [] });
    const direct = await h.agents.readMetadata("direct-run");
    expect(direct).toMatchObject({ llmModelIdentifier: "small", platformAgentRunId: null,
      pendingRuntimeSwitch: { from: { runtimeKind: "autobyteus", llmModelIdentifier: "large", llmConfig: null, platformAgentRunId: "session-direct" } } });
  });

  it("a direct member's equal/bigger native edit stays in the same session (no pending switch)", async () => {
    const h = await harness();
    const result = await h.manager.updateStoppedRunConfig({ orgRunId: "org-1",
      selectionPatches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress: "/direct", runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "large", llmConfig: null }],
      teamWorkspacePatches: [] });
    expect(result).toMatchObject({ outcome: "UNCHANGED", success: true });
    const direct = await h.agents.readMetadata("direct-run");
    expect(direct).toMatchObject({ llmModelIdentifier: "large", platformAgentRunId: "session-direct" });
    expect(Object.hasOwn(direct!, "pendingRuntimeSwitch")).toBe(false);
  });

  it("a member inside a mounted Team saves the same way: a decreasing model hands over; its Team is untouched", async () => {
    const h = await harness();
    const result = await h.manager.updateStoppedRunConfig({ orgRunId: "org-1",
      selectionPatches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress: "/team/lead", runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "small", llmConfig: null }],
      teamWorkspacePatches: [] });
    expect(result).toMatchObject({ outcome: "UPDATED", success: true, fieldErrors: [] });
    const teamTree = await h.teams.read(h.teamDir, "team-1");
    const lead = teamTree!.rootTeam.members.find((member) => member.address === "/lead")!;
    expect(lead).toMatchObject({ platformAgentRunId: null, launchConfiguration: { llmModelIdentifier: "small" },
      pendingRuntimeSwitch: { from: { runtimeKind: "autobyteus", llmModelIdentifier: "large", llmConfig: null, platformAgentRunId: "session-lead" } } });
  });
});
