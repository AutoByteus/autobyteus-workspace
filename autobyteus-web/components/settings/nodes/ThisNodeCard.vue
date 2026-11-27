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
      <h4 class="flex min-w-0 items-center gap-3 text-sm font-semibold text-slate-900">
        <span class="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600" data-testid="this-node-collab-icon">
          <RemoteCollaborationIcon size-class="h-5 w-5" />
        </span>
        {{ t(k('collab.title')) }}
      </h4>

      <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{{ t(k('collab.description')) }}</p>

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
import RemoteCollaborationIcon from '~/components/settings/nodes/RemoteCollaborationIcon.vue'
import { useLocalization } from '~/composables/useLocalization'
import { NODES_PAGE_KEY } from '~/utils/nodeConnectionErrorText'

/** "This node": its name, type and address, and how its agents collaborate with paired nodes (REQ-701; no switch, 661 D-4). */
defineProps<{ nodeName: string; nodeTypeLabel: string; baseUrl?: string }>()

const { t } = useLocalization()
const k = (key: string): string => `${NODES_PAGE_KEY}${key}`
const rulesOpen = ref(false)
</script>
