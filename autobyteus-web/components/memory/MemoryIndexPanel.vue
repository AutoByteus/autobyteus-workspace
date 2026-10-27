<template>
  <div v-if="!index && store.indexError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" data-test="memory-index-error">
    {{ store.indexError }}
    <button type="button" class="ml-2 font-semibold underline" @click="store.loadIndexStatus()">{{ $t('memory.results.retry') }}</button>
  </div>
  <section v-else-if="index" class="space-y-5" data-test="memory-index">
    <header class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div class="min-w-0">
        <h2 class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-lg">
          <MemorySpinner v-if="status.spinner" class="h-4 w-4 text-blue-600" />
          <span v-else class="h-2.5 w-2.5 flex-shrink-0 rounded-full" :class="status.dot" aria-hidden="true" />
          <span class="font-semibold" :class="status.text" data-test="memory-index-status">{{ status.label }}</span>
        </h2>
        <p v-if="status.detail" class="mt-1 text-sm text-gray-500" data-test="memory-index-detail">{{ status.detail }}</p>
        <p v-if="index.phase === 'needs_index'" class="mt-3 max-w-2xl text-sm text-gray-600" data-test="memory-index-first-time">{{ $t('memory.index.first_time') }}</p>
        <p v-else-if="store.modelChanged" class="mt-3 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" data-test="memory-index-model-changed">
          {{ $t('memory.index.model_changed', { old: index.builtWithModel ?? '', current: index.activeModel }) }}
        </p>
      </div>

      <div class="flex flex-shrink-0 flex-col items-start gap-2 md:items-end">
        <div class="flex flex-wrap items-center gap-2">
          <button v-if="primaryAction" type="button" class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700" :data-test="primaryAction.test" @click="primaryAction.run">{{ primaryAction.label }}</button>
          <button v-if="canRebuild && !confirming" type="button" :disabled="store.isBuilding" :title="store.isBuilding ? $t('memory.index.rebuild_busy') : undefined" class="rounded-lg px-5 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50" :class="store.modelChanged ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'" data-test="memory-index-rebuild" @click="confirming = true">{{ $t('memory.index.rebuild') }}</button>
        </div>
      </div>
    </header>

    <p v-if="store.indexError" class="text-sm text-red-600" data-test="memory-index-error">{{ store.indexError }}</p>

    <div v-if="confirming" class="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-5 py-3" role="alertdialog" :aria-label="$t('memory.index.rebuild_dialog')" data-test="memory-index-rebuild-confirm">
      <span class="min-w-0 flex-1 text-sm text-gray-700">{{ $t('memory.index.rebuild_confirm') }}</span>
      <button type="button" class="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700" data-test="memory-index-rebuild-yes" @click="confirmRebuild">{{ $t('memory.index.rebuild') }}</button>
      <button type="button" class="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="confirming = false">{{ $t('memory.index.cancel') }}</button>
    </div>

    <div>
      <ol class="grid gap-4 xl:grid-cols-4" :aria-label="$t('memory.index.pipeline')" data-test="memory-index-pipeline">
        <li
          v-for="(step, i) in index.steps"
          :key="step.id"
          class="relative flex flex-col rounded-lg border bg-white p-4 xl:p-5"
          :class="step.state === 'running' ? 'border-blue-300' : step.state === 'failed' ? 'border-red-300' : 'border-gray-200'"
          :data-step="step.id"
          :data-state="step.state"
        >
          <p class="hidden text-xs font-semibold uppercase tracking-wide text-gray-400 xl:block">{{ $t('memory.index.step_number', { number: i + 1 }) }}</p>
      <span class="absolute right-4 top-4 flex h-5 w-5 items-center justify-center xl:right-5 xl:top-5">
        <Icon v-if="step.state === 'done'" icon="heroicons:check-circle-20-solid" class="h-5 w-5 text-emerald-500" aria-label="Done" />
        <MemorySpinner v-else-if="step.state === 'running'" class="h-4 w-4 text-blue-600" />
        <Icon v-else-if="step.state === 'failed'" icon="heroicons:exclamation-circle-20-solid" class="h-5 w-5 text-red-500" aria-label="Failed" />
        <span v-else class="h-3.5 w-3.5 rounded-full border-2 border-gray-300" aria-label="Waiting" />
      </span>
          <h3 class="pr-8 text-base font-semibold text-gray-900 xl:mt-1"><span class="mr-1.5 font-normal text-gray-400 xl:hidden">{{ i + 1 }}</span>{{ $t(`memory.index.step.${step.id}.name`) }}</h3>
          <p class="mt-0.5 text-sm leading-[1.375rem] text-gray-500 xl:min-h-[2.75rem]">{{ $t(`memory.index.step.${step.id}.description`) }}</p>
          <div class="pt-2 xl:pt-3">
            <div class="h-1.5 overflow-hidden rounded-full bg-gray-100" role="progressbar" :aria-label="$t(`memory.index.step.${step.id}.name`)" :aria-valuenow="percent(step)" aria-valuemin="0" aria-valuemax="100">
              <div class="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none" :class="step.state === 'failed' ? 'bg-red-400' : step.state === 'done' ? 'bg-emerald-400' : 'bg-blue-600'" :style="{ width: `${percent(step)}%` }" />
            </div>
            <p class="mt-1.5 text-xs" :class="step.state === 'waiting' ? 'text-gray-400' : 'text-gray-600'">{{ stepCount(step) }}</p>
            <p v-if="step.state === 'failed' && step.message" class="mt-1.5 text-xs text-red-600" data-test="memory-index-step-error">{{ step.message }}</p>
          </div>
          <span v-if="i < index.steps.length - 1" class="absolute -right-[1.05rem] top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white xl:flex" aria-hidden="true">
            <Icon icon="heroicons:arrow-right-20-solid" class="h-3.5 w-3.5 text-gray-400" />
          </span>
        </li>
      </ol>
    </div>

    <footer class="flex flex-col gap-1 text-xs text-gray-500">
      <p>
        {{ $t('memory.index.model_note', { model: index.activeModel }) }}
        <NuxtLink to="/settings?section=server-settings&mode=embedding" class="font-semibold text-blue-600 hover:underline">{{ $t('memory.index.model_link') }}</NuxtLink>
      </p>
      <p v-if="index.phase === 'ready'">{{ $t('memory.index.keeps_current') }}</p>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import { useLocalization } from '~/composables/useLocalization';
import { useMemoryIndexView } from '~/composables/useMemoryIndexView';
import MemorySpinner from './MemorySpinner.vue';

const { t } = useLocalization();
const { store, index, status, percent, stepCount } = useMemoryIndexView();

const confirming = ref(false);
/** Rebuild is always offered once there is something to rebuild; it waits while a build is running. */
const canRebuild = computed(() => !!index.value && index.value.phase !== 'needs_index');
const confirmRebuild = () => { confirming.value = false; void store.rebuild(); };

const primaryAction = computed(() => {
  const value = index.value;
  if (!value) return null;
  if (value.phase === 'needs_index') return { label: t('memory.index.index_now'), test: 'memory-index-now', run: () => { void store.startIndex(); } };
  if (value.phase === 'failed') return { label: t('memory.index.try_again'), test: 'memory-index-retry', run: () => { void store.startIndex(); } };
  return null;
});
</script>
