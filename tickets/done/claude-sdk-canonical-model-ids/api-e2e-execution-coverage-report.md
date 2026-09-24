# API/E2E Execution Coverage Report — claude-sdk-canonical-model-ids

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids`)

## Execution Round Meta

- Requirements Doc: `.../requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `.../investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md`
- Design Spec: `.../design-spec.md`
- Supplemental Task Artifacts: `.../dropdown-preview.md`, `.../solution-handoff.md`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `.../implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: `N/A`
- Coverage Investigation: `.../api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: `1`
- Trigger: Implementation Complete (IR-001, commit `23e72c3fa`)
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Investigation completed before durable coverage changes: `Yes`
- Plan followed: `Yes`. Deviations: (1) the first browser attempt ran against the wrong web checkout (see Evidence / Notes); it was discarded and redone. (2) The first temp server used the user's live DB; it was corrected mid-run (see Environment Isolation).
- Coverage decisions revised during execution: none beyond the planned API-S01 update
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `.../api-e2e-test-case-ledger.md`
- Initialized before execution: `Yes`; every completed case recorded immediately: `Yes`; reconciled: `Yes`
- Last durably recorded event: seq 11 (E2E-07)
- Cases still running / not started: none

| Case ID | Final Result | Last Event | Evidence | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| E2E-01 | Pass | seq 1 | `/tmp/ccmi-e2e/e2e01-*.json` | — |
| E2E-02 | Pass | seq 3 (seq 2 invalidated setup) | DOM/Pinia JSON in ledger | — |
| E2E-03 | Pass | seq 5 | ledger | — |
| E2E-04 | Pass | seq 6 | ledger | — |
| E2E-05 | Pass | seq 7 + 9 | `/tmp/ccmi-e2e/data/memory/...` | — |
| E2E-06 | Pass | seq 10 | run_metadata.json | — |
| E2E-07 | Pass (messaging) / Not Tested (application launch-profile, browser) | seq 11 | ledger | Residual risk, low |
| E2E-08 | Pass | seq 4 | ledger | — |

## Compatibility / Legacy Scope Check

- Upstream introduces backward compatibility: `No` (keeping `default` in the catalog is approved current behavior, REQ-007)
- Compatibility-only behavior in implementation: `No`. Verified that the web never tests `value === 'default'`; folding follows the server `selectionPresentation` only.
- Persisted-data transition followed (`Not Affected`): `Yes`. Saved `default` opens and runs through the unchanged readers; nothing is rewritten.
- Durable coverage for compatibility-only behavior: `No`

## Changed Boundary And Evidence Matrix

| Scenario ID | REQ / AC | Changed Boundary | Execution Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| API-S01 | REQ-001, 002, 004, 006; AC-001 | Live SDK → `ClaudeModelCatalog` → GraphQL `canonicalName`/`selectionPresentation` | vitest `RUN_CLAUDE_E2E=1`, real CLI 2.1.281 | Durable + Live | Pass | `/tmp/ccmi-e2e/live-integration.log` |
| Server units | REQ-001..004, 008; design §1 | derivation, normalizer, client, mapper | vitest | Durable | Pass | `/tmp/ccmi-e2e-server-unit.log` |
| Web units/components | REQ-001..010, AC-005, 006, 008 | builder, matcher, labels, select, RuntimeModelConfigFields, launch preset | vitest | Durable | Pass | `/tmp/ccmi-e2e/web-vitest.log` |
| Existing-run probe | REQ-007 regression | existing-run Settings editor (mocked GraphQL) | `test:e2e:existing-run-model-config` | Durable probe | Pass | `/tmp/ccmi-e2e/existing-run-probe/` |
| E2E-01 | AC-001, AC-008 | Live GraphQL | curl | Live | Pass | ledger seq 1 |
| E2E-02 | AC-001, 002, 003, 004, 006 | Agent run config | Browser | Browser | Pass | ledger seq 3 |
| E2E-03 | AC-007, AC-004 | Team run config seeded from definition `default` | Browser | Browser | Pass | ledger seq 5 |
| E2E-04 | AC-002, AC-003 | Member override | Browser | Browser | Pass | ledger seq 6 |
| E2E-05 | AC-003, AC-004, BEH-004 | Launch → persisted config → real Claude turn | Browser + server | Live | Pass | ledger seq 7, 9 |
| E2E-06 | AC-004 / REQ-007 | Existing-run editor, original `default` | Browser + server | Live | Pass | ledger seq 10 |
| E2E-07 | BEH-001 (shared builder) | Messaging binding picker | Browser | Browser | Pass; application launch-profile Not Tested | ledger seq 11 |
| E2E-08 | AC-008 | Codex/AutoByteus pickers | Browser | Browser | Pass | ledger seq 4 |

AC coverage summary:
- AC-001: E2E-02, API-S01, E2E-01 + visual screenshot (4 options, labels, badge, secondary text)
- AC-002: agent (E2E-02), team global (E2E-03), member override (E2E-04)
- AC-003: Opus → `opus[1m]`, Sonnet → `sonnet`, Fable → `claude-fable-5-1[1m]`, Haiku → `haiku` stored. Persisted launch: `/beta` `opus[1m]`, `/alpha` `sonnet`. Existing-run save → `sonnet`.
- AC-004: saved `default` displays `Anthropic / claude-opus-5-5[1m]` with no warning (E2E-02/03/06); launch persisted and sent `default` unchanged, and a real turn ran (E2E-05). Re-click never rewrites.
- AC-005: unit only (the live SDK always returns `resolvedModel`)
- AC-006: `opus`, `claude-haiku`, `haiku`, `recommended` (plus `sonnet 5`, `fable`) in the browser
- AC-007: E2E-03
- AC-008: E2E-08 + token-usage turn binding observed (`default` → `claude-opus-5-5`, `sonnet` → `claude-sonnet-5`) + existing token-usage unit suites

## Validation Confidence Scorecard

| Confidence Category | Post-Repository | Final | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | +10 | Every critical AC proven on real surfaces against the real CLI | AC-005 is unit-only (not reproducible live) |
| Changed-boundary execution directness | 85% | 95% | +10 | Real web query ↔ live server schema (hand-edited generated types work end-to-end); real emits into real stores; persisted launch configs | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | +15 | Real CLI, server, browser, Claude turns | Nuxt dev renderer rather than a packaged Electron build (no shell change) |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | +5 | Minimal temp fixtures via public GraphQL; isolated server after the correction | Live alias strings drift (Fable `claude-fable-5` vs `claude-fable-5-1` between catalog calls), accepted as illustrative |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | +5 | Saved-`default` reopen, stopped-run editor, re-click no-rewrite, capacity filter interplay, Codex/AutoByteus unaffected. SCN-003 is observed live: the label followed the SDK's current resolution when Fable changed between calls | §4c fallback is unit-only |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | +25 | 6 real surfaces; DOM/aria assertions; visual confirmation of badge/check/secondary text (IR-001 screenshot of the identical code, `1c762f-1790223475755.png`); my screenshot tool failed | Application launch-profile picker not browser-exercised (same proven chain, component suites green); dark mode / narrow viewport not inspected |
| Durable regression coverage quality and relevance | 95% | 95% | 0 | API-S01 now proves canonical ID + fold invariants against the live SDK | — |

- Overall post-repository confidence: 85%
- Overall final confidence: 95% (simple average 95.0%)
- Every critical AC directly proven: `Yes`
- Any final category below 90%: `No`
- Default 95% target met: `Yes`

## Broader Validation Decision And Execution

- Decision/mode: `Required` / Browser + live launch
- Environment choices: worktree server built from `23e72c3fa` (`pnpm build`), `--data-dir /tmp/ccmi-e2e/data`, port 8720; nuxt dev from `autobyteus-web` in the worktree, port 3720, `BACKEND_*` env pointed at 8720; real Claude CLI 2.1.281 (CLI auth); `CLAUDECODE`/`CLAUDE_CODE_*` markers stripped.
- Fixtures: `ccmi-e2e-claude-agent-a`, `ccmi-e2e-claude-agent-b` (defaultLaunchConfig `claude_agent_sdk`/`default`) and team `ccmi-e2e-claude-team` (members alpha/beta, defaultLaunchConfig `default`), created via GraphQL into `/tmp/ccmi-e2e/data`
- Journeys and results: see the ledger (seq 1–11)

### Environment Isolation

The shell inherits the user's live AutoByteus server environment (`DATABASE_URL=file:/Users/normy/.autobyteus/server-data/db/production.db`, `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`, skill paths, and so on). `--data-dir` does not override `DATABASE_URL`, so the first temp server (E2E-01..05 team part) opened the user's live DB.

Read-only verification found:
- no Prisma migration applied (the latest finished at 05:15, before this session)
- exactly one `token_usage_run_records` row written (id 66933, run `ccmi_e2e_claude_agent_a_6fd6cdfeec0e4ee398202a6f5c55251c`, alpha's one "OK" turn)
- no ledger events or records
- no files in the user's memory dir

The user's local agent packages were loaded read-only; definitions and run memory went to `/tmp`. The user was told and explicitly accepted leaving the row ("all good even though its in the real db"). The server was restarted with `env -i` + `DATABASE_URL=file:/tmp/ccmi-e2e/data/db/e2e.db`, with the open DB verified via `lsof`. The browser evidence gathered before the restart remains valid: it exercised the same worktree code.

The implementation engineer's earlier temp server (`/tmp/ccmi`, same `.env` pattern) likely had the same exposure; that was not investigated further.

Recommendation for delivery/docs: start temp servers from this environment with `env -i` or an explicit `DATABASE_URL`.

## Desktop Application Validation

- Approach: browser against nuxt dev (the renderer is identical to Electron's); no shell/preload/IPC code changed
- Effect on the running desktop app: its processes and ports were untouched. See Environment Isolation for the shared DB row.
- Not directly proven: packaged Electron build (not needed; no shell change)

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64), Node (repo toolchain), Nuxt 3 dev, Claude Code CLI 2.1.281, `@anthropic-ai/claude-agent-sdk` 0.3.231
- Browser: AutoByteus browser tools tab (Chromium-based), desktop viewport, locale en

## Lifecycle / Persisted-Data Checks

- Approved decision: `Not Affected`
- Representative existing data: definitions saved with `default`; a stopped run saved with `default`
- Result: opened without warnings, displayed as the canonical option, launched and ran with `default` unchanged; an explicit re-select saved `sonnet` through the unchanged mutation
- Version-specific branch / dual path observed: `No`

## Tests Implemented Or Updated

| Path | Change | Requirement / Boundary | Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/services/claude-model-catalog.integration.test.ts` | Updated | REQ-001, 002, 004, 006 / live SDK → GraphQL | Pass (live) | Replaced the stale hard-coded `opus` alias requirement with the live Opus row (`opus` or `opus[…]`). Asserts `default.canonical_name` is a resolved `claude-*` ID, not the alias. Queries `selectionPresentation` and asserts: exactly one recommended row; `default` is either recommended or an alias of a listed, recommended, non-alias row with the same `canonicalName`; all other rows `aliasOfModelIdentifier: null`. Uncommitted in the worktree. |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Added/updated/removed this round: `Yes`
- Paths updated: `autobyteus-server-ts/tests/integration/services/claude-model-catalog.integration.test.ts`
- Paths removed: none
- Attached for proportional test-code review: `Not Applicable` (direct low-risk route)

## Other Execution Artifacts

| Artifact | Type | Retained / Temporary | Notes |
| --- | --- | --- | --- |
| `/tmp/ccmi-e2e/` (logs, JSON snapshots, temp data dir, temp DB) | Evidence + temp env | Temporary; retained for delivery reference (1.8 MB) | Safe to delete |
| `/tmp/ccmi-e2e-server-unit*.log` | Test logs | Temporary | — |
| `/Users/normy/.autobyteus/browser-artifacts/1c762f-1790223475755.png` | IR-001 screenshot used as supporting visual evidence | Existing | — |

## Temporary Execution Methods / Scaffolding

| Method | Why | Result | Cleanup |
| --- | --- | --- | --- |
| PROBE-01 temp vitest file `tests/integration/services/zz-tmp-dump-catalog.integration.test.ts` | Dump live rows + derived presentation | Matches the design | Deleted immediately |
| Temporary base-source checkout of modified server/web files | Prove the unrelated failures pre-exist | Identical failures on base | Restored with `git checkout HEAD`; `git status` clean |
| Browser DOM/Pinia scripts | Journey assertions | See ledger | Tab closed |

## Dependencies Mocked Or Emulated

None for broader validation (real CLI, server, browser). The repository component tests mock stores, as recorded in the investigation.

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | API-S01, E2E-01..06, E2E-08, E2E-07 (messaging) | All critical ACs proven |
| Not Tested | E2E-07 application launch-profile picker (browser) | Needs an imported application package; same proven chain; component suites green |
| Out Of Scope | Pre-existing unrelated failures (6 server, 2 web, Gemini env) | Identical on base |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| Temp servers on 8720 (both instances) | Mine | killed | No listeners |
| nuxt dev on 3720 (worktree), and the misplaced one started from the superrepo `autobyteus-web` | Mine | killed | No listeners |
| Browser tab `701c19` | Mine | closed | — |
| Temp vitest probe file | Mine | deleted | — |
| Superrepo `autobyteus-web/.nuxt` and Vite deps cache regenerated by the misplaced nuxt dev | Side effect | Left as-is (gitignored, regenerable build cache; no tracked file changed) | Disclosed |
| User DB row `token_usage_run_records.id = 66933` | Created by my run | Left in place per the user's explicit acceptance | Disclosed |
| `/tmp/ccmi-e2e` | Mine | Retained as evidence | Safe to delete |

## Preliminary Classification

N/A. No failure attributable to the implementation.

## Recommended Recipient

`/delivery_engineer` (direct route Pass; confirmed via `get_handoff_rules`).

## Evidence / Notes

- The first E2E-02 attempt showed the old 5-row UI. This was my setup error, not a defect: a backgrounded `cd … && nohup … &` ran the `cd` in a subshell, so nuxt started in the superrepo's `autobyteus-web`. Proven by `lsof` cwd and served `/_nuxt/utils/modelSelectionLabel.ts` lacking `claude_agent_sdk`; redone from the worktree with verified served modules.
- Observation (not a regression, not in scope): while the catalog is loading, the collapsed field briefly shows the raw saved value (`default`), then the canonical label. This is the select's existing no-match fallback.
- Live alias drift was observed between catalog calls (`claude-fable-5[1m]`/`claude-fable-5` vs `claude-fable-5-1[1m]`/`claude-fable-5-1`); the UI always reflected the current SDK answer (SCN-003).

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- 95% target met: `Yes`
- Any final category below 90%: `No`
- Broader validation decision: `Required`, executed (Browser + live launch)
- Critical ACs lacking direct proof: none (AC-005 fallback is unit-proven; not reproducible live)
- Required next recipient: `/delivery_engineer`
- Notes: the durable test update is uncommitted in the worktree alongside the ticket artifacts.
