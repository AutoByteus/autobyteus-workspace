import { createHash } from "node:crypto";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonFile, updateJsonFile, writeJsonFile } from "../../persistence/file/store-utils.js";
import type { MemorySyncSourceState } from "../shared/memory-sync-types.js";
import { normalizeSourceNodeId } from "../shared/source-node-id.js";
import type { MemorySyncStateStore } from "./memory-sync-state-store.js";

type AppConfigLike = { getAppDataDir(): string };

const hubKeyFor = (hubBaseUrl: string): string => createHash("sha256").update(hubBaseUrl, "utf8").digest("hex").slice(0, 24);

const sourceStateKeyFor = (hubBaseUrl: string, sourceNodeId: string): string =>
  `${hubKeyFor(hubBaseUrl)}--${normalizeSourceNodeId(sourceNodeId)}`;

const defaultState = (hubBaseUrl: string, sourceNodeId: string): MemorySyncSourceState => ({
  schemaVersion: 1,
  hubKey: hubKeyFor(hubBaseUrl),
  hubBaseUrl,
  sourceNodeId,
  lastSuccessfulSyncAt: null,
  lastError: null,
  lastJobState: "idle",
  files: {},
});

const normalizeState = (hubBaseUrl: string, sourceNodeId: string, value: Partial<MemorySyncSourceState>): MemorySyncSourceState => ({
  schemaVersion: 1,
  hubKey: hubKeyFor(hubBaseUrl),
  hubBaseUrl,
  sourceNodeId,
  lastSuccessfulSyncAt: typeof value.lastSuccessfulSyncAt === "string" ? value.lastSuccessfulSyncAt : null,
  lastError: typeof value.lastError === "string" ? value.lastError : null,
  lastJobState: value.lastJobState === "running" || value.lastJobState === "success" || value.lastJobState === "error"
    ? value.lastJobState
    : "idle",
  files: value.files && typeof value.files === "object" ? value.files : {},
});

export class LocalFileMemorySyncStateStore implements MemorySyncStateStore {
  constructor(private readonly config: AppConfigLike = appConfigProvider.config) {}

  getFilePath(hubBaseUrl: string, sourceNodeId: string): string {
    return path.join(this.config.getAppDataDir(), "memory-sync", "source-state", `${sourceStateKeyFor(hubBaseUrl, sourceNodeId)}.json`);
  }

  async readState(hubBaseUrl: string, sourceNodeId: string): Promise<MemorySyncSourceState> {
    const normalizedSourceNodeId = normalizeSourceNodeId(sourceNodeId);
    const raw = await readJsonFile<Partial<MemorySyncSourceState>>(
      this.getFilePath(hubBaseUrl, normalizedSourceNodeId),
      defaultState(hubBaseUrl, normalizedSourceNodeId),
    );
    return normalizeState(hubBaseUrl, normalizedSourceNodeId, raw);
  }

  async writeState(state: MemorySyncSourceState): Promise<void> {
    await writeJsonFile(this.getFilePath(state.hubBaseUrl, state.sourceNodeId), state);
  }

  async updateState(
    hubBaseUrl: string,
    sourceNodeId: string,
    updater: (state: MemorySyncSourceState) => MemorySyncSourceState | Promise<MemorySyncSourceState>,
  ): Promise<MemorySyncSourceState> {
    const normalizedSourceNodeId = normalizeSourceNodeId(sourceNodeId);
    return updateJsonFile<MemorySyncSourceState>(
      this.getFilePath(hubBaseUrl, normalizedSourceNodeId),
      defaultState(hubBaseUrl, normalizedSourceNodeId),
      async (existing) => updater(normalizeState(hubBaseUrl, normalizedSourceNodeId, existing)),
    );
  }
}

let singleton: LocalFileMemorySyncStateStore | null = null;

export const getLocalFileMemorySyncStateStore = (): LocalFileMemorySyncStateStore => {
  singleton ??= new LocalFileMemorySyncStateStore();
  return singleton;
};

export const resetLocalFileMemorySyncStateStoreForTests = (): void => {
  singleton = null;
};
