# API/E2E Coverage Investigation

`<T>` = `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership`

## Investigation Meta

- Requirements Doc: `<T>/requirements-doc.md` (SR-002, Approved: Option 2, split)
- Investigation Notes: `<T>/investigation-notes.md`
- Solution Revision Record: `<T>/solution-revision-record.md`
- Design Spec (required on every route): `<T>/design-spec.md`
- Supplemental Task Artifacts: None
- Design Review Report: `<T>/design-review-report.md` (ARCH-REV-001, Pass)
- Architecture Review Revision Record: `<T>/architecture-review-revision-record.md`
- Implementation Handoff: `<T>/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `<T>/implementation-revision-record.md`
- Code Review Report: `<T>/code-review-report.md` (CRR-001, Pass 9.4/10)
- Code Review Revision Record: `<T>/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `<T>/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- API/E2E Test-Case Ledger: `<T>/api-e2e-test-case-ledger.md`
- Current Investigation Round: 2
- Trigger: CRR-003 Pass after SR-002 (ARCH-REV-002, IR-002; no source change since `061d4698b`)
- Prior Investigation Reviewed: Round 1
- Latest Authoritative Investigation: Round 2

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required` (on an eventual Pass). This round ends in `Fail`, so the request is for failure-origin review.

## Current Requirement And Design Basis

For an active run (standalone or Team member), every artifact the run records must be listable (GraphQL `getRunFileChanges`, REQ-002) and previewable (REST `/runs/:runId/file-change-content`, REQ-001), whenever it was recorded and without a restart (QR-001). Inactive-run reads and `file_changes.json` stay unchanged (REQ-003). The 409 (pending/streaming) and 404 (no entry or missing file) semantics are kept (REQ-004). AC-006 requires a live check in which an agent generates two or more images in one turn and every image previews in the Artifacts tab. ASM-001 says the frontend needs no change once the server is correct, and AC-006 is its validation plan. The design binds the supervisor's `RunFileChangeService` as the one process authority, caches only attached runs and resolves the authority per request (DS-001..DS-003). Persisted data: `Not Affected`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (preview each artifact while the agent works), SCN-002 (reopen or reload the run and see the full list), SCN-003 (historical run).
- Real-use scenarios added from the implemented behavior:
  - RU-001: a run that already has `file_changes.json` is restored and generates more images (restore re-attaches the authority). Trigger: `restoreAgentRun`, then a new turn.
  - RU-002: a streaming entry completes, so 409 becomes 200 on the next preview. Trigger: `FILE_CHANGE` streaming, then available.
  - RU-003: a server close followed by a new supervisor in the same process. Trigger: host/test lifecycle (covered by the unit ownership test).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001: active-run preview | Changed (fixed) | REQ-001; DS-002 | Real-server E2E with an entry recorded after the first read; integration REST |
| BEH-002: active-run list | Changed (fixed) | REQ-002; DS-002 | Real-server GraphQL after every image; integration GraphQL |
| BEH-003: inactive-run reads | Preserved | REQ-003; DS-003 | Real terminated standalone and Team-member reads; existing integration |
| BEH-004: writer persistence | Preserved | REQ-003; DS-001 | Real recorder path in the E2E; existing writer tests |
| Process authority binding (CTR-001) | Changed | Design Interface Mapping | Unit ownership test; real Studio composition in the E2E |
| Frontend Artifacts tab (ASM-001) | Preserved (no frontend change) | ASM-001 / AC-006 | Browser journey on a real stack |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `RunFileChangeService` attached-only cache | unit service tests | none material | — |
| API / transport / contract | Yes (behavior; shape unchanged) | GraphQL/REST read through the bound authority | integration (mock run), new real-server E2E | none after E2E | — |
| Frontend component / state | No code change | Viewer + run-file-change store | web viewer specs | whether UI shows every row live and after reopen (ASM-001) | Browser |
| Browser integration / user journey | Yes (AC-006) | Artifacts tab | none in repo | AC-006 and ASM-001 | Browser on a test-owned stack |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (same renderer) | Artifacts tab | — | as browser | Browser (web-equivalent) |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | supervisor bind/release, attach/detach | unit ownership test; E2E terminate/restore | none material | — |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | Minor | per-run event queue in the owner | unit REC-001 test | concurrent read vs. in-flight `handle()` (pre-existing property) | repeated E2E at worst-case timing |
| External integration | Emulated | AGY CLI | fake AGY CLI fixture | real model and real `agy` binary | not needed: the change is server-internal |

## Project Execution Discovery

- Assigned task worktree: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership` (branch `codex/run-file-change-live-projection-ownership`, commit `061d4698b`)
- Project type and runtime stack: pnpm monorepo; Node 22.23.3; Fastify/GraphQL server (`autobyteus-server-ts`, Vitest); Nuxt web (`autobyteus-web`)
- Project testing guideline paths: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/TESTING.md`; `autobyteus-server-ts/AGENTS.md` (server testing notes). No closer `TESTING*.md`.
- Conflicting, missing, or unclear project instructions: `pnpm` is not on PATH. I used the shim `/tmp/pnpm-shim` (→ `corepack pnpm`) per the implementation handoff. `autobyteus-web` needed `nuxt prepare` before `test:nuxt`, as TESTING.md notes for other probes.
- Required environment variables or secrets available: `N/A`. No provider credentials are needed because the AGY CLI is emulated.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers | Layer map | Server: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`. AGY fake CLI: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs` |
| `TESTING.md` § Choosing the path / Rules | Surface selection, safety | Backend change → server tests and API journeys. Client–server behavior in a browser → browser dev-path probe. Never touch the user's running app or data. Stop what you start |
| `autobyteus-web/tests/e2e/github-skill-sources-probe.mjs` | Pattern for a test-owned stack | Built backend `dist/app.js --data-dir`, private SQLite via `prisma migrate deploy`, `nuxt dev` with `BACKEND_NODE_BASE_URL` |
| `tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts` | Existing real-server AGY image journey | Temp HOME set before modules load; plant step `output.txt` + image; `image_done` fake case |
| implementation-handoff § Environment | Setup | `corepack pnpm install`, `pnpm prepare:shared`, `prisma generate`; shim |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Studio server (E2E) | `autobyteus-server-ts` | in-test `startStudioE2eRuntimeServer()` | temp HOME/app-data per suite | GraphQL calls succeed | `app.close()`, rm temp HOME (afterAll) |
| Fake AGY CLI | spawned by server | `ANTIGRAVITY_CLI_COMMAND` + `AGY_FAKE_*` env | gated multi-image turn | stream events | ends with run/turn; gates force completion on failure |
| Built backend (browser) | `autobyteus-server-ts` | `prebuild`, `build`, then `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <owned>` | owned SQLite/HOME/data | `/rest/health` | launcher SIGTERM → process-group kill, rm owned dir |
| Nuxt dev (browser) | `autobyteus-web` | `pnpm exec nuxt dev --port <free>` with `BACKEND_NODE_BASE_URL` | free port | `GET /` 200 | same launcher |
| Browser | — | AutoByteus browser tools (`open_tab`, `run_script`, `screenshot`) | headless | DOM | `close_tab` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| AGY brain step outputs and images | Test plants `<brain>/<conv>/.system_generated/steps/<n>/output.txt` and `image_<n>_1.png` | Under a temp HOME only; never `~/.gemini` | Removed with the temp HOME |
| Agent/Team definitions and runs | Public GraphQL mutations | Test-owned app data only | Terminated/deleted in afterAll; the owned dir is removed |
| User's running server `:8000` and `/home/autobyteus/data` | — | Not used, not stopped | Untouched |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/services/run-file-changes/run-file-change-service.test.ts` | attached vs. unattached cache, detach, REC-001, binding | DS-001/DS-002, CTR-001 | Still Valid | 8/8 pass | Keep |
| `tests/unit/run-history/services/run-file-change-projection-service.test.ts` | AC-001 Team member, AC-002/AC-003 standalone with a real bound authority | AC-001..AC-003 | Still Valid | pass | Keep |
| `tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts` | bound = wired instance; release on close/rollback; new supervisor after close | CTR-001, RU-003 | Still Valid | 7/7 pass | Keep |
| `tests/integration/api/run-file-changes-api.integration.test.ts`, "serves every artifact … after an earlier read" | REST/GraphQL regression; 409 streaming; 404 unknown | AC-002, AC-003, AC-005 | Needs Update | it lacked the completing half of RU-002 (409 then 200) | Updated (I-001) |
| same file, "hydrates historical AutoByteus team-member file changes" | historical Team-member list/content | AC-004 | Out Of Scope (pre-existing failure) | Fails identically on base. Real-server E-004 proves historical Team-member reads work, so the seeded fixture is probably stale | Not changed; reported as residual |
| same file, other historical/legacy/404/409 cases | inactive path, REQ-004 | AC-004, AC-005 | Still Valid | pass | Keep |
| `tests/unit/api/rest/*` | REST route semantics | REQ-004 | Still Valid | pass | Keep |
| `tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts` | one AGY image → one previewable entry | BEH-001 (single image only) | Still Valid | 4/4 pass with the fixture change | Keep |
| `tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` | fake CLI modes coexist | fixture integrity | Still Valid | 14/14 pass | Keep |
| `tests/architecture/*` | composition boundaries | CTR-001 dependency rules | Still Valid | 44/44 pass | Keep |
| `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | viewer URL, 404 → deleted, 409 → pending, media blob | ASM-001 (mocked) | Still Valid | 19/19 pass | Keep |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E-001 | Standalone AGY run, three images in one turn. The user opens and lists each image before the next is generated | REQ-001, REQ-002, AC-002, AC-003, AC-006 (server boundary), SCN-001/SCN-002 | `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts` | Only coverage through the real Studio composition (real supervisor binding, real recorder, real AGY step-output conversion). It reproduces the user's defect on base |
| E-002 | Same journey for a Team member over the team WebSocket | REQ-001, REQ-002, AC-001, AC-006 | same file | The user's reported case was a Team member |
| E-003 | Standalone: terminate → historical reads → restore → new two-image turn | REQ-003, AC-004, RU-001 | same file | Re-activation re-attaches a run with existing `file_changes.json` |
| E-004 | Team member historical reads after `terminateAgentTeamRun` | REQ-003, AC-004 | same file | Real data for the inactive Team-member path |
| fixture | Fake AGY CLI: `AGY_FAKE_IMAGE_STEPS` (several images per turn) and `AGY_FAKE_IMAGE_GATE` (wait before image n) | Supports E-001..E-004 | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Needed to model the user's order of events: image 1 is read before images 2..n exist |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| I-001 | `tests/integration/api/run-file-changes-api.integration.test.ts`, "serves every artifact an attached active run records after an earlier read (regression)" | After 409 for streaming `d`, complete `d` (file written, `available`). The next preview returns 200 with the bytes, and the list stays four entries | REQ-004, AC-005, RU-002 | 14 added lines |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

All commands were run from the worktree root with `PATH=/tmp/pnpm-shim:$PATH`. Evidence logs are in `<T>/api-e2e-evidence/`.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/run-file-changes tests/unit/run-history/services/run-file-change-projection-service.test.ts tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts tests/unit/api/rest tests/integration/api/run-file-changes-api.integration.test.ts --no-watch` | baseline before my changes | unit/integration | Pass 52/53. The one failure is the pre-existing historical team case | console (baseline) |
| 2 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts --no-watch` | fixed source | E-001..E-004 | Pass 2/2. Two earlier harness-only iterations failed: env set after the CLI launch, and the team stream uses the `source_tool` key | `run3.log`, `run2-harness-env-ordering.log` |
| 3 | same as 2 with `git checkout 5c74fed71 -- autobyteus-server-ts/src`, then `git checkout HEAD -- autobyteus-server-ts/src` | base source (temporary) | the E2E detects the defect | Expected fail: standalone and Team member both get `image_2_1.png` → 404 `{"detail":"File change not found"}`. Source restored and verified clean | `base-source-run.log` |
| 4 | same as 2, ×5 then ×3 (with `agy-native-image-step-output`) | fixed source | stability at worst-case timing (preview requested immediately on `FILE_CHANGE`) | Pass 8/8 | `repeat-1..5.log`, `final-1..3.log` |
| 5 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/run-file-changes-api.integration.test.ts tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts tests/architecture --no-watch` | fixed source | I-001 (incl. 409 → 200), fixture routing, architecture | Pass except the pre-existing historical team case (63/64) | `repo-broad.log`, `final-integration.log` |
| 6 | `RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/runtime/agy-native-image-{step-output,app-chat,codex-skill}.e2e.test.ts tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts --no-watch` | fixed source | no regression from the fixture change | Pass 7. Five are skipped because they need other opt-in flags | `agy-e2e.log` |
| 7 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit` (filtered to the changed test files) | — | test typing | Pass (no errors in the changed files) | console |
| 8 | `pnpm -C autobyteus-web exec nuxt prepare`, then `pnpm -C autobyteus-web test:nuxt components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts --run` | web | viewer contract (mocked) | Pass 19/19 | `web-viewer.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. The run has several independent repository, real-server and browser cases, two long-running owned stacks, and a risk of interruption.
- Canonical ledger path: `<T>/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | AC-001..AC-005 proven directly; AC-006 proven at the server boundary for standalone and Team member | The Artifacts-tab half of AC-006 and ASM-001 are not exercised | Browser journey |
| Changed-boundary execution directness | 97% | Real Studio composition binds the real authority; exact user URL and query shapes | — | — |
| Cross-boundary integration realism and mock gap | 95% | Only the AGY CLI is emulated; real recorder, run manager, team manager, persistence | Real `agy` binary and model not used (not a changed boundary) | — |
| Environment, configuration, identity, and fixture fidelity | 93% | Owned HOME/app-data; AGY-format step outputs | Fake CLI timing differs from the real CLI | — |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | terminate, restore, 409 → 200, 404, close/new supervisor (unit), base reproduction, 8× stable | A read concurrent with an in-flight `handle()` (pre-existing, not stressed beyond worst-case client timing) | — |
| User-surface, browser, and desktop-shell confidence | 85% | Viewer unchanged; viewer specs 19/19; the user's own screenshot shows image 1 rendering through the same viewer on 200 | No real UI run; ASM-001 open | Browser journey (standalone and Team member, live and after reopen) |
| Durable regression coverage quality and relevance | 96% | E2E fails on base exactly like the user report and passes on the fix; integration covers 409 → 200 | — | — |

- Overall post-repository confidence: 93% (simple average 654/7 = 93.4%)
- Calculation method: simple average, with each category checked against the 90% floor
- Every critical acceptance criterion directly proven: `No` (the Artifacts-tab half of AC-006 is not yet proven)
- Any applicable category below `90%`: `Yes`: User-surface 85%
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: ASM-001 (frontend behavior with correct server data) is unproven.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser` (web-equivalent renderer) against a test-owned real stack
- Specific confidence gap addressed: AC-006 in the Artifacts tab and ASM-001, for standalone and Team member, live and after reopen
- Why the selected mode can materially improve confidence: it is the only surface that exercises the store, viewer and hydration together against the fixed server
- Expected confidence after the selected validation: ≥ 95% if ASM-001 holds
- Browser-specific decision and rationale: required. The renderer is web-equivalent, so no Electron-shell behavior is involved.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron wrapping the Nuxt renderer
- Testing guideline used: `TESTING.md` § Choosing the path
- Web-equivalent behavior: Artifacts tab list, viewer and hydration (the renderer)
- Shell-specific or lifecycle behavior: none changed
- Chosen validation approach: browser against Nuxt dev plus the built worktree backend
- Effect on any already-running desktop application: `None`. The user's server on `:8000` was not touched.
- Behavior not directly proven and confidence consequence: packaged Electron shell (not changed, no consequence)

## Live Environment And Fixture Plan

- Startup order and commands: `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build`; then the temporary launcher `node <T>/api-e2e-evidence/browser/launch.mjs <worktree> <label>`. It runs migrate → backend `dist/app.js` → `nuxt dev`.
- Environment choices: private HOME/data/SQLite; free ports; `ANTIGRAVITY_CLI_COMMAND` = fake CLI; `AGY_FAKE_CASE=image_done`, `AGY_FAKE_IMAGE_STEPS=1,2,3`, `AGY_FAKE_IMAGE_GATE=<owned>/gate`
- Health / readiness checks: `/rest/health` 200; Nuxt `/` 200
- Seed data / fixtures: three distinct 64×64 PNGs (red, green, blue) with AGY step outputs (`plant.py`); agent, Team definition and run created through GraphQL
- Test identities / authentication: none (local)
- Journeys: B-001 standalone live + reload; B-002 Team member live; B-003 Team member after reload (active); B-004 Team member after terminate
- Evidence to capture: DOM assertions (listed rows; viewer path; `img` blob src; `naturalWidth` 64; no "File not found"), screenshots, backend logs, GraphQL/REST cross-checks
- Owned processes and temporary state to clean up: launcher process groups (backend, Nuxt, fake CLI); owned `/tmp/rfc-browser-*` directories; browser tab

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| E-005 | E-001/E-002 run against base `src` (temporary checkout, restored) | the durable E2E detects the defect | mutation check, not a product behavior |
| B-001..B-004 | `launch.mjs` + `plant.py` + browser tools | AC-006 / ASM-001 in the real UI | Interactive journey driven against `nuxt dev`. The durable server E2E already guards the server contract; a durable UI probe for this belongs with whoever owns the frontend gap found below |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real `agy` binary with real model calls | Uses AGY quota; the change is server-internal and the CLI contract is emulated by the project fixture | Low | None |
| Packaged Electron app | No shell change; the renderer is web-equivalent | Low | None |
| Pre-existing integration failure "hydrates historical AutoByteus team-member file changes" | Fails identically on base; inactive path; E-004 shows the real historical path works | Low (probably a stale test fixture) | Separate investigation (not this ticket) |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| ASM-001 is false for Team members. After a page reload (and for a terminated Team), the member's Artifacts tab shows "No touched files yet". The server returns all three entries with 200s. No team-run or team-member frontend hydration path loads `getRunFileChanges`; only `agentRunOpenCoordinator` / `runContextHydrationService` do. The behavior is pre-existing and not caused by this change (no `autobyteus-web` file changed) | `Requirement Gap` | B-003, B-004; screenshots 12, 13; GraphQL/REST cross-check; `autobyteus-web/services/runOpen/*`, `services/runHydration/*` inventory | Solution Designer (scope decision: extend this ticket with frontend Team-member artifact hydration, or split it into a new ticket and amend ASM-001/SCN-002) |

## Round 2 Delta (SR-002)

- Amended basis:
  - AC-003 covers the `getRunFileChanges` API for any run, including Team members, plus the standalone UI reload.
  - AC-004 covers the API for any inactive run plus the standalone UI.
  - ASM-001 holds for the standalone UI and live Team-member previews.
  - Team-member UI reload/history is out of scope (follow-up ticket).
- Coverage decisions:
  - B-003/B-004 change to `Out Of Scope` (evidence kept for the follow-up).
  - New temporary case B-005 (standalone UI history), because round 1 browser-checked only the active-run reload for standalone runs.
  - Durable coverage unchanged since round 1.
- Ambiguity row above: resolved by SR-002 (user chose Option 2).
- Execution: E-001..E-004 and the repository suites rerun on HEAD `20258294c`; B-005 on a fresh owned stack. See the execution report.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added E-001..E-004 and the fixture modes; updated I-001)
- Post-repository confidence: 93%
- Broader validation decision: `Required` (Browser); executed in rounds 1 and 2. Final result: Pass, 96%.
- Reroute Required Before Validation Execution: `No`. The gap was found during execution, so it follows the failure-origin route.
- Recommended Owner If Reroute Required: N/A before execution. After execution: Solution Designer (Requirement Gap), via code-review failure-origin review.
- Notes: the investigation was written after an exploratory first run of the new E2E, which shaped the fixture design. All final executions follow this plan.
