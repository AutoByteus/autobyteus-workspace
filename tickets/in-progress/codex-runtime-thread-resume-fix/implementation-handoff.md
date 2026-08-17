# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-spec.md`
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/runtime-reproduction-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/claude-runtime-reproduction-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/autobyteus-runtime-reproduction-evidence.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/code-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/code-review-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/live-browser-reproduction-autobyteus/`

## Current Implementation Summary

The cumulative implementation preserves the SR-003 provider-durability architecture and adds SR-004 native restart continuity. Root creation and restoration now carry explicit process-local provenance into configured members and nested configured teams, while newly delegated task agents and teams are always fresh. Each member readiness attempt activates its persisted workspace before inspecting activity or constructing a candidate, then selects exactly one `new`, native local restore, or strict external restore plan. Native candidates use the generic same-run/same-memory restore path and never enter team platform-binding staging/adoption, even when their backend reports the local run ID. External Codex/Claude bindings remain root-owned and durable before synchronous publication; standalone one-flight, candidate claim, cleanup/quarantine, and exact provider semantics remain unchanged.

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`, `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: `CODE-FIND-001`; expanded approved behaviors `BEH-009`, `BEH-010`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-001` | Persist first Codex team binding before input and resume it after restart | `MixedAgentMemberHandle` -> `RootTeamRun.adoptAgentPlatformBinding` -> lock-head persistence -> `AgentRunActivationCandidate.commitPublication`; strict restore through `AgentRunManager` and `CodexThreadManager` | Implemented; overlapping readiness callers join one promise and unpublished candidate |
| `BEH-002` | Never silently replace a known Codex thread; expose continuation failure | `AgentRunManager.prepareRestoreAgentRunFromPlatformState`; `CodexThreadManager` uses only `thread/resume`; mixed readiness failure emits TeamRun `ERROR` and returns a rejected operation | Implemented fail-closed path |
| `BEH-003` | Use one immutable binding invariant for external configured/task agents while native bindings remain null | `MixedAgentMemberHandle.createExternalBinding`; `TeamAgentPlatformBinding`; recursive `adoptAgentPlatformBindingInTree`; task staging | Implemented; runtime eligibility is checked at the handle boundary, and native backend self-IDs are ignored rather than staged/adopted |
| `BEH-004` | Restore standalone external runs from exact stored provider identity | `StandaloneAgentRunActivationService` -> strict metadata state -> strict manager restore -> exact metadata reconciliation -> publication | Implemented for Codex and Claude; native behavior remains supported |
| `BEH-005` | Create only from provably fresh external null-binding or restored-native no-activity state | `AgentConversationActivityInspector`; exhaustive handle activation plan | Implemented; external prior/indeterminate activity blocks creation, while restored native `present` restores and `none` creates |
| `BEH-006` | Treat broken null-binding history as explicit non-resumable context loss | Stable team binding/activity errors, one readiness failure event, rejected operation, and no provider candidate | Implemented; local history is not rewritten or guessed |
| `BEH-007` | Preserve Claude team context with one preassigned immutable provider UUID | `ClaudeProviderSessionLifecycle`, `ClaudeSessionManager`, `ClaudeSession`, required `ClaudeSdkSessionBinding`, root binding acceptance before publication | Implemented create-once then exact-resume lifecycle with conflict/unconfirmed terminal failures |
| `BEH-008` | Persist a standalone Claude UUID before live admission and join overlapping callers | `StandaloneAgentRunActivationService` one-flight + Claude UUID candidate + exact `recordRunStarted` reconciliation + synchronous publication | Implemented; unchanged prepared state is retryable only after confirmed abort, while uncertainty quarantines |
| `BEH-009` | Restore a configured native member's prior working context after full TeamRun restart | `AgentTeamRunManager.restoreTeamRun` -> restored mixed context -> activity-selected `AgentRunManager.prepareRestoreAgentRun` -> native snapshot bootstrap -> publication | Implemented; same local run ID and memory directory are supplied, restore failure never falls back to fresh creation, and overlapping commands join one readiness attempt |
| `BEH-010` | Reactivate persisted member workspaces before native create/restore | `MixedAgentMemberHandle.buildAgentRunConfig` -> `WorkspaceManager.ensureWorkspaceByRootPath` -> returned workspace ID -> plan/candidate | Implemented before activity/candidate work; a non-null root activation failure is normalized and cannot silently reach temp fallback |

## Key Files Or Areas

- Candidate/admission ownership: `src/agent-execution/services/agent-run-activation-candidate.ts`, `agent-run-manager.ts`, `standalone-agent-run-activation-service.ts`, `agent-run-service.ts`, `agent-run-command-coordinator.ts`, `agent-run-provisioning-service.ts`
- Team durability and readiness: `src/agent-team-execution/domain/team-agent-platform-binding.ts`, `root-team-run.ts`, `services/team-run-execution-tree-mutator.ts`, `team-run-persistence-{contract,coordinator}.ts`, and mixed member/registry composition
- Native root/member materialization: `src/agent-team-execution/services/agent-team-run-manager.ts`, `backends/mixed/mixed-team-run-{context,backend-factory}.ts`, `mixed-sub-team-run-factory.ts`, and `members/mixed-agent-member-handle.ts`
- Direct-task atomic activation: `src/agent-team-execution/domain/prepared-task-execution.ts`, `task-delegation/task-delegation-service.ts`, `task-delegation-execution-resolution.ts`, `mixed-task-agent-execution-registry.ts`
- Activity guard: `src/agent-memory/services/agent-conversation-activity-inspector.ts`
- Provider exactness: `src/agent-execution/backends/codex/thread/codex-thread-manager.ts`; Claude session lifecycle/manager/session/backend and `src/runtime-management/claude/client/claude-sdk-{client,session-binding}.ts`
- Strict standalone persistence: `src/run-history/store/agent-run-metadata-store.ts`, `src/run-history/services/agent-run-metadata-service.ts`

## Important Assumptions

- The installed Claude Agent SDK continues to honor caller-supplied UUID `sessionId` for new conversations and `resume` for later queries, as established in the approved investigation.
- Backend factories own cleanup for failures that occur before a backend object can be returned; manager cleanup owns every returned backend/run and observer attachment.
- The existing atomic metadata and TeamRun file writers preserve their documented committed/not-renamed/finalization-indeterminate classifications.

## Known Risks

- Historical external team nodes with prior activity and null bindings, standalone Claude local-ID placeholders, and native snapshots already overwritten by a failed restart remain intentionally non-recoverable.
- Legacy native self-ID fields are ignored by runtime-kind semantics and are not rewritten; native local activity with a missing/corrupt snapshot fails closed.
- A crash after UUID durability but before provider materialization can leave a known UUID that the provider cannot resume; restoration fails closed rather than creating another conversation.
- Existing unit coverage targets removed eager manager, placeholder/rebinding, ambiguous SDK, and precomputed tree-commit contracts. Those tests must be replaced or updated after coverage investigation rather than restored through compatibility shims.
- Cleanup uncertainty can leave an unused remote artifact, but the manager and owning scope retain quarantine and do not expose input or permit same-process replacement.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Missing Invariant and Boundary Or Ownership Issue
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: Identity/durability authority remains at root and standalone boundaries; root create/restore provenance now reaches configured composition; WorkspaceManager owns activation; the handle owns the exhaustive runtime plan; candidate publication remains separate from construction. No input gate, late refresh, persisted mode flag, or restore-to-create fallback was added.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None
- Legacy old-behavior retained in scope: No
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: Yes
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): Yes
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: Yes
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): Yes
- Notes: Eager manager create/restore, provisioning/command activation maps, late team ID capture, unused TeamRun refresh, old execution-tree commit contract, Codex resume fallback, Claude placeholder/adoption/resume inference/cache migration, ambiguous SDK session input, ambiguous mixed subteam `createOrRestore`, and the unused generic TeamRun backend-factory interface were removed. Root/mixed factories now expose explicit create/restore or configured/fresh-task subjects. All changed source files remain at or below 500 effective non-empty/non-line-comment lines; `MixedAgentMemberHandle` is 469.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): Directly Usable — No Migration
- Design-spec decision reference: `design-spec.md` — “Persisted Data / State Transition Decision”
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: Yes
- Direct-use evidence or discard/rebuild result, when applicable: Existing V1 tree, runtime kind, local run ID, workspace root, memory directory, trace corpus, native working snapshot, and standalone metadata are read directly. External non-null values remain exact and immutable. Native runtime kind ignores legacy self-ID provider fields in runtime composition without rewriting them; new native contexts/tasks remain binding-null.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: None

## Environment Or Dependency Notes

No new dependency or environment variable was added. The final build regenerated the existing Prisma client and rebuilt shared workspace packages through the repository scripts.

## Local Implementation Checks Run

- Passed after `IR-002`: `pnpm exec tsc -p tsconfig.build.json --noEmit` in `autobyteus-server-ts`.
- Passed after `IR-002`: `pnpm run build` in `autobyteus-server-ts`, including shared package builds, Prisma generation, server compilation, managed messaging asset copy, built-in agent bootstrap smoke, and sanitized built-module/bootstrap smoke without `DATABASE_URL`.
- Passed after `IR-002`: seven focused unit/narrow integration files, 29 tests total. These prove root fresh/restore provenance, configured nested inheritance, fresh task-team isolation, workspace-before-candidate ordering, overlapping native readiness, activity-selected native restore/new, no restore-to-create fallback, legacy native self-ID ignore, configured/direct-task native binding-null behavior, strict external restore preservation, and the real native backend's same-run create/terminate/restore path.
- Passed in `IR-001`: built-module assertions for candidate run-ID exclusivity, registry invisibility before publication, synchronous publication, confirmed abort/retry, and sidecar detach.
- Passed in `IR-001`: built-module assertions for Claude create/resume binding transitions and exact confirmation, tree binding adoption/idempotency/conflict, and strict activity detection including proof that a corrupt tail remains unmodified and returns `indeterminate`.
- Passed: `git diff --check` and changed-source effective-line guard scan.
- Not a passing gate: the repository `pnpm typecheck` command fails before meaningful test typing because `tsconfig.json` sets `rootDir: src` while including `tests`, producing TS6059 for the existing test tree. The production `tsconfig.build.json` check passes.
- `IR-001` coverage-maintenance signal only: a focused run of six existing unit files completed with 19 passed / 41 failed. Failures primarily exercise intentionally removed contracts: eager `AgentRunManager.create/restore`, Claude local-ID placeholder/adoption and sessions built without a lifecycle, optional/ambiguous SDK session input, and precomputed persistence commits. One Codex fixture also uses an already-stale `MemberTeamContext` identity shape. These durable tests were not compatibility-patched; downstream coverage investigation should classify and update them.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable — this is a backend runtime, persistence, and provider-session lifecycle change with no rendered frontend files or interaction layout changes.

## Downstream Coverage Hints / Suggested Scenarios

- Replace eager manager tests with explicit candidate tests covering same-tick overlap conflict, private registry invisibility, hidden input surface, observer rollback, synchronous publication, joined abort, confirmed retry, and cleanup quarantine.
- Add latch-based mixed-member overlap coverage proving one candidate/root adoption and the same readiness result for two first commands; verify one TeamRun `ERROR` plus rejected operations on continuation failure.
- Cover recursive binding adoption for configured, nested configured, direct task-agent, task-team agent, idempotent same-value, compound-identity miss/duplicate, and different-value conflict.
- Cover direct-task staging: candidate absent from active registry until both tree/task durability, staged binding in the same next tree, publication before work release, and fail-stop/quarantine on post-durability invariant failure.
- Cover native root restart with physical V1 tree binding null before/after, exact working-snapshot append, no duplicate/reordered turns, native restore logs, and no valid-workspace temp fallback. Also cover restored native no-activity creation, unreadable activity, missing/corrupt snapshot failure, nested configured restore inheritance, and fresh delegated task-team isolation.
- Cover standalone one-flight across command/create/activate/restore, with metadata write latches proving no active lookup or input before exact durability. Exercise exact-target recovery, unchanged-prepared retry, missing/unreadable/conflict quarantine, and cleanup uncertainty.
- Update Claude tests to use deterministic valid UUIDs and a lifecycle. Verify first query sends only SDK `sessionId`, all later/restored queries send only `resume`, query-open interruption forces resume, every reported ID must match, and successful turns without confirmation fail terminally.
- Verify Codex resume failure issues no `thread/start` request and exact-ID mismatch aborts privately.
- Verify the activity guard sees active and complete archived traces, reports malformed active/manifest/complete-segment data as indeterminate, and never repairs/truncates files.
- Re-run isolated browser restart markers for Codex, Claude, and native AutoByteus plus a standalone Claude abrupt restart when feasible, using the upstream reproduction artifacts as the scenario basis.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. No API/E2E sign-off is claimed here. The `api_e2e_engineer` must first produce the required coverage investigation, maintain durable coverage as appropriate, execute realistic restart/concurrency/provider scenarios, and report evidence after source review passes.
