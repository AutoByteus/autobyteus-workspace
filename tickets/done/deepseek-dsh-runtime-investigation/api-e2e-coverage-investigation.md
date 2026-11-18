# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence
scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (approved at SR-001; SR-003 adds DEC-019/DEC-020)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-004)
- Design Spec (required on every route): `design-spec.md` (SR-004, `Ready`)
- Supplemental Task Artifacts: `probes/`, `evidence/` (investigation), `follow-ups.md` (FU-001)
- Design Review Report: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass CRR-002 (implementation review), handed to API/E2E
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

All paths above are in `tickets/in-progress/deepseek-dsh-runtime-investigation/` of the worktree
`/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation` (branch
`codex/deepseek-dsh-runtime-investigation`, code commit under test `fddcff0f13`, base `origin/personal` `3ef5e33eec`).

## Current Requirement And Design Basis

DeepSeek Harness (`dsh --profile acp`, 0.2.2-rc.1) is runtime kind `deepseek_harness` on the shared ACP backend, one
dsh process and session per run, for agents, Teams, Orgs and studio application launches. Its model calls go to the
credential proxy's DeepSeek provider relay with the run's pass in `x-api-key`; the relay adds the vault key, forwards
body and stream unchanged, refuses in the Anthropic error envelope and reports each call (started / activity /
finished with usage) to the run's session, which turns the reports into per-call usage (AC-011), compaction boundaries
with raw-trace rotation (AC-010) and idle-timer liveness (AC-012). Restore and reopen use `session/resume` (AC-004);
instructions reach dsh literally on every launch (AC-006); the run's configured skills only (AC-007); dsh's own
subagent/workflow/goal/plugin-install tools and session-log upload are off in an AutoByteus-owned dsh home (AC-015); a
process without the credential proxy (the standalone application host) shows dsh unavailable and refuses any launch
before dsh starts (DEC-020). Grok and integration behavior is preserved (AC-016/017). Persisted data: `Not Affected`
(new string values only).

The implementation's own checks (IMP-01…IMP-09) already prove AC-001…AC-009 (main path), AC-011, AC-013 (API and
mounted component), AC-014 (journal translation), AC-015, AC-016, AC-017, QR-001 and the Brief Studio application
launch live. The code review left to API/E2E: live/realistic compaction (AC-010), long-reasoning liveness (AC-012), the
AC-009 key-removed-mid-run alternate, dsh in Teams and Orgs, the runtime switch to and from dsh (AC-014 second half),
the standalone application host (DEC-020), RSK-004 memory per dsh process, the Agent Runtimes row rendered in an
isolated desktop instance (AC-013), and the full web `test:nuxt` and `test:electron` suites.

AC-006 note (code-review Residual Risks; implementation handoff Known Risks): the pre-existing shared composer refuses
any `{{…}}` in an agent's composed instructions for every runtime (`agent-execution/prompt/carpenter-prompt-composer.ts:26-30`),
so the AC's `{{name}}` precondition cannot be produced through the product. AC-006 is validated with instructions the
product can produce (literal braces `{probe}` and a distinctive rule); the AC wording is the Solution Designer's.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001…SCN-010.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-001/002 in a Team (REQ-001): a user creates a Team run whose members run on dsh and asks one member to message
    another with `send_message_to`; the Team is stopped and restored.
  - SCN-001/002 in an Org (REQ-001): a user creates an Org run (a direct dsh agent member and a nested Team with a dsh
    member) and messages both; the direct member relays to the nested one.
  - SCN-010 both directions: a user stops a run, saves another runtime in its settings (`updateStoppedAgentRunSelection`)
    and sends the next message: dsh → Antigravity (scripted CLI) and Antigravity → dsh.
  - SCN-006 key change during a run: the user saves a different DeepSeek key in Settings → API Keys while a dsh run is
    open; the next model call uses the new key (the relay resolves the key per call). The product has no surface that
    removes a built-in provider key (`saveProviderApiKey` only saves; `removeForConsumer` is called only for custom
    providers, MCP fields and integrations), so AC-009's "a key removed later" is reached by removing the vault entry
    through the server's own vault service in the server process, the only owner that can remove it.
  - SCN-006 missing key at creation: a fresh server whose vault has no DeepSeek key; the user creates a dsh run.
  - DEC-020 standalone host: a standalone application host serving one application whose backend starts an agent on
    `deepseek_harness`.
  - RSK-004: a user with several dsh runs open at once.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded by the
  designer. Code review C-04 (Grok restore of a definition edited to contain `{{…}}`) is contrived and not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 dsh runtime (agents, Teams, Orgs, application launches) | Added | REQ-001, DS-001, DEC-020 | Live agent + application launch (IMP-08); Teams/Orgs live (API-20/21); standalone host refusal (API-25) |
| BEH-002/003/008 turns, approvals, stop, Agent Tools | Added | REQ-002/003/008 | IMP-08 (live) reused |
| BEH-004 restore by `session/resume` | Added / Changed (shared ACP) | REQ-004, DS-004 | IMP-08 reused; Team/Org restore (API-20/21) |
| BEH-005 model list, model and effort | Added | REQ-005, DS-005 | IMP-08 reused |
| BEH-006 instructions on every launch | Added | REQ-006, DEC-017 | IMP-08 reused (producible instructions; AC-006 note) |
| BEH-007 configured skills only | Added | REQ-007 | IMP-08 reused |
| BEH-009 provider relay, key never at dsh | Added | REQ-009, DS-002, QR-001/002 | IMP-03 + IMP-08 reused; key missing at create, key change and removal mid-run with real dsh (API-10/11) |
| BEH-010 compaction boundary + rotation | Added | REQ-010, DS-003 | Unit only so far; real dsh compaction through the real relay against a scripted DeepSeek endpoint (API-12/13) |
| BEH-011 per-call usage | Added | REQ-011 | IMP-08 reused; also asserted in API-12 |
| BEH-012 liveness from relay activity | Added | REQ-012, DEC-010 | Unit only so far; real dsh + relay with a shortened idle timeout (API-14/15) |
| BEH-013 Agent Runtimes row | Added | REQ-013 | API + mounted component (IMP-05/08); rendered in an isolated desktop instance (API-30) |
| BEH-014 Work Journal; runtime switch | Added | REQ-014 | IMP-08 (journal); runtime switch both ways (API-22) |
| BEH-015 owned home, tools off | Added | REQ-015 | IMP-08 reused |
| DS-008 one end owner | Changed (shared ACP) | design | Unit (IMP-02); exercised by every live stop/restore |
| Grok on the migrated ACP contract | Preserved | AC-016 | IMP-02/04/09 reused |
| Integrations through the proxy | Preserved | AC-017 | IMP-02/03/04 reused |
| Web runtime maps, row, contracts | Added | REQ-013 | Full `test:nuxt` and `test:electron` (API-06/07) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | ACP session effects, launcher, profiles, relay observation | Unit + integration (IMP-02/03) | Provider-call effects driven by a real dsh (compaction header, stream pacing) | Real dsh against a scripted DeepSeek endpoint (Lifecycle) |
| API / transport / contract | Yes | GraphQL runtime enum, stream DTOs, relay route | IMP-02/03/08 | Team/Org stream paths with dsh members | Live API (Team/Org) |
| Frontend component / state | Yes | Agent Runtimes row, runtime maps, localization | IMP-05/06 (affected specs only) | Rest of the web suite | Full `test:nuxt` |
| Browser integration / user journey | Yes (existing surfaces) | Row text and hint in Settings → Agent Runtimes | Mounted component only | Rendered row with a real server | Isolated desktop instance |
| Authentication / session / permissions | Yes | Run pass in `x-api-key`, vault key per call | IMP-03/08 | Key changed/removed while a real dsh run is open | Real dsh + relay (API-11) |
| Desktop renderer / web-equivalent UI | Yes | Row | IMP-05 | Real rendering | Isolated desktop instance (API-30) |
| Desktop shell / Electron-specific integration | No change | — | — | Electron main suite not run | `test:electron` (API-07) as regression |
| Process / lifecycle | Yes | one dsh process per run, end order, restore, standalone host refusal | Unit + IMP-08 | Standalone host process; several concurrent dsh processes | Lifecycle (API-25, API-16) |
| Persisted-data transition | No (new values only) | — | — | — | — |
| Worker / queue / distributed coordination | Yes (Team/Org delivery) | dsh members in team delivery | None with dsh | dsh member delivery and restore | Live API (API-20/21) |
| External integration | Yes | dsh 0.2.2-rc.1, DeepSeek Messages API | IMP-08 live | Compaction and long streaming against dsh | Scripted DeepSeek endpoint (deterministic); live compaction only on user request (TESTING.md) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation`
- Project type and runtime stack: pnpm monorepo; Node/TypeScript Fastify server (`autobyteus-server-ts`), Nuxt +
  Electron desktop (`autobyteus-web`), contract packages; vitest.
- Project testing guideline path(s): `TESTING.md` (root). No closer `TESTING*.md` on the changed paths.
- Conflicting, missing, or unclear project instructions:
  - TESTING.md "Forcing compaction early": a live compaction run against a real model is not required proof and is run
    only when the user asks. The AC-010 verification intent says "Live gated E2E + unit". Resolution: prove AC-010 with
    the real dsh and the real relay against a scripted DeepSeek endpoint with a lowered dsh threshold (deterministic,
    no provider key), plus the existing unit tests; no live compaction run (not requested by the user).
  - TESTING.md has no Fresh-Start Build section listing build-input paths. Written from `release-desktop.yml` (see below).
- Changed build-input paths: the three contract packages (`autobyteus-*-contracts/src` and tracked `dist/`, imported by
  the server and web gates), `autobyteus-web/generated/graphql.ts` (codegen output) and new test files compiled by the
  server and web type checks (DESIGN.md rule 12). No `package.json`, lockfile, `tsconfig`, codegen config or workflow
  changed. Fresh-start build case: API-35.
- Required environment variables or secrets available: `Yes` — test vault READY with `provider.deepseek.api-key`
  (values never read into files); dsh 0.2.2-rc.1 at `/tmp/ab387-ext/dsh-npm`, started by `/tmp/ab387-dsh-bin/dsh`
  (Node 25.2.1); server tests on Node 22.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | Layers and commands; rerun by impact; one heavy run at a time; live gates and test vault; clean environment for E2E (`env -i … HOME=<temp>`); isolated instances get only the baseline environment plus `AUTOBYTEUS_TEST_VAULT`; live compaction only on request |
| `DESIGN.md` rule 12 | Fresh-start proof | Clean clone + `pnpm install --frozen-lockfile` only, then the gate/build |
| `.github/workflows/release-desktop.yml` | Release job | `pnpm install --frozen-lockfile`, then in `autobyteus-web` `pnpm build:electron:mac -- --x64` (signed on the runner) |
| `docs/isolated-app-instances.md`, `autobyteus-web/electron/server/serverRuntimeEnv.ts` | Isolated instances | `pnpm --silent isolated-app start --app <bundle>`/`--build`; `--data-root <dir>`: the embedded server reads the data root's `.env`; caller env reduced to the baseline (PATH from the login shell) |
| `autobyteus-server-ts/tests/e2e/runtime/deepseek-harness-live.e2e.test.ts` header | Live dsh suite | `RUN_DEEPSEEK_HARNESS_E2E=1`, `DEEPSEEK_HARNESS_COMMAND`, `AUTOBYTEUS_TEST_VAULT` |
| `autobyteus-server-ts/tests/e2e/shutdown/native-standalone-host-fixture.mjs` | Real standalone host from `dist/` | Spawn a host entry importing `dist/index.js`; scripted inference only |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (TESTING.md) | Scripted Antigravity CLI | `ANTIGRAVITY_CLI_COMMAND=<abs path>`, `AGY_FAKE_CASE=auto_compaction` for a plain reply |
| `tickets/…/probes/run-live-compaction.cordis.patch.yml`, `mock-anthropic.mjs` | Investigation probes | dsh threshold patch (`compaction-basic.thresholdRatio`) via `--patch`; Anthropic SSE shape dsh accepts |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Studio E2E server (in-process) | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` in the suite | own temp data root, port 0, own vault or test vault | GraphQL answers | `app.close()`, data root removed |
| Scripted DeepSeek endpoint (Anthropic Messages SSE) | in-suite | `http.createServer` on 127.0.0.1:0; the relay's origin set to it | no key, no credits | listening | closed in `afterAll` |
| dsh | in-suite | started by the product (`DEEPSEEK_HARNESS_COMMAND`), test wrapper adds `--patch <threshold>` for the compaction cases | Node 25 | run created | ended by the product; `pgrep` check |
| Standalone application host | temp dir | fixture spawns `dist/index.js` host | needs `pnpm -C autobyteus-server-ts build` | `/_autobyteus/health` 200 | IPC close, temp root removed |
| Isolated desktop instance | repo root | `pnpm --silent isolated-app start --app <fresh-clone bundle> --data-root <own dir>` | own data root and ports | `start` JSON | `isolated-app stop <id>` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| DeepSeek key for live cases | test vault (`AUTOBYTEUS_TEST_VAULT`) | read-only; never written to files | none |
| DeepSeek key for scripted cases | `saveProviderApiKey(providerId: "DEEPSEEK", apiKey: <synthetic>)` into the suite's own vault | synthetic value, not a real key | data root removed |
| Agents, Teams, Orgs, skills | GraphQL mutations | suite-owned data root | data root removed |
| Brief Studio-like application for the standalone host | fixture-written application package in a temp dir | — | temp root removed |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/backends/deepseek-harness/*.test.ts` | refusal before spawn, key missing, launch/effects, end order, resume restore, projection, config selection, provider-call effects, liveness | AC-002/004/005/006/008/009/010/011/012, DS-008 | Still Valid | IMP-02 | Reuse |
| `tests/unit/runtime-management/deepseek-harness/deepseek-harness-runtime.test.ts` | home files, launch profile (pass never key), discovery, availability, strategy | AC-005/013/015, DEC-020 | Still Valid | IMP-02 | Reuse |
| `tests/unit/credential-proxy/provider-relays.test.ts` | pass grants, observers, relay access, definition, stream reader, forwarder | AC-009/011, QR-002 | Still Valid | IMP-02 | Reuse |
| `tests/integration/credential-proxy/provider-relay.integration.test.ts` | key swap, unchanged stream, refusals, revocation, 502 | AC-009, QR-002 | Still Valid | IMP-03 | Reuse |
| `tests/e2e/runtime/deepseek-harness-live.e2e.test.ts` | live dsh: availability/models/row, standalone run (AC-001…009, 011, 014 journal), owned home, Brief Studio launch, key scan | AC-001…009, 011, 013…015, QR-001, DEC-020 | Still Valid | IMP-08 | Reuse (no code it exercises changed after `9dd599dfe3` apart from the supervisor move rechecked by IMP-09) |
| Grok unit tests, `grok-build-runtime-replay`, `grok-build-compaction-replay`, `tool-list-reopen-failure` E2Es | Grok on the migrated shared ACP layer | AC-016 | Still Valid | IMP-02/04/09 | Reuse |
| `integrations-graphql` E2E, credential-proxy unit/integration | integration proxy unchanged | AC-017 | Still Valid | IMP-02/03/04 | Reuse |
| web `AgentRuntimesManager.spec.ts`, `deepseekHarnessRuntimePresentation.spec.ts` | row text/hint; maps | AC-013 | Still Valid | IMP-05 | Reuse; full suite rerun (API-06) |
| `tests/e2e/runtime/runtime-switch-*.e2e.test.ts` | generic switch with Claude/Codex/AGY | AC-014 (generic path) | Out Of Scope (no dsh) | — | dsh switch added (API-22) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | all (gate) | server `src` + tests incl. the new suites | Existing Test | `pnpm -C autobyteus-server-ts typecheck` | New test files are compiled by the server type check |
| API-02 | all; AC-016/017 | server unit suite | Reused | IMP-02 (+ IMP-09 for the supervisor move) | Ran at `9dd599dfe3`; since then only the supervisor move (`cb132711f6`), rechecked by IMP-09 |
| API-03 | AC-009, AC-017, QR-002 | server integration suite | Reused | IMP-03 | Ran at `3514947952`; later source changes: `9dd599dfe3` (dsh launch profile discovery + live suite, not exercised by integration tests) and the supervisor move (IMP-09 reran the run-manager integration test) |
| API-04 | AC-016, AC-017 | scripted Grok E2Es, integrations GraphQL E2E | Reused | IMP-04 + IMP-09 | IMP-09 reran them at `cb132711f6`; nothing after it but docs |
| API-05 | AC-001…AC-009, AC-011, AC-013…AC-015, QR-001, DEC-020 (studio application scope) | live dsh suite | Reused | IMP-08 | Ran at `9dd599dfe3`; only the supervisor input move since (construction-time validation, IMP-09) |
| API-06 | AC-013, all web | full web unit/component suite | Existing Test | `pnpm -C autobyteus-web test:nuxt` | Only the affected specs ran (IMP-05) |
| API-07 | regression | Electron main-process suite | Existing Test | `pnpm -C autobyteus-web test:electron` | Not run by implementation |
| API-08 | AC-005, AC-013, ASM-001 | dsh found as `dsh` on PATH | Existing Test | live suite case 1 with `PATH=<dsh dir>:$PATH`, no `DEEPSEEK_HARNESS_COMMAND` | Added during the round: every other run used the override; a user's install puts `dsh` on PATH |
| API-KEYSCAN | QR-001 | this round's evidence | Temporary Probe | value-free scan of `evidence/api-e2e/` for the test-vault key | One-off check of committed evidence; the durable key scan is in the live suite |
| API-10 | AC-009 (key missing alternate) | GraphQL `createAgentRun` → launcher → relay access, real dsh installed | Durable | scripted-provider suite: create a dsh run on a server whose vault has no DeepSeek key | Real surface for the alternate; no spawn |
| API-11 | AC-009 (key changed / removed mid-run), REQ-009 | real dsh → relay → scripted DeepSeek endpoint | Durable | scripted-provider suite: turn with key A; save key B through `saveProviderApiKey`, turn reaches upstream with B; remove the key through the server's vault service, next turn fails with the relay's text shown by dsh, upstream not called; restore without the key fails naming the key | Per-call key resolution with a real dsh |
| API-12 | AC-010, AC-011 | real dsh compaction (lowered threshold) → relay (compaction header) → session → `COMPACTION_STATUS` → raw-trace rotation | Durable | scripted-provider suite: several long messages; scripted endpoint answers normal calls and compaction calls | Real dsh drives the compaction header, deterministic, no key |
| API-13 | AC-010 (failed compaction) | same | Durable | scripted-provider suite: endpoint refuses compaction calls (400) | No rotation on failure |
| API-14 | AC-012 (streaming keeps alive) | real dsh ↔ relay activity ↔ session idle timer (shortened) | Durable | scripted-provider suite: idle timeout 6 s; endpoint streams `ping` events for ~15 s before the answer | Proves activity from relay traffic reaches the timer with a real dsh |
| API-15 | AC-012 (stall fails) | same | Durable | scripted-provider suite: endpoint sends headers then nothing | `ACP_TURN_IDLE_TIMEOUT` with real dsh |
| API-16 | RSK-004 | several dsh processes | Durable (measurement) | scripted-provider suite: 3 concurrent dsh runs, RSS of each dsh process logged | Memory per process |
| API-20 | REQ-001 (Teams), AC-008, AC-004 | Team run with two dsh members; `send_message_to`; stop/restore | Durable (live) | collaboration live suite | Team path with dsh members never ran |
| API-21 | REQ-001 (Orgs) | Org run with a direct dsh member and a nested Team's dsh member; relay | Durable (live) | collaboration live suite | Org path with dsh members never ran |
| API-22 | AC-014 (switch), REQ-014 | `updateStoppedAgentRunSelection` dsh → scripted AGY → dsh | Durable (live) | collaboration live suite | Switch to and from dsh never ran |
| API-25 | DEC-020, REQ-009 | real standalone application host from `dist/` | Durable | standalone-host suite: availability reports dsh unavailable with the reason; an application command starting a `deepseek_harness` agent is refused; a recording fake `dsh` shows no `--profile acp` start | Standalone host not exercised |
| API-30 | AC-013 | Settings → Agent Runtimes, rendered in an isolated desktop instance (fresh-clone build) | Journey | three states: installed + key set (test vault), installed + key not set (own vault), not installed (command missing); DOM text + screenshots | Rendered row not checked |
| API-35 | build inputs (DESIGN.md rule 12) | release build from a clean clone | Existing Test (build) | clean clone at the tested commit, `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-web build:electron:mac` (host arch, unsigned) | Contract `dist/`, generated GraphQL and new tests are build inputs |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-10…API-16 | `autobyteus-server-ts/tests/e2e/runtime/deepseek-harness-scripted-provider.e2e.test.ts` (gate `RUN_DEEPSEEK_HARNESS_SCRIPTED_E2E=1`, no key) | Compaction, liveness and key-change behavior with the real dsh are deterministic and free, so they can be rerun on every dsh upgrade (DEC-003: breakage found as a bug) |
| API-20…API-22 | `autobyteus-server-ts/tests/e2e/runtime/deepseek-harness-collaboration-live.e2e.test.ts` (gate `RUN_DEEPSEEK_HARNESS_E2E=1`, test vault) | Teams, Orgs and runtime switch with dsh members are product paths a later shared change can break |
| API-25 | `autobyteus-server-ts/tests/e2e/runtime/deepseek-harness-standalone-host.e2e.test.ts` + `tests/e2e/runtime/fixtures/deepseek-harness-standalone-host-fixture.mjs` (gate `RUN_DEEPSEEK_HARNESS_STANDALONE_E2E=1`, current `dist/`) | DEC-020 refusal in a host without the proxy is a key-safety rule |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-06 | `autobyteus-web/tests/integration/voice-input-extension.integration.test.ts` | Baseline fix (TESTING.md Rule 9): its own 30 s timeout for the case that starts real worker processes | Found during API-06; cause in the test, not in this ticket's change |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron, embedded server.
- Testing guideline used: TESTING.md (Isolated desktop instance), `docs/isolated-app-instances.md`.
- Web-equivalent behavior: the Agent Runtimes row (renderer + server GraphQL).
- Shell-specific or lifecycle behavior: none changed; the embedded server's environment policy decides whether
  `DEEPSEEK_HARNESS_COMMAND` reaches it (data-root `.env`) — this is how a user would point AutoByteus at dsh.
- Chosen validation approach: isolated instance of the fresh-clone build (API-35), driven through the control port.
- How the run avoids disturbing an already-running desktop application: `pnpm isolated-app` own data root and ports;
  the user's app and `~/.autobyteus` untouched.

## Live Environment And Fixture Plan

- Startup order: one heavy run at a time — typecheck → web suites → scripted-provider suite → standalone-host (after
  `pnpm -C autobyteus-server-ts build`) → collaboration live suite → fresh-clone build → isolated instance.
- Environment: E2E suites under `env -i PATH=… HOME=<temp> TMPDIR=…` plus their gates; `DEEPSEEK_HARNESS_COMMAND`
  pointing at the Node 25 wrapper (or a test wrapper adding `--patch`); live cases with `AUTOBYTEUS_TEST_VAULT`.
- Seed data: GraphQL mutations only; synthetic key in the scripted suite.
- Evidence: test output logs with `DSH_*` lines; scripted endpoint request log (header names, `x-api-key` match flag,
  never values); raw-trace manifests; DOM text and screenshots for the row.
- Owned processes and temporary state: in-suite servers and dsh processes, temp data roots, the fresh clone, the
  isolated instance and its data root.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Live compaction against the real DeepSeek model | TESTING.md: run only when the user asks; proven with real dsh + scripted endpoint | dsh's threshold arithmetic against real usage | No | None (on user request) |
| Real high-effort long reasoning (minutes) | Paid and slow; RT-016 measured it in investigation; the liveness mechanism is proven with real dsh and scripted pacing | Real pacing differs | No | None |
| AC-006 with `{{name}}` in instructions | Not producible through the product (composer guard) | AC wording | No | Solution Designer (AC wording) |
| Signed macOS x64 release build | Needs the runner's signing secrets and x64 host | Signing only | No | Release pipeline |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| AC-006 precondition not producible | `Requirement Gap` (wording only, non-blocking; already raised by implementation and code review) | `carpenter-prompt-composer.ts:26-30` | Solution Designer |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added, three suites + one fixture)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: TESTING.md gains a Fresh-Start Build section (build-input paths from `release-desktop.yml`), committed on its own as `docs(testing): …`.
