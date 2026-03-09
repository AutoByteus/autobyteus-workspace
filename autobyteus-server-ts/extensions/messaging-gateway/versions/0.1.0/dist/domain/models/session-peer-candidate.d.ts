import type { SessionState } from "./session-provider-adapter.js";
export type PersonalSessionPeerType = "USER" | "GROUP";
export type PersonalSessionPeerCandidate = {
    peerId: string;
    peerType: PersonalSessionPeerType;
    threadId: string | null;
    displayName: string | null;
    lastMessageAt: string;
};
export type ListSessionPeerCandidatesOptions = {
    limit?: number;
    includeGroups?: boolean;
};
export type ListSessionPeerCandidatesResult = {
    sessionId: string;
    accountLabel: string;
    status: SessionState;
    updatedAt: string;
    items: PersonalSessionPeerCandidate[];
};
//# sourceMappingURL=session-peer-candidate.d.ts.map