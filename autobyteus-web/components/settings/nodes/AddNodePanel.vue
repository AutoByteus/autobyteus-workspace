<template>
  <form class="border-y border-slate-200 bg-slate-50 px-5 py-3.5" data-testid="add-node-panel" @submit.prevent="submit">
    <div class="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto] md:items-start">
      <div>
        <input
          v-model="draft.address"
          type="text"
          class="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-[0.8125rem] text-slate-900 shadow-sm transition placeholder:font-sans placeholder:text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          :class="errors.address ? 'border-red-300' : ''"
          :placeholder="t(k('add.addressPlaceholder'))"
          :aria-label="t(k('add.address'))"
          :aria-invalid="Boolean(errors.address)"
          data-testid="add-node-address"
        >
        <p v-if="errors.address" class="mt-1.5 text-sm text-red-600" role="alert" data-testid="add-node-address-error">{{ errors.address }}</p>
      </div>
      <div>
        <input
          v-model="draft.name"
          type="text"
          class="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          :class="errors.name ? 'border-red-300' : ''"
          :placeholder="t(k('add.namePlaceholder'))"
          :aria-label="t(k('add.name'))"
          :aria-invalid="Boolean(errors.name)"
          data-testid="add-node-name"
        >
        <p v-if="errors.name" class="mt-1.5 text-sm text-red-600" role="alert" data-testid="add-node-name-error">{{ errors.name }}</p>
      </div>
      <NodeCollaborationSwitch
        tall
        :model-value="draft.collaborate"
        :label="t(k('add.collaborate'))"
        :hint="t(k('add.collaborate'))"
        :title="`${t(k('add.collaborate'))}. ${t(k('add.collaborateHint'))}`"
        test-id="add-node-collaborate"
        @toggle="draft.collaborate = !draft.collaborate"
      />
      <button
        type="submit"
        class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:opacity-50"
        :disabled="busy"
        data-testid="add-node-submit"
      >
        <svg v-if="!busy" class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11" stroke-linecap="round" /></svg>
        <span v-else class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
        {{ busy ? t(k('add.checking')) : t(k('add.submit')) }}
      </button>
    </div>

    <p v-if="duplicate" class="mt-3 flex items-center gap-2 text-sm text-blue-700" role="status" data-testid="add-node-duplicate"><NodeNoticeIcon tone="info" />{{ t(k('add.duplicate'), { name: duplicate }) }}</p>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import NodeCollaborationSwitch from '~/components/settings/nodes/NodeCollaborationSwitch.vue'
import NodeNoticeIcon from '~/components/settings/nodes/NodeNoticeIcon.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useNodeChangeDialogStore } from '~/stores/nodeChangeDialogStore'
import { useNodeListStore } from '~/stores/nodeListStore'
import { NODES_PAGE_KEY } from '~/utils/nodeConnectionErrorText'

/** The always-open add form (UIS-003): Address, Name, the collaboration switch (on by default), Add node. */
const { t } = useLocalization()
const k = (key: string): string => `${NODES_PAGE_KEY}${key}`
const store = useNodeListStore()
const dialog = useNodeChangeDialogStore()

const draft = reactive({ address: '', name: '', collaborate: true })
const errors = reactive({ address: '', name: '' })
const duplicate = ref('')
const busy = ref(false)

const submit = async (): Promise<void> => {
  if (busy.value) return
  errors.address = ''
  errors.name = ''
  duplicate.value = ''
  busy.value = true
  try {
    const result = await store.addNode({ address: draft.address, name: draft.name, collaborate: draft.collaborate })
    if (result.ok) {
      // Success is silent: the row appears and is highlighted; the form is ready for the next node.
      draft.address = ''
      draft.name = ''
      draft.collaborate = true
      // Reachable with the switch on: the one confirmation opens; nothing changes on any node before it (REQ-704).
      if (result.confirm) void dialog.request('connect', result.key)
    } else if (result.error === 'invalid') {
      if (result.address) errors.address = t(k('add.errorAddress'))
      if (result.name) errors.name = t(k('add.errorName'))
    } else {
      duplicate.value = result.existing
    }
  } finally {
    busy.value = false
  }
}
</script>
