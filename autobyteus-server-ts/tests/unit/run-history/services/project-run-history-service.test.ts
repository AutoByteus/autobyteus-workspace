/**
 * `ProjectRunHistoryService` (projects-left-navigation, DS-003; REQ-003, REQ-008, REQ-010, AC-002, AC-007, AC-009):
 * which runs are listed under a Project, the cap rule, and each listed root's execution scope. Listing services and
 * the run links port are fakes; `AgentRunHistoryService.listAgentGroupsOf` is exercised with a fake catalog.
 * Run: pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/project-run-history-service.test.ts --no-watch
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRootExecutionIdentity, rootExecutionIdentityKey } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../../../src/agent-collaboration/execution/task/task-execution-reference.js";
import { configureRunProjectContextReader } from "../../../../src/agent-execution/domain/run-project-context.js";
import type { ProjectRunLinkSet } from "../../../../src/run-history/domain/project-run-links.js";
import type { RunHistoryIndexRow } from "../../../../src/run-history/domain/agent-run-history-index-types.js";
import type { TeamRunIndexRow } from "../../../../src/run-history/domain/team-run-history-index-types.js";
import { AgentRunHistoryService } from "../../../../src/run-history/services/agent-run-history-service.js";
import { ProjectRunHistoryService } from "../../../../src/run-history/services/project-run-history-service.js";

const agentRoot = (runId: string) => createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: runId });
const key = (kind: "agent" | "agent_team" | "agent_org", runId: string) => rootExecutionIdentityKey(createRootExecutionIdentity({ rootSubjectKind: kind, rootRunId: runId }));

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

const teamItem = (teamRunId: string) => ({
  teamRunId, teamDefinitionId: "set", teamDefinitionName: "software engineering team", coordinatorAddress: "/lead",
  workspaceRootPath: "/ws", summary: "", createdAt: "2026-10-01T00:00:00Z", archivedAt: null, terminatedAt: null,
  isActive: false, members: [], rootTeam: {} as never,
});

const teamHistory = (rows: TeamRunIndexRow[]) => ({
  listTeamRunHistory: async (include: (row: TeamRunIndexRow) => boolean = () => true) => rows.filter(include).map((r) => teamItem(r.teamRunId)),
});

const teamRow = (teamRunId: string, projectId?: string): TeamRunIndexRow => ({
  teamRunId, teamDefinitionId: "set", teamDefinitionName: "software engineering team", workspaceRootPath: "/ws",
  summary: "", createdAt: "2026-10-01T00:00:00Z", archivedAt: null, terminatedAt: null, ...(projectId ? { projectId } : {}),
});

const linkSet = (hosts: Array<[ReturnType<typeof agentRoot>, boolean]>, executions: Array<[string, TaskExecutionReference[]]>): ProjectRunLinkSet => ({
  hostRoots: hosts.map(([hostRoot, hasOpenWork]) => ({ hostRoot, hasOpenWork })),
  executionsByHostRoot: new Map(executions),
});

describe("ProjectRunHistoryService.projectRunHistory", () => {
  let reader: { close(): void };
  beforeEach(() => {
    reader = configureRunProjectContextReader({ contextOf: async (id) => (id === "P" ? { projectId: "P", name: "AutoByteus" } : null) });
  });
  afterEach(() => reader.close());

  it("lists runs started under P and hosts of P's Tasks; caps agent groups at 6 plus open-work hosts (AC-002, AC-009)", async () => {
    const rows = [
      ...Array.from({ length: 8 }, (_, i) => row(`pm-${i}`, `2026-10-0${i + 1}T00:00:00Z`)),
      row("archived", "2026-10-09T00:00:00Z", { archivedAt: "2026-10-10T00:00:00Z" }),
      row("hidden", "2026-10-09T00:00:00Z", { agentDefinitionId: "internal" }),
      row("plain", "2026-10-09T00:00:00Z"),
      row("other-project", "2026-10-09T00:00:00Z", { projectId: "Q" }),
    ];
    // pm-0 (oldest) hosts open work; pm-1 hosts only closed work: beyond the cap it is not listed.
    const hosts = linkSet(
      [...rows.map((r) => [agentRoot(r.runId), r.runId === "pm-0"] as [ReturnType<typeof agentRoot>, boolean]).filter(([root]) => root.rootRunId.startsWith("pm-") || root.rootRunId === "archived" || root.rootRunId === "hidden")],
      [],
    );
    const service = new ProjectRunHistoryService({
      orgs: { getAgentOrg: async () => null },
      agentRuns: agentHistory(rows),
      teamRuns: teamHistory([]),
      runLinks: { runLinksOf: async (projectId) => (projectId === "P" ? hosts : linkSet([], [])) },
    });
    const history = await service.projectRunHistory("P");
    expect(history.agentDefinitions).toHaveLength(1);
    expect(history.agentDefinitions[0]!.runs.map((run) => run.runId)).toEqual(["pm-7", "pm-6", "pm-5", "pm-4", "pm-3", "pm-2", "pm-0"]);
  });

  it("scopes each root to P's copies, plus Temp-task copies only when the root was started under P (AC-007)", async () => {
    const rows = [row("started-under-p", "2026-10-02T00:00:00Z", { projectId: "P" }), row("workspace-run", "2026-10-01T00:00:00Z")];
    const project = linkSet([[agentRoot("started-under-p"), true], [agentRoot("workspace-run"), true]], [
      [key("agent", "started-under-p"), [{ teamRunId: "p-team" }]],
      [key("agent", "workspace-run"), [{ agentRunId: "p-copy" }]],
    ]);
    const noProject = linkSet([], [
      [key("agent", "started-under-p"), [{ agentRunId: "temp-1" }]],
      [key("agent", "workspace-run"), [{ agentRunId: "temp-2" }]],
    ]);
    const service = new ProjectRunHistoryService({
      orgs: { getAgentOrg: async () => null },
      agentRuns: agentHistory(rows),
      teamRuns: teamHistory([]),
      runLinks: { runLinksOf: async (projectId) => (projectId === "P" ? project : noProject) },
    });
    const history = await service.projectRunHistory("P");
    expect(history.scopes).toEqual([
      { rootKind: "AGENT", rootRunId: "started-under-p", executions: [{ teamRunId: "p-team" }, { agentRunId: "temp-1" }] },
      { rootKind: "AGENT", rootRunId: "workspace-run", executions: [{ agentRunId: "p-copy" }] },
    ]);
  });

  it("lists Team runs started under P or hosting its Tasks, and Org hosts, each with a scope (AC-005)", async () => {
    const orgItem = { root_subject_kind: "agent_org" as const, root_run_id: "org-1", created_at: "2026-10-01T00:00:00Z", archived_at: null,
      is_active: false, summary: "", org: {} as never, closed_task_executions: [] };
    const project = linkSet([
      [createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: "team-host" }), true],
      [createRootExecutionIdentity({ rootSubjectKind: "agent_org", rootRunId: "org-1" }), true],
    ], [[key("agent_org", "org-1"), [{ agentRunId: "org-copy" }]]]);
    const service = new ProjectRunHistoryService({
      orgs: { getAgentOrg: async (id) => (id === "org-1" ? orgItem : null) },
      agentRuns: agentHistory([]),
      teamRuns: teamHistory([teamRow("team-started", "P"), teamRow("team-host"), teamRow("team-elsewhere")]),
      runLinks: { runLinksOf: async (projectId) => (projectId === "P" ? project : linkSet([], [])) },
    });
    const history = await service.projectRunHistory("P");
    expect(history.teamDefinitions[0]!.runs.map((run) => run.teamRunId)).toEqual(["team-started", "team-host"]);
    expect(history.agentOrgRuns.map((item) => item.root_run_id)).toEqual(["org-1"]);
    expect(history.scopes).toEqual([
      { rootKind: "AGENT_TEAM", rootRunId: "team-started", executions: [] },
      { rootKind: "AGENT_TEAM", rootRunId: "team-host", executions: [] },
      { rootKind: "AGENT_ORG", rootRunId: "org-1", executions: [{ agentRunId: "org-copy" }] },
    ]);
  });

  it("refuses an unknown Project with PROJECT_NOT_FOUND", async () => {
    const service = new ProjectRunHistoryService({
      orgs: { getAgentOrg: async () => null }, agentRuns: agentHistory([]), teamRuns: teamHistory([]),
      runLinks: { runLinksOf: async () => linkSet([], []) },
    });
    await expect(service.projectRunHistory("missing")).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
  });
});
