<template>
  <section class="nodes-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="node-list-card">
    <div class="px-5 pb-4 pt-5">
      <h3 class="text-base font-semibold text-slate-900">{{ t(k('list.title')) }}</h3>
      <p class="mt-1 text-sm text-slate-500">{{ t(k('list.description')) }}</p>
    </div>

    <AddNodePanel />

    <ul v-if="store.rows.length" class="divide-y divide-slate-100" data-testid="node-list">
      <NodeRow v-for="row in store.rows" :key="row.key" :row="row" @guide="emit('guide')" />
    </ul>
    <p v-else class="px-5 py-8 text-center text-sm text-slate-500" data-testid="node-list-empty">{{ t(k('list.empty')) }}</p>

    <NodeChangeDialog @guide="emit('guide')" />
  </section>
</template>

<style scoped>
/* The rows lay themselves out by the width of this card (container queries), not by the window's. */
.nodes-card { container-type: inline-size; }
</style>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import AddNodePanel from '~/components/settings/nodes/AddNodePanel.vue'
import NodeChangeDialog from '~/components/settings/nodes/NodeChangeDialog.vue'
import NodeRow from '~/components/settings/nodes/NodeRow.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useNodeChangeDialogStore } from '~/stores/nodeChangeDialogStore'
import { useNodeListStore } from '~/stores/nodeListStore'
import { NODES_PAGE_KEY } from '~/utils/nodeConnectionErrorText'

/** The "Nodes" card (UIS-001): every node once, the add form above them; each row is asked when the tab opens. */
const emit = defineEmits<{ guide: [] }>()
const { t } = useLocalization()
const k = (key: string): string => `${NODES_PAGE_KEY}${key}`
const store = useNodeListStore()
const dialog = useNodeChangeDialogStore()

onMounted(() => { void store.open() })
// Leaving the tab: answers on their way are ignored and a confirmation not running closes.
onBeforeUnmount(() => { store.close(); dialog.cancel() })
</script>
