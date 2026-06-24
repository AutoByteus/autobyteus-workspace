<template>
  <div class="space-y-2" data-test="member-override-tree">
    <template v-for="node in memberNodes" :key="node.memberRouteKey">
      <div
        v-if="node.memberKind === 'agent_team'"
        class="rounded-md border border-slate-200 bg-slate-50 p-3"
        data-test="member-override-group"
      >
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <span class="truncate text-sm font-semibold text-slate-800" :title="node.memberRouteKey">
            {{ node.displayName || node.memberName }}
          </span>
          <span class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500">
            Team
          </span>
          <span class="truncate font-mono text-xs text-slate-500" :title="node.memberRouteKey">
            {{ node.memberRouteKey }}
          </span>
        </div>
        <div class="mt-3 border-l border-slate-200 pl-3">
          <MemberOverrideTree
            :member-nodes="node.children"
            :config="config"
            :global-runtime-kind="globalRuntimeKind"
            :global-llm-model="globalLlmModel"
            :global-llm-config="globalLlmConfig"
            :coordinator-member-route-key="coordinatorMemberRouteKey"
            :disabled="disabled"
            :advanced-initially-expanded="advancedInitiallyExpanded"
            :read-only-mode="readOnlyMode"
            @update:override="forwardOverrideUpdate"
          />
        </div>
      </div>

      <MemberOverrideItem
        v-else
        :member-name="node.memberName"
        :member-route-key="node.memberRouteKey"
        :member-breadcrumb="node.memberPath.join(' / ')"
        :agent-definition-id="node.agentDefinitionId"
        :override="config.memberOverrides[node.memberRouteKey]"
        :global-runtime-kind="globalRuntimeKind"
        :global-llm-model="globalLlmModel"
        :global-llm-config="globalLlmConfig"
        :is-coordinator="node.memberRouteKey === coordinatorMemberRouteKey"
        :disabled="disabled"
        :advanced-initially-expanded="advancedInitiallyExpanded"
        :missing-historical-config="memberMissingHistoricalConfig(node.memberRouteKey)"
        @update:override="forwardOverrideUpdate"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { MemberConfigOverride, TeamRunConfig } from '~/types/agent/TeamRunConfig';
import type { TeamMemberNode } from '~/types/agent/AgentTeamContext';
import MemberOverrideItem from './MemberOverrideItem.vue';
import {
  hasExplicitMemberLlmConfigOverride,
} from '~/utils/teamRunConfigUtils';

const props = defineProps<{
  memberNodes: TeamMemberNode[];
  config: TeamRunConfig;
  globalRuntimeKind: string;
  globalLlmModel: string;
  globalLlmConfig?: Record<string, unknown> | null;
  coordinatorMemberRouteKey: string;
  disabled: boolean;
  advancedInitiallyExpanded?: boolean;
  readOnlyMode?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:override', memberRouteKey: string, override: MemberConfigOverride | null): void;
}>();

const memberMissingHistoricalConfig = (memberRouteKey: string) => {
  if (!props.readOnlyMode) return false;
  const override = props.config.memberOverrides[memberRouteKey];
  if (hasExplicitMemberLlmConfigOverride(override)) {
    return override?.llmConfig == null;
  }
  return props.config.llmConfig == null;
};

const forwardOverrideUpdate = (memberRouteKey: string, override: MemberConfigOverride | null) => {
  emit('update:override', memberRouteKey, override);
};
</script>
