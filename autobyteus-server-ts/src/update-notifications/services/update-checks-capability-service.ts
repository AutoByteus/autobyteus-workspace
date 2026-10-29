import { getServerSettingsService, type ServerSettingsService } from "../../services/server-settings-service.js";
import { UPDATE_CHECKS_SETTING_KEY } from "../domain/settings.js";

export type UpdateChecksCapabilitySource = "SERVER_SETTING" | "DEFAULT_ENABLED";

export type UpdateChecksCapability = {
  enabled: boolean;
  settingKey: typeof UPDATE_CHECKS_SETTING_KEY;
  source: UpdateChecksCapabilitySource;
};

type SettingsAccess = Pick<ServerSettingsService, "getBooleanSetting" | "setBooleanSetting">;

export class UpdateChecksCapabilityService {
  private static instance: UpdateChecksCapabilityService | null = null;

  static getInstance(): UpdateChecksCapabilityService {
    return UpdateChecksCapabilityService.instance ??= new UpdateChecksCapabilityService();
  }

  static resetInstance(): void {
    UpdateChecksCapabilityService.instance = null;
  }

  constructor(private readonly deps: { serverSettingsService?: SettingsAccess } = {}) {}

  private get settings(): SettingsAccess {
    return this.deps.serverSettingsService ?? getServerSettingsService();
  }

  getCapability(): UpdateChecksCapability {
    const stored = this.settings.getBooleanSetting(UPDATE_CHECKS_SETTING_KEY);
    return stored === null
      ? { enabled: true, settingKey: UPDATE_CHECKS_SETTING_KEY, source: "DEFAULT_ENABLED" }
      : { enabled: stored, settingKey: UPDATE_CHECKS_SETTING_KEY, source: "SERVER_SETTING" };
  }

  setEnabled(enabled: boolean): UpdateChecksCapability {
    this.settings.setBooleanSetting(UPDATE_CHECKS_SETTING_KEY, enabled);
    return { enabled, settingKey: UPDATE_CHECKS_SETTING_KEY, source: "SERVER_SETTING" };
  }

  isEnabled(): boolean {
    return this.getCapability().enabled;
  }
}
