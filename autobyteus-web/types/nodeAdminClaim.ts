export const NODE_ADMIN_CLAIM_ID_HEADER = 'X-Autobyteus-Node-Admin-Claim-Id';
export const NODE_ADMIN_CLAIM_SECRET_HEADER = 'X-Autobyteus-Node-Admin-Claim';

export type NodeAdminClaimStatus = 'missing' | 'configured';

export type NodeAdminClaimSummary = {
  status: NodeAdminClaimStatus;
  nodeId: string;
  managementBaseUrl: string;
  claimIdSuffix: string | null;
  updatedAt: string | null;
};

export type RegisterNodeAdminClaimInput = {
  nodeId: string;
  managementBaseUrl: string;
  claimId: string;
  rawSecret: string;
};

export type NodeAdminClaimHeadersResult =
  | {
      ok: true;
      headers: Record<typeof NODE_ADMIN_CLAIM_ID_HEADER | typeof NODE_ADMIN_CLAIM_SECRET_HEADER, string>;
      summary: NodeAdminClaimSummary;
    }
  | {
      ok: false;
      reason: 'missing' | 'invalid-input' | 'unavailable';
      summary: NodeAdminClaimSummary;
    };
