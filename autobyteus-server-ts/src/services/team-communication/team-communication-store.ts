import fs from "node:fs/promises";
import path from "node:path";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { TeamRunExecutionTreeFile } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { memoryRootOfCoordinatingDir } from "../../agent-memory/store/agent-memory-layout.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import { validateTeamCommunicationMessagesPayload } from "./team-communication-messages-schema.js";
import type { TeamCommunicationMessagesFile } from "./team-communication-messages-file.js";
import { TEAM_RUN_TREE_SHAPE } from "../../run-history/store/coordinating-tree-shapes.js";
import { agentRunIdsOfTree } from "../../run-history/store/task-execution-tree-split.js";
import {
  appendMessageToOwnerLogs,
  composeMessageLogs,
  taskAgentLogOwners,
  TaskAgentMessageLogs,
  type MessageLogOwner,
} from "../../run-history/store/task-agent-message-logs.js";

export const TEAM_COMMUNICATION_MESSAGES_FILE_NAME = "team_communication_messages.json";

export const getTeamCommunicationMessagesPath = (teamMemoryDir: string): string =>
  path.join(path.resolve(teamMemoryDir), TEAM_COMMUNICATION_MESSAGES_FILE_NAME);

const isMissingFile = (error: unknown): boolean =>
  !!error && typeof error === "object" && "code" in error &&
  (error as { code?: unknown }).code === "ENOENT";

/**
 * A team run's message log (`team_communication_messages.json`) and its stored view (design D-4): the
 * run's own log plus its loaded task agents' own logs. New messages are appended to the logs they belong
 * to; a log is never rewritten from a loaded list.
 */
export class TeamCommunicationStore {
  constructor(
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {}

  /** One log file: this team run's own messages (or a task agent team's own log). */
  async readLog(teamMemoryDir: string, rootTeamRunId: string): Promise<TeamCommunicationMessagesFile | null> {
    try {
      const payload = JSON.parse(
        await fs.readFile(getTeamCommunicationMessagesPath(teamMemoryDir), "utf-8"),
      ) as unknown;
      return validateTeamCommunicationMessagesPayload(payload, rootTeamRunId);
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
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

  /** Creates a log (a new team run's initial package, a new task agent team's empty log). */
  async write(
    teamMemoryDir: string,
    messages: TeamCommunicationMessagesFile,
  ): Promise<RunPackageFileWriteResult<"communication_messages">> {
    const normalized = validateTeamCommunicationMessagesPayload(
      messages,
      messages.rootTeamRunId,
    );
    return this.writer.write({
      file: "communication_messages",
      filePath: getTeamCommunicationMessagesPath(teamMemoryDir),
      payload: normalized,
    });
  }

  /** Adds one committed message to each log it belongs to, receiver's first (contract §3.4, DEC-011). */
  appendMessage(
    teamMemoryDir: string,
    rootTeamRunId: string,
    message: CollaborationCommunicationMessage,
    owners: readonly MessageLogOwner[],
  ): Promise<RunPackageFileWriteResult<"communication_messages">> {
    return appendMessageToOwnerLogs(owners, async (owner) => {
      if (owner.kind !== "coordinating") return this.taskLogs(teamMemoryDir).append(owner, message);
      const own = await this.readLog(teamMemoryDir, rootTeamRunId);
      if (!own) throw new Error(`TeamRun '${rootTeamRunId}' has no message log.`);
      if (own.messages.some((entry) => entry.messageId === message.messageId)) return null;
      return this.write(teamMemoryDir, { ...own, messages: [...own.messages, message] });
    });
  }

  private taskLogs(teamMemoryDir: string): TaskAgentMessageLogs {
    return new TaskAgentMessageLogs(memoryRootOfCoordinatingDir("agent_team", teamMemoryDir), this.writer);
  }
}
