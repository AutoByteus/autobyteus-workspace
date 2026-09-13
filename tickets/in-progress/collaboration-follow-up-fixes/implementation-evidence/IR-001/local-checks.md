# IR-001 implementation checks

Authoritative current receipts: `final-checks.json`, `completion-checks.json`, `verification-checks.json`; exact test selections: `server-paths.txt`, `web-paths.txt`. These are bounded implementation unit/integration checks, not API/E2E acceptance. Distinct final counts are recorded in the handoff after completion; earlier runs overlap, not additive coverage.

## Regression sensitivity
- `baseline-check.py` temporarily installed only the 23 changed production files from reviewed HEAD4d88ad1 into this owned worktree. Current durable test code remained; `finally` restored every exact prior byte, verified in `baseline-restoration.json`.
- `before-runtime.log`: two expected failures. Original fresh Org snapshot reports idle rather than all Offline; original fresh Team prepares its two workers before first input.
- `before-attachment.log`: one expected standalone failure at **actual mounted chip click**: URL remains `/draft/note.txt`, not `/final/note.txt`, despite finalization and temporary-ID promotion.
- `before-selection.log`: one expected failure at real router query: late mounted Team read/commit/shell emit erases `orgRunId`. Does not attribute the original SCN-003 publication-only incident.
- Baseline script exits0 because its child failures are recorded; child statuses remain1. Diagnostic success is NOT acceptance.

## Setup and nonzero dispositions
- Offline frozen pnpm install succeeded, lockfile unchanged; generated3SDK dist directories were initially absent and are implementation-owned setup outputs. `nuxi prepare`, SDK/core shared prerequisites and Prisma client generation were needed in this new worktree.
- Initial web run failed **before tests** for missing `.nuxt/tsconfig.json`; `initial-web-check.log` retained. Initial server run failed **before tests** for missing Prisma client; `server-first.log` retained. No product conclusion from either.
- Server test global setup resets only this new worktree's owned `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`; test fixtures use own `/tmp/collab-followup-readiness-*` and clean them. This is not an installation migration/reset/repair or old-ticket replay.
- `server-second.log`: new fixture initially named the wrong existing package filename and used the wrong snapshot property (`identity` instead of `execution`); corrected fixture only. `server-cohort.log`: added post-Stop negatives initially expected an accepted:false result, but existing operation gates throw rejection; changed assertion to preserve that contract. All current8 runtime cases passed before final cohort.
- `web-regression-first/second.log`: existing unit doubles needed the explicit guard/outcome method and propagated options. Recovery unit facade now calls the real history wrapper rather than asserting its former internal bypass. Existing behavior assertions remain. Current17-file cohort then passed151tests.
- `selection-composition-second.log`: same-target physical-completion test initially changed a client field that does not override QueryManager deduplication; now it supplies **test-only** per-query context to acquire two controlled completions. Publication harness tried a nonexistent public connect action; corrected to the existing inspection→attachment path. Seven actual composition cases subsequently passed.
- Unpinned `vue-tsc` was not installed (`web-typecheck-first.log`); a dlx attempt with floating TypeScript resolved an incompatible package (`ERR_PACKAGE_PATH_NOT_EXPORTED`, `web-typecheck-tooling.log`). Pinned temporary tooling (`vue-tsc3.1.8`, TypeScript5.9.3) runs but repository-wide typecheck is nonzero. Baseline/current comparison is retained separately; never represented as a typecheck Pass. Tooling downloaded to pnpm cache, not project manifests.
- Renderer used owned Nuxt port31181/PID43749 and owned Chromium contexts only. Early fixture depth/provider/route setup required correction; see `navigation-investigation.md`. Final named1502/390 outputs and `render/evidence.json` are authoritative renderer evidence. Fixture copied under evidence and temporary page removed; server stopped. No backend/native provider, native shell or Electron process started.

## Source and data boundaries
- No production schema, migration, root layout, attachment backend/opener, dependency manifest or lockfile change. Restore/task preparation remains on the existing eager path; fresh configured plan alone defers worker readiness.
- No native DeepSeek first Send/reply/reload/Open evidence. Inherited DEEPSEEK_API_KEY is absent; this is not an assertion about any user credential vault. API owner must provision/preflight an isolated current fixture and execute the approved journey.
- Existing source/source-review approval, older ticket delivery and independent API confidence are NOT inferred from these checks. No API/delivery canonical report changed.

## Completion corrections and final scope
- Initial final Vue check identified four new Org callback contract errors at the actual history-row boundary. The existing section contract now accepts the explicit action outcome. Its actual Stop publication test tracks the caught promise's outcome-or-void type (the first annotation omitted catch's void; that nonzero check is retained). No runtime logic change was made by these final typing corrections.
- The renewed web cohort includes the actual rendered Org activity publication and workspace section controls: 19 files / 167 tests; server remains 11 files / 56 tests. Distinct bounded total: 30 files / 223 tests, not additive reruns.
- `typecheck-comparison.json` is the earlier pre-correction comparison. `typecheck-comparison-current.json` is the final completed-check comparison produced by `compare-typecheck.py`. The script refuses incomplete check receipts. One premature local comparison of an empty in-progress log was discarded before handoff, not treated as evidence of removed errors.
- Comparison normalizes line positions only; literal union-member ordering differences in the two unchanged test files are disclosed in the resulting test text differences. No successful project-wide Vue typecheck is claimed.

- Completed current comparison: 386 total diagnostics versus 394 baseline; 131 production diagnostics match exactly by file/code/message. The changed load file's three module/inferred-any errors are baseline. Remaining displayed test-text differences are the same union members in a different order, not newly introduced errors. Full logs retained; check remains FAIL.
- Final source production build and guards passed before cleanup. Three owned untracked SDK dist outputs were removed only after all final checks; downstream must rerun the normal prerequisite builds. `completion-integrity.json` records every removed setup file hash and the bounded resource checks.

- Initial all-artifact staged whitespace check returned 2 on original log, captured HTML and unified-diff bytes. `artifact-whitespace.log` and disposition retain that result. No evidence bytes were normalized. Source/test and canonical Markdown checks separately pass; do not call the raw-artifact whitespace check Pass.
