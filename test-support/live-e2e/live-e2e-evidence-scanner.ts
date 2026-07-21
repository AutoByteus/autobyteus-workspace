const render = (value: unknown): string => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export class LiveE2eEvidenceScanner {
  private readonly forbidden: string[];

  constructor(syntheticCanaries: string[]) {
    this.forbidden = syntheticCanaries.flatMap((value) => [
      value,
      Buffer.from(value).toString('base64'),
    ]).filter(Boolean);
  }

  assertClean(value: unknown): void {
    const output = render(value);
    if (this.forbidden.some((candidate) => output.includes(candidate))) {
      throw new Error('LIVE_E2E_EVIDENCE_LEAK_DETECTED');
    }
  }

  assertStructurallyValueFree(value: unknown): void {
    const output = render(value);
    if (/(api[_-]?key|authorization|credentialValue|secretValue)\s*[":=]/i.test(output)) {
      throw new Error('LIVE_E2E_EVIDENCE_SECRET_FIELD_DETECTED');
    }
  }
}
