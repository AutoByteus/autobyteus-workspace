import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { TeamRunExecutionTreeFile } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { memoryRootOfCoordinatingDir } from "../../agent-memory/store/agent-memory-layout.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import type { TeamCommunicationMessagesFile } from "./team-communication-messages-file.js";
import { TEAM_RUN_TREE_SHAPE } from "../../run-history/store/coordinating-tree-shapes.js";
import { MessageLog } from "../../run-history/store/message-log.js";
import { agentRunIdsOfTree } from "../../run-history/store/task-execution-tree-split.js";
import {
  appendMessageToOwnerLogs,
  composeMessageLogs,
  taskAgentLogOwners,
  TaskAgentMessageLogs,
  type StoredMessageLogOwner,
} from "../../run-history/store/task-agent-message-logs.js";

/**
 * A team run's message log (`team_communication_messages`, a `MessageLog`) and its stored view (design
 * D-4): the run's own log plus its loaded task agents' own logs. New messages are appended to the logs
 * they belong to; a log is never rewritten from a loaded list.
 */
export class TeamCommunicationStore {
  constructor(
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {}

  private ownLog(teamMemoryDir: string): MessageLog {
    return new MessageLog(teamMemoryDir, "team_communication_messages", { writer: this.writer });
  }

  /** Whether the run's own log exists (any of its files). */
  hasLog(teamMemoryDir: string): Promise<boolean> {
    return this.ownLog(teamMemoryDir).exists();
  }

  /** One log: this team run's own messages (or a task agent team's own log); `null` without a log. */
  async readLog(teamMemoryDir: string, rootTeamRunId: string): Promise<TeamCommunicationMessagesFile | null> {
    const messages = await this.ownLog(teamMemoryDir).read();
    return messages ? Object.freeze({ schemaVersion: 1, rootTeamRunId, messages }) : null;
  }

  /** The stored view for a composed tree: the run's log and its loaded task agents' logs (L6); `null` without a log. */
  async read(teamMemoryDir: string, tree: TeamRunExecutionTreeFile): Promise<TeamCommunicationMessagesFile | null> {
    const rootTeamRunId = tree.rootTeam.teamRunId;
    const own = await this.readLog(teamMemoryDir, rootTeamRunId);
    if (!own) return null;
    const owners = taskAgentLogOwners(TEAM_RUN_TREE_SHAPE.taskLists(tree).values());
    const logs = owners.length === 0 ? [] : await Promise.all(owners.map((owner) => this.taskLogs(teamMemoryDir).read(owner)));
    return Object.freeze({
      schemaVersion: 1,
      rootTeamRunId,
      messages: Object.freeze(composeMessageLogs([own.messages, ...logs], agentRunIdsOfTree(TEAM_RUN_TREE_SHAPE, tree))),
    });
  }

  /** Creates the run's log (its initial package; replaced on a retry). */
  write(
    teamMemoryDir: string,
    messages: TeamCommunicationMessagesFile,
  ): Promise<RunPackageFileWriteResult<"communication_messages">> {
    return this.ownLog(teamMemoryDir).writeInitial(messages.messages);
  }

  /** Adds one committed message to each log it belongs to, receiver's first (contract §3.4, DEC-011). */
  appendMessage(
    teamMemoryDir: string,
    rootTeamRunId: string,
    message: CollaborationCommunicationMessage,
    owners: readonly StoredMessageLogOwner[],
  ): Promise<RunPackageFileWriteResult<"communication_messages">> {
    return appendMessageToOwnerLogs(owners, async (owner) => {
      if (owner.kind !== "coordinating") return this.taskLogs(teamMemoryDir).append(owner, message);
      const log = this.ownLog(teamMemoryDir);
      if (!await log.exists()) throw new Error(`TeamRun '${rootTeamRunId}' has no message log.`);
      return log.append(message);
    });
  }

  private taskLogs(teamMemoryDir: string): TaskAgentMessageLogs {
    return new TaskAgentMessageLogs(memoryRootOfCoordinatingDir("agent_team", teamMemoryDir), this.writer);
  }
}
