import fsPromises from "node:fs/promises";
import type {
  StandaloneRootMessagesFile,
  StandaloneRootTreeFile,
} from "../domain/standalone-root-tree.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import {
  getStandaloneRootMessagesPath,
  getStandaloneRootTreePath,
} from "./standalone-root-tree-path.js";
import {
  validateStandaloneRootMessages,
  validateStandaloneRootTreePayload,
} from "./standalone-root-tree-schema.js";
import { memoryRootOfCoordinatingDir } from "../../agent-memory/store/agent-memory-layout.js";
import { STANDALONE_ROOT_TREE_SHAPE } from "../../run-history/store/coordinating-tree-shapes.js";
import { TaskAgentOwnFiles } from "../../run-history/store/task-agent-own-files.js";
import {
  appendMessageToOwnerLogs,
  composeMessageLogs,
  taskAgentLogOwners,
  TaskAgentMessageLogs,
  type MessageLogOwner,
} from "../../run-history/store/task-agent-message-logs.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import {
  commitSplitTree,
  composeTreeFile,
  composeTreeFileSync,
  readRawTreeFile,
  readRawTreeFileSync,
  agentRunIdsOfTree,
  splitTaskExecutions,
} from "../../run-history/store/task-execution-tree-split.js";

const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/** Reader and writer of one Agent-root collaboration package (tree plus communication messages). */
export class StandaloneRootPackageStore {
  private taskLogs(collaborationDir: string): TaskAgentMessageLogs {
    return new TaskAgentMessageLogs(memoryRootOfCoordinatingDir("agent", collaborationDir), this.writer);
  }

  private ownFiles(collaborationDir: string): () => TaskAgentOwnFiles {
    return () => new TaskAgentOwnFiles(memoryRootOfCoordinatingDir("agent", collaborationDir), this.writer);
  }

  constructor(
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {}

  /** The host's tree with its task agents composed from their own files (D-1). */
  async readTree(collaborationDir: string, hostRunId: string): Promise<StandaloneRootTreeFile | null> {
    const raw = await readRawTreeFile(getStandaloneRootTreePath(collaborationDir));
    if (!raw) return null;
    return validateStandaloneRootTreePayload(
      await composeTreeFile(STANDALONE_ROOT_TREE_SHAPE, raw, this.ownFiles(collaborationDir)), hostRunId);
  }

  readTreeSync(collaborationDir: string, hostRunId: string): StandaloneRootTreeFile | null {
    const raw = readRawTreeFileSync(getStandaloneRootTreePath(collaborationDir));
    if (!raw) return null;
    return validateStandaloneRootTreePayload(
      composeTreeFileSync(STANDALONE_ROOT_TREE_SHAPE, raw, this.ownFiles(collaborationDir)), hostRunId);
  }

  /** The stored view for a composed tree: the host's log and its loaded task agents' logs (D-4, L6); `null` without a log. */
  async readMessages(collaborationDir: string, tree: StandaloneRootTreeFile): Promise<StandaloneRootMessagesFile | null> {
    const hostRunId = tree.host.agentRunId;
    const own = await this.readMessagesLog(collaborationDir, hostRunId);
    if (!own) return null;
    const owners = taskAgentLogOwners(STANDALONE_ROOT_TREE_SHAPE.taskLists(tree).values());
    const logs = owners.length === 0 ? [] : await Promise.all(owners.map((owner) => this.taskLogs(collaborationDir).read(owner)));
    return Object.freeze({
      schemaVersion: 1, subjectKind: "agent", hostRunId,
      messages: Object.freeze(composeMessageLogs([own.messages, ...logs], agentRunIdsOfTree(STANDALONE_ROOT_TREE_SHAPE, tree))),
    });
  }

  /** The host's own message log file. */
  async readMessagesLog(collaborationDir: string, hostRunId: string): Promise<StandaloneRootMessagesFile | null> {
    try {
      const value = JSON.parse(await fsPromises.readFile(getStandaloneRootMessagesPath(collaborationDir), "utf8")) as unknown;
      return validateStandaloneRootMessages(value, hostRunId);
    } catch (error) {
      if (missing(error)) return null;
      throw error;
    }
  }

  /** Splits the tree: each new or changed task agent's own file first, then the links tree (D-1). */
  async writeTree(collaborationDir: string, tree: StandaloneRootTreeFile): Promise<RunPackageFileWriteResult<"execution_tree">> {
    const normalized = validateStandaloneRootTreePayload(tree, tree.host.agentRunId);
    const filePath = getStandaloneRootTreePath(collaborationDir);
    const split = await splitTaskExecutions({
      shape: STANDALONE_ROOT_TREE_SHAPE, tree: normalized, treeFile: normalized,
      rawOnDisk: await readRawTreeFile(filePath), files: this.ownFiles(collaborationDir),
    });
    return commitSplitTree(split, "execution_tree", (payload) => this.writer.write({ file: "execution_tree", filePath, payload }));
  }

  /** Adds one committed message to each log it belongs to, receiver's first (contract §3.4, DEC-011). */
  appendMessage(
    collaborationDir: string,
    hostRunId: string,
    message: CollaborationCommunicationMessage,
    owners: readonly MessageLogOwner[],
  ): Promise<RunPackageFileWriteResult<"communication_messages">> {
    return appendMessageToOwnerLogs(owners, async (owner) => {
      if (owner.kind !== "coordinating") return this.taskLogs(collaborationDir).append(owner, message);
      const own = await this.readMessagesLog(collaborationDir, hostRunId);
      if (!own) throw new Error(`Agent root '${hostRunId}' has no message log.`);
      if (own.messages.some((entry) => entry.messageId === message.messageId)) return null;
      return this.writeMessages(collaborationDir, { ...own, messages: [...own.messages, message] });
    });
  }

  /** Creates the host's message log (the package's first write); appends go through `appendMessage`. */
  writeMessages(
    collaborationDir: string,
    messages: StandaloneRootMessagesFile,
  ): Promise<RunPackageFileWriteResult<"communication_messages">> {
    const normalized = validateStandaloneRootMessages(messages, messages.hostRunId);
    return this.writer.write({
      file: "communication_messages",
      filePath: getStandaloneRootMessagesPath(collaborationDir),
      payload: normalized,
    });
  }
}
