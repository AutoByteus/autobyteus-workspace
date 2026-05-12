import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
  type TeamRunCommunicationEventPayload,
  type TeamRunEvent,
} from "../../agent-team-execution/domain/team-run-event.js";
import {
  AgentRunEventType,
  isAgentRunEvent,
  type AgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  cloneTeamCommunicationProjection,
  normalizeTeamCommunicationMessage,
  normalizeTeamCommunicationProjection,
} from "./team-communication-normalizer.js";
import {
  TeamCommunicationProjectionStore,
  getTeamCommunicationProjectionPath,
  getTeamCommunicationProjectionStore,
} from "./team-communication-projection-store.js";
import type {
  TeamCommunicationMessage,
  TeamCommunicationProjection,
} from "./team-communication-types.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};
const LOG_PREFIX = "[team-communication]";

export class TeamCommunicationService {
  private readonly projectionStore: TeamCommunicationProjectionStore;
  private readonly teamLayout: TeamMemberMemoryLayout;
  private readonly projectionByTeamRunId = new Map<string, TeamCommunicationProjection>();
  private readonly operationQueueByTeamRunId = new Map<string, Promise<void>>();

  constructor(options: {
    projectionStore?: TeamCommunicationProjectionStore;
    memoryDir?: string;
  } = {}) {
    this.projectionStore = options.projectionStore ?? getTeamCommunicationProjectionStore();
    this.teamLayout = new TeamMemberMemoryLayout(
      options.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    );
  }

  attachToTeamRun(teamRun: TeamRun): () => void {
    const unsubscribe = teamRun.subscribeToEvents((event) => {
      if (!this.isTeamCommunicationMessageTeamEvent(event)) {
        return;
      }
      void this.enqueueTeamEvent(teamRun, event);
    });

    return () => {
      unsubscribe();
      this.clearTeamRunState(teamRun.runId);
    };
  }

  async getProjectionForTeamRun(teamRun: TeamRun): Promise<TeamCommunicationProjection> {
    await this.waitForPendingProjectionUpdates(teamRun.runId);
    return this.loadProjection(teamRun.runId);
  }

  private isTeamCommunicationMessageTeamEvent(event: TeamRunEvent): boolean {
    if (event.eventSourceType === TeamRunEventSourceType.COMMUNICATION) {
      return true;
    }
    if (event.eventSourceType !== TeamRunEventSourceType.AGENT) {
      return false;
    }
    const payload = event.data as TeamRunAgentEventPayload;
    return (
      isAgentRunEvent(payload.agentEvent) &&
      payload.agentEvent.eventType === AgentRunEventType.TEAM_COMMUNICATION_MESSAGE
    );
  }

  private enqueueTeamEvent(teamRun: TeamRun, event: TeamRunEvent): Promise<void> {
    const key = teamRun.runId;
    const previous = this.operationQueueByTeamRunId.get(key) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        try {
          await this.handleTeamCommunicationEvent(teamRun.runId, event);
        } catch (error) {
          logger.warn(
            `TeamCommunicationService: failed processing message for team '${teamRun.runId}': ${String(error)}`,
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

  private async handleTeamCommunicationEvent(
    teamRunId: string,
    event: TeamRunEvent,
  ): Promise<void> {
    if (event.eventSourceType === TeamRunEventSourceType.COMMUNICATION) {
      await this.handleCanonicalTeamCommunicationEvent(
        teamRunId,
        event.data as TeamRunCommunicationEventPayload,
      );
      return;
    }

    const payload = event.data as TeamRunAgentEventPayload;
    await this.handleTeamCommunicationMessageEvent(teamRunId, payload.agentEvent);
  }

  private async handleCanonicalTeamCommunicationEvent(
    teamRunId: string,
    payload: TeamRunCommunicationEventPayload,
  ): Promise<void> {
    const message = normalizeTeamCommunicationMessage({
      messageId: payload.messageId,
      teamRunId: payload.teamRunId,
      senderRunId: payload.sender.memberRunId,
      senderMemberKind: payload.sender.memberKind,
      senderMemberName: payload.sender.memberName,
      senderMemberPath: payload.sender.memberPath,
      senderMemberRouteKey: payload.sender.memberRouteKey,
      receiverRunId: payload.receiver.memberRunId,
      receiverMemberKind: payload.receiver.memberKind,
      receiverMemberName: payload.receiver.memberName,
      receiverMemberPath: payload.receiver.memberPath,
      receiverMemberRouteKey: payload.receiver.memberRouteKey,
      content: payload.content,
      messageType: payload.messageType,
      createdAt: payload.createdAt,
      updatedAt: payload.createdAt,
      referenceFileEntries: payload.referenceFiles,
    }, {
      teamRunId,
      receiverRunId: payload.receiver.memberRunId,
      timestampFallback: payload.createdAt,
    });
    if (!message) {
      logger.warn(
        `${LOG_PREFIX} skipped COMMUNICATION teamRunId=${teamRunId} messageId=${payload.messageId} reason=missing_required_metadata`,
      );
      return;
    }

    await this.persistMessage(teamRunId, message);
  }

  private async handleTeamCommunicationMessageEvent(
    teamRunId: string,
    event: AgentRunEvent,
  ): Promise<void> {
    const message = normalizeTeamCommunicationMessage(event.payload, {
      teamRunId,
      receiverRunId: event.runId,
    });
    if (!message) {
      logger.warn(
        `${LOG_PREFIX} skipped TEAM_COMMUNICATION_MESSAGE teamRunId=${teamRunId} runId=${event.runId} reason=missing_required_metadata`,
      );
      return;
    }

    await this.persistMessage(teamRunId, message);
  }

  private async persistMessage(
    teamRunId: string,
    message: TeamCommunicationMessage,
  ): Promise<void> {
    const projection = await this.loadProjection(teamRunId);
    const upsertAction = this.upsertMessage(projection, message);
    if (upsertAction === "unchanged") {
      return;
    }

    this.projectionByTeamRunId.set(teamRunId, projection);
    const teamMemoryDir = this.teamLayout.getTeamDirPath(teamRunId);
    const projectionPath = getTeamCommunicationProjectionPath(teamMemoryDir);
    await this.projectionStore.writeProjection(teamMemoryDir, projection);
    logger.info(
      `${LOG_PREFIX} projection ${upsertAction} teamRunId=${teamRunId} messageId=${message.messageId} senderRunId=${message.senderRunId} receiverRunId=${message.receiverRunId} referenceCount=${message.referenceFiles.length} projectionPath=${projectionPath}`,
    );
  }

  private async loadProjection(teamRunId: string): Promise<TeamCommunicationProjection> {
    const cached = this.projectionByTeamRunId.get(teamRunId);
    if (cached) {
      return cloneTeamCommunicationProjection(cached);
    }

    const loaded = normalizeTeamCommunicationProjection(
      await this.projectionStore.readProjection(
        this.teamLayout.getTeamDirPath(teamRunId),
      ),
      { teamRunId },
    );
    this.projectionByTeamRunId.set(teamRunId, loaded);
    return cloneTeamCommunicationProjection(loaded);
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

  private upsertMessage(
    projection: TeamCommunicationProjection,
    incoming: TeamCommunicationMessage,
  ): "inserted" | "updated" | "unchanged" {
    const existing = projection.messages.find(
      (message) => message.messageId === incoming.messageId,
    );
    if (!existing) {
      projection.messages.push(incoming);
      return "inserted";
    }
    if (incoming.updatedAt.localeCompare(existing.updatedAt) < 0) {
      return "unchanged";
    }

    const nextMessage = {
      ...existing,
      ...incoming,
      createdAt: existing.createdAt || incoming.createdAt,
      updatedAt: incoming.updatedAt,
      referenceFiles: incoming.referenceFiles,
    };
    if (JSON.stringify(existing) === JSON.stringify(nextMessage)) {
      return "unchanged";
    }

    Object.assign(existing, nextMessage);
    return "updated";
  }

  private clearTeamRunState(teamRunId: string): void {
    this.projectionByTeamRunId.delete(teamRunId);
    this.operationQueueByTeamRunId.delete(teamRunId);
  }
}

let cachedService: TeamCommunicationService | null = null;

export const getTeamCommunicationService = (): TeamCommunicationService => {
  if (!cachedService) {
    cachedService = new TeamCommunicationService();
  }
  return cachedService;
};
