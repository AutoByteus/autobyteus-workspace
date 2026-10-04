# Requirements Document — agent-run-termination-and-root-delivery-core

## Document Status
- Status: **Ready for Approval** (SR-001, 2026-10-04).
- Current solution revision ID: `SR-001`.
- Package: `agent-run-termination-and-root-delivery-core`.
- Request: `/code_reviewer`, 2026-10-04, directed by the user: "do it as one combined ticket please … send to solution
  designer to bootstrap a new ticket." The user chose one combined ticket over the reviewer's two-ticket
  recommendation.
- Requirements owner: Solution Designer.
- Approval state: **pending**. DEC-001–DEC-004 below are open, each with a recommendation.
- Behavior-defining supplements: none. Predecessor SR-006 § 11 is the contract that Part A must preserve (read-only).
- Workspace:
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-and-root-delivery-core`.
  - Branch `codex/agent-run-termination-and-root-delivery-core`.
  - Base `origin/personal` @ `03d5db06b`. Target `personal`.

## Problem And Desired Outcome
- **Problem.** These are two structural debts the code reviewer found in the finalized `standalone-agent-run-root`.
  They are follow-ups, not regressions.
  - **Part A.** `AgentRun` (`agent-run.ts`) is at 498 of the 500 allowed effective lines (E-A1). It owns input
    admission, interrupts, compaction recovery, the root-shutdown fence and termination. These state machines interact
    in fragile ways; the F-02 Stop race came from exactly that (E-A4). The next change to `AgentRun` would break the
    size guardrail.
  - **Part B.** Team, Org and standalone roots each carry their own copy of message-delivery mechanics: live lease,
    child liveness, input reservation, operator commands, committed-message presentation, and address and run-ID
    delivery (E-B1, E-B2). Every collaboration change has to be made three times, and the copies have drifted (E-B3).
- **Affected:** server maintainers and reviewers directly. Users and agents only through Org self-delegation (DEC-001).
- **Desired outcome.**
  - Termination and root-shutdown-fence handling have one clearly owned home outside `AgentRun`, with identical
    behavior.
  - Root message delivery has one shared core, with explicit per-root rules.
  - Org self-delegation reports the same coded rejection as Team and standalone.
- **Success:** the size targets are met, the duplicates are gone, the existing suites pass with unchanged assertions,
  and the live gates pass.

## Relevant Current And Desired Behavior
| ID | Kind | Scenarios | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | `AgentRun` implements termination (prepare, try-if-quiescent, commit/finish, cancel) and the root-shutdown fence (F-1–F-4) inline (E-A2, E-A4) | Same behavior, owned by a separate unit | Every termination and fence outcome, timing rule (5000 ms), retry rule and diagnostic of SR-006 § 11; the public `AgentRun` methods and their results |
| BEH-002 | Contract | — | `agent-run.ts` has 498 effective lines (E-A1) | Comfortably under the guardrail (REQ-002) | — |
| BEH-003 | System | SCN-003, SCN-004 | Each root implements lease, liveness, reservation, commands, presentation and delivery itself (E-B2) | One shared core, with root-specific rules in thin per-root adapters | Every per-root observable outcome in E-B3 D-2 to D-5, unless DEC-002 decides otherwise |
| BEH-004 | User (agent) | SCN-005 | An Org agent calling `delegate_task` on its own address gets `{code: "TASK_DELEGATION_ERROR", message: "An Agent cannot delegate a task to its own logical placement."}`; Team and standalone agents get `COLLABORATION_SELF_TARGET_REJECTED` with the same message (E-B3 D-1) | Org returns `COLLABORATION_SELF_TARGET_REJECTED` with the same message | The message text; Team and standalone unchanged |

## Stakeholders, Actors, And Outcomes
| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| User (Stop, messaging, mentions) | Runs behave as today | No visible change | Live gates pass |
| Agents (tools `send_message_to`, `delegate_task`) | Same tool results | Same results; Org self-delegation coded (DEC-001) | Message texts unchanged |
| Maintainers and reviewers | Change delivery once; change `AgentRun` safely | One owner per concern | Size guardrail |

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Stop or end any root (Team, Org, standalone) whose agents may be busy, on every runtime | SCN-001 |
| UC-002 | Stop or terminate a single AgentRun (standalone Stop, delete or archive, server shutdown) | SCN-002 |
| UC-003 | Agent-to-agent `send_message_to` by address and by run ID, in every root | SCN-003 |
| UC-004 | Operator input and commands to children, `@` mentions, `delegate_task`, `list_available_agents`, in every root | SCN-004 |
| UC-005 | `delegate_task` to the caller's own address in an Org | SCN-005 |

### Out Of Scope
- The `tokenUsageMeterStore` split; `bindProcess…`/`getProcess…` slot rewiring; host activation inside the standalone
  root gate; CG-05 Token Meter freshness (all named out of scope by the request).
- Splitting `AgentRun`'s other concerns (input admission, interrupts, compaction recovery, events), except as needed
  for REQ-001's ports.
- Changing recipient or placement resolution (already shared, E-B1) or the communication engines.
- Fixing the base failures in E-X1.
- Harmonizing the per-root differences D-2 to D-5, unless DEC-002 decides otherwise.

### Non-Goals
- No new fence or termination semantics. In particular, the stale-local-turn residual from the predecessor
  (ARCH-REV-004 N-1) is not addressed here.
- No performance change is targeted.

### Preserved Behavior Boundary
- BEH-001 and BEH-003 preserved columns; AC-003, AC-006, AC-007.
- Invariant: every tool result, command result, error code and message, and published event is unchanged for every
  root and runtime, except BEH-004.

### Review Authority
- A blocking finding must cite a REQ, AC or BEH ID here.
- Harmonizing any other per-root difference is a `Requirement Gap` that needs user approval.

## Requirements
| ID | Requirement | BEH | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | **Part A ownership.** Termination (prepare, try-if-quiescent, commit/finish, cancel) and root-shutdown-fence attempt management (F-1–F-4) are owned by a dedicated unit outside `AgentRun`. `AgentRun` keeps its public methods (`prepareTermination`, `tryPrepareTerminationIfQuiescent`, `fenceInputAndInterruptForRootShutdown`, `terminate`) with identical results, so callers are unaffected. | BEH-001 | Must | Fragile interaction; F-02 | Request Part A |
| REQ-002 | **Part A size.** `agent-run.ts` is at or under **400** effective non-empty lines. The new owner(s) are each at or under 400. | BEH-002 | Must | Leave headroom under the 500 guardrail (DEC-003) | E-A1 |
| REQ-003 | **Part A behavior-neutral.** SR-006 § 11 F-1–F-4 hold exactly as today: rejected interrupt → wait for quiescence; 5000 ms bound → original result; only acceptance latched; warn diagnostics with turn IDs. The same holds for termination's cancel, reopen and finish-retry rules. | BEH-001 | Must | No behavior change | Request Part A; E-A4 |
| REQ-004 | **Part B shared core.** Live lease, child liveness, input reservation, child and operator command execution, committed-message presentation, and address and run-ID delivery mechanics each have one shared implementation under `agent-collaboration`, used by Team, Org and standalone roots through thin per-root adapters. The duplicates (E-B2) are removed. | BEH-003 | Must | One change, not three | Request Part B |
| REQ-005 | **Part B explicit root rules.** Root-specific rules stay explicit in the per-root adapters and keep their current outcomes: the standalone host via `StandaloneHostAgentHandle` (readiness, host command rejection, host-stream presentation), Org's execution-kind result, Team's intent-based communication, the root-specific texts, the standalone pre-resolution self-check, and address delivery to non-live children (D-2 to D-5). | BEH-003 | Must | Behavior-neutral unless DEC-002 | E-B3 |
| REQ-006 | **Org self-delegation parity.** In an Org, `delegate_task` to the caller's own address is rejected with `COLLABORATION_SELF_TARGET_REJECTED` and the existing message, as in Team and standalone. | BEH-004 | Must, if DEC-001 is approved | Drift fix | Request Part B; E-B3 D-1 |
| REQ-007 | **Phased delivery** (DEC-004). Part A is completed, reviewed and validated (its own code-review and API/E2E gate, its own commits) before Part B begins. Part B then has its own gate. | — | Must | Failure attribution | Reviewer recommendation |

## Acceptance Criteria
| ID | REQ | BEH / SCN | Trigger | Expected outcome | Failure outcome | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 | Code inspection | Termination and fence attempt logic lives in the new owner; `AgentRun` delegates to it; no caller changed beyond the absence of behavior change | Logic left in `AgentRun` or duplicated | Code review |
| AC-002 | REQ-002 | BEH-002 | Line count | `agent-run.ts` ≤ 400 effective lines; each new owner ≤ 400 | Over the target | Code review count |
| AC-003 | REQ-001, REQ-003 | BEH-001, SCN-001, SCN-002 | Run the Part A suites | `agent-run.test`, `agent-run-root-shutdown-fence.test`, `agent-run-compaction-races`, `frozen-root-termination-scope`, `configured-agent-execution-handle`, `agent-org-run-termination`, `root-team-run-termination` and `native-root-termination.integration` all pass. Only imports and construction may change (DEC-003); no assertion is removed or relaxed | Any assertion changed | Unit/integration; diff of test assertions |
| AC-004 | REQ-003 | SCN-001 | Live Stop of a busy Org on Codex | LE-O1 on Codex passes at least 10 times in a row | Any failure | Live E2E |
| AC-005 | REQ-004 | BEH-003 | Code inspection | One implementation per listed mechanic; the three roots use it through adapters; no remaining copies of `withLiveLease`, liveness, reservation, presentation, commands or delivery bodies | A copy remains | Code review; grep |
| AC-006 | REQ-004, REQ-005 | BEH-003, SCN-003, SCN-004 | Run the Team, Org and standalone unit and integration suites | All pass with unchanged assertions, except the new and updated REQ-006 tests | Any other assertion changed | Unit/integration |
| AC-007 | REQ-004, REQ-005 | SCN-003, SCN-004 | Live suites on Claude and Codex | `standalone-agent-collaborator-mention.e2e` and `agent-initiated-collaborators.e2e` (LE-A1, A2, A3, T1, O1, F1) pass | Failure that does not also occur on base for the same test and message | Live E2E vs base |
| AC-008 | REQ-006 | BEH-004, SCN-005 | An Org agent calls `delegate_task` with its own address | The tool result is `{code: "COLLABORATION_SELF_TARGET_REJECTED", message: "An Agent cannot delegate a task to its own logical placement."}`; Team and standalone unchanged | `TASK_DELEGATION_ERROR` | New unit test (Org); existing standalone test |
| AC-009 | all | — | Full suite run | No new failures compared with E-X1, compared by test name and message | New failure | Unit/integration vs baseline |
| AC-010 | REQ-007 | — | Delivery history | Part A commits and gate records precede any Part B commit | Interleaved | Review of history and records |

## Relevant Scenarios And Journeys
| ID | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Stop a busy root | Stop on a Team, Org or standalone run | Agents mid-turn | Stop → fence each AgentRun → interrupt → quiescence → terminate | Root stopped; reopen works | A turn ends during the interrupt round trip (F-02) → still stops | Supported Normal | Predecessor SC-03, F-02 | REQ-001/003; AC-003/004 |
| SCN-002 | User/Operational | User; server | End a single run | Standalone Stop, delete or archive; server shutdown `stopAll` | Run active or idle | Prepare → commit → finish | Run terminated | A cancelled preparation reopens input | Supported Normal | E-A3 | REQ-001/003; AC-003 |
| SCN-003 | User (agent) | Agent | Message another agent | `send_message_to` by address or run ID | Root active | Resolve → lease or readiness → deliver → present | Delivered as today | Not found or not live → today's code and message per root | Supported Normal | E-B2, E-B3 | REQ-004/005; AC-006/007 |
| SCN-004 | User | User; agent | Operate children and bring in collaborators | Operator message or command to a child; `@` mention; `delegate_task` | Root active | Per-root command, reservation, delegation | As today | Host command rejected (standalone) as today | Supported Normal | E-B2 | REQ-004/005; AC-006/007 |
| SCN-005 | User (agent) | Org agent | (Mistaken) self-delegation | `delegate_task(own address)` | Org active | Resolve → self check | Coded rejection | — | Supported Normal (an LLM may call it) | E-B3 D-1 | REQ-006; AC-008 |

## UI, Interaction, And Experience Requirements
- Applicable: `No`. No UI change. The only agent-visible change is the error code in BEH-004.
- Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements
| ID | REQ/AC | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-002; AC-002 | Other (maintainability) | `agent-run.ts` ≤ 400 effective lines; new owners ≤ 400 | Count |
| QR-002 | REQ-003; AC-004 | Reliability | LE-O1 on Codex ≥10 consecutive passes | Live |

## Data Continuity And Acceptable Loss
- Persisted data affected: `No`. Message, task and package formats and their stores are unchanged; only code ownership
  moves.

## External Contracts And Dependencies
| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Agent tool results (`delegate_task`, `send_message_to`) | Unchanged except BEH-004 | `task-delegation-tool-serialization.ts` | An LLM keyed on the error code (low) |
| SR-006 § 11 fence contract | Preserved exactly | Predecessor design and docs | Subtle timing regressions → AC-004 |
| Runtime backends (Codex, Claude, AutoByteus, AGY…) | Untouched | — | — |

## Supplemental Artifacts
| Path | Purpose | REQ/AC | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/baseline-server-failures.txt` | Baseline for AC-009 | AC-009 | Evidence | N/A |

## Assumptions
| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Termination and fence logic can move behind a port onto AgentRun's private state without changing serialization order (dispatch queue) | REQ-001/003 | Architecture design; AC-003/004 | Open |
| ASM-002 | Shared delivery mechanics can carry the D-2 to D-5 differences as adapter policy without behavior change | REQ-004/005 | Architecture design; AC-006/007 | Open |

## Open Decisions And Questions
| ID | Question | Why it matters | Options and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Approve the Org self-delegation code change (BEH-004)? | The only behavior change | **Recommended: yes.** It is drift; same message; agents see the same code in every root | User | Open |
| DEC-002 | Other per-root differences (D-2 standalone pre-resolution self-check; D-3 address delivery to a non-live child: Team rejects, standalone wakes, Org delivers without a lease; D-4 texts; D-5 root-only rules): preserve or harmonize? | Harmonizing changes behavior; preserving limits sharing | **Recommended: preserve all** as explicit adapter rules (REQ-005). Harmonizing D-3 would be a separate decision, or a ticket, once architecture establishes whether it is observable | User | Open |
| DEC-003 | Size target and "unchanged" meaning | Measurable gates | **Recommended:** `agent-run.ts` ≤ 400 effective lines (REQ-002); "suites pass unchanged" means no assertion removed or relaxed, while import paths and construction of moved units may change (AC-003) | User | Open |
| DEC-004 | Phasing inside the one ticket | Failure attribution | **Recommended: yes**, per the reviewer. Part A first with its own review and E2E gate and commits, then Part B with its own (REQ-007) | User | Open |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001 | AC-001, AC-003 | SCN-001, SCN-002 |
| REQ-002 | — | BEH-002 | AC-002 | — |
| REQ-003 | UC-001, UC-002 | BEH-001 | AC-003, AC-004 | SCN-001, SCN-002 |
| REQ-004 | UC-003, UC-004 | BEH-003 | AC-005, AC-006, AC-007 | SCN-003, SCN-004 |
| REQ-005 | UC-003, UC-004 | BEH-003 | AC-006, AC-007 | SCN-003, SCN-004 |
| REQ-006 | UC-005 | BEH-004 | AC-008 | SCN-005 |
| REQ-007 | — | — | AC-010 | — |
| (all) | — | — | AC-009 | — |

## Architecture Phase Input
- Scenarios to map: SCN-001 to SCN-005.
- Constraints:
  - the dispatch-queue serialization and the fence's microtask evaluation order;
  - `AgentRun`'s public API;
  - per-root texts and codes;
  - the standalone host handle;
  - the Team root's operation gate (`materializationGate`).
- Deferred to design:
  - the new owner's name and placement;
  - the port shape onto AgentRun state;
  - the shared delivery core's shape and adapter boundaries;
  - whether Team's `root-team-run.ts` (449 lines) delivery code moves into the Team adapter.
- To verify:
  - D-3's observable reach (can an address resolve to a non-live task copy?);
  - every `test-support/` harness importing moved paths (E-X2).
- Risks: two high-risk refactors in one ticket (mitigated by REQ-007); expected classification Large/High.

## Readiness Check
### Content Ready For Approval
- Current behavior evidence-backed: Yes. Desired and preserved explicit: Yes. Scope and non-goals clear: Yes.
- REQ/AC testable and traceable: Yes. Scenarios covered: Yes. Supplements: N/A. UI/UX: N/A.
- Open decisions visible: Yes (DEC-001–DEC-004). Content ready for user approval: **Yes**.
### Approved Basis Ready For Design
- User approval received: **No** (pending). Ready for design: No.
