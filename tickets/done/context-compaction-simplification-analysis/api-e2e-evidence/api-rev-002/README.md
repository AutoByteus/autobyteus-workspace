# API-REV-002 evidence index

Result **Fail /82.9%**. API-F001 owner-resolved; **API-F005 repeated semantic fabrication Open** and API-F004 continuation variation Open. No full-suite or Delivery Pass. Canonical execution report/investigation/ledger/revision at ticket root govern; per-command exit0 never overrides semantic adjudication.

## Reproduce

Assigned worktree root: /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis. Core/server current build: `pnpm --filter autobyteus-server-ts build` (API-B01.log).

- `python3 tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/api-rev-002/run-case.py API-C01` → final24/24. C05 →17/17. Exact arguments, environment allow-list and cwd in plan/log/json.
- Start `node .../api-rev-002/owned-server.mjs`; it refuses preexisting owned runtime/db and uses repository test bootstrap (isolated override rather than persistent private test vault). Read owned-server.json for generated URL. Its paths now describe the completed, removed resources.
- `node .../api-rev-002/run-owned-live.mjs --preflight` → DeepSeek missing managed test credential, local Qwen READY.
- `node .../api-rev-002/run-owned-live.mjs` → registered product boundary, local Qwen only; all four attempts retained. Latest2tests Pass, earlier valid same-behavior failure not waived.
- `node .../api-rev-002/run-owned-live.mjs --quality` → optional durable quality file; two actual production summary calls. Latest initial assertions1Pass, independent semantic Fail. New semantic alarm was added afterward and verified by C01/replay, not re-generated to seek green.
- Root `test-support/live-e2e/run-live-e2e.mjs` now also includes the quality test under its existing scenario/provider opt-in; it was syntax-checked, not run against the user's persistent vault.
- `owned-web.mjs` launches normal Nuxt dev on owned port with BACKEND_NODE_BASE_URL. Actual CUA browser actions in browser-observations.md; no mock transport. `seed-owned-history.mjs` prepares synthetic strict-v5/history data.
- `node .../api-rev-002/process-snapshot-probe.mjs` → actual SIGKILL immediately before/after real snapshot-store rename; old/new strict-v5 visible. Narrow primitive evidence, not entire archive transaction or power loss.
- Stop files `stop-owned-web` and `stop-owned-server` trigger owned cleanup. Both complete; cleanup JSON confirms. Browser tab closed. Do not reuse user desktop or other data.

- Deterministic failure replay (no provider): `node --experimental-strip-types tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/api-rev-002/replay-semantic.mjs` → exact retained repeated output rejected.

## Main failure evidence

- semantic-review.md; semantic-final-observations.json; API-F005-replay.json.
- API-C08-quality.log / .json (full source and model summaries/metadata); API-C08-quality-attempt1.* (valid paraphrase assertion failure, semantic sample retained).
- API-C08-first-attempt3.log + API-F004-triage.json (unresolved continuation), API-C08-first.log + first-flow-observations.json (later diagnostic full-flow Pass).
- Attempt1 first flow: missing core registration; attempt2: local pressure reached threshold before Unicode. Both are retained and corrected in test support, not production or assertions.
- API-C01-attempt1.*: test author used nonexistent recording getter; corrected property. API-C05-attempt1.*: test AppConfig not initialized for durable writes; corrected public initialization. Archived JSON preserves originally emitted log pathname; use archive filename/ledger for that execution, not the old field.

## Integrity / cleanup

- authority-recheck.json: only CRR-003 canonical report/history changed since prior authority pins.
- final-source-audit.json and durable-tests.patch: seven durable paths, no production source delta; HEAD unchanged, new files attached separately.
- owned-server.log / owned-web.log, owned-server-cleanup.json / owned-web-cleanup.json; final-cleanup-checks.json confirms both ports closed and owned data/processes absent.
- Browser API tuple/history/hash evidence API-C09-*.json. All reads leave history bytes unchanged.
- API-C10.json actual process-stop outcomes. No screenshot file is claimed; CUA screenshots/AX observations are in the execution conversation, summarized in browser-observations.md.
- Shared LMStudio was already running; calls auto-loaded Qwen. No load/unload/reconfiguration API or stop command was issued; provider's normal TTL manages that shared instance. Owned server/frontend/browser and fixture roots cleaned. Preexisting desktop/test infrastructure/untracked SDK build outputs preserved. No commit/push/merge/release.
