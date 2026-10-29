// Frozen verbatim copy (import paths remapped only) of `src/agent-org-execution/persistence/agent-org-task-delegation-records-v1.ts` as released at
// origin/personal@f2924a2b0. Owned by released app-data migrations; current runtime must not import it.
import type { TaskDelegationRecordV1 } from "./task-delegation-record-v1.js";

export const AGENT_ORG_TASK_DELEGATION_RECORDS_V1_FILE_NAME = "agent_org_task_delegation_records.json";
export type AgentOrgTaskDelegationRecordsFileV1 = Readonly<{
  schemaVersion: 1;
  subjectKind: "agent_org";
  orgRunId: string;
  records: readonly TaskDelegationRecordV1[];
}>;
