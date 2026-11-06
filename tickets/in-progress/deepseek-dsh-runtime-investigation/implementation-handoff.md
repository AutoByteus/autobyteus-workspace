# Implementation Handoff

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation`, branch
`codex/deepseek-dsh-runtime-investigation`. Implementation commits on top of the design commits (base `origin/personal`
`3ef5e33eec`):

- `6c755b2826` docs: architecture review round 3 pass (the reviewer's documents, committed as found)
- `d5566977b4` feat: DeepSeek Harness as an ACP runtime through the credential proxy's provider relay (steps 1–4)
- `3514947952` docs: DeepSeek Harness runtime, provider relays and glossary (step 5)
- `9dd599dfe3` fix: dsh model discovery lists its catalog; live suite steps made explicit (step 6 findings)
- `9344f4b9b5` docs: implementation handoff IR-001 with local and live evidence
- `cb132711f6` refactor: supervisor input in its own file (CR-001, IR-002)
- `fddcff0f13` docs: implementation handoff IR-002
- (delivery: `7c1117e209` merge of origin/personal `d6bcff577b`, `5a269806e4` DR-001 docs)
- `ee6739fe7f` test: composition boundary check follows the supervisor input file (DEL-02, IR-003)
- `14fe5959bf` docs(testing): a moved or renamed source file marks the architecture tests Rerun
- the commit that updates this handoff for IR-003

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large / High); ARCH-REV-003 Pass,
  handed to the implementation engineer.
- Requirements doc: `tickets/in-progress/deepseek-dsh-runtime-investigation/requirements-doc.md` (approved at SR-001; SR-003 adds DEC-019/DEC-020)
- Investigation notes: `…/investigation-notes.md`
- Solution revision record: `…/solution-revision-record.md` (SR-004)
- Design spec (required on every route): `…/design-spec.md` (SR-004)
- Supplemental task artifacts: `…/probes/`, `…/evidence/` (investigation), `…/follow-ups.md` (FU-001, out of scope)
- Design review report: `…/design-review-report.md` (ARCH-REV-003, Pass)
- Architecture review revision record: `…/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial round)

## Current Implementation Summary

DeepSeek Harness (`dsh --profile acp`) runs on the shared ACP backend as runtime kind `deepseek_harness`, one dsh process
and session per run, in the studio (agents, Teams, Orgs, application launches). Its model calls go to the credential
proxy's DeepSeek provider relay with the run's pass in `x-api-key`; the relay adds the vault key, streams body and reply
unchanged, refuses in the Anthropic error envelope, and reports each call (started, throttled activity, finished with
usage, synchronously at upstream end) to the run's session, which turns them into usage, compaction boundaries and
liveness. The shared ACP layer gained per-run launch facts (instructions on every launch, relay access), restore by
`session/load` or `session/resume`, config-option selection, `AcpSessionEffect` (+ `activity`), provider-call effects and
one end owner. Grok migrated to the new contract with no behavior change. A run pass now ends only through
`RunPassRevocation`, wired into every `AgentRunManager` / `AgentRunResourceManager` construction.

- Implementation cycle: `Rework` (IR-002: Local Fix CR-001 from CRR-001; IR-003: Local Fix from delivery DEL-02)
- Implementation revision record: `tickets/in-progress/deepseek-dsh-runtime-investigation/implementation-revision-record.md`
- Current implementation revision ID: `IR-003`
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `DR-001`
- Triggering finding IDs: `CR-001` (IR-002); DEL-02 failure (IR-003)

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design spec, "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change spans the shared ACP layer, the credential proxy (a new
  key-forwarding route family), three compositions, a new runtime owner, three contract packages and the web; ~25 new
  files, ~130 modified files (incl. tests and contract `dist/`). Security boundary, shared-contract and lifecycle impact as
  designed.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. None of the escalation triggers (key to dsh, reading dsh's private
  files, Grok behavior change) occurred.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | New runtime on the ACP path; refused before spawn without relay access | `AgentRunManager.resolveBackendFactory` → `createDeepSeekHarnessAgentRunBackendFactory` → `AcpAgentRunBackendFactory` → `AcpSessionLauncher.open` (refusal `PROVIDER_RELAY_UNAVAILABLE` before `runLaunch`/spawn) | Unit (refusal, no spawn) + live (standalone run) |
| BEH-002 | Turns with tool cards, approvals, auto-execute | `deepseek-harness-tool-projection.ts` (`bash`→`run_bash` with `[exit code: N]`, `write`→`write_file`, `edit`/`apply_patch`→`edit_file`, Agent Tools by canonical name); approvals unchanged in `AcpAgentSession` | Unit + live (run_bash, read, approval allow/reject) |
| BEH-003 | Stop ends turn and command | `AcpAgentSession.cancel` (unchanged) | Live: interrupted in 119 ms, `sleep 60` process gone, next message answered |
| BEH-004 | Restore by capability; resume for dsh; reopen is the third restore form | `AcpAgentCapabilities.restoreMethod()`; `AcpAgentSession.openResume`; factory `restoreBackend` and backend `reopenWithCurrentTools` open `mode: "restore"` | Unit (resume recorded, no `session/load`) + live (restore and reopen continue the conversation, same session id) |
| BEH-005 | Options discovery; config-option selection | `runAcpSessionOptionsDiscovery` (list → resume or new → close); `normalizeDeepSeekHarnessModels`; `deepSeekHarnessConfigSelection` → `AcpAgentSession.applyConfigSelection` | Unit + live: catalog `deepseek-v4-flash`, `deepseek-v4-pro`, `deepseek-flash` with efforts; `set_config_option` model then `reasoning_effort` |
| BEH-006 | Instructions on every dsh launch | Factory composes for create and restore; backend holds `instructions` and re-sends on reopen; `DeepSeekHarnessHome.prepareRun` writes `runs/<runId>/instructions.md`; home plugin (`interpolate: false`) | Unit (create, restore, reopen same instructions) + live (agent rule followed after create, reopen and restore) |
| BEH-007 | `.dsh/skills` + `customSkillDirs`, default roots off | dsh materializer (`.dsh/skills`); home patch `includeDefaultRoots: false`, guarded `customSkillDirs` | Unit + live (configured skill loaded in a repo subfolder; the repo's `.agents/skills` skill not offered) + `--dump-config` |
| BEH-009 | Relay with pass in `x-api-key`; Anthropic envelope; key never at dsh | `provider-relay-proxy-routes.ts`, `credential-proxy-forwarder.ts` (`x-api-key` auth, caller `x-api-key` dropped), `DefaultProviderRelayAccess.prepareForRun`, `RunPassRevocation` | Integration (key swap, unchanged body/stream, every refusal, revocation) + live (pass refused after standalone release and after the application platform stopped; key-absence scan) |
| BEH-010/011/012 | Provider-call effects | `ProviderCallObservers` → launcher-bound listener → `AcpAgentSession.onProviderCall` → `interpretDeepSeekHarnessProviderCall` → `applyEffects` | Unit (usage per call, compaction started/completed/failed, idle timer kept by activity, idle failure after) + live (one `TOKEN_USAGE_UPDATED` per relay call) |
| BEH-013 | Agent Runtimes row; unavailable without relay access | `deepseek-harness-agent-runtime-strategy.ts` (route `apiKeySetting` → GraphQL `API_KEY_SETTING`), availability provider (process slot), web row "API key set / not set" + hint | Unit + web spec + live (row `SIGNED_IN`, `API_KEY_SETTING`) |
| BEH-014 | dsh Work Journal translation | `deepseek-harness-translation.ts`, registry, oracle fixture | Unit + live (`Command: printf …`, `Command: cat -n …hello.txt`) |
| BEH-015 | Home patch rows; user `~/.dsh` untouched | `deepseek-harness-home-files.ts`, `DeepSeekHarnessHome.ensure` (atomic) | Unit + live `--dump-config` of the owned home; real `~/.dsh` mtimes unchanged before/after the live run |
| DS-008 | One end owner, stated order | `AcpSessionLauncher.end`: unsubscribe → session close → connection close/process stop → `launch.release()`; factory `releaseResources` calls it, then skill cleanup | Unit: order `unsubscribe`, `release`, release after the process exited |
| AC-016 | Grok preserved | Grok launch/session profiles on the new contract | All Grok unit tests and Grok fake-CLI E2Es pass (see Checks) |
| AC-017 | Integrations preserved | integration route untouched; revocation through `RunPassRevocation` | Credential-proxy unit/integration suites pass; `integrations-graphql` E2E (see Checks) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Shared ACP: `runtime-management/acp/{acp-agent-launch-profile,acp-agent-capabilities,acp-client-connection,acp-discovery-handshake}.ts`;
  `agent-execution/backends/acp/{acp-agent-session-profile.ts,session/acp-agent-session.ts,session/acp-session-launcher.ts,backend/acp-agent-run-backend-factory.ts,backend/acp-agent-run-backend.ts,events/acp-session-update-converter.ts}`.
- Grok adaptation: `runtime-management/grok/grok-build-{launch-profile,capability}.ts`, `agent-execution/backends/grok/*` (renames, `configSelection: []`, `providerRelayAccess: null`).
- Credential proxy: `credential-proxy/provider-relays/*` (new), `run-pass-registry.ts`, `run-pass-revocation.ts` (new), `integration-run-access.ts` (`revokeForRun` removed), `credential-proxy-{forwarder,host,local-server}.ts`, `delivery-definitions.ts`.
- Secrets: `secret-management/domain/secret-id.ts`, `catalog/provider-credential-catalog.ts` (`agentRuntime/deepseek_harness/apiKey` → `provider.deepseek.api-key`).
- Compositions: `agent-execution/providers/agent-provider-factory-builder.ts`, `agent-execution/runtime/general-process-run-supervisor.ts`, `agent-execution/services/{agent-run-manager,agent-run-resource-manager}.ts`, `compositions/build-studio-server.ts` (slot set before listen, cleared at close), `application-platform/{runtime/build-application-platform-runtime,execution/application-execution-scope-contracts,execution/application-execution-scope-kernel-builder}.ts`, `standalone-application-host/start-standalone-application-host.ts`.
- dsh runtime: `runtime-management/deepseek-harness/*` (new), `agent-execution/backends/deepseek-harness/*` (new), `llm-management/services/deepseek-harness-model-catalog.ts`, `runtime-management/agent-runtimes/strategies/deepseek-harness-agent-runtime-strategy.ts`, `runtime-management/runtime-availability-service.ts`, `agent-work-journal/rendering/runtimes/deepseek-harness-translation.ts`.
- Registration: `runtime-kind-enum.ts`, `agent-runtime-types.ts`, `api/graphql/types/agent-runtimes.ts`, `model-catalog-service.ts`, `run-model-selection-service.ts`, launch validator and credential readiness adapter (`deepseek_harness_key` authority: the vault key status), restore context, resume config, token usage kinds, MCP result provider, available runtimes report; contracts (`agent-runtime-names.ts`, two stream DTOs, rebuilt `dist/`); web types, maps, `AgentRuntimeRow.vue`, localization (en, zh-CN), `generated/graphql.ts` (codegen).
- Docs: `docs/modules/deepseek_harness_runtime.md` (new), `credential_proxy.md` (Provider Relays), `agent_runtimes.md`, `secret_management.md`, `grok_build_runtime.md`, docs index, `GLOSSARY.md` (credential proxy, run pass widened; provider relay, provider call observation, DeepSeek Harness / dsh home / dsh provider route, runtime-name row).
- Tests (new): `tests/unit/agent-execution/backends/deepseek-harness/*`, `tests/unit/runtime-management/deepseek-harness/*`, `tests/unit/credential-proxy/provider-relays.test.ts`, `tests/integration/credential-proxy/provider-relay.integration.test.ts`, `tests/e2e/runtime/deepseek-harness-live.e2e.test.ts`, web `deepseekHarnessRuntimePresentation.spec.ts` and an Agent Runtimes row case. Existing tests migrated to the new contracts (`fakeAcpLaunchProfile` helper in the ACP fake harness; `runPasses` in place of `integrationRunAccess` for the run managers; `deepSeekHarnessBackendFactory` in manager fixtures).

## Important Assumptions

- dsh 0.2.2-rc.1 behaves as recorded (RT-001…RT-022); no version gate (DEC-003/DEC-014).
- `AcpSessionLauncher.end` clears the owner's handles first (as the existing `end` did) and then runs the steps in the
  design order; the effects of the order are what DS-008 fixes.
- The backend's `shutdown` still closes the session (to publish its interrupt events) before `cleanup` → `end`; a relay
  report arriving in between reaches a closed session, which drops it (`onProviderCall` returns when closed).

## Known Risks

- **Implementation note (discovery placeholder, within the launch profile):** dsh offers its models only while a key is
  configured (dsh `llm-deepseek-api-key/src/index.ts`, `discoverModels` returns `[]` without one), and on a non-official
  endpoint (the relay) it serves its built-in catalog without a listing call. Without a key, discovery returned only the
  session's current model. Discovery's `DEEPSEEK_API_KEY` is therefore the placeholder `autobyteus-model-discovery`: not a
  key and not a pass; a call made with it would reach only the relay, which refuses it (`RUN_PASS_INVALID`). The design's
  "no pass for discovery" holds. Documented in `deepseek_harness_runtime.md`.
- **Observation for the Solution Designer (AC-006 precondition):** the shared prompt composer refuses any `{{…}}` in an
  agent's composed instructions for every runtime (`agent-execution/prompt/carpenter-prompt-composer.ts:26-30`,
  "Carpenter prompt contains an unresolved documentation placeholder."). An agent whose instructions contain `{{name}}`
  therefore fails at creation before any runtime, so AC-006's `{{name}}` precondition cannot be produced through the
  product. Unchanged here (not in Change Scope). The dsh path delivers whatever the composer passes literally (live:
  `{probe}` and the rule token reached dsh and were followed after create, reopen and restore). Not blocking; recorded so
  the Solution Designer can decide whether the AC wording or the composer guard should change.
- The frozen raw-trace-manifest migration knows the five runtime kinds of its time; dsh manifests are written only after
  that startup-only migration completed, so the frozen table does not need dsh. Its test now checks that its values are
  still current kinds instead of equal to today's enum.
- RSK-002 (compaction header in dsh code), RSK-004 (process memory per run: not measured here), RSK-006 (overlap with
  autobyteus-386 in the shared ACP layer, resolve at merge).
- Users need Node.js ≥ 24.9 for dsh (the machine default here is Node 22; the live run used a wrapper that starts dsh's
  `bin.js` with Node 25).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: No Design Issue Found (end duplicate folded in)
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed` (end-owner consolidation in scope)
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: the factory's own end copy is gone; `releaseResources` calls `AcpSessionLauncher.end` then skill cleanup.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` — `AcpLaunchSelection`, `args`/`env`/`normalizeModels` on the shared contract, `AcpExtEffect`/`AcpExtNotificationContext`, launcher mode `"load"`, the factory end copy, `IntegrationRunAccess.revokeForRun`, the factory comment "not re-sent on load".
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (after CR-001). IR-001
  missed that `agent-execution/runtime/general-process-run-supervisor.ts` was already over the limit on the base (511
  non-empty lines) and grew it to 522. IR-002 moves its input type and whole-input validation to
  `agent-execution/runtime/general-process-run-supervisor-input.ts` (83 lines): the supervisor is now 446. The other
  touched sources stay under 500 (`compositions/build-studio-server.ts` 493, +9); no source file has a delta over 220 lines.
- Notes: Grok's `normalizeGrokBuildModels` stays in its launch-profile file (called directly by its capability).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (new values only)
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: new string values `deepseek_harness`, `deepseek_harness_call`, `deepseek_harness_compaction_call`; new runtime folder `<appData>/runtimes/deepseek-harness/`.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` (no dependency change); `pnpm -C autobyteus-server-ts prebuild`; `test:integration:prepare` (builds Brief Studio's importable package).
- The three contract packages were rebuilt (`pnpm -C <package> build`) and their `dist/` committed (TESTING.md).
- `autobyteus-web/generated/graphql.ts` regenerated with `pnpm -C autobyteus-web codegen:local` (one enum value added).
- The server typecheck baseline shrank by two (`pnpm -C autobyteus-server-ts typecheck:update-baseline`): migrated tests lost errors.
- Live run: dsh 0.2.2-rc.1 from npm at `/tmp/ab387-ext/dsh-npm`, started by a wrapper `/tmp/ab387-dsh-bin/dsh` (`exec /opt/homebrew/bin/node …/@deepseek-ai/dsh/lib/bin.js "$@"`), `DEEPSEEK_HARNESS_COMMAND` pointing at it.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `9dd599dfe3` | macOS, Node 22.21.1 | server `src` + tests under the build policy | all | Pass | `evidence/implementation/IMP-01-server-typecheck.log` | `[typecheck] PASS` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | `9dd599dfe3` | macOS, Node 22.21.1 | server unit, app-data-migration, architecture, work-journal tests | all; AC-016/017 | Pass | `evidence/implementation/IMP-02-server-unit.log` | `Test Files  930 passed \| 5 skipped (935)` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:integration:prepare && pnpm -C autobyteus-server-ts test:integration` | `3514947952` | macOS, Node 22.21.1 | server integration incl. credential proxy host, git smart HTTP, provider relay, run managers | AC-009, AC-017, QR-002 | Pass | `evidence/implementation/IMP-03-server-integration.log` | `Test Files  88 passed \| 20 skipped (108)` |
| IMP-04 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts tests/e2e/runtime/grok-build-compaction-replay.e2e.test.ts tests/e2e/runtime/tool-list-reopen-failure.e2e.test.ts tests/e2e/credential-proxy/integrations-graphql.e2e.test.ts --no-watch` | `9dd599dfe3` | macOS, Node 22.21.1, scripted Grok CLI | Grok on the migrated shared ACP layer end to end; integrations GraphQL | AC-016, AC-017 | Pass | `evidence/implementation/IMP-04-grok-and-integrations-e2e.log` | `Tests  15 passed (15)` |
| IMP-05 | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run components/settings/agent-runtimes utils/__tests__/deepseekHarnessRuntimePresentation.spec.ts utils/__tests__/grokBuildRuntimePresentation.spec.ts components/settings/model-routing services/activity` | `d5566977b4` | macOS, Node 22.21.1 | web Agent Runtimes row, presentation maps | AC-013 | Pass | `evidence/implementation/IMP-05-web-specs.log` | `Tests  41 passed (41)` |
| IMP-06 | `pnpm -C autobyteus-web typecheck`; `guard:web-boundary`; `guard:localization-boundary`; `audit:localization-literals` | `d5566977b4` | macOS, Node 22.21.1 | web types, localization | AC-013 | Pass | `evidence/implementation/IMP-06-web-typecheck-guards.log` | `[typecheck] PASS`, `Passed.` |
| IMP-07 | `pnpm -C autobyteus-web codegen:local`; `vitest run tests/architecture/tracked-imports.test.ts tests/architecture/web-generated-graphql-current.test.ts` | `3514947952` | macOS | generated GraphQL, tracked imports | AC-013 | Pass | (part of IMP-02 at `9dd599dfe3`) | both architecture tests pass in IMP-02 |
| IMP-09 | CR-001 recheck: `vitest run tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts tests/unit/standalone-application-host tests/architecture/tracked-imports.test.ts tests/integration/agent-execution/agent-run-manager.integration.test.ts`; `pnpm -C autobyteus-server-ts typecheck`; the IMP-04 E2Es | `cb132711f6` | macOS, Node 22.21.1 | supervisor construction and its input validation, through unit tests and the real studio composition | AC-016/017; dispositions (AR-008) | Pass | `evidence/implementation/IMP-09-cr-001-recheck.log` | `Tests  39 passed (39)`; `[typecheck] PASS`; `Tests  15 passed (15)` |
| IMP-10 | DEL-02 fix: full `pnpm -C autobyteus-server-ts test:unit` and `pnpm -C autobyteus-server-ts typecheck` | `ee6739fe7f` (includes the delivery merge `7c1117e209`) | macOS, Node 22.21.1 | all server unit, app-data-migration, architecture and work-journal tests | all; AC-016/017 | Pass | `evidence/implementation/IMP-10-del-02-unit-typecheck.log` | `Test Files  932 passed \| 5 skipped (937)`; `[typecheck] PASS` |
| IMP-08 | Gated live suite (real dsh, real DeepSeek API through the product relay, flash, effort low, test vault, isolated HOME): see the evidence header | `9dd599dfe3` (working tree at run time, committed right after) | macOS, Node 22.21.1 server, dsh 0.2.2-rc.1 on Node 25.2.1 | the whole dsh path: availability, catalog, Agent Runtimes row, standalone run (tools, skills, Agent Tool, approvals, stop, reopen, restore, pass refusal), owned-home config, Brief Studio launch in the application scope with pass refusal after the platform stopped, key-absence scan | AC-001…AC-009, AC-011, AC-013…AC-015, QR-001, QR-004 (via home config), DEC-020, AR-008 | Pass | `evidence/implementation/IMP-08-live-dsh-e2e.log` | `Tests  5 passed (5)`; `DSH_LIVE MODELS ["deepseek-v4-flash","deepseek-v4-pro","deepseek-flash"]`; `"stopLatencyMs":119`; `DSH_LIVE KEY_SCAN {"files":72,"environments":4,…}` |

- IR-002 rerun plan: `git diff --name-only 9dd599dfe3 cb132711f6 -- autobyteus-server-ts/src` = the supervisor and its new
  input file only (a move, no behavior change). Rerun: IMP-09 (supervisor tests, typecheck, scripted studio E2Es).
  Still valid: IMP-02/03 for everything else, IMP-05/06/07 (web unchanged), IMP-08 (live; the moved code is
  construction-time validation exercised again by IMP-09).
- IR-003 note: IMP-09 (the CR-001 recheck) left out `tests/architecture/agent-provider-composition-boundaries.test.ts`,
  which reads the supervisor's source text by path; delivery's unit run (DEL-02) caught it. IMP-10 reruns the whole
  unit suite (it includes every architecture test) and the typecheck gate at `ee6739fe7f`; IMP-02 is superseded by it.
  The stage check is now in TESTING.md, "Rerun by impact", step 3 (`14fe5959bf`).
- Real `~/.dsh`: mtimes of `~/.dsh`, `profiles`, `sessions`, `settings.yaml`, `storages` identical before and after IMP-08.
- Not run, and why: the full web `test:nuxt` and `test:electron` suites (only the affected web specs ran); other gated
  live suites (Grok, GitHub proxy live, other runtimes) — paid or need sign-ins, and the shared changes are covered by
  the scripted Grok E2Es and unit/integration suites; a live forced compaction (AC-010) and a live long-reasoning step
  (AC-012) — TESTING.md: live compaction is not required proof, and both are covered by the unit tests of relay-observed
  compaction and of liveness from relay activity; the key-removed-mid-run alternate of AC-009 live (the test vault is
  read-only; covered by the relay integration test `RELAY_KEY_NOT_SET` and the launcher unit test); RSK-004 memory
  measurement. These are left to API/E2E.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings → Agent Runtimes (a fifth row; its account line "API key set" / "API key not
  set" with "Save its API key in Settings → API Keys."), runtime pickers and model-routing colours (runtime name and
  colour), the system-instruction activity source label.
- Approved UI/UX, interaction, requirement, or design references: requirements doc "UI, Interaction, And Experience Requirements" (existing patterns; key-state line reads as the sign-in line, hint naming the API key settings).
- Existing design system, shared components, and adjacent product surfaces reviewed: `AgentRuntimeRow.vue` (same line and hint elements and classes as the Claude/AGY command-line hint), `agentRuntimesPresentation.ts`, model-routing colours.
- Testing guideline or development / preview instructions and rendered surface used: component tests (mounted `AgentRuntimesManager`) only.
- States, layouts, viewports, and interactions inspected: API key not set (text and hint, no Sign in button) and set (text, no hint), in the mounted component.
- Visual or interaction issues found and corrected: none.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-05. Not rendered in a browser or the desktop app (no browser probe or isolated instance run); the remote-node hint variant was not exercised.

## Downstream Coverage Hints / Suggested Scenarios

- A dsh member in a Team or Org (only standalone and the Brief Studio team ran live); a runtime switch to and from dsh
  (AC-014 second half: generic path, not exercised live).
- AC-009 alternate: remove the DeepSeek key from a writable vault during a run → the next turn fails with the relay's
  `RELAY_KEY_NOT_SET` text shown by dsh.
- AC-010 live with a lowered dsh compaction threshold (a test-only `--patch` on the dsh command) → `COMPACTION_STATUS`
  compacted and an archived raw-trace segment.
- AC-012 live: a high-effort long reasoning step (RT-016) completes without an idle failure.
- The standalone application host: dsh unavailable with the reason, and a launch refused before dsh starts.
- RSK-004: memory per dsh process with several concurrent runs.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent API/E2E validation per the route after code review, including the hints above and a rendered check of the
  Agent Runtimes row in an isolated desktop instance.
