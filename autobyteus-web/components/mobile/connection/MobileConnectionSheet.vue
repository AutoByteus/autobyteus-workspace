<template>
  <!-- The connection sheet (UIS-010, VIS-019), opened from the node name: the paired node's own name and URL, its state,
       Check connection, the peer nodes (read only: reachable or not, what they offer) and Unpair this phone. -->
  <MobileBottomSheet test-id="mobile-connection-sheet" @close="$emit('close')">
    <template #header>
      <div class="min-w-0 py-1">
        <h2 class="truncate text-lg font-semibold text-slate-900" data-testid="mobile-connection-name">{{ nodeName }}</h2>
        <p class="mt-0.5 break-all font-mono text-xs text-slate-500" data-testid="mobile-connection-url">{{ serverBaseUrl }}</p>
      </div>
    </template>
    <div class="px-4">
      <div class="flex items-center justify-between gap-3 py-3">
        <span class="inline-flex items-center gap-2 text-sm font-semibold" :class="connected ? 'text-green-700' : 'text-amber-700'" data-testid="mobile-connection-status">
          <span class="h-2.5 w-2.5 rounded-full" :class="connected ? 'bg-green-500' : 'bg-amber-500'" aria-hidden="true" />
          {{ connected ? 'Connected' : 'Not reachable' }}
        </span>
        <button type="button" class="h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 active:bg-slate-100 disabled:opacity-50" :disabled="isChecking" data-testid="mobile-check-connection" @click="$emit('check')">
          {{ isChecking ? 'Checking…' : 'Check connection' }}
        </button>
      </div>

      <div v-if="diagnostic" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="mobile-connection-diagnostic">
        <p class="font-semibold">{{ diagnostic.title }}</p>
        <p class="mt-1">{{ diagnostic.message }}</p>
        <p class="mt-1 text-xs">{{ diagnostic.recoveryAction }}</p>
      </div>

      <section v-if="peers.length" class="mt-4" aria-labelledby="mobile-peers-title" data-testid="mobile-peers">
        <h3 id="mobile-peers-title" class="text-sm font-semibold text-slate-500">Peer nodes</h3>
        <ul class="mt-1 divide-y divide-slate-100">
          <li v-for="peer in peerRows" :key="peer.nodeId" class="flex min-h-[3.5rem] items-center gap-3 py-2" data-testid="mobile-peer">
            <span class="h-2.5 w-2.5 flex-shrink-0 rounded-full" :class="peer.reachable === false ? 'bg-red-500' : peer.reachable ? 'bg-green-500' : 'bg-slate-300'" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[0.9375rem] font-medium text-slate-900">{{ peer.name }}</span>
              <span class="block truncate text-[0.8125rem] text-slate-500" data-testid="mobile-peer-detail">{{ peer.detail }}</span>
            </span>
          </li>
        </ul>
      </section>

      <button type="button" class="mt-4 h-12 w-full rounded-xl text-left text-[0.9375rem] font-semibold text-red-700 active:bg-red-50" data-testid="mobile-unpair" @click="$emit('unpair')">
        Unpair this phone
      </button>
    </div>
  </MobileBottomSheet>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import MobileBottomSheet from '~/components/mobile/MobileBottomSheet.vue';
import { useRemoteCollaborationOffersStore } from '~/stores/remoteCollaborationOffersStore';
import { useRemoteCollaborationStore } from '~/stores/remoteCollaborationStore';
import type { MobileConnectionDiagnostic } from '~/types/remoteAccess';

defineProps<{
  nodeName: string;
  serverBaseUrl: string;
  connected: boolean;
  isChecking: boolean;
  diagnostic: MobileConnectionDiagnostic | null;
}>();
defineEmits<{ (event: 'close'): void; (event: 'check'): void; (event: 'unpair'): void }>();

const peersStore = useRemoteCollaborationStore();
const offers = useRemoteCollaborationOffersStore();
const peers = computed(() => peersStore.peers);

/** Each peer with what it offers ("6 agents · 3 teams"), "Not reachable", or nothing while it is asked. */
const peerRows = computed(() => peers.value.map((peer) => {
  const offer = offers.peers[peer.nodeId];
  if (offer?.phase === 'available') {
    const agents = offer.entries.filter((entry) => entry.kind === 'agent').length;
    const teams = offer.entries.filter((entry) => entry.kind === 'agent_team').length;
    return { nodeId: peer.nodeId, name: peer.name, reachable: true, detail: `${agents} agents · ${teams} teams` };
  }
  if (offer?.phase === 'unavailable') return { nodeId: peer.nodeId, name: peer.name, reachable: false, detail: 'Not reachable' };
  return { nodeId: peer.nodeId, name: peer.name, reachable: null, detail: 'Checking…' };
}));

// The peers are read when the sheet opens, then every peer is asked at once; the rows show at once.
onMounted(async () => {
  try {
    await peersStore.load();
  } catch {
    return;
  }
  offers.askAll(peersStore.peers);
});
</script>
