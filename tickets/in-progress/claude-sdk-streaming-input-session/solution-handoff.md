# Solution Handoff — claude-sdk-streaming-input-session

- Result classification: `Architecture Design Complete`
- Package identifier: `claude-sdk-streaming-input-session`
- Current solution revision: `SR-011` (shared AgentRun append claim after IMP-DI-001; requirements re-approved with REQ-012)
- Task size / architectural risk: `Large` / `High` (evidence: `design-spec.md` → "Task Size And Architectural Risk")
- Approval state: requirements `Approved` at SR-006 by explicit user decisions on 2026-09-24/25 (quotes in `requirements-doc.md` → Document Status; SR-003..SR-006). Design is not user-approved content; it realizes the approved requirements.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session`
- Branch: `codex/claude-sdk-streaming-input-session`
- Base: `origin/personal` @ `6f7b5e371` (v1.4.81)
- Finalization target: `origin/personal`
- Ticket artifacts are untracked in the worktree; there is no `node_modules` yet (`pnpm install` before tests)

## Original Request And Goal

The user reported that Claude agents' background Bash never finishes (predecessor `claude-sdk-background-task-lifecycle`, v1.4.78 temporary fix). They approved this follow-up: move the Claude Agent SDK backend to streaming input mode, with one Claude process per agent run for the run's whole life (no idle timer; terminate ends it). Results:
- background tasks work, and the CLI reports completions in a turn it starts itself, announced with `SYSTEM_TASK_NOTIFICATION`;
- messages to a busy agent are delivered mid-turn;
- Stop ends only the turn;
- inline images;
- the v1.4.78 policy env is removed (clean switch);
- no background-task UI.

## Artifacts (absolute paths)

- Requirements (approved): `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/solution-revision-record.md`
- Probe evidence (scripts + logs, evidence only): `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/probe-evidence/` (E, F, G/H/I images, J, K, L, M, N, O; `lib.mjs` helper; the probes need the SDK tarball extracted at `/tmp/sdk0280/package`)
- Predecessor: `origin/personal:tickets/done/claude-sdk-background-task-lifecycle/`
- Prior review artifacts: `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-001, reviewed basis SR-007; Fail/Design Impact). The resolution map is at the end of `design-spec.md`

## Points Worth Reviewer Attention (round 4)

- Round 4: implementation raised IMP-DI-001. `AgentRunInputAdmissionState.claimNext` blocks every append behind the forwarded entry that started the turn. That also leaves Codex steer unreachable. The user chose to fix the shared rule for every append-capable runtime (DEC-007 = A, REQ-012/AC-014..016). Please review design-spec "Shared AgentRun Append Claim (SR-011)" (the claim walk rule, `undeliveredRetryAsStart` requeue with the `notInto` guard, invariants). All other sections are unchanged since ARCH-REV-003 Pass. Implementation checkpoint: `26450e6b0` (`implementation-handoff.md`).

### Round 3 points (history)

- Round 3: ARCH-F-007 (consumption now needs a tool_result followed by an assistant frame before any Stop; abort frames never count) and ARCH-F-008 (per-uuid send state; unsent input is cancelled locally with no SDK call) are addressed. See design-spec "Review Round 2 Resolution". The non-blocking constant placement is also done.

### Round 2 points (history)

- Round 2: every ARCH-REV-001 finding is addressed; see design-spec "Review Round 1 Resolution" and investigation-notes "Architecture Review Round 1 Evidence (SR-008)" (probes P on both CLIs, P-prewait, Q). The cancellation mechanism is now `interrupt({cancelQueued:true})`, and settlement is a single uuid-accounted rule.

### Round 1 points (history)

1. The canonical turn tracker rules (design-spec "Spine Narratives") and the invariant that no answered-input CLI work runs after its canonical turn settles.
2. Reliance on `cancel_async_message` (protocol-documented; SDK runtime method `cancelAsyncMessage` present but not declared in `sdk.d.ts`), RSK-006.
3. Append-mismatch rejection parity with Codex.
4. The additive memory trace `system_task_notification` plus history replay (persisted-data decision "Directly Usable").
5. Usage reconciliation with cumulative `modelUsage` across a long-lived process and after crash reopen (RSK-007).

## Routing

- Handoff rule outcome (SR-007): matched the rule "Architecture Design Complete with task_size=Large or architectural_risk=High …" → `/architecture_reviewer`
- Handoff rule outcome (SR-008): the same rule matched again for the revised package → `/architecture_reviewer`
- Handoff rule outcome (SR-009): the same rule matched again → `/architecture_reviewer`
- Handoff rule outcome (SR-011): the same rule matched (Large/High revised package) → `/architecture_reviewer`
