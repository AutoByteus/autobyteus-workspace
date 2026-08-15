import { assertAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type {
  TeamRunAgentMemberMetadata,
  TeamRunMemberMetadata,
  TeamRunMetadata,
} from "./team-run-metadata-types.js";

export const flattenTeamRunAgentMemberMetadata = (
  nodes: readonly TeamRunMemberMetadata[],
): TeamRunAgentMemberMetadata[] => {
  const agents: TeamRunAgentMemberMetadata[] = [];
  const visit = (node: TeamRunMemberMetadata): void => {
    if (node.kind === "agent") agents.push(node);
    else node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return agents;
};

export const getTeamRunLeafAgentMetadata = (
  metadata: TeamRunMetadata,
): TeamRunAgentMemberMetadata[] => flattenTeamRunAgentMemberMetadata(metadata.rootTeam.children);

export const getTeamRunTopLevelMemberSummaries = (
  metadata: TeamRunMetadata,
): TeamRunMemberMetadata[] => [...metadata.rootTeam.children];

export const resolveTeamRunMemberByAddress = (
  metadata: TeamRunMetadata,
  address: string,
): TeamRunMemberMetadata | null => {
  const canonical = assertAgentTeamAddress(address);
  const stack: TeamRunMemberMetadata[] = [...metadata.rootTeam.children];
  while (stack.length) {
    const node = stack.shift()!;
    if (node.address === canonical) return node;
    if (node.kind === "agent_team") stack.push(...node.children);
  }
  return null;
};

export const resolveTeamRunLeafAgentByAddress = (
  metadata: TeamRunMetadata,
  address: string,
): TeamRunAgentMemberMetadata | null => {
  const node = resolveTeamRunMemberByAddress(metadata, address);
  return node?.kind === "agent" ? node : null;
};

export const resolveTeamWorkspaceRootPath = (metadata: TeamRunMetadata): string | null =>
  getTeamRunLeafAgentMetadata(metadata).find((member) => member.workspaceRootPath)?.workspaceRootPath ?? null;
