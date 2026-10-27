# Embeddings

## Scope

A local, server-side embedding layer: it obtains and runs a compact embedding model on the server's CPU, keeps vectors
of named **collections** in step with their items, and answers "the items of collection C most similar to text T" with
scored item IDs. Project Task search ([projects.md](./projects.md#project-task-search)) is its first collection; memory
search's journal cards ([memory_search.md](./memory_search.md), `memory-journal-cards`) are the second.

Everything runs inside the server process, the same on the desktop app, a Docker node and a self-hosted server. There
is no GPU, hosted embedding API, vector database or database server. Item text never leaves the server machine; after
the one-time model download, meaning search works offline.

## TS Source

- `src/embeddings/embedding-index.ts`: `EmbeddingIndex`, the layer's **only public boundary**, and `getEmbeddingIndex()`.
- `src/embeddings/collection-indexing-job.ts`: one collection's fingerprints, cached vectors and background indexing (internal).
- `src/embeddings/relevance.ts`: the relevance rule; `src/embeddings/embedding-readiness.ts`: readiness and status shapes.
- `src/embeddings/embedding-model-error.ts`: `EmbeddingModelError`, the refusals of model management (with a code).
- `src/embeddings/catalog/`: the model definition type, the catalog and the active-model setting.
- `src/embeddings/models/embedding-model-files.ts`: download, SHA-256 verification, placement and removal of model files (internal).
- `src/embeddings/models/embedding-model-downloads.ts`: the one owner of running downloads, their progress, failure and
  cancellation, shared by downloads ahead and the active model's preparation (internal).
- `src/embeddings/runtime/embedding-model-runner.ts` and `embedding-worker.ts`: the worker thread that runs the model (internal).
- `src/embeddings/store/embedding-vector-store.ts`: the vector file (internal).

Nothing outside `src/embeddings/` imports `store/`, `runtime/` or `models/`. The layer imports nothing from Projects,
agent tools or the API; consumers give it items.

## Using The Layer

```ts
const index = getEmbeddingIndex();
const result = await index.search("project-tasks/<projectId>", items /* complete current [{id, text}] */, "query text", {
  limit: 20,            // most meaning matches (default 20)
  waitForReadyMs: 0,    // wait for readiness before answering (agents use 30 s)
  scoreIds: ["id-1"],   // similarities the caller wants even for non-matches
});
// result.matches: [{id, score}] best-first, relevant items only
// result.scores: {id: score} for the requested scoreIds
// result.readiness: {state: "ready"} | {state: "preparing", phase, done, total} | {state: "unavailable", reason}
index.sync(collection, items);       // complete current items; embeds what changed in the background, never waits
// The nearest items among the vectors the collection has for its current text, best first, each with its score
// only (the caller judges what a score means for its items). It never creates a job, never syncs, never prepares or downloads a model:
// with no job in this process it answers collection "notSynced" (the caller syncs first); while the model is not
// ready it answers its readiness with no matches.
await index.nearest(collection, "query text", { limit: 300 }); // {matches: [{id, score}], collection, readiness}
index.removeItems(collection, ids);  // never waits for indexing
index.dropCollection(collection);
index.retryModel();                  // clears "unavailable"; the next search (or prepareActiveModel()) tries again

// Settings → Server Settings → Embedding. The two status reads are read-only: they start no download, load or indexing.
await index.modelsStatus();          // {activeModelId, defaultModelId, onDiskBytes, models: [{id, file, activeDisplay, ...}]}
index.fingerprintItems(items);       // opaque ItemFingerprints for the active model (no item text kept)
index.collectionStatus(collection, fingerprints); // notIndexed | waiting | indexing | ready | needsUpdate | unavailable
index.fingerprintsAreCurrent(fingerprints);       // false after a model switch: read the items again
index.activeModelOnDisk();           // every active model file present and the model not unavailable
index.prepareActiveModel();          // download (if needed) and load the active model now
index.downloadModel(id);             // a download ahead; for the active model, its preparation (not cancellable)
index.cancelDownload(id);            // a download ahead only; deletes what was downloaded
await index.removeModel(id);         // a downloaded model that is neither active nor downloading
```

A collection key is a string its consumer owns (Project Task search uses `project-tasks/<projectId>`). Each `search` or
`sync` passes the **complete current** item set: items absent from it are removed, and items whose text changed are
embedded again. A new collection needs no change to the layer: a consumer service builds its key and items and calls
`search` (a test-only second collection proves this).

`search` suits a consumer that has its items at hand for every query (Project Tasks). A large collection kept by its
own pipeline (memory search's journal cards) calls `sync` when its items change and `nearest` per query, so a query
never reads or passes the whole item set; `nearest` tells it, with `notSynced`, when the collection has not been
synced in this process (after a restart).

## Models

The server knows a catalog of supported models (`src/embeddings/catalog/embedding-model-catalog.ts`). Everything
model-specific is data in the entry: the pinned source revision, every file with its size and SHA-256, the query and
document prefixes, the output (`sentence_embedding` or a pooling), the token limit, the vector size and the relevance
calibration. The worker and the index have no per-model branches.

| Setting value | Model | Languages | Licence | Source (pinned revision) | Download | Indexing cost (WebAssembly, 4 threads, fast laptop) |
| --- | --- | --- | --- | --- | --- | --- |
| `granite-embedding-small-english-r2` (default) | IBM Granite Embedding Small English R2 | English (reads up to 1,024 tokens of a Task) | Apache-2.0 | `onnx-community/granite-embedding-small-english-r2-ONNX` @ `1dc7835ba0cb9c76a3618d0bf0c427c97671b3c8` | ≈ 55 MB | ≈ 0.5 s per Task; ≈ 0.4 GB loaded, ≈ 0.7 GB peak |
| `mdbr-leaf-ir` (small Projects) | MongoDB LEAF-IR | English | Apache-2.0 | `MongoDB/mdbr-leaf-ir` @ `4262131b32c3182bd06e67e92ae69d7bd66e0c5c` | ≈ 24 MB | ≈ 0.1 s per Task; ≈ 0.27 GB loaded, ≈ 0.5 GB peak |
| `embeddinggemma-2` | Google EmbeddingGemma 2 | 100+ languages | Apache-2.0 | `onnx-community/embeddinggemma-2-ONNX` @ `daa72c51243991dfcaf9f9137d2c573d8f7790c0` | ≈ 346 MB | ≈ 4 s per long Task; ≈ 1.1 GB loaded, ≈ 1.5 GB peak |

Models are not shipped with the app: the server downloads the active model from Hugging Face
(`https://huggingface.co/<repo>/resolve/<revision>/<file>`) the first time meaning search needs it, into
`<appData>/embeddings/models/<modelId>/`. Each file streams to `<file>.part`, is checked for its size and SHA-256 and then
renamed into place. A download that receives no data for 60 s is abandoned. Server fetches do not use an HTTP proxy, so
a server that reaches the internet only through a proxy shows meaning search as unavailable (exact search still works).

The model runs with `onnxruntime-web` (WebAssembly, MIT) and `@huggingface/tokenizers` (Apache-2.0) in a worker thread
with up to 4 WebAssembly threads, so no native binary is needed on any platform. The worker stops after 10 minutes
without requests and returns its memory; the next request starts it again in under a second. The desktop build keeps
only the three `onnxruntime-web` files its Node build loads (`autobyteus-web/scripts/onnxruntime-web-packaging.mjs`).

### Choosing The Model

The server setting `AUTOBYTEUS_EMBEDDING_MODEL` chooses the active model of this server; blank means the default,
Granite Small English R2. LEAF-IR indexes about five times faster, but its relevance degrades on Projects with
hundreds of Tasks (see Relevance); EmbeddingGemma 2 is for Tasks written in other languages. The
settings screen accepts only the catalog values above. A value set outside the settings screen that is not in the
catalog is ignored with one logged warning (`EMBEDDING_MODEL_SETTING_UNKNOWN`), and the default is used.

A change takes effect at the next search, without a restart: the index stops the old model, downloads and loads the new
one, and rebuilds each collection in the background (exact search keeps working). Vectors of different models are never
compared. When the new model is ready, the vectors of other models are deleted; their downloaded files are kept until
removed in Settings, so switching back needs no new download.

### Managing Models In Settings

Settings → Server Settings → Embedding (GraphQL `embeddingModelsStatus` and `projectTaskIndexes`, read in one
document) lists the catalog with each model's files (`notDownloaded`, `downloading` with bytes, `downloaded`, or
`failed` with the reason of the last attempt), the bytes on disk under `models/` (including partial files), and the
active model's display state:

| Display | When |
| --- | --- |
| Ready | the model is loaded, or idle with every file on disk |
| Preparing (downloading bytes / loading) | its download or load runs, including a download started ahead before it became active |
| Not downloaded | idle and its files are missing (a fresh install); Download prepares it |
| Unavailable + reason | its last preparation or use failed; Retry (`retryEmbeddingModel`) clears it and prepares it at once |

`useEmbeddingModel(modelId)` writes `AUTOBYTEUS_EMBEDDING_MODEL` through the usual setting validation and prepares the
new model at once. `downloadEmbeddingModel`, `cancelEmbeddingModelDownload` and `removeEmbeddingModel` refuse with a
GraphQL error code: `EMBEDDING_MODEL_UNKNOWN`, `EMBEDDING_MODEL_ACTIVE` (the active model cannot be removed),
`EMBEDDING_MODEL_DOWNLOADING` (cancel first) or `EMBEDDING_DOWNLOAD_NOT_CANCELLABLE` (the active model's preparation, or
no download). One download per model runs at a time: a preparation joins a running download ahead, which then can no
longer be cancelled; a cancelled download deletes the model's folder.

Each Project's index state is computed fresh at every read from the fingerprints of the Project's current Tasks: a job
with pending work gives `indexing` or `waiting`; otherwise they are compared with the job's vectors, or with the stored
fingerprints when there is no job (no vectors are read, no job is created). The search service caches only those
**inputs**, never a status: a Project's fingerprints are read again when a post-commit Task mark makes it dirty, when it
has none, or after a model switch, so a warm poll reads no Task. States: `notIndexed` (nothing for the active model), `waiting` (Tasks to index, model not ready), `indexing`
(`done`/`total` of the current run), `ready` (every Task indexed; a Project without Tasks is ready with 0),
`needsUpdate` (`changed` Tasks are new or edited since) or `unavailable` (the active model is unavailable).
`indexProjectTasks`, `rebuildProjectTaskIndex` (drops the Project's vectors, then indexes every Task) and
`indexAllProjectTasks` (every Project that is not indexed or needs an update) start indexing.

**Index after writes (REQ-011).** A Task create or edit (by a user or an agent; any post-commit Task mark) indexes its
Project in the background 3 s later, with writes in between joining that run, when `activeModelOnDisk()` holds both
when the write commits and when the run starts. The run reads the Project's Tasks and syncs only when something is
not indexed or changed (or a run is pending), so status, dependency, "part of" and assignment marks load no model. A write never waits for it, never fails because of it, and never starts
a download; a Project deleted meanwhile is skipped, and host shutdown drops pending runs. Without the model on disk, the
first search or a Settings action prepares it, and the search-time fingerprint check stays the safety net.

### Relevance

Embedding scores are compressed and model-specific, so a meaning match is decided per model: no meaning match when
even the best score is below the entry's `clearMatchFloor`; otherwise every item within `nearBestMargin` of the best
one, at most `limit`. The values were calibrated with the synthetic Task set in `tests/fixtures/project-task-search`
and cross-checked with measurements on real Tasks; the catalog file records the evidence per entry.

Measured with each model's relevance rule (gated test
`tests/integration/embeddings/embedding-model-quality.integration.test.ts`; `TEST_EMBEDDING_SCALE=1` adds the 1,000-Task
backlogs of `tests/helpers/project-task-search-backlogs.ts`). Each cell: paraphrased queries whose target is shown among
the first 5 matches (AC-001) / unrelated queries that show no match (AC-004), over 63 paraphrases and 24 unrelated
queries. The targets are 90% / 90%; the default model must meet them up to 1,000 Tasks.

| Model | 60 fixture Tasks | 1,000 Tasks: fixture + 940 generated | 1,000 Tasks: fixture + 940 texts from finished tickets |
| --- | --- | --- | --- |
| Granite Small English R2 (default; floor 0.78, margin 0.02) | 96.8% / 95.8% | 93.7% / 95.8% | 92.1% / 95.8% |
| LEAF-IR (floor 0.30, margin 0.045) | 95.2% / 95.8% | 87.3% / 91.7% | 90.5% / 83.3% |
| EmbeddingGemma 2 (floor 0.68, margin 0.02) | 95.2% / 100% | not measured (indexing 2,000 long Tasks takes hours) | not measured |

LEAF-IR's scores spread less as a Project grows, so no floor keeps both targets at 1,000 Tasks; with hundreds of Tasks,
unrelated searches start to show a few meaning matches. Exact matches are unaffected.

## Readiness And Failures

The active model moves `idle → downloading → loading → ready`, skipping `downloading` when its files are already on
disk (they are only verified then, reported as `loading`); any failure makes it `unavailable` with a reason. A
search answers at once (unless `waitForReadyMs` is set) with the readiness:

- `preparing` + `downloading` (`done`/`total` in bytes), `loading`, or `indexing` (`done`/`total` in items of the
  collection indexed for their current text);
- `unavailable` + `reason`: nothing is retried until `retryModel()` or a model change, so failing searches never cause
  a download storm;
- `ready`: every item is indexed for its current text.

Meaning matches only come from items indexed for their current text: an edited item is never matched by its old text.
Failures never affect anything outside meaning search.

## Storage

`<appData>/embeddings/embeddings.sqlite` (Node's built-in `node:sqlite`) holds one table
`embedding_vectors(collection, item_id, model_id, fingerprint, vector)`: the vectors, the model that made them and the
SHA-256 of the text exactly as embedded (document prefix + text). It stores no item text. It is a disposable cache:

- it can be deleted at any time and is rebuilt by the next searches;
- a file that cannot be opened, or whose table has another shape, is renamed to
  `embeddings.sqlite.unreadable-<time>` with a logged warning (`EMBEDDING_STORE_UNREADABLE`) and recreated;
- after a restart, items whose fingerprint is unchanged are not embedded again;
- removals before anything was ever indexed do not create the file.

Nothing in the layer is created or loaded at server startup.

## Testing

- `tests/unit/embeddings/`: the index (with the deterministic stand-in model `tests/helpers/fake-embedding-model.ts`),
  model management and read-only status, downloads, store, model files (local HTTP server), catalog, setting, relevance
  rule and the worker's load failure.
- `tests/e2e/projects/embedding-settings.e2e.test.ts`: the Settings GraphQL queries and mutations over Studio HTTP.
- `tests/integration/projects/project-task-index-status-load.integration.test.ts`: the gated load check of one
  Settings status poll at 20 Projects × 1,000 Tasks (`RUN_PROJECT_INDEX_STATUS_LOAD=1`; budget 1 s).
- `tests/integration/embeddings/embedding-model-quality.integration.test.ts`: the gated real-model check of the
  catalog on the production stack (`RUN_EMBEDDING_MODEL_E2E=1`; options in the file header).
