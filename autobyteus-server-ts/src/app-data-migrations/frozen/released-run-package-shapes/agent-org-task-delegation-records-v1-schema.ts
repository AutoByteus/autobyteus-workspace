// Frozen verbatim copy (import paths remapped only) of `src/agent-org-execution/persistence/agent-org-task-delegation-records-v1-schema.ts` as released at
// origin/personal@f2924a2b0. Owned by released app-data migrations; current runtime must not import it.
import { validateTaskDelegationRecordArrayV1 } from "./task-delegation-record-v1-schema.js";
import type { AgentOrgTaskDelegationRecordsFileV1 } from "./agent-org-task-delegation-records-v1.js";

export const validateAgentOrgTaskDelegationRecordsV1 = (
  value: unknown,
  expectedOrgRunId?: string,
): AgentOrgTaskDelegationRecordsFileV1 => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AgentOrg task records must be an object.");
  const payload = value as Record<string, unknown>;
  const actual = Object.keys(payload).sort();
  const expected = ["orgRunId", "records", "schemaVersion", "subjectKind"];
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error("AgentOrg task records has unsupported or missing field(s).");
  }
  if (payload.schemaVersion !== 1 || payload.subjectKind !== "agent_org") {
    throw new Error("AgentOrg task records requires schemaVersion 1 and subjectKind 'agent_org'.");
  }
  if (typeof payload.orgRunId !== "string" || !payload.orgRunId || payload.orgRunId !== payload.orgRunId.trim()) {
    throw new Error("AgentOrg task records orgRunId is invalid.");
  }
  if (expectedOrgRunId && payload.orgRunId !== expectedOrgRunId) {
    throw new Error(`AgentOrg task records root '${payload.orgRunId}' does not match '${expectedOrgRunId}'.`);
  }
  return Object.freeze({
    schemaVersion: 1,
    subjectKind: "agent_org",
    orgRunId: payload.orgRunId,
    records: validateTaskDelegationRecordArrayV1(payload.records),
  });
};
