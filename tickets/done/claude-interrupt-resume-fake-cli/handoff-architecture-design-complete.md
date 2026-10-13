# Architecture Design Complete — claude-interrupt-resume-fake-cli

## Result / Routing Inputs
- Package: `claude-interrupt-resume-fake-cli`; current SR-002.
- Result: Architecture Design Complete. Requirements Approved (SR-001); design Ready (SR-002).
- `task_size=Small`, `architectural_risk=Low`: one local E2E fake/harness change, existing child fixture reused unchanged; no production contract/persistence/security/concurrency/ownership/deployment changes.
- Intended behavior unchanged; approval: Solution Designer within delegated Task direction, user informed by conversation beginning “The separate lifecycle check passed all 12 tests…” on 2026-10-13. Exact basis: requirements-doc.md SR-001; no behavior-defining supplements.
- Open blocker/Needs user decision: None. Independent review: N/A — not applicable to initial package; configured routing below determines any review.
- Next expected action: implement the test-only design, preserve eight assertions/live skip, produce implementation-scoped checks and implementation-handoff; then executable validation and Delivery-owned user verification/merge. **No repair implemented, successful target rerun or merge claimed.**

## Original Request And Scope
Delegated by `/project_task_manager`, AgentRun `project_task_manager_a5f6d9d306e54970bafdad895bdf731d`:
“Fix the 8 failing fake-CLI cases in the Claude interrupt/resume E2E suite”. User requested this follow-up 2026-10-12 via prior Delivery. Rerun current personal first; confirm cause; distinguish fake-only vs production lifecycle problem and report any product defect before fixing. Done: target suite 8 passed + 1 skipped without RUN_CLAUDE_E2E, no production accommodation, merged. Related Tasks aac4b26a (other stale suites) and 0c7efc37 (tooling/stale suites) are not added to this scope.

Incoming report (read in full, external/read-only):
`/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_6d944a46-9cd1-4353-880a-3dc07ed3f66c/context/ctx_0160332776c4__claude-normal-reply-auth-error-misclassification-follow-up-problems.md`.

## Workspace / Integration Context
- Task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli`; branch `codex/claude-interrupt-resume-fake-cli`.
- Freshly fetched base `origin/personal` @ `32aca0818e88126c02f009c3987dd86541348c9a` (2026-10-13); task branch tracks origin/personal. Finalization target: origin/personal, merge requested; release/deployment not requested.
- Shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` contains unrelated dirty/untracked work; never clean/reset or run test builds there. Dedicated deps installed with frozen lockfile and prebuild completed. SDK build outputs are untracked; stage paths explicitly, never git add -A.
- The task-worktree TESTING.md was refreshed globally before this Task and differs from shared checkout; read the current 196-line file and current AGENTS.md (now also references RELEASE.md for finalization). DESIGN.md same content. No closer server design guide beyond area contracts.

## Evidence And Confirmed Cause
1. **Untouched current fetched-base rerun:** private temporary HOME, clean PATH/HOME/TMPDIR environment, no gates/keys/app roots; target command below reproduced **8 failed / 1 skipped**, exit 1, AggregateError opening/cleanup plus secondary unhandled background wait timeout. Baseline logs retained.
2. **Immediate failure is missing `initializationResult()` on FakeClaudeCliQuery.** `beginClaudeSdkSessionOpening.registerQuery` sets malformedQuery and throws `CLAUDE_QUERY_INVALID: Public initialization observation missing.` Release refuses a malformed Query settlement certificate. SessionProcess and component cleanup wrap those failures. Lack of controlled spawn is a separate fixture-coverage gap, **not the immediate throw** (empty receipt set can release).
3. Source comparison of 028cca231 parent vs commit confirms old direct streaming opening became retained opening with this method check; stale fake unchanged. This is causal source-diff attribution, **not an executed historical bisect**.
4. **Separate bounded production-lifecycle investigation: 12 tests / 3 files passed**, including actual pinned SDK 0.3.280 spawning a real no-model owned child and proving initialization, EOF exit/IO; late-acquisition/malformed-query and retained failure/retry tests. No production defect found in this failure path. This is not universal model/OS proof; the gated live case has not run. Real-child retry file was read but is not in the executed 12; include it downstream.

Exact target reproduction command (run under clean private HOME):
`pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts --no-watch`.
Lifecycle command already run (same clean isolation):
`pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/claude/client/claude-sdk-session-opening.test.ts tests/unit/runtime-management/claude/client/claude-sdk-process-owner.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-cleanup.test.ts --no-watch`.

## Technical Design / Preserved Authority
- Modify only `autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` source: conform fake to public ClaudeSdkQueryLike with cached simulated initializationResult; invoke provided spawnClaudeCodeProcess exactly once to acquire existing lightweight real Node fixture (absolute import.meta.url-relative fixture path, not cwd-relative).
- Reuse `autobyteus-server-ts/tests/fixtures/claude-owned-sdk-cli.mjs` unchanged; no model/installed Claude call. Fake SDK frames remain local scripts. Actual child lifetime/proof becomes real, not asserted from close calls.
- Preserve original API-CL01..04, AC-005 interrupt/follow-up, AC-003 busy append, AC-016 late append, AC-002 background report. Preserve live case/gate; retain 9 total cases. Strengthen lifecycle assertions inside existing cases/shared cleanup rather than add count-changing cases.
- Use real client opening, controlled owner, manager/component/pump release; do not mock away ensureOpen/release, synthesize receipts, change production checks/seams, skip fake cases, remove behavioral assertions or inflate waits to hide failures.
- Harness teardown must attempt all its resources despite cleanup failure, surface real errors, observe parallel waits immediately to avoid secondary unhandled rejections and always release private workspaces. Initialization observation must not consume a second iterator or await user input. Preserve physical-exit/IO observation refs before production releases facade getters.
- Public websocket-to-domain path and canonical turn/error lifecycles unchanged. No Product design or migration. No broader stale-test/tooling changes.

## Risks / Escalation
SCN-001..007 and BEH-001..004 are supported operational/product/contract scenarios with evidence in requirements/investigation. Remaining uncertainty: scripted frames cannot certify paid SDK inference or other OS teardown; newly unmasked assertions may expose a different failure; origin advances concurrently. Any required production/SDK/seam/policy change or real lifecycle defect → report to Solution Designer before fixing, cite REQ/AC basis and reclassify; do not silently broaden Small/Low route. Delivery must rerun integrated source and capture explicit user verification before merge/push. Release Not required unless separately requested; cleanup owned resources only.

## Canonical Cumulative Package (Absolute Paths)
- Approved requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/requirements-doc.md`
- Investigation (sole evidence authority): `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/design-spec.md`
- Cumulative solution history: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/solution-revision-record.md`
- Full handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/handoff-architecture-design-complete.md`
- Dependencies: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/evidence/dependency-install.log`
- Current-base prerequisites: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/evidence/prebuild.log`
- Current-base failing reproduction: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/evidence/current-base-interrupt-resume.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/evidence/current-base-interrupt-resume.exit`
- Executed bounded production lifecycle proof: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/evidence/production-lifecycle-investigation.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/evidence/production-lifecycle-investigation.exit`
- Independent architecture/code review artifacts: N/A — not applicable/not yet produced; no prior pass claimed.
- Implementation/API-E2E/Delivery artifacts: N/A — not yet produced; receiving specialists own these.
- Product artifacts/behavior-defining supplements: N/A — not applicable.
External incoming report and historical context are linked above/in investigation, not copied into competing authorities.

## Applied Handoff Rules / Route
`get_handoff_rules` returned three conditional routes (architecture review for Large/High; direct implementation for Small/Medium + Low; delivery correction for receipt gaps). The **single matching route** is Architecture Design Complete + Small + Low → `/software_engineering_team/implementation_engineer`. Selected direct implementation route skips independent architecture review, **not design, implementation self-checks or executable validation**. Architecture review artifacts: **N/A — not applicable**. All other rule conditions false. Message success is recorded by the send_message_to tool receipt; no duplicate forwarding to the delegator/reviewer.
