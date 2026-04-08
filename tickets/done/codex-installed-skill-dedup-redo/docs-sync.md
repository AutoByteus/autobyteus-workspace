# Docs Sync

## Scope

- Ticket: `codex-installed-skill-dedup-redo`
- Trigger Stage: `9`
- Workflow state source: `tickets/in-progress/codex-installed-skill-dedup-redo/workflow-state.md`

## Why Docs Were Updated

- Summary: the Codex integration docs previously described configured runtime skills as always being materialized into workspace `.codex/skills`, which is no longer true after the installed-skill dedupe change, and they also described runtime copies as preserving symlinks, which is no longer true after the requirement-gap re-entry.
- Why this change matters to long-lived project understanding: future readers need to know that the bootstrapper now reuses already discoverable same-name Codex skills, only copies missing skills into the workspace, and makes those copied bundles self-contained.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | It documents the Codex runtime shape, including configured-skill behavior. | Updated | Added the new preflight-dedupe behavior earlier and now replaced the symlink-preservation note with self-contained copied-bundle behavior after the requirement-gap re-entry. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Reviewed to confirm the ticket does not change raw-event ownership or mapping rules. | No change | This ticket does not affect Codex raw event conversion. |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Behavior clarification | Replaced the unconditional materialization wording with preflight `skills/list` reuse, missing-skill fallback materialization, and self-contained copied-bundle details for symlinked source content. | The previous wording would be inaccurate after this ticket and would hide the new same-name dedupe behavior and the fixed team-local symlink semantics. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Installed-skill reuse vs workspace copy | Codex bootstrap now reuses already discoverable same-name skills and only materializes missing skills. | `requirements.md`, `proposed-design.md`, `future-state-runtime-call-stack.md` | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Materializer symlink behavior | Runtime-owned skill copies become self-contained bundles on macOS/Linux by dereferencing source symlinks during materialization. | `implementation.md`, `api-e2e-testing.md` | `autobyteus-server-ts/docs/modules/codex_integration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "Configured runtime skills are materialized into the run workspace" as an unconditional statement | Bootstrapper preflight reuse via `skills/list`, with materialization only for missing skills | `autobyteus-server-ts/docs/modules/codex_integration.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used. There was real docs impact.

## Final Result

- Result: `Updated`
- If `Blocked` because earlier-stage work is required, classification: `N/A`
- Required return path or unblock condition: `N/A`
- Follow-up needed: `No`; the requirement-gap re-entry was fully reflected in the existing Codex integration doc, and the later local-fix re-review confirmed the shorter four-character materialized-directory suffix did not require any additional long-lived doc edits
