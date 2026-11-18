import { useRunStatusStore } from '~/stores/runStatusStore'
import type { DelegatedReference, DelegatedRoot } from '~/services/runConfigEditing/delegatedLaunchSelectionClient'

/**
 * Whether a delegated run runs, for its stop icon (DS-002): its own status, read by its run ID (autobyteus-461 SR-083,
 * F-62), whatever its delegator's is; a Team counts as one unit. The view showing its row holds the run.
 */
export const isDelegatedRunLive = (_root: DelegatedRoot, reference: DelegatedReference): boolean =>
  useRunStatusStore().isRunLive('agentRunId' in reference ? { kind: 'agent', runId: reference.agentRunId } : { kind: 'agent_team', runId: reference.teamRunId })
