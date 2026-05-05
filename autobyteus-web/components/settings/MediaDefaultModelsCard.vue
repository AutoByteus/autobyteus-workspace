<template>
  <section
    class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
    data-testid="media-default-models-card"
  >
    <div class="mb-4 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-2xl font-semibold leading-tight text-gray-900">
          {{ t('settings.components.settings.MediaDefaultModelsCard.title') }}
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ t('settings.components.settings.MediaDefaultModelsCard.description') }}
        </p>
      </div>

      <button
        type="button"
        class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-700 transition-colors duration-150 hover:border-blue-100 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
        :disabled="!isDirty || isSaving"
        :aria-label="t('settings.components.settings.MediaDefaultModelsCard.save')"
        :title="t('settings.components.settings.MediaDefaultModelsCard.save')"
        data-testid="media-default-models-save"
        @click="save"
      >
        <span
          v-if="isSaving"
          class="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-blue-700"
        ></span>
        <Icon v-else icon="heroicons:check" class="h-4 w-4" />
      </button>
    </div>

    <div class="space-y-4">
      <div
        v-for="setting in MEDIA_DEFAULT_MODEL_SETTINGS"
        :key="setting.key"
        class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
      >
        <label class="block text-sm font-semibold text-gray-900">
          {{ t(setting.labelKey) }}
        </label>
        <p class="mt-1 text-sm text-gray-600">
          {{ t(setting.descriptionKey) }}
        </p>

        <div class="mt-3">
          <SearchableGroupedSelect
            v-model="draftValues[setting.key]"
            :options="optionsForSetting(setting)"
            :placeholder="t('settings.components.settings.MediaDefaultModelsCard.selectModel')"
            :search-placeholder="t('settings.components.settings.MediaDefaultModelsCard.searchModels')"
            :loading="isCatalogLoading"
            :disabled="isSaving"
            :data-testid="`media-default-model-select-${setting.key}`"
          />
        </div>

        <p
          v-if="isMissingFromCatalog(setting, draftValues[setting.key])"
          class="mt-2 text-xs text-amber-700"
          :data-testid="`media-default-model-stale-${setting.key}`"
        >
          {{ t('settings.components.settings.MediaDefaultModelsCard.currentValueNotInCatalog') }}
        </p>
      </div>
    </div>

    <div class="mt-4 space-y-1">
      <p class="text-xs text-gray-500" data-testid="media-default-models-note">
        {{ t('settings.components.settings.MediaDefaultModelsCard.futureUseNote') }}
      </p>
      <p v-if="isCatalogLoading" class="text-sm text-slate-500" data-testid="media-default-models-loading">
        {{ t('settings.components.settings.MediaDefaultModelsCard.loading') }}
      </p>
      <p v-if="isDirty" class="text-sm text-slate-500" data-testid="media-default-models-dirty">
        {{ t('settings.components.settings.MediaDefaultModelsCard.unsavedChanges') }}
      </p>
      <p v-if="successMessage" class="text-sm text-emerald-700" data-testid="media-default-models-success">
        {{ successMessage }}
      </p>
      <p v-if="displayErrorMessage" class="text-sm text-red-600" data-testid="media-default-models-error">
        {{ displayErrorMessage }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import SearchableGroupedSelect from '~/components/agentTeams/SearchableGroupedSelect.vue'
import { useMediaDefaultModelsCard } from '~/components/settings/useMediaDefaultModelsCard'

const {
  MEDIA_DEFAULT_MODEL_SETTINGS,
  draftValues,
  isSaving,
  isCatalogLoading,
  isDirty,
  successMessage,
  displayErrorMessage,
  optionsForSetting,
  isMissingFromCatalog,
  save,
  t,
} = useMediaDefaultModelsCard()
</script>
