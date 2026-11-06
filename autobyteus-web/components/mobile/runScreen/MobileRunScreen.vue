<template>
  <!-- The run screen (UIS-002, VIS-005, 014, 020). While an open is pending it shows "Opening…" only, never the
       previous target; then the open target's bar and conversation. -->
  <MobileRunTargetView
    v-if="state === 'open' && target"
    :target="target"
    :parent-name="tree.openRowParent.value?.name ?? null"
    @back="navigation.back()"
    @open-view="navigation.openView"
  />
  <section v-else class="fixed inset-0 z-10 flex h-[100dvh] flex-col bg-white text-slate-900" data-testid="mobile-run-screen" :data-state="state">
    <header class="flex h-14 flex-shrink-0 items-center border-b border-slate-200 bg-white pl-1 pr-1">
      <button type="button" class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-600 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Back to runs" data-testid="mobile-run-back" @click="navigation.back()">
        <Icon icon="heroicons:arrow-left-20-solid" class="h-6 w-6" aria-hidden="true" />
      </button>
    </header>
    <div v-if="state === 'opening'" class="flex min-h-0 flex-1 items-center justify-center" role="status" data-testid="mobile-run-opening">
      <p class="text-sm text-slate-400">Opening…</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { Icon } from '@iconify/vue';
import MobileRunTargetView from '~/components/mobile/runScreen/MobileRunTargetView.vue';
import { useMobileNavigation } from '~/composables/mobile/useMobileNavigation';
import type { useMobileRunTree } from '~/composables/mobile/useMobileRunTree';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useMobileRunOpeningStore } from '~/stores/mobileRunOpeningStore';

defineProps<{ tree: ReturnType<typeof useMobileRunTree> }>();

const navigation = useMobileNavigation();
const opening = useMobileRunOpeningStore();
const activeContext = useActiveContextStore();
const target = computed(() => activeContext.activeWorkspaceTarget);

/** `opening` is decided by the pending open, never by the target, so the previous run is never shown (MP-001). */
const state = computed<'opening' | 'open' | 'none'>(() => (opening.pending ? 'opening' : target.value ? 'open' : 'none'));

// Neither an open pending nor a target (a reload, Forward to an entry whose subject is gone): the list.
watch(state, (value) => { if (value === 'none') void navigation.toList(); }, { immediate: true });
// This screen's open did not commit: back to the list, as the desktop keeps its view.
watch(() => opening.failure, (failure) => { if (failure) void navigation.back(); });
</script>
