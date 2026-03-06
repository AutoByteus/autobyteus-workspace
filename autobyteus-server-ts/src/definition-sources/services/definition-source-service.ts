import fs from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { getServerSettingsService } from "../../services/server-settings-service.js";

export type DefinitionSourceInfo = {
  path: string;
  agentCount: number;
  agentTeamCount: number;
  isDefault: boolean;
};

type AppConfigLike = {
  getAppDataDir(): string;
  getAdditionalDefinitionSourceRoots(): string[];
  get(key: string, defaultValue?: string): string | undefined;
};

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

const countDefinitionsInDir = (directoryPath: string, fileName: string): number => {
  if (!fs.existsSync(directoryPath)) {
    return 0;
  }
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  } catch {
    return 0;
  }

  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (entry.name.startsWith("_")) {
      continue;
    }
    const definitionFile = path.join(directoryPath, entry.name, fileName);
    if (fs.existsSync(definitionFile)) {
      count += 1;
    }
  }
  return count;
};

export class DefinitionSourceService {
  private static instance: DefinitionSourceService | null = null;

  static getInstance(config?: AppConfigLike): DefinitionSourceService {
    if (!DefinitionSourceService.instance) {
      DefinitionSourceService.instance = new DefinitionSourceService(config);
    }
    return DefinitionSourceService.instance;
  }

  static resetInstance(): void {
    DefinitionSourceService.instance = null;
  }

  private readonly config: AppConfigLike;

  constructor(config?: AppConfigLike) {
    this.config = config ?? appConfigProvider.config;
  }

  private validateSourceRoot(sourceRoot: string): void {
    if (!path.isAbsolute(sourceRoot)) {
      throw new Error("Definition source path must be absolute.");
    }
    if (!fs.existsSync(sourceRoot)) {
      throw new Error(`Definition source directory not found: ${sourceRoot}`);
    }
    if (!fs.statSync(sourceRoot).isDirectory()) {
      throw new Error(`Definition source path is not a directory: ${sourceRoot}`);
    }

    const agentsDir = path.join(sourceRoot, "agents");
    const teamDir = path.join(sourceRoot, "agent-teams");
    const hasAgents = fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory();
    const hasTeams = fs.existsSync(teamDir) && fs.statSync(teamDir).isDirectory();
    if (!hasAgents && !hasTeams) {
      throw new Error(
        "Definition source must contain at least one directory: 'agents' or 'agent-teams'.",
      );
    }
  }

  private buildSourceInfo(sourceRoot: string, isDefault: boolean): DefinitionSourceInfo {
    return {
      path: sourceRoot,
      agentCount: countDefinitionsInDir(path.join(sourceRoot, "agents"), "agent.md"),
      agentTeamCount: countDefinitionsInDir(path.join(sourceRoot, "agent-teams"), "team.md"),
      isDefault,
    };
  }

  private async refreshDefinitionCaches(): Promise<void> {
    await AgentDefinitionService.getInstance().refreshCache();
    await AgentTeamDefinitionService.getInstance().refreshCache();
  }

  listDefinitionSources(): DefinitionSourceInfo[] {
    const defaultRoot = path.resolve(this.config.getAppDataDir());
    const sources: DefinitionSourceInfo[] = [this.buildSourceInfo(defaultRoot, true)];

    for (const sourceRoot of this.config.getAdditionalDefinitionSourceRoots()) {
      const resolved = path.resolve(sourceRoot);
      if (resolved === defaultRoot) {
        continue;
      }
      sources.push(this.buildSourceInfo(resolved, false));
    }

    return sources;
  }

  async addDefinitionSource(pathValue: string): Promise<DefinitionSourceInfo[]> {
    const rawPath = pathValue.trim();
    if (!rawPath) {
      throw new Error("Definition source path cannot be empty.");
    }
    if (!path.isAbsolute(rawPath)) {
      throw new Error("Definition source path must be absolute.");
    }

    const resolved = path.resolve(rawPath);
    const defaultRoot = path.resolve(this.config.getAppDataDir());
    if (resolved === defaultRoot) {
      throw new Error("Path is already the default definition source directory.");
    }

    this.validateSourceRoot(resolved);

    const configuredRoots = this.config.getAdditionalDefinitionSourceRoots().map((value) =>
      path.resolve(value),
    );
    if (configuredRoots.includes(resolved)) {
      throw new Error("Definition source already exists.");
    }

    const rawEnv = this.config.get("AUTOBYTEUS_DEFINITION_SOURCE_PATHS", "");
    const nextRoots = normalizePathList(rawEnv);
    nextRoots.push(resolved);
    const newEnvValue = normalizePathList(nextRoots.join(",")).join(",");

    const [success, message] = getServerSettingsService().updateSetting(
      "AUTOBYTEUS_DEFINITION_SOURCE_PATHS",
      newEnvValue,
    );
    if (!success) {
      throw new Error(`Failed to update definition source settings: ${message}`);
    }

    await this.refreshDefinitionCaches();
    return this.listDefinitionSources();
  }

  async removeDefinitionSource(pathValue: string): Promise<DefinitionSourceInfo[]> {
    const rawPath = pathValue.trim();
    if (!rawPath) {
      throw new Error("Definition source path cannot be empty.");
    }
    if (!path.isAbsolute(rawPath)) {
      throw new Error("Definition source path must be absolute.");
    }

    const resolved = path.resolve(rawPath);
    const defaultRoot = path.resolve(this.config.getAppDataDir());
    if (resolved === defaultRoot) {
      throw new Error("Cannot remove default definition source directory.");
    }

    const configuredRoots = this.config.getAdditionalDefinitionSourceRoots().map((value) =>
      path.resolve(value),
    );
    const nextRoots = configuredRoots.filter((value) => value !== resolved);
    if (nextRoots.length === configuredRoots.length) {
      throw new Error(`Definition source not found: ${resolved}`);
    }

    const [success, message] = getServerSettingsService().updateSetting(
      "AUTOBYTEUS_DEFINITION_SOURCE_PATHS",
      nextRoots.join(","),
    );
    if (!success) {
      throw new Error(`Failed to update definition source settings: ${message}`);
    }

    await this.refreshDefinitionCaches();
    return this.listDefinitionSources();
  }
}
