import { testViewStreams } from "../../helpers/view-streams.js";
import { teamMembershipTestCollaborators } from "../../helpers/team-membership-test-collaborators.js";
import { NOT_DELEGATED } from "../../helpers/run-collaboration.js";
import { noDelegations, openTaskRecords } from "../../helpers/no-delegations.js";
/**
 * A Team run started under a Project (projects-left-navigation, SR-009, DS-002): `AgentTeamRunManager.createTeamRun`
 * records the start with the team run id through `RunProjectStarts` before the execution tree is built or written;
 * a refused start (`PROJECT_NOT_FOUND`) creates nothing; a Team started without a Project records nothing.
 * Run: pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/agent-team-run-manager-project-start.test.ts --no-watch
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { MemberExecutionContextBuilder } from "../../../src/agent-team-execution/services/member-team-context-builder.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { configureRunProjects } from "../../../src/agent-execution/domain/run-project-context.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";
import { NO_PEER_CHANNEL, NO_REMOTE_FILES, OFFERED_MODEL_EXECUTION_FACTORY } from "../../helpers/explicit-host-collaborators.js";

const createManager = (write: ReturnType<typeof vi.fn>) => new AgentTeamRunManager({ ...teamMembershipTestCollaborators(), remoteChannel: NO_PEER_CHANNEL, receivedFiles: NO_REMOTE_FILES.received, delegationIndex: noDelegations(), viewStreams: testViewStreams(), taskRecords: openTaskRecords(),
  memoryDir: "/tmp/agent-team-run-manager-project-start",
  flatTeamExecutionFactory: new FlatTeamExecutionFactory({ executionFactory: OFFERED_MODEL_EXECUTION_FACTORY }),
  memberExecutionContextBuilder: new MemberExecutionContextBuilder({ getDefinitionById: async () => null } as never, NOT_DELEGATED),
  modelSelectionValidator: { validateMany: async () => [], validate: async ({ selection }: never) => ({ kind: "valid" as const, selection }) } as never,
  activeRootDirectory: new ActiveCollaborationRootDirectory(),
  executionTreeStore: { write, read: vi.fn(async () => null) } as never,
});

const config = () => testTeamRunConfig({ children: [testAgentNode("/lead")], coordinatorAddress: "/lead", rootTeamRunId: "team-run-p" });

describe("AgentTeamRunManager.createTeamRun under a Project", () => {
  let binding: { close(): void } | null = null;
  afterEach(() => { binding?.close(); binding = null; });

  it("refuses an unknown Project before any tree is written", async () => {
    const write = vi.fn(async () => ({ outcome: "committed" }));
    binding = configureRunProjects({
      recordStart: vi.fn(async () => { throw Object.assign(new Error("Project 'missing' was not found."), { code: "PROJECT_NOT_FOUND" }); }),
      contextOfRun: async () => null,
    });
    await expect(createManager(write).createTeamRun({ config: config(), teamDefinitionName: "Team", projectId: "missing" }))
      .rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
    expect(write).not.toHaveBeenCalled();
  });

  it("records the start with the team run id first; a Team without a Project records nothing", async () => {
    const order: string[] = [];
    const write = vi.fn(async () => { order.push("tree"); throw new Error("stop after the tree write"); });
    const recordStart = vi.fn(async () => { order.push("start"); });
    binding = configureRunProjects({ recordStart, contextOfRun: async () => null });
    await createManager(write).createTeamRun({ config: config(), teamDefinitionName: "Team", projectId: "P" }).catch(() => undefined);
    expect(recordStart).toHaveBeenCalledWith("P", { kind: "agent_team", runId: "team-run-p" });
    expect(order[0]).toBe("start");
    recordStart.mockClear();
    await createManager(write).createTeamRun({ config: config(), teamDefinitionName: "Team" }).catch(() => undefined);
    expect(recordStart).not.toHaveBeenCalled();
  });
});
