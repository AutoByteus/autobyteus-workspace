import { describe, expect, it, vi } from "vitest";
import {
  AgentRunResourceAttachmentError,
  AgentRunResourceManager,
} from "../../../src/agent-execution/services/agent-run-resource-manager.js";

const createRun = (runId: string) => ({ runId });

describe("AgentRunResourceManager", () => {
  it("releases every attached category at most once", () => {
    const fileDispose = vi.fn();
    const relayDispose = vi.fn();
    const memoryDispose = vi.fn();
    const deactivateForRun = vi.fn(() => 2);
    const manager = new AgentRunResourceManager({
      runSessions: { deactivateForRun },
      runFileChangeService: { attachToRun: vi.fn(() => fileDispose) },
      publishedArtifactRelayService: { attachToRun: vi.fn(() => relayDispose) },
      memoryRecorder: { attachToRun: vi.fn(() => memoryDispose) },
    } as never);
    const run = createRun("run-1");

    manager.attach(run as never);
    const first = manager.release("run-1", run as never);
    const second = manager.release("run-1", run as never);

    expect(first).toMatchObject({
      state: "released",
      deactivatedSessionCount: 2,
      detached: { fileChanges: true, artifactRelay: true, memoryRecorder: true },
    });
    expect(second.state).toBe("already_released");
    expect(deactivateForRun).toHaveBeenCalledTimes(1);
    expect(fileDispose).toHaveBeenCalledTimes(1);
    expect(relayDispose).toHaveBeenCalledTimes(1);
    expect(memoryDispose).toHaveBeenCalledTimes(1);
  });

  it("rolls back partial attachment before reporting the original failure", () => {
    const fileDispose = vi.fn();
    const deactivateForRun = vi.fn(() => 0);
    const manager = new AgentRunResourceManager({
      runSessions: { deactivateForRun },
      runFileChangeService: { attachToRun: vi.fn(() => fileDispose) },
      publishedArtifactRelayService: {
        attachToRun: vi.fn(() => { throw new Error("relay attach failed"); }),
      },
      memoryRecorder: { attachToRun: vi.fn() },
    } as never);
    const run = createRun("run-partial");

    expect(() => manager.attach(run as never)).toThrow(
      AgentRunResourceAttachmentError,
    );
    expect(fileDispose).toHaveBeenCalledTimes(1);
    expect(deactivateForRun).toHaveBeenCalledTimes(1);
    expect(manager.release("run-partial", run as never).state)
      .toBe("already_released");
  });

  it("attempts every cleanup category and reports all failures once", () => {
    const deactivateForRun = vi.fn(() => { throw new Error("deactivate failed"); });
    const fileDispose = vi.fn(() => { throw new Error("file failed"); });
    const relayDispose = vi.fn(() => { throw new Error("relay failed"); });
    const memoryDispose = vi.fn(() => { throw new Error("memory failed"); });
    const manager = new AgentRunResourceManager({
      runSessions: { deactivateForRun },
      runFileChangeService: { attachToRun: vi.fn(() => fileDispose) },
      publishedArtifactRelayService: { attachToRun: vi.fn(() => relayDispose) },
      memoryRecorder: { attachToRun: vi.fn(() => memoryDispose) },
    } as never);
    const run = createRun("run-errors");
    manager.attach(run as never);

    const result = manager.release(run.runId, run as never);
    expect(result.errors.map((error) => error.message)).toEqual([
      "deactivate failed",
      "file failed",
      "relay failed",
      "memory failed",
    ]);
    expect(manager.release(run.runId, run as never).state).toBe("already_released");
    expect(deactivateForRun).toHaveBeenCalledOnce();
    expect(fileDispose).toHaveBeenCalledOnce();
    expect(relayDispose).toHaveBeenCalledOnce();
    expect(memoryDispose).toHaveBeenCalledOnce();
  });
});
