<template>
  <section class="space-y-4" data-test="memory-search-results" aria-live="polite">
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="break-words text-base font-semibold text-gray-900">{{ $t('memory.results.title', { cue: query }) }}</h2>
        <p v-if="status === 'ready' && outcome" class="mt-0.5 text-sm text-gray-500">
          {{ $t('memory.results.count', { count: outcome.results.length }) }} · {{ $t('memory.results.pointers') }}
        </p>
      </div>
      <button type="button" class="flex-shrink-0 rounded-md px-2 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50" data-test="memory-search-clear" @click="$emit('clear')">{{ $t('memory.results.clear') }}</button>
    </header>

    <div v-if="status === 'loading'" class="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
      <MemorySpinner class="h-4 w-4" />{{ $t('memory.results.searching') }}
    </div>

    <div v-else-if="status === 'error'" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" data-test="memory-search-error">
      {{ error || $t('memory.results.error') }}
      <button type="button" class="ml-2 font-semibold underline" @click="$emit('retry')">{{ $t('memory.results.retry') }}</button>
    </div>

    <template v-else-if="outcome">
      <div v-if="outcome.results.length === 0" class="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-test="memory-search-none">
        <Icon icon="heroicons:exclamation-triangle-20-solid" class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
        <div>
          <p class="font-semibold">{{ $t('memory.results.none_title') }}</p>
          <p class="mt-0.5 text-amber-800">{{ $t('memory.results.none_body') }}</p>
        </div>
      </div>

      <div v-else-if="wordsNote" class="flex gap-3 rounded-lg border p-3 text-sm" :class="wordsNote.all ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-gray-200 bg-white text-gray-700'" :data-test="wordsNote.all ? 'memory-search-none-found' : 'memory-search-some-not-found'">
        <Icon icon="heroicons:exclamation-triangle-20-solid" class="mt-0.5 h-5 w-5 flex-shrink-0" :class="wordsNote.all ? 'text-amber-500' : 'text-gray-400'" aria-hidden="true" />
        <p>{{ wordsNote.text }}</p>
      </div>

      <div v-if="coverageNotice" class="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900" data-test="memory-search-coverage">
        <MemorySpinner class="mt-0.5 h-4 w-4 text-blue-600" />
        <p>{{ coverageNotice }}</p>
      </div>

      <ul class="space-y-4">
        <li v-for="result in outcome.results" :key="result.runId" class="rounded-lg border border-gray-200 bg-white transition hover:border-gray-300 hover:shadow-md" data-test="memory-result">
          <button type="button" class="block w-full rounded-t-lg px-5 pb-2 pt-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500" @click="$emit('open', result, result.matches[0])">
            <div class="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-3">
              <div class="min-w-0">
                <h3 class="break-words text-base font-semibold text-gray-900">{{ result.agentName }}<span v-if="result.team" class="font-normal text-gray-500"> · {{ result.team.name }}<template v-if="result.member"> / {{ result.member }}</template></span></h3>
                <p class="mt-1 break-all text-xs text-gray-500"><span class="font-mono">{{ result.runId }}</span><template v-if="result.workspace"> · {{ result.workspace }}</template></p>
              </div>
              <p v-if="result.latestDay" class="flex-shrink-0 text-xs text-gray-500" data-test="memory-result-days">{{ days(result) }}</p>
            </div>
          </button>
          <ul class="space-y-1 px-2 pb-2">
            <li v-for="match in result.matches" :key="`${match.file}:${match.fromLine}`">
              <button type="button" class="group block w-full cursor-pointer rounded-md border border-transparent px-3 py-2.5 text-left transition hover:border-gray-200 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500" data-test="memory-match" @click="$emit('open', result, match)">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                  <span class="font-mono text-gray-700">{{ match.file }}</span>
                  <span>· {{ $t('memory.results.lines', { from: match.fromLine, to: match.toLine }) }}</span>
                  <span v-if="showMatchDay(result, match)" data-test="memory-match-day">· {{ formatDay(match.day) }}</span>
                  <span v-if="match.kind === 'text' && match.matchedWords.length" class="ml-auto min-w-0 max-w-full rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600" data-test="memory-match-words">{{ wordsLabel(match) }}</span>
                </div>
                <div class="mt-2 rounded-md bg-gray-50 px-3 py-2 font-mono text-xs leading-5 text-gray-700 group-hover:bg-white group-hover:ring-1 group-hover:ring-gray-200" data-test="memory-snippet"><div v-for="(line, i) in match.snippet" :key="i" class="truncate whitespace-pre">{{ line }}</div></div>
              </button>
            </li>
          </ul>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useLocalization } from '~/composables/useLocalization';
import type { SearchMatch, SearchOutcome, SearchResult } from '~/types/memorySearch';
import type { SearchStatus } from '~/stores/memorySearchStore';
import MemorySpinner from './MemorySpinner.vue';

const props = defineProps<{
  query: string;
  status: SearchStatus;
  outcome: SearchOutcome | null;
  error: string | null;
  coverage: { textPct: number; meaningPct: number } | null;
}>();
defineEmits<{ clear: []; retry: []; open: [result: SearchResult, match: SearchMatch] }>();

const { t } = useLocalization();

const formatDay = (day: string | null) => {
  if (!day) return '';
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? day : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
const days = (result: SearchResult) => (!result.firstDay || result.firstDay === result.latestDay
  ? t('memory.results.mentioned_one', { day: formatDay(result.latestDay) })
  : t('memory.results.mentioned_range', { first: formatDay(result.firstDay), latest: formatDay(result.latestDay) }));
/** A text match names the search words its lines hold; a meaning match has no label. */
const wordsLabel = (match: SearchMatch) => t('memory.results.words_label', { words: match.matchedWords.join(t('memory.results.word_separator')) });
/** A match's own day is shown only when the card's date does not already say it. */
const showMatchDay = (result: SearchResult, match: SearchMatch) =>
  Boolean(match.day) && ((result.firstDay ?? result.latestDay) !== result.latestDay || match.day !== result.latestDay);

/**
 * The query's words that occur in no indexed journal, as a fact: amber when no match holds any search word (all are
 * meaning matches), gray when some words were found. The server sends none while the Text index is incomplete.
 */
const wordsNote = computed(() => {
  const outcome = props.outcome;
  if (!outcome || !outcome.wordsNotFound.length || !outcome.results.length) return null;
  const words = outcome.wordsNotFound.join(t('memory.results.word_separator'));
  const all = outcome.results.every(result => result.matches.every(match => match.kind === 'meaning'));
  return { all, text: t(all ? 'memory.results.none_found' : 'memory.results.some_not_found', { words }) };
});

/** The search only reads the indexes: while a step is incomplete, it says how much of memory it covered. */
const coverageNotice = computed(() => {
  const coverage = props.coverage;
  if (!coverage) return '';
  if (coverage.textPct < 100) return t('memory.results.coverage_text', { percent: coverage.textPct });
  if (coverage.meaningPct < 100) return t('memory.results.coverage_meaning', { percent: coverage.meaningPct });
  return '';
});
</script>
