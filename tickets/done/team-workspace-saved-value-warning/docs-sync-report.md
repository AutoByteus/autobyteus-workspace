# Docs Sync Report — saved Team workspace path

## Scope
- Ticket: `team-workspace-saved-value-warning`; delivery baseline `DR-001`.
- Trigger: `API-REV-001 Pass` on the direct `task_size=Medium`, `architectural_risk=Low` route. Independent architecture/source/test-code reviews: N/A — not applicable.
- Bootstrap and integrated base: `origin/personal@6f00cda64b75ca0097fbc08d862596f90e0e0ad8`.
- Initial refresh: `git fetch origin personal` followed by `git merge --no-edit origin/personal`; merge reported `Already up to date`, with `HEAD...origin/personal` = `3 0`. No new base commits were integrated.
- Post-integration verification: no rerun was required because the validated candidate `89e3a2d309338f1c103241888883a7ce45fa09e4` was already current with the refreshed remote base. `API-REV-001` remains the executable authority: 65 relevant Vitest tests and six Chrome/Nuxt browser scenarios passed; final confidence 96%. Documentation-only diff checked with `git diff --check`.

## Why Docs Were Updated
The durable web behavior/architecture guides described fixed existing-run workspaces but not the path-authoritative saved Team presentation boundary. Future maintainers need to know why saved Team root/member paths must not be sent through the editable Existing/New selector, why a missing workspace ID is not an availability result, and why mounted AgentOrg Team editing remains distinct.

## Long-Lived Docs Reviewed
| Doc Path | Result | Reason |
| --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Updated | User-facing existing-run settings behavior and preserved new-Team/Org boundaries. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Updated | Canonical Team projection, discriminated presentation, renderer ownership, removal of obsolete selector-shaped Team state. |
| `autobyteus-web/docs/agent_teams.md` | No change | Launch, runtime, and history overview does not specify existing-run settings presentation; no contrary statement found. |
| `autobyteus-web/docs/agent_orgs.md` | No change | Existing mounted-Team workspace editing description remains correct and intentionally preserved. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` and `workspaces.md` | No change | Backend execution/persistence and workspace contracts did not change. |
| `README.md` release guidance | No change | Packaging and documented release method are unchanged. |

## Docs Updated
| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Existing-run UX contract | Exact saved Team root/member path once, read-only; null neutral; no inventory/availability inference, chooser, or save mutation; new-Team and AgentOrg selectors preserved. | Match validated behavior without implying path availability. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Internal boundary | Fixed-path presentation from canonical `workspace_root_path`, renderer routing, removal of Team `historical-only` and parallel model fields, distinct AgentOrg selector. | Keep future changes from restoring the false selector premise. |

## Durable Design / Runtime Knowledge Promoted
| Topic | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- |
| Saved Team path, not workspace ID, is display authority; no physical existence check is implied. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `settings.md`, `agent_execution_architecture.md` |
| Fixed saved Team presentation is separate from new-run selection and mounted AgentOrg Team editing. | Same | Same |
| Model Save preserves stored root/member workspace paths; no persistence transition. | Same | Same |

## Removed / Replaced Components Recorded
| Old Component / Path / Concept | Replacement | Documented In |
| --- | --- | --- |
| Saved Team `historical-only` projection, disabled New selector, false warning and duplicate success path | Direct `fixed-path` presentation and `FixedWorkspacePath` | Both updated docs |
| Parallel `workspaceControl`/`storedWorkspace` existing-form fields | Discriminated `workspacePresentation` union | `agent_execution_architecture.md` |

## Delivery Continuation
- Result: `Pass` for initial integration and docs sync.
- Next: explicit user verification of the current handoff state. No ticket archival, push, target merge, tag, release, deployment, or cleanup is authorized before that signal.
- Residual validation limit: browser GraphQL used a schema-parsed fixture because the local backend lacked a saved Team; neither a real persisted backend journey, physical path existence, nor installed Electron shell was claimed.
- Blocked/escalated follow-up: N/A for docs. User-verification hold is a required gate, not an implementation or design failure.

## DR-002 live-backend browser verification
- User requested a delivery-owned browser check against the existing Electron-started backend. The changed worktree Nuxt frontend at port 3012 was opened in visible Chrome and pointed at that backend on port 29695.
- The real saved Team's root and six member paths were read from `GetTeamRunResumeConfig` and matched seven fixed/read-only browser fields; no false warning, chooser or duplicate appeared. See `delivery-live-browser-evidence.md`.
- This confirms rather than changes the long-lived documentation contract. No additional long-lived docs edit was needed. User verification and finalization remain pending.

## Post-acceptance finalization check
- The user explicitly accepted the browser result and requested ticket finalization without a new release on 2026-09-26. A fresh `git fetch origin personal` still found `origin/personal@6f00cda64b75ca0097fbc08d862596f90e0e0ad8`; no re-integration or renewed verification was needed.
- Archiving the ticket and declining a release do not change the two long-lived web behavior/architecture docs. Their DR-001 sync remains accurate.
