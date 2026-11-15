# Docs Sync Report — memory-sync-large-files (Project Task autobyteus-workspace-7)

## Scope

- Ticket: `memory-sync-large-files` (Project Task `autobyteus-workspace-7`: "Memory Sync: one attachment over ~37 MiB stops all syncing")
- Trigger: the code reviewer's post-API/E2E message (`api-e2e-test-review-report.md`, CRR-005, `Not Applicable`) after API/E2E round 3 (API-REV-003, `Pass`, 93%)
- Task size / architectural risk / route: `Large` / `High` / `Code Review` (review gates ran: architecture ARCH-REV-003 Pass, implementation CRR-004 Pass, API/E2E API-REV-003 Pass, test-code review CRR-005 Not Applicable). Delivery did not reclassify.
- Bootstrap base reference: `origin/personal` @ `3d738de6e`
- Integrated base reference used for docs sync: `origin/personal` @ `64cd30d2c` (the merge of `context-file-large-video-upload`, autobyteus-workspace-6), merged into the ticket branch as `fa14fc465` (merge commit, no conflicts)
- Post-integration verification reference: `evidence/DEL-01` … `DEL-05` on `fa14fc465` (Node 22.23.3); see the release/deployment report, "Initial Delivery Integration Refresh"

## Why Docs Were Updated

- Summary: Memory Sync changed how a source sends files (byte-bounded batches; files above 8 MiB uploaded in pieces to a hub staging area and committed by reference; unchanged files not re-read; per-file failures that no longer stop the run) and what the owner sees (a "files could not be synced" block in the Memory Sync card). The implementation rewrote `memory_sync.md`; delivery checked every other long-lived document that describes Memory Sync or the memory root against the code at the integrated state and fixed the ones that were now wrong or incomplete.
- Why this should live in long-lived project docs: owners of source and hub nodes need the limits, the staging layout, the resume and failure rules, and the "update every node together" rule (`DESIGN.md` rule 9); readers of the web and server module docs need the card's new block and the new folder under the memory root, so they do not rely on the old "full-file replacement batches" description.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project document (docs sync always checks it); rule 9 (no compatibility between versions) is what the same-release contract follows | No change | The ticket applies rule 9 and adds no new project rule. Its design lessons are the Solution Designer's to add (`DESIGN.md`/`docs/design-cases.md`). |
| `TESTING.md` | Project document; API/E2E added a "Node version" rule | No change by delivery | The API/E2E rule (Node 22 for server and web suites; Electron's Node for memory measurements) is accurate against the evidence (API-05/05b, API-07) and is already committed (`docs(testing)`). The web typecheck row is accurate: `pnpm -C autobyteus-web typecheck` runs `prepare:shared-types` first, which explains the implementation's six extra test-file errors (it ran the script without it). The failing gate itself is FU-003, not a documentation error. |
| `RELEASE.md` | Project document; finalization and release rules used by this delivery | No change | No release machinery changed. Proposed fix, not applied (see the release/deployment report): "Finalization Target" names ticket branches `codex/<ticket-name>`, while the bootstrap creates `task/<ticket-name>` (same proposal as `tickets/done/context-file-large-video-upload/docs-sync-report.md`). |
| `autobyteus-server-ts/docs/features/memory_sync.md` | The feature document; REQ-010 / AC-007 / AC-012 | Updated (by implementation; verified, and two references fixed by delivery) | Verified against `src/memory-sync/**`, the REST routes and the GraphQL schema at the integrated state: endpoints and limits, inline vs staged operations, commit order, staging cleanup, file failures and retry delay, run gate, status fields, "Update every node together, and release order", Operational Limits, Validation Coverage, Source Owners. Delivery changed the two references to the ticket's `follow-ups.md` (FU-001, FU-002) to the archived path `tickets/done/memory-sync-large-files/follow-ups.md`, which is where the file will live. Clean-up of the release-order sentence after the release: FU-006. |
| `autobyteus-web/docs/memory.md` | Describes the Nodes → Memory Sync card, the sync scope and the test coverage | Updated | Said Memory Sync "mirrors … files with full-file replacement batches" and knew nothing of the failures block. See "Docs Updated". |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Lists what lives under the memory root | Updated | Added the hub's `memory/memory-sync-staging/` folder. |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Names where Memory Sync keeps its files | Updated | Added the staging folder to the Memory Sync bullet. |
| `README.md` ("Memory Sync / Memory Hub"), `autobyteus-server-ts/README.md` (same section), `autobyteus-server-ts/docker/README.md` ("Memory Sync between Docker nodes and a hub") | Summaries of the setup flow and storage layout | No change | They describe setup, tokens, URLs and the `imports/` layout and point to `memory_sync.md` for limits; nothing they say changed. The Docker README names `Current job` and `Last sync` as the card's status, which stays true. |
| `autobyteus-server-ts/docs/design/node_access_model.md` (NA-7, NAS-26) | The new staged-file routes must be admitted only to memory sync source credentials | No change | The routes sit under the existing `/rest/memory-sync/` prefix rule; API-11 proves a source token passes and the owner credential, no credential and a wrong token are refused. |
| `GLOSSARY.md`, `docs/design-cases.md`, `autobyteus-web/docs/settings.md`, other module docs naming Memory Sync (`memory_search.md`, `run_history.md`, `agent_work_journal.md`, `codex_integration.md`, `URL_GENERATION_AND_ENV_STRATEGY.md`, `data_migration_guideline.md`) | Searched for `memory sync`, `base64`, `50 MiB`, `batchSize`, `deferred`, `maxOperations` | No change | Mentions are about identity (`memorySyncSourceId`), the capability gate or migration, which this ticket does not touch; none repeats the replaced batch behavior. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/memory.md` | Behavior description, coverage list | New paragraph on the card's "N files could not be synced" block (rows of path, size, reason, next attempt; at most 20, then "and N more"; word wrapping; run still `success`; **Sync now** retries; run-level errors unchanged; localized en and zh-CN). The sync-scope paragraph now says "files of any size": size-bounded batches, pieces above 8 MiB, unchanged files not re-read, with a link to `memory_sync.md#sync-behavior`. Coverage list: the large-file e2e and `MemorySyncCard.spec.ts`. | The old text ("full-file replacement batches") described the removed behavior. |
| `autobyteus-server-ts/docs/features/memory_sync.md` | Reference fix | FU-001 and FU-002 references point to `tickets/done/memory-sync-large-files/follow-ups.md`. | The ticket folder moves to `tickets/done/` before the final commit. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Layout list | New bullet: `memory/memory-sync-staging/<memorySyncSourceId>/<sha256>.partial`, hub only, not a run folder, never in `imports/`, partials removed after 24 h. | The list of the memory root's contents was incomplete after this change. |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Storage note | The Memory Sync bullet names the staging folder. | Same. |
| `autobyteus-server-ts/docs/features/memory_sync.md` (implementation's rewrite, kept) and `TESTING.md` "Node version" (API/E2E) | Already committed | Verified, not edited by delivery. | — |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Large-file transfer contract | Inline (≤ 8 MiB, base64 in a batch) vs staged (raw pieces of ≤ 8 MiB to the hub's staging, committed by reference); batch budgets (24 MiB inline, 4 GiB staged); resume from the hub's received bytes; hub commit order (batchId check, verify all, refuse before any write, write, manifest) | `design-spec.md`, `implementation-handoff.md` | `memory_sync.md` (Sync Behavior) |
| Same-release rule and release order | Source and hub are updated together (no detection, no fallback); the staged-file change is released before or with workspace-6 | `requirements-doc.md` DEC-007, REQ-008, REQ-010 | `memory_sync.md` (Update every node together, and release order); the release-order sentence is transitional (FU-006) |
| File failures | One file's problem does not stop others; retry delay 1 min doubling to 1 h; at once on change and on Sync now; run-level errors keep their messages | `requirements-doc.md` REQ-005..007, DEC-005, DEC-006 | `memory_sync.md` (File failures), `autobyteus-web/docs/memory.md` |
| Memory use of a transfer | Not a documented guarantee beyond "does not grow with the file size"; the measured figures (first transfer of a fresh process ~150-360 MiB over idle depending on Node) stay in the ticket evidence and FU-004 | `evidence/API-07-ac003-measurement.md` | Not promoted (measurement of one run, not a rule) |
| Memory-measurement and Node-version rule | Run suites on Node 22; measure on the desktop's Electron Node | `api-e2e-execution-coverage-report.md` | `TESTING.md` "Node version" (already in) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Whole-file `sha256Buffer` reads and base64 of every file; `buildReplaceOperation`, `chunkOperations`, `MemoryFileDescriptor`, `maxOperations` and the "batch limit reached" error, the 50 MiB literal | Streaming hash (`memory-sync-file-hash.ts`), byte-budget batch planner, `MemoryFileEntry` / `ChangedMemoryFile`, shared transfer limits | `memory_sync.md` (Sync Behavior, Source Owners) |
| Scanner `deferred` list (files changed during the scan) | The change planner decides a changed-while-read file; the run result has `deferredFiles` | `memory_sync.md` (Change detection) |
| "Full-file replacement batches" wording | Batches plus staged pieces, any file size | `autobyteus-web/docs/memory.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: documents were updated.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence (recorded in the release/deployment report), move the ticket to `tickets/done/memory-sync-large-files/`, final commit, push, merge into `personal`
- Notes: follow-up found by delivery: FU-006 (`follow-ups.md`). Follow-ups for the Solution Designer to send: FU-001..FU-006, of which FU-003 is urgent.
