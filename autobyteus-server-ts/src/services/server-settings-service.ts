import { appConfigProvider } from "../config/app-config-provider.js";
import { APPLICATIONS_CAPABILITY_SETTING_KEY } from "../application-capability/domain/models.js";
import {
  CODEX_APP_SERVER_SANDBOX_SETTING_KEY,
  CODEX_SANDBOX_MODES,
} from "../runtime-management/codex/codex-sandbox-mode-setting.js";
import {
  DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
  DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
  DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
  MEDIA_DEFAULT_MODEL_SETTING_KEYS,
} from "../config/media-default-model-settings.js";
import { reloadMediaToolSchemas } from "../agent-tools/media/register-media-tools.js";

export {
  DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
  DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
  DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
} from "../config/media-default-model-settings.js";

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
    public readonly valueValidation: ServerSettingValueValidation | null = null,
  ) {}
}

type ServerSettingValueValidation = {
  readonly allowedValues: readonly string[];
  readonly trimBeforePersist?: boolean;
};

const CUSTOM_SETTING_DESCRIPTION = "Custom user-defined setting";
export const AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID = "AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID";

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
      "AUTOBYTEUS_COMPACTION_TRIGGER_RATIO",
      "Decimal compaction trigger ratio used for post-response budget checks (default 0.8)",
    );

    this.registerPredefinedSetting(
      AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
      "Agent definition id for the memory compactor agent. Configure that agent's runtime and model on the selected agent definition.",
    );

    this.registerPredefinedSetting(
      "AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE",
      "Optional effective context ceiling override in tokens for compaction budgeting",
    );

    this.registerPredefinedSetting(
      "AUTOBYTEUS_COMPACTION_DEBUG_LOGS",
      "Enable detailed compaction and token-budget diagnostic logs",
    );

    this.registerPredefinedSetting(
      APPLICATIONS_CAPABILITY_SETTING_KEY,
      "Controls whether the Applications module is available for this node at runtime.",
    );

    this.registerPredefinedSetting(
      CODEX_APP_SERVER_SANDBOX_SETTING_KEY,
      "Codex app server filesystem sandbox mode for future sessions. Allowed values: read-only, workspace-write, danger-full-access. danger-full-access disables filesystem sandboxing.",
      true,
      {
        allowedValues: CODEX_SANDBOX_MODES,
        trimBeforePersist: true,
      },
    );

    this.registerPredefinedSetting(
      DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
      "Default image editing model identifier used by future media tool calls.",
    );

    this.registerPredefinedSetting(
      DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
      "Default image generation model identifier used by future media tool calls.",
    );

    this.registerPredefinedSetting(
      DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
      "Default speech generation model identifier used by future text-to-speech media tool calls.",
    );

    logger.info(
      `Initialized server settings service with ${this.settingsInfo.size} predefined settings`,
    );
  }

  private registerPredefinedSetting(
    key: string,
    description: string,
    isEditable = true,
    valueValidation: ServerSettingValueValidation | null = null,
  ): void {
    this.settingsInfo.set(
      key,
      new ServerSettingDescription(key, description, isEditable, false, valueValidation),
    );
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

      const [isValueValid, normalizedValueOrError] = this.normalizeSettingValueForPersistence(
        key,
        value,
        metadata,
      );
      if (!isValueValid) {
        return [false, normalizedValueOrError];
      }

      const config = appConfigProvider.config;
      config.set(key, normalizedValueOrError);
      this.refreshDependentSettingsAfterUpdate(key);

      if (!this.settingsInfo.has(key)) {
        this.settingsInfo.set(
          key,
          new ServerSettingDescription(key, CUSTOM_SETTING_DESCRIPTION, true, true),
        );
        logger.info(`Added new custom server setting: ${key}`);
      }

      logger.info(`Server setting '${key}' updated to '${normalizedValueOrError}'`);
      return [true, `Server setting '${key}' has been updated successfully.`];
    } catch (error) {
      logger.error(`Error updating server setting '${key}': ${String(error)}`);
      return [false, `Error updating server setting: ${String(error)}`];
    }
  }

  private normalizeSettingValueForPersistence(
    key: string,
    value: string,
    metadata: ServerSettingDescription | undefined,
  ): [true, string] | [false, string] {
    const validation = metadata?.valueValidation;
    if (!validation) {
      return [true, value];
    }

    const normalizedValue = validation.trimBeforePersist === false ? value : value.trim();
    if (!validation.allowedValues.includes(normalizedValue)) {
      return [
        false,
        `Server setting '${key}' must be one of: ${validation.allowedValues.join(", ")}.`,
      ];
    }

    return [true, normalizedValue];
  }

  private refreshDependentSettingsAfterUpdate(key: string): void {
    if (MEDIA_DEFAULT_MODEL_SETTING_KEYS.has(key)) {
      reloadMediaToolSchemas();
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

  getSettingValue(key: string): string | null {
    const rawValue = appConfigProvider.config.get(key);
    if (typeof rawValue !== "string") {
      return null;
    }
    const normalized = rawValue.trim();
    return normalized.length > 0 ? normalized : null;
  }

  getCompactionAgentDefinitionId(): string | null {
    return this.getSettingValue(AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID);
  }
}

let cachedServerSettingsService: ServerSettingsService | null = null;

export const getServerSettingsService = (): ServerSettingsService => {
  if (!cachedServerSettingsService) {
    cachedServerSettingsService = new ServerSettingsService();
  }
  return cachedServerSettingsService;
};
