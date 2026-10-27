# Memory Search

## Scope

`src/memory-search` finds past work in the memory of every run on this node, today through their
[Work Journals](./agent_work_journal.md). An agent asks with the tool `search_memory`; the user asks on the
Memory page (Search). A result points to **where** the work is (run, journal file, lines, day, snippet); it is a
pointer, not a fact, and the agent opens the lines with a file tool to read them.

It searches local memory only: never `memory/imports/` (Memory Sync imports) and never other nodes. The asking
agent's own run is left out of its results.

Words are defined in [GLOSSARY.md § Memory](../../../GLOSSARY.md#memory): memory search, memory index, indexing
pipeline, journal chunk, journal card, Words / Meaning, memory run.

## TS Source

- `memory-search.ts`: `MemorySearch`, the subsystem's **only public boundary** (tools, GraphQL, startup), and
  `getMemorySearch()` / `shutdownMemorySearch()`.
- `pipeline/`: `MemoryIndexPipeline` (the indexing pipeline), the Journals step and the per-run text indexer.
- `runs/memory-run-discovery.ts`: Find runs.
- `index/`: text normalization (`memory-text-normalizer.ts`), `journal-chunker.ts`, `journal-card-builder.ts`.
- `store/memory-search-store.ts`: the index file (SQLite).
- `search/`: `MemorySearchService` (the search sequence) and `secret-masker.ts`.
- `settings/memory-search-settings.ts`: `AUTOBYTEUS_MEMORY_SEARCH_DEFAULT_LIMIT`.
- `evaluation/memory-search-evaluation.ts` with `scripts/evaluate-memory-search.mjs`: the quality check (below).

Nothing outside `src/memory-search/` imports anything but `memory-search.ts`, `domain/` and `settings/` (the
server settings registration and the tool's limit). The subsystem reads
journals only through `WorkJournalService`, and meaning vectors only through `EmbeddingIndex`
([embeddings.md](./embeddings.md)); it never reads raw traces.

## Public Boundary

```ts
const memory = getMemorySearch();
await memory.search("DDNS updater", { limit: 10, askingRunId }); // {results, coverage, wordsNotFound, note}
memory.indexStatus();   // {state, steps, runCount, journalFileCount, updatedAt, textIndexHasContent, activeModelId, meaningIndexModelId, meaningNote}
memory.startIndexing(); // Index now / Try again: a full pass that resumes; false while a pass runs
memory.rebuild();       // drops the index, then a full pass; false while a pass runs
memory.runFolderMemoryDir(runKey); // the folder of a RUN_FOLDER run, or null
```

- `limit` is 1–20; without one, the setting `AUTOBYTEUS_MEMORY_SEARCH_DEFAULT_LIMIT` (default 10).
- `results`: one entry per run, best first: agent, team, member, org, run ID, workspace, first and latest day, a
  citable `source` line, a `subject` (how the Memory page opens the run: `AGENT`, `TEAM_MEMBER`, `ORG_MEMBER`, or
  `RUN_FOLDER` for a folder no record attributes), and up to 2 matches.
- A match: the journal file's absolute path, `lineStart`–`lineEnd`, day, a snippet of 2–3 lines read from the
  journal at query time (secrets masked), `matchedBy` (`text` or `meaning`) and `matchedWords`: the query's search
  terms its lines hold, in query order (a text match); empty for a meaning match. A match carries no grade
  (UD-020): embedding scores have no reliable absolute meaning.
- `coverage`: why the answer may be partial (index not built, building, meaning index loading or not current).
  Before the first build: `Memory index not built yet: ask the user to start it on the Memory page.`
- `wordsNotFound`: the query's search terms that no journal chunk of the index holds, one exact phrase `MATCH`
  per term over the whole index. The asking run's journal counts (absence is a fact about the whole memory, R-15).
  Empty while the Text step is incomplete (`textIndex` not `done`), since absence is then no fact. A live pass,
  queued or running, does not hold it back (R-13): a word only in the last turn's lines is named until that turn is
  indexed (≤ 20 s), which is why the tool says "no indexed journal".
- `note`, the first that applies: no results → `No matches; try other words.`; every search term not found →
  `None of these words appear in your memory: X, Y.`; some → `Not found in your memory: X.`; else none. Memory
  search never says that nothing is in memory.

## Indexing Pipeline

One `MemoryIndexPipeline` builds and updates the memory index. Steps, in order:

1. **Find runs** (`MemoryRunDiscovery`): every run folder with raw traces under `memory/` (not `work_journal/`,
   not `imports/`), named from the records of its time: run-history catalog and metadata for standalone runs,
   team and org execution trees, task teams (`TaskTeamRootMemorySource`), else the folder's name. A run's
   `runKey` is its folder relative to the memory folder.
2. **Journals**: for each run whose raw-trace fingerprint changed (file names, sizes and times, including the old
   `raw_traces_archive/` layout), `WorkJournalService.ensureCurrent`. A run whose journal fails is skipped with a
   warning and tried again on the next pass.
3. **Text index**: each journal file whose content hash changed is chunked again (whole entries up to 2,000
   characters, split at day changes; a longer entry split by lines) and its journal card built again.
4. **Meaning index**: the **complete** card set is passed to `EmbeddingIndex.sync("memory-journal-cards", …)`,
   which embeds what changed in the background.

Pass kinds (one pass at a time; requests made while one runs merge into the next, the larger kind winning):

| Kind | Started by | Steps |
| --- | --- | --- |
| `full` | Index now / Try again | all; records the meaning model; marks the index built |
| `rebuild` | Rebuild | drops the index and the card collection, then all |
| `catchUp` | server start, when the index was built before | all but Meaning (no model is loaded at start) |
| `runs` | journal changes (`onJournalChanged`, 20 s quiet time) | the changed runs only |
| `meaningSync` | the first search after a start (`nearest` answered `notSynced`), only when the Meaning step would embed (recorded model active and on disk) | Meaning only |

The status shows `building`, with the pass's own step progress, only for `full`, `rebuild` and `catchUp`. While
a `runs` or `meaningSync` pass runs, it reports the settled index (its state, counts and complete steps), so a
search's coverage note never claims missing coverage because a turn is being indexed. A failed `runs` or
`meaningSync` pass is logged (`MEMORY_SEARCH_PASS_FAILED`) and leaves the reported state as it was; the next
change or start tries again. The Meaning step's progress counts the build's own embedding; a live update's few
re-embedded cards are upkeep and do not show.

Journal changes are queued whenever they happen, also while a pass or the first build runs; only the
notifications caused by the Journals step's own `ensureCurrent` calls are dropped (that pass indexes the run
next). A queued change waits for the running pass; before the first build, nothing is indexed until the user
starts it.

Meaning step rules: on the user's click it always syncs (a download, if the model is missing, is the embedding
layer's preparation) and records `meaningIndexModelId`. Otherwise it syncs only when the active model is the
recorded one and is on disk; it never downloads. A changed active model makes the state `modelChanged`: searches
are by words only until the user rebuilds.

Nothing runs at server start but the catch-up (`startup/memory-search-loader.ts`, a background task); a server
that never built the index does no indexing work.

## Index File

`<app data>/memory-search/memory-search.sqlite`, derived and disposable (Rebuild recreates it; an unreadable file
is deleted and recreated):

- `runs`, `files` (per journal file: content hash, card text and card parts with their line ranges), `chunks`
  (file, line range, day) and `state` (built, `meaningIndexModelId`, `updatedAt`).
- `chunk_text`: a contentless FTS5 table (`unicode61`; each CJK character indexed as a word). Chunk text is not
  stored; snippets are read from the journal.
- Meaning vectors live in the embedding layer's store, collection `memory-journal-cards`, one card per journal
  file (id `<runKey>/work_journal/<file>`).

## Search Sequence

`MemorySearchService` only reads the indexes:

1. **Text:** the query's words (stop words removed; Chinese as overlapping 2-character phrases), OR-joined, BM25,
   up to 4,000 chunks, grouped by run in rank order.
2. **Meaning:** `EmbeddingIndex.nearest` over the cards (up to 300), the best card per run; a card with no positive
   similarity is not a match.
3. **Order:** the two run lists alternated (text first), each run once, up to `limit`.
4. **Matches per run:** its best 2 text chunks; a meaning match points to the same file's best text chunk, else
   to the card part with the most query words, else to the file's first request. A run's matches are listed
   newest day first, then by line.
5. **Match facts:** a text match names the search terms its lines hold, by the index's own rule (`containsTerm`:
   the term's `unicode61` tokens in a row, case and diacritics folded, so `memory_search` is in "Memory search").
   A search term needs a letter or digit (`...` is no term). A meaning match that
   points at the same lines as one of the run's text matches is listed once, as the text match. Then each term
   is checked once against the whole index (`hasChunk`) for `wordsNotFound`. No score threshold, baseline or
   calibration exists: meaning candidates count only by their `nearest` order.
6. **Snippet:** 2–3 lines from the first line holding a query word; each line has its secrets masked, then is
   cut to 200 characters, so a cut never leaves part of a secret.

The facade adds `coverage`, holds `wordsNotFound` back while the Text step is incomplete, composes `note`, and asks for a `meaningSync` pass when `nearest` answered `notSynced`.

## Entry Points

- **Tool `search_memory`** (`src/agent-tools/memory/`): one contract for the native tool and the MCP adapter
  (`memory-tools-mcp-adapter-provider.ts`). Input `{query, limit?}`; argument errors are tool errors
  (`MEMORY_TOOL_ARGUMENT_INVALID`). The result keeps only fields with a value, lines as `"812-860"`. An agent
  gets the tool only when its definition selects it.
- **GraphQL** (`api/graphql/types/memory-search.ts`): `memorySearch(query, limit)`, `memoryIndexStatus`,
  `startMemoryIndexing`, `rebuildMemoryIndex`, and `runFolderWorkJournal(runKey, workJournal)` for a `RUN_FOLDER`
  run. Enum-like fields are upper case strings (`MEANING_INDEX`, `TEXT`, …).
- **Memory page:** Search and Index tabs, and the Work Journal view of a run
  ([agent_memory.md](./agent_memory.md#trace-shape-and-graphql-view)).

## Quality Check

A change to chunking, cards, query handling or ordering is measured first with the evaluation command on an
**isolated copy** of a memory folder (never `~/.autobyteus`): see `scripts/evaluate-memory-search.md`. Gate 1 (the
right run in the top 10 within 3 searches) must stay at 100%; gate 2 (top 3, latency) must not get worse.
