# API/E2E Execution Coverage Report — startup-performance

## Latest authoritative result
**Pass — API-REV-001, round 1, 95.7% confidence.** Broader validation **Required → Completed**. All critical validation-stage criteria have direct evidence. This is not release approval or a claim of universal correctness. Code Reviewer receives the successful durable test changes; Delivery retains explicit user verification, version selection, signing, publication and release gates.

## Package and route
- Package `startup-performance-20260927`; approved R1 / D1 / SR-009..013 / ARCH-REV-001 / IR-001 / CRR-001.
- **Medium / High / Reviewed**. Proportional test-code review **Required**; successful recipient Code Reviewer.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/startup-performance`; branch `codex/startup-performance`; base `8bffda04575eaa7198fae186856699011ad5c04b`; integration target `personal`.
- Canonical ticket directory `tickets/in-progress/startup-performance` in that worktree. Requirements, investigation notes/result, design, solution history/handoff, architecture review/history, implementation handoff/history, source review/history, guideline audits and referenced evidence remain cumulative authorities. Product supplements N/A. Current-ticket delivery re-entry/revision N/A. Prior recovery release receipt is historical context, not this ticket's API pass.
- Prior completed API round/result/confidence **N/A**. No pass inferred from a missing record. Current investigation `api-e2e-coverage-investigation.md`, ledger `api-e2e-test-case-ledger.md`, revision `api-e2e-revision-record.md` are canonical siblings.
- No production-source fixes, commit, push, installation or publication by API/E2E. Upstream uncommitted changes and generated SDK dist retained.

## Investigation and ledger reconciliation
Investigation and ledger were created before durable edits/execution. Existing tests were validated against R1, not treated as behavioral authority. The user subsequently requested independently authored source/expected file fixtures; added three cases without replacing existing edge/lifecycle coverage. Meaningful checkpoints and setup corrections are recorded in the ledger; raw benchmark JSON checkpoints supplement the multi-case execution. No case remains running or unstarted.

| Case | Criteria / real boundary | Final result / evidence under `evidence/api-e2e/` |
|---|---|---|
| PERF-01 | AC-002/003/005/006; migration, exact async/sync access, REST/history integration | Pass: 176 focused tests / 19 files, plus 3 golden-file cases / 1 file. `server-focused.log`, `golden-files.log`. |
| PERF-02 | AC-002/003/005/006; built processes, actual HTTP/provider bytes, retry, both hosts | Pass: 10 cases / 2 files. `process-final.log`, `process-final-children/`. |
| PERF-03 | AC-001/002/003/005/006; representative conversion/retry/reopen/new-run | Pass: accepted comparisons, counts, terminal ledger and preservation. `performance-summary.md`, `accepted-process-results.json`, `preservation-results.json`, `terminal-ledger-preservation.json`. |
| PERF-04 | AC-008; packaged Electron readiness and usable renderer | Pass: actual baseline/candidate desktop, candidate CUA navigation/history listing. `desktop-rerun-results.json`, `desktop-ui-observations.md`, `*-desktop-app.log`, `*-desktop-server.log`. |
| PERF-05 | AC-004/007; guide/practices, retained data and cleanup | Pass: guide explicitly covers lockout/commercial risk without asserted measured loss, recurring audit and hash/journal anti-patterns, simpler historical practices. `cleanup.json`, guideline audits and historical inventory. |

**189 passing tests across 22 files**, counting final executions only (not prior nine-case process run again). No full-suite-green claim: implementation/reviewer documented five pre-existing memory-location fixture failures reproduced on untouched base; those unrelated fixtures were not changed or counted as passing here.

## Commands and execution environment
CWD is the assigned worktree. Server AGENTS/package scripts, web AGENTS/README packaged-E2E instructions, `docs/electron_packaging.md`, and supported launch-preparation/direct-process adapters governed setup.

1. `pnpm -C autobyteus-server-ts exec vitest run` with migration/Org-transition/runner, readiness, Org tree-location, `tests/unit/context-files`, provider normalizer, server gate, standalone lifecycle and atomic writer unit paths; REST Team/Org and attachment-history integration paths; `--no-watch`. Exact selection is recorded in `evidence/api-e2e/commands.md`; output `server-focused.log`.
2. `pnpm -C autobyteus-server-ts build` → Pass (`server-build.log`).
3. `RUN_CONTEXT_FILE_PROCESS_E2E=1 CONTEXT_FILE_E2E_EVIDENCE_DIR=<ticket>/evidence/api-e2e/process-final-children pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts tests/e2e/runtime/context-file-startup-recovery.e2e.test.ts --no-watch` → 10 Pass.
4. `pnpm -C autobyteus-server-ts exec vitest run tests/integration/app-data-migrations/team-context-file-golden-files.integration.test.ts --no-watch` → 3 Pass. Complete byte comparisons use checked-in independent expected files; actual migration and atomic writer, not a mocked transform.
5. Unsigned `build:electron:mac` with Apple credential variables unset and `CSC_IDENTITY_AUTO_DISCOVERY=false` → Pass on isolated rerun (`desktop-build-rerun.log`). Initial concurrent server-dist cleanup raced packaging: setup error, corrected by running packaging alone, not a source defect.
6. Temporary scripts: `copy-corpus.py`, `prepare-bench.py`, `benchmark.mjs`, `repair-retry-fixtures.py`, `benchmark-eligible-retry.mjs`, `desktop-compare-rerun.mjs`, `verify-preservation.py`. All under `evidence/api-e2e`. Exact owned paths/provenance/results retained, private corpus removed.
7. `git diff --check` → Pass.

macOS Darwin 25.5.0 arm64; benchmark/backend Electron Node v24.16.0; orchestration Node v22.23.1. Baseline executable is installed v1.4.88, launched only as an **additional isolated test process**. Candidate is the unsigned worktree package, still labeled 1.4.88; not a releasable version selection. Five critical compiled candidate files match packaged hashes (`candidate-fingerprints.json`). Ports 3441 backend, 3442 local model emulator, 3443 isolated desktop. Explicit copied DB/memory/profile; no live ledger manipulation. Provider emulator deterministically supplies catalog/SSE responses; no external inference quality is claimed.

## Comparable broader evidence

| Scenario | Released baseline | Candidate |
|---|---:|---:|
| Ordinary process first conversion → health | 191.052 s | 41.155 s |
| Eligible partial FAILED retry → health | 179.967 s | 38.391 s |
| Terminal repeat process startup → health | 32.503 s | 4.006 s |
| Actual unrelated createAgentRun API | 36.939 s | 1.215 s |
| Actual Electron launch → health, terminal corpus | 30.918 s | 8.621 s |

These are one ordered sequential trial per condition, not cold-cache guarantees, first-paint measurements or a universal SLA. Same runtime/corpus/ordinary process entrypoint for each process pair, baseline first; instrumentation overhead and other host load remain. The first/retry figures are actual backend process startup, **not** desktop first-upgrade timing. Actual packaged terminal reopening separately proves the shell/readiness boundary. No hashing-only cost attribution.

Candidate first/retry: 7,163 source transforms per attempt; respectively 363/181 changed-file atomic writes; **zero migration hashes, backup reads or backup/journal writes**. Terminal migration not invoked; its complete ledger record/attempt count unchanged. Readiness reads **zero historical traces** at startup and actual unrelated admission. Baseline admission read 6,023 traces / 6,346,303,582 bytes. Structural metadata validation remains permitted, measurable work; zero audit is not zero filesystem IO. Counters cover instrumented application readFile/classes, not all kernel IO. Unit assertions independently prove unique one-pass sources and changed-only writes.

### Corpus fidelity and preservation
Frozen representative corpus: **14,412 memory files / 8,052,688,333 bytes**, including all eight missing-tree roots. Initial copy was read-only while installed writers were active; one active trace changed during copy. Therefore this is **not a globally atomic installed recovery snapshot**. All compared specimens derive from the identical frozen copy; no external writers during owned migration.

First-upgrade specimen restores 363 old source files from retained released originals and omits only that migration's ledger/residue in the disposable pre-upgrade specimen. Retry restores 181 old sources, retains 182 current sources and released residue, adds a later current write, and uses normal eligible FAILED selection. Terminal specimen preserves terminal status. These are explicit reconstructed released-shaped states, not a claimed historical whole-machine snapshot and never a live replay.

Final independent checks examined all 14,412 existing memory files in each candidate specimen: only permitted typed locator changes (363 first / 181 retry / zero terminal); all **1,204 context files byte-identical**, eight missing-tree roots preserved, **364 released residue files unchanged** in retry/repeat, and later current write retained. Terminal new-run adds exactly its known index row; all 414 original rows remain unchanged. Detailed hashes/counts, not private corpus contents, are retained. Known unavailable references preserve whole source and yield warnings while independent work progresses; true IO/indeterminate commit failure remains FAILED.

### Setup corrections and limits
- Initial retry fixture erroneously canonicalized `/var` to `/private/var` in the old journal, unlike lexical discovery. Released baseline failed reconciliation; its 28.304-second timing is **invalid** and excluded. Corrected both owned retry specimens; both normal attempts then completed SUCCEEDED_WITH_WARNINGS. Original diagnostic evidence retained.
- Initial desktop baseline exited during pending startup, cause unestablished; cleanup succeeded. Fresh isolated repeat passed baseline and candidate without source changes. Not counted as successful initial execution or an established product defect.
- Temporary preservation parser originally used Python `splitlines`, splitting legal Unicode separators within JSON strings. Corrected to JSONL newline splitting. Also explicitly proved the expected new-run index-row addition rather than treating it as migration mutation. Final verifier has no errors; initial diagnostics retained.
- E2E profile disables updater IPC, producing a dismissible updater notice on the renderer, the same missing-handler error was logged in baseline. Not a migration startup failure. Signed updater flow and explicit user verification remain Delivery gates.

## Desktop / browser strategy
Backend-only behavioral change; repository process tests exercise actual transport/provider/filesystem boundaries. Repeating the prior ticket's browser nested-import/task journey would not establish cold startup performance. Browser-equivalent flow was not claimed newly revalidated. Actual packaged Electron is necessary here because warm browser health cannot prove the failed shell/startup boundary.

CUA selected the **full candidate .app path** and confirmed its renderer file URL in AX, populated Agents page, Agent Teams navigation and retained Team/Org history lists. No startup error screen. Screenshots supported AX observations; semantic route/list observations are in `desktop-ui-observations.md`. No old history task resumed, external message sent, installed profile restarted or production app closed. Local actual new-run admission and all-old-unusable execution are separately proven by process/API cases.

## Durable coverage changes
Updated:
- `autobyteus-server-ts/tests/e2e/helpers/context-file-process-fixture.ts` — current atomic record label for killed-commit checkpoint.
- `autobyteus-server-ts/tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts` — copied exact-target conversion, inert released residue, mixed retry/later writes; real HTTP outside-root/cross-owner containment.
- `autobyteus-server-ts/tests/e2e/runtime/context-file-startup-recovery.e2e.test.ts` — operation-scoped failure with readable referring conversation, terminal skip, inert legacy journal obstruction; retain both hosts/missing-tree/new-work.
Added:
- `autobyteus-server-ts/tests/integration/app-data-migrations/team-context-file-golden-files.integration.test.ts`.
- `autobyteus-server-ts/tests/fixtures/team-context-file-migration/{converted,unavailable,current}.{source,expected}.jsonl` and `README.md` — independently authored complete-file oracles, preservation and repeat stability.

No test files removed. Stale assertions removed/replaced: mandatory new originals/journal, whole referring-package exclusion on missing references, forced terminal revalidation, and fatal obsolete-journal obstruction. R1 AC-002/005/006 expressly supersede these expectations. Runtime legacy routes still rejected; no compatibility-only coverage retained. No proactive audit/dependency closure/cache/fallback restored. Approved migration-only old-shape conversion remains isolated to the same migration ID.

## Confidence scorecard
Simple mean of all seven applicable categories. Percentages are evidence judgments, not a probability that every arbitrary dataset is correct.

| Category | Post-repository | Final | Evidence / remaining limit |
|---|---:|---:|---|
| Requirement and AC proof |90%|96%|All validation-stage criteria directly covered; release/user approval remain downstream.|
| Changed-boundary directness |95%|97%|Actual migration, process/HTTP/filesystem/provider, admission and packaged desktop; instrumented counts corroborate unit proof.|
| Integration realism / mock gap |94%|95%|Real transports and persistence; deterministic model replaces external inference, irrelevant to changed storage logic.|
| Environment / identity / fixture fidelity |90%|94%|Representative retained corpus plus exact/duplicate/containment fixtures; non-atomic initial live copy and reconstructed old states disclosed.|
| Failure / lifecycle / recovery |95%|96%|Real killed commit, finalize retry, both hosts, all-old-unusable; true IO/indeterminate outcomes unit-injected.|
| User surface / desktop shell |75%|95%|Actual candidate startup and renderer navigation; no signed updater or user-specific final verification claim.|
| Durable regression relevance |96%|97%|189 passing focused checks, current-contract process tests plus independent byte-level golden fixtures; no full-suite claim.|

Post-repository **90.7% (635/7)**; final **95.7% (670/7)**. No applicable category below90%; default95% target met. No missing critical validation-stage proof or unresolved candidate failure. No claim of100% universal correctness.

## Cleanup and outcome routing
All owned benchmark/copy/desktop data, including copied private key, removed after preservation checks. Owned local model emulator stopped; ports3441/3442/3443 available. Both isolated desktop process groups cleaned without force. Original production app PID81934/backend PID82843 still running on29695; never reset/replayed or patched. Source live writer continued ordinary changes, so no claim of global installed-file immutability. Test/build logs/scripts retained; generated worktree builds left for review/Delivery, not installed. See `cleanup.json` and desktop cleanup receipts.

Preliminary defect classification N/A — Pass. Required next recipient: Code Reviewer for **proportional review of changed durable test code**, not reopening implementation scorecard. After review, Delivery should prepare the newly versioned Electron release and obtain the user's explicit verification. Routing uses current `get_handoff_rules`; no duplicate forwarding.
