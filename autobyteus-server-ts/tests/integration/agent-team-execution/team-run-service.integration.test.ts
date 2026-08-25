import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { buildInitialTeamRunExecutionTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { TeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const definitions = new Map<string, unknown>([
  ["classroom-team", {
    id: "classroom-team",
    name: "Classroom Team",
    coordinatorMemberName: "Teacher",
    nodes: [
      { memberName: "Teacher", refType: "agent", refScope: "shared", ref: "agent-teacher" },
      { memberName: "Observer", refType: "agent", refScope: "shared", ref: "agent-observer" },
      { memberName: "StudentStudyGroup", refType: "agent_team", refScope: "shared", ref: "student-study-group" },
    ],
    handoffs: [{ from: "/Teacher", to: "/StudentStudyGroup", rules: ["Delegate classroom exercises here."] }],
  }],
  ["student-study-group", {
    id: "student-study-group",
    name: "Student Study Group",
    coordinatorMemberName: "student_one",
    nodes: [
      { memberName: "student_one", refType: "agent", refScope: "shared", ref: "agent-student-one" },
      { memberName: "student_two", refType: "agent", refScope: "shared", ref: "agent-student-two" },
    ],
    handoffs: [{ from: "/student_one", to: "/student_two", rules: ["Ask for an independent check."] }],
  }],
]);

const launch = (
  memberAddress: string,
  runtimeKind: RuntimeKind,
  workspaceRootPath = "/tmp/classroom-workspace",
) => ({
  memberAddress,
  llmModelIdentifier: `model-${runtimeKind}`,
  autoExecuteTools: true,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind,
  workspaceRootPath,
  llmConfig: { reasoning_effort: "medium" },
});

const teamLaunch = (
  teamAddress: string,
  runtimeKind: RuntimeKind,
  workspaceRootPath = "/tmp/classroom-workspace",
) => ({
  teamAddress,
  llmModelIdentifier: `model-${runtimeKind}`,
  autoExecuteTools: true,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind,
  workspaceRootPath,
  llmConfig: { reasoning_effort: "medium" },
});

const createHarness = () => {
  let allocation = 0;
  let activeRoot: Record<string, unknown> | null = null;
  const manager = {
    getActiveTeamRun: vi.fn(() => activeRoot),
    getManagedTeamRun: vi.fn(() => activeRoot),
    hasManagedTeamRun: vi.fn(() => activeRoot !== null),
    createTeamRun: vi.fn(async ({ config, teamDefinitionName }) => {
      const tree = buildInitialTeamRunExecutionTree({ config, teamDefinitionName });
      activeRoot = {
        teamRunId: config.rootTeam.teamRunId,
        getExecutionTreeSnapshot: () => tree,
        subscribeToEvents: vi.fn(() => vi.fn()),
      };
      return activeRoot;
    }),
    restoreTeamRun: vi.fn(async (teamRunId: string) => {
      activeRoot = {
        teamRunId,
        getExecutionTreeSnapshot: () => ({
          schemaVersion: 2,
          createdAt: "2026-08-15T00:00:00.000Z",
          archivedAt: null,
          applicationBinding: null,
          handoffs: [],
          rootTeam: {
            address: "/",
            teamDefinitionId: "classroom-team",
            teamDefinitionName: "Classroom Team",
            teamRunId,
            coordinatorAddress: "/Teacher",
            defaultLaunchConfiguration: {
              runtimeKind: RuntimeKind.AUTOBYTEUS,
              llmModelIdentifier: "restored-model",
              autoExecuteTools: false,
              skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
              workspaceRootPath: null,
              llmConfig: null,
            },
            members: [],
            taskExecutions: [],
          },
        }),
        subscribeToEvents: vi.fn(() => vi.fn()),
      };
      return activeRoot;
    }),
    terminateTeamRun: vi.fn(async () => { activeRoot = null; return true; }),
    subscribeToLifecycle: vi.fn(() => vi.fn()),
  };
  const catalog = {
    recordTeamRunCreated: vi.fn(async () => undefined),
    recordTeamRunRestored: vi.fn(async () => undefined),
    recordTeamRunSummary: vi.fn(async () => undefined),
    recordTeamRunTerminated: vi.fn(async () => undefined),
  };
  const workspaceManager = {
    ensureWorkspaceByRootPath: vi.fn(async (rootPath: string) => ({ getBasePath: () => rootPath })),
  };
  const definitionService = {
    getDefinitionById: vi.fn(async (id: string) => definitions.get(id) ?? null),
  };
  const allocator = {
    allocateForAgentDefinition: vi.fn(async (definitionId: string) => `${definitionId}-run-${++allocation}`),
  };
  const teamAllocator = {
    allocateForTeamDefinitionName: vi.fn((definitionName: string) =>
      definitionName === "Classroom Team" ? "classroom-root-run" : "student-study-group-run"),
  };
  const service = new TeamRunService({
    agentTeamRunManager: manager as never,
    teamDefinitionService: definitionService as never,
    teamRunHistoryCatalogService: catalog as never,
    workspaceManager: workspaceManager as never,
    memoryDir: "/tmp/team-run-service-current-integration",
    agentRunIdentityAllocator: allocator,
    teamRunIdentityAllocator: teamAllocator,
  });
  return { service, manager, catalog, workspaceManager, allocator, teamAllocator };
};

afterEach(() => vi.clearAllMocks());

describe("TeamRunService current recursive topology integration", () => {
  it("expands one root launch configuration across every Team and exact recursive Agent address", async () => {
    const { service, manager } = createHarness();
    await service.createTeamRunFromRootConfig({
      teamDefinitionId: "classroom-team",
      rootConfig: {
        workspaceRootPath: "/tmp/classroom-workspace",
        llmModelIdentifier: "shared-model",
        autoExecuteTools: true,
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      },
    });

    const [{ config }] = manager.createTeamRun.mock.calls[0]!;
    expect(config.rootTeam).toMatchObject({
      address: "/",
      defaultLaunchConfiguration: expect.objectContaining({
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        llmModelIdentifier: "shared-model",
      }),
      children: expect.arrayContaining([
        expect.objectContaining({ address: "/Teacher", agentDefinitionId: "agent-teacher" }),
        expect.objectContaining({ address: "/Observer", agentDefinitionId: "agent-observer" }),
        expect.objectContaining({
          address: "/StudentStudyGroup",
          defaultLaunchConfiguration: expect.objectContaining({
            runtimeKind: RuntimeKind.CODEX_APP_SERVER,
            llmModelIdentifier: "shared-model",
          }),
          children: [
            expect.objectContaining({ address: "/StudentStudyGroup/student_one", agentDefinitionId: "agent-student-one" }),
            expect.objectContaining({ address: "/StudentStudyGroup/student_two", agentDefinitionId: "agent-student-two" }),
          ],
        }),
      ]),
    });
  });

  it("creates one rooted mixed-runtime recursive plan and records the current V2 execution tree", async () => {
    const { service, manager, catalog, workspaceManager } = createHarness();
    const root = await service.createTeamRun({
      teamDefinitionId: "classroom-team",
      applicationBinding: { applicationId: "classroom-app", bindingId: "binding-1" },
      teamConfigs: [
        teamLaunch("/", RuntimeKind.CODEX_APP_SERVER, "/tmp/classroom-workspace/"),
        teamLaunch("/StudentStudyGroup", RuntimeKind.AUTOBYTEUS),
      ],
      memberConfigs: [
        launch("/Teacher", RuntimeKind.CODEX_APP_SERVER, "/tmp/classroom-workspace/"),
        launch("/Observer", RuntimeKind.CLAUDE_AGENT_SDK),
        launch("/StudentStudyGroup/student_one", RuntimeKind.AUTOBYTEUS),
        launch("/StudentStudyGroup/student_two", RuntimeKind.CODEX_APP_SERVER),
      ],
    });

    expect(root).toMatchObject({ teamRunId: "classroom-root-run" });
    const [{ config, teamDefinitionName }] = manager.createTeamRun.mock.calls[0]!;
    expect(teamDefinitionName).toBe("Classroom Team");
    expect(config).toMatchObject({
      teamBackendKind: TeamBackendKind.MIXED,
      applicationBinding: { applicationId: "classroom-app", bindingId: "binding-1" },
      rootTeam: {
        address: "/",
        teamRunId: "classroom-root-run",
        coordinatorAddress: "/Teacher",
        defaultLaunchConfiguration: expect.objectContaining({
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        }),
        children: [
          { kind: "agent", address: "/Teacher", runtimeKind: RuntimeKind.CODEX_APP_SERVER },
          { kind: "agent", address: "/Observer", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK },
          {
            kind: "agent_team",
            address: "/StudentStudyGroup",
            coordinatorAddress: "/StudentStudyGroup/student_one",
            defaultLaunchConfiguration: expect.objectContaining({
              runtimeKind: RuntimeKind.AUTOBYTEUS,
            }),
            children: [
              { kind: "agent", address: "/StudentStudyGroup/student_one", runtimeKind: RuntimeKind.AUTOBYTEUS },
              { kind: "agent", address: "/StudentStudyGroup/student_two", runtimeKind: RuntimeKind.CODEX_APP_SERVER },
            ],
          },
        ],
      },
      handoffs: [
        { from: "/Teacher", to: "/StudentStudyGroup", rules: ["Delegate classroom exercises here."] },
        { from: "/StudentStudyGroup/student_one", to: "/StudentStudyGroup/student_two", rules: ["Ask for an independent check."] },
      ],
    });
    expect(workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledOnce();
    expect(workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/classroom-workspace");
    expect(catalog.recordTeamRunCreated).toHaveBeenCalledWith({
      tree: expect.objectContaining({
        schemaVersion: 2,
        rootTeam: expect.objectContaining({
          address: "/",
          teamRunId: "classroom-root-run",
          defaultLaunchConfiguration: expect.objectContaining({ runtimeKind: RuntimeKind.CODEX_APP_SERVER }),
        }),
      }),
      summary: "",
    });
    expect(JSON.stringify(catalog.recordTeamRunCreated.mock.calls[0])).not.toContain("schemaVersion\":3");
  });

  it("restores only through the strict manager package reader and refreshes the catalog from its current V2 tree", async () => {
    const { service, manager, catalog } = createHarness();
    const restored = await service.restoreTeamRun("restored-classroom-run");

    expect(restored).toMatchObject({ teamRunId: "restored-classroom-run" });
    expect(manager.restoreTeamRun).toHaveBeenCalledWith("restored-classroom-run");
    expect(catalog.recordTeamRunRestored).toHaveBeenCalledWith({
      tree: expect.objectContaining({
        schemaVersion: 2,
        rootTeam: expect.objectContaining({
          address: "/",
          teamRunId: "restored-classroom-run",
          defaultLaunchConfiguration: expect.objectContaining({ runtimeKind: RuntimeKind.AUTOBYTEUS }),
        }),
      }),
    });
  });

  it("terminates the newly materialized root if catalog creation fails", async () => {
    const { service, manager, catalog } = createHarness();
    catalog.recordTeamRunCreated.mockRejectedValueOnce(new Error("catalog unavailable"));

    await expect(service.createTeamRun({
      teamDefinitionId: "classroom-team",
      teamConfigs: [
        teamLaunch("/", RuntimeKind.AUTOBYTEUS),
        teamLaunch("/StudentStudyGroup", RuntimeKind.AUTOBYTEUS),
      ],
      memberConfigs: [
        launch("/Teacher", RuntimeKind.AUTOBYTEUS),
        launch("/Observer", RuntimeKind.AUTOBYTEUS),
        launch("/StudentStudyGroup/student_one", RuntimeKind.AUTOBYTEUS),
        launch("/StudentStudyGroup/student_two", RuntimeKind.AUTOBYTEUS),
      ],
    })).rejects.toThrow("catalog unavailable");
    expect(manager.terminateTeamRun).toHaveBeenCalledWith("classroom-root-run");
  });

  it("records terminal history only when the manager accepts root termination", async () => {
    const { service, manager, catalog } = createHarness();
    manager.terminateTeamRun.mockResolvedValueOnce(false);
    await expect(service.terminateTeamRun("missing-run")).resolves.toBe(false);
    expect(catalog.recordTeamRunTerminated).not.toHaveBeenCalled();

    manager.terminateTeamRun.mockResolvedValueOnce(true);
    await expect(service.terminateTeamRun("active-run")).resolves.toBe(true);
    expect(catalog.recordTeamRunTerminated).toHaveBeenCalledWith({ teamRunId: "active-run" });
  });
});
