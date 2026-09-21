import type { TaskDelegationRecordV1 } from "../../agent-collaboration/execution/task/task-delegation-record-v1.js";

export const AGENT_ORG_TASK_DELEGATION_RECORDS_V1_FILE_NAME = "agent_org_task_delegation_records.json";
export type AgentOrgTaskDelegationRecordsFileV1 = Readonly<{
  schemaVersion: 1;
  subjectKind: "agent_org";
  orgRunId: string;
  records: readonly TaskDelegationRecordV1[];
}>;
