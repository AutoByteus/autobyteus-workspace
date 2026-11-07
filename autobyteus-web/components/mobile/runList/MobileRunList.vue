<template>
  <!-- The phone's only main screen (UIS-001, VIS-001…004, 021…025): the node button, the not-reachable banner, the
       unsupported-route notice, your runs with their delegated work, the fold and the round "+". -->
  <section class="fixed inset-0 flex h-[100dvh] flex-col bg-white text-slate-900" data-testid="mobile-run-list">
    <header class="flex h-14 flex-shrink-0 items-center border-b border-slate-200 bg-white pl-2 pr-3">
      <button
        type="button"
        class="flex h-12 min-w-0 items-center gap-2.5 rounded-xl pl-2 pr-3 text-left active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-haspopup="dialog"
        :aria-label="`${nodeName}, ${connectionLabel}. Connection`"
        data-testid="mobile-node-button"
        @click="$emit('open-connection')"
      >
        <span class="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <Icon icon="heroicons:computer-desktop-20-solid" class="h-5 w-5" aria-hidden="true" />
          <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white" :class="connected ? 'bg-green-500' : 'bg-amber-500'" data-testid="mobile-connection-dot" />
        </span>
        <span class="min-w-0">
          <span class="block truncate text-base font-semibold leading-5" data-testid="mobile-node-name">{{ nodeName }}</span>
          <span class="block truncate text-xs leading-4" :class="connected ? 'text-slate-500' : 'font-medium text-amber-700'" data-testid="mobile-node-state">{{ connectionLabel }}</span>
        </span>
        <Icon icon="heroicons:chevron-down-20-solid" class="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
      </button>
    </header>

    <div v-if="!connected" class="flex flex-shrink-0 items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert" data-testid="mobile-node-offline-banner" :data-connection="connection">
      <Icon icon="heroicons:exclamation-triangle-20-solid" class="h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
      <p v-if="connection === 'phone_access_off'" class="min-w-0 flex-1">{{ nodeName }} is reachable, but Phone access is off.</p>
      <p v-else class="min-w-0 flex-1">Can’t reach {{ nodeName }}.</p>
      <button type="button" class="h-11 flex-shrink-0 rounded-lg px-3 text-sm font-semibold text-amber-900 underline active:bg-amber-100" data-testid="mobile-node-offline-check" @click="$emit('open-connection')">Check</button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28" data-testid="mobile-run-list-scroll">
      <MobileUnsupportedFeatureNotice v-if="notice" class="m-3" :message="notice" />

      <div v-if="listState === 'loading'" class="animate-pulse" role="status" aria-label="Loading your runs" data-testid="mobile-run-list-loading">
        <div v-for="n in 6" :key="n" class="flex items-center gap-3 px-4 py-3.5">
          <span class="h-9 w-9 rounded-full bg-slate-100" />
          <span class="flex-1 space-y-2"><span class="block h-3.5 w-2/5 rounded bg-slate-100" /><span class="block h-3 w-4/5 rounded bg-slate-100" /></span>
        </div>
      </div>

      <div v-else-if="listState === 'error'" class="flex flex-col items-center px-8 pt-24 text-center" role="alert" data-testid="mobile-run-list-error">
        <Icon icon="heroicons:exclamation-triangle-20-solid" class="h-8 w-8 text-slate-400" aria-hidden="true" />
        <p class="mt-3 text-base font-semibold">Couldn’t load your runs.</p>
        <button type="button" class="mt-4 h-12 rounded-xl border border-slate-300 px-6 text-sm font-semibold text-slate-700 active:bg-slate-100" data-testid="mobile-run-list-retry" @click="$emit('retry')">Retry</button>
      </div>

      <div v-else-if="listState === 'empty'" class="flex flex-col items-center px-8 pt-24 text-center" data-testid="mobile-run-list-empty">
        <p class="text-base font-semibold">No runs yet</p>
        <p class="mt-1 text-sm text-slate-500">Start with New run. Work an agent delegates appears under its run and leaves when it is done.</p>
      </div>

      <template v-else>
        <ul role="tree" aria-label="Your runs" data-testid="mobile-run-tree">
          <MobileRunRow
            v-for="row in tree.rows.value"
            :key="row.key"
            :row="row"
            :open="row.key === tree.openRowKey.value"
            :age="row.depth === 0 && row.lastActivityAt ? relative(row.lastActivityAt) : ''"
            @open="openRow"
            @toggle="toggleRow"
          />
        </ul>
        <div v-if="runList.olderEntries.length > 0" class="flex justify-center py-2" data-testid="mobile-run-list-fold">
          <button type="button" class="h-12 rounded-xl px-5 text-sm font-semibold text-blue-700 active:bg-blue-50" data-testid="mobile-run-list-show-older" @click="runList.setOlderShown(!runList.olderShown)">
            {{ runList.olderShown ? 'Show fewer' : `Show older (${runList.olderEntries.length})` }}
          </button>
        </div>
      </template>
    </div>

    <button
      type="button"
      class="fixed right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/25 active:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
      style="bottom: max(1rem, env(safe-area-inset-bottom))"
      aria-label="New run"
      title="New run"
      data-testid="mobile-new-run-button"
      @click="$emit('new-run')"
    >
      <Icon icon="heroicons:plus-20-solid" class="h-7 w-7" aria-hidden="true" />
    </button>
  </section>
</template>

<script lang="ts">
/** The bar and banner state: the node answered; it did not; or it answered that Phone Access is off. */
export type MobileRunListConnection = 'connected' | 'unreachable' | 'phone_access_off';
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Icon } from '@iconify/vue';
import MobileUnsupportedFeatureNotice from '~/components/mobile/MobileUnsupportedFeatureNotice.vue';
import MobileRunRow from '~/components/mobile/runList/MobileRunRow.vue';
import { useMobileRunOpening } from '~/composables/mobile/useMobileRunOpening';
import type { useMobileRunTree } from '~/composables/mobile/useMobileRunTree';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useRunListStore } from '~/stores/runListStore';
import type { MobileRunTreeRow } from '~/utils/mobile/mobileRunTreeProjection';

const props = defineProps<{
  tree: ReturnType<typeof useMobileRunTree>;
  nodeName: string;
  connection: MobileRunListConnection;
  notice?: string | null;
}>();
/** `retry`: the read failed; the shell checks the node again (status, history and the 401 rule). */
defineEmits<{ (event: 'open-connection'): void; (event: 'new-run'): void; (event: 'retry'): void }>();

const runHistoryStore = useRunHistoryStore();
const runList = useRunListStore();
const opening = useMobileRunOpening(props.tree);

const loadError = computed(() => runHistoryStore.historyFamilyErrors?.workspace || runHistoryStore.agentOrgHistoryError || null);
/** The first read decides loading and error; once runs are listed they stay shown (the bar says when the node is down). */
const listState = computed<'loading' | 'error' | 'empty' | 'populated'>(() => {
  if (runList.entries.length > 0) return 'populated';
  if (runHistoryStore.loading) return 'loading';
  if (loadError.value) return 'error';
  return 'empty';
});

/** A row with nothing to open (a member's delegated Team without a known coordinator) folds instead. */
const openRow = (row: MobileRunTreeRow): void => {
  if (row.open) void opening.open(row);
  else if (row.fold) props.tree.toggle(row.fold);
};
const toggleRow = (row: MobileRunTreeRow): void => { if (row.fold) props.tree.toggle(row.fold); };

// Ages ("6m", "2h") move on every minute.
const tick = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;
const relative = (isoTime: string): string => { void tick.value; return runHistoryStore.formatRelativeTime(isoTime); };
onMounted(() => { timer = setInterval(() => { tick.value += 1; }, 60_000); });
onBeforeUnmount(() => { if (timer !== null) clearInterval(timer); });

const connected = computed(() => props.connection === 'connected');
const CONNECTION_LABELS: Readonly<Record<MobileRunListConnection, string>> = {
  connected: 'Connected',
  unreachable: 'Not reachable',
  phone_access_off: 'Phone access off',
};
const connectionLabel = computed(() => CONNECTION_LABELS[props.connection]);
</script>
