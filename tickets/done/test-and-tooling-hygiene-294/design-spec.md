# Design Spec — test-and-tooling-hygiene-294 (autobyteus-294)

## Solution And Approval Basis

- Current solution revision ID: `SR-005`
- Approved requirements baseline: `requirements-doc.md` at SR-005, approved by the user on 2026-10-27 (references in its Document Status).
- Behavior-defining supplements: none.
- Design status: `Ready` (revised for ARCH-REV-001 at SR-005; REQ-032 approved by the user)
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-294/tickets/in-progress/test-and-tooling-hygiene-294/investigation-notes.md`
- Authorities read (2026-10-27): `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md` (rules 1, 5, 7, 9; Project-specific documents). `references/design-examples.md` not used: no shape here needs a worked example beyond the ones below.
- Conflicts or discrepancies: `TESTING.md` says the tracked-imports architecture test "runs … in every server test run", but `test:unit` does not include `tests/architecture` (fixed by H-01/DEC-002). No conflict between DESIGN.md and the general principles.

## Current-State Read

This is a hygiene ticket over existing owners. Nothing changes a runtime owner, a stored shape or a server contract. Every item has a found cause in the investigation notes (Source Log, Corrections). The causes fall into four kinds:

1. **A test lags the product it tests** (stale list, fixture, mock, stub, expectation, API call): H-01, H-02 (fixture part), H-03, H-04, H-09, H-10, H-11, H-12, H-16, H-22, H-26, H-27.
2. **A small product gap** that a test or tool exposed: H-02 (the Agent mutation fragment lacks `internal`, `graphql/mutations/agentDefinitionMutations.ts` L3-34 vs `graphql/queries/agentDefinitionQueries.ts` L29), H-18 (deprecated Fastify option), H-28 (icon classes no plugin provides), and the production type errors behind H-07.
3. **Tooling missing or misplaced:** H-05 and H-01 (folders outside every suite), H-07 (no web type gate), H-19 and H-23 (silent wrong results or skips), H-31 (TESTING.md rule).
4. **Dead code:** H-06, H-20, H-24, H-25, and the dead web components found by H-07.

Constraints the design respects: QR-001 (no weakened assertion), TESTING.md (one heavy run at a time, clean environments, gates), DESIGN.md rule 5 (delete before adding), Principle 7 (removal evidence).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: about 25 items in five packages (server `src`, `tests`, `test-support`; web app, specs, probes, scripts; gateway scripts; docs; TESTING.md). Removals touch about 100 files (65 `.js` twins, 20 tool files and tests, 4 components). The web type fixes touch about 40 production files and 30 files for icons.
- Architectural risk: `High`
- Risk rationale: (1) deployment pipeline: the type check joins the `build:electron*` chain, so a release build fails on a new type error; (2) dependency declarations change `autobyteus-web/package.json` and the lockfile importers (`@apollo/client`, `graphql`, `@vue/apollo-composable`, `vue-tsc`, Nuxt-module typings); (3) blast radius: type-error fixes in about 40 production stores, components and composables, where a careless "fix" can change runtime behaviour (R-1). There is no new runtime owner, persistence, server API or concurrency change.
- Escalation trigger: a type error whose correct fix changes runtime behaviour (a real bug) is not fixed silently: it is reported as a `Design Impact` with the file, line and behaviour, and the Solution Designer decides another disposition (a product fix with a test, with the user's approval when it changes visible behaviour); there is no production baseline and no suppression, so the gate stays red until it is resolved (§ Group C). Also: if `vue-tsc` 3.3.13 cannot run against Nuxt 3.21's generated config, or the gate adds more than about 2 minutes to `build:electron*` (QR-002).

## Architecture Investigation Evidence

| Source | Path / Reference | Observation | Decision |
| --- | --- | --- | --- |
| Source Log rows | `investigation-notes.md` | cause and proof per item | the work items below |
| Measured | `evidence/SD-17`, `SD-18` (base `2f48d85d4d`) | 507 full; 376 scoped = 105 production + 271 test files | DEC-003 |
| Measured | `evidence/SD-11`, `SD-20` | `tsc -p electron/tsconfig.json` and `-p build/tsconfig.json` exit 0; Electron with its specs: 27 errors, all specs | Electron project includes its specs, baselined |
| Read | `.nuxt/tsconfig.json` include `../**/*` | the Nuxt project sweeps in `electron/`, `build/` | separate typecheck config with exclusions |
| Read | `autobyteus-web/package.json` L40-45 | the `build:electron*` chain already runs `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, `transpile-electron` (tsc) and `tsc -p build/tsconfig.json` | the gate joins this chain |
| Read | `test-support/live-e2e/live-e2e-harness.ts` L588-592, L708-718, L1106-1129; `autobyteus-server-ts/src/compositions/native-command-shutdown.ts` | the harness builds two factories without a scope; production owns one `NativeCommandProcessScope` and closes it on shutdown | H-04 |
| Probe | Fastify probe (notes) | `logController: new LogController({ disableRequestLogging: true })`: 0 request lines, no warning | H-18 |
| Probe | `evidence/SD-14-arp-diagnostic-result.json` | the two probe edits make the probe green on macOS | H-12 |
| Read | `components/common/ToastContainer.vue` L13, `components/tools/ToolCard.vue` L35-37, `ToolList.vue` L64, `components/settings/providerApiKey/__tests__/ProviderModelBrowser.spec.ts` L147 | some icon classes are computed strings; one spec selects by the class | H-28 conversion rules |

## Intended Change

Repair every still-broken check in the approved scope at its cause, add the web type gate with a shrink-only test-file baseline, remove the listed dead code and tooling, and record two global testing rules in TESTING.md.

## Change Scope (Mandatory)

- In scope: UC-001..UC-006 (requirements doc), including BEH-032's four bug fixes (REQ-032). Areas: `autobyteus-server-ts/tests/{architecture,e2e,unit}`, `autobyteus-server-ts/package.json` (`test:unit`), `autobyteus-server-ts/src/agent-tools/{agent-management,agent-team-management}` (removed), `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`, the three Fastify instances, `autobyteus-server-ts/docs/modules/{agent_definition,agent_team_definition,agent_tools_mcp_server}.md`, `test-support/live-e2e/live-e2e-harness.ts`, `autobyteus-web` (mutation fragment, type fixes per the § Group C disposition table, the four bug fixes of BEH-032 with their specs, the dead audio-recorder chain and the overridden `nuxt.config.ts` `ignore` removed, Nuxt type scope in `nuxt.config.ts`, typecheck tooling, dead components, icons, codegen config and the two generated import lines, sanitisation spec, probes), `autobyteus-message-gateway` (scripts removed), `TESTING.md`.
- Derived consumers: (1) the Agent mutation fragment feeds the Apollo cache rows that `GetAgentDefinitions` reads (`stores/agentDefinitionStore.ts`): adding `internal` makes those rows complete; no other reader changes. (2) The SR-011 getter list and the tool-unit list are read only by the architecture test. (3) `generated/graphql.ts` is read by 15 type-only importers and one spec enum import: only its two import lines change.
- Deliberately left alone: the 271 test-file type errors (baselined, FU-004); the three web tests that import server code (excluded from the web project, FU-003); `@iconify/vue` online loading (FU-002); the Task-lifecycle race (FU-001); the withdrawn items (FU-005..FU-008); every live real-model run (DEC-025).
- Follow-ups: FU-001..FU-008.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | REQ / AC | Trigger | Change | Target path / spine |
| --- | --- | --- | --- | --- | --- |
| BEH-002 | User | REQ-002 / AC-002 | Agents page → Create / Edit | the mutation selects `internal` | DS-002 |
| BEH-018 | System | REQ-017 / AC-019 | server start | no FSTDEP023 | DS-003 |
| BEH-028 | User | REQ-027 / AC-029 | any page with a former class icon | `<Icon icon="heroicons:…">` renders | DS-004 |
| BEH-032 | User | REQ-032 / AC-034 | (a) phone new team run → load a workspace path; (b) Applications → team launch profile, member without runtime; (c) phone team messages; (d) Settings → API keys, saved custom provider while models load or failed | (a) workspace set through `set_root_workspace`, no throw; (b) the member's display name; (c) the counterpart's label; (d) "—" with the loading label | the screen's existing owner (§ Group C table) |
| BEH-007 | Operational | REQ-007 / AC-007..009 | `pnpm -C autobyteus-web typecheck`; `build:electron*` | new gate | DS-001 |
| All other BEH | Operational / Contract | per requirements | a ticket role runs the named check | the check repaired at its cause | the check itself (no product spine) |

## Relevant Supplemental Task Artifacts

None (evidence only, listed in the investigation notes).

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (with small `Bug Fix` parts: H-02, H-18, H-28 and the four bugs of BEH-032).
- Current design issue found: `Yes`, two, both small: the web package imports packages it does not declare (`@apollo/client`, `graphql`, `@vue/apollo-composable`), and the Nuxt type project covers two directories that own their own projects (`electron/`, `build/`).
- Structural triggers:
  - Legacy cleanup (Principle 8): fires — dead tools, twins, gateway scripts, test-only seam, dead components; all removed (Removal Plan).
  - Capability-area reuse (Principle 4): fires for the type gate, the icon fix and the live-harness scope; each reuses the existing owner (the web guards chain, `@iconify/vue`, `NativeCommandProcessScope`).
  - Several kinds or forms (Principle 1): the type gate serves three projects (Nuxt app, Electron main, build scripts) — each checked under its own config; the Fastify option exists in three servers — all three change.
  - Derived data (Principle 11): fires for the mutation fragment (cache rows) — covered in Change Scope.
  - Not firing: Persisted-data transition (no stored shape changes); Ambiguous boundary, Authoritative boundary, Split sequence, Shared-structure tightness (no interface or shared type changes); Responsibility overload (the new checker script owns one concern).
- Root cause classification: per item, mostly `Local Implementation Defect` in tests; H-07: `Boundary Or Ownership Issue` (undeclared dependencies, project scope); dead code: `Legacy Or Compatibility Pressure`.
- Refactor needed now: `No` beyond the removals and the dependency/scope corrections above.
- Evidence: investigation notes.
- Design response: the work items below.
- Intentional deferrals: FU-003, FU-004 (type debt in tests, tracked by the baseline; it cannot grow).

## Terminology

- **Type-check baseline:** a committed list of test files with their current type-error counts; the gate fails when a file not listed has an error, a listed file has more, or a listed file has fewer (the list is then shrunk with the update command).
- **Test file (for the gate):** a path containing `/__tests__/`, ending `.spec.ts` or `.test.ts`, or under `tests/` or `test-support/` of `autobyteus-web`. Every other checked file is a production file and must have zero errors.
- No new domain words; `GLOSSARY.md` unchanged.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: see the Removal Plan.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. No stored shape is read or written differently. The removed tools were registered nowhere since `eef765b901`, so no run or definition can reference them as live tools; a stored agent configuration that names one of them already resolved to nothing before this change.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-007 | developer or `build:electron*` runs `typecheck` | pass, or a failure naming files | `autobyteus-web/scripts/typecheck.mjs` | the gate |
| DS-002 | Primary | BEH-002 | Agent create/edit in the store | catalog cache row complete | `agentDefinitionStore` (Apollo cache is its mechanism) | the 308 gap |
| DS-003 | Primary | BEH-018 | Fastify instance creation | request logging off, no warning | each composition (3) | deprecation |
| DS-004 | Primary | BEH-028 | component render | heroicon SVG | `@iconify/vue` `Icon` | invisible icons |

## Primary Execution Spine(s)

- DS-001: `pnpm typecheck → nuxt prepare → typecheck.mjs → vue-tsc (tsconfig.json, scope from nuxt.config) + tsc (electron/tsconfig.typecheck.json) + tsc (build/tsconfig.json) → error parser → baseline comparison → exit code + report`
- DS-002: `AgentCreate/AgentEdit → agentDefinitionStore.create/update → Apollo mutation (AgentDefinitionMutationFields incl. internal) → server agentDefinition resolver → cache write → GetAgentDefinitions cache read`
- DS-003: `build-studio-server / build-standalone-application-server / agent-tools-mcp-local-server → Fastify({ logController: new LogController({ disableRequestLogging: true }) })`
- DS-004: `component template → <Icon icon="heroicons:<name>"> → @iconify/vue → SVG`

## Spine Narratives (Mandatory)

| Spine | Narrative | Nodes | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | `nuxt prepare` writes `.nuxt/tsconfig.json`; the checker runs the three projects in turn, collects `path(line,col): error TS…` lines, classifies each path as production or test, and compares the test counts with `typecheck-baseline.json`. Production errors always fail. | script, three compilers, baseline file | `typecheck.mjs` | baseline update mode |
| DS-002 | The mutation returns the same field set the catalog query selects, so Apollo writes a complete row and the catalog stays readable from cache | store, mutation, cache | store | — |
| DS-003 | Each server builds Fastify with the Fastify 5 log controller | composition | composition | — |
| DS-004 | The class string becomes an `Icon` with the heroicons name; size and colour classes stay on the element | template | component | — |

## Spine Actors / Main-Line Nodes

The nodes above. No new runtime node.

## Ownership Map

- `autobyteus-web/scripts/typecheck.mjs` owns the gate: which projects run, the production/test classification, the baseline comparison and update rule.
- `autobyteus-web/typecheck-baseline.json` is data owned by that script (written only by its update mode, which refuses increases and new entries).
- Everything else keeps its current owner.

## Thin Entry Facades / Public Wrappers (If Applicable)

`package.json` scripts `typecheck` and `typecheck:update-baseline` are thin entries to `typecheck.mjs`; they own nothing.

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/agent-management/` (6 files) and `agent-team-management/` (6 files) | Dead: registration callers removed in `eef765b901`; `git grep` finds no import outside the folders and their tests | — (user decision) | remove the 10 SR-011 list entries; doc mentions in `agent_definition.md` L11, L144 (table row), L149 (`get_agent_definition`), `agent_team_definition.md` L190; comment in `internal-agent-visibility.ts` L12 drops `list_agent_definitions` |
| `autobyteus-server-ts/tests/unit/agent-tools/agent-management/*.test.ts` and `agent-team-management/*.test.ts` (10) | Dead: they test only the removed tools | — | |
| 65 tracked `autobyteus-server-ts/tests/**/*.js` (62 `.test.js`, 3 `tests/setup/*.js`) | Dead: `vitest.config.ts` includes only `tests/**/*.test.ts`; setup files are `.ts`; no script names them; compiled copies from `802033fe0e` | the `.ts` sources | the twin-less `tests/integration/agent/agent-team-websocket.integration.test.js` included |
| `autobyteus-message-gateway/scripts/build-runtime-package.mjs`, `release-manifest.mjs`, `package.json` `build:runtime-package`, `.gitignore` `.runtime-package-stage` | Dead: the manifest target and the managed-gateway feature were removed in `40f769e0d9` | — | the gateway README does not mention them (`grep`, 2026-10-27) |
| `ClaudeSdkStreamingSessionOptions.env` and `resolveSpawnEnvironment(explicitEnvironment)` parameter | Dead in production: set only by `claude-sdk-client.test.ts` | `resolveSpawnEnvironment()` over `process.env` | tests use `vi.stubEnv` |
| `components/agents/MarketplaceFilter.vue`, `RemoteAgentCard.vue`, `RunningAgentCard.vue`, `components/workspace/config/WorkspaceConfigForm.vue` and their localization keys | Dead: rendered nowhere (also not under Nuxt auto-import names); three import modules that do not exist | — | remove the keys through the project's localization files; `guard:localization-boundary` and `audit:localization-literals` pass |
| `components/AudioRecorder.vue`, `stores/audioStore.ts`, `stores/transcriptionStore.ts`, `workers/audio-processor.worklet.js`, `workers/transcriptionWorker.ts`, `types/transcription.ts`, `tests/stores/audioStore.test.ts` | Dead: `AudioRecorder.vue` is rendered nowhere (`git grep` for the tag and auto-import names, 2026-10-27); each other file is used only by the chain (`git grep`); `transcriptionStore` calls `agentRunStore` members that no longer exist | — (voice input is `workers/voice-input-recorder.worklet.js` and its own store, untouched) | found by the type check (AR-001) |
| `nuxt.config.ts` first `ignore` (L130-133) | Dead: overridden by the later `ignore` (L254-257) in the same object literal | the later `ignore` | effective config unchanged |
| DLC-008's file-stripping block in `delegated-launch-config-defaults.e2e.test.ts` L586-611 | Contrived since 197 (SCN-005); the upgrade is covered by the migration test F-T1/F-T2 | restore-of-recorded-values assertions (H-09) | |
| `team-run-v1-production-upgrade.e2e.test.ts` L1496-1498 | asserts a removed log line | L1457-1461 | |
| `i-heroicons-*` classes (75) | render nothing | `Icon` | |

## Return Or Event Spine(s) (If Applicable)

N/A: no event flow changes.

## Bounded Local / Internal Spines (If Applicable)

DS-001's comparison inside `typecheck.mjs`: `run project → parse lines → group by file → classify → compare with baseline → report → exit`. Update mode: `run → group → refuse if any file is new or higher → write the lower counts`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk if misplaced |
| --- | --- | --- | --- | --- | --- |
| baseline file | DS-001 | `typecheck.mjs` | per-file counts | ratchet | hand-edited growth: only the update mode writes it, and it refuses increases |

## Ownership Boundaries

No boundary changes. The web package now declares what it imports (Principle 3's dependency honesty at the package boundary).

## Boundary Encapsulation Map

N/A: no new boundary.

## Dependency Rules

- `autobyteus-web` declares every package its code imports: add `@apollo/client`, `graphql`, `@vue/apollo-composable` as dependencies at the resolved versions (3.14.0, 16.12.0, 4.2.2), and declare `vite` and `vue-bundle-renderer` as dev dependencies at the versions Nuxt already resolves, for `modules/electron/index.ts` (R-2); `pnpm install --frozen-lockfile` must then show no resolution change beyond the new importer entries.
- `vue-tsc` is a pinned dev dependency (3.3.13); the repository TypeScript (5.9.3) is used.
- Web tests do not import server code in new files (existing three excluded, FU-003).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity shape | Notes |
| --- | --- | --- | --- | --- |
| `pnpm -C autobyteus-web typecheck` | web type safety | run the gate | — | exit 0/1, report lists files |
| `pnpm -C autobyteus-web typecheck:update-baseline` | baseline | shrink counts | — | refuses new or higher |
| `AgentDefinitionMutationFields` | Agent mutation result | the catalog's field set | Agent id | adds `internal` |

## Interface Boundary Check

| Interface | Singular | Explicit | Risk | Action |
| --- | --- | --- | --- | --- |
| typecheck | Yes | Yes | Low | — |
| update-baseline | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Consistent | Risk | Action |
| --- | --- | --- | --- | --- | --- |
| gate script | `typecheck` | Yes | Yes (server has `typecheck`) | Low | — |
| baseline | `typecheck-baseline.json` | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| icon rendering | `@iconify/vue` `Icon` (304 uses) | Reuse | one icon mechanism |
| native process cleanup in the harness | `NativeCommandProcessScope` (`autobyteus-ts`) | Reuse | production owner |
| head-read stub | `tests/e2e/helpers/github-head-read-stub.ts` | Reuse | six files already use it; also its `codexLatestReleaseResponse` shape for the probe stub's 302 |
| outside-network refusal in a probe backend | `--import` fetch stub pattern (`model-routing-provider-usage.mjs`) | Extend (new small fixture) | the existing fixture is provider-specific; a projects probe stub that refuses every outside URL is its own concern |
| prerequisite check for Brief Studio | `scripts/integration-test-prerequisites.mjs` (`check`) | Reuse | the E2E files fail with the same message and command |
| type gate placement | web guards in `build:electron*` | Extend | same chain |

## Subsystem / Capability-Area Allocation

As in the Final File Responsibility Mapping; no new subsystem.

## Draft File Responsibility Mapping

Folded into the final mapping (no extraction step changed it).

## Reusable Owned Structures Check

| Repeated logic | Shared file | Decision |
| --- | --- | --- |
| Brief Studio package check in three E2E files | one helper in `tests/e2e/helpers/` (for example `brief-studio-package.ts`) that throws the prerequisite message | the three files import it instead of `describe.skipIf` |

## Shared Structure / Data Model Tightness Check

N/A: no shared data structure changes.

## Final File Responsibility Mapping

### Work items (in commit order)

Each item is its own commit. A fix whose cause is in a test is labelled as a baseline fix in its message and names the test and cause (TESTING.md Rule 9). TESTING.md changes are separate `docs(testing): …` commits.

**Group A — first (every delivery meets them)**

- **H-01 architecture suite.** `tests/architecture/application-framework-boundaries.test.ts`: add the `agent_runtimes` row after `agent_discovery` (L2119) exactly as `src/startup/agent-tool-loader.ts` L73-77 declares it; add `autobyteus-server-ts/src/agent-definition/services/internal-agent-visibility.ts` to the SR-011 getter list with the comment "Default factory of the internal-agent rule over the process definitions (autobyteus-308); the class takes an injected source." (DEC-001). `autobyteus-server-ts/package.json` `test:unit`: add `tests/architecture` (and `tests/agent-work-journal`, H-05).
- **H-02 Agent mutation field.** `autobyteus-web/graphql/mutations/agentDefinitionMutations.ts`: add `internal` to `AgentDefinitionMutationFields` after `ownerLocalApplicationId`, matching the query's order. `stores/__tests__/definitionMutationCache.spec.ts`: add `internal: false` to the agent fixture. Proven: 10/10 (notes).
- **H-03 archive E2E double.** `tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` L71-79: the `AgentDefinitionService` double also offers `getAgentDefinitionsWithTeamLocal` returning the same definitions the test's `getAgentDefinitionById` describes (so the internal-agent filter sees real definitions, not an empty list that would hide a regression).
- **H-04 live harness scope.** `test-support/live-e2e/live-e2e-harness.ts`: in each of the two scenario methods (L560-612 agent flow, L700+ compaction flow) create one `NativeCommandProcessScope` (from `autobyteus-ts`), pass it as `nativeCommandProcessScope`, and close it in the method's existing `finally` after the backend is terminated and before `workspace.close()`. No live run (DEC-025).
- **H-05 Work Journal tests.** covered by H-01's script change; `perf/` stays gated by its own condition.

**Group B — the user's removal decision**

- **H-06.** Remove per the Removal Plan; then `typecheck`, `test:unit` (with the architecture suite) and `git grep` per AC-006.

**Group C — the web type gate (H-07)**

- Nuxt project scope (ARCH-REV-001 R-1): `nuxt.config.ts` `typescript.tsConfig.exclude` adds `../electron/**`, `../build/**` and the three cross-package tests (FU-003). Nuxt merges this with `defu` (`@nuxt/kit` `dist/index.mjs` L3568), so the generated excludes stay and the user entries are appended, written relative to `.nuxt/` (for example `"../electron/**"`). The gate then runs `vue-tsc -p tsconfig.json`; no separate web typecheck tsconfig. After `nuxt prepare`, check `.nuxt/tsconfig.json` lists them.
- `autobyteus-web/electron/tsconfig.typecheck.json`: extends `./tsconfig.json`, `noEmit`, includes the specs (drop the spec excludes), adds the test globals' types. Production Electron files: 0 errors; specs: 27 baselined.
- `build/tsconfig.json`: checked as is with `--noEmit`.
- `autobyteus-web/scripts/typecheck.mjs`: runs the three projects in turn from `autobyteus-web` (vue-tsc for the Nuxt app, tsc for the other two) with the repository TypeScript and `--noEmit --pretty false`; classifies paths (Terminology); compares with `typecheck-baseline.json`; prints per-file differences and a summary. It exits 1 on: any production error; a test file with errors that is not in the baseline; a count higher or lower than the baseline; **any `error TS` line it cannot attribute to a file (for example TS2688, TS5xxx config errors) (ARCH-REV-001 AR-003); a compiler that exits non-zero, or ends by a signal, with no parsed diagnostic; a compiler that cannot be started.** `--update-baseline` writes lower counts and removes files at zero; it refuses (exit 1) if any count is higher or new, or on any of the failures above. The baseline holds paths relative to `autobyteus-web` and counts, sorted. Self-check in the implementation (AC-008 and these three cases): a temporary bad `types` entry, a temporary syntax error in a tsconfig, and a killed compiler each fail the gate.
- `autobyteus-web/package.json`: `"typecheck": "nuxt prepare && node ./scripts/typecheck.mjs"`, `"typecheck:update-baseline": "nuxt prepare && node ./scripts/typecheck.mjs --update-baseline"`; add `pnpm typecheck` to every `build:electron*` chain after `audit:localization-literals`; dependency declarations (Dependency Rules).
- Production errors (ARCH-REV-001 AR-001/AR-002): every one has a disposition below; none is fixed by `any`, a cast that hides a real mismatch, or a suppression. Counts from SD-18, recounted for the final config: 105 measured − 2 (`../autobyteus-server-ts/tests/fixtures/recorded-upload-labels.ts`, reached only through an excluded spec) = 103, of which 13 go with dead code, 1 with the codegen setting, 8 with the four bug fixes and 81 are type-only. The implementation records the final per-file result in its handoff.

  | File (errors) | Disposition | What changes |
  | --- | --- | --- |
  | `components/agents/MarketplaceFilter.vue` (2), `RemoteAgentCard.vue` (1), `RunningAgentCard.vue` (1), `components/workspace/config/WorkspaceConfigForm.vue` (1) | Dead | delete with their localization keys (Removal Plan) |
  | `stores/transcriptionStore.ts` (4), `stores/audioStore.ts` (2) | Dead | delete the audio-recorder chain: `components/AudioRecorder.vue` is rendered nowhere (no tag, no auto-import name; `git grep`), and it is the only user of `audioStore`, the only user of `transcriptionStore`; with them `workers/audio-processor.worklet.js`, `workers/transcriptionWorker.ts`, `types/transcription.ts` (used only by those two) and `tests/stores/audioStore.test.ts`. Voice input uses `workers/voice-input-recorder.worklet.js`, untouched |
  | `nuxt.config.ts` (2: TS1117 at L254, TS2345 at L260) | Dead | remove the first `ignore` (L130-133): the later `ignore` (L254-257) overrides it today, so the effective config is unchanged |
  | `generated/graphql.ts` (1) | Type-only | codegen setting below |
  | `composables/mobile/useMobileRunSetupController.ts` (3) | Bug fix (REQ-032 a) | team mode: on success set the workspace through `updateActiveWorkspaceConfig()` (`set_root_workspace`, L216-228); the loading-state calls apply to the agent store only; on failure show the message where the mobile team setup shows errors (confirm which state its view renders; no new UI); a spec drives team mode and fails on the base |
  | `utils/teamLaunchReadinessCore.ts` (3) | Bug fix (REQ-032 b) | `RUNTIME_REQUIRED` uses `displayName` like the other issues; a spec checks the message |
  | `components/mobile/MobileTeamMessages.vue` (1) | Bug fix (REQ-032 c) | `message.counterpart.label` (as `CollaborationMessagesPanel.vue` L254); a spec checks the label |
  | `components/settings/providerApiKey/customProvider/CustomProviderDetailsCard.vue` (1) | Bug fix (REQ-032 d) | `totalModels === null`: "—" with the `model_count_loading` label, as `ProviderModelBrowser.vue` L32-34; a spec checks both states |
  | `components/notifications/NotificationRow.vue` (6), `NotificationCenter.vue` (1) | Type-only | narrow the row union (`row.kind !== 'app'`) where source-row fields are read; the rendered conditions stay the same |
  | `components/fileExplorer/MonacoEditor.vue` (1) | Type-only | type the lower-cased value as `string` before mapping; same mapping |
  | `components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` (1) | Type-only | `LLMProvider.OPENAI_COMPATIBLE` (same value) |
  | `services/fileExplorerStreaming/FileExplorerStreamingService.ts` (1), `stores/transcriptionStore.ts` L119 (dead, above) | Type-only | exhaustive-switch default logs the raw message's type through a widened variable |
  | `utils/apolloClient.ts` (2), `plugins`-related Apollo types | Type-only | expected to resolve with the declared Apollo packages; otherwise type `nuxtApp.$apollo` from `@nuxtjs/apollo`'s types |
  | `modules/electron/index.ts` (3), `modules/devhandler-compat.ts` (1) | Type-only | declared `vite` and `vue-bundle-renderer` (Dependency Rules); `plugins` assignment and hook name typed through Nuxt's types |
  | `stores/runHistoryNavigationPatches.ts` (1), `utils/agentOrgLaunchPatch.ts` (1), `stores/fileExplorer.ts` (2), `stores/audioStore.ts` (dead), `stores/mediaLibraryStore.ts` (2), `composables/useVncSession.ts` (2), `components/workspace/tools/VncViewer.vue` (1), `components/settings/ExtensionsManager.vue` (1), `components/settings/AboutSettingsManager.vue` (1), `components/server/ServerLogViewer.vue` (1), `components/workspace/agent/AgentEventMonitor.vue` (1), `components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` (4), `composables/useRuntimeCurrentModelDescriptor.ts` (2), `services/qr/qrCodeDataUrlService.ts` (1: add `@types/qrcode` at the matching version) | Type-only (expected) | correct the declared type, prop/emit payload or readonly-ness; if the implementer finds the runtime value differs from the declared type in a way the user can see, it is a `Design Impact` (escalation trigger) |
  | the 45 implicit-`any` callback parameters and bindings (excluding the 2 of `useRuntimeCurrentModelDescriptor.ts` listed above) (`stores/skillStore.ts` 11, `toolManagementStore.ts` 19, `skillSourcesStore.ts` 3, `memorySearchStore.ts` 3, and one or two each in `agentDefinitionOptionsStore.ts`, `appDataMigrationsStore.ts`, `fileExplorerSearchActions.ts`, `fileExplorerTreeActions.ts`, `memoryJournalStore.ts`, `runHistoryLoadActions.ts`, `services/runConfigEditing/agentOrgRunConfigClient.ts`) | Type-only | type each parameter (mostly `(e: unknown)` / the GraphQL result's element type) |

  Escalation trigger, restated (AR-002): there is no production baseline and no suppression, so a production error cannot be deferred. A file whose correct fix would change behaviour beyond this table stops the implementation for that file and returns a `Design Impact` to the Solution Designer, who either adds it as a product fix (with the user's approval when it changes visible behaviour) or decides another disposition; the gate stays red until it is resolved.
- Delete the four dead components and their keys. `codegen.ts`: `config.vueCompositionApiImportFrom: 'vue'`; `generated/graphql.ts`: the two import lines become what codegen emits with that setting (`import * as VueCompositionApi from 'vue';`), nothing else (drift 0 today, SD-19).
- Then write the baseline with the update mode from the remaining test-file errors (expected about 271 + 27; record the final counts in the implementation handoff).
- `TESTING.md` (`docs(testing): add the web type check layer`): a row "Web typecheck | Nuxt app, Electron main and build scripts under their own configs; production files must have no errors, test files may not exceed `typecheck-baseline.json` | `pnpm -C autobyteus-web typecheck`"; one sentence that a lower count also fails until `typecheck:update-baseline` shrinks the baseline, and that the update refuses growth (R-5).

**Group D — gated E2E and probes**

- **H-09 DLC.** `memberSources` also returns `followsTeam: f(member, "followsTeam")`. DLC-001 expects: `lead {launch: inheritedLaunch(), source: null, followsTeam: true}`, `engineer` and `reviewer` own launches with `followsTeam: false`, the four fallback members `launch: inheritedLaunch()` with their fallback sources and `followsTeam: true` (matches `evidence/SD-04b`). Every other place that expects a member `launch: null` for an inheriting member changes the same way. DLC-008: remove the stripping block; after `reconnect`, assert the restored copy B's and the Pair copy's member launches and sources equal what was recorded before the stop (copy B engineer `{launch: ownLaunch(AGY, ALT), source agent_default, followsTeam: false}`; the Pair copy's engineer its recorded Grok launch), and that copy B's engineer and reviewer start on their recorded model (`ALT`), copy A's engineer on Grok as today. Update the header comment and the case title (drop "a pre-change saved tree restores on the Team value", keep AC-008; AC-009's released-shape upgrade is covered by `tests/app-data-migrations/delegated-copy-own-file-complete-v1/…test.ts` F-T1/F-T2). Run gated (header command).
- **H-10 SUN-E2E-003.** Import `headReadRepository`, `headReadResponse`; answer `apar-sun-e2e/skills` head reads with `githubRevision` before the API/codeload branch and push the URL to `githubRequests` so the receipt lists it.
- **H-11 multi-image.** Team member reads use `getTeamMemberFileChanges(teamRunId, agentRunId)` and `/rest/team-runs/:teamRunId/agent-runs/:agentRunId/file-change-content`; the standalone case keeps the run-id routes. Pass the owner explicitly to the helpers (for example `listArtifacts({ teamRunId, runId })`), not a mutable module variable.
- **H-12 Agent Runtimes probe.** `tests/e2e/fixtures/agent-runtimes-vendor-sources.mjs`: Codex's source is `https://github.com/openai/codex/releases/latest`, answered with a 302 to `…/releases/tag/<tag>` (the node's reader, `github-repository-client.ts` L36-58) for a 200 configuration and with the configured status otherwise; keep the source file's `codex` answer as the tag (rename `body` content from the REST JSON to the tag only if simpler, and update the probe's writes). `agent-runtimes-settings-probe.mjs`: after ARP-07 resets the locale, `await open()` so the page is English on every platform.
- **H-14.** No change; one run of `test:e2e:electron:isolation` on macOS.
- **H-16.** Remove L1496-1498 (comment and assertion).
- **H-22 RA-04.** At RA-04's start, after setting the newer release, `await client.mutate("checkAgentRuntimes")` once unconditionally, then the existing loop.
- **H-23 Brief Studio.** The helper from the Reusable Structures check throws `Brief Studio importable package missing (<path>); build it with: pnpm -C autobyteus-server-ts test:integration:prepare` in each suite's `beforeAll` (the suite then fails loudly, R-3); the three files use a plain `describe`. TESTING.md (`docs(testing): name the E2E build prerequisite`): the Server E2E row says suites that import Brief Studio need `test:integration:prepare` once and fail naming it otherwise.
- **H-26 Codex routing E2E.** `const lease = getCodexAppServerClientManager().beginAcquire(senderWorkspaceRoot); const client = await lease.acquire();` and `await lease.release()` in the test's cleanup after the observer is unbound and the runs are terminated. Run once with `RUN_CODEX_E2E=1` (signed-in `codex`, real `HOME`).
- **H-27 PT-E2E-013.** New `autobyteus-web/tests/e2e/fixtures/outside-network-offline.mjs` (`--import` into the projects probe's backends): every request to a host other than `127.0.0.1`/`localhost` fails as a network error and is logged by host. PT-E2E-013 first reads the board search's meaning-search state (GraphQL `searchProjectTasks` … `meaningSearch { state }` or the board's UI state) and asserts `UNAVAILABLE`, then asserts the no-match state as today.

**Group E — server and web cleanups**

- **H-18 Fastify.** In the three files, `import Fastify, { LogController } from "fastify"` and replace `disableRequestLogging: true` with `logController: new LogController({ disableRequestLogging: true })`.
- **H-19 sanitising.** New `autobyteus-web/composables/__tests__/useMarkdownSegments.sanitization.spec.ts` with `// @vitest-environment jsdom`: raw HTML with `<script>`, `<img onerror>`, `<a href="javascript:…">`, `<iframe>`, an `onclick` attribute, and a Markdown link `[x](javascript:…)`: none survives in `parsedSegments` content; allowed formatting (`strong`, a style attribute) survives. TESTING.md (`docs(testing): sanitisation specs run under jsdom`): one bullet near the web layers.
- **H-20, H-24, H-25.** Per the Removal Plan. H-24: `resolveSpawnEnvironment()` reads `process.env`; the client tests set their environment with `vi.stubEnv` (restore with `vi.unstubAllEnvs`) and assert the builder's output (auth policy, cache default), which is what production sends.
- **H-28 icons.** Each `<span class="i-heroicons-X-20-solid …">` becomes `<Icon icon="heroicons:X-20-solid" class="…">` with the remaining classes; computed class strings become computed icon names (`ToastContainer.vue` L13, `ToolCard.vue` L35-37, `ToolList.vue` L64 and their consumers); add `import { Icon } from '@iconify/vue'` where missing. `ProviderModelBrowser.spec.ts` L147: assert the same absence through the icon (for example a `data-testid` on the icon or the stubbed `Icon`'s `icon` prop), not by dropping the check. `git grep i-heroicons-` returns nothing.
- **H-30 docs.** `agent_tools_mcp_server.md` § Supported Tool Families lists every provider in `default-agent-tool-mcp-adapter-providers.ts` L16-29 with its source folder.

**Group F — TESTING.md live compaction rule (H-31)**

- `docs(testing): live compaction runs are not required proof`: under "Forcing compaction early", add: "Prove compaction with the deterministic layers: the core library and server unit tests (including the shared live-compaction boundary tests, which make no provider calls) and scripted runtimes with a lowered threshold. A live compaction run against a real model is not required proof for a ticket and not a gate: it needs a real provider key or signed-in CLI and enough input to reach the compaction threshold, and its outcome depends on the model, so a live failure alone is not a defect. Run one only when the user asks for it. This applies to compaction only: other real-provider runs with a small input keep the rule under Gates (run them when the change needs real-provider proof)."

### Files

| File | Change |
| --- | --- |
| `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` | Modify (H-01, H-06) |
| `autobyteus-server-ts/package.json` | Modify (`test:unit`) |
| `autobyteus-web/graphql/mutations/agentDefinitionMutations.ts`, `stores/__tests__/definitionMutationCache.spec.ts` | Modify (H-02) |
| `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | Modify (H-03) |
| `test-support/live-e2e/live-e2e-harness.ts` | Modify (H-04) |
| `autobyteus-server-ts/src/agent-tools/agent-management/**`, `agent-team-management/**`, `tests/unit/agent-tools/agent-management/**`, `agent-team-management/**` | Remove (H-06) |
| `autobyteus-server-ts/docs/modules/agent_definition.md`, `agent_team_definition.md`, `src/agent-definition/services/internal-agent-visibility.ts` (comment) | Modify (H-06) |
| `autobyteus-web/electron/tsconfig.typecheck.json`, `scripts/typecheck.mjs`, `typecheck-baseline.json` | Add (H-07) |
| `autobyteus-web/package.json`, `pnpm-lock.yaml`, `codegen.ts`, `generated/graphql.ts` (2 lines), about 40 production files | Modify (H-07) |
| `autobyteus-web/components/agents/{MarketplaceFilter,RemoteAgentCard,RunningAgentCard}.vue`, `components/workspace/config/WorkspaceConfigForm.vue`, the audio-recorder chain (Removal Plan) | Remove (H-07) |
| `autobyteus-web/nuxt.config.ts` | Modify (scope excludes, dead `ignore`) |
| `autobyteus-web/composables/mobile/useMobileRunSetupController.ts`, `utils/teamLaunchReadinessCore.ts`, `components/mobile/MobileTeamMessages.vue`, `components/settings/providerApiKey/customProvider/CustomProviderDetailsCard.vue`, and a spec for each | Modify / Add (H-32, REQ-032) |
| `autobyteus-server-ts/tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts` | Modify (H-09) |
| `autobyteus-server-ts/tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts` | Modify (H-10) |
| `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts` | Modify (H-11) |
| `autobyteus-web/tests/e2e/fixtures/agent-runtimes-vendor-sources.mjs`, `tests/e2e/agent-runtimes-settings-probe.mjs` | Modify (H-12) |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | Modify (H-16) |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts`, `build-standalone-application-server.ts`, `src/agent-tools/mcp/agent-tools-mcp-local-server.ts` | Modify (H-18) |
| `autobyteus-web/composables/__tests__/useMarkdownSegments.sanitization.spec.ts` | Add (H-19) |
| `autobyteus-message-gateway/scripts/*`, `package.json`, `.gitignore` | Remove/Modify (H-20) |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` | Modify (H-22, H-23) |
| `autobyteus-server-ts/tests/e2e/helpers/brief-studio-package.ts` | Add (H-23) |
| `autobyteus-server-ts/tests/e2e/runtime/application-reload-repair.e2e.test.ts`, `application-import-codex-launch.e2e.test.ts` | Modify (H-23) |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`, `tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Modify (H-24) |
| 65 `autobyteus-server-ts/tests/**/*.js` | Remove (H-25) |
| `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` | Modify (H-26) |
| `autobyteus-web/tests/e2e/fixtures/outside-network-offline.mjs` | Add (H-27) |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | Modify (H-27) |
| about 30 web components with `i-heroicons-*`, `ProviderModelBrowser.spec.ts` | Modify (H-28) |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Modify (H-30) |
| `TESTING.md` | Modify (H-07, H-19, H-23, H-31; separate commits) |

## Applied Patterns (If Any)

Ratchet baseline for the type gate (a known practice for adopting a type check on existing code).

## Target Subsystem / Folder / File Mapping

As in the Files table; new files sit beside their peers (`autobyteus-web/scripts/` with the other guards, `tests/e2e/fixtures/` with the other probe stubs, `tests/e2e/helpers/` with the other E2E helpers).

## Folder Boundary Check

| Path | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `autobyteus-web/scripts/typecheck.mjs` | Off-Spine (tooling) | Yes | Low | beside `guard-web-boundary.mjs` |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| icon | `<Icon icon="heroicons:plus-20-solid" class="w-4 h-4 mr-1" />` | adding a Tailwind icon plugin to keep the classes | one icon mechanism |
| type fix | narrow a `string \| undefined` with a guard that keeps today's behaviour, or correct a wrong declared type | `as any`, `// @ts-ignore`, changing runtime logic to satisfy a type | R-1 |
| DLC-008 replacement | assert restored values equal recorded values | editing saved files at runtime | SCN-005 |
| baseline | `{ "stores/__tests__/x.spec.ts": 3 }`, shrink only | a global error count, or excluding test folders from the check | per-file ratchet catches growth anywhere |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why considered | Decision | Replacement |
| --- | --- | --- | --- |
| keep `i-heroicons-*` via a CSS icon plugin | fewer edits | Rejected | `Icon` |
| keep the Claude `env` option for tests | test convenience | Rejected | `vi.stubEnv` |
| keep DLC-008's released-shape restore by editing files | coverage of old trees | Rejected | migration test F-T1/F-T2 |
| keep the gateway scripts "in case" | — | Rejected | removed |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Group A (each its own commit, baseline-fix labels where the cause is in a test).
2. Group B.
3. Group C: dependency declarations and tsconfig files → checker script → production fixes (by area, commits per area, per the § Group C table) → the four BEH-032 bug fixes, each its own commit with its failing-first spec → dead components and the audio-recorder chain, the overridden `ignore` → codegen lines → baseline written → `build:electron*` chain → TESTING.md row.
4. Groups D and E (each item its own commit).
5. Group F.
6. Validation (API/E2E): server `typecheck`, `test:unit`, `test:integration`; web `test:nuxt`, `typecheck`, guards; the named E2E files and gated runs (one heavy run at a time); the two probes; `test:e2e:electron:isolation`; the Codex routing E2E (`RUN_CODEX_E2E=1`); a clean clone of the final branch.

## Key Tradeoffs

- Baseline instead of fixing 271 test-file errors: the gate is green and cannot grow now; the burn-down is tracked (FU-004).
- Excluding three cross-package tests from the web type project: avoids type-checking server code under web options; tracked (FU-003).
- The gate in `build:electron*`: a release build can fail on a new type error — intended, like the existing guards; about 40 s added.

## Risks

- R-1 (type fixes change behaviour): mitigated by the escalation trigger and the full web suite; review checks each production fix.
- Dependency declarations: confirm `pnpm install --frozen-lockfile` after the lockfile update, and that `pnpm why` shows one resolution of each.
- DLC replacement assertions depend on the recorded values; the implementation confirms them from the receipt before asserting.

## Guidance For Implementation

- Reproductions to start from: the failing commands in `investigation-notes.md` Source Log (architecture, definition cache, archive E2E, secret-management, the three gated E2E with the header commands, the Agent Runtimes probe). Each fix turns its reproduction green.
- Follow TESTING.md: clean environment for E2E (`env -i PATH HOME=<resolved temp> TMPDIR`), the scripted AGY CLI for gated runs, one heavy run at a time; no live real-model compaction run (DEC-025).
- Report any production type error whose fix would change behaviour (escalation trigger) instead of choosing a fix.
