<template>
  <section class="fixed inset-0 z-10 flex h-[100dvh] flex-col bg-white text-slate-900" data-testid="mobile-run-screen" data-state="open">
    <header class="relative flex h-14 flex-shrink-0 items-center border-b border-slate-200 bg-white pl-1 pr-1">
      <button type="button" class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-600 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Back to runs" data-testid="mobile-run-back" @click="$emit('back')">
        <Icon icon="heroicons:arrow-left-20-solid" class="h-6 w-6" aria-hidden="true" />
      </button>
      <div class="flex h-12 min-w-0 flex-1 items-center gap-2 px-2" data-testid="mobile-run-title">
        <span class="h-2.5 w-2.5 flex-shrink-0 rounded-full" :class="dotClass" aria-hidden="true" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-base font-semibold leading-5" data-testid="mobile-run-name">{{ displayName }}</span>
          <span class="flex min-w-0 items-center gap-1.5">
            <RemoteNodeChip v-if="remote" :node-name="remote.nodeName" />
            <span class="min-w-0 truncate text-xs leading-4 text-slate-500" data-testid="mobile-run-subtitle">{{ subtitle }}</span>
          </span>
        </span>
      </div>
      <MobileRunMenu :show-messages="showMessages" @open-view="$emit('open-view', $event)" />
    </header>

    <div v-if="unreachable" class="min-h-0 flex-1 overflow-y-auto" data-testid="mobile-run-unreachable">
      <RemoteRunNotice :node-name="remote?.nodeName ?? ''" @retry="remoteView.retry()" />
    </div>
    <!-- The conversation's root clips (`overflow: clip`), so it is no scroll container: focusing the composer cannot
         scroll it, and with the keyboard open the bar stays at the top and the composer sits right above the keyboard
         (CRR-006 F-10; an `overflow: hidden` box can still be scrolled by focus, and kept that scroll after the resize). -->
    <AgentEventMonitor
      v-else
      :read-only="readOnly"
      :conversation="target.context.state.conversation"
      :run-id="target.context.state.runId"
      :agent-name="displayName"
      :agent-avatar-url="target.context.config.agentAvatarUrl || null"
      :inter-agent-sender-name-by-id="senderNameByAgentRunId"
      :presentation-revision="target.context.state.eventMonitorPresentationRevision"
      :has-earlier-active-trace-events="target.context.state.hasEarlierActiveTraceEvents"
      :browse-subject="target.browse"
      :composer-placeholder="remoteView.composerPlaceholder(null)"
      class="min-h-0 flex-1 !overflow-clip"
      data-testid="mobile-run-conversation"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import AgentEventMonitor from '~/components/workspace/agent/AgentEventMonitor.vue';
import RemoteNodeChip from '~/components/workspace/remote/RemoteNodeChip.vue';
import RemoteRunNotice from '~/components/workspace/remote/RemoteRunNotice.vue';
import MobileRunMenu from '~/components/mobile/runScreen/MobileRunMenu.vue';
import type { MobileView } from '~/composables/mobile/useMobileNavigation';
import { useTargetConversation } from '~/composables/workspace/useTargetConversation';
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget';
import { mobileRunStatusLabel } from '~/utils/mobile/mobileRunStatusLabel';
import { agentStatusDotClass } from '~/utils/workspaceStatusDotPresentation';

const props = defineProps<{ target: ActiveAgentWorkspaceTarget; parentName: string | null }>();
defineEmits<{ (event: 'back'): void; (event: 'open-view', view: MobileView): void }>();

const { displayName, readOnly, senderNameByAgentRunId, remoteView } = useTargetConversation(() => props.target);
const remote = remoteView.remote;
const unreachable = remoteView.unreachable;

const status = computed(() => (unreachable.value ? 'error' : props.target.context.state.currentStatus));
const dotClass = computed(() => agentStatusDotClass(status.value));
/** "Idle · in Software Engineering Team"; a top-level run has no "in"; a node that does not answer: "Not reachable". */
const subtitle = computed(() => {
  if (unreachable.value) return 'Not reachable';
  const state = mobileRunStatusLabel(props.target.context.state.currentStatus);
  return props.parentName ? `${state} · in ${props.parentName}` : state;
});

/** Messages are the messages among a Team's or an Org's members (spec: members of a team or Org only). */
const MEMBER_KINDS: ReadonlySet<ActiveAgentWorkspaceTarget['kind']> = new Set([
  'standalone_team_member', 'agent_org_direct_agent', 'agent_org_team_member', 'agent_org_task_team_member', 'agent_run_task_team_member',
]);
const showMessages = computed(() => MEMBER_KINDS.has(props.target.kind));
</script>
