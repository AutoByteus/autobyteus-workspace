import fs from "node:fs";
import fsPromises from "node:fs/promises";
import type {
  AgentRunCollaborationMessagesFileV1,
  AgentRunCollaborationTreeFile,
} from "../../agent-run-collaboration/domain/agent-run-collaboration-tree.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "./atomic-run-package-file-commit-writer.js";
import {
  getAgentRunCollaborationMessagesPath,
  getAgentRunCollaborationTreePath,
} from "./agent-run-collaboration-tree-path.js";
import {
  validateAgentRunCollaborationMessagesV1,
  validateAgentRunCollaborationTreePayload,
} from "./agent-run-collaboration-tree-schema.js";

const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/** Reader and writer of one Agent-root collaboration package (tree plus communication messages). */
export class AgentRunCollaborationPackageStore {
  constructor(
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {}

  async readTree(collaborationDir: string, hostRunId: string): Promise<AgentRunCollaborationTreeFile | null> {
    try {
      const value = JSON.parse(await fsPromises.readFile(getAgentRunCollaborationTreePath(collaborationDir), "utf8")) as unknown;
      return validateAgentRunCollaborationTreePayload(value, hostRunId);
    } catch (error) {
      if (missing(error)) return null;
      throw error;
    }
  }

  readTreeSync(collaborationDir: string, hostRunId: string): AgentRunCollaborationTreeFile | null {
    try {
      const value = JSON.parse(fs.readFileSync(getAgentRunCollaborationTreePath(collaborationDir), "utf8")) as unknown;
      return validateAgentRunCollaborationTreePayload(value, hostRunId);
    } catch (error) {
      if (missing(error)) return null;
      throw error;
    }
  }

  async readMessages(collaborationDir: string, hostRunId: string): Promise<AgentRunCollaborationMessagesFileV1 | null> {
    try {
      const value = JSON.parse(await fsPromises.readFile(getAgentRunCollaborationMessagesPath(collaborationDir), "utf8")) as unknown;
      return validateAgentRunCollaborationMessagesV1(value, hostRunId);
    } catch (error) {
      if (missing(error)) return null;
      throw error;
    }
  }

  writeTree(collaborationDir: string, tree: AgentRunCollaborationTreeFile): Promise<RunPackageFileWriteResult<"execution_tree">> {
    const normalized = validateAgentRunCollaborationTreePayload(tree, tree.host.agentRunId);
    return this.writer.write({ file: "execution_tree", filePath: getAgentRunCollaborationTreePath(collaborationDir), payload: normalized });
  }

  writeMessages(
    collaborationDir: string,
    messages: AgentRunCollaborationMessagesFileV1,
  ): Promise<RunPackageFileWriteResult<"communication_messages">> {
    const normalized = validateAgentRunCollaborationMessagesV1(messages, messages.hostRunId);
    return this.writer.write({
      file: "communication_messages",
      filePath: getAgentRunCollaborationMessagesPath(collaborationDir),
      payload: normalized,
    });
  }
}
