<template>
  <!-- The node sheet (UIS-005), opened from the node name: the node's name (never its address, autobyteus-433), its state
       with a refresh icon (or "Retry" when it is not reachable), Switch node in the Android app, and Unpair from <node>
       (REQ-013, REQ-019). -->
  <MobileBottomSheet test-id="mobile-connection-sheet" @close="$emit('close')">
    <template #header="{ titleId }">
      <div class="min-w-0 py-1">
        <h2 :id="titleId" class="truncate text-lg font-semibold text-slate-900" data-testid="mobile-connection-name">{{ nodeName }}</h2>
      </div>
    </template>
    <div class="px-4">
      <div class="flex min-h-[3.5rem] items-center justify-between gap-3">
        <span class="inline-flex items-center gap-2 text-sm font-semibold" :class="connected ? 'text-green-700' : 'text-amber-700'" data-testid="mobile-connection-status">
          <span class="h-2.5 w-2.5 rounded-full" :class="connected ? 'bg-green-500' : 'bg-amber-500'" aria-hidden="true" />
          {{ isChecking && !connected ? 'Checking…' : connected ? 'Connected' : 'Not reachable' }}
        </span>
        <button v-if="connected" type="button" class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-500 active:bg-slate-100 disabled:opacity-60" :disabled="isChecking" aria-label="Check connection" data-testid="mobile-check-connection" @click="$emit('check')">
          <Icon icon="heroicons:arrow-path-20-solid" class="h-6 w-6" :class="isChecking ? 'animate-spin motion-reduce:animate-none' : ''" aria-hidden="true" />
        </button>
        <button v-else type="button" class="h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 active:bg-slate-100 disabled:opacity-50" :disabled="isChecking" data-testid="mobile-check-connection" @click="$emit('check')">
          {{ isChecking ? 'Checking…' : 'Retry' }}
        </button>
      </div>

      <div v-if="diagnostic" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="mobile-connection-diagnostic">
        <p class="font-semibold">{{ diagnostic.title }}</p>
        <p class="mt-1">{{ diagnostic.message }}</p>
        <p class="mt-1 text-xs">{{ diagnostic.recoveryAction }}</p>
      </div>

      <!-- Only in the Android app: a browser tab has no node list to switch in. -->
      <ul v-if="shell" class="mt-2 border-y border-slate-100" data-testid="mobile-node-actions">
        <li>
          <button type="button" class="flex min-h-[3.5rem] w-full items-center gap-3 text-left active:bg-slate-50" data-testid="mobile-switch-node" @click="shell.bridge.showNodeList()">
            <Icon icon="heroicons:arrows-right-left-20-solid" class="h-5 w-5 flex-shrink-0 text-slate-500" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="block text-base font-medium leading-5 text-slate-900">Switch node</span>
              <span class="block text-[0.8125rem] leading-5 text-slate-500" data-testid="mobile-switch-node-count">
                {{ shell.nodeCount }} {{ shell.nodeCount === 1 ? 'node' : 'nodes' }} on this phone
              </span>
            </span>
            <Icon icon="heroicons:chevron-right-20-solid" class="h-5 w-5 flex-shrink-0 text-slate-400" aria-hidden="true" />
          </button>
        </li>
      </ul>

      <button type="button" class="mt-3 h-12 w-full rounded-xl text-left text-[0.9375rem] font-semibold text-red-700 active:bg-red-50" data-testid="mobile-unpair" @click="$emit('unpair')">
        Unpair from {{ nodeName }}
      </button>
    </div>
  </MobileBottomSheet>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { onMounted, ref } from 'vue';
import MobileBottomSheet from '~/components/mobile/MobileBottomSheet.vue';
import type { MobileConnectionDiagnostic } from '~/types/remoteAccess';
import { getShellBridge, type ShellBridge } from '~/utils/remoteAccess/shellBridge';

defineProps<{
  nodeName: string;
  connected: boolean;
  isChecking: boolean;
  diagnostic: MobileConnectionDiagnostic | null;
}>();
defineEmits<{ (event: 'close'): void; (event: 'check'): void; (event: 'unpair'): void }>();

/** The Android app's bridge and its node count, when the page runs in the app. */
const shell = ref<{ bridge: ShellBridge; nodeCount: number } | null>(null);

onMounted(async () => {
  const bridge = getShellBridge();
  if (!bridge) return;
  const hello = await bridge.hello();
  shell.value = { bridge, nodeCount: hello?.nodeCount ?? 1 };
});
</script>
