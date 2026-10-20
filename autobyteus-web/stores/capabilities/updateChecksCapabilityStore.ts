import { GET_UPDATE_CHECKS_CAPABILITY, SET_UPDATE_CHECKS_ENABLED } from '~/graphql/updateNotifications'
import { createBoundNodeCapabilityStore } from '~/stores/capabilities/createBoundNodeCapabilityStore'

/** The node's "Update checks" setting: background checks of imported GitHub sources (absent = on). */
export interface UpdateChecksCapability {
  enabled: boolean
  settingKey: 'ENABLE_UPDATE_CHECKS'
  source: 'SERVER_SETTING' | 'DEFAULT_ENABLED'
}

export const useUpdateChecksCapabilityStore = createBoundNodeCapabilityStore<UpdateChecksCapability>({
  id: 'updateChecksCapability',
  query: GET_UPDATE_CHECKS_CAPABILITY,
  mutation: SET_UPDATE_CHECKS_ENABLED,
  queryField: 'updateChecksCapability',
  mutationField: 'setUpdateChecksEnabled',
  label: 'Update checks',
})
