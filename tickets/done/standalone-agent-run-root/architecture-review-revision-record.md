# Architecture Review Revision Record — standalone-agent-run-root

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial review of SR-003 | SR-002, SR-003 | N/A | Fail | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | Round 2 / SR-004 answers ARCH-REV-001 | SR-004 | Fail | Pass | AR-001, AR-002, AR-003 (all resolved) |
| ARCH-REV-003 | Round 3 / SR-005 base refresh (delta review) | SR-005 (requirements SR-002) | Pass | Pass | None (AR-001–AR-003 remain resolved) |
| ARCH-REV-004 | Round 4 / SR-006 root shutdown fence (CRR-005 F-02) | SR-006 (requirements SR-002) | Pass | Pass | None blocking; non-blocking notes N-1, N-2 |

## Revision Entries

### ARCH-REV-001 — Initial baseline: sound ownership refactor; three contract gaps at the coordinator, stream and activation entry points

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/design-review-report.md`
- Review round and trigger: Round 1. The Solution Designer sent SR-003 as `Architecture Design Complete` (Large/High).
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `architecture-design-handoff.md`; N/A.
- Relevant solution revision IDs: SR-002, SR-003.
- Prior authoritative decision: N/A.
- Current authoritative decision: Fail (Design Impact).
- Baseline established:
  - The behavior basis was confirmed at `2d3b66005`.
  - AR-001: stream connect no longer restores the host, which is observable and conflicts with Q-3.
  - AR-002: the coordinator ↔ root port omits `onActiveRunReady` and `lifecycleObserver`.
  - AR-003: the other `AgentRunService` activation entry points are not dispositioned after the member-context pull is removed.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (Medium, blocking), AR-002 (Medium, blocking), AR-003 (Low).
- Material classification changes: none. The classification stays Large/High.
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - the Daily Assistant blast radius;
  - host activation under the root gate;
  - header parser tolerance;
  - the unknown model-save cause.

### ARCH-REV-002 — SR-004 resolves AR-001–AR-003; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/design-review-report.md`
- Review round and trigger: Round 2. SR-004 answers ARCH-REV-001.
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `design-review-report.md` (ARCH-REV-001); AR-001–AR-003.
- Relevant solution revision IDs: SR-004 (requirements SR-002 unchanged).
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Pass.
- What changed: verified the SR-004 command-routing, stream and entry-point text (design-spec lines 86–129) against the round-1 evidence.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium, blocking) | Resolved | SR-004; design § Agent-collaboration stream; Key Tradeoffs corrected; tests | Connect → `resolveRoot` → `ensureHostReady`, as today. `isActive` is the real handle state. `AGENT_ROOT_UNAVAILABLE` on failure. A failed mention still leaves the host active (`ensureReady` before admission, as today). |
| AR-002 | Open (Medium, blocking) | Resolved | SR-004; `StandaloneRunCommandPort.postUserMessage` | `ensureReady` → `onActiveRunReady` (stream bound before post) → admission → `postUserMessage(message, postOptions)` with `lifecycleObserver` passed through. Returns `{run, admission, post}`; the coordinator keeps records, dedupe, overlay and acks. Interrupt and approval act on a live host only. |
| AR-003 | Open (Low) | Resolved | SR-004; entry-point table | Eligible create/activate/restore/resolve go through `resolveRoot` → `ensureHostReady`. `resolveCommandReadyAgentRun` is removed for eligible runs. `activateHost` throws without a member context for eligible metadata. |

- New or remaining finding IDs: none.
- Non-blocking implementation note: `AgentRunService` now reaches the root, so it must use an injected port; update the dependency rule. This also applies to `terminateAgentRun` → `stopRoot` from SR-003, which round 1 missed.
- Material classification changes: none. The classification stays Large/High.
- Recommended recipient: `/software_engineering_team/implementation_engineer`, then an informational notice to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - the Daily Assistant blast radius;
  - host activation under the gate;
  - header parser tolerance;
  - the unknown model-save cause.

### ARCH-REV-003 — SR-005 base refresh: deltas D-R1–D-R7 sound; D-R3 is valid REQ-009 guard maintenance; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/design-review-report.md`
- Review round and trigger: Round 3 (delta review). The Solution Designer sent SR-005 as `Architecture Design Complete` (Large/High) after rebasing the branch onto `origin/personal` @ `b37d7a934`.
- Triggering role, report path, and finding IDs: `/solution_designer`; `architecture-design-handoff.md`; N/A.
- Relevant solution revision IDs: SR-005. Requirements basis SR-002, unchanged.
- Prior authoritative decision: Pass (ARCH-REV-002, on SR-004 at base `2d3b66005`).
- Current authoritative decision: Pass.
- What changed: reviewed D-R1–D-R7 against the rebased code at `b26f6436c`.
  - **D-R3, AFB-004.** The `AgentRunIdentityAllocator` constructor now accepts only `agentDefinitionService`, and both construction sites inject it. Narrow `requiredInputs` to that input; do not delete the obligation.
  - **D-R3, tool registration.** `registerProjectTaskTools` is registered through the single readiness owner (`agent-tool-loader.ts:46`). Add it to the ordered expected list after `core`.
  - **D-R1.** `containsRunId` is verified absent.
  - **D-R2.** The work-request section is verified at the moved instruction path.
  - **D-R7.** In the fixture and cleanup test diffs against upstream, only AC-001-mandated API substitutions changed; assertions are unchanged.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Resolved | SR-004/SR-005 | Design text unchanged; no rebase delta touches stream connect |
| AR-002 | Resolved | Resolved | SR-004/SR-005 | Port contract unchanged |
| AR-003 | Resolved | Resolved | SR-004/SR-005 | Entry-point dispositions unchanged. E-16 removes one package read from run creation; there is no new entry point |

- New or remaining finding IDs: none.
- Material classification changes: none. The classification stays Large/High.
- Recommended recipient: `/implementation_engineer`, then an informational notice to `/solution_designer`.
- Remaining risks or uncertainty:
  - base-failure masking: compare failures by test identity and message, not by count (`agent-run-manager` is on the REQ-001 path);
  - a possible upstream fix of the same guard inventories;
  - the model-save cause is still unrecorded;
  - the General Agent blast radius;
  - host activation under the gate;
  - header parser tolerance.

### ARCH-REV-004 — SR-006 § 11 root shutdown fence: F-1–F-4 sound and aligned with the termination chain's retry contract; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/design-review-report.md`
- Review round and trigger: Round 4. SR-006 answers CRR-005's failure-origin review of API/E2E F-02 (Design Impact).
- Triggering role, report path, and finding IDs: `/solution_designer`; `architecture-design-handoff.md`, `code-review-report.md` (CRR-005, F-02).
- Relevant solution revision IDs: SR-006. Requirements basis SR-002, unchanged.
- Prior authoritative decision: Pass (ARCH-REV-003).
- Current authoritative decision: Pass.
- What changed (verified against code at `f84497dd4`):
  - The current fence latches a non-accepted interrupt permanently.
  - Every layer above it clears its memo on non-accept and retries: the Org/Agent frozen scope, the Team frozen scope and `RootTeamRun`. The handle re-calls the AgentRun on every attempt.
  - So F-3 aligns the AgentRun with the established contract; the old permanent failure was not an intended guarantee.
  - F-1 reuses the existing quiescence success signal that accepted interrupts already use. It is runtime-agnostic, so not parsing error text is correct.
  - The F-2 bound affects the failure path only.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-003 | Resolved | Resolved | SR-004–SR-006 | Not touched by § 11 |

- New or remaining finding IDs: none blocking.
- Non-blocking notes:
  - **N-1.** The risk wording "F-1 and F-3 handle both" overstates the design. `reconcileRuntimeSnapshot` keeps a local `IDENTIFIED` turn, so stale state (P-005, `Unclear`) is bounded and diagnosed, not handled. An F-4 expiry warning with a local `IDENTIFIED` turn during live checks → escalate as Design Impact; do not tune the bound.
  - **N-2.** Add the F-2 test case "quiescent at expiry without a dispatch". Log the turn ID at both rejection and expiry.
- Material premises:
  - P-004 (completion race): `Reachable`.
  - P-005 (stale local turn): `Unclear`, no machinery.
  - P-006 (new turn during an open attempt): `Unclear`, no machinery.
- Material classification changes: none. The classification stays Large/High.
- Recommended recipient: `/implementation_engineer`, then an informational notice to `/solution_designer`.
- Remaining risks or uncertainty:
  - race versus stale is unproven; resolved by the LE-O1 ≥10 Codex gate and F-4;
  - a genuinely failed Stop reports up to 5 s later, but is retryable.
