<template>
  <div v-if="part === 'cell' && entry && entry.connection !== 'unknown'" class="min-w-0 text-[0.8125rem] leading-5 text-slate-600" aria-live="polite" :data-testid="`node-server-${row.key}`">
    <span v-if="entry.connection === 'restarting'" class="inline-flex items-center gap-2" :data-testid="`node-server-progress-${row.key}`">
      <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" aria-hidden="true" />
      {{ t(k('update.restarting')) }}
    </span>
    <span v-else-if="entry.connection === 'unreachable'" class="text-slate-500" :data-testid="`node-server-unreachable-${row.key}`">
      {{ lastStep ? t(k('update.notReachableLast'), { version: lastStep }) : t(k('update.notReachable')) }}
    </span>
    <template v-else>
      <p class="truncate tabular-nums" :title="versionText" :data-testid="`node-server-version-${row.key}`">{{ versionText }}</p>
      <p v-if="progressText" class="mt-1 inline-flex items-center gap-2 text-slate-600" :data-testid="`node-server-progress-${row.key}`">
        <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" aria-hidden="true" />
        {{ progressText }}
      </p>
      <p v-else-if="offer" class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          type="button"
          class="h-7 rounded-md border border-blue-200 bg-blue-50 px-2.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="entry.requesting"
          :data-testid="`node-server-update-${row.key}`"
          @click="updates.requestUpdate(row.key)"
        >{{ entry.requesting ? t(k('update.starting')) : t(k('update.button'), { version: offer }) }}</button>
        <span class="text-xs text-slate-500">{{ t(k('update.sameAsApp')) }}</span>
      </p>
      <p v-else-if="status?.target?.relation === 'older' && status.inPlaceUpdate === 'available'" class="mt-0.5 text-xs text-slate-500" :data-testid="`node-server-newer-${row.key}`">
        {{ t(k('update.newerThanApp')) }}
      </p>
    </template>
  </div>

  <div
    v-else-if="part === 'notice' && notice && entry && entry.connection === 'ok'"
    class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 rounded-lg border px-3 py-2 text-sm"
    :class="notice.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'"
    :data-testid="`node-server-notice-${row.key}`"
  >
    <div class="flex min-w-0 flex-1 basis-56 items-start gap-2.5">
      <NodeNoticeIcon class="mt-0.5" :tone="notice.tone === 'ok' ? 'ok' : 'warn'" />
      <p class="min-w-0 flex-1 leading-5">{{ notice.text }}</p>
    </div>
    <button
      v-if="notice.command"
      type="button"
      class="-my-0.5 h-7 flex-shrink-0 rounded-md border border-amber-300 bg-white px-2.5 text-xs font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      :title="notice.command"
      :data-testid="`node-server-copy-${row.key}`"
      @click="copy(notice.command)"
    >{{ copied ? t(k('update.copied')) : t(k('update.copyCommand')) }}</button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import NodeNoticeIcon from '~/components/settings/nodes/NodeNoticeIcon.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useNodeListStore } from '~/stores/nodeListStore'
import type { NodeRow } from '~/stores/nodeRowStatus'
import { useNodeServerUpdateStore } from '~/stores/nodeServerUpdateStore'
import { NODES_PAGE_KEY } from '~/utils/nodeConnectionErrorText'

/**
 * A remote node's server version and in-place update (305), in two parts of its row (363): the cell in the server column
 * (version, progress, "Update to …"; a live region, so progress is announced) and the notice under the row (a result or
 * blocker, inside the row's notice live region). Only the cell asks the node, so it is asked once per row.
 */
const props = defineProps<{ row: NodeRow; part: 'cell' | 'notice' }>()
const { t } = useLocalization()
const k = (key: string): string => `${NODES_PAGE_KEY}${key}`
const list = useNodeListStore()
const updates = useNodeServerUpdateStore()

// Asked while this window reaches the node; again when this app's version (the target) becomes known.
const address = computed(() => list.reachedAddressOf(props.row))
// Only the cell asks; the notice reads the same entry.
watch(address, (reached) => { if (props.part !== 'cell') return; if (reached) updates.watch(props.row.key, reached); else updates.unwatch(props.row.key) }, { immediate: true })
watch(() => updates.target, () => { if (props.part === 'cell' && address.value) void updates.refresh(props.row.key) })
onBeforeUnmount(() => { if (props.part === 'cell') updates.unwatch(props.row.key) })

const entry = computed(() => updates.entries[props.row.key])
const status = computed(() => entry.value?.status ?? null)
const versionText = computed(() => status.value?.version ? t(k('update.version'), { version: status.value.version }) : t(k('update.versionUnknown')))

const STEP_KEYS: Record<string, string> = {
  checking: 'update.step.checking', downloading: 'update.step.downloading', preparing: 'update.step.preparing',
  restarting: 'update.step.restarting', confirming: 'update.step.restarting', rollingBack: 'update.step.restarting',
}
const progressText = computed(() => {
  const update = status.value?.update
  if (entry.value?.requesting) return t(k('update.starting'))
  if (update?.state !== 'running') return ''
  return t(k(STEP_KEYS[update.step ?? ''] ?? 'update.step.other'), { version: update.targetVersion ?? '' })
})
/** The last step this window saw, shown while the node does not answer. */
const lastStep = computed(() => status.value?.update?.state === 'running' ? status.value.update.targetVersion : null)

/** "Update to <version>": the node is older than this app, can update in place, and nothing blocks it (DEC-018). */
const offer = computed(() => {
  const current = status.value
  if (!current || current.inPlaceUpdate !== 'available' || current.updateBlocker || current.target?.relation !== 'newer') return null
  return updates.target
})

const NEW_IMAGE = 'NEEDS_NEW_IMAGE'
const commandFor = (code: string | null, version: string | null): string | undefined =>
  code === NEW_IMAGE && version ? `autobyteus-docker upgrade --all --tag ${version}` : undefined

/** One line under the version: a refusal of this window's request, a result, a blocker or the starter's message. */
const notice = computed<{ text: string; tone: 'ok' | 'warn'; command?: string } | null>(() => {
  const current = entry.value
  const answer = status.value
  if (!current || !answer || progressText.value) return null
  if (current.refusal) {
    return { text: `${t(k('update.notDone'), { version: updates.target ?? '' })} ${current.refusal.message}`, tone: 'warn',
      command: commandFor(current.refusal.code, updates.target) }
  }
  if (answer.inPlaceUpdate === 'error') return answer.message ? { text: answer.message, tone: 'warn' } : null
  if (answer.updateBlocker) return { text: answer.updateBlocker.message, tone: 'warn' }
  const update = answer.update
  const relevant = update && (current.followed || (update.targetVersion !== null && update.targetVersion === updates.target))
  if (!relevant) return null
  if (update.state === 'succeeded' && current.followed) return { text: t(k('update.succeeded'), { version: update.targetVersion ?? '' }), tone: 'ok' }
  if (update.state === 'failed' || update.state === 'refused') {
    return { text: `${t(k('update.notDone'), { version: update.targetVersion ?? '' })} ${update.message ?? ''}`.trim(), tone: 'warn',
      command: commandFor(update.code, update.targetVersion) }
  }
  return null
})

const copied = ref(false)
const copy = async (command: string): Promise<void> => {
  await navigator.clipboard?.writeText(command)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2_000)
}
</script>
