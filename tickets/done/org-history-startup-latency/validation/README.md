# Implementation evidence — IR-001 / IR-002
Not independent API acceptance. Current implementation-handoff/revision record are authoritative. Historical IR-001 evidence is preserved; SR-004 reopened the cold-start outcome and IR-002 is the current candidate.

## IR-002 reopened recovery

- `reopen-r1/`: Designer-owned warm-browser observation and exact fresh-process cold readiness diagnostic. These establish the residual owner; they are not IR-002 acceptance.
- `ir002-install.log`: frozen offline workspace install completed. Two sample-application bin warnings reflect the intentionally unbuilt application-devkit CLI and did not block scoped checks.
- `ir002-prisma-generate.log` / `ir002-prepare-shared.log`: normal test/build prerequisites.
- `ir002-baseline-regression.log`: new catalog regression against original production source, expected **2 failed / 2 passed**. Candidate source was restored afterward.
- `ir002-server-focused.log`: current candidate **3 files / 12 tests passed**: AgentOrg catalog readiness reuse/failure/sequence, real lazy strict Team+Org readiness, and first mixed history.
- `ir002-mixed-readiness.log`: isolated current mixed-history check **1 file / 1 test passed** after normal prerequisites.
- `ir002-server-build.log`: server TypeScript production build and sanitized built-in agent bootstrap smoke passed.
- `ir002-web-preservation.log`: unchanged frontend history/publication/recovery scope **10 files / 136 tests passed**.
- `ir002-source-manifest.json`: exact IR-002 four-file hashes, production size, and line deltas.
- `ir002-preservation.json`: historical IR-001 four-file hashes all remain exact.
- `ir002-guards.log`: application diff inventory, `git diff --check`, IR-001 preservation, and production size guard passed.
- No implementation-stage cold browser/process acceptance, user profile/server operation, commit/push/merge/release, or provider start. Direct API/E2E must validate cold first-read generation count and response-to-DOM timing.

## IR-001 historical frontend implementation

- publication-order-probe.cjs/.log: Designer-owned old scheduler diagnostic, untouched.
- ir001-install.log / ir001-prepare.log: frozen dependencies and normal Nuxt preparation.
- ir001-baseline-regression.log: new ready-family tests against original loader2fail/7skip; source restored.
- ir001-scoped-tests.log:136tests/10files pass,9new real-owner/render tests plus adjacent history/recovery.
- ir001-current-tests.log: broad190pass/18fail/16unhandled errors, NOT green. ir001-adjacent-baseline.log reproduces same18fail/16errors on original loader; ir001-baseline-comparison.json lists exact failure set match. No broad clean-suite claim.
- ir001-initial-broad.log: prior19fail incl directly affected missing structural mock method, then corrected. ir001-focused.log initial fixture unknown-workspace assumption failed2tests; ir001-focused-current.log52pass intermediate. Final new test suite has9cases and unresolved scoped-expansion query to avoid accidental publication.
- ir001-build-prerequisites.log / ir001-build.log: shared package build prerequisite and Nuxt16route production build pass; temporary page excluded, known generated SDK dist removed.
- ir001-guards.log: web/localization guards and diff check pass.
- ir001-typecheck.log:vue-tsc absent, strict typecheck NOT completed.
- ir001-source-manifest.json: exact final4code/test files at base6f15f446d6.
- render/: actual sidebar synthetic IO feedback loop only, not real server timing/Electron/provider validation.

Other-owner docs/diagnostic preserved; no user profile/history reset or server restart, Git finalization, provider action. API should validate actual startup response→DOM timing and preservation using owned data.

## API-REV-002 independent cold-process/browser acceptance

Authoritative outcome: Pass /97.4% validation confidence. See `../api-e2e-execution-coverage-report.md` and `../api-e2e-test-case-ledger.md`.

- `api-reopen-r2/intake-manifest-check.json` / `final-integrity.json`: four current IR-002 entries exact; final diff check Pass.
- `api-reopen-r2/server-focused-after-setup.log`: independent3-file/12-test server owner run Pass after normal shared prerequisite. `server-focused.log` records the setup-only missing-generated-SDK attempt, not a product failure.
- `api-reopen-r2/web-preservation.log`: unchanged frontend10-file/136-test scope Pass.
- `api-reopen-r2/seed-before-cold.json`, `seed-provider-metadata.jsonl`, `seed-transport.jsonl`: isolated histories created through ordinary Chrome Run/Send/Stop; three exact real provider replies, no fabricated runtime package.
- `api-reopen-r2/cold-observer.mjs` / `launch-cold.py`: temporary non-mutating compiled-process observer and isolated launcher. They delegate original readiness methods and only record lifecycle evidence.
- `api-reopen-r2/cold-generation-summary.json`: definitive fresh process one startup rebuild, two already-initialized first-read awaitReady calls, zero post-startup rebuilds; workspace response/release4/5ms and collaboration roots22/22ms; normal Chrome rows/reply observed within6,188ms upper bound.
- `api-reopen-r2/cold-run{1,2,3}-*`: three fresh-process observations. Run3 is authoritative; earlier runs are supporting evidence.
- `api-reopen-r2/preservation-after-cold.json`:22/22 authored/history/tree/context/trace/message/task files byte-identical.
- `api-reopen-r2/cold-run3-provider-metadata.jsonl`: empty; listing/inspection started no provider.
- `api-reopen-r2/cleanup.json`: owned tab/services closed, ports51181–51183 closed, generated SDK outputs removed, isolated evidence retained.

No user profile/server/data, external package, migration/reset, Git finalization or Electron action was performed. Timing is an accessibility-observation upper bound for the representative isolated dataset, not paint instrumentation or a universal SLA.

## DR-004 recovery delivery intake

- `delivery-dr004-integrity.json`: fresh target equivalence and independent 4/4 IR-002 manifest hash verification before Delivery-owned documentation edits. No executable rerun is claimed because target and candidate source were unchanged after API-REV-002.
- Canonical docs sync adds only the shared readiness-generation contract to `autobyteus-server-ts/docs/modules/run_history.md`; current delivery artifacts remain in the ticket root pending explicit reopened-result user verification.

## DR-005 task-worktree Electron verification build

- `electron-dr005/README.md`: canonical user-testing build receipt, artifact paths, checksums and exact scope.
- `electron-dr005/build.log`: README-defined full macOS pipeline output.
- `electron-dr005/dmg-verify.log`, `zip-verify.log`, `terminal-verify.log`, `app-metadata.log`: archive, native terminal and architecture/version verification.
- `electron-dr005/packaged-content.json` / `asar-summary.json`: 239/239 generated Electron/renderer files match app.asar.
- `electron-dr005/packaged-ir002-check.txt`: staged and packaged compiled AgentOrg catalog service are identical and contain the IR-002 awaitReady call without forced rebuild.
- Build output is retained locally for user testing; this evidence is not user acceptance or repository finalization.
