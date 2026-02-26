export type FederatedNodeType = "embedded" | "remote" | string;

export type FederatedCatalogNodeInput = {
  nodeId: string;
  nodeName: string;
  baseUrl: string;
  nodeType?: FederatedNodeType | null;
};

export type FederatedCatalogNodeStatus = "ready" | "degraded" | "unreachable";

export type FederatedAgentRef = {
  homeNodeId: string;
  definitionId: string;
  name: string;
  role: string;
  description: string;
  avatarUrl: string | null;
  toolNames: string[];
  skillNames: string[];
};

export type FederatedTeamRef = {
  homeNodeId: string;
  definitionId: string;
  name: string;
  description: string;
  role: string | null;
  avatarUrl: string | null;
  coordinatorMemberName: string;
  memberCount: number;
  nestedTeamCount: number;
};

export type FederatedNodeCatalog = {
  nodeId: string;
  nodeName: string;
  baseUrl: string;
  status: FederatedCatalogNodeStatus;
  errorMessage: string | null;
  agents: FederatedAgentRef[];
  teams: FederatedTeamRef[];
};
