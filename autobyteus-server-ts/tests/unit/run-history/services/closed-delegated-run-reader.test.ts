import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { emptyStandaloneRootTree } from "../../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { StandaloneRootPackageStore } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { validateStandaloneRootTreePayload } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-tree-schema.js";
import { ClosedDelegatedRunReader } from "../../../../src/run-history/services/closed-delegated-run-reader.js";
import { testOrgLaunchConfiguration } from "../../../fixtures/current-agent-org-run-fixtures.js";
import { FixedOpenDelegatedRuns } from "../../../fixtures/open-delegated-run-sources.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";

/**
 * autobyteus-469 D-5, D-7: the agents of a top run's delegated runs that left its tree when their Task closed, from the
 * Task records (which runs) and each run's own file (its agents and addresses). The Team tab names them; a standalone
 * run's token total counts them.
 */

const T0 = "2026-11-01T10:00:00.000Z";
const HOST = "hub";
const root = { rootSubjectKind: "agent" as const, rootRunId: HOST };
const launch = testOrgLaunchConfiguration("/workspace");
const roots: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

const fixture = async () => {
  const memory = await fs.mkdtemp(path.join(os.tmpdir(), "closed-delegated-runs-")); roots.push(memory);
  const agent = (agentRunId: string) => ({ address: "/solution_designer", agentRunId, platformAgentRunId: null, delegatorAgentRunId: HOST, startedAt: T0,
    source: { kind: "agent", agentDefinitionId: "designer", launchConfiguration: launch } });
  const team = { address: "/software_engineering_team", teamRunId: "crew", delegatorAgentRunId: HOST, startedAt: T0, taskExecutions: [],
    members: [{ address: "/software_engineering_team/lead", agentRunId: "crew-lead", platformAgentRunId: null },
      { address: "/software_engineering_team/reviewer", agentRunId: "crew-reviewer", platformAgentRunId: null }],
    source: { kind: "agent_team", teamDefinitionId: "se", coordinatorAddress: "/software_engineering_team/lead",
      members: [{ address: "/software_engineering_team/lead", agentDefinitionId: "lead", launchConfiguration: launch, followsTeam: true },
        { address: "/software_engineering_team/reviewer", agentDefinitionId: "reviewer", launchConfiguration: launch, followsTeam: true }],
      handoffs: [], defaultLaunchConfiguration: launch } };
  await new StandaloneRootPackageStore(undefined, new FixedOpenDelegatedRuns()).writeTree(new AgentMemoryLayout(memory).getAgentRunCollaborationDirPath(HOST),
    validateStandaloneRootTreePayload({ ...emptyStandaloneRootTree({ host: { address: "/manager" as never, agentRunId: HOST, agentDefinitionId: "manager" },
      createdAt: T0 }), taskExecutions: [agent("designer-run"), agent("open-run"), team] }, HOST));
  const resources = new InMemoryTaskExecutionResources();
  resources.addTask("A"); resources.addTask("B");
  const assigned = { role: "assigned" as const, assignedBy: HOST, recipientAddress: "/x", hostRoot: root };
  await resources.linkNewTaskExecution({ ...assigned, taskId: "A", execution: { agentRunId: "designer-run" } });
  await resources.linkNewTaskExecution({ ...assigned, taskId: "A", execution: { teamRunId: "crew" }, teamCoordinatorAgentRunId: "crew-lead" });
  await resources.linkNewTaskExecution({ ...assigned, taskId: "B", execution: { agentRunId: "open-run" } });
  resources.close("A");
  return { memory, resources, reader: new ClosedDelegatedRunReader(memory, () => resources) };
};

describe("ClosedDelegatedRunReader (autobyteus-469 D-5, D-7)", () => {
  it("names the agents of closed runs from their own files: an agent, a Team's coordinator and another member", async () => {
    const f = await fixture();
    expect(await f.reader.forAgentRunIds(root, ["designer-run", "crew-lead", "crew-reviewer", "open-run", "stranger"])).toEqual([
      { agentRunId: "designer-run", address: "/solution_designer" },
      { agentRunId: "crew-lead", address: "/software_engineering_team/lead" },
      { agentRunId: "crew-reviewer", address: "/software_engineering_team/reviewer" },
    ]);
    expect(await f.reader.forAgentRunIds({ rootSubjectKind: "agent_team", rootRunId: HOST }, ["designer-run"])).toEqual([]);
  });

  it("lists every agent run of the closed runs, for the standalone token total", async () => {
    const f = await fixture();
    expect((await f.reader.agentRunIds(root)).sort()).toEqual(["crew-lead", "crew-reviewer", "designer-run"]);
  });

  it("leaves out a run whose own file cannot be read, with one warning naming it; without a bound Task side there is none", async () => {
    const f = await fixture();
    await fs.writeFile(path.join(f.memory, "agent_teams", "crew", "team_run_execution_tree.json"), "{ broken");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect((await f.reader.agentRunIds(root)).sort()).toEqual(["designer-run"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Closed delegated run 'crew' of agent run 'hub' cannot be read"));
    expect(await new ClosedDelegatedRunReader(f.memory, () => null).forAgentRunIds(root, ["designer-run"])).toEqual([]);
  });
});
