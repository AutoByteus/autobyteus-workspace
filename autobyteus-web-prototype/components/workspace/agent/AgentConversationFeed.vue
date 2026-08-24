<template>
  <div class="relative h-full min-h-0">
    <div :id="conversationScrollContainerId" ref="conversationScrollContainer" class="h-full min-h-0 overflow-y-auto overscroll-contain"
      data-testid="agent-conversation-feed" :aria-busy="browseState === 'loading' ? 'true' : undefined"
      @scroll="handleConversationScroll" @wheel="handleWheelInput" @keydown="handleKeyInput"
      @touchstart="handleTouchStart" @touchmove="handleTouchMove"
      @touchend="handleTouchEnd" @touchcancel="handleTouchCancel"
      @pointerdown="handlePointerDown" @pointermove="handlePointerMove" @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel" @lostpointercapture="handlePointerCancel">
      <div class="rounded-xl bg-white">
        <template v-if="showBrowsePresentation">
          <div v-for="item in browseItems" :key="item.key" class="break-words px-2 py-3">
            <div v-if="item.kind === 'user'" :data-event-monitor-visual-key="item.visualId">
              <UserMessage :message="item.message" user-display-name="You" />
            </div>
            <EventMonitorBrowseAssistantRow v-else-if="item.kind === 'assistant'" :visuals="item.visuals"
              :agent-name="agentName"
              :agent-avatar-url="agentAvatarUrl"
              :enable-event-monitor-file-actions="enableEventMonitorFileActions"
              @file-path-action="emit('file-path-action', $event)" />
            <div v-else :data-event-monitor-visual-key="item.visualId">
              <CompactionStatusRow :activity="item.activity" />
            </div>
          </div>
        </template>
        <template v-else>
          <div v-for="item in latestFeedItems" :key="item.key" class="break-words px-2 py-3">
            <template v-if="item.kind === 'message'">
              <div>
                <UserMessage v-if="item.message.type === 'user'" :message="item.message" user-display-name="You" />
                <AIMessage v-else :message="item.message" :run-id="runId"
                  :agent-name="agentName"
                  :agent-avatar-url="agentAvatarUrl"
                  :inter-agent-sender-name-by-id="interAgentSenderNameById"
                  :message-index="item.messageIndex"
                  :enable-event-monitor-file-actions="enableEventMonitorFileActions"
                  @file-path-action="emit('file-path-action', $event)" />
              </div>

              <span v-if="showTokenCosts && getRecentEventMonitorMessageUsageText(item.message)"
                class="mt-1 block pr-8 text-right text-[0.6875rem] font-medium text-gray-400">
                {{ getRecentEventMonitorMessageUsageText(item.message) }}
              </span>
            </template>

            <CompactionStatusRow v-else :activity="item.activity" />
          </div>
        </template>
      </div>

      <div v-if="!showBrowsePresentation && showTotalUsage && totalUsageText"
        class="mt-2 text-right text-xs font-medium text-gray-500">
        {{ totalUsageText }}
      </div>
    </div>

    <div v-if="showLoadingDots || browseState === 'error'"
      class="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center"
      data-testid="event-monitor-top-overlay">
      <div v-if="showLoadingDots" class="flex h-2 items-center gap-1"
        data-testid="event-monitor-loading-dots" aria-hidden="true">
        <span v-for="delay in loadingDotDelays" :key="delay"
          class="h-1 w-1 animate-pulse rounded-full bg-slate-400 motion-reduce:animate-none motion-reduce:opacity-60"
          :style="{ animationDelay: delay }" />
      </div>
      <button v-else type="button"
        class="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        data-testid="event-monitor-retry-earlier"
        :aria-label="$t('workspace.components.workspace.agent.AgentConversationFeed.retry_earlier')"
        @click="retryEarlierPage">
        <span class="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-white text-red-700 shadow-sm">
          <Icon icon="heroicons:arrow-path" class="h-4 w-4" aria-hidden="true" />
        </span>
      </button>
    </div>

    <button v-if="showJumpToLatest" type="button"
      class="absolute bottom-2 left-1/2 z-20 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      data-testid="event-monitor-jump-to-latest"
      :aria-label="$t('workspace.components.workspace.agent.AgentConversationFeed.jump_to_latest')"
      @click="jumpToLatest">
      <span class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors motion-reduce:transition-none">
        <Icon icon="heroicons:arrow-down" class="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import type { Conversation } from '~/types/conversation';
import type { CompactionActivity } from '~/types/activity/RunActivity';
import UserMessage from '~/components/conversation/UserMessage.vue';
import AIMessage from '~/components/conversation/AIMessage.vue';
import CompactionStatusRow from '~/components/workspace/agent/CompactionStatusRow.vue';
import { buildRecentEventMonitorPresentation } from '~/services/eventMonitor/recentEventMonitorWindow';
import { getRecentEventMonitorMessageUsageText, getRecentEventMonitorTotalUsageText } from '~/services/eventMonitor/recentEventMonitorUsagePresentation';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';
import EventMonitorBrowseAssistantRow from './EventMonitorBrowseAssistantRow.vue';
import type { EventMonitorActiveTraceBrowsePresentationItem } from '~/services/eventMonitor/eventMonitorActiveTraceBrowsePresentation';
import type { EventMonitorActiveTraceBrowseState } from '~/services/eventMonitor/eventMonitorActiveTraceBrowse';

const props = withDefaults(defineProps<{
  conversation: Conversation;
  runId?: string;
  agentName?: string;
  agentAvatarUrl?: string | null;
  interAgentSenderNameById?: Record<string, string>;
  compactionActivities?: CompactionActivity[];
  showTokenCosts?: boolean;
  showTotalUsage?: boolean;
  presentationRevision?: number;
  enableEventMonitorFileActions?: boolean;
  browseItems?: EventMonitorActiveTraceBrowsePresentationItem[];
  browseState?: EventMonitorActiveTraceBrowseState;
  canLoadEarlier?: boolean;
  newerBrowseContentReleased?: boolean;
  browseHasNewerLiveActivity?: boolean;
}>(), {
  compactionActivities: () => [],
  showTokenCosts: true,
  showTotalUsage: true,
  presentationRevision: 0,
  enableEventMonitorFileActions: false,
  browseItems: () => [],
  browseState: 'latest',
  canLoadEarlier: false,
  newerBrowseContentReleased: false,
  browseHasNewerLiveActivity: false,
});

const emit = defineEmits<{
  (event: 'file-path-action', action: AbsoluteFilePathAction): void;
  (event: 'load-earlier'): void;
  (event: 'jump-to-latest'): void;
}>();

const NEAR_BOTTOM_THRESHOLD_PX = 40;
const TOP_TRIGGER_PX = 24;
const TOP_REARM_PX = 96;
const DIRECT_INPUT_EFFECT_MS = 200;
const WHEEL_IDLE_MS = 250;
const POST_WORK_INPUT_QUIET_MS = 250;
const MAX_INTENT_SESSION_MS = 5_000;
const LOADING_PRESENTATION_DELAY_MS = 150;

type IntentSource = 'wheel' | 'touch' | 'keyboard' | 'scrollbar';
type GateMode = 'idle' | 'intent' | 'blocked';
type IntentSession = {
  id: number; source: IntentSource; startedAt: number; lastDirectInputAt: number;
  startScrollTop: number; lastQualifiedScrollTop: number; sawAway: boolean;
  consumed: boolean; scrollWorkEpoch: number;
};
type BrowseAnchor = { scrollHeight: number; scrollTop: number; visualId: string | null; offset: number };

const runId = computed(() => props.runId || props.conversation.id);
const instanceUid = getCurrentInstance()?.uid ?? Math.floor(Math.random() * 1_000_000);
const conversationScrollContainerId = computed(() => `agent-conversation-scroll-${runId.value}-${instanceUid}`);
const shouldStickToBottom = ref(true);
const hasUnseenActivity = ref(false);
const revisionBaseline = ref(props.presentationRevision);
const pendingBrowseAnchor = ref<BrowseAnchor | null>(null);
const conversationScrollContainer = ref<HTMLElement | null>(null);
const gateMode = ref<GateMode>('idle');
const intentSession = ref<IntentSession | null>(null);
const scrollWorkEpoch = ref(0);
const showLoadingDots = ref(false);
const loadingDotDelays = ['0ms', '120ms', '240ms'];
const latestFeedItems = computed(() => buildRecentEventMonitorPresentation(props.conversation, props.compactionActivities));
const showBrowsePresentation = computed(() => props.browseState !== 'latest' && props.browseItems.length > 0);
const showJumpToLatest = computed(() => hasUnseenActivity.value
  || props.browseHasNewerLiveActivity
  || props.newerBrowseContentReleased
  || props.browseState !== 'latest');
const totalUsageText = computed(() => getRecentEventMonitorTotalUsageText(latestFeedItems.value));

let nextIntentId = 0, lastDirectInputAt = 0;
let intentExpiryTimer: ReturnType<typeof setTimeout> | null = null;
let blockedReleaseTimer: ReturnType<typeof setTimeout> | null = null;
let loadingDelayTimer: ReturnType<typeof setTimeout> | null = null;
let activeTouch = false, lastTouchY: number | null = null, activeScrollbarPointerId: number | null = null;
const sourcesAwaitingFreshInteraction = new Set<IntentSource>();

const getConversationScrollContainer = (): HTMLElement | null => {
  if (conversationScrollContainer.value) return conversationScrollContainer.value;
  if (typeof document === 'undefined') return null;
  return document.getElementById(conversationScrollContainerId.value);
};
const now = (): number => Date.now();
const isTrusted = (event: Event): boolean => event.isTrusted === true;
const clearTimer = (timer: ReturnType<typeof setTimeout> | null): void => { if (timer) clearTimeout(timer); };
const invalidateIntent = (): void => {
  clearTimer(intentExpiryTimer);
  intentExpiryTimer = null;
  intentSession.value = null;
  if (gateMode.value === 'intent') gateMode.value = 'idle';
};
const recordDirectInput = (): number => (lastDirectInputAt = now());
const endIntentAfter = (source: IntentSource, delayMs: number): void => {
  clearTimer(intentExpiryTimer);
  const sessionId = intentSession.value?.id;
  intentExpiryTimer = setTimeout(() => {
    sourcesAwaitingFreshInteraction.delete(source);
    if (intentSession.value?.id === sessionId && intentSession.value?.source === source) invalidateIntent();
  }, delayMs);
};
const beginOrRefreshIntent = (source: IntentSource, scrollTop: number): IntentSession | null => {
  const directInputAt = recordDirectInput();
  if (gateMode.value === 'blocked' || sourcesAwaitingFreshInteraction.has(source)) return null;
  const current = intentSession.value;
  if (current && current.source === source && directInputAt - current.startedAt > MAX_INTENT_SESSION_MS) {
    sourcesAwaitingFreshInteraction.add(source);
    invalidateIntent();
    return null;
  }
  if (current && current.source === source && !current.consumed) {
    current.lastDirectInputAt = directInputAt;
    return current;
  }
  invalidateIntent();
  const session: IntentSession = {
    id: ++nextIntentId,
    source,
    startedAt: directInputAt,
    lastDirectInputAt: directInputAt,
    startScrollTop: scrollTop,
    lastQualifiedScrollTop: scrollTop,
    sawAway: scrollTop >= TOP_REARM_PX,
    consumed: false,
    scrollWorkEpoch: scrollWorkEpoch.value,
  };
  intentSession.value = session;
  gateMode.value = 'intent';
  return session;
};
const beginScrollWork = (): number => {
  scrollWorkEpoch.value += 1;
  invalidateIntent();
  gateMode.value = 'blocked';
  clearTimer(blockedReleaseTimer);
  blockedReleaseTimer = null;
  return scrollWorkEpoch.value;
};
const nextAnimationFrame = (): Promise<void> => new Promise(resolve => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
  else setTimeout(resolve, 16);
});
const settleScrollWork = async (epoch: number): Promise<void> => {
  await nextTick();
  const el = getConversationScrollContainer();
  let previous = el ? `${el.scrollTop}:${el.scrollHeight}` : '';
  let stableFrames = 0;
  while (stableFrames < 2 && gateMode.value === 'blocked' && scrollWorkEpoch.value === epoch) {
    await nextAnimationFrame();
    const currentEl = getConversationScrollContainer();
    const current = currentEl ? `${currentEl.scrollTop}:${currentEl.scrollHeight}` : '';
    stableFrames = current === previous ? stableFrames + 1 : 0;
    previous = current;
  }
  if (gateMode.value !== 'blocked' || scrollWorkEpoch.value !== epoch
    || props.browseState === 'loading' || pendingBrowseAnchor.value
    || activeTouch || activeScrollbarPointerId !== null) return;
  const quietRemaining = POST_WORK_INPUT_QUIET_MS - (now() - lastDirectInputAt);
  if (quietRemaining > 0) {
    blockedReleaseTimer = setTimeout(() => { void settleScrollWork(epoch); }, quietRemaining);
    return;
  }
  gateMode.value = 'idle';
};
const writeScrollTop = (write: (el: HTMLElement) => void): void => {
  const el = getConversationScrollContainer();
  if (!el) return;
  const epoch = beginScrollWork();
  write(el);
  void settleScrollWork(epoch);
};

const getDistanceFromBottom = (el: HTMLElement): number => el.scrollHeight - el.scrollTop - el.clientHeight;
const isNearBottom = (el: HTMLElement): boolean => getDistanceFromBottom(el) <= NEAR_BOTTOM_THRESHOLD_PX;
const updatePinnedStateFromScrollPosition = (el?: HTMLElement | null): void => {
  const target = el ?? getConversationScrollContainer();
  if (!target || props.browseState !== 'latest') return;
  shouldStickToBottom.value = isNearBottom(target);
  if (shouldStickToBottom.value) hasUnseenActivity.value = false;
};
const scrollToBottom = (): void => { writeScrollTop(el => { el.scrollTop = el.scrollHeight; }); };
const captureBrowseAnchor = (): BrowseAnchor | null => {
  const el = getConversationScrollContainer();
  if (!el) return null;
  const containerTop = el.getBoundingClientRect().top;
  const visuals = Array.from(el.querySelectorAll<HTMLElement>('[data-event-monitor-visual-key]'));
  const first = visuals.find(visual => visual.getBoundingClientRect().bottom >= containerTop) ?? null;
  return {
    scrollHeight: el.scrollHeight,
    scrollTop: el.scrollTop,
    visualId: first?.dataset.eventMonitorVisualKey ?? null,
    offset: first ? first.getBoundingClientRect().top - containerTop : 0,
  };
};
const dispatchEarlierPage = (): void => {
  const session = intentSession.value;
  if (session) session.consumed = true;
  pendingBrowseAnchor.value = captureBrowseAnchor();
  beginScrollWork();
  emit('load-earlier');
};
const retryEarlierPage = (): void => dispatchEarlierPage();
const restoreBrowseAnchor = async (): Promise<void> => {
  const anchor = pendingBrowseAnchor.value;
  if (!anchor) {
    void settleScrollWork(scrollWorkEpoch.value);
    return;
  }
  await nextTick();
  const el = getConversationScrollContainer();
  if (el) {
    const retained = anchor.visualId
      ? Array.from(el.querySelectorAll<HTMLElement>('[data-event-monitor-visual-key]'))
        .find(visual => visual.dataset.eventMonitorVisualKey === anchor.visualId)
      : null;
    if (retained) {
      el.scrollTop += retained.getBoundingClientRect().top - el.getBoundingClientRect().top - anchor.offset;
    } else {
      el.scrollTop = anchor.scrollTop + (el.scrollHeight - anchor.scrollHeight);
    }
  }
  pendingBrowseAnchor.value = null;
  void settleScrollWork(scrollWorkEpoch.value);
};
const jumpToLatest = (): void => {
  beginScrollWork();
  if (props.browseState !== 'latest') emit('jump-to-latest');
  shouldStickToBottom.value = true;
  hasUnseenActivity.value = false;
  pendingBrowseAnchor.value = null;
  void nextTick(scrollToBottom);
};

const inputCanQualifyScroll = (session: IntentSession, inputAt: number): boolean => {
  if (session.source === 'touch' && activeTouch) return true;
  if (session.source === 'scrollbar' && activeScrollbarPointerId !== null) return true;
  return inputAt - session.lastDirectInputAt <= DIRECT_INPUT_EFFECT_MS;
};
const maybeRequestEarlier = (el: HTMLElement): void => {
  const session = intentSession.value;
  const inputAt = now();
  if (gateMode.value !== 'intent' || !session || session.consumed
    || session.scrollWorkEpoch !== scrollWorkEpoch.value
    || inputAt - session.startedAt > MAX_INTENT_SESSION_MS
    || !inputCanQualifyScroll(session, inputAt)) return;
  const scrollTop = el.scrollTop;
  if (scrollTop >= session.lastQualifiedScrollTop) return;
  const crossedTop = session.lastQualifiedScrollTop > TOP_TRIGGER_PX && scrollTop <= TOP_TRIGGER_PX;
  session.lastQualifiedScrollTop = scrollTop;
  if (session.sawAway && crossedTop && props.canLoadEarlier && props.browseState !== 'loading') {
    dispatchEarlierPage();
  }
};
const handleConversationScroll = (event: Event): void => {
  const el = event.currentTarget as HTMLElement | null;
  updatePinnedStateFromScrollPosition(el);
  if (el) maybeRequestEarlier(el);
};
const handleWheelInput = (event: WheelEvent): void => {
  if (!isTrusted(event)) return;
  if (gateMode.value === 'blocked') {
    recordDirectInput();
    return;
  }
  if (event.deltaY >= 0) return;
  const el = event.currentTarget as HTMLElement;
  beginOrRefreshIntent('wheel', el.scrollTop);
  endIntentAfter('wheel', WHEEL_IDLE_MS);
};
const handleKeyInput = (event: KeyboardEvent): void => {
  const upwardKey = event.key === 'ArrowUp' || event.key === 'PageUp' || event.key === 'Home'
    || (event.key === ' ' && event.shiftKey);
  if (!isTrusted(event) || !upwardKey) return;
  if (gateMode.value === 'blocked') {
    recordDirectInput();
    return;
  }
  const el = event.currentTarget as HTMLElement;
  beginOrRefreshIntent('keyboard', el.scrollTop);
  endIntentAfter('keyboard', DIRECT_INPUT_EFFECT_MS);
};
const handleTouchStart = (event: TouchEvent): void => {
  if (!isTrusted(event) || event.touches.length === 0) return;
  activeTouch = true;
  lastTouchY = event.touches[0].clientY;
  if (gateMode.value === 'blocked') recordDirectInput();
};
const handleTouchMove = (event: TouchEvent): void => {
  if (!isTrusted(event) || !activeTouch || event.touches.length === 0) return;
  const touchY = event.touches[0].clientY;
  const movedTowardEarlier = lastTouchY !== null && touchY > lastTouchY;
  lastTouchY = touchY;
  if (!movedTowardEarlier) return;
  const el = event.currentTarget as HTMLElement;
  beginOrRefreshIntent('touch', el.scrollTop);
};
const handleTouchEnd = (): void => {
  activeTouch = false; lastTouchY = null;
  recordDirectInput();
  endIntentAfter('touch', DIRECT_INPUT_EFFECT_MS);
  if (gateMode.value === 'blocked') void settleScrollWork(scrollWorkEpoch.value);
};
const handleTouchCancel = (): void => {
  activeTouch = false; lastTouchY = null;
  sourcesAwaitingFreshInteraction.delete('touch');
  invalidateIntent();
  if (gateMode.value === 'blocked') void settleScrollWork(scrollWorkEpoch.value);
};
const isNativeScrollbarGutter = (el: HTMLElement, event: PointerEvent): boolean => {
  const gutterWidth = el.offsetWidth - el.clientWidth;
  if (gutterWidth <= 0) return false;
  const rect = el.getBoundingClientRect();
  const direction = typeof getComputedStyle === 'function' ? getComputedStyle(el).direction : 'ltr';
  return direction === 'rtl'
    ? event.clientX >= rect.left && event.clientX <= rect.left + gutterWidth
    : event.clientX <= rect.right && event.clientX >= rect.right - gutterWidth;
};
const handlePointerDown = (event: PointerEvent): void => {
  const el = event.currentTarget as HTMLElement;
  if (!isTrusted(event) || !isNativeScrollbarGutter(el, event)) return;
  activeScrollbarPointerId = event.pointerId;
  beginOrRefreshIntent('scrollbar', el.scrollTop);
};
const handlePointerMove = (event: PointerEvent): void => {
  if (!isTrusted(event) || event.pointerId !== activeScrollbarPointerId) return;
  const el = event.currentTarget as HTMLElement;
  beginOrRefreshIntent('scrollbar', el.scrollTop);
};
const handlePointerUp = (event: PointerEvent): void => {
  if (event.pointerId !== activeScrollbarPointerId) return;
  activeScrollbarPointerId = null;
  recordDirectInput();
  endIntentAfter('scrollbar', DIRECT_INPUT_EFFECT_MS);
  if (gateMode.value === 'blocked') void settleScrollWork(scrollWorkEpoch.value);
};
const handlePointerCancel = (event: PointerEvent): void => {
  if (event.pointerId !== activeScrollbarPointerId) return;
  activeScrollbarPointerId = null;
  sourcesAwaitingFreshInteraction.delete('scrollbar');
  invalidateIntent();
  if (gateMode.value === 'blocked') void settleScrollWork(scrollWorkEpoch.value);
};

const syncAutoScrollIfPinned = (): void => {
  const el = getConversationScrollContainer();
  if (!el || props.browseState !== 'latest' || !shouldStickToBottom.value || isNearBottom(el)) return;
  scrollToBottom();
};
const resetForSubject = (): void => {
  beginScrollWork();
  pendingBrowseAnchor.value = null;
  shouldStickToBottom.value = true;
  hasUnseenActivity.value = false;
  revisionBaseline.value = props.presentationRevision;
  void nextTick(scrollToBottom);
};
const invalidateForLostInteraction = (): void => {
  activeTouch = false;
  lastTouchY = null;
  activeScrollbarPointerId = null;
  sourcesAwaitingFreshInteraction.clear();
  invalidateIntent();
  if (gateMode.value === 'blocked') void settleScrollWork(scrollWorkEpoch.value);
};
const handleVisibilityChange = (): void => {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') invalidateForLostInteraction();
};

onMounted(() => {
  window.addEventListener('blur', invalidateForLostInteraction);
  window.addEventListener('pointerup', handlePointerUp as EventListener);
  window.addEventListener('pointercancel', handlePointerCancel as EventListener);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  scrollToBottom();
});
onUpdated(syncAutoScrollIfPinned);
onBeforeUnmount(() => {
  window.removeEventListener('blur', invalidateForLostInteraction);
  window.removeEventListener('pointerup', handlePointerUp as EventListener);
  window.removeEventListener('pointercancel', handlePointerCancel as EventListener);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  clearTimer(intentExpiryTimer);
  clearTimer(blockedReleaseTimer);
  clearTimer(loadingDelayTimer);
});

watch(() => [props.conversation.id, props.runId], resetForSubject);
watch(() => props.presentationRevision, revision => {
  if (revision <= revisionBaseline.value) {
    revisionBaseline.value = revision;
    hasUnseenActivity.value = false;
    return;
  }
  revisionBaseline.value = revision;
  if (props.browseState !== 'latest') return;
  if (shouldStickToBottom.value) void nextTick(scrollToBottom);
  else hasUnseenActivity.value = true;
});
watch(() => props.browseState, state => {
  clearTimer(loadingDelayTimer);
  loadingDelayTimer = null;
  showLoadingDots.value = false;
  if (state === 'loading') {
    loadingDelayTimer = setTimeout(() => {
      if (props.browseState === 'loading') showLoadingDots.value = true;
    }, LOADING_PRESENTATION_DELAY_MS);
  }
  if (state !== 'loading' && pendingBrowseAnchor.value) void restoreBrowseAnchor();
}, { immediate: true });
</script>
