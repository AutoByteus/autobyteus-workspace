<template>
  <section class="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm" data-testid="this-node-card">
    <h3 class="text-sm font-semibold text-slate-900">{{ t(k('thisNode.title')) }}</h3>
    <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <p class="text-sm text-slate-700" data-testid="this-node-name">
        {{ nodeName }}
        <span class="ml-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
          {{ nodeTypeLabel }}
        </span>
      </p>
      <p v-if="baseUrl" class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-600" data-testid="this-node-url">
        {{ baseUrl }}
      </p>
    </div>

    <div class="mt-4 border-t border-slate-100 pt-4" data-testid="this-node-collaboration">
      <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div class="min-w-0 flex-1 basis-80">
          <h4 class="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
            <span
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg"
              :class="store.switchOn ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'"
              data-testid="this-node-collab-icon"
            >
              <RemoteCollaborationIcon size-class="h-5 w-5" />
            </span>
            {{ t(k('collab.title')) }}
          </h4>
          <p class="mt-2 text-sm text-gray-500">{{ t(k('collab.description')) }}</p>
        </div>
        <div class="inline-flex items-center gap-3">
          <span
            class="text-sm font-medium"
            :class="store.switchBusy ? 'text-slate-600' : store.switchOn ? 'text-emerald-700' : 'text-amber-700'"
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
      <p v-if="!store.switchOn && !store.switchBusy" class="mt-3 text-sm text-slate-600" data-testid="this-node-off-note">{{ t(k('collab.offNote')) }}</p>

      <div class="mt-3">
        <button
          type="button"
          class="flex items-center gap-2 rounded-md py-1 text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :aria-expanded="rulesOpen"
          data-testid="this-node-rules-toggle"
          @click="rulesOpen = !rulesOpen"
        >
          <svg class="h-4 w-4 text-slate-400 transition-transform" :class="rulesOpen ? 'rotate-90' : ''" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m7.5 4.5 5.5 5.5-5.5 5.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
          {{ t(k('rules.title')) }}
        </button>
        <div v-if="rulesOpen" class="mt-2 pl-6 text-sm text-gray-500" data-testid="this-node-rules">
          <p>{{ t(k('rules.lead')) }}</p>
          <ul class="mt-1 list-disc space-y-1 pl-5">
            <li>{{ t(k('rules.runtime')) }}</li>
            <li>{{ t(k('rules.workspace')) }}</li>
            <li>{{ t(k('rules.login')) }}</li>
            <li>{{ t(k('rules.refused')) }}</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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
