# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Medium`
- Triage Rationale:
  - The refactor is concentrated in the runtime launch/lifecycle boundary rather than the whole runtime subsystem.
  - The architectural problem is real and repeated across a few callers, but the likely implementation surface is still bounded to service APIs, the external-channel runtime launcher/recovery flow, and targeted tests.
  - The team side appears closer to the intended layering already, so the main work is to strengthen symmetry and remove the agent-side bypass rather than redesign the entire team runtime stack.
- Investigation Goal:
  - Determine why higher-level runtime launch orchestration depends on both service and manager layers, identify the authoritative lifecycle boundary that should own continuity behavior, and define the minimum refactor that restores encapsulation.
- Primary Questions To Resolve:
  - Why does `ChannelBindingRunLauncher` use both `AgentRunService` and `AgentRunManager`?
  - Is the dual dependency caused by a real ownership need or by missing service APIs?
  - Does the team runtime side have the same layering break, or is it mostly already on the service boundary?
  - Which other callers repeat the same active-or-restore logic and should move to the strengthened service API?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-01 | Command | `git status --short`, `git branch --show-current`, `git remote show origin`, `git worktree list`, `git fetch origin personal`, `git worktree add -b codex/run-service-layering-refactor ... origin/personal` | Bootstrap the ticket in an isolated worktree from the latest tracked base branch. | The shared `personal` worktree had unrelated uncommitted changes, so the refactor was isolated in a dedicated worktree rooted at `origin/personal`. | No |
| 2026-04-01 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts` | Inspect the launcher that triggered the user concern. | The agent path restores through `AgentRunService`, but creates via `AgentRunManager` and manually persists metadata/history. The team path stays on `TeamRunService`. | No |
| 2026-04-01 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Determine what the authoritative agent lifecycle boundary currently owns. | `AgentRunService` already owns create/restore/terminate plus metadata/history persistence, but it does not expose active-run lookup or an active-or-restore helper. | No |
| 2026-04-01 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Verify the lower-level responsibilities behind the service. | `AgentRunManager` owns live in-memory active runs and backend create/restore operations. It is the internal runtime registry/backend boundary that the service already encapsulates. | No |
| 2026-04-01 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Compare the team service boundary against the agent service boundary. | `TeamRunService` is thicker than `AgentRunService`: it exposes `getTeamRun`, `restoreTeamRun`, `createTeamRun`, `buildMemberConfigsFromLaunchPreset`, and metadata/history updates. Higher-level team callers can remain on the service boundary. | No |
| 2026-04-01 | Code | `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Verify the lower-level team responsibilities. | `AgentTeamRunManager` is the team-side runtime registry/backend owner underneath `TeamRunService`, mirroring the agent-side manager role. | No |
| 2026-04-01 | Code | `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts` | Check whether the mixed agent manager/service pattern is isolated to the launcher or repeated elsewhere. | The agent side again uses `AgentRunManager.getActiveRun(...)` plus `AgentRunService.restoreAgentRun(...)`, while the team side uses only `TeamRunService.getTeamRun(...)` plus `restoreTeamRun(...)`. | No |
| 2026-04-01 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-facade.ts` | Verify how dispatch facades consume the launcher output. | The agent facade still depends on `AgentRunManager` to fetch the live run after launch; the team facade remains service-first via `TeamRunService`. This reinforces the missing agent-service API shape. | Yes |
| 2026-04-01 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`, `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` | Compare top-level API usage patterns. | GraphQL create/restore/terminate flows already go through services. Agent GraphQL still uses `AgentRunManager` for tool-approval delivery because that runtime operation is not on the service boundary. Team GraphQL stays on `TeamRunService`. | No |
| 2026-04-01 | Code | `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-binding-run-launcher.test.ts` | Confirm whether the agent-side manager bypass is accidental or intentional. | The tests explicitly encode the current design: fresh agent creation is expected to happen through `AgentRunManager` with manual metadata/history writes in the launcher. | No |
| 2026-04-01 | Doc | `tickets/done/definition-bound-messaging-runtime-preset/proposed-design.md` | Check earlier architectural intent for the launcher. | Earlier design intent explicitly said the runtime launcher should not duplicate startup logic inline and should rely on an owned runtime/service boundary instead. | No |
| 2026-04-01 | Doc | `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/design-principles.md` | Evaluate the current design against the workflow’s encapsulation rule. | The current shape violates the boundary encapsulation principle: a higher-level caller depends on both the public service boundary and the service’s internal manager boundary. The right response is to strengthen the authoritative service boundary, not normalize the bypass. | No |

## Current Entrypoints, Boundaries, and Owners

### Agent Runtime

- Public lifecycle boundary today:
  - `AgentRunService`
  - Owns create/restore/terminate orchestration plus run metadata/history persistence.
- Internal runtime boundary today:
  - `AgentRunManager`
  - Owns live active-run registry and backend create/restore/get operations.
- Current problem:
  - Higher-level runtime launch code in `external-channel/runtime` bypasses the service and reaches into the manager directly for active checks and fresh creation.

### Team Runtime

- Public lifecycle boundary today:
  - `TeamRunService`
  - Owns create/restore/get/terminate plus metadata/history behavior and launch-preset expansion.
- Internal runtime boundary today:
  - `AgentTeamRunManager`
  - Owns live team-run registry and backend create/restore/get operations.
- Current state:
  - Higher-level runtime launch code is already more aligned with the service boundary on the team side.
  - Repetition still exists in active-or-restore patterns, but the service boundary is not being bypassed in the launcher the way the agent side is.

### External-Channel Runtime

- Main entrypoints in scope:
  - `ChannelBindingRunLauncher.resolveOrStartAgentRun(...)`
  - `ChannelBindingRunLauncher.resolveOrStartTeamRun(...)`
  - `AcceptedReceiptRecoveryRuntime.resolveAgentRun(...)`
  - `AcceptedReceiptRecoveryRuntime.resolveTeamRun(...)`
  - `ChannelAgentRunFacade.dispatchToAgentBinding(...)`
  - `ChannelTeamRunFacade.dispatchToTeamBinding(...)`
- Ownership issue:
  - Continuity policy belongs in the launcher/runtime service boundary, but the agent implementation currently reimplements service internals instead of delegating to them.

## Findings

### F-001 Agent service boundary is too thin for higher-level lifecycle callers

- Evidence:
  - `AgentRunService` exposes `createAgentRun`, `restoreAgentRun`, and `terminateAgentRun`, but does not expose `getAgentRun` or `resolveAgentRun`.
  - `TeamRunService` already exposes `getTeamRun`, giving higher-level callers a clean active-or-restore path.
- Implication:
  - Higher-level callers that need active-or-restore behavior on the agent side compensate by reaching into `AgentRunManager`.

### F-002 `ChannelBindingRunLauncher` duplicates `AgentRunService.createAgentRun(...)` behavior

- Evidence:
  - The launcher constructs `AgentRunConfig`, calls `AgentRunManager.createAgentRun(...)`, then writes `AgentRunMetadataService.writeMetadata(...)` and `AgentRunHistoryIndexService.recordRunCreated(...)` itself.
  - `AgentRunService.createAgentRun(...)` already performs the same lifecycle/persistence orchestration for normal agent creation.
- Implication:
  - The launcher is not just missing a lookup method; it is duplicating authoritative lifecycle logic, which creates drift risk.

### F-003 The duplication already diverges from the service path

- Evidence:
  - `AgentRunService.createAgentRun(...)` records created runs with `lastKnownStatus: "IDLE"` and summary `""`.
  - `ChannelBindingRunLauncher.resolveOrStartAgentRun(...)` records created runs with `lastKnownStatus: "ACTIVE"` and `initialSummary`.
  - `AgentRunService.createAgentRun(...)` also owns run-id provisioning logic that the launcher bypasses by calling the manager directly.
- Implication:
  - The system currently has two different agent creation semantics. Even if the channel-specific semantics are valid, they should be expressed through the service boundary rather than by bypassing it.

### F-004 The team side is closer to the intended architecture

- Evidence:
  - `ChannelBindingRunLauncher.resolveOrStartTeamRun(...)` uses only `TeamRunService`.
  - `ChannelTeamRunFacade` and the external-channel team recovery path also use `TeamRunService` rather than `AgentTeamRunManager`.
- Implication:
  - Team does not need the same kind of bypass removal in the launcher, but it would benefit from a service-level `resolveTeamRun` helper so callers stop repeating `getTeamRun(...) ?? restoreTeamRun(...)`.

### F-005 The agent-side smell is repeated beyond one file

- Evidence:
  - `AcceptedReceiptRecoveryRuntime` repeats agent `getActiveRun(...)` + `restoreAgentRun(...)`.
  - `ChannelAgentRunFacade` still depends on `AgentRunManager` to fetch the active run after launch.
- Implication:
  - The right fix is not a one-file patch. The service boundary should grow to support the small set of lifecycle/runtime access patterns that higher-level callers actually need.

## Constraints

- Technical constraints:
  - Existing external-channel continuity behavior must remain intact: reuse live owned run, else restore cached run id, else create fresh run and persist it.
  - Agent and team runtime managers remain valid internal boundaries; the refactor should not flatten them away.
  - Runtime operations that are truly live-run specific may still need a runtime-handle API, but higher-level callers should consume that through the owning service boundary where practical.
- Workflow constraints:
  - No source edits before Stage 6 unlock.
  - The refactor should follow the workflow design principle that callers above an owning boundary should not depend on both that boundary and its internals.
- Scope constraints:
  - Keep the change centered on runtime/service layering for launch/continuity paths.
  - Do not widen into unrelated runtime streaming or GraphQL redesign unless required by the new service APIs.

## Unknowns / Open Questions

- Unknown:
  - Whether the agent service should expose a generic `getAgentRun` + `resolveAgentRun` pair only, or also own a channel-specific create path that supports `initialSummary` and desired initial status.
- Why it matters:
  - The answer affects whether `ChannelBindingRunLauncher` can fully collapse onto existing service APIs or needs one new service method for channel-bound creation semantics.
- Planned follow-up:
  - Resolve this in Stage 2/3 by choosing the smallest service extension that restores encapsulation without adding channel-specific leakage into the wrong subsystem.

## Implications

### Requirements Implications

- Requirements should explicitly state that higher-level launch/continuity callers must depend on one authoritative lifecycle boundary per runtime type.
- Requirements should allow service API expansion when a higher-level caller currently bypasses service internals only because the service is missing necessary API support.
- Requirements should distinguish:
  - acceptable direct manager usage in low-level runtime infrastructure,
  - unacceptable direct manager usage in higher-level orchestration that already depends on the service boundary.

### Design Implications

- The likely clean shape is:
  - strengthen `AgentRunService` to expose the active-or-restore and create semantics needed by higher-level runtime launch orchestration,
  - optionally add a symmetry helper on `TeamRunService` for resolve-active-or-restore,
  - remove direct `AgentRunManager` dependency from `ChannelBindingRunLauncher`,
  - update other external-channel runtime callers to use the strengthened service APIs where that keeps the boundary authoritative.
- The design should preserve the current owners:
  - service owns lifecycle orchestration + metadata/history,
  - manager owns live runtime registry/backends internally.

### Implementation / Placement Implications

- Likely implementation files:
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts`
  - unit tests under `tests/unit/external-channel/runtime/` and `tests/unit/agent-execution/services/`
- Candidate removals inside changed scope:
  - launcher-owned manual agent metadata/history creation logic
  - duplicated agent active-or-restore pattern in external-channel runtime callers where a service helper replaces it
