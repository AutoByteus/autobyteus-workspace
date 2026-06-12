export type DirectAgentRunMessageGrant = {
  grantId: string;
  senderRunId: string;
  purpose: string;
  allowedTargetAgentRunIds?: string[] | null;
  allowedMessageTypes?: string[] | null;
  allowedReferenceFileRoots?: string[] | null;
  allowedReferenceFiles?: string[] | null;
  maxAcceptedDeliveries?: number | null;
  expiresAt?: string | null;
};

export type DirectAgentRunMessageGrantUsage = {
  grantId: string;
  senderRunId: string;
  purpose: string;
  accepted: boolean;
  code: string;
  message: string | null;
  targetAgentRunId: string;
  messageType: string;
  referenceFiles: string[];
  createdAt: string;
};

export type DirectAgentRunMessageGrantDecision =
  | { kind: "not_applicable" }
  | { kind: "allowed"; grant: DirectAgentRunMessageGrant }
  | { kind: "rejected"; grant: DirectAgentRunMessageGrant | null; code: string; message: string };

export type DirectAgentRunMessageGrantUsageSummary = {
  grantId: string;
  senderRunId: string;
  purpose: string;
  latestUsage: DirectAgentRunMessageGrantUsage | null;
  acceptedCount: number;
};
