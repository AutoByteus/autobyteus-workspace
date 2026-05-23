import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  NODE_ADMIN_CLAIM_ID_HEADER,
  NODE_ADMIN_CLAIM_SCOPE,
  NODE_ADMIN_CLAIM_SECRET_HEADER,
} from "../../../src/remote-access/domain/models.js";
import { RemoteNodeAdminService } from "../../../src/remote-access/services/remote-node-admin-service.js";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

describe("RemoteNodeAdminService", () => {
  it("validates the configured claim by hashing the presented raw secret", () => {
    const service = new RemoteNodeAdminService(() => ({
      claimId: "nac_test",
      secretHash: sha256("raw-secret"),
      scope: NODE_ADMIN_CLAIM_SCOPE,
    }));

    expect(service.validateHeaders({
      [NODE_ADMIN_CLAIM_ID_HEADER]: "nac_test",
      [NODE_ADMIN_CLAIM_SECRET_HEADER]: "raw-secret",
    })).toMatchObject({
      ok: true,
      context: { mode: "node_admin_claim", nodeAdminClaimId: "nac_test" },
    });
  });

  it("rejects wrong claim id, wrong raw secret, and unconfigured nodes", () => {
    const service = new RemoteNodeAdminService(() => ({
      claimId: "nac_test",
      secretHash: sha256("raw-secret"),
      scope: NODE_ADMIN_CLAIM_SCOPE,
    }));

    expect(service.validateClaim({ claimId: "nac_other", rawSecret: "raw-secret" })).toMatchObject({
      ok: false,
      code: "REMOTE_ACCESS_ADMIN_CLAIM_INVALID",
    });
    expect(service.validateClaim({ claimId: "nac_test", rawSecret: "wrong" })).toMatchObject({
      ok: false,
      code: "REMOTE_ACCESS_ADMIN_CLAIM_INVALID",
    });
    expect(new RemoteNodeAdminService(() => null).validateClaim({
      claimId: "nac_test",
      rawSecret: "raw-secret",
    })).toMatchObject({
      ok: false,
      code: "REMOTE_ACCESS_ADMIN_CLAIM_UNCONFIGURED",
    });
  });
});
