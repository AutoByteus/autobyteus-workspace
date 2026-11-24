import { randomUUID } from "node:crypto";
import { collaboratorMentionsDtoSchema } from "@autobyteus/agent-presentation-contracts";
import { toCollaboratorMentions } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import {
  AgentInputUserMessage,
  ContextFile,
  ContextFileType,
} from "autobyteus-ts";
import { AgentRun } from "../../agent-execution/domain/agent-run.js";
import {
  AgentRunService,
  getAgentRunService,
} from "../../agent-execution/services/agent-run-service.js";
import {
  AgentRunCommandCoordinator,
} from "../../agent-execution/services/agent-run-command-coordinator.js";
import {
  AgentRunStatusProjectionService,
  getAgentRunStatusProjectionService,
} from "../../agent-execution/services/agent-run-status-projection-service.js";
import { AgentSessionManager } from "./agent-session-manager.js";
import {
  AgentStreamBroadcaster,
  getAgentStreamBroadcaster,
} from "./agent-stream-broadcaster.js";
import {
  ClientMessageType,
  createConnectedMessage,
  ServerMessage,
  ServerMessageType,
  createErrorMessage,
} from "./models.js";
import {
  buildInterruptGenerationCommandAck,
  normalizeInterruptCommandId,
} from "./interrupt-generation-command-ack.js";
import { NOTHING_TO_INTERRUPT, userInterruptOutcome } from "./user-interrupt-outcome.js";
import { AgentStreamWebSocketEgress, type AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";
import { createSequencedStreamEgressControlComposition } from "./websocket-egress/agent-stream-egress-control-composition.js";
import { agentStreamSequencedShape } from "./websocket-egress/agent-stream-sequenced-shape.js";
import { getAgentStreamSequences, type AgentStreamSequences } from "./agent-stream-sequence.js";
import { connectToActiveRun, sendStoredSnapshot } from "./agent-stream-connection.js";
import type { ReadStoredRun } from "./agent-stream-snapshot.js";
import { getAgentRunViewProjectionService } from "../../run-history/services/agent-run-view-projection-service.js";
import { followAgentRun, type AgentRunFollowSources } from "./agent-run-follower.js";
import { getActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { getStandaloneAgentRunRootManager } from "../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";

export type WebSocketConnection = {
  send: (data: string) => void;
  close: (code?: number) => void;
};

type ClientMessage = {
  type?: string;
  payload?: Record<string, unknown>;
};

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class AgentStreamHandler {
  private sessionManager: AgentSessionManager;
  /** Each session's connection to its bound run's own stream (SR-087): its close. */
  private activeRunUnsubscribers = new Map<string, () => void>();
  private connections = new Map<string, WebSocketConnection>();
  private sessionEgresses = new Map<string, AgentStreamWebSocketEgress>();
  private subscribedRunsBySessionId = new Map<
    string,
    AgentRun
  >();
  private agentRunService: AgentRunService;
  private commandCoordinator: AgentRunCommandCoordinator;
  private statusProjectionService: AgentRunStatusProjectionService;
  private broadcaster: AgentStreamBroadcaster;
  /** Each open session's follow of its run (SR-064): it binds whenever the run becomes ready, whoever readied it. */
  private followers = new Map<string, () => void>();

  constructor(
    sessionManager: AgentSessionManager = new AgentSessionManager(),
    agentRunService: AgentRunService = getAgentRunService(),
    broadcaster: AgentStreamBroadcaster = getAgentStreamBroadcaster(),
    /** The composed coordinator (the supervisor's; autobyteus-500 FU-011). */
    commandCoordinator: AgentRunCommandCoordinator,
    statusProjectionService: AgentRunStatusProjectionService = getAgentRunStatusProjectionService(),
    private readonly follow: AgentRunFollowSources | null = null,
    /** Each active run's own stream sequence (SR-087), and its stored read for the snapshot. */
    private readonly sequences: Pick<AgentStreamSequences, "of" | "follow"> = getAgentStreamSequences(),
    private readonly readStored: ReadStoredRun = (runId) => getAgentRunViewProjectionService().getProjection(runId),
  ) {
    this.sessionManager = sessionManager;
    this.agentRunService = agentRunService;
    this.broadcaster = broadcaster;
    this.commandCoordinator = commandCoordinator;
    this.statusProjectionService = statusProjectionService;
  }

  async connect(connection: WebSocketConnection, agentRunId: string): Promise<string | null> {
    const projection = await this.statusProjectionService.getRunStatusProjection(agentRunId);
    if (projection.statusSource === "MISSING") {
      this.closeWithAgentNotFound(connection, agentRunId);
      return null;
    }

    const sessionId = randomUUID();
    try {
      const session = this.sessionManager.createSession(sessionId, agentRunId);
      session.connect();
    } catch (error) {
      logger.error(`Failed to create session: ${String(error)}`);
      const errorMsg = createErrorMessage("SESSION_ERROR", String(error));
      connection.send(errorMsg.toJson());
      connection.close(1011);
      return null;
    }

    // Its frames are numbered (SR-087): coalesced content keeps the range it covers, and nothing is suppressed.
    const egress = new AgentStreamWebSocketEgress({
      sendRaw: (payload) => connection.send(payload),
      serialize: (message) => JSON.stringify(message),
      createControls: (options) => createSequencedStreamEgressControlComposition(agentStreamSequencedShape, options),
      onSendError: (error) => logger.error(
        `Agent WebSocket egress failed: session=${sessionId}, run=${agentRunId}: ${String(error)}`,
      ),
    });
    const connectedMsg = createConnectedMessage(agentRunId, sessionId);
    this.broadcaster.registerConnection(sessionId, agentRunId, egress);
    this.sessionEgresses.set(sessionId, egress);
    this.connections.set(sessionId, connection);

    const activeRun = this.getActiveRun(agentRunId);
    if (activeRun && !this.bindSessionToRun(sessionId, activeRun, egress)) {
      this.sessionEgresses.delete(sessionId);
      this.connections.delete(sessionId);
      this.broadcaster.unregisterConnection(sessionId);
      this.sessionManager.closeSession(sessionId);
      const errorMsg = createErrorMessage(
        "AGENT_STREAM_UNAVAILABLE",
        `Agent run '${agentRunId}' stream not available`,
      );
      egress.send(errorMsg);
      egress.dispose();
      connection.close(1011);
      return null;
    }

    egress.send(connectedMsg);
    egress.send(
      new ServerMessage(
        ServerMessageType.AGENT_STATUS,
        activeRun?.getStatusSnapshot() ?? projection.statusPayload,
      ),
    );
    // A stopped run's session gets its full stored conversation; an active run's, its snapshot connection (SR-087).
    if (!activeRun) {
      void sendStoredSnapshot({ runId: agentRunId, sink: egress, readStored: this.readStored,
        isCurrent: () => this.sessionEgresses.get(sessionId) === egress && !this.subscribedRunsBySessionId.has(sessionId) })
        .catch((error: unknown) => this.failSnapshot(sessionId, agentRunId, error));
    }

    if (this.follow) this.followers.set(sessionId, followAgentRun(this.follow, agentRunId, {
      ready: (run) => { this.bindSessionToRun(sessionId, run, egress); },
      ended: () => { void this.unbindStoppedRun(sessionId, agentRunId, egress); },
    }));
    logger.info(`Agent WebSocket connected: session=${sessionId}, run=${agentRunId}`);
    return sessionId;
  }

  async handleMessage(sessionId: string, message: string): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      logger.warn(`Message for unknown session: ${sessionId}`);
      return;
    }

    try {
      const data = AgentStreamHandler.parseMessage(message);
      const msgType = data.type;
      const payload = data.payload ?? {};
      const agentRunId = session.runId;

      if (msgType === ClientMessageType.SEND_MESSAGE) {
        await this.handleSendMessage(sessionId, agentRunId, payload);
        return;
      }

      const egress = this.sessionEgresses.get(sessionId) ?? null;
      if (msgType === ClientMessageType.INTERRUPT_GENERATION) {
        await this.handleInterruptGeneration(agentRunId, payload, egress);
        return;
      }

      if (!this.ensureActiveSessionSubscription(sessionId, agentRunId)) {
        logger.warn(
          `Agent websocket session '${sessionId}' lost its active run subscription for run '${agentRunId}'.`,
        );
        return;
      }

      if (msgType === ClientMessageType.APPROVE_TOOL) {
        await this.handleToolApproval(agentRunId, payload, true);
      } else if (msgType === ClientMessageType.DENY_TOOL) {
        await this.handleToolApproval(agentRunId, payload, false);
      } else {
        logger.warn(`Unknown message type: ${String(msgType)}`);
      }
    } catch (error) {
      logger.error(`Error handling message for ${sessionId}: ${String(error)}`);
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    this.broadcaster.unregisterConnection(sessionId);
    this.followers.get(sessionId)?.();
    this.followers.delete(sessionId);

    const runUnsubscribe = this.activeRunUnsubscribers.get(sessionId);
    if (runUnsubscribe) {
      this.activeRunUnsubscribers.delete(sessionId);
      runUnsubscribe();
    }
    this.sessionEgresses.get(sessionId)?.dispose();
    this.sessionEgresses.delete(sessionId);
    this.connections.delete(sessionId);
    this.subscribedRunsBySessionId.delete(sessionId);

    this.sessionManager.closeSession(sessionId);

    logger.info(`Agent WebSocket disconnected: ${sessionId}`);
  }

  /** The run stopped (its root ended): the session stays open, unbound, with the run's stopped status (SR-064). */
  private async unbindStoppedRun(sessionId: string, agentRunId: string, egress: AgentStreamWebSocketEgress): Promise<void> {
    // The run unregisters before its last frames (its final status): the session keeps its frames until the run's own
    // sequence ends, then leaves it (CR-461-103). A run restored meanwhile is bound again and stays bound.
    const stopped = this.subscribedRunsBySessionId.get(sessionId);
    await this.untilSequenceEnds(agentRunId);
    if (this.sessionEgresses.get(sessionId) !== egress || this.subscribedRunsBySessionId.get(sessionId) !== stopped) return;
    this.activeRunUnsubscribers.get(sessionId)?.();
    this.activeRunUnsubscribers.delete(sessionId);
    this.subscribedRunsBySessionId.delete(sessionId);
    const projection = await this.statusProjectionService.getRunStatusProjection(agentRunId);
    if (this.sessionEgresses.get(sessionId) === egress) egress.send(new ServerMessage(ServerMessageType.AGENT_STATUS, projection.statusPayload));
  }

  /** Settles when the run's current sequence ends (it detaches after the run's last event), at once when it has none. */
  private untilSequenceEnds(runId: string): Promise<void> {
    const current = this.sequences.of(runId);
    if (!current) return Promise.resolve();
    return new Promise((resolve) => {
      let ended = false;
      let unfollow: (() => void) | null = null;
      unfollow = this.sequences.follow(runId, (sequence) => {
        if (sequence === current || ended) return;
        ended = true;
        unfollow?.();
        resolve();
      });
      if (ended) unfollow();
    });
  }

  private ensureActiveSessionSubscription(sessionId: string, runId: string): boolean {
    const egress = this.sessionEgresses.get(sessionId);
    if (!egress) {
      return false;
    }
    const activeRun = this.getActiveRun(runId);
    return !!activeRun && this.bindSessionToRun(sessionId, activeRun, egress);
  }

  /**
   * Binds a session to its active run: a snapshot connection to the run's own stream sequence (SR-087), sent in-band
   * when the run is restored while the stream is open (SR-064). A run with no sequence cannot be streamed.
   */
  private bindSessionToRun(
    sessionId: string,
    activeRun: AgentRun,
    egress: AgentStreamWebSocketEgress,
  ): boolean {
    const subscribedRun = this.subscribedRunsBySessionId.get(sessionId);
    if (subscribedRun === activeRun) {
      return true;
    }
    const sequence = this.sequences.of(activeRun.runId);
    if (!sequence) {
      logger.error(`Agent run '${activeRun.runId}' has no stream sequence.`);
      return false;
    }

    const existingUnsubscribe = this.activeRunUnsubscribers.get(sessionId);
    if (existingUnsubscribe) {
      egress.flush();
    }
    existingUnsubscribe?.();
    this.activeRunUnsubscribers.delete(sessionId);

    this.activeRunUnsubscribers.set(sessionId, connectToActiveRun({
      sequence,
      sink: egress,
      readStored: this.readStored,
      readInputState: () => activeRun.getInputStateSnapshot(),
      onFailure: (error) => this.failSnapshot(sessionId, activeRun.runId, error),
    }));
    this.subscribedRunsBySessionId.set(sessionId, activeRun);
    return true;
  }

  /** A snapshot that could not be read: the session ends with an error, and the client opens it again. */
  private failSnapshot(sessionId: string, runId: string, error: unknown): void {
    logger.error(`Agent stream snapshot for run '${runId}' failed: ${String(error)}`);
    const egress = this.sessionEgresses.get(sessionId);
    const connection = this.connections.get(sessionId);
    egress?.send(createErrorMessage("AGENT_STREAM_SNAPSHOT_UNAVAILABLE", `Agent run '${runId}' stream snapshot is unavailable.`));
    egress?.flush();
    void this.disconnect(sessionId);
    connection?.close(1011);
  }

  private async handleSendMessage(
    sessionId: string,
    agentRunId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const egress = this.sessionEgresses.get(sessionId);
    if (!egress) {
      return;
    }

    const content = typeof payload.content === "string" ? payload.content : "";
    const messageId = typeof payload.message_id === "string" ? payload.message_id : "";
    const dedupeKey = typeof payload.dedupe_key === "string" ? payload.dedupe_key : "";
    const contextFilePaths =
      (payload.context_file_paths as unknown[]) ?? (payload.contextFilePaths as unknown[]) ?? [];
    const imageUrls = (payload.image_urls as unknown[]) ?? (payload.imageUrls as unknown[]) ?? [];

    const contextFiles: ContextFile[] = [];
    for (const path of contextFilePaths) {
      if (typeof path === "string" && path.length > 0) {
        contextFiles.push(new ContextFile(path));
      }
    }
    for (const url of imageUrls) {
      if (typeof url === "string" && url.length > 0) {
        contextFiles.push(new ContextFile(url, ContextFileType.IMAGE));
      }
    }

    const contextPayload = contextFiles.map((file) => file.toDict());
    const userMessage = AgentInputUserMessage.fromDict({
      content,
      context_files: contextPayload.length > 0 ? contextPayload : null,
    });
    const mentions = payload.mentions === undefined ? { success: true as const, data: [] } : collaboratorMentionsDtoSchema.safeParse(payload.mentions);
    if (!mentions.success) {
      egress.send(new ServerMessage(ServerMessageType.AGENT_COMMAND_ACK, {
        command_type: "SEND_MESSAGE", run_id: agentRunId, message_id: messageId, dedupe_key: dedupeKey,
        state: "rejected", accepted: false, duplicate: false,
        code: "COLLABORATOR_MENTION_INVALID", message: "Mentions must be at most 8 unique Agents or Agent Teams.",
        // A refused send is shown as a row: it carries the node's time (autobyteus-628 D-3).
        occurred_at: new Date().toISOString(),
      }));
      return;
    }

    const result = await this.commandCoordinator.postUserMessage({
      runId: agentRunId,
      messageId,
      dedupeKey,
      message: userMessage,
      summary: content,
      mentions: toCollaboratorMentions(mentions.data),
      onActiveRunReady: (activeRun) => {
        this.bindSessionToRun(sessionId, activeRun, egress);
      },
    });
    egress.send(
      new ServerMessage(
        ServerMessageType.AGENT_COMMAND_ACK,
        // A refused send is shown as a row: the ack carries the node's time (autobyteus-628 D-3).
        { ...result.ack, occurred_at: new Date().toISOString() },
      ),
    );
    if (!result.ack.accepted) {
      logger.warn(
        `SEND_MESSAGE command not accepted for agent run ${agentRunId}: [${result.ack.code ?? "UNKNOWN"}] ${result.ack.message ?? "no message"}`,
      );
    }
  }

  private async handleInterruptGeneration(
    agentRunId: string,
    payload: Record<string, unknown>,
    sink: AgentStreamServerMessageSink | null,
  ): Promise<void> {
    const activeRun = this.getActiveRun(agentRunId);
    const target = { target_kind: "standalone_run" as const, run_id: agentRunId };
    const commandId = normalizeInterruptCommandId(payload.command_id);
    if (!commandId) {
      sink?.send(new ServerMessage(
        ServerMessageType.AGENT_COMMAND_ACK,
        buildInterruptGenerationCommandAck({ commandId, target }),
      ));
      return;
    }
    if (!activeRun) {
      sink?.send(new ServerMessage(
        ServerMessageType.AGENT_COMMAND_ACK,
        buildInterruptGenerationCommandAck({ commandId, target, result: NOTHING_TO_INTERRUPT }),
      ));
      return;
    }
    try {
      const result = userInterruptOutcome(await activeRun.interrupt(null));
      sink?.send(new ServerMessage(
        ServerMessageType.AGENT_COMMAND_ACK,
        buildInterruptGenerationCommandAck({ commandId, target, result }),
      ));
      if (!result.accepted) {
        logger.warn(
          `INTERRUPT_GENERATION rejected for agent run ${agentRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
        );
      }
    } catch (error) {
      sink?.send(new ServerMessage(
        ServerMessageType.AGENT_COMMAND_ACK,
        buildInterruptGenerationCommandAck({
          commandId,
          target,
          executionError: error,
        }),
      ));
    }
  }

  private async handleToolApproval(
    agentRunId: string,
    payload: Record<string, unknown>,
    approved: boolean,
  ): Promise<void> {
    const invocationId = payload.invocation_id;
    if (typeof invocationId !== "string" || invocationId.length === 0) {
      logger.warn("Tool approval missing invocation_id");
      return;
    }

    const reason = typeof payload.reason === "string" ? payload.reason : null;
    const activeRun = this.getActiveRun(agentRunId);
    if (!activeRun) {
      logger.warn(`TOOL_APPROVAL rejected for missing agent run ${agentRunId}.`);
      return;
    }
    const result = await activeRun.approveToolInvocation(invocationId, approved, reason);
    if (!result.accepted) {
      logger.warn(
        `TOOL_APPROVAL rejected for agent run ${agentRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
      );
    }
  }

  private getActiveRun(runId: string): AgentRun | null {
    return this.agentRunService.getAgentRun(runId);
  }


  private closeWithAgentNotFound(connection: WebSocketConnection, runId: string): void {
    const errorMsg = createErrorMessage("AGENT_NOT_FOUND", `Agent run '${runId}' not found`);
    connection.send(errorMsg.toJson());
    connection.close(4004);
  }

  static parseMessage(raw: string): ClientMessage {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Invalid JSON: ${String(error)}`);
    }

    if (!data || typeof data !== "object" || !("type" in data)) {
      throw new Error("Message missing 'type' field");
    }

    return data as ClientMessage;
  }
}

/** The agent stream's handler of a host: the process's run services, with the coordinator its supervisor composed. */
export const createAgentStreamHandler = (commandCoordinator: AgentRunCommandCoordinator): AgentStreamHandler =>
  new AgentStreamHandler(
    new AgentSessionManager(),
    getAgentRunService(),
    getAgentStreamBroadcaster(),
    commandCoordinator,
    getAgentRunStatusProjectionService(),
    { registrations: getActiveCollaborationRootDirectory(), roots: { getActive: (agentRunId) => getStandaloneAgentRunRootManager().getActive(agentRunId) } },
  );
