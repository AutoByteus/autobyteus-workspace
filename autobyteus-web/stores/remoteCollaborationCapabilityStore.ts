import { GetRemoteCollaborationCapability } from '~/graphql/queries/remoteCollaborationQueries'
import { SetRemoteCollaborationEnabled } from '~/graphql/mutations/remoteCollaborationMutations'
import { createBoundNodeCapabilityStore } from '~/stores/capabilities/createBoundNodeCapabilityStore'

export interface RemoteCollaborationCapability {
  enabled: boolean
  settingKey: 'ENABLE_REMOTE_COLLABORATION'
  source: 'SERVER_SETTING' | 'DEFAULT_DISABLED'
}

/** The bound node's remote collaboration switch (off by default). */
export const useRemoteCollaborationCapabilityStore = createBoundNodeCapabilityStore<RemoteCollaborationCapability>({
  id: 'remoteCollaborationCapability',
  query: GetRemoteCollaborationCapability,
  mutation: SetRemoteCollaborationEnabled,
  queryField: 'remoteCollaborationCapability',
  mutationField: 'setRemoteCollaborationEnabled',
  label: 'Remote Collaboration',
})
