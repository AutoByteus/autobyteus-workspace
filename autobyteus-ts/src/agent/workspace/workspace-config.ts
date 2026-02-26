type JsonLike = Record<string, unknown>;

function isPlainObject(value: unknown): value is JsonLike {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeValue(value: unknown): unknown {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return '__undefined__';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'symbol') {
    return value.toString();
  }
  if (typeof value === 'function') {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }
  if (value instanceof Set) {
    const normalizedItems = Array.from(value, (item) => normalizeValue(item));
    normalizedItems.sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
    return normalizedItems;
  }
  if (value instanceof Map) {
    const entries: Array<[string, unknown]> = Array.from(value.entries()).map(([key, entryValue]) => [
      String(key),
      normalizeValue(entryValue)
    ]);
    entries.sort(([a], [b]) => String(a).localeCompare(String(b)));
    return entries;
  }
  if (isPlainObject(value)) {
    const sortedKeys = Object.keys(value).sort();
    const result: JsonLike = {};
    for (const key of sortedKeys) {
      result[key] = normalizeValue((value as JsonLike)[key]);
    }
    return result;
  }

  return String(value);
}

function stableStringify(value: unknown): string {
  try {
    const normalized = normalizeValue(value);
    return JSON.stringify(normalized);
  } catch (error) {
    try {
      return JSON.stringify(String(value));
    } catch {
      return String(value);
    }
  }
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export class WorkspaceConfig {
  private readonly params: JsonLike;
  private readonly canonicalRep: string;

  constructor(params?: Record<string, unknown> | Map<string, unknown> | null) {
    if (params instanceof Map) {
      this.params = Object.fromEntries(params.entries());
    } else {
      this.params = { ...(params ?? {}) };
    }

    this.canonicalRep = stableStringify(this.params);
  }

  static fromDict(configData: Record<string, unknown>): WorkspaceConfig {
    if (!isPlainObject(configData)) {
      throw new TypeError('config_data must be a dictionary');
    }
    return new WorkspaceConfig(configData);
  }

  toDict(): Record<string, unknown> {
    return { ...this.params };
  }

  get(key: string, defaultValue: unknown = null): unknown {
    if (Object.prototype.hasOwnProperty.call(this.params, key)) {
      return this.params[key];
    }
    return defaultValue;
  }

  set(key: string, value: unknown): WorkspaceConfig {
    const next = { ...this.params, [key]: value };
    return new WorkspaceConfig(next);
  }

  update(params: Record<string, unknown> | Map<string, unknown>): WorkspaceConfig {
    if (!(params instanceof Map) && !isPlainObject(params)) {
      throw new TypeError('params must be a mapping');
    }
    const updates = params instanceof Map ? Object.fromEntries(params.entries()) : params;
    return new WorkspaceConfig({ ...this.params, ...updates });
  }

  merge(other: WorkspaceConfig): WorkspaceConfig {
    if (!(other instanceof WorkspaceConfig)) {
      throw new TypeError('Can only merge with another WorkspaceConfig instance');
    }
    return new WorkspaceConfig({ ...this.params, ...other.params });
  }

  equals(other: unknown): boolean {
    if (!(other instanceof WorkspaceConfig)) {
      return false;
    }
    return this.canonicalRep === other.canonicalRep;
  }

  hash(): number {
    return hashString(this.canonicalRep);
  }

  get size(): number {
    return Object.keys(this.params).length;
  }

  get isEmpty(): boolean {
    return this.size === 0;
  }

  toString(): string {
    const rendered = JSON.stringify(this.params).replace(/"/g, "'");
    return `WorkspaceConfig(params=${rendered})`;
  }
}
