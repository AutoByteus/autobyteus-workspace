import path from "node:path";
import { readAgentDefinitionNode } from "../../agent-definition/providers/agent-definition-node-reader.js";
import { readAgentTeamDefinitionNode } from "../../agent-team-definition/providers/agent-team-definition-node-reader.js";
import { buildSharedTeamSourcePaths } from "../../agent-team-definition/providers/team-definition-source-paths.js";
import { buildTeamLocalAgentDefinitionId } from "../../agent-team-definition/utils/team-local-definition-id.js";
import { parseTeamMd } from "../../agent-team-definition/utils/team-md-parser.js";
import { createDefinitionSourceDescriptor } from "../../collaboration-definition-admission/domain/definition-source-descriptor.js";
import type {
  DefinitionFolderReadContext,
  DefinitionFolderReader,
  DefinitionFolderReadResult,
  KindDefinitionReadResult,
  RegisteredPackageRoot,
} from "../domain/agent-package-definition-types.js";
import { listChildDirNames, readOptionalText } from "../domain/definition-files.js";
import { duplicatedFolderResult, findPresentDefinitionFolders, isDefinitionFolderName, listDefinitionFolderNames } from "./definition-folder-presence.js";

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
export const readTeamLocalAgents = async (input: {
  teamDir: string;
  ownerTeamId: string;
  ownerTeamName: string;
}): Promise<Map<string, KindDefinitionReadResult>> => {
  const output = new Map<string, KindDefinitionReadResult>();
  const names = (await listChildDirNames(path.join(input.teamDir, "agents"))).filter(isDefinitionFolderName).sort();
  for (const name of names) {
    let definitionId: string;
    try {
      definitionId = buildTeamLocalAgentDefinitionId(input.ownerTeamId, name);
    } catch {
      continue;
    }
    const agentDir = path.join(input.teamDir, "agents", name);
    const result = await readAgentDefinitionNode({
      agentDir,
      definitionId,
      ownership: {
        ownershipScope: "team_local",
        ownerTeamId: input.ownerTeamId,
        ownerTeamName: input.ownerTeamName,
        sourceInfo: { agentDirPath: agentDir, teamDirPath: input.teamDir },
      },
    });
    if (result.status !== "absent") output.set(definitionId, { kind: "agent", result });
  }
  return output;
};

/**
 * Team folders: a shared Team plus its team-local agents. A Team ID present in more than one
 * registered agent package is an issue-only duplicate. Application-package Teams are not agent
 * package definitions; the Team service reads them on demand.
 */
export class AgentTeamFolderReader implements DefinitionFolderReader<"agent_team"> {
  readonly kind = "agent_team" as const;

  listFolderIds(roots: readonly RegisteredPackageRoot[]): Promise<readonly string[]> {
    return listDefinitionFolderNames(roots, "agent-teams");
  }

  async readFolder(folderId: string, context: DefinitionFolderReadContext<"agent_team">): Promise<DefinitionFolderReadResult> {
    if (!isDefinitionFolderName(folderId)) return { status: "absent" };
    const present = await findPresentDefinitionFolders({
      roots: context.roots, kindFolder: "agent-teams", folderId, definitionFiles: TEAM_DEFINITION_FILES,
    });
    if (present.length === 0) return { status: "absent" };
    if (present.length > 1) return duplicatedFolderResult({ kind: "agent_team", folderId, present });
    const { root } = present[0]!;
    const source = buildSharedTeamSourcePaths(root.kindDirs["agent-teams"], folderId);
    const result = await readAgentTeamDefinitionNode({
      source,
      descriptor: createDefinitionSourceDescriptor({
        sourceClass: root.sourceClass, packageRoot: source.rootPath, definitionPath: source.teamDir,
      }),
    });
    const ownerTeamName = await teamOwnerName({
      current: result.status === "valid" ? result.definition : null,
      mdPath: source.mdPath,
      previousName: context.previousRoot?.name ?? null,
      teamId: folderId,
    });
    return {
      status: "read",
      location: { packageRoot: root.rootPath, folderDir: source.teamDir, sourceClass: root.sourceClass },
      root: { kind: "agent_team", result },
      nested: await readTeamLocalAgents({ teamDir: source.teamDir, ownerTeamId: folderId, ownerTeamName }),
    };
  }
}
