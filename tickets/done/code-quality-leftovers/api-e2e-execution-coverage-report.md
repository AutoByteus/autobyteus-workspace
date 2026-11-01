# API/E2E Execution Coverage Report — code-quality-leftovers (autobyteus-357)

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; CRR-002 pass. Code last changed in `534ad1f55e`; HEAD was `0d2aa6f593`, docs only after the code.
- Prior round reviewed: none.
- Deviations from the investigation's plan:
  - API-04 planned the `RUN_LMSTUDIO_E2E` backend-factory integration suite. That suite has rotted before this ticket (FU-004), so the same real-model request path was proven with the LM Studio case of `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`, which goes through the full server.
  - Three gated or probe tests carried expectations made stale by earlier tickets in the base. They were fixed as labelled baseline fixes (TESTING.md Rule 9), each in its own commit.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`; architectural risk: `High`; input route: `Reviewed`; successful-output route: `Code Review`.
- Proportional test-code review decision: `Required`, for the three baseline test fixes (this round's only durable test changes).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `534ad1f55e` code; server rebuilt (`prebuild` + `build`) from this tree before the runs | macOS 26 arm64, Node 22 | in-process and built test servers; scripted AGY CLI | `env -i PATH HOME=<temp> TMPDIR`; `RUN_AGY_FAILURE_E2E=1` |
| ENV-2 | same | macOS arm64 | Projects probe stack: 2 backend nodes, Nuxt dev, headless Chrome | `env -i`; owned temp root |
| ENV-3 | same | macOS arm64 | Settings stack: built server, Nuxt dev, headless Chrome; **real LM Studio** at 127.0.0.1:1234 (model list only) | Ollama pointed at a closed port |
| ENV-4 | same | macOS arm64 | In-process server; **real LM Studio** `qwen/qwen3.6-35b-a3b` (loaded just-in-time by the run, unloaded afterwards) | `RUN_RUNTIME_TOKEN_USAGE_E2E=1`, `LMSTUDIO_MODEL_ID` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | REQ-001, 003, 005, 006; AC-001, 003, 005, 006 (searches, typechecks, unit suites, compaction readers, codegen) | repository | Reused IMP-01…IMP-09, IMP-12, IMP-13, IMP-15, IMP-16 | — | Pass | (implementation evidence) | IMP-06 `Tests  7659 passed`; IMP-04 compaction suites; IMP-05 `Tests  63 passed (63)`; IMP-02 every AC-001 name `0 hits` | `git diff --name-only 534ad1f55e 0d2aa6f593` outside `tickets/` is empty; IR-002's effect is covered by IMP-16 |
| API-R02 | AC-002 (fake endpoint), AC-004 (subset) | Settings browser; server E2E subset | Reused IMP-10, IMP-11, IMP-14, IMP-17 | — | Pass | — | IMP-17 `settings sources check: Pass` | Same code |
| API-01 | AC-004; 147, 178, 157, 54.3 | gated server E2E folders | build, then `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects tests/e2e/run-history tests/e2e/agent-team-runs tests/e2e/agent-org-runs tests/e2e/agent tests/e2e/llm-management tests/e2e/secret-management --no-watch` | ENV-1 | Pass (after a baseline fix) | `API-01-server-e2e-gated.log`, `.full.log.gz` | `Test Files  1 failed \| 64 passed \| 2 skipped (67)`, `Tests  1 failed \| 268 passed \| 4 skipped (273)`; the fixed test alone: `Tests  1 passed (1)` | All 22 gated projects suites, persistence, Team, Org, Agent, source and secret-management suites passed. The one failure, `scoped-org-history-graphql`, expected `llmConfig { unsupported_setting: true }` to refuse an Org start. Since `47f44c3df6` (in the base) undeclared keys are left out, and that commit updated its sibling suites but missed this one. Baseline fix `e2c1b604d7`: an invalid value of a declared setting, as `stopped-org-workspace-graphql` does |
| API-02 | 147 (REST context-file journey) | browser Projects pages, REST `task-context-drafts` | `env -i … pnpm -C autobyteus-web test:e2e:projects --skip-server-build --output-dir=<ev>/API-02-projects-probe` | ENV-2 | Pass (after a baseline fix) | `API-02-projects-probe.log`, `API-02-projects-probe/result.json`, screenshots; attempt 1 in `API-02-projects-probe-attempt1/` | `result.json` `"result": "Pass"`, 17/17 cases; PT-E2E-005 (typed and file save), PT-E2E-006 (HTTP download, context kept through edit), PT-E2E-010 (context bytes after a real backend restart); cleanup `tempRootRemoved: true` | Attempt 1: 16 Pass, PT-E2E-017 failed ("Enter on a loop option adds nothing"). Since `cba9eca3ef` (autobyteus-320 item 5, in the base) the Depends-on picker's first active option is the first choosable one. Baseline fix `8e011a01bd` asserts that instead |
| API-03 | AC-002, REQ-002 (real host, PARTIAL) | browser Settings → providers; GraphQL sources | `env -i PATH HOME TMPDIR node <ev>/API-03-settings-lmstudio-check.mjs --output-dir <ev>/API-03-settings` | ENV-3 | Pass | `API-03-settings-lmstudio.log`, `API-03-settings/evidence.json`, `API-03-settings/0[1-4]-*.png` | `checks`: `lmStudioReady` (a real model listed), `ollamaUnavailable` "Models unavailable", `lmStudioPartial` "Some model sources were unavailable" with models kept, `lmStudioReadyAgain` notice gone; `distinctStates` include `READY`, `ERROR`, `PARTIAL`; `distinctSourceKeySets` `__typename,failedUnitCount,modelCount,safeMessage,state,successfulUnitCount` (no `modelKind`); `graphqlErrors: []`; cleanup `dataRootRemoved: true` | Ticket-owned driver adapted from IMP-11. PARTIAL comes from `LMSTUDIO_HOSTS` = the real host plus a closed port, set through the app's `updateServerSetting` |
| API-04 | AC-006 (request path), REQ-006; 54.1/54.2 | a real native agent turn on a local model through the server (GraphQL + WebSocket) | `env -i … RUN_RUNTIME_TOKEN_USAGE_E2E=1 LMSTUDIO_MODEL_ID=qwen/qwen3.6-35b-a3b:lmstudio@localhost:1234 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts -t lmstudio --no-watch` | ENV-4 | Pass (after a baseline fix) | `API-04-lmstudio-native-run.log`, `.full.log.gz` | `✓ persists token usage from a real autobyteus-lmstudio-qwen35 runtime turn and exposes it through GraphQL` | Attempt A, the planned backend-factory integration suite, has rotted: no model found (discovery left `LLMFactory` in `16b5696716`), then stale doubles (`hasEffectiveSkills`, `createAgentRun`). Recorded as FU-004. Attempt B's real turn ran but the suite's shared list lacked `local_no_api_bill`, the local pricing policy since August. Baseline fix `75f2fffe57`. LM Studio had nothing loaded before; `qwen/qwen3.6-35b-a3b` was unloaded after each run |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-R01 (IMP-02) | Proven | — |
| AC-002 | Yes | API-03 (real LM Studio: READY, PARTIAL, READY again; Ollama ERROR), API-R02 (IMP-11/17: READY, STALE_ERROR, ERROR), API-R01 (compaction suites) | Proven | Ollama on a real host was not available on this machine; it shares the same dynamic-source path, and its ERROR state was shown |
| AC-003 | No | API-R01 (IMP-12) | Proven | — |
| AC-004 | Yes | API-01, API-02, API-R01 (IMP-04/06/08) | Proven | — |
| AC-005 | No | API-R01 (IMP-02) | Proven | — |
| AC-006 | Yes | API-R01 (IMP-02 search; IMP-05 recovery fixture, harness suites, native-input-history; IMP-04 compaction tests), API-04 (real request path) | Proven, apart from the live compaction scenario | The live-e2e harness's real compaction scenario (lines 926–930) was not run. TESTING.md: a live compaction run "is not required proof for a ticket … Run one only when the user asks for it." AC-006's own fallback (typecheck plus the scripted suites) is met. The user can ask for that run |
| AC-007 | No | API-R01 (DESIGN.md rule 11 present; code review) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 96% | API-01…04, reused IMP | Live compaction (by rule) | A user-requested live compaction run |
| Changed-boundary execution directness | 90% | 96% | real GraphQL/REST, browser, real local model | — | — |
| Cross-boundary integration realism and mock gap | 88% | 95% | real LM Studio host and model; scripted AGY for delegation | Paid providers not run (not needed) | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | owned stacks; real local model server | Ollama not available | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | ERROR, PARTIAL, STALE, restart (PT-E2E-010), closure (gated suites) | — | — |
| User-surface, browser, and desktop-shell confidence | 90% | 95% | API-02, API-03; IMP-11/17 | No desktop-shell change | — |
| Durable regression coverage quality and relevance | 90% | 95% | 3 baseline fixes restore suites to current behavior | FU-004 (rotted LM Studio suite) | — |

- Overall post-repository confidence: 90%
- Overall final confidence: 95.3% (simple average)
- Every critical acceptance criterion directly proven, apart from a part the user can request: `Yes`
- Any final applicable category below `90%`: `No`
- Default target met: `Yes`
- Residual risks:
  - The live compaction harness check runs only on a user-requested live run.
  - `CompactionAttempts` numbering is heuristic (code review); no compaction retry scenario was added here.
  - FU-004.

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed.
- Execution mode: Live API (gated server E2E), Browser (Projects, Settings), Live local model (LM Studio).
- Gap addressed: real roots and Task closure (147/178/157), the REST context-file journey, the Settings sources on a real host with PARTIAL (54.3/54.4), and a real model request (54.1/54.2).
- Desktop shell: no shell change; not run.

## Persisted-Data Transition Checks

`Not Affected`. The renamed outcomes are in-process. Persistence and restart suites in API-01 (run-history, Team, Org, Agent) and PT-E2E-010 read and write real records through them.

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`. Compatibility-only behavior observed: `No`.
- Durable coverage for compatibility-only behavior: `No`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed this round: `Yes` (baseline fixes, TESTING.md Rule 9)

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-org-runs/scoped-org-history-graphql.e2e.test.ts` | Updated (`e2c1b604d7`) | API-01 | An invalid declared setting instead of an undeclared key (stale since `47f44c3df6`) |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | Updated (`8e011a01bd`) | API-02 | PT-E2E-017 asserts the first choosable option is active (stale since `cba9eca3ef`) |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Updated (`75f2fffe57`) | API-04 | The LM Studio case expects `local_no_api_bill` (the local pricing policy) |

- Attached for proportional test-code review: `Yes`.
- Ticket-owned temporary driver (not durable): `evidence/api-e2e/API-03-settings-lmstudio-check.mjs`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Agent runtimes for delegation journeys | Scripted AGY CLI | TESTING.md: real delegation without provider calls | Not paid inference |
| A host that fails | A closed local port | Real failure mode, owned | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Gated E2E temp data and HOMEs | Yes | suites' cleanup | Removed |
| Projects probe stack | Yes | probe cleanup | `tempRootRemoved: true`, ports released |
| Settings stack | Yes | driver `finally` | `dataRootRemoved: true` |
| LM Studio model `qwen/qwen3.6-35b-a3b` | Loaded by this run | `lms unload` after each run | All four models `not-loaded`, as before |
| `/tmp/357-probe/list.mjs` (discovery diagnosis) | Yes | removed | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none. The live compaction scenario of the live-e2e harness was not run, by TESTING.md; the user can request it.
- Next recipient from `get_handoff_rules`: the code reviewer (Large / High: proportional test-code review of the three baseline fixes).
- Notes:
  - Follow-up FU-004 was added (rotted LM Studio suites).
  - Out of scope, for delivery: the base branch is 11 commits ahead.
