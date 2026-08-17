# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible/tickets/in-progress/agent-team-codex-output-not-visible/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible/tickets/in-progress/agent-team-codex-output-not-visible/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible/tickets/in-progress/agent-team-codex-output-not-visible/design-spec.md`
- Supplemental Task Artifacts: `solution-self-validation.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md`
- Code Review Revision Record: `code-review-revision-record.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible/tickets/in-progress/agent-team-codex-output-not-visible/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `CRR-002 Pass / 94.2%` at implementation HEAD `548ff34a4fd3f34d3e90a8f3dd4604e3c7311bbe`
- Prior Investigation Reviewed: upstream reproduction evidence only; no prior completed API/E2E record exists.
- Latest Authoritative Investigation: this file.

## Current Requirement And Design Basis

The supported real journey is the imported Classroom Simulation Team configured for Codex and `gpt-5.6-luna` with medium reasoning. A message to the exact Professor AgentRun must render the Codex output live before refresh. Initial status snapshot rows retain both `agent_run_id` and `member_address`; sequenced live `AGENT_STATUS` retains only `change_sequence`, `agent_run_id`, and exact status details. All publisher-assigned Team events must reach the browser contiguously.

A non-next sequence must be rejected before mutation, cause exactly one `team_stream_recovery_required` transition, stop/disable the stale connection, and keep a persistent actionable user surface. Recovery is explicit through later selection after open work closes: the coordinator hydrates exact non-null member projections across one stable quiescent root checkpoint, admits a candidate only when its structural snapshot has the same base, and atomically replaces the old failed context/service only after readiness. Stable open-work/checkpoint/base refusals preserve the tree, failed context, and prior selection; they produce localized wait/retry feedback and a later click retries. Existing persisted history remains directly usable without migration or duplication.

Critical acceptance proof is AC-001–AC-016, including the complete real Codex producer-to-wire-to-browser path, strict status shapes, contiguous sequence, deterministic sequence-gap/recovery behavior, direct-use refresh/reopen equivalence, provider-neutral regression evidence, and safety cleanup.

## Changed Behavior Summary

| Boundary | Change type | Upstream evidence | Coverage consequence |
| --- | --- | --- | --- |
| Team snapshot/live status projection | Changed | IR-001 / CRR-002 | Directly test exact snapshot and live shapes plus strict live N / next event N+1 admission; confirm real wire has no `member_address` projection error. |
| Browser sequence admission and stream phase | Changed | IR-001 / ARCH-REV-003 | Exercise exact gap rejection, once-only recovery effect, stale-message nonmutation, command refusal, persistent notice, and no revival. |
| Root checkpoint and recovery hydration | Added/Changed | SR-003 / IR-001 | Exercise open-work refusal, checkpoint-change refusal, snapshot-base refusal, exact non-null empty payload, failed candidate isolation, successful exact-base commit, and retry. |
| Recovery presentation | Changed | IR-002 / CR-F-001 resolution | Mount the actual navigation panel; preserve tree/member/selection and route wait/retry feedback without global fatal error. |
| Persisted Team/Agent history | Preserved | R-007; direct-use decision | Compare live response with refresh/reopen and process reopen; require no duplicate or identity drift. |
| Provider behavior | Preserved | Codex healthy in investigation | Use real Codex as production witness and provider-neutral deterministic coverage; do not add provider-specific source or tests. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual boundary | Repository evidence | Material risk outside it | Broader mode |
| --- | --- | --- | --- | --- | --- |
| Domain/backend | Yes | Root checkpoint facade and strict Team event projection | server unit/integration tests | real process/publisher/provider timing | Lifecycle + Live API |
| API/transport/contract | Yes | GraphQL checkpoint/projection and Team WebSocket status/event wire | exact server tests | real WebSocket order and payload | Live API |
| Frontend state | Yes | `TeamExecutionViewState`, stream phase, hydration/open/store owners | 11-file current web selection | real browser context and UI routing | Browser |
| Browser journey | Yes | live Team conversation, recovery notice, history selection | mounted component tests | real Codex output visibility and refresh | Browser |
| Authentication/secrets | Operational | supported isolated importer | importer contract | target leakage/value exposure | Preflight + importer |
| Desktop renderer | Yes, web-equivalent | Team workspace/history UI | Nuxt tests/build | rendered live/recovered state | Browser-preferred |
| Desktop shell | No material changed seam | no preload/IPC/window change | N/A | none for ticket | Not required |
| Process/lifecycle | Yes | process startup, Team run persistence/reopen | builds and recovery tests | same-store process reopen | Lifecycle |
| Persisted data | Preserved/direct-use | Agent/Team history and current package | hydration/restore tests | live-vs-restored equality, duplication | Reopen/restore |
| Worker/queue/distributed | No independent change | existing root publisher ordering | deterministic ordering tests | provider event cadence | Live provider |
| External integration | Yes | Codex/gpt-5.6-luna | provider-neutral tests | actual provider response | Real provider |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible`.
- Stack: pnpm monorepo, TypeScript server/Fastify/GraphQL/WebSocket/SQLite, Nuxt/Vue/Pinia frontend, Chrome via Playwright Core.
- Instructions: `autobyteus-server-ts/AGENTS.md`; `autobyteus-web/AGENTS.md`; server/web READMEs and package scripts.
- Required secrets: available only through the user-authorized source `/Users/normy/.autobyteus/server-data/.env`; use `pnpm secrets:import -- --source ... --database-url file:/exact/disposable.db` first with `--dry-run`, never print values.
- Agent package: `/Users/normy/autobyteus_org/autobyteus-agents`, import through supported API without edits.
- Owned target plan: server `127.0.0.1:60418`, web `127.0.0.1:31418`, runtime `autobyteus-server-ts/tests/.tmp/api-rev-001-live-20260817-1`, DB `autobyteus-server-ts/db/api-rev-001-live-20260817-1.db`.
- Ambient `DATABASE_URL` and `DATABASE_URL_TEST` must be removed from child environments. Configuration-only preflight and exact PID/lsof DB proof are mandatory before live work.
- Protected/user state: operational `$HOME/.autobyteus` inspection/action `NONE`; protected ports `60004/31004` action `NONE`; preserve all user processes, stashes, backups, and historical incident disclosures.

| Component | Setup / command authority | Readiness | Cleanup |
| --- | --- | --- | --- |
| server repository tests | `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch` | exit 0 | repository test DB only; remove exact residue |
| web tests | `pnpm -C autobyteus-web test:nuxt <paths> --run` | exit 0 | none |
| production builds | `pnpm -C autobyteus-server-ts build:full`; `pnpm -C autobyteus-web build` | exit 0 | build outputs retained by repo workflow |
| isolated DB/vault | Prisma deploy plus supported secret importer with exact file URL | target proof + value-free summary | remove exact DB/key/sidecars |
| built server | `node autobyteus-server-ts/dist/app.js --data-dir <owned> --host 127.0.0.1 --port 60418` | health/GraphQL + PID/lsof | stop exact owned PID |
| Nuxt | `BACKEND_NODE_BASE_URL=http://127.0.0.1:60418 pnpm -C autobyteus-web dev --host 127.0.0.1 --port 31418` | HTTP 200 | stop exact owned PID |
| real definitions | public package import from authorized package | Classroom Team enumerated | isolated runtime removed |
| browser | Playwright Core / installed Chrome | semantic DOM plus correlated wire/API | close owned browser |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`.
- Representative data: one real Codex Professor turn and exact Team/Agent history under the isolated current package.
- Planned proof: capture live content and exact AgentRun/root identities, refresh/reopen through normal UI/API, stop and reopen the built process on the same isolated store, compare content/count/identity, then explicit Team restore/reconnect. No data rewrite or compatibility reader is permitted.
- Migration command is used only to initialize the empty isolated application DB, not to test or inspect operational data.

## Existing Durable Coverage Inventory And Decisions

| Path / group | Current assertion | Decision | Action |
| --- | --- | --- | --- |
| `team-execution-view-projector.test.ts` | atomic snapshot; exact live status; next event continuity | Still Valid | run directly and in focused server set |
| `agent-team-stream-handler.test.ts` | snapshot barrier and live status N/event N+1 | Still Valid | run directly; correlate real WebSocket |
| `team-run-history.test.ts` | exact root checkpoint and non-null empty projection | Still Valid | run directly |
| `agent-team-run-manager.integration.test.ts` | current package restore/runtime identity | Still Valid | run focused integration |
| `teamExecutionViewState.spec.ts` | gap rejection with no partial mutation | Still Valid | run focused web set |
| `TeamStreamingService.spec.ts` | first rejected gap effect once, failed instance cannot revive, candidate exact-base admission/refusal | Still Valid | run focused web set and temporary real browser gap/recovery probe |
| `teamRunContextHydrationService.spec.ts` | stable checkpoint, open-work refusal, checkpoint-change refusal, exact non-null payload | Still Valid | run focused web set |
| `teamRunOpenCoordinator.spec.ts` | failed context unpublished, candidate commit only after readiness, failed selection preserved | Still Valid | run focused web set |
| `agentTeamRunStore.spec.ts` | persistent notice, command blocking, candidate commit/failure | Still Valid | run focused web set |
| `runHistorySelectionActions.spec.ts` | known-failed selection routes only through recovery and later retry | Still Valid | run focused web set |
| `useWorkspaceHistorySelectionActions.spec.ts`, `WorkspaceAgentRunsTreePanel.spec.ts` | retryable refusal remains informational; tree/member stays mounted/selectable | Still Valid | run current cumulative web set |
| `TeamWorkspaceView.spec.ts` | exact focus and persistent actionable guidance | Still Valid | run current cumulative web set and browser |
| provider-neutral retained streaming/status tests | other providers and standalone remain on shared/current boundaries | Still Valid | proportionate repository run; do not add provider-specific workaround coverage |
| upstream reproduction probes | prove old defect only | Historical / Do Not Reuse As Acceptance | use for scenario design; execute fresh post-fix evidence |

No existing current assertion is stale against SR-003. No removal is planned. No durable gap justifies a new repository test before execution: implementation/reviewer coverage already closes the exact deterministic seams. Temporary ticket probes are appropriate for the one-off real provider, deliberate browser gap, and process-reopen evidence because the repository has no safe credentialed permanent browser harness for this scenario.

## Repository Coverage Execution Plan

1. Re-run the exact 4-file server focused current selection and the 11-file web cumulative selection from CRR-002.
2. Add proportionate provider-neutral/current streaming/restore suites if not already within those selections.
3. Run production server TypeScript/build/full sanitized bootstrap and Nuxt guards/build.
4. Run static source/legacy/secret/diff/status audits.
5. Do not run a broad entire repository suite unless a focused result identifies a broader integration risk.

## Initial Confidence Scorecard

| Category | Score | Support | Remaining gap |
| --- | ---: | --- | --- |
| requirement/AC proof | 62% | source review and deterministic tests cover design | no post-fix live AC-001–AC-006/010/012–015 |
| changed-boundary directness | 78% | exact projector/view/service tests | real publisher-to-wire-to-browser not run |
| integration realism/mock gap | 48% | upstream old-defect reproduction is real but pre-fix | no current real provider/browser/reopen |
| environment/identity/fixture fidelity | 82% | authoritative setup and prior safe reproduction | fresh target proof pending |
| failure/lifecycle/recovery | 72% | deterministic gap/refusal/candidate coverage | real UI recovery and process reopen pending |
| user-surface/browser/desktop | 48% | mounted component tests only | current live/render/refresh pending |
| durable regression quality | 95% | focused, current, boundary-owned suites reviewed | API/E2E execution pending |

- Initial overall confidence: `69.3%` simple mean.
- Every critical AC directly proven: `No`.
- Any category below 90%: `Yes`.
- Broader validation decision: `Required`.
- Selected modes: repository, checked-isolated lifecycle/API, real Codex provider, Chrome browser, deliberate gap/recovery, refresh/reopen/restore.

## Planned Broader Journeys

1. Clean isolated start; import authorized secrets and package; select Classroom Simulation Team; configure all relevant members to Codex / `gpt-5.6-luna` / medium; launch and send an exact marker prompt to Professor.
2. Capture producer/wire/browser correlation for root and AgentRun across member input, running status, turn start, segment lifecycle, terminal, and final status. Require consecutive admitted sequences, live status without `member_address`, snapshot status with it, no strict projection errors, and marker visible before refresh.
3. Refresh/reopen and compare identical marker/count/identity without duplication. Stop/reopen the process on the same isolated store and repeat restore/reconnect equivalence.
4. Deliberately introduce a browser-side non-next event or controlled sequence-loss simulation at the real service/state boundary: require stale-delta nonmutation, one recovery transition, stale transport shutdown/command refusal, persistent actionable notice, and no later stale mutation/recovery storm.
5. Exercise stable open-work/checkpoint/base refusal presentation and later explicit retry using the real mounted navigation/recovery owner where feasible; otherwise use the current mounted durable coverage plus a temporary production-service seam probe, stating the boundary precisely.
6. Reconfirm provider-neutral shared contract coverage and standalone streaming through repository evidence; live alternative-provider rows only if they materially close an observed uncertainty.
7. Clean exact owned browser/process/runtime/database/key/sidecars; verify owned and protected port state without acting on protected processes.

## Investigation Decision

- Proceed to execution: `Yes`.
- Repository-resident durable coverage planned: `No`.
- Post-repository confidence: pending execution.
- Broader validation: `Required`.
- Reroute before execution: `No`.

## Investigation Update — Provider-Neutral Standalone Fixture Currentization

The planned provider-neutral expansion changed one validity decision before any live execution. `agent-status-websocket.integration.test.ts` is `Needs Update`, not evidence of a product defect: its six failing cases directly manufacture retired `segment_id` content, omit canonical `SEGMENT_START`, include the prohibited content `segment_type`, or expect content after turn terminal. Current provider converters pass 117/117 and current Team segment admission passes 10/10. The exact analysis is `api-e2e-evidence/api-rev-001/investigation/provider-neutral-stale-fixture-analysis.md`.

API/E2E will currentize this one durable integration file against the approved current AgentRun segment lifecycle, rerun it with provider converter and Team admission selections, and return the cumulative package through proportional code review after the final result. Production source remains unchanged. Repository-resident durable delta is now planned as `1 updated / 0 added / 0 removed`.


## Investigation Final Update — Repository And Broader Evidence

This section supersedes the earlier planned-result fields. The investigation remained authoritative throughout execution; the live phase began only after repository validity was adjudicated and the current durable boundary passed.

### Final Durable Coverage Decision

| Scenario ID | Path | Decision | Exact update | Result / evidence |
| --- | --- | --- | --- | --- |
| API-CODEX-STATUS-011 | `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts` | Needs Update -> Updated / Current | Replace retired `segment_id` content fixtures with canonical start-owned `{id, turn_id, segment_type}` plus content `{id, turn_id, delta}`; change retired-turn late content from observable content to the exact non-terminal lifecycle diagnostic. | 7/7 focused Pass; provider-neutral current selection 4 files / 124 tests Pass; static retired-fixture scan Pass. |

Final repository-resident durable delta: **0 added / 1 updated / 0 removed**. Inventory and exact patch:

- `api-e2e-evidence/api-rev-001/investigation/cumulative-durable-coverage-inventory.tsv`
- `api-e2e-evidence/api-rev-001/investigation/cumulative-durable-diff.patch`
- `api-e2e-evidence/api-rev-001/repository/final-durable-diff-audit.log`

No production source was changed by API/E2E.

### Repository Coverage Execution Results

| Order | Command / selection | Boundary proven | Result | Evidence |
| ---: | --- | --- | --- | --- |
| 1 | Server focused current selection: Team run manager integration, history, Team stream handler, view projector | strict snapshot/live identity, root sequence, restore | Pass — 4 files / 20 tests | `api-e2e-evidence/api-rev-001/repository/server-focused-current.log` |
| 2 | Web cumulative current selection | gap rejection before mutation, once-only recovery effect, non-revival, exact-base candidate, hydration refusals, tree/selection/presentation | Pass — 11 files / 159 tests | `api-e2e-evidence/api-rev-001/repository/web-cumulative-current.log` |
| 3 | Currentized standalone Agent WebSocket integration | current AgentRun segment lifecycle, cadence, reconnect, retired-turn rejection | Pass — 1 file / 7 tests | `api-e2e-evidence/api-rev-001/repository/agent-status-websocket-currentized-round1.log` |
| 4 | AutoByteus, Claude, Codex converter plus standalone current selection | provider-neutral segment/status behavior and no retired fixture | Pass — 4 files / 124 tests | `api-e2e-evidence/api-rev-001/repository/provider-neutral-currentized-final.log` |
| 5 | Team Agent segment admission integration | provider-to-Team strict segment admission | Pass — 1 file / 10 tests | `api-e2e-evidence/api-rev-001/repository/team-agent-segment-admission-current.log` |
| 6 | `pnpm -C autobyteus-server-ts build:full` | production TypeScript/build/managed assets/sanitized bootstrap | Pass | `api-e2e-evidence/api-rev-001/repository/server-build-full.log` |
| 7 | Web boundary/localization guards and `pnpm -C autobyteus-web build` | production Nuxt bundle and 15-route prerender | Pass | `api-e2e-evidence/api-rev-001/repository/web-production-build.log` |
| 8 | Durable diff/inventory/static audit and repository test-DB residue check | exact one-path delta, clean patch, no owned residue | Pass | `api-e2e-evidence/api-rev-001/repository/final-durable-diff-audit.log`; `api-e2e-evidence/api-rev-001/environment/repository-test-db-final-residue.json` |

### Post-Repository Confidence Scorecard

| Category | Score | Support | Remaining uncertainty / confidence-gain selection |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 91% | Exact deterministic server/web owners and provider-neutral current tests cover all designed behaviors. | Required real post-fix Codex Team and persisted journey. |
| Changed-boundary execution directness | 94% | Actual status projector, Team handler, view state, streaming service, hydration/open coordinators execute. | Confirm actual provider-to-wire-to-browser path. |
| Cross-boundary integration realism and mock gap | 90% | Integration suites cross server and browser-state boundaries. | Credentialed provider/browser/process path still needed. |
| Environment, configuration, identity, and fixture fidelity | 93% | Current package/builds and isolated setup instructions validated. | Prove imported package, runtime/model, exact run identity on checked target. |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | Direct deterministic gap, once-only transition, stale-service, checkpoint/open-work/base refusal and retry coverage. | Process reopen and supported restore still needed. |
| User-surface, browser, and desktop-shell confidence | 88% | Mounted Vue coverage and production build pass; shell seam is not affected. | Real `open_tab` browser launch/live/refresh/reopen required. |
| Durable regression coverage quality and relevance | 96% | Reviewed exact owner tests plus currentized standalone integration; no compatibility fixture retained. | Proportional review still required for the one updated file. |

- Overall post-repository confidence: **92.3%** (simple mean, 646 / 7).
- Every critical acceptance criterion directly proven: **No** — live AC-001–AC-006 and process/browser AC-010/AC-012–AC-015 remained.
- Applicable category below 90%: **Yes** — user-surface/browser at 88%.
- Default 95% clean target met: **No**.
- Broader validation decision: **Required**.
- Selected execution: checked-disposable built server + Nuxt, real imported Classroom Simulation Team, real Codex/`gpt-5.6-luna`, correlated WebSocket/API, AutoByteus browser `open_tab`, refresh/history reopen, process reopen and supported follow-up restore.

### Broader Validation Outcome Incorporated Into The Investigation

The required broader phase passed. The user-required `mcp__autobyteus_agent_tools__open_tab` path launched a fresh imported Classroom Team, selected Codex and `gpt-5.6-luna` (default medium reasoning), rendered the exact Professor response once before refresh, and rendered the identical response once after supported refresh/history reopen. A separate correlated real run proved wire sequences 1–48 contiguous, 26 exact live status messages without `member_address`, exact root/AgentRun correlation, and no Team admission/projection errors. The same isolated store survived process restart, presented the prior marker once through `open_tab`, and restored the exact inactive Team through a supported follow-up with identity and content preserved. Empty isolated-DB initialization only was used; operational data was neither inspected nor tested.

Authoritative broader evidence:

- `api-e2e-evidence/api-rev-001/live/browser/classroom-codex-open-tab-summary.json`
- `api-e2e-evidence/api-rev-001/live/provider/classroom-codex-live-wire-summary.json`
- `api-e2e-evidence/api-rev-001/live/browser/classroom-codex-process-reopen-open-tab-summary.json`
- `api-e2e-evidence/api-rev-001/live/browser/classroom-codex-process-reopen-followup-open-tab-summary.json`
- `api-e2e-evidence/api-rev-001/live/provider/classroom-codex-process-reopen-before-restore-comparison.json`
- `api-e2e-evidence/api-rev-001/live/provider/classroom-codex-process-reopen-restored-followup-comparison.json`
- `api-e2e-evidence/api-rev-001/environment/final-cleanup-verification.log`

Final scores are recorded in the execution report. No reroute was required. The final investigation decision is **proceed and report Pass**, with the one-path durable package returned to `code_reviewer` for proportional test-code review.

## Investigation Round 2 — User-Expanded Real Runtime Matrix

- Trigger: after `API-REV-001` Pass / 98%, the user explicitly required real `open_tab` coverage across all three supported runtime/model pairings, two Team fixtures, and standalone Daily Assistant.
- Planned revision: `API-REV-002`; the latest completed result remains API-REV-001 until this matrix finishes.
- Source basis: delivery checkpoint HEAD `06e67b78ca7d1843a2428c5f931c45029f8ed796`; production implementation remains the CRR-002-reviewed source (`548ff34a...` plus committed API-REV-001 test/evidence/docs only). CRR-003 proportional test review passed the one durable update.
- Prior evidence reviewed: API-REV-001 complete package, including one currentized durable integration test and the checked-disposable safety mechanism.

### Expanded Scope And Coverage Decision

| Scenario ID | Surface | Runtime / model | Required real target | Planned proof |
| --- | --- | --- | --- | --- |
| API-RUNTIME-TEAM-009A | Classroom Simulation Team | Codex / `gpt-5.6-luna` | Professor + Student | real browser launch, prompt, visible terminal output, exact persisted runtime/model; classroom peer handoff when model follows the explicit fixture instruction |
| API-RUNTIME-TEAM-009B | Classroom Simulation Team | AutoByteus / `deepseek-v4-flash` | Professor + Student | same |
| API-RUNTIME-TEAM-009C | Classroom Simulation Team | Claude Agent SDK / `deepseek-v4-flash` | Professor + Student | same |
| API-RUNTIME-NESTED-010A | Nested Classroom Test Team | Codex / `gpt-5.6-luna` | Teacher + StudentStudyGroup | real browser launch, nested task-Team delegation/result when fixture and model comply, visible terminal output, exact persisted runtime/model |
| API-RUNTIME-NESTED-010B | Nested Classroom Test Team | AutoByteus / `deepseek-v4-flash` | Teacher + StudentStudyGroup | same |
| API-RUNTIME-NESTED-010C | Nested Classroom Test Team | Claude Agent SDK / `deepseek-v4-flash` | Teacher + StudentStudyGroup | same |
| API-RUNTIME-AGENT-011A | standalone imported Daily Assistant | Codex / `gpt-5.6-luna` | exact AgentRun | real browser launch/send/output, persisted runtime/model |
| API-RUNTIME-AGENT-011B | standalone imported Daily Assistant | AutoByteus / `deepseek-v4-flash` | exact AgentRun | same |
| API-RUNTIME-AGENT-011C | standalone imported Daily Assistant | Claude Agent SDK / `deepseek-v4-flash` | exact AgentRun | same |

This is a **broader live-validation expansion**, not a production-source or durable-test gap. No repository-resident test addition/update/removal is planned in Round 2. The real provider matrix is credentialed, environment-dependent, and intentionally ticket-local. API-REV-001's durable package remains unchanged and has passed CRR-003 proportional review.

### Round-2 Environment And Safety Plan

- Use a new checked-disposable runtime, database, ports, workspace, and evidence root; do not reuse or inspect operational data.
- Sanitize ambient `DATABASE_URL` and `DATABASE_URL_TEST`.
- Initialize only an empty isolated DB; dry-run and then use the supported secret importer with `/Users/normy/.autobyteus/server-data/.env` targeting that exact DB. Never log values.
- Import `/Users/normy/autobyteus_org/autobyteus-agents` through the supported package API without source edits.
- Confirm actual runtime availability and model catalog before launches.
- Use AutoByteus `open_tab` for every browser row. Capture semantic DOM state, screenshots, exact run identity, persisted runtime/model, terminal status, message count, and server error audit.
- For Team rows, distinguish product capability from probabilistic LLM tool election: a model omitting an optional/asked peer or task call is a model-behavior observation unless the tool is absent/rejected/misrouted. The fixture instruction and public records will determine whether the collaboration call occurred.
- Clean only exact owned Teams/Agents, tab, PIDs, ports, runtime, DB, key, and sidecars. Operational DB and protected ports `60004/31004`: action NONE.

### Round-2 Confidence Gate

API-REV-001 already passed the ticket's critical requirements at 98%. Round 2 is not permitted to infer nine live Pass rows from provider-neutral repository evidence. Each row must be recorded `Pass`, `Fail`, or `Not Tested` from fresh real execution. An actual runtime rejection, routing failure, missing output, wrong persisted runtime/model, or browser failure is a new API/E2E failure and must be routed. Model non-election of a requested collaboration call is recorded separately from runtime capability unless the call is attempted and fails.

- Proceed to expanded execution: **Yes**.
- Durable coverage change planned: **No**.
- Broader validation: **Required by user and planned**.
- Reroute before execution: **No**.

## Investigation Round 2 Final Update — Real Runtime Matrix And Failure Origin

This section supersedes the Round-2 planned-result fields. The full nine-row user-expanded matrix executed through a real AutoByteus `open_tab` browser session on the checked-disposable target. Screenshots were captured and visually inspected; public GraphQL projections and exact run configuration were correlated for every row.

### Final Round-2 Coverage Adjudication

| Scenario | Fixture / runtime | Result | Direct evidence / adjudication |
| --- | --- | --- | --- |
| API-RUNTIME-TEAM-009A | Classroom / Codex / `gpt-5.6-luna` | Pass | Real Professor -> Student -> Professor `send_message_to`; exact `102`; browser and public projections clean. |
| API-RUNTIME-TEAM-009B | Classroom / AutoByteus / `deepseek-v4-flash` | **Fail — API-F-001** | Real file write rendered `Rejected FILE_CHANGE: file_change_id is required`. |
| API-RUNTIME-TEAM-009C | Classroom / Claude Agent SDK / configured `deepseek-v4-flash` | **Fail — API-F-001** | Business round trip completed with exact `184`, but the same Team FILE_CHANGE rejection rendered in the supported browser surface. |
| API-RUNTIME-NESTED-010A | Nested Classroom / Codex / `gpt-5.6-luna` | Pass capability | Real task-Team delegation, peer send/reply, exact result `43`; model omitted formal completion after successful messaging. |
| API-RUNTIME-NESTED-010B | Nested Classroom / AutoByteus / `deepseek-v4-flash` | Pass capability | Exact task student_one -> configured student_two -> exact task student_one -> teacher chain; result `51`. Initial persistent-recipient reply was a fixture/model targeting observation and the isolated test fixture was currentized to require exact incoming AgentRun reply. |
| API-RUNTIME-NESTED-010C | Nested Classroom / Claude Agent SDK / configured `deepseek-v4-flash` | Pass collaboration | Exact delegation and reverse-reply chain; result `45`. Provider-native `TaskOutput` selected an unknown provider task ID, but collaboration succeeded; per user clarification this is a nonblocking provider/model behavior observation, not a product finding. |
| API-RUNTIME-AGENT-011A | Daily Assistant / Codex / `gpt-5.6-luna` | Pass | Real standalone browser launch, Bash tool, exact final marker. |
| API-RUNTIME-AGENT-011B | Daily Assistant / AutoByteus / `deepseek-v4-flash` | Pass | Real standalone browser launch, approval, Bash tool, exact final marker. |
| API-RUNTIME-AGENT-011C | Daily Assistant / Claude Agent SDK / configured `deepseek-v4-flash` | Pass | Real standalone browser launch, Bash tool, exact final marker. |

Seven capability rows passed. The two failing Classroom rows share one source-boundary failure rather than two independent provider failures. `FileChangePayloadBuilder` emits the current internal `AgentRunFileChangePayload` as `id`/`type`/camel-case domain fields, while `TeamAgentEventAdapter` requires wire-shaped `file_change_id`/`file_type`. The existing `TeamAgentEventWebsocketProjector` is already the proper snake-case wire owner. The preliminary source classification is recorded at `api-e2e-evidence/api-rev-002/failure/api-f001-team-file-change-admission-analysis.md` and is routed to `code_reviewer` for focused failure-origin review.

### Round-2 Durable And Safety Decision

- Repository-resident durable coverage changed in Round 2: **No** (`0 added / 0 updated / 0 removed`).
- API-REV-001's one-path durable update remains historically valid and already passed CRR-003 proportional review.
- Operational database and `$HOME/.autobyteus`: **action NONE**. The authorized env file was read only by the supported importer targeting the exact isolated database; values were not recorded.
- Protected ports `60004/31004`: **action NONE**.
- Cleanup: every remaining owned active run was terminated through the public mutation; tab `8b0ced` was closed; owned ports `60419/31419`, processes, runtime, database, key, and sidecars were removed. Evidence: `api-e2e-evidence/api-rev-002/environment/final-owned-run-termination.json`, `final-cleanup-verification.log`, `owned-runtime-cleanup.json`.

### Final Round-2 Decision

- Result: **Fail** due critical supported Team browser FILE_CHANGE admission failure (`API-F-001`).
- Confidence: **88%**. Evidence directness, integration realism, environment fidelity, and standalone/collaboration proof are high; user-surface confidence is materially reduced by the reproducible red Team error.
- Broader validation: **Required and completed**.
- Recommended recipient: `code_reviewer` for focused failure-origin review.

## Investigation Round 3 — Post-IR-003 API-F-001 Resolution Recheck

- Trigger: `CRR-005 Pass`; source HEAD `00b471bc24e6a6d06d3af7c38cf9f50536af1b60`.
- Prior authoritative runtime result: `API-REV-002 Fail / 88%`.
- Prior open finding: `API-F-001` on `API-RUNTIME-TEAM-009B` and `API-RUNTIME-TEAM-009C`.
- Reviewed source resolution: the current internal `AgentRunFileChangePayload` remains canonical, `TeamAgentEventAdapter` admits only its exact internal fields, and the unchanged strict projector remains the sole snake-case wire owner.

### Coverage Validity And Execution Decision

| Existing evidence | Decision | Rationale / current plan |
| --- | --- | --- |
| IR-003 `team-agent-file-change-admission.test.ts` | Still Valid | Direct builder -> exact adapter -> strict projector proof; implementation-owned and source-reviewed. Re-execute with affected producer/segment tests. |
| API-REV-002 AutoByteus Classroom failure row | Needs Rerun | Exact real provider/browser row that exposed API-F-001; rerun first with a real file write and prove no red admission error. |
| API-REV-002 Claude Classroom failure row | Needs Rerun | Same shared boundary through the second actual provider; rerun immediately after AutoByteus. |
| API-REV-002 Codex Classroom, three Nested Classroom, and three Daily Assistant rows | Still Valid / targeted reuse | Production change is confined to Team FILE_CHANGE admission. Their collaboration, standalone, routing, and provider behavior is unchanged and remains direct real evidence. Repeat only if focused rows expose broader regression. |
| API-REV-001 refresh/reopen/recovery evidence | Still Valid | No lifecycle, status, history, recovery, or frontend source changed in IR-003. |

No API/E2E-owned durable coverage edit is planned. The implementation added a durable exact-boundary test, already reviewed in CRR-005. API/E2E will not duplicate it. Final live acceptance requires:

1. execute the exact 3-file/24-test affected selection;
2. start a new checked-disposable built target with sanitized ambient database variables;
3. import secrets only through the supported importer into that exact isolated DB and import the user-authorized Agent package through the public API;
4. use real AutoByteus `open_tab` for Classroom AutoByteus/`deepseek-v4-flash`, require a real `write_file`, inspect the screenshot, and correlate the exact public run/file-change projection and server error audit;
5. repeat for Classroom Claude Agent SDK/configured `deepseek-v4-flash`;
6. require zero `TEAM_AGENT_EVENT_ADMISSION_FAILED`, zero `file_change_id is required`, and at least one strict current file-change projection per row;
7. terminate exact owned runs, close the tab, stop ports/processes, and remove only the exact disposable runtime/DB/key/sidecars.

### Round-3 Pre-Execution Confidence

The source-reviewed deterministic boundary proof is strong, but API-F-001 was visible only in a real provider/Team/browser journey. Pre-live confidence is therefore **92%**, and broader validation is **Required**. A clean Pass requires both failed rows to pass; historical rows cannot substitute for either rerun.

## Investigation Round 3 Final Update — API-F-001 Closed Downstream

The user confirmed that this round should remain targeted to the previously failing FILE_CHANGE behavior. The planned focused scope completed without broad repetition.

| Scenario | Current execution result | Exact proof |
| --- | --- | --- |
| affected deterministic boundary | Pass — 3 files / 24 tests | current builder -> exact Team adapter -> strict projector; affected file-change producer; retained Team segment admission |
| API-RUNTIME-TEAM-009B | **Pass** | real AutoByteus/`deepseek-v4-flash` Team `write_file`; one current public file-change projection with exact AgentRun ID, `type=file`, `status=available`, `sourceTool=write_file`, nonempty invocation ID, exact content `AUTO_FILE_CHANGE_OK`; inspected browser marker `AUTOBYTEUS_FILE_CHANGE_FIXED`; zero prior/admission errors |
| API-RUNTIME-TEAM-009C | **Pass** | real Claude Agent SDK/configured `deepseek-v4-flash` Team `Write`; one current public file-change projection with exact AgentRun ID, `type=file`, `status=available`, `sourceTool=write_file`, nonempty invocation ID; exact physical isolated-file content `CLAUDE_FILE_CHANGE_OK`; inspected browser marker `CLAUDE_FILE_CHANGE_FIXED`; zero prior/admission errors |

Final server audit found `0` occurrences of both `file_change_id is required` and `TEAM_AGENT_EVENT_ADMISSION_FAILED`. Browser DOM and inspected screenshots were clean for the failure under test. Claude's unrelated provider-selected `Read` errors remain a nonblocking provider/model behavior observation under the user's prior clarification; they neither affected the file write nor indicate the Team adapter failure.

No API/E2E-owned durable coverage changed (`0 added / 0 updated / 0 removed`). API-REV-001 and the seven unaffected API-REV-002 capability rows remain valid because IR-003 changed only Team FILE_CHANGE admission.

Cleanup passed: zero active owned runs, zero browser tabs, zero listeners on 60420/31420, exact disposable runtime/database/key/sidecars removed, repository test DB residue removed, operational database action NONE, protected 60004/31004 action NONE.

Final Round-3 decision: **Pass / 98%**. API-F-001 is resolved downstream. Return to `code_reviewer` for the required proportional no-durable-change disposition before delivery.
