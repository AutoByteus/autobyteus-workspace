import fs from "node:fs";
import fsPromises from "node:fs/promises";
import type {
  StandaloneRootMessagesFileV1,
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
  validateStandaloneRootMessagesV1,
  validateStandaloneRootTreePayload,
} from "./standalone-root-tree-schema.js";

const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/** Reader and writer of one Agent-root collaboration package (tree plus communication messages). */
export class StandaloneRootPackageStore {
  constructor(
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {}

  async readTree(collaborationDir: string, hostRunId: string): Promise<StandaloneRootTreeFile | null> {
    try {
      const value = JSON.parse(await fsPromises.readFile(getStandaloneRootTreePath(collaborationDir), "utf8")) as unknown;
      return validateStandaloneRootTreePayload(value, hostRunId);
    } catch (error) {
      if (missing(error)) return null;
      throw error;
    }
  }

  readTreeSync(collaborationDir: string, hostRunId: string): StandaloneRootTreeFile | null {
    try {
      const value = JSON.parse(fs.readFileSync(getStandaloneRootTreePath(collaborationDir), "utf8")) as unknown;
      return validateStandaloneRootTreePayload(value, hostRunId);
    } catch (error) {
      if (missing(error)) return null;
      throw error;
    }
  }

  async readMessages(collaborationDir: string, hostRunId: string): Promise<StandaloneRootMessagesFileV1 | null> {
    try {
      const value = JSON.parse(await fsPromises.readFile(getStandaloneRootMessagesPath(collaborationDir), "utf8")) as unknown;
      return validateStandaloneRootMessagesV1(value, hostRunId);
    } catch (error) {
      if (missing(error)) return null;
      throw error;
    }
  }

  writeTree(collaborationDir: string, tree: StandaloneRootTreeFile): Promise<RunPackageFileWriteResult<"execution_tree">> {
    const normalized = validateStandaloneRootTreePayload(tree, tree.host.agentRunId);
    return this.writer.write({ file: "execution_tree", filePath: getStandaloneRootTreePath(collaborationDir), payload: normalized });
  }

  writeMessages(
    collaborationDir: string,
    messages: StandaloneRootMessagesFileV1,
  ): Promise<RunPackageFileWriteResult<"communication_messages">> {
    const normalized = validateStandaloneRootMessagesV1(messages, messages.hostRunId);
    return this.writer.write({
      file: "communication_messages",
      filePath: getStandaloneRootMessagesPath(collaborationDir),
      payload: normalized,
    });
  }
}
