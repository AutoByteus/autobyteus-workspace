# API/E2E Coverage Investigation

Ticket `clean-checkout-build-fix` (autobyteus-282). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/clean-checkout-build-fix`, branch `codex/clean-checkout-build-fix`, head received `828c88b2a2` (code `204025a459`; `828c88b2a2` adds only ticket documents). Base `origin/personal` @ `1c9edce551`. Paths below are relative to `tickets/in-progress/clean-checkout-build-fix/` unless absolute.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-001; REQ-001..REQ-004, AC-001..AC-003)
- Investigation Notes: `investigation-notes.md` (C-01..C-07)
- Solution Revision Record: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec: `design-spec.md` (SR-002)
- Supplemental Task Artifacts: `follow-ups.md` (FU-001)
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001, with the direct-route self-review); Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation IR-001 (urgent), direct route Medium / Low, from `/software_engineering_team/implementation_engineer`

## Current Requirement And Design Basis

- A clean checkout of the branch builds the server, and its tests load. The cause: 280's frozen memory modules were never committed, because the bare `memory` ignore rule hid them (C-01..C-03).
- **REQ-001:** the frozen modules are restored and tracked.
- **REQ-002:** the ignore rule is anchored to the runtime data folder `/memory/`.
- **REQ-003:** a tracked-import check fails when tracked code imports an untracked file. It runs in the server test run and in the pre-tag hygiene check.
- **REQ-004:** the migrations behave as before.
- **AC-001** asks for a fresh clone of the finalized commit, not a worktree that carries ignored files: `tsc`, `test:integration:prepare`, the unit and e2e suites load, and the migration suites and 280 architecture tests pass.

## Supported Scenarios And Real Usage

- Designer scenarios: a developer or CI clones the branch and builds and tests it; the release workflow runs the hygiene check.
- Real-use scenarios added from investigating the implemented behavior:
  - **Files read by path, not imported** (fixtures, JSON, Markdown) escape `tsc`, `vitest list` and the import check. A clean clone must therefore also *run* the server suites, not only load them, to show nothing the tests read at runtime is missing.
    - A read-only scan of this worktree: after the rule change, nothing under `autobyteus-server-ts/src|tests|scripts`, `autobyteus-ts/src|tests` or `autobyteus-web` source is untracked or ignored, apart from the test scratch folder `autobyteus-server-ts/tests/.tmp/`.
    - So the old rule hid nothing else here.
  - **The push.** A clone of the pushed branch has the same tree as a clone of the same commit through git's transport (`file://`, `--no-local`): git transfers objects, not working files. Pushing is delivery's, at finalization. What a clone after the push adds is that the remote branch holds this commit, which delivery confirms when it pushes. The investigation therefore verifies the clone by commit id and by an empty `git status --ignored`.
- Contrived scenarios: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| REQ-001 frozen memory modules tracked | Added (files) | IMP-01 | Fresh-clone build and the full server suites |
| REQ-002 anchored ignore rule | Changed | IMP-02 | `git check-ignore` in the clone |
| REQ-003 tracked-import check | Added | IMP-03, IMP-03b, IMP-04 | The check (default and `--only`) in the clone; a negative probe of my own |
| REQ-004 migrations unchanged | Preserved | no migration code changed | Migration suites, architecture tests and migration startup e2e in the clone |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No (restored pruned copies, byte-identical tracked files) | — | IMP-01 | — | — |
| Build / repository content | Yes | tracked files, ignore rule, hygiene check | IMP-05 local clone (migration suites, architecture, load) | Runtime-read files in the full suites | Fresh clone, full unit and integration suites |
| API / transport, frontend, browser, desktop shell, lifecycle, persisted data, workers, external | No | — | — | — | — |

## Project Execution Discovery

- Worktree: as above. Stack: pnpm monorepo; server (TypeScript, vitest), library, web.
- Testing guideline: `TESTING.md`. Rules applied:
  - one heavy run at a time on the machine;
  - clean env for e2e;
  - one run per case per round;
  - the new line for the tracked-import check.
- `RELEASE.md`: the pre-tag hygiene check, `python3 scripts/check_repository_artifact_hygiene.py`, as `release-desktop.yml` runs it.
- Secrets: `N/A`.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | testing strategy | install, `prebuild`, `typecheck`, `test:integration:prepare`, `test:unit`, `test:integration`; clean env; one heavy run at a time |
| `RELEASE.md`, `.github/workflows/release-desktop.yml` | pre-tag hygiene | `python3 scripts/check_repository_artifact_hygiene.py` |
| `scripts/check_repository_artifact_hygiene.py` | the check | `--only tracked-imports` |

| Component / Dependency | Working Directory | Start / Setup Command | Notes | Readiness | Stop / Cleanup |
| --- | --- | --- | --- | --- | --- |
| Fresh clone | `/tmp/ab282e2e/clone` | `git clone --no-local --branch codex/clean-checkout-build-fix file://<common git dir> /tmp/ab282e2e/clone` | commit id and an empty `git status --ignored` checked before install | — | removed after the run |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/architecture/tracked-imports.test.ts` | the repository passes the check; a bare `memory` rule hiding an imported file makes it fail, and anchoring fixes it | REQ-003, AC-003 | Still Valid | IMP-04 | Rerun in the clone |
| `tests/architecture/app-data-migration-boundaries.test.ts` and the other architecture tests | 280's seal | REQ-004 | Still Valid (FU-001 of 280 pre-existing) | IMP-05 | Rerun in the clone |
| migration suites, startup e2e | 280 | REQ-004 | Still Valid | IMP-05 | Rerun in the clone (startup e2e) and through `test:unit` / `test:integration` |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | REQ-001, REQ-004 | restore and prune; tracked frozen files byte-identical | Reused | IMP-01 | Same code commit; its evidence shows the identity |
| API-02 | AC-001 (clone identity) | fresh clone | Existing Test (setup) | the clone; `git rev-parse HEAD`; `git status --porcelain --ignored` empty | AC-001 precondition |
| API-03 | AC-002 | ignore rule | Existing Test | in the clone: `git check-ignore -v` on frozen memory files, `tests/e2e/memory`, and a created root `memory/` | |
| API-04 | AC-003 (pass side), REQ-003 | hygiene check | Existing Test | in the clone: `python3 scripts/check_repository_artifact_hygiene.py` (default, as release runs it) and `--only tracked-imports` | |
| API-05 | AC-003 (fail side) | the check against a real ignored import | Temporary Probe | in a throwaway copy of the clone: add `memory` back to the ignore rule, so the restored files are hidden, and import a new untracked file. The check must fail naming them | Proves the check in the real repository, beside the test's synthetic repository |
| API-06 | AC-001 | build in the clone | Existing Test | `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `typecheck`, `build`, `test:integration:prepare` | |
| API-07 | AC-001, REQ-004 | server unit in the clone (all tests run) | Existing Test | `pnpm -C autobyteus-server-ts test:unit` | Runtime-read files |
| API-08 | AC-001, REQ-004 | server integration in the clone | Existing Test | `pnpm -C autobyteus-server-ts test:integration` | same |
| API-09 | AC-001, REQ-003/004 | architecture tests and migration startup e2e in the clone; e2e load | Existing Test | `env -i … vitest run tests/architecture tests/e2e/app-data-migrations`; `vitest list tests/e2e` | |

- Test progress log needed: `Yes`.

## Durable Coverage To Add / Update / Remove

None. The ticket's own durable test (`tracked-imports.test.ts`) is validated, not changed.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| A clone from the remote after the push | Pushing is delivery's (finalization). The clone here uses git's transport on the same commit id | That the remote holds this commit | No | Delivery: after the push, `git ls-remote` shows the branch at this commit, or a quick clone plus `typecheck` |
| Web suites | No web change; the check reads web sources only | — | No | — |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`; durable coverage changes: `No`; reroute: `No`.
