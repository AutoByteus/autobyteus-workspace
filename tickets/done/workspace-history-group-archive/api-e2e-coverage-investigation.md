# API/E2E Coverage Investigation — `workspace-history-group-archive`

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/requirements-doc.md` (SR-003)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/design-spec.md` (SR-003)
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (written at round end)
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Implementation Complete IR-001 (commit `9faa6bc75`) from implementation_engineer, direct route
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: per `get_handoff_rules` (expected: Delivery)
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

SR-003 governs (requirements-doc "SR-003 Approved Delta" overrides the SR-002 tables):

- REQ-001 / AC-001 / QR-002: "Archive all" icon button on agent, team and Agent Org group headers; hover/focus revealed; keyboard reachable with aria-label.
- REQ-002 / AC-002 / AC-003 / DEC-001 A: archives every stored, unarchived run of that group **in that workspace**, including standalone runs hidden by the 6-run cap; other workspaces and other agents untouched; run data kept on disk.
- REQ-003 / AC-004: confirmation dialog first; Cancel changes nothing.
- REQ-004 rev / AC-005 rev / AC-008 rev / DEC-003 rev: **all-or-nothing** — any running run (team: also non-READY lifecycle) → short error, no dialog, nothing archived; server re-check for standalone groups covers hidden runs; drafts never block and are never touched. After stopping, Archive all archives the whole group.
- REQ-005 rev / QR-003: one short toast — "Archived N runs." / "Archived N runs. M failed." / "Archive failed. Try again."; blocked "Stop running runs first."
- REQ-006 / QR-001 / AC-007: header disabled while pending; one refresh; open/selected run closed like per-run archive.
- REQ-007 rev: button shown whenever the group has at least one saved run.
- AC-010: a run started between confirmation and execution → agent group: server archives nothing (blocked toast); team/org: per-run guard refuses → counted failed.
- AC-009 / BEH-001: per-run archive/delete unchanged. BEH-003: 6-run listing cap unchanged.
- Design: DS-001 (agent → new GraphQL `archiveStoredAgentRunGroup` → `AgentRunHistoryService.archiveStoredAgentRunGroup` → catalog `archiveRun` per run), DS-002 (team/org → existing per-run mutations via extracted store cores, one refresh), DS-003 (server selection by canonical root + agentDefinitionId, active pre-check).
- Wording note: AC-005 rev quotes a longer blocked message; QR-003 (same delta, user "keep the messages ui clean") and the design specify "Stop running runs first." Validation asserts the QR-003 wording and records the discrepancy as non-blocking (`Unclear`, owner Solution Designer for confirmation).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (agent), SCN-002 (team), SCN-003 (Agent Org).
- Real-use scenarios added from investigation:
  - SCN-001-a: the agent group has >6 stored runs, so some are hidden; the user archives all from the header (real trigger: header click in workspace W).
  - SCN-001-b: the same agent has runs in another workspace W2, and another agent has runs in W — both must stay (real usage: one agent used in several workspaces).
  - SCN-001-c: the client sends a workspace path that differs only by trailing separator / normalization from the stored row paths (rows written by older runs may hold non-canonical roots; server listing canonicalizes them).
  - SCN-001-d: a run of the group is live (running/idle runtime) when the user clicks → blocked before the dialog; after Stop, Archive all succeeds (AC-005 rev).
  - SCN-001-e: a hidden (beyond the cap) live run → only the server sees it → `activeRunIds`, nothing archived.
  - SCN-002/003-d: a team/org run is live → blocked.
  - SCN-001-f: the open/selected run belongs to the archived group → selection cleared (AC-007).
  - SCN-L10N: the user runs the app in zh-CN → dialog and toasts render the zh-CN strings.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none recorded. AC-010 (run starting between confirm and execution) is a narrow real race; it is validated at the server boundary by controlling liveness between the pre-check and the per-run guard, not by a UI race.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| GraphQL `archiveStoredAgentRunGroup` + `AgentRunHistoryService.archiveStoredAgentRunGroup` | Added | design DS-001/DS-003; commit `9faa6bc75` | New server E2E at the GraphQL boundary with real catalog/index/metadata stores |
| Web store `archiveAgentRunGroup` / `archiveTeamRuns` / `archiveAgentOrgRuns`; extracted per-run cores | Added / Changed | design DS-001/002, Removal plan | Store specs (added by implementation) + live journey |
| `useWorkspaceHistoryGroupArchive` composable (block, confirm, toast, org route) | Added | design Ownership Map | Composable spec + live journey |
| Group header buttons (agent, team, org), panel wiring, third modal | Added | design file mapping | Header/panel specs + live journey |
| en / zh-CN strings | Added | QR-003 | Catalog/guard checks + rendered zh-CN check |
| Per-run archive/delete (BEH-001) | Preserved (refactored body) | AC-009 | Existing per-run E2E + store specs stay green |
| 6-run listing cap (BEH-003) | Preserved | REQ-002 | Asserted in new E2E (listing before/after) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Service group selection + all-or-nothing | Server unit (4 new, mocked catalog) | Real catalog/index persistence, canonical root matching with real rows | Server GraphQL E2E (durable) |
| API / transport / contract | Yes | New mutation + result type | Schema builds in existing E2E; no call through it | Wire contract, GraphQL input errors | Server GraphQL E2E (durable) |
| Frontend component / state | Yes | Headers, composable, store | Component/composable/store specs (mocked Apollo) | Real server response shape, real `isActive`/`deleteLifecycle` values | Isolated desktop instance journey |
| Browser integration / user journey | Yes | Click → block/confirm → toast → refresh | Implementation rendered check (stopped runs only) | Live-run blocked path, AC-007 in real app, zh-CN rendering | Isolated desktop instance journey |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same as above | as above | as above | Isolated desktop instance (TESTING.md: full real-product journey) |
| Desktop shell / Electron-specific integration | No | No main/preload/IPC change | — | — | — |
| Process / lifecycle | Yes (read-only) | Liveness of runs read for blocking | Server unit (mocked projection) | A real live runtime's `isActive` projection reaching the header | Live run in the isolated instance |
| Persisted-data transition | No (`Not Affected`) | Only `archivedAt` via existing writers | Existing per-run E2E | — | — |
| Worker / queue / distributed coordination | No | Catalog queue unchanged | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive` (branch `codex/workspace-history-group-archive`, HEAD `9faa6bc75`)
- Project type: pnpm monorepo — `autobyteus-server-ts` (Node/TypeGraphQL/Vitest), `autobyteus-web` (Nuxt 3/Vue/Pinia/Vitest, Electron shell)
- Project testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/TESTING.md` (no closer `TESTING*.md` under `autobyteus-server-ts` or `autobyteus-web`)
- Conflicting / unclear instructions: none for this scope. TESTING rule 9 (fix baseline failures) applies to the 21 pre-existing failures reported by implementation (see Not Tested / Reroute).
- Required secrets: `N/A` — no provider keys needed; a live run is produced with the repository's scripted fake AGY CLI (`autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`), no model call.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, path choice, rules 1–9 | Server file: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; web: `pnpm -C autobyteus-web test:nuxt`; full journeys on an isolated instance of a worktree build; never the user's app/data; stop what you start; assertions first; fix base failures |
| `AGENTS.md`, `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/AGENTS.md` | Package rules | Localization boundary guards; no direct catalog imports in specs |
| `docs/isolated-app-instances.md`, `autobyteus-isolated-app` skill | Isolated instance lifecycle | `pnpm --silent isolated-app start --build` / `--from-worktree`, `list`, `stop <id>`; JSON output with `instanceId`, `controlPort`, `serverPort`, data root |
| `autobyteus-server-ts/src/config/app-config.ts` | Server env | Data-root `.env` is loaded with `dotenv.config` at startup (candidate for `ANTIGRAVITY_CLI_COMMAND` in an isolated data root) |
| `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | Existing archive E2E harness | Real catalog/index/metadata stores in a temp memory dir; mocked AgentRunManager/TeamRunManager liveness; schema via `buildGraphqlSchema` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server Vitest E2E | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts --no-watch` | temp memory dir per test | n/a | test `afterEach` removes temp dir |
| Web Vitest | `autobyteus-web` | `pnpm -C autobyteus-web test:nuxt <paths> --run` | jsdom | n/a | n/a |
| Isolated desktop instance | repo root | `pnpm --silent isolated-app start --build` (or `--from-worktree` if current) | own ports + private data root | `start` JSON + GraphQL reachable | `pnpm --silent isolated-app stop <instanceId>`; `list` shows none |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| >6 stored runs of one agent, other workspace, other agent, pre-archived row, active row | Existing E2E seeding pattern (`AgentRunHistoryIndexStore.writeIndex` + metadata store) | temp dir | removed per test |
| Live standalone / team / org runs in the isolated app | Real app UI/GraphQL with fake AGY CLI runtime; stopped history runs via real stores in the instance's private data root | private data root only | instance stop removes the data root |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Req / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` (2 cases) | Per-run archive of agent/team hides from listing, keeps files; active/unsafe IDs refused | AC-009, BEH-001 | Still Valid | per-run contract unchanged | Keep; extend file with group cases |
| `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-service.test.ts` (4 new) | Selection beyond cap + canonical root + scoping; all-or-nothing; catalog refusal → failed; input validation | REQ-002, REQ-004, AC-010 | Still Valid | mocked catalog | Keep |
| `autobyteus-web/composables/__tests__/useWorkspaceHistoryGroupArchive.spec.ts` (10) | Blocking per kind incl. non-READY team, drafts never block, cancel, toasts, server-reported active, partial failure, escape, org route, pending | REQ-003..007, AC-004..008, QR-003 | Still Valid | — | Keep |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryGroupArchiveHeaders.spec.ts` (6) | Buttons on three headers, unnested, drafts-only hidden, dispatch, disabled while pending | AC-001, REQ-007, QR-002 | Still Valid | — | Keep |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` (+6) | One mutation/one refresh/topology; selection cleanup; skip refresh when active; transport error; team/org loops | QR-001, AC-007, AC-006 | Still Valid | mocked Apollo | Keep |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` (+3) | Panel blocked path, confirm, org route cleanup | AC-005 rev, AC-003 | Still Valid | — | Keep |
| Existing per-run archive/delete web specs (store, panel, section, mutations composable) | Per-run behaviour | AC-009 | Still Valid | green on IR-001 | Re-run |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Req / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-001 | Group archive over GraphQL: 8 stored runs of agent A in W (2 hidden by the 6 cap), input path non-canonical (trailing slash) → all 8 archived; A in W2, agent B in W, pre-archived row untouched; files kept; listing hides group | REQ-002, AC-002, DEC-001, BEH-003, DS-003 | `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | New public mutation; real stores; proves the hidden-run reach and scoping at the wire |
| API-002 | Group with one live run (also hidden-beyond-cap variant) → `activeRunIds`, nothing archived (index byte-identical); after the run stops → whole group archived | REQ-004 rev, AC-005 rev, AC-008 rev | same file | All-or-nothing guarantee at the boundary |
| API-003 | AC-010: run passes the pre-check but the per-run liveness guard refuses (started meanwhile) → reported in `failedRunIds`, others archived | AC-010 | same file | Race contract at the wire |
| API-004 | Empty / blank inputs → GraphQL error, nothing written | design Interface (throws on empty inputs) | same file | Input contract |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-H | `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` (harness) | Build the schema once per file; mocked service getters delegate to the current test's services | Required for any multi-argument resolver (TypeGraphQL appends `@Arg` metadata per build); found while adding API-001..004 | Existing cases keep their assertions (Still Valid) |
| BASE-01..08 | 7 server test files + `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Bring stale fixtures/doubles up to the current approved product contracts | TESTING.md rule 9; causes in the execution report | Assertions keep their intent; no product change |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

See the execution coverage report for actual results. Planned order:

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts --no-watch` | worktree root | API-001..004 + per-run AC-009 | Planned | report |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history tests/integration/run-history tests/e2e/workspaces tests/unit/api/graphql --no-watch` | worktree root | broader server regression | Planned | report |
| 3 | `pnpm -C autobyteus-web test:nuxt stores/__tests__/runHistoryStore.spec.ts composables/__tests__ components/workspace/history/__tests__ --run` | worktree root | web feature + per-run regression | Planned | report |
| 4 | `pnpm -C autobyteus-web test:nuxt --run` | worktree root | full web regression | Planned | report |
| 5 | Web guards: `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `autobyteus-web` | boundary/l10n rules | Planned | report |

## Test-Case Ledger Decision

- Ledger required: `Yes` — several independent cases including a long-running isolated-instance journey with build time and interruption risk.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

Scored after API-001..004 and the repository suites, before the live instance:

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | Server ACs proven at the wire; UI ACs by component/composable/store specs | Live blocked paths, AC-007 and zh-CN not in the real app | Isolated instance journeys |
| Changed-boundary execution directness | 90% | GraphQL schema + real stores; web specs at component boundaries | UI against a real server | Isolated instance |
| Cross-boundary integration realism and mock gap | 75% | Server real stores; web Apollo mocked | Real `isActive` → header → composable chain | Live runs in the instance |
| Environment, configuration, identity, and fixture fidelity | 85% | Temp memory dirs, canonical path variants | Product-created runs/definitions | Seed through the product GraphQL |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | Hidden live, late start, blank input, repeated call | Live stop → archive lifecycle | Terminate then archive in the instance |
| User-surface, browser, and desktop-shell confidence | 70% | Specs plus the implementation's stopped-run rendering | Live-run rendering, zh-CN | Instance in en + zh-CN |
| Durable regression coverage quality and relevance | 88% | 4 mutation-checked wire cases | 21 stale baseline tests in neighbouring suites | Repair the baseline (TESTING rule 9) |

- Overall post-repository confidence: 83% (simple average)
- Every critical acceptance criterion directly proven: `No` (live blocked paths pending)
- Any applicable category below `90%`: `Yes` — requirement proof, integration realism, fixtures, failure/lifecycle, user surface, durable quality
- Default clean-confidence target of `95%` met: `No` → broader validation `Required`
- Final scores after broader validation: see the execution coverage report (95.4%)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (confirmed after repository execution: 83%, below the 95% target)
- Selected execution mode: `Project Desktop Validation` — isolated desktop instance of the worktree build, driven with browser-automation on its control port.
- Specific confidence gap: the live-run blocked paths (agent, team, org) were never rendered with real `isActive` data; AC-007 selection cleanup and zh-CN rendering were only checked with mocks / the catalog.
- Why the selected mode improves confidence: it exercises the real server projection → GraphQL listing → store → header → composable → toast chain with genuinely live runs.
- Browser-specific decision: no Electron-shell change; the renderer journey is the risk. TESTING.md selects an isolated instance for full real-product journeys; it also proves the packaged server includes the new mutation.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron + Nuxt renderer + embedded server.
- Testing guideline used: TESTING.md rules 1–7; `docs/isolated-app-instances.md`.
- Web-equivalent behavior: all changed UI.
- Shell-specific behavior: none changed.
- Chosen approach: isolated instance (own ports/data); never the user's running app.
- Effect on any already-running desktop application: None.
- Behavior not directly proven: real CSS `:hover` reveal (script events cannot trigger it; focus reveal is checked instead).

## Live Environment And Fixture Plan

- Startup: `pnpm --silent isolated-app start --build` from the worktree; record `instanceId`, `controlPort`, `serverPort`, data root.
- Environment: fake AGY CLI via the instance data root `.env` (`ANTIGRAVITY_CLI_COMMAND=<abs path to agy-failure-cli.mjs>`), then `isolated-app restart`. If the runtime is not picked up, fall back to another credential-free way to get a live run, or record the gap.
- Seed: stopped history runs (agent >6, team, org) written into the instance's private memory dir with the real stores, plus a workspace registered through the instance GraphQL; live runs launched through the product (GraphQL/UI).
- Journeys: J-01 agent live → blocked toast, no dialog, nothing archived; stop → Archive all → all archived. J-02 team live → blocked. J-03 org live → blocked. J-04 AC-007 open run of the group → selection cleared. J-05 zh-CN dialog + toasts. J-06 per-run archive still works (AC-009).
- Evidence: DOM/state assertions, GraphQL/index file checks, screenshots under `tickets/.../api-e2e-evidence/`.
- Cleanup: `isolated-app stop <id>` (removes the data root), `list` shows none.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| LIVE-01..06 | Isolated instance + browser-automation scripts; seed script run once against the instance data root | Live blocked paths, AC-007, zh-CN, AC-009 in the real product | Requires an app build and a GUI session; the repository's durable coverage for the same logic is the composable/store/panel specs and the new server E2E. A permanent probe for one sidebar action is out of proportion. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real CSS `:hover` reveal | Script-dispatched events don't trigger `:hover` | Low (same classes as row buttons) | None |
| Team/Org AC-010 UI race | Requires a run starting between confirm and the per-run mutation; per-run guard is the existing tested server guard | Low | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| AC-005 rev quotes "1 run of <group> is still running. Stop it first, then archive all." while QR-003 + design specify "Stop running runs first." | `Unclear` (non-blocking; implementation follows the later QR-003 constraint) | requirements-doc SR-003 delta; design Examples | Solution Designer (confirm wording) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added: `Yes` (API-001..004 and harness fixes) / Updated: `Yes` (TESTING rule 9 baseline fixes in 8 stale test files — see report)
- Post-repository confidence: 83% → final 95.4% after broader validation
- Broader validation decision: `Required` (isolated desktop instance)
- Reroute Required Before Validation Execution: `No`
- Notes: Prepared (server-helper) standalone runs are catalog rows created only by server-side provisioning, never by the web client's drafts; web drafts are `temp-*` local rows that the agent path never sends, and team/org contexts are registered only after the server returns a real run id — so REQ-004's "drafts untouched" holds.
