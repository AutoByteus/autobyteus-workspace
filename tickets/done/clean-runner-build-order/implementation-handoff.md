# Implementation Handoff — clean-runner-build-order

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent review not selected (Small / Low); `get_handoff_rules` returns the API/E2E engineer for the direct route.
- Requirements doc: /Users/normy/autobyteus_org/autobyteus-worktrees/clean-runner-build-order/tickets/in-progress/clean-runner-build-order/requirements-doc.md
- Investigation notes: /Users/normy/autobyteus_org/autobyteus-worktrees/clean-runner-build-order/tickets/in-progress/clean-runner-build-order/investigation-notes.md
- Solution revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/clean-runner-build-order/tickets/in-progress/clean-runner-build-order/solution-revision-record.md
- Design spec: /Users/normy/autobyteus_org/autobyteus-worktrees/clean-runner-build-order/tickets/in-progress/clean-runner-build-order/design-spec.md
- Supplemental task artifacts: solution-designer-handoff.md, evidence/INV-01..INV-03
- Design review report / architecture review revision record: N/A — not applicable
- Triggering rework: N/A

## Current Implementation Summary

- Implementation cycle: Initial
- Implementation revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/clean-runner-build-order/tickets/in-progress/clean-runner-build-order/implementation-revision-record.md
- Current implementation revision ID: IR-001
- Related IDs: SR-001; others N/A
- Commit: `aa93bdcdfb` on `codex/clean-runner-build-order` (two `package.json` files only)

The server owns one `prepare:source` (`prepare:shared` then `prisma generate`). Its `prebuild`, `pretypecheck` and `typecheck:update-baseline` call it instead of repeating the commands, and the web's `prepare:shared-types` (name kept) is now `pnpm -C ../autobyteus-server-ts prepare:source`. It builds `application-sdk-contracts`, as before, plus `autobyteus-ts`, `application-backend-sdk` and the Prisma client that the server source the web gate compiles needs. `pretest` still calls `prepare:shared`.

## Routing Classification (Mandatory)

- Task size: Small
- Architecture risk: Low
- Design classification section / evidence reference: design-spec.md, classification
- Classification confirmed or changed: Confirmed
- Evidence and rationale: five script lines in two files, no runtime code; the proof is the clean-clone result.
- Selected route: Direct API/E2E
- Lightweight implementation self-review completed for the direct route: Yes (diff read in full: no stale duplicate of the two commands remains in either file; no document of the Solution Designer touched; no dist/ committed)
- New design impact or escalation trigger: None

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-001 / AC-001 | A clean install passes the web type gate | `autobyteus-web/package.json` `prepare:shared-types` -> server `prepare:source` | Pass: IMP-01 (exit 0, production errors 0, baseline 99 in 43 unchanged) |
| REQ-002 / AC-002 | The server gate passes in the same clone | `autobyteus-server-ts/package.json` `pretypecheck` -> `prepare:source` | Pass: IMP-02 (baseline 1185 in 366 unchanged) |
| AC-003 | A fully built machine is unchanged | same | Pass: IMP-03 (web typecheck same result; server build passes) |
| AC-004 | Build-only release run on the pushed branch | not mine | Left to delivery |
| REQ-003 / AC-005 | Guide documents | written by the Solution Designer | Not touched |

- Changes stayed within the requirements doc's Scope Guardrail: Yes

## Key Files Or Areas

`autobyteus-server-ts/package.json`, `autobyteus-web/package.json`.

## Important Assumptions

`pnpm -C ../autobyteus-server-ts prepare:source` resolves from the web package on every runner (it does in the clean clone).

## Known Risks

- `prisma generate` and the doubled build time on the five release runners (ASM-001): shown only by the release run (AC-004).
- The clean-clone proof used the tracked stream-contracts `dist/` folders that every clone has.

## Task Design Health Assessment Implementation Check

- Reviewed change posture / root-cause classification / refactor decision: as designed (one prepare owner)
- Implementation matched the reviewed assessment: Yes
- If challenged, routed as Design Impact: N/A

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None
- Legacy old-behavior retained in scope: No
- Dead code in the touched files removed: Yes (the repeated command lines are gone)
- Dead code found elsewhere, added to follow-ups.md: None
- Shared structures remain tight: Yes
- Canonical shared design guidance reapplied: Yes
- Source-file size guardrails: Yes (no source file changed)
- Notes: none

## Persisted Data Transition Check

Not Applicable (no persisted data).

## Environment Or Dependency Notes

Clean clone in `/tmp/clean-crb` (pnpm 10.28.2, Node 22, macOS arm64). The ticket worktree has untracked `*/dist/` folders from the investigation; none was committed.

## Checks Run

Evidence in /Users/normy/autobyteus_org/autobyteus-worktrees/clean-runner-build-order/tickets/in-progress/clean-runner-build-order/evidence/.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | clean clone; `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-web typecheck` | aa93bdcdfb | macOS arm64, Node 22 | web gate prepare step | REQ-001, AC-001 | Pass | evidence/IMP-01-clean-clone-web-typecheck.log | `production errors: 0; test-file errors: 99 in 43 files (baseline 99 in 43 files)`, `PASS`, `exit 0`, no TS2307 |
| IMP-02 | same clone; `pnpm -C autobyteus-server-ts typecheck` | aa93bdcdfb | same | server gate prepare step | REQ-002, AC-002 | Pass | evidence/IMP-02-clean-clone-server-typecheck.log | `production errors: 0; test-file errors: 1185 in 366 files (baseline 1185 in 366 files)`, `PASS` |
| IMP-03 | built worktree; web typecheck; `pnpm -C autobyteus-server-ts build` | aa93bdcdfb | same | both | AC-003 | Pass | evidence/IMP-03-built-machine-web-typecheck-and-server-build.log | web `PASS`; `Sanitized built-module/bootstrap smoke passed without DATABASE_URL.` |

- Not run, and why: `pnpm release:test` / AC-004 (delivery runs the build-only release run on the pushed branch); `guard:web-boundary` (scripts-only change, as the design says); no unit tests are added for package scripts.

## Frontend Rendered-Result Check

Not Applicable (build scripts only).

## Downstream Coverage Hints / Suggested Scenarios

Reproduce AC-001 once more in a clean clone if you want an independent run: `git clone --branch codex/clean-runner-build-order <worktree>`, `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-web typecheck`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

AC-004 (the build-only release run) belongs to delivery. Nothing else here needs a test beyond the clean-clone gate runs.
