# API/E2E Coverage Investigation — Agent Input Delivery Simplification (v3)

## Investigation Meta

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/`.

- Requirements Doc: `requirements-doc.md` (SR-006, user-approved 2026-10-24; DEC-003, DEC-005)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-006, SR-007)
- Design Spec: `design-spec.md` (SR-007, Self-Validation C-1..C-4)
- Supplemental Task Artifacts:
  - `handoff-sr-007-design.md`
  - `follow-ups.md` (FU-001..FU-004)
  - `probes/req-012-task-close-during-append.repro.test.ts`
- Design Review Report: `design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-004)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-005 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`. API-REV-001/002 validated the superseded v2 implementation IR-001..003 on another branch; that evidence does not carry over.
- Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 3 (first on v3)
- Trigger: CRR-005 Pass on IR-004 (`a3391c924f`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

`RootCommunicationEngine` owns the message list and the save-then-deliver protocol for every root (standalone, Team, Org) and every entry form:
- same-root `deliver`;
- `acceptFromRemote`;
- the sender record of a remote send, `prepareRemoteSend` → `commitSentToRemote`.

It builds one `RootMessageAppend` per message, which each coordinator runs under its lock (`commitMessageAppend`), appending to the append-only message logs (the coordinating log and the Task agents' own logs). Per-root ports supply only root facts.

Preserved per root and entry form:
- saved log bytes, IDs, codes, messages and event order (V-2/V-3);
- `AgentRun` admission semantics;
- member activation;
- the global router.

Removed:
- the dead router;
- `TaskAgentExecutionRegistry.reserveInput`;
- `nextMessages`;
- the Team facade.

Behavior change, REQ-012 + DEC-005: every Task-scope closure on the teammate path returns the readable refusal `{accepted:false, code:"TASK_AGENT_RESOURCE_CLOSED", message}`, and the root keeps working. This holds whether the closure is found:
- before the slot is held;
- under the lock, including when the forced release already dropped the slot;
- after the durable write. The record is then kept and shown in the root view, and the recipient never processes it.

Two further outcomes:
- A recipient that stopped after the write gives `AGENT_RUN_NOT_ACCEPTING_INPUT`.
- A genuine post-write failure still fail-stops the root.

K-1: the Team root now releases a committed slot in a `finally` on that genuine-failure path; nothing caller-visible changes.

Persisted data: `Not Affected`.

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001..SCN-016. The changed path is SCN-005, SCN-006, SCN-014, SCN-015 and SCN-016.
- Real-use scenarios added:
  - SCN-A1/A2: another agent marks the Project Task DONE (`update_task`) while this root's message to that Task's copy is being appended. The Closer root is the supported "DONE from another root" case.
  - SCN-A3: the root keeps working, and restore reads the logs back.
- Contrived scenarios: none.

## Changed Surface And Boundary Classification

| Surface | Affected | Changed Boundary | Repository Evidence | Gap | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Backend logic | Yes | Engine, append, ports, coordinators | Contract (V-2/V-3), append unit, V-4 per root with real coordinators | Real MCP sender, real cross-root Task closure, copy stop, restore | Live API (scripted AGY) |
| API / transport | Yes (DEC-005 outcome) | `send_message_to` tool result | Unit refusals | Agent-visible MCP result | Live API |
| Remote collaboration | Yes | `acceptFromRemote`, `commitSentToRemote` | Contract captures, remote unit suites | Two real nodes | Two-server E2E |
| Process / lifecycle | Yes | Closure during the append; restore | Unit | Real lifecycle | Live API |
| Persisted data | Not Affected | Writer call site moved; log owners under the lock (K-2) | V-2 byte identity | Restore through real roots | Live API restore |
| Frontend | No | — | — | — | — |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (restructured on this base). The rules that apply here:
  - suite descriptions go in the test file header, not TESTING.md;
  - rerun by impact, one run per case per round;
  - one heavy run at a time;
  - E2E folders run with a clean environment;
  - signed-in CLI suites need the real `HOME`, `USER` and `LOGNAME`;
  - `test:integration:prepare` once per worktree;
  - Rule 9: find the cause of every failure.
- Discrepancy (pre-existing): `pnpm -C autobyteus-server-ts typecheck` vs `tsc -p tsconfig.build.json`. The build typecheck is used.
- Fixture: the scripted CLI gains the opt-in `AGY_FAKE_TOOL_TIMEOUT_MS` and `AGY_FAKE_TOOL_LOG` (both off by default).

## Existing Durable Coverage Inventory

| Path | Intent | Decision | Action |
| --- | --- | --- | --- |
| `unit/agent-collaboration/root-communication-baseline-contract.test.ts` (+ JSON) | V-2/V-3, 12 captures | Still Valid | Run (R-02) |
| `unit/agent-collaboration/root-communication-task-closure.test.ts`, `unit/agent-collaboration/execution/communication/root-message-append.test.ts` | V-4, DEC-005, K-1, append states | Still Valid | Run (R-02) |
| Ported unit suites (commit path, refusals, remote view sequence, Team port, Org presentation, Team termination, application dispatch, Claude active-turn) | Preserved assertions | Still Valid | Run (R-02) |
| `e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Remote messages per root kind, closure, restarts | Still Valid | Run (REM) |
| `e2e/projects/*`, `e2e/agent-org-runs/*`, `e2e/agent-team-runs/*` | Delegation, teammate delivery, closure, reactivation, Org publication | Still Valid | Run (REG-E2E) |
| `e2e/runtime/team-busy-member-mid-turn-delivery.e2e.test.ts` | Real teammate delivery into a running turn | Still Valid | Run (LIVE-RT) |

## Durable Coverage To Add

| Case ID | Behavior | REQ / AC | Artifact | Why |
| --- | --- | --- | --- | --- |
| TDR-001..003 | REQ-012/DEC-005 at the server boundary in both windows, per root; the root keeps working; restore | REQ-012, AC-012, DEC-005, AC-013 | `autobyteus-server-ts/tests/e2e/projects/teammate-delivery-task-closure-race.e2e.test.ts`, ported from v2 to v3 (append logs, task keys, readable refusal) | V-4 uses real coordinators but controlled closure. The real MCP sender, cross-root Task closure, copy stop and root view are otherwise unproven. |

## Broader Validation Decision

- `Required`: Live API and lifecycle (scripted AGY), two real servers, and one real-runtime suite.
- Browser: not required. There is no frontend change, and the root-view snapshot (what the UI renders) is asserted.

## Not Tested / Deferred

| Behavior | Reason |
| --- | --- |
| AC-001/008/011 | Code and docs inspection (review- and delivery-owned) |
| Genuine post-write failure fail-stop (K-1) | Not producible through real use; V-4 counterpart only |
| FU-001..FU-004 | Out of scope (follow-ups) |

## Investigation Decision

- Proceed: `Yes`. Durable coverage added: `Yes` (race suite, fixture options). Reroute: `No`.
