import type { StandaloneRootTreeFile } from "../domain/standalone-root-tree.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,

} from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import { getStandaloneRootTreePath } from "./standalone-root-tree-path.js";
import { validateStandaloneRootTreePayload } from "./standalone-root-tree-schema.js";
import { memoryRootOfCoordinatingDir } from "../../agent-memory/store/agent-memory-layout.js";
import { STANDALONE_ROOT_TREE_SHAPE } from "../../run-history/store/coordinating-tree-shapes.js";
import { TaskAgentOwnFiles } from "../../run-history/store/task-agent-own-files.js";
import {
  composeTreeFile,

  readRawTreeFile,

} from "../../run-history/store/task-execution-tree-split.js";

/** Reader and writer of one Agent-root collaboration package (tree plus communication messages). */
export class StandaloneRootPackageStore {
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
}
