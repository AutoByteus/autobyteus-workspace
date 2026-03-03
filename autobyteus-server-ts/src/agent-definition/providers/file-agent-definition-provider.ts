import { promises as fs } from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentDefinition } from "../domain/models.js";

type AgentJsonRecord = {
  name: string;
  role: string;
  description: string;
  avatarUrl?: string | null;
  activePromptVersion?: number;
  toolNames?: string[];
  inputProcessorNames?: string[];
  llmResponseProcessorNames?: string[];
  systemPromptProcessorNames?: string[];
  toolExecutionResultProcessorNames?: string[];
  toolInvocationPreprocessorNames?: string[];
  lifecycleProcessorNames?: string[];
  skillNames?: string[];
};

const toJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const slugify = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "agent";
};

const ensurePositiveInteger = (value: number | undefined): number =>
  Number.isInteger(value) && (value as number) > 0 ? (value as number) : 1;

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const toDomain = (agentId: string, record: AgentJsonRecord): AgentDefinition =>
  new AgentDefinition({
    id: agentId,
    name: record.name,
    role: record.role,
    description: record.description,
    avatarUrl: record.avatarUrl ?? null,
    activePromptVersion: ensurePositiveInteger(record.activePromptVersion),
    toolNames: normalizeStringArray(record.toolNames),
    inputProcessorNames: normalizeStringArray(record.inputProcessorNames),
    llmResponseProcessorNames: normalizeStringArray(record.llmResponseProcessorNames),
    systemPromptProcessorNames: normalizeStringArray(record.systemPromptProcessorNames),
    toolExecutionResultProcessorNames: normalizeStringArray(record.toolExecutionResultProcessorNames),
    toolInvocationPreprocessorNames: normalizeStringArray(record.toolInvocationPreprocessorNames),
    lifecycleProcessorNames: normalizeStringArray(record.lifecycleProcessorNames),
    skillNames: normalizeStringArray(record.skillNames),
  });

const toRecord = (definition: AgentDefinition): AgentJsonRecord => ({
  name: definition.name,
  role: definition.role,
  description: definition.description,
  avatarUrl: definition.avatarUrl ?? null,
  activePromptVersion: ensurePositiveInteger(definition.activePromptVersion),
  toolNames: [...definition.toolNames],
  inputProcessorNames: [...definition.inputProcessorNames],
  llmResponseProcessorNames: [...definition.llmResponseProcessorNames],
  systemPromptProcessorNames: [...definition.systemPromptProcessorNames],
  toolExecutionResultProcessorNames: [...definition.toolExecutionResultProcessorNames],
  toolInvocationPreprocessorNames: [...definition.toolInvocationPreprocessorNames],
  lifecycleProcessorNames: [...definition.lifecycleProcessorNames],
  skillNames: [...definition.skillNames],
});

export class FileAgentDefinitionProvider {
  private getAgentsDir(): string {
    return path.join(appConfigProvider.config.getAppDataDir(), "agents");
  }

  private getAgentDir(agentId: string): string {
    return path.join(this.getAgentsDir(), agentId);
  }

  private getAgentJsonPath(agentId: string): string {
    return path.join(this.getAgentDir(agentId), "agent.json");
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async nextAgentId(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let index = 2;
    while (await this.exists(this.getAgentDir(candidate))) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    return candidate;
  }

  async getPromptContents(agentId: string): Promise<Record<string, string>> {
    const agentDir = this.getAgentDir(agentId);
    const versions: Record<string, string> = {};
    let names: string[];
    try {
      names = await fs.readdir(agentDir);
    } catch {
      return versions;
    }

    for (const name of names) {
      const match = /^prompt-v(\d+)\.md$/.exec(name);
      if (!match || !match[1]) {
        continue;
      }
      try {
        versions[match[1]] = await fs.readFile(path.join(agentDir, name), "utf-8");
      } catch {
        // ignore unreadable prompt files
      }
    }
    return versions;
  }

  async writeAgentFolder(
    agentId: string,
    record: AgentJsonRecord,
    promptVersions: Record<string, string>,
  ): Promise<void> {
    const agentDir = this.getAgentDir(agentId);
    await fs.mkdir(agentDir, { recursive: true });
    await fs.writeFile(this.getAgentJsonPath(agentId), toJson(record), "utf-8");

    let existingNames: string[] = [];
    try {
      existingNames = await fs.readdir(agentDir);
    } catch {
      existingNames = [];
    }
    for (const name of existingNames) {
      if (/^prompt-v\d+\.md$/.test(name)) {
        await fs.unlink(path.join(agentDir, name)).catch(() => undefined);
      }
    }

    const sortedVersions = Object.keys(promptVersions).sort((a, b) => Number(a) - Number(b));
    for (const version of sortedVersions) {
      const promptPath = path.join(agentDir, `prompt-v${version}.md`);
      await fs.writeFile(promptPath, promptVersions[version] ?? "", "utf-8");
    }
  }

  async create(domainObj: AgentDefinition): Promise<AgentDefinition> {
    const agentId = domainObj.id ?? (await this.nextAgentId(domainObj.name));
    await fs.mkdir(this.getAgentDir(agentId), { recursive: true });
    await fs.writeFile(this.getAgentJsonPath(agentId), toJson(toRecord(new AgentDefinition({
      ...domainObj,
      id: agentId,
    }))), "utf-8");
    const created = await this.getById(agentId);
    if (!created) {
      throw new Error(`Failed to create agent definition '${agentId}'.`);
    }
    return created;
  }

  async getById(id: string): Promise<AgentDefinition | null> {
    try {
      const raw = await fs.readFile(this.getAgentJsonPath(id), "utf-8");
      const parsed = JSON.parse(raw) as AgentJsonRecord;
      return toDomain(id, parsed);
    } catch {
      return null;
    }
  }

  async getAll(): Promise<AgentDefinition[]> {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(this.getAgentsDir());
    } catch {
      return [];
    }

    const definitions: AgentDefinition[] = [];
    for (const agentId of entries) {
      const definition = await this.getById(agentId);
      if (definition) {
        definitions.push(definition);
      }
    }
    return definitions;
  }

  async update(domainObj: AgentDefinition): Promise<AgentDefinition> {
    if (!domainObj.id) {
      throw new Error("Agent definition id is required for update.");
    }
    await fs.mkdir(this.getAgentDir(domainObj.id), { recursive: true });
    await fs.writeFile(this.getAgentJsonPath(domainObj.id), toJson(toRecord(domainObj)), "utf-8");
    const updated = await this.getById(domainObj.id);
    if (!updated) {
      throw new Error(`Failed to update agent definition '${domainObj.id}'.`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const agentDir = this.getAgentDir(id);
    const existed = await this.exists(agentDir);
    await fs.rm(agentDir, { recursive: true, force: true });
    return existed;
  }
}
