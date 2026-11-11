import type { AgentOrgRunExecutionTreeFile } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import { memoryRootOfCoordinatingDir } from "../../agent-memory/store/agent-memory-layout.js";
import {
  getAgentOrgRunFileCommitWriter,
  type AgentOrgRunFileCommitWriter,
} from "./agent-org-run-file-commit-writer.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "./atomic-run-package-file-commit-writer.js";
import { getAgentOrgRunExecutionTreePath } from "./agent-org-run-execution-tree-path.js";
import { validateAgentOrgRunExecutionTreePayload } from "./agent-org-run-execution-tree-schema.js";
import { AGENT_ORG_RUN_TREE_SHAPE } from "./coordinating-tree-shapes.js";
import { TaskAgentOwnFiles } from "./task-agent-own-files.js";
import { getOpenDelegatedRunSource, type OpenDelegatedRunSource } from "./open-delegated-run-source.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { TaskExecution } from "../domain/run-execution-tree-shared-records.js";
import {
  commitSplitTree,
  composeTreeFile,
  composeTreeFileSync,
  ownPartsOfTreeFile,
  readRawTreeFile,
  readRawTreeFileSync,
  readTaskExecutionRecord,
  splitTaskExecutions,
} from "./task-execution-tree-split.js";

/**
 * Reader and writer of organization runs' trees: on disk its own parts and its links to runs on another node; its
 * local delegated runs are the ones the Task records name, composed from their own files into the root list (D-1, D-2).
 */
export class AgentOrgRunExecutionTreeStore {
  constructor(
    private readonly writer: AgentOrgRunFileCommitWriter = getAgentOrgRunFileCommitWriter(),
    private readonly ownFileWriter: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
    /** Which delegated runs are in the tree (D-1); `null`: the process binding, resolved at the first composed read. */
    private readonly openDelegatedRuns: OpenDelegatedRunSource | null = null,
  ) {}

  async read(orgMemoryDir: string, orgRunId: string): Promise<AgentOrgRunExecutionTreeFile | null> {
    const raw = await readRawTreeFile(getAgentOrgRunExecutionTreePath(orgMemoryDir));
    if (!raw) return null;
    return validateAgentOrgRunExecutionTreePayload(await composeTreeFile(
      AGENT_ORG_RUN_TREE_SHAPE, raw, this.openRunsOf(orgRunId), this.ownFiles(orgMemoryDir)), orgRunId);
  }

  readSync(orgMemoryDir: string, orgRunId: string): AgentOrgRunExecutionTreeFile | null {
    const raw = readRawTreeFileSync(getAgentOrgRunExecutionTreePath(orgMemoryDir));
    if (!raw) return null;
    return validateAgentOrgRunExecutionTreePayload(composeTreeFileSync(
      AGENT_ORG_RUN_TREE_SHAPE, raw, this.openRunsOf(orgRunId), this.ownFiles(orgMemoryDir)), orgRunId);
  }

  /**
   * The org run's own parts (D-11): its tree with no delegated run, local or on another node. Reads the tree file only
   * and never asks the Task records: startup admission and the maintenance repair run before they are loaded.
   */
  async readOwnParts(orgMemoryDir: string, orgRunId: string): Promise<AgentOrgRunExecutionTreeFile | null> {
    const raw = await readRawTreeFile(getAgentOrgRunExecutionTreePath(orgMemoryDir));
    if (!raw) return null;
    return validateAgentOrgRunExecutionTreePayload(ownPartsOfTreeFile(AGENT_ORG_RUN_TREE_SHAPE, raw), orgRunId);
  }

  /** One delegated run's record from its own file, for adding it back to the loaded tree (D-4); throws with the reason. */
  readTaskExecution(orgMemoryDir: string, orgRunId: string, run: TaskExecutionReference): Promise<TaskExecution> {
    return readTaskExecutionRecord({ kind: "agent_org", runId: orgRunId }, run, this.ownFiles(orgMemoryDir)());
  }

  async write(
    orgMemoryDir: string,
    tree: AgentOrgRunExecutionTreeFile,
  ): Promise<RunPackageFileWriteResult> {
    const normalized = validateAgentOrgRunExecutionTreePayload(tree, tree.rootOrg.orgRunId);
    const filePath = getAgentOrgRunExecutionTreePath(orgMemoryDir);
    const split = await splitTaskExecutions({
      shape: AGENT_ORG_RUN_TREE_SHAPE, tree: normalized, treeFile: normalized,
      rawOnDisk: await readRawTreeFile(filePath), files: this.ownFiles(orgMemoryDir),
    });
    return commitSplitTree(split, "execution_tree", (payload) => this.writer.write(filePath, payload));
  }

  private openRunsOf(orgRunId: string) {
    return (this.openDelegatedRuns ?? getOpenDelegatedRunSource()).openDelegatedRunsOf({ kind: "agent_org", runId: orgRunId });
  }

  private ownFiles(orgMemoryDir: string): () => TaskAgentOwnFiles {
    return () => new TaskAgentOwnFiles(memoryRootOfCoordinatingDir("agent_org", orgMemoryDir), this.ownFileWriter);
  }
}
