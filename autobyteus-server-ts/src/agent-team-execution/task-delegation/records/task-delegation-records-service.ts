import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import type { TaskDelegationPersistenceScope } from "../task-delegation-persistence-scope.js";
import type {
  TaskDelegationRecord,
  TaskReferenceFile,
} from "../task-delegation-record.js";
import { cloneTaskDelegationRecord } from "../task-delegation-record-snapshot.js";
import { canonicalizeTaskDelegationRecord } from "./task-delegation-record-canonicalizer.js";
import {
  TaskDelegationRecordsStore,
  getTaskDelegationRecordsStore,
} from "./task-delegation-records-store.js";
import { TaskDelegationTaskIdAllocator } from "./task-delegation-task-id-allocator.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

type QueueOperation<T> = () => Promise<T>;

export class TaskDelegationRecordsService {
  private readonly store: TaskDelegationRecordsStore;
  private readonly layout: AgentMemoryLayout;
  private readonly allocator: TaskDelegationTaskIdAllocator;
  private readonly queuesByRootTeamRunId = new Map<string, Promise<unknown>>();

  constructor(options: {
    store?: TaskDelegationRecordsStore;
    memoryDir?: string;
    allocator?: TaskDelegationTaskIdAllocator;
  } = {}) {
    this.store = options.store ?? getTaskDelegationRecordsStore();
    this.layout = new AgentMemoryLayout(options.memoryDir ?? appConfigProvider.config.getMemoryDir());
    this.allocator = options.allocator ?? new TaskDelegationTaskIdAllocator();
  }

  async reserveTaskId(scope: TaskDelegationPersistenceScope): Promise<string> {
    return this.enqueue(scope.rootTeamRunId, async () => {
      const recordsFile = await this.readRootRecordsFile(scope.rootTeamRunId);
      return this.allocator.reserve({
        rootTeamRunId: scope.rootTeamRunId,
        records: recordsFile.records,
      });
    });
  }

  async persistRecord(
    scope: TaskDelegationPersistenceScope,
    record: TaskDelegationRecord,
  ): Promise<void> {
    const rootTeamRunId = normalizeRequiredString(scope.rootTeamRunId, "rootTeamRunId");
    const canonical = canonicalizeTaskDelegationRecord(record);
    await this.enqueue(rootTeamRunId, async () => {
      const recordsFile = await this.readRootRecordsFile(rootTeamRunId);
      const byTaskId = new Map(recordsFile.records.map((entry) => [entry.taskId, entry]));
      byTaskId.set(canonical.taskId, canonical);
      const records = [...byTaskId.values()].sort((left, right) => {
        const byCreatedAt = left.createdAt.localeCompare(right.createdAt);
        return byCreatedAt !== 0 ? byCreatedAt : left.taskId.localeCompare(right.taskId);
      });
      await this.store.writeRecordsFile(
        this.rootTeamMemoryDir(rootTeamRunId),
        { teamRunId: rootTeamRunId, records },
      );
    });
  }

  async getTaskDelegationRecords(rootTeamRunId: string): Promise<TaskDelegationRecord[]> {
    const recordsFile = await this.readRootRecordsFile(rootTeamRunId);
    return recordsFile.records.map(cloneTaskDelegationRecord);
  }

  async resolveReference(input: {
    rootTeamRunId: string;
    taskId: string;
    referenceId: string;
  }): Promise<{ record: TaskDelegationRecord; reference: TaskReferenceFile } | null> {
    const taskId = normalizeRequiredString(input.taskId, "taskId");
    const referenceId = normalizeRequiredString(input.referenceId, "referenceId");
    const records = await this.getTaskDelegationRecords(input.rootTeamRunId);
    const record = records.find((candidate) => candidate.taskId === taskId) ?? null;
    if (!record) return null;
    const reference = record.referenceFiles.find((candidate) => candidate.referenceId === referenceId) ?? null;
    return reference ? { record, reference: { ...reference } } : null;
  }

  private async readRootRecordsFile(rootTeamRunIdInput: string) {
    const rootTeamRunId = normalizeRequiredString(rootTeamRunIdInput, "rootTeamRunId");
    return this.store.readRecordsFile(this.rootTeamMemoryDir(rootTeamRunId), rootTeamRunId);
  }

  private rootTeamMemoryDir(rootTeamRunId: string): string {
    return this.layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
  }

  private async enqueue<T>(rootTeamRunIdInput: string, operation: QueueOperation<T>): Promise<T> {
    const rootTeamRunId = normalizeRequiredString(rootTeamRunIdInput, "rootTeamRunId");
    const previous = this.queuesByRootTeamRunId.get(rootTeamRunId) ?? Promise.resolve();
    const next = previous.then(operation, operation);
    const tracked = next.catch(() => undefined);
    this.queuesByRootTeamRunId.set(rootTeamRunId, tracked);
    try {
      return await next;
    } finally {
      if (this.queuesByRootTeamRunId.get(rootTeamRunId) === tracked) {
        this.queuesByRootTeamRunId.delete(rootTeamRunId);
      }
    }
  }
}

let cachedRecordsService: TaskDelegationRecordsService | null = null;

export const getTaskDelegationRecordsService = (): TaskDelegationRecordsService => {
  if (!cachedRecordsService) cachedRecordsService = new TaskDelegationRecordsService();
  return cachedRecordsService;
};
