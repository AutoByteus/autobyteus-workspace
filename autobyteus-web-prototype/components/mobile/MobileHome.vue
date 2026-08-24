<template>
  <section class="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-6" data-testid="mobile-home">
    <header class="mb-5 flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">AutoByteus Remote Access</p>
        <h1 class="mt-2 text-3xl font-bold text-slate-950">AutoByteus</h1>
      </div>
      <button
        type="button"
        class="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
        :disabled="isRefreshing"
        data-testid="mobile-home-refresh"
        @click="$emit('refreshStatus')"
      >
        {{ isRefreshing ? 'Checking…' : 'Refresh' }}
      </button>
    </header>

    <div
      class="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl"
      data-testid="mobile-home-status-card"
      aria-label="Current node"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="truncate text-base font-semibold text-slate-950">{{ nodeLabel }}</p>
          <p class="mt-1 break-all font-mono text-xs text-slate-500">{{ serverBaseUrl }}</p>
        </div>
        <span class="shrink-0 rounded-full px-3 py-1 text-xs font-semibold" :class="statusPillClass">
          {{ statusLabel }}
        </span>
      </div>

      <MobileUnsupportedFeatureNotice
        v-if="noticeMessage"
        class="mt-4"
        :message="noticeMessage"
      />

      <div
        v-if="currentContext"
        class="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3"
        aria-label="Current work context"
      >
        <p class="font-semibold text-slate-950">{{ contextTitle }}</p>
        <p class="mt-1 text-sm text-slate-600">{{ contextSubtitle }}</p>
      </div>

      <div v-if="effectiveDiagnostic" class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p class="font-semibold">{{ effectiveDiagnostic.title }}</p>
        <p class="mt-1">{{ effectiveDiagnostic.message }}</p>
        <p class="mt-1 text-xs">{{ effectiveDiagnostic.recoveryAction }}</p>
      </div>
    </div>

    <section class="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-base font-bold text-slate-950">Recent work</h2>
        <button type="button" class="text-sm font-semibold text-blue-700" @click="$emit('openWorkPicker')">
          Switch work
        </button>
      </div>
      <div v-if="recentItems.length" class="mt-3 space-y-2" data-testid="mobile-home-recent-list">
        <MobileReadableWorkRow
          v-for="item in recentItems.slice(0, 5)"
          :key="item.key"
          :label="item.label"
          :detail="item.detail"
          :meta="item.meta"
          @select="$emit('selectContext', item.context)"
        />
      </div>
      <div v-else class="mt-3 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600" data-testid="mobile-home-empty-recent">
        No recent runs yet. Choose an agent, team, or workspace to start.
      </div>
    </section>

    <section class="mt-4 grid grid-cols-2 gap-3">
      <button type="button" class="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm" @click="$emit('openWorkPicker')">
        <p class="font-semibold text-slate-900">Choose work</p>
        <p class="mt-1 text-sm text-slate-500">Recent, Agents, Teams, Workspaces</p>
      </button>
      <button type="button" class="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm" @click="$emit('openFiles')">
        <p class="font-semibold text-slate-900">Files</p>
        <p class="mt-1 text-sm text-slate-500">Browse current workspace</p>
      </button>
      <button type="button" class="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm" @click="$emit('openTroubleshooting')">
        <p class="font-semibold text-slate-900">Troubleshoot</p>
        <p class="mt-1 text-sm text-slate-500">Connection diagnostics</p>
      </button>
      <button type="button" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-left shadow-sm" @click="$emit('requestUnpair')">
        <p class="font-semibold text-red-700">Unpair</p>
        <p class="mt-1 text-sm text-red-600">Remove this phone</p>
      </button>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MobileReadableWorkRow from '~/components/mobile/MobileReadableWorkRow.vue';
import MobileUnsupportedFeatureNotice from '~/components/mobile/MobileUnsupportedFeatureNotice.vue';
import type { MobileConnectionDiagnostic, RemoteAccessStatus } from '~/types/remoteAccess';
import type { MobileWorkContext, MobileWorkListItem } from '~/types/mobileWork';
import { mobileWorkContextSubtitle, mobileWorkContextTitle } from '~/types/mobileWork';

const props = defineProps<{
  serverBaseUrl: string;
  status: RemoteAccessStatus | null;
  isRefreshing: boolean;
  diagnostic: MobileConnectionDiagnostic | null;
  authorizedApiReachable?: boolean;
  noticeMessage?: string | null;
  currentContext: MobileWorkContext | null;
  recentItems: MobileWorkListItem[];
}>();

defineEmits<{
  refreshStatus: [];
  openWorkPicker: [];
  openFiles: [];
  openTroubleshooting: [];
  requestUnpair: [];
  selectContext: [context: MobileWorkContext];
}>();

const nodeLabel = computed(() => props.status?.serverName || new URL(props.serverBaseUrl, 'http://localhost').host);
const hasMixedReachability = computed(() => props.authorizedApiReachable && !props.status && Boolean(props.diagnostic));
const effectiveDiagnostic = computed<MobileConnectionDiagnostic | null>(() => {
  if (hasMixedReachability.value) {
    return {
      kind: 'network_unreachable',
      title: 'Node reachable · Phone Access status unavailable',
      message: 'Work data loaded from the paired node, but the Remote Access status endpoint did not return a current status.',
      recoveryAction: 'You can keep using loaded work. Refresh after updating the desktop app if status continues to be unavailable.',
    };
  }
  return props.diagnostic;
});
const statusLabel = computed(() => {
  if (props.isRefreshing) return 'Checking…';
  if (hasMixedReachability.value) return 'Node reachable';
  if (!props.status) return props.diagnostic ? 'Offline' : 'Unknown';
  return props.status.phoneAccessEnabled ? 'Connected' : 'Phone Access disabled';
});
const statusPillClass = computed(() => {
  if (props.isRefreshing) return 'bg-slate-100 text-slate-600';
  if (hasMixedReachability.value) return 'bg-emerald-100 text-emerald-700';
  if (!props.status || props.diagnostic) return 'bg-amber-100 text-amber-700';
  return props.status.phoneAccessEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
});
const contextTitle = computed(() => mobileWorkContextTitle(props.currentContext));
const contextSubtitle = computed(() => mobileWorkContextSubtitle(props.currentContext));
</script>
