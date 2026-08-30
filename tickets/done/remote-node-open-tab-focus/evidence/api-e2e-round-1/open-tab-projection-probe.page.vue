<template>
  <main class="min-h-screen bg-slate-100 p-8 text-slate-900" data-test="open-tab-projection-probe">
    <section class="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow">
      <h1 class="text-xl font-semibold">Open-tab projection boundary probe</h1>
      <p data-test="readiness">ready={{ ready }}</p>
      <p data-test="active-tab">activeTab={{ rightSideTabs.activeTab.value }}</p>
      <p data-test="panel-visible">panelVisible={{ rightPanel.isRightPanelVisible.value }}</p>
      <p data-test="node-id">nodeId={{ windowNodeContextStore.nodeId }}</p>
      <p data-test="browser-available">browserAvailable={{ browserShellStore.browserAvailable }}</p>
      <pre class="mt-4 overflow-auto rounded bg-slate-950 p-4 text-xs text-emerald-300" data-test="probe-result">{{ renderedResult }}</pre>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { Conversation } from '~/types/conversation';
import type { BrowserShellSnapshot } from '~/types/browserShell';
import { EMBEDDED_NODE_ID } from '~/types/node';
import { dispatchAgentStreamMessage } from '~/services/agentStreaming/agentStreamMessageProjector';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useBrowserShellStore } from '~/stores/browserShellStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useRightSideTabs } from '~/composables/useRightSideTabs';
import { useRightPanel } from '~/composables/useRightPanel';

type ProbeScenarioResult = {
  id: string;
  result: 'Pass';
  nodeId: string;
  browserAvailable: boolean;
  activeTab: string;
  panelVisible: boolean;
  focusCalls: string[];
  activityStatus: string | null;
  activityResult: unknown;
  conversationSegmentStatus: string | null;
  executionEvents: string[];
  notes: string[];
};

type ProbeResult = {
  result: 'Pass';
  scenarios: Record<string, ProbeScenarioResult>;
};

type ProbeControl = {
  ready: boolean;
  run: (remoteOpenTabResult?: Record<string, unknown> | null) => Promise<ProbeResult>;
  snapshot: () => Record<string, unknown>;
};

const ready = ref(false);
const result = ref<ProbeResult | null>(null);
const renderedResult = computed(() => JSON.stringify(result.value, null, 2));
const browserShellStore = useBrowserShellStore();
const windowNodeContextStore = useWindowNodeContextStore();
const activityStore = useAgentActivityStore();
const rightSideTabs = useRightSideTabs();
const rightPanel = useRightPanel();
const focusCalls: string[] = [];
const executionEvents: string[] = [];
let snapshotListener: ((snapshot: BrowserShellSnapshot) => void) | null = null;
let pendingFocus: { tabId: string; resolve: (snapshot: BrowserShellSnapshot) => void } | null = null;

const configFor = (runId: string): AgentRunConfig => ({
  agentDefinitionId: `${runId}-definition`,
  agentDefinitionName: `${runId}-definition`,
  llmModelIdentifier: 'probe-model',
  runtimeKind: 'autobyteus',
  workspaceId: null,
  workspaceMetadata: null,
  autoExecuteTools: false,
  skillAccessMode: 'NONE',
  isLocked: true,
  llmConfig: null,
});

const makeContext = (runId: string): AgentContext => {
  const conversation: Conversation = {
    id: runId,
    messages: [],
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
    agentDefinitionId: `${runId}-definition`,
  };
  return new AgentContext(configFor(runId), new AgentRunState(runId, conversation));
};

const assertProbe = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

const waitFor = async (description: string, predicate: () => boolean, timeoutMs = 3000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${description}`);
};

const currentSnapshot = (activeTabId: string | null = null): BrowserShellSnapshot => ({
  activeTabId,
  sessions: activeTabId
    ? [{ tab_id: activeTabId, title: 'Probe target', url: `http://probe.local/${activeTabId}` }]
    : [],
});

const installBrowserApi = (): void => {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    writable: true,
    value: {
      getBrowserShellSnapshot: async () => currentSnapshot(),
      onBrowserShellSnapshotUpdated: (listener: (snapshot: BrowserShellSnapshot) => void) => {
        snapshotListener = listener;
        return () => {
          if (snapshotListener === listener) snapshotListener = null;
        };
      },
      focusBrowserTab: (tabId: string) => {
        focusCalls.push(tabId);
        executionEvents.push(`focus-called:${tabId}`);
        return new Promise<BrowserShellSnapshot>((resolve) => {
          pendingFocus = { tabId, resolve };
        });
      },
    } as Partial<Window['electronAPI']>,
  });
};

const resetScenario = (
  runId: string,
  nodeId: string,
  browserAvailable: boolean,
  panelVisible: boolean,
): AgentContext => {
  focusCalls.splice(0);
  executionEvents.splice(0);
  pendingFocus = null;
  activityStore.clearActivities(runId);
  rightSideTabs.setActiveTab('terminal');
  rightPanel.setRightPanelVisible(panelVisible);
  windowNodeContextStore.bindNodeContext(nodeId, 'http://127.0.0.1:65534');
  browserShellStore.initialized = false;
  browserShellStore.browserAvailable = browserAvailable;
  browserShellStore.activeTabId = null;
  browserShellStore.sessions = [];
  browserShellStore.lastError = null;
  return makeContext(runId);
};

const dispatchOpenTab = (
  context: AgentContext,
  runId: string,
  targetKind: 'standalone' | 'team_member',
  tabId: string,
  externalResult?: Record<string, unknown> | null,
): void => {
  const target = targetKind === 'standalone'
    ? { kind: 'standalone', context, runId } as const
    : {
        kind: 'team_member',
        context,
        teamRunId: 'probe-team-run',
        agentRunId: runId,
        memberAddress: '/probe/member',
      } as const;
  dispatchAgentStreamMessage({
    type: 'TOOL_EXECUTION_STARTED',
    payload: {
      invocation_id: `${runId}-open-tab`,
      tool_name: 'open_tab',
      turn_id: `${runId}-turn`,
      arguments: { url: `http://probe.local/${tabId}` },
    },
  } as any, target as any);
  dispatchAgentStreamMessage({
    type: 'TOOL_EXECUTION_SUCCEEDED',
    payload: {
      invocation_id: `${runId}-open-tab`,
      tool_name: 'open_tab',
      turn_id: `${runId}-turn`,
      result: externalResult ?? {
        tab_id: tabId,
        status: 'opened',
        url: `http://probe.local/${tabId}`,
        title: 'Probe target',
      },
    },
  } as any, target as any);
};

const capture = (
  id: string,
  context: AgentContext,
  runId: string,
  notes: string[],
): ProbeScenarioResult => {
  const activity = activityStore.getToolActivities(runId).find((item) => item.invocationId === `${runId}-open-tab`);
  const aiMessage = context.conversation.messages.find((message) => message.type === 'ai') as any;
  const segment = aiMessage?.segments?.find((item: any) => item.invocationId === `${runId}-open-tab`);
  return {
    id,
    result: 'Pass',
    nodeId: windowNodeContextStore.nodeId,
    browserAvailable: browserShellStore.browserAvailable,
    activeTab: rightSideTabs.activeTab.value,
    panelVisible: rightPanel.isRightPanelVisible.value,
    focusCalls: [...focusCalls],
    activityStatus: activity?.status ?? null,
    activityResult: activity?.result ?? null,
    conversationSegmentStatus: segment?.status ?? null,
    executionEvents: [...executionEvents],
    notes,
  };
};

const assertGenericSuccess = (context: AgentContext, runId: string): void => {
  const activity = activityStore.getToolActivities(runId).find((item) => item.invocationId === `${runId}-open-tab`);
  const aiMessage = context.conversation.messages.find((message) => message.type === 'ai') as any;
  const segment = aiMessage?.segments?.find((item: any) => item.invocationId === `${runId}-open-tab`);
  assertProbe(activity?.status === 'success', `${runId}: expected successful generic activity`);
  assertProbe(activity?.result?.status === 'opened', `${runId}: expected retained open_tab result in activity`);
  assertProbe(segment?.status === 'success', `${runId}: expected successful conversation tool segment`);
  assertProbe(segment?.result?.tab_id, `${runId}: expected retained tab id in conversation result`);
};

const run = async (remoteOpenTabResult?: Record<string, unknown> | null): Promise<ProbeResult> => {
  const scenarios: Record<string, ProbeScenarioResult> = {};

  {
    const runId = 'remote-standalone-run';
    const context = resetScenario(runId, 'configured-remote-node', true, false);
    const tabId = typeof remoteOpenTabResult?.tab_id === 'string'
      ? remoteOpenTabResult.tab_id
      : 'remote-standalone-tab';
    dispatchOpenTab(context, runId, 'standalone', tabId, remoteOpenTabResult);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assertGenericSuccess(context, runId);
    assertProbe(focusCalls.length === 0, 'remote standalone must not call Electron focus');
    assertProbe(rightSideTabs.activeTab.value === 'terminal', 'remote standalone must preserve selected right tab');
    assertProbe(rightPanel.isRightPanelVisible.value === false, 'remote standalone must preserve collapsed panel state');
    scenarios['API-E2E-005A'] = capture('API-E2E-005A', context, runId, [
      'Real window-node store classified the configured node as remote.',
      'Real projector preserved success/activity while the Electron focus API and Browser selection remained untouched.',
      'Collapsed panel preference remained collapsed.',
      remoteOpenTabResult
        ? 'The projected payload was the retained outcome from the owned Docker Chromium execution.'
        : 'The projected payload used the deterministic probe result.',
    ]);
  }

  {
    const runId = 'remote-team-member-run';
    const context = resetScenario(runId, 'configured-remote-node', true, true);
    dispatchOpenTab(context, runId, 'team_member', 'remote-team-tab');
    await new Promise((resolve) => setTimeout(resolve, 50));
    assertGenericSuccess(context, runId);
    assertProbe(focusCalls.length === 0, 'remote team member must not call Electron focus');
    assertProbe(rightSideTabs.activeTab.value === 'terminal', 'remote team member must preserve selected right tab');
    assertProbe(rightPanel.isRightPanelVisible.value === true, 'remote team member must preserve visible panel state');
    scenarios['API-E2E-005B'] = capture('API-E2E-005B', context, runId, [
      'The team-member projector target used the same real success projector and browser owner.',
      'Visible panel state and non-Browser selection remained unchanged.',
    ]);
  }

  {
    const runId = 'embedded-run';
    const context = resetScenario(runId, EMBEDDED_NODE_ID, true, false);
    dispatchOpenTab(context, runId, 'standalone', 'embedded-tab');
    await waitFor('embedded focus call', () => pendingFocus?.tabId === 'embedded-tab');
    assertGenericSuccess(context, runId);
    assertProbe(rightSideTabs.activeTab.value === 'terminal', 'Browser must not be selected before focus resolves');
    assertProbe(rightPanel.isRightPanelVisible.value === false, 'embedded projection must not open a collapsed panel');
    executionEvents.push('focus-resolved:embedded-tab');
    const resolvedSnapshot = currentSnapshot('embedded-tab');
    pendingFocus!.resolve(resolvedSnapshot);
    snapshotListener?.(resolvedSnapshot);
    await waitFor('Browser tab selection after focus', () => rightSideTabs.activeTab.value === 'browser');
    executionEvents.push('browser-selected:embedded-tab');
    assertProbe(browserShellStore.activeTabId === 'embedded-tab', 'embedded focus snapshot must update real Browser store state');
    assertProbe(rightPanel.isRightPanelVisible.value === false, 'embedded Browser selection must preserve collapsed panel state');
    scenarios['API-E2E-006'] = capture('API-E2E-006', context, runId, [
      'The real Browser-shell store awaited the emulated preload focus promise before the real right-tab state changed.',
      'Resolved focus snapshot selected the embedded session; collapsed panel preference remained unchanged.',
    ]);
  }

  {
    const runId = 'embedded-browser-unavailable-run';
    const context = resetScenario(runId, EMBEDDED_NODE_ID, false, true);
    dispatchOpenTab(context, runId, 'standalone', 'unavailable-tab');
    await new Promise((resolve) => setTimeout(resolve, 50));
    assertGenericSuccess(context, runId);
    assertProbe(focusCalls.length === 0, 'Browser-unavailable embedded result must not call focus');
    assertProbe(rightSideTabs.activeTab.value === 'terminal', 'Browser-unavailable embedded result must preserve selection');
    assertProbe(rightPanel.isRightPanelVisible.value === true, 'Browser-unavailable result must preserve visible panel state');
    scenarios['API-E2E-007'] = capture('API-E2E-007', context, runId, [
      'Authoritative embedded identity alone did not enable projection when the Browser shell was unavailable.',
      'Generic success/activity remained truthful.',
    ]);
  }

  result.value = { result: 'Pass', scenarios };
  return result.value;
};

const snapshot = (): Record<string, unknown> => ({
  ready: ready.value,
  nodeId: windowNodeContextStore.nodeId,
  isEmbeddedWindow: windowNodeContextStore.isEmbeddedWindow,
  browserAvailable: browserShellStore.browserAvailable,
  activeBrowserTabId: browserShellStore.activeTabId,
  activeTab: rightSideTabs.activeTab.value,
  panelVisible: rightPanel.isRightPanelVisible.value,
  focusCalls: [...focusCalls],
  executionEvents: [...executionEvents],
  result: result.value,
});

onMounted(() => {
  installBrowserApi();
  ready.value = true;
  const control: ProbeControl = { ready: true, run, snapshot };
  (window as typeof window & { __openTabProjectionProbe?: ProbeControl }).__openTabProjectionProbe = control;
});

onBeforeUnmount(() => {
  delete (window as typeof window & { __openTabProjectionProbe?: ProbeControl }).__openTabProjectionProbe;
});
</script>
