<template>
  <aside
    :id="model.region.id"
    :aria-label="t(model.region.ariaLabelKey)"
    class="max-h-[38dvh] w-full shrink-0 overflow-y-auto border-b border-gray-200 bg-white md:max-h-none md:w-64 md:border-b-0 md:border-r"
    :class="isDesktopCollapsed ? 'md:hidden' : ''"
    data-testid="settings-page-navigation"
  >
    <div class="px-2 py-3 sm:px-4 sm:py-4 md:py-5">
      <nav class="w-full">
        <ul class="w-full space-y-2">
          <li class="flex w-full items-center gap-1 border-b border-gray-100 pb-2">
            <button
              type="button"
              :aria-label="t(model.backAction.ariaLabelKey)"
              :data-testid="model.backAction.testId"
              class="flex min-w-0 flex-1 items-center justify-start rounded-md px-4 py-2 text-gray-600 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              @click="emit('back')"
            >
              <Icon :icon="model.backAction.icon" class="h-5 w-5 flex-shrink-0" />
              <span class="ml-2 truncate text-sm font-medium">{{ t(model.backAction.labelKey) }}</span>
            </button>
            <button
              v-if="!isDesktopCollapsed"
              ref="toggleButtonRef"
              type="button"
              class="hidden rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:inline-flex"
              :title="t('settings.page.closeMenuLabel')"
              :aria-label="t('settings.page.closeMenuLabel')"
              :aria-controls="model.region.id"
              aria-expanded="true"
              data-testid="settings-navigation-collapse"
              @click="emit('collapse')"
            >
              <LeftPanelToggleIcon />
            </button>
          </li>

          <li
            v-for="destination in model.destinations"
            :key="destination.section"
            class="w-full"
          >
            <button
              type="button"
              :data-testid="destination.testId"
              class="group flex w-full items-center justify-start rounded-md px-4 py-2 text-gray-700 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
              :class="destination.isActive
                ? destination.section === 'server-settings'
                  ? 'font-medium text-gray-900'
                  : 'bg-gray-100 text-gray-900'
                : ''"
              :aria-current="destination.isActive ? 'page' : undefined"
              @click="emit('select-section', destination.section)"
            >
              <span class="mr-3 flex min-w-[20px] items-center">
                <span :class="[destination.iconClass, 'h-5 w-5']" aria-hidden="true"></span>
              </span>
              <span class="text-left">{{ t(destination.labelKey) }}</span>
            </button>

            <div
              v-if="destination.section === 'server-settings' && destination.isActive"
              class="ml-10 mt-1 space-y-1 pl-3"
            >
              <button
                v-for="mode in model.serverSettingsModes"
                :key="mode.mode"
                type="button"
                :data-testid="mode.testId"
                class="w-full rounded-md px-3 py-1.5 text-left text-base transition-colors duration-200"
                :class="mode.isActive
                  ? 'bg-gray-100 font-medium text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                :aria-current="mode.isActive ? 'page' : undefined"
                @click="emit('select-server-mode', mode.mode)"
              >
                {{ t(mode.labelKey) }}
              </button>
            </div>
          </li>
        </ul>
      </nav>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Icon } from '@iconify/vue';
import LeftPanelToggleIcon from '~/components/layout/LeftPanelToggleIcon.vue';
import { useLocalization } from '~/composables/useLocalization';
import type {
  ResolvedSettingsNavigation,
  ServerSettingsMode,
  SettingsSection,
  SettingsToggleFocusHandle,
} from './settingsNavigation';

defineProps<{
  model: ResolvedSettingsNavigation;
  isDesktopCollapsed: boolean;
}>();

const emit = defineEmits<{
  back: [];
  collapse: [];
  'select-section': [section: SettingsSection];
  'select-server-mode': [mode: ServerSettingsMode];
}>();

const { t } = useLocalization();
const toggleButtonRef = ref<HTMLButtonElement | null>(null);

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
