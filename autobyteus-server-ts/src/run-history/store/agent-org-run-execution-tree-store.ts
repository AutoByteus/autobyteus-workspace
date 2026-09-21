import fs from "node:fs/promises";
import type { AgentOrgRunExecutionTreeFileV1 } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import {
  getAgentOrgRunFileCommitWriter,
  type AgentOrgRunFileCommitWriter,
} from "./agent-org-run-file-commit-writer.js";
import type { RunPackageFileWriteResult } from "./atomic-run-package-file-commit-writer.js";
import { getAgentOrgRunExecutionTreePath } from "./agent-org-run-execution-tree-path.js";
import { validateAgentOrgRunExecutionTreePayload } from "./agent-org-run-execution-tree-schema.js";

const missing = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

export class AgentOrgRunExecutionTreeStore {
  constructor(
    private readonly writer: AgentOrgRunFileCommitWriter = getAgentOrgRunFileCommitWriter(),
  ) {}

  async read(orgMemoryDir: string, orgRunId: string): Promise<AgentOrgRunExecutionTreeFileV1 | null> {
    try {
      const value = JSON.parse(
        await fs.readFile(getAgentOrgRunExecutionTreePath(orgMemoryDir), "utf8"),
      ) as unknown;
      return validateAgentOrgRunExecutionTreePayload(value, orgRunId);
    } catch (error) {
      if (missing(error)) return null;
      throw error;
    }
  }

  async write(
    orgMemoryDir: string,
    tree: AgentOrgRunExecutionTreeFileV1,
  ): Promise<RunPackageFileWriteResult> {
    const normalized = validateAgentOrgRunExecutionTreePayload(tree, tree.rootOrg.orgRunId);
    return this.writer.write(getAgentOrgRunExecutionTreePath(orgMemoryDir), normalized);
  }
}
