# IR-003 local implementation evidence

## Basis and result

2026-09-30. Approved SR-012 + SR-017 requirements; SR-018/SR-019 design;
ARCH-REV-002 Pass. Cumulative **Large / High**. Structural implementation is
ready for independent source review, not API/E2E acceptance or Delivery.

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`.
- Entry HEAD: `9f3b7984a0bbb4a1b09ea249958c64f635c4cd2e`.
- Refreshed base: `8caa610ff438c288d9aca9f2efe2c33924fbf517` (origin/personal).
- Development commit: `ebaf3a78eff2d3147dc3f4f2eb63bf119d6547ad` (23 owned source/test/fixture paths).
- Exact paths/hashes: `source-inventory.json`; explicit staging allow-list:
  `owned-source-paths.json`; diff size: `source-diff-stat.txt`.
- Production file guardrails pass: no changed source file over500 nonempty
  lines or >220 changed-line delta. Frozen shapes190 nonempty; existing converter499.
- `entry-state.json` pins pending owner files. `pending-owner-preservation.json`
  confirms all272 entry owner files unchanged (generated dist excluded).
  In particular all nine API-owned durable paths remain untouched and uncommitted
  by implementation. Existing backups/external WIP/user profiles not accessed.
- `reference-index.json` retains the cumulative absolute upstream supplement
  inventory; `prompt-unchanged.json` proves exact deployed prompt literal equals
  approved file SHA256 `2018cd60cd6adedbc3c92fa641b8ff3fc632e0fd177db8305d0af036ff5830d7`.

## Final local checks

All commands below ran from `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis` with installed workspace dependencies.
Read root TESTING.md, server AGENTS.md and the migration guideline. Server Vitest
uses its standard test-owned Prisma database, not user application state.
No model/provider calls, private-history reads, desktop/server bring-up or
API/E2E execution were performed. Tests clean their temporary data/hosts.

| Log | Exact command | Result / scope |
| --- | --- | --- |
| `core-focused-final.log` | `pnpm -C autobyteus-ts exec vitest run tests/unit/memory tests/unit/agent/compaction tests/unit/agent/handlers/llm-complete-response-received-event-handler.test.ts tests/unit/agent/streaming --no-watch` | **48 files /377 tests PASS**; current snapshot, frozen shapes/converter, tool repair, parser/planner/budget/capacity/cancel/commit, stream contracts |
| `server-focused-final.log` | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app-data-migrations/migrate-native-working-context-snapshots-v5-migration.test.ts tests/unit/application-platform/application-platform-runtime-isolation.test.ts tests/unit/config/compaction-model-settings.test.ts tests/unit/agent-execution/compaction/compaction-parent-credentials.test.ts tests/unit/agent-execution/compaction/compaction-llm-factory.test.ts tests/unit/services/server-settings-service.test.ts --no-watch` | **6 files /72 tests PASS**; actual writer/eligible migration, terminal runner, composed startup callback, current tuple, parent/credential factory delegation, settings saves |
| `server-preserved-readers.log` | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-memory/agent-memory-service.test.ts tests/unit/agent-memory/memory-file-store.test.ts tests/unit/agent-memory/agent-conversation-activity-inspector.test.ts tests/unit/agent-memory/memory-layout-cleanup-regression.test.ts tests/unit/application-platform/application-platform-lifecycle.test.ts --no-watch` | **5 files /28 tests PASS**; historical/category/Event Monitor readers and lifecycle unit checks |
| `core-build.log` | `pnpm -C autobyteus-ts build` | PASS; production TypeScript/runtime dependency check. Later server prebuild also rebuilds final core including the raw-success correction |
| `server-build.log` | `pnpm -C autobyteus-server-ts build` | PASS; shared/core/SDK builds, Prisma generation, server TypeScript/assets, sanitized built-module and builtin startup smoke without DATABASE_URL |
| audit | `git diff --check`; `git diff --cached --check` before source commit | PASS; size/hash/owner checks recorded in JSON |

Repeated/intermediate runs are not added to final totals. These are local
implementation checks, not downstream acceptance or a full repository suite.
Frontend check: **N/A**, no rendered frontend/interaction implementation changed
in IR-003. Prior synthetic UI and downstream browser evidence retain their own
limits and are not newly claimed.

## Target preservation versus resume

- 83 literal classifier cases were captured from the released Git commit by
  `node tickets/in-progress/context-compaction-simplification-analysis/implementation-evidence/ir-003/capture-released-shapes.cjs`.
  Durable fixture `autobyteus-ts/tests/fixtures/memory/released-native-snapshot-shapes.json`
  pins that base, dependency SHA256s, literal payloads and expected booleans.
  Tests additionally separate preservation from complete pairing, including
  multiple open groups, and prove exact fixed-v5 output without calling the
  evolving runtime writer/validator (85 frozen-boundary tests in the core total).
- Server migration unit tests create **actual MemoryManager writer** zero,
  partial, complete and raw-ahead cuts with summary/native context; all four
  preserve the entire location's snapshot/category/raw/archive/metadata bytes.
  Spies assert no converter, raw-fact loader, finalizer, repair, snapshot write,
  obsolete-file inspection or cleanup invocation. Ten negative current-shape /
  identity cases stay unchanged and FAILED rather than becoming empty v5.
  Both terminal runner statuses remain terminal without executing the migration.
- Core bootstrap tests separately reopen all four actual writer cuts, preserving
  summary/native context, invoking active-raw repair, then passing full validation
  and the final ordinary save. Missing calls alone get existing interrupted
  results; committed successes preserve their results and null errors. This is
  not a crash/power-loss campaign or an application-wide startup acceptance test.
- Current root versions/extras are ignored; known malformed facts are rejected
  without coercion/filtering. Normal saves have exactly agent_id/messages. Frozen
  historical-v5 optional/coercion/classifier semantics are kept only in migration.

## Bounded implementation finding IR003-LF001

The new SR-019 raw-ahead success assertion exposed an existing implementation
bug in `working-context-tool-protocol-repairer.ts`: `completed?.toolError ??
syntheticError` mislabeled an actually committed success (null error) as
interrupted. `reproduce-released-raw-ahead.cjs` loads only the unchanged released
Git source and uses a test-owned MemoryManager writer plus normal bootstrap;
`released-raw-ahead-defect.json` records raw success/null error, recovered result
with a false interrupted error, and the old full validator still returning true.

Exact reproduction: `node tickets/in-progress/context-compaction-simplification-analysis/implementation-evidence/ir-003/reproduce-released-raw-ahead.cjs`.
The final released-base reproduction uses a system message and a tool call, not
a summary, because that older base still requires lineage for summaries. The
first attempt with a summary stopped at that old lineage guard; it did not prove
the tool-error defect. Current target tests independently include summaries.

The fix only chooses the existing completed fact's error whenever the completed
fact exists. No new repair mechanism, changed lifecycle, provider change or
semantic inference was added. This is implementation-owned compliance with
SR-019's committed-fact preservation, **not a claimed cause/remedy for API-F004
or API-F005**. A focused repairer assertion and actual raw-ahead bootstrap test
cover it. Review this additional one-line source delta explicitly.

## Authoring/reconciliation history

- Initial current-codec test exposed an older fixture that replaced message3
  (a tool result after user merging) with an assistant carrying that result.
  Corrected it to actual assistant message2; signed native context coverage stays.
- First new persistence test used an unpersisted call ID for a raw-only result;
  corrected the fixture by persisting its intent, retaining the production guard.
- `migration-check.log`:19 PASS/3 FAIL. Two terminal fixtures omitted the required
  earlier prerequisite; the existing exact registry-order assertion also omitted
  the refreshed-base context-locator migration. Corrected fixtures and retained
  the released fixed-v5 conversion/cleanup expectations; no registry change.
- `server-focused.log` and `server-focused-rerun.log`:39 PASS/2 FAIL each, because
  the existing isolated-runtime fixture omitted new antigravity/grok factories;
  the first repair used the wrong antigravity key. Corrected fixture dependencies,
  never relaxed AgentRunManager/provider/owner readiness. Final72 PASS includes
  both isolation tests and actual no-import bootstrap-callback checks.
- `core-focused.log`: preceding376 PASS; final adds the fixed-target independence
  case, giving377. Earlier failures printed in the turn are described here;
  retained logs are not presented as a green first attempt.

## Separate unchanged holds and evidence limits

API-F005 remains a **confirmed generated-summary semantic failure** (invented
completed plan/checkpoint work); API-F004's original continuation cause remains
unisolated. SR018-OBS-001 is API-owned wrapper owner/readiness composition drift,
not an explanation of API-F004. Nine API-owned paths still need owner validation
and later proportional successful-test review. Historical source9.40 and
API-REV-002 Fail82.9 were not rescored. Candidate-v6 is unapproved/excluded.
No more exhausted live diagnostics, new model/provider defaults/support, actual
crash campaign, production dataset census, standalone full typecheck or full
repository suite is claimed. Finalization remains Delivery-owned origin/personal;
no push/merge/release. Independent source review must precede downstream work.
