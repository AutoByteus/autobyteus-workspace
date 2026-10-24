import { createHash } from "node:crypto";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonFile, updateJsonFile, writeJsonFile } from "../../persistence/file/store-utils.js";
import type { MemorySyncSourceState } from "../shared/memory-sync-types.js";
import { normalizeMemorySyncSourceId } from "../shared/memory-sync-source-id.js";
import { requireMemorySyncReady } from "../shared/memory-sync-capability.js";
import type { MemorySyncStateStore } from "./memory-sync-state-store.js";

type AppConfigLike = { getAppDataDir(): string };

const hubKeyFor = (hubBaseUrl: string): string => createHash("sha256").update(hubBaseUrl, "utf8").digest("hex").slice(0, 24);

const sourceStateKeyFor = (hubBaseUrl: string, memorySyncSourceId: string): string =>
  `${hubKeyFor(hubBaseUrl)}--${normalizeMemorySyncSourceId(memorySyncSourceId)}`;

const defaultState = (hubBaseUrl: string, memorySyncSourceId: string): MemorySyncSourceState => ({
  schemaVersion: 1,
  hubKey: hubKeyFor(hubBaseUrl),
  hubBaseUrl,
  memorySyncSourceId,
  lastSuccessfulSyncAt: null,
  lastError: null,
  lastJobState: "idle",
  files: {},
});

const normalizeState = (hubBaseUrl: string, memorySyncSourceId: string, value: Partial<MemorySyncSourceState>): MemorySyncSourceState => ({
  schemaVersion: 1,
  hubKey: hubKeyFor(hubBaseUrl),
  hubBaseUrl,
  memorySyncSourceId,
  lastSuccessfulSyncAt: typeof value.lastSuccessfulSyncAt === "string" ? value.lastSuccessfulSyncAt : null,
  lastError: typeof value.lastError === "string" ? value.lastError : null,
  lastJobState: value.lastJobState === "running" || value.lastJobState === "success" || value.lastJobState === "error"
    ? value.lastJobState
    : "idle",
  files: value.files && typeof value.files === "object" ? value.files : {},
});

export class LocalFileMemorySyncStateStore implements MemorySyncStateStore {
  constructor(private readonly config: AppConfigLike = appConfigProvider.config) {}

  getFilePath(hubBaseUrl: string, memorySyncSourceId: string): string {
    return path.join(this.config.getAppDataDir(), "memory-sync", "source-state", `${sourceStateKeyFor(hubBaseUrl, memorySyncSourceId)}.json`);
  }

  async readState(hubBaseUrl: string, memorySyncSourceId: string): Promise<MemorySyncSourceState> {
    requireMemorySyncReady();
    const normalizedMemorySyncSourceId = normalizeMemorySyncSourceId(memorySyncSourceId);
    const raw = await readJsonFile<Partial<MemorySyncSourceState>>(
      this.getFilePath(hubBaseUrl, normalizedMemorySyncSourceId),
      defaultState(hubBaseUrl, normalizedMemorySyncSourceId),
    );
    return normalizeState(hubBaseUrl, normalizedMemorySyncSourceId, raw);
  }

  async writeState(state: MemorySyncSourceState): Promise<void> {
    requireMemorySyncReady();
    await writeJsonFile(this.getFilePath(state.hubBaseUrl, state.memorySyncSourceId), state);
  }

  async updateState(
    hubBaseUrl: string,
    memorySyncSourceId: string,
    updater: (state: MemorySyncSourceState) => MemorySyncSourceState | Promise<MemorySyncSourceState>,
  ): Promise<MemorySyncSourceState> {
    requireMemorySyncReady();
    const normalizedMemorySyncSourceId = normalizeMemorySyncSourceId(memorySyncSourceId);
    return updateJsonFile<MemorySyncSourceState>(
      this.getFilePath(hubBaseUrl, normalizedMemorySyncSourceId),
      defaultState(hubBaseUrl, normalizedMemorySyncSourceId),
      async (existing) => updater(normalizeState(hubBaseUrl, normalizedMemorySyncSourceId, existing)),
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
