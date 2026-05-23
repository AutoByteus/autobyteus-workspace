import { createHash, timingSafeEqual } from "node:crypto";
import type {
  RemoteAccessAuthorizationResult,
  RemoteAccessAuthContext,
} from "../domain/models.js";
import {
  NODE_ADMIN_CLAIM_ID_HEADER,
  NODE_ADMIN_CLAIM_SCOPE,
  NODE_ADMIN_CLAIM_SECRET_HEADER,
} from "../domain/models.js";

export type RemoteNodeAdminClaimConfig = {
  claimId: string;
  secretHash: string;
  scope: string;
};

const normalizeHeaderValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return String(value[0] ?? "").trim();
  }
  return String(value ?? "").trim();
};

const normalizeHash = (value: string | undefined): string => String(value ?? "").trim().toLowerCase();

const sha256Hex = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");

const timingSafeHexEqual = (left: string, right: string): boolean => {
  const normalizedLeft = normalizeHash(left);
  const normalizedRight = normalizeHash(right);
  if (!/^[0-9a-f]+$/i.test(normalizedLeft) || !/^[0-9a-f]+$/i.test(normalizedRight)) {
    return false;
  }
  if (normalizedLeft.length !== normalizedRight.length || normalizedLeft.length % 2 !== 0) {
    return false;
  }
  const leftBuffer = Buffer.from(normalizedLeft, "hex");
  const rightBuffer = Buffer.from(normalizedRight, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const reject = (
  statusCode: number,
  code: RemoteAccessAuthorizationResult extends infer T
    ? T extends { ok: false; code: infer C } ? C : never
    : never,
  message: string,
): RemoteAccessAuthorizationResult => ({ ok: false, statusCode, code, message });

export class RemoteNodeAdminService {
  constructor(
    private readonly readConfig: () => RemoteNodeAdminClaimConfig | null = readNodeAdminClaimConfigFromEnv,
  ) {}

  validateClaim(input: {
    claimId?: string | null;
    rawSecret?: string | null;
    scope?: string;
  }): RemoteAccessAuthorizationResult {
    const configured = this.readConfig();
    if (!configured) {
      return reject(
        403,
        "REMOTE_ACCESS_ADMIN_CLAIM_UNCONFIGURED",
        "This node does not have a Phone Access owner claim configured.",
      );
    }

    const claimId = String(input.claimId ?? "").trim();
    const rawSecret = String(input.rawSecret ?? "").trim();
    if (!claimId || !rawSecret) {
      return reject(
        401,
        "REMOTE_ACCESS_ADMIN_CLAIM_REQUIRED",
        "A node-admin claim is required for this Phone Access owner route.",
      );
    }

    if (input.scope && input.scope !== NODE_ADMIN_CLAIM_SCOPE) {
      return reject(403, "REMOTE_ACCESS_ADMIN_CLAIM_INVALID", "Node-admin claim scope is invalid.");
    }
    if (configured.scope !== NODE_ADMIN_CLAIM_SCOPE) {
      return reject(403, "REMOTE_ACCESS_ADMIN_CLAIM_INVALID", "Configured node-admin claim scope is invalid.");
    }
    if (claimId !== configured.claimId) {
      return reject(403, "REMOTE_ACCESS_ADMIN_CLAIM_INVALID", "Node-admin claim is invalid.");
    }

    const presentedHash = sha256Hex(rawSecret);
    if (!timingSafeHexEqual(presentedHash, configured.secretHash)) {
      return reject(403, "REMOTE_ACCESS_ADMIN_CLAIM_INVALID", "Node-admin claim is invalid.");
    }

    const context: RemoteAccessAuthContext = {
      mode: "node_admin_claim",
      isAuthenticated: true,
      nodeAdminClaimId: claimId,
    };
    return { ok: true, context };
  }

  validateHeaders(headers: Record<string, string | string[] | undefined>): RemoteAccessAuthorizationResult {
    return this.validateClaim({
      claimId: normalizeHeaderValue(headers[NODE_ADMIN_CLAIM_ID_HEADER]),
      rawSecret: normalizeHeaderValue(headers[NODE_ADMIN_CLAIM_SECRET_HEADER]),
      scope: NODE_ADMIN_CLAIM_SCOPE,
    });
  }
}

export const readNodeAdminClaimConfigFromEnv = (): RemoteNodeAdminClaimConfig | null => {
  const claimId = String(process.env.AUTOBYTEUS_NODE_ADMIN_CLAIM_ID ?? "").trim();
  const secretHash = normalizeHash(process.env.AUTOBYTEUS_NODE_ADMIN_CLAIM_HASH);
  const scope = String(process.env.AUTOBYTEUS_NODE_ADMIN_CLAIM_SCOPE ?? "").trim();
  if (!claimId && !secretHash && !scope) {
    return null;
  }
  if (!claimId || !secretHash || !scope) {
    return null;
  }
  return { claimId, secretHash, scope };
};

let singleton: RemoteNodeAdminService | null = null;

export const getRemoteNodeAdminService = (): RemoteNodeAdminService => {
  singleton ??= new RemoteNodeAdminService();
  return singleton;
};

export const resetRemoteNodeAdminServiceForTests = (): void => {
  singleton = null;
};
