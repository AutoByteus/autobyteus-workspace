import { describe, expect, it, vi } from "vitest";
import { AgentOrgRunService } from "../../../../src/agent-org-execution/services/agent-org-run-service.js";
import { AgentRunHistoryService } from "../../../../src/run-history/services/agent-run-history-service.js";
import { TeamRunHistoryService } from "../../../../src/run-history/services/team-run-history-service.js";
import { noDelegations, noWorkGuard } from "../../../helpers/no-delegations.js";

/**
 * autobyteus-493 DS-002: after a committed delete of an agent, team or org run, its run service tells the episodic
 * catalog once, with the root; a refused delete and an archive tell it nothing (REQ-006, AC-005).
 */
type Outcome = { success: boolean; message: string };
const refusingGuard = () => ({ guard: async () => ({ success: false, message: "A run it delegated to is working." }) });
const result = (success: boolean): Outcome => ({ success, message: success ? "done" : "refused" });

const agentService = (deleted: boolean, workGuard: { guard: (...args: never[]) => Promise<Outcome> } = noWorkGuard()) => {
  const episodicCatalog = { runDeleted: vi.fn() };
  const service = new AgentRunHistoryService("/tmp/memory", { tree: noDelegations(), workGuard: workGuard as never, episodicCatalog,
    catalogService: { deleteRun: vi.fn(async () => result(deleted)), archiveRun: vi.fn(async () => result(true)) } as never,
    agentRunManager: {} as never, metadataStore: {} as never, statusProjectionService: {} as never,
    visibility: { hiddenDefinitionIds: async () => new Set<string>() } });
  return { service, episodicCatalog };
};

const teamService = (deleted: boolean, workGuard: { guard: (...args: never[]) => Promise<Outcome> } = noWorkGuard()) => {
  const episodicCatalog = { runDeleted: vi.fn() };
  const service = new TeamRunHistoryService("/tmp/memory", { tree: noDelegations(), workGuard: workGuard as never, episodicCatalog,
    catalogService: { deleteTeamRun: vi.fn(async () => result(deleted)), archiveTeamRun: vi.fn(async () => result(true)) } as never,
    teamRunManager: {} as never, liveProjectionService: {} as never, adHocTasks: { deleteAdHocTasksDelegatedFrom: vi.fn(async () => undefined) } });
  return { service, episodicCatalog };
};

const orgService = (deleted: boolean, workGuard: { guard: (...args: never[]) => Promise<Outcome> } = noWorkGuard()) => {
  const episodicCatalog = { runDeleted: vi.fn() };
  const service = new AgentOrgRunService({ workGuard, episodicCatalog, manager: { unitRunsOf: async () => [] },
    history: { deleteStored: vi.fn(async () => result(deleted)), archiveStored: vi.fn(async () => result(true)) },
    adHocTasks: { deleteAdHocTasksDelegatedFrom: vi.fn(async () => undefined) } } as never);
  return { service, episodicCatalog };
};

describe("run delete → episodic catalog", () => {
  it("an agent run's committed delete tells the catalog once; a refused one and an archive do not", async () => {
    const committed = agentService(true);
    await committed.service.deleteStoredRun(" run_1 ");
    expect(committed.episodicCatalog.runDeleted.mock.calls).toEqual([[{ rootSubjectKind: "agent", rootRunId: "run_1" }]]);
    await committed.service.archiveStoredRun("run_2");
    expect(committed.episodicCatalog.runDeleted).toHaveBeenCalledTimes(1);

    const failed = agentService(false);
    await failed.service.deleteStoredRun("run_1");
    const guarded = agentService(true, refusingGuard());
    await guarded.service.deleteStoredRun("run_1");
    expect(failed.episodicCatalog.runDeleted).not.toHaveBeenCalled();
    expect(guarded.episodicCatalog.runDeleted).not.toHaveBeenCalled();
  });

  it("a team run's committed delete tells the catalog once; a refused one and an archive do not", async () => {
    const committed = teamService(true);
    await committed.service.deleteStoredTeamRun("team_1");
    expect(committed.episodicCatalog.runDeleted.mock.calls).toEqual([[{ rootSubjectKind: "agent_team", rootRunId: "team_1" }]]);
    await committed.service.archiveStoredTeamRun("team_2");
    expect(committed.episodicCatalog.runDeleted).toHaveBeenCalledTimes(1);

    const failed = teamService(false);
    await failed.service.deleteStoredTeamRun("team_1");
    const guarded = teamService(true, refusingGuard());
    await guarded.service.deleteStoredTeamRun("team_1");
    expect(failed.episodicCatalog.runDeleted).not.toHaveBeenCalled();
    expect(guarded.episodicCatalog.runDeleted).not.toHaveBeenCalled();
  });

  it("an org run's committed delete tells the catalog once; a refused one and an archive do not", async () => {
    const committed = orgService(true);
    await committed.service.deleteStoredRun("org_1");
    expect(committed.episodicCatalog.runDeleted.mock.calls).toEqual([[{ rootSubjectKind: "agent_org", rootRunId: "org_1" }]]);
    await committed.service.archiveStoredRun("org_2");
    expect(committed.episodicCatalog.runDeleted).toHaveBeenCalledTimes(1);

    const failed = orgService(false);
    await failed.service.deleteStoredRun("org_1");
    const guarded = orgService(true, refusingGuard());
    await guarded.service.deleteStoredRun("org_1");
    expect(failed.episodicCatalog.runDeleted).not.toHaveBeenCalled();
    expect(guarded.episodicCatalog.runDeleted).not.toHaveBeenCalled();
  });
});
