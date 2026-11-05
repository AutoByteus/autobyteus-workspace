/**
 * `ProjectRunHistoryService` (projects-tree-one-place, autobyteus-353; REQ-001, AC-001, AC-003, AC-005): a Project lists
 * exactly the runs started under it (its `project_runs.json`, joined with the history rows), grouped like a workspace's
 * (6 newest per agent group, Teams uncapped). A run that only handed out the Project's Tasks is not listed.
 * Run: pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/project-run-history-service.test.ts --no-watch
 */
import { describe, expect, it } from "vitest";
import type { RunProjectRoot } from "../../../../src/agent-execution/domain/run-project-context.js";
import type { ProjectRunLinks } from "../../../../src/run-history/domain/project-run-links.js";
import type { RunHistoryIndexRow } from "../../../../src/run-history/domain/agent-run-history-index-types.js";
import type { TeamRunIndexRow } from "../../../../src/run-history/domain/team-run-history-index-types.js";
import { AgentRunHistoryService } from "../../../../src/run-history/services/agent-run-history-service.js";
import { ProjectRunHistoryService } from "../../../../src/run-history/services/project-run-history-service.js";

const row = (runId: string, createdAt: string, extra: Partial<RunHistoryIndexRow> = {}): RunHistoryIndexRow => ({
  runId, agentDefinitionId: "pm", agentName: "Project Task Manager", workspaceRootPath: "/ws", summary: runId,
  createdAt, archivedAt: null, terminatedAt: null, ...extra,
});

const agentHistory = (rows: RunHistoryIndexRow[]) => new AgentRunHistoryService("/unused", {
  catalogService: { listCatalogRows: async () => rows } as never,
  statusProjectionService: { getCatalogListStatusProjection: () => ({ status: "offline", isActive: false, shouldConnectStream: false, statusSource: "TEST" }) } as never,
  agentRunManager: {} as never,
  visibility: { hiddenDefinitionIds: async () => new Set(["internal"]) },
});

const teamRow = (teamRunId: string): TeamRunIndexRow => ({
  teamRunId, teamDefinitionId: "set", teamDefinitionName: "software engineering team", workspaceRootPath: "/ws",
  summary: "", createdAt: "2026-10-01T00:00:00Z", archivedAt: null, terminatedAt: null,
});
const teamHistory = (rows: TeamRunIndexRow[]) => ({
  listTeamRunHistory: async (include: (row: TeamRunIndexRow) => boolean = () => true) => rows.filter(include).map((r) => ({
    teamRunId: r.teamRunId, teamDefinitionId: r.teamDefinitionId, teamDefinitionName: r.teamDefinitionName, coordinatorAddress: "/lead",
    workspaceRootPath: "/ws", summary: "", createdAt: r.createdAt, lastActivityAt: r.createdAt, archivedAt: null, terminatedAt: null, isActive: false, members: [],
    rootTeam: {} as never,
  })),
});

/** The run links port: the runs each Project recorded as started under it; an unknown Project is refused. */
const startedLinks = (started: Record<string, RunProjectRoot[]>): ProjectRunLinks => ({
  startedRunsOf: async (projectId) => {
    if (!started[projectId]) throw Object.assign(new Error(`Project '${projectId}' was not found.`), { code: "PROJECT_NOT_FOUND" });
    return started[projectId]!;
  },
});

const runIds = (history: Awaited<ReturnType<ProjectRunHistoryService["projectRunHistory"]>>) =>
  history.agentDefinitions.flatMap((group) => group.runs.map((run) => run.runId));

describe("ProjectRunHistoryService.projectRunHistory", () => {
  it("lists no run in any Project when none was started under one, e.g. a workspace run that handed out Tasks of 3 Projects (AC-001)", async () => {
    // "hello" was started in a workspace; its Tasks belong to P, Q and R, which the read no longer consults.
    const service = new ProjectRunHistoryService({
      agentRuns: agentHistory([row("hello", "2026-10-01T00:00:00Z")]),
      teamRuns: teamHistory([teamRow("worker-team")]),
      runLinks: startedLinks({ P: [], Q: [], R: [] }),
    });
    for (const projectId of ["P", "Q", "R"]) {
      expect(await service.projectRunHistory(projectId)).toEqual({ projectId, agentDefinitions: [], teamDefinitions: [] });
    }
  });

  it("lists exactly the runs started under the Project, once, and not under another Project (REQ-001, AC-002)", async () => {
    const service = new ProjectRunHistoryService({
      agentRuns: agentHistory([row("pm-p", "2026-10-02T00:00:00Z"), row("hello", "2026-10-01T00:00:00Z")]),
      teamRuns: teamHistory([]),
      runLinks: startedLinks({ P: [{ kind: "agent", runId: "pm-p" }], Q: [] }),
    });
    expect(runIds(await service.projectRunHistory("P"))).toEqual(["pm-p"]);
    expect(runIds(await service.projectRunHistory("Q"))).toEqual([]);
  });

  it("caps each agent group at its 6 newest runs, as in Workspaces; archived and hidden runs and orphan entries list nothing (REQ-001)", async () => {
    const rows = [
      ...Array.from({ length: 8 }, (_, i) => row(`pm-${i}`, `2026-10-0${i + 1}T00:00:00Z`)),
      row("archived", "2026-10-09T00:00:00Z", { archivedAt: "2026-10-10T00:00:00Z" }),
      row("hidden", "2026-10-09T00:00:00Z", { agentDefinitionId: "internal" }),
    ];
    const started: RunProjectRoot[] = [...rows.map((r) => ({ kind: "agent" as const, runId: r.runId })), { kind: "agent", runId: "never-created" }];
    const history = await new ProjectRunHistoryService({ agentRuns: agentHistory(rows), teamRuns: teamHistory([]), runLinks: startedLinks({ P: started }) })
      .projectRunHistory("P");
    expect(runIds(history)).toEqual(["pm-7", "pm-6", "pm-5", "pm-4", "pm-3", "pm-2"]);
  });

  it("lists Team runs started under the Project in its team groups, uncapped (AC-003)", async () => {
    const history = await new ProjectRunHistoryService({
      agentRuns: agentHistory([]),
      teamRuns: teamHistory([teamRow("team-started"), teamRow("team-elsewhere")]),
      runLinks: startedLinks({ P: [{ kind: "agent_team", runId: "team-started" }] }),
    }).projectRunHistory("P");
    expect(history.teamDefinitions.map((group) => group.runs.map((run) => run.teamRunId))).toEqual([["team-started"]]);
    expect(history).not.toHaveProperty("scopes");
    expect(history).not.toHaveProperty("agentOrgRuns");
  });

  it("refuses an unknown Project with PROJECT_NOT_FOUND", async () => {
    const service = new ProjectRunHistoryService({ agentRuns: agentHistory([]), teamRuns: teamHistory([]), runLinks: startedLinks({}) });
    await expect(service.projectRunHistory("missing")).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
  });
});
