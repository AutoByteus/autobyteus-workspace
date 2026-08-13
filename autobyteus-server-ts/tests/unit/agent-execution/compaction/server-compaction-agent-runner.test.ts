import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { CompactionAgentRunnerError } from "autobyteus-ts/memory/compaction/compaction-agent-runner.js";
import { ServerCompactionAgentRunner } from "../../../../src/agent-execution/compaction/server-compaction-agent-runner.js";
import { CompactionRunOutputCollector } from "../../../../src/agent-execution/compaction/compaction-run-output-collector.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../../src/agent-execution/domain/agent-run-event.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunInputOptions } from "../../../../src/agent-execution/input/agent-run-input-contract.js";

const createEvent = (
  eventType: AgentRunEventType,
  payload: Record<string, unknown> = {},
  statusHint: AgentRunEvent["statusHint"] = null,
): AgentRunEvent => ({
  eventType,
  runId: "compaction-run-1",
  payload,
  statusHint,
});

class FakeRun {
  readonly runId = "compaction-run-1";
  readonly emittedEvents: AgentRunEvent[];
  readonly listeners = new Set<(event: unknown) => void>();
  subscriptionCount = 0;
  unsubscriptionCount = 0;
  postedMessage: AgentInputUserMessage | null = null;

  constructor(events: AgentRunEvent[]) {
    this.emittedEvents = events;
  }

  subscribeToEvents(listener: (event: unknown) => void) {
    this.subscriptionCount += 1;
    this.listeners.add(listener);
    let active = true;
    return () => {
      if (!active) {
        return;
      }
      active = false;
      this.unsubscriptionCount += 1;
      this.listeners.delete(listener);
    };
  }

  async postUserMessage(
    message: AgentInputUserMessage,
    options: AgentRunInputOptions = {},
  ) {
    this.postedMessage = message;
    options.lifecycleObserver?.({ kind: "admitted" });
    options.lifecycleObserver?.({
      kind: "forwarded",
      dispatchKind: "start_turn",
      turnId: "turn-1",
    });
    for (const event of this.emittedEvents) {
      for (const listener of this.listeners) {
        listener(event);
      }
    }
    return { accepted: true, turnId: "turn-1" };
  }
}

const createService = (run: FakeRun) => ({
  createAgentRun: vi.fn(async (_input: unknown) => ({ runId: run.runId })),
  getAgentRun: vi.fn(() => run),
  recordRunActivity: vi.fn(async () => undefined),
  terminateAgentRun: vi.fn(async () => ({
    success: true,
    message: "terminated",
    route: "native",
    runtimeKind: RuntimeKind.AUTOBYTEUS,
  })),
});

const parentLaunchFallback = {
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  llmModelIdentifier: "parent-model",
  sourceAgentDefinitionId: "parent-agent",
};

const createLaunchResolver = () => ({
  resolve: vi.fn(async () => ({
    agentDefinitionId: "autobyteus-memory-compactor",
    agentName: "Memory Compactor",
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    llmModelIdentifier: "codex:gpt-5",
    provider: "openai",
    llmConfig: { reasoning_effort: "medium" },
    skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  })),
});

describe("ServerCompactionAgentRunner", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    {
      name: "the omitted five-minute default",
      timeoutMs: undefined,
      expectedTimeoutMs: 300_000,
    },
    {
      name: "an explicit short override",
      timeoutMs: 17,
      expectedTimeoutMs: 17,
    },
  ])(
    "passes $name to output collection and preserves timeout cleanup",
    async ({ timeoutMs, expectedTimeoutMs }) => {
      const run = new FakeRun([]);
      const agentRunService = createService(run);
      const launchResolver = createLaunchResolver();
      const waitForFinalOutput = vi.spyOn(
        CompactionRunOutputCollector.prototype,
        "waitForFinalOutput",
      ).mockImplementation(async (observedTimeoutMs: number) => {
        throw new Error(
          `Compactor agent run '${run.runId}' timed out after ${observedTimeoutMs}ms before returning final JSON.`,
        );
      });
      const runner = new ServerCompactionAgentRunner({
        launchResolver: launchResolver as any,
        agentRunService: agentRunService as any,
        workspaceRootPath: "/tmp/workspace",
        parentLaunchFallback,
        ...(timeoutMs === undefined ? {} : { timeoutMs }),
      });

      await expect(
        runner.runCompactionTask({
          taskId: "task-timeout-contract",
          prompt: "compact this",
          blockCount: 1,
          traceCount: 1,
        }),
      ).rejects.toMatchObject({
        name: "CompactionAgentRunnerError",
        message: expect.stringMatching(
          new RegExp(`timed out after ${expectedTimeoutMs}ms`),
        ),
        compactionMetadata: {
          compactionAgentDefinitionId: "autobyteus-memory-compactor",
          compactionAgentName: "Memory Compactor",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          modelIdentifier: "codex:gpt-5",
          provider: "openai",
          compactionRunId: "compaction-run-1",
          taskId: "task-timeout-contract",
        },
      });

      expect(waitForFinalOutput).toHaveBeenCalledOnce();
      expect(waitForFinalOutput).toHaveBeenCalledWith(expectedTimeoutMs);
      expect(run.subscriptionCount).toBe(1);
      expect(run.unsubscriptionCount).toBe(1);
      expect(run.listeners.size).toBe(0);
      expect(agentRunService.terminateAgentRun).toHaveBeenCalledOnce();
      expect(agentRunService.terminateAgentRun).toHaveBeenCalledWith(run.runId);
    },
  );

  it("creates a normal visible run, posts one task, collects output, and terminates", async () => {
    const run = new FakeRun([
      createEvent(AgentRunEventType.SEGMENT_CONTENT, {
        id: "message-1",
        turn_id: "turn-1",
        segment_type: "text",
        delta: '{"episodes":[{"summary":"ok"}]}',
      }),
      createEvent(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-1" }, "IDLE"),
    ]);
    const agentRunService = createService(run);
    const launchResolver = createLaunchResolver();
    const runner = new ServerCompactionAgentRunner({
      launchResolver: launchResolver as any,
      agentRunService: agentRunService as any,
      workspaceRootPath: "/tmp/workspace",
      parentLaunchFallback,
      timeoutMs: 1_000,
    });

    const result = await runner.runCompactionTask({
      taskId: "task-1",
      parentAgentId: "parent-run-1",
      parentTurnId: "parent-turn-1",
      prompt: "compact this",
      blockCount: 2,
      traceCount: 7,
    });

    expect(agentRunService.createAgentRun).toHaveBeenCalledWith({
      agentDefinitionId: "autobyteus-memory-compactor",
      workspaceRootPath: "/tmp/workspace",
      llmModelIdentifier: "codex:gpt-5",
      autoExecuteTools: false,
      llmConfig: { reasoning_effort: "medium" },
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      });
    expect(launchResolver.resolve).toHaveBeenCalledWith(parentLaunchFallback);
    expect(run.postedMessage).toBeInstanceOf(AgentInputUserMessage);
    expect(run.postedMessage).toMatchObject({
      content: "compact this",
      senderType: SenderType.USER,
      metadata: {
        compaction_task_id: "task-1",
        compaction_parent_agent_id: "parent-run-1",
        compaction_parent_turn_id: "parent-turn-1",
        compaction_block_count: 2,
        compaction_trace_count: 7,
      },
    });
    expect(result).toEqual({
      outputText: '{"episodes":[{"summary":"ok"}]}',
      metadata: {
        compactionAgentDefinitionId: "autobyteus-memory-compactor",
        compactionAgentName: "Memory Compactor",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        modelIdentifier: "codex:gpt-5",
        provider: "openai",
        compactionRunId: "compaction-run-1",
        taskId: "task-1",
      },
    });
    expect(agentRunService.recordRunActivity).toHaveBeenCalled();
    expect(agentRunService.terminateAgentRun).toHaveBeenCalledWith("compaction-run-1");
  });

  it("terminates the visible run when output collection fails", async () => {
    const run = new FakeRun([
      createEvent(AgentRunEventType.TOOL_APPROVAL_REQUESTED, { tool_name: "run_bash" }),
    ]);
    const agentRunService = createService(run);
    const launchResolver = createLaunchResolver();
    const runner = new ServerCompactionAgentRunner({
      launchResolver: launchResolver as any,
      agentRunService: agentRunService as any,
      workspaceRootPath: "/tmp/workspace",
      parentLaunchFallback,
      timeoutMs: 1_000,
    });

    let caught: unknown = null;
    try {
      await runner.runCompactionTask({
        taskId: "task-1",
        prompt: "compact this",
        blockCount: 1,
        traceCount: 1,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CompactionAgentRunnerError);
    expect(caught).toMatchObject({
      message: expect.stringMatching(/requested tool approval/),
      compactionMetadata: {
        compactionAgentDefinitionId: "autobyteus-memory-compactor",
        compactionRunId: "compaction-run-1",
        taskId: "task-1",
      },
    });
    expect(agentRunService.terminateAgentRun).toHaveBeenCalledWith("compaction-run-1");
  });

  it.each([
    {
      name: "runtime error event",
      events: [
        createEvent(AgentRunEventType.ERROR, {
          message: "provider exploded",
          error_scope: "runtime",
          error_effect: "terminal",
        }, "ERROR"),
        createEvent(AgentRunEventType.AGENT_STATUS, {
          status: "ERROR",
        }, "ERROR"),
      ],
      timeoutMs: 1_000,
      expectedMessage: /provider exploded/,
    },
    {
      name: "completed run with no assistant output",
      events: [
        createEvent(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-1" }, "IDLE"),
      ],
      timeoutMs: 1_000,
      expectedMessage: /without a final assistant output/,
    },
    {
      name: "timeout before final output",
      events: [],
      timeoutMs: 10,
      expectedMessage: /timed out after 10ms/,
    },
  ])(
    "records activity and terminates the visible run after $name",
    async ({ events, timeoutMs, expectedMessage }) => {
      const run = new FakeRun(events);
      const agentRunService = createService(run);
      const launchResolver = createLaunchResolver();
      const runner = new ServerCompactionAgentRunner({
        launchResolver: launchResolver as any,
        agentRunService: agentRunService as any,
        workspaceRootPath: "/tmp/workspace",
        parentLaunchFallback,
        timeoutMs,
      });

      await expect(
        runner.runCompactionTask({
          taskId: "task-1",
          prompt: "compact this",
          blockCount: 1,
          traceCount: 1,
        }),
      ).rejects.toMatchObject({
        name: "CompactionAgentRunnerError",
        message: expect.stringMatching(expectedMessage),
        compactionMetadata: {
          compactionAgentDefinitionId: "autobyteus-memory-compactor",
          compactionRunId: "compaction-run-1",
          taskId: "task-1",
        },
      });

      expect(agentRunService.recordRunActivity).toHaveBeenCalledWith(
        run,
        expect.objectContaining({
          summary: "Memory compaction task task-1",
        }),
      );
      expect(agentRunService.terminateAgentRun).toHaveBeenCalledWith("compaction-run-1");
    },
  );

});
