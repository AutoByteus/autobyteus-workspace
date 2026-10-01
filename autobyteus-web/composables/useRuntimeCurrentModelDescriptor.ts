import { computed, ref, watch, type Ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { RuntimeCurrentModelDescriptors } from '~/graphql/queries/runtimeCurrentModelDescriptorsQueries'
import { normalizeModelConfigSchema, type UiModelConfigSchema } from '~/utils/llmConfigSchema'
import { getModelSelectionSelectedLabel } from '~/utils/modelSelectionLabel'

export type RuntimeCurrentModelDescriptor = Readonly<{
  modelIdentifier: string
  name: string
  canonicalName: string
  providerName: string
  providerType: string
  description: string | null
  configSchema: Record<string, unknown> | null
}>

export const formatRuntimeCurrentModelDisplay = (runtimeKind: string | null | undefined,
  descriptor: RuntimeCurrentModelDescriptor): string =>
  getModelSelectionSelectedLabel(descriptor.providerName, descriptor, runtimeKind)

export const loadRuntimeCurrentModelDescriptors = async (
  runtimeKind: string,
  identifiers: readonly string[],
): Promise<Record<string, RuntimeCurrentModelDescriptor | null>> => {
  const unique = [...new Set(identifiers.filter(Boolean))]
  if (!unique.length) return {}
  const { data, errors } = await getApolloClient().query<{
    runtimeCurrentModelDescriptors: Array<{ identifier: string; model: RuntimeCurrentModelDescriptor | null }>
  }>({ query: RuntimeCurrentModelDescriptors, variables: { runtimeKind, identifiers: unique }, fetchPolicy: 'network-only' })
  if (errors?.length || !Array.isArray(data?.runtimeCurrentModelDescriptors))
    throw new Error('Current model descriptors unavailable.')
  return Object.fromEntries(data.runtimeCurrentModelDescriptors.map(({ identifier, model }) => [identifier, model]))
}

/** Resolve only a caller-provided server-origin seed/current ID, never an arbitrary draft. */
export const useRuntimeCurrentModelDescriptor = (
  runtimeKind: Ref<string | null | undefined>,
  currentIdentifier: Ref<string | null | undefined>,
) => {
  const descriptor = ref<RuntimeCurrentModelDescriptor | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  watch([runtimeKind, currentIdentifier], async ([runtime, identifier], _previous, onCleanup) => {
    descriptor.value = null
    error.value = null
    if (!runtime || !identifier) {
      loading.value = false
      return
    }
    let active = true
    onCleanup(() => { active = false })
    loading.value = true
    try {
      const rows = await loadRuntimeCurrentModelDescriptors(runtime, [identifier])
      if (active) descriptor.value = rows[identifier] ?? null
    } catch (failure) {
      if (active) error.value = failure instanceof Error ? failure.message : String(failure)
    } finally {
      if (active) loading.value = false
    }
  }, { immediate: true })
  const schema = computed<UiModelConfigSchema | null>(() =>
    descriptor.value?.configSchema ? normalizeModelConfigSchema(descriptor.value.configSchema) : null)
  const selectedDisplay = computed(() => descriptor.value
    ? formatRuntimeCurrentModelDisplay(runtimeKind.value, descriptor.value) : null)
  return { descriptor, schema, selectedDisplay, loading, error }
}
