import type { AgentOrgRunExecutionTreeFile } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import {
  getAgentOrgRunFileCommitWriter,
  type AgentOrgRunFileCommitWriter,
} from "./agent-org-run-file-commit-writer.js";
import type { RunPackageFileWriteResult } from "./atomic-run-package-file-commit-writer.js";
import { getAgentOrgRunExecutionTreePath } from "./agent-org-run-execution-tree-path.js";
import { validateAgentOrgRunExecutionTreePayload } from "./agent-org-run-execution-tree-schema.js";
import { readRawTreeFile, readRawTreeFileSync } from "./raw-tree-file.js";

/**
 * Reader and writer of an organization run's tree: its own parts only. A run one of its agents delegated to is its own
 * run with its own file; the Task entries say who delegated to whom (autobyteus-461, contract §4).
 */
export class AgentOrgRunExecutionTreeStore {
  constructor(private readonly writer: AgentOrgRunFileCommitWriter = getAgentOrgRunFileCommitWriter()) {}

  async read(orgMemoryDir: string, orgRunId: string): Promise<AgentOrgRunExecutionTreeFile | null> {
    const raw = await readRawTreeFile(getAgentOrgRunExecutionTreePath(orgMemoryDir));
    return raw ? validateAgentOrgRunExecutionTreePayload(raw, orgRunId) : null;
  }

  readSync(orgMemoryDir: string, orgRunId: string): AgentOrgRunExecutionTreeFile | null {
    const raw = readRawTreeFileSync(getAgentOrgRunExecutionTreePath(orgMemoryDir));
    return raw ? validateAgentOrgRunExecutionTreePayload(raw, orgRunId) : null;
  }

  write(orgMemoryDir: string, tree: AgentOrgRunExecutionTreeFile): Promise<RunPackageFileWriteResult> {
    const payload = validateAgentOrgRunExecutionTreePayload(tree, tree.rootOrg.orgRunId);
    return this.writer.write(getAgentOrgRunExecutionTreePath(orgMemoryDir), payload);
  }
}
