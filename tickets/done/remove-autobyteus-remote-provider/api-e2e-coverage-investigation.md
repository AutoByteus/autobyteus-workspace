# API/E2E Coverage Investigation — remove-autobyteus-remote-provider

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/requirements-doc.md` (Approved, SR-002 basis)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts: None are behavior-defining. Implementation rendered check: `implementation-checks/settings-removal-run-1/result.json` (evidence only). Product Design: N/A — not applicable.
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/api-e2e-test-case-ledger.md`
- Current Investigation Round: 3
- Trigger: Round 1, CRR-001 Pass. Round 2, CRR-002 TR-001 (test-only). Round 3, CRR-005 Pass for the IR-002 delta (MultimediaRuntime removed; SR-004, ARCH-REV-002).
- Prior Investigation Reviewed: Rounds 1-2
- Latest Authoritative Investigation: Round 3 (this file)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (changed durable test code goes back to the code reviewer)

## Current Requirement And Design Basis

The remote AutoByteus LLM/image/audio provider is removed as a clean cut. That covers discovery, adapters, the client, the four `AUTOBYTEUS` enum members, the Settings row and the "AutoByteus LLM Hosts" card, the credential paths, the AutoByteus-only preprocessor, the Docker env line, the live-E2E scenarios and the docs (REQ-001..005, REQ-010). Saved data is not migrated (DEC-002):

- A saved remote model identifier shows as unavailable and blocks launch, resume and generation. It is not cleared and nothing is substituted (REQ-006 / AC-004).
- A leftover `.env` host key is listed as an ordinary deletable custom setting, and the leftover vault row is never read. Startup is never blocked (REQ-007 / AC-005).
- Token-usage history is preserved, and the released backfill migration keeps its released output by reading a frozen table (REQ-008 / AC-006).

The native agent runtime `RuntimeKind.AUTOBYTEUS`, its "AutoByteus" label, saved native runs and every other provider must behave exactly as before (REQ-009 / AC-007). The user explicitly cares about this. Design spines DS-001..DS-005 define the production paths. The persisted-data decision is `Directly Usable — No Migration`, with the backfill classifier frozen as a code repoint.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-006, plus the CON-001 released-migration contract.
- Real-use scenarios added from investigating the implemented behavior:
  - **SCN-004a — saved application launch profile.** Trigger: application launch / host-capability validation. A remote identifier is no longer parsed as host-scoped, so `ApplicationCurrentModelSelectionPolicy` sends it to `LLMFactory.requireCurrentModelIdentifier`. It is now blocked with `CURRENT_MODEL_SELECTION_REQUIRED` ("The selected model is no longer supported…"). Before this change the outcome was `MODEL_UNAVAILABLE` (from a dynamic availability check). It still blocks launch and keeps the value; see Ambiguities.
  - **SCN-004b — saved stopped native run.** Trigger: the user restores a stopped run whose metadata names a remote model, then re-selects a current model through the stopped-run model-config editor and restores again.
  - **SCN-005a — upgrade with other credentials present.** Trigger: a server restart on a database that holds the orphan vault row plus a working custom-provider key; the custom provider's discovery must still receive its key from the vault.
  - **SCN-006a — native runtime with a custom OpenAI-compatible provider.** Trigger: a user-created custom provider pointing at a real local OpenAI-compatible endpoint, used for a native run launch and restore.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/002 remote LLM/media discovery and catalog sources | Removed | design DS-001; CRR-001 | Catalog has no AUTOBYTEUS; ensure/reload with AUTOBYTEUS is rejected (AC-003). Unit plus rendered GraphQL evidence exists; re-verify on a built server. |
| BEH-003/004 Settings row and hosts card | Removed | DS-002 | Web unit tests plus a rendered check exist; desktop-instance proof is planned. |
| BEH-005 credential paths | Removed | DS-003 | Unit tests (credential catalog, alias registry, readiness adapter). AC-001 static search. |
| BEH-006 AutoByteus-only preprocessor | Removed | DS-003 | Loader unit test; a saved definition naming it hits the existing unknown-name skip. |
| BEH-007 saved remote selections | Preserved outcome via a new path | DS-004 | Unit test of the availability service. **E2E is missing** for launch, resume and media default. |
| BEH-008 leftover `.env` key and vault row | Preserved (inert) | DS-004 | Settings unit test plus a rendered `.env` check. **No real vault-row startup proof yet.** |
| BEH-009 token history and backfill | Preserved (classifier frozen) | DS-005 | Unit classification test. **No real-Prisma backfill run with AUTOBYTEUS rows yet.** |
| BEH-010 native runtime and other providers | Preserved | Empty diff on runtime folders | Existing suites; real runtime launch/restore with LM Studio, custom and API models planned. |
| Docker entrypoints | Changed (line removed) | REQ-010, AC-008 | `bash -n` only so far; container start planned. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Catalog, availability, credential catalog, settings service, readiness, factories | Server and core unit suites | Real built-server composition | Server E2E on a built server |
| API / transport / contract | Yes | GraphQL provider list, ensure/reload, saveProviderApiKey, settings, createAgentRun/restore | Unit GraphQL resolver tests; rendered probe | Saved remote identifiers over real GraphQL | Built-server E2E |
| Frontend component / state | Yes | Endpoint cards, provider runtime, stores | Web unit tests (601 files) | None material | — |
| Browser integration / user journey | Yes | Settings pages | Implementation browser probe (web-equivalent) | Packaged app | Isolated desktop instance |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Settings, runtime label, unavailable model display | Web tests, rendered check | Packaged renderer with the real embedded server | Isolated desktop instance |
| Desktop shell / Electron-specific integration | Indirect | Embedded server bundle no longer contains the removed modules; Electron spec sample key | test:electron | Packaged embedded-server boot | Isolated desktop instance |
| Process / lifecycle | Yes | Server startup with leftovers; Docker entrypoint | Unit tests; `bash -n` | Real restart with a vault row; container start | Built-server restart E2E; Docker |
| Persisted-data transition | Yes | `.env` key, vault row, saved identifiers, ledger rows | Unit tests | Real stores | Built-server E2E; real-Prisma migration E2E |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes (removed) | The remote server is gone; LM Studio, Ollama, custom and API remain | Unit tests | Real runtime inference with the remaining providers | LM Studio gated suite; custom provider pointed at the LM Studio endpoint; a cheap API call if a test vault key exists |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider` (branch `codex/remove-autobyteus-remote-provider`, HEAD `ac3868577`)
- Project type and runtime stack: pnpm monorepo. TypeScript core (`autobyteus-ts`), Fastify/GraphQL/Prisma SQLite server (`autobyteus-server-ts`), Nuxt/Electron web (`autobyteus-web`), Docker images.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/TESTING.md` (the worktree version governs; the superrepo checkout's TESTING.md is an older long-form variant and is not authoritative for this branch).
- Conflicting, missing, or unclear project instructions: None.
- Required environment variables or secrets available: `N/A` for hermetic suites. LM Studio is running locally (`127.0.0.1:1234`). Ollama is not running. API keys in a test-owned vault are still to be checked (no secret values are recorded).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` (worktree) | Testing guideline | Layers and commands; clean env for E2E (`env -i PATH HOME TMPDIR`); built `dist/app.js` must be current; serialize builds; isolated desktop for full product journeys; never touch the user's app or data; stop owned instances |
| `AGENTS.md` (repo) | Repo instructions | Read DESIGN.md / TESTING.md |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Built-server E2E harness | `materializeTestRuntime`, `startBuiltTestServer`, `resolveTestDatabaseLocation` (`db/` under the server), `removeOwnedTestRuntime` |
| `docs/isolated-app-instances.md` | Desktop instance tool | `pnpm --silent isolated-app start --build`, `list`, `stop <id>`; CDP control port |
| `docker/Dockerfile.remote-server`, `docker/remote-server-entrypoint.sh` | Docker server image | Builds the server inside the image; the entrypoint upserts env keys then execs `dist/app.js` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built test server | `autobyteus-server-ts` | `startBuiltTestServer` (inside the E2E files) | Owned runtime root under `tests/.tmp`, DB under `db/` | Harness readiness | `server.stop()` + `removeOwnedTestRuntime` |
| LM Studio (user's local service) | — | Already running | Read-only model listing and inference; no credits | `GET /v1/models` | Not started by me, not stopped |
| Isolated desktop instance | repo root | `pnpm --silent isolated-app start --build` | Own ports and data folder | `start` JSON result | `pnpm --silent isolated-app stop <instanceId>` |
| Docker remote-server image | repo root | `docker build -f docker/Dockerfile.remote-server -t autobyteus-api-e2e:remote-server-rarp .` | New tag owned by this run | HTTP GraphQL on the mapped port | `docker rm -f` the container; `docker rmi` the tag |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Leftover vault row `provider.autobyteus.api-key` | Encrypted with the unchanged `encryptSecretEntry` (byte-identical format to the released writer) against the test DB's own root key and domain; inserted while the server is stopped | Test-owned DB only | Removed with the runtime |
| Leftover `.env` host key | Appended to the materialized runtime `.env` | Test-owned | Removed with the runtime |
| Ledger rows with `model_provider='AUTOBYTEUS'` | Prisma insert as in the existing backfill E2E | Test DB | Deleted in `afterEach` |
| Saved remote model in run metadata | Rewriting an owned stopped run's `run_metadata.json` to the released shape a provider-era run would carry | Test-owned runtime | Removed with the runtime |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration` for the `.env` key, vault row, saved identifiers and ledger rows. The released backfill classifier is frozen.
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: each leftover shape is created exactly as a provider-era install would hold it, then exercised through the normal current reader (startup, settings list, vault resolution, availability, restore, migration runner).
- Evidence planned: built-server restart E2E (vault and `.env`), built-server GraphQL E2E (saved selections), real-Prisma migration runner E2E (ledger).
- Migration-specific scenarios: N/A (no migration). The frozen backfill must give the same output, which is checked through the real Prisma adapter.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| server `tests/unit/llm-management/services/model-catalog-service.test.ts` | Catalog without AUTOBYTEUS; ensure/reload AUTOBYTEUS rejected; Ollama retargeted | AC-003 | Still Valid | Reviewed diff | Run |
| server `tests/unit/llm-management/services/model-availability-service.test.ts` | Remote LLM, image and audio identifiers → `MODEL_IDENTIFIER_NOT_AVAILABLE`, using the real factories | AC-004 | Still Valid | Diff | Run |
| server `tests/unit/application-platform/application-current-model-selection-policy.test.ts` | Dynamic identifiers delegate to availability | AC-004 (launch profile) | Still Valid; missing the remote-identifier case | Code read | Update (add a case) |
| server `tests/unit/secret-management/provider-credential-catalog.test.ts` | Remaining bindings; AUTOBYTEUS consumer and secret ID rejected | REQ-004 | Still Valid | Diff | Run |
| server `tests/unit/services/server-settings-service.test.ts` | Leftover key is a custom deletable setting | AC-005 | Still Valid (mocked env) | Diff | Run; real restart E2E to be added |
| server `tests/unit/app-data-migrations/token-usage-provider-name-snapshot-backfill-migration.test.ts` | Classifier maps AUTOBYTEUS → "AutoByteus" | AC-006 | Still Valid (pure classifier) | Diff | Run; real-Prisma case to be added |
| server `tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts` | Real Prisma adapter and runner behavior | AC-006 | Still Valid; no AUTOBYTEUS row | Code read | Update (add AUTOBYTEUS rows) |
| server `tests/e2e/secret-management/{provider-secret-lifecycle-graphql,server-restart-secret-lifecycle}.e2e.test.ts` | Vault lifecycle retargeted to LM Studio | REQ-004/009 | Still Valid | Diff | Run |
| server `tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Media tools with mocked factories; `hasRegisteredModel` mocks | REQ-002/006 | Still Valid; no remote-default case | Code read | Update (add a remote default model case) |
| server `tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts` | Stopped native-run model config and restore | AC-007 | Still Valid | Code read | Run |
| server `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` (AutoByteus suite, `RUN_LMSTUDIO_E2E=1`) | Native runtime create/stream/restore/tool approval with an LM Studio model | AC-007 | Still Valid (gated) | Code read | Run gated |
| server e2e `llm-management/*`, `token-usage/token-usage-model-list`, `server-settings/*`, `runtime/runtime-capability-graphql` | Catalog and metadata, model list, settings | AC-003/009 | Still Valid | Diff (env-line removals) | Run |
| core `tests/unit/**` (retargeted summary-port, dynamic identifiers, normalizers, multimedia enums) | LLM/media layer without the remote provider | REQ-001/002 | Still Valid | Run: 298 files / 2011 tests pass | Done |
| web `test:nuxt` specs (endpoint cards, settings manager, provider runtime, stores) | No card or row; leftover key is a custom row | AC-002 | Still Valid | Diff | Run |
| web `test:electron` (`serverRuntimeEnv.spec.ts`) | Sample key retargeted | REQ-010 | Still Valid | Diff | Run |
| Deleted remote-only tests (core clients/LLM/media/gateway; server discovery service and preprocessor tests) | Remote-provider behavior | REQ-001/002/005 | Stale / Remove (already removed by the implementation per the design list) | design "Delete the remote-only tests" | None; the decision is confirmed |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-E2E-005 | Upgrade restart with a real encrypted orphan vault row plus the leftover `.env` key: normal start, vault READY, no AUTOBYTEUS, leftover listed custom/deletable and deletable over GraphQL, orphan row byte-identical, another provider's vault key still resolved (custom-provider discovery receives `Bearer <key>`), ensure/save with AUTOBYTEUS rejected | AC-005, AC-003, REQ-004/007/009; DS-004 | `autobyteus-server-ts/tests/e2e/secret-management/removed-remote-provider-leftover-startup.e2e.test.ts` (new) | Only unit and mocked evidence exists; a startup lockout is the cross-cutting invariant |
| API-E2E-009 (round 3) | Gemini runtime resolver gate decided by provider alone (`createClient` required/not-allowed; `requiresGeminiRuntimeResolver` for every registered media model); no media `runtime` field | SR-004 / IR-002; CR-001 | `autobyteus-ts/tests/unit/multimedia/gemini-runtime-resolver-gate.test.ts` (new) | No durable test covered the changed gate; the server media E2E mocks the factory |
| API-E2E-004A/B | `createAgentRun` with a remote identifier is blocked; a stopped native run whose saved model is remote fails to restore, keeps its value, then is re-selected through the editor and restores | AC-004, AC-007; DS-004 | `autobyteus-server-ts/tests/e2e/run-history/removed-remote-provider-saved-selection-graphql.e2e.test.ts` (new) | Only service-level unit proof exists |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-E2E-006 | `tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts` | Add AUTOBYTEUS ledger rows (empty and blank `provider_name`, plus a populated snapshot) run through the real Prisma adapter and runner → "AutoByteus"; populated row untouched | AC-006, CON-001 | Proves the frozen table through the real store |
| API-E2E-004C | `tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Remote-style default image and speech models → tool rejects with `MODEL_IDENTIFIER_NOT_AVAILABLE`; no client constructed; no file; setting value unchanged | AC-004 (media default) | Existing boundary of that file (real availability service and tool path) |
| API-E2E-004D | `tests/unit/application-platform/application-current-model-selection-policy.test.ts` | Remote identifier → blocking `CurrentModelSelectionRequiredError`; availability not consulted | AC-004 (launch profile) | Pins the observed SCN-004a outcome |

## Durable Coverage To Remove

None beyond the remote-only tests already deleted by the implementation per the design's list. Those were confirmed as stale: they assert decommissioned remote-server behavior, and their generic counterparts were retargeted (DEC-003).

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-ts exec vitest run tests/unit` | worktree | Core LLM/media layer | Pass (298 files / 2011 tests) | `api-e2e-evidence/logs/autobyteus-ts-unit.log` |
| 2 | `pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json` | worktree | Core build type check | Planned | `logs/autobyteus-ts-tsc.log` |
| 3 | `pnpm -C autobyteus-server-ts typecheck` | worktree | Server production types | Planned | `logs/server-typecheck.log` |
| 4 | `pnpm -C autobyteus-server-ts test:unit` | worktree | Server unit | Planned | `logs/server-unit.log` |
| 5 | `pnpm -C autobyteus-server-ts test:integration` | worktree (prepared) | Server integration | Planned | `logs/server-integration.log` |
| 6 | `pnpm -C autobyteus-server-ts build` | worktree | Current dist for built-server E2E | Planned | `logs/server-build.log` |
| 7 | Affected and new server E2E, clean env (`env -i PATH HOME=<tmp> TMPDIR`) | `autobyteus-server-ts` | AC-003..AC-007 server boundaries | Planned | `logs/server-e2e-*.log` |
| 8 | `pnpm -C autobyteus-web test:nuxt --run`; `test:electron`; guards | worktree | Web/renderer, Electron main | Planned | `logs/web-*.log` |
| 9 | AC-001 static `git grep` | worktree | Clean cut | Planned | `logs/ac001-grep.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. There are many independent cases, including long builds (desktop app, Docker image) and real-runtime runs that are vulnerable to interruption.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | AC-001/003/004/005/006 proven at unit and built-server E2E level | AC-002/007/008 not yet proven in a packaged app or container | Desktop instance; Docker |
| Changed-boundary execution directness | 90% | Built server, real Prisma, real vault | Packaged embedded server not exercised | Desktop instance |
| Cross-boundary integration realism and mock gap | 85% | Real GraphQL and stores | No real model inference through the changed LLM paths | Native runs with real LM Studio and a custom provider |
| Environment, configuration, identity, and fixture fidelity | 85% | Orphan vault row with unchanged crypto; provider-era `.env` | Docker env not exercised | Docker upgrade start |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | Restarts, refused launch and restore | Native restore with a real model | Desktop run terminate/restore |
| User-surface, browser, and desktop-shell confidence | 75% | Web unit tests; implementation's web-equivalent probe | Packaged renderer | Desktop instance |
| Durable regression coverage quality and relevance | 92% | 2 new E2E files, 4 updated files, mutation check | Gated LM Studio suite stale (BAS-002) | — |

- Overall post-repository confidence: 85.7%
- Calculation method: simple average
- Every critical acceptance criterion directly proven: `No` (AC-002, AC-007, AC-008 pending)
- Any applicable category below `90%`: `Yes` — requirement proof, realism, fidelity, lifecycle, user surface
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: packaged app, real inference, container start. Final scores (95%) are in the execution coverage report.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (planned; confirmed after repository execution)
- Selected execution mode: `Project Desktop Validation` (isolated desktop instance), `Live API` (native runtime with real LM Studio, a custom provider on the LM Studio OpenAI-compatible endpoint, and a single cheap API-provider call if a test vault key exists), `Lifecycle` (Docker remote-server image start).
- Specific confidence gaps:
  - AC-007 has real-runtime and packaged-app risk: the native runtime shares the LLM factory, host-scoped parsing, catalog and credential paths that this change edits.
  - AC-002 has not been proven in the packaged app.
  - AC-008 container start has not been run.
  - AC-004 has not been rendered in an editor.
- Why the selected modes can materially improve confidence: they exercise the real embedded server bundle, real inference transports and the real entrypoint, none of which the repository suites reach.
- Expected confidence after the selected validation: ≥ 95%.
- Browser-specific decision and rationale: a web-equivalent Settings probe already passed in implementation. The desktop instance replaces another browser probe, because the packaged embedded server and the native runtime UI are the remaining gaps.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron with an embedded server.
- Testing guideline used: worktree `TESTING.md`; `docs/isolated-app-instances.md`.
- Web-equivalent behavior: Settings rows and cards; unavailable model display; runtime label.
- Shell-specific or lifecycle behavior: the packaged embedded server boots without the removed modules.
- Chosen validation approach: an isolated desktop instance built from this worktree (`--build`), driven over its CDP control port.
- Effect on any already-running desktop application: None. Other isolated instances (owned by other worktrees) and the user's app are not touched.
- Behavior not directly proven and confidence consequence: recorded in the execution report.

## Live Environment And Fixture Plan

- Startup order: server build → server E2E → web tests → desktop build/start → Docker build/start, serialized within the worktree.
- Environment choices: clean `env -i` for E2E. LM Studio host `http://127.0.0.1:1234` for the gated suite and the custom provider. The Ollama host points at a closed port (Ollama is not running).
- Health / readiness checks: harness readiness, isolated-app `start` result, container GraphQL response.
- Seed data: created through GraphQL/UI on owned data roots; leftover shapes as described above.
- Journeys: AC-002 Settings; AC-004 remote selection displayed as unavailable and blocked; AC-005 startup with leftovers; AC-007 native run launch and restore with LM Studio, custom and API models plus the "AutoByteus" runtime label; AC-008 container start.
- Evidence: test assertions, GraphQL results, DOM/state queries, logs, screenshots (supporting only).
- Owned processes and temporary state to clean up: built test servers and runtimes (handled by the harness), the isolated instance, the Docker container and image tag, temp HOMEs.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| API-E2E-007A | `RUN_LMSTUDIO_E2E=1` gated suite (existing durable file) | Native runtime with a real LM Studio model | Already durable (gated); run, not added |
| API-E2E-007B | Probe against the built server: custom provider → LM Studio `/v1`; native run create/stream/terminate/restore | Native runtime with a custom OpenAI-compatible model | Depends on a local LM Studio model; not hermetic |
| API-E2E-007C | Same probe with a cheap built-in API model, only if a key exists in a test-owned vault | Native runtime with an API model and credential resolution | Spends credits; not durable |
| API-E2E-002/007D | Isolated desktop instance journey | Packaged Settings, runtime label, unavailable display, native run | Desktop build/drive is a validation surface, not suite code |
| API-E2E-008 | Docker remote-server image build/start | Entrypoint no longer writes the key; server serves GraphQL | Heavy image build; not a repository test |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Native runtime with a real Ollama model | Ollama is not installed or running | Low: Ollama and LM Studio share the changed host-scoped parse, catalog and availability code (unit-covered for Ollama); OllamaLLM is untouched | Recorded; user verification if desired |
| Paid API-model inference on the native runtime | No test-owned key; the user's production vault is off-limits | Low: the API adapters are untouched; credential resolution was shown up to the missing-key error | User verification if desired |
| API-E2E-007A gated in-process LM Studio suite | Baseline harness defect BAS-002 (Studio services/agentRunService not wired since 37d05c7f7) | None for AC-007 (covered by 007D/007B on the packaged app) | Report to the suite owner |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| OBS-001: a stopped native run whose saved model is unavailable shows "Choose another model" but "No models available"; the unchanged replacement rule refuses any swap (also for ordinary unavailable LM Studio models) | Not a reroute for this ticket (pre-existing; AC-004 met). Separate-ticket candidate | `run-model-selection-service.ts:68`; desktop control case | Solution Designer (informational) |
| BAS-001 / BAS-002 baseline defects (Dockerfiles missing contract packages; stale gated LM Studio suite) | Baseline items (Rule 9: report to owner) | `logs/docker-build.log`; `logs/lmstudio-native-runtime.log` | Delivery / owning maintainers |
| SCN-004a: a saved application launch profile with a remote identifier is now blocked as `CURRENT_MODEL_SELECTION_REQUIRED` ("The selected model is no longer supported. Select a current supported model.") instead of `MODEL_UNAVAILABLE`. It is still blocking, the value is kept and nothing is substituted. | Not a reroute (observation). REQ-006/AC-004 require "unavailable + blocked + not cleared + no substitution". The requirements explicitly left "per-surface unavailable wording" to downstream, and this is the existing outcome for an unsupported model. | `application-current-model-selection-policy.ts:41-53`; `llm-factory.ts:234-240` | None; reported to delivery and the user as a wording note |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (2 new E2E files; 2 E2E files and 1 unit file updated)
- Post-repository confidence: 85.7% (final 95% after broader validation; see the execution report)
- Broader validation decision: `Required` (executed)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: The native `RuntimeKind.AUTOBYTEUS` runtime is treated as critical preserved behavior (AC-007).
