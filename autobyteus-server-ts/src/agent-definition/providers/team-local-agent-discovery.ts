import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import { buildTeamLocalAgentDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-agent-definition-id.js";
import { parseTeamMd, TeamMdParseError } from "../../agent-team-definition/utils/team-md-parser.js";
import type {
  AgentDefinition,
  AgentDefinitionOwnershipScope,
} from "../domain/models.js";
import { AgentMdParseError } from "../utils/agent-md-parser.js";

type OwnershipInfo = {
  ownerTeamId: string;
  ownerTeamName: string;
};

type OwnershipRecord = {
  ownershipScope: AgentDefinitionOwnershipScope;
  ownerTeamId?: string | null;
  ownerTeamName?: string | null;
};

type ReadAgentFromPaths = (
  mdPath: string,
  configPath: string,
  resolvedAgentDefinitionId: string,
  ownership: OwnershipRecord,
) => Promise<AgentDefinition | null>;

type WarnFn = (...args: unknown[]) => void;

type TeamLocalAgentReadOptions = {
  teamRoot: string;
  teamId: string;
  agentId: string;
  resolvedAgentDefinitionId: string;
  readAgentFromPaths: ReadAgentFromPaths;
  warn: WarnFn;
};

type TeamLocalAgentListOptions = {
  teamRoots: string[];
  existingDefinitions: AgentDefinition[];
  readAgentFromPaths: ReadAgentFromPaths;
  warn: WarnFn;
};

export async function readTeamOwnership(
  teamRoot: string,
  teamId: string,
  warn: WarnFn,
): Promise<OwnershipInfo> {
  const teamMdPath = path.join(teamRoot, teamId, "team.md");
  try {
    const teamMd = await fs.readFile(teamMdPath, "utf-8");
    const parsed = parseTeamMd(teamMd, teamMdPath);
    return {
      ownerTeamId: teamId,
      ownerTeamName: parsed.name,
    };
  } catch (error) {
    if (error instanceof TeamMdParseError || (error as NodeJS.ErrnoException).code === "ENOENT") {
      warn(
        `Falling back to team id '${teamId}' for local-agent ownership label because team metadata could not be read: ${String(error)}`,
      );
      return {
        ownerTeamId: teamId,
        ownerTeamName: teamId,
      };
    }
    throw error;
  }
}

export async function readTeamLocalAgentFromRoot(
  options: TeamLocalAgentReadOptions,
): Promise<AgentDefinition | null> {
  const ownership = await readTeamOwnership(options.teamRoot, options.teamId, options.warn);
  return options.readAgentFromPaths(
    path.join(options.teamRoot, options.teamId, "agents", options.agentId, "agent.md"),
    path.join(options.teamRoot, options.teamId, "agents", options.agentId, "agent-config.json"),
    options.resolvedAgentDefinitionId,
    {
      ownershipScope: "team_local",
      ownerTeamId: ownership.ownerTeamId,
      ownerTeamName: ownership.ownerTeamName,
    },
  );
}

export async function readTeamLocalAgentFromRoots(
  options: Omit<TeamLocalAgentReadOptions, "teamRoot"> & { teamRoots: string[] },
): Promise<AgentDefinition | null> {
  for (const teamRoot of options.teamRoots) {
    const definition = await readTeamLocalAgentFromRoot({
      teamRoot,
      teamId: options.teamId,
      agentId: options.agentId,
      resolvedAgentDefinitionId: options.resolvedAgentDefinitionId,
      readAgentFromPaths: options.readAgentFromPaths,
      warn: options.warn,
    });
    if (definition) {
      return definition;
    }
  }
  return null;
}

export async function listTeamLocalAgentDefinitions(
  options: TeamLocalAgentListOptions,
): Promise<AgentDefinition[]> {
  const definitions = [...options.existingDefinitions];
  const seenIds = new Set(
    definitions
      .map((definition) => definition.id)
      .filter((definitionId): definitionId is string => typeof definitionId === "string"),
  );

  for (const teamRoot of options.teamRoots) {
    let teamEntries: Dirent[] = [];
    try {
      teamEntries = await fs.readdir(teamRoot, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const teamEntry of teamEntries) {
      if (!teamEntry.isDirectory()) {
        continue;
      }

      const teamId = teamEntry.name;
      const localAgentsDir = path.join(teamRoot, teamId, "agents");
      let localAgentEntries: Dirent[] = [];
      try {
        localAgentEntries = await fs.readdir(localAgentsDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const agentEntry of localAgentEntries) {
        if (!agentEntry.isDirectory()) {
          continue;
        }

        const localAgentId = agentEntry.name;
        if (localAgentId.startsWith("_")) {
          continue;
        }

        const resolvedId = buildTeamLocalAgentDefinitionId(teamId, localAgentId);
        if (seenIds.has(resolvedId)) {
          continue;
        }

        try {
          const definition = await readTeamLocalAgentFromRoot({
            teamRoot,
            teamId,
            agentId: localAgentId,
            resolvedAgentDefinitionId: resolvedId,
            readAgentFromPaths: options.readAgentFromPaths,
            warn: options.warn,
          });
          if (definition) {
            definitions.push(definition);
            seenIds.add(resolvedId);
          }
        } catch (error) {
          if (error instanceof AgentMdParseError) {
            options.warn(
              `Skipping local agent '${resolvedId}' due to parse error: ${error.message}`,
            );
            continue;
          }
          throw error;
        }
      }
    }
  }

  return definitions;
}
