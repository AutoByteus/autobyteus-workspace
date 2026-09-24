# API/E2E Test-Case Ledger — AGY runtime

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924`.
- Investigation: `api-e2e-coverage-investigation.md`; report: `api-e2e-execution-coverage-report.md`; revision record: `api-e2e-revision-record.md` (after first completed result).
- Scope: six independently meaningful cases including long-running live provider calls; initialized before execution on 2026-09-24. Keep one file; update each case immediately.

| Case ID | Case | Requirements / AC | Planned mode | Order | Status |
| --- | --- | --- | --- | --- | --- |
| AGY-01 | Focused converter/capsule/backend/trace + web draft/hydration | AC-001/002/006/008/009/010 | Vitest | 1 | Pass |
| AGY-02 | Real Team member-to-member scoped MCP roundtrip | AC-002/006/008 | Durable GraphQL/WebSocket E2E | 2 | Fail |
| AGY-03 | Exact restore, mismatch, selected workspace/capsules | AC-003/004 | live suites | 3 | Pass |
| AGY-04 | DONE/denial final-code live/reload UI and trace | AC-007/008/010 | live API/browser | 4 | Pass |
| AGY-05 | Org policy/execution, skills/collision | AC-002/009 | Vitest/live | 5 | Fail |
| AGY-06 | Non-AGY and generic existing-data regression | AC-005 | API/web Vitest | 6 | Pass |

## Execution events
| Seq | Case | Time UTC | Event | Command/entry | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | AGY-01 | 2026-09-24 17:39 UTC | Started | Focused server and web Vitest | Valid mapped events and launch/hydration policy | Running | — | — | Execute and record |
| 2 | AGY-01 | 2026-09-24 17:39 UTC | Checkpoint | Server suite initial attempt | Importable E2E setup | Missing application SDK build; 13 unit assertions pass | — | `/tmp/agy-api-01-server.log` | Run documented `prepare:shared` and retry |
| 3 | AGY-01 | 2026-09-24 17:39 UTC | Completed | Shared build; server focused + web focused Vitest | Converter/capsule/launch/hydration pass | Server 13 pass, live E2E opt-in skipped; web 42 pass | Pass | `/tmp/agy-prepare-shared.log`, `/tmp/agy-api-01-server-rerun.log`, `/tmp/agy-api-01-web.log` | AGY-02 |
| 4 | AGY-02 | 2026-09-24 17:39 UTC | Started | `RUN_AGY_E2E=1` new Team GraphQL/WebSocket test | Real member delivery, stream lifecycle, projection | Running | — | `/tmp/agy-api-02-team.log` | Await provider |
| 5 | AGY-02 | 2026-09-24 17:39 UTC | Checkpoint | First live attempt | GraphQL Team creation | Current `TeamMemberInput` rejects copied legacy `refType`; fixture-only failure before provider | — | `/tmp/agy-api-02-team.log` | Remove stale field and retry |
| 6 | AGY-02 | 2026-09-24 17:40 UTC | Completed | `RUN_AGY_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts --no-watch` | Team launch, real delivery | Current GraphQL fixture accepted after removing obsolete `refType`; production Team create returns false: `rootTeam.defaultLaunchConfiguration.runtimeKind is unsupported.` Shared current run-tree validator omits `antigravity_cli`; Org uses same validator. Critical AC-002/parity gate fails before member start. | Fail | `/tmp/agy-api-02-team-rerun.log`; `src/run-history/store/run-execution-tree-shared-record-schemas.ts:77` | Focused failure-origin review after remaining checks |
| 7 | AGY-03 | 2026-09-24 17:40 UTC | Started | `AGY_LIVE=1` standalone restore/workspace suites | Exact ID, snapshot, real workspace | Running | — | `/tmp/agy-api-03-live.log` | Await provider |
| 8 | AGY-03 | 2026-09-24 17:42 UTC | Completed | `AGY_LIVE=1` restore/production tests | Exact ID, run-start identity, workspace targets, configured skill | 3/3 live tests passed; generated agent writes file+shell to real selected workspace and not capsule; exact restore/mismatch rejected; skill materialized in capsule. Test-owned temp dirs removed; copied independent JSON then restored upstream implementation JSON. | Pass | `/tmp/agy-api-03-live.log`, `api-e2e-standalone-workspace-live.json`, `api-e2e-skill-live.json` | AGY-04 |
| 9 | AGY-04 | 2026-09-24 17:42 UTC | Started | Project `pnpm dev` + browser | Final-code live/reloaded denial label and DONE controls | Running | — | — | Start preview |
| 10 | AGY-04 | 2026-09-24 17:49 UTC | Completed | `pnpm dev`, Chrome web-equivalent UI, fresh AGY runs | Live/reloaded DONE and denial semantics | Explicit-off run live/reloaded Activity DENIED; default-on exit0/exit8/not-found each live/reloaded SUCCESS green; trace stores provider DONE/ERROR, output and no exit field. No lifecycle banner. Both runs terminated; dev stack/browser closed. | Pass | `api-e2e-browser-live-evidence.json`, `/tmp/agy-api-04-dev.log`, test-owned run raw traces | AGY-05 |
| 11 | AGY-05 | 2026-09-24 17:49 UTC | Started | Scoped MCP team/org opt-in + Org/store/skill suites | Scoped calls, policy, collision | Running | — | — | Execute |
| 12 | AGY-05 | 2026-09-24 17:51 UTC | Completed | `AGY_LIVE=1` scoped MCP two tests; AGY capsule and Org store suites from AGY-01 | Real scoped MCP and Org policy/skills/collision | Team/org scoped MCP invoked in real AGY process but delivery stubbed (2/2 pass); configured PRELOADED_ONLY skill live passed; NONE/collision and Org editor policy repository tests passed. Real Org launch not executable: current Org run-tree validator shares unsupported AGY runtime whitelist found in AGY-02. | Fail | `/tmp/agy-api-05-mcp-live.log`, `api-e2e-mcp-team-stub-live.json`, `api-e2e-mcp-org-stub-live.json`, `/tmp/agy-api-01-web.log`, `/tmp/agy-api-01-server-rerun.log` | AGY-06; carry Org launch failure |
| 13 | AGY-06 | 2026-09-24 17:51 UTC | Started | Runtime capability and non-AGY GraphQL/web suites | No policy/reader regression | Running | — | — | Execute |
| 14 | AGY-06 | 2026-09-24 17:54 UTC | Completed | Capability/current GraphQL; Codex/Claude/manager/trace units; web launch/store/form suites | Non-AGY preservation and generic reader | API 2 pass/21 live-agent tests opt-in skipped; server focused 73 pass; web 55 pass. `tsc -p tsconfig.json --noEmit` not usable: existing rootDir=src includes tests, yielding TS6059; no typecheck success claimed. | Pass | `/tmp/agy-api-06-server.log`, `/tmp/agy-api-06-server-focused.log`, `/tmp/agy-api-06-web.log`, `/tmp/agy-api-typecheck.log` | Reconcile/report |
| 15 | AGY-02 | 2026-09-24 17:55 UTC | Checkpoint | Final corrected test rerun | Real Team launch | Same production rejection `rootTeam.defaultLaunchConfiguration.runtimeKind is unsupported`; fixture now matches AGY `call_mcp_tool` shape from real scoped probe. | Fail | `/tmp/agy-api-02-team-final.log`, `api-e2e-mcp-team-stub-live.json` | Failure-origin review |

## Re-entry and reconciliation
- Last recorded event: AGY-02 final corrected test rerun.
- Last completed case: AGY-06 Pass; AGY-02 remains Fail.
- Running/unstarted: none; real Team delivery and Org launch unreachable due AGY launch rejection.
- Next: final report and failure-origin handoff.
- Reconciled into report: Yes — `api-e2e-execution-coverage-report.md`.
