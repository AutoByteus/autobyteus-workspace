<template>
  <form class="border-b border-slate-200 bg-white px-5 py-4" data-testid="add-node-panel" @submit.prevent="submit">
    <div class="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto] md:items-start">
      <div>
        <input
          v-model="draft.address"
          type="text"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          :class="errors.address ? 'border-red-300' : ''"
          :placeholder="t(k('add.addressPlaceholder'))"
          :aria-label="t(k('add.address'))"
          :aria-invalid="Boolean(errors.address)"
          data-testid="add-node-address"
        >
        <p v-if="errors.address" class="mt-1 text-sm text-red-600" role="alert" data-testid="add-node-address-error">{{ errors.address }}</p>
      </div>
      <div>
        <input
          v-model="draft.name"
          type="text"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          :class="errors.name ? 'border-red-300' : ''"
          :placeholder="t(k('add.namePlaceholder'))"
          :aria-label="t(k('add.name'))"
          :aria-invalid="Boolean(errors.name)"
          data-testid="add-node-name"
        >
        <p v-if="errors.name" class="mt-1 text-sm text-red-600" role="alert" data-testid="add-node-name-error">{{ errors.name }}</p>
      </div>
      <span class="inline-flex h-[38px] items-center gap-2" :title="`${t(k('add.collaborate'))}. ${t(k('add.collaborateHint'))}`">
        <span :class="draft.collaborate ? 'text-emerald-600' : 'text-slate-400'" aria-hidden="true"><RemoteCollaborationIcon size-class="h-6 w-6" /></span>
        <button
          type="button"
          role="switch"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
          :class="draft.collaborate ? 'bg-emerald-500' : 'bg-slate-300'"
          :aria-checked="draft.collaborate"
          :aria-label="t(k('add.collaborate'))"
          data-testid="add-node-collaborate"
          @click="draft.collaborate = !draft.collaborate"
        >
          <span aria-hidden="true" class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform" :class="draft.collaborate ? 'translate-x-5' : 'translate-x-0.5'" />
        </button>
      </span>
      <button
        type="submit"
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        :disabled="busy"
        data-testid="add-node-submit"
      >
        {{ busy ? t(k('add.checking')) : t(k('add.submit')) }}
      </button>
    </div>

    <p v-if="duplicate" class="mt-3 text-sm text-blue-700" role="status" data-testid="add-node-duplicate">ⓘ {{ t(k('add.duplicate'), { name: duplicate }) }}</p>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import RemoteCollaborationIcon from '~/components/settings/nodes/RemoteCollaborationIcon.vue'
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
