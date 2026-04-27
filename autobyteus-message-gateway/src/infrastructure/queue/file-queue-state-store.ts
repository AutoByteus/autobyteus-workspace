import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export type QueueStateQuarantineEvent = {
  queueName: string;
  reason: string;
  originalFilePath: string;
  quarantineFilePath: string;
  quarantinedAt: string;
};

export type QueueStateQuarantineLogger = (event: QueueStateQuarantineEvent) => void;

export type FileQueueStateStoreConfig<TState> = {
  queueName: string;
  filePath: string;
  createEmptyState: () => TState;
  parseState: (value: unknown) => TState;
  logger?: QueueStateQuarantineLogger;
  now?: () => Date;
  uniqueSuffix?: () => string;
};

export type FileQueueStateMutationOutcome<TResult> = {
  result: TResult;
  persist: boolean;
};

const MAX_QUARANTINE_PATH_ATTEMPTS = 10;

export class FileQueueStateStore<TState> {
  private readonly queueName: string;
  private readonly filePath: string;
  private readonly createEmptyState: () => TState;
  private readonly parseState: (value: unknown) => TState;
  private readonly logger: QueueStateQuarantineLogger;
  private readonly now: () => Date;
  private readonly uniqueSuffix: () => string;
  private state: TState | null = null;
  private loadStatePromise: Promise<TState> | null = null;
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(config: FileQueueStateStoreConfig<TState>) {
    this.queueName = normalizeRequiredString(config.queueName, "queueName");
    this.filePath = path.resolve(normalizeRequiredString(config.filePath, "filePath"));
    this.createEmptyState = config.createEmptyState;
    this.parseState = config.parseState;
    this.logger = config.logger ?? defaultLogger;
    this.now = config.now ?? (() => new Date());
    this.uniqueSuffix = config.uniqueSuffix ?? randomUUID;
  }

  async load(): Promise<TState> {
    if (this.state) {
      return this.state;
    }

    if (this.loadStatePromise) {
      return this.loadStatePromise;
    }

    this.loadStatePromise = this.readOrRecoverState().finally(() => {
      this.loadStatePromise = null;
    });
    return this.loadStatePromise;
  }

  async persist(state: TState): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`;
    await writeFile(tempPath, JSON.stringify(state, null, 2), "utf8");
    await rename(tempPath, this.filePath);
    this.state = state;
  }

  async withMutation<TResult>(
    mutation: (state: TState) => Promise<FileQueueStateMutationOutcome<TResult>> | FileQueueStateMutationOutcome<TResult>,
  ): Promise<TResult> {
    const operation = this.mutationQueue.then(async () => {
      const state = await this.load();
      const outcome = await mutation(state);
      if (outcome.persist) {
        await this.persist(state);
      }
      return outcome.result;
    });

    this.mutationQueue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  private async readOrRecoverState(): Promise<TState> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
      this.state = this.createEmptyState();
      return this.state;
    }

    try {
      this.state = this.parseState(JSON.parse(raw));
      return this.state;
    } catch (error) {
      const emptyState = this.createEmptyState();
      await this.quarantineInvalidState(toErrorMessage(error));
      await this.persist(emptyState);
      return emptyState;
    }
  }

  private async quarantineInvalidState(reason: string): Promise<QueueStateQuarantineEvent | null> {
    const quarantinedAt = toIsoTimestamp(this.now(), "quarantinedAt");
    const quarantineFilePath = await this.buildAvailableQuarantinePath(quarantinedAt);

    await mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      await rename(this.filePath, quarantineFilePath);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }

    const event: QueueStateQuarantineEvent = {
      queueName: this.queueName,
      reason,
      originalFilePath: this.filePath,
      quarantineFilePath,
      quarantinedAt,
    };
    this.logger(event);
    return event;
  }

  private async buildAvailableQuarantinePath(quarantinedAt: string): Promise<string> {
    const directory = path.dirname(this.filePath);
    const basename = path.basename(this.filePath);
    const timestamp = toQuarantineTimestamp(quarantinedAt);

    for (let attempt = 0; attempt < MAX_QUARANTINE_PATH_ATTEMPTS; attempt += 1) {
      const suffix = sanitizePathSegment(this.uniqueSuffix());
      const candidate = path.join(directory, `${basename}.quarantined-${timestamp}-${suffix}`);
      if (!(await fileExists(candidate))) {
        return candidate;
      }
    }

    throw new Error(`Unable to allocate quarantine path for queue state file: ${this.filePath}`);
  }
}

const defaultLogger: QueueStateQuarantineLogger = (event) => {
  console.warn("[gateway] reliability queue state file quarantined", event);
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Invalid queue state file.";
};

const toQuarantineTimestamp = (isoTimestamp: string): string =>
  isoTimestamp.replace(/[-:.]/g, "");

const sanitizePathSegment = (value: string): string => {
  const normalized = normalizeRequiredString(value, "uniqueSuffix").replace(/[^a-zA-Z0-9_-]/g, "_");
  if (normalized.length === 0) {
    throw new Error("uniqueSuffix must contain at least one filename-safe character.");
  }
  return normalized;
};

const normalizeRequiredString = (value: unknown, key: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} must be a non-empty string.`);
  }
  return value.trim();
};

const toIsoTimestamp = (value: Date, key: string): string => {
  const epoch = value.getTime();
  if (!Number.isFinite(epoch)) {
    throw new Error(`${key} must be a valid Date.`);
  }
  return value.toISOString();
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
};

const isNotFoundError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "ENOENT";
