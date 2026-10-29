# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `tickets/in-progress/claude-anthropic-effort-control/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1, Implementation Complete IR-001 (`574aa0bd7`, handoff `a2a5d0e47`), direct Medium / Low route.
- Prior round reviewed: None.
- Deviations from the investigation's plan, and why: API-04 ran as a temporary probe (not durable): its expected behavior is not decided yet (see Preliminary Classification), so no durable test asserts it. Org stopped-run edit with a stale key was not run separately (see Cases notes).
- Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/claude-anthropic-effort-control/tickets/in-progress/claude-anthropic-effort-control/evidence/` (`API-*` files; implementation evidence `IMP-*` alongside).

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery` (not reached: result is `Fail`)
- Proportional test-code review decision: `Not Required — direct low-risk route` (on a later `Pass`)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `a2a5d0e47` (production code = `574aa0bd7`) + API/E2E test additions | Linux arm64 container, Node v22.23.3 | in-process studio server (Vitest e2e), synthetic test vault, canned Anthropic stream | `env -i PATH HOME=/tmp/api-e2e-home TMPDIR=/tmp`; temp data dir per suite |
| ENV-2 | same | same | in-process studio server, real Anthropic API | test vault `/root/.autobyteus-test/vault` (read-only), `AUTOBYTEUS_LIVE_STRICT=1` |
| ENV-3 | same; `autobyteus-ts` and `autobyteus-server-ts` dist rebuilt from this worktree | same | `node autobyteus-server-ts/dist/app.js` on 127.0.0.1:18080, owned temp data root + own SQLite DB; Nuxt dev 127.0.0.1:13000; headless Chromium | env -i, throwaway HOME, test vault read-only; data seeded through GraphQL, stale keys / removed model IDs written only into the test-owned stored JSON; no provider calls; 1510×777-ish default viewport |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..004, 006, 008..011 (parts) | catalog, adapter, web unit, server single run, live adapter, app | Reused: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-08, IMP-11, IMP-12, IMP-13, IMP-14 | (IMP rows) | Pass | (IMP rows) | (IMP rows) | `git diff --name-only 574aa0bd7 a2a5d0e47` outside `tickets/` = only the AC-011 test file (live mode added, run by IMP-13); no production code changed since those checks |
| API-02 | AC-011 (team), REQ-011 | GraphQL create/terminate/restore team run, team WebSocket, `AnthropicLLM` | `env -i PATH="$PATH" HOME=/tmp/api-e2e-home TMPDIR=/tmp corepack pnpm exec vitest run tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts --no-watch` (cwd `autobyteus-server-ts`); live: add `AUTOBYTEUS_TEST_VAULT=/root/.autobyteus-test/vault RUN_ANTHROPIC_STORED_CONFIG_LIVE=1 AUTOBYTEUS_LIVE_STRICT=1`; mutation check: temporary raw-forwarding line in `anthropic-llm.ts` src | ENV-1, ENV-2 | Pass | `API-02-03-resume-team-org-synthetic.log`, `API-02-03-resume-team-org-live.log`, `API-02-03-mutation-check.txt` | `✓ team run: restore succeeds and every member's request after restore carries no stored stale key`; live `Tests  4 passed (4)` with `Secret vault: test vault`; mutation: `Tests  4 failed (4)` | team tree: root default + 2 members (Opus 5.5 / Sonnet 5.5) hold the key; each post-restore request asserts 200, `thinking`/`output_config.effort` as configured, no `thinking_display`/`display`; stored key still on disk afterwards (no rewrite) |
| API-03 | AC-011 (Org), REQ-011 | GraphQL create/terminate/restore AgentOrg run, Org WebSocket, `AnthropicLLM` | same command (same file, same runs as API-02) | ENV-1, ENV-2 | Pass | same three files | `✓ Org run: restore succeeds and the member requests after restore carry no stored stale key` | director (Opus 5.5) + mounted team worker (Sonnet 5.5); ≥3 stored llmConfig objects given the key |
| API-04 | REQ-011, AC-011 (edit of a saved run) | server strict validation on `updateStoppedAgentRunModelConfig` / `updateStoppedTeamRunModelConfigs` | temporary `it()` appended to the AC-011 file, run with `-t TMP-EDIT-PROBE`, removed afterwards: stopped Opus 5.5 agent run and team run with stored `thinking_display`; Save with and without the stale key | ENV-1 | Fail | `API-04-stopped-edit-stale-key-server.txt` | `"outcome": "VALIDATION_FAILED"` + `"path": "llmConfig.thinking_display"` / `"patches[/lead].llmConfig.thinking_display"`, `"Setting is not supported by the selected runtime and model."`; without the key `"outcome": "UPDATED"` | `getAgentRunResumeConfig` shows the run as `editable: true` with the stale key in `metadataConfig.llmConfig` |
| API-05 | AC-007 alternate | web run settings card, definition editor, GraphQL restore | browser journey (ENV-3): open a stopped run whose stored model is `claude-opus-4-7` → Edit Config; open definition with default model `claude-opus-4-7` → Edit; `restoreAgentRun` via GraphQL; open the definition model menu | ENV-3 | Pass | `API-05-06-browser-journeys.txt`, `API-05-removed-model-run-settings.png`, `API-05-removed-model-definition-edit.png` | `No longer offered by AutoByteus. Choose another model before this run resumes.`; `"message":"Error: MODEL_IDENTIFIER_NOT_AVAILABLE"`; `The selected model is unavailable for the current runtime. Retry`; model menu lists 7 Claude rows, no gen-4 | no crash, page usable |
| API-06 | AC-005, AC-006, REQ-010 (definition surface); REQ-011 (edit of saved run) | Agent Configuration (definition editing); stopped-run Edit Config (agent and team) | browser journey (ENV-3), steps in the evidence file | ENV-3 | Fail (definition-surface part Pass; old-run edit part Fail) | `API-05-06-browser-journeys.txt`, `API-06-definition-opus55-effort.png`, `API-06-definition-sonnet55-off.png`, `API-06-old-run-edit-save-refused.png`, `API-06-old-team-run-edit-save-refused.png` | Opus 5.5: select `"value": "medium"`, options low..max, no display, no "Not available"; Sonnet 5.5: switch off, effort `high`, picking `xhigh` turns the switch on, saved `{'reasoning_effort': 'xhigh', 'thinking_enabled': True}`; old run: alert `Model settings are invalid.`; old team run: alert `One or more Team model settings are invalid.`; control run without the key: `Saved. Changes apply when this run resumes.` | the stale key is invisible on the edit card (no residual row), so the user has no way to clear it; stored data unchanged after the refusal |
| API-07 | AC-003, AC-004, AC-009, AC-010, REQ-008 | live agent tool cycles Sonnet/Haiku 5.5 (real studio server + Anthropic) | `env -i PATH="$PATH" HOME=/tmp/api-e2e-home TMPDIR=/tmp AUTOBYTEUS_TEST_VAULT=/root/.autobyteus-test/vault RUN_CLAUDE_5_5_E2E=1 AUTOBYTEUS_LIVE_STRICT=1 CLAUDE_5_5_E2E_EVIDENCE_DIR=<tmp> ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-claude-5-5-live.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-07-claude-5-5-live.log`, `API-07-claude-5-5-live-case-results.json`, `API-07-claude-5-5-live-calls-summary.json` | `Tests  6 passed (6)`; C55-E2E-003 `sends {"type":"adaptive"} and replays thinking unchanged`; 0 occurrences of `"display"` in calls summary | Sonnet 5.5 formerly ran `summarized`; now omitted thinking replayed byte-identically in tool continuations |
| API-07b | REQ-008, REQ-010 | live Opus 5.5 caching + preserved thinking (display omitted) under Anthropic strict prefix binding | `env -i PATH="$PATH" HOME=/tmp/api-e2e-home TMPDIR=/tmp AUTOBYTEUS_TEST_VAULT=/root/.autobyteus-test/vault RUN_ANTHROPIC_CACHE_E2E=1 AUTOBYTEUS_LIVE_STRICT=1 ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-07b-prompt-caching-live.log` | `Tests  7 passed (7)` incl. `APC-E2E-005: Stop and reopen a run holding thinking` and `APC-E2E-008: control` | ~40 Opus 5.5 calls |
| API-08 | AC-007, AC-010 | repository | `git grep -n -E 'claude-opus-4[-.]8\|claude-opus-4[-.]7\|claude-sonnet-4[-.]6\|thinking_budget_tokens\|legacy_budget\|thinking_display\|summaryWithEffort\|getIndependentThinkingParamKeys' -- . ':!tickets'` | ENV-1 | Pass | `API-08-grep-audit.txt` | 8 files, all tests asserting absence/rejection (e.g. `for (const removed of ['claude-opus-4.8', 'claude-opus-4.7', 'claude-sonnet-4.6'])`) | no production/doc hit |

Not run: AgentOrg stopped-run edit (`updateStoppedAgentOrgRunConfig`) with a stale key. By code (`agent-org-run-manager.ts` L284-300) it revalidates the stored `llmConfig` of edited scopes and of every child of a workspace-edited team with the same strict validator, so it has the same cause as API-04; no real Org run holds the key (SRC-019). The fix round should cover it. `autobyteus-compaction-cache-reuse-live` not run (TESTING.md: live compaction is not required proof; only a removed display key in its config; API-07b exercises the same omitted-thinking continuation).

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (IMP-01, IMP-06), API-07 (C55-E2E-001 via GraphQL) | Proven | — |
| AC-002 | Yes | API-01 (IMP-01, IMP-05, IMP-14) | Proven | — |
| AC-003 | Yes | API-01 (IMP-01, IMP-11), API-07 | Proven | — |
| AC-004 | Yes | API-01 (IMP-01, IMP-11, IMP-14), API-07 | Proven | — |
| AC-005 | Yes | API-01 (IMP-03, IMP-12), API-06 (definition form: effort pick while off turns thinking on) | Proven | — |
| AC-006 | Yes | API-01 (IMP-12, IMP-14), API-06 (definition form: Opus 5.5 effort select, medium default, no display, no "Not available") | Proven | — |
| AC-007 | Yes | API-01 (IMP-01, IMP-06), API-05, API-08 | Proven | — |
| AC-008 | Yes | API-01 (IMP-01), API-07, API-07b | Proven | — |
| AC-009 | Yes | API-01 (IMP-05, IMP-11), API-07 | Proven | — |
| AC-010 | Yes | API-01 (IMP-01, IMP-06), API-07, API-08 | Proven | — |
| AC-011 / REQ-011 | Yes | resume + run: API-01 (IMP-13, IMP-14), API-02, API-03 — Proven. Edit of the same saved runs (REQ-011 "keep loading, resuming and running"; data-continuity "edit surfaces drop them on save"): API-04, API-06 — Fail | Not Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual Uncertainty | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 85% | 75% | API-01..08 | REQ-011 edit path fails on real-data shapes | fix + rerun API-04/06 |
| Changed-boundary directness | 90% | 95% | API-02/03 (real server, real Anthropic), API-07/07b, API-06 | — | — |
| Integration realism / mock gap | 90% | 95% | live suites, live resume, real backend + browser | — | — |
| Environment / fixture fidelity | 90% | 95% | stored shapes copied from real user data structure (values only), test-owned roots | Org edit not run | — |
| Failure, edge, lifecycle, recovery | 80% | 70% | stop/restore team/Org pass; removed-model state pass; edit after restore fails | Org edit untested | rerun after fix incl. Org |
| User surface / browser | 85% | 75% | IMP-12/14, API-05, API-06 | old-run edit fails in the UI | rerun API-06 after fix |
| Durable regression coverage | 85% | 85% | team/Org cases added, mutation-sensitive | no durable test for the edit path (behavior not decided) | add with the fix |

- Overall post-repository confidence: 86%
- Overall final confidence: 84% (simple average)
- Every critical AC directly proven: `No` — REQ-011/AC-011 edit path fails.
- Final categories below 90%: requirement/AC proof 75%, failure/lifecycle 70%, user surface 75%, durable coverage 85%.
- Default 95% target met: `No`
- Confidence-limiting residual risks: the API-04/API-06 failure; Org edit path unverified.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (ENV-3) + `Live API` (gated live suites, live resume)
- Gap addressed: definition-editing surface and removed-model state were not rendered; saved team/Org runs and editing of saved runs were unproven; omitted-thinking tool cycles and strict preserved-thinking were not proven live.
- Browser validation needed: yes, the stopped-run edit path is renderer + server; the browser found the failure the server probe predicted.

## Persisted-Data Transition Checks

- Approved decision: `Directly Usable — No Migration`
- Representative existing data: stored `llmConfig` with `thinking_display: "omitted"` in agent run metadata, team execution tree (root default + members), Org execution tree; stored model `claude-opus-4-7` in run metadata and a definition.
- Approved transition followed without an unnecessary migration: `Yes`
- Cases: resume/run API-02, API-03 (+ IMP-13/14): Pass. Edit: API-04, API-06: Fail.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual risk: saved runs holding the key resume and run, but their model settings cannot be changed from Run settings (agent, team; Org by code).

## Compatibility / Legacy Scope Check

- Upstream introduces or tolerates backward compatibility in scope: `No` (the owned-key projection is a generic tolerant reader)
- Compatibility-only behavior in implementation: `No`
- Durable coverage only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Added / updated this round: `Yes`

| Path / Test | Change | Case IDs | Removal Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts` | Updated (team-run and AgentOrg-run cases, shared helpers, header) | API-02, API-03 | — |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Anthropic API (ENV-1 only) | canned streamed reply via `globalThis.fetch` | credit-free default suite | covered by the live run of the same file (ENV-2) |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| TMP-EDIT-PROBE `it()` in the AC-011 file | Yes | file restored from a copy | `grep -c TMP-EDIT` = 0 |
| mutation line in `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Yes | restored from a copy | 0 markers, `git diff` empty for the file |
| backend `dist/app.js` :18080, Nuxt dev :13000, browser tab | Yes | stopped / closed | `pgrep` shows none; user app (PID 52, :8000) untouched |
| temp data roots (`/tmp/api-e2e-stack-*`, suite temp dirs, `/tmp/api-e2e-home`) | Yes | removed | removed; suites remove their own data dirs |
| stray DB `autobyteus-server-ts/db/apie2e.db` from a first backend start with a relative DATABASE_URL | Yes | deleted, restarted with an absolute path | removed |
| rebuilt `autobyteus-ts/dist`, `autobyteus-server-ts/dist` | Yes | left (untracked build outputs, current source) | — |

## Preliminary Classification (On `Fail`)

- `Design Impact` (recommended owner after failure-origin review: Solution Designer).
- Why: the design's persisted-data decision rests on "edit surfaces drop them on save" / "ModelConfigSection form … stale `thinking_display` dropped by existing `sanitizeModelConfigAgainstSchema`" (design-spec Change Scope "Derived consumers" and Persisted Data "Semantics under direct use"). On the stopped-run edit surface this is not so: `RuntimeModelConfigFields.vue` passes `preserve-invalid-draft`, so `ModelConfigSection` skips the sanitize, the draft keeps the stored `thinking_display`, and the server's strict `validateModelConfigSchema` (`run-model-selection-service.ts` L71) refuses the Save. The behavior is introduced by this change (before it, `thinking_display` was a schema key and these Saves passed). It touches the user's real saved runs (SRC-019: a `claude-opus-5-5` run and a team run). The fix has more than one shape (drop undeclared keys in the edit draft; tolerant server validation for unchanged stored keys; or a visible residual the user can remove), and `docs/settings.md` L1652-1658 currently says unsupported stored values "remain visible as historical residuals instead of being … silently written back", so choosing it is a design decision, not a bounded local fix.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: REQ-011 / AC-011 for editing a saved run's model settings (API-04, API-06). Everything else proven.
- Preliminary classification and recommended owner: `Design Impact` → Solution Designer, via code reviewer failure-origin review.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review).
- Notes: on the rerun, API-04 and API-06 (old-run edit) must be rerun plus the Org edit path; API-01/02/03/05/07/07b/08 stay valid unless the fix touches `autobyteus-ts` or the catalog.
