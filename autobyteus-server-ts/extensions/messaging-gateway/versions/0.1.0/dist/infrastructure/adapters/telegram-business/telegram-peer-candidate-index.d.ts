import type { PersonalSessionPeerCandidate } from "../../../domain/models/session-peer-candidate.js";
export type TelegramPeerCandidate = PersonalSessionPeerCandidate;
export type TelegramPeerCandidateObservation = TelegramPeerCandidate & {
    accountId: string;
};
export type ListTelegramPeerCandidatesOptions = {
    accountId: string;
    includeGroups?: boolean;
    limit?: number;
};
export type ListTelegramPeerCandidatesResult = {
    accountId: string;
    updatedAt: string;
    items: TelegramPeerCandidate[];
};
export type TelegramPeerCandidateIndexConfig = {
    maxCandidatesPerAccount: number;
    candidateTtlSeconds: number;
};
export declare class TelegramPeerCandidateIndex {
    private readonly byAccount;
    private readonly maxCandidatesPerAccount;
    private readonly candidateTtlMs;
    private lastUpdatedAt;
    constructor(config: TelegramPeerCandidateIndexConfig);
    recordObservation(observation: TelegramPeerCandidateObservation): void;
    listCandidates(options: ListTelegramPeerCandidatesOptions): ListTelegramPeerCandidatesResult;
    pruneExpired(nowMs?: number): void;
}
//# sourceMappingURL=telegram-peer-candidate-index.d.ts.map