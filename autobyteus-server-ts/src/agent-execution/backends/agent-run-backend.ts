import type { CompactionRetryRequest, CompactionRecoveryBlock } from "autobyteus-ts/memory/compaction/compaction-recovery.js";
import type { AgentOperationResult } from "../domain/agent-operation-result.js";
import type { AgentRunContext, RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunEvent } from "../domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../domain/agent-runtime-lifecycle-snapshot.js";
import type {
  AgentRunBackendInputCapabilities,
  AgentRunBackendInputDispatch,
  AgentRunBackendInputDispatchResult,
} from "../input/agent-run-input-contract.js";

export type AgentRunSourceEventBatchListener = (
  events: readonly AgentRunEvent[],
) => void | Promise<void>;
export type AgentRunSourceEventBatchUnsubscribe = () => void;

export type AgentRunCompactionRecoveryCapability =
  | { readonly kind: "unsupported" }
  | {
      readonly kind: "supported";
      getSnapshot(): CompactionRecoveryBlock | null;
      authorize(input: CompactionRetryRequest): Promise<"accepted" | "stale" | "stopped">;
      revokeUnused(input: CompactionRetryRequest & { reason: string }): Promise<"revoked" | "stale" | "in_use">;
    };

export interface AgentRunBackend {
  readonly runId: string;
  readonly runtimeKind: RuntimeKind;
  readonly inputCapabilities: AgentRunBackendInputCapabilities;

  readonly compactionRecovery: AgentRunCompactionRecoveryCapability;
  getContext(): AgentRunContext<RuntimeAgentRunContext>;
  isActive(): boolean;
  getPlatformAgentRunId(): string | null;
  getLifecycleSnapshot(): AgentRuntimeLifecycleSnapshot;
  /**
   * True while the runtime reports a running background task (work that outlives its turn and
   * reports separately). Runtimes without background-task reporting return false. Read only by
   * the idle-shutdown quiet check.
   */
  hasRunningBackgroundTasks(): boolean;
  subscribeToSourceEventBatches(
    listener: AgentRunSourceEventBatchListener,
  ): AgentRunSourceEventBatchUnsubscribe;
  dispatchUserInput(
    dispatch: AgentRunBackendInputDispatch,
  ): Promise<AgentRunBackendInputDispatchResult>;
  approveToolInvocation(
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ): Promise<AgentOperationResult>;
  interrupt(turnId: string | null): Promise<AgentOperationResult>;
  terminate(): Promise<AgentOperationResult>;
}
