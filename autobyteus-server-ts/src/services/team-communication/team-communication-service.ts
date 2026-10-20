import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { ROOT_NOT_ACTIVE_MESSAGE } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { RootCommunicationEngine, type RemoteAcceptInput } from "../../agent-collaboration/execution/communication/root-communication-engine.js";
import type { InterAgentMessageDeliveryIntent } from "../../agent-team-execution/domain/inter-agent-message-delivery.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { TeamCommunicationAdapter, type TeamCommunicationAdapterOptions } from "./team-communication-adapter.js";
import type { TeamCommunicationMessagesSnapshot } from "./team-communication-messages-file.js";
import type { RemoteSendEngine } from "../../agent-collaboration/execution/remote/remote-message-send.js";

/** Team-private facade over the root-neutral accepted-message engine. */
export class TeamCommunicationService {
  private readonly engine: RootCommunicationEngine;
  private accepting = true;

  constructor(private readonly options: TeamCommunicationAdapterOptions) {
    this.engine = new RootCommunicationEngine(new TeamCommunicationAdapter(options, () => this.accepting));
  }

  getSnapshot(): TeamCommunicationMessagesSnapshot {
    return Object.freeze({
      schemaVersion: 1,
      rootTeamRunId: this.options.rootTeamRunId,
      messages: this.engine.getMessages(),
    });
  }
  closeAdmission(): void { this.accepting = false; this.engine.closeAdmission(); }

  /** The engine's outbound remote steps, for the Team's shared `RemoteMessageSend` (the engine stays private). */
  remoteSendEngine(): RemoteSendEngine { return this.engine; }

  /** A message from a linked remote run for an agent of this Team, after the delivery's link check and wake. */
  acceptFromRemote(input: RemoteAcceptInput): Promise<AgentOperationResult> {
    return this.engine.acceptFromRemote(input);
  }

  deliver(input: {
    intent: InterAgentMessageDeliveryIntent;
    receiverIdentity: CollaborationMemberExecutionIdentity;
    receiverDisplayName: string;
    /** The sender's address as the receiver can use it (design T-5); null otherwise. */
    senderAddress: string | null;
  }): Promise<AgentOperationResult> {
    if (!this.accepting) {
      return Promise.resolve({ accepted: false, code: "TEAM_RUN_NOT_ACCEPTING_MESSAGES", message: ROOT_NOT_ACTIVE_MESSAGE });
    }
    return this.engine.deliver({
      senderIdentity: input.intent.sender.participant.identity,
      senderDisplayName: input.intent.sender.participant.displayName,
      senderAddress: input.senderAddress,
      receiverIdentity: input.receiverIdentity,
      receiverDisplayName: input.receiverDisplayName,
      content: input.intent.content,
      messageType: input.intent.messageType,
      referenceFiles: input.intent.referenceFiles,
    });
  }
}
