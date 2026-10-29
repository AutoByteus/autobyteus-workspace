# Handoff — Product Design Requested

- Package identifier: `settings-update-notifications`
- Result classification: `Product Design Requested`
- Purpose: `New Request`
- From: Solution Designer (`/software_engineering_team/solution_designer`)
- To: `/project_task_manager` (calling workflow; it delegates the design to the Product Team and passes the result back to this Solution Designer by its run ID)
- Date: 2026-10-20
- Current SR entry: `SR-001`
- Approval state: requirements basis `Approved` by the Solution Designer within the direction (user informed). The UI/UX design itself needs the user's approval before building.

## Original Request And Goal

Requested by the user on 2026-10-20 through the Project Task Manager. Users import public agent packages and skills from GitHub that improve fast, but they get no notice that a newer version exists. The user wants a **notification area** where they can read such notifications and act on them. Updating is always the user's decision; nothing updates by itself.

## The User's Requested Outcome (the user's words, from the Task)

- "A small, quiet notification area, not a pop-up. The user's idea: the Settings page has a lot of empty space on the right, a good place for notifications. Also consider a small badge or dot on the Settings entry in the sidebar bottom-left, so a user who never opens Settings notices that something is waiting; the Product Team decides the placement and look."
- "A UI/UX design step first with the Product Team (placement, states, empty state, badge, en and zh-CN strings; the design repository autobyteus-web-design is updated by its owner), approved by the user, before building."
- "Design it so that other kinds can be added later without redesign."

## Focused Product Decisions To Design

1. Placement of the notification area in Settings (the empty right-hand space is the user's idea) and its behavior on narrow windows.
2. The indicator outside Settings (badge or dot on the Settings entry in the sidebar's bottom-left strip and/or the left panel's Settings entry).
3. Notification item anatomy for three kinds: app update, GitHub agent package update, GitHub skill source update — kind, name and repository, installed → latest (short revision or version), when found, "what changed" (GitHub compare link for packages/skills; release notes and release link for the app), Update, Dismiss (= skip this version).
4. States: unread, read (stays quietly listed), updating (with progress, especially the app download), update failed (error, source unchanged), handled ("updated"), dismissed; empty state; "background checks are off" state.
5. The per-node setting "check imported GitHub packages and skill sources for updates in the background" (on by default) with an honest description of the network calls (REQ-014).
6. How the app update is presented now that the self-opening bottom-right card is retired (DEC-001): its information and actions (Download, progress, Install & restart, release notes) live in the notification and Settings → Updates.
7. All strings in English and Simplified Chinese (zh-CN).

## Requirements Context (IDs)

- Use cases: UC-001..UC-007. Scenarios: SCN-001..SCN-008.
- UI-facing requirements: REQ-004, REQ-005, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-016, REQ-017, REQ-018; quality QR-004.
- UI-facing acceptance criteria: AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-009, AC-010, AC-011, AC-016, AC-018, AC-019.
- Decisions already made (reasoning in the requirements doc): DEC-001 retire the self-opening app-update card; DEC-002 per-node setting, on by default, app startup check unchanged; DEC-004 one Dismiss action meaning skip this version, read state is "later"; DEC-005 compare link / release notes for "what changed"; DEC-006 no notifications for check failures; DEC-008 one record per source, handled state kept; DEC-009 desktop shows node + app notifications, browser shows node notifications, mobile none; DEC-012 Update keeps each kind's existing flow (the skill source confirmation stays).

## Established Constraints And Non-Goals

- Never update by itself; no automatic-update option (separate later Task).
- Quiet: no notification opens a pop-up, modal, toast or OS notification by itself.
- At most one notification per source and one for the app; a newer version updates the same item.
- No telemetry; background requests go only to GitHub.
- The existing rows (Settings → Agent Packages, Skills → Manage skill sources) and Settings → Updates keep their controls.
- Not in scope: local/built-in/application-package sources, OS notifications, a switch for the app's own startup check, the mobile client.

## Existing Product Context (for reference, not instructions)

- Settings page: `autobyteus-web/pages/settings.vue` (left navigation + content column; most sections are a centered `max-w-3xl` column).
- Sidebar Settings entries: `autobyteus-web/components/layout/LeftSidebarStrip.vue` (cog at the bottom), `autobyteus-web/components/AppLeftPanel.vue`.
- Current app-update card to be retired: `autobyteus-web/components/app/AppUpdateNotice.vue`.
- Settings → Updates: `autobyteus-web/components/settings/AboutSettingsManager.vue`.
- Skill source update confirmation: `autobyteus-web/components/skills/SkillSourcesModal.vue`.
- Node feature toggle card: `autobyteus-web/components/settings/FeatureCapabilityToggleCard.vue`.

## Canonical Paths

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications/tickets/in-progress/settings-update-notifications/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications/tickets/in-progress/settings-update-notifications/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications/tickets/in-progress/settings-update-notifications/solution-revision-record.md`
- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications/tickets/in-progress/settings-update-notifications/handoff-product-design-request.md`
- Design spec: not yet written (after the Product result).

## Workspace Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications`, branch `codex/settings-update-notifications`
- Base: `origin/personal` at `3d4d9d0a951d8ce164b7d1fc3528eb6ee90fd247`; finalization target `origin/personal`.

## Open Questions And Risks

- ASM-002: a 6-hour check interval; the user may prefer another.
- RSK-001: GitHub's unauthenticated budget (60 requests/hour per IP) is shared; the design should not invite frequent manual re-checks from the area.

## Expected Output

A Product-owned UI/UX package (UI/UX spec, runnable reference, final references, en and zh-CN strings) with the user's explicit confirmation, returned to this Solution Designer (run ID given in the message), so it can be integrated (SR-002) before architecture design.

## Route Record

- `get_handoff_rules` (2026-10-20): rules cover only Architecture Design Complete (reviewer / implementation) and Delivery receipt gaps; no rule matches `Product Design Requested`.
- Applied route: return to the calling workflow `/project_task_manager` with `send_message_to`.
