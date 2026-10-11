import { onBeforeUnmount, watch, type Ref } from 'vue'
import { getDefinitionCatalogChangeFeed } from '~/services/definitionCatalog/definitionCatalogChangeFeed'

/** Keeps the node's `/ws/definition-catalog` feed open app-wide while `enabled` (the app is ready). */
export const useDefinitionCatalogChangeFeed = (enabled: Ref<boolean>): void => {
  let release: (() => void) | null = null
  watch(enabled, (value) => {
    if (value && !release) release = getDefinitionCatalogChangeFeed().retain()
    if (!value && release) { release(); release = null }
  }, { immediate: true })
  onBeforeUnmount(() => { release?.(); release = null })
}
