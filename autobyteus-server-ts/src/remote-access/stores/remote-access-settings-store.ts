import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonFile, updateJsonFile, writeJsonFile } from "../../persistence/file/store-utils.js";
import type { RemoteAccessSettings } from "../domain/models.js";

const defaultSettings = (): RemoteAccessSettings => ({
  phoneAccessEnabled: false,
  updatedAt: new Date(0).toISOString(),
});

type AppConfigLike = {
  getAppDataDir(): string;
};

export class RemoteAccessSettingsStore {
  constructor(private readonly config: AppConfigLike = appConfigProvider.config) {}

  getFilePath(): string {
    return path.join(this.config.getAppDataDir(), "remote-access", "settings.json");
  }

  async getSettings(): Promise<RemoteAccessSettings> {
    const settings = await readJsonFile<RemoteAccessSettings>(this.getFilePath(), defaultSettings());
    return {
      phoneAccessEnabled: Boolean(settings.phoneAccessEnabled),
      updatedAt: typeof settings.updatedAt === "string" ? settings.updatedAt : defaultSettings().updatedAt,
      updatedBy: settings.updatedBy,
    };
  }

  async setSettings(settings: RemoteAccessSettings): Promise<RemoteAccessSettings> {
    await writeJsonFile(this.getFilePath(), settings);
    return settings;
  }

  async updateSettings(
    updater: (settings: RemoteAccessSettings) => RemoteAccessSettings | Promise<RemoteAccessSettings>,
  ): Promise<RemoteAccessSettings> {
    return updateJsonFile<RemoteAccessSettings>(this.getFilePath(), defaultSettings(), async (existing) => {
      const normalized: RemoteAccessSettings = {
        phoneAccessEnabled: Boolean(existing.phoneAccessEnabled),
        updatedAt: typeof existing.updatedAt === "string" ? existing.updatedAt : defaultSettings().updatedAt,
        updatedBy: existing.updatedBy,
      };
      return updater(normalized);
    });
  }
}

let singleton: RemoteAccessSettingsStore | null = null;

export const getRemoteAccessSettingsStore = (): RemoteAccessSettingsStore => {
  singleton ??= new RemoteAccessSettingsStore();
  return singleton;
};

export const resetRemoteAccessSettingsStoreForTests = (): void => {
  singleton = null;
};
