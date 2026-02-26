import { appConfigProvider } from "../config/app-config-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class ServerSettingDescription {
  constructor(
    public readonly key: string,
    public readonly description: string,
  ) {}
}

export class ServerSettingsService {
  private settingsInfo = new Map<string, ServerSettingDescription>();
  private predefinedSettingKeys = new Set<string>();

  constructor() {
    this.initializeSettings();
  }

  private initializeSettings(): void {
    this.registerPredefinedSetting(
      "AUTOBYTEUS_LLM_SERVER_HOSTS",
      "Comma-separated URLs of AUTOBYTEUS LLM servers",
    );

    this.registerPredefinedSetting(
      "AUTOBYTEUS_SERVER_HOST",
      "Public URL of this server (e.g., http://localhost:8000). This is mandatory and set at startup.",
    );

    this.registerPredefinedSetting(
      "AUTOBYTEUS_VNC_SERVER_HOSTS",
      "Comma-separated host:port values for AutoByteus VNC WebSocket endpoints (e.g., localhost:6080,localhost:6081)",
    );

    this.registerPredefinedSetting(
      "OLLAMA_HOSTS",
      "Comma-separated host URLs for Ollama servers (e.g., http://localhost:11434)",
    );

    this.registerPredefinedSetting(
      "LMSTUDIO_HOSTS",
      "Comma-separated host URLs for LM Studio servers (e.g., http://localhost:1234)",
    );

    logger.info(
      `Initialized server settings service with ${this.settingsInfo.size} predefined settings`,
    );
  }

  private registerPredefinedSetting(key: string, description: string): void {
    this.settingsInfo.set(key, new ServerSettingDescription(key, description));
    this.predefinedSettingKeys.add(key);
  }

  getAvailableSettings(): Array<{ key: string; value: string; description: string }> {
    const config = appConfigProvider.config;
    const allSettings = config.getConfigData();

    const result: Array<{ key: string; value: string; description: string }> = [];

    for (const [key, value] of Object.entries(allSettings)) {
      if (key.toUpperCase().endsWith("_API_KEY")) {
        continue;
      }

      const description = this.settingsInfo.get(key)?.description ?? "Custom user-defined setting";
      result.push({
        key,
        value: String(value),
        description,
      });
    }

    result.sort((a, b) => a.key.localeCompare(b.key));
    return result;
  }

  updateSetting(key: string, value: string): [boolean, string] {
    try {
      const config = appConfigProvider.config;
      config.set(key, value);

      if (!this.settingsInfo.has(key)) {
        this.settingsInfo.set(
          key,
          new ServerSettingDescription(key, "Custom user-defined setting"),
        );
        logger.info(`Added new custom server setting: ${key}`);
      }

      logger.info(`Server setting '${key}' updated to '${value}'`);
      return [true, `Server setting '${key}' has been updated successfully.`];
    } catch (error) {
      logger.error(`Error updating server setting '${key}': ${String(error)}`);
      return [false, `Error updating server setting: ${String(error)}`];
    }
  }

  deleteSetting(key: string): [boolean, string] {
    try {
      if (this.predefinedSettingKeys.has(key)) {
        return [false, `Server setting '${key}' is managed by the system and cannot be removed.`];
      }

      const config = appConfigProvider.config;
      const allSettings = config.getConfigData();
      if (!Object.prototype.hasOwnProperty.call(allSettings, key)) {
        return [false, `Server setting '${key}' does not exist.`];
      }

      config.delete(key);
      this.settingsInfo.delete(key);
      logger.info(`Server setting '${key}' deleted`);
      return [true, `Server setting '${key}' has been deleted successfully.`];
    } catch (error) {
      logger.error(`Error deleting server setting '${key}': ${String(error)}`);
      return [false, `Error deleting server setting: ${String(error)}`];
    }
  }

  isValidSetting(_key: string): boolean {
    return true;
  }
}

let cachedServerSettingsService: ServerSettingsService | null = null;

export const getServerSettingsService = (): ServerSettingsService => {
  if (!cachedServerSettingsService) {
    cachedServerSettingsService = new ServerSettingsService();
  }
  return cachedServerSettingsService;
};
