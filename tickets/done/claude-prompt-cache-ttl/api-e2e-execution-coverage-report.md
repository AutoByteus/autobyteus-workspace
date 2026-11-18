# API/E2E Execution Coverage Report: autobyteus-273 Claude runtime one-hour prompt cache

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl/tickets/in-progress/claude-prompt-cache-ttl/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002` (API-REV-001: Blocked; API-REV-002: the user's decision of 2026-10-25 makes the API-billed check a user-only check)
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (HEAD `62bfd7ed51`, direct Small/Low route)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: the API-billed cases (API-07, API-08, API-09) are blocked: Anthropic refuses the test-vault key for its credit balance. AC-002's real run and the toggle-off effect therefore also ran on the subscription (API-14, API-13, added), and API-11 runs in `cli` mode on the subscription instead of api-key mode. API-11 sets the Run details end date to tomorrow because of a pre-existing defect (FU-005). Details: investigation "Round 1 Plan Revisions".
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl/tickets/in-progress/claude-prompt-cache-ttl/evidence/` (the handoff message gives the commit that holds it)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `62bfd7ed51` + this round's test edits (committed with this report) | macOS 26.5 arm64, node v22.23.1, pnpm 10.28.2 | Server e2e (vitest, in-process schema / Studio server) | `env -i PATH HOME USER LOGNAME TMPDIR`; test DB via prisma global setup; temp app data dir |
| ENV-2 | as ENV-1 | as ENV-1 | In-process Studio server (HTTP GraphQL + agent WS), real Claude backend/session, `@anthropic-ai/claude-agent-sdk` 0.3.280, Claude Code CLI 2.1.308 (`/Users/normy/.local/bin/claude`), model `haiku` -> `claude-haiku-5-5` | Real `HOME`/`USER`/`LOGNAME` (operator's subscription login; `~/.claude/settings.json` has no `promptCacheTtl` or `env`); `AUTOBYTEUS_TEST_VAULT=$HOME/.autobyteus-test/vault` (read-only); auth mode switched through GraphQL `updateServerSetting` (`api-key` / `cli`) |
| ENV-3 | as ENV-1 (`dist/` built from it in API-11 attempt 1) | as ENV-1 | Probe-owned backend `node dist/app.js` on a temp data root + Nuxt dev + headless Chrome (Google Chrome, playwright-core); Claude Code CLI 2.1.308, `haiku` | Minimal env (`PATH HOME USER LOGNAME TMPDIR LANG SHELL`), real `HOME` for the subscription login, `cli` mode (default), locale en-US, viewport 1440x1400 |
| ENV-4 | `62bfd7ed51` | as ENV-1 | `autobyteus-ts` vitest live test, core `AnthropicLLM` | Temp `HOME`; `AUTOBYTEUS_TEST_VAULT`, `RUN_LIVE_PROVIDER_TESTS=1`, `AUTOBYTEUS_LIVE_STRICT=1` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 (unit), AC-002 (unit), AC-006 (server, spawn) | setting module, spawn builder, client, settings service | Reused IMP-01 | — | Pass | IMP-01 | IMP-01 | Ran on `cece5ce05b`; `git diff --name-only cece5ce05b 62bfd7ed51` lists only `tickets/` files |
| API-02 | — | server `src` types | Reused IMP-02 | — | Pass | IMP-02 | IMP-02 | Ran on `08a012f9d6`; since then only an unrelated unit test and `tickets/` changed |
| API-03 | AC-004, AC-006 (card) | web components, localization | Reused IMP-04 | — | Pass | IMP-04 | IMP-04 | No web file changed since `08a012f9d6` |
| API-04 | REQ-006 texts | web guards | Reused IMP-05 | — | Pass | IMP-05 | IMP-05 | as API-03 |
| API-05 | regression | full server unit suite | Reused IMP-06 (run 2) | — | Pass | IMP-06 | IMP-06 | Ran on `cece5ce05b`; only `tickets/` changed since |
| API-06 | AC-006 (server accepts only true/false; next spawn follows) | GraphQL `updateServerSetting`/`getServerSettings` -> `process.env` + `.env` -> `buildClaudeSdkSpawnEnvironment` | `cd autobyteus-server-ts && env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" ./node_modules/.bin/vitest run tests/e2e/server-settings/server-settings-graphql.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-06-server-settings-graphql-e2e.log` | `Tests  12 passed (12)`, `exit=0` | New case: never saved -> next spawn has `ENABLE_PROMPT_CACHING_1H=1`; `" false "` saved as `false` in `.env`, next spawn has none, listed `isEditable: true`, `isDeletable: false`; `1h`, `off`, `TRUE`, `""` rejected with the value unchanged; `true` -> variable back |
| API-07 | AC-001 (real API-billed two-turn run), design escalation trigger | Claude runtime api-key mode -> vault key -> Claude Code -> Anthropic API | `cd autobyteus-server-ts && env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" AUTOBYTEUS_TEST_VAULT="$HOME/.autobyteus-test/vault" RUN_CLAUDE_PROMPT_CACHE_E2E=1 CLAUDE_PROMPT_CACHE_E2E_EVIDENCE_DIR=<evidence>/API-07-10-claude-cache-ttl-live ./node_modules/.bin/vitest run tests/e2e/runtime/claude-prompt-cache-ttl-live.e2e.test.ts --no-watch` (case CPC-E2E-001) | ENV-2 | Blocked | `API-07-10-claude-cache-ttl-live/API-07-10-live-suite.log`, `API-07-10-claude-cache-ttl-live/API-07-10-live-suite-run1-api-runs-error.log`, `API-07-blocker-anthropic-key-check.log` | live-suite log: `[live provider skip] provider refused Anthropic (Claude runtime, api-key mode): quota_or_billing_blocked: Error: idle: run failed: CLAUDE_RUNTIME_TURN_FAILED: CLAUDE_RUNTIME_RESULT_ERROR: Credit balance is too low`; key check: `"message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."` (2026-10-22 and again 2026-10-25) | Reproduced: the product resolved the vault key in api-key mode and Claude Code sent it (the API answered with a billing refusal, not an auth error); the same key fails the same way through the core `AnthropicLLM` without Claude Code, so the cause is the key's account balance, not this change. No tokens were billed |
| API-08 | AC-006 (toggle off on API billing), billing control | as API-07, after `updateServerSetting false` | as API-07 (case CPC-E2E-002) | ENV-2 | Blocked | as API-07 | same skip line for CPC-E2E-002 | Same cause |
| API-09 | AC-002 on API billing | as API-07, toggle `true`, workspace `.claude/settings.json` `promptCacheTtl: "5m"` | as API-07 (case CPC-E2E-003) | ENV-2 | Blocked | as API-07 | same skip line for CPC-E2E-003 | Same cause; AC-002's real run is proven on the subscription by API-14 |
| API-10 | AC-003, AC-001 (variable reaches the real CLI) | Claude runtime `cli` mode, subscription | as API-07 (case CPC-E2E-004) | ENV-2 | Pass | `API-07-10-claude-cache-ttl-live/API-07-10-live-suite.log`, `CPC-E2E-004.json` | `"cacheCreation5m":0,"cacheCreation1h":7072` and `"oneHourVariable":"1"`; `✓ CPC-E2E-004` | Measured: the agent conversation writes only 1h, and the spawned `claude` process has `ENABLE_PROMPT_CACHING_1H=1` |
| API-11 | AC-004 (rendered on real usage), AC-006 (card -> next session without restart), AC-002 | Probe-owned backend + Nuxt + Chrome; Settings card; Token Statistics -> Run details; subscription | `cd <worktree> && env -i PATH HOME USER LOGNAME TMPDIR LANG SHELL node tickets/in-progress/claude-prompt-cache-ttl/evidence/scripts/claude-cache-ttl-live-probe.mjs --skip-server-build --output-dir=tickets/in-progress/claude-prompt-cache-ttl/evidence/API-11-claude-cache-ttl-live-probe` (attempt 1 ran the server build) | ENV-3 | Pass | `API-11-claude-cache-ttl-live-probe/result.json`, `API-11-P-02-card-off.png`, `API-11-P-05-breakdown-run-A.png`, `-run-B.png`, `-run-C.png`, `API-11-P-05-run-details.png` | `result.json`: `"result": "Pass"`, P-01..P-05 `Pass`, `"browserErrors": []`, cleanup `"tempRoot": "removed"`, `"spawnedCliLeft": 0`; run A `oneHourVariable "1"`, 1h 5,092; run B (after the card click) `oneHourVariable null`; run C (`promptCacheTtl 5m`) `oneHourVariable "1"`, 5m 5,838; breakdowns: A `["Cache write 1h","5,092","$0.0010"]`, B `["Cache write 1h","5,838","$0.0012"]`, C `["Cache write 5m","5,838","$0.0007"]`, no `Cache writes` row | Costs match Haiku 5.5 prices (5,092 x $0.20/M = $0.00102; 5,838 x $0.125/M = $0.00073). Attempts 1-2 failed from probe defects (connect-time idle counted; an earlier run's live CLI counted); attempt 3 failed at P-05 from pre-existing FU-005 (today's runs not listed by the default range); folders `API-11-attempt1-probe-harness-defect/`, `API-11-attempt2-probe-harness-defect/`, `API-11-attempt3-run-details-default-range/` kept |
| API-12 | AC-005 | docs | Read `git diff d8df12435c 62bfd7ed51 -- autobyteus-server-ts/docs autobyteus-web/docs` against REQ-005 | — | Pass | this row | `llm_management.md` "Claude Agent SDK Prompt Cache Lifetime": what is set (`ENABLE_PROMPT_CACHING_1H=1`, absent = on), override (user choices win, never `CLAUDE_CODE_PROMPT_CACHE_TTL`), cost trade-off (2x vs 1.25x), card path; web `settings.md` "Server Settings: Claude Runtime"; `token_usage.md` and `agent_execution_architecture.md` split rows | Read only. The docs match the behavior measured in API-10, API-11, API-13, API-14; the API-billing claim (5m -> 1h) is the part API-07 could not measure |
| API-13 | AC-006 (off: AutoByteus adds nothing), AC-003 | Claude runtime `cli` mode, subscription, toggle saved `false` via GraphQL without restart | as API-07 (case CPC-E2E-005) | ENV-2 | Pass | `API-07-10-claude-cache-ttl-live/API-07-10-live-suite.log`, `CPC-E2E-005.json` | `"setting":"false"`, `"oneHourVariable":null`, `"cacheCreation5m":0,"cacheCreation1h":6313`; `✓ CPC-E2E-005` | Measured: no variable in the spawned CLI; the conversation keeps Claude Code's own subscription 1h |
| API-14 | AC-002 (real run through the AutoByteus spawn) | Claude runtime `cli` mode, subscription, toggle `true`, workspace `promptCacheTtl: "5m"` | as API-07 (case CPC-E2E-006) | ENV-2 | Pass | `API-07-10-claude-cache-ttl-live/API-07-10-live-suite.log`, `CPC-E2E-006.json` | `"oneHourVariable":"1"` with `"cacheCreation5m":14855,"cacheCreation1h":0`; `✓ CPC-E2E-006` | Measured: the user's setting wins over the AutoByteus default (as investigation T3) |
| API-15 | — | the two changed test files' types | `tsc -p <temp tsconfig extending tsconfig.build.json, rootDir "..", include the two files>` in `autobyteus-server-ts` | ENV-1 | Pass | `API-15-test-files-typecheck.log` | no `error TS` line names `claude-prompt-cache-ttl-live` or `server-settings-graphql`; 4 lines name `../test-support/test-vault/*` (`Cannot find module 'vitest'` under this ad-hoc config) | Temporary config deleted after the run |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | Unit part: API-01 (cli/auto/api-key spawn env), API-06; the real CLI gets the variable: API-10, API-11 P-01; the api-key spawn reaches Anthropic with the vault key: API-07 (billing refusal, not an auth error). API-billed two-turn run: API-07 | Proven, except the API-billed bucket effect: Only The User Can Check | Tried: api-key mode through the product (key resolved and accepted, turns refused for the account's credit balance), the same key through the core client (same refusal), a recheck on 2026-10-25 (same). No other API-billed account may be used for tests: keys come only from the test vault (TESTING.md rule 4), and the only funded API billing is the user's own account, which his running app uses. User decision, 2026-10-25: "We let it pass and we release a new beta", checking after that beta. **User check:** on the beta, run a Claude-runtime agent on API billing (Console credits or `api-key` mode), leave the toggle on, send two messages more than 5 minutes apart, then open Settings -> Token Statistics -> Run details (end date tomorrow, FU-005) and expand the run's cost: expect "Cache write 1h" tokens and no "Cache write 5m" row, and "Cache hits" covering the first turn. If writes show as "Cache write 5m", it is the design's escalation trigger (`Design Impact`, Solution Designer). The same proof is automated: `-t "CPC-E2E-00[123]"` once the vault key has credits |
| AC-002 | Yes | API-01 (user-set variable kept), API-14 (`promptCacheTtl: "5m"` beats the default through the AutoByteus spawn, variable present), API-11 P-04 | Proven | — |
| AC-003 | Yes | API-10, API-13, API-11 P-01/P-03 | Proven | — |
| AC-004 | No | API-03 (component), API-11 P-05 (rendered on real usage, tokens and costs) | Proven | — |
| AC-005 | No | API-12 | Proven | — |
| AC-006 | Yes | API-03 (card states, save, error/revert), API-06 (server accepts only the two values; next spawn follows), API-01 (off -> no variable), API-11 P-01..P-04 (absent = on; card click saves false and the next session gets no variable, without restart; back on), API-13, IMP-07 reused in API-03's package | Proven (the off path's bucket on API billing is part of the AC-001 user check: off = Claude Code's own 5m there) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 95% | API-01..06, API-10..14; AC-001's API-billed bucket effect is the user-only check (not scored, per the confidence rules) | none material within the provable scope | — |
| Changed-boundary execution directness | 75% | 95% | API-10, API-11, API-13, API-14 read the variable in the real spawned CLI and the real buckets; API-06 the real GraphQL boundary | none material within the provable scope | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | Real Studio server, GraphQL, WS, Claude backend, SDK, CLI, Anthropic API (subscription); probe-owned real backend + UI; the api-key spawn reached Anthropic with the vault key | none material within the provable scope | — |
| Environment, configuration, identity, and fixture fidelity | 70% | 95% | Real subscription identity; api-key mode resolved the vault key and Anthropic accepted it (refusal is for balance) | an api-key turn did not complete (no credits); its spawn env is unit-proven and reached Anthropic | the user check |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | API-06 (invalid values, unchanged on rejection), API-01 (user-set variable kept), API-11/API-13 (toggle change without restart), API-14 (`promptCacheTtl` precedence) | `FORCE_PROMPT_CACHING_5M` and bucket env var precedence are Claude Code's own (investigation T4/T6, CLI 2.1.307; this run used 2.1.308); AutoByteus never touches them (unit) | — |
| User-surface, browser, and desktop-shell confidence | 90% | 95% | IMP-07 (via API-03), API-11 (card click, Run details breakdowns on real data); shell not changed | none material | — |
| Durable regression coverage quality and relevance | 90% | 95% | Unit/component (API-01, API-03), GraphQL e2e (API-06), gated live suite CPC-E2E-001..006 | CPC-E2E-001..003 skip until the vault key has credits | — |

- Overall post-repository confidence: 79%
- Overall final confidence: 95% (scored over what can be proven without the user; the API-billed bucket effect is the user-only check)
- Calculation method: simple average of applicable categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: whether Claude Code raises API-billed writes from 5m to 1h when it sees `ENABLE_PROMPT_CACHING_1H=1` (documented by Claude Code, D4; not observed). If it does not, nothing breaks: API billing stays at Claude Code's 5m, as before this change. The user checks it on the next beta (AC-001 row).

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed (API-06, API-10..14). The API-billed part was blocked by the vault key's balance and became a user-only check by the user's decision of 2026-10-25
- Execution mode: `Live API` (in-process Studio server + real Claude Code) and `Browser` (probe-owned stack)
- Confidence gap or residual risk it addresses, and the expected gain: API-07 proves the ticket's main claim on API billing and settles the design escalation trigger; expected to lift requirement proof, directness, realism and identity to 95%+.
- Browser validation needed, and why or why not: yes for the split rows on real usage and the card's effect on the next session; done (API-11).
- Blocked part (now a user-only check): unavailable dependency is API credits for the Anthropic organization of the test-vault key `provider.anthropic.api-key`. Tried: api-key mode through the product (refused: "Credit balance is too low"), the core client with the same key (400 "Your credit balance is too low to access the Anthropic API"), and a recheck on 2026-10-25 (same). No other API-billed path is allowed: keys only from the test vault (TESTING.md rule 4), and the user's CLI must not be logged into Console.

## Desktop Application Validation (When Applicable)

- Approach executed: in-process Studio server and a probe-owned web stack (web-equivalent); no desktop shell change in this ticket.
- Cases proving web-equivalent behavior: API-06, API-10..14. Shell-specific: none needed.
- Effect on any already-running desktop application: `None` (own ports, temp data roots, test DB; `~/.autobyteus` untouched).
- Behavior not directly proven: none shell-related.

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `Not Affected`
- Representative existing data used: a fresh data root whose `.env` never had the key (API-11 P-01, API-06 first step, API-10).
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome: API-11 P-01 (never saved -> card on, spawned CLI has the variable), API-06.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (no re-export of the old file name; `git grep claude-sdk-auth-environment -- autobyteus-server-ts/src` finds nothing)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` (new case "saves the Claude one-hour prompt cache toggle through GraphQL ...") | Updated | API-06 | — |
| `autobyteus-server-ts/tests/e2e/runtime/claude-prompt-cache-ttl-live.e2e.test.ts` (gate `RUN_CLAUDE_PROMPT_CACHE_E2E=1`, CPC-E2E-001..006) | Added | API-07..API-10, API-13, API-14 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Diff or repository evidence supplied for removed paths: none removed

## Dependencies Mocked Or Emulated

None. The Claude CLI, the Agent SDK, Anthropic's API and the subscription login are real. The API-billed identity is unavailable (Blocked), not emulated.

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Live suite: in-process server, Claude CLI children, temp app data dir, temp workspaces, token-usage rows | Yes | suite `afterAll`: terminate runs, delete token rows, close server, remove temp dirs, restore env | Done (suite exit 0) |
| API-11 probe: backend, Nuxt dev, Chrome, temp data root, 3 temp workspaces, Claude CLI children | Yes | probe `finally` | `result.json` cleanup: browser `closed`, frontend/backend `terminated`, `spawnedCliLeft: 0`, tempRoot and workspaces `removed` |
| Probe script `evidence/scripts/claude-cache-ttl-live-probe.mjs` | Yes | Kept as evidence (ticket-owned) | Kept |
| Temporary tsconfig for API-15 | Yes | Deleted | Done |
| Scratch output `/tmp/cpc-shakeout/` (harness shake-out, not evidence) | Yes | Removed | Done |
| Claude session transcripts for the subscription runs under `~/.claude/projects/` (temp workspace paths) | User's folder | Left (as other live Claude suites do) | Reported |
| Temporary diagnostics in product code | None used | — | — |

## Preliminary Classification (On `Fail`)

N/A (result `Blocked`; no failure in this change was found).

## Latest Authoritative Result

- Result: `Pass` (API-REV-002)
- Criteria not proven, or parts only the user can check: AC-001's API-billed bucket effect (only the user can check; steps in the Acceptance-Criteria Proof). API-07, API-08, API-09 stay `Blocked` cases (vault key without credits); their scope is that user check.
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/delivery_engineer` (direct Small/Low pass)
- Notes: user decision, 2026-10-25: "We let it pass and we release a new beta", checking the API-billed behavior after that beta. API-REV-001's result was `Blocked` for the same evidence. Follow-up FU-005 recorded. Spend: 0 API credits (all API requests refused); 9 short Haiku turns on the subscription.
