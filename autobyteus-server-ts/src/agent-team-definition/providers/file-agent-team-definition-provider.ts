import { promises as fs } from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { NodeType } from "../domain/enums.js";
import { AgentTeamDefinition, TeamMember } from "../domain/models.js";

type TeamMemberRecord = {
  memberName: string;
  agentId: string;
};

type TeamJsonRecord = {
  name: string;
  description: string;
  coordinatorMemberName: string;
  role?: string | null;
  avatarUrl?: string | null;
  members: TeamMemberRecord[];
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
  return normalized || "team";
};

const toDomain = (teamId: string, record: TeamJsonRecord): AgentTeamDefinition =>
  new AgentTeamDefinition({
    id: teamId,
    name: record.name,
    description: record.description,
    coordinatorMemberName: record.coordinatorMemberName,
    role: record.role ?? null,
    avatarUrl: record.avatarUrl ?? null,
    nodes: (record.members ?? []).map(
      (member) =>
        new TeamMember({
          memberName: member.memberName,
          referenceId: member.agentId,
          referenceType: NodeType.AGENT,
        }),
    ),
  });

const toRecord = (definition: AgentTeamDefinition): TeamJsonRecord => ({
  name: definition.name,
  description: definition.description,
  coordinatorMemberName: definition.coordinatorMemberName,
  role: definition.role ?? null,
  avatarUrl: definition.avatarUrl ?? null,
  members: definition.nodes
    .filter((node) => node.referenceType === NodeType.AGENT)
    .map((node) => ({
      memberName: node.memberName,
      agentId: node.referenceId,
    })),
});

export class FileAgentTeamDefinitionProvider {
  private getTeamsDir(): string {
    return path.join(appConfigProvider.config.getAppDataDir(), "agent-teams");
  }

  private getTeamDir(teamId: string): string {
    return path.join(this.getTeamsDir(), teamId);
  }

  private getTeamJsonPath(teamId: string): string {
    return path.join(this.getTeamDir(teamId), "team.json");
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async nextTeamId(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let index = 2;
    while (await this.exists(this.getTeamDir(candidate))) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    return candidate;
  }

  async writeTeamFolder(teamId: string, record: TeamJsonRecord): Promise<void> {
    await fs.mkdir(this.getTeamDir(teamId), { recursive: true });
    await fs.writeFile(this.getTeamJsonPath(teamId), toJson(record), "utf-8");
  }

  async create(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    const teamId = domainObj.id ?? (await this.nextTeamId(domainObj.name));
    await this.writeTeamFolder(teamId, toRecord(new AgentTeamDefinition({ ...domainObj, id: teamId })));
    const created = await this.getById(teamId);
    if (!created) {
      throw new Error(`Failed to create team definition '${teamId}'.`);
    }
    return created;
  }

  async getById(id: string): Promise<AgentTeamDefinition | null> {
    try {
      const raw = await fs.readFile(this.getTeamJsonPath(id), "utf-8");
      const parsed = JSON.parse(raw) as TeamJsonRecord;
      return toDomain(id, parsed);
    } catch {
      return null;
    }
  }

  async getAll(): Promise<AgentTeamDefinition[]> {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(this.getTeamsDir());
    } catch {
      return [];
    }

    const definitions: AgentTeamDefinition[] = [];
    for (const teamId of entries) {
      const definition = await this.getById(teamId);
      if (definition) {
        definitions.push(definition);
      }
    }
    return definitions;
  }

  async update(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    if (!domainObj.id) {
      throw new Error("Agent team definition id is required for update.");
    }
    await this.writeTeamFolder(domainObj.id, toRecord(domainObj));
    const updated = await this.getById(domainObj.id);
    if (!updated) {
      throw new Error(`Failed to update team definition '${domainObj.id}'.`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const teamDir = this.getTeamDir(id);
    const existed = await this.exists(teamDir);
    await fs.rm(teamDir, { recursive: true, force: true });
    return existed;
  }
}
