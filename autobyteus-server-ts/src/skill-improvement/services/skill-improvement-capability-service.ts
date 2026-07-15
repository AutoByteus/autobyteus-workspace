import {
  SKILL_IMPROVEMENT_CAPABILITY_SETTING_KEY,
} from "../domain/settings.js";
import { getServerSettingsService, type ServerSettingsService } from "../../services/server-settings-service.js";

export type SkillImprovementCapabilitySource = "SERVER_SETTING" | "INITIALIZED_DISABLED";

export type SkillImprovementCapability = {
  enabled: boolean;
  settingKey: typeof SKILL_IMPROVEMENT_CAPABILITY_SETTING_KEY;
  source: SkillImprovementCapabilitySource;
};

type SkillImprovementCapabilitySettingsAccess = Pick<
  ServerSettingsService,
  "getSkillImprovementEnabledSetting" | "setSkillImprovementEnabledSetting"
>;

export class SkillImprovementCapabilityService {
  private static instance: SkillImprovementCapabilityService | null = null;

  static getInstance(deps: { serverSettingsService?: SkillImprovementCapabilitySettingsAccess } = {}): SkillImprovementCapabilityService {
    if (!SkillImprovementCapabilityService.instance) {
      SkillImprovementCapabilityService.instance = new SkillImprovementCapabilityService(deps);
    }
    return SkillImprovementCapabilityService.instance;
  }

  static resetInstance(): void {
    SkillImprovementCapabilityService.instance = null;
  }

  constructor(private readonly deps: { serverSettingsService?: SkillImprovementCapabilitySettingsAccess } = {}) {}

  private get settings(): SkillImprovementCapabilitySettingsAccess {
    return this.deps.serverSettingsService ?? getServerSettingsService();
  }

  async getCapability(): Promise<SkillImprovementCapability> {
    const existing = this.settings.getSkillImprovementEnabledSetting();
    if (existing !== null) {
      return this.buildCapability(existing, "SERVER_SETTING");
    }
    this.settings.setSkillImprovementEnabledSetting(false);
    return this.buildCapability(false, "INITIALIZED_DISABLED");
  }

  async setEnabled(enabled: boolean): Promise<SkillImprovementCapability> {
    this.settings.setSkillImprovementEnabledSetting(enabled);
    return this.buildCapability(enabled, "SERVER_SETTING");
  }

  async requireEnabled(): Promise<void> {
    const capability = await this.getCapability();
    if (!capability.enabled) {
      throw new Error("Skill Improvement is disabled for this server. Enable it before starting an improvement run.");
    }
  }

  private buildCapability(enabled: boolean, source: SkillImprovementCapabilitySource): SkillImprovementCapability {
    return {
      enabled,
      settingKey: SKILL_IMPROVEMENT_CAPABILITY_SETTING_KEY,
      source,
    };
  }
}
