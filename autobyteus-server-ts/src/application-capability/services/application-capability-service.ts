import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import {
  APPLICATIONS_CAPABILITY_SETTING_KEY,
  buildApplicationsCapability,
  type ApplicationsCapability,
} from "../domain/models.js";
import { getServerSettingsService, type ServerSettingsService } from "../../services/server-settings-service.js";

type ApplicationsSettingsAccess = Pick<
  ServerSettingsService,
  "getBooleanSetting" | "setBooleanSetting"
>;

type ApplicationCapabilityDependencies = {
  applicationBundleService: Pick<ApplicationBundleService, "hasDiscoverableApplications">;
  serverSettingsService?: ApplicationsSettingsAccess;
};

export class ApplicationCapabilityService {
  private initializePromise: Promise<ApplicationsCapability> | null = null;

  constructor(private readonly dependencies: ApplicationCapabilityDependencies) {}

  private get applicationBundleService(): Pick<ApplicationBundleService, "hasDiscoverableApplications"> {
    return this.dependencies.applicationBundleService;
  }

  private get serverSettingsService(): ApplicationsSettingsAccess {
    return this.dependencies.serverSettingsService ?? getServerSettingsService();
  }

  async getCapability(): Promise<ApplicationsCapability> {
    return this.ensureInitialized();
  }

  async setEnabled(enabled: boolean): Promise<ApplicationsCapability> {
    await this.ensureInitialized();
    this.serverSettingsService.setBooleanSetting(APPLICATIONS_CAPABILITY_SETTING_KEY, enabled);
    return buildApplicationsCapability(enabled, "SERVER_SETTING");
  }

  private async ensureInitialized(): Promise<ApplicationsCapability> {
    const existing = this.serverSettingsService.getBooleanSetting(APPLICATIONS_CAPABILITY_SETTING_KEY);
    if (existing !== null) {
      return buildApplicationsCapability(existing, "SERVER_SETTING");
    }

    if (!this.initializePromise) {
      this.initializePromise = this.initializeCapability();
    }

    try {
      return await this.initializePromise;
    } finally {
      if (this.initializePromise) {
        this.initializePromise = null;
      }
    }
  }

  private async initializeCapability(): Promise<ApplicationsCapability> {
    const existing = this.serverSettingsService.getBooleanSetting(APPLICATIONS_CAPABILITY_SETTING_KEY);
    if (existing !== null) {
      return buildApplicationsCapability(existing, "SERVER_SETTING");
    }

    const hasDiscoverableApplications =
      await this.applicationBundleService.hasDiscoverableApplications();
    this.serverSettingsService.setBooleanSetting(APPLICATIONS_CAPABILITY_SETTING_KEY, hasDiscoverableApplications);

    return buildApplicationsCapability(
      hasDiscoverableApplications,
      hasDiscoverableApplications
        ? "INITIALIZED_FROM_DISCOVERED_APPLICATIONS"
        : "INITIALIZED_EMPTY_CATALOG",
    );
  }
}
