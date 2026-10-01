export const normalizeAcceptedInputIdentity = (input) => {
    const messageId = typeof input.messageId === 'string' ? input.messageId.trim() : '';
    const dedupeKey = typeof input.dedupeKey === 'string' ? input.dedupeKey.trim() : '';
    return { ...(messageId ? { messageId } : {}), ...(dedupeKey ? { dedupeKey } : {}) };
};
/** Secondary tokens must never bridge conflicting or partially known primary identities. */
export const acceptedInputIdentityKey = (input) => {
    const { messageId, dedupeKey } = normalizeAcceptedInputIdentity(input);
    return messageId ? JSON.stringify(['messageId', messageId])
        : dedupeKey ? JSON.stringify(['dedupeKey', dedupeKey]) : null;
};
//# sourceMappingURL=accepted-input-identity.js.map