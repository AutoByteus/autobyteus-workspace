import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../../config/app-config.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { DefinitionPackageTransaction } from "../../collaboration-definition-admission/providers/definition-package-transaction.js";
import {
  assertDefinitionSourceWritableByRuntime,
  createDefinitionSourceDescriptor,
  type DefinitionSourceDescriptor,
} from "../../collaboration-definition-admission/domain/definition-source-descriptor.js";
import { AgentOrgDefinition } from "../domain/agent-org-definition.js";
import { parseOrgMd, serializeOrgMd } from "../utils/org-md-parser.js";
import {
  buildAgentOrgDefinitionConfig,
  parseAgentOrgDefinitionConfig,
} from "./agent-org-definition-config.js";
import { buildAgentOrgDefinitionFromFiles } from "./agent-org-definition-node-reader.js";
const slug = (value: string): string => value.toLowerCase().trim().replace(/[_\s]+/g, "-")
  .replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-+|-+$/g, "") || "agent-org";

type Source = Readonly<{ id: string; root: string; packagePath: string; mdPath: string; configPath: string }>;
export class FileAgentOrgDefinitionProvider {
  private readonly transaction = new DefinitionPackageTransaction();
  constructor(private readonly appConfig: AppConfig = appConfigProvider.config) {}

  private roots(): string[] {
    return [this.appConfig.getAgentOrgsDir(), ...this.appConfig.getAdditionalAgentPackageRoots().map((root) => path.join(root, "agent-orgs"))];
  }
  private source(root: string, id: string): Source {
    const packagePath = path.join(root, id);
    return { id, root, packagePath, mdPath: path.join(packagePath, "org.md"), configPath: path.join(packagePath, "org-config.json") };
  }
  private descriptor(source: Source): DefinitionSourceDescriptor {
    const serverRoot = path.resolve(this.appConfig.getAgentOrgsDir());
    const root = path.resolve(source.root);
    const external = this.appConfig.getAdditionalAgentPackageRoots().some((candidate) => {
      const resolved = path.resolve(candidate);
      return root === resolved || root.startsWith(`${resolved}${path.sep}`);
    });
    return createDefinitionSourceDescriptor({
      sourceClass: root === serverRoot ? "server_data" : external ? "registered_package" : "implementation_repository",
      packageRoot: source.root,
      definitionPath: source.packagePath,
    });
  }
  private async locate(id: string): Promise<Source | null> {
    for (const root of this.roots()) {
      const source = this.source(root, id);
      if (await fs.access(source.mdPath).then(() => true).catch(() => false)) return source;
    }
    return null;
  }
  private async validatePackage(packagePath: string): Promise<void> {
    parseOrgMd(await fs.readFile(path.join(packagePath, "org.md"), "utf8"), path.join(packagePath, "org.md"));
    parseAgentOrgDefinitionConfig(JSON.parse(await fs.readFile(path.join(packagePath, "org-config.json"), "utf8")));
  }
  private files(definition: AgentOrgDefinition): Readonly<Record<string, string>> {
    return {
      "org.md": serializeOrgMd({
        name: definition.name, description: definition.description,
        category: definition.category ?? undefined, instructions: definition.instructions,
      }),
      "org-config.json": `${JSON.stringify(buildAgentOrgDefinitionConfig(definition), null, 2)}\n`,
    };
  }
  private async read(source: Source): Promise<AgentOrgDefinition | null> {
    try {
      const mdContent = await fs.readFile(source.mdPath, "utf8");
      const configContent = await fs.readFile(source.configPath, "utf8");
      return buildAgentOrgDefinitionFromFiles({
        definitionId: source.id, mdPath: source.mdPath, mdContent, configContent, descriptor: this.descriptor(source),
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  /** Exact disk read used for write results; readers go through the agent package definitions. */
  async getById(id: string): Promise<AgentOrgDefinition | null> {
    if (!id || id.startsWith("_")) return null;
    const source = await this.locate(id);
    return source ? this.read(source) : null;
  }
  async create(definition: AgentOrgDefinition): Promise<AgentOrgDefinition> {
    const base = slug(definition.name);
    let id = base;
    for (let index = 2; await this.locate(id); index += 1) id = `${base}-${index}`;
    await this.transaction.commit({ packagePath: path.join(this.appConfig.getAgentOrgsDir(), id), files: this.files(definition), expectedRevision: null, validatePackage: (p) => this.validatePackage(p) });
    const created = await this.getById(id);
    if (!created) throw new Error(`Failed to create AgentOrg '${id}'.`);
    return created;
  }
  async update(definition: AgentOrgDefinition): Promise<AgentOrgDefinition> {
    if (!definition.id || !definition.revision) throw new Error("AgentOrg id and expectedRevision are required.");
    const source = await this.locate(definition.id);
    if (!source) throw new Error(`AgentOrg '${definition.id}' does not exist.`);
    assertDefinitionSourceWritableByRuntime(this.descriptor(source));
    await this.transaction.commit({ packagePath: source.packagePath, files: this.files(definition), expectedRevision: definition.revision, validatePackage: (p) => this.validatePackage(p) });
    const updated = await this.getById(definition.id);
    if (!updated) throw new Error(`Failed to update AgentOrg '${definition.id}'.`);
    return updated;
  }
  async delete(id: string): Promise<boolean> {
    const source = await this.locate(id);
    if (!source) return false;
    assertDefinitionSourceWritableByRuntime(this.descriptor(source));
    return this.transaction.remove(source.packagePath);
  }
}
