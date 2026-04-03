import fs from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { getServerSettingsService } from "../../services/server-settings-service.js";

export type AgentPackageRootInfo = {
  path: string;
  sharedAgentCount: number;
  teamLocalAgentCount: number;
  agentTeamCount: number;
  isDefault: boolean;
};

type AppConfigLike = {
  getAppDataDir(): string;
  getAdditionalAgentPackageRoots(): string[];
  get(key: string, defaultValue?: string): string | undefined;
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
    if (!entry.isDirectory() || entry.name.startsWith("_")) {
      continue;
    }
    if (fs.existsSync(path.join(directoryPath, entry.name, fileName))) {
      count += 1;
    }
  }
  return count;
};

const countTeamLocalAgentsInTeamsDir = (teamsDir: string): number => {
  if (!fs.existsSync(teamsDir)) {
    return 0;
  }
  let teamEntries: fs.Dirent[] = [];
  try {
    teamEntries = fs.readdirSync(teamsDir, { withFileTypes: true });
  } catch {
    return 0;
  }

  let count = 0;
  for (const teamEntry of teamEntries) {
    if (!teamEntry.isDirectory() || teamEntry.name.startsWith("_")) {
      continue;
    }
    const localAgentsDir = path.join(teamsDir, teamEntry.name, "agents");
    count += countDefinitionsInDir(localAgentsDir, "agent.md");
  }
  return count;
};

export class AgentPackageRootService {
  private static instance: AgentPackageRootService | null = null;

  static getInstance(config?: AppConfigLike): AgentPackageRootService {
    if (!AgentPackageRootService.instance) {
      AgentPackageRootService.instance = new AgentPackageRootService(config);
    }
    return AgentPackageRootService.instance;
  }

  static resetInstance(): void {
    AgentPackageRootService.instance = null;
  }

  private readonly config: AppConfigLike;

  constructor(config?: AppConfigLike) {
    this.config = config ?? appConfigProvider.config;
  }

  private validatePackageRoot(packageRoot: string): void {
    if (!path.isAbsolute(packageRoot)) {
      throw new Error("Agent package root path must be absolute.");
    }
    if (!fs.existsSync(packageRoot)) {
      throw new Error(`Agent package root directory not found: ${packageRoot}`);
    }
    if (!fs.statSync(packageRoot).isDirectory()) {
      throw new Error(`Agent package root path is not a directory: ${packageRoot}`);
    }

    const agentsDir = path.join(packageRoot, "agents");
    const teamDir = path.join(packageRoot, "agent-teams");
    const hasAgents = fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory();
    const hasTeams = fs.existsSync(teamDir) && fs.statSync(teamDir).isDirectory();
    if (!hasAgents && !hasTeams) {
      throw new Error(
        "Agent package root must contain at least one directory: 'agents' or 'agent-teams'.",
      );
    }
  }

  private buildPackageRootInfo(packageRoot: string, isDefault: boolean): AgentPackageRootInfo {
    return {
      path: packageRoot,
      sharedAgentCount: countDefinitionsInDir(path.join(packageRoot, "agents"), "agent.md"),
      teamLocalAgentCount: countTeamLocalAgentsInTeamsDir(path.join(packageRoot, "agent-teams")),
      agentTeamCount: countDefinitionsInDir(path.join(packageRoot, "agent-teams"), "team.md"),
      isDefault,
    };
  }

  private async refreshDefinitionCaches(): Promise<void> {
    await AgentDefinitionService.getInstance().refreshCache();
    await AgentTeamDefinitionService.getInstance().refreshCache();
  }

  listAgentPackageRoots(): AgentPackageRootInfo[] {
    const defaultRoot = path.resolve(this.config.getAppDataDir());
    const roots: AgentPackageRootInfo[] = [this.buildPackageRootInfo(defaultRoot, true)];

    for (const packageRoot of this.config.getAdditionalAgentPackageRoots()) {
      const resolved = path.resolve(packageRoot);
      if (resolved === defaultRoot) {
        continue;
      }
      roots.push(this.buildPackageRootInfo(resolved, false));
    }

    return roots;
  }

  async addAgentPackageRoot(pathValue: string): Promise<AgentPackageRootInfo[]> {
    const rawPath = pathValue.trim();
    if (!rawPath) {
      throw new Error("Agent package root path cannot be empty.");
    }
    if (!path.isAbsolute(rawPath)) {
      throw new Error("Agent package root path must be absolute.");
    }

    const resolved = path.resolve(rawPath);
    const defaultRoot = path.resolve(this.config.getAppDataDir());
    if (resolved === defaultRoot) {
      throw new Error("Path is already the default agent package root.");
    }

    this.validatePackageRoot(resolved);

    const configuredRoots = this.config.getAdditionalAgentPackageRoots().map((value) =>
      path.resolve(value),
    );
    if (configuredRoots.includes(resolved)) {
      throw new Error("Agent package root already exists.");
    }

    const rawEnv = this.config.get(AGENT_PACKAGE_ROOTS_ENV_KEY, "");
    const nextRoots = normalizePathList(rawEnv);
    nextRoots.push(resolved);
    const newEnvValue = normalizePathList(nextRoots.join(",")).join(",");

    const [success, message] = getServerSettingsService().updateSetting(
      AGENT_PACKAGE_ROOTS_ENV_KEY,
      newEnvValue,
    );
    if (!success) {
      throw new Error(`Failed to update agent package root settings: ${message}`);
    }

    await this.refreshDefinitionCaches();
    return this.listAgentPackageRoots();
  }

  async removeAgentPackageRoot(pathValue: string): Promise<AgentPackageRootInfo[]> {
    const rawPath = pathValue.trim();
    if (!rawPath) {
      throw new Error("Agent package root path cannot be empty.");
    }
    if (!path.isAbsolute(rawPath)) {
      throw new Error("Agent package root path must be absolute.");
    }

    const resolved = path.resolve(rawPath);
    const defaultRoot = path.resolve(this.config.getAppDataDir());
    if (resolved === defaultRoot) {
      throw new Error("Cannot remove the default agent package root.");
    }

    const configuredRoots = this.config.getAdditionalAgentPackageRoots().map((value) =>
      path.resolve(value),
    );
    const nextRoots = configuredRoots.filter((value) => value !== resolved);
    if (nextRoots.length === configuredRoots.length) {
      throw new Error(`Agent package root not found: ${resolved}`);
    }

    const [success, message] = getServerSettingsService().updateSetting(
      AGENT_PACKAGE_ROOTS_ENV_KEY,
      nextRoots.join(","),
    );
    if (!success) {
      throw new Error(`Failed to update agent package root settings: ${message}`);
    }

    await this.refreshDefinitionCaches();
    return this.listAgentPackageRoots();
  }
}
