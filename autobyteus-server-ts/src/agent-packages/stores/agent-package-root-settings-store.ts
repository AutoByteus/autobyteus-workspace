import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getServerSettingsService } from "../../services/server-settings-service.js";
import { resolveBundledApplicationResourceRoot } from "../../application-bundles/utils/bundled-application-resource-root.js";

type AppConfigLike = {
  getAppDataDir(): string;
  getAdditionalAgentPackageRoots(): string[];
  getAppRootDir?: () => string;
  get(key: string, defaultValue?: string): string | undefined;
};

type ServerSettingsServiceLike = {
  updateSetting(key: string, value: string): [boolean, string];
};

const AGENT_PACKAGE_ROOTS_ENV_KEY = "AUTOBYTEUS_AGENT_PACKAGE_ROOTS";

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

export class AgentPackageRootSettingsStore {
  constructor(
    private readonly config: AppConfigLike = appConfigProvider.config,
    private readonly serverSettingsService: ServerSettingsServiceLike = getServerSettingsService(),
  ) {}

  getDefaultRootPath(): string {
    return path.resolve(this.config.getAppDataDir());
  }

  private getBuiltInApplicationRootPath(): string | null {
    if (typeof this.config.getAppRootDir !== "function") {
      return null;
    }
    return resolveBundledApplicationResourceRoot(this.config.getAppRootDir());
  }

  listAdditionalRootPaths(): string[] {
    const seen = new Set<string>();
    const roots: string[] = [];
    const builtInApplicationRootPath = this.getBuiltInApplicationRootPath();

    for (const rootPath of this.config.getAdditionalAgentPackageRoots()) {
      const resolved = path.resolve(rootPath);
      if (
        resolved === this.getDefaultRootPath()
        || resolved === builtInApplicationRootPath
        || seen.has(resolved)
      ) {
        continue;
      }
      seen.add(resolved);
      roots.push(resolved);
    }

    return roots;
  }

  addAdditionalRootPath(rootPath: string): void {
    const resolved = path.resolve(rootPath);
    const builtInApplicationRootPath = this.getBuiltInApplicationRootPath();
    if (resolved === builtInApplicationRootPath) {
      throw new Error(
        "The built-in applications root cannot be registered as an additional agent package root.",
      );
    }

    const existingRoots = this.listAdditionalRootPaths();
    if (existingRoots.includes(resolved)) {
      throw new Error("Agent package already exists.");
    }

    const rawEnv = this.config.get(AGENT_PACKAGE_ROOTS_ENV_KEY, "");
    const nextRoots = normalizePathList(rawEnv);
    nextRoots.push(resolved);
    this.writeAdditionalRootPaths(nextRoots);
  }

  removeAdditionalRootPath(rootPath: string): void {
    const resolved = path.resolve(rootPath);
    const existingRoots = this.listAdditionalRootPaths();
    const nextRoots = existingRoots.filter((value) => value !== resolved);

    if (nextRoots.length === existingRoots.length) {
      throw new Error(`Agent package not found: ${resolved}`);
    }

    this.writeAdditionalRootPaths(nextRoots);
  }

  private writeAdditionalRootPaths(rootPaths: string[]): void {
    const [success, message] = this.serverSettingsService.updateSetting(
      AGENT_PACKAGE_ROOTS_ENV_KEY,
      normalizePathList(rootPaths.join(",")).join(","),
    );

    if (!success) {
      throw new Error(`Failed to update agent package settings: ${message}`);
    }
  }
}
