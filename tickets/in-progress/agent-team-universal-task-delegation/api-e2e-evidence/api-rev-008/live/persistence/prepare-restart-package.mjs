import fs from 'node:fs/promises';
import path from 'node:path';
const evidenceDir = path.dirname(new URL(import.meta.url).pathname);
const runtimeRoot = path.join(process.cwd(), 'autobyteus-server-ts/tests/.tmp/api-rev-008-live-20260815-1');
const memoryRoot = path.join(runtimeRoot, 'memory', 'agent_teams');
const create = JSON.parse(await fs.readFile(path.join(evidenceDir, 'stale-task-create.json'), 'utf8'));
const sibling = JSON.parse(await fs.readFile(path.join(evidenceDir, 'valid-sibling-create.json'), 'utf8'));
const rootDir = path.join(memoryRoot, create.teamRunId);
const treePath = path.join(rootDir, 'team_run_execution_tree.json');
const taskPath = path.join(rootDir, 'task_delegation_records.json');
const tree = JSON.parse(await fs.readFile(treePath, 'utf8'));
const tasks = JSON.parse(await fs.readFile(taskPath, 'utf8'));
if (tasks.records.length !== 1 || tasks.records[0].status !== 'active' || tree.rootTeam.taskExecutions.length !== 1) throw new Error('EXPECTED_ONE_REAL_ACTIVE_TASK');
const active = tasks.records[0];
const activeExecution = tree.rootTeam.taskExecutions[0];
const now = new Date().toISOString();
const awaitingId = `${active.taskId}_awaiting`;
const awaitingRunId = `${activeExecution.agentRunId}_awaiting`;
const acceptedId = `${active.taskId}_accepted`;
const acceptedRunId = `${activeExecution.agentRunId}_accepted`;
const orphanRunId = `${activeExecution.agentRunId}_orphan`;
const submissionAt = new Date(Date.now() - 2000).toISOString();
const reviewAt = new Date(Date.now() - 1000).toISOString();
const awaiting = {
  ...active, taskId: awaitingId, taskExecution: { agentRunId: awaitingRunId },
  description: 'Exact persisted awaiting-review restart-repair fixture.',
  status: 'awaiting_review', updates: [{ submissionId: `${awaitingId}_submission`, message: 'AWAITING_REVIEW_RESULT', referenceFiles: [], createdAt: submissionAt }],
};
const accepted = {
  ...active, taskId: acceptedId, taskExecution: { agentRunId: acceptedRunId },
  description: 'Exact persisted accepted restart-preservation fixture.',
  status: 'accepted', updates: [
    { submissionId: `${acceptedId}_submission`, message: 'ACCEPTED_RESULT', referenceFiles: [], createdAt: submissionAt },
    { reviewId: `${acceptedId}_review`, reviewedSubmissionId: `${acceptedId}_submission`, decision: 'accept', comment: null, referenceFiles: [], createdAt: reviewAt },
  ],
};
tasks.records.push(awaiting, accepted);
tree.rootTeam.taskExecutions.push(
  { ...activeExecution, agentRunId: awaitingRunId, startedAt: awaiting.createdAt, settledAt: null },
  { ...activeExecution, agentRunId: acceptedRunId, startedAt: accepted.createdAt, settledAt: null },
  { ...activeExecution, agentRunId: orphanRunId, startedAt: now, settledAt: null },
);
const atomicWrite = async (file, value) => { const tmp = `${file}.api-rev-008`; await fs.writeFile(tmp, JSON.stringify(value, null, 2)+'\n'); await fs.rename(tmp, file); };
await atomicWrite(taskPath, tasks); await atomicWrite(treePath, tree);
const siblingDir = path.join(memoryRoot, sibling.created.teamRunId);
const invalidRootId = `a-invalid-root-${Date.now()}`;
const invalidDir = path.join(memoryRoot, invalidRootId);
await fs.cp(siblingDir, invalidDir, { recursive: true });
// The copied package truthfully retains the sibling root IDs, so admission must fail closed on exact root mismatch.
const result = {at: now, runtimeRoot, targetRoot: create.teamRunId, validSiblingRoot: sibling.created.teamRunId, invalidRootId, realActiveTaskId: active.taskId, awaitingTaskId: awaitingId, acceptedTaskId: acceptedId, activeRunId: activeExecution.agentRunId, awaitingRunId, acceptedRunId, orphanRunId, expectedBeforeRestart:{statuses:['active','awaiting_review','accepted'],unsettledExecutions:4},operationalDatabaseAction:'NONE'};
await fs.writeFile(path.join(evidenceDir,'restart-package-fixture.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
