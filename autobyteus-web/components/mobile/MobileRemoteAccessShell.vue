<template>
  <main class="min-h-screen bg-slate-100 text-slate-900" data-testid="mobile-remote-access-shell">
    <MobilePairingBootstrap
      v-if="!sessionStore.isPaired"
      @paired="onPaired"
      @pairing-failed="cancelPostPairRefresh"
      @pairing-started="beginPostPairRefresh"
    >
      <template v-if="unsupportedMessage" #notice>
        <MobileUnsupportedFeatureNotice :message="unsupportedMessage" />
      </template>
    </MobilePairingBootstrap>

    <template v-else>
      <section
        v-if="isPostPairChecking"
        class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-8 text-center"
        data-testid="mobile-post-pair-checking"
      >
        <div class="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Pairing complete</p>
          <h1 class="mt-3 text-2xl font-bold text-slate-950">Checking your desktop</h1>
          <p class="mt-3 text-sm text-slate-600">
            Refreshing Phone Access status and mobile work choices before Home opens.
          </p>
          <p class="mt-4 text-sm font-semibold text-blue-700">Checking status…</p>
        </div>
      </section>

      <MobileHome
        v-else-if="screen === 'home'"
        :server-base-url="sessionStore.serverBaseUrl"
        :status="sessionStore.lastStatus"
        :is-refreshing="sessionStore.isCheckingStatus"
        :diagnostic="sessionStore.lastDiagnostic"
        :authorized-api-reachable="sessionStore.authorizedApiReachable"
        :notice-message="unsupportedMessage"
        :current-context="mobileWorkStore.currentContext"
        :recent-items="recentWorkItems"
        @refresh-status="checkStatus"
        @continue-latest="continueLatestRun"
        @select-context="openContext"
        @open-work-picker="openContextSwitcher"
        @open-files="openFiles"
        @open-troubleshooting="screen = 'troubleshooting'"
        @request-unpair="showUnpairConfirm = true"
      />

      <MobileWorkShell
        v-else-if="screen === 'work'"
        :context="mobileWorkStore.currentContext"
        :active-tab="mobileWorkStore.activeTab"
        @home="screen = 'home'"
        @switch-context="openContextSwitcher"
        @select-context="openContext"
        @update:active-tab="mobileWorkStore.setActiveTab"
      />

      <MobileTroubleshooting
        v-else
        :server-base-url="sessionStore.serverBaseUrl"
        :is-checking="sessionStore.isCheckingStatus"
        :diagnostic="sessionStore.lastDiagnostic"
        :status="sessionStore.lastStatus"
        @home="screen = 'home'"
        @check-status="checkStatus"
      />

      <MobileContextSwitcher
        v-if="showContextSwitcher"
        :recent-items="recentWorkItems"
        :agent-items="agentItems"
        :team-items="teamItems"
        :workspace-items="workspaceItems"
        :selected-context="mobileWorkStore.currentContext"
        @close="showContextSwitcher = false"
        @select-context="openContext"
      />

      <MobileUnpairConfirm
        v-if="showUnpairConfirm"
        @cancel="showUnpairConfirm = false"
        @confirm="unpairPhone"
      />
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import MobileContextSwitcher from '~/components/mobile/MobileContextSwitcher.vue';
import MobileHome from '~/components/mobile/MobileHome.vue';
import MobilePairingBootstrap from '~/components/mobile/MobilePairingBootstrap.vue';
import MobileTroubleshooting from '~/components/mobile/MobileTroubleshooting.vue';
import MobileUnpairConfirm from '~/components/mobile/MobileUnpairConfirm.vue';
import MobileUnsupportedFeatureNotice from '~/components/mobile/MobileUnsupportedFeatureNotice.vue';
import MobileWorkShell from '~/components/mobile/MobileWorkShell.vue';
import { useMobileWorkCatalog } from '~/composables/mobile/useMobileWorkCatalog';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import type { MobileFeatureId } from '~/utils/mobileFeatureGates';
import type { MobileTaskTab, MobileWorkContext } from '~/types/mobileWork';
import { preferredTabForMobileContext } from '~/types/mobileWork';
import { clearMobileRunSelection, selectMobileRun } from '~/utils/mobile/mobileSelectionAdapter';

// Keep the component name in the compiled chunk stable for existing page tests.
defineOptions({ name: 'MobileRemoteAccessShell' });

const sessionStore = useMobileNodeSessionStore();
const mobileWorkStore = useMobileWorkStore();
const runHistoryStore = useRunHistoryStore();
const agentContextsStore = useAgentContextsStore();
const teamContextsStore = useAgentTeamContextsStore();
const route = useRoute();
const {
  recentWorkItems,
  latestRunItem,
  agentItems,
  teamItems,
  workspaceItems,
  refreshMobileWorkCatalog,
} = useMobileWorkCatalog();

type MobileScreen = 'home' | 'work' | 'troubleshooting';

const screen = ref<MobileScreen>('home');
const showContextSwitcher = ref(false);
const showUnpairConfirm = ref(false);
const isPostPairChecking = ref(false);
const pendingPostPairRefresh = ref(false);
const postPairRefreshPromise = ref<Promise<void> | null>(null);

const unsupportedFeatureMessages: Partial<Record<MobileFeatureId, string>> = {
  desktopWorkspace: 'The desktop workspace route is replaced by the phone-first mobile work shell. Use Home, Switch work, and Chat/Runs/Files/Activity instead.',
  desktopSettings: 'Desktop settings are managed from the desktop app. Phone Access exposes only mobile-safe connection controls.',
  desktopUpdates: 'Desktop update controls are not available from the phone client.',
  localFolderPicker: 'Local folder picking is not available from the phone client.',
  applicationIframe: 'Application iframe surfaces are not part of the mobile MVP yet.',
};

const unsupportedMessage = computed(() => {
  const feature = String(route.query.unsupported ?? '') as MobileFeatureId;
  return unsupportedFeatureMessages[feature] ?? null;
});

async function checkStatus(): Promise<void> {
  const [statusResult, catalogResult] = await Promise.allSettled([
    sessionStore.fetchStatus(),
    refreshMobileWorkCatalog(),
  ]);
  const statusReachable = statusResult.status === 'fulfilled' && Boolean(statusResult.value);
  const catalogReachable = catalogResult.status === 'fulfilled' && catalogResult.value.hadSuccess;
  sessionStore.recordAuthorizedApiReachability(statusReachable || catalogReachable);
}

async function openRunContext(context: MobileWorkContext): Promise<void> {
  try {
    if (context.kind === 'agent-run') {
      if (agentContextsStore.getRun(context.runId)) {
        selectMobileRun(context.runId, 'agent');
      } else {
        await runHistoryStore.openRun(context.runId, { selectionMode: 'mobile' });
      }
    } else if (context.kind === 'team-run') {
      if (teamContextsStore.getTeamContextById(context.teamRunId)) {
        selectMobileRun(context.teamRunId, 'team');
        await teamContextsStore.focusMemberAndEnsureHydrated?.(context.teamRunId, context.focusedMemberRouteKey);
      } else {
        await runHistoryStore.openTeamMemberRun(context.teamRunId, context.focusedMemberRouteKey, { selectionMode: 'mobile' });
        selectMobileRun(context.teamRunId, 'team');
      }
    } else {
      clearMobileRunSelection();
    }
  } catch (error) {
    console.warn('[MobileRemoteAccessShell] Failed to open selected mobile context.', error);
  }
}

async function openContext(context: MobileWorkContext, tab?: MobileTaskTab): Promise<void> {
  showContextSwitcher.value = false;
  const targetTab = tab ?? preferredTabForMobileContext(context);
  mobileWorkStore.selectContext(context, targetTab);
  screen.value = 'work';
  await openRunContext(context);
}

async function continueLatestRun(): Promise<void> {
  const item = latestRunItem.value;
  if (!item) {
    openContextSwitcher();
    return;
  }
  await openContext(item.context, 'chat');
}

function openFiles(): void {
  mobileWorkStore.setActiveTab('files');
  screen.value = 'work';
}

function openContextSwitcher(): void {
  showContextSwitcher.value = true;
}

function unpairPhone(): void {
  showUnpairConfirm.value = false;
  mobileWorkStore.clearContext();
  sessionStore.deleteLocalSession();
  screen.value = 'home';
  pendingPostPairRefresh.value = false;
  isPostPairChecking.value = false;
  postPairRefreshPromise.value = null;
}

function beginPostPairRefresh(): void {
  screen.value = 'home';
  pendingPostPairRefresh.value = true;
  isPostPairChecking.value = true;
}

function cancelPostPairRefresh(): void {
  if (sessionStore.isPaired) {
    return;
  }
  pendingPostPairRefresh.value = false;
  isPostPairChecking.value = false;
  postPairRefreshPromise.value = null;
}

async function completePostPairRefresh(): Promise<void> {
  if (!sessionStore.isPaired) {
    return;
  }
  beginPostPairRefresh();
  if (postPairRefreshPromise.value) {
    return postPairRefreshPromise.value;
  }

  const refreshPromise = (async () => {
    try {
      await checkStatus();
    } finally {
      pendingPostPairRefresh.value = false;
      isPostPairChecking.value = false;
      postPairRefreshPromise.value = null;
    }
  })();
  postPairRefreshPromise.value = refreshPromise;
  return refreshPromise;
}

async function onPaired(): Promise<void> {
  await completePostPairRefresh();
}

watch(() => sessionStore.isPaired, (isPaired, wasPaired) => {
  if (isPaired && pendingPostPairRefresh.value) {
    void completePostPairRefresh();
    return;
  }
  if (!isPaired && wasPaired) {
    cancelPostPairRefresh();
  }
});

onMounted(async () => {
  sessionStore.initializeFromStorage();
  if (!sessionStore.isPaired) {
    return;
  }
  await checkStatus();
});
</script>
