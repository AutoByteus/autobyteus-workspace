import { describe, expect, it, vi } from "vitest";
import { GlobalAgentRunMessageRouter } from "../../../src/agent-communication/services/global-agent-run-message-router.js";
import { DirectAgentRunMessageGrantRegistry } from "../../../src/agent-communication/services/direct-agent-run-message-grant-registry.js";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const sender = buildAgentRunMessageSenderContext({
  senderRunId: "sender-run",
  senderName: "Sender",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});

const createTargetRun = (input: {
  runId?: string;
  accepted?: boolean;
  message?: string | null;
} = {}) => {
  const emittedEvents: AgentRunEvent[] = [];
  const postUserMessage = vi.fn(async () => ({
    accepted: input.accepted ?? true,
    message: input.message ?? null,
    turnId: "turn-1",
  }));
  const run = {
    runId: input.runId ?? "target-run",
    postUserMessage,
    emitLocalEvent: vi.fn((event: AgentRunEvent) => emittedEvents.push(event)),
  } as unknown as AgentRun;
  return { run, postUserMessage, emittedEvents };
};

const createRouter = (targetRun: AgentRun | null, grantRegistry = new DirectAgentRunMessageGrantRegistry()) => {
  const agentRunManager = {
    getActiveRun: vi.fn(() => targetRun),
  };
  return {
    router: new GlobalAgentRunMessageRouter({ agentRunManager, grantRegistry }),
    agentRunManager,
    grantRegistry,
  };
};

describe("GlobalAgentRunMessageRouter", () => {
  it("delivers to an active standalone run and emits a direct INTER_AGENT_MESSAGE without team projection fields", async () => {
    const target = createTargetRun({ runId: "standalone-target" });
    const { router, agentRunManager } = createRouter(target.run);

    const result = await router.deliver({
      sender,
      targetAgentRunId: "standalone-target",
      content: "Direct body.",
      messageType: "direct_note",
      referenceFiles: ["/tmp/direct.md"],
    });

    expect(result.accepted).toBe(true);
    expect(agentRunManager.getActiveRun).toHaveBeenCalledWith("standalone-target");
    expect(target.postUserMessage).toHaveBeenCalledTimes(1);
    const postedMessage = target.postUserMessage.mock.calls[0]?.[0] as { content?: string; metadata?: Record<string, unknown> };
    expect(postedMessage.content).toContain("Direct body.");
    expect(postedMessage.content).toContain("/tmp/direct.md");
    expect(postedMessage.metadata).toEqual(expect.objectContaining({
      input_origin: "direct_inter_agent_delivery",
      sender_agent_id: "sender-run",
      receiver_run_id: "standalone-target",
      reference_files: ["/tmp/direct.md"],
    }));
    expect(target.emittedEvents).toHaveLength(1);
    expect(target.emittedEvents[0]).toEqual(expect.objectContaining({
      eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
      runId: "standalone-target",
      payload: expect.objectContaining({
        sender_agent_id: "sender-run",
        receiver_run_id: "standalone-target",
        content: "Direct body.",
        message_type: "direct_note",
        reference_files: ["/tmp/direct.md"],
      }),
    }));
    expect(target.emittedEvents[0]!.payload).not.toHaveProperty("team_run_id");
    expect(target.emittedEvents[0]!.payload).not.toHaveProperty("reference_file_entries");
  });

  it("delivers to an active team-member AgentRun as the same direct route without Team Communication fields", async () => {
    const target = createTargetRun({ runId: "team-member-run" });
    const { router } = createRouter(target.run);

    const result = await router.deliver({
      sender,
      targetAgentRunId: "team-member-run",
      content: "Direct to member.",
    });

    expect(result.accepted).toBe(true);
    expect(target.emittedEvents[0]!.payload).toEqual(expect.objectContaining({
      receiver_run_id: "team-member-run",
      content: "Direct to member.",
    }));
    expect(target.emittedEvents[0]!.payload).not.toHaveProperty("team_run_id");
  });

  it("rejects unknown, inactive, preallocated, or recoverable-only targets via the same not-active result", async () => {
    const { router, agentRunManager } = createRouter(null);

    const result = await router.deliver({
      sender,
      targetAgentRunId: "preallocated-or-recoverable-run",
      content: "Should fail.",
    });

    expect(agentRunManager.getActiveRun).toHaveBeenCalledWith("preallocated-or-recoverable-run");
    expect(result).toEqual({
      accepted: false,
      code: "TARGET_AGENT_RUN_NOT_ACTIVE",
      message: "Exact AgentRun target 'preallocated-or-recoverable-run' is not active.",
    });
  });

  it("does not emit an event when the active target rejects input", async () => {
    const target = createTargetRun({ accepted: false, message: "busy" });
    const { router } = createRouter(target.run);

    const result = await router.deliver({
      sender,
      targetAgentRunId: "target-run",
      content: "Rejected body.",
    });

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("TARGET_AGENT_RUN_REJECTED_INPUT");
    expect(target.emittedEvents).toEqual([]);
  });

  it("enforces direct grants for helper runs and records usage", async () => {
    const target = createTargetRun({ runId: "target-run" });
    const grantRegistry = new DirectAgentRunMessageGrantRegistry();
    const grant = grantRegistry.register({
      senderRunId: "helper-run",
      purpose: "self_evolution_skill_update",
      allowedTargetAgentRunIds: ["target-run"],
      allowedMessageTypes: ["skill_update"],
      allowedReferenceFileRoots: ["/tmp/skill-root"],
      maxAcceptedDeliveries: 1,
    });
    const { router } = createRouter(target.run, grantRegistry);
    const helperSender = buildAgentRunMessageSenderContext({ senderRunId: "helper-run" });

    await expect(router.deliver({
      sender: helperSender,
      targetAgentRunId: "wrong-target",
      content: "wrong target",
      messageType: "skill_update",
    })).resolves.toEqual(expect.objectContaining({
      accepted: false,
      code: "DIRECT_MESSAGE_GRANT_TARGET_DENIED",
    }));

    await expect(router.deliver({
      sender: helperSender,
      targetAgentRunId: "target-run",
      content: "old contract",
      messageType: "self" + "_evolution_outcome",
    })).resolves.toEqual(expect.objectContaining({
      accepted: false,
      code: "DIRECT_MESSAGE_GRANT_MESSAGE_TYPE_DENIED",
    }));

    await expect(router.deliver({
      sender: helperSender,
      targetAgentRunId: "target-run",
      content: "bad path",
      messageType: "skill_update",
      referenceFiles: ["/tmp/outside.md"],
    })).resolves.toEqual(expect.objectContaining({
      accepted: false,
      code: "DIRECT_MESSAGE_GRANT_REFERENCE_DENIED",
    }));

    await expect(router.deliver({
      sender: helperSender,
      targetAgentRunId: "target-run",
      content: "sent",
      messageType: "skill_update",
      referenceFiles: ["/tmp/skill-root/SKILL.md"],
    })).resolves.toEqual(expect.objectContaining({ accepted: true }));

    await expect(router.deliver({
      sender: helperSender,
      targetAgentRunId: "target-run",
      content: "second",
      messageType: "skill_update",
    })).resolves.toEqual(expect.objectContaining({
      accepted: false,
      code: "DIRECT_MESSAGE_GRANT_EXHAUSTED",
    }));

    const summary = grantRegistry.summarizeGrant(grant.grantId);
    expect(summary?.acceptedCount).toBe(1);
    expect(summary?.latestUsage?.code).toBe("DIRECT_MESSAGE_GRANT_EXHAUSTED");
  });

  it("records a granted helper delivery as target inactive when the target terminates before final send", async () => {
    const grantRegistry = new DirectAgentRunMessageGrantRegistry();
    const grant = grantRegistry.register({
      senderRunId: "helper-run",
      purpose: "self_evolution_skill_update",
      allowedTargetAgentRunIds: ["target-run"],
      allowedMessageTypes: ["skill_update"],
      maxAcceptedDeliveries: 1,
    });
    const { router } = createRouter(null, grantRegistry);

    const result = await router.deliver({
      sender: buildAgentRunMessageSenderContext({ senderRunId: "helper-run" }),
      targetAgentRunId: "target-run",
      content: "target died",
      messageType: "skill_update",
    });

    expect(result.code).toBe("TARGET_AGENT_RUN_NOT_ACTIVE");
    expect(grantRegistry.summarizeGrant(grant.grantId)?.latestUsage).toEqual(expect.objectContaining({
      accepted: false,
      code: "TARGET_AGENT_RUN_NOT_ACTIVE",
      targetAgentRunId: "target-run",
    }));
  });
});
