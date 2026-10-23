import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type gqlTag from 'graphql-tag'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { GET_UPDATE_AUTOMATION_SETTINGS, SET_AUTOMATIC_UPDATES, SET_UPDATE_CHECK_INTERVAL } from '~/graphql/updateNotifications'
import { NODE_KIND_OF, type NodeSourceKind, type UpdateAutomationSettings } from '~/types/updateNotifications'

type DocumentNode = ReturnType<typeof gqlTag>
type Status = 'unknown' | 'loading' | 'resolved' | 'error'
type GraphqlErrors = ReadonlyArray<{ message: string }> | undefined

const throwGraphqlErrors = (errors: GraphqlErrors): void => {
  if (errors?.length) throw new Error(errors.map((entry) => entry.message).join(', '))
}

/**
 * The bound node's check intervals and automatic-update switches (DS-004). One store: the Update checks card and the
 * Notification Center read and write the same settings. Another window's change arrives through the update-notifications
 * feed (`update_settings_changed` → `refresh`). Answers for an earlier binding are discarded.
 */
export const useUpdateAutomationStore = defineStore('updateAutomation', () => {
  const node = useWindowNodeContextStore()
  const settings = ref<UpdateAutomationSettings | null>(null)
  const status = ref<Status>('unknown')
  let pending: Promise<void> | null = null

  watch(() => node.bindingRevision, () => { settings.value = null; status.value = 'unknown'; pending = null }, { flush: 'sync' })

  async function refresh(): Promise<void> {
    const revision = node.bindingRevision
    try {
      if (!await node.waitForBoundBackendReady()) throw new Error(node.lastReadyError || 'Bound backend is not ready')
      const { data, errors } = await getApolloClient().query({ query: GET_UPDATE_AUTOMATION_SETTINGS, fetchPolicy: 'network-only' })
      throwGraphqlErrors(errors)
      if (revision !== node.bindingRevision) return
      if (!data?.updateAutomationSettings) throw new Error('Update automation settings were not returned.')
      settings.value = data.updateAutomationSettings
      status.value = 'resolved'
    } catch (cause) {
      if (revision !== node.bindingRevision) return
      // A later failed refresh keeps the last settings.
      if (status.value !== 'resolved') status.value = 'error'
      console.warn('Failed to load the update automation settings:', cause)
    }
  }

  function ensureResolved(): Promise<void> {
    if (status.value === 'resolved') return Promise.resolve()
    if (!pending) {
      status.value = 'loading'
      pending = refresh().finally(() => { pending = null })
    }
    return pending
  }

  /** One mutation; its answer is the node's whole settings. A refusal throws the node's message. */
  async function mutate(mutation: DocumentNode, field: string, variables: Record<string, unknown>): Promise<void> {
    const revision = node.bindingRevision
    const { data, errors } = await getApolloClient().mutate({ mutation, variables })
    throwGraphqlErrors(errors)
    if (revision !== node.bindingRevision) return
    const next = data?.[field] as UpdateAutomationSettings | undefined
    if (!next) throw new Error('Update automation settings were not returned.')
    settings.value = next
    status.value = 'resolved'
  }

  /** The kind's check interval in minutes (15..1440; the node refuses others). */
  const setInterval = (kind: NodeSourceKind, minutes: number): Promise<void> =>
    mutate(SET_UPDATE_CHECK_INTERVAL, 'setUpdateCheckInterval', { kind: NODE_KIND_OF[kind], minutes })

  const setAutomatic = (kind: NodeSourceKind, enabled: boolean): Promise<void> =>
    mutate(SET_AUTOMATIC_UPDATES, 'setAutomaticUpdates', { kind: NODE_KIND_OF[kind], enabled })

  const resolved = computed(() => status.value === 'resolved' ? settings.value : null)
  return { settings, status, resolved, ensureResolved, refresh, setInterval, setAutomatic }
})
