<template>
  <main data-test="excel-viewer-check" class="min-h-screen bg-slate-100 p-4 text-slate-900">
    <h1 class="mb-3 text-lg font-semibold">ExcelViewer rendered check (generated workbooks only)</h1>
    <div class="grid grid-cols-2 gap-4">
      <section
        v-for="c in cases"
        :key="c.id"
        :data-case="c.id"
        class="flex h-[300px] flex-col overflow-hidden rounded border border-slate-300 bg-white"
      >
        <h2 class="border-b px-2 py-1 text-xs font-semibold">{{ c.id }} — {{ c.label }}</h2>
        <div class="min-h-0 flex-1">
          <ExcelViewer :url="c.url" :content="c.content" />
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as XLSX from 'xlsx';
import ExcelViewer from '~/components/fileExplorer/viewers/ExcelViewer.vue';

definePageMeta({ layout: false });

type Case = { id: string; label: string; url: string | null; content: string | null };
const cases = ref<Case[]>([]);

const toUrl = (bytes: ArrayBuffer | Uint8Array, type = 'application/octet-stream') =>
  URL.createObjectURL(new Blob([bytes], { type }));

const book = (sheets: Record<string, XLSX.WorkSheet>) => {
  const wb = XLSX.utils.book_new();
  for (const [name, ws] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, ws, name);
  return wb;
};
const aoa = (rows: unknown[][]) => XLSX.utils.aoa_to_sheet(rows);
const write = (wb: XLSX.WorkBook, bookType: XLSX.BookType) => XLSX.write(wb, { type: 'array', bookType }) as ArrayBuffer;

onMounted(() => {
  const fruits = () => aoa([['Name', 'Qty', 'Price'], ['Apple', 3, 1.25], ['Banana', 12, 0.5], ['Cherry', 200, 0.05]]);
  const twoSheets = () => book({ Fruits: fruits(), Notes: aoa([['Second sheet only']]) });

  const merged = aoa([['Quarterly report', null, null], ['Q1', 'Q2', 'Q3'], [10, 20, 30]]);
  merged['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

  const injection = aoa([[
    'x" onmouseover="window.__pwned=1" data-y="',
    '<img src=x onerror="window.__pwned=1">',
    '<script>window.__pwned=1<\/script>',
  ]]);

  const links = aoa([['site', 'evil', 'plain']]);
  links.A1.l = { Target: 'https://example.com/a?b=1&c=2' };
  links.B1.l = { Target: 'javascript:window.__pwned=1' };

  const revoked = toUrl(new Uint8Array([1]));
  URL.revokeObjectURL(revoked);

  cases.value = [
    { id: 'xlsx-tabs', label: '.xlsx via URL, two sheets', url: toUrl(write(twoSheets(), 'xlsx')), content: null },
    { id: 'xls', label: '.xls (BIFF8) via URL', url: toUrl(write(twoSheets(), 'biff8')), content: null },
    { id: 'xlsm', label: '.xlsm via URL', url: toUrl(write(book({ Macro: fruits() }), 'xlsm')), content: null },
    { id: 'csv-url', label: '.csv via URL', url: toUrl(new TextEncoder().encode('city,count\nOslo,7\nLima,12\n'), 'text/csv'), content: null },
    { id: 'csv-content', label: 'CSV streamed content', url: null, content: 'a,b,c\n1,2,3\n4,5,6' },
    { id: 'merged', label: 'merged cells (colspan)', url: toUrl(write(book({ Merged: merged }), 'xlsx')), content: null },
    { id: 'injection', label: 'markup in cells', url: toUrl(write(book({ S: injection }), 'xlsx')), content: null },
    { id: 'links', label: 'hyperlinked cells (https:, javascript:)', url: toUrl(write(book({ S: links }), 'xlsx')), content: null },
    { id: 'error', label: 'fetch failure (revoked URL)', url: revoked, content: null },
  ];
  (window as unknown as { __excelCheckReady: boolean }).__excelCheckReady = true;
});
</script>
