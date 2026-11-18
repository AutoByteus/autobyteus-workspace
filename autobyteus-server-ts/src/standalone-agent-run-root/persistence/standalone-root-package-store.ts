import type { StandaloneRootMessagesFile } from "../domain/standalone-run-agent.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import { MessageLog } from "../../run-history/store/message-log.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";

/**
 * A standalone run's own message log, in its run folder `memory/agents/<id>/` (contract §3.4, TC-13): the messages its
 * agent sent and received, with other runs of this node and with runs on peer nodes. Created by its first message.
 */
export class StandaloneRootPackageStore {
  constructor(private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter()) {}

  private log(runDir: string): MessageLog {
    return new MessageLog(runDir, "communication_messages", { writer: this.writer });
  }

  /** The run's log; `null` without one. */
  async readMessagesLog(runDir: string, agentRunId: string): Promise<StandaloneRootMessagesFile | null> {
    const messages = await this.log(runDir).read();
    return messages ? Object.freeze({ schemaVersion: 1, subjectKind: "agent", agentRunId, messages }) : null;
  }

  logExists(runDir: string): Promise<boolean> { return this.log(runDir).exists(); }

  /** Creates the log (its first message's write, replaced on a retry). */
  writeMessages(runDir: string, messages: StandaloneRootMessagesFile): Promise<RunPackageFileWriteResult<"communication_messages">> {
    return this.log(runDir).writeInitial(messages.messages);
  }

  appendMessage(runDir: string, message: CollaborationCommunicationMessage): Promise<RunPackageFileWriteResult<"communication_messages">> {
    return this.log(runDir).append(message);
  }
}
