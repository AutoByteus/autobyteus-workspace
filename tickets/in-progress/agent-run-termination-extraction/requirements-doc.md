# Requirements Document — agent-run-termination-extraction

## Document Status
- Status: **Ready for Approval** (SR-002, 2026-10-05).
- Current solution revision ID: `SR-002`. SR-001 was the two-part baseline (Part A and Part B) and was never approved.
- Package: `agent-run-termination-extraction`. It was bootstrapped as `agent-run-termination-and-root-delivery-core`
  and renamed in SR-002 before any handoff.
- Request: `/code_reviewer`, 2026-10-04, directed by the user (one combined ticket). Narrowed by the user on 2026-10-05:
  "lets do Part A in this ticket. after the ticket is done. we first validate for the bheavor for Part B. to chekc
  whether the its valuable or not right? … lets do the part a in the ticket."
- Requirements owner: Solution Designer.
- Approval state: **pending** confirmation of this Part A baseline (DEC-003).
- Behavior-defining supplements: none. Predecessor SR-006 § 11 is the contract to preserve (read-only).
- Workspace:
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction`.
  - Branch `codex/agent-run-termination-extraction`.
  - Base `origin/personal` @ `03d5db06b`. Target `personal`.

## Problem And Desired Outcome
- **Problem.** `AgentRun` (`agent-run.ts`) is at 498 of the 500 allowed effective lines (E-A1). It owns input
  admission, interrupts, compaction recovery, the root-shutdown fence and termination. These state machines interact in
  fragile ways; the F-02 busy-Org Stop race came from exactly that (E-A4). The next change to `AgentRun` would break the
  size guardrail.
- **Affected:** server maintainers and reviewers. There is no user- or agent-visible change.
- **Desired outcome.** Termination and root-shutdown-fence attempt handling have one clearly owned home outside
  `AgentRun`, with identical behavior, and `AgentRun` has room to change again.
- **Success:**
  - the size target is met;
  - the existing suites pass with unchanged assertions;
  - the busy-Org Stop live gate passes;
  - there are no new test failures compared with the base.

## Relevant Current And Desired Behavior
| ID | Kind | Scenarios | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | `AgentRun` implements termination (prepare, try-if-quiescent, commit/finish, cancel) and the root-shutdown fence (F-1–F-4) inline (E-A2, E-A4) | Same behavior, owned by a separate unit | Every termination and fence outcome, timing rule (5000 ms), retry rule and diagnostic of SR-006 § 11; the public `AgentRun` methods and their results |
| BEH-002 | Contract | — | `agent-run.ts` has 498 effective lines (E-A1) | Comfortably under the guardrail (REQ-002) | — |

## Stakeholders, Actors, And Outcomes
| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| User (Stop, delete, archive, app quit) | Runs stop as today | No visible change | Live gate passes |
| Maintainers and reviewers | Change `AgentRun` safely | One owner for termination and fence | Size guardrail |

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Stop or end any root (Team, Org, standalone) whose agents may be busy, on every runtime | SCN-001 |
| UC-002 | Stop or terminate a single AgentRun (standalone Stop, delete or archive, server shutdown) | SCN-002 |

### Out Of Scope
- **Part B, the shared root delivery core**, and everything in it: Org self-delegation code parity and the per-root
  delivery differences D-1 to D-5. It is deferred to a follow-up candidate that first validates the behavior
  (`/Users/normy/autobyteus_org/solution-designer-reports/root-delivery-core-followup-candidate.md`). SR-001's REQ-004
  to REQ-007, AC-005 to AC-008, AC-010, UC-003 to UC-005, SCN-003 to SCN-005 and BEH-003/BEH-004 moved there; their IDs
  are retired in this ticket.
- Splitting `AgentRun`'s other concerns (input admission, interrupts, compaction recovery, events), except as needed
  for REQ-001's ports.
- The `tokenUsageMeterStore` split; `bindProcess…`/`getProcess…` slot rewiring; host activation inside the standalone
  root gate; CG-05.
- Fixing the base failures in E-X1.

### Non-Goals
- No new fence or termination semantics. In particular, the stale-local-turn residual from the predecessor
  (ARCH-REV-004 N-1) is not addressed.
- No performance change is targeted.

### Preserved Behavior Boundary
- BEH-001 preserved column; AC-003, AC-004.
- Invariant: every termination and fence result, timing, retry, published status and input-state event, and diagnostic
  is unchanged for every root and runtime.

### Review Authority
- A blocking finding must cite a REQ, AC or BEH ID here.
- Any change in termination or fence behavior is a `Requirement Gap` that needs user approval.

## Requirements
| ID | Requirement | BEH | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | **Ownership.** Termination (prepare, try-if-quiescent, commit/finish, cancel) and root-shutdown-fence attempt management (F-1–F-4) are owned by a dedicated unit outside `AgentRun`. `AgentRun` keeps its public methods (`prepareTermination`, `tryPrepareTerminationIfQuiescent`, `fenceInputAndInterruptForRootShutdown`, `terminate`) with identical results, so callers are unaffected. | BEH-001 | Must | Fragile interaction; F-02 | Request Part A |
| REQ-002 | **Size.** `agent-run.ts` is at or under **400** effective non-empty lines. Each new owner is at or under 400. | BEH-002 | Must | Leave headroom under the 500 guardrail (DEC-003) | E-A1 |
| REQ-003 | **Behavior-neutral.** SR-006 § 11 F-1–F-4 hold exactly as today: rejected interrupt → wait for quiescence; 5000 ms bound → original result; only acceptance latched; warn diagnostics with turn IDs. The same holds for termination's cancel, reopen and finish-retry rules. | BEH-001 | Must | No behavior change | Request Part A; E-A4 |

## Acceptance Criteria
| ID | REQ | BEH / SCN | Trigger | Expected outcome | Failure outcome | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 | Code inspection | Termination and fence attempt logic lives in the new owner; `AgentRun` delegates to it; callers are unchanged | Logic left in `AgentRun` or duplicated | Code review |
| AC-002 | REQ-002 | BEH-002 | Line count | `agent-run.ts` ≤ 400 effective lines; each new owner ≤ 400 | Over the target | Code review count |
| AC-003 | REQ-001, REQ-003 | BEH-001, SCN-001, SCN-002 | Run the Part A suites | `agent-run.test`, `agent-run-root-shutdown-fence.test`, `agent-run-compaction-races`, `frozen-root-termination-scope`, `configured-agent-execution-handle`, `agent-org-run-termination`, `root-team-run-termination` and `native-root-termination.integration` all pass. Only imports and construction of moved units may change (DEC-003); no assertion is removed or relaxed | Any assertion changed | Unit/integration; diff of test assertions |
| AC-004 | REQ-003 | SCN-001 | Live Stop of a busy Org on Codex | LE-O1 on Codex passes at least 10 times in a row; the live AC-001-equivalent suites (`standalone-agent-collaborator-mention.e2e`, `agent-initiated-collaborators.e2e`) pass on Claude and Codex | Any failure not also on base (same test and message) | Live E2E vs base |
| AC-009 | all | — | Full suite run | No new failures compared with E-X1, compared by test name and message | New failure | Unit/integration vs baseline |

AC-005 to AC-008 and AC-010 are retired (moved to the Part B follow-up).

## Relevant Scenarios And Journeys
| ID | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Stop a busy root | Stop on a Team, Org or standalone run | Agents mid-turn | Stop → fence each AgentRun → interrupt → quiescence → terminate | Root stopped; reopen works | A turn ends during the interrupt round trip (F-02) → still stops | Supported Normal | Predecessor SC-03, F-02 | REQ-001/003; AC-003/004 |
| SCN-002 | User/Operational | User; server | End a single run | Standalone Stop, delete or archive; server shutdown `stopAll` | Run active or idle | Prepare → commit → finish | Run terminated | A cancelled preparation reopens input | Supported Normal | E-A3 | REQ-001/003; AC-003 |

## UI, Interaction, And Experience Requirements
- Applicable: `No`. Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements
| ID | REQ/AC | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-002; AC-002 | Other (maintainability) | `agent-run.ts` ≤ 400 effective lines; new owners ≤ 400 | Count |
| QR-002 | REQ-003; AC-004 | Reliability | LE-O1 on Codex ≥10 consecutive passes | Live |

## Data Continuity And Acceptable Loss
- Persisted data affected: `No`. Only code ownership moves.

## External Contracts And Dependencies
| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| SR-006 § 11 fence contract and `docs/modules/agent_execution.md` "Root Shutdown Fence" | Preserved exactly; docs updated for the new owner | Predecessor design and docs | Subtle timing regressions → AC-004 |
| Callers of `AgentRun`'s termination API (E-A3) | Unchanged | E-A3 | — |
| Runtime backends | Untouched | — | — |

## Supplemental Artifacts
| Path | Purpose | REQ/AC | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/baseline-server-failures.txt` | Baseline for AC-009 | AC-009 | Evidence | N/A |

## Assumptions
| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Termination and fence logic can move behind a port onto AgentRun's private state without changing serialization order (dispatch queue, microtask evaluation) | REQ-001/003 | Architecture design; AC-003/004 | Open |

## Open Decisions And Questions
| ID | Question | Options and recommendation | Status |
| --- | --- | --- | --- |
| DEC-001 | (SR-001) Org self-delegation code | Moved to the Part B follow-up | Retired |
| DEC-002 | (SR-001) Per-root delivery differences | Moved to the Part B follow-up | Retired |
| DEC-003 | Size target and "unchanged" meaning | **Recommended:** `agent-run.ts` ≤ 400 effective lines; "suites pass unchanged" means no assertion is removed or relaxed, while import paths and construction of moved units may change | Open, awaiting confirmation |
| DEC-004 | (SR-001) Phasing | Moot: a single phase | Retired |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001 | AC-001, AC-003 | SCN-001, SCN-002 |
| REQ-002 | — | BEH-002 | AC-002 | — |
| REQ-003 | UC-001, UC-002 | BEH-001 | AC-003, AC-004 | SCN-001, SCN-002 |
| (all) | — | — | AC-009 | — |

## Architecture Phase Input
- Scenarios to map: SCN-001, SCN-002.
- Constraints:
  - dispatch-queue serialization and the fence's microtask evaluation order;
  - `AgentRun`'s public API;
  - the cancel/reopen and finish-retry semantics;
  - F-1–F-4.
- Deferred to design: the new owner's name and placement; the port shape onto AgentRun state; whether
  `prepared-agent-run-termination.ts` and `agent-run-root-shutdown-fence.ts` stay separate units.
- To verify: every `test-support/` harness and fixture that imports moved paths (E-X2); the 16 base-failing
  `agent-run-manager` tests, compared by name.
- Risks: Stop on every root and runtime; expected classification Large/High.

## Readiness Check
### Content Ready For Approval
- Current behavior evidence-backed: Yes. Desired and preserved explicit: Yes. Scope and non-goals clear: Yes.
- REQ/AC testable and traceable: Yes. Scenarios covered: Yes. Supplements: N/A. UI/UX: N/A.
- Open decisions visible: Yes (DEC-003). Content ready for user approval: **Yes**.
### Approved Basis Ready For Design
- User approval received: **No** (pending confirmation of this baseline). Ready for design: No.
