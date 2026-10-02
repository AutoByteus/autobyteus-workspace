/** Correlates accepted-input presentations inside an already validated recipient scope. */
export type AcceptedInputIdentity = {
    messageId?: string;
    dedupeKey?: string;
};
export declare const normalizeAcceptedInputIdentity: (input: {
    messageId?: unknown;
    dedupeKey?: unknown;
}) => AcceptedInputIdentity;
/** Secondary tokens must never bridge conflicting or partially known primary identities. */
export declare const acceptedInputIdentityKey: (input: {
    messageId?: unknown;
    dedupeKey?: unknown;
}) => string | null;
//# sourceMappingURL=accepted-input-identity.d.ts.map