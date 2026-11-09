<template>
  <p
    v-if="messageKey"
    class="mt-1 text-sm text-gray-500"
    data-testid="personal-settings-note"
  >
    {{ t(messageKey) }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import type { PersonalSettingsBase } from '~/types/personalSettings'

/**
 * The one note line under an editor's title for a definition whose settings can be personal
 * (a package definition, or a built-in agent). Agents name four settings; Teams and Orgs two.
 */
const props = defineProps<{
  base?: PersonalSettingsBase | null
  kind: 'agent' | 'collaboration'
}>()
const { t } = useLocalization()

const messageKey = computed(() => {
  if (!props.base) return null
  if (props.kind === 'collaboration') return 'personalSettings.note.collaboration.package'
  return props.base === 'BUILT_IN' ? 'personalSettings.note.agent.builtIn' : 'personalSettings.note.agent.package'
})
</script>
