import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../domain/models.js";
import { AgentDefinitionService } from "../services/agent-definition-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  createDefaultFeaturedCatalogItemsSetting,
  FEATURED_CATALOG_ITEMS_SETTING_KEY,
  serializeFeaturedCatalogItemsSetting,
} from "../../config/featured-catalog-items-setting.js";
import {
  getServerSettingsService,
  type ServerSettingsService,
} from "../../services/server-settings-service.js";

export const DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID = "autobyteus-super-assistant";

const TEMPLATE_DIR = fileURLToPath(new URL("./super-assistant/", import.meta.url));
const TEMPLATE_AGENT_MD_PATH = path.join(TEMPLATE_DIR, "agent.md");
const TEMPLATE_AGENT_CONFIG_PATH = path.join(TEMPLATE_DIR, "agent-config.json");

type AgentDefinitionLookup = {
  getFreshAgentDefinitionById: (definitionId: string) => Promise<AgentDefinition | null>;
  refreshCache?: () => Promise<void>;
};

type FeaturedCatalogSettingsPersistence = Pick<
  ServerSettingsService,
  "getFeaturedCatalogItemsSettingValue" | "updateSetting"
>;

type Logger = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

export type DefaultSuperAssistantBootstrapResult = {
  agentDefinitionId: string;
  agentDir: string;
  seededAgentMd: boolean;
  seededAgentConfig: boolean;
  resolved: boolean;
  initializedAsFeatured: boolean;
};

export type DefaultSuperAssistantBootstrapperOptions = {
  agentsDir?: string;
  agentDefinitionService?: AgentDefinitionLookup;
  serverSettingsService?: FeaturedCatalogSettingsPersistence;
  logger?: Logger;
};

const logger: Logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

export class DefaultSuperAssistantBootstrapper {
  private readonly agentsDir: string | null;
  private readonly agentDefinitionService: AgentDefinitionLookup | null;
  private readonly serverSettingsService: FeaturedCatalogSettingsPersistence | null;
  private readonly logger: Logger;

  constructor(options: DefaultSuperAssistantBootstrapperOptions = {}) {
    this.agentsDir = options.agentsDir ?? null;
    this.agentDefinitionService = options.agentDefinitionService ?? null;
    this.serverSettingsService = options.serverSettingsService ?? null;
    this.logger = options.logger ?? logger;
  }

  async bootstrap(): Promise<DefaultSuperAssistantBootstrapResult> {
    const agentDir = path.join(this.getAgentsDir(), DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID);
    await fs.mkdir(agentDir, { recursive: true });

    const [seededAgentMd, seededAgentConfig] = await Promise.all([
      this.seedFileIfMissing(TEMPLATE_AGENT_MD_PATH, path.join(agentDir, "agent.md")),
      this.seedFileIfMissing(TEMPLATE_AGENT_CONFIG_PATH, path.join(agentDir, "agent-config.json")),
    ]);

    const definition = await this.resolveDefaultDefinition();
    const resolved = definition !== null;
    const initializedAsFeatured = resolved ? await this.initializeFeaturedSettingIfBlank() : false;

    if (resolved) {
      await this.refreshDefinitionCache();
    }

    return {
      agentDefinitionId: DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID,
      agentDir,
      seededAgentMd,
      seededAgentConfig,
      resolved,
      initializedAsFeatured,
    };
  }

  private getAgentsDir(): string {
    return this.agentsDir ?? appConfigProvider.config.getAgentsDir();
  }

  private getAgentDefinitionService(): AgentDefinitionLookup {
    return this.agentDefinitionService ?? AgentDefinitionService.getInstance();
  }

  private getServerSettingsService(): FeaturedCatalogSettingsPersistence {
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
        DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID,
      );
      if (!definition) {
        this.logger.warn(
          `Default Super Assistant '${DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID}' was seeded but did not resolve as a normal agent definition.`,
        );
      }
      return definition;
    } catch (error) {
      this.logger.warn(
        `Default Super Assistant '${DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID}' is invalid and was not featured. Repair the normal agent definition files: ${String(error)}`,
      );
      return null;
    }
  }

  private async initializeFeaturedSettingIfBlank(): Promise<boolean> {
    const settings = this.getServerSettingsService();
    if (settings.getFeaturedCatalogItemsSettingValue()) {
      return false;
    }

    const defaultValue = serializeFeaturedCatalogItemsSetting(
      createDefaultFeaturedCatalogItemsSetting(DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID),
    );
    const [ok, message] = settings.updateSetting(
      FEATURED_CATALOG_ITEMS_SETTING_KEY,
      defaultValue,
    );
    if (!ok) {
      throw new Error(`Failed to initialize featured catalog setting: ${message}`);
    }

    this.logger.info(
      `Initialized '${FEATURED_CATALOG_ITEMS_SETTING_KEY}' with '${DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID}'.`,
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

export const bootstrapDefaultSuperAssistant = async (
  options: DefaultSuperAssistantBootstrapperOptions = {},
): Promise<DefaultSuperAssistantBootstrapResult> =>
  new DefaultSuperAssistantBootstrapper(options).bootstrap();
