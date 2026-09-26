import { PROJECTS_CAPABILITY_SETTING_KEY } from "../domain/settings.js";
import { getServerSettingsService, type ServerSettingsService } from "../../services/server-settings-service.js";

export type ProjectsCapabilitySource = "SERVER_SETTING" | "INITIALIZED_DISABLED";

export type ProjectsCapability = {
  enabled: boolean;
  settingKey: typeof PROJECTS_CAPABILITY_SETTING_KEY;
  source: ProjectsCapabilitySource;
};

type ProjectsCapabilitySettingsAccess = Pick<
  ServerSettingsService,
  "getBooleanSetting" | "setBooleanSetting"
>;

type ProjectsCapabilityDependencies = {
  serverSettingsService?: ProjectsCapabilitySettingsAccess;
};

const buildCapability = (
  enabled: boolean,
  source: ProjectsCapabilitySource,
): ProjectsCapability => ({
  enabled,
  settingKey: PROJECTS_CAPABILITY_SETTING_KEY,
  source,
});

/** Per-node Projects visibility capability. Unset means disabled and is persisted as `false`. */
export class ProjectsCapabilityService {
  constructor(private readonly deps: ProjectsCapabilityDependencies = {}) {}

  private get settings(): ProjectsCapabilitySettingsAccess {
    return this.deps.serverSettingsService ?? getServerSettingsService();
  }

  async getCapability(): Promise<ProjectsCapability> {
    const existing = this.settings.getBooleanSetting(PROJECTS_CAPABILITY_SETTING_KEY);
    if (existing !== null) {
      return buildCapability(existing, "SERVER_SETTING");
    }
    this.settings.setBooleanSetting(PROJECTS_CAPABILITY_SETTING_KEY, false);
    return buildCapability(false, "INITIALIZED_DISABLED");
  }

  async setEnabled(enabled: boolean): Promise<ProjectsCapability> {
    this.settings.setBooleanSetting(PROJECTS_CAPABILITY_SETTING_KEY, enabled);
    return buildCapability(enabled, "SERVER_SETTING");
  }
}

let singleton: ProjectsCapabilityService | null = null;

export const getProjectsCapabilityService = (): ProjectsCapabilityService => {
  singleton ??= new ProjectsCapabilityService();
  return singleton;
};

export const resetProjectsCapabilityServiceForTests = (): void => {
  singleton = null;
};
