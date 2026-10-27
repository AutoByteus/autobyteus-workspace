<template>
  <div data-test="work-journal">
    <div v-if="focus" class="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900" data-test="work-journal-found">
      <p class="min-w-0 break-words">
        <span class="font-semibold"><template v-if="focus.cue">{{ $t('memory.journal.found_from', { cue: focus.cue }) }}</template><template v-else>{{ $t('memory.journal.found_lines') }}</template></span>
        <span class="text-amber-800"> · {{ matchedLabel }}</span>
      </p>
      <div v-if="siblingMatches.length > 1" class="flex min-w-0 flex-wrap gap-1.5 md:flex-shrink-0">
        <button
          v-for="(match, index) in siblingMatches"
          :key="`${match.file}:${match.fromLine}`"
          type="button"
          class="rounded-md border px-2 py-1 text-xs font-medium"
          :class="isFocused(match) ? 'border-amber-400 bg-white text-amber-900' : 'border-amber-200 text-amber-800 hover:bg-white'"
          data-test="work-journal-match"
          @click="goToMatch(match)"
        >{{ $t('memory.journal.match_n', { number: index + 1 }) }} · {{ $t('memory.results.lines', { from: match.fromLine, to: match.toLine }) }}</button>
      </div>
    </div>

    <div v-if="store.loading" class="py-12 text-center text-sm text-gray-500">{{ $t('memory.journal.loading') }}</div>
    <div v-else-if="store.error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ store.error }}</div>
    <div v-else-if="store.missing && importedRun" class="py-12 text-center text-sm text-gray-500" data-test="work-journal-missing">{{ $t('memory.badges.no_work_journal') }}</div>
    <div v-else-if="store.missing" class="py-12 text-center text-sm text-gray-500" data-test="work-journal-missing">
      {{ $t('memory.journal.not_built') }}
      <button type="button" class="font-semibold text-blue-600 hover:underline" data-test="work-journal-open-index" @click="$emit('openIndex')">{{ $t('memory.journal.not_built_link') }}</button>
    </div>
    <div v-else-if="store.files.length === 0" class="py-12 text-center text-sm text-gray-500">{{ $t('memory.journal.empty') }}</div>

    <div v-else class="grid gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
      <nav class="hidden xl:block" :aria-label="$t('memory.journal.files')">
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{{ $t('memory.journal.files') }} · {{ store.files.length }}</h3>
        <ul class="space-y-1">
          <li v-for="item in store.files" :key="item.name">
            <button
              type="button"
              class="w-full rounded-lg border px-3 py-2 text-left"
              :class="item.name === store.selectedFile ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:bg-gray-50'"
              :aria-current="item.name === store.selectedFile ? 'true' : undefined"
              data-test="work-journal-file"
              @click="store.selectFile(item.name)"
            >
              <span class="flex items-center gap-1.5">
                <span class="min-w-0 truncate font-mono text-xs font-semibold text-gray-800">{{ item.name }}</span>
                <span v-if="item.open" class="flex-shrink-0 rounded-full bg-emerald-50 px-1.5 text-[10px] font-semibold text-emerald-700">{{ $t('memory.journal.active') }}</span>
              </span>
              <span class="mt-0.5 block text-[11px] text-gray-500">{{ dayRange(item) }}</span>
              <span class="block text-[11px] text-gray-500">{{ $t('memory.journal.file_size', { lines: item.lines.toLocaleString(), size: formatSize(item.sizeKb) }) }}</span>
              <span v-if="matchCount(item.name)" class="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700" data-test="work-journal-file-marker">
                <span class="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />{{ $t('memory.journal.matched_in_file', { count: matchCount(item.name) }) }}
              </span>
            </button>
          </li>
        </ul>
      </nav>

      <div class="min-w-0">
        <div class="xl:hidden">
          <label class="text-xs font-semibold text-gray-600" for="work-journal-file-select">{{ $t('memory.journal.file') }}</label>
          <select id="work-journal-file-select" class="mb-3 mt-1 block w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs" :value="store.selectedFile ?? ''" @change="store.selectFile(($event.target as HTMLSelectElement).value)">
            <option v-for="item in store.files" :key="item.name" :value="item.name">{{ item.name }}{{ item.open ? ` (${$t('memory.journal.active')})` : '' }}</option>
          </select>
        </div>

        <div v-if="store.current" class="rounded-lg border border-gray-200">
          <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-100 px-3 py-2">
            <div class="min-w-0 flex-1 basis-56">
              <p class="truncate font-mono text-xs font-semibold text-gray-800">{{ store.current.name }}</p>
              <p class="text-[11px] text-gray-500">{{ $t('memory.journal.file_size', { lines: store.current.lines.toLocaleString(), size: formatSize(store.current.sizeKb) }) }} · {{ dayRange(store.current) }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <label class="sr-only" for="work-journal-day">{{ $t('memory.journal.jump_to_day') }}</label>
              <select id="work-journal-day" class="rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" :value="''" data-test="work-journal-day" @change="jumpToDay($event)">
                <option value="" disabled>{{ $t('memory.journal.jump_to_day') }}</option>
                <option v-for="item in store.current.days" :key="item.day" :value="item.line">{{ formatDay(item.day) }}</option>
              </select>
              <form class="flex items-center gap-1" @submit.prevent="goToLine">
                <label class="sr-only" for="work-journal-line">{{ $t('memory.journal.go_to_line') }}</label>
                <input id="work-journal-line" v-model="lineInput" type="number" min="1" :max="store.current.lines" inputmode="numeric" :placeholder="$t('memory.journal.go_to_line')" class="w-28 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" data-test="work-journal-line" />
                <button type="submit" class="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200">{{ $t('memory.journal.go') }}</button>
              </form>
            </div>
          </div>

          <div ref="scroller" class="relative max-h-[62vh] min-h-[320px] overflow-auto bg-white font-mono text-xs leading-5" tabindex="0" role="region" :aria-label="store.current.name" data-test="work-journal-lines">
            <button v-if="store.from > 1" type="button" class="sticky left-0 block w-full border-b border-gray-100 bg-gray-50 px-3 py-2 text-left font-sans text-xs font-semibold text-blue-600 hover:bg-blue-50" data-test="work-journal-earlier" @click="loadEarlier">
              ↑ {{ $t('memory.journal.earlier', { count: Math.min(JOURNAL_WINDOW, store.from - 1) }) }} <span class="font-normal text-gray-500">({{ $t('memory.journal.not_shown', { count: (store.from - 1).toLocaleString() }) }})</span>
            </button>
            <div v-for="line in store.lines" :key="line.n" :data-line="line.n" class="flex" :class="isMatched(line.n) ? 'bg-amber-50' : ''">
              <span class="sticky left-0 w-14 flex-shrink-0 select-none border-r px-2 text-right" :class="isMatched(line.n) ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-gray-100 bg-gray-50 text-gray-400'">{{ line.n }}</span>
              <span v-if="kind(line.text) === 'day'" class="flex-1 bg-gray-100 px-3 font-semibold text-gray-700">{{ line.text }}</span>
              <span v-else-if="kind(line.text) === 'entry'" class="min-w-0 flex-1 whitespace-pre-wrap break-words px-3 text-gray-800"><span class="text-gray-400">{{ parts(line.text).time }}</span> <span class="font-semibold">{{ parts(line.text).action }}</span>{{ withoutLink(parts(line.text).rest) }}<span v-if="trailingLink(line.text)" class="break-all text-gray-300" data-test="work-journal-raw-link">{{ trailingLink(line.text) }}</span></span>
              <span v-else-if="kind(line.text) === 'link'" class="min-w-0 flex-1 whitespace-pre-wrap break-all px-3 text-gray-300">{{ line.text }}</span>
              <span v-else-if="kind(line.text) === 'header'" class="min-w-0 flex-1 whitespace-pre-wrap break-words px-3 font-semibold text-gray-900">{{ line.text }}</span>
              <span v-else class="min-w-0 flex-1 whitespace-pre-wrap break-words px-3 text-gray-500">{{ withoutLink(line.text) || ' ' }}<span v-if="trailingLink(line.text)" class="break-all text-gray-300" data-test="work-journal-raw-link">{{ trailingLink(line.text) }}</span></span>
            </div>
            <button v-if="store.to < store.current.lines" type="button" class="sticky left-0 block w-full border-t border-gray-100 bg-gray-50 px-3 py-2 text-left font-sans text-xs font-semibold text-blue-600 hover:bg-blue-50" data-test="work-journal-later" @click="store.loadLater()">
              ↓ {{ $t('memory.journal.later', { count: Math.min(JOURNAL_WINDOW, store.current.lines - store.to) }) }} <span class="font-normal text-gray-500">({{ $t('memory.journal.not_shown', { count: (store.current.lines - store.to).toLocaleString() }) }})</span>
            </button>
          </div>

          <div class="flex flex-col gap-1 border-t border-gray-100 px-3 py-2 text-[11px] text-gray-500 md:flex-row md:items-center md:justify-between">
            <span data-test="work-journal-range">{{ $t('memory.journal.showing', { from: store.from.toLocaleString(), to: store.to.toLocaleString(), total: store.current.lines.toLocaleString() }) }}</span>
            <span v-if="store.current.lines > 5000">{{ $t('memory.journal.large_file') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { JOURNAL_WINDOW, useMemoryJournalStore } from '~/stores/memoryJournalStore';
import { useMemorySearchStore } from '~/stores/memorySearchStore';
import type { JournalFileInfo, MatchKind } from '~/types/memorySearch';

defineEmits<{ openIndex: [] }>();

const { t } = useLocalization();
const store = useMemoryJournalStore();
const searchStore = useMemorySearchStore();

const scroller = ref<HTMLElement | null>(null);
const lineInput = ref<number | null>(null);

const focus = computed(() => store.focus);
/** An imported run's journal comes from another node: this node cannot make it. */
const importedRun = computed(() => {
  const subject = store.subject;
  return !!subject && subject.kind !== 'folder' && subject.source.type === 'IMPORTED';
});

/** The matches of this run from the search that led here, when it is still in memory; else just the opened one. */
const siblingMatches = computed(() => {
  const own = focus.value;
  if (!own) return [];
  const result = searchStore.outcome?.results.find(r => r.runId === store.runId);
  const found = result?.matches.map(m => ({ file: m.file, fromLine: m.fromLine, toLine: m.toLine, kind: m.kind, words: m.matchedWords, day: m.day })) ?? [];
  return found.length ? found : [{ file: own.file, fromLine: own.fromLine, toLine: own.toLine, kind: own.kind ?? null, words: own.words ?? [], day: '' }];
});

const isFocused = (match: { file: string; fromLine: number }) => focus.value?.file === match.file && focus.value?.fromLine === match.fromLine;

const matchedLabel = computed(() => {
  const own = focus.value;
  if (!own) return '';
  const lines = t('memory.results.lines', { from: own.fromLine, to: own.toLine });
  if (own.kind === 'text' && own.words?.length) return `${lines} · ${t('memory.results.words_label', { words: own.words.join(t('memory.results.word_separator')) })}`;
  return lines;
});

const matchCount = (name: string) => siblingMatches.value.filter(m => focus.value && m.file === name).length;

const goToMatch = (match: { file: string; fromLine: number; toLine: number; kind: MatchKind | null; words: string[] }) => {
  if (!store.focus) return;
  store.focus = { ...store.focus, file: match.file, fromLine: match.fromLine, toLine: match.toLine, kind: match.kind, words: match.words };
  if (store.selectedFile !== match.file) void store.selectFile(match.file, match.fromLine);
  else void store.gotoLine(match.fromLine);
};

const isMatched = (n: number) => !!focus.value && store.selectedFile === focus.value.file && n >= focus.value.fromLine && n <= focus.value.toLine;

const kind = (text: string): 'day' | 'entry' | 'link' | 'header' | 'detail' => {
  if (/^\[\d{4}-\d{2}-\d{2}\]$/.test(text)) return 'day';
  if (/^\[(\d{2}:\d{2}:\d{2}|--:--:--)\] /.test(text)) return 'entry';
  if (/^\s+\[↗\]/.test(text)) return 'link';
  if (text.startsWith('# ')) return 'header';
  return 'detail';
};
/** The raw-trace link an entry's last line ends with: machine detail, shown de-emphasised like a link line. */
const TRAILING_LINK = / \[↗\]\([^)]*\)$/;
const trailingLink = (text: string) => TRAILING_LINK.exec(text)?.[0] ?? '';
const withoutLink = (text: string) => text.replace(TRAILING_LINK, '');
const parts = (text: string) => {
  const match = /^(\[(?:\d{2}:\d{2}:\d{2}|--:--:--)\]) ([^:]+:)(.*)$/.exec(text);
  return match ? { time: match[1], action: match[2], rest: match[3] } : { time: '', action: '', rest: text };
};

const formatDay = (day: string | null) => {
  if (!day) return '';
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? day : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
const dayRange = (item: JournalFileInfo) => (item.firstDay === item.lastDay ? formatDay(item.firstDay) : `${formatDay(item.firstDay)} – ${formatDay(item.lastDay)}`);
const formatSize = (kb: number) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);

const goToLine = () => { if (lineInput.value) void store.gotoLine(Number(lineInput.value)); };
const jumpToDay = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  void store.gotoLine(Number(select.value));
  select.value = '';
};

/** Loading earlier lines keeps what the reader was looking at in place. */
const loadEarlier = async () => {
  const el = scroller.value;
  const before = el ? el.scrollHeight : 0;
  await store.loadEarlier();
  await nextTick();
  if (el) el.scrollTop += el.scrollHeight - before;
};

watch(() => store.jump?.token, async () => {
  await nextTick();
  const jump = store.jump;
  const el = scroller.value;
  if (!jump || !el) return;
  const row = el.querySelector<HTMLElement>(`[data-line="${jump.line}"]`);
  if (row) el.scrollTop = Math.max(0, row.offsetTop - Math.floor(el.clientHeight / 3));
  else el.scrollTop = 0;
}, { immediate: true, flush: 'post' });
</script>
