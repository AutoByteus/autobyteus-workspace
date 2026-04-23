# Docs Sync Report

## Scope

- Ticket: `agent-team-member-runtime-selection`
- Trigger: Review round `9` and validation round `4` are the latest authoritative `Pass` state on `2026-04-23`; docs sync was completed after the integrated implementation state from validation round `3`, rechecked against the earlier round-`4` evidence-only follow-up plus the round-`5` durable-validation / related-fix follow-up, extended for the round-`7` / round-`3` frontend mixed-runtime launch close-condition package, and then rechecked again after the round-`9` / round-`4` focused hydration/browser follow-up for `CR-004`.
- Bootstrap base reference: `origin/personal` from `tickets/in-progress/agent-team-member-runtime-selection/investigation-notes.md`
- Integrated base reference used for docs sync: `origin/personal @ 76bbc1a0` merged into ticket branch via `342be6b0` (`Merge remote-tracking branch 'origin/personal' into codex/agent-team-member-runtime-selection`)
- Post-integration verification reference: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/integration/api/runtime-selection-top-level.integration.test.ts tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/claude-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/claude-team-run-backend.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts` -> `Pass` (`11` files / `52` tests on `2026-04-23`)

## Why Docs Were Updated

- Summary: Long-lived docs were updated to describe the new `TeamBackendKind` selection model, the server-owned mixed-team orchestration path, the runtime-neutral `MemberTeamContext` communication contract, the narrowed `send_message_to` seam shared by native and mixed AutoByteus contexts, and the frontend per-member runtime/model override launch surface that now truthfully reaches the mixed-runtime backend path.
- Why this should live in long-lived project docs: These are durable runtime, architecture, and product-surface contracts that future backend, runtime, and frontend work must preserve. Leaving them ticket-local would re-teach the obsolete team-boundary `RuntimeKind` model, the old assumption that `send_message_to` always requires a full native team runtime, and the no-longer-true assumption that the app can only launch one effective runtime per team.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Canonical server module doc for team-run orchestration, selection, restore, and streaming. | `Updated` | Added the `TeamBackendKind` / `RuntimeKind` split, current execution-path table, mixed-team communication contract, and restore notes. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Canonical runtime-integration doc for Codex-backed standalone and team member execution. | `Updated` | Clarified that Codex members can now participate under either single-runtime Codex teams or the mixed server-owned team backend via `MemberTeamContext`. |
| `autobyteus-ts/docs/agent_team_design.md` | Canonical library architecture doc for native team routing and inter-agent messaging behavior. | `Updated` | Replaced the stale direct-`TeamManager` assumption in the `send_message_to` section with the narrower `TeamCommunicationContext` contract and native-vs-adapter distinction. |
| `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Canonical library runtime/task-coordination explainer covering `assign_task_to`, `create_tasks`, and `send_message_to`. | `Updated` | Clarified that `send_message_to` now resolves `TeamCommunicationContext`; task-plan behavior remains native-team-only. |
| `autobyteus-web/docs/agent_teams.md` | Canonical frontend module doc for team-definition and team-launch behavior. | `Updated` | Added the workspace mixed-runtime team launch surface, per-member override semantics, launch-readiness gating, temp-team promotion, and reopen/hydration behavior. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Architecture / ownership refresh | Added team-backend selection semantics, single-runtime vs mixed execution paths, shared mixed communication contract, and restore notes. | The server module doc must teach the final orchestration truth for create/restore and mixed-runtime routing. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Runtime integration update | Clarified how Codex members participate in both single-runtime and mixed team runs and pointed readers to the runtime-neutral team-communication bootstrap files. | Codex team-runtime docs would otherwise imply Codex-owned team orchestration is the only supported multi-member path. |
| `autobyteus-ts/docs/agent_team_design.md` | Library communication-contract update | Reframed `send_message_to` around `TeamCommunicationContext` and documented that native `TeamManager` ownership still applies for task-plan-aware routing. | The library doc previously hard-coded a full native team-runtime dependency that is no longer the whole story. |
| `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Tool-behavior clarification | Updated the `send_message_to` section to distinguish native-team routing from communication-only adapters and to keep task-plan ownership explicit. | Future readers need one durable explanation of why communication was abstracted while task-plan tools were not. |
| `autobyteus-web/docs/agent_teams.md` | Frontend launch-surface update | Documented per-member runtime/model overrides, mixed-runtime launch readiness, temp-team promotion to permanent backend runs, and reopen/hydration preservation of divergent member overrides. | The frontend mixed-runtime launch UX is now a validated close condition and must be described truthfully in the canonical frontend module doc. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Team-boundary backend selection | `TeamBackendKind` is now the team orchestration subject, while `RuntimeKind` remains member-local. Mixed teams are selected from member runtime composition, not by overloading team runtime state. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `validation-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Server-owned mixed-team communication | Mixed-runtime teams are owned by `MixedTeamManager` over per-member `AgentRun`s, with one `InterAgentMessageRouter` as the canonical mixed `send_message_to` owner. | `design-spec.md`, `implementation-handoff.md`, `review-report.md`, `validation-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Runtime-neutral member communication bootstrap | Codex and Claude team members now consume `MemberTeamContext`, and mixed AutoByteus standalone members receive a compatible communication context plus task-management tool stripping. | `design-spec.md`, `implementation-handoff.md`, `validation-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Shared `send_message_to` contract | `send_message_to` now depends on `TeamCommunicationContext`, allowing native teams and server-owned mixed adapters to share the same communication primitive while keeping task-plan tools native-team-only. | `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-ts/docs/agent_team_design.md`, `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| Frontend mixed-runtime launch truth | The app now lets leaf team members diverge from the team default runtime/model, blocks launch on unresolved mixed rows, promotes mixed temp teams to permanent backend runs without collapsing member runtime identity, and preserves those divergences on reopen/hydration. | `design-spec.md`, `implementation-handoff.md`, `review-report.md`, `validation-report.md` | `autobyteus-web/docs/agent_teams.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Team-boundary team-runtime selection described as `runtimeKind` | Dedicated `TeamBackendKind` at the team boundary with member-local `RuntimeKind` retained for each member run | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Codex team docs implying Codex-owned team orchestration is the only multi-member Codex path | Single-runtime Codex team backend plus mixed-team participation through the server-owned mixed backend and `MemberTeamContext` | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| `send_message_to` described as always depending on the full native `TeamManager` / `AgentTeamContext` | Narrow `TeamCommunicationContext` shared by native team contexts and communication-only adapters | `autobyteus-ts/docs/agent_team_design.md`, `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| Frontend team launch docs implying one effective runtime/model per team launch | Workspace team-run config with per-member runtime/model overrides, mixed-runtime readiness gating, and mixed temp-team promotion | `autobyteus-web/docs/agent_teams.md` |

## Follow-Up Rechecks After Later Review / Validation Rounds

- Round `4` evidence-only validation-report expansion:
  - Additional long-lived docs changed: `None`
  - Why no further docs changes were needed: The follow-up package only expanded validation evidence and updated the canonical review report; it did not change the integrated implementation behavior already documented in the long-lived docs.
- Round `5` durable-validation additions plus directly related implementation fixes:
  - Additional long-lived docs changed: `None`
  - Why no further docs changes were needed: The new fixes in `mixed-team-run-backend-factory.ts` and `codex-send-message-tool-spec-builder.ts` repaired live mixed-runtime execution prerequisites and validation depth without changing the already-documented team-backend selection model, runtime-neutral communication contract, or restore semantics promoted into the long-lived docs.
- Round `7` review / round `3` validation frontend close-condition package:
  - Additional long-lived docs changed: `autobyteus-web/docs/agent_teams.md`
  - Why the earlier no-change conclusion was superseded: The frontend mixed-runtime launch UX is no longer out of scope. The reviewed/validated app now exposes per-member runtime overrides, mixed-row readiness gating, mixed temp-team promotion, and reopen/hydration preservation, so the canonical frontend module doc had to be updated to stay truthful.
- Round `9` review / round `4` validation focused hydration/browser follow-up:
  - Additional long-lived docs changed: `None`
  - Why no further docs changes were needed: `CR-004` repaired how reopened mixed-team defaults are derived, but the canonical frontend doc already documented the intended user-visible truth: reopen/hydration preserves a coherent default tuple plus divergent member overrides. The fix restored the documented behavior rather than introducing a new workflow or durable concept.
- Latest tracked remote base recheck after the round-`9` / round-`4` package: `origin/personal` remained `76bbc1a0` on `2026-04-23`, so no additional integration refresh or docs rerun was required.

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A`
- Rationale: Long-lived docs did require updates for this ticket.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete for the latest integrated and rechecked ticket state. The ticket now waits for explicit user verification before any archive, push, merge, release, or cleanup work.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
