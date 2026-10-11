# API/E2E Test-Case Ledger

## Ledger Meta

- Package: `claude-sonnet-haiku-5-5-model-support`; round `API-REV-001`; implementation `22c3c89fa`
- Evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/tickets/in-progress/claude-sonnet-haiku-5-5-model-support/api-e2e-evidence/`
- Credentials: `ANTHROPIC_API_KEY` from `/Users/normy/.autobyteus/server-data/.env` (user-directed), never logged

## Planned Cases

| Case | Surface | Expected |
| --- | --- | --- |
| C55-E2E-001 | live server GraphQL catalog | both rows once, 1M/1M/128K, schema defaults |
| C55-E2E-002 | live server agent run, Sonnet 5.5 Off | `between_tools`, 200s, tool continuation, replay identical |
| C55-E2E-003 | Sonnet 5.5 On | `adaptive`+`summarized` |
| C55-E2E-004 | Haiku 5.5 Off | `disabled` |
| C55-E2E-005 | Haiku 5.5 On | `adaptive` |
| C55-E2E-006 | Haiku Token Meter tiers | cost = per-call tier pricing of raw usage |
| APC-SON | prompt-caching live E2E, `ANTHROPIC_CACHE_E2E_MODEL=claude-sonnet-5-5` | all APC cases pass under strict preserved-thinking check |
| APC-HAI | prompt-caching live E2E, `claude-haiku-5-5` | all APC cases pass |
| APC-OPUS | prompt-caching live E2E default model (regression of the updated test for Opus 5.5) | pass |
| C55-DT-001..006 | isolated desktop instance (packaged worktree build `22c3c89fa`+tests), driven like a user | Sonnet Off/On tool turns, Haiku On/Off tool turns, Token Statistics, restart → reopen → continue |
| C55-BR-001 | owned backend + Nuxt + Chrome: picker + Thinking menu | both rows listed; Off/On + display; Sonnet Summarized, Haiku Omitted preselected; draft llmConfig |

## Execution Events

| Time | Case | Result | Evidence / checkpoint |
| --- | --- | --- | --- |
| 21:46 | C55-E2E-001..006 | Pass (6/6) | `api-e2e-evidence/c55-live/` (case-results.json, calls-summary.json, vitest.log). Replays: Sonnet Off 2 signed blocks (between_tools progress notes), Sonnet On 3, Haiku On 4 (omitted, signed, empty text), Haiku Off none emitted. C55-006: gross 7,952 → le tier, 242,111 → gt tier; meter $0.2362539 = expected; le-only would be $0.0486 |
| 21:51 | APC-SON | Pass (7/7) | `api-e2e-evidence/apc-sonnet/`; 45 calls, all 200 except the APC-E2E-008 control 400; every request strict, thinking `{adaptive, summarized}` |
| 21:55 | APC-HAI | Pass (7/7) | `api-e2e-evidence/apc-haiku/`; 46 calls, all 200 except the control 400 |
| 22:02 | APC-OPUS | Pass (7/7) | `api-e2e-evidence/apc-opus/` (regression of the updated test + policy refactor on Opus 5.5) |
| 22:10 | C55-BR-001 (first attempt) | Fail → probe assertion corrected | asserted a checked display option while Off; the existing menu design shows dependent selections only while On (`chatThinkingMenu.ts` `showSelection`). Not a product defect; probe fixed |
| 22:14 | C55-BR-001 Sonnet / Haiku | Pass | `api-e2e-evidence/browser/evidence.json` + screenshots |
| 22:14 | C55-BR-002 Haiku On browser send | Pass | run llmConfig `{thinking_enabled:true, thinking_display:'omitted'}`, reply rendered, no provider error in backend log |
| 05:20–05:45 | C55-DT-001 Sonnet 5.5 Off tool turn | Pass | write_file+read_file, file on disk `Sonnet 5.5 thinking off works`; D01–D03 |
| | C55-DT-002 Sonnet 5.5 On (Summarized preselected) + follow-up turn | Pass | Thinking segment rendered with summarized text; follow-up wrote sum.txt=87; D04–D06 |
| | C55-DT-003 Haiku 5.5 On (Omitted preselected) | Pass | tool turn answered (12, pears); D07–D08 |
| | C55-DT-004 Haiku 5.5 Off | Pass | tool turn answered |
| | C55-DT-005 Token Statistics page | Pass | rows `Autobyteus · Anthropic:claude-sonnet-5-5` $0.169 and `…claude-haiku-5-5` $0.0071, Complete estimate; equal to per-run GraphQL sums; D09 |
| | C55-DT-006 app restart → reopen Sonnet thinking run → continue | Pass | history incl. Thinking segment reloaded; follow-up answered; 0 provider 400s in instance log; D10–D11 |

### Round API-REV-003 (IR-002 / SR-007, HEAD `31132efcf` on `228cd9b5e`)

| Time | Case | Result | Evidence / checkpoint |
| --- | --- | --- | --- |
| 11:39 | REV3-REPO-001 `tests/unit/llm` | Pass (74 files / 524) | `api-e2e-evidence/rev3/ts-unit-llm.log` (528 → 524 = −5 unsupported-ID cases, +1 Opus 5.5 error-text case) |
| 11:39 | REV3-REPO-002 `tsc -p tsconfig.build.json --noEmit` | Pass | `rev3/ts-tsc.log` (empty) |
| 11:39 | REV3-REPO-003 server `tests/unit/token-usage` | Pass (17 / 111) | `rev3/server-token-usage.log` |
| 11:40 | REV3-REPO-004 both live suites, gates unset, `env -i` | Pass (2 files / 13 skipped cleanly) | `rev3/live-suites-gate-off.log`; headers load after the edit |
| 11:40 | REV3-REPO-005 existing Anthropic tests unchanged; merge-tree clean | Pass | `git diff ff227eb72 HEAD --name-only -- autobyteus-ts/tests` lists only the three ticket-owned files |
| — | C55-E2E-001..006, APC-*, C55-BR-*, C55-DT-* | Not re-run (decision, not a gap) | No payload or UI-path change since `30541612c`; see the investigation, "Live re-run decision" |

## Re-entry And Reconciliation

Resume at the first case without a final result.
