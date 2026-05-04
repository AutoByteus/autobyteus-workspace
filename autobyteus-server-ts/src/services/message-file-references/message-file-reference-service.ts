import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
  type TeamRunEvent,
} from "../../agent-team-execution/domain/team-run-event.js";
import {
  AgentRunEventType,
  isAgentRunEvent,
  type AgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  cloneMessageFileReferenceProjection,
  normalizeMessageFileReferenceEntry,
  normalizeMessageFileReferenceProjection,
} from "./message-file-reference-normalizer.js";
import {
  MessageFileReferenceProjectionStore,
  getMessageFileReferenceProjectionPath,
  getMessageFileReferenceProjectionStore,
} from "./message-file-reference-projection-store.js";
import type {
  MessageFileReferenceEntry,
  MessageFileReferenceProjection,
} from "./message-file-reference-types.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};
const LOG_PREFIX = "[message-file-reference]";

export class MessageFileReferenceService {
  private readonly projectionStore: MessageFileReferenceProjectionStore;
  private readonly teamLayout: TeamMemberMemoryLayout;
  private readonly projectionByTeamRunId = new Map<string, MessageFileReferenceProjection>();
  private readonly operationQueueByTeamRunId = new Map<string, Promise<void>>();

  constructor(options: {
    projectionStore?: MessageFileReferenceProjectionStore;
    memoryDir?: string;
  } = {}) {
    this.projectionStore = options.projectionStore ?? getMessageFileReferenceProjectionStore();
    this.teamLayout = new TeamMemberMemoryLayout(
      options.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    );
  }

  attachToTeamRun(teamRun: TeamRun): () => void {
    const unsubscribe = teamRun.subscribeToEvents((event) => {
      if (!this.isMessageFileReferenceTeamEvent(event)) {
        return;
      }
      void this.enqueueTeamEvent(teamRun, event);
    });

    return () => {
      unsubscribe();
      this.clearTeamRunState(teamRun.runId);
    };
  }

  async getProjectionForTeamRun(teamRun: TeamRun): Promise<MessageFileReferenceProjection> {
    await this.waitForPendingProjectionUpdates(teamRun.runId);
    return this.loadProjection(teamRun.runId);
  }

  private isMessageFileReferenceTeamEvent(event: TeamRunEvent): boolean {
    if (event.eventSourceType !== TeamRunEventSourceType.AGENT) {
      return false;
    }
    const payload = event.data as TeamRunAgentEventPayload;
    return (
      isAgentRunEvent(payload.agentEvent) &&
      payload.agentEvent.eventType === AgentRunEventType.MESSAGE_FILE_REFERENCE_DECLARED
    );
  }

  private enqueueTeamEvent(teamRun: TeamRun, event: TeamRunEvent): Promise<void> {
    const payload = event.data as TeamRunAgentEventPayload;
    const key = teamRun.runId;
    const previous = this.operationQueueByTeamRunId.get(key) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        try {
          await this.handleReferenceEvent(teamRun.runId, payload.agentEvent);
        } catch (error) {
          logger.warn(
            `MessageFileReferenceService: failed processing reference for team '${teamRun.runId}': ${String(error)}`,
          );
        }
      });

    this.operationQueueByTeamRunId.set(key, next);
    void next.finally(() => {
      if (this.operationQueueByTeamRunId.get(key) === next) {
        this.operationQueueByTeamRunId.delete(key);
      }
    });
    return next;
  }

  private async handleReferenceEvent(
    teamRunId: string,
    event: AgentRunEvent,
  ): Promise<void> {
    const entry = normalizeMessageFileReferenceEntry(event.payload, { teamRunId });
    if (!entry) {
      return;
    }

    const projection = await this.loadProjection(teamRunId);
    const upsertAction = this.upsertEntry(projection, entry);
    if (upsertAction === "unchanged") {
      return;
    }

    this.projectionByTeamRunId.set(teamRunId, projection);
    const teamMemoryDir = this.teamLayout.getTeamDirPath(teamRunId);
    const projectionPath = getMessageFileReferenceProjectionPath(teamMemoryDir);
    await this.projectionStore.writeProjection(teamMemoryDir, projection);
    logger.info(
      `${LOG_PREFIX} projection ${upsertAction} teamRunId=${teamRunId} referenceId=${entry.referenceId} senderRunId=${entry.senderRunId} receiverRunId=${entry.receiverRunId} path=${entry.path} projectionPath=${projectionPath}`,
    );
  }

  private async loadProjection(teamRunId: string): Promise<MessageFileReferenceProjection> {
    const cached = this.projectionByTeamRunId.get(teamRunId);
    if (cached) {
      return cloneMessageFileReferenceProjection(cached);
    }

    const loaded = normalizeMessageFileReferenceProjection(
      await this.projectionStore.readProjection(
        this.teamLayout.getTeamDirPath(teamRunId),
      ),
      { teamRunId },
    );
    this.projectionByTeamRunId.set(teamRunId, loaded);
    return cloneMessageFileReferenceProjection(loaded);
  }

  private async waitForPendingProjectionUpdates(teamRunId: string): Promise<void> {
    let pending = this.operationQueueByTeamRunId.get(teamRunId);
    while (pending) {
      await pending.catch(() => undefined);

      const nextPending = this.operationQueueByTeamRunId.get(teamRunId);
      if (!nextPending || nextPending === pending) {
        return;
      }
      pending = nextPending;
    }
  }

  private upsertEntry(
    projection: MessageFileReferenceProjection,
    incoming: MessageFileReferenceEntry,
  ): "inserted" | "updated" | "unchanged" {
    const existing = projection.entries.find(
      (entry) => entry.referenceId === incoming.referenceId,
    );
    if (!existing) {
      projection.entries.push(incoming);
      return "inserted";
    }
    if (incoming.updatedAt.localeCompare(existing.updatedAt) < 0) {
      return "unchanged";
    }

    const nextEntry = {
      ...existing,
      ...incoming,
      createdAt: existing.createdAt || incoming.createdAt,
      updatedAt: incoming.updatedAt,
    };
    if (JSON.stringify(existing) === JSON.stringify(nextEntry)) {
      return "unchanged";
    }

    Object.assign(existing, nextEntry);
    return "updated";
  }

  private clearTeamRunState(teamRunId: string): void {
    this.projectionByTeamRunId.delete(teamRunId);
    this.operationQueueByTeamRunId.delete(teamRunId);
  }
}

let cachedService: MessageFileReferenceService | null = null;

export const getMessageFileReferenceService = (): MessageFileReferenceService => {
  if (!cachedService) {
    cachedService = new MessageFileReferenceService();
  }
  return cachedService;
};
