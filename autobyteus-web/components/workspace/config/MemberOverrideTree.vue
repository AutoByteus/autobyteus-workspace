<template>
  <div :class="treeClass" data-test="member-override-tree">
    <template v-for="node in memberNodes" :key="node.address">
      <div
        v-if="node.kind === 'agent_team'"
        class="bg-slate-50/70 p-3"
        data-test="member-override-group"
      >
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <span class="truncate text-sm font-semibold text-slate-800" :title="node.address">
            {{ node.displayName || node.displayName }}
          </span>
          <span class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500">
            Team
          </span>
          <span class="truncate font-mono text-xs text-slate-500" :title="node.address">
            {{ node.address }}
          </span>
        </div>
        <div class="mt-3">
          <MemberOverrideTree
            :member-nodes="node.children"
            :config="config"
            :global-runtime-kind="globalRuntimeKind"
            :global-llm-model="globalLlmModel"
            :global-llm-config="globalLlmConfig"
            :coordinator-address="coordinatorAddress"
            :disabled="disabled"
            :advanced-initially-expanded="advancedInitiallyExpanded"
            :read-only-mode="readOnlyMode"
            :nested="true"
            @update:override="forwardOverrideUpdate"
          />
        </div>
      </div>

      <MemberOverrideItem
        v-else
        :member-name="node.displayName"
        :member-address="node.address"
        :member-breadcrumb="node.address.split('/').filter(Boolean).join(' / ')"
        :override="config.memberOverrides[node.address]"
        :global-runtime-kind="globalRuntimeKind"
        :global-llm-model="globalLlmModel"
        :global-llm-config="globalLlmConfig"
        :is-coordinator="node.address === coordinatorAddress"
        :disabled="disabled"
        :advanced-initially-expanded="advancedInitiallyExpanded"
        :missing-historical-config="memberMissingHistoricalConfig(node.address)"
        @update:override="forwardOverrideUpdate"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MemberConfigOverride, TeamRunConfig } from '~/types/agent/TeamRunConfig';
import type { TeamDefinitionMemberNode } from '~/utils/teamDefinitionMembers';
import MemberOverrideItem from './MemberOverrideItem.vue';
import {
  hasExplicitMemberLlmConfigOverride,
} from '~/utils/teamRunConfigUtils';

const props = defineProps<{
  memberNodes: readonly TeamDefinitionMemberNode[];
  config: Readonly<TeamRunConfig>;
  globalRuntimeKind: string;
  globalLlmModel: string;
  globalLlmConfig?: Record<string, unknown> | null;
  coordinatorAddress: string;
  disabled: boolean;
  advancedInitiallyExpanded?: boolean;
  readOnlyMode?: boolean;
  nested?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:override', memberAddress: string, override: MemberConfigOverride | null): void;
}>();

const treeClass = computed(() => [
  'divide-y',
  props.nested
    ? 'border-l border-slate-300 pl-3 divide-slate-300'
    : 'overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm divide-slate-300',
]);

const memberMissingHistoricalConfig = (memberAddress: string) => {
  if (!props.readOnlyMode) return false;
  const override = props.config.memberOverrides[memberAddress];
  if (hasExplicitMemberLlmConfigOverride(override)) {
    return override?.llmConfig == null;
  }
  return props.config.llmConfig == null;
};

const forwardOverrideUpdate = (memberAddress: string, override: MemberConfigOverride | null) => {
  emit('update:override', memberAddress, override);
};
</script>
