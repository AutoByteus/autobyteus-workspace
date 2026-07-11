export type ToolCallIdentity = Readonly<{
  turnId: string;
  toolCallId: string;
}>;

const normalizeIdentityPart = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

export const createToolCallIdentity = (
  turnId: unknown,
  toolCallId: unknown,
): ToolCallIdentity | null => {
  const normalizedTurnId = normalizeIdentityPart(turnId);
  const normalizedToolCallId = normalizeIdentityPart(toolCallId);
  return normalizedTurnId && normalizedToolCallId
    ? { turnId: normalizedTurnId, toolCallId: normalizedToolCallId }
    : null;
};

export const toolCallIdentityKey = (identity: ToolCallIdentity): string =>
  JSON.stringify([identity.turnId, identity.toolCallId]);
