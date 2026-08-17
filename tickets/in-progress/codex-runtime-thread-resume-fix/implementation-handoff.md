# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-spec.md`
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/runtime-reproduction-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/claude-runtime-reproduction-evidence.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A for this initial implementation round; upstream `ARCH-FIND-001` and `ARCH-FIND-002` were resolved in `SR-003` / `ARCH-REV-002` before implementation.

## Current Implementation Summary

The implementation makes provider identity durable before a Codex or Claude runtime can become discoverable or accept input. `AgentRunManager` now returns an input-opaque, exclusively claimed candidate; team and standalone owners persist/reconcile their authoritative state and only then publish synchronously. Team binding changes are root-owned, direct-task bindings are staged into task activation, and every tree mutation projects from the current state at the root lock head. Codex restore is exact with no create fallback. Claude reserves one UUID before publication, uses SDK `sessionId` only for the first query and `resume` thereafter, and treats stream identity as exact confirmation rather than rebinding.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-001` | Persist first Codex team binding before input and resume it after restart | `MixedAgentMemberHandle` -> `RootTeamRun.adoptAgentPlatformBinding` -> lock-head persistence -> `AgentRunActivationCandidate.commitPublication`; strict restore through `AgentRunManager` and `CodexThreadManager` | Implemented; overlapping readiness callers join one promise and unpublished candidate |
| `BEH-002` | Never silently replace a known Codex thread; expose continuation failure | `AgentRunManager.prepareRestoreAgentRunFromPlatformState`; `CodexThreadManager` uses only `thread/resume`; mixed readiness failure emits TeamRun `ERROR` and returns a rejected operation | Implemented fail-closed path |
| `BEH-003` | Use one immutable binding invariant for configured, nested, task-agent, and task-team agent nodes | `TeamAgentPlatformBinding`; recursive `adoptAgentPlatformBindingInTree`; `PreparedTaskExecution.stagedPlatformBindings` | Implemented exact compound identity, null-to-ID, same-value idempotency, and different-value conflict |
| `BEH-004` | Restore standalone external runs from exact stored provider identity | `StandaloneAgentRunActivationService` -> strict metadata state -> strict manager restore -> exact metadata reconciliation -> publication | Implemented for Codex and Claude; native behavior remains supported |
| `BEH-005` | Create only from provably fresh null-binding team state | `AgentConversationActivityInspector` strictly reads active plus complete archived user/assistant traces without mutation; `MixedAgentMemberHandle` guards before candidate creation | Implemented; prior or indeterminate activity blocks creation |
| `BEH-006` | Treat broken null-binding history as explicit non-resumable context loss | Stable team binding/activity errors, one readiness failure event, rejected operation, and no provider candidate | Implemented; local history is not rewritten or guessed |
| `BEH-007` | Preserve Claude team context with one preassigned immutable provider UUID | `ClaudeProviderSessionLifecycle`, `ClaudeSessionManager`, `ClaudeSession`, required `ClaudeSdkSessionBinding`, root binding acceptance before publication | Implemented create-once then exact-resume lifecycle with conflict/unconfirmed terminal failures |
| `BEH-008` | Persist a standalone Claude UUID before live admission and join overlapping callers | `StandaloneAgentRunActivationService` one-flight + Claude UUID candidate + exact `recordRunStarted` reconciliation + synchronous publication | Implemented; unchanged prepared state is retryable only after confirmed abort, while uncertainty quarantines |

## Key Files Or Areas

- Candidate/admission ownership: `src/agent-execution/services/agent-run-activation-candidate.ts`, `agent-run-manager.ts`, `standalone-agent-run-activation-service.ts`, `agent-run-service.ts`, `agent-run-command-coordinator.ts`, `agent-run-provisioning-service.ts`
- Team durability and readiness: `src/agent-team-execution/domain/team-agent-platform-binding.ts`, `root-team-run.ts`, `services/team-run-execution-tree-mutator.ts`, `team-run-persistence-{contract,coordinator}.ts`, and mixed member/registry composition
- Direct-task atomic activation: `src/agent-team-execution/domain/prepared-task-execution.ts`, `task-delegation/task-delegation-service.ts`, `task-delegation-execution-resolution.ts`, `mixed-task-agent-execution-registry.ts`
- Activity guard: `src/agent-memory/services/agent-conversation-activity-inspector.ts`
- Provider exactness: `src/agent-execution/backends/codex/thread/codex-thread-manager.ts`; Claude session lifecycle/manager/session/backend and `src/runtime-management/claude/client/claude-sdk-{client,session-binding}.ts`
- Strict standalone persistence: `src/run-history/store/agent-run-metadata-store.ts`, `src/run-history/services/agent-run-metadata-service.ts`

## Important Assumptions

- The installed Claude Agent SDK continues to honor caller-supplied UUID `sessionId` for new conversations and `resume` for later queries, as established in the approved investigation.
- Backend factories own cleanup for failures that occur before a backend object can be returned; manager cleanup owns every returned backend/run and observer attachment.
- The existing atomic metadata and TeamRun file writers preserve their documented committed/not-renamed/finalization-indeterminate classifications.

## Known Risks

- Historical team nodes with prior activity and null bindings, and standalone Claude local-ID placeholders, remain intentionally non-resumable.
- A crash after UUID durability but before provider materialization can leave a known UUID that the provider cannot resume; restoration fails closed rather than creating another conversation.
- Existing unit coverage targets removed eager manager, placeholder/rebinding, ambiguous SDK, and precomputed tree-commit contracts. Those tests must be replaced or updated after coverage investigation rather than restored through compatibility shims.
- Cleanup uncertainty can leave an unused remote artifact, but the manager and owning scope retain quarantine and do not expose input or permit same-process replacement.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Missing Invariant and Boundary Or Ownership Issue
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: Identity/durability authority now sits at root and standalone boundaries; candidate publication is separated from construction; provider protocol state remains below those owners. No input gate or late refresh workaround was added.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None
- Legacy old-behavior retained in scope: No
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: Yes
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): Yes
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: Yes
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): Yes
- Notes: Eager manager create/restore, provisioning/command activation maps, late team ID capture, unused TeamRun refresh, old execution-tree commit contract, Codex resume fallback, Claude placeholder/adoption/resume inference/cache migration, and ambiguous SDK session input were removed. `AgentRunManager` had a rewrite-sized delta, so candidate and standalone policy were split into dedicated files; all changed source files are at or below 500 effective non-empty/non-line-comment lines (the task delegation service is exactly 500).

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): Directly Usable — No Migration
- Design-spec decision reference: `design-spec.md` — “Persisted Data / State Transition Decision”
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: Yes
- Direct-use evidence or discard/rebuild result, when applicable: Existing V1 tree and standalone metadata fields are read directly; valid non-null values remain exact and immutable; null remains valid for native/fresh state but fails closed for prior external activity.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: None

## Environment Or Dependency Notes

No new dependency or environment variable was added. The final build regenerated the existing Prisma client and rebuilt shared workspace packages through the repository scripts.

## Local Implementation Checks Run

- Passed: `pnpm exec tsc -p tsconfig.build.json --noEmit` in `autobyteus-server-ts`.
- Passed: `pnpm run build` in `autobyteus-server-ts`, including shared package builds, Prisma generation, server compilation, managed messaging asset copy, built-in agent bootstrap smoke, and sanitized built-module/bootstrap smoke without `DATABASE_URL`.
- Passed: built-module assertions for candidate run-ID exclusivity, registry invisibility before publication, synchronous publication, confirmed abort/retry, and sidecar detach.
- Passed: built-module assertions for Claude create/resume binding transitions and exact confirmation, tree binding adoption/idempotency/conflict, and strict activity detection including proof that a corrupt tail remains unmodified and returns `indeterminate`.
- Passed: `git diff --check` and changed-source effective-line guard scan.
- Not a passing gate: the repository `pnpm typecheck` command fails before meaningful test typing because `tsconfig.json` sets `rootDir: src` while including `tests`, producing TS6059 for the existing test tree. The production `tsconfig.build.json` check passes.
- Coverage-maintenance signal only: a focused run of six existing unit files completed with 19 passed / 41 failed. Failures primarily exercise intentionally removed contracts: eager `AgentRunManager.create/restore`, Claude local-ID placeholder/adoption and sessions built without a lifecycle, optional/ambiguous SDK session input, and precomputed persistence commits. One Codex fixture also uses an already-stale `MemberTeamContext` identity shape. These durable tests were not compatibility-patched; downstream coverage investigation should classify and update them.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable — this is a backend runtime, persistence, and provider-session lifecycle change with no rendered frontend files or interaction layout changes.

## Downstream Coverage Hints / Suggested Scenarios

- Replace eager manager tests with explicit candidate tests covering same-tick overlap conflict, private registry invisibility, hidden input surface, observer rollback, synchronous publication, joined abort, confirmed retry, and cleanup quarantine.
- Add latch-based mixed-member overlap coverage proving one candidate/root adoption and the same readiness result for two first commands; verify one TeamRun `ERROR` plus rejected operations on continuation failure.
- Cover recursive binding adoption for configured, nested configured, direct task-agent, task-team agent, idempotent same-value, compound-identity miss/duplicate, and different-value conflict.
- Cover direct-task staging: candidate absent from active registry until both tree/task durability, staged binding in the same next tree, publication before work release, and fail-stop/quarantine on post-durability invariant failure.
- Cover standalone one-flight across command/create/activate/restore, with metadata write latches proving no active lookup or input before exact durability. Exercise exact-target recovery, unchanged-prepared retry, missing/unreadable/conflict quarantine, and cleanup uncertainty.
- Update Claude tests to use deterministic valid UUIDs and a lifecycle. Verify first query sends only SDK `sessionId`, all later/restored queries send only `resume`, query-open interruption forces resume, every reported ID must match, and successful turns without confirmation fail terminally.
- Verify Codex resume failure issues no `thread/start` request and exact-ID mismatch aborts privately.
- Verify the activity guard sees active and complete archived traces, reports malformed active/manifest/complete-segment data as indeterminate, and never repairs/truncates files.
- Re-run isolated browser restart markers for both Codex and Claude and a standalone Claude abrupt restart when feasible, using the upstream reproduction artifacts as the scenario basis.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. No API/E2E sign-off is claimed here. The `api_e2e_engineer` must first produce the required coverage investigation, maintain durable coverage as appropriate, execute realistic restart/concurrency/provider scenarios, and report evidence after source review passes.
