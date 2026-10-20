# Handoff — dependency-security-and-unused-cleanup, SR-005: `dompurify` held at 3.4.7 (after IMP-DI-002)

- Status: **Architecture Design Complete** (revised); `Medium` / `High` (unchanged)
- Package: `dependency-security-and-unused-cleanup`; Project Task `autobyteus-229`; requested by `/project_task_manager`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup`, branch `codex/dependency-security-and-unused-cleanup`.
  - Implementation commits: `9936445f55`, `79ece48bf4`, docs `6a33c4600d`.
  - The SR-005 edits to `requirements-doc.md` (DEC-008), `design-spec.md` (file mapping, Findings Table), `follow-ups.md` (FU-009), `solution-revision-record.md` and this file are uncommitted in the ticket folder.

## Decision (DEC-008, option (c) of IMP-DI-002)

- **The cause.** `dompurify` 3.4.8+ breaks 4 web markdown tests under happy-dom, whose `Node.prototype` `nodeName` getter returns `""`. The app's Chromium/Electron is fine.
- **The decision.** Pin `dompurify` exactly to `3.4.7` in `autobyteus-web` (same major; a direct specifier, not an override). Reinstall, dedupe, then recheck steps 4-6: `dedupe --check`, import providers, audit vs the explained set.
- **Why.** The open advisories at 3.4.7 (verified with `gh api`) are 2 medium and 5 low, none high/critical. All need features our only call doesn't use. 3.4.7 still fixes base 3.3.1's moderate advisories. The design already allows holding at the newest working version.
- **Follow-ups.** FU-009 lifts the pin (happy-dom report or jsdom for those specs, then `^3.4.17`+). FU-008 (auto-refresh flake) is acknowledged.

## Route record

- 2026-10-20: `get_handoff_rules` → "completed or revised architecture package … architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
