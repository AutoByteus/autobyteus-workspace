<template>
  <section class="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">{{ t('settings.components.settings.NodeManager.current_window_node') }}</h3>
    <p class="mt-2 text-sm text-slate-700">
      {{ nodeName }}
      <span class="ml-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
        {{ nodeTypeLabel }}
      </span>
    </p>
    <p v-if="baseUrl" class="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
      {{ baseUrl }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { useLocalization } from '~/composables/useLocalization';

defineProps<{
  nodeName: string;
  nodeTypeLabel: string;
  baseUrl?: string;
}>();

const { t } = useLocalization();
</script>
