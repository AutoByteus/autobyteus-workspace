<template>
  <div class="h-full bg-white font-sans">
    <div class="h-full flex flex-col lg:flex-row">
      <aside class="w-full lg:w-80 flex-shrink-0 border-b border-gray-200 lg:border-b-0 lg:border-r">
        <MemoryIndexPanel />
      </aside>
      <main class="flex-1 min-w-0">
        <MemoryInspector />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import MemoryIndexPanel from '~/components/memory/MemoryIndexPanel.vue';
import MemoryInspector from '~/components/memory/MemoryInspector.vue';
import { useAgentMemoryIndexStore } from '~/stores/agentMemoryIndexStore';

const indexStore = useAgentMemoryIndexStore();

onMounted(() => {
  indexStore.fetchIndex();
});
</script>
