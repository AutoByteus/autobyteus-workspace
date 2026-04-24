<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4">
    <div class="mb-3 flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-900">{{ member.memberName }}</p>
        <p class="text-xs text-slate-500">{{ member.memberRouteKey }}</p>
      </div>
      <span v-if="hasOverride" class="rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
        {{ $t('applications.components.applications.ApplicationTeamMemberOverrideItem.overrideActive') }}
      </span>
    </div>

    <div class="space-y-3">
      <label class="block">
        <span class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          {{ $t('applications.components.applications.ApplicationTeamMemberOverrideItem.runtimeOverride') }}
        </span>
        <select
          :value="member.runtimeKind"
          :disabled="disabled || !allowRuntimeOverride"
          class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          @change="updateRuntimeKind(($event.target as HTMLSelectElement).value)"
        >
          <option value="">
            {{ $t('applications.components.applications.ApplicationTeamMemberOverrideItem.inheritGlobalRuntime') }}
          </option>
          <option
            v-for="option in runtimeOptions"
            :key="option.value"
            :value="option.value"
            :disabled="!option.enabled"
          >
            {{ option.label }}
          </option>
        </select>
      </label>

      <div v-if="selectedRuntimeUnavailableReason" class="text-xs text-amber-600">
        {{ selectedRuntimeUnavailableReason }}
      </div>

      <div v-if="isUnresolvedInheritedModel" class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        {{ unresolvedInheritedModelMessage }}
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          {{ $t('applications.components.applications.ApplicationTeamMemberOverrideItem.modelOverride') }}
        </label>
        <SearchableGroupedSelect
          :model-value="member.llmModelIdentifier"
          :options="groupedModelOptions"
          :disabled="disabled || !allowModelOverride"
          :placeholder="modelPlaceholder"
          search-placeholder="Search models..."
          @update:model-value="updateModel"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SearchableGroupedSelect from '~/components/agentTeams/SearchableGroupedSelect.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useRuntimeScopedModelSelection } from '~/composables/useRuntimeScopedModelSelection'
import type { ApplicationTeamMemberProfileDraft } from '~/utils/application/applicationLaunchProfile'
import { buildUnavailableInheritedModelMessage } from '~/utils/teamRunConfigUtils'

const props = withDefaults(defineProps<{
  member: ApplicationTeamMemberProfileDraft
  globalRuntimeKind: string
  globalLlmModelIdentifier: string
  allowRuntimeOverride?: boolean
  allowModelOverride?: boolean
  disabled?: boolean
}>(), {
  allowRuntimeOverride: false,
  allowModelOverride: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:member', value: ApplicationTeamMemberProfileDraft): void
}>()

const { t: $t } = useLocalization()

const effectiveRuntimeKind = computed(() => props.member.runtimeKind || props.globalRuntimeKind)
const {
  groupedModelOptions,
  hasModelIdentifier,
  runtimeOptions,
  selectedRuntimeUnavailableReason,
} = useRuntimeScopedModelSelection({
  runtimeKind: effectiveRuntimeKind,
  allowBlankRuntime: false,
})

const hasOverride = computed(() => Boolean(props.member.runtimeKind || props.member.llmModelIdentifier))
const isUnresolvedInheritedModel = computed(() => (
  Boolean(props.member.runtimeKind)
  && !props.member.llmModelIdentifier
  && Boolean(props.globalLlmModelIdentifier)
  && !hasModelIdentifier(props.globalLlmModelIdentifier)
))
const unresolvedInheritedModelMessage = computed(() => buildUnavailableInheritedModelMessage({
  globalLlmModelIdentifier: props.globalLlmModelIdentifier,
  runtimeKind: effectiveRuntimeKind.value,
  memberName: props.member.memberName,
}))
const modelPlaceholder = computed(() => (
  isUnresolvedInheritedModel.value
    ? $t('applications.components.applications.ApplicationTeamMemberOverrideItem.chooseCompatibleModel')
    : $t('applications.components.applications.ApplicationTeamMemberOverrideItem.inheritGlobalModel')
))

const updateRuntimeKind = (value: string) => {
  emit('update:member', {
    ...props.member,
    runtimeKind: value,
    llmModelIdentifier: '',
  })
}

const updateModel = (value: string) => {
  emit('update:member', {
    ...props.member,
    llmModelIdentifier: value,
  })
}
</script>
