<template>
  <span
    v-if="base && active"
    class="inline-flex items-center gap-2 text-xs"
    data-testid="personal-setting-mark"
  >
    <span class="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">{{ t('personalSettings.mark') }}</span>
    <button
      type="button"
      class="text-indigo-600 underline-offset-2 hover:underline disabled:cursor-wait disabled:opacity-60"
      data-testid="personal-setting-reset"
      :disabled="busy"
      @click="$emit('reset')"
    >
      {{ t(base === 'BUILT_IN' ? 'personalSettings.reset.builtIn' : 'personalSettings.reset.package') }}
    </button>
  </span>
</template>

<script setup lang="ts">
import { useLocalization } from '~/composables/useLocalization'
import type { PersonalSettingsBase } from '~/types/personalSettings'

/** "Personal" next to one setting, with the link that resets it to the package's (or built-in) value. */
defineProps<{
  base?: PersonalSettingsBase | null
  /** Whether this setting is currently personal. */
  active: boolean
  busy?: boolean
}>()
defineEmits<{ reset: [] }>()
const { t } = useLocalization()
</script>
