import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type {
  AgentRunCommandObserver,
  AgentRunUserMessageAcceptedPayload,
} from "../../agent-execution/domain/agent-run-command-observer.js";
import { isAgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { AgentRunConfig } from "../../agent-execution/domain/agent-run-config.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { RuntimeMemoryEventAccumulator } from "./runtime-memory-event-accumulator.js";
import { RunMemoryWriter } from "../store/run-memory-writer.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type RecorderState = {
  accumulator: RuntimeMemoryEventAccumulator;
  queue: Promise<void>;
  unsubscribe: (() => void) | null;
  detached: boolean;
};

const noop = (): void => undefined;

export class AgentRunMemoryRecorder implements AgentRunCommandObserver {
  private readonly states = new Map<string, RecorderState>();
  private readonly warnedMissingMemoryDir = new Set<string>();

  attachToRun(run: AgentRun): () => void {
    if (!this.isRecordable(run.runId, run.runtimeKind, run.config)) {
      return noop;
    }
    const state = this.getOrCreateState(run.runId, run.config);
    state.detached = false;
    state.unsubscribe?.();
    state.unsubscribe = run.subscribeToEvents((event) => {
      if (!isAgentRunEvent(event)) {
        return;
      }
      this.enqueue(run.runId, () => state.accumulator.recordRunEvent(event));
    });
    return () => this.detachRun(run.runId);
  }

  onUserMessageAccepted(payload: AgentRunUserMessageAcceptedPayload): void {
    if (!this.isRecordable(payload.runId, payload.runtimeKind, payload.config)) {
      return;
    }
    const state = this.getOrCreateState(payload.runId, payload.config);
    this.enqueue(payload.runId, () => state.accumulator.recordAcceptedUserMessage(payload));
  }

  async waitForIdle(runId?: string | null): Promise<void> {
    if (runId) {
      await (this.states.get(runId)?.queue ?? Promise.resolve());
      return;
    }
    await Promise.all([...this.states.values()].map((state) => state.queue));
  }

  private detachRun(runId: string): void {
    const state = this.states.get(runId);
    if (!state) {
      return;
    }
    state.unsubscribe?.();
    state.unsubscribe = null;
    state.detached = true;
    void state.queue.finally(() => {
      const latest = this.states.get(runId);
      if (latest?.detached) {
        this.states.delete(runId);
      }
    });
  }

  private enqueue(runId: string, work: () => void | Promise<void>): void {
    const state = this.states.get(runId);
    if (!state) {
      return;
    }
    state.queue = state.queue
      .then(() => Promise.resolve(work()))
      .catch((error: unknown) => {
        logger.error(`[AgentRunMemoryRecorder] failed for run '${runId}': ${String(error)}`);
      });
  }

  private getOrCreateState(runId: string, config: AgentRunConfig): RecorderState {
    const existing = this.states.get(runId);
    if (existing) {
      return existing;
    }
    const memoryDir = config.memoryDir;
    if (!memoryDir) {
      throw new Error("Cannot create memory recorder state without memoryDir.");
    }
    const writer = new RunMemoryWriter({ memoryDir });
    const state: RecorderState = {
      accumulator: new RuntimeMemoryEventAccumulator({ runId, writer }),
      queue: Promise.resolve(),
      unsubscribe: null,
      detached: false,
    };
    this.states.set(runId, state);
    return state;
  }

  private isRecordable(runId: string, runtimeKind: RuntimeKind, config: AgentRunConfig): boolean {
    if (runtimeKind === RuntimeKind.AUTOBYTEUS) {
      return false;
    }
    if (config.memoryDir?.trim()) {
      return true;
    }
    if (!this.warnedMissingMemoryDir.has(runId)) {
      this.warnedMissingMemoryDir.add(runId);
      logger.warn(
        `[AgentRunMemoryRecorder] skipping run '${runId}' because AgentRunConfig.memoryDir is missing.`,
      );
    }
    return false;
  }
}

let cachedAgentRunMemoryRecorder: AgentRunMemoryRecorder | null = null;

export const getAgentRunMemoryRecorder = (): AgentRunMemoryRecorder => {
  if (!cachedAgentRunMemoryRecorder) {
    cachedAgentRunMemoryRecorder = new AgentRunMemoryRecorder();
  }
  return cachedAgentRunMemoryRecorder;
};
