import { noDelegations, noWorkGuard, noEpisodicCatalog } from "../../../helpers/no-delegations.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { writeStoredOrgContainer } from "../../../helpers/stored-org-container.js";
import { readStoredOrgTree } from "../../../../src/agent-org-execution/container/stored-org-tree.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import { TeamCommunicationStore } from "../../../../src/services/team-communication/team-communication-store.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamRunHistoryIndexStore } from "../../../../src/run-history/store/team-run-history-index-store.js";
import { AgentOrgRunHistoryIndexStore } from "../../../../src/run-history/store/agent-org-run-history-index-store.js";
import { projectAgentOrgRunHistoryRow } from "../../../../src/run-history/services/agent-org-run-history-row-projector.js";
import { resetCollaborationRunHistoryCatalogState } from "../../../../src/run-history/services/collaboration-run-history-catalog-core.js";
import { AgentOrgRunHistoryCatalogService } from "../../../../src/run-history/services/agent-org-run-history-catalog-service.js";
import { CollaborationRootHistoryService } from "../../../../src/run-history/services/collaboration-root-history-service.js";
import {
  resetRootRunPackageReadinessIndex,
  RootRunPackageReadinessIndex,
} from "../../../../src/run-history/services/root-run-package-readiness-index.js";
import {
  resetTeamRunHistoryCatalogState,
  TeamRunHistoryCatalogService,
} from "../../../../src/run-history/services/team-run-history-catalog-service.js";
import { TeamRunHistoryService } from "../../../../src/run-history/services/team-run-history-service.js";
import { WorkspaceRunHistoryService } from "../../../../src/run-history/services/workspace-run-history-service.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../../fixtures/current-agent-org-run-fixtures.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";
import { NO_CLOSED_DELEGATIONS } from "../../../../src/remote-collaboration/inbound/closed-delegations.js";

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const memoryDir of roots.splice(0)) {
    resetTeamRunHistoryCatalogState(memoryDir);
    resetCollaborationRunHistoryCatalogState(memoryDir, "agent_org");
    resetRootRunPackageReadinessIndex(memoryDir);
    await fs.rm(memoryDir, { recursive: true, force: true });
  }
});

describe("first mixed collaboration history after restart", () => {
  it("awaits one complete readiness generation and retains Team workspace history and Restore", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "mixed-history-readiness-"));
    roots.push(memoryDir);
    const layout = new AgentMemoryLayout(memoryDir);
    const teamRunId = "retained-team-run";
    const orgRunId = "retained-org-run";
    const workspaceRootPath = "/workspace/retained";
    const teamTree = testExecutionTree({
      rootTeamRunId: teamRunId,
      rootTeamDefinitionId: "retained-team-definition",
      teamDefinitionName: "Retained Team",
      coordinatorAddress: "/coordinator",
      createdAt: "2026-09-01T00:00:00.000Z",
      children: [testAgentNode("/coordinator", {
        agentRunId: "retained-coordinator-run",
        workspaceRootPath,
      })],
    });
    const teamPackagePath = layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] });
    await fs.mkdir(teamPackagePath, { recursive: true });
    await Promise.all([
      new TeamRunExecutionTreeStore().write(teamPackagePath, teamTree),
      new TeamCommunicationStore().write(teamPackagePath, {
        schemaVersion: 1,
        rootTeamRunId: teamRunId,
        messages: [],
      }),
    ]);
    await new TeamRunHistoryIndexStore(memoryDir).writeIndex([{
      teamRunId,
      teamDefinitionId: "retained-team-definition",
      teamDefinitionName: "Retained Team",
      workspaceRootPath,
      summary: "Retained after restart",
      createdAt: "2026-09-01T00:00:00.000Z",
      archivedAt: null,
      terminatedAt: "2026-09-01T01:00:00.000Z",
    }]);

    // An Org container with one direct agent unit (org-teams-follow-definition).
    await writeStoredOrgContainer(memoryDir, { orgRunId, createdAt: "2026-09-01T00:00:00.000Z",
      units: [{ kind: "agent", address: "/direct", runId: "retained-org-agent-run" }] });
    const orgTree = (await readStoredOrgTree(memoryDir, orgRunId))!;
    await new AgentOrgRunHistoryIndexStore(memoryDir).writeIndex([projectAgentOrgRunHistoryRow(orgTree)]);

    // The Org package's validation (its unit's back-link read) is held until released.
    let releaseOrgValidation!: () => void;
    let reportOrgValidationStarted!: () => void;
    const orgValidationGate = new Promise<void>((resolve) => { releaseOrgValidation = resolve; });
    const orgValidationStarted = new Promise<void>((resolve) => { reportOrgValidationStarted = resolve; });
    const originalMetadataRead = AgentRunMetadataStore.prototype.readMetadata;
    let heldFirstOrgRead = false;
    vi.spyOn(AgentRunMetadataStore.prototype, "readMetadata").mockImplementation(async function (this: AgentRunMetadataStore, runId: string) {
      if (runId === "retained-org-agent-run" && !heldFirstOrgRead) {
        heldFirstOrgRead = true;
        reportOrgValidationStarted();
        await orgValidationGate;
      }
      return originalMetadataRead.call(this, runId);
    });

    const teamManager = {
      hasManagedTeamRun: vi.fn(() => false),
      getManagedTeamRun: vi.fn(() => null),
      withInactiveHistoryMutation: vi.fn(),
    };
    const teamCatalog = new TeamRunHistoryCatalogService(memoryDir, { teamRunManager: teamManager });
    const teamHistory = new TeamRunHistoryService(memoryDir, { tree: noDelegations(), workGuard: noWorkGuard(), episodicCatalog: noEpisodicCatalog(),
      catalogService: teamCatalog,
      teamRunManager: teamManager as never,
      liveProjectionService: {
        getCatalogListLiveProjection: () => ({ isActive: false, memberStatusSnapshots: [] }),
      } as never,
    });
    const orgManager = { getActive: vi.fn(() => null) };
    const orgHistory = new AgentOrgRunHistoryCatalogService(memoryDir, orgManager as never);
    const mixedHistory = new CollaborationRootHistoryService({ tree: noDelegations(),
      memoryDir,
      teams: teamHistory,
      orgs: orgHistory,
      orgRuns: orgManager as never,
    });
    const readinessRebuild = vi.spyOn(RootRunPackageReadinessIndex.prototype, "rebuild");

    const firstMixedRead = mixedHistory.list();
    await orgValidationStarted;
    let resolvedBeforeCompleteReadiness = false;
    void firstMixedRead.then(() => { resolvedBeforeCompleteReadiness = true; });
    await Promise.resolve();
    expect(resolvedBeforeCompleteReadiness).toBe(false);
    releaseOrgValidation();

    await expect(firstMixedRead).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ root_subject_kind: "agent_team", root_run_id: teamRunId }),
      expect.objectContaining({ root_subject_kind: "agent_org", root_run_id: orgRunId }),
    ]));
    expect(readinessRebuild).toHaveBeenCalledTimes(1);

    const workspaceHistory = new WorkspaceRunHistoryService({ tree: noDelegations(), closedDelegations: NO_CLOSED_DELEGATIONS,
      agentRunHistoryService: { listRunHistory: vi.fn(async () => []) } as never,
      teamRunHistoryService: teamHistory,
    });
    await expect(workspaceHistory.getWorkspaceRunHistory(workspaceRootPath)).resolves.toMatchObject({
      workspaceRootPath,
      teamDefinitions: [{
        teamDefinitionId: "retained-team-definition",
        runs: [expect.objectContaining({ teamRunId, isActive: false })],
      }],
    });
    await expect(teamHistory.getTeamRunResumeConfig(teamRunId)).resolves.toMatchObject({
      teamRunId,
      isActive: false,
      executionTree: { rootTeam: { teamRunId } },
      modelConfigEditability: { editable: true, reason: null },
    });
  });
});
