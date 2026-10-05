# Investigation Notes — agent-run-termination-extraction

## Bootstrap
- **Package:** `agent-run-termination-extraction` (bootstrapped as `agent-run-termination-and-root-delivery-core`, renamed in SR-002 when the scope narrowed to Part A; new ticket; not a revision of the finalized
  `standalone-agent-run-root`).
- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction`, branch
  `codex/agent-run-termination-extraction` (renamed 2026-10-05), created 2026-10-04 from `origin/personal` @ `03d5db06b` (fetched
  the same day). Finalization target: `personal`.
- **Origin:** request from `/code_reviewer` (run `code_reviewer_47ea626b23c646c88b7a7808d79784bf`), 2026-10-04,
  directed by the user: "do it as one combined ticket please … send to solution designer to bootstrap a new ticket." The
  user chose one combined ticket over the reviewer's recommendation of two.
- **Predecessor (read-only):** `origin/personal:tickets/done/standalone-agent-run-root/` (CRR-001–CRR-009;
  `design-spec.md` § 11; `api-e2e-execution-coverage-report.md`).
- **Workspace prep:** `pnpm install --frozen-lockfile --offline`; shared packages built (`autobyteus-ts`,
  application SDK contracts and backend SDK); `npx prisma generate` in `autobyteus-server-ts`.

## Part A evidence — AgentRun termination and the root-shutdown fence
- **E-A1, size.** `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`: 540 lines total, **498 effective
  non-empty lines**. The 500-line limit is a workflow guardrail
  (`.claude/skills/implementation-engineer/SKILL.md:94`: "do not knowingly grow or leave a changed source
  implementation file above `500` effective non-empty lines"), applied by implementation and code review. It is not a
  CI test. `agent-run-root-shutdown-fence.ts`: 121 effective lines.
- **E-A2, responsibilities in `AgentRun`** (method lines):
  - Event fan-out and status: `subscribeToEvents` 123, `publishEvent` 133, `publishSourceEvents` 287,
    `dispatchCanonicalStatus` 518, `getStatusSnapshot` 118.
  - Input admission and dispatch: `postUserMessage` 144, `reserveUserMessage` 176, `claimNextInput` 309,
    `startInputDispatch` 330, `executeInputDispatch` 344, `drainInputAfterLifecycleChange` 389,
    `reconcileUncertainDispatch` 453, input state 500–517.
  - Interrupt and approval: `interrupt` 213 (via `AgentRunInterruptState`), `approveToolInvocation` 205.
  - Compaction recovery: `AgentRunCompactionRecovery` wiring 83–87, `reconcileRecovery` 495.
  - **Termination:** `prepareTermination` 219, `tryPrepareTerminationIfQuiescent` 233, `terminate` 281,
    `prepareTerminationOnce` 402, `createTerminationPreparation` 422, `finishCommittedTermination` 466,
    `finishCommittedTerminationOnce` 478; fields 71–74.
  - **Root-shutdown fence:** `fenceInputAndInterruptForRootShutdown` 252, `createRootShutdownFence` 270,
    `isRootShutdownQuiescent` 438, `isFencedRecoveryWithoutTurn` 446, `scheduleRootShutdownFenceEvaluation` 462;
    field 70.
  - The termination and fence code is about 160 lines in two clusters (219–285, 402–493). It reads and writes
    AgentRun-private state: `dispatchQueue`, `lifecycleState`, `inputAdmissionState`, `interruptState`,
    `uncertainInputDispatch`, `activeInputDispatch`, `recoveryShutdownFenced`, `segmentLifecycleState`, the event
    pipeline release, and `unsubscribeFromBackendSource`. Extraction is feasible only through an explicit port onto
    that state. This is a design matter.
- **E-A3, public termination API and callers.** Files in `src` outside `agent-run.ts` that reference each method:
  `prepareTermination` 7, `tryPrepareTerminationIfQuiescent` 11, `fenceInputAndInterruptForRootShutdown` 1
  (`configured-agent-execution-handle.ts`), `.terminate()` 17. Callers span Team, Org, collaboration registries and
  `agent-run-manager.ts`.
- **E-A4, SR-006 § 11 contract** (predecessor; `origin/personal:tickets/done/standalone-agent-run-root/design-spec.md`
  § 11; `autobyteus-server-ts/docs/modules/agent_execution.md` "Root Shutdown Fence"):
  - F-1: a rejected interrupt keeps the attempt open until quiescence;
  - F-2: 5000 ms bound, then the original rejected result;
  - F-3: only acceptance is latched, and a failed attempt can be retried;
  - F-4: warn diagnostics with the turn ID at rejection and at expiry.
  - Live proof: LE-O1 on Codex passed 11/11 (predecessor API/E2E).
- **E-A5, Part A suites** (all exist):
  - `tests/unit/agent-execution/agent-run.test.ts`, `agent-run-root-shutdown-fence.test.ts`,
    `agent-run-compaction-races.test.ts`;
  - `tests/unit/agent-collaboration/frozen-root-termination-scope.test.ts`,
    `configured-agent-execution-handle.test.ts`;
  - `tests/unit/agent-org-execution/agent-org-run-termination.test.ts`;
  - `tests/unit/agent-team-execution/root-team-run-termination.test.ts`;
  - `tests/integration/standalone-agent-run-root/native-root-termination.integration.test.ts`.
  - All pass on the base (E-X1). `agent-run-root-shutdown-fence.test.ts` constructs the fence class directly, so moving
    that class changes the test's import or construction, not its assertions.

## Part B evidence — root message delivery (deferred; out of scope since SR-002, kept for the follow-up candidate)
- **E-B1, files and sizes** (effective lines):
  - `agent-team-execution/services/team-run-message-delivery.ts` 112: address and run-ID delivery, delegation
    placement, listing. The Team root's `withLiveLease`, `isLiveAgent` and `executeAgentCommand` live in
    `agent-team-execution/domain/root-team-run.ts` (449 effective lines; lines 313–350, 446), and its self-delegation
    check is at 289–299.
  - `agent-org-execution/services/agent-org-run-message-delivery.ts` 190.
  - `standalone-agent-run-root/services/standalone-root-message-delivery.ts` 241.
  - Recipient and placement resolution is already shared: `agent-collaboration/collaborators/message-recipient-resolution.ts`
    (`resolveMessageRecipient`, `resolveDelegationPlacement`) is used by all three.
- **E-B2, near-duplicates:**
  - `withLiveLease`: byte-identical in Org 166–181, standalone 210–223 and Team `root-team-run.ts` 337–350.
  - Liveness: Org `isLiveAgent` 186, standalone `isLiveChild` 225 (the same rule plus a host exclusion), Team
    `isLiveAgent` 446 (a containing-TeamRun rule).
  - Input reservation: Org 111, standalone 153 (adds the host branch; does not pass `options` through).
  - Committed-message presentation: Org 123, standalone 169 (adds host presentation on the host's own stream).
  - Operator commands: Org `executeAgentCommand` 143 (also returns `executionKind`), standalone `executeChildCommand`
    192 (rejects host commands), Team `executeAgentCommand` 313.
- **E-B3, observed per-root differences (current behavior):**
  - **D-1, self-delegation.**
    - Team (`root-team-run.ts:293-297`) and standalone (`standalone-root-message-delivery.ts:139-148`) throw
      `CollaborationContractError("COLLABORATION_SELF_TARGET_REJECTED", "An Agent cannot delegate a task to its own
      logical placement.")`.
    - Org (`agent-org-run-message-delivery.ts:105`) throws a plain `Error` with the same text.
    - `toTaskDelegationToolErrorPayload` (`agent-tools/task-delegation/task-delegation-tool-serialization.ts:8-24`)
      serializes the contract error as `{code: "COLLABORATION_SELF_TARGET_REJECTED"}` and a plain error as
      `{code: "TASK_DELEGATION_ERROR"}`. The agent sees the same message but a different code.
    - No test covers Org self-delegation. The standalone case is covered by `standalone-agent-run-root.test.ts:617-626`.
  - **D-2, self-check timing.** Standalone also rejects before address resolution when `recipient_address.trim()`
    equals the caller's address (the host is not a delegation placement). Team and Org check only after resolution.
  - **D-3, address delivery to a child that is not live.**
    - Team (`team-run-message-delivery.ts:66-68`) throws `COLLABORATION_TARGET_NOT_FOUND` ("has no live Agent
      ingress").
    - Standalone delivers through `deliverTo` → `withLiveLease`, which wakes a shut-down child.
    - Org (`agent-org-run-message-delivery.ts:65-80`) calls `communication.deliver` without a lease.
    - Whether these differ in practice depends on which placements a message address can resolve to (task copies
      versus configured Agents and collaborators). Unverified; architecture must establish it.
  - **D-4, root-specific texts.** For example, `RUN_NOT_FOUND` "is not in root" (Team), "is not in AgentOrg" (Org),
    "is not in Agent root" (standalone); `TARGET_AGENT_RUN_NOT_FOUND` "in this AgentOrg" / "in this Agent run".
  - **D-5, root-only rules.**
    - Standalone: the host is reached through `StandaloneHostAgentHandle.ensureReady` (`AGENT_ROOT_HOST_UNAVAILABLE`),
      host commands are rejected (`AGENT_ROOT_HOST_COMMAND_REJECTED`), and host presentation goes on the host stream.
    - Org: `executeAgentCommand` returns `executionKind`.
    - Team: delivery takes an `InterAgentMessageDeliveryIntent` through `TeamCommunicationService`. Org and standalone
      take sender and receiver identities through `getCommunication().deliver`.
- **E-B4, live suites:** `tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts`;
  `tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` (cases LE-A1, LE-A2, LE-A3, LE-T1, LE-O1, LE-F1).

## Cross-cutting
- **E-X1, baseline** (`evidence/baseline-server-failures.txt`): the unit and integration run over agent-execution,
  agent-collaboration, agent-org-execution, agent-team-execution and standalone-agent-run-root on `03d5db06b` gives
  27 failed and 1695 passed. The 27 failures are in:
  - `agent-run-manager` 16;
  - `codex-tool-log-correlation` 4;
  - `agent-api-status-projectors` 2;
  - `team-conversation-target-websocket.integration` 2;
  - `agent-run-provisioning-service` 1;
  - `autobyteus-status-projector` 1;
  - `agent-org-status-snapshot-traversal` 1.

  None of them are Part A suites (E-A5). Compare by test name and message (the predecessor's ARCH-REV-003 residual).
- **E-X2, lessons carried forward** (predecessor CRR and DR-001):
  - trace behavior from the user entry surface forward;
  - when moving files, grep the whole workspace, including `test-support/` harnesses with their own Vitest configs.
- **E-X3, out of scope per the request:**
  - the `tokenUsageMeterStore` split;
  - `bindProcess…`/`getProcess…` slot rewiring;
  - host activation inside the standalone root gate;
  - CG-05.

## Supplement Inventory
| Supplement | Purpose | Status |
| --- | --- | --- |
| `evidence/baseline-server-failures.txt` | Baseline failing-test identities for gate comparison | Evidence |
| Predecessor `origin/personal:tickets/done/standalone-agent-run-root/` (design-spec § 11, code-review-report, api-e2e-execution-coverage-report) | The SR-006 fence contract and the origin of these debts | Read-only, finalized |
