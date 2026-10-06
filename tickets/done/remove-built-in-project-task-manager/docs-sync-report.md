# Docs Sync Report

## Scope

- Ticket: `remove-built-in-project-task-manager`
- Trigger: CRR-002 post-API/E2E test-code review Pass, from `code_reviewer`. Prior gates: CRR-001 Pass (9.5/10) and API-REV-001 Pass (confidence 95.7%).
- Classification (preserved): `task_size=Medium`, `architectural_risk=High`. Route: full independent review.
- Bootstrap base reference: `origin/personal@1aa91829811866d391bb61d011109aa1a4ea7683`
- DR-001 integrated base reference used for docs sync: `origin/personal@db39803d49dcf9e4582b8c4ff143641532f5bfc0`, merged into the ticket branch as `f928bfed3`.
- Post-integration verification reference: `delivery-evidence/build-integrated.log`, `delivery-evidence/vitest-integrated.log` and `delivery-evidence/web-integrated.log`.

## Why Docs Were Updated

- Summary: The server no longer ships a Project Task Manager. A required startup migration deletes its installed copy once. The long-lived docs must stop presenting a shipped manager (AC-010 / REQ-008). They must also describe the migration's user-visible effect and the reusable rule for retiring a built-in agent.
- Why this should live in long-lived project docs: The migration permanently deletes an app-data folder, and operators need to know that. Retiring a built-in is a reusable pattern: no retired-ID list in the bootstrapper, and removal goes through a registered migration. Future built-in retirements must follow it.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/README.md` | Migration catalogue / operator-visible data effects | No change (updated in `62af418df`, verified) | The `20261006_remove_built_in_project_task_manager` paragraph matches the migration source: no backup, missing folder skipped, `FAILED` is non-blocking, retry only at startup, nothing else touched. |
| `autobyteus-server-ts/docs/modules/projects.md` | Previously described the shipped Manager | No change (updated in `62af418df`, verified) | It states that no Project manager agent ships and points to the agent repository's `project-task-manager`. It records the retirement. |
| `autobyteus-web/docs/projects.md` | Mirror of the server Projects doc | No change (updated in `62af418df`, verified) | Consistent with the server doc. |
| `TESTING.md` | Node-locality suite description referenced "Manager bootstrap" / "Manager Chat" | No change (updated in `62af418df`, verified) | Now reads "direct MCP Project tool calls" / "managing-agent Chat". |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Canonical built-in-agent sync doc | **Updated** (delivery) | The built-in list already named only the Retrospective Skill Improver and the Daily Assistant, which matches the registry. A paragraph was added on how to retire a built-in. |
| `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md` | Startup order (migrations before built-in bootstrap) | No change | Order unchanged. The new migration runs in the existing migration step. |
| `autobyteus-server-ts/docs/modules/skill_improvement.md` | Mentions built-in agents | No change | Concerns only the Retrospective Skill Improver. |
| All `*.md` outside `tickets/` (`git grep` for `project-task-manager`, `Project Task Manager` and `Manager Chat/bootstrap`) | AC-010 sweep | No change | The remaining hits are the intentional ones above. `autobyteus-web/test-support/fixtures/linked-org-history-public*.json` is frozen historical run data and is valid by design. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Durable rule added (Built-In Agent Sync) | The bootstrapper never deletes app-data agent folders. To retire a built-in, remove its registry row and template, then add a registered startup migration when the installed copy must go. A bootstrapper retired-ID list or cleanup loop is not allowed. The section cites the PTM retirement as the example. | It promotes design-spec decisions (no retired-ID list, removal owned by the migration subsystem) into the canonical doc. |
| `autobyteus-server-ts/README.md`, `docs/modules/projects.md`, `autobyteus-web/docs/projects.md`, `TESTING.md` | Updated during implementation (`62af418df`) | See above | AC-010 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Retiring a built-in agent | Remove the registry row and template. Delete the installed copy through a once-only registered startup migration. The bootstrapper gets no deletion duty. | `design-spec.md` (removal list, "Where cleanup lives" decision) | `autobyteus-server-ts/docs/modules/agent_definition.md` |
| PTM removal migration semantics | Deletes `agents/autobyteus-project-task-manager/` permanently. Startup-only retry. Never blocks startup. History stays readable but cannot be continued. | `requirements-doc.md` DEC-001/DEC-002; `design-spec.md` | `autobyteus-server-ts/README.md` |
| Project management without a shipped manager | Any Agent that selects the Project tools can manage Projects. The agent repository provides `project-task-manager`. | `requirements-doc.md` BEH-005/BEH-007 | `autobyteus-server-ts/docs/modules/projects.md`, `autobyteus-web/docs/projects.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Built-in `autobyteus-project-task-manager` (`src/built-in-agents/templates/project-task-manager/`, registry row, web mirror ID) | The agent repository's `project-task-manager`, outside this repo, loaded through a package root | `docs/modules/projects.md`, `autobyteus-web/docs/projects.md` |
| Installed app-data copy `agents/autobyteus-project-task-manager/` | Deleted once by migration `20261006_remove_built_in_project_task_manager` | `autobyteus-server-ts/README.md`, `docs/modules/agent_definition.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: Hold for explicit user acceptance of verification, then finalize into personal and release one NEW BETA.
- Notes: AC-010 is satisfied. No long-lived doc claims a shipped Project Task Manager template or ID.

## DR-002 — Resumption docs recheck

- Latest integrated base: `origin/personal@f777a6559edf767f15b5653dc57998414e8078e6`; merged as `0f66ad7a0ca2c4753372ee3b8996e5b9769bf3e8` after checkpoint `db77f6035`.
- Latest source/behavior unchanged for the removal; the incoming Task-closure package has no removal-specific source/doc overlap. `TESTING.md` auto-merged without conflicts.
- Canonical docs listed above rechecked against the integrated registry/migration behavior. No additional long-lived edit needed. AC-010 grep finds only intentional historical retirement/fixture mentions, not a current shipped manager claim.
- Build (including sanitized built-in bootstrap smoke), 390 server tests and 57 web tests passed. Three opt-in new-base AGY task-closure tests skipped; not claimed as proof. See `delivery-evidence/dr-002/`.
- Docs sync result: Pass. NEW BETA release direction recorded; explicit verification acceptance still pending. No user app testing is inferred.

## DR-003 — Final accepted integrated state

Latest base `origin/personal@8e9f855a9` integrated as `526bac6a3`, after the member-hydration integration `eb6941349`. Docs still match the final removal behavior; no additional long-lived edits needed. Build, 369 server tests, 64 web tests and final sanitized smoke Pass (`delivery-evidence/dr-003/`). User explicitly accepted the presented automated evidence and requested finalization/new beta (`user-verification-record.md`); no personal test claimed. DR-003 delivery is now Completed: archive/finalization/beta publication/rollout/safe cleanup receipts in `release-deployment-report.md`. DR-001 and DR-002 sections are historical, not current gate status.
