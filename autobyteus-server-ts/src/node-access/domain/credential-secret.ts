import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The secret primitives every credential kind uses (NA-10): random credentials and one-time codes, SHA-256 hashes
 * (a node keeps only those), and constant-time comparison. A leaf: it imports nothing from the project.
 */

const CREDENTIAL_BYTES = 32;
const CODE_BYTES = 18;

/** A credential: `<prefix>` + 32 random bytes (base64url). */
export const generateCredential = (prefix: string): string => `${prefix}${randomBytes(CREDENTIAL_BYTES).toString("base64url")}`;

/** A one-time code (pairing, setup, peer invite): 18 random bytes (base64url). */
export const generateOneTimeCode = (): string => randomBytes(CODE_BYTES).toString("base64url");

/** A record ID: `<prefix>_` + 16 random bytes (hex). Not a secret. */
export const generateRecordId = (prefix: string): string => `${prefix}_${randomBytes(16).toString("hex")}`;

/** The SHA-256 hash (hex) a node stores instead of a secret. */
export const hashSecret = (secret: string): string => createHash("sha256").update(secret, "utf8").digest("hex");

/** Whether two SHA-256 hex hashes are equal, in constant time. */
export const hashesEqual = (leftHex: string, rightHex: string): boolean => {
  const left = Buffer.from(leftHex, "hex");
  const right = Buffer.from(rightHex, "hex");
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
};

/** Whether two secrets are equal, in constant time (compares their hashes, so lengths never leak). */
export const secretsEqual = (left: string, right: string): boolean => hashesEqual(hashSecret(left), hashSecret(right));
