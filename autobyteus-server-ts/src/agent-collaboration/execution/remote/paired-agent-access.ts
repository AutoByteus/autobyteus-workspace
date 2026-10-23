import type { AgentPresentationMessage, RemoteAgentStatus } from "@autobyteus/agent-presentation-contracts";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { RemoteOwnerCommand } from "./remote-run-channel.js";

/** One presentation message of one of the run's own agents (an Agent's host, a Team's members). */
export type PairedAgentPresentationListener = (agentRunId: string, message: AgentPresentationMessage) => void;
export type PairedAgentObservation = Readonly<{ close(): void }>;
/** The node whose owner sends a command, by this node's name for it (the peer's registered name). */
export type RemoteOwner = Readonly<{ nodeName: string }>;
export type PairedAgentStatus = Readonly<{ agentRunId: string; status: RemoteAgentStatus }>;

/**
 * autobyteus-278 (AR-401): a run a peer started, as the node that runs it serves the peer's owner. Each root kind's
 * manager offers it from where that kind keeps its agents (a standalone run's host, a Team root's members); only
 * the agents the back-link pairs with are observed or commanded. The link check precedes every call.
 */
export type PairedAgentAccess = Readonly<{
  /**
   * Follows the run across host restores or root restores (idle shutdown) until closed, or until the run ends by stop,
   * terminate or delete through any path: then `onEnded` runs once and the observation is closed (DS-006). `null` when
   * there is no such run.
   */
  observePairedAgents(runId: string, onPresentation: PairedAgentPresentationListener, onEnded: () => void): Promise<PairedAgentObservation | null>;
  executeOwnerCommand(runId: string, agentRunId: string, command: RemoteOwnerCommand, owner: RemoteOwner): Promise<AgentOperationResult>;
  /** The live statuses of the paired agents; an agent that is not live is not listed (offline). */
  pairedAgentStatuses(runId: string): readonly PairedAgentStatus[];
}>;

/**
 * The user input an owner message becomes (DS-004a, SR-006): the owner's text under a heading naming the peer's
 * owner, so the agent, the stored conversation and both nodes' windows read who wrote it. This is the heading's one
 * owner, as `buildTaskWorkText` owns the task header. It is the run's input on its node (REQ-803 as clarified at
 * SR-004), not a run-to-run message. `message_id` and `dedupe_key` pass through unchanged, so the sending window
 * matches its echo to the streamed message (N-405).
 */
export const remoteOwnerUserMessage = (
  command: Extract<RemoteOwnerCommand, { kind: "post_message" }>,
  owner: RemoteOwner,
): AgentInputUserMessage => AgentInputUserMessage.fromDict({
  content: `From the owner of node "${owner.nodeName}":\n\n${command.content}`,
  context_files: null,
  metadata: { input_origin: "user_message", message_id: command.messageId, dedupe_key: command.dedupeKey },
});

const pathRefusal = (code: string, message: string): AgentOperationResult => Object.freeze({ accepted: false, code, message });
export const notPairedRefusal = (agentRunId: string): AgentOperationResult =>
  pathRefusal("TARGET_NOT_PERMITTED", `AgentRun '${agentRunId}' is not one of this run's own agents.`);
export const notLiveRefusal = (agentRunId: string): AgentOperationResult =>
  pathRefusal("RUN_NOT_ACTIVE", `AgentRun '${agentRunId}' is not running.`);
