export class ToolState {
  [key: string]: unknown;

  constructor(initial?: Record<string, unknown>) {
    if (initial && typeof initial === 'object') {
      Object.assign(this, initial);
    }
  }

  public get<T = unknown>(key: string, defaultValue: T | null = null): T | null {
    if (Object.prototype.hasOwnProperty.call(this, key)) {
      return (this as Record<string, unknown>)[key] as T;
    }
    return defaultValue;
  }

  public set(key: string, value: unknown): void {
    (this as Record<string, unknown>)[key] = value;
  }

  public has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this, key);
  }

  public delete(key: string): boolean {
    if (this.has(key)) {
      delete (this as any)[key];
      return true;
    }
    return false;
  }

  public keys(): string[] {
    return Object.keys(this);
  }

  public values(): unknown[] {
    return Object.values(this);
  }

  public entries(): Array<[string, unknown]> {
    return Object.entries(this) as Array<[string, unknown]>;
  }

  public clear(): void {
    for (const key of Object.keys(this)) {
      delete (this as Record<string, unknown>)[key];
    }
  }

  public toObject(): Record<string, unknown> {
    return { ...this };
  }

  public toJSON(): Record<string, unknown> {
    return this.toObject();
  }
}
