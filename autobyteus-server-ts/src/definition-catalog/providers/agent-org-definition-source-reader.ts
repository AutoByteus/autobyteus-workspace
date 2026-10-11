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
  DefinitionSourceReader,
  RegisteredPackageRoot,
  SubjectNodeOutcome,
  UnitReadContext,
  UnitReadOutcome,
} from "../domain/definition-catalog-types.js";
import { listChildDirNames } from "../domain/definition-node-files.js";
import { readTeamLocalAgentNodes, teamOwnerName } from "./agent-team-definition-source-reader.js";
import { duplicatedUnitOutcome, findPresentUnitDirs, isUnitDirName, listUnitDirNames } from "./unit-presence.js";

export const ORG_DEFINITION_FILES = ["org.md", "org-config.json"] as const;

type OrgConfig = ReturnType<typeof readAgentOrgDefinitionConfig>;

/**
 * Org units: an AgentOrg plus its org-owned agents and org-owned Teams (each with its local
 * agents). Owned folders are correlated through the Org's `org_local` members; when the Org's own
 * files cannot be read, its last good members are used. An Org ID present in more than one
 * registered root is an issue-only duplicate.
 */
export class AgentOrgDefinitionSourceReader implements DefinitionSourceReader<"agent_org"> {
  readonly subject = "agent_org" as const;

  listUnitIds(roots: readonly RegisteredPackageRoot[]): Promise<readonly string[]> {
    return listUnitDirNames(roots, "agent-orgs");
  }

  async listApplicationOwnedUnitIds(): Promise<readonly string[]> {
    return [];
  }

  async readUnit(unitId: string, context: UnitReadContext<"agent_org">): Promise<UnitReadOutcome> {
    if (!isUnitDirName(unitId)) return { kind: "absent" };
    const present = await findPresentUnitDirs({
      roots: context.roots, kind: "agent-orgs", unitId, definitionFiles: ORG_DEFINITION_FILES,
    });
    if (present.length === 0) return { kind: "absent" };
    if (present.length > 1) return duplicatedUnitOutcome({ subject: "agent_org", unitId, present });
    const { root, unitDir: orgDir } = present[0]!;
    const orgRoot = root.kindDirs["agent-orgs"];
    const outcome = await readAgentOrgDefinitionNode({
      definitionId: unitId,
      orgDir,
      descriptor: createDefinitionSourceDescriptor({ sourceClass: root.sourceClass, packageRoot: orgRoot, definitionPath: orgDir }),
    });
    const current = outcome.kind === "valid" ? outcome.definition : context.previousRoot;
    return {
      kind: "read",
      location: { packageRoot: root.rootPath, unitDir: orgDir, sourceClass: root.sourceClass, fromRegisteredRoot: true },
      root: { subject: "agent_org", outcome },
      children: current
        ? await this.readOwnedNodes({ root, orgRoot, orgDirName: unitId, orgName: current.name, members: current.members })
        : null,
    };
  }

  private async readOwnedNodes(input: {
    root: RegisteredPackageRoot;
    orgRoot: string;
    orgDirName: string;
    orgName: string;
    members: readonly AgentOrgMember[];
  }): Promise<Map<string, SubjectNodeOutcome>> {
    const output = new Map<string, SubjectNodeOutcome>();
    const config = { members: input.members } as unknown as OrgConfig;
    for (const subject of ["agent", "agent_team"] as const satisfies readonly AgentOrgOwnedSubject[]) {
      const familyDir = path.join(input.orgRoot, input.orgDirName, agentOrgOwnedFamilyDirName(subject));
      const sources = correlateAgentOrgOwnedMembers({
        subject,
        orgRoot: input.orgRoot,
        orgDirName: input.orgDirName,
        config,
        orgDefinitionName: input.orgName,
        localDirNames: await listChildDirNames(familyDir),
      });
      for (const source of sources) {
        if (subject === "agent") {
          const outcome = await readAgentDefinitionNode({
            agentDir: source.definitionDir,
            definitionId: source.definitionId,
            ownership: {
              ownershipScope: "agent_org_owned",
              ownerOrgId: source.orgDefinitionId,
              ownerOrgName: source.orgDefinitionName,
              sourceInfo: { agentDirPath: source.definitionDir },
            },
          });
          if (outcome.kind !== "absent") output.set(source.definitionId, { subject: "agent", outcome });
          continue;
        }
        const teamSource = { ...source, subject: "agent_team" as const, teamDir: source.definitionDir, localTeamId: source.localDefinitionId };
        const outcome = await readAgentTeamDefinitionNode({
          source: teamSource,
          descriptor: createDefinitionSourceDescriptor({
            sourceClass: input.root.sourceClass, packageRoot: source.rootPath, definitionPath: source.definitionDir,
          }),
        });
        if (outcome.kind === "absent") continue;
        output.set(source.definitionId, { subject: "agent_team", outcome });
        const localAgents = await readTeamLocalAgentNodes({
          teamDir: source.definitionDir,
          ownerTeamId: source.definitionId,
          ownerTeamName: await teamOwnerName({
            current: outcome.kind === "valid" ? outcome.definition : null,
            mdPath: teamSource.mdPath,
            previousName: null,
            teamId: source.definitionId,
          }),
        });
        for (const [id, node] of localAgents) output.set(id, node);
      }
    }
    return output;
  }
}
