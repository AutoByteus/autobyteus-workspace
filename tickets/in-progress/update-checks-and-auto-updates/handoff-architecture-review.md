# Handoff — Architecture Design Complete

- Package: `update-checks-and-auto-updates`, Project Task autobyteus-210 (requested by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Classification: `Architecture Design Complete`; `task_size=Large`, `architectural_risk=High`
- SR entry: SR-004; date 2026-10-23

## Request And Goal

The user wants users to learn about updates in time and to be able to opt in to automatic updates:
- a configurable check interval per notification category;
- the desktop app re-checking while it runs, with a switch;
- agent runtimes as a fourth category;
- "Update automatically" switches for agent packages, skill sources and agent runtimes (never for the app), in the Update checks card and in the Notification Center.

GitHub's 60-per-hour limit must hold for several nodes on one IP.

## Approval Basis

- Requirements: `requirements-doc.md` at SR-004.
  - The user's own answers: DEC-003 (no undo), no automatic app update, the runtime category, the replacement of local changes after a one-time confirmation (DEC-019), and the UI approval.
  - The rest by the Solution Designer within the direction, user informed.
- UI (behavior-defining): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/update-checks-and-auto-updates/ui-ux-spec.md` + `visual-references/VIS-001..037` (design repository `personal` `5f5fb4c`), user-approved 2026-10-23.

## Key Decisions To Review

1. **Checks and updates use a quota-free head read.** Git protocol v2 `ls-refs` (Measured, AF-08) replaces the 2-request REST metadata call. Import keeps the REST call.
2. **The Codex newest version comes from the github.com redirect** (Measured, AF-09), through the GitHub transport and its gate.
3. **The gate has two families,** `api` and `web`, persisted per family.
4. **`UpdatePass` owns the pass sequence** (Principle 13): due checks per kind with per-category intervals and per-process jitter, then automatic updates through each owner's own update method, then outcomes recorded on the notification records. The scheduler is only a 60 s timer.
5. **Runtime service additions:**
   - `checkInBackground` (keeps finished results);
   - `runUpdate`, the one update path for the page and the pass;
   - a projection with an explicit `checked` flag;
   - a listener.
6. **Manual vs automatic gates** are compared in one table (Principle 1).
7. **Derived consumers** of the record and contract changes are listed (Principle 11).
8. **The shell schedule** (`AppUpdateCheckSchedule`) with its own settings file. `appUpdater.ts` (499 lines) sheds its IPC registration.
9. **Persisted data:** additive. No migration; the old gate file reads as not blocked.

## Canonical Artifacts

- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/tickets/in-progress/update-checks-and-auto-updates/`
- `requirements-doc.md`, `investigation-notes.md` (AF-01..AF-16, probes), `design-spec.md`, `solution-revision-record.md`, `handoff-product-design-request.md` (history).
- Product (read-only): the UI spec and references above; `.../product-ticket.md`; `/Users/normy/autobyteus_org/autobyteus-web-design/ui-reference-runbook.md` (section update-checks-and-auto-updates).
- Prior review artifacts: `N/A — not applicable` (first review).

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates`, branch `codex/update-checks-and-auto-updates`.
- Base `origin/personal` `d2820672c3`; finalization target `origin/personal`.
- Documents only so far.

## Scope And Risks

- In scope: UC-001..UC-006 and the design's Change Scope.
- Out of scope: automatic app update, undo/pin/skip, per-source exceptions, runtime notifications in windows of other nodes, PQ-1.
- Risks:
  - GitHub's undocumented throttling of anonymous git traffic (the `web` gate backs off);
  - automatic replacement of agent content is a supply-chain path by design (opt-in, confirmed, visible);
  - `net.isOnline()` accuracy.

## Expected Output

An independent architecture review against SR-004 and the UI spec.

## Route Record

- `get_handoff_rules` (2026-10-23): Large or High → `/software_engineering_team/architecture_reviewer`.
