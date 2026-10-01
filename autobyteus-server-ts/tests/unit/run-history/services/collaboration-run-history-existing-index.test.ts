import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TeamRunHistoryCatalogService, resetTeamRunHistoryCatalogState } from "../../../../src/run-history/services/team-run-history-catalog-service.js";
import { AgentOrgRunHistoryCatalogService } from "../../../../src/run-history/services/agent-org-run-history-catalog-service.js";
import { resetCollaborationRunHistoryCatalogState } from "../../../../src/run-history/services/collaboration-run-history-catalog-core.js";
import { TeamRunHistoryIndexStore } from "../../../../src/run-history/store/team-run-history-index-store.js";
import { AgentOrgRunHistoryIndexStore } from "../../../../src/run-history/store/agent-org-run-history-index-store.js";

let root: string | null = null;
afterEach(async () => {
  if (!root) return;
  resetTeamRunHistoryCatalogState(root);
  resetCollaborationRunHistoryCatalogState(root, "agent_org");
  await fs.rm(root, { recursive: true, force: true });
  root = null;
});

describe("direct use of existing current-shape collaboration indexes", () => {
  it("treats corrupt indexes as errors without replacing either file", async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "collaboration-corrupt-index-"));
    const teamPath = path.join(root, "team_run_history_index.json");
    const orgPath = path.join(root, "agent_org_run_history_index.json");
    await Promise.all([fs.writeFile(teamPath, "{ broken"), fs.writeFile(orgPath, "{ broken")]);
    const teams = new TeamRunHistoryCatalogService(root, {
      teamRunManager: { withInactiveHistoryMutation: async (_id, operation) =>
        ({ kind: "completed", value: await operation() }) },
      packageCatalog: { awaitReady: async () => undefined, isAdmitted: () => true } as never,
    });
    const orgs = new AgentOrgRunHistoryCatalogService(root, {
      withInactiveHistoryMutation: async (_id: string, operation: () => Promise<unknown>) =>
        ({ kind: "completed", value: await operation() }),
    } as never, { packageCatalog: { awaitReady: async () => undefined, isAdmitted: () => true } as never });
    await expect(teams.listCatalogRows()).rejects.toThrow();
    await expect(orgs.listCatalogRows()).rejects.toThrow();
    expect(await fs.readFile(teamPath, "utf8")).toBe("{ broken");
    expect(await fs.readFile(orgPath, "utf8")).toBe("{ broken");
  });

  it("retains stored summary, termination, archive and row bytes on both family queries", async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "collaboration-existing-index-"));
    const teamRow = { teamRunId: "team-one", teamDefinitionId: "team-def", teamDefinitionName: "Team One",
      workspaceRootPath: "/workspace", summary: "Existing Team summary", createdAt: "2026-09-01T00:00:00.000Z",
      archivedAt: "2026-09-02T00:00:00.000Z", terminatedAt: "2026-09-01T01:00:00.000Z" };
    const orgRow = { orgRunId: "org-one", orgDefinitionId: "org-def", orgDefinitionName: "Org One",
      workspaceRootPath: "/workspace", summary: "Existing Org summary", createdAt: "2026-09-03T00:00:00.000Z",
      archivedAt: null, terminatedAt: "2026-09-03T01:00:00.000Z" };
    const teamStore = new TeamRunHistoryIndexStore(root);
    const orgStore = new AgentOrgRunHistoryIndexStore(root);
    await teamStore.writeIndex([teamRow]);
    await orgStore.writeIndex([orgRow]);
    const teamPath = path.join(root, "team_run_history_index.json");
    const beforeTeam = await fs.readFile(teamPath);
    const beforeOrg = await fs.readFile(orgStore.filePath);
    const teams = new TeamRunHistoryCatalogService(root, {
      indexStore: teamStore, teamRunManager: { withInactiveHistoryMutation: async (_id, operation) =>
        ({ kind: "completed", value: await operation() }) },
      packageCatalog: { awaitReady: async () => undefined, isAdmitted: () => true } as never,
    });
    const orgs = new AgentOrgRunHistoryCatalogService(root, {
      withInactiveHistoryMutation: async (_id: string, operation: () => Promise<unknown>) =>
        ({ kind: "completed", value: await operation() }),
    } as never, { indexStore: orgStore,
      packageCatalog: { awaitReady: async () => undefined, isAdmitted: () => true } as never });
    expect(await teams.listCatalogRows()).toEqual([teamRow]);
    expect(await orgs.listCatalogRows()).toEqual([orgRow]);
    expect(await fs.readFile(teamPath)).toEqual(beforeTeam);
    expect(await fs.readFile(orgStore.filePath)).toEqual(beforeOrg);
  });
});
