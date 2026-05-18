import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunEventPipeline } from "../../../../src/agent-execution/events/agent-run-event-pipeline.js";
import { LifecycleStatusEventProcessor } from "../../../../src/agent-execution/events/processors/lifecycle-status/lifecycle-status-event-processor.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const runContext = new AgentRunContext({
  runId: "run-1",
  config: new AgentRunConfig({
    agentDefinitionId: "agent-1",
    llmModelIdentifier: "test-model",
    autoExecuteTools: false,
    workspaceId: null,
    memoryDir: null,
    skillAccessMode: SkillAccessMode.NONE,
    runtimeKind: RuntimeKind.AUTOBYTEUS,
  }),
  runtimeContext: null,
});

describe("LifecycleStatusEventProcessor", () => {
  it("publishes a backend-authored running status with recovered live activity after a lifecycle error", async () => {
    const pipeline = new AgentRunEventPipeline([
      new LifecycleStatusEventProcessor(),
    ]);

    await pipeline.process({
      runContext,
      events: [{
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: "run-1",
        payload: {
          status: "error",
          can_interrupt: false,
        },
        statusHint: "ERROR",
      }],
    });

    const processed = await pipeline.process({
      runContext,
      events: [{
        eventType: AgentRunEventType.SEGMENT_START,
        runId: "run-1",
        payload: {
          id: "segment-1",
          turn_id: "turn-1",
          segment_type: "text",
        },
        statusHint: null,
      }],
    });

    expect(processed.map((event) => event.eventType)).toEqual([
      AgentRunEventType.SEGMENT_START,
      AgentRunEventType.AGENT_STATUS,
    ]);
    expect(processed[1]).toMatchObject({
      eventType: AgentRunEventType.AGENT_STATUS,
      runId: "run-1",
      payload: {
        status: "running",
        can_interrupt: false,
        agent_id: "run-1",
      },
      statusHint: "ACTIVE",
    });
  });

  it("does not duplicate explicit lifecycle status events", async () => {
    const pipeline = new AgentRunEventPipeline([
      new LifecycleStatusEventProcessor(),
    ]);

    const processed = await pipeline.process({
      runContext,
      events: [{
        eventType: AgentRunEventType.TURN_STARTED,
        runId: "run-1",
        payload: { turnId: "turn-1" },
        statusHint: "ACTIVE",
      }, {
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: "run-1",
        payload: {
          status: "running",
          can_interrupt: false,
        },
        statusHint: "ACTIVE",
      }],
    });

    expect(processed.filter((event) => event.eventType === AgentRunEventType.AGENT_STATUS)).toHaveLength(1);
  });

  it("publishes running status from active lifecycle evidence when no explicit status accompanies it", async () => {
    const pipeline = new AgentRunEventPipeline([
      new LifecycleStatusEventProcessor(),
    ]);

    const processed = await pipeline.process({
      runContext,
      events: [{
        eventType: AgentRunEventType.SEGMENT_CONTENT,
        runId: "run-1",
        payload: {
          id: "segment-1",
          turn_id: "turn-1",
          delta: "hello",
        },
        statusHint: null,
      }],
    });

    expect(processed.map((event) => event.eventType)).toEqual([
      AgentRunEventType.SEGMENT_CONTENT,
      AgentRunEventType.AGENT_STATUS,
    ]);
    expect(processed[1]).toMatchObject({
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: {
        status: "running",
        can_interrupt: false,
        agent_id: "run-1",
      },
      statusHint: "ACTIVE",
    });
  });

  it("publishes idle status when active lifecycle settles without an explicit status event", async () => {
    const pipeline = new AgentRunEventPipeline([
      new LifecycleStatusEventProcessor(),
    ]);

    await pipeline.process({
      runContext,
      events: [{
        eventType: AgentRunEventType.TURN_STARTED,
        runId: "run-1",
        payload: { turn_id: "turn-1" },
        statusHint: "ACTIVE",
      }],
    });

    const processed = await pipeline.process({
      runContext,
      events: [{
        eventType: AgentRunEventType.TURN_COMPLETED,
        runId: "run-1",
        payload: { turn_id: "turn-1" },
        statusHint: "IDLE",
      }],
    });

    expect(processed.map((event) => event.eventType)).toEqual([
      AgentRunEventType.TURN_COMPLETED,
      AgentRunEventType.AGENT_STATUS,
    ]);
    expect(processed[1]).toMatchObject({
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: {
        status: "idle",
        can_interrupt: false,
        agent_id: "run-1",
      },
      statusHint: "IDLE",
    });
  });

  it("keeps lifecycle errors terminal when no later non-error activity arrives", async () => {
    const pipeline = new AgentRunEventPipeline([
      new LifecycleStatusEventProcessor(),
    ]);

    const processed = await pipeline.process({
      runContext,
      events: [{
        eventType: AgentRunEventType.ERROR,
        runId: "run-1",
        payload: {
          code: "RUNTIME_ERROR",
          message: "Runtime failed.",
        },
        statusHint: "ERROR",
      }],
    });

    expect(processed).toHaveLength(1);
    expect(processed[0].eventType).toBe(AgentRunEventType.ERROR);
  });
});
