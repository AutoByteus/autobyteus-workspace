<template>
  <article class="source-row" :aria-busy="!!pending">
    <div class="heading">
      <span class="badge">{{ t(source.isDefault ? 'skills.sources.default' : source.github ? 'skills.sources.github' : 'skills.sources.local') }}</span>
      <span class="count">{{ t('skills.components.skills.SkillSourcesModal.skills_count', { count: source.skillCount }) }}</span>
    </div>
    <p class="source-path" :title="source.path">{{ source.github?.repositoryUrl ?? source.path }}</p>
    <template v-if="source.github">
      <div class="status" :class="{ failed: source.github.lastError || source.github.status === 'REMOVING' }">
        {{ t('skills.sources.status.' + (pending ? pending.toUpperCase() : source.github.status)) }}
      </div>
      <dl class="metadata">
        <div><dt>{{ t('skills.sources.installed') }}</dt><dd :title="source.github.installedRevision">{{ source.github.installedRevision.slice(0, 10) }} · {{ source.github.defaultBranch }}</dd></div>
        <div v-if="source.github.latestRevision"><dt>{{ t('skills.sources.latest') }}</dt><dd :title="source.github.latestRevision">{{ source.github.latestRevision.slice(0, 10) }}</dd></div>
        <div v-if="source.github.latestCheckedAt"><dt>{{ t('skills.sources.checked') }}</dt><dd>{{ new Date(source.github.latestCheckedAt).toLocaleString() }}</dd></div>
      </dl>
      <p v-if="source.github.lastError" class="source-error">{{ source.github.lastError }}</p>
    </template>
    <div v-if="!source.isDefault" class="actions">
      <button v-if="source.github && source.github.status !== 'REMOVING'" :disabled="disabled" @click="$emit('check')">{{ t('skills.sources.check') }}</button>
      <button v-if="source.github && ['UPDATE_AVAILABLE', 'UPDATE_FAILED'].includes(source.github.status)" :disabled="disabled" @click="$emit('update')">{{ t('skills.sources.update') }}</button>
      <button class="remove" :disabled="disabled" @click="$emit('remove')">{{ t(source.github?.status === 'REMOVING' ? 'skills.sources.retryRemoval' : 'skills.sources.remove') }}</button>
    </div>
  </article>
</template>
<script setup lang="ts">
import type { SkillSource } from '~/stores/skillSourcesStore'
defineProps<{ source: SkillSource; pending?: string; disabled: boolean }>()
defineEmits(['check', 'update', 'remove'])
const { t } = useLocalization()
</script>
<style scoped>
.source-row { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
.heading, .actions { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.badge { border-radius: 12px; padding: .15rem .5rem; background: #e5e7eb; font-size: .75rem; color: #374151; }
.count { color: #6b7280; font-size: .75rem; }
.source-path { margin: .5rem 0; overflow-wrap: anywhere; font-family: monospace; font-size: .875rem; color: #111827; }
.status { font-size: .875rem; color: #047857; }
.failed, .source-error { color: #b91c1c; }
.source-error { font-size: .8rem; overflow-wrap: anywhere; margin-top: .5rem; }
.metadata { margin-top: .5rem; font-size: .75rem; color: #6b7280; display: flex; flex-wrap: wrap; gap: .25rem 1rem; }
.metadata div { display: flex; gap: .3rem; } dd { margin: 0; overflow-wrap: anywhere; }
.actions { margin-top: .75rem; }
button { border: 1px solid #d1d5db; background: white; border-radius: 6px; padding: .35rem .65rem; font-size: .8rem; color: #374151; }
button:hover:not(:disabled) { background: #eff6ff; border-color: #93c5fd; }
button:disabled { opacity: .5; cursor: not-allowed; } .remove { color: #b91c1c; }
button:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
</style>
