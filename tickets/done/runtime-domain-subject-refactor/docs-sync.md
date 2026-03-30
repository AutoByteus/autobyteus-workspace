# Docs Sync

## Scope

- Ticket: `runtime-domain-subject-refactor`
- Trigger Stage: `9`
- Workflow state source: `tickets/done/runtime-domain-subject-refactor/workflow-state.md`

## Why Docs Were Updated

- Summary: Durable docs were stale around the runtime/history refactor. They still described manifest-era persistence and Codex App Server as future-only, which no longer matches the implemented server/runtime architecture.
- Why this change matters to long-lived project understanding: Future engineers need the project docs to reflect the current create/restore/projection contract, the current persisted file layout, and the fact that Codex App Server is now a real runtime rather than a hypothetical later integration.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | Run history, projection, and persisted storage were heavily refactored and the old doc still described manifest-era files. | `Updated` | Rewrote the module doc to match current metadata files, workspace history listing, team member identity, and runtime-specific projection providers. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | The old doc still described Codex App Server as a future option, which is no longer true. | `Updated` | Replaced the old recommendation with the current native-runtime architecture and kept MCP mode only as an optional secondary path. |
| `README.md` | Release procedure and release-note wiring were checked before Stage 10 preparation. | `No change` | Current release instructions already match the documented repo workflow. |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | Rewrite / contract sync | Updated responsibilities, GraphQL surface, metadata file names, memory layout, projection ownership, and team member identity/storage rules. | The previous doc described `run_manifest.json` / `team_run_manifest.json` and older service names, which would mislead future maintainers. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Rewrite / architecture sync | Documented the implemented native Codex App Server runtime, team runtime path, skills materialization, history/projection path, and current operational streaming caveat. | The old doc treated App Server as future-only even though the runtime is now implemented and actively used. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Run-history persistence contract | Metadata is persisted as `run_metadata.json` / `team_run_metadata.json`, storage layout is explicit, and projection is runtime-aware. | `proposed-design.md`, implemented server/runtime changes on this branch | `autobyteus-server-ts/docs/modules/run_history.md` |
| Team-member identity and storage ownership | Team aggregate owns `memberRunId`; runtime-native ids remain separate; team-member projection resolves from team metadata first. | `proposed-design.md`, implemented team restore/projection changes on this branch | `autobyteus-server-ts/docs/modules/run_history.md` |
| Codex first-class runtime architecture | Codex App Server is now a real runtime with standalone/team create/restore/projection support; MCP is secondary. | `proposed-design.md`, implemented Codex runtime changes on this branch | `autobyteus-server-ts/docs/modules/codex_integration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `run_manifest.json` / `team_run_manifest.json` as current run-history truth | `run_metadata.json` / `team_run_metadata.json` plus runtime-specific projection providers | `autobyteus-server-ts/docs/modules/run_history.md` |
| Codex App Server as a future-only idea | Codex App Server as the implemented native runtime path | `autobyteus-server-ts/docs/modules/codex_integration.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A`
- Rationale:
- Why existing long-lived docs already remain accurate:

## Final Result

- Result: `Updated`
- If `Blocked` because earlier-stage work is required, classification: `N/A`
- Required return path or unblock condition: `N/A`
- Follow-up needed: `None for the durable docs touched in this stage.`
