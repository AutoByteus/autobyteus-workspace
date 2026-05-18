const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export type CodexFileChangeFields = {
  path: string | null;
  patch: string | null;
  kind?: string | null;
};

export class CodexFileChangePayloadHelper {
  public resolveArguments(payload: Record<string, unknown>): Record<string, unknown> | null {
    const item = asObject(payload.item);
    const changes = [
      ...this.resolveChangeEntries(payload.changes),
      ...this.resolveChangeEntries(item.changes),
    ];

    if (changes.length === 0) {
      const singleChangeCandidates = [
        asObject(payload.change),
        asObject(payload.file_change),
        asObject(item.change),
        asObject(item.file_change),
        payload,
        item,
      ];
      for (const candidate of singleChangeCandidates) {
        const resolved = this.resolveEntry(candidate);
        const argument = this.toArgument(resolved);
        if (argument) {
          return argument;
        }
      }
      return null;
    }

    if (changes.length === 1) {
      return changes[0] ?? null;
    }
    return { changes };
  }

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
    const kind = asObject(change.kind);
    return {
      path: asString(change.path) ?? asString(file.path),
      patch:
        asString(change.patch) ??
        asString(change.diff) ??
        asString(change.delta) ??
        asString(change.content) ??
        asString(file.patch) ??
        asString(file.diff),
      kind: asString(change.kind) ?? asString(kind.type),
    };
  }

  private resolveChangeEntries(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((entry) => this.toArgument(this.resolveEntry(asObject(entry))))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry));
  }

  private toArgument(fields: CodexFileChangeFields): Record<string, unknown> | null {
    const next: Record<string, unknown> = {};
    if (fields.path) {
      next.path = fields.path;
    }
    if (fields.patch) {
      next.patch = fields.patch;
    }
    if (fields.kind) {
      next.kind = fields.kind;
    }
    return Object.keys(next).length > 0 ? next : null;
  }
}
