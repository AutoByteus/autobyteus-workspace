import { vi } from "vitest";
import { ConfiguredAgentExecutionFactory } from "../../../../src/agent-collaboration/execution/backends/configured-agent-execution-factory.js";
import type { ConfiguredAgentExecutionHandle } from "../../../../src/agent-collaboration/execution/backends/configured-agent-execution-handle.js";
import { createCollaborationAgentStatusSnapshot } from "../../../../src/agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentApiStatus } from "../../../../src/agent-execution/domain/agent-status-payload.js";
import { testAgentNode, testAgentTeamNode } from "../../../fixtures/current-team-run-fixtures.js";

export const taskTeamNode = (id: string) => testAgentTeamNode({
  address: "/target", teamRunId: id, coordinatorAddress: "/target/lead",
  children: [testAgentNode("/target/lead", { agentRunId: `${id}-lead` })],
});

/** Provider/Agent execution double only; Org registries, flat/recursive factories and task owners stay real. */
export const observeConfiguredHandles = (activationFailure?: Error) => {
  const build = (input: Parameters<ConfiguredAgentExecutionFactory["create"]>[0]) => {
    let status: AgentApiStatus = "offline";
    const snapshot = () => createCollaborationAgentStatusSnapshot({ execution: input.identity, status });
    const emit = (next: AgentApiStatus) => {
      status = next;
      input.callbacks.publishAgentEvent(input.identity, { kind: "status_overlay", snapshot: snapshot() });
    };
    const finish = vi.fn(async () => {
      status = "offline";
      input.callbacks.publishAgentEvent(input.identity, { kind: "agent_run", event: {
        eventType: AgentRunEventType.AGENT_STATUS, runId: input.identity.agentRunId,
        payload: { status: "offline" }, statusHint: "IDLE",
      } });
      return { accepted: true as const };
    });
    const cancel = vi.fn();
    const commit = vi.fn(() => ({ finish }));
    const prepare = () => ({ cancel, commit });
    const handle = {
      identity: input.identity,
      physicalScope: input.physicalScope,
      isActive: () => true,
      hasOpenExecutionWork: () => status === "running" || status === "initializing",
      getStatusSnapshot: snapshot,
      prepareConfiguredActivation: vi.fn(async () => {
        emit("initializing");
        if (activationFailure) throw activationFailure;
        return {
          stagedPlatformBindings: [], stagedNoConversationBindingReplacements: [],
          commitAfterDurability: () => emit("idle"),
          abort: async () => emit("offline"),
        };
      }),
      postMessage: vi.fn(async () => { emit("running"); return { accepted: true as const }; }),
      tryPrepareTerminationIfQuiescent: vi.fn(async () => status === "running" || status === "initializing" ? null : prepare()),
      prepareTermination: vi.fn(async () => prepare()),
      terminate: finish,
      fenceForRootShutdown: vi.fn(async () => ({ accepted: true as const })),
      dispose: vi.fn(),
    };
    return { handle, input, emit, finish, cancel, commit };
  };
  const executions = new Map<string, ReturnType<typeof build>>();
  vi.spyOn(ConfiguredAgentExecutionFactory.prototype, "create").mockImplementation((input) => {
    const execution = build(input);
    executions.set(input.identity.agentRunId, execution);
    return execution.handle as unknown as ConfiguredAgentExecutionHandle;
  });
  return executions;
};

export const flushMicrotasks = () => new Promise<void>((resolve) => setImmediate(resolve));
