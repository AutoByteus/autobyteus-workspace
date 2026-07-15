import { randomUUID } from "node:crypto";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { canonicalizeWorkspaceRootPath } from "./workspace-path-utils.js";

type WorkspaceRegistryRecord = Record<string, string>;

export type WorkspaceRegistrySnapshot = Map<string, string>;

export type RegistryMutationValidation =
  | { kind: "upsert"; workspaceId: string }
  | { kind: "delete"; workspaceId: string }
  | { kind: "deleteByRootPath"; workspaceRootPath: string; reason: string };

const STALE_REGISTRY_TEMP_FILE_AGE_MS = 60 * 60 * 1000;

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export const loadWorkspaceRegistryFile = async (
  filePath: string,
): Promise<WorkspaceRegistrySnapshot> => {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return parseRegistryRecord(JSON.parse(raw), filePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code === "ENOENT") {
      return new Map<string, string>();
    }
    throw new Error(`Failed reading workspace registry store: ${String(error)}`);
  }
};

export const persistWorkspaceRegistryFileAtomically = async (
  filePath: string,
  nextEntries: WorkspaceRegistrySnapshot,
  validation: RegistryMutationValidation,
): Promise<void> => {
  const directory = path.dirname(filePath);
  const fileName = path.basename(filePath);
  await fs.mkdir(directory, { recursive: true });
  await cleanupStaleRegistryTempFiles(directory, fileName);

  const persistedEntries = await readPersistedRegistrySnapshot(filePath);
  validateRegistryMutation(persistedEntries, nextEntries, validation, "persisted file");

  const tempFilePath = path.join(
    directory,
    `${fileName}.tmp-${process.pid}-${Date.now()}-${randomUUID()}`,
  );

  try {
    await fs.writeFile(tempFilePath, serializeRegistry(nextEntries), "utf-8");
    await fs.rename(tempFilePath, filePath);
  } catch (error) {
    await fs.unlink(tempFilePath).catch(() => undefined);
    throw error;
  }
};

export const validateRegistryMutation = (
  beforeEntries: WorkspaceRegistrySnapshot,
  nextEntries: WorkspaceRegistrySnapshot,
  validation: RegistryMutationValidation,
  sourceDescription: string,
): void => {
  const removedEntries = Array.from(beforeEntries.entries())
    .filter(([workspaceId]) => !nextEntries.has(workspaceId))
    .map(([workspaceId, workspaceRootPath]) => ({ workspaceId, workspaceRootPath }));
  if (!removedEntries.length) {
    return;
  }

  if (
    validation.kind === "delete"
    && removedEntries.length === 1
    && removedEntries[0]?.workspaceId === validation.workspaceId
    && nextEntries.size === beforeEntries.size - 1
  ) {
    return;
  }

  if (
    validation.kind === "deleteByRootPath"
    && nextEntries.size === beforeEntries.size - removedEntries.length
    && removedEntries.every(
      (entry) => entry.workspaceRootPath === validation.workspaceRootPath,
    )
  ) {
    return;
  }

  throw new Error(
    [
      "Suspicious workspace registry shrink rejected.",
      `Source: ${sourceDescription}.`,
      `Mutation: ${validation.kind}.`,
      `Before entries: ${beforeEntries.size}.`,
      `Next entries: ${nextEntries.size}.`,
    ].join(" "),
  );
};

const readPersistedRegistrySnapshot = async (
  filePath: string,
): Promise<WorkspaceRegistrySnapshot> => {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return parseRegistryRecord(JSON.parse(raw), filePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code === "ENOENT") {
      return new Map<string, string>();
    }
    throw new Error(`Failed validating workspace registry before persist: ${String(error)}`);
  }
};

const parseRegistryRecord = (
  parsed: unknown,
  sourceDescription: string,
): WorkspaceRegistrySnapshot => {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Workspace registry ${sourceDescription} must contain an object record.`);
  }

  const entries = new Map<string, string>();
  for (const [workspaceId, rootPath] of Object.entries(parsed as WorkspaceRegistryRecord)) {
    const normalizedWorkspaceId = workspaceId.trim();
    if (!normalizedWorkspaceId || typeof rootPath !== "string") {
      throw new Error(`Workspace registry ${sourceDescription} contains a malformed entry.`);
    }
    entries.set(normalizedWorkspaceId, canonicalizeWorkspaceRootPath(rootPath));
  }
  return entries;
};

const cleanupStaleRegistryTempFiles = async (
  directory: string,
  registryFileName: string,
): Promise<void> => {
  let dirents: Dirent[];
  try {
    dirents = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code !== "ENOENT") {
      logger.warn(`Failed scanning workspace registry temp files: ${String(error)}`);
    }
    return;
  }

  const tempFilePrefix = `${registryFileName}.tmp-`;
  const now = Date.now();
  await Promise.all(
    dirents.map((dirent) =>
      cleanStaleRegistryTempFile(directory, dirent, tempFilePrefix, now),
    ),
  );
};

const cleanStaleRegistryTempFile = async (
  directory: string,
  dirent: Dirent,
  tempFilePrefix: string,
  now: number,
): Promise<void> => {
  if (!dirent.isFile() || !dirent.name.startsWith(tempFilePrefix)) {
    return;
  }
  const tempFilePath = path.join(directory, dirent.name);
  try {
    const stat = await fs.stat(tempFilePath);
    if (now - stat.mtimeMs >= STALE_REGISTRY_TEMP_FILE_AGE_MS) {
      await fs.unlink(tempFilePath);
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code !== "ENOENT") {
      logger.warn(`Failed cleaning stale workspace registry temp file: ${String(error)}`);
    }
  }
};

const serializeRegistry = (entries: WorkspaceRegistrySnapshot): string => {
  const sortedEntries = Array.from(entries.entries()).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return `${JSON.stringify(Object.fromEntries(sortedEntries), null, 2)}\n`;
};
