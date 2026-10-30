<template>
  <div v-if="entry && entry.connection !== 'unknown'" class="-mt-2 px-5 pb-3 pl-[2.75rem]" aria-live="polite" :data-testid="`node-server-${row.key}`">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-600">
      <span v-if="entry.connection === 'restarting'" class="inline-flex items-center gap-2" :data-testid="`node-server-progress-${row.key}`">
        <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" aria-hidden="true" />
        {{ t(k('update.restarting')) }}
      </span>
      <span v-else-if="entry.connection === 'unreachable'" :data-testid="`node-server-unreachable-${row.key}`">
        {{ lastStep ? t(k('update.notReachableLast'), { version: lastStep }) : t(k('update.notReachable')) }}
      </span>
      <template v-else>
        <span class="font-medium text-slate-700" :data-testid="`node-server-version-${row.key}`">{{ versionText }}</span>
        <span v-if="progressText" class="inline-flex items-center gap-2" :data-testid="`node-server-progress-${row.key}`">
          <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" aria-hidden="true" />
          {{ progressText }}
        </span>
        <template v-else-if="offer">
          <button
            type="button"
            class="rounded-md border border-blue-300 bg-white px-2.5 py-0.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="entry.requesting"
            :data-testid="`node-server-update-${row.key}`"
            @click="updates.requestUpdate(row.key)"
          >{{ entry.requesting ? t(k('update.starting')) : t(k('update.button'), { version: offer }) }}</button>
          <span class="text-xs text-slate-500">{{ t(k('update.sameAsApp')) }}</span>
        </template>
        <span v-else-if="status?.target?.relation === 'older' && status.inPlaceUpdate === 'available'" class="text-xs text-slate-500" :data-testid="`node-server-newer-${row.key}`">
          {{ t(k('update.newerThanApp')) }}
        </span>
      </template>
    </div>
    <p v-if="notice && entry.connection === 'ok'" class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" :class="notice.tone === 'ok' ? 'text-emerald-700' : 'text-amber-800'" :data-testid="`node-server-notice-${row.key}`">
      <span>{{ notice.text }}</span>
      <button
        v-if="notice.command"
        type="button"
        class="rounded-md border border-amber-300 bg-white px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :title="notice.command"
        :data-testid="`node-server-copy-${row.key}`"
        @click="copy(notice.command)"
      >{{ copied ? t(k('update.copied')) : t(k('update.copyCommand')) }}</button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useNodeListStore } from '~/stores/nodeListStore'
import type { NodeRow } from '~/stores/nodeRowStatus'
import { useNodeServerUpdateStore } from '~/stores/nodeServerUpdateStore'
import { NODES_PAGE_KEY } from '~/utils/nodeConnectionErrorText'

/** A remote node's server version and in-place update, under its row (design DS-001, DS-005, "Row states"). */
const props = defineProps<{ row: NodeRow }>()
const { t } = useLocalization()
const k = (key: string): string => `${NODES_PAGE_KEY}${key}`
const list = useNodeListStore()
const updates = useNodeServerUpdateStore()

// Asked while this window reaches the node; again when this app's version (the target) becomes known.
const address = computed(() => list.reachedAddressOf(props.row))
watch(address, (reached) => { if (reached) updates.watch(props.row.key, reached); else updates.unwatch(props.row.key) }, { immediate: true })
watch(() => updates.target, () => { if (address.value) void updates.refresh(props.row.key) })
onBeforeUnmount(() => updates.unwatch(props.row.key))

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
