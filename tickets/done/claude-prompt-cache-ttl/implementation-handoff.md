# Implementation Handoff: autobyteus-273 Claude runtime one-hour prompt cache

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route (task_size Small, architectural_risk Low); no architecture review selected (`handoff-solution-designer.md`, "Route").
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl/tickets/in-progress/claude-prompt-cache-ttl/requirements-doc.md` (Approved, SR-002)
- Investigation notes: `.../claude-prompt-cache-ttl/investigation-notes.md`
- Solution revision record: `.../claude-prompt-cache-ttl/solution-revision-record.md` (SR-001, SR-002)
- Design spec (required on every route): `.../claude-prompt-cache-ttl/design-spec.md` (SR-002, Ready)
- Supplemental task artifacts: 271 cost evidence `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/claude-prompt-cache-ttl-evidence/` (read-only, not used for implementation)
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: N/A (initial)

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl/tickets/in-progress/claude-prompt-cache-ttl/`. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl`, branch `codex/claude-prompt-cache-ttl`; code at `abac5953ba` (feature), `08a012f9d6` (unused Codex texts removed) and `cece5ce05b` (baseline test fix, unrelated timing test); this handoff and its evidence are committed after them (see the handoff message for the final commit).

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `.../claude-prompt-cache-ttl/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

What is built:

1. Server: `CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE` (`"true"`/`"false"`, absent = on). The Claude Code spawn environment builder adds `ENABLE_PROMPT_CACHING_1H=1` in every auth mode unless the setting is `false` or the variable is already set. `CLAUDE_CODE_PROMPT_CACHE_TTL` is never set.
2. Server: predefined setting registered with `allowedValues` and `trimBeforePersist`.
3. Web: "Claude runtime" card with the "One-hour prompt cache" switch, after the Codex full access card, en + zh-CN.
4. Web: Token Statistics cost breakdown shows "Cache write 5m" / "Cache write 1h" rows; writes outside the split keep a "Cache writes" row.
5. Tests and docs.

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change stayed inside the existing spawn-environment owner and server-settings registry (one new setting module, one file rename with 2 importers, one registration), one new card modeled on the Codex card, one component's rows. No contract, GraphQL, persistence, security, concurrency or deployment change. Largest source delta: `claude-sdk-spawn-environment.ts` (+26/-14).
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`. The design's escalation trigger (writes still 5m on API billing with the variable present) can only be observed in the API-billed proof, which belongs to API/E2E.

### Lightweight self-review

- Builder has one exit; the cache default runs after the auth policy in `cli`, `auto` (with and without OAuth signal) and `api-key` (unit-tested, IMP-01).
- A user-set `ENABLE_PROMPT_CACHING_1H` (even `"0"` or empty string) is kept: the check is `=== undefined`.
- The setting is read from the copied spawn environment, i.e. `process.env` at spawn time, so a card change reaches the next session without restart (`AppConfig.set` writes `process.env`; IMP-07 confirms the `.env` write).
- No caller bypasses the builder: `buildQueryOptions` and session code do not touch the variable (`git grep ENABLE_PROMPT_CACHING_1H -- autobyteus-server-ts/src` finds only the setting module).
- The pre-existing test-only `options.env` seam (FU-003) still skips the builder in `cli`/`auto` mode; production never passes it, so production behavior is unaffected.
- Web card reads absent / non-`false` as on, saves only `true`/`false`, reverts and shows the error on failure, disables while saving.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001) | 1h default for every Claude Code spawn while the toggle is on | `ClaudeSdkClient.resolveSpawnEnvironment` -> `buildClaudeSdkSpawnEnvironment` (`client/claude-sdk-spawn-environment.ts`) -> `applyClaudeOneHourPromptCacheDefault` (`claude/claude-prompt-cache-setting.ts`) -> `query({ options.env })` | Unit-proven in all modes (IMP-01). API-billed proof left to API/E2E (AC-001 second half). |
| BEH-002 (REQ-002) | User choices win | Variable only added when undefined; `CLAUDE_CODE_PROMPT_CACHE_TTL` never set; Claude Code's own precedence (T3, T6) ranks the variable below `promptCacheTtl`, bucket env vars, `FORCE_PROMPT_CACHING_5M` | Unit-proven for a user-set variable (IMP-01). `promptCacheTtl: "5m"` through the AutoByteus spawn left to API/E2E (AC-002). |
| BEH-003 (REQ-003) | Subscription agent conversation unchanged (1h) | Same path; Claude Code's subscription default is already 1h | No AutoByteus-side difference by billing type; observation left to API/E2E (AC-003). |
| BEH-004 (REQ-004) | Cost breakdown 5m/1h rows; unsplit writes keep one row | `TokenUsageCostBreakdown.vue` `cacheWriteRows` | Component-proven (IMP-04). Rendered on real usage left to API/E2E. |
| BEH-005 | Native runtime unchanged | Not touched | — |
| BEH-006 (REQ-006) | Card with one toggle, on by default, applies to later sessions without restart | `ClaudeRuntimeCard.vue` -> `useServerSettingsStore().updateServerSetting` -> GraphQL `updateServerSetting` -> `ServerSettingsService.updateSetting` (`allowedValues`) -> `AppConfig.set` | Component-proven (IMP-04), server validation (IMP-01), rendered + `.env` write on a real disposable node (IMP-07). |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/`):

- Add `src/runtime-management/claude/claude-prompt-cache-setting.ts`
- Rename/Modify `src/runtime-management/claude/client/claude-sdk-auth-environment.ts` -> `claude-sdk-spawn-environment.ts` (auth policy in `applyClaudeSdkAuthPolicy`, single exit)
- Modify `src/runtime-management/claude/client/claude-sdk-client.ts` (import only)
- Modify `src/services/server-settings-service.ts` (registration)
- Tests: add `tests/unit/runtime-management/claude/claude-prompt-cache-setting.test.ts`, `tests/unit/runtime-management/claude/client/claude-sdk-spawn-environment.test.ts`; modify `tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` (import path; two env expectations now include `ENABLE_PROMPT_CACHING_1H: "1"`), `tests/unit/services/server-settings-service.test.ts`
- Docs: `docs/modules/llm_management.md` (new "Claude Agent SDK Prompt Cache Lifetime"), `docs/modules/token_usage.md` (Run details split rows)

Web (`autobyteus-web/`):

- Add `components/settings/ClaudeRuntimeCard.vue`, `components/settings/__tests__/ClaudeRuntimeCard.spec.ts`, `components/settings/token-usage/__tests__/TokenUsageCostBreakdown.spec.ts`
- Modify `components/settings/ServerSettingsBasicsPanel.vue` (+spec), `components/settings/token-usage/TokenUsageCostBreakdown.vue`
- Modify `localization/messages/en/settings.ts`, `zh-CN/settings.ts` (card texts; removed two unreferenced Codex card texts)
- Docs: `docs/settings.md` (new "Server Settings: Claude Runtime"; Run details split rows), `docs/agent_execution_architecture.md` (same Run details note; that section duplicates settings.md)

## Important Assumptions

- Unsplit "Cache writes" row cost: the design says to mirror the meter panel, which shows the unsplit row only when no split exists and then uses the total cache-write cost. The design also asks for the unsplit row when tokens exist outside the split. There the total would double-count the split rows, so the row shows `estimatedApiCacheCreationInputCost - 5m cost - 1h cost` (clamped at 0). The server computes the total as exactly that sum (`token-cost-calculator.ts` l.164), so with no split the value equals the total, as before.
- The 5m/1h rows follow the meter rule "tokens > 0 or cost not null", so a priced Claude aggregate with only 1h writes also shows a "Cache write 5m" row with 0 tokens and its 0 cost, like the meter.
- Card save error text: like the Codex card, the store's error message, else the localized "save failed" text.

## Known Risks

- `ENABLE_PROMPT_CACHING_1H` on API billing is documented by Claude Code but not yet run end-to-end (design escalation trigger; API/E2E proof).
- Claude Code versions older than 2.1.242 ignore the variable (no harm; documented).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature (with a default behavior change)
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `No Refactor Needed` (rename only)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the builder absorbed the default with an extracted private `applyClaudeSdkAuthPolicy`; the policy constants live in the setting module as designed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no re-export of the old file name; 2 importers updated)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` — the early `return` paths of the builder replaced by one exit; unreferenced `CodexFullAccessCard.save` and `.unsavedChanges` texts removed from both locale files (`git grep` finds no reference; the card auto-saves).
- Dead code found elsewhere, added to `follow-ups.md`: FU-004 (82 tracked `tests/**/*.test.js` files vitest never runs, including `tests/unit/services/server-settings-service.test.js`)
- Shared structures remain tight: `Yes` (no shared type added; the breakdown has its own local `InputRow`)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` — `server-settings-service.ts` 372 effective non-empty lines after +14; every other changed source file is far below 500; no file over 220 changed lines.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: IMP-07 CARD-01 — a fresh node shows the switch on and opening the page writes nothing to `.env`.
- Deviation: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-web exec nuxt prepare` ran in the worktree. `pnpm -C autobyteus-server-ts build` ran inside IMP-07 (dist is current for `abac5953ba`; server source unchanged since).
- Untracked build outputs `autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/` are left unstaged.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl/tickets/in-progress/claude-prompt-cache-ttl/evidence/`. Environment for all rows: macOS 26.5.2 (arm64), node v22.23.1, pnpm 10.28.2.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/claude tests/unit/services/server-settings-service.test.ts --no-watch` | `cece5ce05b` (server source identical to `abac5953ba`) | as above | setting module, spawn builder, Claude client, server-settings registration | AC-001 (unit), AC-002 (unit), AC-006 (server + spawn) | Pass | `IMP-01-server-focused.log` | `Tests  108 passed (108)` |
| IMP-02 | `pnpm -C autobyteus-server-ts typecheck` | `08a012f9d6` | as above | server `src` | — | Pass | `IMP-02-server-typecheck.log` | `exit=0` |
| IMP-04 | `pnpm -C autobyteus-web test:nuxt components/settings/__tests__/ClaudeRuntimeCard.spec.ts components/settings/__tests__/ServerSettingsBasicsPanel.spec.ts components/settings/__tests__/CodexFullAccessCard.spec.ts components/settings/token-usage components/workspace/usage localization --run` | `08a012f9d6` | as above | card, panel, cost breakdown, meter panel, localization catalogs | AC-004, AC-006 (card) | Pass | `IMP-04-web-focused.log` | `Tests  109 passed (109)` |
| IMP-05 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `08a012f9d6` | as above | web boundaries, localization | REQ-006 texts | Pass | `IMP-05-web-guards.log` | `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-06 | `pnpm -C autobyteus-server-ts test:unit` (full suite) | run 1 `abac5953ba`; run 2 `cece5ce05b` | as above | whole server unit layer | regression | Run 1 Fail (1 unrelated timing test, cause below); run 2 Pass | `IMP-06-server-unit-full-run1-abac5953ba.log`, `IMP-06-server-unit-full.log` | run 1: `Tests  1 failed \| 6487 passed`; run 2: `Test Files  790 passed \| 4 skipped (794)`, `exit=0` (the `APP_DATA_STARTUP_GATE_FAILED` JSON lines are expected output of startup-gate tests) |
| IMP-07 | `node tickets/in-progress/claude-prompt-cache-ttl/evidence/scripts/claude-runtime-card-preview.mjs --skip-server-build --output-dir=<ticket>/evidence/IMP-07-card-preview` (server built by the first run of the same script) — disposable backend on a temp data root + Nuxt dev + headless Chrome; no provider calls | `abac5953ba` (later commit removed only unreferenced texts) | as above, Chrome headless | rendered Basics panel, card, store -> GraphQL -> service -> `.env` | AC-006, BEH-006 | Pass | `IMP-07-card-preview/result.json`, `IMP-07-*.png` | `"result": "Pass"`; CARD-01..05 Pass; `browserErrors: []`; cleanup `removed` |

- Baseline fix (TESTING.md rule 9), commit `cece5ce05b`, its own commit: IMP-06 run 1 failed `tests/unit/projects/project-task-index-status.test.ts` > "indexes a Project soon after a Task create or edit with no search, one run per burst (REQ-011, AC-015)": `expected "sync" to not be called at all, but actually been called 1 times`. Cause: the test gives three awaited SQLite writes a fixed 40 ms window measured from the first write (`scheduleIndexAfterWrite` in `project-task-search-service.ts` does not restart the timer); under full-suite load (another worktree's vitest was at about 400% CPU) the timer fired before the third write. Not caused by this change (no projects/indexing code changed; the file passed 3/3 alone before the fix). Fix: window 400 ms; passed 3/3 alone and in the full suite (run 2).
- IMP-02/IMP-04/IMP-05 ran on `08a012f9d6`; `cece5ce05b` changes only that projects test, so they stay valid.
- Not run, and why: the API-billed two-turn proof (AC-001 second half, DEC-004), `promptCacheTtl: "5m"` through the AutoByteus spawn (AC-002 second half), the subscription observation (AC-003), and the cost breakdown rendered on real Claude usage — all need a live Claude Code run and belong to API/E2E. Server integration/E2E suites: nothing in their scope changed beyond the spawn env, which they reach only through live runtimes.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings -> Server Settings -> Basics (new Claude runtime card); Settings -> Token Statistics -> Run details -> task row cost breakdown.
- Approved UI/UX, interaction, requirement, or design references: REQ-006/AC-006, design-spec card row (texts, placement after Codex card, `claude-runtime-` test ids); no UI/UX supplement.
- Existing design system, shared components, and adjacent product surfaces reviewed: `CodexFullAccessCard.vue` (same card shell, switch, note/error layout), `ServerSettingsBasicsPanel.vue` grid, `TokenUsageMeterPanel.vue` split rule and `shell.tokenUsage.cacheWrite5m/1h` labels.
- Testing guideline or preview instructions and rendered surface used: TESTING.md browser-probe pattern (probe-owned backend + Nuxt dev + headless Chrome), via the ticket-owned script modeled on `tests/e2e/embedding-settings-probe.mjs`.
- States, layouts, viewports, and interactions inspected: never-saved default (on), turn off by click (saved `false`, survives reload), keyboard focus ring + Space turns on (saved `true`), zh-CN, 1440px two-column grid (card beside Codex card, same row, same width/height), 390px single column without horizontal overflow.
- Visual or interaction issues found and corrected: the first "off" screenshot caught the switch mid-transition; the script now waits 600 ms before that shot (not a product defect). No product defects found.
- Remaining unverified states: the save-error state is covered by the component test only; the cost breakdown split rows are covered by the component test only (a real-usage render needs a live Claude run, left to API/E2E).

## Downstream Coverage Hints / Suggested Scenarios

- DEC-004 proof (approved spend about 1-2 cents): isolated instance from this branch, `CLAUDE_AGENT_SDK_AUTH_MODE=api-key`, vault Anthropic key through the product only, Haiku, toggle never saved; turn 1, wait about 6 minutes, turn 2. Expect turn-1 writes under `ephemeral_1h_input_tokens` and turn-2 cache reads > 0 without a full re-write. Then check the Run details cost breakdown shows "Cache write 1h". If the instance cannot reach the vault key through the product, stop and ask the user.
- AC-002 through the AutoByteus spawn: a throwaway Claude config with `promptCacheTtl: "5m"` (never edit `~/.claude`) wins over the default (subscription, no credits).
- Toggle off then a new Claude session: the spawned env has no `ENABLE_PROMPT_CACHING_1H` (writes return to Claude Code's default).
- Note TESTING.md: isolated desktop instances pass only `CODEX_HOME` of the CLI homes; plan how the throwaway Claude config reaches the spawn.

## API / E2E / Executable Coverage Investigation And Execution Still Required

All of AC-001 (real run part), AC-002 (real run part), AC-003, and a rendered check of AC-004 on real usage; plus API/E2E's own coverage investigation for AC-005/AC-006.
