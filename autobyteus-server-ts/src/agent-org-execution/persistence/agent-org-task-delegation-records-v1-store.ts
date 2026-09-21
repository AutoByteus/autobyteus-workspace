import fs from "node:fs/promises";
import path from "node:path";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import {
  AGENT_ORG_TASK_DELEGATION_RECORDS_V1_FILE_NAME,
  type AgentOrgTaskDelegationRecordsFileV1,
} from "./agent-org-task-delegation-records-v1.js";
import { validateAgentOrgTaskDelegationRecordsV1 } from "./agent-org-task-delegation-records-v1-schema.js";

export const getAgentOrgTaskDelegationRecordsV1Path = (orgDir: string): string =>
  path.join(path.resolve(orgDir), AGENT_ORG_TASK_DELEGATION_RECORDS_V1_FILE_NAME);
const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

export class AgentOrgTaskDelegationRecordsV1Store {
  constructor(private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter()) {}
  async read(orgDir: string, orgRunId: string): Promise<AgentOrgTaskDelegationRecordsFileV1 | null> {
    try {
      return validateAgentOrgTaskDelegationRecordsV1(
        JSON.parse(await fs.readFile(getAgentOrgTaskDelegationRecordsV1Path(orgDir), "utf8")),
        orgRunId,
      );
    } catch (error) { if (missing(error)) return null; throw error; }
  }
  write(orgDir: string, records: AgentOrgTaskDelegationRecordsFileV1): Promise<RunPackageFileWriteResult<"org_task_records">> {
    const normalized = validateAgentOrgTaskDelegationRecordsV1(records, records.orgRunId);
    return this.writer.write({
      file: "org_task_records",
      filePath: getAgentOrgTaskDelegationRecordsV1Path(orgDir),
      payload: normalized,
    });
  }
}
