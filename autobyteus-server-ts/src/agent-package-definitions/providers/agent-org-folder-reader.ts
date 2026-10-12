import path from "node:path";
import type { AgentOrgMember } from "../../agent-org-definition/domain/agent-org-definition.js";
import { readAgentOrgDefinitionNode } from "../../agent-org-definition/providers/agent-org-definition-node-reader.js";
import {
  agentOrgOwnedFamilyDirName,
  correlateAgentOrgOwnedMembers,
  type AgentOrgOwnedSubject,
} from "../../agent-org-definition/providers/agent-org-owned-definition-correlation.js";
import type { readAgentOrgDefinitionConfig } from "../../agent-org-definition/providers/agent-org-definition-config.js";
import { readAgentDefinitionNode } from "../../agent-definition/providers/agent-definition-node-reader.js";
import { readAgentTeamDefinitionNode } from "../../agent-team-definition/providers/agent-team-definition-node-reader.js";
import { createDefinitionSourceDescriptor } from "../../collaboration-definition-admission/domain/definition-source-descriptor.js";
import type {
  DefinitionFolderReader,
  RegisteredPackageRoot,
  KindDefinitionReadResult,
  DefinitionFolderReadContext,
  DefinitionFolderReadResult,
} from "../domain/agent-package-definition-types.js";
import { listChildDirNames } from "../domain/definition-files.js";
import { readTeamLocalAgents, teamOwnerName } from "./agent-team-folder-reader.js";
import { duplicatedFolderResult, findPresentDefinitionFolders, isDefinitionFolderName, listDefinitionFolderNames } from "./definition-folder-presence.js";

export const ORG_DEFINITION_FILES = ["org.md", "org-config.json"] as const;

type OrgConfig = ReturnType<typeof readAgentOrgDefinitionConfig>;

/**
 * Org folders: an AgentOrg plus its org-owned agents and org-owned Teams (each with its local
 * agents). Owned folders are correlated through the Org's `org_local` members; when the Org's own
 * files cannot be read, its last good members are used. An Org ID present in more than one
 * registered agent package is an issue-only duplicate.
 */
export class AgentOrgFolderReader implements DefinitionFolderReader<"agent_org"> {
  readonly kind = "agent_org" as const;

  listFolderIds(roots: readonly RegisteredPackageRoot[]): Promise<readonly string[]> {
    return listDefinitionFolderNames(roots, "agent-orgs");
  }

  async readFolder(folderId: string, context: DefinitionFolderReadContext<"agent_org">): Promise<DefinitionFolderReadResult> {
    if (!isDefinitionFolderName(folderId)) return { status: "absent" };
    const present = await findPresentDefinitionFolders({
      roots: context.roots, kindFolder: "agent-orgs", folderId, definitionFiles: ORG_DEFINITION_FILES,
    });
    if (present.length === 0) return { status: "absent" };
    if (present.length > 1) return duplicatedFolderResult({ kind: "agent_org", folderId, present });
    const { root, folderDir: orgDir } = present[0]!;
    const orgRoot = root.kindDirs["agent-orgs"];
    const result = await readAgentOrgDefinitionNode({
      definitionId: folderId,
      orgDir,
      descriptor: createDefinitionSourceDescriptor({ sourceClass: root.sourceClass, packageRoot: orgRoot, definitionPath: orgDir }),
    });
    const current = result.status === "valid" ? result.definition : context.previousRoot;
    return {
      status: "read",
      location: { packageRoot: root.rootPath, folderDir: orgDir, sourceClass: root.sourceClass },
      root: { kind: "agent_org", result },
      nested: current
        ? await this.readOwnedDefinitions({ root, orgRoot, orgDirName: folderId, orgName: current.name, members: current.members })
        : null,
    };
  }

  private async readOwnedDefinitions(input: {
    root: RegisteredPackageRoot;
    orgRoot: string;
    orgDirName: string;
    orgName: string;
    members: readonly AgentOrgMember[];
  }): Promise<Map<string, KindDefinitionReadResult>> {
    const output = new Map<string, KindDefinitionReadResult>();
    const config = { members: input.members } as unknown as OrgConfig;
    for (const kind of ["agent", "agent_team"] as const satisfies readonly AgentOrgOwnedSubject[]) {
      const familyDir = path.join(input.orgRoot, input.orgDirName, agentOrgOwnedFamilyDirName(kind));
      const sources = correlateAgentOrgOwnedMembers({
        subject: kind,
        orgRoot: input.orgRoot,
        orgDirName: input.orgDirName,
        config,
        orgDefinitionName: input.orgName,
        localDirNames: await listChildDirNames(familyDir),
      });
      for (const source of sources) {
        if (kind === "agent") {
          const result = await readAgentDefinitionNode({
            agentDir: source.definitionDir,
            definitionId: source.definitionId,
            ownership: {
              ownershipScope: "agent_org_owned",
              ownerOrgId: source.orgDefinitionId,
              ownerOrgName: source.orgDefinitionName,
              sourceInfo: { agentDirPath: source.definitionDir },
            },
          });
          if (result.status !== "absent") output.set(source.definitionId, { kind: "agent", result });
          continue;
        }
        const teamSource = { ...source, subject: "agent_team" as const, teamDir: source.definitionDir, localTeamId: source.localDefinitionId };
        const result = await readAgentTeamDefinitionNode({
          source: teamSource,
          descriptor: createDefinitionSourceDescriptor({
            sourceClass: input.root.sourceClass, packageRoot: source.rootPath, definitionPath: source.definitionDir,
          }),
        });
        if (result.status === "absent") continue;
        output.set(source.definitionId, { kind: "agent_team", result });
        const localAgents = await readTeamLocalAgents({
          teamDir: source.definitionDir,
          ownerTeamId: source.definitionId,
          ownerTeamName: await teamOwnerName({
            current: result.status === "valid" ? result.definition : null,
            mdPath: teamSource.mdPath,
            previousName: null,
            teamId: source.definitionId,
          }),
        });
        for (const [id, localAgent] of localAgents) output.set(id, localAgent);
      }
    }
    return output;
  }
}
