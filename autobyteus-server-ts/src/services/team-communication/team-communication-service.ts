import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { RootCommunicationEngine } from "../../agent-collaboration/execution/communication/root-communication-engine.js";
import type { InterAgentMessageDeliveryIntent } from "../../agent-team-execution/domain/inter-agent-message-delivery.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { TeamCommunicationAdapter, type TeamCommunicationAdapterOptions } from "./team-communication-adapter.js";
import type { TeamCommunicationMessagesSnapshot } from "./team-communication-v1-types.js";

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

  deliver(input: {
    intent: InterAgentMessageDeliveryIntent;
    receiverIdentity: CollaborationMemberExecutionIdentity;
    receiverDisplayName: string;
  }): Promise<AgentOperationResult> {
    if (!this.accepting) {
      return Promise.resolve({ accepted: false, code: "TEAM_RUN_NOT_ACCEPTING_MESSAGES", message: `Root TeamRun '${this.options.rootTeamRunId}' is not accepting messages.` });
    }
    return this.engine.deliver({
      senderIdentity: input.intent.sender.participant.identity,
      senderDisplayName: input.intent.sender.participant.displayName,
      receiverIdentity: input.receiverIdentity,
      receiverDisplayName: input.receiverDisplayName,
      content: input.intent.content,
      messageType: input.intent.messageType,
      referenceFiles: input.intent.referenceFiles,
    });
  }
}
