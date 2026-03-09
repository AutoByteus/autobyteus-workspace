import type { PersonalSessionPeerCandidate } from "../../../domain/models/session-peer-candidate.js";
export type DiscordPeerCandidate = PersonalSessionPeerCandidate;
export type DiscordPeerCandidateObservation = DiscordPeerCandidate & {
    accountId: string;
};
export type ListDiscordPeerCandidatesOptions = {
    accountId: string;
    includeGroups?: boolean;
    limit?: number;
};
export type ListDiscordPeerCandidatesResult = {
    accountId: string;
    updatedAt: string;
    items: DiscordPeerCandidate[];
};
export type DiscordPeerCandidateIndexConfig = {
    maxCandidatesPerAccount: number;
    candidateTtlSeconds: number;
};
export declare class DiscordPeerCandidateIndex {
    private readonly byAccount;
    private readonly maxCandidatesPerAccount;
    private readonly candidateTtlMs;
    private lastUpdatedAt;
    constructor(config: DiscordPeerCandidateIndexConfig);
    recordObservation(observation: DiscordPeerCandidateObservation): void;
    listCandidates(options: ListDiscordPeerCandidatesOptions): ListDiscordPeerCandidatesResult;
    pruneExpired(nowMs?: number): void;
}
//# sourceMappingURL=discord-peer-candidate-index.d.ts.map