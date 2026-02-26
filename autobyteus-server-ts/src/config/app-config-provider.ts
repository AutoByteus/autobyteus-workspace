import { AppConfig } from "./app-config.js";

export class AppConfigProvider {
  private static instance: AppConfig | null = null;

  static getConfig(): AppConfig {
    if (!AppConfigProvider.instance) {
      AppConfigProvider.instance = new AppConfig();
    }
    return AppConfigProvider.instance;
  }

  get config(): AppConfig {
    return AppConfigProvider.getConfig();
  }
}

export const appConfigProvider = new AppConfigProvider();
