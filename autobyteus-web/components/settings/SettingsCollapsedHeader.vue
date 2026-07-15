<template>
  <header
    class="hidden items-center gap-3 border-b border-gray-200 px-1 pb-3 md:flex"
    data-testid="settings-collapsed-header"
  >
    <button
      ref="toggleButtonRef"
      type="button"
      class="inline-flex rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      :title="t('settings.page.openMenuLabel')"
      :aria-label="t('settings.page.openMenuLabel')"
      :aria-controls="SETTINGS_NAVIGATION_REGION_ID"
      aria-expanded="false"
      data-testid="settings-navigation-expand"
      @click="emit('expand')"
    >
      <LeftPanelToggleIcon />
    </button>
    <h1 class="min-w-0 truncate text-base font-semibold text-gray-800">
      {{ activeContextLabel }}
    </h1>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import LeftPanelToggleIcon from '~/components/layout/LeftPanelToggleIcon.vue';
import { useLocalization } from '~/composables/useLocalization';
import {
  SETTINGS_NAVIGATION_REGION_ID,
  type SettingsActiveContext,
  type SettingsToggleFocusHandle,
} from './settingsNavigation';

const props = defineProps<{
  context: SettingsActiveContext;
}>();

const emit = defineEmits<{
  expand: [];
}>();

const { t } = useLocalization();
const toggleButtonRef = ref<HTMLButtonElement | null>(null);
const activeContextLabel = computed(() => {
  const primaryLabel = t(props.context.primaryLabelKey);
  return props.context.secondaryLabelKey
    ? `${primaryLabel} — ${t(props.context.secondaryLabelKey)}`
    : primaryLabel;
});

const focusToggle = (): boolean => {
  const button = toggleButtonRef.value;
  if (!button || button.disabled || button.getClientRects().length === 0) {
    return false;
  }

  button.focus();
  return button.ownerDocument.activeElement === button;
};

defineExpose<SettingsToggleFocusHandle>({ focusToggle });
</script>
