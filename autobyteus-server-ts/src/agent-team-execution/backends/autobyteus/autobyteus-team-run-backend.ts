import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import {
  AgentTeamEventStream,
} from "autobyteus-ts";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { TeamRunBackend } from "../team-run-backend.js";
import type { RuntimeTeamRunContext } from "../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryRequest } from "../../domain/inter-agent-message-delivery.js";
import type { TeamRunConfig } from "../../domain/team-run-config.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import {
  type TeamRunEvent,
  type TeamRunEventListener,
  type TeamRunEventUnsubscribe,
} from "../../domain/team-run-event.js";
import { buildInterAgentDeliveryInputMessage } from "../../services/inter-agent-message-runtime-builders.js";
import type { AutoByteusTeamRunContext } from "./autobyteus-team-run-context.js";
import { AutoByteusTeamRunEventProcessor } from "./autobyteus-team-run-event-processor.js";

type AutoByteusTeamLike = {
  teamId: string;
  context?: {
    agents?: Array<{
      agentId?: string | null;
      context?: {
        config?: {
          name?: string | null;
        } | null;
      } | null;
    }>;
  } | null;
  notifier?: unknown;
  currentStatus?: string;
  postMessage?: (message: AgentInputUserMessage, targetMemberName?: string | null) => Promise<void>;
  postToolExecutionApproval?: (
    targetMemberName: string,
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ) => Promise<void>;
  interrupt?: (options?: {
    reason?: string | null;
    timeoutMs?: number | null;
    targetMemberName?: string | null;
  }) => Promise<{
    accepted: boolean;
    status?: string;
    reason?: string;
    interruptedCount?: number;
    message?: string;
  }> | {
    accepted: boolean;
    status?: string;
    reason?: string;
    interruptedCount?: number;
    message?: string;
  };
};

type AutoByteusTeamRunBackendOptions = {
  isActive: () => boolean;
  removeTeamRun: (teamRunId: string) => Promise<boolean>;
  memberRunIdsByName?: ReadonlyMap<string, string>;
  runtimeContext?: AutoByteusTeamRunContext | null;
  teamRunConfig?: TeamRunConfig | null;
};

const buildRunNotFoundResult = (runId: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${runId}' is not active.`,
});

const buildCommandFailure = (operation: string, error: unknown): AgentOperationResult => ({
  accepted: false,
  code: "RUNTIME_COMMAND_FAILED",
  message: `Failed to ${operation}: ${String(error)}`,
});

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class AutoByteusTeamRunBackend implements TeamRunBackend {
  readonly runId: string;
  readonly teamBackendKind = TeamBackendKind.AUTOBYTEUS;
  private readonly listeners = new Set<TeamRunEventListener>();
  private readonly eventProcessor: AutoByteusTeamRunEventProcessor;
  private nativeEventStream: AgentTeamEventStream | null = null;

  constructor(
    private readonly team: AutoByteusTeamLike,
    private readonly options: AutoByteusTeamRunBackendOptions,
  ) {
    this.runId = team.teamId;
    this.eventProcessor = new AutoByteusTeamRunEventProcessor(this.runId, {
      memberRunIdsByName: options.memberRunIdsByName,
      runtimeContext: options.runtimeContext ?? null,
      teamRunConfig: options.teamRunConfig ?? null,
    });
  }

  isActive(): boolean {
    return this.options.isActive();
  }

  getRuntimeContext(): RuntimeTeamRunContext {
    return this.options.runtimeContext ?? null;
  }

  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    this.listeners.add(listener);
    this.ensureNativeEventBridge();

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.closeNativeEventBridge();
      }
    };
  }

  getStatus(): string | null {
    return this.team.currentStatus ?? null;
  }

  async postMessage(
    message: AgentInputUserMessage,
    targetMemberName: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.team.postMessage || !this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      await this.team.postMessage(message, targetMemberName);
      const memberName = this.eventProcessor.normalizeMemberName(targetMemberName ?? null);
      return {
        accepted: true,
        memberName,
        memberRunId: this.eventProcessor.extractMemberRunId(
          null,
          memberName,
        ),
      };
    } catch (error) {
      return buildCommandFailure("post team message", error);
    }
  }

  async approveToolInvocation(
    targetMemberName: string,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.team.postToolExecutionApproval || !this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      await this.team.postToolExecutionApproval(
        targetMemberName,
        invocationId,
        approved,
        reason,
      );
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure("approve team tool", error);
    }
  }

  async deliverInterAgentMessage(
    request: InterAgentMessageDeliveryRequest,
  ): Promise<AgentOperationResult> {
    if (!this.team.postMessage || !this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }

    try {
      await this.team.postMessage(
        buildInterAgentDeliveryInputMessage(request),
        request.recipientMemberName,
      );
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure("deliver inter-agent message", error);
    }
  }

  async interrupt(): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    if (!this.team.interrupt) {
      return {
        accepted: false,
        code: "UNSUPPORTED_RUNTIME_COMMAND",
        message: "Native Autobyteus team does not expose interrupt().",
      };
    }
    try {
      const result = await this.team.interrupt({ reason: "user_interrupt" });
      return {
        accepted: result.accepted,
        code: result.accepted ? result.status : (result.status ?? "INTERRUPT_REJECTED"),
        message: result.message,
      };
    } catch (error) {
      return buildCommandFailure("interrupt team run", error);
    }
  }

  async terminate(): Promise<AgentOperationResult> {
    try {
      const removed = await this.options.removeTeamRun(this.runId);
      return removed
        ? {
            accepted: true,
          }
        : buildRunNotFoundResult(this.runId);
    } catch (error) {
      return buildCommandFailure("terminate team run", error);
    }
  }

  private ensureNativeEventBridge(): void {
    if (this.nativeEventStream) {
      return;
    }

    const stream = new AgentTeamEventStream(this.team as any);
    this.nativeEventStream = stream;
    void (async () => {
      try {
        for await (const nativeEvent of stream.allEvents()) {
          if (this.nativeEventStream !== stream) {
            break;
          }
          const processedEvents = await this.eventProcessor.buildProcessedTeamEvents(nativeEvent, null);
          this.fanOutProcessedEvents(processedEvents);
        }
      } catch {
        // Ignore native stream shutdown races.
      } finally {
        await stream.close().catch(() => {});
        if (this.nativeEventStream === stream) {
          this.nativeEventStream = null;
        }
      }
    })();
  }

  private closeNativeEventBridge(): void {
    const stream = this.nativeEventStream;
    if (!stream) {
      return;
    }
    this.nativeEventStream = null;
    void stream.close().catch(() => {});
  }

  private fanOutProcessedEvents(events: TeamRunEvent[]): void {
    if (events.length === 0 || this.listeners.size === 0) {
      return;
    }

    const listeners = Array.from(this.listeners);
    for (const event of events) {
      for (const listener of listeners) {
        if (!this.listeners.has(listener)) {
          continue;
        }
        try {
          listener(event);
        } catch (error) {
          logger.warn(
            `AutoByteusTeamRunBackend: team event listener failed for '${this.runId}': ${String(error)}`,
          );
        }
      }
    }
  }

}
