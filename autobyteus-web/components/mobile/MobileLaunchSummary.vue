<template>
  <section class="rounded-2xl border border-blue-200 bg-white p-3 text-sm text-blue-950" data-testid="mobile-launch-summary">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Launch summary</p>
        <p class="mt-1 text-xs text-slate-500">Desktop-equivalent launch; provider/runtime errors appear after launch if the run reports them.</p>
      </div>
      <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
        {{ ready ? 'Ready' : 'Needs choices' }}
      </span>
    </div>

    <dl class="mt-3 grid gap-2">
      <div class="flex justify-between gap-3 rounded-xl bg-blue-50 px-3 py-2">
        <dt class="text-slate-500">Target</dt>
        <dd class="min-w-0 break-words text-right font-semibold text-slate-950">{{ targetLabel || 'Choose target' }}</dd>
      </div>
      <div class="flex justify-between gap-3 rounded-xl bg-blue-50 px-3 py-2">
        <dt class="text-slate-500">Workspace</dt>
        <dd class="min-w-0 break-words text-right font-semibold text-slate-950">{{ workspaceLabel || 'Choose workspace' }}</dd>
      </div>
      <div class="flex justify-between gap-3 rounded-xl bg-blue-50 px-3 py-2">
        <dt class="text-slate-500">Runtime/model</dt>
        <dd class="min-w-0 break-words text-right font-semibold text-slate-950">{{ modelLabel }}</dd>
      </div>
      <div class="rounded-xl bg-blue-50 px-3 py-2" data-testid="mobile-run-setup-context-count">
        <div class="flex justify-between gap-3">
          <dt class="text-slate-500">Context</dt>
          <dd class="font-semibold text-slate-950">{{ attachments.length }} file{{ attachments.length === 1 ? '' : 's' }}</dd>
        </div>
        <div v-if="attachments.length" class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="attachment in attachments"
            :key="attachment.id"
            class="max-w-full truncate rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800"
            data-testid="mobile-launch-summary-context-item"
          >
            {{ attachment.displayName }}
          </span>
        </div>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';

defineProps<{
  targetLabel: string;
  workspaceLabel: string;
  modelLabel: string;
  ready: boolean;
}>();

const mobileWorkStore = useMobileWorkStore();
const attachments = computed(() => mobileWorkStore.draftContextAttachments);
</script>
