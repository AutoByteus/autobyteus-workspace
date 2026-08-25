import type { ApplicationAgentBindingRecord } from "../../../src/application-orchestration/domain/models.js";
import { ApplicationOrchestrationHostService } from "../../../src/application-orchestration/services/application-orchestration-host-service.js";
import { RootTeamRun } from "../../../src/agent-team-execution/domain/root-team-run.js";
import { buildInitialTeamRunExecutionTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { TeamRunEventPublisher } from "../../../src/agent-team-execution/services/team-run-event-publisher.js";
import { describe, expect, it, vi } from "vitest";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const applicationId = "app-1";
const bindingId = "binding-1";
const teamRunId = "team-run-1";
const researcherAgentRunId = "researcher-member-run-1";

const buildTeamBinding = (): ApplicationAgentBindingRecord => ({
  bindingId,
  applicationId,
  launchRequestId: "launch-request-1",
  status: "ATTACHED",
  executionResourceRef: {
    source: "bundle",
    kind: "AGENT_TEAM",
    localId: "brief-studio-team",
  },
  runtime: {
    subject: "TEAM_RUN",
    teamRunId,
    definitionId: "team-def-1",
    members: [{
      memberAddress: "/Researcher",
      displayName: "Researcher",
      agentRunId: researcherAgentRunId,
      runtimeKind: "AGENT_TEAM_MEMBER",
    }],
  },
  createdAt: "2026-04-19T09:10:00.000Z",
  updatedAt: "2026-04-19T09:10:00.000Z",
  terminatedAt: null,
  lastErrorMessage: null,
});

const buildRootTeamRuntime = () => {
  const researcher = testAgentNode("/Researcher", {
    agentRunId: researcherAgentRunId,
  });
  const config = testTeamRunConfig({
    rootTeamRunId: teamRunId,
    coordinatorAddress: researcher.address,
    children: [researcher],
  });
  const tree = buildInitialTeamRunExecutionTree({
    config,
    teamDefinitionName: "Application input test team",
    createdAt: "2026-04-19T09:10:00.000Z",
  });
  const executeDirectAgentCommand = vi.fn(async () => ({ accepted: true as const }));
  const root = new RootTeamRun({
    rootRun: {
      teamRunId,
      isActive: vi.fn(() => true),
      isTerminated: vi.fn(() => false),
      hasOpenExecutionWork: vi.fn(() => false),
      getLeafAgentStatusSnapshots: vi.fn(() => []),
      executeDirectAgentCommand,
    } as never,
    config,
    tree,
    tasks: Object.freeze({
      schemaVersion: 1,
      rootTeamRunId: teamRunId,
      records: Object.freeze([]),
    }),
    messages: Object.freeze({
      schemaVersion: 1,
      rootTeamRunId: teamRunId,
      messages: Object.freeze([]),
    }),
    persistence: {
      commitTaskMutation: vi.fn(),
      commitTaskSettlement: vi.fn(),
      commitReservedMessageAppend: vi.fn(),
      commitExecutionTreeMutation: vi.fn(),
      readConsistent: vi.fn(),
      enterRootFailStop: vi.fn(),
    } as never,
    publisher: new TeamRunEventPublisher(),
  });
  return { root, executeDirectAgentCommand };
};

const buildHost = (
  binding: ApplicationAgentBindingRecord,
  root: RootTeamRun,
  resolveActiveTeamRun = vi.fn(async () => root),
) => ({
  host: new ApplicationOrchestrationHostService({
    startupGate: {
      awaitReady: vi.fn(async () => undefined),
    } as never,
    availabilityService: {
      requireApplicationActive: vi.fn(async () => undefined),
    } as never,
    runBindingLaunchService: {
      startAgentTeamRunBinding: vi.fn(async () => structuredClone(binding)),
    } as never,
    bindingStore: {
      getBinding: vi.fn(async () => structuredClone(binding)),
    } as never,
    runObserverService: {
      attachBinding: vi.fn(async () => true),
    } as never,
    teamRunService: {
      resolveActiveTeamRun,
    } as never,
    agentTargetAuthorizationService: {
      authorizeTarget: vi.fn(async (_nextApplicationId, address) => ({
        applicationId,
        address,
        runtimeSubject: "TEAM_RUN",
        runtimeRunId: teamRunId,
        producers: [],
      })),
    } as never,
  }),
  resolveActiveTeamRun,
});

const expectPostMessageDispatch = (
  executeDirectAgentCommand: ReturnType<typeof vi.fn>,
  content: string,
) => {
  expect(executeDirectAgentCommand).toHaveBeenCalledWith(
    researcherAgentRunId,
    expect.objectContaining({
      kind: "post_message",
      message: expect.objectContaining({ content }),
    }),
  );
};

describe("application team input RootTeamRun dispatch", () => {
  it("forwards an authorized exact-member address as the bound agentRunId", async () => {
    const binding = buildTeamBinding();
    const { root, executeDirectAgentCommand } = buildRootTeamRuntime();
    const { host } = buildHost(binding, root);

    await host.sendRunInput(applicationId, {
      address: {
        bindingId,
        target: { kind: "AGENT_TEAM_MEMBER", agentRunId: researcherAgentRunId },
      },
      input: { text: "please research" },
    });

    expectPostMessageDispatch(executeDirectAgentCommand, "please research");
  });

  it("resolves initial targetMemberAddress through the binding before exact root dispatch", async () => {
    const binding = buildTeamBinding();
    const { root, executeDirectAgentCommand } = buildRootTeamRuntime();
    const { host } = buildHost(binding, root);

    await host.startAgentTeam(applicationId, {
      launchRequestId: binding.launchRequestId,
      executionResourceRef: binding.executionResourceRef,
      launch: {
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        teamConfigs: [],
        memberConfigs: [],
      },
      initialInput: {
        text: "begin research",
        targetMemberAddress: "/Researcher",
      },
    });

    expectPostMessageDispatch(executeDirectAgentCommand, "begin research");
  });

  it("rejects an unknown initial targetMemberAddress before root lookup", async () => {
    const binding = buildTeamBinding();
    const { root, executeDirectAgentCommand } = buildRootTeamRuntime();
    const resolveActiveTeamRun = vi.fn(async () => root);
    const { host } = buildHost(binding, root, resolveActiveTeamRun);

    await expect(host.startAgentTeam(applicationId, {
      launchRequestId: binding.launchRequestId,
      executionResourceRef: binding.executionResourceRef,
      launch: {
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        teamConfigs: [],
        memberConfigs: [],
      },
      initialInput: {
        text: "begin research",
        targetMemberAddress: "/Missing",
      },
    })).rejects.toThrow("Application runtime input target does not belong to the bound team runtime");

    expect(resolveActiveTeamRun).not.toHaveBeenCalled();
    expect(executeDirectAgentCommand).not.toHaveBeenCalled();
  });

  it("rejects an addressed agentRunId outside the bound team before root lookup", async () => {
    const binding = buildTeamBinding();
    const { root, executeDirectAgentCommand } = buildRootTeamRuntime();
    const resolveActiveTeamRun = vi.fn(async () => root);
    const { host } = buildHost(binding, root, resolveActiveTeamRun);

    await expect(host.sendRunInput(applicationId, {
      address: {
        bindingId,
        target: { kind: "AGENT_TEAM_MEMBER", agentRunId: "unknown-member-run" },
      },
      input: { text: "please research" },
    })).rejects.toThrow("Application agent input target does not belong to the bound team runtime");

    expect(resolveActiveTeamRun).not.toHaveBeenCalled();
    expect(executeDirectAgentCommand).not.toHaveBeenCalled();
  });
});
