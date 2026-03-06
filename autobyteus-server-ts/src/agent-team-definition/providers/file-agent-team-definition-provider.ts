import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonFile, writeJsonFile, writeRawFile } from "../../persistence/file/store-utils.js";
import { AgentTeamDefinition, TeamMember } from "../domain/models.js";
import { TeamMdParseError, parseTeamMd, serializeTeamMd } from "../utils/team-md-parser.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

type TeamConfigMember = {
  memberName: string;
  ref: string;
  refType: "agent" | "agent_team";
};

type TeamConfigRecord = {
  coordinatorMemberName?: string;
  members?: TeamConfigMember[];
  avatarUrl?: string | null;
};

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

const normalizeMembers = (value: unknown): TeamConfigMember[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const members: TeamConfigMember[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const candidate = entry as Record<string, unknown>;
    const memberName = typeof candidate.memberName === "string" ? candidate.memberName : "";
    const ref = typeof candidate.ref === "string" ? candidate.ref : "";
    const refType = candidate.refType === "agent_team" ? "agent_team" : candidate.refType === "agent" ? "agent" : null;
    if (!memberName || !ref || !refType) {
      continue;
    }
    members.push({ memberName, ref, refType });
  }
  return members;
};

function defaultTeamConfig(): TeamConfigRecord {
  return {
    coordinatorMemberName: "",
    members: [],
    avatarUrl: null,
  };
}

export class FileAgentTeamDefinitionProvider {
  private getTeamsDir(): string {
    return appConfigProvider.config.getAgentTeamsDir();
  }

  private getTeamDir(teamId: string): string {
    return path.join(this.getTeamsDir(), teamId);
  }

  private getReadTeamRoots(): string[] {
    const roots = [this.getTeamsDir()];
    for (const sourceRoot of appConfigProvider.config.getAdditionalDefinitionSourceRoots()) {
      roots.push(path.join(sourceRoot, "agent-teams"));
    }
    return roots;
  }

  private async readTeamFromRoot(teamRoot: string, teamId: string): Promise<AgentTeamDefinition | null> {
    const mdPath = path.join(teamRoot, teamId, "team.md");
    const configPath = path.join(teamRoot, teamId, "team-config.json");

    try {
      const mdContent = await fs.readFile(mdPath, "utf-8");
      const parsed = parseTeamMd(mdContent, mdPath);
      const config = await readJsonFile<TeamConfigRecord>(configPath, defaultTeamConfig());
      const members = normalizeMembers(config.members);

      return new AgentTeamDefinition({
        id: teamId,
        name: parsed.name,
        description: parsed.description,
        instructions: parsed.instructions,
        category: parsed.category,
        avatarUrl: config.avatarUrl ?? null,
        coordinatorMemberName:
          typeof config.coordinatorMemberName === "string" ? config.coordinatorMemberName : "",
        nodes: members.map(
          (member) =>
            new TeamMember({
              memberName: member.memberName,
              ref: member.ref,
              refType: member.refType,
            }),
        ),
      });
    } catch (error) {
      if (error instanceof TeamMdParseError) {
        throw error;
      }
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
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

  async create(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    const teamId = domainObj.id ?? (await this.nextTeamId(domainObj.name));
    const teamDir = this.getTeamDir(teamId);
    await fs.mkdir(teamDir, { recursive: true });

    const mdContent = serializeTeamMd(
      {
        name: domainObj.name,
        description: domainObj.description,
        category: domainObj.category,
      },
      domainObj.instructions,
    );
    await writeRawFile(appConfigProvider.config.getTeamMdPath(teamId), mdContent);

    const configRecord: TeamConfigRecord = {
      coordinatorMemberName: domainObj.coordinatorMemberName,
      avatarUrl: domainObj.avatarUrl ?? null,
      members: domainObj.nodes.map((member) => ({
        memberName: member.memberName,
        ref: member.ref,
        refType: member.refType,
      })),
    };
    await writeJsonFile(appConfigProvider.config.getTeamConfigPath(teamId), configRecord);

    const created = await this.getById(teamId);
    if (!created) {
      throw new Error(`Failed to create team definition '${teamId}'.`);
    }
    return created;
  }

  async getById(id: string): Promise<AgentTeamDefinition | null> {
    if (id.startsWith("_")) {
      return null;
    }
    for (const rootPath of this.getReadTeamRoots()) {
      const definition = await this.readTeamFromRoot(rootPath, id);
      if (definition) {
        return definition;
      }
    }
    return null;
  }

  async getAll(): Promise<AgentTeamDefinition[]> {
    const definitions: AgentTeamDefinition[] = [];
    const seenIds = new Set<string>();

    for (const rootPath of this.getReadTeamRoots()) {
      let entries: Dirent[] = [];
      try {
        entries = await fs.readdir(rootPath, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const teamId = entry.name;
        if (teamId.startsWith("_")) {
          continue;
        }
        if (seenIds.has(teamId)) {
          continue;
        }
        try {
          const definition = await this.readTeamFromRoot(rootPath, teamId);
          if (definition) {
            definitions.push(definition);
            seenIds.add(teamId);
          }
        } catch (error) {
          if (error instanceof TeamMdParseError) {
            logger.warn(`Skipping team '${teamId}' due to parse error: ${error.message}`);
            continue;
          }
          throw error;
        }
      }
    }

    return definitions;
  }

  async getTemplates(): Promise<AgentTeamDefinition[]> {
    const definitions: AgentTeamDefinition[] = [];
    const seenIds = new Set<string>();

    for (const rootPath of this.getReadTeamRoots()) {
      let entries: Dirent[] = [];
      try {
        entries = await fs.readdir(rootPath, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const teamId = entry.name;
        if (!teamId.startsWith("_")) {
          continue;
        }
        if (seenIds.has(teamId)) {
          continue;
        }
        try {
          const definition = await this.readTeamFromRoot(rootPath, teamId);
          if (definition) {
            definitions.push(definition);
            seenIds.add(teamId);
          }
        } catch (error) {
          if (error instanceof TeamMdParseError) {
            logger.warn(`Skipping template team '${teamId}' due to parse error: ${error.message}`);
            continue;
          }
          throw error;
        }
      }
    }

    return definitions;
  }

  async update(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    if (!domainObj.id) {
      throw new Error("Agent team definition id is required for update.");
    }

    const teamId = domainObj.id;
    const teamDir = this.getTeamDir(teamId);
    if (!(await this.exists(teamDir))) {
      throw new Error(`Team definition '${teamId}' is read-only or does not exist in default source.`);
    }

    const mdContent = serializeTeamMd(
      {
        name: domainObj.name,
        description: domainObj.description,
        category: domainObj.category,
      },
      domainObj.instructions,
    );
    await writeRawFile(appConfigProvider.config.getTeamMdPath(teamId), mdContent);

    const configRecord: TeamConfigRecord = {
      coordinatorMemberName: domainObj.coordinatorMemberName,
      avatarUrl: domainObj.avatarUrl ?? null,
      members: domainObj.nodes.map((member) => ({
        memberName: member.memberName,
        ref: member.ref,
        refType: member.refType,
      })),
    };
    await writeJsonFile(appConfigProvider.config.getTeamConfigPath(teamId), configRecord);

    const updated = await this.getById(teamId);
    if (!updated) {
      throw new Error(`Failed to update team definition '${teamId}'.`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const teamDir = this.getTeamDir(id);
    const existed = await this.exists(teamDir);
    if (!existed) {
      return false;
    }
    await fs.rm(teamDir, { recursive: true, force: true });
    return existed;
  }
}
