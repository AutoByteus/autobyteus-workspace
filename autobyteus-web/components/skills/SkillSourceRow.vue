<template>
  <li class="source-row grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 px-4 py-2.5 sm:grid-cols-[2rem_minmax(0,1fr)_4.5rem_2rem] sm:gap-x-3 sm:px-6 transition-colors hover:bg-slate-50/70"
    :aria-busy="!!pending" :data-source-kind="source.sourceKind" :data-testid="`skill-source-row-${source.sourceId}`">
    <span class="row-span-2 mt-0.5 hidden h-8 w-8 items-center justify-center self-start rounded-lg sm:flex"
      :class="source.isDefault ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'" aria-hidden="true">
      <Icon :icon="source.github ? 'mdi:github' : 'heroicons:folder'" class="h-[18px] w-[18px]" />
    </span>

    <div class="flex min-w-0 items-center gap-2">
      <span class="source-name truncate text-sm font-medium leading-5 text-slate-900" :title="name">{{ name }}</span>
      <span v-if="source.isDefault" class="shrink-0 rounded bg-blue-50 px-1.5 py-px text-[11px] font-medium leading-4 text-blue-700">{{ t('skills.sources.default') }}</span>
    </div>

    <span class="count whitespace-nowrap text-right text-[13px] leading-5 tabular-nums"
      :class="source.skillCount ? 'text-slate-700' : 'text-slate-400'" :title="source.skillCount ? undefined : t('skills.sources.noSkillsHint')">
      {{ countLabel }}
    </span>

    <div class="actions -my-1.5 flex justify-end">
      <button v-if="!source.isDefault && !isRemoving" type="button" class="remove icon-btn icon-btn-danger" :disabled="disabled"
        :title="t('skills.components.skills.SkillSourcesModal.remove_source')" :aria-label="t('skills.sources.removeNamed', { name })" @click="$emit('remove')">
        <Icon icon="heroicons:trash" class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <div class="col-start-1 col-end-4 sm:col-start-2 sm:col-end-5 mt-0.5 flex min-w-0 items-center gap-1 text-xs leading-[18px] text-slate-500">
      <span class="sr-only">{{ kindLabel }}</span>
      <span class="source-path min-w-0 truncate font-mono text-[11.5px]" :title="location">{{ location }}</span>
      <button type="button" class="copy-path -my-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :title="copied ? t('skills.sources.copied') : copyLabel" :aria-label="copied ? t('skills.sources.copied') : copyLabel" @click="copyLocation">
        <Icon :icon="copied ? 'heroicons:clipboard-document-check' : 'heroicons:clipboard-document'" class="h-3.5 w-3.5" :class="copied ? 'text-emerald-600' : ''" />
      </button>
    </div>

    <template v-if="source.github">
      <div class="github-state col-start-1 col-end-4 sm:col-start-2 sm:col-end-5 mt-1.5 flex min-h-6 min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span class="status inline-flex items-center gap-1.5 font-medium" :class="statusTone.text" role="status" :title="versionDetails">
          <Icon v-if="pending" icon="svg-spinners:ring-resize" class="h-3 w-3 text-slate-400" />
          <span v-else class="h-1.5 w-1.5 rounded-full" :class="statusTone.dot" aria-hidden="true"></span>
          {{ statusLabel }}
        </span>
        <!-- Text-only chips (user decision 2026-10-10): the label is clear without an icon. -->
        <button v-if="canUpdate" type="button" class="update row-chip border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" :disabled="disabled" @click="$emit('update')">
          {{ t('skills.sources.update') }}
        </button>
        <button v-if="isRemoving" type="button" class="retry-removal row-chip border-red-200 bg-white text-red-700 hover:bg-red-50" :disabled="disabled" @click="$emit('remove')">
          {{ t('skills.sources.retryRemoval') }}
        </button>
        <template v-if="canCheck">
          <span class="text-slate-300" aria-hidden="true">·</span>
          <button type="button" class="check text-link" :disabled="disabled"
            :aria-label="t('skills.sources.checkNamed', { name })" @click="$emit('check')">{{ t('skills.sources.tryAgain') }}</button>
        </template>
      </div>
      <p v-if="source.github.lastError" class="source-error col-start-1 col-end-4 sm:col-start-2 sm:col-end-5 mt-1 flex items-start gap-1.5 break-words text-xs leading-5 text-red-700">
        <Icon icon="heroicons:exclamation-circle-20-solid" class="mt-[3px] h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden="true" />
        <span class="min-w-0">{{ source.github.lastError }}</span>
      </p>
    </template>
  </li>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Icon } from '@iconify/vue'
import type { SkillSource } from '~/stores/skillSourcesStore'
import { skillSourceDisplayName } from '~/utils/skills/skillSourceDisplay'

const props = defineProps<{ source: SkillSource; pending?: string; disabled: boolean }>()
defineEmits(['check', 'update', 'remove'])
const { t } = useLocalization()

const name = computed(() => skillSourceDisplayName(props.source))
const location = computed(() => props.source.github?.repositoryUrl ?? props.source.path)
const kindLabel = computed(() => t(props.source.github ? 'skills.sources.github' : 'skills.sources.local'))
const copyLabel = computed(() => t(props.source.github ? 'skills.sources.copyUrl' : 'skills.sources.copyPath'))
const isRemoving = computed(() => props.source.github?.status === 'REMOVING')
const canUpdate = computed(() => !!props.source.github && ['UPDATE_AVAILABLE', 'UPDATE_FAILED'].includes(props.source.github.status))
// The Retry removal button already says what to do, so the status only names the problem.
const statusLabel = computed(() => props.pending ? t('skills.sources.status.' + props.pending.toUpperCase())
  : isRemoving.value ? t('skills.sources.status.REMOVING_SHORT') : t('skills.sources.status.' + props.source.github!.status))
// Sources are checked every time the dialog opens, so a manual check is offered only after a failed check.
const canCheck = computed(() => props.source.github?.status === 'CHECK_FAILED')
const countLabel = computed(() => props.source.skillCount === 0 ? t('skills.sources.noSkills')
  : props.source.skillCount === 1 ? t('skills.sources.oneSkill')
    : t('skills.components.skills.SkillSourcesModal.skills_count', { count: props.source.skillCount }))

const checkedLabel = computed(() => props.source.github?.latestCheckedAt
  ? new Date(props.source.github.latestCheckedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '')

// Version details are kept off the row and shown on hover over the status.
const versionDetails = computed(() => {
  const github = props.source.github
  if (!github) return undefined
  const lines = [`${t('skills.sources.installed')} ${github.installedRevision.slice(0, 10)} · ${github.defaultBranch}`]
  if (github.latestRevision) lines.push(`${t('skills.sources.latest')} ${github.latestRevision.slice(0, 10)}`)
  if (github.latestCheckedAt) lines.push(`${t('skills.sources.checked')} ${checkedLabel.value}`)
  return lines.join('\n')
})

const statusTone = computed(() => {
  if (props.pending) return { text: 'text-slate-500', dot: '' }
  switch (props.source.github?.status) {
    case 'UP_TO_DATE': return { text: 'text-slate-600', dot: 'bg-emerald-500' }
    case 'UPDATE_AVAILABLE': return { text: 'text-amber-700', dot: 'bg-amber-500' }
    case 'CHECK_FAILED':
    case 'UPDATE_FAILED':
    case 'REMOVING': return { text: 'text-red-700', dot: 'bg-red-500' }
    default: return { text: 'text-slate-500', dot: 'bg-slate-300' }
  }
})

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined
async function copyLocation() {
  try {
    await navigator.clipboard.writeText(location.value)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = false }, 1500)
  } catch { /* clipboard unavailable: the tooltip still shows the full value */ }
}
onBeforeUnmount(() => clearTimeout(copiedTimer))
</script>

<style scoped>
.icon-btn {
  display: inline-flex; height: 2rem; width: 2rem; align-items: center; justify-content: center;
  border-radius: 0.375rem; color: #94a3b8; transition: background-color .15s, color .15s;
}
.icon-btn-danger:hover:not(:disabled) { background: #fef2f2; color: #dc2626; }
.icon-btn:disabled { cursor: not-allowed; opacity: .4; }
.icon-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px #3b82f6; }
.row-chip {
  display: inline-flex; height: 1.5rem; vertical-align: middle; align-items: center; border-width: 1px; border-radius: .375rem;
  padding: 0 .5rem; font-size: .75rem; font-weight: 500; transition: background-color .15s;
}
.row-chip:disabled { cursor: not-allowed; opacity: .5; }
.row-chip:focus-visible { outline: none; box-shadow: 0 0 0 2px #3b82f6; }
.text-link { border-radius: .25rem; font-weight: 500; color: #64748b; transition: color .15s; }
.text-link:hover:not(:disabled) { color: #1e293b; text-decoration: underline; text-underline-offset: 2px; }
.text-link:disabled { cursor: not-allowed; opacity: .5; }
.text-link:focus-visible { outline: none; box-shadow: 0 0 0 2px #3b82f6; }
</style>
