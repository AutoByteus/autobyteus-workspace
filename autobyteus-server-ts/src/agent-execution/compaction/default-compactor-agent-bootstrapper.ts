import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
  getServerSettingsService,
  type ServerSettingsService,
} from "../../services/server-settings-service.js";

export const DEFAULT_COMPACTOR_AGENT_DEFINITION_ID = "autobyteus-memory-compactor";

const TEMPLATE_DIR = fileURLToPath(new URL("./default-compactor-agent/", import.meta.url));
const TEMPLATE_AGENT_MD_PATH = path.join(TEMPLATE_DIR, "agent.md");
const TEMPLATE_AGENT_CONFIG_PATH = path.join(TEMPLATE_DIR, "agent-config.json");

type AgentDefinitionLookup = {
  getFreshAgentDefinitionById: (definitionId: string) => Promise<AgentDefinition | null>;
  refreshCache?: () => Promise<void>;
};

type CompactionSettingsPersistence = Pick<
  ServerSettingsService,
  "getCompactionAgentDefinitionId" | "updateSetting"
>;

type Logger = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

export type DefaultCompactorAgentBootstrapResult = {
  agentDefinitionId: string;
  agentDir: string;
  seededAgentMd: boolean;
  seededAgentConfig: boolean;
  resolved: boolean;
  selectedAsDefault: boolean;
};

export type DefaultCompactorAgentBootstrapperOptions = {
  agentsDir?: string;
  agentDefinitionService?: AgentDefinitionLookup;
  serverSettingsService?: CompactionSettingsPersistence;
  logger?: Logger;
};

const logger: Logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

export class DefaultCompactorAgentBootstrapper {
  private readonly agentsDir: string | null;
  private readonly agentDefinitionService: AgentDefinitionLookup | null;
  private readonly serverSettingsService: CompactionSettingsPersistence | null;
  private readonly logger: Logger;

  constructor(options: DefaultCompactorAgentBootstrapperOptions = {}) {
    this.agentsDir = options.agentsDir ?? null;
    this.agentDefinitionService = options.agentDefinitionService ?? null;
    this.serverSettingsService = options.serverSettingsService ?? null;
    this.logger = options.logger ?? logger;
  }

  async bootstrap(): Promise<DefaultCompactorAgentBootstrapResult> {
    const agentDir = path.join(this.getAgentsDir(), DEFAULT_COMPACTOR_AGENT_DEFINITION_ID);
    await fs.mkdir(agentDir, { recursive: true });

    const [seededAgentMd, seededAgentConfig] = await Promise.all([
      this.seedFileIfMissing(TEMPLATE_AGENT_MD_PATH, path.join(agentDir, "agent.md")),
      this.seedFileIfMissing(TEMPLATE_AGENT_CONFIG_PATH, path.join(agentDir, "agent-config.json")),
    ]);

    const definition = await this.resolveDefaultDefinition();
    const resolved = definition !== null;
    const selectedAsDefault = resolved ? await this.selectDefaultIfBlank() : false;

    if (resolved) {
      await this.refreshDefinitionCache();
    }

    return {
      agentDefinitionId: DEFAULT_COMPACTOR_AGENT_DEFINITION_ID,
      agentDir,
      seededAgentMd,
      seededAgentConfig,
      resolved,
      selectedAsDefault,
    };
  }

  private getAgentsDir(): string {
    return this.agentsDir ?? appConfigProvider.config.getAgentsDir();
  }

  private getAgentDefinitionService(): AgentDefinitionLookup {
    return this.agentDefinitionService ?? AgentDefinitionService.getInstance();
  }

  private getServerSettingsService(): CompactionSettingsPersistence {
    return this.serverSettingsService ?? getServerSettingsService();
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

  private async resolveDefaultDefinition(): Promise<AgentDefinition | null> {
    try {
      const definition = await this.getAgentDefinitionService().getFreshAgentDefinitionById(
        DEFAULT_COMPACTOR_AGENT_DEFINITION_ID,
      );
      if (!definition) {
        this.logger.warn(
          `Default compactor agent '${DEFAULT_COMPACTOR_AGENT_DEFINITION_ID}' was seeded but did not resolve as a normal agent definition.`,
        );
      }
      return definition;
    } catch (error) {
      this.logger.warn(
        `Default compactor agent '${DEFAULT_COMPACTOR_AGENT_DEFINITION_ID}' is invalid and was not selected. Repair the normal agent definition files: ${String(error)}`,
      );
      return null;
    }
  }

  private async selectDefaultIfBlank(): Promise<boolean> {
    const settings = this.getServerSettingsService();
    if (settings.getCompactionAgentDefinitionId()) {
      return false;
    }

    const [ok, message] = settings.updateSetting(
      AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
      DEFAULT_COMPACTOR_AGENT_DEFINITION_ID,
    );
    if (!ok) {
      throw new Error(`Failed to select default compactor agent: ${message}`);
    }

    this.logger.info(
      `Selected '${DEFAULT_COMPACTOR_AGENT_DEFINITION_ID}' as the default compactor agent.`,
    );
    return true;
  }

  private async refreshDefinitionCache(): Promise<void> {
    const refreshCache = this.getAgentDefinitionService().refreshCache;
    if (typeof refreshCache === "function") {
      await refreshCache.call(this.getAgentDefinitionService());
    }
  }
}

export const bootstrapDefaultCompactorAgent = async (
  options: DefaultCompactorAgentBootstrapperOptions = {},
): Promise<DefaultCompactorAgentBootstrapResult> =>
  new DefaultCompactorAgentBootstrapper(options).bootstrap();
