<template>
  <template v-if="node.nodeType === 'remote'">
    <span
      class="text-xs px-2 py-0.5 rounded"
      :class="store.pairingStateClass(node.browserPairing?.state)"
      :data-testid="`pairing-state-${node.id}`"
    >
      {{ store.pairingStateLabel(node.browserPairing?.state) }}
    </span>
    <button
      v-if="node.browserPairing?.state !== 'paired'"
      class="px-3 py-1.5 rounded-md border border-emerald-300 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
      :disabled="store.busyNodeId === node.id || !store.settings.enabled || store.requiresRestart"
      :data-testid="`pair-node-${node.id}`"
      @click="store.pairNode(node.id)"
    >
      {{
        node.browserPairing?.state === 'pairing'
          ? t('settings.components.settings.NodeManager.remoteBrowserSharing.actions.pairing')
          : t('settings.components.settings.NodeManager.remoteBrowserSharing.actions.pair')
      }}
    </button>
    <button
      v-else
      class="px-3 py-1.5 rounded-md border border-amber-300 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"
      :disabled="store.busyNodeId === node.id"
      :data-testid="`unpair-node-${node.id}`"
      @click="store.unpairNode(node.id)"
    >
      {{ t('settings.components.settings.NodeManager.remoteBrowserSharing.actions.unpair') }}
    </button>
  </template>
</template>

<script setup lang="ts">
import type { NodeProfile } from '~/types/node';
import { useLocalization } from '~/composables/useLocalization';
import { useRemoteBrowserSharingStore } from '~/stores/remoteBrowserSharingStore';

defineProps<{
  node: NodeProfile;
}>();

const store = useRemoteBrowserSharingStore();
const { t } = useLocalization();
</script>
