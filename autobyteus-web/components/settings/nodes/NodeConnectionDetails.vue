<template>
  <div :data-testid="`node-directions-${row.key}`">
    <div class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_max-content_1fr]">
      <div v-for="dir in directions" :key="dir.id" class="grid gap-x-6 gap-y-0.5 sm:col-span-3 sm:grid-cols-subgrid sm:items-baseline" :data-testid="`node-direction-${dir.id}-${row.key}`">
        <span class="font-medium text-slate-700">{{ dir.label }}</span>
        <span class="inline-flex items-center gap-1.5" :class="dir.toneClass">
          <span v-if="dir.checking" class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" aria-hidden="true" />
          <span v-else aria-hidden="true">{{ dir.mark }}</span>
          {{ dir.status }}
        </span>
        <span class="min-w-0 break-all font-mono text-xs text-slate-500">
          <template v-if="dir.via">{{ t(k('dir.via'), { address: dir.via }) }}</template>
          <button
            v-if="dir.id === 'out'"
            type="button"
            class="ml-2 rounded font-sans text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :data-testid="`node-change-address-${row.key}`"
            @click="startAddress"
          >{{ t(k('address.change')) }}</button>
        </span>
      </div>
    </div>

    <div v-if="editingAddress" class="mt-3 max-w-xl" :data-testid="`node-address-editor-${row.key}`">
      <label class="block text-xs font-medium text-slate-600" :for="`addr-${row.key}`">{{ t(k('address.label'), { name: row.name }) }}</label>
      <div class="mt-1 flex flex-wrap items-center gap-2">
        <input
          :id="`addr-${row.key}`"
          ref="addressInput"
          v-model="addressDraft"
          type="text"
          class="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          :data-testid="`node-address-input-${row.key}`"
          @keydown.enter.prevent="saveAddress()"
          @keydown.esc.prevent="editingAddress = false"
        >
        <button type="button" :class="primaryButton" :disabled="addressBusy" :data-testid="`node-address-save-${row.key}`" @click="saveAddress()">
          {{ addressBusy ? t(k('address.checking')) : t(k('address.save')) }}
        </button>
        <button type="button" :class="secondaryButton" @click="editingAddress = false">{{ t(k('address.cancel')) }}</button>
      </div>
      <div v-if="addressError" class="mt-2">
        <NodeAddressHint
          v-if="addressHint"
          :node="store.thisName"
          :hint="addressHint"
          :test-id="`node-address-hint-${row.key}`"
          @use="(address) => saveAddress(address)"
          @guide="emit('guide')"
        />
        <p v-else class="text-sm text-red-600" role="alert" :data-testid="`node-address-error-${row.key}`">
          {{ addressError.code === 'REMOTE_COLLABORATION_OFF' ? t(k('dir.offHere')) : failureText(t, addressError, { node: row.name }) }}
        </p>
      </div>
    </div>

    <div v-if="unfinishedSteps.length" class="mt-3 text-sm" :data-testid="`node-steps-${row.key}`">
      <p class="font-medium text-slate-700">{{ t(k('detail.steps')) }}</p>
      <ul class="mt-1 space-y-0.5">
        <li v-for="step in unfinishedSteps" :key="step.id" class="flex items-baseline gap-2 text-red-700">
          <span aria-hidden="true">✗</span>
          <span>{{ stepText(step) }}<span v-if="step.error"> — {{ failureText(t, step.error, { node: row.name, name: step.name }) }}</span></span>
        </li>
      </ul>
    </div>

    <div class="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-400">
      <span v-if="row.serverInstanceId">{{ t(k('detail.nodeId')) }} <span class="font-mono">{{ row.serverInstanceId }}</span></span>
      <span class="inline-flex items-center gap-1">
        <span v-if="checkedAt">{{ checkedAt }}</span>
        <button
          type="button"
          class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:text-slate-300"
          :disabled="view.checking"
          :title="t(k('detail.checkAgain'), { name: row.name })"
          :aria-label="t(k('detail.checkAgain'), { name: row.name })"
          :data-testid="`node-refresh-${row.key}`"
          @click="store.askAgain(row.key)"
        >
          <svg class="h-4 w-4" :class="view.checking ? 'animate-spin' : ''" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M16 10a6 6 0 1 1-1.8-4.3" stroke-linecap="round" /><path d="M16.2 3v3.2h-3.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import NodeAddressHint from '~/components/settings/nodes/NodeAddressHint.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useNodeListStore } from '~/stores/nodeListStore'
import type { NodeRow } from '~/stores/nodeRowStatus'
import type { DirState } from '~/stores/nodeRowStatus'
import type { NodeChangeStep } from '~/services/nodeCollaboration/nodeChangePlan'
import { addressHintOf, causeText, failureText, NODES_PAGE_KEY } from '~/utils/nodeConnectionErrorText'
import type { NodeSettingsFailure } from '~/utils/nodeSettingsError'

/** A row's connection details (UIS-005): both directions with the address each uses, Change address, steps, node ID. */
const props = defineProps<{ row: NodeRow }>()
const emit = defineEmits<{ guide: [] }>()

const { t, resolvedLocale } = useLocalization()
const k = (key: string): string => `${NODES_PAGE_KEY}${key}`
const store = useNodeListStore()
const view = computed(() => store.views[props.row.key]!)

const primaryButton = 'rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300'
const secondaryButton = 'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400'

const dirStatus = (dir: DirState, name: string): string => {
  switch (dir.state) {
    case 'working': return t(k('dir.working'))
    case 'offHere': return t(k('dir.offHere'))
    case 'offThere': return t(k('dir.offThere'), { name })
    case 'notRegisteredHere': return t(k('dir.notRegisteredHere'))
    case 'notRegisteredThere': return t(k('dir.notRegisteredThere'), { name })
    case 'different': return t(k('dir.different'))
    case 'checking': return t(k('dir.checking'))
    case 'unreachable': return dir.cause && dir.cause !== 'unreachable'
      ? `${t(k('dir.unreachable'))}. ${causeText(t, dir.cause, dir.host ?? '', dir.fromOther ? name : undefined)}`
      : t(k('dir.unreachable'))
  }
}

const directions = computed(() => {
  const name = props.row.name
  const viaIt = store.facts[props.row.key]?.remote?.peers.find((peer) => peer.nodeId === store.thisNodeId)?.baseUrl ?? null
  const make = (id: 'out' | 'in', label: string, dir: DirState, via: string | null) => {
    const good = dir.state === 'working'
    const info = dir.state === 'offHere' || dir.state === 'offThere' || dir.state === 'notRegisteredHere' || dir.state === 'notRegisteredThere'
    return { id, label, via, checking: dir.state === 'checking', status: dirStatus(dir, name), mark: good ? '✓' : info ? '⚠' : '✗',
      toneClass: dir.state === 'checking' ? 'text-slate-500' : good ? 'text-emerald-700' : info ? 'text-amber-700' : 'text-red-700' }
  }
  return [
    make('out', t(k('dir.thisToIt'), { name }), view.value.out, props.row.peer?.baseUrl ?? null),
    make('in', t(k('dir.itToThis'), { name }), view.value.in, viaIt),
  ]
})

const checkedAt = computed(() => {
  const at = store.facts[props.row.key]?.checkedAt
  if (!at || view.value.checking) return ''
  return t(k('detail.checkedAt'), { time: new Date(at).toLocaleTimeString(resolvedLocale.value, { hour: '2-digit', minute: '2-digit' }) })
})

// What did not happen in the last connect or finish run, while it is still not finished.
const unfinishedSteps = computed<NodeChangeStep[]>(() => {
  const step = store.unfinishedStepOf(props.row.key)
  return step && view.value.line?.kind === 'partial' ? [step] : []
})
const stepText = (step: NodeChangeStep): string => {
  const node = props.row.name
  const there = (text: string) => `${t(k('dialog.there'), { name: node })}: ${text}`
  switch (step.id) {
    case 'turnOnHere': return t(k('step.turnOnHere'))
    case 'resolveHere': case 'registerHere': return t(k('step.registerHere'), { node, name: step.name ?? node })
    case 'turnOnThere': return there(t(k('step.turnOnThere')))
    case 'resolveThere': case 'registerThere': return there(t(k('step.registerThere'), { name: step.name ?? store.thisName }))
    default: return ''
  }
}

// ---- Change address (TR-711): the address this node uses for the node; never the desktop's.
const editingAddress = ref(false)
const addressDraft = ref('')
const addressBusy = ref(false)
const addressError = ref<NodeSettingsFailure | null>(null)
const addressInput = ref<HTMLInputElement | null>(null)
const addressHint = computed(() => addressHintOf(addressError.value ?? undefined))

const startAddress = async (): Promise<void> => {
  addressDraft.value = props.row.peer?.baseUrl ?? props.row.windowAddress ?? ''
  addressError.value = null
  editingAddress.value = true
  await nextTick()
  addressInput.value?.focus()
}
const saveAddress = async (address?: string): Promise<void> => {
  if (addressBusy.value) return
  if (address) addressDraft.value = address
  addressBusy.value = true
  addressError.value = null
  const result = await store.changeAddress(props.row.key, addressDraft.value)
  addressBusy.value = false
  if (result.ok) editingAddress.value = false
  else addressError.value = result.failure
}

defineExpose({ startAddress })
</script>
