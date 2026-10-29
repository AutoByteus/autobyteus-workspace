# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `tickets/in-progress/claude-anthropic-effort-control/api-e2e-coverage-investigation.md` (round 2 plan in "Round 2 Plan")
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 2. Code review Pass CRR-002 of IR-002 (source `47f44c3df`, handoff `7daf47430`), SR-005, ARCH-REV-002. It fixes CR-FO-001, my round-1 API-04/API-06 failure.
- Prior round reviewed: Round 1 (API-REV-001: Fail, 84%).
- Deviations from the plan, and why:
  - API-04 was not rerun as a separate GraphQL probe. The same server paths are proven through the real UI (API-06, API-09) and by the reused IMP-17.
  - The definition-surface part of API-06 was not rerun: no web source changed and the definition service is not a validator caller.
  - API-05 was redone on a fresh run: my first round-2 fixture file was emptied by my own seeding script (see the evidence note).
- Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/claude-anthropic-effort-control/tickets/in-progress/claude-anthropic-effort-control/evidence/` (`API-*`; round-2 files `API-*-r2-*`, `API-09-*`, `API-11-*`, `API-r2-browser-journeys.txt`).

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High` (raised at SR-004)
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review), then delivery.
- Proportional test-code review decision: `Required`.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | R1: `a2a5d0e47` (production = `574aa0bd7`). R2: `7daf47430` (source `47f44c3df`) | Linux arm64 container, Node v22.23.3 | in-process studio server (Vitest e2e), synthetic test vault, canned Anthropic stream | `env -i PATH HOME=/tmp/api-e2e-home TMPDIR=/tmp`; temp data dir per suite |
| ENV-2 | R1 commit (see ENV-1) | same | in-process studio server, real Anthropic API | test vault `/root/.autobyteus-test/vault` (read-only), `AUTOBYTEUS_LIVE_STRICT=1` |
| ENV-3 | R1: `a2a5d0e47`. R2: `7daf47430`. `autobyteus-ts` and server dist rebuilt from the worktree each round | same | `node autobyteus-server-ts/dist/app.js` on 127.0.0.1:18080 with an owned temp data root and its own SQLite DB; Nuxt dev on 127.0.0.1:13000; headless Chromium | env -i, throwaway HOME, test vault read-only. R2 also sets `ANTIGRAVITY_CLI_COMMAND` to the scripted AGY fixture. Data is seeded through GraphQL; stale keys and removed model IDs are written only into test-owned stored JSON |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..004, 006, 008..011 (parts) | catalog, adapter, web unit, server single run, live adapter, app | Reused: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-08, IMP-11, IMP-12, IMP-13, IMP-14 | (IMP rows) | Pass | (IMP rows) | (IMP rows) | R2: still valid. IR-002 changed no `autobyteus-ts`, web source or catalog code |
| API-02 | AC-011 (team), REQ-011 | GraphQL team run create/terminate/restore, team WebSocket, `AnthropicLLM` | `env -i PATH="$PATH" HOME=/tmp/api-e2e-home TMPDIR=/tmp corepack pnpm exec vitest run tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts --no-watch` (cwd `autobyteus-server-ts`). R1 also ran it live (`AUTOBYTEUS_TEST_VAULT=/root/.autobyteus-test/vault RUN_ANTHROPIC_STORED_CONFIG_LIVE=1 AUTOBYTEUS_LIVE_STRICT=1`) and ran the mutation check | ENV-1 (R1, R2), ENV-2 (R1) | Pass | `API-02-03-r2-resume-team-org-synthetic.log` (R2); R1: `API-02-03-resume-team-org-synthetic.log`, `API-02-03-resume-team-org-live.log`, `API-02-03-mutation-check.txt` | R2 `✓ team run: restore succeeds and every member's request after restore carries no stored stale key`, `Tests  4 passed (4)` | R2 rerun on the IR-002 server. The R1 live result stays valid: request shaping is unchanged and restore does not pass the changed validator |
| API-03 | AC-011 (Org), REQ-011 | Org run create/terminate/restore, Org WebSocket | same file and run as API-02 | ENV-1 (R1, R2), ENV-2 (R1) | Pass | same as API-02 | R2 `✓ Org run: restore succeeds and the member requests after restore carry no stored stale key` | R2 rerun: Org launch code changed in IR-002 |
| API-04 | REQ-011 / AC-012 (server) | stopped-run save validation | R1: temporary GraphQL probe. R2: reused IMP-17 (AC-012 (a)/(b), 5/5 on `47f44c3df`); the same server path is exercised through the UI in API-06 and API-09 | ENV-1 | R1 Fail; R2 Pass | R1 `API-04-stopped-edit-stale-key-server.txt`; R2 IMP-17 `IMP-17-e2e-stored-config-edit-launch.log` | IMP-17 `Tests  5 passed (5)` | R1 failure resolved by IR-002 |
| API-05 | AC-007 alternate | run settings card, definition editor, GraphQL restore | Browser: stopped run whose stored model is `claude-opus-4-7` → Edit Config; `restoreAgentRun`. R1 also covered a definition naming that model and the model menu | ENV-3 | Pass | R2 `API-r2-browser-journeys.txt` ("API-05 rerun"), `API-05-r2-removed-model-run-settings.png`; R1 `API-05-06-browser-journeys.txt`, `API-05-*.png` | `No longer offered by AutoByteus. Choose another model before this run resumes.`; `"message":"Error: MODEL_IDENTIFIER_NOT_AVAILABLE"` | The definition and menu parts stay valid: no web or catalog change |
| API-06 | AC-005, AC-006 (definition surface), AC-012 (a) agent + team (old-run edit) | Agent Configuration; stopped-run Edit Config | Browser. Old agent run with stored `{"reasoning_effort":"max","thinking_display":"omitted"}`: Thinking → High → Save. Old team run (root default + both members hold the key): team Thinking → High → Save | ENV-3 | Pass (R1 old-run part Fail → R2 Pass) | R2 `API-r2-browser-journeys.txt` ("API-06 rerun"), `API-06-r2-old-run-edit-saved.png`, `API-06-r2-old-team-run-edit-saved.png`; R1 definition part `API-06-definition-*.png` | `Saved. Changes apply when this run resumes.`; stored afterwards `{'reasoning_effort': 'high'}` for the agent and for root, `/lead`, `/helper` | The definition-surface part was proven in R1 and is still valid |
| API-07 | AC-003, 004, 009, 010, REQ-008 | live agent tool cycles on Sonnet/Haiku 5.5 | `env -i PATH="$PATH" HOME=/tmp/api-e2e-home TMPDIR=/tmp AUTOBYTEUS_TEST_VAULT=/root/.autobyteus-test/vault RUN_CLAUDE_5_5_E2E=1 AUTOBYTEUS_LIVE_STRICT=1 CLAUDE_5_5_E2E_EVIDENCE_DIR=<tmp> ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-claude-5-5-live.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-07-claude-5-5-live.log`, `-case-results.json`, `-calls-summary.json` | `Tests  6 passed (6)`; 0 occurrences of `"display"` | R2: still valid. Its runs carry only declared keys, and the validator's handling of declared keys is unchanged |
| API-07b | REQ-008, REQ-010 | live Opus 5.5 caching with omitted preserved thinking, strict prefix check | `... RUN_ANTHROPIC_CACHE_E2E=1 AUTOBYTEUS_LIVE_STRICT=1 ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-07b-prompt-caching-live.log` | `Tests  7 passed (7)` | R2: still valid, same reason |
| API-08 | AC-007, AC-010 | repository | `git grep` audit (command in the file header) | ENV-1 | Pass | `API-08-r2-grep-audit.txt` (R2), `API-08-grep-audit.txt` (R1) | 12 files, all tests (absence or stale-key fixtures); no `src`, web or docs hit | — |
| API-09 | AC-012 (a)/(b), AgentOrg | stopped Org Edit Config: model edit; workspace-only edit | Browser. Org A: root Thinking Max → High → Save. Org B: `/team` Workspace ws → Temp workspace, nothing else → Save. Read the stored trees afterwards | ENV-3 | Pass | `API-r2-browser-journeys.txt` ("API-09"), `API-09-org-model-edit-saved.png`, `API-09-org-workspace-only-edit-saved.png` | Both saves show `Saved. Changes apply when this run resumes.` Org A: edited scopes `{'reasoning_effort': 'high'}`; untouched customized `/team/lead` keeps its stored config. Org B: `/team` and its children move to `.../temp_workspace`; every `llmConfig` is unchanged (still holds `'thinking_display': 'omitted'`) | Untouched scopes are not rewritten, as AC-012 (b) and design caller #4 require |
| API-10 | AC-012 (opening writes nothing; invalid declared value still refused) | stopped-run Edit Config; GraphQL | Browser: open Edit Config on a stale-key run, change nothing. GraphQL save with `{"reasoning_effort":"ultra","thinking_display":"omitted"}` | ENV-3 | Pass | `API-r2-browser-journeys.txt` ("API-10") | Card buttons are only the model trigger and "Max" (no Save); file sha256 prefix `8aa7a0a2b59e539c` before and after. `"outcome":"VALIDATION_FAILED"`, `"path":"llmConfig.reasoning_effort","message":"Value is not one of the supported options."`; file unchanged | — |
| API-11 | AC-013 (launch from a stored agent default launch config) | Agents → Run Agent → composer → send; real Anthropic reply | Browser: definition with `defaultLaunchConfig.llmConfig` `{'reasoning_effort': 'low', 'thinking_display': 'omitted'}` → Run Agent → send "Reply with exactly the word: LYCHEE" | ENV-3 (+ test vault) | Pass (launch succeeds); observation recorded | `API-r2-browser-journeys.txt` ("API-11"), `API-11-stale-launch-def-run-reply.png` | Composer shows `Thinking: Low`; reply `LYCHEE`, Idle, no Anthropic error in the backend log; the new run stores `{'reasoning_effort': 'low', 'thinking_display': 'omitted'}` | Standalone launch does not pass the validator (design SR-005, "Paths that do not go through the validator"). The key is inert for Anthropic and a later edit drops it. Recorded as FU-005. AC-013's validated launch paths (delegated copy from an agent default or collaborator preference; Org launch) are proven by IMP-17 (b)/(a) and IMP-19 |
| API-12 | RISK-6 | GraphQL against a schema-less model (scripted AGY fixture) | Create an AGY run on `gemini-3.8-flash-low` (schema `null`), stop it, save with `llmConfig: {old_setting: true}`, then read the resume config | ENV-3 | Pass (behavior as designed) | `API-r2-browser-journeys.txt` ("API-12") | `"outcome": "UNCHANGED"`, `canonicalSelection.llmConfig: null`; resume config `llmConfig: null` | Before IR-002 this was refused with "This model has no adjustable settings." |
| IMP-17..IMP-21 | AC-012, AC-013, IG-1, IG-2 | server e2e + unit, web probe DLP-003 | Reused (implementation handoff Checks Run) | (IMP rows) | Pass | (IMP rows) | (IMP rows) | Ran on `47f44c3df`, the source under test |

Not run:
- `autobyteus-compaction-cache-reuse-live` (TESTING.md: live compaction is not required proof).
- An Org launch from the app UI with a stored stale launch configuration. IMP-17 AC-013 (a) covers it at the server through the same GraphQL mutation the app uses.

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-07 | Proven | — |
| AC-002 | Yes | API-01 | Proven | — |
| AC-003 | Yes | API-01, API-07 | Proven | — |
| AC-004 | Yes | API-01, API-07 | Proven | — |
| AC-005 | Yes | API-01, API-06 (definition form) | Proven | — |
| AC-006 | Yes | API-01, API-06 (definition form) | Proven | — |
| AC-007 | Yes | API-01, API-05, API-08 | Proven | — |
| AC-008 | Yes | API-01, API-07, API-07b | Proven | — |
| AC-009 | Yes | API-01, API-07 | Proven | — |
| AC-010 | Yes | API-01, API-07, API-08 | Proven | — |
| AC-011 | Yes | API-01 (IMP-13, IMP-14), API-02, API-03 | Proven | — |
| AC-012 | Yes | (a) agent/team: API-06; (a)/(b) Org: API-09; opening writes nothing and invalid value still refused: API-10; server: IMP-17, IMP-18 | Proven | — |
| AC-013 | Yes | IMP-17 (a) Org launch, (b) delegated copy from a catalog default; IMP-19 (UI notes); IMP-20 (usability unit); API-11 (launch from a stored agent default config succeeds in the app) | Proven for the validated launch paths the design maps; FU-005 records that a standalone launch keeps the inert key | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual Uncertainty | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 92% | 95% | API-01..12, IMP-17..21 | AC-013 wording names "agent default launch config"; the standalone launch keeps the inert key (FU-005) | designer confirms the FU-005 scope |
| Changed-boundary directness | 95% | 97% | API-06/09/10 through the real UI and server; IMP-17 | — | — |
| Integration realism / mock gap | 93% | 96% | real backend + browser, real Anthropic (R1 live, API-11) | R2 resume reran in synthetic mode only (request shaping unchanged) | — |
| Environment / fixture fidelity | 93% | 95% | stored shapes match real user data structure | — | — |
| Failure, edge, lifecycle, recovery | 92% | 95% | invalid value still refused, opening writes nothing, untouched scopes kept, removed model, AGY schema-less | — | — |
| User surface / browser | 90% | 96% | API-05, API-06, API-09, API-10, API-11 | Org launch not driven from the UI | — |
| Durable regression coverage | 92% | 93% | AC-011 team/Org cases (mutation-sensitive); IMP-17 and new unit tests (failing-first IMP-21) | browser journeys are not durable (probe-style, consistent with the repo's ad-hoc journeys) | — |

- Overall post-repository confidence: 92%
- Overall final confidence: 95% (simple average 95.3%)
- Every critical AC directly proven: `Yes` (AC-013 within the design's mapped paths; see FU-005)
- Any final applicable category below 90%: `No`
- Default 95% target met: `Yes`
- Confidence-limiting residual risks: FU-005 (a standalone launch from a definition default config holding an undeclared key copies it into the new run; inert for Anthropic). RISK-6 behavior change confirmed (API-12), for awareness.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (ENV-3) + `Live API` (R1 live suites; API-11 real reply)
- Gap addressed: the R1 failure was a renderer + server journey, so the fix had to be proven through the same UI for agent, team and Org (model and workspace-only edits). AC-013 had no UI evidence of a launch from a stored config.
- Browser validation needed: yes, for the reason above.

## Persisted-Data Transition Checks

- Approved decision: `Directly Usable — No Migration` (DEC-011: undeclared keys are left out on save; no history rewrite).
- Representative existing data: stored `llmConfig` with `thinking_display` in agent run metadata, team tree (root + members), two Org trees, and a definition default launch config; stored model `claude-opus-4-7`.
- Approved transition followed without an unnecessary migration: `Yes`. Untouched data stays as stored (API-09 workspace-only, API-10 open-only); only a user save writes the canonical config.
- Cases: API-02, API-03, API-06, API-09, API-10, API-11, IMP-17.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`. The validator rule is generic (any undeclared key).
- Residual risk: FU-005.

## Compatibility / Legacy Scope Check

- Upstream introduces or tolerates backward compatibility in scope: `No`
- Compatibility-only behavior in implementation: `No`
- Durable coverage only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Added or updated by API/E2E this ticket: `Yes`

| Path / Test | Change | Case IDs | Removal Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts` | Updated in R1 (team-run and AgentOrg-run cases, helpers, header); unchanged in R2 | API-02, API-03 | — |

- Added or updated paths attached for proportional test-code review: `Yes` (mine above). The implementation's IR-002 test changes are listed in CRR-002.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Anthropic API (ENV-1) | canned stream via `globalThis.fetch` | credit-free default | the R1 live run covers the real API for the same file |
| AGY CLI (API-12) | scripted fixture `tests/fixtures/agy-failure-cli.mjs` (TESTING.md) | no model needed to prove server validation | none for this boundary |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| R1: TMP-EDIT-PROBE `it()`, mutation line in `anthropic-llm.ts` | Yes | restored | 0 markers, no diff |
| R1 + R2: backend :18080, Nuxt dev :13000, browser tabs | Yes | stopped / closed | none running; the user app (PID 52, :8000) was untouched |
| R1 + R2: temp data roots, `/tmp/api-e2e-home`, probe scripts' outputs | Yes | removed | removed |
| R1: stray `autobyteus-server-ts/db/apie2e.db` | Yes | deleted | removed |
| R2: an emptied fixture run (my seeding script's error) | Yes | discarded with the temp root | removed |
| rebuilt `autobyteus-ts/dist`, `autobyteus-server-ts/dist` | Yes | left (untracked build outputs of the current source) | — |

## Preliminary Classification (On `Fail`)

N/A in round 2. The R1 failure (Design Impact, CR-FO-001) is resolved by SR-004/SR-005 and IR-002 (API-06, API-09, API-10).

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (Medium / High: proportional test-code review), then delivery.
- Notes: FU-005 was added to `follow-ups.md` (non-urgent). RISK-6 is confirmed as designed.
