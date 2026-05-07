import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../agent-definition/domain/models.js";
import { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import { appConfigProvider } from "../config/app-config-provider.js";
import {
  getServerSettingsService,
  type ServerSettingsService,
} from "../services/server-settings-service.js";
import {
  BUILT_IN_AGENT_DEFINITIONS,
  type BuiltInAgentDefinition,
} from "./built-in-agent-registry.js";

const TEMPLATES_DIR = fileURLToPath(new URL("./templates/", import.meta.url));

type AgentDefinitionLookup = {
  getFreshAgentDefinitionById: (definitionId: string) => Promise<AgentDefinition | null>;
  refreshCache?: () => Promise<void>;
};

type BuiltInAgentSettingsPersistence = Pick<
  ServerSettingsService,
  "getCompactionAgentDefinitionId" | "updateSetting"
>;

type Logger = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

export type BuiltInAgentBootstrapResult = {
  agentDefinitionId: string;
  displayName: string;
  agentDir: string;
  templateDir: string;
  seededAgentMd: boolean;
  seededAgentConfig: boolean;
  resolved: boolean;
  initializedSetting: boolean;
};

export type BuiltInAgentsBootstrapResult = {
  agentsDir: string;
  builtInAgents: BuiltInAgentBootstrapResult[];
  refreshedCache: boolean;
};

export type BuiltInAgentBootstrapperOptions = {
  agentsDir?: string;
  agentDefinitions?: readonly BuiltInAgentDefinition[];
  agentDefinitionService?: AgentDefinitionLookup;
  serverSettingsService?: BuiltInAgentSettingsPersistence;
  logger?: Logger;
};

const logger: Logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

export class BuiltInAgentBootstrapper {
  private readonly agentsDir: string | null;
  private readonly agentDefinitions: readonly BuiltInAgentDefinition[];
  private readonly agentDefinitionService: AgentDefinitionLookup | null;
  private readonly serverSettingsService: BuiltInAgentSettingsPersistence | null;
  private readonly logger: Logger;

  constructor(options: BuiltInAgentBootstrapperOptions = {}) {
    this.agentsDir = options.agentsDir ?? null;
    this.agentDefinitions = options.agentDefinitions ?? BUILT_IN_AGENT_DEFINITIONS;
    this.agentDefinitionService = options.agentDefinitionService ?? null;
    this.serverSettingsService = options.serverSettingsService ?? null;
    this.logger = options.logger ?? logger;
  }

  async bootstrap(): Promise<BuiltInAgentsBootstrapResult> {
    const agentsDir = this.getAgentsDir();
    await fs.mkdir(agentsDir, { recursive: true });

    const builtInAgents: BuiltInAgentBootstrapResult[] = [];
    for (const definition of this.agentDefinitions) {
      builtInAgents.push(await this.bootstrapBuiltInAgent(agentsDir, definition));
    }

    const refreshedCache = builtInAgents.some((result) => result.resolved);
    if (refreshedCache) {
      await this.refreshDefinitionCache();
    }

    return {
      agentsDir,
      builtInAgents,
      refreshedCache,
    };
  }

  private async bootstrapBuiltInAgent(
    agentsDir: string,
    definition: BuiltInAgentDefinition,
  ): Promise<BuiltInAgentBootstrapResult> {
    const agentDir = path.join(agentsDir, definition.id);
    const templateDir = this.getTemplateDir(definition);

    await fs.mkdir(agentDir, { recursive: true });
    const [seededAgentMd, seededAgentConfig] = await Promise.all([
      this.seedFileIfMissing(path.join(templateDir, "agent.md"), path.join(agentDir, "agent.md")),
      this.seedFileIfMissing(
        path.join(templateDir, "agent-config.json"),
        path.join(agentDir, "agent-config.json"),
      ),
    ]);

    const resolved = (await this.resolveBuiltInDefinition(definition)) !== null;
    const initializedSetting = resolved
      ? await this.initializeSettingDefaultIfNeeded(definition)
      : false;

    return {
      agentDefinitionId: definition.id,
      displayName: definition.displayName,
      agentDir,
      templateDir,
      seededAgentMd,
      seededAgentConfig,
      resolved,
      initializedSetting,
    };
  }

  private getAgentsDir(): string {
    return this.agentsDir ?? appConfigProvider.config.getAgentsDir();
  }

  private getAgentDefinitionService(): AgentDefinitionLookup {
    return this.agentDefinitionService ?? AgentDefinitionService.getInstance();
  }

  private getServerSettingsService(): BuiltInAgentSettingsPersistence {
    return this.serverSettingsService ?? getServerSettingsService();
  }

  private getTemplateDir(definition: BuiltInAgentDefinition): string {
    return path.join(TEMPLATES_DIR, definition.templateDirName);
  }

  private async seedFileIfMissing(templatePath: string, targetPath: string): Promise<boolean> {
    if (await this.fileExists(targetPath)) {
      return false;
    }

    const content = await fs.readFile(templatePath, "utf-8");
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    try {
      await fs.writeFile(targetPath, content, { encoding: "utf-8", flag: "wx" });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        return false;
      }
      throw error;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return false;
      }
      throw error;
    }
  }

  private async resolveBuiltInDefinition(
    definition: BuiltInAgentDefinition,
  ): Promise<AgentDefinition | null> {
    try {
      const agentDefinition = await this.getAgentDefinitionService().getFreshAgentDefinitionById(
        definition.id,
      );
      if (!agentDefinition) {
        this.logger.warn(
          `Built-in agent '${definition.id}' was seeded but did not resolve as a normal agent definition.`,
        );
      }
      return agentDefinition;
    } catch (error) {
      this.logger.warn(
        `Built-in agent '${definition.id}' is invalid and its default setting was not selected. Repair the normal agent definition files: ${String(error)}`,
      );
      return null;
    }
  }

  private async initializeSettingDefaultIfNeeded(
    definition: BuiltInAgentDefinition,
  ): Promise<boolean> {
    const settingDefault = definition.settingDefault;
    if (!settingDefault) {
      return false;
    }

    const settings = this.getServerSettingsService();
    const currentValue = settings.getCompactionAgentDefinitionId();
    if (currentValue) {
      return false;
    }

    const [ok, message] = settings.updateSetting(settingDefault.key, definition.id);
    if (!ok) {
      throw new Error(`Failed to initialize built-in agent setting '${settingDefault.key}': ${message}`);
    }

    this.logger.info(`Initialized '${settingDefault.key}' with '${definition.id}'.`);
    return true;
  }

  private async refreshDefinitionCache(): Promise<void> {
    const refreshCache = this.getAgentDefinitionService().refreshCache;
    if (typeof refreshCache === "function") {
      await refreshCache.call(this.getAgentDefinitionService());
    }
  }
}

export const bootstrapBuiltInAgents = async (
  options: BuiltInAgentBootstrapperOptions = {},
): Promise<BuiltInAgentsBootstrapResult> => new BuiltInAgentBootstrapper(options).bootstrap();
