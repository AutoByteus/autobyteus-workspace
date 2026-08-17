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
