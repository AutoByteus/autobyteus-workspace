<template>
  <!-- The paired phone (autobyteus-277): the screen the route names, over the run list that stays mounted (it keeps its
       scroll and folds). It owns the history load and poll, the status check, and the live collaboration stream. -->
  <section
    v-if="postPair && !firstCheckDone"
    class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-8 text-center"
    data-testid="mobile-post-pair-checking"
  >
    <div class="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Pairing complete</p>
      <h1 class="mt-3 text-2xl font-bold text-slate-950">Checking your desktop</h1>
      <p class="mt-3 text-sm text-slate-600">Refreshing Phone Access status before your runs open.</p>
      <p class="mt-4 text-sm font-semibold text-blue-700">Checking status…</p>
    </div>
  </section>

  <template v-else>
    <MobileRunList
      v-show="navigation.screen.value === 'list'"
      :tree="tree"
      :node-name="nodeName"
      :connected="connected"
      :notice="notice"
      @open-connection="showConnection = true"
      @new-run="navigation.openNewRun()"
      @retry="checkStatus()"
    />
    <MobileRunScreen v-if="navigation.screen.value === 'run'" :tree="tree" />
    <template v-else-if="viewTarget">
      <MobileArtifacts v-if="navigation.screen.value === 'artifacts'" :target="viewTarget" @back="navigation.back()" />
      <MobileFiles v-else-if="navigation.screen.value === 'files'" :target="viewTarget" @back="navigation.back()" />
      <MobileMessages v-else-if="navigation.screen.value === 'messages'" :target="viewTarget" @back="navigation.back()" />
      <MobileActivity v-else-if="navigation.screen.value === 'activity'" :target="viewTarget" @back="navigation.back()" />
    </template>
    <MobileNewRun v-if="navigation.screen.value === 'new'" @close="navigation.back()" @launched="onLaunched" />

    <MobileConnectionSheet
      v-if="showConnection"
      :node-name="nodeName"
      :server-base-url="sessionStore.serverBaseUrl"
      :connected="connected"
      :is-checking="sessionStore.isCheckingStatus"
      :diagnostic="sessionStore.lastDiagnostic"
      @close="showConnection = false"
      @check="checkStatus()"
      @unpair="showUnpairConfirm = true"
    />
    <MobileUnpairConfirm v-if="showUnpairConfirm" @cancel="showUnpairConfirm = false" @confirm="unpairPhone" />
  </template>
</template>

<script setup lang="ts">
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
import { useAgentRunCollaborationSync } from '~/composables/agentCollaboration/useAgentRunCollaborationSync';
import { useMobileNavigation } from '~/composables/mobile/useMobileNavigation';
import { useMobileRunTree } from '~/composables/mobile/useMobileRunTree';
import { useRunHistorySectionLoad } from '~/composables/runHistory/useRunHistorySectionLoad';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import { isRemoteAccessAuthFailure } from '~/utils/remoteAccess/remoteAccessAuthFailure';

const props = defineProps<{
  /** Just paired: "Checking your desktop" shows until the first check ends. */
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
/** Status and the history read together; a read refused for this phone's credential rejects the session (E-27). */
async function checkStatus(first = false): Promise<void> {
  const [statusResult, readResult] = await Promise.allSettled([
    sessionStore.fetchStatus(),
    first ? historyLoad.initialLoad : historyLoad.load(),
  ]);
  const statusReachable = statusResult.status === 'fulfilled' && Boolean(statusResult.value);
  const read = readResult.status === 'fulfilled' ? readResult.value : { ok: false as const, cause: readResult.reason };
  if (!read.ok && isRemoteAccessAuthFailure(read.cause)) {
    sessionStore.rejectLocalSessionForAuthFailure();
    return;
  }
  sessionStore.recordAuthorizedApiReachability(read.ok || statusReachable);
}
onMounted(async () => {
  try {
    await checkStatus(true);
  } finally {
    firstCheckDone.value = true;
    if (props.postPair) emit('checked');
  }
});

/** The paired node's own name, kept from its last answer while it does not answer. */
const lastNodeName = ref('');
watch(() => sessionStore.lastStatus?.serverName, (name) => { if (name) lastNodeName.value = name; }, { immediate: true });
const nodeName = computed(() => lastNodeName.value || hostOf(sessionStore.serverBaseUrl));
/** Reachable until the first check says otherwise. */
const connected = computed(() => !firstCheckDone.value || sessionStore.authorizedApiReachable);

const showConnection = ref(false);
const showUnpairConfirm = ref(false);
function unpairPhone(): void {
  showUnpairConfirm.value = false;
  showConnection.value = false;
  sessionStore.deleteLocalSession();
}

/** A view screen shows the open target; a view whose subject is gone (a reload) is replaced by the list. */
const viewTarget = computed(() => activeContext.activeWorkspaceTarget);
const VIEWS = new Set(['artifacts', 'files', 'messages', 'activity']);
watch([() => navigation.screen.value, viewTarget], ([screen, target]) => {
  if (VIEWS.has(screen) && !target) void navigation.toList();
}, { immediate: true });

/** Create run: the new run's conversation, for its first message, in place of New run. */
const onLaunched = (): void => { void navigation.openRun({ replace: true }); };

function hostOf(url: string): string {
  try { return new URL(url).host || url; } catch { return url; }
}
</script>
