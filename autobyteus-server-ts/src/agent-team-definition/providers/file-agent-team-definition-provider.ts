import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { AppConfig } from "../../config/app-config.js";
import { readJsonFile } from "../../persistence/file/store-utils.js";
import { AgentTeamDefinition, TeamMember } from "../domain/agent-team-definition.js";
import { TeamMdParseError, parseTeamMd, serializeTeamMd } from "../utils/team-md-parser.js";
import {
  ApplicationBundleService,
  getGeneralProcessApplicationBundleService,
} from "../../application-bundles/services/application-bundle-service.js";
import {
  AgentTeamDefinitionConfigParseError,
  buildAgentTeamDefinitionConfig,
  parseAgentTeamDefinitionConfig,
  readAgentTeamDefinitionConfig,
} from "./agent-team-definition-config.js";
import {
  ensureWritableTeamSourcePaths,
  findTeamSourcePaths,
  getCanonicalTeamDefinitionIdFromSourcePaths,
  type ResolvedTeamSourcePaths,
} from "./team-definition-source-paths.js";
import { listAllTeamSourcePaths } from "./agent-team-definition-source-discovery.js";
import {
  createDefinitionSourceDescriptor,
  assertDefinitionSourceWritableByRuntime,
  type DefinitionSourceDescriptor,
} from "../../collaboration-definition-admission/domain/definition-source-descriptor.js";
import { DefinitionPackageTransaction } from "../../collaboration-definition-admission/providers/definition-package-transaction.js";
import { findAgentOrgOwnedDefinitionSource } from "../../agent-org-definition/providers/agent-org-owned-definition-source-index.js";

const logger = { warn: (...args: unknown[]) => console.warn(...args) };
const FILES = ["team.md", "team-config.json"] as const;

const slugify = (value: string): string => value.toLowerCase().trim()
  .replace(/[_\s]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-")
  .replace(/^-+|-+$/g, "") || "team";

const revisionFor = (files: Readonly<Record<string, string>>): string => {
  const hash = createHash("sha256");
  for (const name of [...FILES].sort()) hash.update(name).update("\0").update(files[name]!).update("\0");
  return hash.digest("hex");
};

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
      const parsed = parseTeamMd(mdContent, source.mdPath);
      const config = readAgentTeamDefinitionConfig(JSON.parse(configContent));
      return new AgentTeamDefinition({
        id: getCanonicalTeamDefinitionIdFromSourcePaths(source),
        name: parsed.name,
        description: parsed.description,
        instructions: parsed.instructions,
        category: parsed.category,
        nodes: config.members.map((item) => new TeamMember(item)),
        coordinatorMemberName: config.coordinatorMemberName,
        handoffs: config.handoffs,
        avatarUrl: config.avatarUrl,
        defaultLaunchConfig: config.defaultLaunchConfig,
        ownershipScope: source.kind === "application_owned" ? "application_owned" : source.kind === "agent_org_owned" ? "agent_org_owned" : "shared",
        ownerOrgId: source.kind === "agent_org_owned" ? source.orgDefinitionId : null,
        ownerOrgName: source.kind === "agent_org_owned" ? source.orgDefinitionName : null,
        ownerApplicationId: source.kind === "application_owned" ? source.applicationId : null,
        ownerApplicationName: source.kind === "application_owned" ? source.applicationName : null,
        ownerPackageId: source.kind === "application_owned" ? source.packageId : null,
        ownerLocalApplicationId: source.kind === "application_owned" ? source.localApplicationId : null,
        revision: revisionFor({ "team.md": mdContent, "team-config.json": configContent }),
        source: this.sourceDescriptor(source),
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

  async getById(id: string): Promise<AgentTeamDefinition | null> {
    if (id.startsWith("_")) return null;
    const source = await findTeamSourcePaths(
      id, this.getReadTeamRoots(), this.applicationBundleService, this.getReadOrgRoots(),
    );
    return source ? this.readDefinition(source) : null;
  }

  async getAll(): Promise<AgentTeamDefinition[]> {
    const definitions: AgentTeamDefinition[] = [];
    const seen = new Set<string>();
    const sources = await listAllTeamSourcePaths({
      sharedTeamRoots: this.getReadTeamRoots(),
      applicationOwnedTeamSources: await this.applicationBundleService.listApplicationOwnedTeamSources(),
    });
    for (const source of sources) {
      const id = getCanonicalTeamDefinitionIdFromSourcePaths(source);
      if (id.startsWith("_") || seen.has(id)) continue;
      try {
        const definition = await this.readDefinition(source);
        if (definition?.id) { definitions.push(definition); seen.add(definition.id); }
      } catch (error) {
        if (error instanceof TeamMdParseError || error instanceof AgentTeamDefinitionConfigParseError || error instanceof SyntaxError) {
          logger.warn(`DEFINITION_CONTRACT_INVALID: skipped Team '${id}' at '${source.configPath}'; expected current Team Definition Config: ${(error as Error).message}`);
          continue;
        }
        throw error;
      }
    }
    return definitions;
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
