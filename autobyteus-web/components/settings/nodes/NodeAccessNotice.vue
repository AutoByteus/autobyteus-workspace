<template>
  <div
    v-if="entryId && state === 'needs_connecting'"
    class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    :data-testid="`node-access-${row.key}`"
  >
    <div class="flex items-start gap-2.5">
      <NodeNoticeIcon class="mt-0.5" tone="warn" />
      <p class="min-w-0 flex-1 leading-5">
        <span class="font-medium">{{ t(k('access.needsConnecting')) }}</span>
        {{ ' ' }}{{ t(k('access.needsConnectingText'), { name: row.name }) }}
      </p>
    </div>
    <form class="mt-2 flex flex-wrap items-center gap-2 pl-6" @submit.prevent="connect">
      <label class="sr-only" :for="`setup-code-${row.key}`">{{ t(k('access.codeLabel'), { name: row.name }) }}</label>
      <input
        :id="`setup-code-${row.key}`"
        v-model="code"
        type="text"
        autocomplete="off"
        spellcheck="false"
        class="h-8 w-56 rounded-md border border-amber-300 bg-white px-2 font-mono text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        :placeholder="t(k('access.codePlaceholder'))"
        :data-testid="`node-access-code-${row.key}`"
      >
      <button
        type="submit"
        class="h-8 rounded-md border border-amber-300 bg-white px-3 text-xs font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
        :disabled="busy || !code.trim()"
        :data-testid="`node-access-connect-${row.key}`"
      >{{ busy ? t(k('access.connecting')) : t(k('access.connect')) }}</button>
    </form>
    <p v-if="error" class="mt-1.5 pl-6 text-sm text-red-700" role="alert" :data-testid="`node-access-error-${row.key}`">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import NodeNoticeIcon from '~/components/settings/nodes/NodeNoticeIcon.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useNodeAccessStore } from '~/stores/nodeAccessStore'
import { useNodeListStore } from '~/stores/nodeListStore'
import type { NodeRow } from '~/stores/nodeRowStatus'
import { causeText, NODES_PAGE_KEY } from '~/utils/nodeConnectionErrorText'

/**
 * A remote or Docker node this desktop holds no credential for (autobyteus-437 NAS-02, NAS-30): "Needs connecting",
 * where to get a setup code on the node's computer, and the code field. Connected, the row is asked again.
 */
const props = defineProps<{ row: NodeRow }>()
const { t } = useLocalization()
const k = (key: string): string => `${NODES_PAGE_KEY}${key}`
const access = useNodeAccessStore()
const list = useNodeListStore()

const entryId = computed(() => (props.row.isEmbedded ? null : props.row.entryIds[0] ?? null))
const state = computed(() => (entryId.value ? access.stateOf(entryId.value) : null))
const code = ref('')
const busy = ref(false)
const error = ref('')

const connect = async (): Promise<void> => {
  if (!entryId.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const result = await access.connect(entryId.value, code.value)
    if (result.ok) {
      code.value = ''
      list.askAgain(props.row.key)
      return
    }
    error.value = result.code === 'NODE_SETUP_CODE_INVALID' ? t(k('access.errorCode'))
      : result.code === 'NODE_NETWORK_REFUSED' ? causeText(t, 'network_refused', '')
        : t(k('access.errorOther'), { name: props.row.name, message: result.message })
  } finally {
    busy.value = false
  }
}
</script>
