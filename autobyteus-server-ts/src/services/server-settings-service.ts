import { appConfigProvider } from "../config/app-config-provider.js";
import { APPLICATIONS_CAPABILITY_SETTING_KEY } from "../application-capability/domain/models.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class ServerSettingDescription {
  constructor(
    public readonly key: string,
    public readonly description: string,
    public readonly isEditable: boolean = true,
    public readonly isDeletable: boolean = false,
  ) {}
}

const CUSTOM_SETTING_DESCRIPTION = "Custom user-defined setting";

export class ServerSettingsService {
  private settingsInfo = new Map<string, ServerSettingDescription>();

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
      "Public URL of this server. Managed at startup by the launch environment and not editable here.",
      false,
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

    this.registerPredefinedSetting(
      APPLICATIONS_CAPABILITY_SETTING_KEY,
      "Controls whether the Applications module is available for this node at runtime.",
    );

    logger.info(
      `Initialized server settings service with ${this.settingsInfo.size} predefined settings`,
    );
  }

  private registerPredefinedSetting(key: string, description: string, isEditable = true): void {
    this.settingsInfo.set(key, new ServerSettingDescription(key, description, isEditable, false));
  }

  private getSettingDescription(key: string): ServerSettingDescription {
    return (
      this.settingsInfo.get(key) ??
      new ServerSettingDescription(key, CUSTOM_SETTING_DESCRIPTION, true, true)
    );
  }

  private getVisibleSettingKeys(configData: Record<string, string>): string[] {
    const config = appConfigProvider.config;
    const visibleKeys = new Set<string>();

    for (const key of Object.keys(configData)) {
      if (!key.toUpperCase().endsWith("_API_KEY")) {
        visibleKeys.add(key);
      }
    }

    for (const key of this.settingsInfo.keys()) {
      const value = config.get(key);
      if (typeof value === "string" && value.trim().length > 0) {
        visibleKeys.add(key);
      }
    }

    return Array.from(visibleKeys).sort((a, b) => a.localeCompare(b));
  }

  getAvailableSettings(): Array<{
    key: string;
    value: string;
    description: string;
    isEditable: boolean;
    isDeletable: boolean;
  }> {
    const config = appConfigProvider.config;
    const configData = config.getConfigData();

    const result: Array<{
      key: string;
      value: string;
      description: string;
      isEditable: boolean;
      isDeletable: boolean;
    }> = [];

    for (const key of this.getVisibleSettingKeys(configData)) {
      const value = config.get(key) ?? configData[key];
      if (value === undefined) {
        continue;
      }
      const metadata = this.getSettingDescription(key);
      result.push({
        key,
        value: String(value),
        description: metadata.description,
        isEditable: metadata.isEditable,
        isDeletable: metadata.isDeletable,
      });
    }

    return result;
  }

  updateSetting(key: string, value: string): [boolean, string] {
    try {
      const metadata = this.settingsInfo.get(key);
      if (metadata && !metadata.isEditable) {
        return [false, `Server setting '${key}' is managed by the system and cannot be updated here.`];
      }

      const config = appConfigProvider.config;
      config.set(key, value);

      if (!this.settingsInfo.has(key)) {
        this.settingsInfo.set(
          key,
          new ServerSettingDescription(key, CUSTOM_SETTING_DESCRIPTION, true, true),
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
      const metadata = this.getSettingDescription(key);
      if (!metadata.isDeletable) {
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

  getApplicationsEnabledSetting(): boolean | null {
    const rawValue = appConfigProvider.config.get(APPLICATIONS_CAPABILITY_SETTING_KEY)?.trim();
    if (!rawValue) {
      return null;
    }

    return rawValue.toLowerCase() === "true";
  }

  setApplicationsEnabledSetting(enabled: boolean): void {
    appConfigProvider.config.set(
      APPLICATIONS_CAPABILITY_SETTING_KEY,
      enabled ? "true" : "false",
    );
  }
}

let cachedServerSettingsService: ServerSettingsService | null = null;

export const getServerSettingsService = (): ServerSettingsService => {
  if (!cachedServerSettingsService) {
    cachedServerSettingsService = new ServerSettingsService();
  }
  return cachedServerSettingsService;
};
