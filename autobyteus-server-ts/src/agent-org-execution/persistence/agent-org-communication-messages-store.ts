import fs from "node:fs/promises";
import path from "node:path";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import { memoryRootOfCoordinatingDir } from "../../agent-memory/store/agent-memory-layout.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import { AGENT_ORG_RUN_TREE_SHAPE } from "../../run-history/store/coordinating-tree-shapes.js";
import {
  appendMessageToOwnerLogs,
  composeMessageLogs,
  taskAgentLogOwners,
  TaskAgentMessageLogs,
  type MessageLogOwner,
} from "../../run-history/store/task-agent-message-logs.js";
import { agentRunIdsOfTree } from "../../run-history/store/task-execution-tree-split.js";
import type { AgentOrgRunExecutionTreeFile } from "../domain/agent-org-run-execution-tree.js";
import {
  AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME,
  type AgentOrgCommunicationMessagesFile,
} from "./agent-org-communication-messages.js";
import { validateAgentOrgCommunicationMessages } from "./agent-org-communication-messages-schema.js";

export const getAgentOrgCommunicationMessagesPath = (orgDir: string): string =>
  path.join(path.resolve(orgDir), AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME);
const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/**
 * An organization run's message log and its stored view (design D-4): the run's own log plus its loaded
 * task agents' own logs. New messages are appended to the logs they belong to, never rewritten from a
 * loaded list.
 */
export class AgentOrgCommunicationMessagesStore {
  constructor(private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter()) {}

  /** The organization run's own log file. */
  async readLog(orgDir: string, orgRunId: string): Promise<AgentOrgCommunicationMessagesFile | null> {
    try {
      return validateAgentOrgCommunicationMessages(
        JSON.parse(await fs.readFile(getAgentOrgCommunicationMessagesPath(orgDir), "utf8")),
        orgRunId,
      );
    } catch (error) { if (missing(error)) return null; throw error; }
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

  /** Creates the run's log (its initial package). */
  write(orgDir: string, messages: AgentOrgCommunicationMessagesFile): Promise<RunPackageFileWriteResult<"org_communication_messages">> {
    const normalized = validateAgentOrgCommunicationMessages(messages, messages.orgRunId);
    return this.writer.write({
      file: "org_communication_messages",
      filePath: getAgentOrgCommunicationMessagesPath(orgDir),
      payload: normalized,
    });
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
      const own = await this.readLog(orgDir, orgRunId);
      if (!own) throw new Error(`AgentOrg '${orgRunId}' has no message log.`);
      if (own.messages.some((entry) => entry.messageId === message.messageId)) return null;
      return this.write(orgDir, { ...own, messages: [...own.messages, message] });
    });
  }

  private taskLogs(orgDir: string): TaskAgentMessageLogs {
    return new TaskAgentMessageLogs(memoryRootOfCoordinatingDir("agent_org", orgDir), this.writer);
  }
}
