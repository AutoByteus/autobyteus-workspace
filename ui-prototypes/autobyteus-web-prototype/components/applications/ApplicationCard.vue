<template>
  <button
    type="button"
    class="group flex h-full w-full flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    @click="$emit('open', application.id)"
  >
    <div class="flex items-start gap-4">
      <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-700">
        <img
          v-if="showIcon"
          :src="resolvedIconUrl || ''"
          :alt="$t('applications.components.applications.ApplicationCard.iconAlt', { name: application.name })"
          class="h-full w-full object-cover"
          @error="iconLoadFailed = true"
        />
        <span v-else class="text-lg font-semibold tracking-wide">{{ initials }}</span>
      </div>

      <div class="min-w-0 flex-1">
        <h3 class="truncate text-lg font-semibold text-slate-900">{{ application.name }}</h3>
        <p class="mt-2 line-clamp-3 text-sm text-slate-600">{{ descriptionText }}</p>
      </div>
    </div>

    <div class="mt-5 flex items-center justify-end border-t border-slate-100 pt-4 text-sm">
      <span class="font-semibold text-blue-700 transition-colors group-hover:text-blue-800">
        {{ $t('applications.components.applications.ApplicationCard.continue') }}
      </span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import type { ApplicationCatalogEntry } from '~/stores/applicationStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { resolveApplicationAssetUrl } from '~/utils/application/applicationAssetUrl'

const props = defineProps<{
  application: ApplicationCatalogEntry
}>()

defineEmits<{
  (e: 'open', applicationId: string): void
}>()

const iconLoadFailed = ref(false)
const windowNodeContextStore = useWindowNodeContextStore()
const { t: $t } = useLocalization()

const resolvedIconUrl = computed(() => {
  if (!props.application.iconAssetPath) {
    return null
  }

  try {
    return resolveApplicationAssetUrl(
      props.application.iconAssetPath,
      windowNodeContextStore.getBoundEndpoints().rest,
    )
  } catch {
    return null
  }
})

watch(
  () => resolvedIconUrl.value,
  () => {
    iconLoadFailed.value = false
  },
)

const showIcon = computed(() => Boolean(resolvedIconUrl.value) && !iconLoadFailed.value)
const descriptionText = computed(() => props.application.description?.trim() || $t('applications.shared.noDescriptionProvided'))

const initials = computed(() => {
  const raw = props.application.name.trim()
  if (!raw) {
    return 'AP'
  }

  const parts = raw.split(/\s+/).filter(Boolean).slice(0, 2)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AP'
})
</script>
