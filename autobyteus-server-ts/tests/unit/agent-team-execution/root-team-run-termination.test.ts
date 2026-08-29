import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { describe, expect, it, vi } from "vitest";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import type { FrozenTeamRunTerminationScope } from "../../../src/agent-team-execution/domain/frozen-team-run-termination-scope.js";
import { RootTeamRun } from "../../../src/agent-team-execution/domain/root-team-run.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { buildInitialTeamRunExecutionTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { TeamRunEventPublisher } from "../../../src/agent-team-execution/services/team-run-event-publisher.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
};

const buildRoot = (input: {
  scope: FrozenTeamRunTerminationScope;
  executeDirectAgentCommand?: ReturnType<typeof vi.fn>;
  freezeForRootTermination?: ReturnType<typeof vi.fn>;
  onTerminated?: ReturnType<typeof vi.fn>;
}) => {
  const lead = testAgentNode("/lead", { agentRunId: "lead-run" });
  const config = testTeamRunConfig({
    rootTeamRunId: "root-termination-run",
    coordinatorAddress: lead.address,
    children: [lead],
  });
  const tree = buildInitialTeamRunExecutionTree({
    config,
    teamDefinitionName: "Termination test team",
    createdAt: "2026-08-19T00:00:00.000Z",
  });
  const executeDirectAgentCommand = input.executeDirectAgentCommand ?? vi.fn(async () => ({ accepted: true as const }));
  const freezeForRootTermination = input.freezeForRootTermination ?? vi.fn(() => input.scope);
  const rootRun = {
    teamRunId: config.rootTeam.teamRunId,
    isActive: vi.fn(() => true),
    isTerminated: vi.fn(() => false),
    hasOpenExecutionWork: vi.fn(() => false),
    getLeafAgentStatusSnapshots: vi.fn(() => []),
    executeDirectAgentCommand,
    freezeForRootTermination,
  };
  const persistence = {
    drain: vi.fn(async () => undefined),
    commitTaskMutation: vi.fn(),
    commitTaskSettlement: vi.fn(),
    commitReservedMessageAppend: vi.fn(),
    commitExecutionTreeMutation: vi.fn(),
    readConsistent: vi.fn(),
    enterRootFailStop: vi.fn(),
  };
  const root = new RootTeamRun({
    rootRun: rootRun as never,
    config,
    tree,
    tasks: Object.freeze({ schemaVersion: 1, rootTeamRunId: config.rootTeam.teamRunId, records: Object.freeze([]) }),
    messages: Object.freeze({ schemaVersion: 1, rootTeamRunId: config.rootTeam.teamRunId, messages: Object.freeze([]) }),
    persistence: persistence as never,
    publisher: new TeamRunEventPublisher(),
    taskExecutionIdentity: createTaskExecutionIdentityCapabilities({
      allocateForAgentDefinition: async () => "task-agent-run",
    }),
    onTerminated: input.onTerminated,
  });
  return { root, lead, persistence, executeDirectAgentCommand, freezeForRootTermination };
};

describe("RootTeamRun termination stabilization", () => {
  it("closes admission synchronously and joins an admitted materializing command before freezing", async () => {
    const command = deferred<AgentOperationResult>();
    const order: string[] = [];
    const scope: FrozenTeamRunTerminationScope = {
      interruptActiveTurns: vi.fn(async () => { order.push("interrupt"); return { accepted: true }; }),
      prepareMemberRuns: vi.fn(async () => { order.push("prepare"); }),
      finish: vi.fn(async () => { order.push("finish"); return { accepted: true }; }),
    };
    const onTerminated = vi.fn(() => { order.push("terminated"); });
    const executeDirectAgentCommand = vi.fn(async () => {
      order.push("command-entered");
      const result = await command.promise;
      order.push("command-settled");
      return result;
    });
    const freezeForRootTermination = vi.fn(() => {
      order.push("freeze");
      return scope;
    });
    const { root, lead } = buildRoot({ scope, executeDirectAgentCommand, freezeForRootTermination, onTerminated });

    const admitted = root.executeAgentCommand(lead.agentRunId, {
      kind: "post_message",
      message: new AgentInputUserMessage("admitted before Stop"),
    });
    await vi.waitFor(() => expect(executeDirectAgentCommand).toHaveBeenCalledOnce());

    const termination = root.terminate();
    expect(root.isActive()).toBe(false);
    expect(freezeForRootTermination).not.toHaveBeenCalled();
    await expect(root.executeAgentCommand(lead.agentRunId, { kind: "interrupt" }))
      .rejects.toThrow("not accepting materializing operations");

    command.resolve({ accepted: true });
    await expect(admitted).resolves.toEqual({ accepted: true });
    await expect(termination).resolves.toEqual({ accepted: true });

    expect(order).toEqual([
      "command-entered",
      "command-settled",
      "freeze",
      "interrupt",
      "prepare",
      "finish",
      "terminated",
    ]);
    expect(freezeForRootTermination).toHaveBeenCalledOnce();
    expect(onTerminated).toHaveBeenCalledOnce();
  });

  it("retains one frozen scope and retries it after a nonterminal descendant result", async () => {
    const onTerminated = vi.fn();
    const finish = vi.fn()
      .mockResolvedValueOnce({ accepted: false, code: "DESCENDANT_BUSY" })
      .mockResolvedValueOnce({ accepted: true });
    const scope: FrozenTeamRunTerminationScope = {
      interruptActiveTurns: vi.fn(async () => ({ accepted: true })),
      prepareMemberRuns: vi.fn(async () => undefined),
      finish,
    };
    const { root, freezeForRootTermination } = buildRoot({ scope, onTerminated });

    await expect(root.terminate()).resolves.toEqual({ accepted: false, code: "DESCENDANT_BUSY" });
    expect(onTerminated).not.toHaveBeenCalled();
    await expect(root.terminate()).resolves.toEqual({ accepted: true });

    expect(freezeForRootTermination).toHaveBeenCalledOnce();
    expect(scope.interruptActiveTurns).toHaveBeenCalledTimes(2);
    expect(scope.prepareMemberRuns).toHaveBeenCalledTimes(2);
    expect(finish).toHaveBeenCalledTimes(2);
    expect(onTerminated).toHaveBeenCalledOnce();
  });
});
