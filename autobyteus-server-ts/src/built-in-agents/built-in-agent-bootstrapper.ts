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
  getAgentDefinitionById: (definitionId: string) => Promise<AgentDefinition | null>;
  refreshCache: () => Promise<void>;
};

type BuiltInAgentSettingsPersistence = Pick<
  ServerSettingsService,
  "getSettingValue" | "updateSetting"
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
  syncedAgentMd: boolean;
  syncedAgentConfig: boolean;
  syncedSkills: boolean;
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
    this.agentDefinitions = BUILT_IN_AGENT_DEFINITIONS;
    this.agentDefinitionService = options.agentDefinitionService ?? null;
    this.serverSettingsService = options.serverSettingsService ?? null;
    this.logger = options.logger ?? logger;
  }

  /** Writes every built-in agent's files, reconciles the catalog once, then resolves each and seeds its setting. */
  async bootstrap(): Promise<BuiltInAgentsBootstrapResult> {
    const agentsDir = this.getAgentsDir();
    await fs.mkdir(agentsDir, { recursive: true });

    const synced = [];
    for (const definition of this.agentDefinitions) {
      synced.push({ definition, ...await this.syncBuiltInAgentFiles(agentsDir, definition) });
    }

    await this.getAgentDefinitionService().refreshCache();

    const builtInAgents: BuiltInAgentBootstrapResult[] = [];
    for (const { definition, ...files } of synced) {
      const resolved = (await this.resolveBuiltInDefinition(definition)) !== null;
      const initializedSetting = resolved
        ? await this.initializeSettingDefaultIfNeeded(definition)
        : false;
      builtInAgents.push({
        agentDefinitionId: definition.id,
        displayName: definition.displayName,
        ...files,
        resolved,
        initializedSetting,
      });
    }

    return {
      agentsDir,
      builtInAgents,
      refreshedCache: true,
    };
  }

  private async syncBuiltInAgentFiles(
    agentsDir: string,
    definition: BuiltInAgentDefinition,
  ): Promise<Pick<BuiltInAgentBootstrapResult, "agentDir" | "templateDir" | "syncedAgentMd" | "syncedAgentConfig" | "syncedSkills">> {
    const agentDir = path.join(agentsDir, definition.id);
    const templateDir = this.getTemplateDir(definition);

    await fs.mkdir(agentDir, { recursive: true });
    const [syncedAgentMd, syncedAgentConfig, syncedSkills] = await Promise.all([
      this.syncFileFromTemplate(path.join(templateDir, "agent.md"), path.join(agentDir, "agent.md")),
      this.syncFileFromTemplate(
        path.join(templateDir, "agent-config.json"),
        path.join(agentDir, "agent-config.json"),
      ),
      this.syncDirectoryMirrorFromTemplate(
        path.join(templateDir, "skills"),
        path.join(agentDir, "skills"),
      ),
    ]);
    return { agentDir, templateDir, syncedAgentMd, syncedAgentConfig, syncedSkills };
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

  private async syncFileFromTemplate(templatePath: string, targetPath: string): Promise<boolean> {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.copyFile(templatePath, targetPath);
    return true;
  }

  private async syncDirectoryMirrorFromTemplate(
    templatePath: string,
    targetPath: string,
  ): Promise<boolean> {
    await fs.rm(targetPath, { recursive: true, force: true });

    if (!(await this.isDirectory(templatePath))) {
      return true;
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.cp(templatePath, targetPath, {
      recursive: true,
      dereference: false,
    });
    return true;
  }

  private async isDirectory(targetPath: string): Promise<boolean> {
    try {
      return (await fs.stat(targetPath)).isDirectory();
    } catch {
      return false;
    }
  }

  private async resolveBuiltInDefinition(
    definition: BuiltInAgentDefinition,
  ): Promise<AgentDefinition | null> {
    try {
      const agentDefinition = await this.getAgentDefinitionService().getAgentDefinitionById(
        definition.id,
      );
      if (!agentDefinition) {
        this.logger.warn(
          `Built-in agent '${definition.id}' was synced but did not resolve as a normal agent definition.`,
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
    const currentValue = settings.getSettingValue(settingDefault.key);
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
}

export const bootstrapBuiltInAgents = async (
  options: BuiltInAgentBootstrapperOptions = {},
): Promise<BuiltInAgentsBootstrapResult> => new BuiltInAgentBootstrapper(options).bootstrap();
