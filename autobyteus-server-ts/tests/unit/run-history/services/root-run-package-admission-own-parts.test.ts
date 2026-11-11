import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from "../../../../src/run-history/services/root-run-package-readiness-index.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamCommunicationStore } from "../../../../src/services/team-communication/team-communication-store.js";
import { AgentOrgRunExecutionTreeStore } from "../../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { AgentOrgCommunicationMessagesStore } from "../../../../src/agent-org-execution/persistence/agent-org-communication-messages-store.js";
import { TaskAgentOwnFiles } from "../../../../src/run-history/store/task-agent-own-files.js";
import { getOpenDelegatedRunSource } from "../../../../src/run-history/store/open-delegated-run-source.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgLaunchConfiguration } from "../../../fixtures/current-agent-org-run-fixtures.js";
import { FixedOpenDelegatedRuns } from "../../../fixtures/open-delegated-run-sources.js";

/**
 * autobyteus-469 D-11, AC-008: startup admission runs before the Task records are loaded, so it reads a Team or Org
 * run's own parts only. Hand-built packages whose tree files still list local delegated runs (as an older build left
 * them), one of them with a broken own file, are admitted with no source bound and without reading any own file.
 */

const T0 = "2026-11-01T10:00:00.000Z";
const launch = testOrgLaunchConfiguration("/workspace");
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) { resetRootRunPackageReadinessIndex(root); await fs.rm(root, { recursive: true, force: true }); }
});
const copy = (agentRunId: string, delegatorAgentRunId: string) => ({ address: "/code_reviewer", agentRunId, platformAgentRunId: null,
  delegatorAgentRunId, startedAt: T0, source: { kind: "agent", agentDefinitionId: "code-reviewer", launchConfiguration: launch } });
const link = (agentRunId: string, delegatorAgentRunId: string) => ({ address: "/code_reviewer", agentRunId, delegatorAgentRunId, startedAt: T0 });

describe("startup admission reads a run's own parts only (D-11, AC-008)", () => {
  it("admits a Team run and an Org run whose trees list local runs, before any Task record exists, reading no own file", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "admission-own-parts-")); roots.push(memoryDir);
    const layout = new AgentMemoryLayout(memoryDir);
    // Older builds' packages: own files written, then the local links put back into each tree file.
    const teamDir = layout.getTeamDirPath({ rootTeamRunId: "team-root", ancestorTeamRunIds: [] });
    const teamTree = testExecutionTree({ rootTeamRunId: "team-root", coordinatorAddress: "/lead", children: [testAgentNode("/lead", { agentRunId: "lead-run" })] });
    await new TeamRunExecutionTreeStore(undefined, new FixedOpenDelegatedRuns()).write(teamDir,
      { ...teamTree, rootTeam: { ...teamTree.rootTeam, taskExecutions: [copy("team-copy", "lead-run")] } } as never);
    await new TeamCommunicationStore().write(teamDir, { schemaVersion: 1, rootTeamRunId: "team-root", messages: [] });
    const orgDir = layout.getOrgDirPath("org-root");
    const orgTree = testAgentOrgExecutionTree({ orgRunId: "org-root", members: [testOrgAgentNode("/director", "director-run")] });
    await new AgentOrgRunExecutionTreeStore(undefined, undefined, new FixedOpenDelegatedRuns()).write(orgDir,
      { ...orgTree, rootOrg: { ...orgTree.rootOrg, taskExecutions: [copy("org-copy", "director-run")] } } as never);
    await new AgentOrgCommunicationMessagesStore().write(orgDir, { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-root", messages: [] });
    const teamFile = path.join(teamDir, "team_run_execution_tree.json"), orgFile = path.join(orgDir, "agent_org_run_execution_tree.json");
    const rawTeam = JSON.parse(await fs.readFile(teamFile, "utf8"));
    rawTeam.rootTeam.taskExecutions = [link("team-copy", "lead-run"), link("closed-copy", "lead-run")];
    await fs.writeFile(teamFile, JSON.stringify(rawTeam));
    const rawOrg = JSON.parse(await fs.readFile(orgFile, "utf8"));
    rawOrg.rootOrg.taskExecutions = [link("org-copy", "director-run")];
    await fs.writeFile(orgFile, JSON.stringify(rawOrg));
    // A delegated run with a broken own file is judged where a tree is composed, not at admission.
    await fs.writeFile(path.join(memoryDir, "agents", "org-copy", "run_metadata.json"), "{ broken");

    expect(() => getOpenDelegatedRunSource()).toThrow("before the Task records were loaded");
    const ownFiles = [vi.spyOn(TaskAgentOwnFiles.prototype, "readAgent"), vi.spyOn(TaskAgentOwnFiles.prototype, "readTeam"),
      vi.spyOn(TaskAgentOwnFiles.prototype, "readAgentSync"), vi.spyOn(TaskAgentOwnFiles.prototype, "readTeamSync")];
    const readiness = new RootRunPackageReadinessIndex(memoryDir);
    await readiness.rebuild();
    // (The broken run_metadata.json is also seen by the standalone scan of `agents/`; that is not this test's subject.)
    expect(readiness.listDiagnostics().filter((diagnostic) => diagnostic.rootSubjectKind !== "agent")).toEqual([]);
    expect(readiness.listAdmitted("agent_team")).toEqual(["team-root"]);
    expect(readiness.listAdmitted("agent_org")).toEqual(["org-root"]);
    for (const read of ownFiles) expect(read).not.toHaveBeenCalled();
  });
});
