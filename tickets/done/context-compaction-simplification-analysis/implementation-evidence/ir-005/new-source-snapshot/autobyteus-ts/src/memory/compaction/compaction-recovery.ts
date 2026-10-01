/** Live only. No recovery permission is reconstructed from saved history. */
export type CompactionRecoveryIdentity = Readonly<{ operationId: string; failureEpoch: number }>;
export type CompactionRecoveryPosition =
  | { kind: 'held_turn'; turnId: string }
  | { kind: 'next_turn'; failedTurnId: string };
export type CompactionRecoveryBlock = CompactionRecoveryIdentity & Readonly<{
  position: CompactionRecoveryPosition;
  state: 'awaiting_user' | 'authorized' | 'recovering';
  code: string;
  message: string;
}>;
export type CompactionRetryRequest = Readonly<{
  block: CompactionRecoveryIdentity;
  userAdmissionId: string;
}>;
export type CompactionExecutionSite = 'before_parent_request' | 'after_final_response';
export const sameCompactionRecovery = (a: CompactionRecoveryIdentity, b: CompactionRecoveryIdentity): boolean =>
  a.operationId === b.operationId && a.failureEpoch === b.failureEpoch;
export const copyCompactionRecovery = (block: CompactionRecoveryBlock): CompactionRecoveryBlock =>
  ({ ...block, position: { ...block.position } });
