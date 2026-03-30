const mergeMessages = (
  primary: Array<Record<string, unknown>>,
  secondary: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> => {
  const merged: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();

  for (const row of [...primary, ...secondary]) {
    const key = JSON.stringify(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(row);
  }

  return merged;
};

export class ClaudeSessionMessageCache {
  private readonly messagesBySessionId = new Map<string, Array<Record<string, unknown>>>();

  ensureSession(sessionId: string): void {
    if (!this.messagesBySessionId.has(sessionId)) {
      this.messagesBySessionId.set(sessionId, []);
    }
  }

  appendMessage(sessionId: string, message: Record<string, unknown>): void {
    this.ensureSession(sessionId);
    const existing = this.messagesBySessionId.get(sessionId) ?? [];
    existing.push(message);
    this.messagesBySessionId.set(sessionId, existing);
  }

  migrateSessionMessages(sourceSessionId: string, targetSessionId: string): void {
    if (sourceSessionId === targetSessionId) {
      this.ensureSession(targetSessionId);
      return;
    }

    const sourceMessages = this.getCachedMessages(sourceSessionId);
    const targetMessages = this.getCachedMessages(targetSessionId);
    const mergedMessages = mergeMessages(sourceMessages, targetMessages);
    this.messagesBySessionId.set(targetSessionId, mergedMessages);
    this.messagesBySessionId.delete(sourceSessionId);
  }

  getCachedMessages(sessionId: string): Array<Record<string, unknown>> {
    return this.messagesBySessionId.get(sessionId) ?? [];
  }

  getMergedMessages(
    sessionId: string,
    sdkMessages: Array<Record<string, unknown>>,
  ): Array<Record<string, unknown>> {
    return mergeMessages(sdkMessages, this.getCachedMessages(sessionId));
  }
}
