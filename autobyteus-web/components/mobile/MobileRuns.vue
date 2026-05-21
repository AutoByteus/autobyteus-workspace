<template>
  <section class="flex h-full flex-col overflow-hidden" data-testid="mobile-runs">
    <header class="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Runs</p>
          <h2 class="text-xl font-bold text-slate-950">{{ showRunSetup ? 'Start new run' : 'Active and recent runs' }}</h2>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold"
          :class="showRunSetup ? 'border border-slate-300 bg-white text-slate-700' : 'bg-blue-600 text-white'"
          data-testid="mobile-start-run"
          @click="showRunSetup = !showRunSetup"
        >
          {{ showRunSetup ? 'Close setup' : 'Start new' }}
        </button>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-5">
      <MobileRunSetup
        v-if="showRunSetup"
        :context="context"
        :setup-intent="runSetupIntent"
        @cancel="showRunSetup = false"
        @launched="onLaunched"
        @setup-intent-consumed="mobileWorkStore.consumeRunSetupIntent"
      />

      <div v-else-if="recentItems.length" class="space-y-2" data-testid="mobile-runs-list">
        <MobileReadableWorkRow
          v-for="item in recentItems"
          :key="item.key"
          :label="item.label"
          :detail="item.detail"
          :meta="item.meta"
          @select="$emit('selectContext', item.context)"
        />
      </div>
      <div v-else class="rounded-3xl border border-dashed border-slate-300 p-6 text-center" data-testid="mobile-runs-empty">
        <p class="font-semibold text-slate-900">No runs loaded</p>
        <p class="mt-2 text-sm text-slate-500">Start new work or choose an existing run from the context switcher.</p>
        <div class="mt-4 grid gap-2">
          <button type="button" class="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white" @click="showRunSetup = true">
            Start new run
          </button>
          <button type="button" class="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700" @click="$emit('chooseWork')">
            Choose work
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import MobileReadableWorkRow from '~/components/mobile/MobileReadableWorkRow.vue';
import MobileRunSetup from '~/components/mobile/MobileRunSetup.vue';
import { useMobileWorkCatalog } from '~/composables/mobile/useMobileWorkCatalog';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import type { MobileWorkContext } from '~/types/mobileWork';

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

const emit = defineEmits<{
  chooseWork: [];
  selectContext: [context: MobileWorkContext];
}>();

const { recentWorkItems } = useMobileWorkCatalog();
const mobileWorkStore = useMobileWorkStore();
const showRunSetup = ref(false);
const runSetupIntent = computed(() => mobileWorkStore.runSetupIntent);
const recentItems = computed(() => recentWorkItems.value.filter((item) => item.context.kind === 'agent-run' || item.context.kind === 'team-run'));

function onLaunched(context: MobileWorkContext): void {
  showRunSetup.value = false;
  emit('selectContext', context);
}

watch(() => runSetupIntent.value?.revision, (revision) => {
  if (revision) {
    showRunSetup.value = true;
  }
}, { immediate: true });
</script>
