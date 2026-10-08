# API/E2E Execution Coverage Report — `workspace-history-group-archive`

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/requirements-doc.md` (SR-003)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/design-spec.md` (SR-003)
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: Implementation Complete IR-001 (commit `9faa6bc75`), direct route
- Prior Round Reviewed: None
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: per `get_handoff_rules` (Delivery)
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Additions:
  - The live journey used an AGY runtime with the repository's scripted fake CLI. Runs become live on creation, and no CLI process was ever spawned, so no model calls were made.
  - A per-run archive of an open run was added as the AC-007 comparison baseline.
  - TESTING.md rule 9 baseline fixes were added (see Durable Coverage).
- Existing coverage decisions revised during execution:
  - The archive E2E harness needed two fixes before the new cases could run:
    - Build the GraphQL schema once per file. TypeGraphQL appends `@Arg` metadata on every `buildSchema`, so from the second build in one process, multi-argument resolvers receive shifted arguments. Verified with a metadata dump: `params` grew from `[1,0]` to `[1,0,1,0]`.
    - Let the mocked service getters delegate to the current test's services. TypeGraphQL keeps one resolver instance, and resolvers capture services in field initializers.
  - Test-only artifact, no product defect: production builds the schema once, and the live product run maps both arguments correctly.
  - Side effect: the existing "rejects active and unsafe archive IDs" case previously ran against the first test's (deleted) service; it now exercises the current one.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes` (live cases recorded in batches at checkpoints during the single instance session)
- Long-running case checkpoints recorded when needed: `Yes`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: REPO-03 rerun reconciliation
- Cases still running, interrupted, or not started: none

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| API-001 | Pass | seq 1 | `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | — |
| API-002 | Pass | seq 1 | same | — |
| API-003 | Pass | seq 1 | same | — |
| API-004 | Pass | seq 1 | same | — |
| REPO-01 | Pass | seq 2 / REPO-03 | `api-e2e-evidence/repo-01-server-broader*.log` | 343/343 after baseline fixes |
| REPO-02 | Pass | seq 3 / REPO-03 | `api-e2e-evidence/repo-02-web-full*.log`, `guard-*.log` | see Additional Repository Coverage |
| LIVE-01 | Pass | seq 5–7 | `live-01a…`, `live-01b…`, `live-04b…` | — |
| LIVE-02 | Pass | seq 6, 9 | `live-02b-team-archived.png` | — |
| LIVE-03 | Pass | seq 6, 10 | `live-03-org-blocked.png`, `live-03b-org-archived-route-left.png` | — |
| LIVE-04 | Pass | seq 7–8 | `live-04a…`, `live-04b…`, `live-06…` | Matches per-run archive; pre-existing open-run behaviour recorded as an observation |
| LIVE-05 | Pass | seq 11 | `live-05a-zh-blocked.png`, `live-05b-zh-archived.png` | — |
| LIVE-06 | Pass | seq 8 | `live-06-per-run-archive-open-run.png` | — |

## Compatibility / Legacy Scope Check

- Requirements/design introduce or tolerate backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed: `Yes` (`Not Affected`; only existing writers set `archivedAt`, confirmed on disk for agent, team and Org index rows)
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Req / AC | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| API-001 | REQ-002, AC-002, DEC-001, BEH-003 | GraphQL `archiveStoredAgentRunGroup` → service → catalog/index store | Server GraphQL E2E, real stores in temp memory dir | Durable | Pass | It archives 8 stored runs, including 2 hidden by the 6 cap. The input root has a trailing slash; one stored row has a trailing slash. Untouched: the same agent in another workspace, another agent (incl. an active run), a pre-archived row (`archivedAt` unchanged). Files kept; listing hides the group; a repeated call is a no-op |
| API-002 | REQ-004 rev, AC-005 rev, AC-008 rev | Server all-or-nothing | same | Durable | Pass | With a visible and a hidden live run: `activeRunIds` lists both and the index file is byte-identical. With only the hidden one live: still refused. After both stop: all 8 archived |
| API-003 | AC-010 | Pre-check vs per-run guard | same | Durable | Pass | A run that becomes live after the pre-check → `failedRunIds: [it]`, 7 archived, the run stays listed |
| API-004 | design interface | Input contract | same | Durable | Pass | 4 blank-input variants → GraphQL error "workspaceRootPath and agentDefinitionId are required.", no file or index change |
| LIVE-01 | REQ-004 rev, AC-005 rev, AC-008 rev, AC-002 | Real server projection → listing → store → header → composable → toast | Isolated desktop instance (worktree build) | Desktop | Pass | Live run beyond the cap → dialog → confirm → "Stop running runs first.", index SHA unchanged. Visible live run (Keeper) → toast, no dialog. After stop → "Archived 9 runs.", 9/9 `archivedAt`, run dirs kept |
| LIVE-02 | AC-005 rev (team), AC-003 | Team header | same | Desktop | Pass | Live → blocked, no dialog. After stop → "Bridge Team · 2 runs will be hidden from history." → "Archived 2 runs.", 2/2 archived |
| LIVE-03 | AC-005 rev (Org), AC-003 | Org header + route cleanup | same | Desktop | Pass | Live → blocked. After stop, with the Org run open → "Archived 2 runs.", route back to `#/workspace`, 2/2 archived |
| LIVE-04 | AC-007, REQ-006 | Open run of the group | same | Desktop | Pass (per AC-007's "like per-run archive") | Open-run end state is identical to a per-run archive of an open run (LIVE-06) — see Observations |
| LIVE-05 | QR-003 zh-CN | Localized strings | same | Desktop | Pass | "全部归档"; "请先停止正在运行的运行。"; "全部归档？" / "Keeper Agent — 所有运行将从历史记录中隐藏。"; "已归档 1 个运行。" |
| LIVE-06 | AC-009, BEH-001 | Per-run archive | same | Desktop | Pass | "Run archived.", stopped run archived, live run untouched |
| — | AC-001, QR-002 | Header buttons | Isolated instance DOM | Desktop | Pass | All 4 headers carry `title`/`aria-label` "Archive all runs" (zh: "全部归档"). Keyboard focus reveal was checked in the implementation run; component specs cover the rest |
| — | AC-004 | Cancel | Isolated instance | Desktop | Pass | Cancel closed the dialog; index unchanged |
| — | AC-006, QR-001, REQ-006 pending | Partial failure toast, single refresh, pending/disabled | Web specs (composable/store/header) | Durable (existing) | Pass | Not reproducible live without fault injection; covered by `useWorkspaceHistoryGroupArchive.spec.ts`, `runHistoryStore.spec.ts`, `WorkspaceHistoryGroupArchiveHeaders.spec.ts` and the server AC-010 case |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts --no-watch` | worktree root | API-001..004 + existing per-run cases | Pass (6/6) | console |
| 1a | Mutation checks: all-or-nothing disabled; input canonicalization removed | temporary source edits, restored (`git diff -- src` empty) | The new cases detect regressions | API-002 fails / API-001 fails as expected | console |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history tests/integration/run-history tests/e2e/workspaces tests/unit/api/graphql --no-watch` | worktree root | Server regression | Before baseline fixes: 328 pass / 11 fail (the pre-existing 11). After: **343/343 pass** | `api-e2e-evidence/repo-01-server-broader.log`, `repo-01-server-broader-after-baseline-fixes.log` |
| 3 | `pnpm -C autobyteus-web test:nuxt --run` | worktree root | Web regression (incl. 10 composable, 6 header, +6 store, +3 panel specs; per-run specs) | Before: 3950 pass / 10 fail (pre-existing `TokenUsageMeterPanel`). After: **3960 pass / 0 fail** (3 skipped, 585 files) | `repo-02-web-full.log`, `repo-02-web-full-after-baseline-fixes.log` |
| 4 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `autobyteus-web` | Boundary / l10n rules | Pass | `guard-*.log` |
| 5 | `tsc --noEmit` (server `tsconfig.json`, web `tsconfig.json`) filtered to changed test files | worktree | Types of changed tests | No errors (server TS6059 and web TS2307 noise are environment-wide and pre-existing) | console |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | +11 | Every AC is proven at a real boundary: AC-002/003/005/008/010 at the server wire with real stores, and AC-001/003/004/005/007/009 plus zh-CN in the real desktop app with genuinely live runs | AC-005's quoted long wording vs the QR-003 short wording (non-blocking, `Unclear`) |
| Changed-boundary execution directness | 90% | 97% | +7 | The new mutation runs through the GraphQL schema with real catalog/index/metadata stores. UI runs through the packaged worktree build against its embedded server | Run liveness in the server E2E comes from a mocked `AgentRunManager` (the live app covers the real projection) |
| Cross-boundary integration realism and mock gap | 75% | 95% | +20 | The live instance proves the real projection `isActive` → listing → header pre-check → server re-check → toast chain, and the team/Org per-run mutations through extracted cores | AC-010 timing race exercised only at the server boundary |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | +10 | Real definitions and runs created through the product GraphQL in a private data root; real stop via terminate mutations; canonical path variants | Fake AGY CLI instead of a real provider (irrelevant to archive; no message turns) |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 94% | +9 | Hidden live run, visible live run, run starting after the check, blank inputs, repeated call, Cancel, Org route cleanup, open run | Partial-failure toast and pending state only in specs (needs fault injection to show live) |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | +25 | Rendered in en and zh-CN on the real desktop app; DOM/state assertions plus server/index checks | Real CSS `:hover` reveal not scriptable (focus reveal checked by implementation) |
| Durable regression coverage quality and relevance | 88% | 96% | +8 | 4 new wire-level cases that fail on regressions (mutation-checked); harness hardened; 21 stale baseline tests repaired | — |

- Overall post-repository confidence: 83%
- Overall final confidence: **95.4%**
- Calculation method: simple average of the seven applicable categories (96+97+95+95+94+95+96)/7
- Confidence change produced by broader validation: +12 points. It mainly closed the live-run, UI-realism and zh-CN gaps.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the partial-failure toast and pending state are shown only through specs; the AC-010 race is shown at the server boundary only.

## Broader Validation Decision And Execution

- Decision and mode: `Required` — Project Desktop Validation (isolated instance of the worktree build, browser-automation on its control port), per TESTING.md "full real-product journey".
- Deviation: none. One addition: a per-run archive of an open run as the AC-007 comparison baseline.
- Gap addressed: the live-run blocked paths for all three kinds, AC-007 in the real app, zh-CN rendering, and the packaged server carrying the new mutation.
- Startup:
  - `pnpm --silent isolated-app start --from-worktree` (build 06:49 postdates the last source edit 06:42; source unchanged since `9faa6bc75`) → `iso-55378-bafd`, server port 55379, control port 55378.
  - Appended `ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` and `AGY_FAKE_ARGV_LOG` to the instance's private `server-data/.env`, then `isolated-app restart`. App config loads that `.env` into `process.env` before the runtime modules are imported (`src/app.ts`).
- Environment choices: the real `agy` exists on PATH; the fake was configured, and no AGY process ever spawned (no argv log; no messages sent). So no provider calls or credentials were involved.
- Seed: `api-e2e-evidence/live-seed.mjs` → `live-seed.json`, all through the instance's GraphQL:
  - a workspace `/tmp/wsga-live-5Au2/project`;
  - agent definitions "Archive Group Agent" and "Keeper Agent", a team member, team "Bridge Team" and Org "Delivery Org";
  - Archive Group Agent: 1 live run (oldest) + 8 stopped runs;
  - Keeper: 1 stopped + 1 live; Bridge Team: 1 stopped + 1 live; Delivery Org: 1 stopped + 1 live.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Agent group with a live run beyond the 6 cap → Archive all | Client cannot see it (shown as a `local` row); the server re-check refuses (REQ-004 rev) | Dialog opened; Cancel → nothing. Confirm → "Stop running runs first."; index SHA `ca0d4f98…` unchanged; group still (7) | `live-01a`, `live-01b`, store dump | Pass |
| Agent / team / Org group with a visible live run → Archive all | Blocked toast, no dialog | All three: toast seen, no dialog | `live-03-org-blocked.png` | Pass |
| Stop agent live run; open a group run; Archive all → confirm | All 9 archived; open run handled like per-run archive | "Archived 9 runs."; header gone; 9/9 `archivedAt`, dirs kept. Route stays on the archived run and the route-bound view re-hydrates it (`local` row) | `live-04a`, `live-04b`, `live-index-after-agent-archives.json` | Pass |
| Per-run archive of an open stopped run (Keeper) | "Run archived."; live sibling untouched | Same; identical open-run end state to the group case | `live-06` | Pass |
| Stop team live run → Archive all → confirm | Counted dialog, "Archived 2 runs." | as expected; team index 2/2 archived | `live-02b` | Pass |
| Stop Org live run; open Org run route → Archive all → confirm | Toast; route leaves the archived Org | "Archived 2 runs."; `#/workspace?rootSubjectKind=agent_org&…orgRunId=…` → `#/workspace`; Org index 2/2 archived | `live-03b` | Pass |
| Settings → Language → 简体中文; Keeper live → click; stop → click → confirm | zh-CN label, blocked toast, dialog, success toast | "全部归档"; "请先停止正在运行的运行。"; "全部归档？" / "Keeper Agent — 所有运行将从历史记录中隐藏。"; "已归档 1 个运行。"; server listing empty | `live-05a`, `live-05b` | Pass |

## Desktop Application Validation

- Approach: isolated desktop instance of the worktree build; no deviation.
- Web-equivalent behavior: all changed UI, proven in the packaged renderer against its embedded server.
- Shell-specific behavior: none changed.
- Effect on any already-running desktop application: `None` (own ports and data root; the user's app and `~/.autobyteus` were not touched).
- Not directly proven: real CSS `:hover` reveal (not scriptable). Confidence consequence: negligible, since it uses the same classes as the row buttons and focus reveal was verified.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64), host locale de_DE
- Electron packaged build from `autobyteus-web/electron-dist/mac-arm64` (worktree, HEAD `9faa6bc75`); Node 22 / pnpm 10 for Vitest
- App locales exercised: en, zh-CN; window 1200×768 (instance default)

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data: rows with non-canonical (trailing-slash) workspace roots and pre-archived rows (API-001)
- Result: the normal readers and writers are unchanged; only `archivedAt` is set; run folders are kept (server E2E and live index/dir checks)
- Version-specific runtime branch or fallback observed: `No`
- Residual persisted-data risk: none identified

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed this round: `Yes`

| Path / Test | Change | Requirement / Boundary, Or Obsolete Assertion And Upstream Evidence | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | Updated (+4 cases, harness) | API-001..004 (REQ-002/004/AC-002/005/008/010). Harness: schema built once; resolver services delegate to the current test | 6/6 pass; regression-checked by source mutations |
| `autobyteus-server-ts/tests/unit/api/graphql/converters/workspace-converter.test.ts` | Updated (baseline fix) | Converter now maps `workspace.metadata`; the fixture used the pre-metadata shape. Rewritten against real `FileSystemWorkspace`/`TempWorkspace` | Pass |
| `autobyteus-server-ts/tests/unit/api/graphql/types/projects.test.ts` | Updated (baseline fix) | `ProjectView` gained `taskCount`; links became path-only (`9dad89bae` removed `workspaceId`/`addedAt` from the GraphQL link) | Pass |
| `autobyteus-server-ts/tests/unit/api/graphql/studio-application-api-services.test.ts` | Updated (baseline fix) | Registration now requires the Org definition, Org run, definition admission and collaboration-root history services; test set completed and getters asserted | Pass |
| `autobyteus-server-ts/tests/unit/api/graphql/types/memory-view-member-resolver.test.ts` | Updated (baseline fix) | Readiness admission requires the communication authority files; the fixture packages lacked them (diagnostic `ROOT_RUN_PACKAGE_MANIFEST_INVALID`) | Pass |
| `autobyteus-server-ts/tests/integration/run-history/memory-layout-and-projection.integration.test.ts` | Updated (baseline fix) | The manager double exposed the removed `prepareNewAgentRun`; the lifecycle calls `beginActivation({kind:"new"}).prepare()` | Pass |
| `autobyteus-server-ts/tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts` | Updated (baseline fix) | Since `a0a1073cb` (segment lifecycle admission), the accumulator receives content only after `SEGMENT_START`; the test fed reasoning content without a start. (The implementation handoff's "`beginActivation`" diagnosis does not apply to this file.) | Pass |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Updated (baseline fix) | `AgentRunManager` is now process-initialized (no lazy instance); the removal test now provides empty process managers, as its sibling test already does | Pass |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Updated (baseline fix) | The panel formats with the host default locale; the spec now pins the default number locale to en-US so its English assertions do not depend on the host (de_DE rendered `0,0020 $`) | 14/14 pass |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route); attached for delivery reference.
- Removed paths: none.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/live-*.png` | Screenshots | Retained | Supporting only; assertions are DOM/state/index checks |
| `api-e2e-evidence/live-seed.mjs`, `live-seed.json` | Seed script and its output IDs | Retained (evidence of data creation) | Targets only a `127.0.0.1` GraphQL URL |
| `api-e2e-evidence/click-group-archive.js`, `blocked-check.js`, `archive-group-confirm.js` | browser-automation scripts | Retained (reproducibility) | — |
| `api-e2e-evidence/live-index-after-agent-archives.json` | Server index snapshot | Retained | — |
| `api-e2e-evidence/repo-*.log`, `guard-*.log` | Suite logs | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Isolated instance `iso-55378-bafd` | Real-product journeys | LIVE-01..06 | Stopped; data root removed (`dataRootRemoved: true`); `isolated-app list` → none |
| Data-root `.env` entries for the fake AGY CLI | Credential-free live runs | No CLI spawned | Removed with the data root |
| `/tmp/wsga-live-5Au2/project` workspace folder | Workspace root for runs | — | Deleted |
| `api-e2e-evidence/b.sh` (browser launcher wrapper) | Attach-only control of the owned instance | — | Deleted |
| Temporary source mutations / debug prints in the E2E file | Regression detection; harness diagnosis | — | Reverted (`git diff -- src` empty) |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| `AgentRunManager` / `AgentTeamRunManager` liveness (server E2E only) | `vi.mock` harness (existing pattern) | Deterministic live/stopped states and the AC-010 race | Covered live in the desktop instance |
| AGY provider CLI (live instance) | Repository fake `agy-failure-cli.mjs` | No provider calls needed; runs are live on creation | None for archive behavior |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | API-001..004, REPO-01..03, LIVE-01..06 | All acceptance criteria proven; no regressions; 21 pre-existing baseline failures repaired (test-side) |
| Not Tested (live) | AC-006 partial-failure toast, REQ-006 pending/disabled state, AC-010 UI race | Need fault injection or sub-second timing; covered by composable/store/header specs and server API-003 |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instance `iso-55378-bafd` + private data root | Owned | `pnpm --silent isolated-app stop iso-55378-bafd` | Stopped, data root removed |
| `/tmp/wsga-live-5Au2` | Owned | `rm -rf` | Removed |
| Server E2E temp memory dirs | Test-owned | `afterEach` removal | Removed |

## Observations (non-blocking)

1. **Wording (`Unclear`, Solution Designer):** AC-005 rev quotes "1 run of <group> is still running. Stop it first, then archive all."; QR-003 (same delta, the user's "keep the messages ui clean") and the design specify "Stop running runs first." The implementation follows QR-003, and validation asserted that.
2. **Hidden live run as a `local` row (pre-existing projection):**
   - A live standalone run beyond the 6-run cap appears in the sidebar as a `local` row titled "New - <agent>" with `isActive:false`.
   - So the header pre-check cannot see it, and the dialog opens before the server refuses.
   - This matches REQ-004 rev ("server check for standalone groups covers runs beyond the 6 shown") and the design.
   - UX nuance only: the user sees a dialog, then the blocked toast. Possible follow-up for the sidebar projection, which predates this ticket.
3. **Open archived run stays open (pre-existing, shared with per-run archive):**
   - After archiving the run that is open on `#/chat?id=<runId>`, the route stays and the route-bound view re-hydrates the run as a `local` row. The row also persists after a reload (both the group-archived and the per-run-archived run).
   - The group archive matches per-run archive exactly, so AC-007 ("like per-run archive") holds.
   - Separate-ticket candidate: navigating away from an archived open standalone run, as already done for Org routes.
4. **Product question (TESTING rule 9 report):** token-usage numbers and costs are formatted with the host OS locale (`Intl.NumberFormat(undefined, …)`), not the app's selected language. On a de_DE host with the app in English the UI shows `0,0020 $`. Owner: Solution Designer / product. The spec is now deterministic either way.

## Preliminary Classification

Not applicable (result `Pass`).

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95.4%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` → executed (isolated desktop instance), passed
- Critical acceptance criteria lacking direct proof: none
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: Delivery (per rules)
- Notes:
  - Commits on `codex/workspace-history-group-archive`: `85d2ec346` (group-archive E2E coverage) and `dc70e7f44` (baseline fix, test-only).
  - Ticket artifacts stay uncommitted, like the upstream package.
  - Final suites: server affected suites 343/343; web full 3960/3960 (3 skipped); guards pass.
