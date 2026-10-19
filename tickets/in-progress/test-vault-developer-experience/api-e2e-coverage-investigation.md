# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` @ SR-008 (approved; SR-006/SR-007 by the user)
- Investigation Notes: `investigation-notes.md` (W-*, F-*, A-01..A-26)
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-008)
- Design Spec (required on every route): `design-spec.md` @ SR-008
- Supplemental Task Artifacts: `test-vault-evaluation-report.md` @ SR-008 (§5.0/§5.1 usage model)
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass 9.3/10, no findings)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code_reviewer handoff, CRR-001 Pass, branch `codex/test-vault-developer-experience` @ `12a23e7b8a`
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

- Behavior to prove:
  - One selector, `AUTOBYTEUS_TEST_VAULT`, selects a read-only test vault "like a database" (REQ-001, REQ-005).
  - `pnpm test-vault setup|status|remove` manages the vault without a TTY (REQ-002/003).
  - Locations in production app data are refused (REQ-004).
  - Consumers never write: saves give `SECRET_VAULT_READ_ONLY` and the vault's bytes stay unchanged (REQ-007).
  - Credentials never come from the environment (REQ-006).
  - Missing or refused keys are reported as skips, never passes, and fail in strict mode (REQ-009).
  - `test:e2e:real` prints the vault and gets the right exit code (REQ-010).
  - Default autobyteus-ts tests are credential-free (REQ-011).
  - Isolated Electron instances use the vault (REQ-012).
  - Investigation code needs no key code (REQ-014).
  - Unset → production as today; the real data dir ignores the selector; an unusable selected vault stops the server (REQ-016).
  - Deterministic harnesses keep their own vaults even with the selector exported (AC-017).
- Design: DS-001..DS-005. The single source decision is `selectSecretVaultSource`. `SecretVaultRuntime.initialize(source)` applies one failure rule. The read-only store is Prisma-free. The four harness opt-in owners are in DS-005, plus Electron `isolated-baseline` forwarding.
- Implementation: IR-001, feature commit `855842b8f1`. Every later commit up to `12a23e7b8a` changes only docs and ticket files (`git diff --name-only 855842b8f1 12a23e7b8a`). The implementation checks IMP-01..IMP-13 therefore still describe the code under test.
- Code review: CRR-001, no findings.
- Open items handed to API/E2E:
  - live: AC-005, AC-006, AC-007, AC-013;
  - isolated instance: AC-010;
  - AC-017 at full scale;
  - strict mode.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001..SCN-009.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-A1: an isolated instance `restart` while the selector is still set keeps using the vault. Trigger: `pnpm isolated-app restart <id>`; the guide says to start *and restart* with it set.
  - SCN-A2: in a live run, the developer's shell still carries production `*_API_KEY` variables. The key actually sent to the provider must be the vault's. Trigger: the normal live command in an agent shell, which carries 13 inherited `*_API_KEY` variables on this machine.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/007 setup/status/remove | Added | REQ-001..004, DS-001 | IMP-09 reused. Root-script run as fixture creation in AE-01. |
| BEH-002/008 server selects test vault | Added | REQ-005/007/012/016, DS-002 | IMP-04/05 reused. Isolated instance AE-09. Real-E2E runner AE-08 and AE-13. |
| BEH-003/009 autobyteus-ts default resolver | Added | REQ-005/008/014, DS-003 | IMP-08 reused. Key-identity probe AE-04. Live AE-11/12. |
| BEH-004 gated server suites | Changed | REQ-005/006, DS-005 | IMP-05/12 reused. Key-identity probe AE-05. Strict/missing AE-07. Live AE-14. |
| BEH-005 env stripping / deterministic isolation | Changed | REQ-006/011, AC-017 | IMP-05/07 reused. Full `pnpm test:e2e` with and without the selector (AE-02/AE-03). |
| BEH-006 reasoned skip / strict | Changed | REQ-009 | IMP-08 reused. Strict on both packages (AE-06, AE-07). |
| Production unset behavior | Preserved | REQ-016, DEC-010 | IMP-04 reused. AE-02 baseline. Isolated instance without the selector (AE-09). |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | source decision, read-only store, failure rule, commands | IMP-02/04/09 | — | — |
| API / transport / contract | Yes | GraphQL save → `SECRET_VAULT_READ_ONLY`; provider status | IMP-05 (built server) | — | — |
| Frontend component / state | No | Settings UI unchanged; it surfaces the existing typed error | — | How the read-only error shows in Settings | Isolated instance UI (AE-09) |
| Browser integration / user journey | Indirect | Settings save in the desktop renderer | none | The renderer path to the read-only error | AE-09 |
| Authentication / session / permissions | Yes (credentials) | key source; env stripping | IMP-05/07/08/13 | Which key value is actually sent when env aliases exist | Temporary probes AE-04/AE-05 |
| Desktop renderer / web-equivalent UI | Indirect | Settings provider status | none | — | AE-09 |
| Desktop shell / Electron-specific integration | Yes | `buildServerProcessEnv` isolated forwarding | IMP-11 (unit) | A real packaged launch forwarding the selector; restart | AE-09 (worktree build) |
| Process / lifecycle | Yes | startup failure (fatal), runner exit code | IMP-05 (missing vault) | The isolated-instance start failure; F-08 exit code | AE-09, AE-08, AE-13 |
| Persisted-data transition | Yes (test-owned only) | the vault is read-only for consumers | IMP-05 hash | Hash across long and real runs | Hash before/after in AE-03, 08, 09, 11..14 |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | real provider calls with vault keys | IMP-08 (one 401 with a fake key) | A real successful completion | Live AE-11..AE-14 (needs the user's vault) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience`
- Project type and runtime stack: pnpm monorepo; Node 22 (`node:sqlite`); TypeScript server (Fastify/GraphQL/Prisma), autobyteus-ts library, Nuxt/Electron desktop app; vitest.
- Project testing guideline path(s): `TESTING.md` (root). No closer `TESTING*.md` under the changed packages.
- Conflicting, missing, or unclear project instructions:
  - TESTING.md says E2E folders should run with a clean environment (`env -i …`).
  - AC-017 is about a shell that exports the selector.
  - Both runs use the same clean environment: canary credential variables are added to both, and the selector to the second only. This keeps the comparison exact.
- Required environment variables or secrets available: `No` for real keys.
  - No standing test vault exists (`~/.autobyteus-test/` absent).
  - DEC-003 forbids agents from choosing the key source.
  - Synthetic vaults (fake values, test-owned files) are used for every non-live case.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers, Environments, Test vault, Rules | Global testing strategy | `pnpm test:e2e`; clean env for E2E; real keys only via `AUTOBYTEUS_TEST_VAULT`; isolated instance from a worktree build (Rule 1); never touch the user's running app or data (Rule 2); stop what you started (Rule 5); Rule 9 (find causes) |
| `docs/isolated-app-instances.md` | Isolated instance lifecycle | `pnpm --silent isolated-app start --build`, `restart`, `stop <id>`; JSON result with `instanceId`, `controlPort`, `graphqlUrl`, `logPath`; failures carry the last 40 log lines |
| `AGENTS.md`, `autobyteus-server-ts/AGENTS.md` | Repo instructions | Design/testing/release docs; package rules |
| root `package.json` | Scripts | `test-vault`, `test:e2e`, `test:e2e:real[:preflight]`, `isolated-app` |
| `test-support/live-e2e/run-live-e2e.mjs` | Real-E2E runner | Prints `Vault: …`, starts the built server with `testVaultSetting`, runs the two real-E2E files |
| Implementation handoff § Environment | Build state | Server and autobyteus-ts `dist` are current (no source file newer than `dist`, checked) |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server E2E suite | worktree | `pnpm test:e2e` (via `/private/tmp/tv-apie2e/run-e2e.sh`) | 182 files; test-owned DBs | vitest summary | vitest exit; owned runtimes removed by the suites |
| Built test servers (real-E2E runner) | worktree | `pnpm test:e2e:real:preflight` | built `dist/app.js` | runner output | runner stops its server |
| Isolated desktop instance | worktree | `pnpm --silent isolated-app start --build` | packaged worktree build; the user's installed AutoByteus keeps running untouched | JSON `ok:true` + `/rest/health` | `pnpm --silent isolated-app stop <id>` |
| Synthetic test vaults | `/private/tmp/tv-apie2e/` | `pnpm test-vault setup --source <synthetic file>` with the selector set to a temp dir | fake values only | `pnpm test-vault status` | `pnpm test-vault remove`, then remove the temp root |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Vault V-FULL: synthetic DeepSeek, OpenAI, Anthropic, LM Studio keys | real `pnpm test-vault setup` from a test-owned `0600` file of canary values | never under `~/.autobyteus`; no real keys | removed at the end with `pnpm test-vault remove` + `rm -rf` |
| Vault V-NODS: synthetic Kimi key only (DeepSeek missing) | same | same | same |
| Env canaries for credential aliases | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY` set to fake values | proves stripping and key identity without spending the user's production keys | process-scoped |
| The user's standing test vault (live cases) | the user's `pnpm test-vault setup --source <file the user chooses>` | DEC-003: agents must not choose the source | the user's; read-only for every case |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision:
  - production: `Not Affected`;
  - worktree test DBs: `Discard or Rebuild` (FU-04, untouched);
  - test vault: new data, read-only for consumers.
- Design-spec and implementation-handoff references: design § Persisted Data / State Transition Decision; handoff § Persisted Data Transition Check.
- Representative existing-data setup and required behavior: a vault made by the real setup command is read by every consumer without writes. Proof is the SHA-256 of `test-vault.db` and its key before and after each consumer run, and that no sidecar file appears.
- Evidence planned: hashes around AE-03, AE-08, AE-09 and the live cases.
- Migration-specific scenarios: N/A.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/secret-management/test-vault-{read-path,module-graph,policy}.test.ts` + startup/standalone unit tests | source decision, predicates per OS, read-only store, failure codes, module graph | AC-003/004/009/015/016 | Still Valid | IMP-04 | Reuse |
| `autobyteus-server-ts/tests/e2e/secret-management/test-vault-selection.e2e.test.ts` | built server read-only/save refused/bytes unchanged; missing vault fatal; no opt-in → own vault; nested AC-017 secret-lifecycle; in-process opt-in | AC-001/016/017/007 | Still Valid | IMP-05 | Reuse; rerun inside AE-02/AE-03 |
| `autobyteus-ts/tests/unit/test-setup-credential-isolation.test.ts` | no `*_API_KEY` visible; no default without gate | AC-005 (env part), AC-009 | Still Valid | IMP-07 | Reuse; run in the live command AE-11 for the AC-005 env clause |
| `autobyteus-ts/tests/unit/secrets/provider-api-key-resolver.test.ts`, `package-self-alias.test.ts` | slot semantics; class identity | REQ-014 | Still Valid | IMP-07 | Reuse |
| `autobyteus-ts/tests/integration/llm/api/*.test.ts` (18 live files) | live provider tests via `liveProviderTest` | AC-005/008 | Still Valid | IMP-08 | DeepSeek executed live in AE-11; Grok used for strict mode in AE-06 |
| `autobyteus-server-ts/tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` (+14 other live suites) | gated live suites via `initializeLiveServerVault`/`requireLiveCapability` | AC-007/008 | Still Valid | IMP-12 | Strict/missing in AE-07; live in AE-14 |
| `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-*.e2e.test.ts` | real-provider E2E via runner | AC-006 | Still Valid | — | AE-08 (preflight, synthetic), AE-13 (live) |
| `autobyteus-web/electron/server/__tests__/serverRuntimeEnv.spec.ts` | isolated forwarding of a non-blank selector | REQ-012 | Still Valid | IMP-11 | Reuse; real launch in AE-09 |
| Whole `tests/e2e` folder (182 files) | deterministic E2E results | AC-017 (preserved) | Still Valid | — | AE-02/AE-03 |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps (`Reused`: implementation check ID) | Why |
| --- | --- | --- | --- | --- | --- |
| AE-R01..AE-R13 | as IMP-01..IMP-13 | as recorded | Reused | IMP-01 … IMP-13 | They ran on `855842b8f1`. Every later commit touches only docs and ticket files, so the code they exercise is unchanged. Each has a header and a look-for line. |
| AE-01 | AC-001, AC-003 (fixture) | CLI via root script | Durable-equivalent run (fixture) | `AUTOBYTEUS_TEST_VAULT=<tmp>/v-full pnpm test-vault setup --source <synthetic file>` (no TTY), then `status`; same for `v-nods` | Creates the vaults through the real documented path. Checks the root script (IMP-09 used the built CLI directly). |
| AE-02 | AC-017 (baseline) | full server E2E | Existing Test | `run-e2e.sh base` → `env -i … pnpm test:e2e` without the selector | Baseline for the comparison |
| AE-03 | AC-017, REQ-005, QR-005 | full server E2E | Existing Test | `run-e2e.sh sel <v-full>`: same env plus `AUTOBYTEUS_TEST_VAULT=<v-full>`; per-file results compared with AE-02; vault hash before/after | AC-017 at full scale |
| AE-04 | AC-013 (mechanics, missing-key branch), AC-005 (key identity), REQ-006, REQ-014 | autobyteus-ts setup → default resolver → client → HTTP request | Temporary Probe | vitest probe file in `autobyteus-ts/tests/integration/`, run with `AUTOBYTEUS_TEST_VAULT=<v-full> RUN_LIVE_PROVIDER_TESTS=1` and env canaries. `LLMFactory.createLLM('deepseek-v4-flash')` and `new DeepSeekLLM(model, config)` with no resolver; `fetch` stubbed. Assert the `Authorization` header carries the vault canary and not the env canary, and that no `*_API_KEY` is visible. A missing provider (Grok) gives the missing-capability error naming `pnpm test-vault setup`. | Proves which key is sent without spending production keys. Temporary: the durable setup test and IMP-08 already cover the mechanics; this probe needs env canaries at process start, which the default suite never has. |
| AE-05 | AC-007 (aliases ignored), REQ-006 | server test setup → live initializer → product runtime resolver | Temporary Probe | vitest probe file in `autobyteus-server-ts/tests/e2e/`, run with `AUTOBYTEUS_TEST_VAULT=<v-full>` and env canaries for `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`DEEPSEEK_API_KEY`. `initializeLiveServerVault()`, then resolve the DeepSeek, OpenAI and Anthropic keys through the product runtime resolvers. Each must equal its vault canary; env shows no `*_API_KEY` and no selector. | Directly discriminates env and vault keys on the server path. Temporary for the same reason as AE-04. |
| AE-06 | AC-008, REQ-009 | autobyteus-ts `liveProviderTest` | Existing Test | `grok-llm.test.ts` with `<v-full>` + gate: skipped with `missing capability provider.grok.api-key …`; then the same run with `AUTOBYTEUS_LIVE_STRICT=1`: fails with `LIVE_PROVIDER_UNAVAILABLE` | Strict mode (open item) |
| AE-07 | AC-008, REQ-009 | server `requireLiveCapability` | Existing Test | `RUN_DEEPSEEK_E2E=1` collaborators suite with `<v-nods>`: skipped with `missing capability provider.deepseek.api-key (test vault …)`; with strict: fails | Server-side strict mode |
| AE-08 | AC-006 (vault line, preflight), REQ-010, QR-005 | real-E2E runner + built server | Existing Test | `AUTOBYTEUS_TEST_VAULT=<v-full> pnpm test:e2e:real:preflight`; without the selector; hash before/after | Runner output is otherwise unexecuted (handoff) |
| AE-09 | AC-010, REQ-012, REQ-016 (log line), QR-005 | packaged Electron worktree build → embedded server → Settings UI | Journey | `isolated-app start --build` with `<v-full>`. Assert the instance log line, Settings providers configured (UI + GraphQL), a Settings save refused with `SECRET_VAULT_READ_ONLY`, `restart` keeps the vault, hash unchanged, `stop`. Then a start with the selector at a missing dir must fail with `TEST_VAULT_NOT_FOUND`. A start without the selector must use the application database. | Shell-specific forwarding in a real packaged launch |
| AE-10 | AC-011, QR-001 | all outputs of this round | Temporary Probe | `python3 -I` scan of logs and evidence for every synthetic and env canary value and every real inherited `*_API_KEY` value (values never printed) | Hygiene |
| AE-11 | AC-005, REQ-008 | autobyteus-ts live → DeepSeek | Existing Test (live) | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LIVE_PROVIDER_TESTS=1 pnpm -C autobyteus-ts exec vitest run tests/integration/llm/api/deepseek-llm.test.ts tests/unit/test-setup-credential-isolation.test.ts`, in the agent shell carrying production `*_API_KEY`; hash before/after | Needs the user's vault |
| AE-12 | AC-013 | autobyteus-ts `LLMFactory.createLLM` → DeepSeek | Temporary Probe (live) | AE-04 probe's live variant: `createLLM('deepseek-v4-flash')`, no resolver, one real completion | Needs the user's vault |
| AE-13 | AC-006, REQ-010, F-08 | real-E2E runner → DeepSeek | Existing Test (live) | `pnpm test:e2e:real:preflight` and `pnpm test:e2e:real -- --scenarios=deepseek.llm` with the user's vault; `Vault: test vault …`; exit 0; hash unchanged | Needs the user's vault |
| AE-14 | AC-007 (live) | gated server suite → DeepSeek | Existing Test (live) | `AUTOBYTEUS_TEST_VAULT=… RUN_DEEPSEEK_E2E=1 ANTHROPIC_API_KEY=<canary> OPENAI_API_KEY=<canary> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts --no-watch` | Needs the user's vault; AC-007 marks the live run as at the user's discretion |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

None planned. The durable suite added by IR-001 already covers the mechanics: IMP-04/05/07/08/11, and the nested AC-017 run in `test-vault-selection.e2e.test.ts`. The remaining evidence needs one of three things:

- env canaries set at process start (AE-04/05);
- the user's real vault (AE-11..14);
- a packaged desktop build (AE-09).

None of these is suitable for the default deterministic suites. This plan is revisited if a case finds a gap a durable test could close.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan (When Applicable)

- Desktop framework / shell: Electron (`autobyteus-web`), embedded `autobyteus-server-ts`.
- Testing guideline, README, or development instructions used: `TESTING.md` Rules 1/2/3/5; `docs/isolated-app-instances.md`.
- Web-equivalent behavior: Settings provider status and the save error. The GraphQL contract for these is already proven on a built server (IMP-05).
- Shell-specific or lifecycle behavior:
  - `buildServerProcessEnv` forwarding the selector under `isolated-baseline`;
  - the embedded server's startup failure;
  - `restart`.
- Chosen validation approach and why it fits the project: the isolated instance of a worktree build. It is the documented surface, and it is the only one that exercises the real Electron env policy.
- How the run avoids disturbing an already-running desktop application:
  - The user's installed AutoByteus is running (pid 67589/70908, own server port). It is not touched.
  - `isolated-app` uses its own free ports, a temp data root and its own process group, and stops only its own `instanceId`.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order: synthetic vaults (AE-01) → AE-02 baseline (background) → probes AE-04..AE-08 → AE-03 → electron build and AE-09 → AE-10. Long runs are serialized within the worktree (TESTING: serialize builds).
- Environment choices:
  - `env -i PATH HOME=<resolved temp> TMPDIR USER LOGNAME` plus canary credentials for E2E runs;
  - probes run in the agent shell with real inherited keys replaced by canaries (`env -u` for each real `*_API_KEY`). A defect then cannot spend the user's keys.
- Health / readiness checks: vitest summaries; `isolated-app` JSON `ok`; server log line `Secret vault: …`.
- Seed data / fixtures: synthetic vaults only.
- Test identities / authentication / permissions / session state: none, beyond the vault keys.
- Requirement-linked journeys or scenarios: SCN-001..009, SCN-A1, SCN-A2.
- Evidence to capture:
  - logs with headers;
  - GraphQL responses;
  - Settings screenshots and DOM text;
  - hash files;
  - the canary scan.
- Owned processes and temporary state to clean up:
  - the isolated instances;
  - `/private/tmp/tv-apie2e/`;
  - the temporary probe files (deleted after the run; their sources are kept as evidence).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AE-11..AE-14 live calls (AC-005, AC-006 exit 0, AC-007 live, AC-013 live) | No standing test vault; agents must not choose the key source (DEC-003) | A real provider success with vault keys is unproven until it runs | No: the user only provides the dependency (`pnpm test-vault setup --source <file>`); the agent then runs the cases | Ask the user (Blocked) after every other case completes |
| Windows/Linux paths | No such host | Accepted residual (handoff) | No | — |
| R-D: 21 other web probes inheriting an exported selector | Accepted residual, FU-05 | — | No | — |

## Ambiguities Or Reroute Triggers

None at this point.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` (revisit after the cases)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the live cases depend on the user's vault. Expected round outcome if everything else passes: `Blocked`, with a request to the user to create the vault.
- Update after execution (round 1):
  - Added AE-08b: a single-scenario runner run with the synthetic key, to check F-08 and that a refusal is not counted as a pass.
  - Learned constraint: every server vitest run resets the shared `tests/.tmp/autobyteus-server-test.db` in `globalSetup`. Server vitest runs, builds and `pnpm test:e2e` therefore run strictly one at a time in this worktree. The first AE-02 run was discarded for this reason.
  - Durable-coverage decision unchanged (`No`).
