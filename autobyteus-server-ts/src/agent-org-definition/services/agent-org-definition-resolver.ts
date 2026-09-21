import type { AgentOrgDefinition } from "../domain/agent-org-definition.js";
import type { AgentTeamDefinition } from "../../agent-team-definition/domain/agent-team-definition.js";
import { FlatTeamDefinitionResolver } from "../../agent-team-definition/services/flat-team-definition-resolver.js";
import type {
  ResolvedAgentOrgDefinition,
  ResolvedAgentOrgDefinitionMember,
} from "../../agent-collaboration/definition/resolved-collaboration-topology.js";
import { assertValidAgentTeamMemberName } from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";

export type AgentOrgDefinitionLookup = Readonly<{
  getAgentById(id: string): Promise<unknown | null> | unknown | null;
  getTeamById(id: string): Promise<AgentTeamDefinition | null> | AgentTeamDefinition | null;
}>;

export class AgentOrgDefinitionResolver {
  async resolve(input: {
    definition: AgentOrgDefinition;
    lookup: AgentOrgDefinitionLookup;
    definitionId?: string | null;
  }): Promise<ResolvedAgentOrgDefinition> {
    const definitionId = input.definition.id?.trim() || input.definitionId?.trim() || "";
    if (!definitionId) throw new Error(`AgentOrg definition '${input.definition.name}' is missing id.`);
    const names = new Map<string, string>();
    const members: ResolvedAgentOrgDefinitionMember[] = [];
    for (const member of input.definition.members) {
      const memberName = assertValidAgentTeamMemberName(member.memberName);
      const folded = memberName.toLocaleLowerCase("en-US");
      const existing = names.get(folded);
      if (existing) {
        throw new CollaborationContractError(
          "COLLABORATION_MEMBER_NAME_INVALID",
          `AgentOrg '${input.definition.name}' has case-insensitive sibling collision '${existing}' and '${memberName}'.`,
        );
      }
      names.set(folded, memberName);
      // An owned member ref is already its opaque definition identity. Source indexes
      // correlate that identity with the physical package; topology is never decoded
      // from an id prefix at this current-only boundary.
      const resolvedId = member.ref;
      if (member.refType === "agent") {
        if (!(await input.lookup.getAgentById(resolvedId))) {
          throw new CollaborationContractError(
            "COLLABORATION_TARGET_NOT_FOUND",
            `AgentOrg '${input.definition.name}' member '${memberName}' references missing Agent '${member.ref}'.`,
          );
        }
        members.push(Object.freeze({
          kind: "agent",
          memberName,
          agentDefinitionId: resolvedId,
          absolutePath: Object.freeze([memberName]),
        }));
        continue;
      }
      const teamDefinition = await input.lookup.getTeamById(resolvedId);
      if (!teamDefinition) {
        throw new CollaborationContractError(
          "COLLABORATION_TARGET_NOT_FOUND",
          `AgentOrg '${input.definition.name}' member '${memberName}' references missing Team '${member.ref}'.`,
        );
      }
      const team = await new FlatTeamDefinitionResolver().resolve({
        rootDefinition: teamDefinition,
        lookup: { getAgentById: input.lookup.getAgentById },
        rootDefinitionId: resolvedId,
        mountPath: [memberName],
      });
      members.push(Object.freeze({
        kind: "agent_team",
        memberName,
        teamDefinitionId: resolvedId,
        absolutePath: Object.freeze([memberName]),
        team,
      }));
    }
    return Object.freeze({
      definition: input.definition,
      definitionId,
      members: Object.freeze(members),
    });
  }
}
