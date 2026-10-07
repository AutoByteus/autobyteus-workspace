# API/E2E Execution Coverage Report — Project workspace paths

## Execution round meta / classification
- Round **1**, **API-REV-001**, completed 2026-10-07; prior result/confidence **N/A**.
- Trigger `/code_reviewer`, source-review **CRR-001 Pass**; approved requirements **SR-002/AP-001**, design **SR-003**, architecture **ARCH-REV-001 Pass**, implementation **IR-001** unchanged.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path`, branch `codex/project-workspace-path`. Tested production source `9dad89bae`, implementation package through `7b69893c3`; entry HEAD `ed8897135` (review artifacts/receipt beyond implementation only). API stage changed no production source.
- **task_size: Medium; architectural_risk: High; input route: Reviewed; successful-output route: Code Review; proportional test-code review: Required.**
- Product/behavior supplements and Delivery re-entry: **N/A — not applicable**. Historical analysis status does not supersede approval. No test failures inherited or inferred.

### Complete upstream package
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/solution-handoff.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/analysis-result.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/design-review-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/architecture-review-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/implementation-handoff.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/implementation-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/code-review-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/code-review-revision-record.md`

### Canonical validation artifacts
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-coverage-investigation.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-test-case-ledger.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-revision-record.md`

## Investigation and execution basis
Initial investigation and ledger persisted before durable edits or execution. Plan followed: server build → focused owner/API tests → real nodes/startup/feed → affected Project suite and Nuxt tests → mandatory confidence decision → real browser. Independent web unit execution overlapped only an isolated server suite, not a shared build. All builds serialized. Existing tests were reclassified against current approved behavior before obsolete assertions were replaced; no compatibility restoration.

Read root DESIGN/TESTING and root/server/web AGENTS, manifests, runner config, relevant README/run/fixture sources. TESTING's stale real-ID caller prose corrected. Implementation Legacy/Compatibility and Persisted Data Transition sections matched actual source and evidence. MP-001 retained existing migration contracts; MP-002 unsupported ordinary-save-while-gated scenario not tested or scored.

## Ledger reconciliation / boundary matrix
Ledger initialized before execution, group attempts recorded at completion before advancing; browser records each PT-E2E case automatically before the next. Report reconciles every planned group. API-006/API-008 independent overlap explicitly recorded. Last events: browser attempt 2 Pass and cleanup audit. No running/interrupted/unstarted in-scope case. Browser attempt 1 retained and passed; attempt 2 strengthened fresh rejection response proof, not a hidden failure repair.

All paths below are relative to this ticket; `E` means `api-e2e-evidence/api-001/`. Exact full commands and CWD in `E/commands.md`.

| Case | Requirements / boundary | Evidence / actual result | Final |
| --- | --- | --- | --- |
| API-001 | AC-001–006; service/store/native/schema/registry/frozen reader/runner owners | 17 files / 240 tests; `E/owner.log` | Pass |
| API-002 | AC-001/002/003/006; actual native + selected scoped-MCP + HTTP, strict old-ID rejection, errors/canonical atomicity, exact disk/ack, no registry/mkdir and Task/context/resources/history non-interference | 8 tests; `E/http-1.log`, native/MCP same results and expected unselected denial | Pass |
| API-003 | AC-002–006; actual GraphQL schema/resolver/store/registry, aggregate/direct path create/update/unlink, field rejection, order/full-form omission/clear, invalid metadata+list byte atomicity, historical read-no-write and ordinary save | 10 tests; `E/graphql-1.log` | Pass |
| API-004 | AC-002/004/006; two private built HTTP/MCP nodes, equal path accepted locally and UNREGISTERED on B, foreign Project patch rejects, both restart, exact records/registry/source continuity | 1 multi-step case; `E/nodes-1.log` receipt and cleanup | Pass |
| API-005 | AC-004; both actual Studio/Standalone startup entrypoints, frozen four-key output, historical read-no-write/restart, ordinary-save two keys; original retry/conflict/terminal no-op unchanged | 5 cases; `E/startup-1.log` | Pass |
| API-006 | AC-002/005; strict real WS/feed path+description matches GraphQL, scripted agent tool path creation, UI edit/unlink, reconnect/no replay, 4401 auth rejection, preserved Task/root flows | 7 tests; `E/feed-1.log`, `E/feed-receipt/project-change-feed.json` | Pass |
| API-007 | Preserved Project/Task/root/delegation behavior; current input fixtures across affected suites | 8 files / 41 passed / 1 skipped; `E/projects-all-1.log`. Focused suites included again, totals not additive | Pass for deterministic scope |
| API-008 | AC-005/006; component/store/draft/row/router mapping owners | 15 files / 119; `E/web-1.log` | Pass |
| API-009 | AC-002/003/005/006; actual Projects forms/router/requests/GraphQL/disk/edit/unlink/reload/backend restart | 16/16 each browser run, zero page errors; final `E/browser-2/result.json` + screenshots/logs | Pass |
| Live-Claude worker-memory test | Unchanged real provider behavior | Gated skipped, not counted as evidence | Not Tested |

Broad deterministic suite includes ad-hoc tasks and all Agent/Team/Org closure/reactivation regressions without paid inference. No repository-wide/full external-provider suite claimed. Setup: prebuild, production build + sanitized built bootstrap, Nuxt prepare and probe syntax all passed (logs/receipt). No additional repository tests after the post-repository confidence decision; only browser probe and final diff audit.

## Validation confidence scorecard
Scope is approved SCN-001–004 and required existing startup/preservation contracts, not contrived MP-002 or unchanged packaging/provider products. Simple average; scores are evidence judgments, not probability of zero defects.

| Mandatory category | Post-repository | Final | Evidence / residual |
| --- | ---: | ---: | --- |
| Requirement and AC proof | 90% | 95% | Browser closes remaining AC-005/006 proof; API/disk/startup prove other criteria |
| Changed-boundary execution directness | 95% | 95% | Actual shared tool, HTTP, GraphQL, file, WS and rendered client paths; no changed owner mocked |
| Cross-boundary realism/mock gap | 95% | 95% | Real local nodes and renderer; actor/session/LLM scripted, not live inference; transport failure injected intentionally |
| Environment/config/identity/fixture fidelity | 95% | 95% | Disposable Prisma/data/HOME/ports and faithful old supersets; one host OS, no exact customer dataset |
| Failure/edge/lifecycle/recovery | 95% | 95% | Invalid/duplicate/old-key atomicity, no-write read, both startup/retry paths, current backend restarts/reconnect; no packaged upgrade claim |
| User-surface/browser/desktop shell | 75% | 95% | Direct picker/manual/special-character targeted edit/unlink/reload; shell unchanged and not certified; screenshots supplement DOM/API assertions |
| Durable regression relevance/quality | 95% | 95% | Existing cases retained/adapted; current-only keys and historical fields intentionally distinguished; final fresh-response browser refinement rerun |

Post-repository **91.43% = 640/7**; final **95.00% = 665/7**, +3.57 percentage points. Every critical AC directly proven: **Yes**. Applicable category below 90%: **No**. Default ≥95% target met: **Yes**. Remaining limitations below are explicitly outside this changed web/API scope, not silently counted as covered.

## Broader validation decision and execution
**Required → completed, Browser + actual built local backend**, per TESTING's web-equivalent choice. No deviation to an installed app/default profile. Both current dist nodes start only after serialized build; test fixture uses private HOME/data/SQLite, free ports, health endpoints, own Nuxt server and new headless Chrome context. No credentials imported and no model sent. Startup argv and IDs in durable probe and raw node/frontend logs.

| Journey | Observed direct proof | Evidence |
| --- | --- | --- |
| PT-E2E-003 picker/manual | Picker passes root, manual shares same draft; unmatched manual value clears on switching to picker; exact path+description-only saved entries, registered/unregistered view, no browser createWorkspace and byte-identical registry, nonexistent folder remains absent | final JSON links/disk/manualPath; assertions in durable probe |
| Special characters + unavailable links | Spaces/#/?/雪/backslash retained on macOS; router workspacePath roundtrips and correct description focused; edit persists, unlink remains absent on reload, re-add works; after actual unregistration link remains editable; original source sentinel unchanged | PT-E2E-003; screenshot visually inspected |
| PT-E2E-004 rejection and transport failure | Fresh GraphQL WORKSPACE_PATH_INVALID and WORKSPACE_ALREADY_LINKED receipts; combined metadata/list patch leaves exact bytes; exactly one injected 503, no registration or folder creation; prior Project unchanged | final JSON `rejections` and `rejectedSaves: 1` |
| PT-E2E-010 restart | Same owned backend data profile restart preserves links/Tasks/context bytes; renderer reload reads persisted state | result.json + backend logs |
| Preserved UI | All 16 core journeys pass (Tasks/context/Refresh/counts/cancel/deletion/node isolation/localization); zero browser page errors | final result JSON, DOM-backed assertions, screenshots |

Optional `--voice-input` cases not run (no voice changes). Task forms/layout ran at 1512×862 and 390×844 in en/zh-CN; workspace special-character journey was desktop-width, not a comprehensive responsive/accessibility audit. macOS Darwin arm64, Node 22.23.1, pnpm 10.28.2, Vitest 4.0.18, Chrome 154.0.8037.98; browser context en-US/Europe-Berlin with test-owned locale preference toggles.

## Desktop / lifecycle / persisted-data boundaries
Electron wrapper's renderer changes are web-equivalent. No preload/main/IPC changed, so this validates browser/client/server behavior, **not packaged Electron/full-product or installed upgrade**. Actual Studio and standalone server entrypoints/restarts were executed, not simulated with singleton resets alone. Built-node test uses two isolated node processes on the same host, not proof of physical cross-machine filesystem access.

Approved transition **Directly Usable — No Migration**: faithful four-key per-folder links and existing released-array conversion outputs retain path/description under the one current reader; reads/startup/restart leave their bytes unchanged; ordinary Project Save emits two keys. Existing `20261005_projects_per_folder_v1` classification, output, conflicts/warnings, retained originals, retry and terminal skip stay intact. Historical fixtures never rewritten. Task file/context/assignment/resource/history sentinels preserved. No new migration/version/compatibility branch observed. Installed user volume/profile, mixed-version client/writer interoperability and downgrade are not promised.

## Durable coverage changed
Only test/validation-doc paths changed; no production edits or removed files. All extant paths below attached for proportional test review.

| Worktree-relative path | Change / requirement |
| --- | --- |
| autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts | Updated ID fixtures to paths; added direct absent path/native parity/exact ack+disk, malformed/old-key and canonical alias rejection; retained all Task/auth/collision/preservation cases |
| autobyteus-server-ts/tests/e2e/projects/project-mutation-node-locality.e2e.test.ts | Replaced obsolete remote-registration rejection with equal-path local reference acceptance, availability isolation, foreign Project rejection and two-node restart |
| autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts | Updated direct path API, new aggregate/atomicity/exact-save case, current/historical projection and ordinary save; historical releasedRow retains four keys |
| autobyteus-server-ts/tests/e2e/projects/projects-startup-migration.e2e.test.ts | Existing tests unchanged in purpose; explicit frozen-output/current-read checks; two per-folder startup/restart/no-rewrite cases; private HOME |
| autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts | Current strict fields; actual tool-authored missing path, UI path edit/unlink and disconnect/snapshot/reconnect coverage; existing Task/root suite retained |
| autobyteus-web/tests/e2e/projects-feature-probe.mjs | Path inputs/options/row targeting, shared draft, special characters, exact disk/registry/no registration, fresh error response/503 receipts, owned HOME and port cleanup verification |
| TESTING.md | Current caller path/no-registration contract and browser coverage instructions; commands preserved |

No obsolete assertions retained only for compatibility. Removed assertions (old ID selectors, per-link time, registration prerequisite/on-save side effects) replaced under REQ-001/002/006, not deleted to hide failures. Global workspace registration remains ID-based and separately exercised; frozen migration fields remain historical.

## Other evidence / cleanup
Evidence root contains raw build/owner/API/web/browser logs, exact command index, build-and-source-receipt.json, browser result JSON/screenshots, feed receipt and cleanup.json. Retained, not temporary production scaffolding. No temporary-only probe introduced. Initial local Python edit command had a syntax typo before writes, corrected before any test execution; no failed validation attempt is hidden. Attempt 1 browser Pass preserved; stronger attempt 2 also Pass.

| Resource | Ownership / cleanup | Result |
| --- | --- | --- |
| Built two-node fixture | Own private HOME/data/SQLite/children, SIGTERM, assert listeners closed and roots gone | Pass, nodes log |
| HTTP/migration/feed suites | Own fixture data/server/sockets/runtime, suite teardown; no customer data | Pass; no owned runtime process remains |
| Browser/Nuxt/backend A+B | Fresh browser closed, exact owned process groups stopped, all 3 ports successfully rebound, private root absent; both attempts | Pass, browser receipts |
| SDK dist outputs | Absent on entry; produced by API prebuild; removed after all runs, never committed | Pass, cleanup.json; **rerun normal prebuild/build before built-process checks** |
| Ignored node_modules/build/Nuxt caches | Local prerequisites retained; no live processes | Intentional |
| Historical raw logs | Source-only diff check clean; logs retained verbatim even if whitespace would fail unrestricted cumulative diff | Not rewritten |

## Dependencies emulated / not tested
- HTTP tools use real scoped session authority with scripted session acquisition; native direct execution is actual tool code, not an autonomous model conversation.
- Gated AGY suite uses unchanged executable fake CLI with real provider transport/MCP/HTTP/WS/storage. No inference/paid model proof.
- Resolver-only GraphQL test supplies empty run-manager catalogs for unchanged global workspace removal guard; services/store/registry/schema are real. Full server checks separately cover lifecycle.
- Browser 503 is injected at GraphQL; it proves client failure handling, not a reproduced backend outage cause.
- Not Tested: production frontend bundle, packaged/full-product desktop and released-app upgrade, Windows/Linux execution, physical remote machine, exact customer dataset, complete a11y audit, optional voice, live providers and explicit user verification. Delivery owns applicable final/user gates. None is represented as Pass.

## Latest authoritative result
**Pass — API-REV-001**, final confidence **95.00%**. All critical approved criteria directly proven; no category below90%; broader validation Required and completed. Findings/failure-origin classification: **None / N/A**. No Requirement Gap/Design Impact/local implementation defect; no source change requested. **Request proportional test-code review**, not a duplicate source review. Medium/High preserved. No merge, push, release or final user-verification claim. Rule lookup selected **/code_reviewer**: Pass + architectural_risk=High + durable test changes. Single primary handoff only; no duplicate Delivery/Solution forwarding. Dispatch confirmation is the send tool receipt.

### Handoff source boundary
Durable test/doc delta is committed separately from these evidence artifacts; see the test commit recorded in the handoff message. Compare against `ed8897135` for this API round. Raw previous implementation/review logs were not modified. Reviewer must rebuild cleaned SDK/server outputs before any built-process rerun.
