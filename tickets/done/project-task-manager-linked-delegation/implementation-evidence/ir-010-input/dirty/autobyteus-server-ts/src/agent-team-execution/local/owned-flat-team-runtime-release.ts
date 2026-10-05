import type { AgentOperationResult } from '../../agent-execution/domain/agent-operation-result.js';

/** Finish independent exact local authorities concurrently; no quiet wait or silent partial success. */
export async function releaseOwnedFlatTeamRuntime(input: {
  releases: readonly (() => Promise<AgentOperationResult>)[];
  disposeAfterProof(): void;
}): Promise<AgentOperationResult> {
  const results = await Promise.allSettled(input.releases.map(release => release()));
  const errors = results.flatMap(result => result.status === 'rejected' ? [result.reason] : []);
  if (errors.length) throw new AggregateError(errors, 'Owned Team exact release failed.');
  const pending = results.find(result => result.status === 'fulfilled' && !result.value.accepted);
  if (pending?.status === 'fulfilled') return pending.value;
  input.disposeAfterProof();
  return { accepted: true };
}
