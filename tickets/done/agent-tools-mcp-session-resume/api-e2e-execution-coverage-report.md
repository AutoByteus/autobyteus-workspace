# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/design-spec.md`
- Supplemental Task Artifacts: causal reproduction, provider, lifecycle, browser, and round-1 through round-3 execution evidence under the ticket `evidence/` directory
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/solution-revision-record.md` (`SR-004`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/architecture-review-revision-record.md` (`ARCH-REV-005`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/implementation-revision-record.md` (`IR-002`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/code-review-revision-record.md` (`CRR-004`; implementation remains authoritative `CRR-002 Pass`)
- Triggering API/E2E Test Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/api-e2e-test-review-report.md`
- Delivery Revision Record: `N/A`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Execution Round: `3`
- Trigger: `CRR-004 Local Fix Fail` for `TR-F-003`
- Prior Round Reviewed: `API-REV-002 Pass / 97%`, with delivery suspended for proportional test review
- Latest Authoritative Round: `3`

## Investigation And Execution Basis

- Coverage investigation completed before round-3 durable edits and final execution: `Yes`; see “CRR-004 Local-Fix Re-entry Investigation.”
- Investigation plan followed: `Yes`. The shared contract was built, an ungated strict task-event test was added, the live file was migrated to the current DTO, both real mixed-task cases were attempted, and final build/audits/cleanup were executed.
- Existing coverage decisions revised during execution: `Yes`. The first live attempt showed that post-activation assertions must use the newly activated task execution IDs, not configured member IDs, and that one child-Team address was duplicated. These were classified in the investigation before the follow-up edits.
- Reroute required: `No`. All edits remained test-owned. Product source and the authoritative `CRR-002` implementation result were not reopened.
- Prior evidence validity: all round-1 product/browser/lifecycle evidence and round-2 complete individual provider evidence remain valid because round 3 changed only durable test code.

## Compatibility / Legacy Scope Check

- Requirements/design introduce or tolerate backward compatibility: `No`
- Compatibility-only implementation behavior observed: `No`
- Approved persisted-data transition followed without migration/fallback: `Yes — Not Affected`
- Durable coverage added or retained only for compatibility behavior: `No`
- Round-3 test compatibility branches: `Removed`; the mixed-task file contains zero retired task-event names, task arrays, flattened execution identifiers, or camel-case wire-field fallbacks.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement | Changed Boundary | Mode | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| API-SC-ROUTE-001 | deterministic headerless active route; local admission; inactive 404 | Fastify/MCP/session registry | durable real HTTP | Pass | `05`, `06`, `26` |
| API-SC-TEAM-001 | cancel/reject retain; accepted Team stop exact-removes/releases; same-ID restore twice | Team -> AgentRunManager -> resource/session | durable lifecycle | Pass | `05-team-agent-tools-lifecycle.log`, `26-final-focused-regression.log` |
| API-SC-LISTENER-001 | private loopback listener, main 404, shutdown | process/listener topology | durable real TCP | Pass | `06-studio-listener-gateway.log`, `26` |
| API-SC-GATEWAY-001 | external MCP gateway preserved | main gateway API | durable integration | Pass | `06`, `26` |
| API-SC-PROVIDER-001 | Codex/Claude receive explicit headerless descriptor | provider materialization | durable + live | Pass | `14`, `26`, `54`, `64` |
| API-SC-TEAM-DTO-001 / TR-F-001 | exact current Team websocket/projection run identity | GraphQL/WebSocket/current execution tree | durable live Codex | Pass, resolved | `54-live-codex-team-full-final.log` (5/5) |
| API-SC-TEAM-CONTRACT-001 / TR-F-002 | current-only GraphQL documents and recursive exact run-ID decoding | GraphQL schema/test helpers | ungated deterministic | Pass, resolved | `74-round2-final-build-contract-regression.log` |
| API-SC-TASK-CONTRACT-001 / TR-F-003 | current task-Agent/task-Team activation plus submitted/reviewed task changes | strict Team stream DTO | ungated durable | Pass, resolved | `77`, `78`, `81`, `83`, `84` |
| API-SC-TASK-LIVE-001 / TR-F-003 | actual supported delegation reaches current task event DTOs | real DeepSeek/Codex + GraphQL/WebSocket | live | Current DTO reached; aggregate non-clean | `80-live-mixed-task-current-events.log`, `82-live-mixed-task-current-events-rerun.log` |
| API-SC-CLAUDE-TEAM-001 | live Claude Team create/message/interrupt/nested/restore/projections | provider + GraphQL/WebSocket | live | Pass | `64-live-claude-team-full-final.log` (5/5) |
| API-SC-AUTOBYTEUS-TEAM-001 | live AutoByteus/DeepSeek Team tools/interrupt/restore/projections | provider + GraphQL/WebSocket | live | Pass | `67-live-autobyteus-deepseek-full-current.log` (5/5) |
| API-BROWSER-CLASSROOM-001 | imported public Classroom/Codex before/after Team stop/restore | browser -> API -> provider -> Agent Tools | browser live | Pass | screenshots `20-22`; `25-live-browser-validation.md` |
| API-BROWSER-NESTED-001 | imported private nested Classroom/DeepSeek route, task review, restore | browser -> nested Team/provider | browser live | Pass | screenshots `23-24`; `25-live-browser-validation.md` |
| API-PROBE-AUDIT-001 | no retired DTO/lifecycle symbols; clean generated/temp/process/secret state | source/filesystem/process | audit | Pass | `27`, `75`, `84-round3-final-audits-cleanup.log` |

## Additional Repository Coverage Execution

| Order | Command / Configuration | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts prepare:shared`; team-stream contract build | current shared imports | Pass | `76-round3-prepare-shared.log` |
| 2 | ungated task-event contract plus mixed-task gated collection | exact current task-Agent/task-Team/TASK_CHANGED DTOs | contract 2/2 passed; live file 2 skipped when capability gate was absent | `77`, `78`, `81` |
| 3 | first real mixed-task file attempt with isolated app data/vault and DeepSeek/Codex | actual current activation and exact task-run identity | current task-Agent activation reached; test-owned identity/address problems found and fixed after classification | `80-live-mixed-task-current-events.log` |
| 4 | complete real mixed-task file rerun with both cases | actual current task events | both current activation DTOs reached; current TASK_CHANGED observed; separate notification waits and failed-case cleanup hooks remained non-clean | `82-live-mixed-task-current-events-rerun.log` |
| 5 | `pnpm exec vitest run` for current task contract, mixed-task collection, and notification projection unit | ungated contract, gated collection, dedicated notification behavior | 2 files passed / 1 skipped; 5 passed / 2 skipped | `83-round3-final-bounded-regression.log` |
| 6 | `pnpm exec tsc -p tsconfig.build.json --pretty false` | production TypeScript build | Pass | `78`, `83` |
| 7 | diff, forbidden wire-symbol, generated/temp/process, secret-value audit | clean final test/evidence state | Pass | `84-round3-final-audits-cleanup.log` |

The unchanged broad repository baseline is not claimed globally green. The stale V1 execution-tree migration fixture in `tests/unit/services/agent-streaming/team-execution-view-projector.test.ts` still fails during import against the current V2 validator when included in `77`; the new ungated current contract is independent of that baseline.

## Validation Confidence Scorecard

| Confidence Category | Post-Repository | Final | Supporting Evidence | Residual Uncertainty |
| --- | ---: | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 99% | 99% | all original critical criteria direct; TR-F-001/002/003 resolved | none material |
| Changed-boundary execution directness | 98% | 98% | strict shared parser, ungated task DTOs, real task-Agent/task-Team activation | no material DTO gap |
| Cross-boundary integration realism and mock gap | 95% | 95% | real Codex, Claude, AutoByteus/DeepSeek, GraphQL, WebSocket, browser, and mixed-task attempts | aggregate live notification wait remains non-clean |
| Environment, configuration, identity, and fixture fidelity | 97% | 97% | isolated app data/vault, current execution tree, exact activated run IDs, imported package journeys | no material identity gap |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | 98% | reject/cancel/stop/restore/inactive 404/shutdown/gateway and honest live failure capture | failed-case mixed-task cleanup exceeded bounded hooks |
| User-surface, browser, and desktop-shell confidence | 96% | 96% | requested public and nested Classroom browser journeys remain valid | unchanged Electron-native shell not launched |
| Durable regression coverage quality and relevance | 95% | 95% | zero fallback branches and ungated strict task-event test; focused projection unit passes | aggregate live LLM behavior is not fully deterministic |

- Overall post-repository confidence: `97%`
- Overall final confidence: `97%`
- Calculation: simple average, rounded
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below 90%: `No`
- Default 95% target met: `Yes`
- Confidence-limiting residual: the full mixed-task aggregate is not green on a separate websocket notification assertion and failed-case cleanup, and the broad repository baseline remains stale in unrelated fixtures.

## Broader Validation Decision And Execution

- Decision: `Required — completed`
- Round 1: real Codex standalone/Team plus the explicitly requested browser development stack with imported `/Users/normy/autobyteus_org/autobyteus-agents` and `/Users/normy/autobyteus_org/autobyteus-private-agents`; public Classroom/Codex and nested Classroom/AutoByteus/DeepSeek v4 Flash passed before/after stop/restore.
- Round 2: complete individual Codex, Claude, and AutoByteus/DeepSeek Team files passed 5/5 each.
- Round 3: both real mixed-task cases were attempted with the available DeepSeek v4 Flash/Codex capability, using isolated application data and secret identifiers imported from `/Users/normy/.autobyteus/server-data/.env` without recording values.
- Browser rerun in round 3: `Not Required`; no product or web source changed after the passing requested browser journeys.

| Journey | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| public Classroom/Codex | inter-agent response before and after Team stop/restore | observed with stable Team/member identities | `20-22`, `25` | Pass |
| private nested Classroom/DeepSeek | nested route/task lifecycle before stop and same route after restore | observed; task accepted; no session unavailable | `23-25` | Pass |
| current full Codex Team | five current create/send/nested/restore/projection cases | 5/5 | `54` | Pass |
| current full Claude Team | five current route/interrupt/nested/restore/projection cases | 5/5 | `64` | Pass |
| current full AutoByteus/DeepSeek Team | five current route/tool/interrupt/restore/projection cases | 5/5 | `67` | Pass |
| current mixed task-Agent | supported delegation emits current activation and later task change | current `TASK_AGENT_ACTIVATED` and `TASK_CHANGED` observed; test stopped at separate missing websocket notification | `82` | Current DTO proven; aggregate not clean |
| current mixed task-Team | supported delegation emits current Team activation | current `TASK_TEAM_ACTIVATED` and exact task-Team member run observed; test stopped at separate missing websocket notification | `82` | Current DTO proven; aggregate not clean |

The mixed-task aggregate is explicitly not reported as passing. The provider emitted its internal system-task-notification signal, but the Team websocket assertion did not observe `SYSTEM_TASK_NOTIFICATION`; after each failed case, Team/provider teardown exceeded the bounded hook. Dedicated notification projection coverage passed 3/3 in `83`. This residual is separate from the `TR-F-003` task-event wire contract and is not a unique proof path for an original ticket acceptance criterion.

## Desktop Application Validation

- Approach: browser-based web-equivalent renderer against the real development backend; no Electron instance was disturbed.
- Proven: package import visibility, runtime/model selection, Team event streams, tool approval, termination/offline, persisted-history continuation, nested Team task result/review.
- Shell-specific boundary: no preload/IPC/window/packaging source changed; server/listener lifecycle was directly tested.
- Not claimed: Electron-native window/preload/IPC behavior.

## Platform / Runtime Targets

- macOS 26.5.2, Apple Silicon
- Node.js 22.23.1; pnpm 10.28.2; Vitest 4.0.18
- Codex App Server, Claude Agent SDK, and AutoByteus `deepseek-v4-flash` exercised live across retained rounds
- Browser: Chromium-based AutoByteus browser tool, desktop viewport, Europe/Berlin timezone

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data: persisted Team history and immutable Team/member run IDs across stop/restore.
- Result: history remained directly usable; route identity was recomputed and fresh active state was published.
- Migration: `N/A`; no Agent Tools schema/file/dual reader was added.
- Version-specific compatibility fallback observed: `No`

## Tests Implemented Or Updated

| Path | Change | Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Updated | current strict task-Agent/task-Team/TASK_CHANGED WebSocket DTO | collected cleanly under gate; both live cases attempted and reached current activation | no retired wire names/fields/fallbacks |
| `tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts` | Added | ungated shared strict task-event contract | 2/2 passed repeatedly | covers Agent activation, Team activation, submitted and reviewed TASK_CHANGED records |

Round-1 and round-2 durable coverage listed in the investigation remains relevant and unchanged in round 3.

## Tests Removed As Stale Or Obsolete

Round 3 removed no test file or scenario. The retired task-event predicates and compatibility extraction branches were removed from the live mixed-task file and replaced in place by the current strict DTO assertions. The round-1 obsolete releaser fixture remains removed and replaced by exact-run deactivator coverage.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Added: `tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts`
- Updated: `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`
- Removed paths: `None in round 3`
- Added/updated paths attached for proportional review: `Yes`
- Diff/audit evidence: `83-round3-final-bounded-regression.log`, `84-round3-final-audits-cleanup.log`

## Other Execution Artifacts

| Artifact | Purpose | Status |
| --- | --- | --- |
| `76-round3-prepare-shared.log` | shared contract preparation | retained |
| `77-round3-task-contract-focused.log` | first ungated contract/focused run and stale baseline isolation | retained |
| `78-round3-contract-collection-build.log` | contract/collection/build | retained |
| `80-live-mixed-task-current-events.log` | first live current-event attempt | retained |
| `81-round3-followup-contract-collection.log` | post-identity-fix deterministic check | retained |
| `82-live-mixed-task-current-events-rerun.log` | final complete live attempt of both cases | retained |
| `83-round3-final-bounded-regression.log` | final deterministic regression/build | retained |
| `84-round3-final-audits-cleanup.log` | final source/cleanup/secret audit | retained |

All are under `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/evidence/api-e2e/`.

## Temporary Execution Methods / Scaffolding

| Method | Why | Result | Cleanup |
| --- | --- | --- | --- |
| generated shared/server build outputs | required contract imports and production compile | passed | untracked/task-created outputs removed; tracked contract output restored cleanly |
| isolated application data/vault/workspaces | real providers without user-profile collision | current DTOs reached | all six failed-attempt temporary directories removed |
| task-owned provider/server processes | real WebSocket/provider boundary | current task DTOs reached | zero process with task worktree cwd in final audit |

## Dependencies Mocked Or Emulated

- The ungated contract test uses deterministic DTO fixtures admitted by the production shared strict parser.
- The dedicated notification projection unit uses a fake AgentRun backend to prove one local system notification and no member-input echo.
- Real Codex, Claude, DeepSeek, GraphQL, WebSocket, listener, lifecycle, and browser runs close the material external-boundary gap. No critical acceptance criterion is supported only by a mock.

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | `TR-F-003`, API-SC-TASK-CONTRACT-001 | strict current task event assertions, ungated coverage, build, and audits pass; both real live cases reached current activation DTOs |
| Pass | original ticket critical scenarios | retained real HTTP/listener/lifecycle/provider/restore/browser evidence remains direct and valid |
| Not clean, non-blocking residual | API-SC-TASK-LIVE-001 and prior aggregate model files | separate notification wait/failed-case cleanup and model orchestration are explicit; no aggregate file is mislabeled as passing |
| Existing baseline residual | broad repository suites and stale V1 projector fixture | unrelated current-repository baseline is not claimed globally green |
| Out of scope | Electron-native shell; hostile same-user local process | unchanged/accepted design boundaries |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| six mixed-task temporary app-data/workspace directories | task-owned | removed after timed-out hooks | Pass |
| generated app SDK/server/AutoByteus outputs | task-owned | removed; tracked team-stream output restored to clean state | Pass |
| real test runtimes/processes | task-owned | verified no node/codex process with task-worktree cwd | Pass |
| evidence secret values | task-owned evidence | scanned 83 text artifacts against secret-valued environment entries without printing values | Pass; zero matches |

## Preliminary Classification

- `TR-F-003`: resolved `Local Fix` owned by `/api_e2e_engineer`.
- Live mixed-task residual: existing separate notification-stream/cleanup behavior plus external provider orchestration; honestly retained, not a product-source finding for this ticket and not a unique critical path.
- No requirement, design, architecture, or implementation-source reroute is recommended.

## Recommended Recipient

`/code_reviewer` — repeated proportional review of the two round-3 durable test paths before delivery.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: `97%`
- Default 95% confidence target met: `Yes`
- Any final applicable category below 90%: `No`
- Broader validation decision: `Required — completed`
- Critical acceptance criteria lacking direct proof: `None`
- Required next recipient: `/code_reviewer`
- Notes: `TR-F-003` is resolved without reopening product source. The full live mixed-task file is not claimed to pass; the exact current task events it was rerun to validate were reached, while a separate notification assertion and failed-case cleanup remained non-clean. All residuals and cleanup are recorded explicitly.
