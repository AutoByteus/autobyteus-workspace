import {
  SELF_EVOLUTION_CAPABILITY_SETTING_KEY,
} from "../domain/settings.js";
import { getServerSettingsService, type ServerSettingsService } from "../../services/server-settings-service.js";

export type SelfEvolutionCapabilitySource = "SERVER_SETTING" | "INITIALIZED_DISABLED";

export type SelfEvolutionCapability = {
  enabled: boolean;
  settingKey: typeof SELF_EVOLUTION_CAPABILITY_SETTING_KEY;
  source: SelfEvolutionCapabilitySource;
};

type SelfEvolutionCapabilitySettingsAccess = Pick<
  ServerSettingsService,
  "getSelfEvolutionEnabledSetting" | "setSelfEvolutionEnabledSetting"
>;

export class SelfEvolutionCapabilityService {
  private static instance: SelfEvolutionCapabilityService | null = null;

  static getInstance(deps: { serverSettingsService?: SelfEvolutionCapabilitySettingsAccess } = {}): SelfEvolutionCapabilityService {
    if (!SelfEvolutionCapabilityService.instance) {
      SelfEvolutionCapabilityService.instance = new SelfEvolutionCapabilityService(deps);
    }
    return SelfEvolutionCapabilityService.instance;
  }

  static resetInstance(): void {
    SelfEvolutionCapabilityService.instance = null;
  }

  constructor(private readonly deps: { serverSettingsService?: SelfEvolutionCapabilitySettingsAccess } = {}) {}

  private get settings(): SelfEvolutionCapabilitySettingsAccess {
    return this.deps.serverSettingsService ?? getServerSettingsService();
  }

  async getCapability(): Promise<SelfEvolutionCapability> {
    const existing = this.settings.getSelfEvolutionEnabledSetting();
    if (existing !== null) {
      return this.buildCapability(existing, "SERVER_SETTING");
    }
    this.settings.setSelfEvolutionEnabledSetting(false);
    return this.buildCapability(false, "INITIALIZED_DISABLED");
  }

  async setEnabled(enabled: boolean): Promise<SelfEvolutionCapability> {
    this.settings.setSelfEvolutionEnabledSetting(enabled);
    return this.buildCapability(enabled, "SERVER_SETTING");
  }

  async requireEnabled(): Promise<void> {
    const capability = await this.getCapability();
    if (!capability.enabled) {
      throw new Error("Self-evolution is disabled for this server. Enable it before starting an evolution run.");
    }
  }

  private buildCapability(enabled: boolean, source: SelfEvolutionCapabilitySource): SelfEvolutionCapability {
    return {
      enabled,
      settingKey: SELF_EVOLUTION_CAPABILITY_SETTING_KEY,
      source,
    };
  }
}
