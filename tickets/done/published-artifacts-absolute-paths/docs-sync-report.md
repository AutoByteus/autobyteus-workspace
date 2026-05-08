# Docs Sync Report

## Scope

- Ticket: `published-artifacts-absolute-paths`
- Trigger: Delivery-stage docs sync after code review round 5 and API/E2E validation round 2 passed.
- Bootstrap base reference: `origin/personal @ 0a80f5fbdb88093697f16345a460cde6f112d353` from `requirements.md`.
- Integrated base reference used for docs sync: `origin/personal @ a7e1ddf69efd659b2e70a7e5d9a22b7f5521e0df`.
- Post-integration verification reference: delivery reran the targeted published-artifacts/application suite after integrating the latest base; result `Pass`, 16 files / 85 tests.

## Why Docs Were Updated

- Summary: The final implementation intentionally changes `publish_artifacts` from workspace-contained publication to run-owned publication of readable absolute source files, while preserving snapshot-backed durability and plural-only tool exposure. Long-lived docs and built-in app prompts must not tell agents or custom-app authors to copy files into the workspace just to publish them.
- Why this should live in long-lived project docs: Custom application authors and built-in app maintainers need the durable contract for `publish_artifacts` path inputs, persisted path identity, snapshot behavior, and app-owned semantic artifact resolution. Keeping this only in ticket artifacts would reintroduce the old workspace-contained assumption.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `docs/custom-application-development.md` | Canonical custom-app guidance for `publish_artifacts` and app artifact handlers. | `Updated` | Now documents relative-or-absolute inputs, runtime-server readability, normalized absolute source paths in summaries/revisions, publish-time snapshots, and app-owned interpretation of `path`. |
| `applications/brief-studio/agent-teams/brief-studio-team/team.md` | Built-in Brief Studio team-level publication instructions. | `No change` | Already instructs agents to use the exact absolute path returned by the write step and does not preserve the old workspace-contained rule. |
| `applications/brief-studio/agent-teams/brief-studio-team/agents/researcher/agent.md` | Built-in researcher prompt directly calls `publish_artifacts`. | `Updated` | Removed wording that the target file must have been written in the workspace; retained exact absolute path guidance. |
| `applications/brief-studio/agent-teams/brief-studio-team/agents/writer/agent.md` | Built-in writer prompt directly calls `publish_artifacts`. | `Updated` | Removed wording that the target file must have been written in the workspace; retained exact absolute path guidance. |
| `applications/brief-studio/README.md` | Brief Studio public README mentions durable artifact publication. | `No change` | README is high-level and does not describe the old path boundary. |
| `applications/socratic-math-teacher/README.md` | Socratic app README mentions canonical `publish_artifacts` use. | `No change` | README is high-level and does not describe the old path boundary. |
| Generated Brief Studio importable-package prompt mirrors | Runtime package mirrors must match the source app prompts. | `Updated` | Build/regeneration keeps the importable package aligned with source prompt wording. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `docs/custom-application-development.md` | Public developer documentation | Replaced workspace-contained path rule with the final relative/absolute path contract and snapshot/app-resolver behavior. | Prevent custom application authors from applying obsolete workspace-only guidance and document accepted host-path exposure semantics. |
| `applications/brief-studio/agent-teams/brief-studio-team/agents/researcher/agent.md` | Built-in application prompt | Changed the pre-publication rule from "written in the workspace" to "written" and kept exact absolute path reuse. | Brief Studio agents may receive runtime paths such as `/private/tmp/...`; the prompt should not reintroduce workspace-only assumptions. |
| `applications/brief-studio/agent-teams/brief-studio-team/agents/writer/agent.md` | Built-in application prompt | Changed the pre-publication rule from "written in the workspace" to "written" and kept exact absolute path reuse. | Same as researcher prompt; writer publication must accept runtime-produced absolute file paths. |
| `applications/brief-studio/dist/importable-package/.../agents/researcher/agent.md` | Generated runtime package mirror | Mirrors the source researcher prompt. | Imported Brief Studio packages must run with the same publication guidance. |
| `applications/brief-studio/dist/importable-package/.../agents/writer/agent.md` | Generated runtime package mirror | Mirrors the source writer prompt. | Imported Brief Studio packages must run with the same publication guidance. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| `publish_artifacts` path contract | Paths may be workspace-relative or absolute; absolute paths may be inside or outside the workspace when readable by the runtime server. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `docs/custom-application-development.md` |
| Published artifact identity | New summaries/revisions expose normalized absolute source paths; relative inputs are resolved against the workspace root before storage. | `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `docs/custom-application-development.md` |
| Durable snapshot model | Publication snapshots source content into run memory at publish time; later app reads use the snapshot rather than rereading the original host path. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md` | `docs/custom-application-development.md` |
| App-owned semantic artifact resolution | Application handlers must not infer business role from workspace-relative-only paths; they should interpret `path` using app-owned resolvers. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md` | `docs/custom-application-development.md` |
| Brief Studio prompt boundary | Brief Studio agents should publish the exact absolute path returned by the write step after the checkpoint file exists. | `api-e2e-validation-report.md`, live Brief Studio Codex/GPT-5.5 evidence | Brief Studio researcher/writer prompt docs and generated importable package mirrors |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Workspace-contained published-artifact path rule | Run-owned source identity: workspace-relative inputs resolve to absolute paths; readable absolute paths may be outside the workspace. | `docs/custom-application-development.md` |
| App handler assumption that artifact role must come from exact workspace-relative paths | App-owned semantic resolvers that accept relative or absolute source paths and derive role from app semantics. | `docs/custom-application-development.md`; implementation in Brief Studio and Socratic app resolver services |
| Singular `publish_artifact` compatibility path | No replacement; plural-only `publish_artifacts` remains the only active publication surface. | `docs/custom-application-development.md` migration note |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A`
- Rationale: Long-lived docs and built-in app prompts were updated in the integrated ticket branch. Delivery did not need additional doc edits beyond verifying and recording that final integrated docs match the reviewed/validated behavior.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against the ticket branch after merging `origin/personal @ a7e1ddf69efd659b2e70a7e5d9a22b7f5521e0df` and rerunning the targeted suite. User verification was received on 2026-05-05, the ticket has been archived to `tickets/done`, and release work remains intentionally skipped.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
