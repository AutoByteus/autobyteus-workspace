# IR-001 local implementation checks — 2026-09-27

These are implementation unit/build checks, not API/E2E or performance acceptance.
All data writes were to disposable test roots, repository test DB/build outputs and
this isolated worktree. Installed app/profile, releases and live ledgers untouched.

## Setup / source check
- `pnpm install --offline --ignore-scripts --frozen-lockfile`: exit 0. Offline install
  warned that application-devkit's not-yet-built CLI bin was absent in two application
  packages; unrelated to this server check.
- `pnpm -C autobyteus-server-ts prepare:shared`: exit 0 (3 shared packages).
- `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma`: exit 0.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`: exit 0.
  Build preparation output in build-setup.log; final typecheck.log is empty on success.
- `git diff --check`: exit 0.
- No changed source file exceeds 500 effective nonempty lines (largest 260);
  no source file has >220 added+deleted lines. Tests are outside this source guardrail.

## Final focused suite — exit 0
147 tests / 16 files, focused-tests.log. Command from repository root:
```sh
pnpm -C autobyteus-server-ts exec vitest run \
 tests/unit/app-data-migrations/team-context-file-execution-locators-v1.test.ts \
 tests/unit/app-data-migrations/agent-org-context-file-locator-transition.test.ts \
 tests/unit/app-data-migrations/app-data-migration-runner.test.ts \
 tests/unit/run-history/services/root-run-package-readiness-index.test.ts \
 tests/unit/agent-org-execution/agent-org-execution-tree-location-service.test.ts \
 tests/unit/context-files \
 tests/unit/agent-execution/input/agent-run-provider-input-normalizer.test.ts \
 tests/unit/server-runtime-app-data-migration-gate.test.ts \
 tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts \
 tests/unit/run-history/atomic-run-package-file-commit-writer.test.ts --no-watch
```

Coverage includes single transform/source, one changed-only atomic write, zero
createHash calls and no new backup directory; source IO and both noncommitted writer
outcomes remain FAILED while independent files progress. Missing/ambiguous/unsafe
references preserve the whole source with warnings. Nested/archive/sidecar fields,
non-target values and unchanged lines preserved. Stale/malformed/missing released
manifest variants never read/restored, originals retained, later current writes
preserved. Normal runner skips both terminal success forms, eligible retry remains.
Readiness/new-run publication and indirect async/sync owner reads make zero calls to
typed-source enumeration/transform and no trace reads; structural checks and rebuild
coordination retained. Actual async read service/sync resolver check Team, nested
Team, Org, standalone, missing/nonregular files, cross-owner/outside symlinks and
configured-root containment. Existing entrypoint unit guards and new-work/all-old-
unusable fixture pass; these mocks/fixtures are not actual desktop validation.

## Broader check and pre-existing failure evidence
local-tests.log: 146 pass / 5 fail, 16 files, exit 1. Additional file
`tests/unit/agent-memory/agent-memory-location-service.test.ts` has 5 failures and
2 passes. Its fixtures publish trees without required correlated current sidecars;
current structural admission returns no locations. This is not caused by removing
the reference scan. Exact same five failures reproduce from untouched base
8bffda04575eaa7198fae186856699011ad5c04b in a disposable `git archive` copy; see
baseline-memory-location-tests.log (5 fail / 2 pass, exit 1). Source/tests in the copy
were baseline; shared unchanged dependencies/builds were linked to the prepared
worktree. No test expectation/source fix for this unrelated baseline issue.
An initial archive harness lacked its root node_modules link; corrected before the
recorded baseline reproduction. The final focused suite deliberately excludes this
known baseline fixture file; no claim the full server unit suite is green.

## Boundaries / still required
No representative corpus first/retry/repeat timings, actual desktop readiness,
HTTP endpoint execution, installed release or user verification performed. Tiny
unit timings are not a speedup benchmark. Upstream read-only profile remains
historical evidence, not an after-change measurement.
