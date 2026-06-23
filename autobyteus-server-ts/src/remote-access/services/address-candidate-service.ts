import { getServerAddressCandidateService } from "../../server-addressing/server-address-candidate-service.js";
import type { RemoteAccessUrlCandidate } from "../domain/models.js";

export class AddressCandidateService {
  listCandidates(input?: { manualServerBaseUrl?: string | null }): RemoteAccessUrlCandidate[] {
    return getServerAddressCandidateService()
      .listCandidates({ manualBaseUrl: input?.manualServerBaseUrl })
      .filter((candidate) => candidate.kind !== "current_node" && candidate.kind !== "docker_host")
      .map((candidate) => {
        if (candidate.kind === "configured") {
          return {
            id: "loopback",
            kind: "loopback",
            label: "This desktop only",
            serverBaseUrl: candidate.baseUrl,
            source: "configured-base-url",
          } satisfies RemoteAccessUrlCandidate;
        }
        return {
          id: candidate.id,
          kind: candidate.kind as "lan" | "tailnet_like" | "manual",
          label: candidate.label,
          serverBaseUrl: candidate.baseUrl,
          source: candidate.source,
        } satisfies RemoteAccessUrlCandidate;
      });
  }
}

let singleton: AddressCandidateService | null = null;

export const getAddressCandidateService = (): AddressCandidateService => {
  singleton ??= new AddressCandidateService();
  return singleton;
};

export const resetAddressCandidateServiceForTests = (): void => {
  singleton = null;
};
