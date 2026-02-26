import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export type TransportSecurityMode = "strict_signed" | "trusted_lan";

export type InternalEnvelopeAuthHeaders = {
  "x-ab-node-id": string;
  "x-ab-ts": string;
  "x-ab-nonce": string;
  "x-ab-key-id": string;
  "x-ab-signature": string;
};

export type InternalEnvelopeAuthOptions = {
  localNodeId: string;
  resolveSecretByKeyId: (keyId: string) => string | null;
  defaultKeyId?: string;
  allowedNodeIds?: readonly string[] | null;
  maxClockSkewMs?: number;
  nonceTtlMs?: number;
  now?: () => number;
};

export type SignRequestInput = {
  body: unknown;
  securityMode?: TransportSecurityMode;
};

export type VerifyRequestInput = {
  headers: Record<string, unknown>;
  body: unknown;
  securityMode?: TransportSecurityMode;
};

export type VerifyRequestResult = {
  accepted: boolean;
  code?: string;
  message?: string;
  sourceNodeId?: string;
};

const DEFAULT_MAX_CLOCK_SKEW_MS = 30_000;
const DEFAULT_NONCE_TTL_MS = 120_000;
const DEFAULT_KEY_ID = "default";

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
  if (Array.isArray(value) && value.length > 0) {
    return normalizeOptionalString(value[0]);
  }
  return null;
};

const normalizeMode = (value: TransportSecurityMode | null | undefined): TransportSecurityMode =>
  value === "trusted_lan" ? "trusted_lan" : "strict_signed";

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
};

const hashBody = (body: unknown): string =>
  createHmac("sha256", "autobyteus-internal-envelope-body")
    .update(stableStringify(body))
    .digest("hex");

const buildCanonicalPayload = (input: {
  sourceNodeId: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
}): string =>
  `${input.sourceNodeId}\n${input.timestamp}\n${input.nonce}\n${input.bodyHash}`;

const signCanonicalPayload = (secret: string, payload: string): string =>
  createHmac("sha256", secret).update(payload).digest("hex");

const secureCompareHex = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
};

export class InternalEnvelopeAuth {
  private readonly localNodeId: string;
  private readonly resolveSecretByKeyId: (keyId: string) => string | null;
  private readonly defaultKeyId: string;
  private readonly allowedNodeIds: Set<string> | null;
  private readonly maxClockSkewMs: number;
  private readonly nonceTtlMs: number;
  private readonly now: () => number;
  private readonly nonceSeenAtMs = new Map<string, number>();

  constructor(options: InternalEnvelopeAuthOptions) {
    this.localNodeId = this.normalizeRequiredString(options.localNodeId, "localNodeId");
    this.resolveSecretByKeyId = options.resolveSecretByKeyId;
    this.defaultKeyId = options.defaultKeyId?.trim() || DEFAULT_KEY_ID;
    this.allowedNodeIds = options.allowedNodeIds
      ? new Set(
          options.allowedNodeIds
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        )
      : null;
    this.maxClockSkewMs = options.maxClockSkewMs ?? DEFAULT_MAX_CLOCK_SKEW_MS;
    this.nonceTtlMs = options.nonceTtlMs ?? DEFAULT_NONCE_TTL_MS;
    this.now = options.now ?? (() => Date.now());
  }

  signRequest(input: SignRequestInput): InternalEnvelopeAuthHeaders {
    const timestamp = String(this.now());
    const nonce = randomUUID();
    const keyId = this.defaultKeyId;
    const secret = this.resolveSecretByKeyId(keyId);
    if (!secret) {
      throw new Error(`No internal envelope auth secret configured for key '${keyId}'.`);
    }
    const payload = buildCanonicalPayload({
      sourceNodeId: this.localNodeId,
      timestamp,
      nonce,
      bodyHash: hashBody(input.body),
    });
    return {
      "x-ab-node-id": this.localNodeId,
      "x-ab-ts": timestamp,
      "x-ab-nonce": nonce,
      "x-ab-key-id": keyId,
      "x-ab-signature": signCanonicalPayload(secret, payload),
    };
  }

  verifyRequest(input: VerifyRequestInput): VerifyRequestResult {
    const securityMode = normalizeMode(input.securityMode);
    const sourceNodeId = normalizeOptionalString(input.headers["x-ab-node-id"]);
    if (!sourceNodeId) {
      return this.rejected("MISSING_SOURCE_NODE", "Missing x-ab-node-id header.");
    }
    if (this.allowedNodeIds && !this.allowedNodeIds.has(sourceNodeId)) {
      return this.rejected(
        "SOURCE_NODE_NOT_ALLOWED",
        `Source node '${sourceNodeId}' is not in the allowlist.`,
      );
    }

    const timestampRaw = normalizeOptionalString(input.headers["x-ab-ts"]);
    if (!timestampRaw) {
      return this.rejected("MISSING_TIMESTAMP", "Missing x-ab-ts header.");
    }
    const timestampMs = Number(timestampRaw);
    if (!Number.isFinite(timestampMs)) {
      return this.rejected("INVALID_TIMESTAMP", "x-ab-ts must be a millisecond timestamp.");
    }
    const now = this.now();
    if (Math.abs(now - timestampMs) > this.maxClockSkewMs) {
      return this.rejected(
        "TIMESTAMP_OUT_OF_RANGE",
        "Transport request timestamp is outside the allowed skew window.",
      );
    }

    if (securityMode === "trusted_lan") {
      return {
        accepted: true,
        sourceNodeId,
      };
    }

    const nonce = normalizeOptionalString(input.headers["x-ab-nonce"]);
    if (!nonce) {
      return this.rejected("MISSING_NONCE", "Missing x-ab-nonce header.");
    }
    if (this.isNonceReplayed(sourceNodeId, nonce, now)) {
      return this.rejected("REPLAY_DETECTED", "Transport request nonce was already seen.");
    }

    const keyId = normalizeOptionalString(input.headers["x-ab-key-id"]);
    if (!keyId) {
      return this.rejected("MISSING_KEY_ID", "Missing x-ab-key-id header.");
    }
    const signature = normalizeOptionalString(input.headers["x-ab-signature"]);
    if (!signature) {
      return this.rejected("MISSING_SIGNATURE", "Missing x-ab-signature header.");
    }

    const secret = this.resolveSecretByKeyId(keyId);
    if (!secret) {
      return this.rejected(
        "UNKNOWN_KEY_ID",
        `No internal envelope auth secret configured for key '${keyId}'.`,
      );
    }

    const payload = buildCanonicalPayload({
      sourceNodeId,
      timestamp: timestampRaw,
      nonce,
      bodyHash: hashBody(input.body),
    });
    const expectedSignature = signCanonicalPayload(secret, payload);
    if (!secureCompareHex(expectedSignature, signature)) {
      return this.rejected("INVALID_SIGNATURE", "Transport request signature verification failed.");
    }

    this.registerNonce(sourceNodeId, nonce, now);
    return {
      accepted: true,
      sourceNodeId,
    };
  }

  private isNonceReplayed(sourceNodeId: string, nonce: string, nowMs: number): boolean {
    this.pruneNonces(nowMs);
    const key = this.buildNonceKey(sourceNodeId, nonce);
    return this.nonceSeenAtMs.has(key);
  }

  private registerNonce(sourceNodeId: string, nonce: string, nowMs: number): void {
    this.pruneNonces(nowMs);
    this.nonceSeenAtMs.set(this.buildNonceKey(sourceNodeId, nonce), nowMs);
  }

  private pruneNonces(nowMs: number): void {
    for (const [key, seenAtMs] of this.nonceSeenAtMs.entries()) {
      if (nowMs - seenAtMs > this.nonceTtlMs) {
        this.nonceSeenAtMs.delete(key);
      }
    }
  }

  private buildNonceKey(sourceNodeId: string, nonce: string): string {
    return `${sourceNodeId}:${nonce}`;
  }

  private rejected(code: string, message: string): VerifyRequestResult {
    return { accepted: false, code, message };
  }

  private normalizeRequiredString(value: string, field: string): string {
    const normalized = value.trim();
    if (normalized.length === 0) {
      throw new Error(`${field} must be a non-empty string.`);
    }
    return normalized;
  }
}
