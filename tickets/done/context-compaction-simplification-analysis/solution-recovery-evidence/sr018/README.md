# SR-018 design investigation and latest-base evidence

Owner: Solution Designer. Package: context-compaction-simplification-analysis. Date: 2026-09-30.
This packet supports a completed revised architecture for independent review, **not** implementation acceptance, model quality success or Delivery.

## Basis and scope

User reaffirms no legacy settings import/default-parent operation and explicitly requests extra review. Active prompt is approved v5 (SHA256 2018cd60cd6adedbc3c92fa641b8ff3fc632e0fd177db8305d0af036ff5830d7); v6 candidate is excluded/unapproved. Same REQ/AC outcomes; no new migration, history conversion campaign, strategy, repair agent or UI redesign.

Read current requirements/design/history, reviewer CRR-004, SR-014 diagnostic return and the migration guideline. Eight no-provider source-characterization checks clarify why the strict current snapshot codec cannot simply be made tolerant without pinning the released upgrader. The revised design describes the dependency closure; it is not implemented here. Exact sources/hashes: `source-audit.json`.

## Repository refresh

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`; branch `codex/context-compaction-simplification-analysis`. Fetch and final ls-remote agree on origin/personal `8caa610ff438c288d9aca9f2efe2c33924fbf517`. Rebased HEAD `9f3b7984a0bbb4a1b09ea249958c64f635c4cd2e`, four replayed task commits, 17 newer upstream commits. `refresh/` holds preflight, manifest, patches, rebase/stash logs, exact restoration diffs and unit-check log. Full 286-path safety tar remains `/tmp/autobyteus-compaction-sr018-20260930T104013Z/pending-files.tar`; backup branch/stash retained.284 paths restored byte-identically; two API files only merge upstream skillAccessMode removal. Seven modify/delete conflicts retain already-approved obsolete child-compactor deletions; one registry conflict retains only upstream active builtins. No unmerged paths. No new implementation fix, push/integration merge/release.

## Characterization

Command from worktree root:
```
node tickets/in-progress/context-compaction-simplification-analysis/solution-recovery-evidence/sr018/reader-investigation.cjs "$PWD" "$PWD" "$PWD/tickets/in-progress/context-compaction-simplification-analysis/solution-recovery-evidence/sr018/reader-investigation.json"
```
8 PASS. `reader-investigation.cjs`, `.log`, `.json` include assertions, actual results, loaded source hashes and synthetic fixture. This is unchanged-source characterization, not a target-reader test or installed/released-data acceptance fixture. No temporary production/test files, network, model, app bootstrap or private data used by this script.

## Narrow post-rebase checks

```
pnpm -C autobyteus-server-ts exec vitest run tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/unit/secret-management/live-e2e-harness.test.ts tests/unit/secret-management/live-e2e-compaction-boundary.test.ts tests/unit/secret-management/live-e2e-compaction-observation.test.ts --no-watch
```
Normal setup, test-owned database: 5 files, 42 PASS / 2 FAIL; log `refresh/rebase-unit-checks.log`. The two failures are API-owned wrapper composition with current `ContextFileOwnerResolver`: missing required memoryDir causes `path.resolve(undefined)`. Record SR018-OBS-001; owner correction and readiness/identity regression needed. Do not attribute this new observation to the original missing API-F004 failure evidence or claim a one-line fix is sufficient. No owner test/report modified.

`git diff --check`, `node --check autobyteus-server-ts/scripts/smoke-built-in-agents-bootstrap.mjs`, no-unmerged and upstream-ancestor checks PASS. No built-server smoke/fullsuite/typecheck/browser/desktop/live-provider acceptance executed. Earlier semantic/API failures remain unchanged.

## Target verification, not completed evidence

See design-spec.md: no-import startup/default/current-save checks; current-field read/exact writer; fixed released schema/omission/disposition tests; already-current successor preservation before old conversion; terminal ledger skip; ordinary resume/protocol/native-context continuity. Existing live semantic, continuation and durable-test review gates remain. SourcePass9.40 and API-REV-002 Fail82.9 remain historical scoped results, no rescore.
