import fs from 'node:fs';
import { performance } from 'node:perf_hooks';

const responsePath = process.argv[2];
const requestedCount = Number(process.argv[3]);
if (!responsePath || !Number.isFinite(requestedCount) || requestedCount <= 0) {
  throw new Error('Usage: node frontend-projection-dedupe-benchmark.mjs <projection-response.json> <entry-count>');
}

const payload = JSON.parse(fs.readFileSync(responsePath, 'utf8'));
const allEntries = payload?.data?.getTeamMemberRunProjection?.conversation;
if (!Array.isArray(allEntries)) {
  throw new Error('Projection conversation was not found.');
}
const entries = allEntries.slice(0, requestedCount);

const normalizeText = (value) => (value || '').trim();
const normalizeTs = (value) => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
);
const stableJson = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${key}:${stableJson(value[key])}`).join(',')}}`;
};
const projectionEntryKey = (entry) => [
  entry.kind,
  entry.role || '',
  normalizeText(entry.content),
  normalizeText(entry.toolName),
  stableJson(entry.toolArgs),
  stableJson(entry.toolResult),
  normalizeText(entry.toolError),
  stableJson(entry.media),
].join('\0');
const projectionEntriesCanMerge = (left, right) => {
  if (projectionEntryKey(left) !== projectionEntryKey(right)) return false;
  const leftTs = normalizeTs(left.ts);
  const rightTs = normalizeTs(right.ts);
  if (leftTs === null && rightTs === null) return false;
  return leftTs === null || rightTs === null || leftTs === rightTs;
};
const mergeProjectionEntry = (current, incoming) => ({
  ...current,
  ...incoming,
  ts: normalizeTs(incoming.ts) ?? normalizeTs(current.ts),
  invocationId: incoming.invocationId ?? current.invocationId ?? null,
  role: incoming.role ?? current.role ?? null,
  content: incoming.content ?? current.content ?? null,
  toolName: incoming.toolName ?? current.toolName ?? null,
  toolArgs: incoming.toolArgs ?? current.toolArgs ?? null,
  toolResult: incoming.toolResult ?? current.toolResult ?? null,
  toolError: incoming.toolError ?? current.toolError ?? null,
  media: incoming.media ?? current.media ?? null,
});

const beforeHeap = process.memoryUsage().heapUsed;
const started = performance.now();
const deduped = [];
for (const entry of entries) {
  const existingIndex = deduped.findIndex((candidate) => projectionEntriesCanMerge(candidate, entry));
  if (existingIndex >= 0) {
    deduped[existingIndex] = mergeProjectionEntry(deduped[existingIndex], entry);
  } else {
    deduped.push(entry);
  }
}
const elapsedMs = performance.now() - started;
const afterHeap = process.memoryUsage().heapUsed;

process.stdout.write(`${JSON.stringify({
  inputEntries: entries.length,
  dedupedEntries: deduped.length,
  elapsedMs: Number(elapsedMs.toFixed(3)),
  heapDeltaBytes: afterHeap - beforeHeap,
})}\n`);
