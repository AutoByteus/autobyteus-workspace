export class MultimediaConfig {
  params: Record<string, unknown>;

  constructor(params: Record<string, unknown> = {}) {
    this.params = params ?? {};
  }

  mergeWith(overrideConfig: MultimediaConfig | null | undefined): void {
    if (overrideConfig && overrideConfig.params && Object.keys(overrideConfig.params).length > 0) {
      this.params = { ...this.params, ...overrideConfig.params };
    }
  }

  static fromDict(data: Record<string, unknown> | null | undefined): MultimediaConfig {
    return new MultimediaConfig(data ?? {});
  }

  toDict(): Record<string, unknown> {
    return this.params;
  }
}
