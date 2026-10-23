<template>
  <Teleport to="body">
    <div v-if="plan" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4" data-testid="node-change-overlay" @keydown.esc="onEscape">
      <div
        class="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-busy="plan.phase === 'running'"
        :data-testid="`node-change-dialog-${plan.kind}`"
      >
        <h3 :id="titleId" class="flex items-center gap-2.5 text-lg font-semibold" :class="plan.kind === 'remove' ? 'text-red-700' : 'text-gray-900'">
          <RemoteCollaborationIcon v-if="plan.kind !== 'remove'" size-class="h-6 w-6 flex-shrink-0 text-emerald-600" />
          {{ t(k(TEXT[kind].title), { name: plan.target.name }) }}
        </h3>
        <p class="mt-2 text-sm text-gray-600">{{ t(k(TEXT[kind].lead), { name: plan.target.name }) }}</p>

        <div class="mt-4 space-y-4">
          <section v-for="group in groups" :key="group.id" :data-testid="`node-change-group-${group.id}`">
            <h4 v-if="group.title" class="text-xs font-semibold text-slate-500">{{ group.title }}</h4>
            <ul :class="group.title ? 'mt-1.5 space-y-2' : 'space-y-2'">
              <li v-for="line in group.lines" :key="line.step.id" class="flex items-start gap-2.5 text-sm" :data-testid="`node-change-step-${line.step.id}`">
                <span class="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center text-xs" :class="markClass(line.status)" :aria-label="statusLabel(line.status)">
                  <span v-if="line.status === 'running'" class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                  <template v-else>{{ mark(line.status) }}</template>
                </span>
                <div class="min-w-0 flex-1">
                  <p :class="line.status === 'failed' ? 'text-red-800' : 'text-slate-800'">{{ stepText(line.step) }}</p>
                  <span
                    v-if="line.step.wanted && line.step.name && line.step.name !== line.step.wanted"
                    class="mt-0.5 block text-xs text-slate-500"
                    :data-testid="`node-change-name-taken-${line.step.id}`"
                  >{{ t(k('step.nameTaken'), { wanted: line.step.wanted }) }}</span>
                  <p v-if="line.step.id === 'registerThere' && addressLine(line) && line.status !== 'failed'" class="mt-0.5 text-xs text-slate-500" :data-testid="`node-change-address-${line.step.id}`">
                    {{ addressLine(line) }}
                  </p>
                  <div v-if="line.status === 'failed' && line.error" class="mt-2">
                    <NodeAddressHint
                      v-if="hintOf(line)"
                      :node="line.resolve?.id === 'resolveHere' ? plan.here.name : plan.target.name"
                      :hint="hintOf(line)!"
                      :test-id="`node-change-hint-${line.step.id}`"
                      @use="(address) => dialog.useAddress(line.resolve!.id, address)"
                      @guide="goGuide"
                    />
                    <p v-else class="text-sm text-red-700" role="alert" :data-testid="`node-change-error-${line.step.id}`">{{ errorOf(line) }}</p>
                  </div>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <p v-if="plan.phase === 'failed'" class="mt-4 text-sm text-slate-700" role="status" data-testid="node-change-partial">
          {{ removeLeftThere ? t(k('dialog.removeFailedThere'), { name: plan.target.name }) : t(k('dialog.partial')) }}
        </p>
        <p v-else-if="plan.kind === 'disconnect'" class="mt-4 text-sm text-slate-600">{{ t(k('dialog.offNote'), { name: plan.target.name }) }}</p>
        <p v-else-if="plan.kind === 'remove'" class="mt-4 text-sm text-slate-600">{{ t(k('dialog.removeNote')) }}</p>
        <p v-if="plan.kind === 'connect' || plan.kind === 'finish'" class="mt-4 text-xs text-slate-500" data-testid="node-change-trusted">{{ t(k('dialog.trusted')) }}</p>

        <div class="mt-6 flex justify-end gap-3">
          <template v-if="plan.phase === 'failed'">
            <button type="button" :class="cancelButton" data-testid="node-change-close" @click="dialog.cancel()">{{ t(k('dialog.close')) }}</button>
            <button v-if="plan.kind !== 'remove'" type="button" :class="confirmClass" data-testid="node-change-retry" @click="dialog.confirm()">{{ t(k('dialog.tryAgain')) }}</button>
          </template>
          <template v-else>
            <button type="button" :class="cancelButton" :disabled="busy" data-testid="node-change-cancel" @click="dialog.cancel()">{{ t(k('dialog.cancel')) }}</button>
            <button ref="confirmButton" type="button" :class="confirmClass" :disabled="busy" data-testid="node-change-confirm" @click="dialog.confirm()">
              {{ busy ? t(k('dialog.working')) : t(k(TEXT[kind].confirm)) }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import RemoteCollaborationIcon from '~/components/settings/nodes/RemoteCollaborationIcon.vue'
import NodeAddressHint from '~/components/settings/nodes/NodeAddressHint.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useNodeChangeDialogStore } from '~/stores/nodeChangeDialogStore'
import type { NodeChangeStep, NodeChangeStepStatus } from '~/services/nodeCollaboration/nodeChangePlan'
import { addressHintOf, failureText, NODES_PAGE_KEY } from '~/utils/nodeConnectionErrorText'

/**
 * The one confirmation (UIS-004) for turn on, finish, turn off and remove: every change on both nodes, grouped by
 * the node it happens on, then each step while it runs, a partial result and Try again. Looking up an address is
 * part of the register line it serves (its address, or why none was found).
 */
const emit = defineEmits<{ guide: [] }>()
const { t } = useLocalization()
const k = (key: string): string => `${NODES_PAGE_KEY}${key}`
const dialog = useNodeChangeDialogStore()
const plan = computed(() => dialog.plan)
const confirmButton = ref<HTMLButtonElement | null>(null)
const titleId = 'node-change-title'

watch(plan, async (current, previous) => { if (current && current !== previous) { await nextTick(); confirmButton.value?.focus() } })

const TEXT = {
  connect: { title: 'dialog.onTitle', lead: 'dialog.onLead', confirm: 'dialog.confirmOn' },
  finish: { title: 'dialog.fixTitle', lead: 'dialog.fixLead', confirm: 'dialog.confirmFix' },
  disconnect: { title: 'dialog.offTitle', lead: 'dialog.offLead', confirm: 'dialog.confirmOff' },
  remove: { title: 'dialog.removeTitle', lead: 'dialog.removeLead', confirm: 'dialog.confirmRemove' },
} as const
const kind = computed(() => plan.value!.kind as keyof typeof TEXT)
const busy = computed(() => plan.value?.phase === 'running')

const cancelButton = 'rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50'
const confirmClass = computed(() => `inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 ${
  plan.value?.kind === 'remove' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`)

interface Line { step: NodeChangeStep; resolve?: NodeChangeStep; status: NodeChangeStepStatus; error?: NodeChangeStep['error'] }

const SIDE: Partial<Record<NodeChangeStep['id'], 'here' | 'there'>> = {
  turnOnHere: 'here', registerHere: 'here', removeHere: 'here', turnOnThere: 'there', registerThere: 'there', removeThere: 'there',
}

/** The visible lines: a register line carries its address lookup (status, error) before its own. */
const lines = computed<Line[]>(() => {
  const steps = plan.value?.steps ?? []
  return steps.filter((step) => step.id !== 'resolveHere' && step.id !== 'resolveThere').map((step) => {
    const resolve = step.id === 'registerHere' ? steps.find((entry) => entry.id === 'resolveHere')
      : step.id === 'registerThere' ? steps.find((entry) => entry.id === 'resolveThere') : undefined
    if (resolve && (resolve.status === 'failed' || resolve.status === 'running') && step.status !== 'done') {
      return { step, resolve, status: resolve.status === 'failed' ? 'failed' : (busy.value ? 'running' : 'todo'), error: resolve.error }
    }
    return { step, resolve, status: step.status, error: step.error }
  })
})

const groups = computed(() => {
  const p = plan.value!
  // Turning off and removing are short: one plain list, each line names its node.
  if (p.kind === 'disconnect' || p.kind === 'remove') return [{ id: 'all', title: '', lines: lines.value }]
  return [
    { id: 'here', title: t(k('dialog.here'), { name: p.here.name }), lines: lines.value.filter((line) => SIDE[line.step.id] === 'here') },
    { id: 'there', title: t(k('dialog.there'), { name: p.target.name }), lines: lines.value.filter((line) => SIDE[line.step.id] === 'there') },
  ].filter((group) => group.lines.length)
})

const stepText = (step: NodeChangeStep): string => {
  const node = plan.value!.target.name
  switch (step.id) {
    case 'turnOnHere': return t(k('step.turnOnHere'))
    case 'registerHere': return t(k('step.registerHere'), { node, name: step.name ?? '' })
    case 'turnOnThere': return t(k('step.turnOnThere'))
    case 'registerThere': return t(k('step.registerThere'), { name: step.name ?? '' })
    case 'removeHere': return t(k('step.unregisterHere'), { node })
    case 'removeThere': return t(k('step.unregisterThere'), { node })
    case 'removeFromList': return t(k('step.removeFromList'), { node })
    default: return ''
  }
}

/** DEC-709 (b): the address the other node will use, or that it finds it once its collaboration is on. */
const addressLine = (line: Line): string => {
  const node = plan.value!.target.name
  const resolve = line.resolve
  if (!resolve || line.step.status === 'done' && !resolve.address) return ''
  if (resolve.address) return t(k('step.address'), { node, address: resolve.address })
  if (resolve.findsLater && resolve.status !== 'running') return t(k('step.findsLater'), { node })
  return t(k('step.finding'), { node })
}

const hintOf = (line: Line) => line.resolve && line.error === line.resolve.error ? addressHintOf(line.error) : null
const errorOf = (line: Line): string => {
  const p = plan.value!
  const fromNode = line.resolve?.id === 'resolveThere' || SIDE[line.step.id] === 'there' ? p.target.name : undefined
  return failureText(t, line.error!, { node: p.target.name, fromNode: line.resolve ? fromNode : undefined, name: line.step.name })
}

const removeLeftThere = computed(() => plan.value?.kind === 'remove'
  && plan.value.steps.some((step) => step.id === 'removeThere' && step.status === 'failed'))

const inConfirm = computed(() => plan.value?.phase === 'confirm')
const mark = (status: NodeChangeStepStatus): string => inConfirm.value && status !== 'failed' ? '•'
  : status === 'done' ? '✓' : status === 'failed' ? '✗' : status === 'notRun' ? '○' : '•'
const markClass = (status: NodeChangeStepStatus): string => inConfirm.value && status !== 'failed' ? 'text-slate-400'
  : status === 'done' ? 'font-bold text-emerald-600' : status === 'failed' ? 'font-bold text-red-600' : 'text-slate-400'
const statusLabel = (status: NodeChangeStepStatus): string => inConfirm.value && status !== 'failed' ? ''
  : status === 'done' ? t(k('step.done')) : status === 'failed' ? t(k('step.failed')) : status === 'notRun' ? t(k('step.notRun')) : ''

const onEscape = (): void => dialog.cancel()
const goGuide = (): void => { dialog.cancel(); emit('guide') }
</script>
