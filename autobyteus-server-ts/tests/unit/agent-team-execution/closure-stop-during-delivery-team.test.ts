import { testViewStreams } from "../../helpers/view-streams.js";
import { NOT_DELEGATED } from "../../helpers/run-collaboration.js";
import { NO_RUN_PARTS } from "../../helpers/run-agents-reader.js";
import { noDelegations, openTaskRecords } from "../../helpers/no-delegations.js";
import { describe, expect, it, vi } from "vitest";
import type { RootTeamRun } from "../../../src/agent-team-execution/domain/root-team-run.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { MemberExecutionContextBuilder } from "../../../src/agent-team-execution/services/member-team-context-builder.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { TaskDelegation } from "../../../src/agent-collaboration/execution/task/task-delegation.js";
import { DelegationIndex } from "../../../src/agent-collaboration/delegation/delegation-index.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { createCollaborationRootResolver } from "../../../src/compositions/collaboration-root-resolver.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
import { NO_PEER_CHANNEL, OFFERED_MODEL_EXECUTION_FACTORY } from "../../helpers/explicit-host-collaborators.js";

/**
 * autobyteus-461 CR-461-001 (residual), team run: DONE(A) closes the team run's last Task and its stop begins; the
 * assigner's follow-up Task B commits while the team still stops. The work's delivery is not refused by the ending root's
 * closed gate: it waits for the end, the team run is restored, and it takes B's work (`delegated: true`).
 */
const restored = vi.hoisted(() => [] as Array<{ acceptFromRun: ReturnType<typeof vi.fn> }>);
vi.mock("../../../src/run-history/services/team-run-package-catalog.js", () => ({
  TeamRunPackageCatalog: class { admit = async () => undefined; awaitReady = async () => undefined; isAdmitted = () => true; },
}));
vi.mock("../../../src/run-history/services/team-run-state-package-loader.js", () => ({
  TeamRunStatePackageLoader: class { async load() { return { loaded: true, state: { executionTree: {}, communicationMessages: {} } }; } },
}));
vi.mock("../../../src/agent-team-execution/services/team-run-execution-tree-builder.js", async (importOriginal) => ({
  ...(await importOriginal<object>()), buildTeamRunConfigFromExecutionTree: () => ({}),
}));
vi.mock("../../../src/agent-team-execution/services/team-root-materializer.js", () => ({
  materializeTeamRoot: vi.fn(async () => {
    const root = { teamRunId: "eng", isActive: () => true, hasAgentExecution: vi.fn(() => true), deliverExactAgentMessage: vi.fn(),
      terminate: vi.fn(async () => ({ accepted: true })), acceptFromRun: vi.fn(async () => ({ accepted: true })) };
    restored.push(root);
    return root;
  }),
}));

const M = createAgentRootExecutionIdentity("manager-run");
const run = { teamRunId: "eng" };
const flush = async () => { for (let i = 0; i < 20; i += 1) await new Promise((resolve) => setTimeout(resolve, 0)); };

describe("a closure stop and a follow-up Task delivered while the team run stops", () => {
  it("waits for the end, restores the team run and delivers B's work; the ending root is never given the work", async () => {
    const tasks = new InMemoryTaskExecutionResources();
    const tree = new DelegationIndex(() => tasks, NO_RUN_PARTS);
    tree.build(); tasks.setEntriesListener(tree);
    tasks.addTask("A", "First", "task-a"); tasks.addTask("B", "Second", "task-b");
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "A", recipientAddress: "/eng", teamCoordinatorAgentRunId: "lead",
      delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager-run" }, execution: run });
    await tasks.markStarted(run);
    const manager = new AgentTeamRunManager({ remoteChannel: NO_PEER_CHANNEL, delegationIndex: noDelegations(), viewStreams: testViewStreams(), taskRecords: openTaskRecords(),
      memoryDir: "/tmp/closure-stop-during-delivery-team",
      flatTeamExecutionFactory: new FlatTeamExecutionFactory({ executionFactory: OFFERED_MODEL_EXECUTION_FACTORY }),
      memberExecutionContextBuilder: new MemberExecutionContextBuilder({ getDefinitionById: async () => null } as never, NOT_DELEGATED),
      modelSelectionValidator: { validateMany: async () => [], validate: async () => ({ kind: "valid" as const }) } as never,
      activeRootDirectory: new ActiveCollaborationRootDirectory(),
    });
    // The running team root: `terminate` closes its gate at once (inactive), and its end is held.
    let active = true, release!: () => void, termination: Promise<{ accepted: boolean }> | null = null;
    const ending = { teamRunId: "eng", isActive: () => active, hasAgentExecution: vi.fn(() => true), deliverExactAgentMessage: vi.fn(),
      acceptFromRun: vi.fn(async () => ({ accepted: false, code: "ROOT_OPERATION_GATE_CLOSED" })),
      // As the real root: the gate closes at the call, and every call gets the same termination.
      terminate: vi.fn(() => { active = false; return termination ??= new Promise((resolve) => { release = () => resolve({ accepted: true }); }); }) };
    (manager as unknown as { register(root: RootTeamRun): void }).register(ending as unknown as RootTeamRun);
    const resolver = createCollaborationRootResolver({ standaloneRoots: {} as never, teamRuns: manager, orgRuns: {} as never });
    const delegation = new TaskDelegation({ tasks: () => tasks, tree: () => tree, starter: {} as never, deliverWorkPacket: vi.fn(), discard: vi.fn(),
      channel: () => null, recordCollaborating: vi.fn(async () => undefined), reachingAddress: async () => null, ownDelegations: { of: async () => null }, delegatorCatalog: { placementAt: async () => null }, conversationOf: async () => ({ entryAddress: "/entry", activity: { kind: "present" as const } }),
      deliverToRun: async (input) => {
        const resolved = await resolver.resolveOrRestore(createTeamRootExecutionIdentity("eng"));
        return (resolved!.root as unknown as { acceptFromRun(input: unknown): Promise<{ accepted: boolean }> }).acceptFromRun(input);
      } });

    tasks.close("A");
    const stopping = manager.terminateTeamRunForTaskClosure("eng", () => !tasks.isOpen(run));
    await flush();
    const assigning = delegation.toExistingRun({ sender: createCollaborationMemberExecutionIdentity({ root: M, memberAddress: "/manager" as never, agentRunId: "manager-run" }),
      senderRun: M, assign: { delegatedRun: run as never, taskId: "task-b" } });
    await flush();
    expect(restored).toHaveLength(0);
    release();
    await expect(stopping).resolves.toBe("stopped");
    await expect(assigning).resolves.toMatchObject({ delegated: true });
    expect(ending.acceptFromRun).not.toHaveBeenCalled();
    expect(restored).toHaveLength(1);
    expect(restored[0]!.acceptFromRun).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("task-b") }));
    expect(manager.getActiveTeamRun("eng")).toBe(restored[0]);
    expect(tasks.entry(run)).toMatchObject({ taskId: "B", open: true, start: "started" });
  });
});
