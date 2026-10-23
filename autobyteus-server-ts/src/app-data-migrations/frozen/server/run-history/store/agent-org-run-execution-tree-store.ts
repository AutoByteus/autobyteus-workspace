import type { AgentOrgRunExecutionTreeFile } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import { memoryRootOfCoordinatingDir } from "../../agent-memory/store/agent-memory-layout.js";
import {
  getAgentOrgRunFileCommitWriter,
  type AgentOrgRunFileCommitWriter,
} from "./agent-org-run-file-commit-writer.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,

} from "./atomic-run-package-file-commit-writer.js";
import { getAgentOrgRunExecutionTreePath } from "./agent-org-run-execution-tree-path.js";
import { validateAgentOrgRunExecutionTreePayload } from "./agent-org-run-execution-tree-schema.js";
import { AGENT_ORG_RUN_TREE_SHAPE } from "./coordinating-tree-shapes.js";
import { TaskAgentOwnFiles } from "./task-agent-own-files.js";
import {
  composeTreeFile,

  readRawTreeFile,

} from "./task-execution-tree-split.js";

/** Reader and writer of organization runs' trees; task agents are links on disk, composed on load (D-1). */
export class AgentOrgRunExecutionTreeStore {
  constructor(
    private readonly writer: AgentOrgRunFileCommitWriter = getAgentOrgRunFileCommitWriter(),
    private readonly ownFileWriter: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {}

  async read(orgMemoryDir: string, orgRunId: string): Promise<AgentOrgRunExecutionTreeFile | null> {
    const raw = await readRawTreeFile(getAgentOrgRunExecutionTreePath(orgMemoryDir));
    if (!raw) return null;
    return validateAgentOrgRunExecutionTreePayload(
      await composeTreeFile(AGENT_ORG_RUN_TREE_SHAPE, raw, this.ownFiles(orgMemoryDir)), orgRunId);
  }

  private ownFiles(orgMemoryDir: string): () => TaskAgentOwnFiles {
    return () => new TaskAgentOwnFiles(memoryRootOfCoordinatingDir("agent_org", orgMemoryDir), this.ownFileWriter);
  }
}
