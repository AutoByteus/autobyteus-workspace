# Handoff — Architecture Design Complete

- Package identifier: `settings-update-notifications`
- Project Task: autobyteus-209, delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); design step autobyteus-212 (Product Team)
- Result classification: `Architecture Design Complete`
- `task_size`: `Large`; `architectural_risk`: `High` (rationale in `design-spec.md`, Task Size And Architectural Risk)
- Current SR entry: `SR-004` (round 2: resolves ARCH-REV-001 AR-001..AR-003, R-1, R-2)
- Date: 2026-10-20

## Original Request And Goal

The user asked for this on 2026-10-20. Many users import public agent packages and skills from GitHub that improve fast, but nothing tells them a newer version exists.

The goal is a quiet notification area that tells the user when the app, an imported GitHub agent package or an imported GitHub skill source has an update:
- found by a background check the user can turn off;
- with what changed;
- with the existing explicit Update.

It never updates by itself. The opt-in automatic update is a separate, later Task.

## Approval Basis

- Requirements: `requirements-doc.md` at SR-003.
  - SR-001: the Solution Designer within the direction, user informed.
  - SR-002: the user's review decisions (no skip; persistent indicator; panel).
  - SR-003: the user's approval of the UI/UX package, plus DEC-014..016 by the Solution Designer within the direction, user informed.
- UI/UX (behavior-defining, externally owned):
  - spec: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/ui-ux-spec.md`;
  - final references: `.../visual-references/` (VIS-001..028);
  - design repository `personal` at `288ef06`;
  - the user's approval "i like the UI approved", 2026-10-20 (round 14, `e6ef28c`).

## What To Review

`design-spec.md` covers:
- the server: the update-notification capability area, background scheduler, rate-limit gate, source-owner projections, listeners and per-package serialization (including the split of the over-limit `agent-package-service.ts`), GraphQL, `/ws/update-notifications`;
- the Electron shell: the app notification record, re-check before download, release link, e2e test feed;
- the web: Notification Center, sidebar entries, Update checks card, removal of the self-opening card.

Key decisions to check:
- Notification records are derived from the source owners' state through the reconcile table DS-007; they are not a free-standing inbox.
- The source owners announce changes to one injected listener; they do not know the notification area.
- A process-wide `GitHubRateLimitGate` in the transport also refuses manual requests until GitHub's reset time.
- Checks run at most every 6 hours per source with the existing 2-request check, sequentially, stopping at a closed gate.
- `AgentPackageService` gains per-package serialization because the background checker introduces a real check/update race (AF-05).
- The app record lives in the shell; the record's file and the release link get their own files so `appUpdater.ts` stays under 500 lines.

## Canonical Artifacts (absolute paths)

- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications/tickets/in-progress/settings-update-notifications/`
- `requirements-doc.md`, `investigation-notes.md` (architecture evidence AF-01..AF-14), `solution-revision-record.md`, `design-spec.md`, `follow-ups.md` (FU-001, FU-002; not yet sent), `handoff-product-design-request.md` (SR-001 history).
- Product artifacts (read-only, external): the UI/UX spec and `visual-references/` above; `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/product-ticket.md`; `/Users/normy/autobyteus_org/autobyteus-web-design/ui-reference-runbook.md`.
- Prior review artifacts: `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-001, reviewed basis SR-003).

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications`, branch `codex/settings-update-notifications`.
- Base: `origin/personal` at `3d4d9d0a951d8ce164b7d1fc3528eb6ee90fd247`. Finalization target: `origin/personal` (RELEASE.md).
- No source changes yet; ticket documents only.

## Scope

- In scope: UC-001..UC-007 (requirements Scope Guardrail); design Change Scope.
- Out of scope: automatic update; local, built-in and application-package sources; a switch for the app's own startup check (FU-002); the mobile client; OS notifications.

## Open Risks And Assumptions

- Electron's generic-provider check in a packaged isolated build is still unproven (design Risks, escalation trigger).
- macOS install from a test feed may need the Electron harness, as in `desktop-beta-update-channel`.
- ASM-001: verification uses real public GitHub repositories read-only.
- ASM-002: the 6-hour cadence.
- The live row order while the panel is open is reviewed Product behavior.

## Expected Output

An independent architecture review of the package against the approved requirements and UI spec. On Pass, it goes to implementation as the team's rules route it; findings come back to the Solution Designer.

## Round 2 (SR-004): What Changed For The Recheck

- AR-001 (option a): `GitHubRateLimitGate` persists its blocked-until time.
  - File: `<app-data>/github/rate-limit.json` `{ blockedUntil }`, tolerant read once on first use, atomic write when it learns a later time.
  - So no automatic request is made before the reset, even after a restart.
  - See the Ownership Map row, Persisted Data, File Mapping and the "Rate limit across a restart" example.
- AR-002: under the e2e test feed, `releasePageUrl = null` and the row omits the link.
  - The link is verified with the real GitHub feed configuration: Electron tests of `appReleasePage.ts` and `AppUpdater`, and the user's beta check.
  - AC-003 and the new DEC-017 say so. AF-10, the Off-Spine row and the Interface table agree.
- AR-003: inside `serialize(id, …)` every package check and update re-reads its record and writes only from that fresh record (Ownership Map; new example).
- R-1: the wiring uses `getInstance()` singletons shared by the resolver and the composition (Guidance For Implementation).
- R-2: the setting and the gate are checked before every source (DS-006).
- The investigation notes' supplement inventory now shows the UI/UX spec as Approved.

## Route Record

- `get_handoff_rules` (2026-10-20): Large or High → `/software_engineering_team/architecture_reviewer`.
- Applied route: `send_message_to` → `/software_engineering_team/architecture_reviewer` (round 1, SR-003).
- Round 2 (SR-004): `get_handoff_rules` again matches Large or High → `/software_engineering_team/architecture_reviewer`; sent with `send_message_to`.
