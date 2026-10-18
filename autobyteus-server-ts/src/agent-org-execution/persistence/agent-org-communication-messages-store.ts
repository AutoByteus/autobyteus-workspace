import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import { memoryRootOfCoordinatingDir } from "../../agent-memory/store/agent-memory-layout.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import { AGENT_ORG_RUN_TREE_SHAPE } from "../../run-history/store/coordinating-tree-shapes.js";
import { MessageLog } from "../../run-history/store/message-log.js";
import {
  appendMessageToOwnerLogs,
  composeMessageLogs,
  taskAgentLogOwners,
  TaskAgentMessageLogs,
  type MessageLogOwner,
} from "../../run-history/store/task-agent-message-logs.js";
import { agentRunIdsOfTree } from "../../run-history/store/task-execution-tree-split.js";
import type { AgentOrgRunExecutionTreeFile } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgCommunicationMessagesFile } from "./agent-org-communication-messages.js";

/**
 * An organization run's message log (`agent_org_communication_messages`, a `MessageLog`) and its stored
 * view (design D-4): the run's own log plus its loaded task agents' own logs. New messages are appended
 * to the logs they belong to, never rewritten from a loaded list.
 */
export class AgentOrgCommunicationMessagesStore {
  constructor(private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter()) {}

  private ownLog(orgDir: string): MessageLog {
    return new MessageLog(orgDir, "agent_org_communication_messages", { writer: this.writer });
  }

  /** Whether the run's own log exists (any of its files). */
  hasLog(orgDir: string): Promise<boolean> {
    return this.ownLog(orgDir).exists();
  }

  /** The organization run's own log; `null` without a log. */
  async readLog(orgDir: string, orgRunId: string): Promise<AgentOrgCommunicationMessagesFile | null> {
    const messages = await this.ownLog(orgDir).read();
    return messages ? Object.freeze({ schemaVersion: 1, subjectKind: "agent_org", orgRunId, messages }) : null;
  }

  /** The stored view for a composed tree: the run's log and its loaded task agents' logs (L6); `null` without a log. */
  async read(orgDir: string, tree: AgentOrgRunExecutionTreeFile): Promise<AgentOrgCommunicationMessagesFile | null> {
    const orgRunId = tree.rootOrg.orgRunId;
    const own = await this.readLog(orgDir, orgRunId);
    if (!own) return null;
    const owners = taskAgentLogOwners(AGENT_ORG_RUN_TREE_SHAPE.taskLists(tree).values());
    const logs = owners.length === 0 ? [] : await Promise.all(owners.map((owner) => this.taskLogs(orgDir).read(owner)));
    return Object.freeze({
      schemaVersion: 1, subjectKind: "agent_org", orgRunId,
      messages: Object.freeze(composeMessageLogs([own.messages, ...logs], agentRunIdsOfTree(AGENT_ORG_RUN_TREE_SHAPE, tree))),
    });
  }

  /** Creates the run's log (its initial package; replaced on a retry). */
  async write(orgDir: string, messages: AgentOrgCommunicationMessagesFile): Promise<RunPackageFileWriteResult<"org_communication_messages">> {
    return { ...await this.ownLog(orgDir).writeInitial(messages.messages), file: "org_communication_messages" };
  }

  /** Adds one committed message to each log it belongs to, receiver's first (contract §3.4, DEC-011). */
  appendMessage(
    orgDir: string,
    orgRunId: string,
    message: CollaborationCommunicationMessage,
    owners: readonly MessageLogOwner[],
  ): Promise<RunPackageFileWriteResult<"communication_messages">> {
    return appendMessageToOwnerLogs(owners, async (owner) => {
      if (owner.kind !== "coordinating") return this.taskLogs(orgDir).append(owner, message);
      const log = this.ownLog(orgDir);
      if (!await log.exists()) throw new Error(`AgentOrg '${orgRunId}' has no message log.`);
      return log.append(message);
    });
  }

  private taskLogs(orgDir: string): TaskAgentMessageLogs {
    return new TaskAgentMessageLogs(memoryRootOfCoordinatingDir("agent_org", orgDir), this.writer);
  }
}
