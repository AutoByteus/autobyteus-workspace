import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentTeamRunManager } from "../services/agent-team-run-manager.js";
import type {
  TaskDelegationRecordV1,
  TaskDelegationRecordsSnapshot,
  TaskInterruption,
  TaskReview,
  TaskSubmission,
  TaskUpdate,
} from "./task-delegation-record-v1.js";
import { TaskDelegationRecordsV1Store } from "./records/task-delegation-records-v1-store.js";
import {
  projectTeamReferenceFile,
  type TeamReferenceFileProjection,
} from "../services/team-reference-file-projection.js";

export type TaskReferenceProjection = TeamReferenceFileProjection;

export type TaskUpdateProjection = Readonly<{
  kind: "submission" | "review" | "interruption";
  submissionId: string | null;
  reviewId: string | null;
  interruptionId: string | null;
  reviewedSubmissionId: string | null;
  decision: "accept" | "request_revision" | null;
  content: string | null;
  referenceFiles: readonly TaskReferenceProjection[];
  createdAt: string;
}>;

export type TaskDelegationRecordProjection = Readonly<{
  taskId: string;
  delegatorAgentRunId: string;
  recipientAddress: string;
  targetAgentRunId: string | null;
  targetTeamRunId: string | null;
  description: string;
  referenceFiles: readonly TaskReferenceProjection[];
  status: string;
  updates: readonly TaskUpdateProjection[];
  createdAt: string;
}>;

export type ResolvedTaskReference = Readonly<{
  record: TaskDelegationRecordV1;
  reference: TaskReferenceProjection;
}>;

const projectReference = (
  ownerId: string,
  filePath: string,
  timestamp: string,
): TaskReferenceProjection => projectTeamReferenceFile(ownerId, filePath, timestamp);

const updateId = (update: TaskUpdate): string =>
  "submissionId" in update ? update.submissionId
    : "reviewId" in update ? update.reviewId
      : update.interruptionId;

const projectUpdate = (update: TaskUpdate): TaskUpdateProjection => {
  const ownerId = updateId(update);
  const files = "referenceFiles" in update ? update.referenceFiles : [];
  return Object.freeze({
    kind: "submissionId" in update ? "submission" : "reviewId" in update ? "review" : "interruption",
    submissionId: "submissionId" in update ? update.submissionId : null,
    reviewId: "reviewId" in update ? update.reviewId : null,
    interruptionId: "interruptionId" in update ? update.interruptionId : null,
    reviewedSubmissionId: "reviewId" in update ? update.reviewedSubmissionId : null,
    decision: "reviewId" in update ? update.decision : null,
    content: "submissionId" in update ? update.message : "reviewId" in update ? update.comment : update.reason,
    referenceFiles: Object.freeze(files.map((file) => projectReference(ownerId, file, update.createdAt))),
    createdAt: update.createdAt,
  });
};

const projectRecord = (record: TaskDelegationRecordV1): TaskDelegationRecordProjection => Object.freeze({
  taskId: record.taskId,
  delegatorAgentRunId: record.delegatorAgentRunId,
  recipientAddress: record.recipientAddress,
  targetAgentRunId: "agentRunId" in record.taskExecution ? record.taskExecution.agentRunId : null,
  targetTeamRunId: "teamRunId" in record.taskExecution ? record.taskExecution.teamRunId : null,
  description: record.description,
  referenceFiles: Object.freeze(record.referenceFiles.map((file) => projectReference(record.taskId, file, record.createdAt))),
  status: record.status,
  updates: Object.freeze(record.updates.map(projectUpdate)),
  createdAt: record.createdAt,
});

/** Read-only current-schema task API projection. */
export class TaskDelegationProjectionService {
  private readonly layout: AgentMemoryLayout;

  constructor(private readonly options: {
    manager?: Pick<AgentTeamRunManager, "getManagedTeamRun">;
    store?: TaskDelegationRecordsV1Store;
    memoryDir?: string;
  } = {}) {
    this.layout = new AgentMemoryLayout(options.memoryDir ?? appConfigProvider.config.getMemoryDir());
  }

  async list(rootTeamRunId: string): Promise<readonly TaskDelegationRecordProjection[]> {
    const snapshot = await this.read(rootTeamRunId);
    return Object.freeze(snapshot.records.map(projectRecord));
  }

  async resolveReference(input: {
    rootTeamRunId: string;
    taskId: string;
    referenceId: string;
  }): Promise<ResolvedTaskReference | null> {
    const snapshot = await this.read(input.rootTeamRunId);
    const record = snapshot.records.find((candidate) => candidate.taskId === input.taskId.trim());
    if (!record) return null;
    const candidates = [
      ...record.referenceFiles.map((file) => projectReference(record.taskId, file, record.createdAt)),
      ...record.updates.flatMap((update) => {
        const files = "referenceFiles" in update ? update.referenceFiles : [];
        return files.map((file) => projectReference(updateId(update), file, update.createdAt));
      }),
    ];
    const reference = candidates.find((candidate) => candidate.referenceId === input.referenceId.trim()) ?? null;
    return reference ? Object.freeze({ record, reference }) : null;
  }

  private async read(rootTeamRunIdInput: string): Promise<TaskDelegationRecordsSnapshot> {
    const rootTeamRunId = rootTeamRunIdInput.trim();
    if (!rootTeamRunId) throw new Error("rootTeamRunId is required.");
    const managed = (this.options.manager ?? AgentTeamRunManager.getInstance()).getManagedTeamRun(rootTeamRunId);
    if (managed) return managed.getTaskRecordsSnapshot();
    const stored = await (this.options.store ?? new TaskDelegationRecordsV1Store()).read(
      this.layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] }),
      rootTeamRunId,
    );
    if (!stored) throw new Error(`Task records for RootTeamRun '${rootTeamRunId}' were not found.`);
    return stored;
  }
}

let cached: TaskDelegationProjectionService | null = null;
export const getTaskDelegationProjectionService = (): TaskDelegationProjectionService =>
  cached ??= new TaskDelegationProjectionService();

void (null as unknown as TaskSubmission | TaskReview | TaskInterruption);
