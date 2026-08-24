<template>
  <div class="h-full min-h-0 relative" data-test="terminal-panel">
    <div
      v-for="entry in cachedTerminalEntries"
      :key="`${cacheGeneration}:${entry.key}`"
      v-show="active && entry.key === activeTerminalTargetKey"
      class="h-full min-h-0"
      data-test="terminal-panel-entry"
      :data-terminal-key="entry.key"
    >
      <Terminal
        :target="entry.target"
        :active="active && entry.key === activeTerminalTargetKey"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useWindowNodeContextStore } from "~/stores/windowNodeContextStore";
import { useWorkspaceStore } from "~/stores/workspace";
import Terminal from "~/components/workspace/tools/Terminal.vue";
import type { TerminalTarget } from "~/types/terminal/TerminalTarget";
import {
  createTerminalTargetCacheScope,
  getTerminalEndpointScopeKey,
  getTerminalTargetCacheKey,
  terminalTargetFromWorkspaceMetadata,
} from "~/utils/terminalTarget";

interface CachedTerminalEntry {
  key: string;
  target: TerminalTarget | null;
}

const props = withDefaults(defineProps<{
  active?: boolean;
}>(), {
  active: false,
});

const workspaceStore = useWorkspaceStore();
const windowNodeContextStore = useWindowNodeContextStore();

const cachedTerminalEntries = ref<CachedTerminalEntry[]>([]);
const cacheGeneration = ref(0);

const terminalEndpointScope = computed(() =>
  createTerminalTargetCacheScope({
    nodeId: windowNodeContextStore.nodeId,
    terminalWs: windowNodeContextStore.boundEndpoints.terminalWs,
  }),
);

const terminalEndpointScopeKey = computed(() =>
  getTerminalEndpointScopeKey(terminalEndpointScope.value),
);

const currentTerminalTarget = computed<TerminalTarget | null>(() =>
  terminalTargetFromWorkspaceMetadata(workspaceStore.activeWorkspaceMetadata),
);

const activeTerminalTargetKey = computed(() =>
  getTerminalTargetCacheKey(
    terminalEndpointScope.value,
    currentTerminalTarget.value,
  ),
);

const snapshotCurrentTarget = (): TerminalTarget | null => {
  const target = currentTerminalTarget.value;
  return target ? { ...target } : null;
};

const ensureCurrentTerminalEntry = () => {
  if (!props.active) {
    return;
  }

  const key = activeTerminalTargetKey.value;
  if (cachedTerminalEntries.value.some((entry) => entry.key === key)) {
    return;
  }

  cachedTerminalEntries.value.push({
    key,
    target: snapshotCurrentTarget(),
  });
};

const resetCachedTerminalEntries = () => {
  cacheGeneration.value += 1;
  cachedTerminalEntries.value = [];
  ensureCurrentTerminalEntry();
};

watch(
  [() => props.active, activeTerminalTargetKey],
  ([isActive]) => {
    if (isActive) {
      ensureCurrentTerminalEntry();
    }
  },
  { immediate: true },
);

watch(
  [
    () => windowNodeContextStore.bindingRevision,
    terminalEndpointScopeKey,
  ],
  () => {
    resetCachedTerminalEntries();
  },
);
</script>
