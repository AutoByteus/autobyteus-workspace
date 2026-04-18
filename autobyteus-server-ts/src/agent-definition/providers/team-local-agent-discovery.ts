import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import { buildTeamLocalAgentDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-agent-definition-id.js";
import type { ApplicationOwnedDefinitionSource } from "../../application-bundles/domain/models.js";
import type {
  ResolvedTeamSourcePaths,
  SharedTeamSourcePaths,
} from "../../agent-team-definition/providers/team-definition-source-paths.js";
import { parseTeamMd, TeamMdParseError } from "../../agent-team-definition/utils/team-md-parser.js";
import type {
  AgentDefinition,
  AgentDefinitionOwnershipScope,
} from "../domain/models.js";
import { AgentMdParseError } from "../utils/agent-md-parser.js";

type OwnershipInfo = {
  ownerTeamId: string;
  ownerTeamName: string;
  ownerApplicationId?: string | null;
  ownerApplicationName?: string | null;
  ownerPackageId?: string | null;
  ownerLocalApplicationId?: string | null;
};

type OwnershipRecord = {
  ownershipScope: AgentDefinitionOwnershipScope;
  ownerTeamId?: string | null;
  ownerTeamName?: string | null;
  ownerApplicationId?: string | null;
  ownerApplicationName?: string | null;
  ownerPackageId?: string | null;
  ownerLocalApplicationId?: string | null;
};

type ReadAgentFromPaths = (
  mdPath: string,
  configPath: string,
  resolvedAgentDefinitionId: string,
  ownership: OwnershipRecord,
) => Promise<AgentDefinition | null>;

type WarnFn = (...args: unknown[]) => void;

type TeamLocalAgentReadOptions = {
  teamSourcePaths: ResolvedTeamSourcePaths;
  localAgentId: string;
  resolvedAgentDefinitionId: string;
  readAgentFromPaths: ReadAgentFromPaths;
  warn: WarnFn;
};

type TeamLocalAgentListOptions = {
  sharedTeamRoots: string[];
  applicationOwnedTeamSources: ApplicationOwnedDefinitionSource[];
  existingDefinitions: AgentDefinition[];
  readAgentFromPaths: ReadAgentFromPaths;
  warn: WarnFn;
};

const normalizeLocalAgentId = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("localAgentId is required.");
  }
  if (
    normalized === "."
    || normalized === ".."
    || normalized.includes("/")
    || normalized.includes("\\")
  ) {
    throw new Error("localAgentId must stay inside the owning team folder.");
  }
  return normalized;
};

const buildSharedTeamSourcePaths = (
  teamRoot: string,
  teamId: string,
): SharedTeamSourcePaths => {
  const teamDir = path.join(teamRoot, teamId);
  return {
    kind: "shared",
    teamDir,
    mdPath: path.join(teamDir, "team.md"),
    configPath: path.join(teamDir, "team-config.json"),
    rootPath: teamRoot,
  };
};

const buildApplicationOwnedTeamSourcePaths = (
  source: ApplicationOwnedDefinitionSource,
): Extract<ResolvedTeamSourcePaths, { kind: "application_owned" }> => {
  const teamDir = path.join(source.applicationRootPath, "agent-teams", source.localDefinitionId);
  return {
    kind: "application_owned",
    definitionId: source.definitionId,
    teamDir,
    mdPath: path.join(teamDir, "team.md"),
    configPath: path.join(teamDir, "team-config.json"),
    rootPath: source.applicationRootPath,
    applicationId: source.applicationId,
    applicationName: source.applicationName,
    packageId: source.packageId,
    localApplicationId: source.localApplicationId,
    localTeamId: source.localDefinitionId,
  };
};

const getOwnerTeamId = (teamSourcePaths: ResolvedTeamSourcePaths): string => (
  teamSourcePaths.kind === "application_owned"
    ? teamSourcePaths.definitionId
    : path.basename(teamSourcePaths.teamDir)
);

export const buildTeamLocalAgentFilePaths = (
  teamDir: string,
  localAgentId: string,
): {
  agentDir: string;
  mdPath: string;
  configPath: string;
  normalizedLocalAgentId: string;
} => {
  const normalizedLocalAgentId = normalizeLocalAgentId(localAgentId);
  const agentDir = path.join(teamDir, "agents", normalizedLocalAgentId);
  return {
    agentDir,
    mdPath: path.join(agentDir, "agent.md"),
    configPath: path.join(agentDir, "agent-config.json"),
    normalizedLocalAgentId,
  };
};

export async function readTeamOwnership(
  teamSourcePaths: ResolvedTeamSourcePaths,
  warn: WarnFn,
): Promise<OwnershipInfo> {
  const ownerTeamId = getOwnerTeamId(teamSourcePaths);
  try {
    const teamMd = await fs.readFile(teamSourcePaths.mdPath, "utf-8");
    const parsed = parseTeamMd(teamMd, teamSourcePaths.mdPath);
    return {
      ownerTeamId,
      ownerTeamName: parsed.name,
      ownerApplicationId:
        teamSourcePaths.kind === "application_owned" ? teamSourcePaths.applicationId : null,
      ownerApplicationName:
        teamSourcePaths.kind === "application_owned" ? teamSourcePaths.applicationName : null,
      ownerPackageId:
        teamSourcePaths.kind === "application_owned" ? teamSourcePaths.packageId : null,
      ownerLocalApplicationId:
        teamSourcePaths.kind === "application_owned" ? teamSourcePaths.localApplicationId : null,
    };
  } catch (error) {
    if (error instanceof TeamMdParseError || (error as NodeJS.ErrnoException).code === "ENOENT") {
      warn(
        `Falling back to team id '${ownerTeamId}' for local-agent ownership label because team metadata could not be read: ${String(error)}`,
      );
      return {
        ownerTeamId,
        ownerTeamName: ownerTeamId,
        ownerApplicationId:
          teamSourcePaths.kind === "application_owned" ? teamSourcePaths.applicationId : null,
        ownerApplicationName:
          teamSourcePaths.kind === "application_owned" ? teamSourcePaths.applicationName : null,
        ownerPackageId:
          teamSourcePaths.kind === "application_owned" ? teamSourcePaths.packageId : null,
        ownerLocalApplicationId:
          teamSourcePaths.kind === "application_owned" ? teamSourcePaths.localApplicationId : null,
      };
    }
    throw error;
  }
}

export async function readTeamLocalAgentFromSourcePaths(
  options: TeamLocalAgentReadOptions,
): Promise<AgentDefinition | null> {
  const ownership = await readTeamOwnership(options.teamSourcePaths, options.warn);
  const filePaths = buildTeamLocalAgentFilePaths(
    options.teamSourcePaths.teamDir,
    options.localAgentId,
  );

  return options.readAgentFromPaths(
    filePaths.mdPath,
    filePaths.configPath,
    options.resolvedAgentDefinitionId,
    {
      ownershipScope: "team_local",
      ownerTeamId: ownership.ownerTeamId,
      ownerTeamName: ownership.ownerTeamName,
      ownerApplicationId: ownership.ownerApplicationId ?? null,
      ownerApplicationName: ownership.ownerApplicationName ?? null,
      ownerPackageId: ownership.ownerPackageId ?? null,
      ownerLocalApplicationId: ownership.ownerLocalApplicationId ?? null,
    },
  );
}

const listSharedTeamSourcePaths = async (
  sharedTeamRoots: string[],
): Promise<ResolvedTeamSourcePaths[]> => {
  const teamSourcePaths: ResolvedTeamSourcePaths[] = [];
  const seenIds = new Set<string>();

  for (const teamRoot of sharedTeamRoots) {
    let teamEntries: Dirent[] = [];
    try {
      teamEntries = await fs.readdir(teamRoot, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const teamEntry of teamEntries) {
      if (!teamEntry.isDirectory() || seenIds.has(teamEntry.name)) {
        continue;
      }

      const sourcePaths = buildSharedTeamSourcePaths(teamRoot, teamEntry.name);
      try {
        await fs.access(sourcePaths.mdPath);
        teamSourcePaths.push(sourcePaths);
        seenIds.add(teamEntry.name);
      } catch {
        continue;
      }
    }
  }

  return teamSourcePaths;
};

export async function listTeamLocalAgentDefinitions(
  options: TeamLocalAgentListOptions,
): Promise<AgentDefinition[]> {
  const definitions = [...options.existingDefinitions];
  const seenIds = new Set(
    definitions
      .map((definition) => definition.id)
      .filter((definitionId): definitionId is string => typeof definitionId === "string"),
  );

  const teamSourcePaths = [
    ...(await listSharedTeamSourcePaths(options.sharedTeamRoots)),
    ...options.applicationOwnedTeamSources.map(buildApplicationOwnedTeamSourcePaths),
  ];

  for (const sourcePaths of teamSourcePaths) {
    let localAgentEntries: Dirent[] = [];
    try {
      localAgentEntries = await fs.readdir(path.join(sourcePaths.teamDir, "agents"), {
        withFileTypes: true,
      });
    } catch {
      continue;
    }

    for (const agentEntry of localAgentEntries) {
      if (!agentEntry.isDirectory() || agentEntry.name.startsWith("_")) {
        continue;
      }

      const resolvedId = buildTeamLocalAgentDefinitionId(
        getOwnerTeamId(sourcePaths),
        agentEntry.name,
      );
      if (seenIds.has(resolvedId)) {
        continue;
      }

      try {
        const definition = await readTeamLocalAgentFromSourcePaths({
          teamSourcePaths: sourcePaths,
          localAgentId: agentEntry.name,
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

  return definitions;
}
