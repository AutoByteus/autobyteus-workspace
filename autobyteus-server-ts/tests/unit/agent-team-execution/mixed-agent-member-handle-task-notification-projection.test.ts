import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { AgentRunBackend } from "../../../src/agent-execution/backends/agent-run-backend.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import {
  MixedAgentMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import type { TeamRunAgentNode } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import { markTaskDelegationSystemTaskNotificationMetadata } from "../../../src/agent-team-execution/task-delegation/task-delegation-system-message-visibility.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

class FakeAgentRunBackend implements AgentRunBackend {
  readonly runId = "worker-run-1";
  readonly runtimeKind: RuntimeKind;
  readonly inputCapabilities = { activeTurnAppend: "unsupported" as const };
  readonly postedMessages: AgentInputUserMessage[] = [];
  private readonly listeners = new Set<(events: readonly AgentRunEvent[]) => void | Promise<void>>();

  constructor(private readonly config: AgentRunConfig) {
    this.runtimeKind = config.runtimeKind;
  }

  getContext(): AgentRunContext<null> {
    return new AgentRunContext({
      runId: this.runId,
      config: this.config,
      runtimeContext: null,
    });
  }

  isActive(): boolean {
    return true;
  }

  getPlatformAgentRunId(): string | null {
    return null;
  }

  getLifecycleSnapshot() {
    return {
      availability: "active" as const,
      phase: "idle" as const,
      currentTurn: { kind: "NONE" as const },
    };
  }

  subscribeToSourceEventBatches(listener: (events: readonly AgentRunEvent[]) => void | Promise<void>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async dispatchUserInput(input: { message: AgentInputUserMessage }) {
    this.postedMessages.push(input.message);
    return { forwarded: true, turnId: "turn-1" };
  }

  async approveToolInvocation(): Promise<AgentOperationResult> {
    return { accepted: true };
  }

  async interrupt(): Promise<AgentOperationResult> {
    return { accepted: true };
  }

  async terminate(): Promise<AgentOperationResult> {
    return { accepted: true };
  }
}

const buildMemberConfig = (): TeamRunAgentNode => testAgentNode("/worker", {
  agentRunId: "worker-run-1",
  agentDefinitionId: "agent-worker",
  llmModelIdentifier: "model-1",
  autoExecuteTools: false,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
});

const buildHandle = () => {
  const config = buildMemberConfig();
  const teamConfig = testTeamRunConfig({
    rootTeamRunId: "team-run-1",
    rootTeamDefinitionId: "team-def-1",
    coordinatorAddress: config.address,
    children: [config],
  });
  const memberContext = new MixedAgentMemberContext({
    address: config.address,
    agentRunId: config.agentRunId,
    runtimeKind: config.runtimeKind,
    platformAgentRunId: null,
  });
  const teamContext = new TeamRunContext({
    rootTeamRunId: "team-run-1",
    teamRunId: "team-run-1",
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode: teamConfig.rootTeam,
    handoffs: teamConfig.handoffs,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [memberContext],
    }),
  });
  const publishedEvents: TeamRunEvent[] = [];
  const backends: FakeAgentRunBackend[] = [];
  const createAgentRun = vi.fn(async (agentRunConfig: AgentRunConfig, runId: string) => {
    const backend = new FakeAgentRunBackend(agentRunConfig);
    backends.push(backend);
    return new AgentRun({
      context: new AgentRunContext({ runId, config: agentRunConfig, runtimeContext: null }),
      backend,
    });
  });
  const handle = new MixedAgentMemberHandle({
    teamContext,
    context: memberContext,
    config,
    agentRunManager: { createAgentRun } as never,
    memberTeamContextBuilder: { build: vi.fn(async () => null) } as never,
    publish: (event) => publishedEvents.push(event),
    notifyStatusChange: vi.fn(),
    deliverInterAgentMessage: vi.fn(),
  });
  return { handle, publishedEvents, backends };
};

const agentNotificationEvents = (events: readonly TeamRunEvent[]) =>
  events
    .filter((event): event is Extract<TeamRunEvent, { eventSourceType: TeamRunEventSourceType.AGENT }> =>
      event.eventSourceType === TeamRunEventSourceType.AGENT)
    .filter((event) => event.payload.eventType === AgentRunEventType.SYSTEM_TASK_NOTIFICATION);

describe("MixedAgentMemberHandle task-delegation notification projection", () => {
  it("projects accepted stamped task-delegation system messages as one local system notification without member-input echo", async () => {
    const { handle, publishedEvents, backends } = buildHandle();
    const message = new AgentInputUserMessage(
      "Runtime task packet with lifecycle guidance.",
      SenderType.SYSTEM,
      null,
      markTaskDelegationSystemTaskNotificationMetadata({
        sender_id: "system.task_delegation",
        message_type: "task_team_delegation_work_packet",
      }, {
        displayContent: "You have a new task.\n\nTask ID: task_0001",
      }),
    );

    await expect(handle.postMessage(message)).resolves.toMatchObject({ accepted: true });

    expect(backends[0]!.postedMessages).toEqual([message]);
    expect(publishedEvents.filter((event) => event.eventSourceType === TeamRunEventSourceType.MEMBER_INPUT)).toHaveLength(0);
    expect(agentNotificationEvents(publishedEvents)).toEqual([
      expect.objectContaining({
        execution: expect.objectContaining({
          rootTeamRunId: "team-run-1",
          memberAddress: "/worker",
          agentRunId: "worker-run-1",
        }),
        payload: expect.objectContaining({
          eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION,
          details: {
            sender: { kind: "system" },
            content: "You have a new task.\n\nTask ID: task_0001",
          },
        }),
      }),
    ]);
  });

  it("falls back to raw runtime content for stamped task-delegation messages without display metadata", async () => {
    const { handle, publishedEvents } = buildHandle();
    const message = new AgentInputUserMessage(
      "Runtime-only stamped task notification.",
      SenderType.SYSTEM,
      null,
      markTaskDelegationSystemTaskNotificationMetadata({
        sender_id: "system.task_delegation",
        message_type: "task_revision_requested",
      }),
    );

    await expect(handle.postMessage(message)).resolves.toMatchObject({ accepted: true });

    expect(agentNotificationEvents(publishedEvents)).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({
          eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION,
          details: {
            sender: { kind: "system" },
            content: "Runtime-only stamped task notification.",
          },
        }),
      }),
    ]);
  });

  it("preserves member-input projection for ordinary accepted user messages", async () => {
    const { handle, publishedEvents } = buildHandle();

    await expect(handle.postMessage(new AgentInputUserMessage("hello", SenderType.USER)))
      .resolves.toMatchObject({ accepted: true });

    expect(publishedEvents.filter((event) => event.eventSourceType === TeamRunEventSourceType.MEMBER_INPUT)).toHaveLength(1);
    expect(agentNotificationEvents(publishedEvents)).toHaveLength(0);
  });
});
