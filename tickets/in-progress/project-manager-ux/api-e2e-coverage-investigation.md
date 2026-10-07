# API/E2E Coverage Investigation — `project-manager-ux`

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/requirements-doc.md` (SR-003, Approved)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/design-spec.md` (SR-005)
- Supplemental Task Artifacts:
  - UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/ui-ux-spec.md` and VIS-001..018 (normative);
  - `product-design-request.md` and `product-design-request-r2.md` (context only).
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/code-review-revision-record.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002` (round 2: rerun after IR-002 / CRR-003)
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: CRR-001 Pass on `4d469b0c5` (`/code_reviewer`, 2026-10-07)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1
- **Process note:** the new server E2E (`project-change-feed.e2e.test.ts`) was drafted and first run before this file was written. This file records the plan and decisions behind it; nothing in the suite was removed or changed in place of a finding.

## Routing Classification

- Task size `Large`; architectural risk `High`
- Input route `Reviewed`; successful-output route `Code Review`
- Proportional test-code review: `Required`

## Current Requirement And Design Basis

The Projects pages (list, Project board, Task page, Temp tasks board and page) follow writes live through the per-node `/ws/projects` feed (AC-001..004, 016, 019..021; QR-001/002).
- **Message types:** `connected`, `project_upserted` / `project_removed`, `task_upserted` / `task_removed` with a `project` or `no_project` scope, and `task_worker_status`.
- **Publisher:** follows AR-001 (mark; read after the dispatch; serialized and coalesced; nothing published from `load()`).

Every delegated Task shows its root: the latest `assigned` entry, with the worker's own status (Running, Initializing, Idle, Error, Offline), or "Couldn't start" (AC-005..009).
- **Openable:** only when the root is `started`, not closed, and its host is listed in the left panel (AR-002, REQ-009).
- **Opening a root:** an agent root opens its run's conversation with the root selected; a team root opens its coordinator with the team expanded; Team- and Org-hosted roots open in their own views (AC-010/011).
- **After DONE:** the root is Offline and not openable. After the agent reopens the Task, it stays Offline until the assigner messages the worker; then it is live and openable again (AC-008, AC-023).

Left panel (AC-012, AC-013):
- it keeps its state across pages (preserved behavior);
- every row click opens its conversation from any page (F-006).

Persisted data: optional `recipientAddress` on assignments, `Directly Usable — No Migration`.

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-002..SCN-006.
- Real-use scenarios added:
  - **RU-1:** a Team member configured with a model its runtime does not offer is delegated a Task; its copy fails at preparation (`AGY_MODEL_UNAVAILABLE`). This is a real, reachable "Couldn't start" (AC-007).
  - **RU-2:** two browser windows on the same node watch the same board. Real use: the user has Projects open in one window and the chat in another.
  - **RU-3:** the user deletes the chat that hosts Temp tasks from the left panel: terminate, then "Delete run permanently" (AC-021).
  - **RU-4:** the user opens an Org-hosted root from a Task page loaded fresh, before the Org run has been opened in that window.
  - **RU-5 (real product):** a real model acting as the Project Task Manager, in an isolated desktop build. The user only chats and watches the Projects pages (user preference, 2026-10-07).
- Technically possible but not supported:
  - **Node switching inside one window.** `autobyteus-web/docs/projects.md`: "no supported interactive same-window Projects rebinding/switch". The feed's rebind is unit-tested only; it is not driven here.

## Changed Behavior Summary

| Behavior / Boundary | Change | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-002 live pages | Added | REQ-003, 011, 015 | Wire contract plus browser live journeys |
| BEH-003 root + status + open | Added | REQ-004, 009, 013, 016 | Root views equal snapshots on the wire; browser rendering and opening for all host kinds |
| BEH-004 DONE → Offline | Added (presentation) | REQ-004, 016 | Wire and browser |
| BEH-005 left panel | Fixed (F-006) / Preserved (REQ-007) | REQ-007, 008 | Browser: preservation and every row kind |
| BEH-006 Temp tasks | Added | REQ-011..016 | Wire and browser, including deletion with the chat and reactivation |
| `/ws/projects` route + auth | Added | Design DS-001 | Contract, broadcast, no replay, remote-access parity |
| `recipientAddress` | Persisted-shape addition | Design | Root name on wire and in the UI (new data); old entries are unit-covered |

## Changed Surface And Boundary Classification

| Surface | Affected | Changed Boundary | Repository Evidence | Unexercised Risk | Candidate Mode |
| --- | --- | --- | --- | --- | --- |
| Domain/backend | Yes | Publisher, root builder, lifecycle status forwarding | Unit (publisher, publication, hub, root view, status) | Real write paths through tools; ordering on a real server | Server E2E |
| API/transport/contract | Yes | `/ws/projects`, GraphQL `root`, `tasksWithoutProject` | Unit (hub); web parser spec | Real frames vs strict schema; events vs snapshots; auth | Server E2E |
| Frontend state | Yes | Stores, queue/replay, highlights | Web specs | Integrated live behavior | Browser probe |
| Browser journey | Yes | Board, Task page, Temp tasks, root open, left panel | Implementer probe PMU-001..007 | AC-012, AC-013 (all row kinds), AC-021 via UI, AC-023, rendered Couldn't start, two windows, an unhydrated Org | Extended probe |
| Auth/permissions | Yes | Remote-access policy on the new socket | Shared code | Wire behavior on the new route | Server E2E |
| Desktop renderer | Yes (web-equivalent) | Same renderer | — | Real product with a real model | Isolated desktop instance |
| Desktop shell | No | — | — | — | — |
| Process/lifecycle | Yes | Reconnect after restart | PMU-007 | — | Probe (existing) |
| Persisted data | Yes | `recipientAddress` | Unit round trip | New entries via real delegation | Server E2E (name on root) |
| Distributed | No (per node) | — | — | — | — |
| External | Yes (runtimes) | Live worker status from real providers | — | Running held during a long turn; Error | Desktop journey (real model) |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux` (branch `codex/project-manager-ux`, `4d469b0c5`)
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/TESTING.md`
  - It has no section for the new probe; one is added by this round.
  - It defines the "Project Mutation Regressions", Projects browser probe, task closure and reactivation layers.
- Discrepancies:
  - The browser-automation launcher named in TESTING.md is absent on this machine (`autobyteus_mcps/browser-automation` has no `scripts/`). For the desktop instance I use an attach-only CDP helper on the reported control port.
  - The implementer's probe has no package script; one is added.
- Pre-existing failures (also on base):
  - web `workspaceSelectionComposition.spec.ts` (1);
  - collab contracts `root-execution-view-dtos.test.mjs` `schema_version` (7).
- The user's AutoByteus app is running and is not touched; every layer uses private data roots and free ports.

| Instruction / Config | Purpose | Learned |
| --- | --- | --- |
| `TESTING.md` | Guideline | Server tests → gated `tests/e2e/projects` → browser probes; isolated instance for the real product |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` header | Probe | Needs a current server build and Chrome; owns its stack |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | AC-015 regression | Two real backend nodes; `--skip-server-build` only after a current build |
| `docs/isolated-app-instances.md` | Desktop | `isolated-app start --from-worktree` after `build:electron:mac` |

| Component | Working Dir | Start | Readiness | Stop |
| --- | --- | --- | --- | --- |
| Server build | `autobyteus-server-ts` | `pnpm prebuild && pnpm build` (Pass) | Bootstrap smoke | — |
| In-process Studio server | server | Vitest helper | listen | `app.close()` + rm data |
| Probe stack | web | `node tests/e2e/project-manager-ux-probe.mjs --output-dir <fresh>` | GraphQL + Nuxt | Probe `finally` |
| Desktop instance | root | `build:electron:mac`, then `isolated-app start --from-worktree` | `/rest/health` | `isolated-app stop` |

## Persisted Data Transition Coverage Basis

- Decision: `Directly Usable — No Migration` (optional `recipientAddress` on `assigned` entries).
- Evidence:
  - new entries written by real delegations carry the address, and it reaches the root name (wire + UI);
  - old entries without it are covered by unit reader/writer key-set tests and a mixed file test;
  - no runtime fallback exists.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/projects/project-change-{publisher,publication,hub}.test.ts`, `task-root-view.test.ts`, `tests/unit/agent-collaboration/task-execution-status.test.ts` | AR-001 contract; root view; status over real registries | AC-001..009, P-001/P-002 | Still Valid | 153 files / 1140 pass | Keep |
| Web specs (presentation, feed, store, components, F-006) | Presentation and openable rules; replay; F-006 | AC-002, 009, 013, QR-003 | Still Valid | 114 files: 1 pre-existing failure | Keep |
| `tests/e2e/projects/*` (7 files) | Existing Projects, closure, reactivation, ad hoc | AC-015, AC-023 basis | Still Valid | 31 pass + 1 skipped | Keep |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` PMU-001..007 | Browser journeys | AC-001..005, 008, 010, 011, 016..020, PMU restart | **Needs Update** | Cases collect browser errors but never assert them; no package script; gaps listed below | Assert no browser errors (except restart-time connection refusals in PMU-007); add cases |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` PT-E2E-001..016 | AC-015 preservation | AC-015 | Still Valid (selectors updated by the implementer for the div row) | Implementer 16/16 | Re-run |

## Durable Coverage To Add

| Case ID | Behavior | Requirement / AC | Artifact | Why |
| --- | --- | --- | --- | --- |
| FEED-CONTRACT | `connected` on every connection, no replay, broadcast, remote-access rejection identical to sibling sockets, every frame valid under the strict schema | Design DS-001; reviewer residual | New `autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts` | No wire-level test of the new route |
| FEED-AGENT | Agent tool writes (Project, Task), delegation root (named, hosted, started), worker status running → idle, helper never the root, status move, DONE order (closed then DONE), reopen stays Offline, reactivation live, UI delete, Project delete; events equal GraphQL snapshots | AC-001..006, 008, 023; QR-001; P-001/P-002; DS-003 | same | Real write paths through tools |
| FEED-TEAM | Real start failure → `failed` + reason (RU-1), Task unchanged; re-delegation replaces the root; task Team root folded status; DONE Offline | AC-007, AC-005 (team), AC-008 | same | "Couldn't start" was only unit/component-covered |
| FEED-ORG | Org-hosted root | AC-005 | same | Third host kind |
| FEED-TEMP | Temp task scope: arrive, DONE, reopen to TODO (Offline), reactivation, deletion with the chat | AC-019..021, 023 | same | Temp lifecycle at the wire |
| FEED-VOLUME | 60-Task Project + busy worker: UI write ≤ 2 s; message counts recorded | QR-001; reviewer residual (volume) | same | Measured, not guessed |
| PMU-008 | Left panel kept across Chat ↔ Projects ↔ board ↔ Task page; the run row itself, a Team member row and an Org row each open from a Projects page while selected | AC-012, AC-013 | Probe | Not asserted before |
| PMU-009 | Temp board: DONE → reopen (moved, Offline, not openable) → message (openable again, opens, row back in the left panel); then delete the chat through the left panel (terminate → Delete permanently → confirm): rows leave live, count follows | AC-020, 021, 023 | Probe | AC-021 via the real UI; AC-023 rendered |
| PMU-010 | Rendered "Couldn't start" (red word, reason as tooltip on the board and under the row on the Task page, not openable) from a real start failure; re-delegation replaces it | AC-007 | Probe | Rendered state from real data |
| PMU-011 | Two windows on the same node both follow a write live | RU-2, QR-001 | Probe | Feed fan-out to multiple clients in a real browser |
| PMU-012 | Org-hosted root opened from a freshly loaded Task page before the Org run is hydrated | RU-4; reviewer residual | Probe | Unexercised edge |
| PROBE-SCRIPT | `test:e2e:project-manager-ux` package script; TESTING.md section | Docs | `autobyteus-web/package.json`, `TESTING.md` | Discoverability |

## Durable Coverage To Update

| Existing | Update | Evidence |
| --- | --- | --- |
| PMU probe, all cases | Assert `errors.length === 0`; PMU-007 ignores only `ERR_CONNECTION_REFUSED` during the restart window | Errors were collected but never asserted |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Config | Proves | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts prebuild && build` | — | Build | Pass | `api-e2e-evidence/build.log` |
| 2 | `vitest run tests/unit/{projects,agent-collaboration,agent-tools,agent-team-execution,agent-org-execution,standalone-agent-run-root,services/agent-streaming,agent-communication,api/websocket} tests/architecture` | server | Unit + architecture | Pass 153/1140 | `unit.log` |
| 3 | `pnpm -C autobyteus-web test:nuxt components/projects stores composables/projects components/workspace/history utils/projects services/projects pages/projects middleware --run` | web | Web | 1143 pass / 1 fail (pre-existing `workspaceSelectionComposition`) | `web.log` |
| 4 | `pnpm -C autobyteus-collaboration-stream-contracts test` | — | Contracts incl. the shared fold | 15 pass / 7 pre-existing `schema_version` | `collab.log` |
| 5 | gated `vitest run tests/e2e/projects` | `RUN_AGY_FAILURE_E2E=1`, fake AGY | Existing E2E (AC-015 basis) | Pass 31 + 1 skipped | `e2e-projects-baseline.log` |
| 6 | gated new `project-change-feed.e2e.test.ts` | same + evidence dir | FEED-* | First run: Pass 7/7 | `server-e2e/` |
| 7 | PMU probe baseline (PMU-001..007) | probe | Existing browser | Planned | — |
| 8 | Extended PMU probe (PMU-001..012) | probe | Browser | Planned | — |
| 9 | `projects-feature-probe.mjs` | two nodes | AC-015 | Planned | — |
| 10 | Desktop real-user journey | isolated instance, real model | Real product | Planned | — |

## Test-Case Ledger Decision

- Required: `Yes` (multi-case, long browser/desktop cases). Path: `api-e2e-test-case-ledger.md`.

## Post-Repository Confidence Scorecard

Scored with only the unit/web suites and the implementer's probe.

| Category | Score | Support | Uncertainty | Improve With |
| --- | --- | --- | --- | --- |
| Requirement/AC proof | 70% | Unit + implementer probe cover most ACs | AC-007 (real), 012, 013 (all rows), 021, 023 not proven end to end | FEED-*, PMU-008..012 |
| Boundary directness | 65% | Probe drives the real server | No wire contract test; auth untested | FEED-CONTRACT |
| Integration realism | 70% | Real backend in the probe | No real model | Desktop journey |
| Environment fidelity | 80% | Private stacks | — | — |
| Failure/edge/lifecycle | 60% | Restart reconnect | Start failure, deletion with the chat, reactivation | FEED-TEAM/TEMP, PMU-009/010 |
| User surface | 70% | Implementer probe | Errors not asserted; gaps | Extended probe + desktop |
| Durable regression | 65% | Unit, probe | No server E2E for the feed | New suite |

- Overall 69%. Critical ACs directly proven: No. Below 90%: all categories.

## Broader Validation Decision

- `Required`:
  - Live API: the server E2E;
  - Browser: the extended probe and the Projects feature probe;
  - Real product: an isolated desktop build with a test agent package and a real model, driven through the UI.
- Expected confidence after: ≥ 95%.

## Desktop Application Validation Decision

- Renderer-only change (no shell/IPC). A web-equivalent probe proves the renderer. The desktop journey covers the real product with a real model, per the user's stated preference.
- The running user app is unaffected.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Same-window node switching (feed rebind) | Unsupported per `docs/projects.md` | None for supported use | — |
| Worker `error` status from a real provider | Needs a provider-side failure during a turn; a forced fault would be contrived | Low: status words reuse the left panel's `StatusDot`; the fold and status mapping are unit-covered | — |
| Reduced-motion highlight rendering | CSS-only static tint; component-covered | Low | — |

## Ambiguities Or Reroute Triggers

None so far.

## Investigation Decision

- Proceed: `Yes`. Durable coverage added/updated: `Yes`. Post-repository confidence: 69%. Broader validation: `Required`.
- **Execution outcome:** while preparing the real-product desktop journey, `pnpm -C autobyteus-web build:electron:mac` failed `audit:localization-literals`. Dynamic `t()` keys in `ProjectTaskWorkers.vue:37` and `TempTaskBoard.vue:37` were introduced by `4d469b0c5`. This is F-001 in the execution report.
- Reroute: `Yes`, through failure-origin review (`/code_reviewer`); preliminary `Local Fix` for `/implementation_engineer`.
- Desktop journey: deferred to the rerun on the fixed build.

## Round 2 Update (API-REV-002)

- Trigger: CRR-003 (IR-002 fix of F-001).
- Plan, as stated in round 1:
  1. F-001 recheck (audit, packaged build).
  2. USER-JOURNEY on the fixed build.
  3. PMU full, the feed suite, PT-E2E.
- Decision change: the PMU probe gains a dev-server warm-up. The cold-cache dependency re-optimization reload explains both round 2's first-attempt failures and round 1's O-1; it is not product behavior.
- No requirement/design ambiguity; no reroute.
