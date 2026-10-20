# Product Design Request — AI Runtimes page (New Request)

- Package: `runtime-lifecycle-review`, solution revision SR-004
- Purpose: **New Request**
- Requested by the user, 2026-10-20, in the Solution Designer conversation: "could you ask @Product Team to work on the UI first. so we could first pin down the ui design you know"
- From: Solution Designer, software engineering team (requirements owner). Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review/tickets/in-progress/runtime-lifecycle-review/`

## The user's requested outcome

Pin down the UI of the new **Settings → AI Runtimes** page first, before any requirements are approved or anything is built, so the user can review and settle how it looks and behaves.

## What the page is for (draft requirements, not yet approved)

Users of the AutoByteus desktop app normally install the AI coding engines themselves: **Codex, Claude, Antigravity, Grok**. AutoByteus uses whatever version is installed. Today there is no place in the app that shows them; the only signal is an "Unavailable" label with a reason in the chat model menu.

The page lists the four engines for the current node and, for each:
- installed or not, and the installed version (REQ-001);
- whether a newer version exists — "Up to date", "Update available (version X)" or "Check failed" — checked automatically when the page opens, plus a "Check again" action (REQ-002);
- an **Update** button that runs the vendor's own updater, shows progress and the result, then re-checks; unavailable while that engine has agents running (REQ-003);
- for a not-installed engine, "Not installed" and a link to the vendor's official install instructions (REQ-004);
- signed-in status where the engine can report it, otherwise "unknown" (REQ-005, pending Q-2).

Full draft: `requirements-doc.md` (BEH-001…005, REQ-001…005, DEC-001…003).

## Facts that shape the experience (investigation-notes.md E-R19, E-R20)

- All four engines **update themselves** already (Antigravity did so on the user's Mac on 2026-10-20). The page will usually show "Up to date"; Update matters when auto-update is off or failed.
- Each engine is checked separately; one failing check must not affect the others or stop the engine being used.
- Today's real values on the user's Mac, useful as realistic examples: Claude 2.1.302 installed / 2.1.304 available; Codex 0.163.0 up to date; Grok 1.0.62 up to date (auto-update on); Antigravity 1.4.3 up to date.
- Remote/Docker nodes: the page shows that node's engines; Update only on the desktop's own node (pending Q-3).

## Decisions still open with the user (show them; do not settle them silently)

- **Q-1** AutoByteus does not download or install engines itself — recommended, not yet confirmed.
- **Q-2** Sign-in: status only now, Sign-in buttons later — recommended, not yet confirmed. (Vendor terms limit in-app sign-in: Claude subscription sign-in needs Anthropic's approval; Codex allows it only for open-source local apps.)
- **Q-3** Update only on the desktop's own node; remote/Docker nodes status only — recommended, not yet confirmed.

## Constraints and non-goals

- No AutoByteus-managed copies of engines, no AutoByteus version catalogue, no automatic updates by AutoByteus, no notifications outside this page.
- Never show "Signed in" or "Up to date" without evidence; a failed check says so.
- Terminology from the earlier approved work: section name "AI Runtimes"; "Signed in" for account state.

## Existing product context

- AutoByteus desktop app, Settings page `autobyteus-web/pages/settings.vue`; components under `autobyteus-web/components/settings/`. Similar existing patterns: `AgentPackagesManager.vue` (checks on open, offers Update), `ProviderAPIKeyManager.vue`, `NodeManager.vue` (nodes). Chat model menu "Unavailable" + reason: `autobyteus-web/components/chat/` (commit 87b246c7de).
- Source at `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review` (branch `codex/runtime-lifecycle-design-review`, `origin/personal` 9227d61597).
- Background: the predecessor team's design was reviewed and set aside as too large (`design-review.md`); only its user journey and terminology carry over.

## What comes back

A UI design the user has reviewed and confirmed, with its references, so the Solution Designer can write acceptance criteria against it and bring the requirements to the user for approval.
