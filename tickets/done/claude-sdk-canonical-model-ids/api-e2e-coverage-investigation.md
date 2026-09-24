# API/E2E Coverage Investigation — claude-sdk-canonical-model-ids

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids/requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `.../tickets/in-progress/claude-sdk-canonical-model-ids/investigation-notes.md`
- Solution Revision Record: `.../tickets/in-progress/claude-sdk-canonical-model-ids/solution-revision-record.md`
- Design Spec (required on every route): `.../tickets/in-progress/claude-sdk-canonical-model-ids/design-spec.md`
- Supplemental Task Artifacts: `dropdown-preview.md` (approved UI supplement, normative layout/label rules, illustrative model strings); `solution-handoff.md`
- Design Review Report: `N/A — not applicable` (architecture review not selected; direct Medium/Low route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `.../tickets/in-progress/claude-sdk-canonical-model-ids/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../tickets/in-progress/claude-sdk-canonical-model-ids/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `.../tickets/in-progress/claude-sdk-canonical-model-ids/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `.../tickets/in-progress/claude-sdk-canonical-model-ids/api-e2e-test-case-ledger.md`
- Current Investigation Round: `1`
- Trigger: Implementation Complete message from `implementation_engineer` (IR-001, commit `23e72c3fa`)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

Claude Agent SDK model pickers must show one option per canonical model ID (SDK `resolvedModel`), labelled by that ID, with `displayName · description` secondary text and a "Recommended" badge on the option the SDK `default` row resolves to (REQ-001..004, 008, 009). The selected field shows `Anthropic / <canonical ID>` in agent run config, team run config and member override (REQ-005). The stored and sent value is always an SDK `value`. For the merged Opus option this is the non-`default` value (`opus[1m]`) (REQ-006). A saved `default` (or any covered value) is recognised as its option, shows no "unavailable" warning, and runs unchanged (REQ-007). New-config seeding is unchanged, and a seeded `default` displays as the Recommended option (REQ-010). Codex/AutoByteus and token accounting are unchanged (AC-008).

Design: this is a presentation-only merge. Catalog identities are unchanged, and `default` stays a catalog row. The server derives `selection_presentation`, and GraphQL exposes `ModelDetail.selectionPresentation` (nullable). The web shared builder `buildModelSelectionGroups` folds aliases into `aliasIds`. `SearchableGroupedSelect` matches aliases, renders the badge, and emits nothing on a same-option re-select. Launch, validation, capacity, token usage and persistence are untouched.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Claude catalog → picker options (canonical label, merge, badge, fallback, search) | Changed | REQ-001..004, 008, 009; design DS-001/DS-002 | Server unit + live SDK catalog integration + web builder/select component + browser |
| BEH-002 Selected-field label | Changed | REQ-005 | Component + browser on agent, team, member-override surfaces |
| BEH-003 Stored/sent value = SDK value; saved alias recognised; no rewrite on re-select | Changed (display) / Preserved (identity) | REQ-006, 007 | Component + browser + launch-path observation (GraphQL mutation payload / persisted run metadata) |
| BEH-004 Per-turn alias→resolved binding | Preserved | AC-008 | Existing token-usage/turn-binding unit tests |
| BEH-005 Other runtimes' labels | Preserved | AC-008 | Existing label tests + browser Codex picker spot-check |
| BEH-006 Seeding from definition default | Preserved (display changes) | REQ-010 / AC-007 | Browser on team run config seeded from a definition with `default` |
| GraphQL `ModelDetail.selectionPresentation` | Added (nullable) | Design interface map | GraphQL mapper unit + live GraphQL snapshot |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Claude normalizer `canonical_name`; `deriveClaudeModelSelectionPresentation` | Unit tests with synthetic SDK rows | Real SDK row shape/order on the installed CLI | Live SDK integration test (`RUN_CLAUDE_E2E=1`) |
| API / transport / contract | Yes | `ModelDetail.selectionPresentation`, `canonicalName` semantics | Mapper unit test; live integration test (GraphQL on real catalog) | Web query ↔ server schema drift (hand-edited `generated/graphql.ts`) | Live server + browser (real query) |
| Frontend component / state | Yes | Builder, matcher, `SearchableGroupedSelect`, `RuntimeModelConfigFields` | Vitest component/unit specs | Real mounted surfaces with real store/catalog | Browser |
| Browser integration / user journey | Yes | Agent run, team run, member override, existing-run settings, messaging binding, application launch profile pickers | Component tests (mocked stores) | Seeding (AC-007), member override, launch payload, re-select no-rewrite with real stores | Browser against worktree server + real Claude CLI |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same Nuxt renderer | As above | As above | Browser (nuxt dev) |
| Desktop shell / Electron-specific integration | No | No preload/IPC/shell change | — | — | None |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No (`Not Affected`) | Saved `default`/`opus[1m]` values read by unchanged readers | Existing validation unit tests | Saved `default` in real definition + run launch | Browser + GraphQL on temp data dir |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes (read-only) | Claude SDK `supportedModels()` `resolvedModel` | Live integration test | Alias drift across CLI versions (accepted, illustrative) | Live SDK |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids` (branch `codex/claude-sdk-canonical-model-ids` @ `23e72c3fa`)
- Project type: pnpm monorepo; `autobyteus-server-ts` (Fastify + type-graphql, Node), `autobyteus-web` (Nuxt 3 / Vue 3 / Pinia, also the Electron renderer)
- Conflicting/unclear instructions: The implementation handoff notes web `vue-tsc` is not runnable. Shell env contains `GEMINI_*`/`VERTEX_*` (breaks one unrelated Gemini test) and `CLAUDECODE`/`CLAUDE_CODE_*` (nested-session markers; stripped with `env -u` for every process that spawns the Claude CLI).
- Required secrets available: `Yes`. The Claude CLI 2.1.281 at `/Users/normy/.local/bin/claude` is logged in (CLI auth mode, default). No secret values are recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Server test commands | `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| `autobyteus-server-ts/README.md` "Build and run" | Server run | `node autobyteus-server-ts/dist/app.js --data-dir <dir> --host .. --port ..`; `.env` in data dir; `AUTOBYTEUS_SERVER_HOST` required; SQLite default; Claude auth `CLAUDE_AGENT_SDK_AUTH_MODE` defaults `cli` |
| `autobyteus-web/AGENTS.md`, `README.md` | Web test/dev | `pnpm test:nuxt <path> --run`; `nuxt dev`; never `git add .` |
| `autobyteus-web/.env` | Backend endpoints | `BACKEND_GRAPHQL_BASE_URL`, `BACKEND_REST_BASE_URL`, WS endpoints → override via env to the temp server port |
| `autobyteus-server-ts/tests/integration/services/claude-model-catalog.integration.test.ts` | Live SDK test gate | `RUN_CLAUDE_E2E=1` + `claude --version` succeeds |
| `autobyteus-web/tests/e2e/existing-run-model-config-probe.mjs` | Existing repo-resident browser probe (mocked GraphQL fixture page) for the existing-run Settings model editor | `pnpm -C autobyteus-web test:e2e:existing-run-model-config` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Worktree server (built `dist`) | worktree root | `env -u CLAUDECODE ... node autobyteus-server-ts/dist/app.js --data-dir /tmp/ccmi-e2e/data --host 127.0.0.1 --port 8720` | Own temp data dir; port 8720 (not used by others) | `POST /graphql` responds | `kill <pid>` (owned PID file) |
| Nuxt dev | `autobyteus-web` | `BACKEND_*=http://127.0.0.1:8720/... pnpm exec nuxt dev --host 127.0.0.1 --port 3720` | Port 3720 | HTTP 200 on `/` | `kill <pid>` |
| Real Claude CLI | — | Spawned by server | Uses the user's CLI login; a single minimal turn at most | Catalog rows returned | Process ends with run termination |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent definition with Claude runtime default `default` | GraphQL definition mutations on the temp server | Temp data dir only | Delete `/tmp/ccmi-e2e` |
| Team definition whose `defaultLaunchConfig.llmModelIdentifier = default`, runtime `claude_agent_sdk` | GraphQL definition mutations | Temp data dir only | Same |
| Existing run with saved `default` | Launch through UI or GraphQL on temp server | Temp data dir only | Same |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- References: design-spec "Persisted Data / State Transition Decision"; implementation-handoff "Persisted Data Transition Check"
- Representative existing-data setup: a definition saved with `default`, a run config saved with `default` and one with `opus[1m]`
- Evidence planned: they open with no warning, display the canonical option, and launch with the saved value unchanged. No stored value is rewritten on re-select.
- Migration scenarios: N/A
- Upstream ambiguity: None

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related REQ/AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| server `tests/unit/runtime-management/claude/client/claude-sdk-model-selection-presentation.test.ts` (new) | default+sibling fold, no sibling, missing/ambiguous resolved, no default row | REQ-001, 004, 008 | Still Valid | Matches design §1 | Run |
| server `.../claude-sdk-model-normalizer.test.ts` | `canonical_name` = resolvedModel / fallback | REQ-002, 008 | Still Valid | — | Run |
| server `.../claude-sdk-client.test.ts` | `listModels` attaches presentation | REQ-001 | Still Valid | — | Run |
| server `tests/unit/api/graphql/types/llm-provider.test.ts` | GraphQL mapping incl. null for media/non-Claude | Design interface | Still Valid | — | Run |
| server `tests/integration/services/claude-model-catalog.integration.test.ts` (live) | Requires live aliases `default, sonnet, opus, haiku`; canonical_name any non-empty string; GraphQL parity | REQ-001..002, 008 | Needs Update | Live CLI 2.1.281 no longer lists `opus` (lists `opus[1m]`), so the test fails before reaching new assertions. The IR-001 canonical assertion is too weak to prove resolvedModel/presentation. | Update: derive required rows from live data, assert canonical ID ≠ alias for `default`, and assert the `selectionPresentation` fold invariants through GraphQL |
| web `utils/__tests__/modelSelectionOptions.spec.ts`, `selectItemMatch.spec.ts`, `modelSelectionLabel.spec.ts` | Builder/matcher/label rules | REQ-001..006, AC-008 | Still Valid | — | Run |
| web `components/agentTeams/__tests__/SearchableGroupedSelect.spec.ts` | Alias check/label, badge search, re-click no emit | REQ-004, 005, 007, 009 | Still Valid | — | Run |
| web `components/launch-config/__tests__/RuntimeModelConfigFields.spec.ts` | Original `default` keeps Opus option, no raw row | REQ-007 | Still Valid | — | Run |
| web `composables/__tests__/.../launch-preset-model-selection.spec.ts` | Messaging preset options | AC-008 | Still Valid | — | Run |
| web `components/workspace/config/__tests__/*` (MemberOverrideItem, AgentOrgRunConfigPanel, etc.) | Existing run-config surfaces | REQ-005, 010 | Still Valid | Unchanged | Run |
| web `tests/e2e/existing-run-model-config-probe.mjs` | Existing-run Settings model editor (mocked GraphQL) | REQ-007 (regression) | Still Valid | Touches `RuntimeModelConfigFields` | Run as regression |

## Stale Or Obsolete Coverage Decisions

None. No durable coverage will be removed.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Evidence | Planned Artifact / Path | Why Durable |
| --- | --- | --- | --- | --- |
| — | — | — | — | Existing web/server specs already cover the builder, matcher, select and label rules at the right boundary. Browser journeys against the real Claude CLI are live-environment dependent (alias strings drift per CLI version), so they stay temporary evidence. The live SDK boundary gets durable coverage by updating the gated live integration test (below). |

## Durable Coverage To Update

| Scenario ID | Existing Path | Required Update | Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-S01 | `autobyteus-server-ts/tests/integration/services/claude-model-catalog.integration.test.ts` | Drop the hard-coded `opus` requirement and pick the Opus row from live data. Assert `default.canonical_name` is not `default` (SDK `resolvedModel` surfaced). Query `selectionPresentation` via GraphQL and assert: exactly one recommended row; `default` either recommended or an alias of a listed, non-alias, recommended row with the same `canonicalName`; all other rows have `aliasOfModelIdentifier: null`. | REQ-001, 002, 004, 006 (identities unchanged), design §1 | Gated by `RUN_CLAUDE_E2E=1` |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/unit/runtime-management/claude tests/unit/api/graphql/types/llm-provider.test.ts tests/unit/llm-management tests/unit/token-usage --no-watch` | `autobyteus-server-ts` | Server derivation, normalizer, mapper, token usage (BEH-004) | Pass (see update) | `/tmp/ccmi-e2e-server-unit.log` |
| 2 | Broader server: `tests/unit/api/graphql tests/unit/agent-execution/backends/claude tests/unit/run-history tests/unit/application-platform` | `autobyteus-server-ts` | Regression | Pass for changed scope; 6 pre-existing | `/tmp/ccmi-e2e-server-unit2.log` |
| 3 | `RUN_CLAUDE_E2E=1 pnpm exec vitest run tests/integration/services/claude-model-catalog.integration.test.ts` (Claude env markers stripped) | `autobyteus-server-ts` | Live SDK → catalog → GraphQL (API-S01) | Pass after update | `/tmp/ccmi-e2e/live-integration.log` |
| 4 | `pnpm test:nuxt --run utils components/agentTeams components/launch-config components/workspace/config components/applications components/settings composables stores` | `autobyteus-web` | Web picker units/components | Pass; 2 pre-existing | `/tmp/ccmi-e2e/web-vitest.log` |
| 5 | `pnpm test:e2e:existing-run-model-config` | `autobyteus-web` | Existing-run Settings editor regression (mocked GraphQL) | Pass | `autobyteus-web/test-results/existing-run-model-config` |
| 6 | Web guards `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `autobyteus-web` | Localization key use | Pass | `/tmp/ccmi-e2e/guard*.log` |

## Test-Case Ledger Plan

- Ledger required: `Yes`. There are multiple independent browser journeys against a live server and CLI, with a credible interruption/context risk.
- Canonical ledger path: `.../tickets/in-progress/claude-sdk-canonical-model-ids/api-e2e-test-case-ledger.md`
- Case granularity: one journey per case

| Case ID | Case / Journey | REQ / AC IDs | Boundary / Execution Surface | Planned Entry Point | Order |
| --- | --- | --- | --- | --- | --- |
| E2E-01 | Live GraphQL catalog snapshot (canonicalName + selectionPresentation; Codex rows null) | AC-001, AC-005 (fallback not live), AC-008 | Live server GraphQL | curl `providerModelCatalogSnapshots` | 1 |
| E2E-02 | Agent run config picker: 4 options, badge, secondary text, search table, select Opus/Sonnet/Fable | AC-001, AC-002, AC-003, AC-006 | Browser | Agent → Run → runtime Claude Agent SDK | 2 |
| E2E-03 | Team run config seeded from definition default `default` | AC-007, AC-004 | Browser | Team definition with defaultLaunchConfig `default` → Run | 3 |
| E2E-04 | Team member override picker | AC-002, AC-003 | Browser | Team run config → member override | 4 |
| E2E-05 | Launch with saved `default` and with `opus[1m]`/Fable: sent/persisted model value is the SDK value | AC-003, AC-004 | Browser + server GraphQL/run metadata | Launch run, inspect mutation payload + run metadata | 5 |
| E2E-06 | Existing-run Settings editor with original `default` | AC-004 / REQ-007 | Browser | Run → settings model editor | 6 |
| E2E-07 | Messaging binding picker and application launch-profile picker show folded list | Design risk "shared builder" / BEH-001 | Browser | Settings → Messaging; Applications setup | 7 |
| E2E-08 | Codex picker unchanged | AC-008 | Browser | Runtime Codex | 8 |

## Repository Execution Results (update)

| Order | Result | Notes |
| --- | --- | --- |
| 1 | Pass for the changed scope: 206/207. The 1 failure is `gemini-configuration-service.test.ts` from shell `GEMINI_SETUP_MODE`; it passes 5/5 with the Gemini env unset | `/tmp/ccmi-e2e-server-unit.log` |
| 2 | 398/404. All 6 failures are pre-existing (identical on base source `9267d11c8`, checked by temporarily checking out the 3 modified server files and then restoring them): `studio-application-api-services`, `agent-run-history-catalog-service`, `published-artifact-projection-service`, `workspace-converter` ×2, `claude-session` interrupt test | `/tmp/ccmi-e2e-server-unit2.log` |
| 3 | Initially Fail (the test required live alias `opus`; CLI 2.1.281 lists `opus[1m]`). This is a stale live expectation independent of this change. After the API-S01 update: Pass (1/1, live CLI) | `/tmp/ccmi-e2e/live-integration.log` |
| 4 | 1878/1880 across 282 files (broader than the implementer's run: all of `components/workspace`). The 2 failures in `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` are identical on base web source | `/tmp/ccmi-e2e/web-vitest.log` |
| 5 | Pass | `/tmp/ccmi-e2e/existing-run-probe/existing-run-model-config-evidence.json` |
| 6 | Pass (all three) | `/tmp/ccmi-e2e/guard:*.log` |
| PROBE-01 | Live rows derived as designed (`default` aliasOf `opus[1m]`, recommended Opus; canonical IDs) | Temporary test file removed |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | Server derivation proven live (API-S01). Web rules unit/component-tested | AC-002/003/004/007 on real mounted surfaces with real stores unproven; launch payload unobserved | Browser journeys + launch |
| Changed-boundary execution directness | 85% | Live SDK → catalog → GraphQL direct | Web ↔ server query contract (hand-edited generated types) only via mocks | Browser against live server |
| Cross-boundary integration realism and mock gap | 80% | Live integration test | Component tests mock the store/catalog | Browser |
| Environment, configuration, identity, and fixture fidelity | 90% | Real CLI login | No real definitions/runs seeded with `default` | Temp fixtures |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Unit: no sibling, no default, missing/ambiguous resolvedModel, orphan alias, re-click no emit | Real saved-`default` reopen / existing-run editor | Browser E2E-06 |
| User-surface, browser, and desktop-shell confidence | 70% | Existing-run probe (mocked) | Real surfaces untested by me | Browser |
| Durable regression coverage quality and relevance | 95% | Focused specs at builder/matcher/select/server layers + strengthened live test | — | — |

- Overall post-repository confidence: 85% (simple average 85.0%)
- Every critical AC directly proven: `No` (AC-002, 003, 004 and 007 need real-surface proof)
- Categories below 90%: 1, 2, 3, 6
- 95% target met: `No`

## Broader Validation Decision

Decision: `Required`. Mode: `Browser` against a worktree server backed by the real Claude CLI, plus one minimal real Claude turn per launch mode. Repository component tests mock the store and catalog. AC-007 seeding, the member override, the launch payload and the re-select no-rewrite with real stores all remain unexercised by them. Expected confidence after: ≥95%. Executed; see `api-e2e-execution-coverage-report.md`.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer
- Web-equivalent behavior: all changed behavior (renderer pickers + server GraphQL)
- Shell-specific behavior: none changed
- Chosen approach: browser via `nuxt dev` against a worktree server on its own data dir and ports
- Effect on running desktop application: None (separate ports, separate data dir)

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| E2E-01..08 | Live server + nuxt dev + browser tools | Real UI journeys and launch payload | Depends on the user's live Claude CLI login and live alias strings that drift by CLI version |
| PROBE-01 | Temporary vitest dump of `ClaudeModelCatalog.listModels()` (deleted after run) | Live rows and derived presentation | Diagnostic only; durable assertions go into API-S01 |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| §4b CLI upgrade moving alias | Cannot change the installed CLI safely | Low; the label is derived live on every catalog request and there is no cache (investigation notes) | Unit-covered |
| §4c no `resolvedModel` live | Live SDK always returns it | Low | Unit-covered (AC-005) |

## Ambiguities Or Reroute Triggers

None identified at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (update API-S01)
- Post-repository confidence: 85%
- Broader validation decision: `Required` (Browser + live launch). Executed, final 95%
- Reroute Required Before Validation Execution: `No`
- Notes: the application launch-profile browser surface is not exercised (it needs an imported application package); it shares the proven composable/builder/select chain. The environment isolation lesson is recorded in the execution report: the shell inherits the live AutoByteus env, so start temp servers with `env -i` + explicit `DATABASE_URL`.
