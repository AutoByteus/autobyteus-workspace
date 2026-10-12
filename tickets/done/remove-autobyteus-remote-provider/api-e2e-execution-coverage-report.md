# API/E2E Execution Coverage Report — remove-autobyteus-remote-provider

All paths below are relative to the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/` unless absolute.

## Execution Round Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-002 basis)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-003)
- Supplemental Task Artifacts: None are behavior-defining. Product Design: N/A — not applicable.
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Execution Round: 3
- Trigger: CRR-005 implementation re-review Pass for the IR-002 delta (commit 403eb2784, SR-004, ARCH-REV-002: single-valued `MultimediaRuntime` removed). Round 2 was CRR-002 TR-001; round 1 was CRR-001 Pass.
- Prior Round Reviewed: Round 2 (API-REV-002, Pass 95%)
- Latest Authoritative Round: 3

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with three deviations:
  1. **API-E2E-007A could not run.** The gated in-process LM Studio suite is Blocked by a baseline harness defect, so native-runtime proof with real LM Studio moved to the packaged isolated desktop instance (007D). That surface is more realistic.
  2. **The tracked Dockerfile does not build.** It has a baseline defect, so the image was built from a validation-only Dockerfile copy kept in the evidence folder.
  3. **The first local model was too slow.** The user stopped the run on `qwen/qwen3.8-27b` and provided `qwen/qwen3.6-35b-a3b`. Local-model runs were then executed one at a time.
- Existing coverage decisions revised during execution:
  - **Saved-selection E2E (API-E2E-004B).** The first run showed that a stopped native run whose saved model is unavailable cannot be switched to a current model in the stopped-run editor. The cause is the unchanged replacement rule "Both models need verified context capacities before replacement." (`run-model-selection-service.ts`, not in this branch's diff). A control in the desktop app showed the same result for an ordinary no-longer-offered LM Studio model.
  - **Round 2, TR-001.** The test no longer asserts that rule at all. Pinning it would lock in behavior that contradicts approved SCN-004 ("picks another model"), and it has nothing to do with the removal. The test keeps only the AC-004 assertions: the resume config shows the value, restore is refused with `MODEL_IDENTIFIER_NOT_AVAILABLE`, the metadata stays byte-identical, and a third start still lists the value and blocks. OBS-001 stays a separate-ticket candidate.
  - **Refused launch (API-E2E-004A).** A refused launch keeps the established `FAILED_ATTEMPT` package, so the test no longer asserts that no directory is created.
- Reroute required before or during execution: `No`
- Notes: The native `RuntimeKind.AUTOBYTEUS` runtime was treated as critical preserved behavior (AC-007) and proven with real local inference in the packaged app.

## Round 3 Delta (IR-002)

The IR-002 delta removes `MultimediaRuntime` and the media `runtime` option/field. Gemini client construction is now gated on `provider === GEMINI` (six checks across the image, audio and video models and factories). The server emits the literal `runtime: 'api'` for media rows (GraphQL shape unchanged, no web change), and the by-runtime video logging is gone.

- **Coverage gap found.** No durable test exercised the changed gate (`requiresGeminiRuntimeResolver`; the model `createClient` resolver required/not-allowed checks); the server media E2E mocks the factory.
- **New test.** I added `autobyteus-ts/tests/unit/multimedia/gemini-runtime-resolver-gate.test.ts` (7 tests):
  - Gemini image, audio and video models require the resolver and pass it to the client.
  - Non-Gemini models refuse it (`GEMINI_RUNTIME_RESOLVER_NOT_ALLOWED`) and construct without it.
  - Every registered media model reports `requiresGeminiRuntimeResolver === (provider === GEMINI)`.
  - Models expose no `runtime` field.
  - A mutation check (gate flipped to OPENAI) failed 2 tests; the file was reverted.
- **Combined media E2E file.** `server-owned-media-tools.e2e.test.ts` now holds the committed IR-002 hunk (mock `runtime` fields removed) and my uncommitted AC-004 case. Both are consistent.
- **Fresh-build reruns (logs under `api-e2e-evidence/logs/round3/`):**
  - core unit: 298 files / 2017 tests;
  - core tsc and server typecheck: exit 0;
  - server build: pass;
  - server unit: 665 files / 5230 tests;
  - server integration: 71 files pass; the 2 known content-cadence cases fail, same as base;
  - affected server E2E in a clean env: 30 files / 109 tests. This includes the leftover-startup test (media rows `runtime: 'api'`, `hostUrl: null`), saved-selection, the media tools test, and `gemini-speech-voice-tool.e2e`, which runs the real Gemini audio path with the resolver against a stubbed HTTP layer.
- **Static search.** `MultimediaRuntime` appears only in historical tickets and test-results logs; no media `.runtime` reads remain.
- **Not rerun, with rationale.**
  - Web suites: no web change and an unchanged GraphQL shape.
  - Desktop instance: media card rows come from the unchanged contract, and the literal `'api'` is asserted on the built server.
  - Docker: no entrypoint or Dockerfile change.
  - Live inference: the native LLM path is untouched by IR-002.
- **Confidence.** Unchanged at 95%.

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes` (Docker build failure; first desktop run interrupted by the user)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 26 (TR-001 rerun)
- Cases still running, interrupted, or not started: None
- Interruption note: the user interrupted the slow qwen3.8-27b run; it was terminated and replaced by qwen3.6-35b-a3b runs

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| REPO-001 | Pass | 1 | `api-e2e-evidence/logs/autobyteus-ts-unit.log` | — |
| REPO-002 | Pass | 6 | `logs/autobyteus-ts-tsc.log`, `logs/server-typecheck.log` | — |
| REPO-003 | Pass | 7 | `logs/server-unit.log` | — |
| REPO-004 | Pass (known baseline exception) | 15 | `logs/server-integration.log` | The 2 content-cadence failures are the TESTING.md known exception (reported product defect) |
| REPO-005 | Pass | 9 | `logs/server-build.log` | — |
| REPO-006 | Pass | 12 | `logs/server-e2e-affected.log` | — |
| REPO-007 | Pass | 14 | `logs/web-*.log` | — |
| REPO-008 | Pass | 16 | `logs/ac001-grep.log` | — |
| API-E2E-004A/B | Pass | 26 | `logs/server-e2e-new.log`; round 2 rerun `logs/server-e2e-saved-selection-tr001.log` | TR-001 applied; OBS-001 kept as an observation only |
| API-E2E-004C | Pass | 4 | console; `logs/server-e2e-affected.log` | — |
| API-E2E-004D | Pass | 3 | console; `logs/server-unit.log` | Observation OBS-002 |
| API-E2E-004 (UI run, UI media) | Pass | 23, 24 | `desktop/stopped-run-remote-model-unavailable.png`, `desktop/media-defaults-remote-unavailable.png` | OBS-001 |
| API-E2E-005 | Pass | 11 | `logs/server-e2e-new.log` | — |
| API-E2E-006 | Pass | 5 | console; `logs/server-e2e-affected.log` | Mutation check detected a removed frozen entry |
| API-E2E-002 | Pass | 18 | `desktop/api-keys.png`, `desktop/server-settings-quick.png` | — |
| API-E2E-007A | Blocked | 17 | `logs/lmstudio-native-runtime.log` | Baseline harness defect BAS-002; covered by 007D/007B |
| API-E2E-007B | Pass | 21 | `desktop/custom-provider-run-first-reply.png` | — |
| API-E2E-007C | Pass (credential path); paid inference Not Tested | 22 | `desktop/api-model-run-no-key.png` | No test key; production vault off-limits |
| API-E2E-007D | Pass | 20 | `desktop/lmstudio-run-*.png` | — |
| API-E2E-008 | Pass | 13 | `api-e2e-evidence/docker/*` | Baseline Dockerfile defect BAS-001 |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (no parser marker, alias, hidden setting or cleanup; the frozen table is migration-owned and its only importer is the backfill)
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`. The new tests assert the approved inert or unavailable outcomes for leftover data (REQ-006/007/008), not a compatibility path.
- Reroute classification: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-008 | AC-001; REQ-001/002/004/005/010 | Clean cut | `git grep` | Durable (static) | Pass | `logs/ac001-grep.log`: 0 matches in `src/`. Remaining matches are intentional fixtures, leftover-data doc notes and historical records. |
| API-E2E-002 | AC-002; BEH-003/004 | Settings rows, cards, model picker | Packaged isolated desktop app (DOM) | Desktop | Pass | Provider nav has no AutoByteus; cards are LM Studio / Ollama / AutoByteus VNC Hosts; no "AutoByteus LLM Hosts"; picker groups have no AutoByteus |
| API-E2E-003 (within 005/008) | AC-003; BEH-001/002 | Catalog and GraphQL | Built server and Docker GraphQL | Durable + Live | Pass | No AUTOBYTEUS in credential settings or snapshots; ensure/reload → `UNKNOWN_MODEL_PROVIDER`; `saveProviderApiKey` → `Unsupported built-in provider 'AUTOBYTEUS'.`; media rows `runtime: api`, `hostUrl: null` |
| API-E2E-004A | AC-004; BEH-007 | Native run launch with a remote id | Built server GraphQL | Durable | Pass | `createAgentRun` → success false, `MODEL_IDENTIFIER_NOT_AVAILABLE`; a current model still launches |
| API-E2E-004B | AC-004; BEH-007 | Stopped-run restore with a remote id | Built server across 3 starts | Durable | Pass | Value visible in the resume config; restore blocked with `MODEL_IDENTIFIER_NOT_AVAILABLE`; metadata byte-identical; third start still lists and blocks (round 2: pre-existing replacement rule no longer asserted, TR-001) |
| API-E2E-004C | AC-004 | Media default with a remote id | In-process tool path, real availability service | Durable | Pass | Image/speech tool rejects with `MODEL_IDENTIFIER_NOT_AVAILABLE`; no client; no file; setting kept |
| API-E2E-004D | AC-004 (launch profile) | Application current-model policy with the real `LLMFactory` | Unit | Durable | Pass | Blocking `CURRENT_MODEL_SELECTION_REQUIRED`, value kept, availability not consulted (OBS-002) |
| API-E2E-004 UI | AC-004 | Rendered unavailable states | Packaged app | Desktop | Pass | Stopped run: value and "No longer offered by AutoByteus. Choose another model before this run resumes."; media card: "Current: imagen@…" plus "not in the loaded catalog and will be preserved…"; re-select saved |
| API-E2E-005 | AC-005; BEH-008; QR-001 | Upgrade start with an encrypted orphan vault row plus the `.env` key | Built server, 3 lifetimes | Durable | Pass | Vault READY; leftover key listed as custom/deletable and deleted via GraphQL; the custom provider's discovery receives `Bearer <its key>` from the vault; orphan row byte-identical after all starts; no secret in output |
| API-E2E-006 | AC-006; REQ-008; CON-001 | Released backfill through real Prisma | Migration runner E2E | Durable | Pass | `AUTOBYTEUS` rows with empty or blank snapshot → "AutoByteus"; populated row untouched; non-provider fields preserved. Display unit: "AutoByteus:gpt-4o" from the snapshot |
| API-E2E-007B | AC-007; REQ-009; BEH-010 | Native runtime with a custom OpenAI-compatible model | Packaged app with real LM Studio `/v1` | Desktop + Live | Pass | Reply "MANGO"; terminate → reload → restore → recalled; id `openai-compatible:provider_local_gateway:qwen/qwen3.6-35b-a3b`, runtime `autobyteus` |
| API-E2E-007C | AC-007 | Native runtime with an API model | Packaged app | Desktop | Pass (credential path) | Run created on AutoByteus; "API key not provided for OPENAI…" |
| API-E2E-007D | AC-007 | Native runtime with an LM Studio host-scoped model | Packaged app with real LM Studio | Desktop + Live | Pass | Runtime label "AutoByteus" in the composer and run config; reply "PINEAPPLE"; terminate → reload → restore → recalled |
| API-E2E-008 | AC-008 | Docker entrypoint and server boot | `docker run` of the worktree image | Live | Pass | Fresh `.env` has 0 `AUTOBYTEUS_LLM_SERVER_HOSTS` even with `-e AUTOBYTEUS_LLM_SERVER_HOSTS=…`; health ok; 12 providers, no AUTOBYTEUS; upgrade start with the provider-era line keeps it as a custom deletable setting, and deletion works |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-ts exec vitest run tests/unit` | worktree | Core LLM/media | Pass (298 files / 2011 tests) | `logs/autobyteus-ts-unit.log` |
| 2 | `pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json`; `pnpm -C autobyteus-server-ts typecheck` | worktree | Production types | Pass | `logs/*tsc*.log`, `logs/server-typecheck.log` |
| 3 | `pnpm -C autobyteus-server-ts test:unit` | worktree | Server unit, incl. 2 added cases | Pass (665 files / 5230 tests; 4 files / 7 tests skipped) | `logs/server-unit.log` |
| 4 | `pnpm -C autobyteus-server-ts test:integration` | worktree (prepared) | Server integration | Pass except the 2 documented content-cadence cases | `logs/server-integration.log` |
| 5 | `pnpm -C autobyteus-server-ts build` | worktree | Current dist | Pass | `logs/server-build.log` |
| 6 | `env -i PATH HOME=<tmp> TMPDIR ./node_modules/.bin/vitest run tests/e2e/{llm-management,media,secret-management,token-usage,server-settings} tests/e2e/run-history/{stopped-run-model-config,removed-remote-provider-saved-selection}… tests/e2e/runtime/{runtime-capability,token-usage-runtime}… tests/e2e/agent-definitions/agent-definitions-graphql… --no-watch` | `autobyteus-server-ts` | Affected and new server E2E | Pass (30 files / 109 tests; 3 gated files skipped) | `logs/server-e2e-affected.log` |
| 7 | `pnpm -C autobyteus-web test:nuxt --run`; `test:electron`; `guard:web-boundary`; `guard:localization-boundary`; `audit:localization-literals` | worktree | Web, Electron main, guards | Pass (601 / 4174; 36 / 191; guards pass) | `logs/web-*.log` |
| 8 | `RUN_LMSTUDIO_E2E=1 … vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | `autobyteus-server-ts` | Native runtime with real LM Studio | Blocked (BAS-002) | `logs/lmstudio-native-runtime.log` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | +10 | AC-002/007/008 directly proven on the packaged app and in Docker; AC-004 rendered | Paid API-model inference and a real Ollama model not executed (shared paths; low risk) |
| Changed-boundary execution directness | 90% | 96% | +6 | Built server, real Prisma, packaged embedded server, real entrypoint | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | +10 | Real LM Studio inference through host-scoped and custom-provider adapters; real vault; media E2E keeps mocked factories (real factory covered by the availability unit test) | Ollama only at unit/catalog level |
| Environment, configuration, identity, and fixture fidelity | 85% | 93% | +8 | Orphan vault row encrypted with the unchanged entry crypto against the DB's own root key and domain; provider-era `.env` lines in the test runtime and Docker volume | The orphan row was injected, not written by a released app; no API key available |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | 95% | +7 | Multiple restarts, upgrade start, terminate/restore/continue, refused launch and restore, mutation check | — |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | +20 | Packaged isolated instance: Settings, picker, runtime label, unavailable states, media re-select, app restart | — |
| Durable regression coverage quality and relevance | 92% | 95% | +3 | 2 new built-server E2E files, 2 updated E2E files, 2 updated unit files; mutation check | The gated LM Studio suite remains stale (BAS-002) |

- Overall post-repository confidence: 85.7%
- Overall final confidence: 94.9% (≈95%)
- Calculation method: simple average of the seven applicable categories
- Confidence change produced by broader validation: +9.2 points (desktop, live local inference, Docker)
- Every critical acceptance criterion directly proven: `Yes` (AC-001..AC-008)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes` (94.9% rounds to 95%; no category below 93%)
- Confidence-limiting residual risks: no paid API-model inference; no real Ollama model; the orphan vault row was emulated rather than written by a released app

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required` — Project Desktop Validation (isolated instance), Live local inference (LM Studio), Lifecycle (Docker).
- Material deviation: 007A (gated in-process suite) was Blocked by BAS-002, and its intent was covered by 007D/007B in the packaged app. Docker was built from a validation-only Dockerfile (BAS-001).
- Confidence gap actually addressed: packaged embedded-server boot without the removed modules; native runtime with real models; rendered Settings and unavailable states; Docker entrypoint.
- Startup order, commands, readiness:
  - `docker build -f api-e2e-evidence/docker/Dockerfile.remote-server.validation -t autobyteus-api-e2e:remote-server-rarp .` → `docker run -d -p 127.0.0.1:<port>:8000 -e AUTOBYTEUS_LLM_SERVER_HOSTS=… -v <evidence>/fresh-data:/home/autobyteus/data` → `/rest/health` ok.
  - `pnpm --silent isolated-app start --build` → `iso-51478-6703` (control 51478, backend 51479), then driven with browser-automation (`CHROME_REMOTE_DEBUGGING_PORT=51478 BROWSER_AUTOMATION_ATTACH_ONLY=1`). `isolated-app restart` was used once for the media-default case.
- Environment choices: LM Studio at `127.0.0.1:1234` (the user's local service; model `qwen/qwen3.6-35b-a3b` provided by the user; one local-model run at a time). The isolated vault had no API keys.
- Seed data: the agent definition "Native Runtime Check" via instance GraphQL; LM Studio host via the Basics card; custom provider "Local Gateway" via the New Provider form; remote-id run metadata and media defaults as provider-era data.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Settings → API Keys | No AutoByteus row | Anthropic, DeepSeek, Gemini, GLM, Grok, Kimi, LM Studio, MiniMax, Mistral, Ollama, OpenAI, Qwen, New Provider | DOM; `desktop/api-keys.png` | Pass |
| Settings → Server Settings → Basics | No "AutoByteus LLM Hosts" | LM Studio, Ollama, AutoByteus VNC Hosts | DOM; `desktop/server-settings-quick.png` | Pass |
| New run composer | Runtime "AutoByteus", no AutoByteus provider group | `Model: … on AutoByteus`; groups have no AutoByteus | DOM; `desktop/new-run-composer-runtime-label.png` | Pass |
| LM Studio native run, restore | Reply; restore continues with memory | "PINEAPPLE" → Offline after terminate → restored, recalled "PINEAPPLE" | DOM; `desktop/lmstudio-run-*.png` | Pass |
| Custom-provider native run, restore | Same | "MANGO" → restored, recalled | DOM; GraphQL resume config | Pass |
| API-model native run without a key | Run created; clean error | "API key not provided for OPENAI…" | `desktop/api-model-run-no-key.png` | Pass |
| Stopped run with a remote saved model | Unavailable, value kept | Value and "No longer offered by AutoByteus…"; chooser "No models available" (same as the control) | `desktop/stopped-run-remote-model-unavailable.png` | Pass (OBS-001) |
| Media defaults with remote values after restart | Value kept, stale note, re-select | "Current: imagen@…", stale note; re-select saved `gpt-image-1.5` | `desktop/media-defaults-remote-unavailable.png`; GraphQL | Pass |
| Docker fresh and upgrade start | No key written; leftover inert and deletable | As expected | `docker/fresh-env.txt`, `docker/upgrade-env.txt`, `docker/*graphql.json`, `docker/container.log` | Pass |

## Desktop Application Validation

- Validation approach executed: an isolated instance built from this worktree (`--build`), driven over CDP; no deviation.
- Web-equivalent behavior: Settings, picker, run config, media card (DOM assertions, screenshots as support).
- Shell-specific or lifecycle behavior: the packaged embedded server booted (and rebooted on restart) without the removed `autobyteus-ts` modules; log has 0 uncaught/fatal lines (`logs/isolated-app-instance.log`).
- Effect on any already-running desktop application: `None`. The user's app and 4 other worktrees' instances were not touched.
- Behavior not directly proven: none material.

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin 25.5, arm64)
- Runtime: Node v22.23.1; packaged AutoByteus Electron 1.5.1 (enterprise build of this worktree); Docker Desktop 29.0.1 (node:22-bookworm image)
- Browser / engine: Electron renderer via CDP
- Local model: LM Studio, `qwen/qwen3.6-35b-a3b` (MLX)

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Directly Usable — No Migration` (backfill classifier frozen)
- Representative existing data exercised:
  - `.env` `AUTOBYTEUS_LLM_SERVER_HOSTS` with a value (test runtime) and empty (Docker provider-era line)
  - Encrypted vault row `provider.autobyteus.api-key`
  - Saved remote ids in run metadata and media default settings
  - Ledger rows with `model_provider='AUTOBYTEUS'`
- Direct-use result and evidence:
  - Every leftover was read through the normal current readers.
  - Startup was never blocked.
  - The leftover key appeared as an ordinary custom deletable setting.
  - The vault row was unchanged.
  - Saved ids were shown as unavailable and kept.
  - The backfill gave "AutoByteus".
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: low. The vault row was created with the unchanged entry crypto rather than by a released app.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (uncommitted in the worktree for test-code review)

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/secret-management/removed-remote-provider-leftover-startup.e2e.test.ts` | Added | AC-005/AC-003, REQ-004/007/009: upgrade start with an orphan vault row plus the `.env` key | Pass |
| `autobyteus-server-ts/tests/e2e/run-history/removed-remote-provider-saved-selection-graphql.e2e.test.ts` | Added (round 2: reselection block removed per TR-001) | AC-004/AC-007: launch refused; stopped run value kept, restore blocked; current model still launches | Pass (2 tests; round 2 rerun in a clean env with the built dist) |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts` | Updated (+1 case) | AC-006/CON-001: AUTOBYTEUS rows through real Prisma | Pass; mutation detected |
| `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Updated (+1 case) | AC-004: remote media defaults unavailable, setting kept | Pass |
| `autobyteus-server-ts/tests/unit/application-platform/application-current-model-selection-policy.test.ts` | Updated (+1 case) | AC-004 launch profile: blocking `CURRENT_MODEL_SELECTION_REQUIRED` | Pass |
| `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts` | Updated (+1 case) | REQ-008: history displays "AutoByteus" from the snapshot | Pass |
| `autobyteus-ts/tests/unit/multimedia/gemini-runtime-resolver-gate.test.ts` | Added (round 3) | SR-004/IR-002: Gemini resolver gate decided by provider alone; no media `runtime` field | Pass (7 tests); mutation detected |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (none removed this round)
- Also uncommitted in the worktree, at the user's request: a one-bullet `TESTING.md` addition ("Local model servers share limited compute"). TESTING.md asks that it be committed on its own as `docs(testing): …`.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/logs/*` | Command logs | Retained | — |
| `api-e2e-evidence/desktop/*.png` | Desktop screenshots (supporting) | Retained | — |
| `api-e2e-evidence/docker/*` | Container env, GraphQL results, log, validation Dockerfile | Retained | Data volume removed |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `api-e2e-evidence/docker/Dockerfile.remote-server.validation` | The tracked Dockerfile fails on base (BAS-001) | Image built and ran | Image and container removed; file kept as evidence (not product source) |
| `/tmp/rarp-probe/*` (debug script, browser wrapper) | Leftover-setting debug; CDP wrapper | Debug confirmed the test-side newline cause | Temporary, outside the repo |
| Desktop journey via browser-automation `run-script` | Packaged-app validation surface | See the journey table | Instance stopped |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Custom-provider endpoint (API-E2E-005) | Loopback HTTP endpoint recording `Authorization` | Hermetic durable test | None for the vault-resolution assertion |
| Media client factories (API-E2E-004C) | Existing file's factory mocks | The established boundary of that file | Real-factory `hasRegisteredModel` covered by `model-availability-service.test.ts` |
| Released vault writer | Unchanged `encryptSecretEntry` | The released importer alias has been removed | Byte-format-identical; low |
| Paid API provider | Not used | No test key; production vault off-limits | Inference path for API models not executed |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | REPO-001..008, API-E2E-002, 004A–D, 004 UI, 005, 006, 007B, 007C (credential path), 007D, 008 | All acceptance criteria AC-001..AC-008 directly proven |
| Blocked | API-E2E-007A | Baseline harness defect BAS-002 (not this branch); its intent is covered by 007D/007B |
| Not Tested | Paid API-model inference; real Ollama model | No test key; Ollama not installed. Both share the changed paths already proven with LM Studio and custom providers |

### Observations And Baseline Items (Not Failures Of This Change)

- **OBS-001 — Pre-existing product behavior (separate-ticket candidate).** A stopped native run whose saved model is no longer offered shows "No longer offered by AutoByteus. Choose another model before this run resumes.", but the chooser shows "No models available". The server refuses any swap ("Both models need verified context capacities before replacement.", `run-model-selection-service.ts:68`, not in this diff). The same happens for an ordinary unavailable LM Studio model, so the run cannot be resumed and the user must start a new run. It also happened before this change, because the remote model was undiscoverable once the server was gone. It meets AC-004 (unavailable, blocked, value kept, nothing substituted); after TR-001, no durable test asserts it. The SCN-004 step "picks another model" is achievable for definitions, launch profiles and media defaults, but not for stopped native runs.
- **OBS-002 — Wording.** A saved application launch profile with a remote id is now blocked as `CURRENT_MODEL_SELECTION_REQUIRED` ("The selected model is no longer supported. Select a current supported model.") instead of `MODEL_UNAVAILABLE`. It is still blocking and the value is kept; the requirements left per-surface wording open.
- **BAS-001 — Baseline Docker defect.** `docker/Dockerfile.remote-server` and `docker/Dockerfile.allinone` do not copy or build the `autobyteus-agent-presentation-contracts` and `autobyteus-collaboration-stream-contracts` workspace packages that `autobyteus-server-ts` depends on, so `pnpm install` fails (`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`). Both Dockerfiles are unchanged from base, so this fails on base too. The fix is a product/ops change. Rule 9: report to the owner (validation copy shows the fix shape).
- **BAS-002 — Baseline gated-suite defect.** The `RUN_LMSTUDIO_E2E` suite in `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` fails in setup: "Studio application API services are not configured" (required since 37d05c7f7). With `configureE2eStudioApplicationApiServices()` the next blocker is `agentRunService` not implemented. Repairing it needs real run-service and websocket wiring across three runtime suites, which is too large for this round. Rule 9: report to the owner. The partial fix was reverted.
- **Note.** The renderer caches server settings per backend binding until the app restarts. External API writes were therefore invisible until `isolated-app restart`. This is pre-existing behavior and not part of a real-use scenario.

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built test servers, runtimes, DBs | Mine (harness) | `removeOwnedTestRuntime` / SIGKILL fallback | `tests/.tmp` empty |
| Isolated instance `iso-51478-6703` | Mine | `isolated-app stop` | Data root removed; ports released |
| Docker container `rarp-ac008-fresh`, image `autobyteus-api-e2e:remote-server-rarp`, bind-mounted data | Mine | `docker rm -f`, `docker rmi`, `rm -rf` | Removed |
| Desktop run `qwen3.8-27b` | Mine | Terminated | Done |
| LM Studio | User's | Not stopped; the user's `qwen3.6-35b-a3b` left loaded; the qwen3.8 model I triggered was already replaced by the user | Unchanged by me |
| Other isolated instances (4) | Others | Untouched | — |

## Preliminary Classification

N/A (Pass). OBS-001 is a separate-ticket candidate for the Solution Designer and product. BAS-001 and BAS-002 are baseline items for their owners.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95% (94.9%)
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — executed (packaged desktop instance, live LM Studio inference, Docker)
- Critical acceptance criteria lacking direct proof: None
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: see handoff
- Notes: Round 3 validated the IR-002 delta: one durable unit test added for the changed Gemini resolver gate; fresh-build reruns all pass; confidence 95%. Round 2 applied Local Fix TR-001 (test only) and reran the affected file: 2/2 pass. Confidence is unchanged. The native AutoByteus runtime was proven unchanged with real LM Studio and custom-provider models (launch, reply, terminate, restore, continue) and the "AutoByteus" label. The durable test changes and the TESTING.md bullet are uncommitted, awaiting test-code review and commit.
