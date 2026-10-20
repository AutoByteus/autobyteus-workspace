# Handoff — dependency-security-and-unused-cleanup, SR-001: Architecture Design Complete

- Status: **Architecture Design Complete**; `task_size=Medium`, `architectural_risk=High`
- Package: `dependency-security-and-unused-cleanup`; Project Task `autobyteus-229` (FU-004 of `autobyteus-224`, plus Part 2 added by the user)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/`
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup`, branch `codex/dependency-security-and-unused-cleanup`, base `origin/personal` @ `3b2c86ca9e` (fetched 2026-10-20). Finalization target `origin/personal`. The worktree is installed (`pnpm install --frozen-lockfile`). No code or manifest is changed: the trial was reverted, and the ticket docs are uncommitted.

## Original request (summary)

- **Part 1:**
  - Verify and fix the advisories of `tar` (web), `undici` (`autobyteus-ts`) and mercurius' `undici`.
  - Run `pnpm dedupe`.
  - Run `pnpm audit`; fix other high/critical findings that are small and safe, and list the rest without silent widening.
- **Part 2 (the user):** remove dependencies nobody uses, across all packages; report doubtful ones.
- **Done when:**
  - every high/critical advisory is fixed or explained;
  - removals have evidence;
  - no pending dedupe;
  - builds, suites, the packaged smoke check and Docker pass;
  - finalized on `personal`.
  - A beta is the user's decision; recommend one in the report.

## Approval basis

`requirements-doc.md` SR-001, approved by the Solution Designer within the Task's direction (user informed). The decisions DEC-001…006 are summarized in `solution-revision-record.md`.

## What the design does

`design-spec.md` gives the Change Sequence, the Findings Table and the Dependency Rules:
- **Specifier bumps:** web `tar` `^7.5.22`, `autobyteus-ts` `undici` ≥ `^7.29.1`, `electron` exact `42.11.16` (or the newest 42.x).
- **Removals:** 12 unused web dependencies, `dotenv` and `ts-node` in `autobyteus-ts`, and `@types/node` in 4 small packages.
- **Updates:** every in-range vulnerable package, **one name per `pnpm update -r --depth Infinity`**, looping (`probes/update-inrange-loop.sh`); then `pnpm dedupe`.
- **Not used:** no overrides, no source change.
- **Expected result** (measured by a full trial, `evidence/SD-05`): runtime advisories go from 3 critical / 91 high to 0 critical / 13 high. The 13 left are the explained set: Fastify 4 family, mercurius' `@fastify/static`, plus its `undici` and `busboy`, which are never loaded (`SD-04`), and `xlsx`.

## Evidence

- `investigation-notes.md`: each finding marked Read, Reproduced or Measured.
- `evidence/SD-00`…`SD-06`.
- `probes/`, all rerunnable.

## Risks and follow-ups

- **Risks:** semver slips in the updated runtime libraries; Electron 42.4 → 42.11; new advisories before delivery; a removal used through a path no scan saw. All are covered by the validation matrix in Change Sequence step 7.
- **Follow-ups (not sent yet):**
  - FU-001 Fastify 5 migration (**urgent**);
  - FU-002 `xlsx` (**urgent**);
  - FU-003 web toolchain majors;
  - FU-004 icon generator;
  - FU-005 undeclared server test deps;
  - FU-006 Monaco from CDN / `monaco-editor` (doubtful, reported to the user);
  - FU-007 message gateway outside the workspace.

## Route record

- 2026-10-20: `get_handoff_rules` returned 3 rules. The matching rule is "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
