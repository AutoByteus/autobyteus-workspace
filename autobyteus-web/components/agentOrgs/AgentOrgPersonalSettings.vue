<template>
  <div v-if="base" class="mt-4 space-y-2 border-t border-slate-100 pt-4" data-test="org-personal-settings">
    <PersonalSettingsNote :base="base" kind="collaboration" />
    <PersonalSettingMark :base="base" :active="isPersonal('AVATAR')" :busy="busy" @reset="reset('AVATAR')" />
    <p v-if="isPersonal('DEFAULT_LAUNCH_CONFIG') && org.defaultLaunchConfig" class="flex flex-wrap items-center gap-3 text-sm text-slate-700" data-test="org-personal-launch-config">
      <span>{{ t('personalSettings.orgLaunchConfig', { runtime: org.defaultLaunchConfig.runtimeKind ?? '', model: org.defaultLaunchConfig.llmModelIdentifier ?? '' }) }}</span>
      <PersonalSettingMark :base="base" :active="true" :busy="busy" @reset="reset('DEFAULT_LAUNCH_CONFIG')" />
    </p>
    <p v-if="resetError" class="text-sm text-red-700" role="alert">{{ resetError }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PersonalSettingMark from '~/components/definitions/PersonalSettingMark.vue'
import PersonalSettingsNote from '~/components/definitions/PersonalSettingsNote.vue'
import { useLocalization } from '~/composables/useLocalization'
import { usePersonalSettingReset } from '~/composables/usePersonalSettingReset'
import { useAgentOrgDefinitionStore, type AgentOrgDefinition } from '~/stores/agentOrgDefinitionStore'
import type { PersonalSetting } from '~/types/personalSettings'

/**
 * The Org editor's personal settings (an Org from a package): the note, the avatar's mark and
 * reset, and the runtime/model when it is personal. The editor has no runtime/model field, so a
 * personal runtime/model (captured from a package file edit) is shown here with its reset.
 */
const props = defineProps<{ org: AgentOrgDefinition; disabled?: boolean }>()
const emit = defineEmits<{ avatarReset: [avatarUrl: string] }>()
const { t } = useLocalization()
const { resetting, resetError, runReset } = usePersonalSettingReset()

const base = computed(() => props.org.personalSettingsBase ?? null)
const busy = computed(() => props.disabled || resetting.value !== null)
const isPersonal = (setting: PersonalSetting): boolean => Boolean(props.org.personalSettings?.includes(setting))
const reset = (setting: PersonalSetting) => runReset(
  setting,
  () => useAgentOrgDefinitionStore().resetPersonalSetting(props.org.id, setting),
  (updated) => { if (setting === 'AVATAR') emit('avatarReset', updated.avatarUrl || '') },
)
</script>
