# API/E2E Coverage Investigation — task-copy-stop-style

## Investigation Meta / Authority
2026-10-13; round 1, initial IR-001 implementation handoff. Canonical ticket directory: `/home/autobyteus/workspace/.codex/worktrees/task-copy-stop-style/tickets/in-progress/task-copy-stop-style`. Read cumulative requirements-doc.md (Approved R1), investigation-notes.md, design-spec.md, solution-revision-record.md (SR-001/002), solution-handoff.md, implementation-handoff.md and implementation-revision-record.md (IR-001). Supplements: user-parent-neutral/hover PNGs, implementation unit/negative-control logs and local-rendered-check.md/local-preview-2 result. Architecture/source review and revision artifacts, Product supplement, delivery re-entry: **N/A — not applicable**. Current completed revision API-REV-001; execution report is authoritative. Prior result/confidence N/A.

Small / Low; Direct Low-Risk input; successful output Delivery; test-code review **Not Required — direct low-risk route**. No requirements/design impact found. Legacy removal check clean; persisted data **Not Affected**; no compatibility-only paths.

## Basis / Scenarios / Boundaries
SCN-001: live Agent and Team copy sidebar neutral → hover → leave, selected/unselected. SCN-002: keyboard stop/focus/pending. SCN-003: exact copy stops, root survives, Task stays open and copy resumes. No new or contrived scenarios.
BEH-001 changes only resting foreground; BEH-002/003 preserved. Actual changed boundary: Vue renderer and compiled Tailwind CSS (web-equivalent Electron renderer). API/transport, root lifecycle and Tasks are preserved integration boundaries to exercise, not changed source. Domain/auth/storage/distributed/external-provider/shell boundaries unchanged; no migration, IPC, packaging or model-inference proof needed.
AC-001/002 need direct computed reference comparison and screenshots in actual sidebar. AC-003 needs native keyboard and held pending (delayed transport only). AC-004 needs exact wire target, root survival and Task readback, plus exclusions in component tests. AC-005 is Delivery-owned receipt; this stage supplies linked evidence/cleanup, not final integration/runtime claims.

## Project Execution Discovery
Worktree `/home/autobyteus/workspace/.codex/worktrees/task-copy-stop-style`, branch codex/task-copy-stop-style, source 61e20a031, evidence 645cc8713, base e22245f09.
Read root AGENTS.md, DESIGN.md, TESTING.md; web and server AGENTS.md, root README local full-stack development, web README Testing, server README build, web vitest.config.ts, relevant manifests/scripts and probe header/setup. No closer TESTING file under web. Follow root TESTING browser-probe path rather than unrelated production Docker/dev data. Web AGENTS directs --run and explicit staging.
Node/Nuxt/Vue/Tailwind/Vitest happy-dom/Playwright Chromium; server current dist must be built (not installed app). Install/prebuild/Nuxt prepare completed upstream, logs retained; reuse dependency setup. pnpm PATH shim `/tmp/task-copy-stop-tools/bin` assigned for downstream use. No credential imports or paid inference.
Probe owns free ports, temporary backend DB/data/HOME, seeded GraphQL definitions, browser and Nuxt; AGY scripted tool calls exercise real stop/task/stream paths. Run probe process itself with env -i and fresh HOME (baseEnv otherwise forwards HOME to frontend/Prisma). No user instance reuse. Build/dev work serialized.

## Existing Durable Coverage Decisions
| Path (under autobyteus-web) | Decision | Evidence / gap |
|---|---|---|
| components/workspace/history/__tests__/DelegatedStopButton.spec.ts | Still Valid | 11 cases: Agent/Team selected states, tokens, labels, containment, pending duplicate and exclusions; mocks cannot prove CSS or backend |
| stores/__tests__/delegatedLaunchDraftStore.spec.ts | Still Valid | 5 store feedback/pending cases |
| components/workspace/history/__tests__/WorkspaceTransientExecutionRow.spec.ts | Still Valid | Surrounding row interactions, selected/disclosure semantics |
| components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts | Still Valid | Normal parent reference and row regression |
| tests/e2e/delegated-launch-defaults-probe.mjs DCP-001/002 | Needs Update | Existing real stop/save/resume journeys lack actual-parent color parity, pending wire/Task proof; add bounded assertions using existing harness |
| Remaining DLP/DCP cases | Out Of Scope | Other launch-default, Org, restart/model scenarios unaffected; not removed |
No obsolete tests removed/replaced. No validity ambiguity. Add Durable Coverage in existing DCP-001/002 for missing CSS, native keyboard/pending, exact payload/readback. Temporary executable check only: existing upstream old-token negative control is sufficient regression sensitivity for style; no parallel fixture harness needed.

## Repository Execution Plan And Results
1. Focused button/store suites, then parent/transient suites: `pnpm -C autobyteus-web test:nuxt <paths above> --run --maxWorkers=2`; Planned.
2. `pnpm -C autobyteus-server-ts build`; current-source real-stack prerequisite; Planned.
3. `node --check autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs`, git diff --check; Planned.
Ledger required for multiple meaningful/long cases: api-e2e-test-case-ledger.md (UNIT-001, ROW-001, DCP-001, DCP-002). Record case outcomes before next case; add optional probe --ledger-file output for immediate case completion.

## Confidence And Broader Validation Decision
Post-repository scorecard pending execution (not an implied pass). Seven categories: requirements, directness, integration/mock gap, environment/fixtures, lifecycle/recovery, browser/shell, durable coverage. Mean applicable scores; minimum 90 each and default 95 overall; missing critical proof overrides score.
Broader validation **Required**, Browser + real API/backend, per design and TESTING.md renderer classification. Mocked component checks cannot prove real CSS or actual parent/copy/Task path. Target >=95% after both real-stack cases. Electron shell/full desktop workflow not claimed or needed for this renderer-only change. Already-running application effect None.
Startup: current server build → probe Prisma deploy in fresh DB → backend health → GraphQL seed → Nuxt ready/warmup → Chrome. Run `pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --cases DCP-001,DCP-002 --output-dir <fresh evidence path> --ledger-file <canonical ledger>` with clean environment. Observe actual rendered parent and both copy states; hold only outgoing Stop transport, then forward unchanged to real backend (no fake success), read Task before/after, retain existing resume/save assertions. Screenshots complement computed styles/DOM/wire/backend evidence. Cleanup browser, owned process groups, HOME/data/ports. Evidence retained under ticket.

## Deferred / Risks / Decision
Not Tested by design: paid inference, shell packaging, installed/running-app update and source finalization (Delivery); not user-only blockers. FUP-001 docs consistency retained out of scope. No blocked dependency known. Proceed Yes; durable update Yes; reroute before execution No.

## Post-Repository Gate — 2026-10-13
UNIT-001 Pass 16/16 (api-unit.log), ROW-001 Pass 20/20 (api-row.log), server build/bootstrap smoke Pass (api-build.log); probe syntax/diff checks Pass. No test validity change. Durable probe extended in-place (helpers + DCP-001/002 + optional ledger checkpoints), other cases untouched.
| Category | Score | Supporting proof / remaining gap |
|---|---|---|
| Requirements/AC | 75% | component and upstream fixture; actual parent render still pending |
| Changed-boundary directness | 90% | actual component but happy-dom lacks CSS |
| Integration/mock gap | 75% | store/row tested; wire/backend still pending |
| Environment/fixture fidelity | 90% | current build ready; real stack not yet run |
| Lifecycle/recovery | 75% | pending/visibility mocked; Task/resume pending |
| Browser/shell | 75% | upstream fixture only; shell N/A unchanged |
| Durable regression quality | 90% | component negative control and focused suites; updated browser not yet run |
Mean **81.4%** (570/7); critical direct proof incomplete, categories below 90, target 95 not met. Broader validation Required remains; proceed real-stack browser. Selected Team group can select coordinator rather than group; record observed selection and use component selected=true test for unreachable visual group-selected variant, not fabricate product state.

## Final Investigation Update
Broader execution completed first attempt: DCP-001/002 Pass 2/2, zero browser page errors; actual parent/copy rest/hover/leave equal, native keyboard/pending/disabled/reduced-motion, exact real targets, Task stays TODO/open, root active and copy resumes. Evidence api-browser-1 JSON/30 PNGs/logs. Agent row selected=true; Team row click expands and retains selected=false (no simulated selection). No changed test validity or uncovered critical runtime criterion. Final score 95% each category, 95% mean; latest result Pass API-REV-001, no reroute. Cleanup independently verified in api-cleanup.json. See execution report Acceptance-Criteria Proof for evidence index; AC-005 receipt remains Delivery-owned.
