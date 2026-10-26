# Memory search quality check (R-016)

Runs a known-answer question file against the memory index built from an **isolated copy** of a memory
folder, and reports:

- **gate 1**: the right run in the top 10 within at most 3 searches (the question, then up to two
  `rephrasings`); `oneSearchTop10` is the one-search proxy;
- **gate 2** (questions that pass gate 1): #1, top 3 (and its share), MRR, p90 and max latency of the first
  search;
- **meaning pointers**: how many meaning matches each pointer rule resolved (same file's text chunk, best card
  part, first request), and how many had an empty snippet (should be 0);
- **unmasked secrets**: snippets in which a secret pattern is still visible (should be 0).

A transformation is added or changed only if gate 1 stays at 100% and gate 2 does not get worse.

```sh
pnpm -C autobyteus-server-ts build
cp -R ~/.autobyteus/memory /tmp/memory-copy        # never point the command at ~/.autobyteus itself
node autobyteus-server-ts/scripts/evaluate-memory-search.mjs \
  --memory-dir /tmp/memory-copy --index-dir /tmp/memory-index \
  --questions /path/to/questions.json --build --out /tmp/memory-eval.json
```

- `--build` runs a full indexing pass first (it writes Work Journals into the copy and the index into
  `--index-dir`); without it, an index built before is reused.
- `--model` chooses the embedding model (catalog id; default: the default model). The model downloads into
  `--index-dir/embeddings` the first time.
- The question file is a JSON array: `{"id": "Q01", "q": "…", "accept": ["<run id>", …], "rephrasings": ["…"]}`.
  Any accepted run answers the question. A user's own question file stays private; the repository keeps only
  this format.
