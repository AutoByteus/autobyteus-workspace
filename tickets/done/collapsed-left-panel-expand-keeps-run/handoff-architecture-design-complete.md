# Handoff — Architecture Design Complete (direct implementation route)

- Package identifier: `collapsed-left-panel-expand-keeps-run`
- Current solution revision: `SR-004`
- Result classification: `Architecture Design Complete`
- task_size: `Medium`; architectural_risk: `Low`
- Selected route (from `get_handoff_rules`): Small/Medium + Low → `/software_engineering_team/implementation_engineer`. This is a direct implementation route; independent architecture review is not applicable.
- Architecture review artifacts: `N/A — not applicable` (direct route)

## Original Request

Project Task `project_task_b2b0538a-4613-457a-81ed-6c9e9949da77`, delegated by `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): "Collapsed left panel: let the user expand it again without leaving the run they're on."

- With the left panel collapsed, the user opens a run from a Task card in the right Projects tab.
- Clicking the strip's Chat icon to get the panel back navigates to New chat, so the run is lost.

Done when: with the panel collapsed, the user opens a run from a Task card, expands the panel, and sees the same run still open and highlighted in the Workspaces tree, with nothing else opened. The user verifies this in the desktop app.

## Goal (approved)

Add a **Workspaces** icon (Phosphor `ph:tree-view`) to the collapsed left strip, after the page icons and a light divider.
- It shows the panel (docked, or the drawer) and never navigates.
- When the panel appears, the open run is selected, its ancestors are expanded (including nested sub-team rows) and it is scrolled into view (centred, only if hidden).
- Workspaces is lit only when a run is actually shown. Chat is lit only on New chat.
- Page icons, Chat row and pencil clicks are unchanged.
- Focus moves to Workspaces after collapse, to the revealed row after docking, and back to Workspaces when the drawer closes.
- On short windows (481–540 px tall) the divider is hidden and spacing is tighter.

## Approval Basis

- Requirements: `requirements-doc.md` at SR-003, status `Approved`. The user said on 2026-10-08: "Like your suggestion. Let's do it."
  - DEC-001 = D (Workspaces icon)
  - DEC-002 = a (page icons unchanged)
  - DEC-003/DEC-004 = out of scope
  - DEC-005 = lit only when a run is shown
- Behavior-defining supplement: the Product UI/UX spec, user-confirmed in Product review on 2026-10-08. It is normative per its Implementation Fidelity Boundary.
  - `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/ui-ux-spec.md`
  - `visual-references/VIS-001..VIS-008`
  - Design repo `/Users/normy/autobyteus_org/autobyteus-web-design`, `personal` @ `7a8e634`; validated revision `6478eec`; source pin `1cd1a3abc`
  - Runnable UI reference: `corepack pnpm install --ignore-workspace --frozen-lockfile && corepack pnpm dev --port 3210` in the design repo, then open `/chat?id=run-research-001`

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run`
- Branch: `codex/collapsed-left-panel-expand-keeps-run`
- Base: `origin/personal`. The worktree was created at `3a2496c95` and fast-forwarded to `efc2bfd0f` on 2026-10-08. There are no commits yet; ticket files are untracked.
- Finalization target: `origin/personal`

## Artifacts (absolute paths)

All files are in `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/tickets/in-progress/collapsed-left-panel-expand-keeps-run/`:
- `requirements-doc.md`
- `investigation-notes.md` (AF-001..AF-010 architecture evidence)
- `design-spec.md` (D-1..D-7, file mapping, sequence, validation guidance)
- `solution-revision-record.md` (SR-001..SR-004)
- `product-design-request.md`
- `approval-request.md`
- `evidence/user-collapsed-strip-run-open.png`

## Classification Evidence

- About 12 renderer files plus one new composable, all within existing owners:
  - `useShellPrimaryNavigation`
  - `LeftSidebarStrip`
  - `AppLeftPanel`
  - `workspaceNavigationService`
  - `useWorkspaceHistoryTreeState`
  - tree panel and section
  - `WorkspaceAdaptiveLayout`
  - `chat.vue`
  - en/zh-CN strings
- Plus docs, tests and a probe update.
- No API, persistence, Electron main/IPC, security or concurrency change.

## Open Risks For Implementation And Validation

- R-001: rows load after the panel mounts. This is covered by the bounded reveal window (D-4) and the team-reveal pending rule (D-5).
- R-002: existing tests and probes assume Chat is lit on `/chat?id=`, and probe D11 in `tests/e2e/chat-draft-rows-live-probe.mjs` reopens via the strip Chat icon. Update them.
- R-003 / U-001: the UI reference has no Team- or Org-hosted Task-card fixtures. Prove AC-002/AC-003 in production, e.g. by extending `test:e2e:project-manager-ux`.
- R-004: during a brief "opening" state neither Chat nor Workspaces is lit. This is accepted.
- `TESTING.md` rule: never test against the user's running app or data. Use a browser probe and an isolated desktop instance of a worktree build.

## Expected Output

Implementation per `design-spec.md`, with implementation-scoped checks (unit/component tests and rendered UI fidelity against VIS-001..008), and Implementation Engineer's `implementation-handoff.md`.

## Route Record

- `get_handoff_rules` (2026-10-08) matched: "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`.
