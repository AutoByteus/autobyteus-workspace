# Docs Sync Report

## Scope

- Ticket: `team-run-members-missing-regression`
- Trigger: Delivery-stage docs sync after API/E2E Round 4 passed for the Local Fix rework and inactive/all-offline team-member focus regression.
- Bootstrap base reference: `origin/personal` at `66bdc6d7f6fdcda2b11d39e9f3b7db18478cd723`, recorded in `investigation-notes.md`.
- Integrated base reference used for docs sync: `origin/personal` at `66bdc6d7f6fdcda2b11d39e9f3b7db18478cd723` after delivery `git fetch origin --prune` on `2026-06-03`; no new base commits were available to merge or rebase.
- Post-integration verification reference: Local checkpoint commit `3316000918647ce77c0de15666f479bb809bda92`; `git diff --check origin/personal --` passed after delivery docs updates; README-guided local Electron build passed on the same integrated state.

## Why Docs Were Updated

- Summary: Long-lived frontend docs were updated to record the now-explicit split between roster/history visual focus and active-execution command focus for team runs.
- Why this should live in long-lived project docs: The Local Fix clarified durable UI/runtime ownership: users can select inactive/all-offline roster members in history, Focus, Grid, and Spotlight, while the shared composer/send/interrupt path remains active-execution-owned for safe command targeting. Future work on team focus, history rows, composer labels, and task-agent safety needs this boundary outside ticket-local artifacts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_teams.md` | Canonical frontend agent-team behavior, team member focus, run-history hydration, selected-run surfaces, and member route/focus ownership. | `Updated` | Added the two-focus contract: roster/history visual focus comes from recursive `memberTree` and can point at inactive/offline logical members; active-execution command focus remains the safe composer/send/stop target. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Canonical frontend execution/runtime doc for team send/interrupt routing, active team recovery, workspace history selection, and task-agent safety. | `Updated` | Updated team store command descriptions, interrupt authority, and workspace history progressive-disclosure selection rules to distinguish roster/history focus from active-execution command focus. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Backend run-history API contract for team rows, `members`, and `memberTree`. | `No change` | Already documents `memberTree` as persisted recursive topology for reopening/nested display and `members` as flat status snapshots. Backend behavior remains unchanged and correct. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Backend team execution/restore contract for authoritative team topology and task-agent activity identity. | `No change` | Already states `TeamRunConfig.memberTree` is authoritative topology and active controls/task-agent identity use backend-owned route/run-id guards. No backend execution behavior changed. |
| `README.md`, `autobyteus-web/README.md`, `autobyteus-web/ARCHITECTURE.md` | Checked for user-facing or architecture-level claims about Electron build flow, team roster display, active-execution filtering, or Software Engineering Team-specific behavior. | `No change` | README Electron build guidance remained accurate and was used for the local build. No relevant stale team-focus claim was found. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_teams.md` | Durable behavior contract | Added a focused-member section explaining roster/history visual focus versus active-execution command focus, including the safe coordinator composer-label split for inactive roster selections. | The Local Fix made the split a user-visible and contributor-relevant team-run invariant. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Runtime/selection architecture | Updated `sendMessageToFocusedMember()` and `interruptGeneration()` descriptions to use active-execution command focus, added interrupt guidance for visual-focus/composer-target divergence, and documented team history member row selection state. | Future contributors must not re-normalize history visual focus through active-execution helpers or use inactive roster rows as command targets. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Team roster/topology display authority | Roster-style history tree, Focus pane, Grid, and Spotlight displays use authoritative recursive team topology (`memberTree`) rather than active-execution filtering. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/agent_teams.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Roster/history visual focus | Clicking a team-history member row whose route exists in `memberTree` should keep that route visually selected in the history tree and Focus display, even when the member is offline or lacks active runtime context. | `implementation-handoff.md`, `code-review-report.md`, `api-e2e-validation-report.md`, `api-e2e-round4-focus-rerun-evidence.json` | `autobyteus-web/docs/agent_execution_architecture.md` |
| Active-execution command focus | Composer/send/interrupt and task-agent activity safety remain active-execution-owned and can intentionally target the safe coordinator while visual focus shows another inactive roster member. | `design-spec.md`, `implementation-handoff.md`, `code-review-report.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/agent_teams.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Workspace grouping during hydrated team merge | Live/hydrated team-context merges must preserve the persisted history row's workspace grouping and use roster focus for selected-row highlighting. | `implementation-handoff.md`, `code-review-report.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/agent_execution_architecture.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Frontend roster/history display paths reusing active-execution projection and hiding inactive/unmessaged logical members. | Roster/history display paths now consume authoritative `memberTree` / `flattenTeamMemberNodesForDisplay(...)`; active-execution helpers remain limited to target/activity safety surfaces. | `autobyteus-web/docs/agent_teams.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| History member-row clicks being normalized to active-execution focus for visual selection. | History row selection and Focus display now preserve roster/history visual focus; composer/send/interrupt use active-execution command focus separately. | `autobyteus-web/docs/agent_execution_architecture.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `Docs updated`
- Rationale: `N/A`

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed on the latest tracked `origin/personal` state. Delivery is paused at the user-verification hold; ticket archival, pushing, merging, release, deployment, and cleanup have not been performed.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
