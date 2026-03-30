import fs from "node:fs/promises";
import path from "node:path";

type RuntimeRawEventLogInput = {
  envVarName: string;
  backend: string;
  scope: string;
  scopeId: string;
  sequence: number;
  eventName: string | null;
  payload: unknown;
  metadata?: Record<string, unknown>;
};

const initializedDirectories = new Map<string, Promise<void>>();
const pendingFileWrites = new Map<string, Promise<void>>();

const sanitizePathPart = (value: string): string => value.replace(/[^a-zA-Z0-9._-]+/g, "_");

const ensureDirectory = (directory: string): Promise<void> => {
  const cached = initializedDirectories.get(directory);
  if (cached) {
    return cached;
  }

  const pending = fs.mkdir(directory, { recursive: true }).then(() => undefined);
  initializedDirectories.set(directory, pending);
  return pending;
};

const resolveLogDirectory = (envVarName: string): string | null => {
  const configured = process.env[envVarName]?.trim();
  return configured ? configured : null;
};

const buildLogFilePath = (
  directory: string,
  backend: string,
  scope: string,
  scopeId: string,
): string =>
  path.join(
    directory,
    `${sanitizePathPart(backend)}-${sanitizePathPart(scope)}-${sanitizePathPart(scopeId)}.jsonl`,
  );

export const appendRuntimeRawEventLog = (input: RuntimeRawEventLogInput): void => {
  const directory = resolveLogDirectory(input.envVarName);
  if (!directory) {
    return;
  }

  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    backend: input.backend,
    scope: input.scope,
    scopeId: input.scopeId,
    sequence: input.sequence,
    eventName: input.eventName,
    ...(input.metadata ? { metadata: input.metadata } : {}),
    payload: input.payload,
  });
  const filePath = buildLogFilePath(directory, input.backend, input.scope, input.scopeId);
  const previousWrite = pendingFileWrites.get(filePath) ?? Promise.resolve();
  const nextWrite = previousWrite
    .catch(() => {
      // Keep the append chain alive after a previous failure.
    })
    .then(async () => {
      await ensureDirectory(directory);
      await fs.appendFile(filePath, `${record}\n`, "utf8");
    })
    .catch((error) => {
      console.warn(
        `[RuntimeRawEventDebug] Failed to append raw event log to '${filePath}': ${String(error)}`,
      );
    });

  pendingFileWrites.set(filePath, nextWrite);
};
