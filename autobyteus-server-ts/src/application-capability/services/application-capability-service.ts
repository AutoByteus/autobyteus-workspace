import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import {
  buildApplicationsCapability,
  type ApplicationsCapability,
} from "../domain/models.js";
import { getServerSettingsService, type ServerSettingsService } from "../../services/server-settings-service.js";

type ApplicationsSettingsAccess = Pick<
  ServerSettingsService,
  "getApplicationsEnabledSetting" | "setApplicationsEnabledSetting"
>;

type ApplicationCapabilityDependencies = {
  applicationBundleService?: Pick<ApplicationBundleService, "hasDiscoverableApplications">;
  serverSettingsService?: ApplicationsSettingsAccess;
};

export class ApplicationCapabilityService {
  private static instance: ApplicationCapabilityService | null = null;

  static getInstance(
    dependencies: ApplicationCapabilityDependencies = {},
  ): ApplicationCapabilityService {
    if (!ApplicationCapabilityService.instance) {
      ApplicationCapabilityService.instance = new ApplicationCapabilityService(dependencies);
    }
    return ApplicationCapabilityService.instance;
  }

  static resetInstance(): void {
    ApplicationCapabilityService.instance = null;
  }

  private initializePromise: Promise<ApplicationsCapability> | null = null;

  constructor(private readonly dependencies: ApplicationCapabilityDependencies = {}) {}

  private get applicationBundleService(): Pick<ApplicationBundleService, "hasDiscoverableApplications"> {
    return this.dependencies.applicationBundleService ?? ApplicationBundleService.getInstance();
  }

  private get serverSettingsService(): ApplicationsSettingsAccess {
    return this.dependencies.serverSettingsService ?? getServerSettingsService();
  }

  async getCapability(): Promise<ApplicationsCapability> {
    return this.ensureInitialized();
  }

  async setEnabled(enabled: boolean): Promise<ApplicationsCapability> {
    await this.ensureInitialized();
    this.serverSettingsService.setApplicationsEnabledSetting(enabled);
    return buildApplicationsCapability(enabled, "SERVER_SETTING");
  }

  private async ensureInitialized(): Promise<ApplicationsCapability> {
    const existing = this.serverSettingsService.getApplicationsEnabledSetting();
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
    const existing = this.serverSettingsService.getApplicationsEnabledSetting();
    if (existing !== null) {
      return buildApplicationsCapability(existing, "SERVER_SETTING");
    }

    const hasDiscoverableApplications =
      await this.applicationBundleService.hasDiscoverableApplications();
    this.serverSettingsService.setApplicationsEnabledSetting(hasDiscoverableApplications);

    return buildApplicationsCapability(
      hasDiscoverableApplications,
      hasDiscoverableApplications
        ? "INITIALIZED_FROM_DISCOVERED_APPLICATIONS"
        : "INITIALIZED_EMPTY_CATALOG",
    );
  }
}
