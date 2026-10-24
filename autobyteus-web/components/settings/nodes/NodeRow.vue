<template>
  <li class="transition-colors duration-700" :class="store.flashKey === row.key ? 'bg-blue-50/70' : ''" :data-testid="`node-row-${row.key}`">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
      <div class="flex min-w-0 flex-1 basis-60 items-start gap-3">
        <span class="mt-1.5 inline-flex h-3 w-3 flex-shrink-0 items-center justify-center" role="img" :aria-label="dotLabel" :title="dotLabel" :data-testid="`node-dot-${row.key}`">
          <span v-if="view.checking" class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
          <span v-else class="inline-block h-2.5 w-2.5 rounded-full" :class="dotClass" />
        </span>
        <div class="min-w-0 flex-1">
          <template v-if="renaming">
            <input
              ref="renameInput"
              v-model="renameDraft"
              type="text"
              class="w-full max-w-xs rounded-md border border-blue-400 bg-white px-2 py-0.5 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              :aria-label="t(k('rename.label'), { name: row.name })"
              :aria-invalid="Boolean(renameError)"
              :data-testid="`node-rename-input-${row.key}`"
              @keydown.enter.prevent="saveRename"
              @keydown.esc.prevent="cancelRename"
              @blur="saveRename"
            >
            <p v-if="renameError" class="mt-1 text-sm text-red-600" role="alert" :data-testid="`node-rename-error-${row.key}`">{{ renameError }}</p>
          </template>
          <template v-else>
            <button
              v-if="!row.isEmbedded"
              type="button"
              class="group -mx-1 inline-flex max-w-full items-center gap-1.5 rounded px-1 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              :title="t(k('row.rename'))"
              :aria-label="`${t(k('row.rename'))}: ${row.name}`"
              :data-testid="`node-name-${row.key}`"
              @click="startRename"
            >
              <span class="truncate">{{ row.name }}</span>
              <svg class="h-3.5 w-3.5 flex-shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m13.5 4.5 2 2M4 16l.7-3.1L13.8 3.8a1.4 1.4 0 0 1 2 0l.4.4a1.4 1.4 0 0 1 0 2l-9.1 9.1L4 16Z" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
            <p v-else class="truncate text-sm font-semibold text-slate-900" :data-testid="`node-name-${row.key}`">{{ row.name }}</p>
            <p class="mt-0.5 break-all font-mono text-xs text-slate-500" :data-testid="`node-url-${row.key}`">{{ shownUrl }}</p>
          </template>
        </div>
      </div>

      <div class="ml-auto flex items-center gap-3">
        <span class="inline-flex items-center gap-2">
          <span :class="collaborating ? 'text-emerald-600' : 'text-slate-400'" :title="t(k('row.agentsHint'))" role="img" :aria-label="t(k('row.agentsHint'))" :data-testid="`node-collab-icon-${row.key}`">
            <RemoteCollaborationIcon size-class="h-6 w-6" />
          </span>
          <button
            type="button"
            role="switch"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed"
            :class="[collaborating ? 'bg-emerald-500' : 'bg-slate-300', collaborating && !store.switchOn ? 'opacity-60' : '', switchDisabled ? 'opacity-50' : '']"
            :aria-checked="collaborating"
            :aria-label="t(k('row.agentsLabel'), { name: row.name })"
            :title="switchDisabled && !collaborating && !view.checking ? t(k('row.unreachableSwitch'), { name: row.name }) : undefined"
            :disabled="switchDisabled"
            :data-testid="`node-agents-switch-${row.key}`"
            @click="dialog.request(collaborating ? 'disconnect' : 'connect', row.key)"
          >
            <span aria-hidden="true" class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform" :class="collaborating ? 'translate-x-5' : 'translate-x-0.5'" />
          </button>
        </span>
        <button
          v-if="store.canOpen(row.key)"
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :title="t(k('row.openNode'), { name: row.name })"
          :aria-label="t(k('row.openNode'), { name: row.name })"
          :data-testid="`node-open-${row.key}`"
          @click="store.openNode(row.key)"
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M11 3.5h5.5V9M16.2 3.8 9.5 10.5M8 4.5H5.5A2 2 0 0 0 3.5 6.5v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V12" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <span v-else class="inline-block h-10 w-10" aria-hidden="true" />
        <button
          v-if="!row.isEmbedded"
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          :title="t(k('row.removeNode'), { name: row.name })"
          :aria-label="t(k('row.removeNode'), { name: row.name })"
          :data-testid="`node-remove-${row.key}`"
          @click="dialog.request('remove', row.key)"
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m1.5 0-.6 9a1.5 1.5 0 0 1-1.5 1.4H8.6A1.5 1.5 0 0 1 7.1 15L6.5 6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <span v-else class="inline-block h-10 w-10" aria-hidden="true" />
      </div>
    </div>

    <div v-if="view.checking || view.line" class="px-5 pl-[2.75rem]" :class="showDetails ? 'pb-1' : 'pb-4'" aria-live="polite">
      <p v-if="view.checking" class="flex items-center gap-2 text-sm text-slate-500" :data-testid="`node-line-${row.key}`">
        {{ t(k('row.checkingLine'), { name: row.name }) }}
      </p>
      <div v-else-if="view.line" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg px-3 py-2 text-sm" :class="lineClass" :data-testid="`node-line-${row.key}`">
        <p class="min-w-0 flex-1 basis-64">
          <span aria-hidden="true" class="mr-1.5">{{ view.line.tone === 'error' ? '✗' : view.line.tone === 'warn' ? '⚠' : 'ⓘ' }}</span>
          <span v-if="lineHead" class="font-medium">{{ lineHead }}</span>
          {{ ' ' }}{{ lineText }}
        </p>
        <button type="button" :class="lineButtonClass" :data-testid="`node-fix-${row.key}`" @click="runFix">{{ lineFixLabel }}</button>
      </div>
    </div>

    <div v-if="showDetails" class="px-5 pb-4 pl-[2.75rem]" :data-testid="`node-details-${row.key}`">
      <RemoteCollaborationOfferDisclosure v-model="expanded" :entries="view.offers ?? []" :label="summaryLabel" :test-id="`node-offer-${row.key}`">
        <NodeConnectionDetails ref="details" :row="row" @guide="emit('guide')" />
      </RemoteCollaborationOfferDisclosure>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import RemoteCollaborationIcon from '~/components/settings/nodes/RemoteCollaborationIcon.vue'
import NodeConnectionDetails from '~/components/settings/nodes/NodeConnectionDetails.vue'
import RemoteCollaborationOfferDisclosure from '~/components/settings/RemoteCollaborationOfferDisclosure.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useNodeChangeDialogStore } from '~/stores/nodeChangeDialogStore'
import { useNodeListStore } from '~/stores/nodeListStore'
import type { NodeRow } from '~/stores/nodeRowStatus'
import { causeText, failureText, NODES_PAGE_KEY } from '~/utils/nodeConnectionErrorText'

/** One node (UIS-002): dot, name (click to rename), address, collaboration switch, Open, Remove; one line; details. */
const props = defineProps<{ row: NodeRow }>()
const emit = defineEmits<{ guide: [] }>()

const { t } = useLocalization()
const k = (key: string): string => `${NODES_PAGE_KEY}${key}`
const store = useNodeListStore()
const dialog = useNodeChangeDialogStore()
const details = ref<InstanceType<typeof NodeConnectionDetails> | null>(null)

const view = computed(() => store.views[props.row.key]!)
const collaborating = computed(() => Boolean(props.row.peer))
const showDetails = computed(() => collaborating.value && !view.value.checking)
const expanded = computed({ get: () => Boolean(store.expanded[props.row.key]), set: (value: boolean) => { store.expanded[props.row.key] = value } })
const shownUrl = computed(() => (props.row.windowAddress ?? props.row.peer?.baseUrl ?? '').replace(/^https?:\/\//, ''))

const summaryLabel = computed(() => {
  if (view.value.offers === null) return t(k('detail.connection'))
  return view.value.offers.length ? undefined : t(k('detail.emptyOffer'), { name: props.row.name })
})

const dotClass = computed(() => view.value.different ? 'bg-red-500'
  : view.value.reachable === true ? 'bg-emerald-500'
    : view.value.reachable === false ? 'border-2 border-slate-400 bg-white' : 'bg-slate-300')
const dotLabel = computed(() => view.value.checking ? t(k('row.checking'))
  : view.value.reachable === true && !view.value.different ? t(k('row.reachable')) : t(k('row.notReachable')))

const switchDisabled = computed(() => !props.row.nodeId || view.value.checking || dialog.preparing === props.row.key
  // A node that does not answer cannot be set up; turning collaboration off stays possible.
  || (!collaborating.value && view.value.reachable !== true))

const lineClass = computed(() => view.value.line?.tone === 'error' ? 'border border-red-200 bg-red-50 text-red-900'
  : view.value.line?.tone === 'warn' ? 'border border-amber-200 bg-amber-50 text-amber-900' : '-ml-3 text-slate-600')
const lineButtonClass = computed(() => `rounded-md border px-3 py-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
  view.value.line?.tone === 'error' ? 'border-red-300 bg-white text-red-800 hover:bg-red-100'
    : view.value.line?.tone === 'warn' ? 'border-amber-300 bg-white text-amber-900 hover:bg-amber-100' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`)

const lineHead = computed(() => {
  const line = view.value.line
  if (line?.kind === 'unreachable') return t(k('line.unreachableHead'))
  if (line?.kind === 'partial') return t(k('line.partialHead'), { name: props.row.name })
  return ''
})
const lineText = computed(() => {
  const line = view.value.line
  const name = props.row.name
  switch (line?.kind) {
    case 'unreachable': return causeText(t, line.cause, line.host ?? '')
    case 'partial': return line.error ? failureText(t, line.error, { node: name, name: line.stepName }) : ''
    case 'offThere': return t(k('line.offThere'), { name })
    case 'notRegisteredThere': return t(k('line.notRegisteredThere'), { name })
    case 'different': return t(k('line.different'))
    case 'notRegisteredHereInfo': return t(k('line.notRegisteredHere'), { name })
    case 'agentsOff': return t(k('line.agentsOff'), { name })
    default: return ''
  }
})
const FIX_LABEL = { turnOnThere: 'line.fixOffThere', registerThere: 'line.fixRegisterThere', changeAddress: 'line.fixChangeAddress',
  checkAgain: 'line.fixCheckAgain', tryAgain: 'line.fixTryAgain', turnOn: 'line.fixTurnOn' } as const
const lineFixLabel = computed(() => view.value.line ? t(k(FIX_LABEL[view.value.line.fix])) : '')

/** Every button that changes another node opens the confirmation first (REQ-706); Check again asks the row again. */
const runFix = async (): Promise<void> => {
  switch (view.value.line?.fix) {
    case 'turnOn': return dialog.request('connect', props.row.key)
    case 'turnOnThere': case 'registerThere': case 'tryAgain': return dialog.request('finish', props.row.key)
    case 'checkAgain': return store.askAgain(props.row.key)
    case 'changeAddress':
      expanded.value = true
      await nextTick()
      details.value?.startAddress()
  }
}

// ---- rename: click the name, type, Enter or click away (Esc cancels)
const renaming = ref(false)
const renameDraft = ref('')
const renameError = ref('')
const renameInput = ref<HTMLInputElement | null>(null)
let renameSaving = false
const startRename = async (): Promise<void> => {
  renameDraft.value = props.row.name
  renameError.value = ''
  renaming.value = true
  await nextTick()
  renameInput.value?.focus()
  renameInput.value?.select()
}
const cancelRename = (): void => { renameSaving = true; renaming.value = false; renameError.value = ''; renameSaving = false }
const saveRename = async (): Promise<void> => {
  if (renameSaving || !renaming.value) return
  if (renameDraft.value.trim() === props.row.name) { renaming.value = false; renameError.value = ''; return }
  renameSaving = true
  const result = await store.renameNode(props.row.key, renameDraft.value)
  renameSaving = false
  if (result.ok) { renaming.value = false; renameError.value = ''; return }
  renameError.value = result.error === 'taken' ? t(k('rename.errorTaken'), { name: renameDraft.value.trim() })
    : result.failure && result.failure.code !== 'PEER_NAME_INVALID' ? failureText(t, result.failure, { node: props.row.name }) : t(k('rename.errorName'))
}
</script>
