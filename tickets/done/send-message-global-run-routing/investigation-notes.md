# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete — existing dedicated ticket worktree reused.
- Current Status: Revised after user design discussion; implementation remains paused and partial/untrusted.
- Investigation Goal: Update the global `send_message_to` design after the user clarified that exact `target_agent_run_id` delivery only needs to reach live active `AgentRun`s.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: Even with live-only routing, the change affects shared tool ownership, three runtime adapter surfaces, active-run delivery semantics, self-evolution helper behavior, and coverage.
- Scope Summary: Convert `target_agent_run_id` from team-bound exact target semantics into a global active-run direct route using `AgentRunManager.getActiveRun`; keep `recipient_name` team-local; remove the broader global address-directory/team-claim/lazy/recoverable routing idea.
- Primary Questions To Resolve:
  1. Are AgentRunIds globally unique enough to use as exact addresses? Resolved: yes for the current server/memory-root scope through `AgentRunIdentityAllocator` plus `AgentRunManager` duplicate-active enforcement.
  2. Should routing be selected by sender context or by selector? Resolved: selector-first. `recipient_name` requires team context; `target_agent_run_id` enters the global live direct route.
  3. Must `target_agent_run_id` be able to route to lazy or recoverable runs? Resolved by user: no. The target must be live/active.
  4. Does the live-only rule require a global team-aware address directory? Resolved: no. The route should use `AgentRunManager.getActiveRun` only.
  5. What happens for self-evolution if the target dies? Resolved: start should require live target; final helper delivery re-checks and records target-inactive/failure if the target died.

## Request Context

The user challenged the earlier grant-first design and then asked whether globally unique `agentRunId` should be the address. A separate AgentRunId allocation refactor was completed on `origin/personal`. After further discussion, the user clarified that exact-id messaging only needs a live target: if the target agent run has been dead for a long time, the message should not be routed. This revision therefore simplifies the design from "global address directory scans active teams and recoverable targets" to "global direct route resolves only `AgentRunManager.getActiveRun(targetRunId)`".

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo/workspace.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing`
- Current Branch: `codex/send-message-global-run-routing`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: Current tracked `origin/personal` is `e76f16b3301e2003f3c715d0ff86661a8a3dbde1` (`v1.3.53`). Local ticket branch `HEAD` is `d0bf457a43aa66a00b895e30d78f461bb496b58c` and is behind by 7 commits.
- Task Branch: `codex/send-message-global-run-routing`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal` / `origin/personal`
- Bootstrap Blockers: The worktree contains paused incomplete implementation changes from `implementation_engineer`. This design pass did not rebase or modify source code to avoid disturbing that partial state. Current-state reads used `origin/personal:<path>` where baseline accuracy mattered.
- Notes For Downstream Agents: Treat existing source changes in this worktree as draft only. The previous design review report passed an older, broader directory/team-claim design and is now superseded by this revision.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-12 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/shared/design-principles.md` | Reload canonical design guidance per user request | Reconfirmed spine inventory, authoritative boundary, no boundary bypass, no legacy dual-path, and concrete examples requirements. | Apply in revised design. |
| 2026-06-12 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/references/design-examples.md` | Reload design examples per user request | Relevant examples: runtime/worker spine, team orchestration, interface-boundary split, and bad generic boundary/fragmented coordinator anti-patterns. | Use spine-first design and avoid generic directory/claim blob. |
| 2026-06-12 | Command | `git status --short --branch`; `git rev-parse HEAD origin/personal`; `git log --oneline HEAD..origin/personal` | Verify current worktree/base | Branch has paused partial implementation changes and is behind current `origin/personal` by 7 commits. | Do not treat source changes as complete; implementation later must refresh safely. |
| 2026-06-12 | Code | `git show origin/personal:autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Inspect live run owner | `createAgentRun(config, agentRunId)` requires explicit id; `getActiveRun` returns live run or unregisters inactive and returns null. | Global exact route should use this lookup. |
| 2026-06-12 | Code | `git show origin/personal:autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | Inspect standalone run creation | Fresh/activated standalone runs use allocator and then `AgentRunManager.createAgentRun`. | No new id generator. |
| 2026-06-12 | Code | `git show origin/personal:autobyteus-server-ts/src/agent-team-execution/services/team-run-launch-identity-assignment.ts` | Inspect team member id creation | Member run ids are preallocated before member runtime creation. Public launch rejects manual member ids. | Preallocated member id alone is not live target evidence. |
| 2026-06-12 | Code | `git show origin/personal:autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Inspect team member runtime creation | `ensureReady()` creates/restores an actual `AgentRun` using the preassigned `memberRunId`; only then does the member become visible through `AgentRunManager.getActiveRun`. | Exact-id route can reach active team members via `AgentRunManager`, not via team manager. |
| 2026-06-12 | Code | `git show origin/personal:autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-member-delivery-coordinator.ts` | Inspect team route owner | Team route owns recipient resolution, Team Communication projection, and task-agent delivery behavior. | Preserve under `recipient_name`; do not copy into global direct route. |
| 2026-06-12 | Code | `git show origin/personal:autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-*`; `agent-tools/team-communication/send-message-to.ts` | Inspect current tool ownership | Parser/contract and AutoByteus tool are team-placed and require `MemberTeamContext`. | Move shared semantics to `agent-communication`. |
| 2026-06-12 | Code | `git show origin/personal:autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts`; Codex/Claude bootstrap files | Inspect runtime exposure | Tool exposure already detects `send_message_to`; Codex/Claude exposure currently wires team-only paths. | Add standalone-capable runtime wrappers using shared dispatcher. |
| 2026-06-12 | Code | `git show origin/personal:autobyteus-web/components/workspace/self-evolution/SelfEvolutionComposerCta.vue`; `selfEvolutionComposerCtaTarget.ts`; `AgentWorkspaceView.vue`; `TeamWorkspaceView.vue` | Verify frontend target source | CTA resolves selected standalone `run.state.runId` or focused team member `member.state.runId` and starts self-evolution after eligibility fetch. | Backend still must re-check liveness. |
| 2026-06-12 | Code | `git show origin/personal:autobyteus-server-ts/src/api/graphql/types/self-evolution.ts` | Inspect API entrypoint | Mutations accept `runId` or `teamRunId + memberRunId` and delegate to `SelfEvolutionService`. | Add live checks behind service. |
| 2026-06-12 | Code | `git show origin/personal:autobyteus-server-ts/src/self-evolution/services/self-evolution-target-context-resolver.ts`; `self-evolution-eligibility-evaluator.ts` | Inspect self-evolution target resolution | Resolver reads metadata, not necessarily active runtime. Eligibility checks config/skills/evolver settings. | Start path must add live target requirement. |
| 2026-06-12 | Code | `git show origin/personal:autobyteus-server-ts/src/self-evolution/services/strategies/single-agent-evolver-strategy.ts`; built-in skill-evolver files | Inspect helper launch/prompt | Helper currently has only `run_bash`; prompt does not instruct final `send_message_to`; strategy terminates helper after completion. | Add tool and final outcome prompt/grant handling. |
| 2026-06-12 | Test | `git ls-tree -r --name-only origin/personal autobyteus-server-ts/tests | rg 'send-message|team-communication|inter-agent'` | Inspect likely coverage | Existing coverage is team-heavy and includes current team exact-run behavior. | Coverage must be updated for active-only exact route. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: runtime-specific `send_message_to` tool wrappers under team communication paths.
- Current execution flow:
  1. AutoByteus/Codex/Claude exposes `send_message_to` only for team-member contexts.
  2. Tool args are parsed by files under `agent-team-execution`.
  3. The tool requires `MemberTeamContext` and builds an `InterAgentMessageDeliveryIntent`.
  4. `MemberTeamContext.deliverInterAgentMessage` enters `MixedTeamManager` / `TeamMemberDeliveryCoordinator`.
  5. Team resolver handles `recipient_name` and current team-bound `target_agent_run_id`, including team lifecycle/projection concerns.
- Ownership or boundary observations:
  - `AgentRunManager` is the active run lifecycle/lookup owner.
  - `agent-team-execution` is the team roster/projection owner.
  - Current shared tool parsing is misplaced once exact run ids become global.
  - A broad global directory that asks teams to claim ids would mix global direct messaging with team lifecycle ownership.
- Current behavior summary: exact-id messaging is currently a team capability. Standalone helpers cannot use it, and self-evolution completion is not helper-authored.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature / Refactor
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Duplicated Policy Or Coordination; File Placement Or Responsibility Drift; Legacy Or Compatibility Pressure
- Refactor posture evidence summary: Shared send-message semantics are under team ownership; runtime adapters would otherwise duplicate active target lookup; preserving old recoverable/lazy exact-route behavior would keep incompatible meanings for one selector.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `AgentRunManager` | `getActiveRun` already centralizes live run lookup and prunes inactive runs. | Active-only exact routing has an existing authoritative owner. | Use through global router only. |
| Team member launch path | `memberRunId` is assigned before actual `AgentRun` creation. | Preallocated ids are not enough for direct delivery. | Exact route must not lazy-start. |
| Team delivery coordinator | Owns Team Communication projection and team-specific task-agent behavior. | Global route should not reimplement or depend on team internals. | Preserve team route for `recipient_name`. |
| Self-evolution target resolver | Metadata resolution can succeed for inactive targets. | Need explicit live check for manual self-evolution starts. | Add service-level live validation. |
| Runtime exposure | `sendMessageToConfigured` exists but wrappers are team-specific. | Standalone configured agents need new adapter path. | Add shared dispatcher/runtime wrappers. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Active `AgentRun` lifecycle/lookup | `getActiveRun` is the live target registry. | Global exact route depends on it. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts` | Agent run id allocation/collision checks | Provides global id invariant. | Do not replace. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-launch-identity-assignment.ts` | Team member id assignment | Precreates member run ids. | Not proof of live target. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Team member runtime handle | Uses `AgentRunManager.createAgentRun(memberRunId)` when member starts. | Active team members are reachable through `AgentRunManager`. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/*` | Team delivery/projection | Correct owner for `recipient_name`, lazy member behavior, and Team Communication. | Keep separate from global direct route. |
| `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-*` | Current parser/contract | Team-owned but now shared. | Move to `agent-communication`. |
| `autobyteus-server-ts/src/agent-tools/team-communication/send-message-to.ts` | Current AutoByteus team tool | Requires `MemberTeamContext`. | Replace with sender-context-aware wrapper. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/...team-communication...` | Current Codex team dynamic tool | Exposes send-message only for team members. | Add standalone-capable agent-communication adapter. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/...team-communication...` | Current Claude MCP team tool | Exposes send-message only for team members. | Add standalone-capable agent-communication adapter. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts` | Manual self-evolution orchestration | Resolves metadata/context but does not require active target today. | Add live target check. |
| `autobyteus-server-ts/src/self-evolution/services/strategies/single-agent-evolver-strategy.ts` | Helper run launch/task prompt | Needs target id in prompt, grant, and usage summary. | Update for final outcome delivery. |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent-config.json` | Skill Self-Evolver tool config | Only `run_bash`. | Add `send_message_to`. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-12 | Probe | `git rev-parse HEAD origin/personal` | `HEAD=d0bf457...`; `origin/personal=e76f16b...`. | Design uses current origin baseline; implementation must refresh later. |
| 2026-06-12 | Static trace | `rg -n "send_message_to|target_agent_run_id|AgentRunIdentityAllocator|getActiveRun" autobyteus-server-ts/src autobyteus-web` | Current tree includes partial draft implementation; origin baseline confirms existing team-bound implementation. | Treat draft files as non-authoritative. |
| 2026-06-12 | Static trace | `git ls-tree -r --name-only origin/personal autobyteus-server-ts/tests | rg 'send-message|team-communication|inter-agent'` | Existing coverage is concentrated around team communication and current exact team target semantics. | Downstream API/E2E must update coverage expectations. |

## External / Public Source Findings

No external public sources were required. This was an internal architecture/design revision against the repository and team design guidance.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: none for this design pass.
- Required config, feature flags, env vars, or accounts: none for this design pass.
- External repos, samples, or artifacts cloned/downloaded for investigation: none.
- Setup commands that materially affected the investigation: repository status/log/read commands listed above; no rebase or source mutation performed.
- Cleanup notes for temporary investigation-only setup: none.

## Findings From Code / Docs / Data / Logs

1. `AgentRunManager.getActiveRun` is sufficient and preferable for the user-approved live-only exact route.
2. A team member run id can exist before the run is live; therefore any design that scans team rosters would violate the live-only requirement unless it still rejected prestarted members.
3. Current same-team exact route has richer team semantics. Keeping those semantics under `target_agent_run_id` would make the selector mean both "active direct global run" and "team-owned recoverable/lazy route". The revised requirement rejects that dual meaning.
4. `recipient_name` remains the correct selector when the sender wants team semantic routing and Team Communication projection.
5. Self-evolution frontend targets are derived from active UI state, but backend start/final-delivery checks are necessary because frontend state can be stale or the target can terminate while the helper runs.
6. `DirectAgentRunMessageGrant` is still useful as a policy overlay for the helper; it is not needed for target discovery.

## Constraints / Dependencies / Compatibility Facts

- `target_agent_run_id` uses canonical `AgentRun.runId` only.
- Direct exact-run delivery is live-only and in-process/server-local for this ticket.
- `AgentTeamRunManager` must not be part of the global direct route.
- `recipient_name` continues to depend on `MemberTeamContext` and existing team delivery.
- No backward-compatibility wrappers should preserve old recoverable/lazy exact-run behavior under `target_agent_run_id`.
- Existing partial implementation changes in the worktree may conflict with this revised design and must be audited/reworked before implementation resumes.

## Open Unknowns / Risks

- Existing unit tests that assume same-team `target_agent_run_id` can reach recoverable task agents must be updated or replaced with `recipient_name`/task-tool coverage.
- There is no global direct-message UI history in scope. Direct `INTER_AGENT_MESSAGE` stream events may be visible differently from Team Communication records.
- If future multi-process or multi-tenant routing is needed, it should be a separate design with a real authoritative registry and ACL model.

## Notes For Architect Reviewer

- The key revision is live-only exact routing: `target_agent_run_id -> GlobalAgentRunMessageRouter -> AgentRunManager.getActiveRun -> AgentRun.postUserMessage + direct INTER_AGENT_MESSAGE`.
- The previous `GlobalAgentRunAddressDirectory` / active-team claim design is intentionally removed.
- `AgentTeamRunManager` should not be a dependency of the global direct route.
- `recipient_name` remains the only in-scope route that owns team roster semantics, lazy team member lifecycle, and Team Communication projection.
- Prior design review report at `design-review-report.md` passed the older broader design and should be treated as superseded for this review round.
