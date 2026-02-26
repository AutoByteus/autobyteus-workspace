import { describe, expect, it } from 'vitest';
import { buildFederatedMemberKey } from '~/utils/federated-catalog/federated-member-key';

describe('buildFederatedMemberKey', () => {
  it('builds stable key for cross-node references', () => {
    expect(
      buildFederatedMemberKey({
        homeNodeId: 'remote-node-1',
        referenceType: 'AGENT',
        referenceId: 'agent-42',
      }),
    ).toBe('remote-node-1:AGENT:agent-42');
  });

  it('throws when required attributes are empty', () => {
    expect(() =>
      buildFederatedMemberKey({
        homeNodeId: ' ',
        referenceType: 'AGENT',
        referenceId: 'agent-1',
      }),
    ).toThrowError(/homeNodeId is required/i);
  });
});
