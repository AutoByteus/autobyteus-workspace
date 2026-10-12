import { promises as fs } from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { AppConfig } from "../../config/app-config.js";
import { readJsonFile } from "../../persistence/file/store-utils.js";
import { AgentTeamDefinition } from "../domain/agent-team-definition.js";
import { parseTeamMd, serializeTeamMd } from "../utils/team-md-parser.js";
import {
  ApplicationBundleService,
  getGeneralProcessApplicationBundleService,
} from "../../application-bundles/services/application-bundle-service.js";
import {
  buildAgentTeamDefinitionConfig,
  parseAgentTeamDefinitionConfig,
} from "./agent-team-definition-config.js";
import {
  buildApplicationOwnedTeamSourcePaths,
  ensureWritableTeamSourcePaths,
  findTeamSourcePaths,
  type ResolvedTeamSourcePaths,
} from "./team-definition-source-paths.js";
import { buildAgentTeamDefinitionFromFiles } from "./agent-team-definition-node-reader.js";
import {
  createDefinitionSourceDescriptor,
  assertDefinitionSourceWritableByRuntime,
  type DefinitionSourceDescriptor,
} from "../../collaboration-definition-admission/domain/definition-source-descriptor.js";
import { DefinitionPackageTransaction } from "../../collaboration-definition-admission/providers/definition-package-transaction.js";
import { findAgentOrgOwnedDefinitionSource } from "../../agent-org-definition/providers/agent-org-owned-definition-source-index.js";

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

const slugify = (value: string): string => value.toLowerCase().trim()
  .replace(/[_\s]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-")
  .replace(/^-+|-+$/g, "") || "team";

export class FileAgentTeamDefinitionProvider {
  private readonly transaction = new DefinitionPackageTransaction();

  constructor(private readonly dependencies: {
    appConfig?: AppConfig;
    applicationBundleService?: ApplicationBundleService;
  } = {}) {}

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService ?? getGeneralProcessApplicationBundleService();
  }
  private get appConfig(): AppConfig { return this.dependencies.appConfig ?? appConfigProvider.config; }
  private getTeamsDir(): string { return this.appConfig.getAgentTeamsDir(); }
  private getTeamDir(teamId: string): string { return path.join(this.getTeamsDir(), teamId); }
  private getReadOrgRoots(): string[] {
    return [this.appConfig.getAgentOrgsDir(), ...this.appConfig.getAdditionalAgentPackageRoots().map((root) => path.join(root, "agent-orgs"))];
  }
  private getReadTeamRoots(): string[] {
    return [this.getTeamsDir(), ...this.appConfig.getAdditionalAgentPackageRoots().map((root) => path.join(root, "agent-teams"))];
  }

  private sourceDescriptor(source: ResolvedTeamSourcePaths): DefinitionSourceDescriptor {
    const serverRoots = new Set([path.resolve(this.getTeamsDir()), path.resolve(this.appConfig.getAgentOrgsDir())]);
    const resolvedRoot = path.resolve(source.rootPath);
    const external = this.appConfig.getAdditionalAgentPackageRoots().some((root) => {
      const candidate = path.resolve(root);
      return resolvedRoot === candidate || resolvedRoot.startsWith(`${candidate}${path.sep}`);
    });
    return createDefinitionSourceDescriptor({
      sourceClass: serverRoots.has(resolvedRoot) ? "server_data" : external ? "external_read_only" : "implementation_repository",
      packageRoot: source.rootPath,
      definitionPath: source.teamDir,
    });
  }

  private async validatePackage(packagePath: string): Promise<void> {
    parseTeamMd(await fs.readFile(path.join(packagePath, "team.md"), "utf8"), path.join(packagePath, "team.md"));
    parseAgentTeamDefinitionConfig(await readJsonFile<unknown>(path.join(packagePath, "team-config.json"), null));
  }

  private async readDefinition(source: ResolvedTeamSourcePaths): Promise<AgentTeamDefinition | null> {
    try {
      const mdContent = await fs.readFile(source.mdPath, "utf8");
      const configContent = await fs.readFile(source.configPath, "utf8");
      return buildAgentTeamDefinitionFromFiles({
        source, mdContent, configContent, descriptor: this.sourceDescriptor(source),
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  private content(definition: AgentTeamDefinition): Readonly<Record<string, string>> {
    return {
      "team.md": serializeTeamMd({
        name: definition.name,
        description: definition.description,
        category: definition.category,
      }, definition.instructions),
      "team-config.json": `${JSON.stringify(buildAgentTeamDefinitionConfig(definition), null, 2)}\n`,
    };
  }

  private async nextTeamId(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    for (let index = 2; await fs.access(this.getTeamDir(candidate)).then(() => true).catch(() => false); index += 1) {
      candidate = `${base}-${index}`;
    }
    return candidate;
  }

  async create(definition: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    if (definition.ownershipScope !== "shared") throw new Error("Only server-data Team definitions can be created.");
    const id = definition.id ?? await this.nextTeamId(definition.name);
    await this.transaction.commit({
      packagePath: this.getTeamDir(id), files: this.content(definition), expectedRevision: null,
      validatePackage: (packagePath) => this.validatePackage(packagePath),
    });
    const created = await this.getById(id);
    if (!created) throw new Error(`Failed to create Team definition '${id}'.`);
    return created;
  }

  /**
   * Exact disk read used for write results, application-owned Teams and startup data migrations.
   * Runtime readers of registered agent packages go through the agent package definitions.
   */
  async getById(id: string): Promise<AgentTeamDefinition | null> {
    if (id.startsWith("_")) return null;
    const source = await findTeamSourcePaths(
      id, this.getReadTeamRoots(), this.applicationBundleService, this.getReadOrgRoots(),
    );
    return source ? this.readDefinition(source) : null;
  }

  /**
   * Application-package Teams, read on demand (they are not agent package definitions). Each Team
   * is isolated: one that cannot be read is logged and skipped, never failing the list.
   */
  async listApplicationOwnedTeams(): Promise<AgentTeamDefinition[]> {
    let sources: Awaited<ReturnType<ApplicationBundleService["listApplicationOwnedTeamSources"]>>;
    try {
      sources = await this.applicationBundleService.listApplicationOwnedTeamSources();
    } catch (error) {
      logger.warn("APPLICATION_PACKAGE_SOURCES_UNAVAILABLE:agent_team", error);
      return [];
    }
    const output: AgentTeamDefinition[] = [];
    for (const source of sources) {
      try {
        const definition = await this.readDefinition(buildApplicationOwnedTeamSourcePaths(source));
        if (definition) output.push(definition);
      } catch (error) {
        logger.warn(`APPLICATION_PACKAGE_TEAM_SKIPPED:${source.definitionId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return output;
  }

  async getTemplates(): Promise<AgentTeamDefinition[]> {
    const all: AgentTeamDefinition[] = [];
    for (const root of this.getReadTeamRoots()) {
      const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith("_")) continue;
        try {
          const source = await findTeamSourcePaths(entry.name, [root], this.applicationBundleService);
          const definition = source ? await this.readDefinition(source) : null;
          if (definition) all.push(definition);
        } catch (error) {
          logger.warn(`Skipped Team template '${entry.name}': ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    return all;
  }

  async update(definition: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    if (!definition.id) throw new Error("Team definition id is required for update.");
    const orgSource = await findAgentOrgOwnedDefinitionSource({ definitionId: definition.id, subject: "agent_team", orgRoots: this.getReadOrgRoots() });
    if (orgSource) throw new Error("AgentOrg-owned Team definitions can only be changed through their atomic parent AgentOrg save.");
    const source = await findTeamSourcePaths(definition.id, this.getReadTeamRoots(), this.applicationBundleService);
    if (!source) throw new Error(`Team definition '${definition.id}' does not exist.`);
    assertDefinitionSourceWritableByRuntime(this.sourceDescriptor(source));
    await ensureWritableTeamSourcePaths(source, definition.id);
    if (!definition.revision) throw new Error("expectedRevision is required for Team definition update.");
    await this.transaction.commit({
      packagePath: source.teamDir, files: this.content(definition), expectedRevision: definition.revision,
      validatePackage: (packagePath) => this.validatePackage(packagePath),
    });
    const updated = await this.getById(definition.id);
    if (!updated) throw new Error(`Failed to update Team definition '${definition.id}'.`);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    if (await findAgentOrgOwnedDefinitionSource({ definitionId: id, subject: "agent_team", orgRoots: this.getReadOrgRoots() })) {
      throw new Error("AgentOrg-owned Team definitions can only be deleted through their atomic parent AgentOrg save.");
    }
    const source = await findTeamSourcePaths(id, this.getReadTeamRoots(), this.applicationBundleService);
    if (!source) return false;
    assertDefinitionSourceWritableByRuntime(this.sourceDescriptor(source));
    return this.transaction.remove(source.teamDir);
  }
}
