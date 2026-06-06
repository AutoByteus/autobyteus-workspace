import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType } from "../../src/agent-execution/domain/agent-run-event.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { SelfEvolutionTargetNotificationService } from "../../src/self-evolution/services/self-evolution-target-notification-service.js";

describe("SelfEvolutionTargetNotificationService", () => {
  it.each([
    RuntimeKind.AUTOBYTEUS,
    RuntimeKind.CODEX_APP_SERVER,
    RuntimeKind.CLAUDE_AGENT_SDK,
  ])("emits a runtime-neutral local notification event for active idle %s runs", async (runtimeKind) => {
    const emitLocalEvent = vi.fn();
    const postUserMessage = vi.fn(async () => ({ accepted: true }));
    const service = new SelfEvolutionTargetNotificationService({
      getActiveRun: vi.fn(() => ({
        runId: `target-run-${runtimeKind}`,
        runtimeKind,
        getStatusSnapshot: () => ({ status: "idle" }),
        emitLocalEvent,
        postUserMessage,
      })),
    } as any);

    const result = await service.notify({
      evolutionRunId: "evolution-record-123",
      target: { kind: "agent_run", runId: `target-run-${runtimeKind}` },
      skillTargets: [{
        skillName: "durable-skill",
        skillRootPath: "/tmp/private/skills/durable-skill",
        skillMdPath: "/tmp/private/skills/durable-skill/SKILL.md",
        isWritable: true,
      }],
    });

    expect(result.status).toBe("sent_active_idle");
    expect(postUserMessage).not.toHaveBeenCalled();
    expect(emitLocalEvent).toHaveBeenCalledTimes(1);
    const emittedEvent = emitLocalEvent.mock.calls[0][0];
    expect(emittedEvent).toEqual({
      eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION,
      runId: `target-run-${runtimeKind}`,
      payload: {
        sender_id: "system.self_evolution",
        content: result.message,
      },
      statusHint: null,
    });
    expect(result.message).toContain("Self improve finished for this run.");
    expect(result.message).toContain("Future runs will use any updated skill guidance.");
    expect(result.message).not.toContain("Re-read");
    expect(result.message).not.toContain("helper");
    expect(result.message).not.toContain("evolution-record-123");
    expect(result.message).not.toContain("/tmp/private");
    expect(result.message).not.toContain("SKILL.md");
    expect(result.message).not.toContain("Affected skill packages");
  });
});
