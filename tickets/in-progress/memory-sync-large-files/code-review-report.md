# Code Review Report — memory-sync-large-files (Project Task autobyteus-workspace-7)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited sections only)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-004, Ready)
- Supplemental Task Artifacts Reviewed As Context: `probes/large-file-sync-probe.e2e.test.ts.txt` (evidence only)
- Relevant Solution Revision IDs: SR-004 (requirements SR-003)
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: round 1 `Full Review` (CRR-001, at `3a78c3eee`); round 2 `Targeted Delta Review` (CRR-002, at `077fa6853`)
- Review Scope Evidence (round >1): `git diff --stat 3a78c3eee bfcd82366 -- . ':!tickets'` shows one file, 4 deletions (`memory-hub-staged-file-store.ts`: CR-001's function). No spine, interface or data-shape change, no new files, no fix layered on a fix.
- Trigger: round 1 was implementation handoff IR-001 (Large / High), code commit `3a78c3eee`. Round 2 is IR-002 (the CR-001 Local Fix), code commit `077fa6853`, with documents in `bfcd82366`. Branch `task/memory-sync-large-files`, base `origin/personal` @ `3d738de6e`.
- Prior Review Round Reviewed: 1 (CRR-001, Fail, Local Fix)
- Latest Authoritative Round: 2
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. Three subsystems (source, hub, owner surface), a new node-to-node contract (staged-file routes, `staged` encoding), a new hub persistence area with lifecycle, an additive source-state field, and a changed run lifecycle. No correction.

## Review Scope

- Changed implementation and behavior reviewed: the full `3d738de6e..3a78c3eee` diff of `autobyteus-server-ts/src` (memory-sync source/hub/shared, REST routes, GraphQL types, startup loader), `autobyteus-web` card/store/queries/mutations/localization, `docs/features/memory_sync.md`; the new and changed tests read for structure and requirement alignment.
- Files / areas reviewed: every changed source file listed in the size audit below; `persistence/file/store-utils.ts` (lock semantics the design relies on); `memory-hub-credential-service.ts` and gate status codes (run-level vs file-level classification).
- Explicit exclusions: `autobyteus-web/generated/graphql.ts` (codegen output, checked by the IMP-01 `web-generated-graphql-current` test); untracked `autobyteus-application-*-sdk/dist/` (not part of the change).
- Checks rerun by the reviewer: none. IMP-01..IMP-05 ran on `3a78c3eee`, the code reviewed; no result was unclear enough to need a rerun.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes` — REQ-001..REQ-010, AC-001..AC-012, preserved invariant "nothing partial visible", same-release contract (`DESIGN.md` rule 9).
- Design-spec behavior map verified against the implementation: `Yes` — DS-001..DS-006 traced in code.
- Design review report and round confirmed: ARCH-REV-003 Pass; AR-001..AR-008 and R-AR-1 resolutions are present in code as designed (see table).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None
- Remaining material ambiguity: AC-003's measurement wording (cold vs warm RSS growth) — see Residual Risks; it does not change the reviewed behavior.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `MemorySyncService.runOnce` → `planChangedFiles` → `planMemorySyncBatches` → per batch `MemorySyncBatchTransfer.send` then `recordOutcomes` before the next batch (`memory-sync-service.ts:113-120`); batch cutting by count, 24 MiB inline, 4 GiB staged (`memory-sync-batch-planner.ts:29-46`) matches the design examples | — |
| BEH-002 | Confirmed | `MemoryFileStager.stage` GET received bytes, hashes prefix, PUTs ≤ 8 MiB pieces at offsets; hub `appendPiece` only at current length (409 otherwise); commit by `contentEncoding: "staged"` | — |
| BEH-003/004 | Confirmed | `hashStableFile` / `hashFile` stream; stager uses one 8 MiB buffer; no whole-file read or base64 above 8 MiB (`readStableContent` only for inline lane ≤ 8 MiB) | — |
| BEH-005 | Confirmed | scanner lists stat only; `matchesSyncedRecord` skips size+mtime matches without reading (`memory-file-change-planner.ts:22-44`) | — |
| BEH-006 | Confirmed | `recordOutcomes` logs once per new failure/changed reason; GraphQL `fileFailureCount` + 20 most recent; card block en/zh-CN | — |
| BEH-007 | Confirmed | scoped octet-stream parser + 8 MiB `bodyLimit` (`api/rest/memory-sync.ts:68-116`); staging `<memoryDir>/memory-sync-staging/<id>/<sha>.partial`; commit verify-all-then-write inside the manifest lock (`local-file-memory-import-store.ts:140-204`) | — |
| BEH-008 | Confirmed | `isFileLevelHubError` = 400/409/413/422 only; gate refusals (401/403), credential errors (401/403/404), 503 and network errors rethrown (`memory-sync-batch-transfer.ts:41-42`); gate texts unchanged in the parser | — |

ARCH-REV resolutions checked in code: AR-001 grouping by SHA-256, one verification per content, size check per group, refuse before any write (`local-file-memory-import-store.ts:216-281`); AR-002 trigger as data, `manual` queues one run after a `background` run (`memory-sync-service.ts:54-72`); AR-003/AR-008 `requestStagingSweep()` is the only caller of `sweepStale()`, not awaited, hourly, never concurrent, per-source manifest lock one folder at a time; AR-004 prefix hashed locally, exactly `size` bytes read; AR-005 network errors run-level; AR-006 per-batch recording; AR-007 `.tmp` sibling + rename, last target by rename; R-AR-1 4 GiB staged budget, `requireMemorySyncReady()` on every staged path (`getStagingRootDir`).

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001..005 | User + System | Owner, background loop | Large attachment reaches the hub | Attach to a run; worker tick or Sync now | Normal | DS-001 → DS-002 → DS-003 | Imported, verified | requirements SCN-001; probe | Supported Normal Scenario | Use |
| SCN-003 | BEH-001 | Operational | Owner | First sync of much memory | Enable + Sync now | Normal | DS-001 batches by bytes and count | All imported, no 413 | requirements SCN-003 | Supported Normal Scenario | Use |
| SCN-004 | BEH-001, 002, 008 | System | Background loop | One file refused / connection lost | Hub 400 on a file; network drop | Normal | transfer split → per-file outcome; network error → run error, resume next run | Rest imported; resume | requirements SCN-004 (SR-003) | Supported Normal Scenario | Use |
| SCN-006 | BEH-008 | Operational | Owner | Hub not usable | Token revoked / hub down | Normal | run-level rethrow | `error · <message>` | requirements SCN-006 | Supported Normal Scenario | Use |
| SCN-007 | BEH-006 | User | Owner | See what did not sync | Nodes → Memory Sync | Normal | DS-005 | Count + list | requirements SCN-007 | Supported Normal Scenario | Use |
| C-ENG-1 | Core Principle 7; `DESIGN.md` rule 11 | Contract | — | No dead code in touched files; no production code only tests use | Engineering contract | — | — | — | team design principles | Contract | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `resetMemoryHubStagedFileStoreForTests` exported from the new `memory-hub-staged-file-store.ts` has no caller anywhere (production or tests) | C-ENG-1 | — (contract) | Dead export introduced by this change; also a test-only name in production code | `git grep resetMemoryHubStagedFileStoreForTests 3a78c3eee` → only its definition (`memory-hub-staged-file-store.ts:200`) | Promote | This ticket | Delete the function (CR-001). Resolved in `077fa6853` (round 2) |
| C-02 | Cold 2 GiB source RSS growth 264 MiB > QR-002's 200 MiB → transfer memory inadequate (Design Impact per the design's escalation trigger) | SCN-001, QR-002 | Owner's Sync now with a 2 GiB file | DS-002 on source and hub | IMP-05: 4 GiB cold peak ≈ 2 GiB cold peak (584 vs 561 MiB source; hub lower at 4 GiB); warm 2 GiB adds 84 / 74 MiB; cold 30 MiB control already +116 MiB; code holds one 8 MiB piece buffer (source), one parsed 8 MiB body per piece and 64 KiB stream chunks (hub); no allocation scales with file size | Reject (as a code or design defect) | — | The evidence shows bounded, size-independent transfer memory (REQ-002) and that the excess above 200 MiB is a fixed first-sync process cost, not transfer memory. Whether AC-003's literal "RSS growth during the transfer" is judged on the cold figure is an acceptance question for API/E2E's independent AC-003 run and the requirement owner — recorded in Residual Risks, not a finding here |
| C-03 | R-AR-1: hub verification inside the commit request could approach the 300 s fetch headers timeout | SCN-001 | 2–4 GiB staged batch | DS-003 commit | IMP-05: 5.7 s (2 GiB), 12.8 s (4 GiB) | Reject | — | ~2–4 % of the timeout; the 4 GiB per-batch budget bounds it |
| C-04 | `sweepStale` skips the lock for a source with no `imports/<id>` folder | AR-003 | A >24 h-old partial committed at the same instant as that source's first-ever commit | — | handoff Important Assumptions | Reject | — | Technically Possible but Unsupported/Contrived (needs a staged file abandoned for a day plus an exact-instant first commit); taking the lock would create a visible empty imports folder |
| C-05 | `appendPiece` not mutex-protected; two concurrent pieces at one offset | BEH-007 | Two concurrent PUTs for one source and SHA | — | stager sends one piece at a time; run gate allows one run | Reject | — | Not a supported workflow; commit verification would refuse it anyway |
| C-06 | Hub maps any unexpected commit error (e.g. disk full) to 400, which the source treats as file-level | BEH-008 | Hub infrastructure failure | — | `sendMemorySyncError` default 400 (pre-existing) | Reject | — | Infrastructure failure is out of scope by default (Core Principle 6); mapping is pre-existing and unchanged |
| C-07 | `MemorySyncBatchTransfer` optional `stager` constructor parameter set only by tests | `DESIGN.md` rule 11 | — | — | Constructor injection with production defaults is the module-wide pattern (`MemorySyncService`, `LocalFileMemoryImportStore`, `MemoryHubIngestionService` constructors) | Reject | — | Existing convention, not a test-only value or branch; a preferred structure is not a finding |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Planner/service responsibility split done as designed; "one batch per run" by absence removed (`maxOperations` gone) | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No behavior-defining supplements; probe turned into the durable e2e | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-006 map one-to-one to code owners | — |
| Ownership boundary preservation and clarity | Pass | Service is the only caller of scanner/planners/transfer; only the transfer calls the stager; routes call only the ingestion service; only the import store calls `verifyStagedFile`/`placeStagedFile` | — |
| Off-spine concern clarity | Pass | failure policy, limits, streaming hash each in one owned file | — |
| Existing capability/subsystem reuse check | Pass | `withFilePathLock`/`updateJsonFile`, source state, GraphQL status, scoped Fastify parser reused | — |
| Reusable owned structures check | Pass | limits and streaming hash in `shared/`; manifest path helpers moved to `shared/memory-sync-manifest.ts` so the staged store need not import the import store | — |
| Shared-structure/data-model tightness check | Pass | operation union discriminated by `contentEncoding`; `MemoryFileEntry` / `ChangedMemoryFile` replace `MemoryFileDescriptor`; `MemorySyncFileFailure` has no redundant fields | — |
| Repeated coordination ownership check | Pass | file-level vs run-level classification only in `isFileLevelHubError`; retry delay only in the failure policy; sweep cadence only in `requestStagingSweep` | — |
| Empty indirection check | Pass | startup loader owns the readiness check; no pass-through layers | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | each new file one concern | — |
| Ownership-driven dependency check | Pass | `source/*` imports `hub/memory-hub-config.ts` only; `hub/*` imports `shared/*` and the existing config service; limits import nothing | — |
| Authoritative Boundary Rule check | Pass | no caller depends on both an outer owner and its internal; the import store reaching the staged store is the designed `commitBatch` boundary | — |
| File placement check | Pass | `source/`, `hub/`, `shared/`, `startup/` as designed | — |
| Flat-vs-over-split layout judgment | Pass | flat module folders kept (existing pattern) | — |
| Interface/API/query/command boundary clarity | Pass | staged routes identified by source id + validated SHA-256; `startSync(trigger)` explicit | — |
| Naming quality and Core Principle 15 | Pass | "staged file", "piece", "file failure", "run trigger" used consistently in code, wire, doc and UI ("files could not be synced", per design Terminology) | — |
| No unjustified duplication | Pass | the temp-path expression repeats in import store and staged store (pre-existing local pattern, three lines) — not material | — |
| Patch-on-patch complexity control | Pass | rewrites replace the old paths cleanly | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | Round 1 failed on CR-001. Round 2: the function is deleted in `077fa6853`, and `git grep` at `bfcd82366` finds no match | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | test names cite AC/AR IDs; e2e asserts identical bytes, request sizes, resumed offsets, manifest absence of partials | — |
| Test fixtures/helpers reasonably reusable, structure coherent | Pass | e2e shares one two-server + proxy harness across its four cases | — |
| No stale, duplicated, or compatibility-only tests retained | Pass | run-gate, scanner `deferred`, background-task list tests updated to current behavior | — |
| API/E2E readiness for the next workflow stage | Pass | production paths complete; harness reusable for the independent AC-003 run | — |

## Source File Size And Structure Audit

Effective non-empty lines, base `3d738de6e` → `3a78c3eee`. No file is over 500; no new or grown file needs a split.

| Source File | Before | After | `>500` Check | `>220` Delta Check | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hub/local-file-memory-import-store.ts` | 216 | 282 | Pass | Pass (+66) | Pass (designed commit owner) | Pass | — | — |
| `hub/memory-hub-staged-file-store.ts` (new) | 0 | 181 | Pass | Pass | Pass | Pass | — (CR-001 resolved) | — |
| `hub/memory-hub-ingestion-service.ts` | 62 | 114 | Pass | Pass | Pass | Pass | — | — |
| `source/memory-sync-service.ts` | 157 | 200 | Pass | Pass | Pass | Pass | — | — |
| `source/memory-sync-batch-transfer.ts` (new) | 0 | 159 | Pass | Pass | Pass | Pass | — | — |
| `source/memory-file-stager.ts` (new) | 0 | 100 | Pass | Pass | Pass | Pass | — | — |
| `source/memory-sync-batch-planner.ts` (new) | 0 | 47 | Pass | Pass | Pass | Pass | — | — |
| `source/memory-sync-file-failure-policy.ts` (new) | 0 | 55 | Pass | Pass | Pass | Pass | — | — |
| `source/memory-file-change-planner.ts` | 74 | 63 | Pass | Pass | Pass | Pass | — | — |
| `source/local-memory-export-scanner.ts` | 96 | 74 | Pass | Pass | Pass | Pass | — | — |
| `source/local-file-memory-sync-state-store.ts` | 74 | 108 | Pass | Pass | Pass | Pass | — | — |
| `source/memory-hub-client.ts` | 48 | 87 | Pass | Pass | Pass | Pass | — | — |
| `source/memory-hub-response-parser.ts` | 30 | 42 | Pass | Pass | Pass | Pass | — | — |
| `shared/memory-sync-types.ts` | 147 | 174 | Pass | Pass | Pass | Pass | — | — |
| `shared/memory-sync-file-hash.ts`, `memory-sync-transfer-limits.ts` (new), `memory-sync-manifest.ts` | 0/0/62 | 36/20/71 | Pass | Pass | Pass | Pass | — | — |
| `api/rest/memory-sync.ts` | 51 | 110 | Pass | Pass | Pass | Pass | — | — |
| `api/graphql/types/memory-sync{,-schema}.ts` | 140/219 | 149/243 | Pass | Pass | Pass | Pass | — | — |
| `startup/memory-hub-staging-sweep-loader.ts` (new), `background-runner.ts` | 0/67 | 9/68 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web` card / store / queries / mutations / localization | 298/296/91/144/59/59 | 317/312/101/155/63/63 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | no old-hub detection, no v2 route; inline and staged are two encodings of one protocol with explicit size rules |
| No legacy old-behavior retention in changed scope | Pass | whole-file scanner reads, `buildReplaceOperation`, `maxOperations`, `chunkOperations`, `MemoryFileDescriptor`, the `50 * 1024 * 1024` literal and the scanner `deferred` list are removed |
| Dead code removed in the touched files and modules | Pass | CR-001 resolved in `077fa6853` |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `fileFailures` optional, projected by `normalizeFileFailures`; absent → `{}`; no migration |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | `Directly Usable — No Migration` / `Not Affected` as designed |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/memory-sync/hub/memory-hub-staged-file-store.ts:200-202` `resetMemoryHubStagedFileStoreForTests` | `UnusedHelper` | `git grep` at `3a78c3eee`: no caller in `src` or `tests` | New dead export in a file this change adds (Core Principle 7; `DESIGN.md` rule 11) | Done: deleted in `077fa6853` (round 2). No item remains |

## Docs-Impact Verdict

- Docs impact: `Yes` — already done in this change.
- Why: new routes, limits, staging, file failures, same-release rule and release order.
- Files or areas likely affected: `autobyteus-server-ts/docs/features/memory_sync.md` (updated: routes lines 122-127, batch/inline/staged rules 186-211, "Update every node together, and release order" 245-251 — covers AC-007 and AC-012's doc part).

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| R-AR-1 (verification time vs fetch timeout) | Confirmed | Measured 5.7 s / 12.8 s against 300 s (IMP-05) |

New or reclassified premises: None (C-02..C-07 are recorded in the candidate gate).

## Review Scorecard (Mandatory)

- Overall score: `9.41 / 10` (simple average; not the decision rule). Round 2 changes only categories 6 and 10; every other row is carried forward from round 1 unchanged, because the delta touches nothing they assess.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | DS-001..DS-006 readable directly in code; the service calls each mechanism itself in order | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | one owner per rule (classification, delay, cadence, commit order); no boundary bypass | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.4 | explicit identity on staged routes; trigger as data; typed `MemoryHubRequestError` | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.4 | each new file one concern; manifest path helpers moved to `shared/` to keep dependency direction | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | discriminated operation union; stat vs hashed entry types | — | — |
| `6` | `Naming Quality and Local Readability` | 9.3 | consistent domain words; short comments state the rule; the test-named export is gone | — | — |
| `7` | `API/E2E Readiness` | 9.3 | real two-server e2e harness and counting proxy ready for independent runs | rendered card not yet checked (handoff says so) | API/E2E rendered check |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.3 | verify-all-then-write, resume, isolation and run gate traced and tested; memory size-independent per IMP-05 | AC-003 cold figure needs the independent acceptance call (Residual Risks) | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | clean cut; all listed replaced code removed | — | — |
| `10` | `Cleanup Completeness` | 9.5 | removal plan executed in full; CR-001's dead export deleted | — | — |

## Findings

No open findings. CR-001 is resolved (see `code-review-revision-record.md` CRR-002).

### CR-001 — Dead test-only export in the new staged-file store (Low, Local Fix) — Resolved in round 2

- Where: `autobyteus-server-ts/src/memory-sync/hub/memory-hub-staged-file-store.ts:200-202`, `resetMemoryHubStagedFileStoreForTests`.
- Basis: Core Principle 7 (No Dead Code, touched files are this ticket) and `DESIGN.md` rule 11 (no production code only tests use). Candidate C-01.
- Evidence: `git grep resetMemoryHubStagedFileStoreForTests 3a78c3eee` finds only the definition. Nothing in `src` or `tests` calls it. The singleton reads `config.getMemoryDir()` on every call, so tests do not need a reset.
- Required action: delete the function. No other change, and no test change, is needed.

## Follow-ups

- Follow-ups this review added: None

## Classification

- Round 2: none (Pass). Round 1 was `Local Fix` (implementation-owned) for CR-001, now resolved.

## Recommended Recipient

- API/E2E Engineer (`/software_engineering_team/api_e2e_engineer`), per the rule "implementation review passes". The Implementation Engineer gets the informational pass notice.

## Residual Risks

- **AC-003 / QR-002 acceptance (for API/E2E's independent AC-003 run):** cold first-sync source RSS growth with a 2 GiB file was 264 MiB (hub 191 MiB). The literal AC wording is "RSS growth during the transfer stays below 200 MiB". Code review finds no defect or design inadequacy here (C-02). Nothing in the code scales with file size: 4 GiB peaks at about the 2 GiB peak, and a warm 2 GiB transfer adds 84 / 74 MiB. A 30 MiB cold control already adds 116 MiB, which is the fixed first-sync cost of a fresh process. The API/E2E run should record cold and warm figures and state its acceptance against the AC. If the cold figure is held to be binding, that is a requirement/design question for the Solution Designer (the design's escalation trigger), not an implementation Local Fix.
- Rendered card check (browser/desktop, en and zh-CN, long-path wrapping) is still open; jsdom only so far.
- Not run by implementation: full server unit suite end to end, web typecheck gate, `agent-semantic-memory.e2e.test.ts`. The failures reported there (SQLite RangeError, `localStorage` under Node 26) are in files this change does not touch.
- Release order: release before or with `autobyteus-workspace-6`. `generated/graphql.ts` changed, so delivery runs the fresh-start build.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 2, Targeted Delta Review)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.41 average; every category ≥ 9.3 (Cleanup Completeness 9.5)
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: CR-001 is resolved; no open findings. Code reviewed: `077fa6853` (`3a78c3eee` plus the 4-line deletion). Evidence: IMP-01..IMP-05 on `3a78c3eee` still hold, because the deletion removes a function nothing called; IMP-06 on `077fa6853` shows tsc 0 errors and 70 unit tests passing. Carried forward to API/E2E: the Residual Risks above, chiefly the AC-003 acceptance call on the cold RSS figure and the rendered card check.
