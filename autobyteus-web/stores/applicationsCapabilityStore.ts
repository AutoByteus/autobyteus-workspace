import { GetApplicationsCapability } from '~/graphql/queries/applicationCapabilityQueries'
import { SetApplicationsEnabled } from '~/graphql/mutations/applicationCapabilityMutations'
import {
  createBoundNodeCapabilityStore,
  type BoundNodeCapabilityStatus,
} from '~/stores/capabilities/createBoundNodeCapabilityStore'

export type ApplicationsCapabilityScope = 'BOUND_NODE'
export type ApplicationsCapabilitySource =
  | 'SERVER_SETTING'
  | 'INITIALIZED_FROM_DISCOVERED_APPLICATIONS'
  | 'INITIALIZED_EMPTY_CATALOG'

export interface ApplicationsCapability {
  enabled: boolean
  scope: ApplicationsCapabilityScope
  settingKey: 'ENABLE_APPLICATIONS'
  source: ApplicationsCapabilitySource
}

export type ApplicationsCapabilityStatus = BoundNodeCapabilityStatus

export const useApplicationsCapabilityStore = createBoundNodeCapabilityStore<ApplicationsCapability>({
  id: 'applicationsCapability',
  query: GetApplicationsCapability,
  mutation: SetApplicationsEnabled,
  queryField: 'applicationsCapability',
  mutationField: 'setApplicationsEnabled',
  label: 'Applications',
})
