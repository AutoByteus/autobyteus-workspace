<template>
  <section class="flex h-screen h-[100dvh] min-h-0 flex-col overflow-hidden overscroll-none bg-slate-100 text-slate-900" data-testid="mobile-work-shell">
    <header class="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm" data-testid="mobile-work-header">
      <button type="button" class="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" @click="$emit('home')">
        Home
      </button>
      <button type="button" class="min-w-0 flex-1 text-left" data-testid="mobile-context-title" @click="$emit('switchContext')">
        <p class="truncate text-base font-bold text-slate-950">{{ contextTitle }}</p>
        <p class="truncate text-xs text-slate-500">{{ contextSubtitle }}</p>
      </button>
      <button type="button" class="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" @click="$emit('switchContext')">
        Switch
      </button>
    </header>

    <MobileTeamMemberFocusBar v-if="showTeamFocusBar" :context="context" />

    <main class="min-h-0 flex-1 overflow-hidden bg-white" data-testid="mobile-work-task-surface">
      <MobileChat
        v-if="activeTab === 'chat'"
        :context="context"
        @choose-work="$emit('switchContext')"
        @show-runs="$emit('update:activeTab', 'runs')"
      />
      <MobileRuns
        v-else-if="activeTab === 'runs'"
        :context="context"
        @choose-work="$emit('switchContext')"
        @select-context="$emit('selectContext', $event)"
      />
      <MobileFiles
        v-else-if="activeTab === 'files'"
        :context="context"
        @choose-work="$emit('switchContext')"
      />
      <MobileArtifacts
        v-else-if="activeTab === 'artifacts'"
        :context="context"
        @choose-work="$emit('switchContext')"
      />
      <MobileActivity
        v-else
        :context="context"
        @choose-work="$emit('switchContext')"
      />
    </main>

    <nav class="grid shrink-0 grid-cols-5 border-t border-slate-200 bg-white/95" aria-label="Mobile work tasks" data-testid="mobile-bottom-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="flex flex-col items-center justify-center gap-0.5 py-1.5 text-center text-[10px] font-semibold transition"
        :class="activeTab === tab.id ? 'text-blue-700' : 'text-slate-500'"
        :aria-label="tab.label"
        :aria-current="activeTab === tab.id ? 'page' : undefined"
        :data-testid="`mobile-tab-${tab.id}`"
        @click="$emit('update:activeTab', tab.id)"
      >
        <span
          class="block rounded-full px-1.5 py-0.5 text-sm leading-none"
          :class="activeTab === tab.id ? 'bg-blue-50' : ''"
          aria-hidden="true"
        >
          {{ tab.icon }}
        </span>
        <span>{{ tab.label }}</span>
      </button>
    </nav>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MobileActivity from '~/components/mobile/MobileActivity.vue';
import MobileArtifacts from '~/components/mobile/MobileArtifacts.vue';
import MobileChat from '~/components/mobile/MobileChat.vue';
import MobileFiles from '~/components/mobile/MobileFiles.vue';
import MobileRuns from '~/components/mobile/MobileRuns.vue';
import MobileTeamMemberFocusBar from '~/components/mobile/MobileTeamMemberFocusBar.vue';
import type { MobileTaskTab, MobileWorkContext } from '~/types/mobileWork';
import { mobileWorkContextSubtitle, mobileWorkContextTitle } from '~/types/mobileWork';

const props = defineProps<{
  context: MobileWorkContext | null;
  activeTab: MobileTaskTab;
}>();

defineEmits<{
  home: [];
  switchContext: [];
  'update:activeTab': [tab: MobileTaskTab];
  selectContext: [context: MobileWorkContext];
}>();

const showTeamFocusBar = computed(() => props.context?.kind === 'team-run' && props.activeTab !== 'runs');

const tabs: Array<{ id: MobileTaskTab; label: string; icon: string }> = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'runs', label: 'Runs', icon: '▶' },
  { id: 'files', label: 'Files', icon: '📁' },
  { id: 'artifacts', label: 'Artifacts', icon: '▣' },
  { id: 'activity', label: 'Activity', icon: '●' },
];

const contextTitle = computed(() => mobileWorkContextTitle(props.context));
const contextSubtitle = computed(() => mobileWorkContextSubtitle(props.context));
</script>
