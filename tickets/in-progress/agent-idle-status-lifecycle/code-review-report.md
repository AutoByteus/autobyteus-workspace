# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/requirements.md`
- Supplemental Task Artifacts Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/production-trace-evidence.md`
- Current Review Round: `1`
- Trigger: implementation handoff at commit `58bb00ce5`
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: `1`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/design-review-report.md`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/implementation-handoff.md`
- Coverage Investigation Reviewed (failure-origin entry point): `N/A`
- Execution Coverage Report Reviewed (failure-origin entry point): `N/A`
- Failing Scenario IDs: `N/A`
- Exact Failing Commands / Execution Mode: `N/A`
- Failure Evidence Paths: `N/A`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Implementation handoff at `58bb00ce5` | N/A | CR-001, CR-002 | Fail | Yes | Bounded implementation fixes required before API/E2E. |

## Prior Findings Resolution Check (Mandatory On Round >1)

`N/A — first implementation-review round.`

## Review Scope

- Changed implementation and behavior reviewed: exact-turn lifecycle reconciliation; per-run processing/dispatch ordering; canonical error identity/effect; AutoByteus, Claude, and Codex producer/converter changes; command association and settlement; canonical failure consumers; team/task/external-channel propagation; frontend removal of activity-derived lifecycle repair; cleanup and regression coverage.
- Files / areas reviewed: all implementation-source paths in `fbd7b6764bd43751956d69ffe22b943d06188444..58bb00ce5`, relevant changed tests, all direct default-pipeline call sites, and the complete reviewed artifact chain.
- Explicit exclusions: API/E2E execution, live providers, browser validation, realistic restored-run execution, and environment setup remain owned by `api_e2e_engineer` after source review passes.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Runtime turn identity is authoritative; ordinary activity is content-only; matching current-turn terminal evidence alone closes identified work; live/snapshot/frontend projections must converge.
- Design-spec behavior map verified against the implementation: Mostly. BEH-001, BEH-002, BEH-003 final-state handling, BEH-005, and BEH-006 are implemented as reviewed. BEH-004 is contradicted in one supported result-before-canonical-start ordering (CR-001).
- Design review report and round confirmed: Yes; authoritative architecture round 4 passed with MP-001 through MP-004.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior, if any: None. CR-001 is an implementation defect within the already approved asynchronous command lifecycle, not a new requirement.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status (`Confirmed`/`Contradicted`/`Unclear`/`Newly Discovered`) | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Runtime adapter -> `AgentRunEventDispatchQueue` -> first `LifecycleStatusEventTransformer` -> canonical `AGENT_STATUS`; ordinary activity cannot open a turn. | N/A |
| BEH-002 | Confirmed | Identified/anonymous/retired state in `agent-turn-lifecycle-state.ts`; rejected source statuses are omitted by the replacement transformer; delayed content remains output. | N/A |
| BEH-003 | Confirmed | `AgentRun` updates backend override only on `AGENT_STATUS`; team/task/failure consumers use canonical status/effect; frontend activity repair is deleted. | N/A |
| BEH-004 | Contradicted | Command records use pending/identified/awaiting/armed association and exact settlement, but accepted-result reconciliation can publish `running` and then build the ACK from the stale `initializing` run snapshot. | CR-MP-001 and CR-001: `AGENT_STATUS running` is synchronously broadcast before `AGENT_COMMAND_ACK`, while the ACK status can still be `initializing`; the frontend applies the ACK status and reverses the projection. |
| BEH-005 | Confirmed | Explicit offline clears transformer active state; direct `AgentRun` termination remains offline. | N/A |
| BEH-006 | Confirmed | Frontend colors/protocol are unchanged; ordinary activity no longer mutates lifecycle; `AGENT_STATUS`/snapshot/ACK status remain explicit inputs. | N/A |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Shared refactor replaces broad inference and preserves provider/runtime authority. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Exact production `start(A) -> complete(A) -> late tool(A)` is represented in transformer coverage and delayed content remains output. | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Fail | DS-001/DS-005 are clear; DS-004 produces a contradictory command-status return sequence in CR-001. | Repair accepted-result status reconciliation and add ordering coverage. |
| Ownership boundary preservation and clarity | Pass | Runtime publishers own outcome classification; transformer owns canonical lifecycle; `AgentRun` owns snapshot; coordinator owns command settlement. | None beyond CR-001. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | Turn/error resolvers, queue, failure observer, and registry have bounded owners. | None. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | New queue/resolvers live under existing agent-execution domains and are reused by all relevant consumers. | None. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Pass | Shared turn-ID and error-evidence resolvers prevent provider/consumer parsing drift. | None. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | Error evidence and command association are discriminated unions with singular meanings. | None. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | Lifecycle policy is centralized in the transformer/state; command evidence policy is centralized in coordinator/registry. | None. |
| Empty indirection check (no pass-through-only boundary) | Pass | Added facade/queue/resolver files own real ordering or validation behavior. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | The 488-effective-line coordinator remains pressured but its registry/data transitions are split and its main sequencing concern is coherent. | Reassess after CR-001; no forced extraction in this round. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Fail | `publish-processed-team-agent-events.ts` still calls the default pipeline directly and bypasses the queue/dispatch facade; it has no production caller (CR-002). | Remove the dormant helper/test, or establish a real owner and route it through the authoritative dispatch facade. |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Fail | The dormant team helper depends directly on `getDefaultAgentRunEventPipeline()` rather than `dispatchProcessedAgentRunEvents`. | CR-002. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | Lifecycle files, domain resolvers, queue, coordinator/registry, runtime adapters, and frontend reducers match their owning subsystems. | None. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | Lifecycle state/transformer and command types/registry/coordinator split at meaningful boundaries. | None. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Pass | Exact command association and strict error evidence replace nullable/implicit meaning. | Keep ACK status aligned with the accepted-result transition in CR-001. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Pass | `LifecycleStatusEventTransformer`, `AgentTurnLifecycleState`, and discriminated association/evidence names state their roles clearly. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Canonical resolvers and failure observer remove repeated hint/effect logic. | None. |
| Patch-on-patch complexity control | Pass | Old processor, broad activity opener, non-status run inference, and frontend repair were deleted rather than layered. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Fail | CR-002 identifies a test-only direct pipeline caller that conflicts with the new authoritative boundary. | Remove the dormant path/test or route a proven supported caller through the facade. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Core lifecycle/command/runtime tests are strong, but there is no assertion for result-before-canonical-start ACK status ordering; the current restored-run test does not assert ACK status. | Add CR-001 regression coverage for inactive restore and active idle paths as applicable. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Focused builders make turn/status/error ordering legible; suites remain behavior-oriented. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Fail | `publish-processed-team-agent-events.test.ts` is the only caller of its source helper and preserves a forbidden direct-pipeline path. | CR-002. |
| API/E2E readiness for the next workflow stage | Fail | Source review has two bounded unresolved findings. | Rework, rerun implementation checks, then return through implementation review. |

## Source File Size And Structure Audit (If Applicable)

Effective line counts are non-empty current-source lines. The delta signal is additions plus deletions from `fbd7b6764bd43751956d69ffe22b943d06188444..58bb00ce5`. Tests are intentionally excluded from source thresholds.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | 279 | Pass | Pass (80) | Pass | Pass | Pass | None |
| `.../backends/claude/events/claude-session-event-converter.ts` | 427 | Pass | Pass (41) | Pass | Pass | Pass | None |
| `.../backends/claude/session/claude-session-output-events.ts` | 131 | Pass | Pass (14) | Pass | Pass | Pass | None |
| `.../backends/claude/session/claude-session.ts` | 495 | Pass | Pass (21) | Pass; near hard limit but change is session-owned | Pass | Pass with pressure noted | None |
| `.../backends/codex/events/codex-thread-event-converter.ts` | 476 | Pass | Pass (15) | Pass; existing converter owner | Pass | Pass | None |
| `.../backends/codex/events/codex-thread-lifecycle-event-converter.ts` | 78 | Pass | Pass (33) | Pass | Pass | Pass | None |
| `.../backends/codex/thread/codex-thread-notification-handler.ts` | 138 | Pass | Pass (29) | Pass | Pass | Pass | None |
| `.../backends/codex/thread/codex-thread.ts` | 398 | Pass | Pass (33) | Pass | Pass | Pass | None |
| `.../compaction/compaction-run-output-collector.ts` | 210 | Pass | Pass (9) | Pass | Pass | Pass | None |
| `.../domain/agent-run-error-evidence.ts` | 26 | Pass | Pass (30) | Pass | Pass | Pass | None |
| `.../domain/agent-run-event-turn-id.ts` | 12 | Pass | Pass (14) | Pass | Pass | Pass | None |
| `.../domain/agent-run.ts` | 214 | Pass | Pass (35) | Pass | Pass | Local Fix relation | CR-001 includes stale local initializing snapshot evidence. |
| `.../events/agent-run-canonical-failure-observer.ts` | 40 | Pass | Pass (45) | Pass | Pass | Pass | None |
| `.../events/agent-run-event-dispatch-queue.ts` | 21 | Pass | Pass (23) | Pass | Pass | Pass | None |
| `.../events/default-agent-run-event-pipeline.ts` | 20 | Pass | Pass (4) | Pass | Pass | Pass | None |
| `.../events/dispatch-processed-agent-run-events.ts` | 35 | Pass | Pass (31) | Pass | Pass | Pass | Enforce via CR-002 cleanup. |
| `.../events/processors/lifecycle-status/agent-turn-lifecycle-state.ts` | 172 | Pass | Pass (185) | Pass | Pass | Pass | None |
| `.../events/processors/lifecycle-status/lifecycle-status-event-processor.ts` | 0 (removed) | Pass | Pass (115 removal) | Pass | Pass | Pass | None |
| `.../events/processors/lifecycle-status/lifecycle-status-event-transformer.ts` | 79 | Pass | Pass (87) | Pass | Pass | Pass | None |
| `.../services/agent-run-command-coordinator.ts` | 488 | Pass | Signal (485), assessed | Cohesive sequencing owner, but CR-001 is unresolved | Pass | Local Fix | Fix CR-001; retain or improve navigation without forced fragmentation. |
| `.../services/agent-run-command-registry.ts` | 247 | Pass | Pass (69) | Pass | Pass | Pass | None |
| `.../services/agent-run-command-types.ts` | 66 | Pass | Pass (7) | Pass | Pass | Pass | None |
| `.../services/agent-run-service.ts` | 328 | Pass | Pass (16) | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | 439 | Pass | Pass (34) | Pass | Pass | Pass | None |
| `.../task-delegation/task-delegation-settlement-coordinator.ts` | 163 | Pass | Pass (8) | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/external-channel/runtime/channel-output-event-parser.ts` | 215 | Pass | Pass (6) | Pass | Pass | Pass | None |
| `.../channel-run-output-event-collector.ts` | 98 | Pass | Pass (7) | Pass | Pass | Pass | None |
| `.../improver-run-completion-watcher.ts` | 87 | Pass | Pass (4) | Pass | Pass | Pass | None |
| `autobyteus-ts/src/agent/events/notifiers.ts` | 193 | Pass | Pass (23) | Pass | Pass | Pass | None |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | 206 | Pass | Pass (11) | Pass | Pass | Pass | None |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | 346 | Pass | Pass (27) | Pass | Pass | Pass | None |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | 354 | Pass | Pass (26) | Pass | Pass | Pass | None |
| `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts` | 60 | Pass | Pass (9) | Pass | Pass | Pass | None |
| `autobyteus-ts/src/agent/streaming/events/stream-event-payload-lifecycle.ts` | 272 | Pass | Pass (6) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | 303 | Pass | Pass (22) | Pass | Pass | Pass | None |
| `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | 78 | Pass | Pass (11) | Pass | Pass | Pass | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No dual runtime path, old-version branch, or compatibility wrapper was introduced. |
| No legacy old-behavior retention in changed scope | Pass | Broad activity lifecycle inference, non-status AgentRun inference, and frontend repair were deleted. |
| Dead/obsolete code cleanup completeness in changed scope | Fail | CR-002. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Directly usable/no migration; persistence readers/writers and lockfiles are unchanged. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | Incomplete historical error content remains non-authoritative through the current generic resolver, not an old-version branch. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | No migration is required or implemented. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

| Item / Path | Type (`DeadCode`/`ObsoleteFile`/`LegacyBranch`/`CompatWrapper`/`UnusedHelper`/`UnusedTest`/`UnusedFlag`/`ObsoleteAdapter`/`DormantPath`) | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/publish-processed-team-agent-events.ts` | DormantPath | Repository-wide search finds no source caller; line 31 calls `getDefaultAgentRunEventPipeline().process(...)` directly. | It is the only non-facade default-pipeline invocation and bypasses the reviewed run-keyed `pipeline -> listener dispatch` authority. | Remove it, or first establish a real supported caller and route it through `dispatchProcessedAgentRunEvents`; do not preserve direct processing. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/publish-processed-team-agent-events.test.ts` | UnusedTest | It is the only caller of the dormant source helper. | It keeps a forbidden, non-production path alive and does not validate the authoritative queue/dispatch boundary. | Remove with the helper, or replace only if a supported facade-based path is established. |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: Canonical/SDK `ERROR` payloads now expose additive `error_scope`, `error_effect`, and conditional `turn_id`, and lifecycle authority is explicitly boundary/status based rather than activity based. Public status values/colors are unchanged, but developer-facing event semantics changed.
- Files or areas likely affected: agent event protocol/runtime integration documentation and any AutoByteus SDK notifier/event payload reference. Delivery should record explicit no-impact only if no durable public/developer documentation exists for these contracts.

## Material Premise Validation (Only When Needed)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status (`Confirmed`/`Reclassified`/`No Longer Relevant`) | Changed Evidence / Reason (Required For `Reclassified` Or `No Longer Relevant`) |
| --- | --- | --- |
| MP-001 | Confirmed | N/A |
| MP-002 | Confirmed | N/A |
| MP-003 | Confirmed | N/A |
| MP-004 | Confirmed | N/A |

### CR-MP-001 — An accepted turn result can reconcile before the canonical start event updates `AgentRun.statusOverride`

- Origin: `New implementation-ordering premise within approved BEH-004/MP-001 lifecycle`
- Related approved requirement or established contract: R-001, R-006, R-007, R-011; the reviewed command association/overlay contract; frontend ACK status is an explicit lifecycle projection input.
- Relevant behavior ID(s): BEH-003, BEH-004, BEH-006.
- Product-supported initiating trigger or governing contract, with evidence: `SEND_MESSAGE(B)` to an active/restored Claude or Codex run. `AgentRun.postUserMessage` first writes local `initializing` (`agent-run.ts:82-118`). Claude emits native `TURN_STARTED(B)` and returns B, while backend canonical dispatch is explicitly non-awaited (`claude-session.ts:144-197`; `claude-agent-run-backend.ts:137-154`). Codex RPC response/notification processing is also asynchronous.
- Actual production caller/event path from that trigger to the claimed state: WebSocket `SEND_MESSAGE` -> `AgentRunCommandCoordinator.postUserMessage` -> `AgentRun.postUserMessage` sets `statusOverride=initializing` -> backend returns accepted result B before queued canonical start reaches the run listener -> `reconcileAcceptedResult(B)` clears the command overlay and synchronously broadcasts synthetic `running` -> `recordResult` rereads the still-`initializing` projection -> `agent-stream-handler` sends `AGENT_COMMAND_ACK` -> frontend applies ACK status.
- Lifecycle preconditions and material consequence at the claimed point: The command is positively associated with B while the local run override is still `initializing`. The same connection receives `AGENT_STATUS running` followed by ACK status `initializing`; `AgentStreamingService` applies both, so the later ACK reverses the live projection until another canonical status event arrives.
- Reachability: `Reachable`.
- Review consequence / proportionate response: CR-001. Align the ACK/projection with the accepted-result replacement and cover this ordering; no new lifecycle abstraction or requirement change is needed.

Review probe (ephemeral script; result retained here): `node /tmp/agent-command-ack-repro.mjs` modeled an inactive restore whose accepted result B returns before canonical start dispatch. Observed output was `AGENT_STATUS initializing`, then `AGENT_STATUS running`, while `ack.status` was `initializing` and the registry association was `IDENTIFIED(B)`.

## Review Scorecard (Mandatory)

- Overall score (`/10`): `8.9`
- Overall score (`/100`): `89.3`
- Score calculation note: simple average of the ten category scores; the failed review follows the sub-9.0 gaps and findings, not the average.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.2 | The implementation follows the reviewed runtime, return-event, reconnect, command, local-state, and termination spines. | CR-001 contradicts one DS-004 return sequence. | Make accepted-result replacement and ACK one coherent transition. |
| 2 | Ownership Clarity and Boundary Encapsulation | 8.8 | Runtime effect, canonical lifecycle, run snapshot, and command settlement owners are otherwise clear. | CR-002 leaves a direct default-pipeline bypass outside the authoritative dispatch facade. | Remove or facade-route the dormant helper. |
| 3 | API / Interface / Query / Command Clarity | 9.0 | Discriminated error and command association contracts are explicit and provider-neutral. | ACK status can contradict the preceding replacement status in CR-001. | Return an ACK status consistent with the accepted association/current explicit overlay transition. |
| 4 | Separation of Concerns and File Placement | 9.0 | New files map to real owned concerns; the coordinator remains a coherent sequencing owner. | The coordinator is 488 effective lines after a 485-line delta and contains an unresolved status-return seam. | Fix CR-001; reassess navigation/extraction without fragmenting sequencing. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.2 | Tight unions and shared resolvers replace nullable/parallel meanings. | Minor residual reliance on consumers respecting error/status adjacency. | Validate broadly downstream; no source redesign required now. |
| 6 | Naming Quality and Local Readability | 9.2 | Names communicate lifecycle, evidence, association, and transition roles. | The long coordinator requires careful navigation. | Preserve clear local sections while fixing CR-001. |
| 7 | API/E2E Readiness | 8.6 | Focused tests/builds pass and provider mappings are testable. | Two source-review findings remain; result-before-start ACK ordering is untested. | Resolve findings and rerun implementation checks before API/E2E. |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.4 | Exact-turn state, delayed-content behavior, terminal matching, diagnostics, and frontend activity neutrality are sound. | CR-001 creates a reachable running-to-initializing reversal on the explicit frontend ACK path. | Align replacement/ACK projection and add ordering regression coverage. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | Old lifecycle inference is removed cleanly and persistence remains current-schema-only. | None material. | Keep clean-cut behavior during rework. |
| 10 | Cleanup Completeness | 8.5 | The primary old processor/helper paths were removed. | CR-002 leaves a test-only direct-pipeline path and its sole test. | Remove or properly facade-route it. |

## Findings

### CR-001 — Accepted-result reconciliation can broadcast `running` and then return `initializing` in the ACK

- Severity: `Medium`
- Classification: `Local Fix`
- Affected behavior / contract: BEH-003, BEH-004, BEH-006; R-001, R-006, R-007, R-011; CR-MP-001.
- Evidence:
  - `agent-run.ts:82-118,129-170` stores local `initializing` in `statusOverride` until a canonical backend status event is observed.
  - `agent-run-command-coordinator.ts:239-271,339-350` clears an inactive-command overlay on accepted result/start association and synchronously broadcasts a synthetic `running`, but does not carry that payload into the subsequent ACK/projection.
  - `agent-run-command-coordinator.ts:397-419` builds the ACK from a fresh projection, which can still read `AgentRun.statusOverride=initializing`.
  - `agent-stream-handler.ts:322-336` sends the ACK after the coordinator's synchronous broadcast; `AgentStreamingService.ts:290-297` applies the ACK status, so `running -> initializing` is observable.
  - The review probe deterministically produced the contradictory sequence recorded under CR-MP-001.
- Material consequence: The accepted command is already associated with B, yet the explicit status stream reverses to initializing until a later boundary/status event. This violates the reviewed command overlay and live-projection contract and can produce a visible lifecycle oscillation.
- Required action: Make accepted-result/start reconciliation return or retain one authoritative replacement status for both the live publish and ACK/projection, without reintroducing activity inference. Add a regression where accepted result B wins before canonical start dispatch; assert the emitted status/ACK sequence cannot regress from running to initializing. Cover inactive restore and the active-idle command path as applicable.
- Recommended owner: `implementation_engineer`.

### CR-002 — A dormant team helper bypasses the new per-run dispatch authority

- Severity: `Low`
- Classification: `Local Fix`
- Affected contract: DS-001/DS-005 dispatch ordering, authoritative boundary rule, cleanup completeness.
- Evidence: Repository-wide search finds no production/source caller for `publishProcessedTeamAgentEvents`; its only caller is its unit test. The helper imports `getDefaultAgentRunEventPipeline` and invokes `.process(...)` directly at lines 3 and 31-34 rather than using `dispatchProcessedAgentRunEvents`, the reviewed owner of `pipeline -> final listener dispatch` serialization.
- Material consequence: The codebase retains a ready-made bypass around same-run serialization and transformer/listener ordering, contradicting the claimed atomic replacement and making later reuse unsafe.
- Required action: Remove the unused helper and its sole test. If a supported caller is established instead, route the complete processing-plus-publication operation through the authoritative dispatch facade and add ordering coverage; do not keep direct default-pipeline processing.
- Recommended owner: `implementation_engineer`.

## Classification

`Local Fix` — both findings are bounded implementation/cleanup defects; the approved requirements and design remain sufficient.

## Recommended Recipient

`implementation_engineer`

After rework, return through implementation-source review before API/E2E.

## Residual Risks

- `retiredTurnIds` grows for the runtime-context lifetime by approved design; realistic long-lived provider validation remains downstream.
- `agent-run-command-coordinator.ts` remains at 488 effective non-empty lines and should be reassessed after CR-001 without forcing artificial fragmentation.
- Live Claude/Codex/AutoByteus timing, restored-context isolation, mixed-team cached converters, same-run queue behavior under real listeners, and browser convergence remain API/E2E responsibilities after source review passes.
- Canonical failure-message consumers rely on authoritative `ERROR` and accepted/derived error status adjacency; current adapter/transformer paths preserve it, but realistic execution should validate it.

## Verification Performed During Review

- `git diff --check fbd7b6764bd43751956d69ffe22b943d06188444..58bb00ce5` — pass.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — pass.
- `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit` — pass.
- Focused server review suite — 6 files, 106 tests passed:
  - lifecycle transformer
  - per-run dispatch queue
  - command coordinator
  - AutoByteus converter
  - Claude session
  - Codex thread
- Repository-wide source searches confirmed removal of the old activity-repair symbols and identified the sole remaining direct default-pipeline invocation in CR-002.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Fail` — CR-MP-001 is reachable and exposes CR-001.
- Score Summary: `8.9/10 (89.3/100)`; Ownership, API/E2E Readiness, Runtime Correctness, and Cleanup are below the clean-pass threshold.
- Failure Origin (when applicable): `N/A — implementation review`
- Recommended Recipient (when applicable): `implementation_engineer`
- Notes: Resolve CR-001 and CR-002, rerun implementation-scoped checks, update the implementation handoff, and return for source review. Do not proceed to API/E2E yet.
