import type { DelegatedRowControl } from '~/utils/runSettings/delegatedLaunchRows'

/** A row control with nothing editable, running or chosen, for tests. */
export const NO_CONTROL_FOR_TESTS: DelegatedRowControl = { editable: true, isAgentLive: () => false, isStopping: () => false, draftOf: () => null, storedOf: () => null }
