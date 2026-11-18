import { generateOneTimeCode, hashSecret } from "../domain/credential-secret.js";
import type { IssuedOwnerCredential, OwnerCredentialService } from "./owner-credential-service.js";

const SETUP_CODE_TTL_MS = 30 * 60 * 1000;

export type CreatedSetupCode = Readonly<{ setupCode: string; expiresAt: string }>;

export class SetupCodeInvalidError extends Error {
  readonly code = "NODE_SETUP_CODE_INVALID";
  readonly statusCode = 401;

  constructor() {
    super("This setup code is not valid. Create a new one on the node's computer.");
    this.name = "SetupCodeInvalidError";
  }
}

/**
 * Setup codes (NA-5, NA-10; design M-2, DS-003): one-time codes a desktop exchanges for an owner credential. Created
 * on demand, whatever the node's owners: through the node's local control socket on its own computer, or by an owner
 * desktop. Valid 30 minutes, single use, kept only as hashes in memory, never written to a file or a log.
 */
export class SetupCodeService {
  /** Unused codes: hash → expiry (ms). */
  private readonly codes = new Map<string, number>();

  constructor(
    private readonly ownerCredentials: Pick<OwnerCredentialService, "issue">,
    private readonly now: () => number = Date.now,
  ) {}

  create(): CreatedSetupCode {
    this.forgetExpired();
    const setupCode = generateOneTimeCode();
    const expiresAtMs = this.now() + SETUP_CODE_TTL_MS;
    this.codes.set(hashSecret(setupCode), expiresAtMs);
    return Object.freeze({ setupCode, expiresAt: new Date(expiresAtMs).toISOString() });
  }

  /** The setup exchange: a valid, unused, unexpired code becomes an owner credential for the desktop. */
  async exchange(input: { setupCode: unknown; desktopName: unknown }): Promise<IssuedOwnerCredential> {
    this.forgetExpired();
    const hash = typeof input.setupCode === "string" && input.setupCode.trim() ? hashSecret(input.setupCode.trim()) : null;
    if (!hash || !this.codes.delete(hash)) {
      throw new SetupCodeInvalidError();
    }
    return this.ownerCredentials.issue(input.desktopName);
  }

  private forgetExpired(): void {
    const now = this.now();
    for (const [hash, expiresAt] of this.codes) {
      if (expiresAt <= now) this.codes.delete(hash);
    }
  }
}
