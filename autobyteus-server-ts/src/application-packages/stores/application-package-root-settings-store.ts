import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getServerSettingsService } from "../../services/server-settings-service.js";
import { resolveBuiltInApplicationPackageRoot } from "../../application-bundles/utils/built-in-application-package-root.js";

type AppConfigLike = {
  getAdditionalApplicationPackageRoots(): string[];
  getAppRootDir(): string;
  get(key: string, defaultValue?: string): string | undefined;
};

type ServerSettingsServiceLike = {
  updateSetting(key: string, value: string): [boolean, string];
};

const APPLICATION_PACKAGE_ROOTS_ENV_KEY = "AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS";

const normalizePathList = (raw: string | undefined): string[] => {
  if (!raw || !raw.trim()) {
    return [];
  }

  const seen = new Set<string>();
  const values: string[] = [];

  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    const resolved = path.resolve(trimmed);
    if (seen.has(resolved)) {
      continue;
    }
    seen.add(resolved);
    values.push(resolved);
  }

  return values;
};

export class ApplicationPackageRootSettingsStore {
  constructor(
    private readonly config: AppConfigLike = appConfigProvider.config,
    private readonly serverSettingsService: ServerSettingsServiceLike = getServerSettingsService(),
  ) {}

  getBuiltInRootPath(): string {
    return resolveBuiltInApplicationPackageRoot(this.config.getAppRootDir());
  }

  listAdditionalRootPaths(): string[] {
    const seen = new Set<string>();
    const roots: string[] = [];
    const builtInRootPath = this.getBuiltInRootPath();

    for (const rootPath of this.config.getAdditionalApplicationPackageRoots()) {
      const resolved = path.resolve(rootPath);
      if (resolved === builtInRootPath || seen.has(resolved)) {
        continue;
      }
      seen.add(resolved);
      roots.push(resolved);
    }

    return roots;
  }

  addAdditionalRootPath(rootPath: string): void {
    const resolved = path.resolve(rootPath);
    if (resolved === this.getBuiltInRootPath()) {
      throw new Error(
        "The built-in applications root cannot be registered as an additional application package root.",
      );
    }

    const existingRoots = this.listAdditionalRootPaths();
    if (existingRoots.includes(resolved)) {
      throw new Error("Application package already exists.");
    }

    const rawEnv = this.config.get(APPLICATION_PACKAGE_ROOTS_ENV_KEY, "");
    const nextRoots = normalizePathList(rawEnv);
    nextRoots.push(resolved);
    this.writeAdditionalRootPaths(nextRoots);
  }

  removeAdditionalRootPath(rootPath: string): void {
    const resolved = path.resolve(rootPath);
    const existingRoots = this.listAdditionalRootPaths();
    const nextRoots = existingRoots.filter((value) => value !== resolved);

    if (nextRoots.length === existingRoots.length) {
      throw new Error(`Application package not found: ${resolved}`);
    }

    this.writeAdditionalRootPaths(nextRoots);
  }

  private writeAdditionalRootPaths(rootPaths: string[]): void {
    const [success, message] = this.serverSettingsService.updateSetting(
      APPLICATION_PACKAGE_ROOTS_ENV_KEY,
      normalizePathList(rootPaths.join(",")).join(","),
    );

    if (!success) {
      throw new Error(`Failed to update application package settings: ${message}`);
    }
  }
}
