import { inspect } from 'node:util';

const REDACTED_SECRET = '<redacted-secret>' as const;

/**
 * A deliberately non-serializable wrapper for a secret that may only be
 * unwrapped at a trusted provider/client construction boundary.
 */
export class SecretValue {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  static fromString(value: string): SecretValue {
    if (typeof value !== 'string' || value.length === 0) {
      throw new TypeError('SecretValue requires a non-empty string.');
    }
    return new SecretValue(value);
  }

  revealToTrustedConsumer(): string {
    return this.#value;
  }

  toString(): typeof REDACTED_SECRET {
    return REDACTED_SECRET;
  }

  toJSON(): typeof REDACTED_SECRET {
    return REDACTED_SECRET;
  }

  [inspect.custom](): typeof REDACTED_SECRET {
    return REDACTED_SECRET;
  }
}

export const REDACTED_SECRET_VALUE = REDACTED_SECRET;
