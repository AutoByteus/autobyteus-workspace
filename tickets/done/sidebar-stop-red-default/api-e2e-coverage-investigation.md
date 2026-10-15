# API/E2E Coverage Investigation — sidebar-stop-red-default

## Meta / Authority / Route
Initial round 1, 2026-10-13. New Task project_task_6d8f94f6-1694-466b-9587-2ac091e7dd18. Canonical ticket `/home/autobyteus/workspace/.codex/worktrees/sidebar-stop-red-default/tickets/in-progress/sidebar-stop-red-default`. Read implementation-handoff.md first, then requirements-doc.md Approved R1, investigation-notes.md, Ready design-spec.md, solution-handoff.md, solution-revision-record.md SR-001/002, implementation-revision-record.md IR-001. Supplement local-rendered-check.md and local-preview/result.json, implementation regression logs. Earlier Task receipt is read-only background, never current approval or Pass; earlier Task stays DONE. No prior API result/confidence.
Medium / Low, Direct Low-Risk. Successful output Delivery; test-code review Not Required — direct low-risk route. Architecture/source reviews and their records, Product package, delivery re-entry artifacts: N/A — not applicable. API-REV-001 record after completed result. No FUP-001 activity or redispatch.

## Supported Behavior / Changed Boundaries
SCN-001: Agent/PM, Team, Org root sidebar enabled-red/hover/leave. SCN-002: delegated Agent/whole-Team copy and actual hosts. SCN-003: native focus/activation, real pending muted including hover, exact unchanged stop/outcome. No new/contrived scenarios.
BEH-001 CSS enabled foreground red-500, BEH-002 disabled foreground gray-400 + transparent disabled-hover; rest of BEH-002/003 unchanged. Three existing Vue files/four class sites, five variants. Frontend renderer/browser (web-equivalent Electron renderer) changed. API, root lifecycle, Tasks, streams preserved integration boundaries; need realistic regression proof. Auth/session, schema/persistence, queues/distributed coordination, provider inference, shell/IPC/packaging unchanged. Persisted Data Not Affected; Legacy Removal clean, no flags/fallback/dual modes.
AC-001 all-five actual render; AC-002 all-five focus/pending/disabled-hover/native target/no duplicates; AC-003 three root wire IDs/inactive/history/no new confirmation; AC-004 copy target/root ownership, open Task/parent survival/resume, all three root hosts; AC-005 evidence/cleanup supplied here, integration/receipt Delivery-owned.

## Discovery / Execution Instructions
Assigned worktree `/home/autobyteus/workspace/.codex/worktrees/sidebar-stop-red-default`, branch codex/sidebar-stop-red-default; base 0c37f58d8, source 14f9b3cc0, handoff b060afb86. Root AGENTS.md, DESIGN.md, TESTING.md; web/server AGENTS.md; web README Testing, root README Local full-stack, server README build; manifests, web vitest.config.mts (renamed from prior .ts), existing probe full setup/header/helpers and DCP-001/002/003 inspected. No closer TESTING/AGENTS under web. Follow root browser-probe pathway, not packaged/full-desktop or user instance. --run and explicit staging required.
Dependencies/shared prebuild/Nuxt prepare available from current IR-001; server dist NOT built until this stage. Temporary assigned pnpm shim `/tmp/sidebar-stop-red-tools/bin` prepended to PATH. Build/dev serialized. Probe process runs with env -i, fresh outer HOME; probe creates private backend HOME/data/SQLite, free ports and browser context. Seed through GraphQL/UI; scripted AGY calls real tools; never paid inference or credential imports. Delayed outgoing real mutation is forwarded unchanged; do not fabricate success. Probe owns readiness and cleanup; verify PIDs/ports/data afterward.

## Existing Coverage Validity / Durable Decisions
| Existing durable path under autobyteus-web | Decision | Rationale / gap |
|---|---|---|
| components/workspace/history/__tests__/DelegatedStopButton.spec.ts | Still Valid | Current R1 red/disabled, both types × all3 root kinds; mock boundary, not real CSS |
| components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts | Still Valid | All3 root palette/target/inactive/disabled cases including actual Org collection |
| components/workspace/history/__tests__/WorkspaceAgentOrgActivityPublication.spec.ts | Still Valid | Controlled publication/pending/error/history |
| composables/__tests__/useWorkspaceHistoryMutations.spec.ts | Still Valid | Agent/Team distinct pending/IDs, no Delete confirmation |
| composables/__tests__/useWorkspaceHistorySubjectActions.spec.ts | Still Valid | Org subject stop/inspection/route handling |
| stores/__tests__/delegatedLaunchDraftStore.spec.ts | Still Valid | Per-target pending/feedback |
| tests/e2e/delegated-launch-defaults-probe.mjs sidebarPaint, keyboardStopCopy, DCP-001/002/003 | Needs Update | Old gray rest assertion intentionally obsolete under R1. Retain lifecycle; update red expectation, add actual disabled-hover, root termination and Org sidebar-copy coverage |
| Other DLP/DCP cases | Out Of Scope | Unchanged default/model/restart functionality; not removed |
Obsolete assertion: sidebarPaint reference.rest.color rgb(153,153,153); replacement enabled rgb(239,68,68), gray only disabled. Authority R1 REQ-001/002, SR-002. Not an implementation defect or previous Task failure. Remove no tests, weaken no lifecycle assertion. Add Durable Coverage in existing DCP cases, not a parallel harness. Existing implementation negative control 15 intentional old-gray failures is sensitivity evidence only.

## Plan / Ledger
1. UNIT-001: direct button/root suites, then UNIT-002: four action/store/publication suites; all --run --maxWorkers=2. Planned.
2. Current `pnpm -C autobyteus-server-ts build`; syntax/diff checks. Planned.
3. DCP-001: Agent-root + Agent-copy CSS/action matrix, pending delayed-forwarded, open Task/root survival/resume, finally real root Stop/history.
4. DCP-002: Team-root + whole-Team-copy same, genuine collapsed/expanded states, finally root Stop/history.
5. DCP-003: Org-root/copy CSS host, preserve original Settings copy Stop/save/resume; add sidebar copy native held Stop then resume, finally Org-root native Stop/history. All actions only test-owned roots/copies.
Ledger Yes (multi-case long execution), api-e2e-test-case-ledger.md initialized before checks. Existing probe --ledger-file per-case completion retained; add material checkpoints if case grows. Reuse IDs across attempts.

## Confidence / Broader Decision
Post-repository seven-category percentage scorecard pending execution; no inferred Pass. Categories requirement/AC, changed-boundary directness, integration/mock gap, environment/identity/fixture fidelity, lifecycle/recovery/edges, user surface/browser/shell, durable relevance. Arithmetic mean; critical proof overrides score, each >=90 and target >=95.
Broader **Required**: actual compiled disabled:hover precedence and three real root actions missing from mocks/implementation fixture. Browser + real API/current backend selected per TESTING and design; expected >=95 after matrix passes. Shell unchanged/inapplicable, no full-product-desktop claim. No existing running application effect.
Startup current server build → private Prisma migrate → server health → public seed → Nuxt ready/warmup → Chrome. Command `pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --cases DCP-001,DCP-002,DCP-003 --output-dir <fresh ticket evidence> --ledger-file <canonical ledger>` inside clean outer environment. Capture JSON wire/status/styles, screenshots, service logs, Task/history readbacks; native Tab/Enter/Space; duplicate pointer/key only while pending. Org keeps 0s transition, other controls 150ms. Real status/row selection semantics recorded, not forced.

## Exclusions / Temporary / Risks / Decision
No new temporary fixture harness planned; upstream actual-component preview supplementary only. No provider, full Electron, user app or release testing needed for changed renderer CSS. Direct Stop docs sync and source integration downstream. No user-only dependency currently missing. Prior FUP excluded. No runtime dead code or compatibility branch found. Proceed Yes, durable update Yes, reroute before execution No. Final reports will update results/confidence and residuals.

## Post-Repository Confidence Gate
UNIT-001 Pass 48/48; UNIT-002 Pass 23/23. Current server build/bootstrap status recorded in api-build.log; required before browser launch. Probe syntax/diff checks Pass. Durable helper update replaces only obsolete palette assertion and extends existing DCP cases; root and copy pending checks share delayed-forwarded transport helper. DCP-003 original Settings journey retained, followed by sidebar copy stop/resume and root termination. No production change.
| Category | Score | Remaining gap |
|---|---|---|
| Requirement/AC proof | 75% | Need independent all-five actual app CSS/action matrix |
| Changed boundary directness | 90% | Actual templates in unit/implementation preview, not full app yet |
| Integration/mock gap | 75% | Root/copied Task/stream APIs not independently executed |
| Environment/identity/fixture fidelity | 90% | Current dependencies/build prepared; scripted real stack pending |
| Failure/edge/lifecycle/recovery | 75% | Pending/actions mocked, actual stopped/history/resume missing |
| User surface/browser/shell | 75% | Fixture supplementary; shell unchanged N/A |
| Durable relevance | 90% | Current component matrix and old-token negative sensitivity; browser additions unexecuted |
Overall 81.4% arithmetic mean, no implied Pass. Critical direct proof incomplete; target 95 unmet. Broader Browser+real backend Required remains, expected >=95 with successful current-stack execution.

## Final Execution / Confidence Gate — API-REV-001
Initial plan and validity decisions preserved above as chronology. Execution completed: UNIT-00148/48, UNIT-00223/23, current server build/bootstrap Pass, DCP-001/002/003 all Pass first attempt. Updated durable probe is the only API-stage code delta, no tests removed. 58 screenshots and current actual sidebar computed styles prove all five enabled/disabled-hover variants, exact three root actions/inactive history and copy Task/parent/resume for all3 hosts. DCP-003 original Settings proof retained plus sidebar proof. Real requests held then forwarded; scripted AGY inference only, no fabricated API results. Zero browser page errors during cases. No blocker, product failure or unplanned reroute.

Final seven category scores: requirement/AC95, changed-boundary95, integration95, environment95, lifecycle/edge95, browser95, durable relevance95; mean95.0% vs post-repository81.4%. New direct evidence and negligible residuals itemized in `api-e2e-execution-coverage-report.md`; no category below90 and no missing critical runtime AC. Broader Required completed, further validation Not Required for this scope. Shell/paid inference/full installed-app/other unrelated cases not claimed. AC-005 final receipt belongs to Delivery; API evidence/cleanup supplied.

Canonical report/revision API-REV-001 and ledger reconciled. All selected cases terminal; conversation interruption did not stop child execution. Cleanup independently verified in evidence/api-cleanup.json; pnpm shim intentionally retained for downstream use/removal. Docs sync and integration/receipt remain Delivery; no release authorized. Direct test-review decision Not Required — direct low-risk route.
