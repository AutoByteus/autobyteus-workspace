export type FederatedMemberRef = {
  homeNodeId: string;
  referenceType: 'AGENT' | 'AGENT_TEAM';
  referenceId: string;
};

const normalizeRequiredValue = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required to build federated member key.`);
  }
  return normalized;
};

export const buildFederatedMemberKey = (ref: FederatedMemberRef): string => {
  const homeNodeId = normalizeRequiredValue(ref.homeNodeId, 'homeNodeId');
  const referenceType = normalizeRequiredValue(ref.referenceType, 'referenceType');
  const referenceId = normalizeRequiredValue(ref.referenceId, 'referenceId');
  return `${homeNodeId}:${referenceType}:${referenceId}`;
};
