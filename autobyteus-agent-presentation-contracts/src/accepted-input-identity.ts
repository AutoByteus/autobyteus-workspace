/** Correlates accepted-input presentations inside an already validated recipient scope. */
export type AcceptedInputIdentity = { messageId?: string; dedupeKey?: string };

export const normalizeAcceptedInputIdentity = (input: {
  messageId?: unknown; dedupeKey?: unknown;
}): AcceptedInputIdentity => {
  const messageId = typeof input.messageId === 'string' ? input.messageId.trim() : '';
  const dedupeKey = typeof input.dedupeKey === 'string' ? input.dedupeKey.trim() : '';
  return { ...(messageId ? { messageId } : {}), ...(dedupeKey ? { dedupeKey } : {}) };
};

/** Secondary tokens must never bridge conflicting or partially known primary identities. */
export const acceptedInputIdentityKey = (input: {
  messageId?: unknown; dedupeKey?: unknown;
}): string | null => {
  const { messageId, dedupeKey } = normalizeAcceptedInputIdentity(input);
  return messageId ? JSON.stringify(['messageId', messageId])
    : dedupeKey ? JSON.stringify(['dedupeKey', dedupeKey]) : null;
};
