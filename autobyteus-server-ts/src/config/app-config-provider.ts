import path from "node:path";
import { AppConfig, AppConfigError, type AppConfigOptions } from "./app-config.js";

export type AppConfigBootstrapOptions = Pick<AppConfigOptions, "appDataDir">;

export class AppConfigProvider {
  private static instance: AppConfig | null = null;

  static getConfig(): AppConfig {
    if (!AppConfigProvider.instance) {
      AppConfigProvider.instance = new AppConfig();
    }
    return AppConfigProvider.instance;
  }

  static initialize(options: AppConfigBootstrapOptions = {}): AppConfig {
    const normalizedAppDataDir =
      typeof options.appDataDir === "string" && options.appDataDir.trim().length > 0
        ? path.resolve(options.appDataDir.trim())
        : null;

    if (!AppConfigProvider.instance) {
      AppConfigProvider.instance = new AppConfig({
        appDataDir: normalizedAppDataDir,
      });
      return AppConfigProvider.instance;
    }

    if (
      normalizedAppDataDir &&
      path.resolve(AppConfigProvider.instance.getAppDataDir()) !== normalizedAppDataDir
    ) {
      if (AppConfigProvider.instance.isInitialized()) {
        throw new AppConfigError(
          "AppConfigProvider cannot change the app data directory after initialization.",
        );
      }
      AppConfigProvider.instance.setCustomAppDataDir(normalizedAppDataDir);
    }

    return AppConfigProvider.instance;
  }

  static resetForTests(): void {
    AppConfigProvider.instance = null;
  }

  initialize(options: AppConfigBootstrapOptions = {}): AppConfig {
    return AppConfigProvider.initialize(options);
  }

  get config(): AppConfig {
    return AppConfigProvider.getConfig();
  }

  resetForTests(): void {
    AppConfigProvider.resetForTests();
  }
}

export const appConfigProvider = new AppConfigProvider();
