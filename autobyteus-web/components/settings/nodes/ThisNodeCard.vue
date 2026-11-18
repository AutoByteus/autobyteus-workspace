<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="this-node-card">
    <div class="px-5 pb-4 pt-5">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t(k('thisNode.title')) }}</h3>
      <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="this-node-name">
        <span class="text-lg font-semibold leading-7 text-slate-900">{{ nodeName }}</span>
        <span class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize leading-4 text-slate-600">{{ nodeTypeLabel }}</span>
      </div>
      <p v-if="baseUrl" class="mt-0.5 break-all font-mono text-xs text-slate-500" data-testid="this-node-url">{{ baseUrl }}</p>
    </div>

    <div class="border-t border-slate-100 px-5 py-4" data-testid="this-node-collaboration">
      <div class="flex items-center justify-between gap-4">
        <h4 class="flex min-w-0 items-center gap-3 text-sm font-semibold text-slate-900">
          <span
            class="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
            :class="store.switchOn ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'"
            data-testid="this-node-collab-icon"
          >
            <RemoteCollaborationIcon size-class="h-5 w-5" />
          </span>
          {{ t(k('collab.title')) }}
        </h4>
        <div class="inline-flex flex-shrink-0 items-center gap-3">
          <span
            class="text-sm font-medium"
            :class="store.switchBusy ? 'text-slate-600' : store.switchOn ? 'text-emerald-700' : 'text-slate-500'"
            data-testid="this-node-switch-status"
          >
            {{ store.switchBusy ? t(k('collab.saving')) : store.switchOn ? t(k('collab.on')) : t(k('collab.off')) }}
          </span>
          <button
            type="button"
            role="switch"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
            :class="store.switchOn && !store.switchBusy ? 'bg-emerald-500' : 'bg-slate-300'"
            :aria-checked="store.switchOn"
            :aria-label="t(k('collab.title'))"
            :disabled="store.switchBusy"
            data-testid="this-node-switch"
            @click="store.setSwitch(!store.switchOn)"
          >
            <span aria-hidden="true" class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform" :class="store.switchOn ? 'translate-x-5' : 'translate-x-0.5'" />
          </button>
        </div>
      </div>

      <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{{ t(k('collab.description')) }}</p>
      <p v-if="!store.switchOn && !store.switchBusy" class="mt-3 flex max-w-3xl items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-700" data-testid="this-node-off-note"><NodeNoticeIcon class="mt-0.5 text-slate-400" tone="info" />{{ t(k('collab.offNote')) }}</p>

      <button
        type="button"
        class="-ml-1.5 mt-2 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :aria-expanded="rulesOpen"
        data-testid="this-node-rules-toggle"
        @click="rulesOpen = !rulesOpen"
      >
        <svg class="h-4 w-4 text-slate-400 transition-transform" :class="rulesOpen ? 'rotate-90' : ''" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m7.5 4.5 5.5 5.5-5.5 5.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        {{ t(k('rules.title')) }}
      </button>
      <div v-if="rulesOpen" class="mt-2 max-w-3xl rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600" data-testid="this-node-rules">
        <p>{{ t(k('rules.lead')) }}</p>
        <ul class="mt-1.5 list-disc space-y-1 pl-5">
          <li>{{ t(k('rules.runtime')) }}</li>
          <li>{{ t(k('rules.workspace')) }}</li>
          <li>{{ t(k('rules.login')) }}</li>
          <li>{{ t(k('rules.refused')) }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import NodeNoticeIcon from '~/components/settings/nodes/NodeNoticeIcon.vue'
import RemoteCollaborationIcon from '~/components/settings/nodes/RemoteCollaborationIcon.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useNodeListStore } from '~/stores/nodeListStore'
import { NODES_PAGE_KEY } from '~/utils/nodeConnectionErrorText'

/** "This node": its name, type and address, and its remote collaboration switch with the rules (REQ-701, REQ-709). */
defineProps<{ nodeName: string; nodeTypeLabel: string; baseUrl?: string }>()

const { t } = useLocalization()
const k = (key: string): string => `${NODES_PAGE_KEY}${key}`
const store = useNodeListStore()
const rulesOpen = ref(false)
</script>
