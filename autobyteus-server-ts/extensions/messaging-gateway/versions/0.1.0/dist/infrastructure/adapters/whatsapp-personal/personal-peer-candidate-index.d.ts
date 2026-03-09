import type { ListSessionPeerCandidatesOptions, PersonalSessionPeerCandidate, PersonalSessionPeerType } from "../../../domain/models/session-peer-candidate.js";
export type PeerCandidateObservation = {
    peerId: string;
    peerType: PersonalSessionPeerType;
    threadId: string | null;
    displayName: string | null;
    observedAt: string;
};
export declare class PersonalPeerCandidateIndex {
    private readonly maxCandidatesPerSession;
    private readonly sessionIndex;
    constructor(maxCandidatesPerSession?: number);
    recordObservation(sessionId: string, observation: PeerCandidateObservation): void;
    listCandidates(sessionId: string, options?: ListSessionPeerCandidatesOptions): PersonalSessionPeerCandidate[];
    clearSession(sessionId: string): void;
    private ensureSessionBucket;
    private trimToMax;
}
//# sourceMappingURL=personal-peer-candidate-index.d.ts.map