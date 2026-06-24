<template>
  <nav
    data-test="workspace-primary-surface-controls"
    class="flex flex-shrink-0 items-center gap-2 overflow-x-auto border-b border-gray-200 bg-white px-2 py-2"
    :aria-label="$t('shell.workspaceSurfaces.ariaLabel')"
  >
    <button
      v-for="surface in primarySurfaceControls"
      :key="surface.name"
      type="button"
      class="whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
      :class="buttonClasses(surface.name)"
      @click="emit('select', surface.name)"
    >
      {{ surface.label }}
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  getWorkspacePrimarySurfaceOrder,
  type WorkspacePrimarySurfaceName,
} from '~/utils/layout/workspaceSurfaceOrder';

const props = defineProps<{
  activeSurface: WorkspacePrimarySurfaceName
}>();

const emit = defineEmits<{
  (event: 'select', surface: WorkspacePrimarySurfaceName): void
}>();

const { t } = useLocalization();

const primarySurfaceControls = computed(() =>
  getWorkspacePrimarySurfaceOrder().map((surface) => ({
    ...surface,
    label: t(surface.labelKey),
  })),
);

const buttonClasses = (surface: WorkspacePrimarySurfaceName): string[] => {
  return surface === props.activeSurface
    ? ['border-blue-200', 'bg-blue-50', 'text-blue-700']
    : ['border-gray-200', 'bg-white', 'text-gray-700', 'hover:bg-gray-50'];
};
</script>
