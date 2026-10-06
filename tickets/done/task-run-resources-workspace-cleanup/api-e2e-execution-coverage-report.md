# API/E2E Execution Coverage Report — task-run-resources-workspace-cleanup

(`T` = `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup`; `E` = `T/api-e2e-evidence`; `W` = worktree root)

## Execution Round Meta

- Requirements Doc: `T/requirements-doc.md` (SR-008, SD-AP-001)
- Investigation Notes: `T/investigation-notes.md`
- Solution Revision Record: `T/solution-revision-record.md`
- Design Spec: `T/design-spec.md`
- Supplemental Task Artifacts: UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md` (Motion, Accessibility, VIS-001–008); `T/solution-design-handoff.md`; `T/product-design-request.md`; `T/implementation-evidence/org-leave-motion/`
- Design Review Report: `T/design-review-report.md`
- Architecture Review Revision Record: `T/architecture-review-revision-record.md`
- Implementation Handoff: `T/implementation-handoff.md`
- Implementation Revision Record: `T/implementation-revision-record.md` (IR-002)
- Code Review Report: `T/code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `T/code-review-revision-record.md`
- Coverage Investigation: `T/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `T/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `T/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Execution Round: 3 (rounds 1–2 retained below as history)
- Trigger: CRR-002 Pass (implementation `af690af33` + `489268fc7`)
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 3 (HEAD `50b08001d`)

## Routing Classification

- Task size `Large`; architectural risk `High`; input route `Reviewed`.
- Successful-output route: `Code Review`.
- Proportional test-code review: `Required` once a Pass exists. This round is a Fail, so failure-origin review is requested instead.

## Investigation And Execution Basis

- The investigation was written before durable edits and execution: `Yes`.
- The plan was followed: `Yes`.
- Decision revised during execution: three existing durable web probes went from `Still Valid` to `Needs Update`.
  - Their immediate post-collapse absence checks contradict the approved collapse animation.
  - Evidence: first run 3/3 Fail, exactly at those checks.
- Reroute before execution: `No`.

## Test-Case Ledger Reconciliation

- Initialized before execution: `Yes`. Each case was recorded right after it ran: `Yes`. Reconciled: `Yes`. Nothing is in flight.

| Case ID | Final Result | Evidence | Reconciled Result |
| --- | --- | --- | --- |
| REPO-001 contracts | Pass (pre-existing failures unchanged) | `E/REPO-contracts-*.log`, `E/REPO-contracts-collab-BASE-5c74fed71.log` | Collab 13 pass / 7 fail; the same 7 names fail on base `5c74fed71`. Team 7/7. |
| REPO-002 server build | Pass | `E/REPO-server-build.log` | — |
| REPO-003 server suites | Pass (pre-existing) | `E/REPO-server-suites.clean.log` | 1103 pass / 7 fail in 3 files, not in the diff and listed as pre-existing |
| REPO-004 web full | Pass (pre-existing) | `E/REPO-web-full.clean.log` | 3668 pass / 36 fail in 11 files, all in the handoff's pre-existing set |
| C-07 codegen | Pass | `E/C07-codegen.diff`, `E/C07-codegen-output.graphql.ts` | Types identical (see the Codegen section) |
| API-E2E-001a/b/c/d | Pass | `E/API-E2E-001/task-closure-root-visibility.json`, `E/API-E2E-001-final.log`, `E/API-E2E-001-rerun.log` | 3/3 in two consecutive full runs |
| BR-001 Agent live | Pass | `E/browser/journeys/evidence.json`, `agent-*.png` | 3 runs |
| **BR-002 Team live** | **Fail** | `E/BR-002-failure-summary.json`, evidence BR-002, `team-live-*.png` | **4/4 runs: no fade/collapse of the leaving Task A rows.** Every other BR-002 assertion passes. |
| BR-003 Org live | Pass | `org-*.png` | 3 runs |
| BR-004 reduced motion | Pass | `*-reduced-motion-after.png` | — |
| BR-005 reload + restart | Pass | `*-reload.png` | — |
| BR-006 CR-001 last rows | Pass | `agent-last-rows-after.png` | — |
| BR-007 SP-3 Org history | Pass | `org-history-first-render.png` | — |
| REG-001 durable web probes | Pass after update | `E/REG-001/*/evidence.json` | 5/5, 3/3, 7/7 |
| REG-002 Org server E2E | Pass | `E/REG-002-*.log` | 1/1, 1/1 |

## Compatibility / Legacy Scope Check

- Compatibility in upstream scope: `No`.
- Legacy retention or compatibility branch observed: `No`. The new fields are required; the server and web are released together; the codegen types match.
- Persisted data: `Not Affected`. Existing `agent_run_resources.json` closure facts are read directly by the current reader through restart, Task delete and an inactive root (proved in API-E2E-001 and BR-005).
- Compatibility-only durable coverage: `No`.

## Changed Boundary And Evidence Matrix

| Case | REQ / AC | Boundary | Surface | Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| API-E2E-001 | AC-001/002/005 (live, all roles, Task Team), AC-003 ordering, AC-004 (stored after stop, inactive-root DONE, Task delete), AC-006, AC-007, AC-008 (messages kept) | `create_or_update_task` over scoped MCP → Task closure → root scope publish → publisher → projector → WS frame; snapshots; GraphQL stored reads (Agent inspection, Team resume config, Org inspection + history item) | Real Studio HTTP/WS/scoped MCP; scripted AGY CLI | Durable | Pass | `E/API-E2E-001/` |
| C-07 | Interface (Team resume config, Org history item ×2 queries) | Hand-edited `generated/graphql.ts` | Live built server + graphql-codegen | Temporary | Pass | `E/C07-*` |
| BR-001/002/003 | AC-001, 002, 005, 006, 008, 009, 010 | Real backend → web stream services → contexts/stores → tree components → DOM | Built backend + Nuxt dev + headless Chrome | Temporary, Browser | Agent Pass, **Team Fail (AC-010)**, Org Pass | `E/browser/journeys/` |
| BR-004 | AC-010 reduced motion | CSS `prefers-reduced-motion` | Browser (`reducedMotion: reduce`) | Temporary | Pass | same |
| BR-005 | AC-004 reload + restart, AC-010 no flash | Snapshot/stored first render; real backend process restart on the same data | Browser + restarted backend | Temporary | Pass | same |
| BR-006 | AC-009/010 CR-001 | Agent tree last-row leave | Browser | Temporary | Pass | same |
| BR-007 | AC-004 SP-3 | Org history item → rows without context | Browser | Temporary | Pass | same |
| REG-001/002 | Regression | Existing tree probes; Org publication/history | Probes; server E2E | Durable | Pass | `E/REG-*` |

## Additional Repository Coverage Execution

| Order | Command | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/task-closure-root-visibility.e2e.test.ts --no-watch` | Pass 3/3 (×2); ungated = 3 skipped | `E/API-E2E-001-final.log`, `E/API-E2E-001-rerun.log` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-org-runs/scoped-org-history-graphql.e2e.test.ts --no-watch` | Pass 1/1 | `E/REG-002-scoped-org-history.log` |
| 3 | Gated `controlled-org-publication-http.e2e.test.ts` | Pass 1/1 | `E/REG-002-controlled-org-publication.log` |
| 4 | `pnpm -C autobyteus-web test:e2e:nested-team-hierarchy`, `node autobyteus-web/tests/e2e/task-agent-peer-sidebar-probe.mjs`, `pnpm -C autobyteus-web test:e2e:agent-org-task-team-disclosure` (each `--output-dir E/REG-001/<name>`) | First run 3 Fail (stale assertions) → after update Pass | `E/REG-001/` |
| 5 | Strict per-file `tsc` of the new E2E (temporary tsconfig, removed) | Same error classes as the sibling `controlled-org-publication` suite (`TS4111` env/index access, `TS7016` `ws`); repo tests are not strict-checked | `E/API-E2E-001-tsc-file.log` |

## Codegen Confirmation (C-07)

- Method: built server (`dist/app.js`) on a private port and data root, then `graphql-codegen` with the repo's plugins and documents writing to a temp file, diffed with the worktree's `generated/graphql.ts`.
- Result:
  - `closed_task_executions` (`AgentOrgRootHistoryObject`, both Org queries) and `closedTaskExecutions` (`TeamRunResumeConfigPayload`, `GetTeamRunResumeConfig`) are identical, including the operation result types and documents.
  - One hand-added doc comment on `TeamRunResumeConfigPayload.closedTaskExecutions` is not emitted by codegen (the server field has no GraphQL description). It will disappear on the next regeneration. This is cosmetic and not a type difference.
  - Other diff hunks (GitHub skill sources, `skillSourceRegistryError`) are unrelated pre-existing drift.

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Change | Final Evidence | Residual |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 70% | 75% | +5 | Every AC directly proven at real boundaries for all three roots, except AC-010 in the Team root. That one **fails** (4/4), which caps the category. | AC-010 Team fails. AC-003's failing stop is proven only by unit tests (no supported real-use way to fail a real stop). |
| Changed-boundary directness | 70% | 95% | +25 | Real MCP tool → wire frame ordering; real stored reads; real DOM | — |
| Integration realism / mock gap | 60% | 95% | +35 | No doubles between the browser, server, Task service and roots | The external AGY actor is scripted (identified) |
| Env / fixture fidelity | 85% | 92% | +7 | Built backend, private SQLite, real restart on the same data root | Nuxt dev renderer, not the packaged Electron shell (no shell change) |
| Edge / lifecycle | 75% | 92% | +17 | Restart, inactive-root DONE, Task delete, reopen, reduced motion, last-row leave, Org first render | AC-003 real failing stop |
| User surface / browser | 50% | 75% | +25 | Agent and Org motion, fallback, focus, Team tab, reload all correct | **Team-tree leave motion fails** |
| Durable regression quality | 85% | 92% | +7 | New cross-root E2E; probes aligned to the approved collapse motion | No durable regression yet for the Team motion defect (to add with the fix) |

- Overall post-repository confidence: ~71%.
- Overall final confidence: **88%** (simple average of 75, 95, 95, 92, 92, 75, 92 = 88.0%).
- Every critical AC directly proven: `No`. AC-010 fails under the Team root.
- Final categories below 90%: requirement proof (75%) and user surface (75%).
- 95% target met: `No`.
- Confidence-limiting risk: the Team-tree leave motion defect.

## Broader Validation Decision And Execution

- Decision: `Required`, executed as planned.
  - The durable real-boundary server E2E plus a browser full stack: the built backend with the scripted AGY CLI (`ANTIGRAVITY_CLI_COMMAND=<W>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`, `AGY_FAKE_CASE=linked_skills`), Nuxt dev with `BACKEND_*` pointing at it, and headless Chrome (Playwright-core).
- Startup: `E/browser/stack.mjs` runs the same command line and environment keys as `scripts/development/development-runtime.mjs`, on free ports (backend :50706, Nuxt :50707) with a private temp data root. Readiness: `Server listening` + GraphQL 200; Nuxt HTTP 200.
- Restart: SIGUSR2 → SIGTERM the backend process group → start the same entry on the same port and data root. The PID changed (backend start #2).
- Seed: public GraphQL definitions (a Manager with the four Project Task tools, worker, helper, researcher, a Docs Review Team, Team and Org roots), a workspace, Projects/Tasks, and runs.
  - The Manager's work is a real scoped-MCP tool call made by the scripted CLI. Setup messages go through the backend WS input.
  - One DONE per journey is typed into the real composer.

| Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Live closure event (server) | Task A refs (assigned, delegated, broughtIn) published before any stop frame; Task B/non-Task untouched | Exactly the 3 refs; closed index before the first stop frame (Agent 3<4, Team 11<12, Org 12<23); one closure frame | `API-E2E-001/…json` | Pass ×3 roots |
| Snapshot after reconnect | `closed_task_executions` = Task A; tree nodes kept; messages kept | Equal; all nodes kept; ≥2 Task A messages (incl. Manager→worker) identical | same | Pass |
| Files on disk | Closed runs' memory files exist | 5 files per root | same | Pass |
| Reopen + redelegate | New run open; old closed | New run absent from the closed list | same, `*-reopen-redelegate.png` | Pass |
| Stored reads after stop | Agent inspection, Team resume config `closedTaskExecutions`, Org inspection + list item | All equal Task A refs (Org list item = inspection) | same | Pass |
| DONE by another Manager while the host is stopped | Host stored read adds Task B (Team) | Added | same | Pass |
| Task delete | Closure kept; open runs not closed | Kept; non-Task + redelegated runs not listed | same | Pass |
| UI live DONE (Agent, Org) | Rows `aria-hidden` + inert at once, 200 ms fade/collapse, others stay; worker conversation → Manager; run row (Agent) / Manager (Org) selected; focus → run row | Agent 228–230 ms, 9 fade frames; Org 229 ms, 9 frames; all fallback assertions pass; no console errors; tool→leave latency ~310 ms | `agent-live-*.png`, `org-live-*.png` | Pass |
| **UI live DONE (Team)** | Same | Hidden + inert at once, focus → Team run row, Manager selected, others stay. **But opacity 1 → 0 and height 28 → 0 in one frame; no fade/collapse (0 mid frames), 4/4.** | `BR-002-failure-summary.json`, `team-live-*.png` | **Fail** |
| Team tab after DONE | Manager↔closed-worker message listed; no error | Listed in Agent, Team and Org | `*-team-tab-after.png` | Pass |
| Task Team closed via the composer | Team row + members leave with fade; non-Task stays | Pass in all three (9 fade frames) | `*-task-team-closed-via-composer.png` | Pass |
| Reduced motion (Agent, Team) | Removed without fade; focus → run row | 35 ms / 29 ms, 0 fade frames | `*-reduced-motion-after.png` | Pass |
| Last rows (CR-001) | Last rows fade; tree stays until settled, then goes; focus → run row | 234 ms, 9 frames; tree present during leave | `agent-last-rows-after.png` | Pass |
| Reload, and real restart + reload | Closed rows never render (MutationObserver from document start) | 0 of 6 closed IDs, no task-Team row, in 3 roots × 2 | `*-reload.png` | Pass |
| Org history first render (SP-3) | Stopped Org expanded via disclosure without context: no closed rows | 0 of 6; history item `closed_task_executions` = Team B + 3 Task A runs | `org-history-first-render.png` | Pass |

## Desktop Application Validation

- Approach: web-equivalent renderer against the real built backend. No preload, IPC, window or packaging changes are in the diff.
- An isolated desktop instance was not used. Its server environment is stripped, so the scripted AGY actor can't be injected, and a paid model is unnecessary for this boundary. The renderer and CSS are the same.
- Effect on running apps: `None`.

## Platform / Runtime Targets

- macOS (Darwin 25.5), arm64; Node 22.23.1; Nuxt 3 dev; system Google Chrome (headless) via Playwright-core.
- Viewport 1440×1100, `en-US`, light. Reduced-motion context for BR-004.

## Lifecycle / Persisted-Data Checks

- `Not Affected`. Closure is read directly from existing `agent_run_resources.json` across a real backend restart, Task delete and an inactive root.
- No version branch or fallback was observed.

## Durable Coverage Changed In The Codebase

- Changed this round: `Yes`.

| Path | Change | Requirement / Boundary | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` | Added | AC-001–008 at the real server/wire boundary for the Agent, Team and Org roots. Gated `RUN_AGY_FAILURE_E2E=1` + `ANTIGRAVITY_CLI_COMMAND` like the sibling scripted-AGY suites. | Pass 3/3 ×2 |
| `autobyteus-web/tests/e2e/agent-org-task-team-disclosure-probe.mjs` | Updated (`afterLeave` around 6 post-collapse absence checks) | Approved collapse animation (design Risks; CRR-002 accepted residual) | Pass 7/7 |
| `autobyteus-web/tests/e2e/task-agent-peer-sidebar-probe.mjs` | Updated (2 checks) | same | Pass 3/3 |
| `autobyteus-web/tests/e2e/nested-team-hierarchy-probe.mjs` | Updated (2 checks) | same | Pass 5/5 |

- These files are attached for reference. Proportional test-code review is due on the eventual Pass round.

## Other Execution Artifacts

| Artifact | Purpose | Retained |
| --- | --- | --- |
| `E/browser/{stack.mjs, lib.mjs, journeys.mjs}` | Owned real stack + journeys (re-runnable after a fix) | Retained (temporary tooling) |
| `E/browser/journeys/{evidence.json, runs.json, *.png}` | Journey evidence (22 screenshots) | Retained |
| `E/browser/diag-move.mjs`, `diag-move-team.json` | Defect diagnosis | Retained |
| `E/BR-002-failure-summary.json` | Compact failure package | Retained |
| `E/browser/explore*.mjs/png` | UI discovery | Retained |

## Temporary Execution Methods / Scaffolding

| Method | Why | Result | Cleanup |
| --- | --- | --- | --- |
| Owned stack + journeys | Browser proof against a real backend needs a built server, a scripted CLI, Nuxt and Chrome together. This could be promoted to a durable probe after the fix if reviewers want it. | 6/7 cases Pass, BR-002 Fail | Launcher, backend, Nuxt and all Chrome contexts stopped; data root removed; ports free (receipt in `E/browser/stack-state.json`) |
| Temporary codegen output and tsconfig | C-07, type check | Pass | Removed (`/tmp/trrwc-stack-LpfB`, `tsconfig.api-e2e-tmp.json`) |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| External AGY CLI / model | Repository fixture `agy-failure-cli.mjs` (`linked_skills`): calls the actual scoped MCP tools named in `CALL_TOOL:` messages | Deterministic; no paid inference; documented TESTING.md path | Not live model behavior. The tool boundary is real. |

## Result Summary

| Result | Case IDs | Summary |
| --- | --- | --- |
| Pass | REPO-001–004, C-07, API-E2E-001a–d, BR-001, BR-003–BR-007, REG-001, REG-002 | Closure is correct live and stored in all three roots; fallback, focus, messages, reload and restart correct; Agent/Org motion correct |
| **Fail** | **BR-002** | **AC-010 (REQ-002, REQ-005) Team root: leaving rows vanish without the 200 ms fade/collapse when a stale `tree-row-move` is on them (4/4 in the AC-009 journey)** |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| Browser stack (launcher 83014, backends 83015 → 38614, Nuxt 83039) | Owned | SIGTERM process groups | All gone; ports 50706/50707 free; `dataRootRemoved: true` |
| Codegen server data `/tmp/trrwc-stack-LpfB` | Owned | Server killed, dir removed | Removed |
| Vitest E2E data roots | Owned | Fixture `afterAll` | `dataRemoved: true`, `serverClosed: true`, 0 roots |
| Probe Nuxt/Chrome (REG-001) | Probe-owned | Probe finally | Receipts in probe evidence |
| Worktree | — | `git status` | Only the new E2E file, the 3 probe updates and the untracked ticket folder (SDK `dist` was already untracked) |

## Preliminary Classification

**`Local Fix`. Recommended owner: `implementation_engineer`.**

- Where: web tree leave-motion CSS/transition interaction, in `autobyteus-web/components/workspace/history/treeRowLeave.css`, used by `WorkspaceTeamExecutionTree.vue` (and the other two trees).
- Why:
  - `.tree-row-move { transition: transform 200ms ease-out }` is declared after `.tree-row-leave-active { transition: opacity…, max-height…, margin-top… }` with equal (scoped) specificity.
  - A row that carries a not-yet-cleared `tree-row-move` when its leave starts computes `transition-property: transform`. Opacity and max-height then jump to the leave-to values.
- Trigger in real use:
  - Clicking a delegated row in the Team tree shows the inspection/loading line (row 28→50→28 px), which FLIP-moves the rows below.
  - In the Team tree, `tree-row-move` stayed on those rows (no `transitionend`) until DONE, observed 336–425 ms later in the class history.
  - The design or requirements need no change; AC-010 already states the intended behavior.
- Suggested regression evidence for the fix:
  - a CSS/component assertion that a row with both `tree-row-move` and `tree-row-leave-active` still transitions opacity and max-height;
  - a rerun of `E/browser/journeys.mjs BR-002` on the owned stack.
- Failure-origin review by the code reviewer confirms the origin and owner.

## Round 1 Result (superseded by round 3 below)

- Result: **`Fail`**
- Final validation confidence: 88%.
- 95% target met: `No`. Categories below 90%: requirement proof 75%, user surface 75%.
- Broader validation: `Required`, executed.
- Critical AC lacking direct proof or failing: AC-010 under the Agent Team root (failing). AC-003 is proven by unit tests plus the real-boundary ordering of closure before stop.
- Preliminary classification: `Local Fix` → `implementation_engineer` (pending failure-origin review).
- Next recipient (per `get_handoff_rules`): `/code_reviewer` for focused failure-origin review.
- Notes:
  - Accepted residuals unchanged: reduced-motion removal ~2 frames (observed 29–35 ms); collapse animates (durable probes aligned); Team REQ-009 scope; damaged Task file.
  - C-07: types confirmed; one cosmetic doc comment will be dropped by the next codegen.


---

# Round 3 — Authoritative (HEAD `50b08001d`: IR-003 `3570b8c10` + IR-004 `50b08001d`)

## Trigger And Basis

- CRR-004 (IR-003: fix for API-F-001 / CR-002) and CRR-005 (IR-004: SR-009 per-host-root closed index + protocol docs; ARCH-REV-004).
- Round 2 ran on IR-003 and passed, but IR-004 superseded it before handoff. Its evidence is in `E/round2/`.
- Classification: Large / High / Reviewed. The successful route is proportional test-code review.

## Prior Failure Resolution

| Failure | Round-1 Evidence | Resolution | Evidence |
| --- | --- | --- | --- |
| API-F-001 (BR-002, AC-010 Team root) | Leaving rows carried `tree-row-move`; transition `transform` only; no fade, 4/4 | **Resolved by IR-003.** The leave rule now follows the move rule and lists opacity, max-height, margin-top and transform. With `tree-row-move` on every leaving row at leave start: round 2 natural R1 233 ms and R2 225 ms; forced state 213 ms; durable probe round 2 228 ms; round 3 durable probe 211 ms. All have 9 fade frames and the computed transition is `opacity, max-height, margin-top, transform`. | `E/round2/…`, `E/browser/journeys/evidence.json` (BR-002M/R1/R2), `E/round3/task-closure-tree-probe/evidence.json` |

## Executed (Round 3)

| Order | Command | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts prebuild && build` | Pass | `E/round3/REPO-server-build.log` |
| 2 | Server affected suites (same set as round 1) | 1104 pass (+1 IR-004 unit) / 7 pre-existing in the same 3 files | `E/round3/REPO-server-suites.log` |
| 3 | Gated `task-closure-root-visibility.e2e.test.ts` (extended with repeated DONE) | 3/3 Pass; cleanup complete | `E/round3/API-E2E-001*` |
| 4 | `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir <fresh>` (new durable probe, BR-001–BR-007, built IR-004 backend) | 7/7 Pass; cleanup complete | `E/round3/task-closure-tree-probe/` |
| — | Web affected suites (`components/workspace/history`, closure stores/services/utils incl. the IR-003 cascade test) | 32 files / 281 Pass in round 2. IR-004 changes no web source. | `E/round2/REPO-web-affected.log` |
| — | Durable web probes REG-001 | 5/5, 3/3, 7/7 Pass in round 2. Web source unchanged since. | `E/round2/REG-001/` |

## Round 3 Journey / Boundary Results

| Case | AC | Result | Key Evidence |
| --- | --- | --- | --- |
| API-E2E-001 Agent/Team/Org | AC-001–008, SP-1–3, EV-1, IR-004 index | Pass | Live closed event = Task A's 3 refs before the first stop frame (Agent 3<4, Team 11<22, Org 12<23). Snapshot/stored reads exact. **Repeated DONE re-publishes the old 3 + the redelegated run; the snapshot equals the union.** Another Manager's DONE while the host is stopped adds Team B. Task delete keeps 5 closed refs; the non-Task run stays open. Manager↔worker messages kept; files on disk. |
| BR-001 Agent | AC-001/002/006/008/009/010 | Pass | 234 ms, 9 frames; run row selected; focus → run row; Team tab message kept; reopen shows the new run; Task Team via composer fades |
| BR-002 Team | same | **Pass** | Move class present at leave start; 211 ms, 9 frames; Manager selected; focus → Team run row |
| BR-003 Org | same | Pass | 224 ms, 9 frames; Manager selected; the Org tab keeps the message |
| BR-004 | AC-010 reduced motion | Pass | Agent 33 ms, Team 34 ms, 0 fade frames |
| BR-005 | AC-004 reload + real restart | Pass | Backend PID 34552→36880 (the index is rebuilt from disk); 0/6 closed IDs per root ever rendered |
| BR-006 | AC-009/010 CR-001 | Pass | 233 ms, tree mounted until settled, focus → run row |
| BR-007 | AC-004 SP-3 | Pass | Stopped Org expanded before hydration: 0/6 rendered; history item `closed_task_executions` from the index |

## Validation Confidence Scorecard (Round 3)

| Category | Round 1 Final | Round 3 Final | Evidence | Residual |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 75% | 95% | Every AC directly proven at real boundaries under all three roots; API-F-001 resolved | AC-003's failing stop is unit-proven (3 adapters) plus the real ordering of closure before stop; no supported real-use way to fail a real stop |
| Changed-boundary directness | 95% | 96% | The real MCP tool → wire → DOM path, including the IR-004 index through restart | — |
| Integration realism / mock gap | 95% | 95% | No doubles between the browser, server, Task service and roots | External AGY actor scripted (identified) |
| Env / fixture fidelity | 92% | 94% | Built backend, private SQLite, real restart; Nuxt dev renderer | Not the packaged Electron shell (no shell change; same CSS file order) |
| Edge / lifecycle | 92% | 95% | + repeated DONE (re-swap), leave during move (natural and forced), restart rebuilding the index | — |
| User surface / browser | 75% | 96% | All three trees: motion, reduced motion, fallback, focus, Team/Org tab, reload, first render | — |
| Durable regression quality | 92% | 95% | New durable server E2E (3 roots, repeated DONE), new durable real-stack browser probe (7 cases), IR-003 cascade unit test, probes aligned to the approved collapse motion | — |

- Overall final confidence: **95%** (simple average of 95, 96, 95, 94, 95, 96, 95 = 95.1%).
- Every critical AC directly proven: `Yes`. Categories below 90%: `No`. 95% target met: `Yes`.

## Durable Coverage Changed (Cumulative, For Proportional Test-Code Review)

| Path | Change | Requirement / Boundary | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` | Added (round 1); extended with repeated DONE (round 3) | AC-001–008 at the server/wire boundary for three roots. Gated like the sibling scripted-AGY suites (`RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND`). | 3/3 Pass; skips cleanly when not gated |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` + `autobyteus-web/package.json` script `test:e2e:task-closure-tree` | Added (round 2) | BR-001–BR-007: AC-001/002/004/005/006/008/009/010, CR-001, SP-3, through the real built backend + Nuxt + Chrome | 7/7 Pass (rounds 2 and 3) |
| `autobyteus-web/tests/e2e/agent-org-task-team-disclosure-probe.mjs`, `task-agent-peer-sidebar-probe.mjs`, `nested-team-hierarchy-probe.mjs` | Updated (round 1): bounded `afterLeave` (1.5 s) around 10 post-collapse absence checks; expectations unchanged | Approved collapse animation (design Risks; accepted residual) | 7/7, 3/3, 5/5 Pass |

- Prerequisites for the new probe: a current server prebuild + build, installed dependencies, and Chrome. It owns a free-port backend and Nuxt, a private data root and Chrome, and removes them in finally (receipts in `evidence.json` `cleanup`).
- **Docs follow-up for Delivery:** `TESTING.md` has no entry yet for `test:e2e:task-closure-tree` or the gated `task-closure-root-visibility` server E2E. I did not edit `TESTING.md`; that's Delivery's docs sync.

## Temporary Tooling (Retained Evidence)

- `E/browser/{stack.mjs, lib.mjs, journeys.mjs, diag-move.mjs, explore*}`: the round-1/2 tooling and diagnosis. It's superseded by the durable probe and retained as evidence.
- The temporary codegen output and tsconfig were removed.

## Cleanup (Round 3)

- Durable E2E: `dataRemoved: true`, `serverClosed: true`, 0 roots.
- Probe: browser closed; Nuxt and backend process groups terminated; data root removed.
- No owned processes, temp roots or pages remain.
- Worktree: only the test changes above and the ticket folder. The `dist/app.js` process from the `remove-built-in-project-task-manager` worktree is not mine and was not touched.

## Latest Authoritative Result

- Result: **`Pass`**
- Final validation confidence: **95%**; target met; no category below 90%.
- Broader validation: `Required`, executed (real server E2E + real-stack browser across all three roots, with a backend restart).
- Critical AC lacking direct proof: none. AC-003's failing stop is proven by unit tests plus real-boundary ordering, which matches its stated verification intent.
- Prior failure API-F-001: resolved.
- Next recipient (`get_handoff_rules`): `/code_reviewer` for proportional test-code review of the durable paths above.
- Residuals (accepted, unchanged):
  - reduced-motion removal takes ~2 frames;
  - collapse animates;
  - Team REQ-009 scope;
  - damaged Task file;
  - C-07 cosmetic doc comment;
  - Packaged Electron was not run (no shell change).
