import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgyAgentRunBackend } from "../../../../../src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import type { AgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";

const conversationId = "3d5ce362-1127-4d6b-8259-4a2c04d7d876";
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]);
class FakeProcess {
  private listeners: Array<(message: AgyStreamMessage) => void> = [];
  private closeListeners: Array<(error: Error) => void> = [];
  readonly sent: string[] = [];
  subscribe(listener: (message: AgyStreamMessage) => void) { this.listeners.push(listener); return () => undefined; }
  onClose(listener: (error: Error) => void) { this.closeListeners.push(listener); return () => undefined; }
  async sendUserMessage(content: string) { this.sent.push(content); }
  stop() { /* no provider process in this fixture */ }
  emit(message: AgyStreamMessage) { this.listeners.forEach((listener) => listener(message)); }
  close() { this.closeListeners.forEach((listener) => listener(new Error("private stderr marker"))); }
}
const waitFor = async (condition: () => boolean) => {
  for (let i = 0; i < 100; i += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("test condition not reached");
};
const start = (backend: AgyAgentRunBackend, content: string) => backend.dispatchUserInput({
  kind: "start_turn", message: { content },
} as never);
const imageDone = (step = 4): AgyStreamMessage => ({ event: "step_update", step_update: {
  conversation_id: conversationId, step_index: step, step_type: "tool", state: "DONE", tool_name: "generate_image",
  tool_info: { parameters: { secret: "private-token" } },
} });
const result = (): AgyStreamMessage => ({ event: "result", result: {
  conversation_id: conversationId, status: "SUCCESS", response: "Image delivered.",
} });

describe("AGY result finalization and input exclusion", () => {
  const homes: string[] = [];
  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(homes.splice(0).map((home) => fs.rm(home, { recursive: true, force: true })));
  });
  const setup = async () => {
    const home = await fs.mkdtemp(path.join(os.tmpdir(), "agy-turn-test-"));
    homes.push(home);
    vi.spyOn(os, "homedir").mockReturnValue(home);
    const memoryDir = path.join(home, "memory");
    const brain = path.join(home, ".gemini", "antigravity-cli", "brain", conversationId);
    await fs.mkdir(path.join(brain, ".system_generated", "logs"), { recursive: true });
    await fs.mkdir(memoryDir);
    const process = new FakeProcess();
    const backend = new AgyAgentRunBackend({ runId: "run-one", config: {
      runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, llmModelIdentifier: "gemini-3.8-flash-low", memoryDir,
    }, runtimeContext: { conversationId } } as never, process as never);
    const events: AgentRunEvent[] = [];
    return { home, memoryDir, brain, process, backend, events };
  };
  const appendImage = async (brain: string) => {
    const image = path.join(brain, "blue.jpg");
    await fs.writeFile(image, jpeg);
    const transcript = path.join(brain, ".system_generated", "logs", "transcript.jsonl");
    const rows = [
      { step_index: 3, source: "MODEL", type: "PLANNER_RESPONSE", status: "DONE", tool_calls: [{ name: "generate_image" }] },
      { step_index: 4, source: "MODEL", type: "GENERIC", status: "DONE", media: [{ mime_type: "image/jpeg", uri: `file://${image}` }] },
    ];
    await fs.appendFile(transcript, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
  };

  it.each([false, true])("holds the follow-up gate through terminal listener delivery (image=%s)", async (withImage) => {
    const run = await setup();
    let release!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    let terminalReached = false;
    run.backend.subscribeToSourceEventBatches(async (batch) => {
      run.events.push(...batch);
      if (batch.some((item) => item.eventType === AgentRunEventType.TURN_COMPLETED)) {
        terminalReached = true;
        await hold;
      }
    });
    const first = await start(run.backend, "first");
    expect(first.forwarded).toBe(true);
    if (withImage) {
      await appendImage(run.brain);
      run.process.emit(imageDone());
      run.process.emit({ event: "step_update", step_update: { conversation_id: conversationId,
        step_index: 5, step_type: "agent_response", state: "DONE", text_delta: "Image delivered." } });
    }
    run.process.emit(result());
    await waitFor(() => terminalReached);
    expect(run.backend.getLifecycleSnapshot().phase).toBe("running");
    expect((await start(run.backend, "too soon")).code).toBe("AGENT_RUN_NOT_ACCEPTING_INPUT");
    expect(run.process.sent).toEqual(["first"]);
    release();
    await waitFor(() => run.backend.getLifecycleSnapshot().phase === "idle");
    expect((await start(run.backend, "retry")).forwarded).toBe(true);
    expect(run.process.sent).toEqual(["first", "retry"]);
    if (withImage) {
      const success = run.events.find((item) => item.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
      const copy = (success?.payload.result as { file_path: string }).file_path;
      expect(copy).toContain(path.join(run.memoryDir, "agy-native-images"));
      expect(await fs.readFile(copy)).toEqual(jpeg);
      expect(JSON.stringify(run.events)).not.toContain("private-token");
    }
  });

  it("fails an unreconciled image safely and never publishes post-image prose", async () => {
    const run = await setup();
    run.backend.subscribeToSourceEventBatches(async (batch) => { run.events.push(...batch); });
    await start(run.backend, "first");
    run.process.emit(imageDone());
    run.process.emit({ event: "step_update", step_update: { conversation_id: conversationId,
      step_index: 5, step_type: "agent_response", state: "DONE", text_delta: "False image claim" } });
    run.process.emit(result());
    await waitFor(() => run.backend.getLifecycleSnapshot().phase === "idle");
    expect(run.events.some((item) => item.eventType === AgentRunEventType.TOOL_EXECUTION_FAILED)).toBe(true);
    expect(run.events.some((item) => item.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)).toBe(false);
    expect(JSON.stringify(run.events)).not.toContain("False image claim");
  });

  it("does not release a false-idle run after terminal publication failure", async () => {
    const run = await setup();
    run.backend.subscribeToSourceEventBatches(async (batch) => {
      if (batch.some((item) => item.eventType === AgentRunEventType.TURN_COMPLETED)) throw new Error("listener failed");
    });
    await start(run.backend, "first");
    run.process.emit(result());
    await waitFor(() => !run.backend.isActive());
    expect(run.backend.getLifecycleSnapshot().phase).toBe("error");
    expect((await start(run.backend, "retry")).code).toBe("AGENT_RUN_NOT_ACCEPTING_INPUT");
  });

  it("interrupts pending reconciliation without a late image success or next-turn send", async () => {
    const run = await setup();
    run.backend.subscribeToSourceEventBatches(async (batch) => { run.events.push(...batch); });
    const first = await start(run.backend, "first");
    run.process.emit(imageDone());
    run.process.emit(result());
    expect((await start(run.backend, "too soon")).code).toBe("AGENT_RUN_NOT_ACCEPTING_INPUT");
    expect((await run.backend.interrupt(first.turnId ?? null)).accepted).toBe(true);
    expect(run.events.some((item) => item.eventType === AgentRunEventType.TOOL_EXECUTION_FAILED)).toBe(true);
    expect(run.events.some((item) => item.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)).toBe(false);
    expect(run.events.filter((item) => item.eventType === AgentRunEventType.TURN_INTERRUPTED)).toHaveLength(1);
    expect(run.process.sent).toEqual(["first"]);
  });

  it("treats close before result as interruption and close after result as offline after ordered terminal", async () => {
    const before = await setup();
    before.backend.subscribeToSourceEventBatches(async (batch) => { before.events.push(...batch); });
    await start(before.backend, "first");
    before.process.emit(imageDone());
    before.process.close();
    await waitFor(() => before.events.some((item) => item.eventType === AgentRunEventType.TURN_INTERRUPTED));
    expect(before.events.some((item) => item.eventType === AgentRunEventType.TOOL_EXECUTION_FAILED)).toBe(true);
    const after = await setup();
    after.backend.subscribeToSourceEventBatches(async (batch) => { after.events.push(...batch); });
    await start(after.backend, "first");
    after.process.emit(result());
    after.process.close();
    await waitFor(() => after.events.some((item) => item.eventType === AgentRunEventType.TURN_COMPLETED));
    expect(after.backend.isActive()).toBe(false);
    expect((await start(after.backend, "retry")).code).toBe("AGENT_RUN_NOT_ACCEPTING_INPUT");
  });
});
