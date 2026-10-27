# Docs Sync Report — work-journal-search (autobyteus-185)

## Scope

- Ticket: `work-journal-search` (Project Task autobyteus-185), `task_size=Large`, `architectural_risk=High`, reviewed route.
- Trigger: delivery DR-002, after IR-006 (latest-base merge), CRR-007 Pass, API-REV-003 Pass (94%) and CRR-008 Pass.
- Bootstrap base reference: merge-base `ddd6fdcdf6`.
- Integrated base reference used for docs sync: `origin/personal` @ `8c31e530d6`, contained in merge `3d209177ec`. It was rechecked at the start of DR-002.
- Post-integration verification reference: API-REV-003 on `3d209177ec`; IMP-32; delivery smoke `evidence/delivery/DR-002-*`.

## Why Docs Were Updated

- Summary: the change adds memory search: the index pipeline, the `search_memory` tool, GraphQL and the Memory page Search and Index tabs. It also generates Work Journals for all runs and updates the docs for memory, Work Journal, embeddings, the evaluation command, the web Memory page and the glossary. Delivery reviewed them on the merged state, and added the `search_memory` adapter to the MCP server doc's adapter list.
- Why this should live in long-lived project docs: agents and future changes rely on the tool contract, the notes (`coverage`, `wordsNotFound`, `note`), the indexing pipeline and the quality-check procedure.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/memory_search.md` (new) | Facade, result fields, notes, pipeline, entry points, quality check | No change | Matches the merged code. The no-results note is `No matches; try other words.` (the `NO_MATCHES` constant in `src/memory-search/memory-search.ts`). Matching uses the index's own rule (`containsTerm` in `memory-text-normalizer.ts`). The tool "keeps only fields with a value", which is the merge's tool-result rule (CRR-007, API-L05r3) |
| `autobyteus-server-ts/docs/modules/README.md` | Merge conflict resolved in IR-006 | No change | Memory Search and Model Routing rows both present, alphabetical |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | The ticket adds an MCP adapter (`MemoryToolsMcpAdapterProvider`) | Updated (delivery) | Added `search_memory` from `src/agent-tools/memory` to the default adapter list. The list also lacks four base adapters: FU-012 |
| `autobyteus-server-ts/docs/modules/agent_memory.md`, `agent_work_journal.md`, `embeddings.md` | Changed by the ticket; `agent_memory.md` also changed by the base | No change | Consistent with the merged state |
| `autobyteus-server-ts/scripts/evaluate-memory-search.md` (new) | Evaluation command (R-016) | No change | It says to run on an isolated copy, never `~/.autobyteus` |
| `autobyteus-web/docs/memory.md` | Memory page Search and Index tabs, match facts (UD-020, UD-021) | No change | Matches API-L02r3 |
| `GLOSSARY.md` | Changed by both sides | No change | Merged entries present |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/memory_search.md` | New (change) | Memory search module | New module |
| `autobyteus-server-ts/docs/modules/agent_memory.md`, `agent_work_journal.md`, `embeddings.md`, `README.md`, `scripts/evaluate-memory-search.md`, `autobyteus-web/docs/memory.md`, `GLOSSARY.md` | Updated / new (change) | Journals for all runs, Memory page, index, evaluation | The change |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Updated (delivery) | `search_memory` in the default MCP adapter list | The change adds that adapter |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Facts, not grades | A match carries no strength label (UD-020): embedding scores have no reliable absolute meaning; results state matched words and absent words | `design-spec.md` § Match Facts, SR-006 | `memory_search.md` |
| Quality gates | Gate 1 at 100% and gate 2 not worse, measured on an isolated copy | `requirements-doc.md` AC-001/AC-002, R-016 | `memory_search.md`, `evaluate-memory-search.md` |
| Indexing pipeline | Find runs → Journals → Text → Meaning; resumable passes, live updates within 20 s | `design-spec.md` | `memory_search.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Strong / Fair / Weak match strength (SR-004/SR-005, never released) | `matchedWords`, `wordsNotFound`, `note` | `memory_search.md`, `autobyteus-web/docs/memory.md` |

## Ticket Design Document (not a long-lived doc)

- `design-spec.md` § Match Facts items 1 and 4 still quote the earlier wording: "by the existing `containsTerm`", and the note "No matches in memory." (unchanged). The code and `memory_search.md` follow the intent: the existing string `No matches; try other words.` is kept unchanged, and the index's token rule is used.
- The implementation handoff and code review (C-14, rejected as design-doc drift) asked the Solution Designer to align the wording. It is not done yet.
- The design spec is the Solution Designer's document. Delivery leaves it to them and names it in the terminal package. It does not affect behavior or the long-lived docs.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive, finalization, then the beta release the user decided on.
