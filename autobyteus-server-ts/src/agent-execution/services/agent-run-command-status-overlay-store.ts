import {
  buildAgentStatusPayload,
  type AgentApiStatus,
  type AgentStatusPayload,
} from "../domain/agent-status-payload.js";

export type AgentRunCommandStatusOverlay = {
  runId: string;
  messageId: string | null;
  status: "initializing" | "error";
  statusPayload: AgentStatusPayload;
  updatedAt: string;
  errorMessage?: string | null;
};

const nowIso = (): string => new Date().toISOString();

export class AgentRunCommandStatusOverlayStore {
  private readonly overlaysByRunId = new Map<string, AgentRunCommandStatusOverlay>();

  publishInitializing(input: {
    runId: string;
    messageId: string;
  }): AgentStatusPayload {
    return this.upsert({
      runId: input.runId,
      messageId: input.messageId,
      status: "initializing",
      errorMessage: null,
    }).statusPayload;
  }

  publishError(input: {
    runId: string;
    messageId: string | null;
    errorMessage?: string | null;
  }): AgentStatusPayload {
    return this.upsert({
      runId: input.runId,
      messageId: input.messageId,
      status: "error",
      errorMessage: input.errorMessage ?? null,
    }).statusPayload;
  }

  getOverlay(runId: string): AgentRunCommandStatusOverlay | null {
    return this.overlaysByRunId.get(runId) ?? null;
  }

  clear(runId: string): boolean {
    return this.overlaysByRunId.delete(runId);
  }

  clearAll(): void {
    this.overlaysByRunId.clear();
  }

  private upsert(input: {
    runId: string;
    messageId: string | null;
    status: AgentApiStatus & ("initializing" | "error");
    errorMessage?: string | null;
  }): AgentRunCommandStatusOverlay {
    const payload = buildAgentStatusPayload({
      status: input.status,
      canInterrupt: false,
      agentId: input.runId,
    });
    const overlay: AgentRunCommandStatusOverlay = {
      runId: input.runId,
      messageId: input.messageId,
      status: input.status,
      statusPayload: {
        ...payload,
        ...(input.errorMessage ? { error_message: input.errorMessage } : {}),
      } as AgentStatusPayload,
      updatedAt: nowIso(),
      errorMessage: input.errorMessage ?? null,
    };
    this.overlaysByRunId.set(input.runId, overlay);
    return overlay;
  }
}

let cachedAgentRunCommandStatusOverlayStore: AgentRunCommandStatusOverlayStore | null = null;

export const getAgentRunCommandStatusOverlayStore = (): AgentRunCommandStatusOverlayStore => {
  if (!cachedAgentRunCommandStatusOverlayStore) {
    cachedAgentRunCommandStatusOverlayStore = new AgentRunCommandStatusOverlayStore();
  }
  return cachedAgentRunCommandStatusOverlayStore;
};
