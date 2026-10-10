# Handoff Summary — collapsed-left-panel-expand-keeps-run

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run`
- Ticket branch: `codex/collapsed-left-panel-expand-keeps-run` (local only; not pushed yet)
- Base / finalization target: `origin/personal`.
  - Bootstrap base: `3a2496c95`. The ticket commits sit on `efc2bfd0f`.
  - At delivery start the base had advanced 41 commits to `ebf68c4af` (task-closed-status, interrupt-resend-retired-cleanup-stuck, delegated-team-member-lazy-activation, through v1.4.99-beta.5).
  - The ticket artifacts were checkpointed (`5abe30017`), then the base was merged as `f8b1fb4ec`.
- Merge conflict, resolved by delivery: `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` only. Both sides had added a case named PMU-017.
  - Resolved as a union. The base's Cancelled Tasks case stays PMU-017. This ticket's cases became **PMU-018** (formerly PMU-017) and **PMU-019** (formerly PMU-018 A–H).
  - No product source conflicted, and the base changes do not touch the ticket's source files.
- Re-integration after the DR-002 hold was lifted (DR-003, 2026-10-09):
  - The base had advanced 78 more commits to `033a6d780`, through v1.4.99-beta.8 and gemini-native-cache-hit.
  - Ticket records were checkpointed (`a4a98b712`) and the base was merged as `1f34735ed`, with no conflicts.
  - The new base commits do not touch this ticket's source, specs or probes. Only `autobyteus-web/docs/chat.md` and `TESTING.md` changed on both sides, and both merged automatically. This ticket's text is intact.
- Cancelled on 2026-10-09 (DR-004), reopened on 2026-10-10 (SR-006, DR-005):
  - The Solution Designer recovered the branch and worktree at `900443b11`.
  - IR-003 merged `origin/personal@d28c56d5d` (v1.4.99 stable) as `0604a9586`. It was a no-code re-verification: the 13 feature files are byte-identical to IR-002.
  - API/E2E round 3 (API-REV-003) passed on that base.
  - At DR-005 (fetched 2026-10-10) the branch is current: 0 commits behind `d28c56d5d`.
- Verified candidate: the ticket branch HEAD that contains this file (the DR-005 delivery commit on top of `58df517c3`).
- Classification: `task_size=Medium`, `architectural_risk=Low`.
- Route: direct. Architecture review and test-code review are `N/A — not applicable`. A failure-origin code review (CR-001, CRR-001) ran after API/E2E round 1.

## What Changed

- **Workspaces icon in the collapsed strip.** It sits below the page icons, after a divider (`ph:tree-view`).
  - Clicking it docks the panel, or opens the drawer when there is no room. It never navigates.
  - Route, selected run, center, open draft and right panel (including the Projects tab) are kept.
- **The highlight shows where you are.**
  - Workspaces is lit while a run is shown: an Agent run on `/chat?id=…`, or a Team or Org run on `/workspace`.
  - Chat (strip icon and docked Chat row) is lit only on New chat.
- **Reveal when the panel appears.**
  - The open run's ancestry is expanded, including a Team member inside nested sub-teams.
  - Within 3 s, the selected row is centred if it isn't fully visible, and focus moves onto it.
  - A user wheel, press or key ends the reveal window.
  - It acts only while a run is shown (IR-002 / CR-001 fix). On New chat or other pages, focus stays on the Workspaces section.
- **Focus.** The docked collapse button moves focus to the strip's Workspaces icon, and closing the drawer returns focus there.
- **Short windows.** At 540 px tall or less, the divider is hidden and the icon spacing is tightened.
- Client only (`autobyteus-web`), with no server or data change. Strings: en `Workspaces`, zh-CN `工作区`.
- Product commits:
  - `1639cba95`: feature (IR-001)
  - `d0bf3db82`: CR-001 fix (IR-002)
- Test commits:
  - `db0ed1c3c`: baseline fix
  - `6923ca5b4` and `ca641f976`: API/E2E coverage
  - `4fb0259dd` and `c708178d3`: round-3 baseline fixes (PMU-017 overflow polling; projects-navigation warm-up)
- Docs:
  - `autobyteus-web/docs/workspace_layout.md` and `autobyteus-web/docs/chat.md` (implementation)
  - `TESTING.md` and `autobyteus-web/docs/projects.md` (delivery)

## Validation Evidence

| Gate | Result |
| --- | --- |
| Implementation | IR-001 and IR-002 (CR-001 fix), with self-review |
| Code review (failure origin) | CR-001 Local Fix → IR-002; CRR-001 confirmed the classification |
| API/E2E (API-REV-002) | Pass, final confidence 95%. Full PMU suite pass. Projects navigation B-001..B-005. Chat draft rows D00–D14 on real Codex. Packaged isolated desktop DSK-001 (Agent, Team and Org hosts; New chat after a Team run). FAIL-001 resolved. |
| Repository (API/E2E) | Web unit tests: 589 files / 4021 tests pass |
| Delivery post-merge (`f8b1fb4ec`) | Web unit tests: 590 files / 4032 tests pass (`delivery-evidence/dr001-web-unit-full.log`). Full `test:e2e:project-manager-ux`: PMU-001..PMU-019 all pass, cleanup clean (`delivery-evidence/dr001-pmu-full/evidence.json`). The server was rebuilt first. |
| API/E2E round 3 (API-REV-003, reopened, on `d28c56d5d`) | Pass, 95%. Web unit tests: 593 files / 4062 tests. PMU-001..PMU-019: 19/19. B-001..B-005 with a cold and a warm cache. D00–D14 on real Codex. DSK-001 in a rebuilt packaged app at `c708178d3` (`iso-62032-1caa`; stopped and removed). |
| Delivery DR-005 | The branch is already current with `d28c56d5d`, so there was no merge and no rerun. Round 3 ran every check on this exact base and code, and only ticket artifacts have changed since. |
| Delivery re-integration (`1f34735ed`, DR-003, superseded) | Server rebuilt (EXIT=0). Web unit tests: 592 files / 4041 tests pass (`delivery-evidence/dr003-web-unit-full.log`). Full `test:e2e:project-manager-ux`: PMU-001..PMU-019 all pass, cleanup clean (`delivery-evidence/dr003-pmu-full/evidence.json`). |

## How To Verify (desktop app)

The requirement's "done when" asks the user to verify in the desktop app. Build and start an isolated app from this worktree:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run
pnpm --silent isolated-app start --build
```

1. Use a wide window. Collapse the left panel with the collapse button on its first row.
   - Expected: the strip shows the page icons, a divider, then **Workspaces**, with Settings at the bottom.
   - Expected: focus lands on Workspaces.
2. Go to **Projects** and open a Task card's worker link (an Agent-hosted worker). Collapse the panel again if it opened.
   - Expected: the worker opens in the center, and **Workspaces** (not Chat) is lit in the strip.
3. Click **Workspaces**.
   - Expected: the panel docks and the same run stays open in the center (address unchanged).
   - Expected: the worker's row is highlighted, visible (scrolled to if needed) and focused, with its parent rows expanded.
   - Expected: the right panel's tab is unchanged.
4. Repeat steps 2–3 for a Team-hosted worker (ideally a member inside a nested sub-team) and for an Org-hosted worker.
   - Expected: the exact member row is revealed.
5. Click **New chat** (or the Chat icon), collapse the panel, then click Workspaces.
   - Expected: Chat is lit, not Workspaces.
   - Expected: the panel opens with focus on the Workspaces section, and no old run row is scrolled to or focused.
   - Expected: any typed draft text is kept.
6. Optional: narrow the window until the strip shows the drawer, then click Workspaces.
   - Expected: the drawer opens on the open run, and Escape returns focus to Workspaces.
7. Optional: with the panel collapsed, click a page icon (for example Agents).
   - Expected: it still opens the panel and goes to that page.

## Residual Risks (accepted)

- If history loads slower than the 3 s window, the run is selected and expanded but not scrolled to (the spec permits this).
- The drawer, the short window and zh-CN were proven by browser probes and unit tests, not rerun in the packaged app.
- A pre-existing stale Team/Agent highlight on no-run pages remains. It is out of scope and no longer affects the reveal.
- A note for the Solution Designer: REQ-005/AC-002 mention a member opened from the right Team tab. That tab is messages-only in this product, so the nested member was covered through the tree instead.

## Delivery Artifacts

- Docs sync: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/docs-sync-report.md`
- Release notes: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/release-notes.md`
- Release/deployment report: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/release-deployment-report.md`
- Delivery revision record: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/delivery-revision-record.md` (DR-001..DR-005)

## Outcome

- **Halted (DR-002), then resumed (DR-003), 2026-10-09.**
  - The user first objected that folding and unfolding use different icons.
  - After going through the alternatives, the user withdrew the request: "After thinking for a long time, seems like the best option is still the tree option" (SR-005).
  - Requirements (SR-003) and design (SR-004) are unchanged. The verification steps above apply again.
- **Cancelled (DR-004), 2026-10-09; reopened (SR-006, DR-005), 2026-10-10.** The user's words: "I still like the solution for the tree button. When I click the collapse, it should collapse. And then there is a tree button so I could click again to open the [workspaces] tree itself. The chat button is just for the chat page; if I want a new chat, I just click new chat." This is SR-003 unchanged.
- User verification: pending (requested at DR-005)
- Finalization / release: pending user verification. `personal` is at stable `v1.4.99`, so the user chooses the next version if a release is wanted.
