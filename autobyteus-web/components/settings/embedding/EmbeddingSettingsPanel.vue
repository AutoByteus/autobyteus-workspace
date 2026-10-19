<template>
  <div class="flex w-full flex-col gap-5" data-testid="settings-embedding-panel">

    <div v-if="loadStatus === 'loading'" class="flex flex-col gap-5" data-testid="embedding-loading" aria-busy="true">
      <div class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div class="h-5 w-40 animate-pulse rounded bg-gray-100"></div>
        <div class="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-gray-100"></div>
        <div class="mt-5 space-y-3">
          <div v-for="n in 3" :key="n" class="h-[116px] animate-pulse rounded-lg border border-gray-100 bg-gray-50"></div>
        </div>
      </div>
      <div class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div class="h-5 w-40 animate-pulse rounded bg-gray-100"></div>
        <div class="mt-5 space-y-3">
          <div v-for="n in 3" :key="n" class="h-10 animate-pulse rounded-lg bg-gray-50"></div>
        </div>
      </div>
    </div>

    <div v-else-if="loadStatus === 'error' || !status" class="flex items-center justify-between gap-4 rounded-3xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700" role="alert" data-testid="embedding-load-error">
      <span>{{ t('settings.search.loadError') }}</span>
      <button type="button" class="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500" data-testid="embedding-load-retry" @click="load">{{ t('settings.search.retry') }}</button>
    </div>

    <template v-else>
      <!-- A refused or failed action shows the server's reason; the next action clears it. -->
      <p v-if="actionError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert" data-testid="embedding-action-error">{{ actionError }}</p>
      <EmbeddingModelCard :status="status.models" :actions="settings" @use="switchTargetId = $event" />
      <ProjectIndexesCard
        :projects="status.projects"
        :model-name="activeModel?.displayName ?? status.models.activeModelId"
        :model-state="activeModel?.activeDisplay?.state ?? null"
        :actions="settings"
      />
    </template>

    <p class="sr-only" role="status" aria-live="polite" data-testid="embedding-announce">{{ announcement }}</p>

    <EmbeddingSwitchDialog v-if="switchTarget" :model="switchTarget" @cancel="switchTargetId = null" @confirm="confirmSwitch" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import EmbeddingModelCard from '~/components/settings/embedding/EmbeddingModelCard.vue'
import ProjectIndexesCard from '~/components/settings/embedding/ProjectIndexesCard.vue'
import EmbeddingSwitchDialog from '~/components/settings/embedding/EmbeddingSwitchDialog.vue'
import { useEmbeddingSettings } from '~/composables/settings/useEmbeddingSettings'
import { focusTestId } from './embeddingPresentation'

const { t } = useLocalization()
const settings = useEmbeddingSettings()
const { status, loadStatus, actionError, announcements, load } = settings

const activeModel = computed(() => status.value?.models.models.find((model) => model.id === status.value?.models.activeModelId) ?? null)
const switchTargetId = ref<string | null>(null)
const switchTarget = computed(() => status.value?.models.models.find((model) => model.id === switchTargetId.value) ?? null)
const announcement = computed(() => announcements.value.map(({ kind, name }) => t(`settings.search.announce.${kind}`, { name })).join(' '))

// Opening the section only reads the status (REQ-005): it starts no download or indexing.
onMounted(() => { void load() })

// After the switch, focus lands on the new Active row so keyboard users keep their place.
const confirmSwitch = async () => {
  const modelId = switchTargetId.value
  switchTargetId.value = null
  if (!modelId) return
  await nextTick()
  await settings.use(modelId)
  void focusTestId(`embedding-model-${modelId}`)
}
</script>
