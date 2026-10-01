# CRR-007 — API-F006 focused failure-origin and correction review

2026-09-30. **Local Fix — API/E2E-owned invalid assertion; bounded correction verified.** API-REV-004 remains overall Fail90.7%. No successful nine-path test-code review or Delivery approval.

## Independent evidence

- `origin-audit.py` / `origin-audit.json`: reads retained synthetic evidence only. The sole shield character is in an assistant reply; the Unicode tool block omits it. Changing only that reply flips the historical whole-history predicate while all tool blocks remain identical. This is an origin demonstration, not a current glyph requirement.
- The old predicate and blanket U+FFFD ban are present in reviewed IR-002 (`git show ca0552721:test-support/live-e2e/live-e2e-harness.ts`). This was a bounded earlier test-readiness review gap, not an unpredictable production-model defect. Current correction retains Unicode well-formedness, direct framing, exact raw source, snapshot and next-request equality checks.
- Nine current API durable hashes and all23 IR-003 inventory entries match. Production diff from HEAD is empty. All225 API reference-index files exist. Retained wire has9 requests (8parent/1summary), nine HTTP200 statuses; exact next-parent compacted-memory body equals accepted summary. This does not certify a snapshot file after cleanup.
- `entry-hashes.json` / `owner-preservation.json`: pending non-reviewer artifacts protected; generated dist excluded.
- `boundary-regression.log/.exit`: current Unicode acceptance/malformed-surrogate rejection **2Pass,6 deliberately filtered/skipped**.
- `original-request-replay.log/.exit`: exact original unedited retained request **1Pass** through current inspector; not a live/full-flow rerun.

## Exact commands

Worktree cwd `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`:

```sh
python3 tickets/in-progress/context-compaction-simplification-analysis/code-review-evidence/crr-007/origin-audit.py
env -u RUN_REAL_E2E pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-compaction-boundary.test.ts -t 'accepts ordinary assistant text' --no-watch
env -u RUN_REAL_E2E pnpm -C autobyteus-server-ts exec vitest run --no-watch --config "$PWD/tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/api-rev-004/vitest-post-fix.config.mts"
```

Both Vitest commands exit0 and retain standard server setup. Only existing tests run; reviewer writes no durable test/source. The audit's first authoring execution had an incorrect parent-directory index and exited with a tickets/tickets FileNotFoundError; corrected from parents[4] to parents[5] before successful audit. No product failure or test result was inferred from that probe-authoring error.

## Limits and current authority

Original provider flow remains1Pass/1Fail at LIVE_E2E_DIRECT_SUMMARY_SOURCE_EVIDENCE_MISSING; later raw/archive/category/snapshot-file checks were not reached. All-exit stage confirms the exact artifact comparison had already succeeded, and retained requests confirm one accepted summary in the parent context. The scoped semantic/continuation positive is not discarded, but is not full desktop/status/retry/resume or all-model proof.

SR-020 makes API-F005 an accepted known deviation/non-blocking, **not fixed/Pass**. Qwen work is stopped; no waived-fidelity remedy handoff. API-F004 historical cause remains unknown; no Qwen reproduction or endpoint diagnosis. Candidate-v6 remains parked/unapproved. SourcePass9.40/API90.7 retained historically/as reported, no rescore. Three reviewer offline test executions only: no provider calls, source-env/vault/private-history access, desktop/services, full suite/typecheck, broad audit, push/merge/release or generated-output cleanup. Rule/receipt artifacts record the sole API-owned handoff after completion.
