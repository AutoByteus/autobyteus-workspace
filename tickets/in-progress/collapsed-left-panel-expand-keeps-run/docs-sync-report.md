# Docs Sync Report

## Scope

- Ticket: `collapsed-left-panel-expand-keeps-run` (`task_size=Medium`, `architectural_risk=Low`, route: direct; confirmed by CRR-001)
- Trigger: API/E2E validation Pass (API-REV-002, round 2) from `api_e2e_engineer`
- Bootstrap base reference: `origin/personal@3a2496c95` (investigation). The ticket commits sit on `origin/personal@efc2bfd0f`.
- Integrated base reference used for docs sync: `origin/personal@ebf68c4af` (v1.4.99-beta.5), merged into the ticket branch as `f8b1fb4ec`
- Post-integration verification reference: `delivery-evidence/dr001-web-unit-full.log` (590 files / 4032 tests Pass) and `delivery-evidence/dr001-pmu-full/evidence.json` (PMU-001..PMU-019 Pass)

## Why Docs Were Updated

- Summary: The implementation already updated the behavior docs: `workspace_layout.md` gained a "Collapsed strip: pages and Workspaces" section, and `chat.md` gained a Highlight paragraph. Delivery added the new browser coverage to the testing docs. During integration, this ticket's PMU-017/PMU-018 collided with the base's PMU-017 (Cancelled Tasks, from task-closed-status, already finalized and documented). This ticket's cases were renumbered to **PMU-018/PMU-019**.
- Why this should live in long-lived project docs: `TESTING.md` is the canonical list of what each repository probe proves. Future readers need the probe IDs that match the code.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/workspace_layout.md` | Primary behavior doc for the strip, highlight and reveal | No change (updated by implementation, `1639cba95`/`d0bf3db82`) | Checked against the final code. It covers the Workspaces icon, highlight rule, reveal window, the IR-002 `runShown` gate and the short-window spacing. |
| `autobyteus-web/docs/chat.md` | Highlight change (Chat = New chat) | No change (updated by implementation; auto-merged cleanly with base edits) | Merged text reads correctly. |
| `TESTING.md` | Probe catalogue for `test:e2e:project-manager-ux` | Updated | Range and the new PMU-018/PMU-019 bullets |
| `autobyteus-web/docs/projects.md` | Lists the PMU cases by number | Updated | Short PMU-018–019 pointer. This doc does not list the base's PMU-017; that gap predates this ticket and was not changed. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Workspaces tree progressive disclosure | No change | The ancestry expansion is described generally. The new reveal detail lives in `workspace_layout.md`. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `TESTING.md` | Test catalogue | `(PMU-001..PMU-016)` → `(PMU-001..PMU-019)`. Added PMU-018 (collapsed strip Workspaces from Task cards for Agent/Team/Org hosts, drawer, short window, New chat) and PMU-019 (nested member, first send, far-down Org, slow start, highlight routes, page icon, no reveal off a run). | API/E2E follow-up. IDs renumbered after the merge with the base. |
| `autobyteus-web/docs/projects.md` | Test catalogue pointer | PMU-018–019 paragraph linking to Workspace Layout and `TESTING.md` | Keeps the per-case list in this doc consistent with the probe |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Strip highlight = where you are | Chat is lit only on New chat. Workspaces is lit while a run is shown. Both are owned by `useShellPrimaryNavigation`. | design-spec D-1/D-2 | `workspace_layout.md`, `chat.md` (by implementation) |
| Reveal on panel mount, gated on run shown | Bounded 3 s observer. It only scrolls and focuses, never selects. It acts only while `isWorkspacesActive` (IR-002 / CR-001). | design-spec, implementation-revision-record IR-002 | `workspace_layout.md` (by implementation) |
| Probe coverage IDs | PMU-018/PMU-019 = this ticket. PMU-017 = Cancelled Tasks. | api-e2e-execution-coverage-report (as PMU-017/018) | `TESTING.md`, `projects.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Chat lit on any `/chat` route (including `/chat?id=`) | Chat lit only on New chat; Workspaces lit while a run is shown | `workspace_layout.md`, `chat.md` |
| Ticket probe IDs PMU-017/PMU-018 (in API/E2E artifacts) | PMU-018/PMU-019 in the integrated probe | `TESTING.md`; this report. Ticket API/E2E artifacts keep their original IDs as historical evidence. |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: Not applicable (docs were updated)
- Rationale: —

## Re-check After Resume (DR-003, 2026-10-09)

- Integrated base: `origin/personal@033a6d780` (merge `1f34735ed`).
- Requirements and design are unchanged (SR-005 withdrew the change request), so the DR-001 docs still describe the final behavior.
- I re-read the docs after the merge:
  - `workspace_layout.md`: "Collapsed strip: pages and Workspaces" section intact.
  - `chat.md`: the base added mention text elsewhere. The Highlight paragraph and the `chatRouteRunId` note are intact.
  - `TESTING.md`: the range is still `PMU-001..PMU-019`, the PMU-018/019 bullets are intact, and the base added no new PMU IDs.
  - `projects.md`: the PMU-018–019 pointer is intact.
- Result: no further docs change needed.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary → user verification hold
- Notes: ID mapping for readers of the ticket's API/E2E artifacts: ticket `PMU-017` = integrated `PMU-018`; ticket `PMU-018 (A–H)` = integrated `PMU-019 (A–H)`.
