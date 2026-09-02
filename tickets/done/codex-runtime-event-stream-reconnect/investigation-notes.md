# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Complete — requirements approved; SR-003 design-impact rework ready for architecture re-review`
- Investigation Goal: Identify why a Codex App Server turn continues executing while AutoByteus reports reconnect errors and stops rendering its messages, then establish the smallest evidence-backed correction boundary.
- Scope Classification (`Small`/`Medium`/`Large`): `Small`
- Scope Classification Rationale: The investigation crossed the runtime, backend, persistence, and frontend to rule out transport/replay causes, but the proven defect is a local Codex-adapter classification error plus terminal-boundary cleanup behavior and focused coverage.
- Scope Summary: Correct native Codex retry-error handling for active turns; preserve real terminal errors and the existing common stream/UI lifecycle.
- Primary Questions To Resolve: Resolved—identified the exact run/turn, origin and meaning of the retry text, whether Codex completed, where AutoByteus stopped the turn, what data was lost, whether generic WebSocket/UI handling is faulty, and whether storage migration or refactor is required.

## Request Context

The user reported that a Codex App Server-backed GPT-5.6-Sol agent visibly opened the requested Droplet UI, proving execution continued, while the product conversation showed repeated `An Error Occurred — Reconnecting… n/5` cards and no later messages. The Activity pane contained prior tool events and the run later appeared idle.

Reference images:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_b6bee632b58b460e94b49b9d0b7a8eaa/solution_designer_4213a62bbbf441619d9801987d020d4a/context_files/ctx_083a9a29007f__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_b6bee632b58b460e94b49b9d0b7a8eaa/solution_designer_4213a62bbbf441619d9801987d020d4a/context_files/ctx_71b537ae5539__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_b6bee632b58b460e94b49b9d0b7a8eaa/solution_designer_4213a62bbbf441619d9801987d020d4a/context_files/ctx_59325e1021e1__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git` monorepo
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect`
- Current Branch: `codex/codex-runtime-event-stream-reconnect`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67`
- Bootstrap Base Branch: `origin/personal` at `5fb16658e7bd2aefd750f99eb596a17382e161ac` (`docs(delivery): record v1.4.66 release completion`)
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-09-02 before the worktree was created.
- Task Branch: `codex/codex-runtime-event-stream-reconnect`, tracking `origin/personal`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal` through the delivery workflow
- Bootstrap Blockers: None
- Notes For Downstream Agents: The user's shared checkout contained unrelated changes and was not used for authoritative task edits. One unchanged baseline test was executed there only because the isolated worktree intentionally has no installed dependencies; hashes established that the tested source and test file matched this worktree exactly.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/runtime-evidence.md` | Durable production evidence supplement | Exact run/turn identity, retry and completion timeline, AutoByteus trace divergence, installed Codex protocol, and localized fault chain | Requirements, investigation notes, design spec | `REQ-001`, `REQ-002`, `REQ-003`; `AC-001`, `AC-002`, `AC-003` | `Complete` | `N/A` — evidence only | Keep aligned and include in all downstream handoffs |

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-09-02 | Setup | `git fetch origin personal`; `git worktree add -b codex/codex-runtime-event-stream-reconnect ... origin/personal` | Establish fresh isolated task workspace | Worktree created from refreshed `origin/personal` at `5fb16658e` | No |
| 2026-09-02 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/SKILL.md`, templates, and `design-principles.md`; `autobyteus-server-ts/AGENTS.md` | Apply workflow and repository constraints | Mandatory core artifacts, explicit approval gate, revision record, and pnpm/Vitest conventions identified | Read design-spec template again after approval |
| 2026-09-02 | Other | Three user screenshots listed in Request Context | Establish observed mismatch | Run suffix `1FC3`; Codex App Server/GPT-5.6-Sol; retry cards `2/5` through `5/5`; activity still present; final shown status idle | Resolved with retained data |
| 2026-09-02 | Data | Retained run index and `/Users/normy/.autobyteus/server-data/memory/agents/codex_45ce1b9e80ea42db869dc86615d51fc3/run_metadata.json` | Resolve screenshot to exact production run | Runtime, model, workspace, thread id, and run id positively identified | No |
| 2026-09-02 | Command | Process inspection with `ps`, `lsof`, executable `--version`, and current working directory | Confirm live runtime process and version | Codex app-server process for the run remained alive in the reported workspace; installed CLI is `0.152.1` | No |
| 2026-09-02 | Log | SQLite queries against `/Users/normy/.codex/logs_2.sqlite`, table `logs`, exact thread and `1788349160..1788349260`, especially target `codex_core::responses_retry` | Determine the origin and reality of reconnect errors | Codex Responses WebSocket disconnected and retried `1/5` through `5/5`; it then continued over Responses HTTP | No |
| 2026-09-02 | Trace | `/Users/normy/.codex/sessions/2026/08/25/rollout-2026-08-25T13-52-45-01a038c4-03c6-7a83-80cb-10a99331ae18.jsonl`, filtered for turn `01a061ea-d7b6-7123-99c5-a19070bfa97e` | Verify whether the runtime actually continued/completed | Same turn reasoned, ran two successful commands, confirmed the tunnel reachable, emitted a final answer, and completed at 11:40:42 UTC | No |
| 2026-09-02 | Trace | `/Users/normy/.autobyteus/server-data/memory/agents/codex_45ce1b9e80ea42db869dc86615d51fc3/raw_traces_active.jsonl`, exact turn filter | Compare application-owned persisted projection to Codex truth | File had 155 records/158,455 bytes; reported turn had exactly one record, the user input; all later runtime events were absent | No |
| 2026-09-02 | Log | `/Users/normy/.autobyteus/server-data/logs/server.log`, filtered for run id, `CodexSegmentTurnAdmissionRejected`, and WebSocket/session messages | Identify why later events disappeared and rule out browser/server disconnection | Same run repeatedly rejected later item/message events as `CODEX_SEGMENT_TURN_INACTIVE`; log also records successful agent WebSocket attachments | No |
| 2026-09-02 | Spec | Installed CLI command `codex app-server generate-ts --experimental --out /tmp/codex-schema-4B1gQo` | Verify the exact supported native error contract locally | v2 `ErrorNotification` requires `error`, `willRetry`, `threadId`, and `turnId`; `TurnError` carries message and provider error info | Disposable `/tmp` output need not be retained |
| 2026-09-02 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | Find Codex native notification state mutation | Native `error` branch ignores `willRetry`, unconditionally marks the resolved turn failed, and rewrites it as terminal | Change target |
| 2026-09-02 | Code | `.../thread/codex-thread.ts`; `.../thread/codex-segment-turn-admission.ts` | Trace the consequence of false failure | `markTurnFailed` clears active turn/pending MCP calls; later governed events require the active exact turn and are rejected without it | Preserve active turn for diagnostics |
| 2026-09-02 | Code | `.../events/codex-thread-lifecycle-event-converter.ts`; `.../events/codex-thread-event-converter.ts` | Inspect conversion and structural cleanup | Every Codex error currently closes all reasoning and clears all ordered-tool state, including errors that should be diagnostic | Change target |
| 2026-09-02 | Code | `agent-run-error-evidence.ts`; `agent-turn-lifecycle-state.ts`; `lifecycle-status-event-transformer.ts`; `agent-run-event-message-mapper.ts` | Check common canonical diagnostic semantics | `TURN_DIAGNOSTIC` intentionally leaves lifecycle running and maps to turn/diagnostic wire fields | Reuse unchanged |
| 2026-09-02 | Code | `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts`; `AgentStreamingService.ts`; `agentStreamMessageProjector.ts` | Check client handling | Frontend diagnostic errors append an error segment but do not mark the conversation complete; terminal errors do | Reuse unchanged |
| 2026-09-02 | Code | `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts`; `agent-run-view-projection-service.ts` | Determine whether native Codex history repairs missing normal UI history | Provider states normal UI history uses only the local application replay trace; Codex native history provider is diagnostic-only | Historical backfill out of scope |
| 2026-09-02 | Test | `pnpm exec vitest run tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` in the shared checkout after matching relevant file hashes | Confirm current focused baseline without altering authoritative worktree | 37/37 existing Codex thread tests passed; current suite asserts terminal errors but has no `willRetry: true` case | Add focused retry coverage during implementation |
| 2026-09-02 | Test | Attempted the three focused suites in the isolated worktree via a temporary dependency symlink | Assess isolated baseline readiness | Vitest loaded, but workspace-package imports were unavailable because task worktree dependencies/build outputs are not installed; temporary symlink was removed and no task source changed | Implementation engineer should prepare dependencies before checks |
| 2026-09-02 | Doc | `design-review-report.md` (`ARCH-REV-001`, `AR-F-001`) plus code verification in `codex-turn-event-converter.ts`, `codex-reasoning-event-normalizer.ts`, `codex-reasoning-block-tracker.ts`, and `codex-ordered-tool-boundary-tracker.ts` | Resolve architecture-review Design Impact on late old-turn terminal cleanup | `CodexThread.markTurnFailed(A)` correctly protects active B, but the current error converter independently clears all B tracker state. Existing turn-completion hooks already support exact-turn reasoning/tool cleanup and can be reused in the lifecycle converter. | Resolved in revised `DS-004` and `SR-002`; architecture re-review required |
| 2026-09-02 | Doc / Code | `design-review-report.md` (`ARCH-REV-002`, `AR-F-002`); `lifecycle-status-event-transformer.ts`; `agent-turn-lifecycle-state.ts`; `agent-run-event-message-mapper.ts`; `agentStreamMessageProjector.ts`; `agentStatusHandler.ts`; `segmentHandler.ts` | Continue the approved late-A/active-B path through canonical streaming and live projection | Canonical lifecycle correctly leaves B running but preserves and streams the stale A terminal event first. Frontend terminal handlers ignore `turn_id`, complete/terminalize the latest B message/tools, and later B content can split into a second response. | Resolved in revised `DS-002`/`DS-003` and `SR-003`; architecture re-review required |
| 2026-09-02 | Code | `codex-thread-notification-handler.ts`; `codex-thread.ts`; `codex-agent-run-backend.ts`; `codex-thread-event-converter.ts`; `AgentRun`; `AgentRunEventMessageMapper`; `autobyteus-web/vitest.config.mts`; `guard-web-boundary.mjs`; `agentStreamMessageProjector.ts` | Choose an ownership-correct containment point and a feasible end-to-end regression seam | `CodexThread` has both exact native event turn identity and the current active turn before emission. Existing `CodexNotificationHandlingResult` can suppress a stale native boundary without a new API. A test-only cross-workspace Nuxt integration can join real server thread/backend/AgentRun/mapper owners to the production frontend projector without adding a production dependency or changing the web boundary guard. | Target design: Codex-local suppression plus one joined stream-to-projection integration |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| `BEH-001` | Contract / System | Codex v2 emits `error` with `{ error, willRetry, threadId, turnId }` while an accepted turn is active | Codex app-server -> `CodexClientThreadRouter` -> `CodexThread.handleAppServerNotification` -> `handleAppServerNotification` -> unconditional `markTurnFailed` + rewritten terminal error | Even `willRetry: true` clears active turn and marks thread `ERROR`; upstream continues independently | Generated `ErrorNotification.ts`; handler/thread source; Codex retry/completion evidence |
| `BEH-002` | User / System | The retrying Codex turn later emits reasoning, item/tool, assistant-message, and completion notifications | Later native events -> `CodexThread` segment admission -> rejection when `activeTurnId` is null -> no converter/AgentRun/trace/WebSocket/UI event | Runtime work occurs but normal AutoByteus conversation and replay trace omit it | Codex rollout versus application trace; server rejection logs; screenshots |
| `BEH-003` | Contract | Non-retryable/terminal turn error, failed thread status, runtime-global client closure, or a late identified completion/error for retired A while B is active | Matching terminal path marks error and clears active/pending state. The thread guard leaves B intact for an A boundary, but the A terminal/completion is still converted, persisted, streamed, and applied by turn-blind frontend terminal handlers to the latest B response | Genuine matching/runtime-global failures remain terminal. Current code does not yet protect B's live projection from stale identified A terminal facts | Handler/thread, lifecycle transformer, mapper, frontend handler/projector source; `ARCH-REV-002` / `AR-F-002` |

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Local Implementation Defect`
- Refactor posture evidence summary: The correct owners and shared abstractions already exist. The native notification handler should classify provider intent and suppress only an explicitly identified stale Codex terminal boundary before emission; the Codex lifecycle converter should apply identity-scoped structural cleanup to emitted turn terminals. Common lifecycle/frontend consumers already implement same-turn diagnostics, but the frontend terminal projection is turn-blind. Containing the Codex-only stale fact where exact native and active identities coexist avoids a new subsystem and avoids broadening shared/non-Codex behavior.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Native handler | One branch converts native error terminality and mutates thread state, but ignores one required upstream boolean | Correct owner, incorrect local condition | Design exact diagnostic/terminal branch |
| Codex lifecycle converter | Error conversion couples event creation with unconditional terminal boundary cleanup | Existing boundary remains healthy if cleanup becomes effect-aware | Cover reasoning/tool preservation |
| Common AgentRun lifecycle | Diagnostic evidence is already a first-class state that does not terminalize the turn | Reuse; no shared refactor needed | Regression coverage only |
| Frontend handler | Diagnostic rendering is distinct from terminal completion, but terminal error/completion handlers ignore `turn_id` and mutate the latest response | Shared frontend behavior is unsafe for a stale Codex A event, but need not be generalized if that unsupported projection input is contained by the Codex identity owner | Keep frontend production code unchanged; prove it receives only the B stream in the full-path regression |
| Run history architecture | Normal UI replay is application-owned and cannot recover discarded native events | Prospective fix is sufficient; historical repair would be separate scope | State data limitation explicitly |
| Architecture review `AR-F-001` | A turn-terminal error carries exact A identity, yet the original design retained run-wide converter cleanup that could damage active B | The existing converter owner remains correct, but cleanup selection must use scope, effect, and identity | Revised design uses turn-boundary hooks for exact turn terminal and all-scope hooks only for runtime-global/unclassified errors |
| Architecture review `AR-F-002` | A terminal/completion event for A survives thread/converter guards, is streamed before a B-running status, and turn-blind frontend handlers complete B | The earliest boundary with both authoritative identities is the existing Codex notification handler; suppress the stale boundary there rather than add frontend runtime-specific policy | Add explicit stale-boundary predicate, no-emission semantics, and one joined native-to-live-projection integration |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/stores/agentRunStore.ts` | User send workflow and stream connection | Existing follow-up send uses one durable run/message identity | Must remain unchanged; provider retry must not resubmit |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Standalone WebSocket command ingress and event egress | Connection was attached; no evidence of transport failure | Off-spine for implementation; no reconnect change |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | Codex backend adapter facade and source event subscription | Carries thread events into the canonical AgentRun pipeline | Thin facade; reuse unchanged |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts` | Routes native app-server notifications to the owning Codex thread | Thread routing succeeded for later events | Reuse unchanged |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | Applies native notification lifecycle/state mutations and decides native/local emission | Unconditionally terminalizes native `error`; also emits explicitly stale A terminal error/completion/failed-status facts even when B is current | Primary classification and Codex-local stale-boundary containment owner |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Owns active turn, status, pending MCP correlation, admission, and notification emission | `markTurnFailed`/`markTurnCompleted` correctly refuse mismatched A, but the handler still emits A afterward | Keep public/state APIs unchanged; handler must stop the stale boundary before listener emission |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-segment-turn-admission.ts` | Enforces exact active-turn identity for item/message events | Correctly rejects when false terminalization has removed identity | Preserve invariant; later events should be admitted by preserving identity |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-lifecycle-event-converter.ts` | Maps thread/error events to canonical AgentRun events and terminal boundaries | Closes all reasoning and clears all ordered tools for every error | Make cleanup conditional on terminal effect |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts` | Maintains reasoning and ordered-tool trackers across conversions | Provides existing cleanup hooks | Reuse; no new tracker owner |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-error-evidence.ts` | Resolves canonical terminal versus diagnostic error evidence | Correctly recognizes turn diagnostics | Reuse unchanged |
| `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.ts` | Governs canonical turn/run lifecycle | `TURN_DIAGNOSTIC` intentionally leaves running state intact | Reuse unchanged |
| `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` | Maps canonical events to WebSocket payloads | Correctly preserves exact A identity, but cannot by itself prevent turn-blind projection | Reuse unchanged; stale A must never reach this boundary |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | Applies streamed errors/completions to conversation state | Diagnostic is nonterminal; terminal error and completion ignore `turn_id`, terminalize latest B tools/message, and mark B complete | Reuse unchanged only because Codex-local containment removes stale A events before canonical streaming |
| `autobyteus-web/services/agentStreaming/agentStreamMessageProjector.ts`; `handlers/segmentHandler.ts` | Dispatch wire events and join later segments into the current incomplete AI response | Running status does not undo `isComplete`; later B content creates/splits a new response after stale A terminalization | No production edit; include as the consumer half of the joined A/B regression |
| `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts` | Diagnostic-only native Codex thread projection | Explicitly not used for normal UI history | No historical repair through this task |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | Codex thread state/notification coverage | Has terminal/old-turn cases, no retryable native error case | Extend |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Codex-to-AgentRun conversion coverage | Covers terminal and unclassified errors, not diagnostic boundary preservation | Extend |
| `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts` | Canonical lifecycle/WebSocket behavior | Already proves generic diagnostic remains running and terminal later errors | Existing evidence; update only if downstream coverage investigation finds a gap |
| `autobyteus-web/tests/integration/codex-stale-turn-boundary-projection.integration.test.ts` | Proposed test-only cross-workspace native-to-live-projection regression | No current joined test drives late A facts through the Codex containment owner and actual AgentRun mapper into the production frontend projector | Add one deterministic in-process test with a fake native client but real `CodexThread`, backend, `AgentRun`, mapper, and `dispatchAgentStreamMessage`; no production frontend dependency/change |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-09-02 | Trace | Exact turn filter over Codex rollout and AutoByteus raw trace | Codex completed with two successful commands and final answer; AutoByteus persisted only user input | Product projection, not runtime execution, failed |
| 2026-09-02 | Probe | SQLite exact-thread/time query for `codex_core::responses_retry` | Five provider response-WebSocket disconnect retries, followed by HTTP sampling | `Reconnecting...` is an upstream retry diagnostic, not UI WebSocket reconnect |
| 2026-09-02 | Probe | Generate v2 TypeScript schema from installed Codex `0.152.1` | `willRetry: boolean` is required and authoritative in `ErrorNotification` | Adapter must classify by this field |
| 2026-09-02 | Trace | Server log exact run filter | Later item/message events rejected due inactive turn; separate WebSocket attached messages exist | False state mutation causes event loss; generic transport is not the fix |
| 2026-09-02 | Test | Existing exact-matching Codex thread unit suite | 37/37 passes without a retryable-error case | Existing coverage validates terminal behavior but misses production contract branch |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None needed. The authoritative installed Codex app-server binary generated its own version-matched v2 TypeScript contract.
- Version / tag / commit / freshness: `codex-cli 0.152.1`, installed and used by the reported process on 2026-09-02.
- Relevant contract, behavior, or constraint learned: Native `ErrorNotification` always declares `willRetry`, `threadId`, and `turnId`; provider-stream error variants are explicit in `CodexErrorInfo`.
- Why it matters: The local adapter can distinguish transient retry diagnostics from terminal errors without parsing display text such as `Reconnecting... 3/5`.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No new external setup was needed for root-cause proof because the exact live run and retained runtime/application logs were available. Implementation validation should use the existing fake Codex client/thread harness and focused event sequences; broader API/E2E ownership remains downstream.
- Required config, feature flags, env vars, or accounts: Existing Codex App Server integration; no new flags. The raw-runtime debug flag was not required because persisted Codex rollout/logs and application trace were sufficient.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation; disposable protocol generation under `/tmp`; temporary dependency symlink for a failed isolated test attempt.
- Cleanup notes for temporary investigation-only setup: Temporary dependency symlink removed. Generated `/tmp/codex-schema-4B1gQo` is disposable and not part of the task package. No production data was changed.

## Findings From Code / Docs / Data / Logs

1. **The runtime did not fail.** Codex retried its model response WebSocket five times, switched to HTTP, executed the user request, emitted a final answer, and completed the same turn.
2. **The visible retry text is not an AutoByteus client WebSocket reconnect.** It aligns exactly with `codex_core::responses_retry` logs; AutoByteus also recorded attached WebSocket sessions for the run.
3. **AutoByteus misclassifies a required upstream contract field.** The native error handler ignores `willRetry` and forces every turn-associated error to terminal.
4. **The false terminal transition destroys the identity needed for correct event admission.** `markTurnFailed` clears `activeTurnId`; later Codex item/message events are therefore rejected by the exact-turn admission guard.
5. **Conversion adds a second terminal side effect.** The lifecycle converter force-closes reasoning blocks and clears ordered-tool correlation for every error, which is invalid for a retry diagnostic even after active-turn preservation is fixed.
6. **Downstream diagnostic behavior already exists and is correct.** Canonical lifecycle stays running for `TURN_DIAGNOSTIC`, WebSocket mapping preserves the effect, and the frontend appends a diagnostic without marking the conversation complete.
7. **The failed tool card is unrelated.** The reported turn's Codex rollout demonstrates successful command execution; per-tool error display must remain independent.
8. **Normal UI history cannot reconstruct discarded events from Codex automatically.** It is sourced from the local application replay trace, which lacks the missing records. A repair/backfill feature would be a separate requirement.
9. **Terminal converter cleanup must also respect turn identity.** Architecture review `AR-F-001` identified that a late terminal error for retired A can be rejected by `markTurnFailed(A)` while the converter still closes reasoning and clears ordered-tool state for active B. Existing `closeReasoningBlocksForBoundary(payload)` and `clearOrderedToolsForBoundary(payload)` already provide the required exact-turn behavior; runtime-global and genuinely unclassified errors retain run-wide cleanup.
10. **A guarded state mutation is not sufficient if the stale fact is still projected.** `AR-F-002` verified that a late terminal/completion A is preserved through canonical lifecycle and the wire, while frontend `handleTurnCompleted`/terminal `handleError` ignore A identity and complete the current B response. The following B-running status does not reverse `isComplete`.
11. **The existing Codex notification boundary is the proportionate containment owner.** Before mutating or emitting, it can compare an exact event turn id with `CodexThread.activeTurnId`. Suppressing only an explicit stale turn-terminal/completion/failed-status boundary here prevents converter, trace, WebSocket, and frontend side effects without changing shared or non-Codex semantics.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Per-run JSONL replay traces under `/Users/normy/.autobyteus/server-data/memory/agents/<run-id>/raw_traces*.jsonl`. The affected active trace was 158,455 bytes and 155 lines; the reported turn had one user record with `turn_id`, `seq`, `trace_type`, and content.
- Relevant code-model, serialization, semantic, or physical-store change: No storage schema or serializer change is required. Future error events use the existing canonical diagnostic fields; later item/message events use existing event shapes.
- Normal readers and writers, including unknown/extra-field behavior: Normal run-view hydration reads the application-owned replay trace. The native Codex history reader/provider is documented in code as diagnostic-only and not used for normal UI history.
- Representative direct-read or compatibility evidence: Existing trace read succeeded; common lifecycle/WebSocket/frontend code already consumes `error_scope: "turn"` and `error_effect: "diagnostic"`. No new field must be added to stored canonical events.
- Required semantics and invariants preserved by direct use: `Yes` — existing schema can persist the correctly classified diagnostic and all admitted later events. Single turn identity and event order remain unchanged.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Existing user history must not be rewritten or deleted. The Codex rollout can prove missing content but is not the normal application history source and may contain sensitive runtime details.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No migration benefit. Rewriting all run traces would add data-integrity and privacy risk without reconstructing events absent from the application trace.
- Existing migration framework or lifecycle constraints, only if migration may be required: Not applicable; decision is `Directly Usable — No Migration`.

## Constraints / Dependencies / Compatibility Facts

- The integrated Codex contract is versioned by the installed app-server and uses required camel-case `willRetry`, `threadId`, and `turnId`.
- Turn admission intentionally rejects governed segment events without a current exact turn; weakening that guard would hide the actual lifecycle bug and is forbidden by scope.
- Diagnostic errors are content, not terminal lifecycle boundaries, throughout the common pipeline.
- A Codex boundary is stale only when both the native event turn id and current active turn id are non-empty and different. Matching terminal and runtime-global failures remain visible/terminal; identity-missing malformed input retains the existing conservative handling.
- A suppressed stale A boundary produces no `CodexThreadEventMessage`, canonical event, application replay record, WebSocket frame, or frontend mutation. Optional existing Codex debug logging may record only safe identity/method metadata; it is not a replay source.
- Runtime/model/workspace remain fixed for an existing run; no configuration change is relevant.
- The authoritative task worktree has no installed dependencies at present; implementation checks must prepare or reuse repository-approved dependencies without modifying the shared checkout's task state.

## Open Unknowns / Risks

- No blocking investigation unknown remains for requirements approval.
- Presentation risk: existing red retry cards may still appear severe because UI restyling/deduplication is not part of this correction.
- Compatibility risk: a future Codex protocol revision could alter error semantics; implementation must target the installed supported v2 contract rather than parse message text.
- Historical limitation: the current affected application's replay trace cannot recover already discarded events through normal readers. This is explicit out of scope rather than an unexamined gap.
- Test-environment risk: a faithful provider retry may be nondeterministic in live E2E. Durable adapter tests should deterministically emit the native sequence, while downstream API/E2E investigation decides what realistic execution evidence is practical.

## Notes For Architecture Reviewer

Requirements were approved by the user on 2026-09-02. `ARCH-REV-002` verified `AR-F-001` resolved and raised only `AR-F-002`. The `SR-003` design now contains explicitly stale Codex terminal/completion/failed-status boundaries inside the existing notification handler before thread-event emission. Re-review should verify the revised `DS-002`/`DS-003`, exact suppression and replay semantics, preserved matching/runtime-global behavior, and joined native-to-live-projection A/B regression. The accepted `DS-004` cleanup matrix remains authoritative; no reconnect, admission, frontend production, persistence schema, or non-Codex change is added.
