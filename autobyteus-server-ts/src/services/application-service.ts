import fs from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../config/app-config-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export interface ApplicationManifest {
  id: string;
  name: string;
  entrypointModule?: string;
  entrypointFunction?: string;
  type?: string;
  [key: string]: unknown;
}

export class ApplicationService {
  private static instance: ApplicationService | null = null;

  static getInstance(): ApplicationService {
    if (!ApplicationService.instance) {
      ApplicationService.instance = new ApplicationService();
    }
    return ApplicationService.instance;
  }

  static resetInstance(): void {
    ApplicationService.instance = null;
  }

  private applications = new Map<string, ApplicationManifest>();
  readonly applicationsDir: string;

  constructor(appRootOverride?: string) {
    const appRoot = appRootOverride ?? appConfigProvider.config.getAppRootDir();
    this.applicationsDir = path.join(appRoot, "applications");
    this.loadApplications();
  }

  loadApplications(): void {
    logger.info(`Scanning for applications in: ${this.applicationsDir}`);
    if (!fs.existsSync(this.applicationsDir) || !fs.statSync(this.applicationsDir).isDirectory()) {
      logger.warn(
        `Applications directory not found: ${this.applicationsDir}. No applications will be loaded.`,
      );
      return;
    }

    for (const appId of fs.readdirSync(this.applicationsDir)) {
      const appDir = path.join(this.applicationsDir, appId);
      const manifestPath = path.join(appDir, "manifest.json");

      if (!fs.existsSync(appDir) || !fs.statSync(appDir).isDirectory()) {
        continue;
      }
      if (!fs.existsSync(manifestPath)) {
        continue;
      }

      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as ApplicationManifest;
        if (!manifest.id || !manifest.name) {
          logger.error(
            `Invalid manifest file at ${manifestPath}. Missing required 'id' or 'name' keys. Skipping.`,
          );
          continue;
        }
        if (manifest.id !== appId) {
          logger.error(
            `Mismatched application ID in ${manifestPath}. Folder is '${appId}', but manifest ID is '${manifest.id}'. Skipping.`,
          );
          continue;
        }

        this.applications.set(appId, manifest);
        logger.info(`Successfully loaded application: '${manifest.name}' (ID: ${appId})`);
      } catch (error) {
        if (error instanceof SyntaxError) {
          logger.error(
            `Failed to parse manifest.json for application '${appId}'. It is not valid JSON. Skipping.`,
          );
        } else {
          logger.error(
            `An unexpected error occurred while loading application '${appId}': ${String(error)}`,
          );
        }
      }
    }

    logger.info(`Application loading complete. Total applications loaded: ${this.applications.size}`);
  }

  listApplications(): ApplicationManifest[] {
    return Array.from(this.applications.values());
  }

  async runApplication(appId: string, inputData: Record<string, unknown>): Promise<unknown> {
    const manifest = this.applications.get(appId);
    if (!manifest) {
      throw new Error(`Application with ID '${appId}' not found.`);
    }

    if (manifest.type === "AGENT_TEAM") {
      throw new Error(
        `Application '${appId}' is a team-based application. It must be launched and interacted with from the frontend using agent team APIs, not runApplication.`,
      );
    }

    const moduleName = manifest.entrypointModule;
    const functionName = manifest.entrypointFunction;

    if (!moduleName || !functionName) {
      throw new Error(
        `Application '${appId}' cannot be run from the backend as it has no defined entrypoint.`,
      );
    }

    try {
      logger.info(`Executing application '${appId}'...`);
      const appModule = await import(moduleName);
      const appFunction = (appModule as Record<string, unknown>)[functionName];

      if (typeof appFunction !== "function") {
        throw new Error("Entrypoint not found");
      }

      const result = appFunction(inputData);
      const resolved = result instanceof Promise ? await result : result;

      logger.info(`Application '${appId}' executed successfully.`);
      return resolved;
    } catch (error) {
      const err = error as Error & { code?: string };

      if (err.message === "Entrypoint not found" || err.code === "ERR_MODULE_NOT_FOUND") {
        logger.error(
          `Failed to load entry point for application '${appId}': ${String(error)}`,
        );
        throw new Error(
          `Could not load the entry point for application '${appId}'. Check server logs for details.`,
        );
      }

      logger.error(
        `An error occurred while running application '${appId}': ${String(error)}`,
      );
      throw error;
    }
  }
}

export const getApplicationService = (): ApplicationService => ApplicationService.getInstance();
