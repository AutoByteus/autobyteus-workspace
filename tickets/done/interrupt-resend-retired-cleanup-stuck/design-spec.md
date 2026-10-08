# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline / revision and user-approval reference: SR-001 (`requirements-doc.md`), approved by the user in the Solution Designer conversation on 2026-10-08 ("I like your suggestion. Let's go."), with DEC-001 resolved to Option A (wait for cleanup, then deliver; 30 s bound, then a retryable plain-language error).
- Behavior-defining supplements and their approval references: None.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/investigation-notes.md`
- Authorities read (design reading gate; file and date): `references/architecture-design.md`, `design-principles.md`, repository `DESIGN.md`, `TESTING.md`, `autobyteus-server-ts/AGENTS.md` (2026-10-08). No package-level `DESIGN.md` in `autobyteus-server-ts` or `autobyteus-web`. `design-examples.md` not used.
- Project design-principle conflicts with the general principles, or discrepancies: None.

## Current-State Read

A published `AgentRun` lives in `AgentRunActivationRegistry.activeRuns`. When any caller looks the run up (`getActiveRun`) and its backend reports inactive, the registry moves the run to `retired` and releases its attachments. It only removes the run from `retired` on an explicit termination. While a run id is in `retired`, `claim()` refuses a new activation with `AGENT_RUN_ACTIVATION_CLEANUP_FAILED` ("still owns retired cleanup"). This guard was added in `028cca231` and is sound: a replacement must not start until the old runtime has been proven stopped.

Two owners re-activate runs:

- **Team members and delegated copies** (`ConfiguredAgentExecutionHandle`) hold the exact old run and call `AgentRunManager.releaseExactRun(oldRun)` before re-activating, so they meet the guard (AF-001, AF-008).
- **Standalone runs** (`StandaloneHostAgentHandle` -> `StandaloneAgentRunLifecycleService`) never release the old run. They go straight from inactive discovery to `beginActivation` -> `claim()` and are refused. The lifecycle service then caches the quarantine-classified error until restart (AF-007, AF-009).

Antigravity's interrupt stops the AGY process, which makes every AGY interrupt take the run offline. Other runtimes reach the same state only when their runtime exits on its own. Evidence: investigation-notes.md, Source Log and AF-001..AF-012.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: Five production files, mostly in one subsystem (`agent-execution`, plus one in `agent-collaboration`): `errors.ts`, `agent-run-activation-registry.ts`, `agent-run-manager.ts`, `standalone-agent-run-lifecycle-service.ts`, `configured-agent-execution-handle.ts`. No API, persistence or web change. Unit, integration and one deterministic fake-AGY E2E test.
- Architectural risk: `High`
- Risk rationale and supporting evidence: The change alters concurrency and lifecycle ordering at the activation/termination boundary. The release of the old runtime now runs inside the standalone transition lane, before a claim, against a termination that may be racing an in-flight interrupt (AF-002, AF-004, AF-005). It also reclassifies an error that both the lifecycle quarantine and the team retry-safety logic depend on. The regression being fixed came from a recent change in this same area (`028cca231`).
- Escalation trigger if implementation or validation discovers new impact: If exact release of a retired run turns out not to prove the runtime stopped for some runtime (Codex, Claude, Grok or native), or if the termination's `releaseRun(runId)` interferes with a replacement for the same id, stop and return a `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | AF-001 `releaseExactRun` | Exact release works for a retired run and clears `retired` | Reuse it; no new release mechanism | — |
| Code | AF-002 termination memoization; `releaseRun(runId)` | Joins in-flight attempts, can be retried, and is keyed by run id | Release before claim, in the same lane | — |
| Code | AF-003/AF-004 AGY stop/terminate | Stop is joined, confirms exit, and has a 5 s internal deadline; terminate during an interrupt is idempotent | No AGY backend change | Behavior of the live CLI is confirmed in validation |
| Code | AF-007 transition lane and host join | One activation per run at a time | Concurrent sends cause one restart (AC-005) | — |
| Code | AF-008 configured handle | A failed previous release makes the member permanently stuck | Make previous-release failure retry-safe (REQ-006) | — |
| Code | AF-009/AF-010 error classification and display | Quarantine code is cached; the web shows the message verbatim | New retryable code with a plain message | — |
| Probe | `evidence/registry-repro-probe.test.ts.txt` | Permanent refusal reproduced | Regression tests start from this shape | — |

## Intended Change

When a standalone run is activated and its previous runtime still owes a release, the activation first completes that exact release: it waits until the old runtime has stopped, and waits at most 30 s. Only then does it claim and restore. A failure or timeout returns a new retryable error, `AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING`, with a plain-language message. That error is not cached as a quarantine, so the next send retries the release. The registry's guard keeps refusing a reclaim while a release is owed, but now reports the same retryable code. Team members and delegated copies treat a failed previous release as retry-safe.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Preserved | Interrupt button | AGY interrupt stops the process (AF-004) | Unchanged | — |
| BEH-002 | User | REQ-001, REQ-002; AC-001..AC-004 | Send to an offline standalone run | Refused permanently (Current-State Read) | The previous release completes, then the run restores and the message is delivered | DS-001, DS-002 |
| BEH-003 | User | REQ-003; AC-001, AC-005 | Send during the interrupt | No ordering guarantee | The replacement starts only after the old runtime has stopped; one restart | DS-002 |
| BEH-004 | System | REQ-006; AC-006 | Work sent to an offline member | Recovers, except permanently stuck after a failed release (AF-008) | A failed previous release is retry-safe | DS-003 |
| BEH-005 | Operational | REQ-004; AC-007, AC-008 | App restart / later send | Restart only | A later send retries; restart also works | DS-001 |
| BEH-006 | User | REQ-005; AC-004 | Release failure or timeout | Raw internal text | Plain retryable text | DS-001 (error return) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/registry-repro-probe.test.ts.txt` | Reproduction | AC-001..AC-003 | Basis for the registry/manager regression tests | Evidence only |
| `evidence/server-log-excerpt.txt`, `evidence/user-screenshot-stuck-run.png` | Symptom | AC-001, AC-007 | Defines the failing outcome | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers that fire, each with evidence:
  - *Repeated coordination trigger* (partial): "release the previous exact runtime before re-activation" exists in the team handle (AF-008) but is missing on the standalone path. The design gives the standalone path the same rule through one manager method keyed by run id. It does not copy the team handle's logic.
  - *Authoritative-boundary trigger*: the lifecycle service must not reach into the registry for the retired run. It calls `AgentRunManager`, which owns run lifecycle and already owns `releaseExactRun`.
  - Ruled out: *Shared-structure looseness* (no shared type change), *Persisted-data transition* (in-memory state only), *Empty indirection* (the new manager method owns real policy: find the owed run, prove the stop, classify failure).
- Root cause classification: `Missing Invariant` (with a narrow `Boundary Or Ownership Issue`)
- Refactor needed now: `No` (only a bounded addition to the existing owners)
- Evidence: AF-001, AF-007, AF-008, AF-009; reproduction probe.
- Design response: Add `AgentRunManager.releaseRetiredRun(runId)`. The standalone lifecycle calls it inside its transition lane, with a 30 s bound, before activating. Give retired cleanup its own retryable error code. Make a failed previous release retry-safe in the team handle.
- Refactor rationale: The existing owners are correct. The registry, manager and lifecycle boundaries hold; only the missing step and the misclassified error need to change.
- Intentional deferrals and residual risk: None in scope. The old run's final "offline" status may reach the bound stream session for a moment before it rebinds to the restored run (cosmetic; see Risks).

## Terminology

- *Release owed* / *retired run*: a published run whose backend went inactive and was moved to `registry.retired`; its exact release has not finished yet.
- *Previous runtime release*: `AgentRunManager.releaseExactRun` applied to the retired run.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete paths in scope: The registry's retired-claim refusal under `AGENT_RUN_ACTIVATION_CLEANUP_FAILED` is replaced by `AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING`. No alias, and no dual classification.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. Only in-memory registry and lifecycle state change. `run_metadata.json`, provider conversation state and history are read by restore exactly as today.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002, BEH-005, BEH-006 | Chat Send (WebSocket `SEND_MESSAGE`) | Message delivered to the restored run, or a retryable ack | `StandaloneAgentRunLifecycleService` (activation transition) | The path that is permanently refused today |
| DS-002 | Bounded Local | BEH-003 | Previous runtime release begins | Old runtime confirmed stopped; `retired` cleared | `AgentRunManager` | Orders the release before the claim; races the in-flight interrupt |
| DS-003 | Primary End-to-End | BEH-004 | Work to an offline member | Member restored or a retry-safe failure | `ConfiguredAgentExecutionHandle` | Regression guard and R-001 |

## Primary Execution Spine(s)

- DS-001: `Agent WebSocket SEND_MESSAGE -> AgentRunCommandCoordinator.post -> StandaloneHostAgentHandle.ensureReady -> StandaloneAgentRunLifecycleService.activateHost [transition lane] -> AgentRunManager.releaseRetiredRun -> AgentRunManager.beginActivation/claim -> restore (platform_restore) -> AgentRun.postUserMessage -> ack`
- DS-003: `Team/delegation work -> ConfiguredAgentExecutionHandle.ensureReady -> initializeReady -> AgentRunManager.releaseExactRun(oldRun) -> planner.begin/claim -> publish`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A send to a standalone run whose runtime went offline. The host handle finds no live run (discovery parks the old one as retired) and asks the lifecycle service to activate. Inside the run's transition lane, the lifecycle service first asks the manager to finish the previous runtime's release, waiting up to 30 s. Then it claims and restores the run in the same conversation and posts the message. A failure or timeout returns the retryable error; nothing is cached, so the next send repeats the same sequence. | Command coordinator, host handle, lifecycle service, run manager, registry | Lifecycle service | Wait bound; error classification |
| DS-002 | The manager looks up the retired run for the id. If there is none, it does nothing. Otherwise it runs `releaseExactRun`: force-terminate (which joins any in-flight interrupt or termination; for AGY it awaits the process exit), release attachments (idempotent), and remove it from `retired`. Any failure or non-accepted result becomes `AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING`. | Run manager, AgentRun termination, backend, registry | Run manager | — |
| DS-003 | Unchanged flow. If releasing the previous exact run fails, the readiness attempt is now marked retry-safe, so the next work retries the release instead of reusing the rejected attempt forever. | Configured handle, run manager | Configured handle | Retry safety |

## Spine Actors / Main-Line Nodes

`AgentRunCommandCoordinator`, `StandaloneHostAgentHandle`, `StandaloneAgentRunLifecycleService`, `AgentRunManager`, `AgentRunActivationRegistry`, `AgentRun`/`AgentRunTermination`, runtime backend; for DS-003, `ConfiguredAgentExecutionHandle`.

## Ownership Map

- `AgentRunActivationRegistry`: owns the publish/claim/retired state and the invariant "no claim while a release is owed". New: read-only `getRetiredRun(runId)`; the refusal uses the retryable code.
- `AgentRunManager`: owns run lifecycle commands. New: `releaseRetiredRun(runId)` performs the exact release of the owed run and classifies failure.
- `StandaloneAgentRunLifecycleService`: owns standalone activation ordering inside the transition lane and the user-facing wait bound (QR-001). It does not quarantine the retryable code.
- `ConfiguredAgentExecutionHandle`: owns member readiness and retry safety.
- `StandaloneHostAgentHandle`, `AgentRunCommandCoordinator`: unchanged thin participants.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no new facade.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Retired-claim refusal message "still owns retired cleanup" under `AGENT_RUN_ACTIVATION_CLEANUP_FAILED` | Misclassified as quarantine; internal wording | `AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING` with plain text (registry) | In This Change | Update tests that assert the old text |

## Return Or Event Spine(s) (If Applicable)

Ack return: `AgentRunActivationError(AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING, plain message)` -> coordinator `failCommand(ACTIVATION_FAILED, message)` -> WebSocket `AGENT_COMMAND_ACK` -> web error card. On the next successful send, the coordinator's `clearOverlayForCommand` clears the Error status overlay (existing).

## Bounded Local / Internal Spines (If Applicable)

DS-002 inside `AgentRunManager`: `getRetiredRun -> run.forceReleaseRuntime (joins prepared/finishing termination -> backend.terminate -> provider stop confirmed) -> registry.releaseRuntimeAttachments -> registry.removeIfCurrent(explicit_termination) -> retired cleared`. This spine matters because it is the only proof that the runtime stopped, and the replacement must not be claimed before it ends (AF-002).

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Wait bound (30 s) | DS-001 | Lifecycle service | Stops waiting and returns the retryable error; the release itself keeps running and later attempts join it | QR-001 | Placing it in the manager would apply a user-send policy to team and shutdown callers |
| Error classification | DS-001, DS-003 | `errors.ts` | Defines the retryable code; quarantine predicate unchanged | REQ-001, REQ-005 | — |

## Ownership Boundaries

The lifecycle service talks only to `AgentRunManager`; it never reads registry internals. The manager is the only caller of `registry.getRetiredRun`. The registry keeps its refusal guard as the last line of defence.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRunManager.releaseRetiredRun` | `registry.getRetiredRun`, `releaseExactRun`, termination | `StandaloneAgentRunLifecycleService` | Lifecycle service reading `registry.retired` or calling `run.forceReleaseRuntime` | Extend the manager |

## Dependency Rules

- Allowed: lifecycle service -> manager; manager -> registry/AgentRun.
- Forbidden: lifecycle service -> registry; any caller -> `AgentRunTermination` directly.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentRunManager.releaseRetiredRun(runId: string): Promise<void>` | Previous runtime of one run id | Exact-release the retired run for this id; no-op when none; throw `AgentRunActivationError("AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING", …)` on failure or a non-accepted result | Normalized local run id | Never materializes a run; never touches an active (published) run |
| `AgentRunActivationRegistry.getRetiredRun(runId: string): AgentRun \| null` | Retired entry | Read-only lookup | Run id | Used only by the manager |
| `AgentRunActivationErrorCode` adds `"AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING"` | Error contract | Retryable; not in `isAgentRunActivationQuarantineError` | — | — |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `releaseRetiredRun` | Yes | Yes | Low | — |
| `getRetiredRun` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Manager method | `releaseRetiredRun` | Yes (matches `retired`/`releaseExactRun`) | Low | — |
| Error code | `AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Prove the old runtime stopped | `releaseExactRun` / `AgentRunTermination.forceTerminate` | Reuse | Already exact, joins in-flight attempts, can be retried | — |
| Serialize activation per run | Lifecycle transition lane, host activation join | Reuse | Already gives one activation per run | — |
| User-visible error | Coordinator ack + web error card | Reuse | Message shown verbatim | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/runtime` | Retired state, refusal code | DS-002 | Manager | Extend | — |
| `agent-execution/services` | Release step, wait bound, quarantine exclusion | DS-001, DS-002 | Lifecycle service, manager | Extend | — |
| `agent-collaboration/execution/backends` | Member retry safety | DS-003 | Configured handle | Extend | — |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction step changed it).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRunActivationErrorCode` | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/errors.ts` | agent-execution | Error contract | C-1: add the retryable code; quarantine predicate unchanged | Existing error contract | — |
| `autobyteus-server-ts/src/agent-execution/runtime/agent-run-activation-registry.ts` | runtime | Registry | C-2: `getRetiredRun`; retired refusal uses the new code and plain message | Existing owner | — |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | services | Manager | C-3: `releaseRetiredRun` | Existing owner of `releaseExactRun` | — |
| `autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-lifecycle-service.ts` | services | Lifecycle | C-4: call `releaseRetiredRun` in `resolveInsideTransition` (after the active check and the existing quarantine check, before `activateOnce`), bounded by 30 s | Existing activation owner | — |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts` | collaboration | Member readiness | C-5: a failed previous exact release (throw or not accepted) in `initializeReady` marks the attempt retry-safe before rethrowing | Existing owner | — |

## Applied Patterns (If Any)

None new. The existing per-run transition lane serializes activation.

## Target Subsystem / Folder / File Mapping

Only the files above are modified; there are no new files or moves. Tests, as in Guidance For Implementation:

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/runtime/agent-run-activation-registry.test.ts` | File | Registry tests | Retired refusal code/message; `getRetiredRun` | Existing | — |
| `tests/unit/agent-execution/agent-run-manager.test.ts` | File | Manager tests | `releaseRetiredRun` cases | Existing | — |
| `tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts` | File | Lifecycle tests | Release-before-claim, failure/timeout retry, no quarantine | Existing | — |
| `tests/unit/agent-collaboration/configured-agent-execution-handle.test.ts` | File | Handle tests | Retry safety after a failed previous release | Existing | — |
| `tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts` | File (new) | Fake-AGY E2E | AC-001/002/005 at the real WebSocket boundary | Sibling of the AGY transport suites | Live model calls |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| Existing folders only | Main-Line Domain-Control | Yes | Low | — |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Lifecycle ordering | `resolveInsideTransition: active? -> quarantine? -> await bounded(manager.releaseRetiredRun(id), 30_000) -> activateOnce` | Making inactive discovery delete `retired` without exact release (would start a second AGY process before the first exits, and `releaseRun(runId)` could hit the new run) | Keeps the stop proof before the claim |
| Boundary | `lifecycle -> manager.releaseRetiredRun(id)` | `lifecycle -> registry.getRetiredRun(id) -> run.forceReleaseRuntime()` | Authoritative boundary |
| Retry safety | `catch (prior release) { markRetrySafe(); throw }` | Leaving the rejected `readinessAttempt` in place | AC-006 |
| User text | "The agent's previous session was still shutting down, so this message couldn't be delivered. Please send it again." | "Agent run '…' still owns retired cleanup." | REQ-005 (wording may vary within REQ-005) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `AGENT_RUN_ACTIVATION_CLEANUP_FAILED` for the retired refusal and special-case it in the quarantine predicate | Smaller diff | Rejected | New dedicated code; one meaning per code |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. C-1 error code. 2. C-2 registry (`getRetiredRun`, refusal code/message) + registry tests. 3. C-3 manager `releaseRetiredRun` + tests. 4. C-4 lifecycle step with the 30 s bound + tests. 5. C-5 handle retry safety + test. 6. New fake-AGY E2E. 7. Run the focused suites, then the full server suite.

## Key Tradeoffs

- Wait (DEC-001 A) versus immediate reject: waiting keeps "interrupt, then type" seamless. AGY's own stop deadline is 5 s, so the 30 s bound is a backstop.
- The bound lives in the lifecycle service, not the manager, so shutdown, termination and team callers keep their existing semantics.
- The bound does not cancel the release: a timed-out release keeps running, and the next send joins it or finds it already done (AF-002).

## Risks

- For a moment the old run's final status (offline/terminated) may reach the stream session before the coordinator rebinds the session to the restored run. Cosmetic; API/E2E should assert the final status is not Error after the reply.
- Non-AGY runtimes: exact release relies on each backend's `terminate()` proving the stop. This is existing behavior, already exercised by the team path. AC-003 covers it runtime-neutrally; see the Escalation trigger.

## Guidance For Implementation

- C-3 shape: `async releaseRetiredRun(runId)` -> normalize the id; `const run = registry.getRetiredRun(id); if (!run) return;` -> `try { const r = await this.releaseExactRun(run); if (!r.accepted) throw …PENDING(cause r) } catch (e) { if already PENDING rethrow; throw new AgentRunActivationError("AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING", <plain message>, { cause: e }) }`. Log the cause.
- C-4: a local constant `PREVIOUS_RUNTIME_RELEASE_WAIT_MS = 30_000`. On timeout, throw the same code; let the in-flight promise continue (attach a `.catch` so its rejection is not unhandled). Do not add the code to `quarantines`.
- C-5: wrap only the previous-run release in `initializeReady`; on failure call `markRetrySafe()` and keep `this.agentRun` (the exact authority is retained).
- Tests (REQ-007):
  - Unit: registry refusal code; manager no-op / success clears retired so `claim` succeeds / failure -> PENDING / retry after failure succeeds.
  - Lifecycle: published-then-inactive run -> `activateHost` releases then restores (AC-002/AC-003 with a non-AGY fake backend); release failure -> PENDING, not quarantined, next call succeeds (AC-004/AC-008); timeout with fake timers (QR-001); two concurrent `activateHost` -> one `beginActivation` (AC-005).
  - Handle: failed previous release then success (AC-006).
  - E2E (`RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=…/agy-failure-cli.mjs`): standalone AGY run; start a long `BACKGROUND_STEP` turn; send `INTERRUPT_GENERATION` and, without awaiting its ack, `SEND_MESSAGE` -> accepted ack and reply in the same conversation (same `platformAgentRunId`), exactly one live fake-CLI process afterwards, final status not Error (AC-001/AC-005); plus a variant with a delay before the send (AC-002).
- Desktop verification (AC-007) and a live AGY check belong to API/E2E and Delivery, with an isolated worktree build per TESTING.md. Never test against the user's app or data.
