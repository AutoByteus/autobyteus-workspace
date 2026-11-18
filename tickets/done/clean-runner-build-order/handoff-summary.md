# Handoff Summary — clean-runner-build-order

## Ticket
- Package `clean-runner-build-order`; `task_size=Small`, `architectural_risk=Low`; direct route (reviews Not Applicable). API/E2E Pass (92%); AC-004 run by delivery. Archived at `tickets/done/clean-runner-build-order/`.

## What Changed
- Fix: the web type gate's `prepare:shared-types` now runs the server's one prepare step `prepare:source` (workspace packages plus `prisma generate`) instead of its own list; the server's `prebuild`, `pretypecheck` and `typecheck:update-baseline` use the same step. This removes the failure that stopped every desktop build of the first `v1.5.11-beta.11` attempt (about 392 `TS2307` errors on a runner with no built `autobyteus-ts`).
- Design guidance: `DESIGN.md` rule 12, checklist item and anti-pattern; pointers from `TESTING.md`, `RELEASE.md` (case study and "build-only run on the branch for a build-step change") and `docs/design-cases.md` Case 15.

## Integration
- Merged `origin/personal` @ `43f3ed791e` (35 commits, web presentation) with no conflicts; web and server typecheck, `codegen:check`, licensing and hygiene pass on the merged state.

## Verification
- From the evidence; no user check. Fail-first: a fresh clone of the base fails with 392 web and 70 server production errors; a fresh clone of the branch passes both (API/E2E). AC-004: build-only run `41421050683`, all five desktop jobs success after two reruns of the macOS Intel job for an Apple network failure and a GitHub macOS runner shortage (not the change; FU-4).

## Release
- `No release` for this ticket. It unblocks the pending beta `v1.5.11-beta.11`, which resumes with the Solution Designer's release ticket.

## For The Solution Designer
- Follow-ups, none sent: FU-1, FU-2 (the two tasks 367 and 368 are recorded in the ticket), FU-3, FU-4 (the macOS notarization retry misses the staple `-1005` failure).
