import path from "node:path";
import type { ApplicationOwnedDefinitionSource } from "../../application-bundles/domain/models.js";
import { parseCanonicalApplicationOwnedTeamId } from "../../application-bundles/utils/application-bundle-identity.js";
import { readAgentDefinitionNode } from "../../agent-definition/providers/agent-definition-node-reader.js";
import { readAgentTeamDefinitionNode } from "../../agent-team-definition/providers/agent-team-definition-node-reader.js";
import {
  buildApplicationOwnedTeamSourcePaths,
  buildSharedTeamSourcePaths,
} from "../../agent-team-definition/providers/team-definition-source-paths.js";
import { buildTeamLocalAgentDefinitionId } from "../../agent-team-definition/utils/team-local-definition-id.js";
import { parseTeamMd } from "../../agent-team-definition/utils/team-md-parser.js";
import { createDefinitionSourceDescriptor } from "../../collaboration-definition-admission/domain/definition-source-descriptor.js";
import type {
  DefinitionSourceReader,
  RegisteredPackageRoot,
  SubjectNodeOutcome,
  UnitReadContext,
  UnitReadOutcome,
} from "../domain/definition-catalog-types.js";
import { listChildDirNames, readOptionalText } from "../domain/definition-node-files.js";
import { duplicatedUnitOutcome, findPresentUnitDirs, isUnitDirName, listUnitDirNames } from "./unit-presence.js";

export type ApplicationOwnedTeamSourceLookup = Readonly<{
  listApplicationOwnedTeamSources(): Promise<ApplicationOwnedDefinitionSource[]>;
  getApplicationOwnedTeamSourceById(definitionId: string): Promise<ApplicationOwnedDefinitionSource | null>;
}>;

export const TEAM_DEFINITION_FILES = ["team.md", "team-config.json"] as const;

/**
 * The Team name its local agents carry: the current name when the Team reads, else the name in a
 * readable `team.md`, else the last good name, else the Team ID (as the disk reader always did).
 */
export const teamOwnerName = async (input: {
  current: { name: string } | null;
  mdPath: string;
  previousName: string | null;
  teamId: string;
}): Promise<string> => {
  if (input.current) return input.current.name;
  try {
    const md = await readOptionalText(input.mdPath);
    if (md !== null) return parseTeamMd(md, input.mdPath).name;
  } catch {
    // An unreadable team.md falls back below.
  }
  return input.previousName ?? input.teamId;
};

/** Reads the `agents/<a>` team-local agents of one Team folder, keyed by canonical ID. */
export const readTeamLocalAgentNodes = async (input: {
  teamDir: string;
  ownerTeamId: string;
  ownerTeamName: string;
}): Promise<Map<string, SubjectNodeOutcome>> => {
  const output = new Map<string, SubjectNodeOutcome>();
  const names = (await listChildDirNames(path.join(input.teamDir, "agents"))).filter(isUnitDirName).sort();
  for (const name of names) {
    let definitionId: string;
    try {
      definitionId = buildTeamLocalAgentDefinitionId(input.ownerTeamId, name);
    } catch {
      continue;
    }
    const agentDir = path.join(input.teamDir, "agents", name);
    const outcome = await readAgentDefinitionNode({
      agentDir,
      definitionId,
      ownership: {
        ownershipScope: "team_local",
        ownerTeamId: input.ownerTeamId,
        ownerTeamName: input.ownerTeamName,
        sourceInfo: { agentDirPath: agentDir, teamDirPath: input.teamDir },
      },
    });
    if (outcome.kind !== "absent") output.set(definitionId, { subject: "agent", outcome });
  }
  return output;
};

/**
 * Team units: a shared Team plus its team-local agents. A Team ID present in more than one
 * registered root is an issue-only duplicate. Application-owned Teams are list entries (their
 * team-local agents stay application-owned disk reads).
 */
export class AgentTeamDefinitionSourceReader implements DefinitionSourceReader<"agent_team"> {
  readonly subject = "agent_team" as const;

  constructor(private readonly applicationOwned: ApplicationOwnedTeamSourceLookup) {}

  listUnitIds(roots: readonly RegisteredPackageRoot[]): Promise<readonly string[]> {
    return listUnitDirNames(roots, "agent-teams");
  }

  async listApplicationOwnedUnitIds(): Promise<readonly string[]> {
    return (await this.applicationOwned.listApplicationOwnedTeamSources()).map((source) => source.definitionId);
  }

  async readUnit(unitId: string, context: UnitReadContext<"agent_team">): Promise<UnitReadOutcome> {
    if (parseCanonicalApplicationOwnedTeamId(unitId)) return this.readApplicationOwnedUnit(unitId);
    if (!isUnitDirName(unitId)) return { kind: "absent" };
    const present = await findPresentUnitDirs({
      roots: context.roots, kind: "agent-teams", unitId, definitionFiles: TEAM_DEFINITION_FILES,
    });
    if (present.length === 0) return { kind: "absent" };
    if (present.length > 1) return duplicatedUnitOutcome({ subject: "agent_team", unitId, present });
    const { root } = present[0]!;
    const source = buildSharedTeamSourcePaths(root.kindDirs["agent-teams"], unitId);
    const outcome = await readAgentTeamDefinitionNode({
      source,
      descriptor: createDefinitionSourceDescriptor({
        sourceClass: root.sourceClass, packageRoot: source.rootPath, definitionPath: source.teamDir,
      }),
    });
    const ownerTeamName = await teamOwnerName({
      current: outcome.kind === "valid" ? outcome.definition : null,
      mdPath: source.mdPath,
      previousName: context.previousRoot?.name ?? null,
      teamId: unitId,
    });
    return {
      kind: "read",
      location: { packageRoot: root.rootPath, unitDir: source.teamDir, sourceClass: root.sourceClass, fromRegisteredRoot: true },
      root: { subject: "agent_team", outcome },
      children: await readTeamLocalAgentNodes({ teamDir: source.teamDir, ownerTeamId: unitId, ownerTeamName }),
    };
  }

  private async readApplicationOwnedUnit(unitId: string): Promise<UnitReadOutcome> {
    const applicationSource = await this.applicationOwned.getApplicationOwnedTeamSourceById(unitId);
    if (!applicationSource) return { kind: "absent" };
    const source = buildApplicationOwnedTeamSourcePaths(applicationSource);
    const outcome = await readAgentTeamDefinitionNode({
      source,
      descriptor: createDefinitionSourceDescriptor({
        sourceClass: "implementation_repository",
        packageRoot: source.rootPath,
        definitionPath: source.teamDir,
      }),
    });
    if (outcome.kind === "absent") return outcome;
    return {
      kind: "read",
      location: {
        packageRoot: applicationSource.packageRootPath,
        unitDir: source.teamDir,
        sourceClass: "implementation_repository",
        fromRegisteredRoot: false,
      },
      root: { subject: "agent_team", outcome },
      children: new Map(),
    };
  }
}
