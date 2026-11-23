import { isAgentOrgContainerPayload, type AgentOrgContainerFile } from "../../agent-org-execution/domain/agent-org-container-file.js";
import { getAgentOrgRunFileCommitWriter, type AgentOrgRunFileCommitWriter } from "./agent-org-run-file-commit-writer.js";
import type { RunPackageFileWriteResult } from "./atomic-run-package-file-commit-writer.js";
import { getAgentOrgRunExecutionTreePath } from "./agent-org-run-execution-tree-path.js";
import { validateAgentOrgContainerPayload } from "./agent-org-container-file-schema.js";
import { readRawTreeFile, readRawTreeFileSync } from "./raw-tree-file.js";

/** Reader and writer of an Org container's own file (`agent_org_run_execution_tree.json`); its units keep their own files. */
export class AgentOrgContainerStore {
  constructor(private readonly writer: AgentOrgRunFileCommitWriter = getAgentOrgRunFileCommitWriter()) {}

  async read(orgMemoryDir: string, orgRunId: string): Promise<AgentOrgContainerFile | null> {
    const raw = await readRawTreeFile(getAgentOrgRunExecutionTreePath(orgMemoryDir));
    return raw ? validateAgentOrgContainerPayload(raw, orgRunId) : null;
  }

  /** The stored container file; `null` when absent or still a released Org tree (not converted to a container yet). */
  async readIfContainer(orgMemoryDir: string, orgRunId: string): Promise<AgentOrgContainerFile | null> {
    const raw = await readRawTreeFile(getAgentOrgRunExecutionTreePath(orgMemoryDir));
    return raw && isAgentOrgContainerPayload(raw) ? validateAgentOrgContainerPayload(raw, orgRunId) : null;
  }

  readSync(orgMemoryDir: string, orgRunId: string): AgentOrgContainerFile | null {
    const raw = readRawTreeFileSync(getAgentOrgRunExecutionTreePath(orgMemoryDir));
    return raw ? validateAgentOrgContainerPayload(raw, orgRunId) : null;
  }

  write(orgMemoryDir: string, file: AgentOrgContainerFile): Promise<RunPackageFileWriteResult> {
    const payload = validateAgentOrgContainerPayload(file, file.rootOrg.orgRunId);
    return this.writer.write(getAgentOrgRunExecutionTreePath(orgMemoryDir), payload);
  }
}
