# SR022 numeric-target removal diagnostic — completed, evidence only

2026-09-30. Exactly **four** DeepSeek outbound generation requests, fixed order F-withTarget / F-withoutTarget / R-withoutTarget / R-withTarget; one each including SDK. All HTTP200, complete/stop, six-heading extraction accepted. **This is not four semantic Passes:** manual review found an unsupported broader constraint in F-withTarget; the other three are good/usable for their supplied histories. See `semantic-adjudication.md` and all four unmodified arm JSON files.

## Authority and boundary

Execution under `../../summary-budget-removal-experiment.sr022.md`, `../../solution-revision.sr022.md`, and exact earlier user DeepSeek/private-test-vault permission quoted in `manifest.json`. New four-call campaign, not reuse of exhausted prior bounds. Frozen pairs and hashes declared before calls; only leading numeric user-envelope target removed. Exact approved v5 system unchanged. Same production `createCompactionLlm`, DeepSeek adapter and tagged parser; **test-only replay of frozen rendered messages bypasses prompt builder/planner/install/commit/parent continuation**. Production implementation has not been changed. No new first summary, Qwen, v6, adaptive requests or repair generation.

Wire controls are exactly `model: deepseek-v4-flash`, `temperature: 0.7`, `max_completion_tokens: 8192`, plus the registered messages. The response's model label is `deepseek-flash` for all four; this is recorded, not silently renamed or treated as an immutable remote model revision. `wire.jsonl` preserves actual safe request controls/content, response content/finish/usage and hashes; auth headers and raw hidden reasoning are not captured. Per-call deadline400s, campaign abort1600s, outer worker1700s. No deadline/guard stop fired. Generations ran14:45:02–14:45:34 UTC.

## Results

| Arm | Body code points | Visible code points incl. markers | Completion tokens incl. reasoning | Reasoning tokens | Derived non-reasoning tokens incl. markers | Elapsed ms | Manual fidelity |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| F-withTarget | 3869 | 3912 | 1396 | 435 | 961 | 6125 | Fail: unsupported broader constraints; immediate task facts retained |
| F-withoutTarget | 3410 | 3453 | 2508 | 1532 | 976 | 10520 | Scoped Pass / good and usable |
| R-withoutTarget | 2766 | 2809 | 1830 | 1168 | 662 | 8403 | Scoped Pass / good and usable |
| R-withTarget | 2875 | 2918 | 1878 | 1179 | 699 | 7366 | Scoped Pass / good and usable |

Both no-target bodies are shorter in characters in this sample (F11.86%, R3.79%), while F's derived non-reasoning tokens increase15 and reasoning increases1097. Not a causal, reliability, latency, cost or universal compression claim. Raw `bodyCharacters` is UTF-16 units (F-withTarget3873); `comparison.json` adds code-point counts and clearly separates reasoning. Original automated `results.json` retains its capture-time “manual fidelity pending” labels; **the final adjudication is this packet and `semantic-adjudication.md`**, not an edit to historical output.

F-withTarget says all raw results must be preserved verbatim and extends the read-only pattern to any future evidence file, neither of which the specific source requests authorize. This scoped SR022-Q01 observation is not a fabricated-completion finding or a diagnosed runtime failure. F-without retains exact8 anchors and correctly pending B acknowledgment. Both R outputs preserve30days/export cancellation, active risk/unrun verification/pending approval and checkpoint addition still needed. All bodies were read manually against the full supplied frozen source. No emoji/literal-text ban was used.

## Setup, exact execution and deviations

Applicable discovery: root `TESTING.md`, server `AGENTS.md`, normal server Vitest `setupFiles`/`globalSetup` and Prisma migration bootstrap; production test-runtime bootstrap and registered provider-capability preflight. Temporary configs extend the standard server base without suppressing Prisma setup. No desktop/browser was needed for this diagnostic boundary.

Commands (W is the assigned worktree, E this directory):
1. Server cwd: `pnpm exec vitest run --no-watch --config E/vitest-guard.config.mts` — **10 offline tests Pass**, including actual production adapter SDK503 retry interception with only one fake outbound. `guard.log`, `guard.exit`, `guard.test.ts`.
2. Root cwd: `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:W/autobyteus-server-ts/db/sr022-budget.db --dry-run`, then same without `--dry-run` in a PTY with explicit IMPORT for that new owned target. Standard build/sanitized smoke passed;10recognized/configured,0replaced. Only importer read the source; no source env printing/editing/sourcing, no production vault access. `import-preview.log`, `import-confirmed.log`, `import-second-confirmed.log`.
3. Root cwd: `node E/run.mjs`; it starts the owned built server and runs server-cwd `pnpm exec vitest run tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts --no-watch` with only `deepseek.compaction-agent-flow` and PREFLIGHT_ONLY1. READY; no generation in preflight.
4. The runner invokes `bounded-worker.mjs exec vitest run --no-watch --config E/vitest-live.config.mts`, spawning pnpm with exact owned URLs/selected scenario recorded in `execution.json`. **One mechanical campaign test Pass**, four generations, not semantic validation Pass. `diagnostic.log`, `worker.json`, `results.json`, `wire.jsonl`.
5. Offline final reconciliation: `python3 E/derive-evidence.py` — exact request/hash/order/controls/response equality, cleanup and source-preservation audit Pass; no provider or credential access.

**Setup-only failure preserved:** first temporary test module used package-subpath imports from outside the server alias scope and failed to collect (0tests,0generation requests). READY preflight did not certify collection. That runner stopped and cleaned its server/runtime/vault/key. Original source/logs are in `setup-attempt-1/`. Only temporary imports were corrected to the current core source paths; offline `pnpm exec vitest list --config E/vitest-live.config.mts` then collected exactly one case (`collection.log`). Guard code remained unchanged with its10Pass prerequisite. A fresh owned vault/server was created through the same normal setup; the sole generation campaign then ran. This was an offline harness-authoring correction, not a retry/substitution after any model outcome. Do not hide the failed setup or describe the whole execution as one flawless attempt. No production/durable repair was made.

## Cleanup and preservation

Both owned setup servers stopped; final serverPID50486/port51617 and workerPID50514 absent, first serverPID46927/port51451 absent. Owned `tests/.tmp/sr022-budget`, `db/sr022-budget.db`, and matching root key removed. Confirmed by runner finally and independent `ps`/`lsof`/existence audit. Normal repository test database/build outputs remain as normal test artifacts; no SDK, shared LM Studio, installed desktop, other WIP or user data cleanup. No commit/push/merge/release.

All nine cumulative API durable hashes unchanged, selected authority hashes unchanged, frozen input and exact v5 unchanged; production diff empty. HEAD5cb7b049/sourceebaf3a78/base8caa610f, Large/High unchanged. `entry-audit.json`, `final-audit.json`. Newly owned files are temporary diagnostic scripts/evidence and API reporting updates only.

## Acceptance and routing limits

API005 remains interrupted pending SR021 requirement/design recovery; API004Fail90.7 remains the last completed result. No API006, confidence rescore, Delivery request or successful nine-path test review. F005 accepted known non-blocking deviation under SR020, Qwen stopped; F004 historical cause unknown; F006 narrow assertion correction remains resolved. Other14 inherited failures and full-suite/typecheck/browser/retry/resume/power-loss limits remain. SR022-Q01 is returned as a diagnostic quality observation to the ongoing Solution Designer investigation, not an independent reviewed production-defect classification.

Complete cumulative references plus this packet are indexed in `reference-index.json`. Ordinary evidence reply to the existing Solution Designer only; rule lookup/receipt recorded after persistence. No further calls allocated or required by this packet.
