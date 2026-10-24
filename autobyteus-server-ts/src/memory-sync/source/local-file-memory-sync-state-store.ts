import { createHash } from "node:crypto";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonFile, updateJsonFile, writeJsonFile } from "../../persistence/file/store-utils.js";
import type { MemorySyncSourceState } from "../shared/memory-sync-types.js";
import { normalizeSourceId } from "../shared/source-id.js";
import { requireMemorySyncReady } from "../shared/memory-sync-capability.js";
import type { MemorySyncStateStore } from "./memory-sync-state-store.js";

type AppConfigLike = { getAppDataDir(): string };

const hubKeyFor = (hubBaseUrl: string): string => createHash("sha256").update(hubBaseUrl, "utf8").digest("hex").slice(0, 24);

const sourceStateKeyFor = (hubBaseUrl: string, sourceId: string): string =>
  `${hubKeyFor(hubBaseUrl)}--${normalizeSourceId(sourceId)}`;

const defaultState = (hubBaseUrl: string, sourceId: string): MemorySyncSourceState => ({
  schemaVersion: 1,
  hubKey: hubKeyFor(hubBaseUrl),
  hubBaseUrl,
  sourceId,
  lastSuccessfulSyncAt: null,
  lastError: null,
  lastJobState: "idle",
  files: {},
});

const normalizeState = (hubBaseUrl: string, sourceId: string, value: Partial<MemorySyncSourceState>): MemorySyncSourceState => ({
  schemaVersion: 1,
  hubKey: hubKeyFor(hubBaseUrl),
  hubBaseUrl,
  sourceId,
  lastSuccessfulSyncAt: typeof value.lastSuccessfulSyncAt === "string" ? value.lastSuccessfulSyncAt : null,
  lastError: typeof value.lastError === "string" ? value.lastError : null,
  lastJobState: value.lastJobState === "running" || value.lastJobState === "success" || value.lastJobState === "error"
    ? value.lastJobState
    : "idle",
  files: value.files && typeof value.files === "object" ? value.files : {},
});

export class LocalFileMemorySyncStateStore implements MemorySyncStateStore {
  constructor(private readonly config: AppConfigLike = appConfigProvider.config) {}

  getFilePath(hubBaseUrl: string, sourceId: string): string {
    return path.join(this.config.getAppDataDir(), "memory-sync", "source-state", `${sourceStateKeyFor(hubBaseUrl, sourceId)}.json`);
  }

  async readState(hubBaseUrl: string, sourceId: string): Promise<MemorySyncSourceState> {
    requireMemorySyncReady();
    const normalizedSourceId = normalizeSourceId(sourceId);
    const raw = await readJsonFile<Partial<MemorySyncSourceState>>(
      this.getFilePath(hubBaseUrl, normalizedSourceId),
      defaultState(hubBaseUrl, normalizedSourceId),
    );
    return normalizeState(hubBaseUrl, normalizedSourceId, raw);
  }

  async writeState(state: MemorySyncSourceState): Promise<void> {
    requireMemorySyncReady();
    await writeJsonFile(this.getFilePath(state.hubBaseUrl, state.sourceId), state);
  }

  async updateState(
    hubBaseUrl: string,
    sourceId: string,
    updater: (state: MemorySyncSourceState) => MemorySyncSourceState | Promise<MemorySyncSourceState>,
  ): Promise<MemorySyncSourceState> {
    requireMemorySyncReady();
    const normalizedSourceId = normalizeSourceId(sourceId);
    return updateJsonFile<MemorySyncSourceState>(
      this.getFilePath(hubBaseUrl, normalizedSourceId),
      defaultState(hubBaseUrl, normalizedSourceId),
      async (existing) => updater(normalizeState(hubBaseUrl, normalizedSourceId, existing)),
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
