<template>
  <div>
    <div v-if="items === null" class="text-sm text-gray-500">{{ $t('memory.components.memory.SemanticTab.semantic_memory_not_available') }}</div>
    <div v-else-if="items.length === 0" class="text-sm text-gray-500">{{ $t('memory.components.memory.SemanticTab.no_semantic_entries') }}</div>
    <div v-else class="space-y-3">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="rounded-md border border-gray-200 p-3"
      >
        <pre class="text-xs text-gray-700 overflow-auto">{{ formatJson(item) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  items: Record<string, unknown>[] | null;
}>();

const formatJson = (payload: Record<string, unknown>) => {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};
</script>
