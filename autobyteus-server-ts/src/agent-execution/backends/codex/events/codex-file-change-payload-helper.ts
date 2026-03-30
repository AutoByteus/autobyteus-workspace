const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export type CodexFileChangeFields = {
  path: string | null;
  patch: string | null;
};

export class CodexFileChangePayloadHelper {
  public resolveFields(payload: Record<string, unknown>): CodexFileChangeFields {
    const item = asObject(payload.item);
    const singleChangeCandidates = [
      asObject(payload.change),
      asObject(payload.file_change),
      asObject(item.change),
      asObject(item.file_change),
    ];
    for (const candidate of singleChangeCandidates) {
      const resolved = this.resolveEntry(candidate);
      if (resolved.path || resolved.patch) {
        return resolved;
      }
    }

    const arrayCandidates = [payload.changes, item.changes];
    for (const candidate of arrayCandidates) {
      if (!Array.isArray(candidate)) {
        continue;
      }
      for (const row of candidate) {
        const resolved = this.resolveEntry(asObject(row));
        if (resolved.path || resolved.patch) {
          return resolved;
        }
      }
    }

    return { path: null, patch: null };
  }

  public resolvePath(payload: Record<string, unknown>): string | null {
    return this.resolveFields(payload).path;
  }

  public resolvePatch(payload: Record<string, unknown>): string | null {
    return this.resolveFields(payload).patch;
  }

  private resolveEntry(change: Record<string, unknown>): CodexFileChangeFields {
    const file = asObject(change.file);
    return {
      path: asString(change.path) ?? asString(file.path),
      patch:
        asString(change.patch) ??
        asString(change.diff) ??
        asString(change.delta) ??
        asString(change.content) ??
        asString(file.patch) ??
        asString(file.diff),
    };
  }
}
