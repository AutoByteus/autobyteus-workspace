<template>
  <!-- An Activity row's details, full screen over the Activity list (autobyteus-590 D-6): a tool call's status, full summary
       and its Arguments, Logs, Result and Error; a compaction's rows. Read live from the run's activities while open. -->
  <section class="fixed inset-0 z-30 flex h-[100dvh] flex-col bg-white text-slate-900" data-testid="mobile-activity-detail">
    <MobileScreenBar :title="title" @back="$emit('back')" />
    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4" data-testid="mobile-activity-detail-body">
      <p v-if="!activity" class="py-10 text-center text-sm text-slate-500" data-testid="mobile-activity-detail-missing">
        {{ $t('workspace.components.mobile.views.MobileActivityDetail.no_longer_available') }}
      </p>

      <template v-else-if="activity.kind === 'tool'">
        <dl class="space-y-3 text-sm">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('workspace.components.mobile.views.MobileActivityDetail.status') }}</dt>
            <dd class="mt-1 inline-flex items-center gap-1.5 font-semibold" :class="TONE_TEXT[toolStatus.tone]" data-testid="mobile-activity-detail-status">
              <Icon :icon="toolStatus.icon" class="h-4 w-4" aria-hidden="true" />{{ toolStatus.label }}
            </dd>
          </div>
          <div v-if="fullSummary">
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('workspace.components.mobile.views.MobileActivityDetail.call') }}</dt>
            <dd
              class="mt-1 whitespace-pre-wrap break-words text-slate-800"
              :class="fullSummary.kind === 'text' ? '' : 'font-mono text-[0.8125rem]'"
              data-testid="mobile-activity-detail-summary"
            >{{ fullSummary.title }}</dd>
          </div>
        </dl>

        <section
          v-for="section in sections"
          :key="section.key"
          class="mt-4 rounded-lg border"
          :class="section.key === 'error' ? 'border-red-200' : 'border-slate-200'"
          :data-testid="`mobile-activity-detail-${section.key}`"
        >
          <button
            type="button"
            class="flex min-h-[2.75rem] w-full items-center justify-between gap-3 px-3 text-left text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
            :class="section.key === 'error' ? 'text-red-700' : 'text-slate-800'"
            :aria-expanded="isOpen(section)"
            :data-testid="`mobile-activity-detail-${section.key}-toggle`"
            @click="toggle(section)"
          >
            <span>{{ sectionTitle(section) }}</span>
            <Icon :icon="isOpen(section) ? 'heroicons:chevron-up-20-solid' : 'heroicons:chevron-down-20-solid'" class="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
          </button>
          <pre
            v-show="isOpen(section)"
            class="max-w-full overflow-x-auto whitespace-pre-wrap break-words border-t px-3 py-2.5 font-mono text-xs leading-5"
            :class="section.key === 'error' ? 'border-red-100 bg-red-50 text-red-800' : 'border-slate-100 bg-slate-50 text-slate-800'"
            :data-testid="`mobile-activity-detail-${section.key}-text`"
          >{{ section.text }}</pre>
        </section>
      </template>

      <template v-else-if="activity.kind === 'compaction'">
        <dl class="space-y-3 text-sm">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('workspace.components.mobile.views.MobileActivityDetail.status') }}</dt>
            <dd class="mt-1 inline-flex items-center gap-1.5 font-semibold text-slate-800" data-testid="mobile-activity-detail-status">
              <Icon :icon="compactionStatus.icon" class="h-4 w-4" aria-hidden="true" />{{ compactionStatus.label }}
            </dd>
          </div>
          <p class="whitespace-pre-wrap break-words text-slate-700">{{ activity.message }}</p>
        </dl>
        <dl v-if="compactionRows.length" class="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm" data-testid="mobile-activity-detail-rows">
          <div v-for="row in compactionRows" :key="row.label" class="px-3 py-2.5" :data-testid="row.label === 'Error' ? 'mobile-activity-detail-error' : undefined">
            <dt class="text-xs font-semibold text-slate-500">{{ row.label }}</dt>
            <dd class="mt-0.5 whitespace-pre-wrap break-words font-mono text-[0.8125rem]" :class="row.label === 'Error' ? 'text-red-700' : 'text-slate-800'">{{ row.value }}</dd>
          </div>
        </dl>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { Icon } from '@iconify/vue';
import MobileScreenBar from '~/components/mobile/MobileScreenBar.vue';
import { useLocalization } from '~/composables/useLocalization';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import {
  toolActivityDetailSections,
  toolActivityStatusPresentation,
  type ToolActivityDetailSection,
  type ToolActivityDetailSectionKey,
  type ToolActivityTone,
} from '~/utils/activity/toolActivityPresentation';
import { compactionActivityDetailRows, getCompactionPhasePresentation } from '~/utils/compactionActivityPresentation';
import { getToolDisplaySummary } from '~/utils/toolDisplaySummary';

const props = defineProps<{ runId: string; activityId: string }>();
defineEmits<{ (event: 'back'): void }>();

const { t } = useLocalization();
const activityStore = useAgentActivityStore();

/** The activity as the store has it now: its logs, result and status change while the screen is open. */
const activity = computed(() => activityStore.getActivities(props.runId).find((entry) => entry.activityId === props.activityId) ?? null);

const title = computed(() => {
  if (activity.value?.kind === 'tool') return activity.value.toolName;
  if (activity.value?.kind === 'compaction') return t('workspace.components.progress.CompactionActivityItem.memory_compaction');
  return '';
});

const TONE_TEXT: Record<ToolActivityTone, string> = {
  green: 'text-green-700', red: 'text-red-700', cyan: 'text-cyan-700', slate: 'text-slate-700',
  blue: 'text-blue-700', amber: 'text-amber-800', gray: 'text-gray-600', neutral: 'text-gray-600',
};

const toolStatus = computed(() => toolActivityStatusPresentation(activity.value?.kind === 'tool' ? activity.value.status : 'interrupted'));
/** The call's full summary: the whole command (with its cd) or the full path. */
const fullSummary = computed(() => (activity.value?.kind === 'tool'
  ? getToolDisplaySummary(activity.value.toolName, activity.value.arguments, { preferCompactPath: false })
  : null));
const sections = computed(() => (activity.value?.kind === 'tool' ? toolActivityDetailSections(activity.value) : []));

const compactionStatus = computed(() => getCompactionPhasePresentation(activity.value?.kind === 'compaction' ? activity.value.phase : 'requested'));
const compactionRows = computed(() => (activity.value?.kind === 'compaction' ? compactionActivityDetailRows(activity.value) : []));

/** A section reads open while it is short enough to scan (an error always); the reader's tap decides after that. */
const OPEN_UP_TO_CHARS = 4000;
const toggled = reactive<Partial<Record<ToolActivityDetailSectionKey, boolean>>>({});
const isOpen = (section: ToolActivityDetailSection): boolean =>
  toggled[section.key] ?? (section.key === 'error' || section.text.length <= OPEN_UP_TO_CHARS);
const toggle = (section: ToolActivityDetailSection): void => { toggled[section.key] = !isOpen(section); };

const sectionTitle = (section: ToolActivityDetailSection): string => {
  switch (section.key) {
    case 'arguments': return t('workspace.components.progress.ToolActivityItem.arguments');
    case 'logs': return t('workspace.components.mobile.views.MobileActivityDetail.logs', { count: section.lines?.length ?? 0 });
    case 'result': return t('workspace.components.progress.ToolActivityItem.result');
    case 'error': return t('workspace.components.progress.ToolActivityItem.error');
    default: return section.key;
  }
};
</script>
