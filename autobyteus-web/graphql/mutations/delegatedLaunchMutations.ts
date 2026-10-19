import { gql } from 'graphql-tag'

/** DS-002: the user's Stop of one delegated copy (and the copies it started). */
export const StopDelegatedExecution = gql`mutation StopDelegatedExecution($input: DelegatedExecutionTargetInput!) {
  stopDelegatedExecution(input: $input) { success outcome message notStoppedUnattributed }
}`

/** DS-001 / AR-004: the user's model choice for stopped copies, with a stopped run's own settings in the same Save. */
export const UpdateDelegatedLaunchSelections = gql`mutation UpdateDelegatedLaunchSelections($input: UpdateDelegatedLaunchSelectionsInput!) {
  updateDelegatedLaunchSelections(input: $input) { success outcome message fieldErrors { path message } }
}`
