# Implementation Handoff: clean-checkout-build-fix (autobyteus-282)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result:
  - Direct route (Medium / Low): independent architecture review not selected.
  - `get_handoff_rules` → `/software_engineering_team/api_e2e_engineer` (Small/Medium and Low, self-review complete).
- Requirements doc: `tickets/in-progress/clean-checkout-build-fix/requirements-doc.md` (REQ-001..004, AC-001..003)
- Investigation notes: `tickets/in-progress/clean-checkout-build-fix/investigation-notes.md` (C-01..C-07)
- Solution revision record: `tickets/in-progress/clean-checkout-build-fix/solution-revision-record.md` (SR-001, SR-002)
- Design spec: `tickets/in-progress/clean-checkout-build-fix/design-spec.md` (SR-002: restore whole, then prune with the committed pruner)
- Supplemental task artifacts: `follow-ups.md` (FU-001, by the Solution Designer)
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/clean-checkout-build-fix/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001, SR-002
- Related review / API-E2E / delivery revision IDs: N/A
- Triggering finding IDs: N/A

The code commit is `204025a459` on `codex/clean-checkout-build-fix`, base `1c9edce551`.

- **REQ-001: the frozen memory modules are restored.**
  - The 15 modules under `src/app-data-migrations/frozen/autobyteus-ts/memory/{models,store,working-context*}` are tracked.
  - They were copied whole from `autobyteus-ts/src` at `9b013fcc09` (68 files, following relative imports), then pruned with the frozen-layer pruner.
  - The pruner kept exactly the 15 files 280 recorded, and deleted the other 53 copies, which no migration reaches.
  - Every tracked frozen file is byte-identical to the base. A second pruner run changes nothing.
- **The pruner is committed** as `autobyteus-server-ts/scripts/prune-frozen-layer.mjs`.
  - It is 280's tool plus the steps 280 did by hand: drop `implements`, delete frozen copies no migration reaches, tidy the whitespace.
  - The guideline's "Copy what you use" bullet names it.
- **REQ-001 also covers a dead type import.** `tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` type-imported `TeamMemberSelector` from `team-run-member-identity.ts`, deleted in `3927e878db`. The import was unused, so it is removed. The new check found it.
- **REQ-002:** `autobyteus-server-ts/.gitignore` ignores `/memory/` (the runtime data folder at the server root) instead of every folder named `memory`. The two `!/tests/e2e/memory/` re-includes are dropped as redundant.
- **REQ-003, the tracked-import check.** `scripts/check_repository_artifact_hygiene.py` gains a "Tracked code importing files that are not tracked" group, and `--only tracked-imports` runs it alone.
  - **Scope:** tracked `.ts`, `.mts` and `.vue` files under `autobyteus-server-ts/src`, `autobyteus-server-ts/tests`, `autobyteus-ts/src` and `autobyteus-web`, without build output.
  - **What it reads:** static `import`/`export … from` and side-effect imports at the start of a line, plus dynamic `import(`.
  - **Resolution:** as TypeScript and Vite resolve imports (`.js`→`.ts`/`.mts`/`.tsx`/`.vue`, extension-less and dotted names such as `./common.generated`, `index`), checked against `git ls-files`.
  - **Skipped, with reasons in the script:**
    - the two architecture tests that write synthetic source trees;
    - the three dead prompt-engineering test folders that vitest already excludes (FU-001);
    - imports into build output.
- **Where the check runs:**
  - `tests/architecture/tracked-imports.test.ts` runs it on the repository in every server test run;
  - the same test has a negative case in a temporary git repository: a bare `memory` rule hides an imported file, and the check fails naming that import; after anchoring the rule and adding the file, it passes;
  - release workflows run it through the default hygiene check.

  `TESTING.md` and `RELEASE.md` each get one line.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - No runtime code changes: the restored files are pruned copies of the code 280 tested, and every tracked file is byte-identical.
  - The rest is build hygiene, a test and docs.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: none open. The D-1 method (whole files) was raised and changed to SR-002 (restore whole, then prune). No migration code or test changed, and no library source changed after 280's freeze.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-001 / AC-001 | A clean checkout builds; its tests load and pass | `frozen/autobyteus-ts/memory/**` (15 added); `scripts/prune-frozen-layer.mjs` | IMP-01 (restore, prune, byte identity, line subsets), IMP-05 (fresh clone) |
| REQ-002 / AC-002 | Only `/memory/` is ignored | `autobyteus-server-ts/.gitignore` | IMP-02 |
| REQ-003 / AC-003 | The check fails on an untracked or ignored import and passes on the tree | `scripts/check_repository_artifact_hygiene.py`, `tests/architecture/tracked-imports.test.ts` | IMP-03 (fails on the base tree with the 22 real violations; passes after), IMP-04 (negative case) |
| REQ-004 | The migrations behave as before | no migration code or test changed | IMP-05: the migration suites, the 280 boundary test and the migration startup e2e in the fresh clone |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The dead import removal is REQ-001 ("every file that tracked code under `src` and `tests` imports exists in git").

## Key Files Or Areas

- `autobyteus-server-ts/.gitignore`
- `autobyteus-server-ts/src/app-data-migrations/frozen/autobyteus-ts/memory/**`
- `autobyteus-server-ts/scripts/prune-frozen-layer.mjs`
- `scripts/check_repository_artifact_hygiene.py`
- `autobyteus-server-ts/tests/architecture/tracked-imports.test.ts`
- `TESTING.md`, `RELEASE.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`

## Important Assumptions

- **The restored files reproduce 280's freeze in substance.** Each is a line subsequence of its `9b013fcc09` source, apart from two kinds of line:
  - one-line import lists the pruner shortened;
  - the dropped `implements` in `raw-trace-item.ts`.

  12 files keep the same exports 280 recorded. Three keep a superset, more members and never fewer: `memory-types.ts` (`MemoryItem`), `jsonl-log-file.ts` (`jsonlLogEndsCleanly`, `serializeJsonlRecords`) and `raw-trace-archive-manager.ts` (two types). The migration suites decide.
- **The archived 280 record does not match these three supersets.** `tickets/done/seal-migrations-per-folder/frozen-layer-record.md` lists what 280 kept, and it is not edited here.

## Known Risks

- **The new check enforces from now on** in release workflows and in every server test run. Its exclusions are explicit and commented in the script.
- **A cosmetic double space remains** in one restored import (`import type {  RawTraceArchiveSegmentEntry }`).
  - The pruner's tidy step is kept byte-faithful to 280, because three tracked files have the same artifact.
  - A rule fixing it would change those tracked files.

## Lightweight Implementation Self-Review (Direct Route)

- Scope: only the files above. No migration source or test changed; the one test edit removes a dead import.
- Placement:
  - the check lives in the existing hygiene script, its one owner (D-3);
  - the pruner sits in `autobyteus-server-ts/scripts/` next to the code it serves.
- No compatibility shims, and no dead code added.
- Sizes:
  - the hygiene script grows from 173 to about 290 lines;
  - the pruner is about 190 lines.
- Edge cases:
  - extension-less and dotted import names;
  - type-only imports, which count: `tsc` needs them;
  - imports into build output, which are skipped;
  - fixture literals in the two architecture tests, which are allow-listed with reasons.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: fix
- Implementation matched the reviewed assessment: `Yes`, with SR-002 for D-1
- Evidence / notes: the cause (C-01..C-03, C-07) is removed and guarded.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files removed: `Yes` (the dead type import)
- Dead code found elsewhere: FU-001 (the dead prompt-engineering tests, by the Solution Designer), excluded explicitly from the check
- Shared structures remain tight: `Yes`
- Changed source files within size guardrails: `Yes`

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`. Implementation follows it: `Yes`. Deviation: `None`.

## Environment Or Dependency Notes

- macOS (darwin arm64), Node 22.23.1, pnpm 10.28.2, Python 3.
- Test runs use `env -i PATH="$PATH" HOME=/tmp/ab280/home TMPDIR="$TMPDIR"` with synthesized fixtures only.
- **The fresh clone is a `git clone` of the committed branch from the local repository** (`/tmp/ab282-clone`), not a push, so it holds only committed files. Its log reports 0 untracked or ignored files before install.
- Disposable tooling: `/tmp/ab280/restore282.py` (the whole-file restore) and `/tmp/ab280/clone282.sh` (the clone run).

## Checks Run

All on `204025a459`. Evidence is in `tickets/in-progress/clean-checkout-build-fix/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Restore from `9b013fcc09` (68 whole files), `node scripts/prune-frozen-layer.mjs`, then a second run; byte identity via `git diff --diff-filter=MDR 1c9edce551 HEAD -- …/frozen`; per-file line subsequence and exports vs the 280 record | `204025a459` | macOS arm64, Node 22.23.1, Python 3 | `frozen/autobyteus-ts/memory/**`, the pruner | REQ-001, REQ-004 | Pass | `IMP-01-restore-and-prune.log` | `15 files changed, 1238 insertions(+)` (only additions); MDR list `(none)`; second run `0 implements dropped, 0 files pruned, 0 files deleted`; each file `exports match` or `superset of` the 280 record |
| IMP-02 | `git check-ignore -v` on frozen memory files, `tests/e2e/memory`, the root `memory/` | `204025a459` | macOS arm64 | `autobyteus-server-ts/.gitignore` | REQ-002; AC-002 | Pass | `IMP-02-ignore-rule.log` | frozen files `not ignored`; `memory/ -> autobyteus-server-ts/.gitignore:44:/memory/` |
| IMP-03 | `python3 scripts/check_repository_artifact_hygiene.py --only tracked-imports` on the base tracked set (before the restore was tracked) | base `1c9edce551` with the new script | macOS arm64, Python 3 | the tracked-import check | REQ-003; AC-003 (fail side) | Fails as expected | `IMP-03-tracked-imports-base.log` | `Tracked code importing files that are not tracked: 22`, `exit=1`, all 22 being imports of the missing frozen memory files |
| IMP-03b | The same check, and the default hygiene check, on the committed tree | `204025a459` | macOS arm64, Python 3 | the whole tracked tree | REQ-003; AC-003 (pass side) | Pass | `IMP-03b-tracked-imports-after.log` | `Tracked-import check passed.`, `Repository artifact hygiene check passed.`, both `exit=0` |
| IMP-04 | `tests/architecture/tracked-imports.test.ts` (repository run plus negative case) | `204025a459` | fresh clone, clean env | the check through the test | REQ-003; AC-003 | Pass | `IMP-04-tracked-imports-test.log` | `✓ tests/architecture/tracked-imports.test.ts (2 tests)` |
| IMP-05 | Fresh clone: `git clone --branch …` (local), `pnpm install --frozen-lockfile`, `prebuild`, `typecheck`, `test:integration:prepare`, `vitest run tests/app-data-migrations tests/unit/app-data-migrations tests/integration/app-data-migrations tests/architecture tests/e2e/app-data-migrations`, `vitest list tests/unit tests/e2e` | `204025a459` | `/tmp/ab282-clone`, 0 untracked or ignored files; clean env | the whole server build and the migration area | AC-001; REQ-004 | Pass | `IMP-05-fresh-clone.log` | every build step `=== rc=0`; `Test Files  1 failed \| 80 passed (81)`, the one failure being 280's FU-001; `vitest list` `rc=0` with 6564 test entries |

- Not run, and why:
  - the full server unit and integration suites, because no runtime code changed and IMP-05 loads every unit and e2e file;
  - the web suites (no web change);
  - a clone of the pushed commit, left to API/E2E or delivery, since I don't push.
- Known pre-existing failure: autobyteus-280's FU-001 (`application-framework-boundaries.test.ts` › "guards the exact SR-011 host definition…"). It fails on `1c9edce551` as well, on a file this branch doesn't touch.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: there is no rendered change. The check reads web source files only.

## Downstream Coverage Hints / Suggested Scenarios

- A clone after push, on CI-like infrastructure: `python3 scripts/check_repository_artifact_hygiene.py` (default, as `release-desktop.yml` runs it) passes.
- A desktop or server build from the clean clone starts and runs the app-data migrations on synthesized data.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Confirm AC-001 on the pushed commit, as the design asks ("a fresh `git clone` of the pushed branch"). I proved it on a local clone of the same commit, without pushing.
