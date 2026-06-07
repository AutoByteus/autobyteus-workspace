# Docs Sync Report

## Scope

- Ticket: `mixed-team-manager-simplification-analysis`
- Trigger: API/E2E Round 2 passed and handed the reviewed/validated mixed-only team-manager implementation to delivery on 2026-06-06.
- Bootstrap base reference: `origin/personal` at `74c0fd5905c85a4f52b7fecec16bf4c644a745de` (`chore(release): bump workspace release version to 1.3.44`), recorded in requirements.
- Integrated base reference used for docs sync: fetched `origin/personal` at `15fcceedb67d6edac3d9942b9eb2098f7e5769a8` (`docs(delivery): record ios wrapper release completion`).
- Post-integration verification reference: ticket branch merge commit `72d688184fc94ea928c0689118b57adc1ade55a5`; delivery-owned docs edits are currently uncommitted on top of that integrated state pending user verification/finalization.

## Why Docs Were Updated

- Summary: Long-lived server documentation was updated/refined to match the final integrated implementation where every server team run uses `TeamBackendKind.MIXED` and `MixedTeamManager`; runtime-specific behavior lives below the team boundary in per-member `AgentRun`s. Delivery also removed stale docs language that still described specialized Codex/Claude team managers, native AutoByteus pure-team settlement gaps, and native AutoByteus team event bridging as active behavior.
- Why this should live in long-lived project docs: The mixed-only team spine is architectural behavior future implementers must rely on when changing team creation/restore, task delegation, event projection, run history, and artifacts. Leaving this only in ticket artifacts would make future changes likely to reintroduce obsolete specialized team-manager assumptions.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Canonical team execution, backend selection, task delegation, restore, and event bridge doc. | `Updated` | Refined task-delegation context, settlement ownership, live E2E command, and mixed member event bridge language. Existing implementation docs already described `MixedTeamManager` as the single active server team manager. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex team-member integration doc must not point to removed Codex team managers. | `Updated` | Clarified team runtime source list by adding `mixed-team-run-backend-factory.ts` and removing a duplicate `mixed-team-manager.ts` entry. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Artifact projection doc references team-member storage and event ownership. | `Updated` | Replaced AutoByteus/native-specific wording with runtime-neutral team-member wording. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Artifact serving design describes event fan-out and team-member file-change storage. | `Updated` | Replaced native AutoByteus team event bridge language with mixed member event fan-out language. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Run-history doc owns team-member projection/restore, file-change historical reads, and runtime-native identity boundaries. | `Updated` | Replaced AutoByteus/native-specific artifact wording with runtime-neutral team-member wording and fixed numbering in the team restore contract. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Architecture/runtime docs | Documented task delegation as deriving from server-owned `MemberTeamContext`; documented `MixedTeamManager`/`MixedTeamMemberRegistry` as the only team-level task-agent start/settle owner; replaced obsolete AutoByteus team event bridge section with mixed member event bridge; updated mixed task-delegation live E2E command to `qwen3.6-35b-a3b` with `AUTOBYTEUS_STREAM_PARSER=api_tool_call`. | Aligns docs with final implementation and Round 2 evidence. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Source-owner reference cleanup | Team runtime source list now includes `mixed-team-run-backend-factory.ts` and does not duplicate `mixed-team-manager.ts`. | Keeps Codex docs pointed at the current mixed team boundary. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Runtime-neutral wording | Team-member artifact metadata storage is described for any runtime, not AutoByteus/native only. | Mixed-only server teams produce member file changes through runtime-specific `AgentRun`s under the mixed manager. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Event projection design | Artifact event flow describes mixed member handles enriching/fanning out child runtime events once. | Replaces removed native team event bridge assumptions. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Projection/restore docs | Team-member file-change reads are runtime-neutral; team restore contract numbering was corrected. | Prevents future projection work from special-casing old native AutoByteus team-member paths. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Mixed-only team execution | All server team compositions create/restore through `TeamBackendKind.MIXED` and `MixedTeamManager`; per-member runtime kind selects the `AgentRun` backend below that boundary. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Runtime-neutral task delegation | Task delegation uses server-owned `MemberTeamContext`; `MixedTeamManager` owns task-agent instance start/settle across AutoByteus, Codex, and Claude member runtimes. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Mixed member event projection | Team event projection is through mixed member handles over child `AgentRun`/child `TeamRun` streams, not native AutoByteus team event bridges or specialized team managers. | `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |
| Team-member artifact and run-history storage | Team-member file-change and replay storage are keyed by server member run ids under `memory/agent_teams/<teamRunId>/<memberRunId>/...` for any runtime. | `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_artifacts.md`, `autobyteus-server-ts/docs/modules/run_history.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Specialized server team managers/backends for AutoByteus, Codex, and Claude team runs. | `MixedTeamManager` plus per-member `AgentRunManager` runtime dispatch. | `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Native AutoByteus pure-team task-agent settlement limitation as an active server-team concern. | Mixed team task-agent lifecycle through `MixedTeamMemberRegistry` for all server teams. | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Native AutoByteus team event bridge as the active server-team event fan-out path. | Mixed member handles subscribing to child runtime streams and enriching/fanning out events once. | `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |
| AutoByteus/native-only wording for team-member artifact file storage. | Runtime-neutral team-member storage under `agent_teams/<teamRunId>/<memberRunId>/file_changes.json`. | `autobyteus-server-ts/docs/modules/agent_artifacts.md`, `autobyteus-server-ts/docs/modules/run_history.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A - docs updated`
- Rationale: Long-lived docs required updates after the integrated-state review found stale native/specialized team-manager wording.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed after integrating latest `origin/personal`. Delivery checks recorded in `validation-logs/delivery-post-integration-run-history-unit.log`, `validation-logs/delivery-post-integration-tsc-noemit.log`, `validation-logs/delivery-post-integration-git-diff-check.log`, `validation-logs/delivery-docs-obsolete-grep.log`, and `validation-logs/delivery-docs-git-diff-check.log`.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
