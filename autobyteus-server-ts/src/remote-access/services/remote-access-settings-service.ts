import { EventEmitter } from "node:events";
import type { RemoteAccessSettings } from "../domain/models.js";
import {
  getRemoteAccessSettingsStore,
  type RemoteAccessSettingsStore,
} from "../stores/remote-access-settings-store.js";

export class RemoteAccessSettingsService {
  private readonly events = new EventEmitter();

  constructor(private readonly store: RemoteAccessSettingsStore = getRemoteAccessSettingsStore()) {}

  async getSettings(): Promise<RemoteAccessSettings> {
    return this.store.getSettings();
  }

  async setPhoneAccessEnabled(enabled: boolean): Promise<RemoteAccessSettings> {
    const settings: RemoteAccessSettings = {
      phoneAccessEnabled: enabled,
      updatedAt: new Date().toISOString(),
      updatedBy: "loopback-desktop",
    };
    await this.store.setSettings(settings);
    this.events.emit("settingsChanged", settings);
    return settings;
  }

  onSettingsChanged(listener: (settings: RemoteAccessSettings) => void): () => void {
    this.events.on("settingsChanged", listener);
    return () => this.events.off("settingsChanged", listener);
  }
}

let singleton: RemoteAccessSettingsService | null = null;

export const getRemoteAccessSettingsService = (): RemoteAccessSettingsService => {
  singleton ??= new RemoteAccessSettingsService();
  return singleton;
};

export const resetRemoteAccessSettingsServiceForTests = (): void => {
  singleton = null;
};
