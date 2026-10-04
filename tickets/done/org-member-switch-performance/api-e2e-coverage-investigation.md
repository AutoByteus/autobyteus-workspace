# API/E2E Coverage Investigation

Ticket folder (TF): `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/`

## Investigation Meta

- Requirements Doc: `TF/requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `TF/investigation-notes.md`
- Solution Revision Record: `TF/solution-revision-record.md`
- Design Spec (required on every route): `TF/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts: `TF/probes/` (`measure.mjs`, `measure-spike.mjs`, `impl-visual-check.mjs`, `reference-projection-bench.mjs`), `TF/evidence/` (baseline + `impl-IR-001-*`), `TF/handoff-result.md`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `TF/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `TF/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `TF/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (in progress)
- API/E2E Test-Case Ledger: `TF/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Implementation Complete IR-001 (commit `88bd41620`), direct route
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

The approved package (SR-003) requires that a member switch with the Org tab open does no work proportional to the focused member's total reference count (REQ-001/005). Reference rows must be bounded: a count on every message, rows only under the selected message, first 20, then "Show all N files" (REQ-002/003, DEC-001 Option A). Every reference must stay reachable and must open the same content through the unchanged `sha256hex(messageId\0path)` server contract (REQ-004). Live arrivals must not re-derive identities or re-render reference rows of the history (REQ-006). The behavior applies to Org, Team and standalone roots (REQ-007), and existing message semantics are preserved (REQ-008). Targets: QR-001 ≤ 200 ms per switch, QR-002 ≤ 50 reference rows after a switch, QR-003 ≤ 300 ms for Show all of 3,136. The design implements this with a memoized `referenceId` getter, a single `listMessages()` in the Section, and a bounded Panel render. It adds no caches, stores, `markRaw` or virtualization.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (member switch, Org tab), SCN-002 (browse messages/files), SCN-003 (open reference), SCN-004 (live message arrival), SCN-005 (Team / standalone).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1 Live arrival while "Show all" is expanded on the selected message. Trigger: a stream communication event while the user is browsing an expanded list. The design keeps Show all across same-message updates, so the arrival re-patches all visible rows of that message. Its cost must still meet QR-001 (AC-007).
  - SCN-A2 Live arrival while a reference beyond the first 20 is open in the viewer. Trigger: a stream event. `selectedReference` looks up the reference by ID in the fresh rows, hashing up to its index within the selected message only.
  - SCN-A3 Switching to a member whose newest message is shared with the previous member keeps the selection (handoff "Important Assumptions"). Show all collapses on the member change (approved reset rule).
  - SCN-A4 Missing or unreadable reference file shows the viewer's existing error state (AC-004 alternate). Trigger: clicking a reference whose file no longer exists.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 member switch cost | Changed | REQ-001/005, AC-001/003 | Real-scale timing (harness) + hashing/projection call counts at Org root |
| BEH-002 other-tab switching | Preserved | AC-006 | Files-tab control harness |
| BEH-003 bounded reference list (Option A) | Changed | REQ-002/003/008, AC-002/004/005/006 | Component tests + rendered DOM counts |
| BEH-004 reference open via on-demand ID | Changed (timing only) | REQ-004, AC-004 | Server-hash equality + real REST content match, first and last of 3,136 |
| BEH-005 live arrival | Changed | REQ-006, AC-007 | Real `AgentOrgExecutionContext.applyEvent` path: durable + real-scale browser |
| BEH-006 Team / standalone | Changed | REQ-007, AC-008 | Team-shaped component tests + real Team run (11,315 refs) in browser |
| Server reference-content contract | Preserved | External Contracts | Real server REST resolution of client-derived IDs |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No (consumer of unchanged REST contract) | Client derives IDs on demand | Projection spec: Node `createHash` equality | Real server resolution of the lazily derived ID | Browser against real server (REST content) |
| Frontend component / state | Yes | Section/Panel/projection | Panel/Overview/projection specs (Team-shaped view, counting getters) | Org-root real context + real projection at ≥ 40k scale; live `applyEvent` path | New durable integration spec |
| Browser integration / user journey | Yes | Rendered Messages panel | None (jsdom) | Real layout/paint cost, DOM scale, Show all timing | Production build + headless Chrome harness |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer bundle | — | Electron renderer timing (UNK-002) | Isolated desktop instance |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance` (branch `codex/org-member-switch-performance`, commit `88bd41620`)
- Project type and runtime stack: pnpm monorepo; Nuxt 3 / Vue 3 renderer (`autobyteus-web`), Electron shell, Node server (`autobyteus-server-ts`), Vitest.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/TESTING.md` (no closer `TESTING*.md` under `autobyteus-web`)
- Conflicting, missing, or unclear project instructions: None conflicting. TESTING.md prescribes "Web unit tests + a browser dev-path probe" for renderer changes and an isolated desktop instance for full desktop journeys. The snapshot harness (production build + isolated installed-server backend on snapshot data) is the package's established acceptance harness. It follows the same rules: no user app or data, owned processes.
- Required environment variables or secrets available: `N/A` (no model calls; snapshot `.env` holds no secrets)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Workspace testing guideline | `pnpm -C autobyteus-web test:nuxt <paths> --run`; renderer → web unit + browser probe; desktop → isolated instance (`pnpm --silent isolated-app start --build/--from-worktree`, `stop <id>`); never touch user app/data; assertions first |
| `autobyteus-web/AGENTS.md` | Web dev guide | Always pass `--run`; never `git add .` |
| `docs/isolated-app-instances.md` | Isolated desktop instance | `--data-root <owned dir>` (never deleted); `--from-worktree` uses `autobyteus-web/electron-dist`; CDP on `controlPort`; `stop` ends own process group |
| `TF/implementation-handoff.md` Environment notes | Snapshot backend/frontend commands | Explicit `DATABASE_URL`; `env -i` isolation; ports 29811/29812 |
| `autobyteus-web/package.json` | Scripts | `build:electron:mac`, `audit:localization-literals`, `guard:localization-boundary` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Isolated backend (installed v1.4.94-beta.2 server, snapshot copy) | `/Applications/AutoByteus.app/Contents/Resources/server` | `env -i … DATABASE_URL=file:<owned copy>/db/production.db … AutoByteus dist/app.js --data-dir <owned copy> --port 29811` | Uses an API/E2E-owned copy of the snapshot (`/tmp/omsp-api-e2e/data`) so the investigator's snapshot is untouched | Log shows `Datasource … <owned copy>`; `/rest/health` | Kill the owned PID |
| Production frontend of `88bd41620` | `autobyteus-web` | `nuxt build` with `BACKEND_*` → 29811; `python3 -m http.server 29812` on `dist/public` | Static | HTTP 200 | Kill the owned PID |
| Isolated desktop instance (worktree build) | repo root | `pnpm build:electron:mac`; `pnpm --silent isolated-app start --from-worktree --data-root <owned root>` | Own ports, own data root | `start` JSON | `pnpm --silent isolated-app stop <id>` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Org run with 41,965 refs for code reviewer; 3,136-ref message | Investigator snapshot `/tmp/org-switch-repro/data`, copied to `/tmp/omsp-api-e2e/data` | No user data paths touched; no secrets | Copy removed after the run |
| Large Team run (320 messages, 11,315 refs) | Same snapshot (`software_engineering_team_e4b7ee1b…`) | Same | Same |
| Live arrival event | Real `AgentOrgExecutionContext.applyEvent` with a synthetic `communication` event (stream transport not exercised; no live model run is available) | In-page only; no persistence | Page closed |
| Durable test fixtures | Synthetic Org view built like `rootExecutionViewState.spec.ts` | In-memory | N/A |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`. Reference IDs are derived, never stored. The proof is that existing persisted Org messages (snapshot) open their references through the unchanged server route.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/collaboration/__tests__/CollaborationMessagesPanel.spec.ts` | Order/labels, unknown focus, select-then-open reference, count on every row, 20 preview + Show all, Show-all reset matrix and keep on same-message update, identity reads bounded (Team-shaped, counting getters), identity disclosure | REQ-002/003/004/008, AC-002/004/006/008 | Still Valid | Matches DEC-001 Option A and design reset rule | Keep |
| `.../__tests__/CollaborationOverviewPanel.spec.ts` | Section computes `listMessages` once per view; passes rows | REQ-005, AC-003 | Still Valid | Design Change Sequence 5 | Keep |
| `autobyteus-web/services/agentOrgExecution/__tests__/agentOrgReferenceProjection.spec.ts` | ID equals Node SHA-256; no hash before read; one hash across reads; frozen | REQ-004/005, AC-003 | Still Valid | Server contract | Keep |
| `.../__tests__/CollaborationMessageReferenceViewer.spec.ts` | Viewer fetch/error states | AC-004 alternate | Still Valid (unchanged) | Unchanged component | Run |
| `services/agentOrgExecution/__tests__/*`, `services/rootExecution/__tests__/rootExecutionViewState.spec.ts`, `services/agentCollaboration/__tests__/*` | Org/standalone context + communication event application | BEH-005 preservation | Still Valid | Unchanged | Run |
| `components/mobile/MobileTeamMessages` tests | Mobile panel | DEC-003 | Out Of Scope | Mobile excluded | None |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| DUR-001 | Org root, real `AgentOrgExecutionContext` + real projection + real crypto-js (spied), ≥ 40k references: mount and member switch hash ≤ 20 IDs and project once | AC-003, REQ-005, DS-001 | `autobyteus-web/components/workspace/collaboration/__tests__/CollaborationMessagesOrgRoot.integration.spec.ts` | Existing tests use Team-shaped data with substitute getters; nothing exercises the Org root where the hashing actually lives at the AC-003 scale |
| DUR-002 | Live `communication` event via `applyEvent`: new message appears, header increments, selection kept, one projection, identity derivation bounded to visible rows; Show all kept for same message | AC-007, REQ-006, DS-003 | same file | The live path (UNK-001) has no durable coverage through the real context |
| DUR-003 | Reveal + open last reference of a 3,000-reference Org message: content path uses the server hash for that path | AC-004, REQ-004, DS-002 | same file | Protects the on-demand ID on the real Org path end to end in the client |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-web test:nuxt components/workspace/collaboration services/agentOrgExecution/__tests__/agentOrgReferenceProjection.spec.ts --run` | worktree root | Changed specs | Planned | — |
| 2 | New DUR-001..003 spec | same | Org root + live path | Planned | — |
| 3 | `pnpm -C autobyteus-web test:nuxt components/workspace/collaboration services/agentOrgExecution services/agentCollaboration services/rootExecution components/layout --run` | same | Broader affected suites | Planned | — |
| 4 | `pnpm -C autobyteus-web audit:localization-literals` / `guard:localization-boundary` | same | Localization | Planned | — |

## Test-Case Ledger Decision

- Ledger required: `Yes`. Execution has multiple independent cases, long-running builds, and live services (interruption risk).
- Canonical ledger path: `TF/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

Repository results: R-001 Pass (28 tests), DUR-001..003 Pass with verified mutation sensitivity, R-002 Pass (211 tests; 2 pre-existing base failures confirmed unrelated), R-003 Pass.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | AC-003 proven directly (Org root, 42k refs, real hash counted). AC-007 counts proven. AC-002/004/006/008 proven structurally in jsdom | AC-001/005 (timing) unproven; AC-004 server content not proven; QR-001 for live arrival unmeasured | Real-scale browser harness against the real server |
| Changed-boundary execution directness | 80% | Real context, projection, crypto-js and Section/Panel | jsdom has no layout or paint; the cost was half layout/DOM | Production build in Chrome |
| Cross-boundary integration realism and mock gap | 70% | Client hash equals Node SHA-256 | Real server REST resolution of lazily derived IDs not exercised | REST content fetch through the UI |
| Environment, configuration, identity, and fixture fidelity | 70% | Synthetic Org shaped like production | Real snapshot data shape (3,136-ref message, real Team run) not used | Snapshot data |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | Reset matrix, same-message keep, member-switch collapse, no-file messages | Missing-file viewer error with real server not exercised | Browser case E-004 |
| User-surface, browser, and desktop-shell confidence | 50% | None beyond jsdom | Rendering, zh-CN, Electron (UNK-002) | E-001..E-008 |
| Durable regression coverage quality and relevance | 95% | Mutation-verified Org-root spec plus updated Panel/Overview/projection specs | Timing is not durable (machine-dependent) | — |

- Overall post-repository confidence: 74% (simple average)
- Every critical acceptance criterion directly proven: `No` (AC-001, AC-004 content, AC-005, AC-007 timing)
- Any applicable category below `90%`: `Yes`: all except durable coverage
- Default clean-confidence target met: `No`
- Material residual risks: real timing/DOM scale, real server reference resolution, Electron renderer ratio

## Broader Validation Decision (Mandatory)

- Decision: `Required`. Timing, DOM scale and real server reference resolution cannot be proven in jsdom.
- Selected execution mode: `Browser` (production build + isolated real server on snapshot data) and `Project Desktop Validation` (isolated desktop instance for UNK-002).

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron
- Web-equivalent behavior: the entire change (renderer only)
- Shell-specific or lifecycle behavior: none changed. Only the renderer timing ratio (ASM-002/UNK-002) is in question.
- Chosen validation approach: isolated desktop instance of the worktree build, using an owned copy of the snapshot as `--data-root`, driven over CDP.
- Effect on any already-running desktop application: None (own ports, data root and process group).

## Live Environment And Fixture Plan

Recorded in the execution report after the run.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| E-001..E-009 | `TF/probes/api-e2e-*.mjs` against production build + isolated snapshot server / isolated desktop instance | AC-001/002/004/005/006/007/008 at real scale; UNK-002 | Depends on a 10 MB private snapshot of user org data and machine-specific timing; not suitable for the repository |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| WebSocket transport delivering a real live communication event | No live model run is available in an isolated environment; the event is applied at `applyEvent`, which the streaming service calls directly (`agentOrgStreamingService.ts:329`) | Low: transport unchanged | None |

## Ambiguities Or Reroute Triggers

None at this point.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added DUR-001..003; executed, mutation-verified)
- Post-repository confidence: 74%
- Broader validation decision: `Required`; executed (see execution report; final confidence 95%)
- Reroute Required Before Validation Execution: `No`
- Notes: Decisions revised during execution are recorded in the execution report (Investigation And Execution Basis): E-004 selection setup, E-005 refetch reclassified as pre-existing OBS-001 after a base comparison, E-006 Team index restoration (OBS-003), Team timing recorded as OBS-002.
