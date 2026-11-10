<template>
  <!-- The paired phone (autobyteus-277): the screen the route names, over the run list that stays mounted (it keeps its
       scroll and folds). It owns the history load and poll, the status check, and the live collaboration stream. -->
  <section
    v-if="postPair && !firstCheckDone"
    class="flex min-h-screen w-full flex-col items-center justify-center px-6 text-center"
    role="status"
    data-testid="mobile-post-pair-checking"
  >
    <span class="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
      <Icon icon="heroicons:check-20-solid" class="h-8 w-8" aria-hidden="true" />
    </span>
    <h1 class="mt-5 text-[1.375rem] font-semibold leading-7 text-slate-950">Connected to {{ nodeName }}</h1>
    <p class="mt-2 text-[0.9375rem] leading-6 text-slate-600">Opening your runs…</p>
  </section>

  <template v-else>
    <MobileRunList
      v-show="navigation.screen.value === 'list'"
      :tree="tree"
      :node-name="nodeName"
      :connection="connection"
      :notice="notice"
      @open-connection="showConnection = true"
      @new-run="navigation.openNewRun()"
      @retry="checkStatus()"
    />
    <!-- A view screen whose subject is being reopened at page start shows the run screen's "Opening…" (DEC-015). -->
    <MobileRunScreen v-if="navigation.screen.value === 'run' || (restoring && !viewTarget && VIEWS.has(navigation.screen.value))" :tree="tree" />
    <template v-else-if="viewTarget">
      <MobileArtifacts v-if="navigation.screen.value === 'artifacts'" :target="viewTarget" @back="navigation.back()" />
      <MobileFiles v-else-if="navigation.screen.value === 'files'" :target="viewTarget" @back="navigation.back()" />
      <MobileMessages v-else-if="navigation.screen.value === 'messages'" :target="viewTarget" @back="navigation.back()" />
      <MobileActivity v-else-if="navigation.screen.value === 'activity'" :target="viewTarget" @back="navigation.back()" />
      <MobileNodeDesktop v-else-if="navigation.screen.value === 'desktop'" @back="navigation.back()" />
    </template>
    <MobileNewRun v-if="navigation.screen.value === 'new'" @close="navigation.back()" @launched="onLaunched" />

    <MobileConnectionSheet
      v-if="showConnection"
      :node-name="nodeName"
      :connected="connected"
      :is-checking="sessionStore.isCheckingStatus"
      :diagnostic="sessionStore.lastDiagnostic"
      @close="showConnection = false"
      @check="checkStatus()"
      @unpair="openUnpairConfirm"
    />
    <MobileUnpairConfirm v-if="showUnpairConfirm" @cancel="showUnpairConfirm = false" @confirm="unpairPhone" />
  </template>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import MobileConnectionSheet from '~/components/mobile/connection/MobileConnectionSheet.vue';
import MobileUnpairConfirm from '~/components/mobile/connection/MobileUnpairConfirm.vue';
import MobileNewRun from '~/components/mobile/newRun/MobileNewRun.vue';
import MobileRunList from '~/components/mobile/runList/MobileRunList.vue';
import MobileRunScreen from '~/components/mobile/runScreen/MobileRunScreen.vue';
import MobileActivity from '~/components/mobile/views/MobileActivity.vue';
import MobileArtifacts from '~/components/mobile/views/MobileArtifacts.vue';
import MobileFiles from '~/components/mobile/views/MobileFiles.vue';
import MobileMessages from '~/components/mobile/views/MobileMessages.vue';
import MobileNodeDesktop from '~/components/mobile/views/MobileNodeDesktop.vue';
import { useAgentRunCollaborationSync } from '~/composables/agentCollaboration/useAgentRunCollaborationSync';
import { useMobileNavigation } from '~/composables/mobile/useMobileNavigation';
import { useMobileRouteRunSync } from '~/composables/mobile/useMobileRouteRunSync';
import { useMobileRunOpening } from '~/composables/mobile/useMobileRunOpening';
import { useMobileRunTree } from '~/composables/mobile/useMobileRunTree';
import { useMobileSubjectRestore } from '~/composables/mobile/useMobileSubjectRestore';
import { useRunHistorySectionLoad } from '~/composables/runHistory/useRunHistorySectionLoad';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import { nodeNameOrDefault } from '~/utils/remoteAccess/nodeName';
import { agentRunRowKey } from '~/utils/runListProjection';
import { getShellBridge } from '~/utils/remoteAccess/shellBridge';
import type { MobileRunListConnection } from '~/components/mobile/runList/MobileRunList.vue';

const props = defineProps<{
  /** Just paired: "Connected to <node>" shows until the first check ends. */
  postPair: boolean;
  /** The unsupported-route notice, shown above the run list. */
  notice: string | null;
}>();
const emit = defineEmits<{ (event: 'checked'): void }>();

const sessionStore = useMobileNodeSessionStore();
const activeContext = useActiveContextStore();
const navigation = useMobileNavigation();
const tree = useMobileRunTree();

// The page is in front: a phone in the background or asleep polls nothing (E-25, R-002).
const pageVisible = ref(typeof document === 'undefined' || document.visibilityState !== 'hidden');
const onVisibilityChange = (): void => { pageVisible.value = document.visibilityState !== 'hidden'; };
onMounted(() => document.addEventListener('visibilitychange', onVisibilityChange));
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisibilityChange));

// The desktop Runs view's complete history, polled only while the list is on screen (DS-001).
const historyLoad = useRunHistorySectionLoad({
  window: () => null,
  polling: () => navigation.screen.value === 'list' && pageVisible.value,
});
// The selected run's live collaboration stream, whatever screen shows (its children's states).
useAgentRunCollaborationSync();

const firstCheckDone = ref(false);
let firstCheckEnded: () => void = () => undefined;
const firstCheck = new Promise<void>((resolve) => { firstCheckEnded = resolve; });
/**
 * One phone check (open, Retry, Check): the credential check, the public status (the connection sheet's diagnostic) and
 * the history read (the list's content) together. The outcome comes only from the credential check: a credential the
 * node no longer accepts (401, auth codes, a revoked device) ends the session (E-27); Phone Access off keeps it and says
 * so; otherwise reachable or not.
 */
async function checkStatus(first = false): Promise<void> {
  const [outcome] = await Promise.all([
    sessionStore.checkCredential(),
    sessionStore.fetchStatus().catch(() => null),
    (first ? historyLoad.initialLoad : historyLoad.load()).catch(() => undefined),
  ]);
  if (outcome === 'session_rejected') {
    sessionStore.rejectLocalSessionForAuthFailure();
    return;
  }
  sessionStore.recordCheckOutcome(outcome);
}
onMounted(async () => {
  try {
    await checkStatus(true);
  } finally {
    firstCheckDone.value = true;
    firstCheckEnded();
    if (props.postPair) emit('checked');
  }
});

/** The Android app's name for this node (its first page's name); `''` in a browser or while the app has not answered. */
const appNodeName = ref('');
onMounted(async () => {
  const hello = await getShellBridge()?.hello();
  appNodeName.value = hello?.nodeName ?? '';
});
/**
 * The node's name, never its address (autobyteus-433): the app's name for it, else the name from the QR the page paired
 * with (absent for sessions paired before it was kept), else "AutoByteus node".
 */
const nodeName = computed(() => nodeNameOrDefault(appNodeName.value, sessionStore.session?.nodeName));
/** Reachable until the first check says otherwise. */
const connected = computed(() => !firstCheckDone.value || sessionStore.authorizedApiReachable);
/** The run list's connection state: Phone Access off is its own state, not "Not reachable". */
const connection = computed<MobileRunListConnection>(() => {
  if (sessionStore.phoneAccessOff) return 'phone_access_off';
  return connected.value ? 'connected' : 'unreachable';
});

const showConnection = ref(false);
const showUnpairConfirm = ref(false);
/** The confirmation replaces the sheet, so nothing covers it (CRR-003 F-03). */
function openUnpairConfirm(): void {
  showConnection.value = false;
  showUnpairConfirm.value = true;
}
function unpairPhone(): void {
  showUnpairConfirm.value = false;
  showConnection.value = false;
  sessionStore.deleteLocalSession();
}

/**
 * A page start whose route names a run list row that is not open (a reload, Android's restore after process death)
 * reopens it (autobyteus-435 REQ-005). Created before the watch below: while it restores, nothing goes to the list.
 */
const { restoring } = useMobileSubjectRestore({ tree, opening: useMobileRunOpening(tree), navigation, firstCheck });

/** A view screen shows the open target; a view whose subject is gone (and is not being reopened) gives the list. */
const viewTarget = computed(() => activeContext.activeWorkspaceTarget);
const VIEWS = new Set(['artifacts', 'files', 'messages', 'activity', 'desktop']);
watch([() => navigation.screen.value, viewTarget, restoring], ([screen, target, isRestoring]) => {
  if (VIEWS.has(screen) && !target && !isRestoring) void navigation.toList();
}, { immediate: true });

/**
 * Create run: the new run's conversation, for its first message, in place of New run. The route names the draft's row
 * (`agent:temp-…`) until the first send promotes it; then it names the node's run (DS-006b).
 */
const onLaunched = (draftRunId: string): void => { void navigation.openRun({ replace: true, rowKey: agentRunRowKey(draftRunId) }); };
useMobileRouteRunSync(navigation);
</script>
