import { describe, expect, it, vi } from "vitest";
import {
  AgentRunResourceAttachmentError,
  AgentRunResourceManager,
} from "../../../src/agent-execution/services/agent-run-resource-manager.js";

const createRun = (runId: string) => ({ runId });
const noMcpServers = () => ({ cleanupMcpServerInstancesForAgent: vi.fn(async () => undefined) });
const managerWith = (mcpServerInstances: unknown, memoryDispose: () => void = vi.fn()) => new AgentRunResourceManager({
  runSessions: { deactivateForRun: vi.fn(() => 0) },
  runFileChangeService: { attachToRun: vi.fn(() => vi.fn()) },
  publishedArtifactRelayService: { attachToRun: vi.fn(() => vi.fn()) },
  memoryRecorder: { attachToRun: vi.fn(() => memoryDispose) },
  workJournalUpdater: { attachToRun: vi.fn(() => vi.fn()) },
  mcpServerInstances,
} as never);

describe("AgentRunResourceManager", () => {
  it("releases every attached category at most once", () => {
    const fileDispose = vi.fn();
    const relayDispose = vi.fn();
    const memoryDispose = vi.fn();
    const journalDispose = vi.fn();
    const deactivateForRun = vi.fn(() => 2);
    const manager = new AgentRunResourceManager({
      runSessions: { deactivateForRun },
      runFileChangeService: { attachToRun: vi.fn(() => fileDispose) },
      publishedArtifactRelayService: { attachToRun: vi.fn(() => relayDispose) },
      memoryRecorder: { attachToRun: vi.fn(() => memoryDispose) },
      workJournalUpdater: { attachToRun: vi.fn(() => journalDispose) },
      mcpServerInstances: noMcpServers(),
    } as never);
    const run = createRun("run-1");

    manager.attach(run as never);
    const first = manager.release("run-1", run as never);
    const second = manager.release("run-1", run as never);

    expect(first).toMatchObject({
      state: "released",
      deactivatedSessionCount: 2,
      detached: { fileChanges: true, artifactRelay: true, memoryRecorder: true, workJournal: true },
    });
    expect(second.state).toBe("already_released");
    expect(deactivateForRun).toHaveBeenCalledTimes(1);
    expect(fileDispose).toHaveBeenCalledTimes(1);
    expect(relayDispose).toHaveBeenCalledTimes(1);
    expect(memoryDispose).toHaveBeenCalledTimes(1);
    expect(journalDispose).toHaveBeenCalledTimes(1);
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
      workJournalUpdater: { attachToRun: vi.fn() },
      mcpServerInstances: noMcpServers(),
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

  it("retains failed independent cleanup stages until exact successful retry", () => {
    const deactivateForRun = vi.fn(() => { throw new Error("deactivate failed"); });
    const fileDispose = vi.fn(() => { throw new Error("file failed"); });
    const relayDispose = vi.fn(() => { throw new Error("relay failed"); });
    const memoryDispose = vi.fn(() => { throw new Error("memory failed"); });
    const manager = new AgentRunResourceManager({
      runSessions: { deactivateForRun },
      runFileChangeService: { attachToRun: vi.fn(() => fileDispose) },
      publishedArtifactRelayService: { attachToRun: vi.fn(() => relayDispose) },
      memoryRecorder: { attachToRun: vi.fn(() => memoryDispose) },
      workJournalUpdater: { attachToRun: vi.fn(() => vi.fn()) },
      mcpServerInstances: noMcpServers(),
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
    expect(manager.release(run.runId, run as never).state).toBe("failed");
    for (const close of [deactivateForRun, fileDispose, relayDispose, memoryDispose]) {
      expect(close).toHaveBeenCalledTimes(2); close.mockImplementation(() => undefined);
    }
    expect(manager.release(run.runId, run as never).state).toBe("released");
    expect(manager.release(run.runId, run as never).state).toBe("already_released");
    for (const close of [deactivateForRun, fileDispose, relayDispose, memoryDispose]) expect(close).toHaveBeenCalledTimes(3);
  });

  it("tells the lifecycle observer once a run's resources are released, never on a failed release", () => {
    const runReleased = vi.fn();
    const memoryDispose = vi.fn(() => { throw new Error("memory failed"); });
    const manager = new AgentRunResourceManager({
      runSessions: { deactivateForRun: vi.fn(() => 0) },
      runFileChangeService: { attachToRun: vi.fn(() => vi.fn()) },
      publishedArtifactRelayService: { attachToRun: vi.fn(() => vi.fn()) },
      memoryRecorder: { attachToRun: vi.fn(() => memoryDispose) },
      workJournalUpdater: { attachToRun: vi.fn(() => vi.fn()) },
      lifecycleObserver: { runReleased },
      mcpServerInstances: noMcpServers(),
    } as never);
    const run = createRun("run-observed");
    manager.attach(run as never);

    expect(manager.release(run.runId, run as never).state).toBe("failed");
    expect(runReleased).not.toHaveBeenCalled();
    memoryDispose.mockImplementation(() => undefined);
    expect(manager.release(run.runId, run as never).state).toBe("released");
    expect(manager.release(run.runId, run as never).state).toBe("already_released");
    expect(runReleased).toHaveBeenCalledExactlyOnceWith(run);
  });

  it("starts closing the run's MCP server instances exactly once, without waiting for it", () => {
    let finishClose!: () => void;
    const cleanupMcpServerInstancesForAgent = vi.fn(() => new Promise<void>((resolve) => { finishClose = resolve; }));
    const manager = managerWith({ cleanupMcpServerInstancesForAgent });
    const run = createRun("run-mcp");
    manager.attach(run as never);

    expect(manager.release(run.runId, run as never).state).toBe("released");
    expect(cleanupMcpServerInstancesForAgent).toHaveBeenCalledExactlyOnceWith("run-mcp");
    expect(manager.release(run.runId, run as never).state).toBe("already_released");
    expect(cleanupMcpServerInstancesForAgent).toHaveBeenCalledTimes(1);
    finishClose();
  });

  it("does not ask again when a failed release is retried", () => {
    const cleanupMcpServerInstancesForAgent = vi.fn(async () => undefined);
    const memoryDispose = vi.fn(() => { throw new Error("memory failed"); });
    const manager = managerWith({ cleanupMcpServerInstancesForAgent }, memoryDispose);
    const run = createRun("run-mcp-retry");
    manager.attach(run as never);

    expect(manager.release(run.runId, run as never).state).toBe("failed");
    memoryDispose.mockImplementation(() => undefined);
    expect(manager.release(run.runId, run as never).state).toBe("released");
    expect(cleanupMcpServerInstancesForAgent).toHaveBeenCalledExactlyOnceWith("run-mcp-retry");
  });

  it.each([
    ["rejects", () => Promise.reject(new Error("dummy close failure"))],
    ["throws", () => { throw new Error("dummy close failure"); }],
  ])("still releases the run when the MCP closer %s, and warns with the run id", async (_label, closer) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const manager = managerWith({ cleanupMcpServerInstancesForAgent: vi.fn(closer) });
    const run = createRun("run-mcp-failing");
    manager.attach(run as never);

    expect(manager.release(run.runId, run as never)).toMatchObject({ state: "released", errors: [] });
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(
      "Closing the MCP server instances of agent run 'run-mcp-failing' failed: Error: dummy close failure",
    ));
    warn.mockRestore();
  });
});
