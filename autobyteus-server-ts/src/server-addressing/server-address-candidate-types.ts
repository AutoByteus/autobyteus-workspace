export type ServerAddressCandidateKind = "configured" | "current_node" | "docker_host" | "lan" | "tailnet_like" | "manual";

export type ServerAddressCandidate = {
  id: string;
  kind: ServerAddressCandidateKind;
  label: string;
  baseUrl: string;
  source: string;
};
