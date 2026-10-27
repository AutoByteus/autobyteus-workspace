# Code Review Report — test-and-tooling-hygiene-294 (autobyteus-294)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-005, approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited rows only)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-005)
- Design Spec Reviewed As Context: `design-spec.md` (SR-005; § Group C table governs)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001..FU-009); `evidence/SD-18` (base production errors), `IMP-04`, `IMP-05`, `IMP-06`, `IMP-08`
- Relevant Solution Revision IDs: SR-002, SR-004, SR-005
- Design Review Report Reviewed As Context: `design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001, including "Deviations and additions" 1–10)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Trigger: implementation handoff IR-001 (Large / High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-294`, branch `codex/test-and-tooling-hygiene-294`, `origin/personal` (`2f48d85d4d`)..`6fa5f443c6` (43 commits); `cf5192d830` holds the ticket documents only.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The type gate joins every `build:electron*` chain, the dependency declarations change, and about 45 production web files change. Confirmed.

## Review Scope

- Changed implementation and behavior reviewed: H-01..H-32 (groups A–F) and all 10 handoff deviations.
- Files / areas reviewed:
  - Web type gate: `scripts/typecheck.mjs`, `scripts/lib/typecheckGate.mjs` and its spec, `typecheck-baseline.json`, `electron/tsconfig.typecheck.json`, `nuxt.config.ts`, `package.json`, `vitest.config.mts`.
  - Every production web type fix (stores, services, utils, components, composables, `types/electron.d.ts`, `modules/electron/index.ts`), checked against the base error list in SD-18.
  - Apollo typing: `plugins/30.apollo.client.ts`, `utils/apolloClient.ts`.
  - BEH-032 (a)–(d) fixes and their specs.
  - The removed dead code: components, audio chain, `devhandler-compat`, `routeRules`, the VNC config key.
  - Icon conversions, including the computed names in `ToastContainer`, `ToolCard` and `ToolList`.
  - Server: the three Fastify compositions and five test setups, the Claude client, the removed agent-management tools, the architecture lists, `test:unit`.
  - `test-support/live-e2e/live-e2e-harness.ts`.
  - Every changed E2E file: DLC, SUN, multi-image, archive, RA-04, Brief Studio ×3, Codex routing, team-run-v1.
  - The gated integration tests, both web probes and their fixtures, the sanitisation spec and the preflight spec.
  - Gateway scripts, docs and TESTING.md.
- Explicit exclusions: the 55 deleted `.js` twins and 10 deleted tool tests were checked by `git grep` only, not read line by line. Lockfile content was not read; IMP-15 covers it.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (SR-005; Preserved Behavior Boundary; QR-001..003; DEC-001..026).
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: round 2, Pass (ARCH-REV-002).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: none. Deviation 4 (FSTDEP022 moved to `routerOptions`) falls within REQ-017 / AC-019 ("no Fastify deprecation"). Deviation 5 (Rule 9 fixes) changes no product behaviour.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001, 005 | Confirmed | `agent_runtimes` row, Memory Search loader row, `internal-agent-visibility.ts` and `model-routing-composition.ts` list entries, each with its comment; `test:unit` adds `tests/architecture tests/agent-work-journal` | — |
| BEH-002 | Confirmed | `internal` in `AgentDefinitionMutationFields`; `generated/graphql.ts` changes only by codegen's 4 lines plus the import line (IMP-16) | — |
| BEH-003 | Confirmed | the double returns real definitions with `internal: false` from both methods, so the internal-agent filter sees them | — |
| BEH-004 | Confirmed | one `NativeCommandProcessScope` per scenario method, closed in its `finally` before `workspace.close()`; in the compaction flow, after `backend.terminate()` | — |
| BEH-006, 020, 024, 025 | Confirmed | `git grep` finds no reference to the removed tools, modules, scripts, twins or `env` option. In production, `resolveSpawnEnvironment()` returns what it returned before when no explicit env was passed | — |
| BEH-007 | Confirmed | DS-001 as designed. Fails closed on an unattributed `error TS`, unexpected stdout, a signal, a start failure, or a non-zero exit with no diagnostic. The update refuses growth (IMP-06 SC-1..10) | — |
| BEH-009..011, 016, 022, 023, 026, 027, 012 | Confirmed | each matches its Group D row (details under the structural checks) | — |
| BEH-018 | Confirmed | `logController: new LogController({ disableRequestLogging: true })` and `routerOptions: { maxParamLength }` in all three compositions; no top-level option is left in server `src`/tests (`git grep`) | — |
| BEH-019, 030, 031 | Confirmed | jsdom spec; doc rows; TESTING.md text as designed | — |
| BEH-028 | Confirmed | `git grep i-heroicons` is empty in `autobyteus-web`. Computed names were converted at their source (`ToolCard` `icon`, `ToolList` `emptyIcon` default and its `ToolsManagementWorkspace` caller, `ToastContainer`) | — |
| BEH-032 (a) | Confirmed | team mode: on success, `updateActiveWorkspaceConfig()` → `applyConfigEdit({kind:'set_root_workspace'})`; on failure, `useMobileLaunchWorkspaces.loadByPath` sets `error` (L99), which `MobileRunSetup.vue` L52 renders. Agent mode is unchanged. The spec goes through the real picker emit (IMP-08) | — |
| BEH-032 (b), (c), (d) | Confirmed | `displayName`; `counterpart.label`; "—" with the `model_count_loading` label when `totalModels === null` | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | REQ-001..031 | Operational | ticket role | run the TESTING.md layers | package scripts | Normal | each check as changed | green or a loud prerequisite failure | requirements | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, 028, 032 | User | user | edit Agents; use the icon buttons; phone Team setup; team messages; custom providers | Agents page, Settings, phone views | Normal | DS-002, DS-004, the BEH-032 owners | as the BEH rows | requirements | Supported Normal Scenario | Use |
| SCN-003 | BEH-018 | System | server start | quiet startup | the 3 compositions | Normal | DS-003 | no FSTDEP, no request logs | IMP-12 | Supported Normal Scenario | Use |
| CT-001 | Principle 7, 8, 15 | Contract | — | dead code in touched files is removed; no compatibility slots; one name per concept | engineering contract | — | `utils/apolloClient.ts`, `plugins/30.apollo.client.ts` | — | design-principles | Contract | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `getApolloClient` keeps an unreachable fallback through `_apolloClients` / `$apollo.clients` / `$apollo.defaultClient` and an unused `clientId` parameter. `registerBoundApolloClient` still writes these "nuxt-apollo compatibility slots", and the change adds a `#app` NuxtApp augmentation that declares `_apolloClients` and `$apollo` app-wide only to type them | CT-001 | — (structural) | Every `getApolloClient()` call finds the bound key first, because `registerBoundApolloClient` sets it in the same call that fills the other slots. That function is the only writer of all three (`git grep`). `@nuxtjs/apollo` is installed but not registered in `modules`, so nothing else writes or reads them. No caller passes `clientId` (79 calls, all `getApolloClient()`). The new augmentation makes `nuxtApp.$apollo` look like a supported surface | `plugins/30.apollo.client.ts` L88-113; `utils/apolloClient.ts` L13-20; `nuxt.config.ts` `modules`; `plugins/__tests__/apollo.client.spec.ts` L17-27 ("compatibility slots") | Promote | This ticket (both files touched; augmentation is new code) | Local Fix (below, CR-001) |
| C-02 | `@nuxtjs/apollo` dev dependency is unused | CT-001 | — | Removing it changes the lockfile beyond the design's dependency rule (R-2) | `git grep`; `nuxt.config.ts` | Promote | Follow-up | FU-010 |
| C-03 | `modules/electron/index.ts` throws when the Vite config has no plugin list (was `??= []`) | Principle 6 | — | The three `vite:extendConfig` callers in `@nuxt/vite-builder` 3.21.11 (L1026/1048, L1211/1239, L2058/2132) all pass a config with `plugins: [...]`, so the branch is an explicit invariant, not new recovery machinery | vite-builder `dist/index.mjs` | Reject | — | no action |
| C-04 | `'LOCAL' as ToolOriginEnum` cast | R-1 / Group C rule "no cast that hides a mismatch" | — | TypeScript checks a string literal's comparability with a string-enum value, so a renamed wire value would still fail the cast. Codebase precedent: `generated/graphql.ts` is imported type-only (design Change Scope (3)) | `toolManagementStore.ts` L134, L286 | Reject | — | acceptable as written |
| C-05 | `types/electron.d.ts` `readLogFile` now differs from `electron/types.d.ts` L66 | Principle 11 | — | The web declaration matches the handler (`electronApplication.ts` L307-320). The duplicate declaration predates this change | read | Reject | — | no finding; the new type is the accurate one |
| C-06 | DLC-008 replaced; RA-04 extra Check; e2eLaunchPreflight expectation; ProviderModelBrowser `findAllComponents(Icon)` | QR-001 | — | Each replacement proves the same or a stronger outcome: recorded = restored, plus started models; EADDRINUSE + port; "no icon at all" | diffs | Reject | — | not weakened |
| C-07 | `test:nuxt` excludes `electron/**` | SCN-001 | — | `electron/vitest.config.ts` includes `**/*.{test,spec}.{js,ts}` under `electron/`. All 49 tracked Electron specs run there (IMP-04: 49 files) | read | Reject | — | no coverage lost |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | handoff § Task Design Health; per-item posture preserved | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | none apply; the Group C table is followed | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..004 as designed; the gate's bounded local spine (run → parse → classify → compare → exit) is readable | — |
| Ownership boundary preservation and clarity | Pass | the gate owns its rules (`typecheckGate.mjs` is its pure rule file); the plugin owns the client binding | — |
| Off-spine concern clarity | Pass | baseline written only by the update mode | — |
| Existing capability/subsystem reuse check | Pass | `Icon`, `NativeCommandProcessScope`, `github-head-read-stub`, the `--import` stub pattern; the Brief Studio helper extracted once | — |
| Reusable owned structures check | Pass | `brief-studio-package.ts` is used by 3 suites | — |
| Shared-structure/data-model tightness check | Fail | the NuxtApp augmentation adds two parallel shapes (`_apolloClients`, `$apollo.{clients,defaultClient}`) for the one bound client (CR-001) | CR-001 |
| Repeated coordination ownership check | Pass | — | — |
| Empty indirection check | Pass | `package.json` scripts are thin entries, as designed | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | `TreeNode` helpers moved to module scope, unchanged logic | — |
| Ownership-driven dependency check | Pass | web declares what it imports (IMP-15) | — |
| Authoritative Boundary Rule check | Pass | — | — |
| File placement check | Pass | new files sit beside their peers | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API boundary clarity | Pass | `getApolloClient` has an unused `clientId` selector (part of CR-001) | CR-001 |
| Naming quality; one concept, one name (Principle 15) | Pass with CR-001 | one client under four names (`__boundApolloClient`, `_apolloClients.default`, `$apollo.defaultClient`, `$apollo.clients.default`), now typed app-wide | CR-001 |
| No unjustified duplication of code | Pass | — | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules (Principle 7) | Fail | CR-001 | CR-001 |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | BEH-032 specs enter through the real triggers (picker emit, component mount) and fail on base (IMP-08) | — |
| Test fixtures/helpers reusable; structure coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests retained in changed scope | Fail | `plugins/__tests__/apollo.client.spec.ts` "registers bound client in both custom and nuxt-apollo compatibility slots" asserts the dead slots | CR-001 |
| API/E2E readiness | Pass | the handoff's "not run" list and coverage hints are concrete | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Lines Before | After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/scripts/typecheck.mjs` | new | 131 | Pass | 146 added (new file) | the gate's run/report | beside the guards | OK | — |
| `autobyteus-web/scripts/lib/typecheckGate.mjs` | new | 98 | Pass | 108 added | the gate's pure rules, with a spec | `scripts/lib` | OK | — |
| `components/applications/ApplicationLaunchSetupPanel.vue` | 500 | 498 | Pass (not grown) | 3+/5- | unchanged | — | OK | — |
| `components/settings/VoiceInputExtensionCard.vue` | 499 | 498 | Pass | 7+/8- | unchanged | — | OK | — |
| `composables/mobile/useMobileRunSetupController.ts` | 412 | 416 | Pass | 13+/9- | unchanged owner | — | OK | — |
| `stores/toolManagementStore.ts` | 479 | 483 | Pass | 9+/4- | — | — | OK | — |
| `pages/settings.vue` | 450 | 450 | Pass | 13/13 | — | — | OK | — |
| `nuxt.config.ts` | 235 | 230 | Pass | 19+/25- | — | — | OK | — |
| `plugins/30.apollo.client.ts`, `utils/apolloClient.ts` | 108, 19 | 116, 20 | Pass | small | binding owner | — | CR-001 | CR-001 |
| server `claude-sdk-client.ts`, `build-studio-server.ts` | 342, 419 | 338, 419 | Pass | small | — | — | OK | — |

`test-support/live-e2e/live-e2e-harness.ts` (1297 → 1306) is test tooling; source thresholds do not apply.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Fail | the "nuxt-apollo compatibility slots" in the touched plugin are kept and newly typed (CR-001) |
| No legacy old-behavior retention in changed scope | Pass | `env` option, DLC-008 stripping, gateway scripts, class icons removed |
| Dead code removed in the touched files and modules | Fail | CR-001; the rest of deviation 2 is correct (`devhandler-compat`: the only `server:devHandler` caller passes two arguments, `@nuxt/vite-builder` L889; `routeRules` `middleware`: no `workspace` middleware exists; `config.public.vncPassword`: not declared in `runtimeConfig`) |
| Approved persisted-data transition decision followed | Pass | `Not Affected` |
| No version-specific dual reads/writes | Pass | — |
| Approved transition mechanics match | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/utils/apolloClient.ts` L13-20: the `_apolloClients` / `$apollo.clients` / `$apollo.defaultClient` lookup, and the `clientId` parameter | DormantPath | the bound key is always set first in the same call (`plugins/30.apollo.client.ts` L92); no caller passes `clientId` | unreachable; Principle 7 in a touched file | return the bound client, else throw |
| `autobyteus-web/plugins/30.apollo.client.ts` L94-112: writes to `_apolloClients` and `$apollo` (with the try/catch "fallback"), and the `NuxtAppLike` fields for them | CompatWrapper | only `getApolloClient`'s dead branch reads them; `@nuxtjs/apollo` is not a registered module | compatibility slots for a module the app does not run (Principle 8) | write only `[BOUND_APOLLO_CLIENT_KEY]` |
| the new `declare module '#app'` entries `_apolloClients?` and `$apollo?` | CompatWrapper (new) | added by `2396303c53` | they declare the dead slots app-wide and invite new readers | declare only `[BOUND_APOLLO_CLIENT_KEY]` |
| `plugins/__tests__/apollo.client.spec.ts` L17-27 assertions on `_apolloClients` / `$apollo` | UnusedTest | tests the slots above | test of dead behaviour | assert the bound key only |

## Docs-Impact Verdict

- Docs impact: `Yes`, already done in the change: TESTING.md (4 `docs(testing)` commits), `agent_definition.md`, `agent_team_definition.md`, `agent_tools_mcp_server.md`.
- Why: new gate, prerequisite rule, sanitisation rule, compaction rule; removed tools.
- Files or areas likely affected: none beyond the above.

## Additional Material Premise Validation (When Required)

None.

## Review Scorecard (Mandatory)

- Overall score: 9.2 / 10 (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001..004 implemented as designed; the gate's local spine is short and explicit | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | the gate owns its rules and baseline; fixes stay with their owners | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.2 | gate CLI is clear | `getApolloClient(clientId)` keeps a selector nothing uses | drop `clientId` (CR-001) |
| 4 | Separation of Concerns and File Placement | 9.5 | pure rules split from the runner; new files beside their peers | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 8.8 | `NuxtAppLike` and the new NuxtApp augmentation carry three parallel shapes for one client | overlapping representations made app-wide | one binding (CR-001) |
| 6 | Naming Quality and Local Readability | 9.3 | comments state causes; commit labels follow Rule 9 | one client under four names | CR-001 |
| 7 | API/E2E Readiness | 9.4 | clear not-run list, commands, look-for strings | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | every production type fix checked against SD-18: same runtime behaviour or the approved BEH-032 fix; BEH-032 specs fail on base | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 8.8 | many legacy paths removed | nuxt-apollo compatibility slots kept in a touched file and newly typed | remove (CR-001) |
| 10 | Cleanup Completeness | 8.8 | thorough removals with evidence, FU-009 recorded | deviation 1 removed one dead fallback and kept the adjacent ones (same reasoning) | finish CR-001 |

## Findings

### CR-001 — Dead Apollo compatibility slots kept and newly typed (Local Fix, implementation)

- Contract: Principle 7 (dead code in touched files), Principle 8 (no compatibility slots), Principle 15 (one concept, one name). Candidate C-01.
- Where: `autobyteus-web/utils/apolloClient.ts` L6-20; `autobyteus-web/plugins/30.apollo.client.ts` L10-26 (`NuxtAppLike`, the new `declare module '#app'`), L88-113 (`registerBoundApolloClient`); `plugins/__tests__/apollo.client.spec.ts` L17-27.
- Evidence:
  1. `registerBoundApolloClient` is the only writer of `__boundApolloClient`, `_apolloClients` and `$apollo` (`git grep`). It sets the bound key first (L92), so `getApolloClient` always returns at L9-11 when any slot exists. The `_apolloClients`/`$apollo` lookup (L13-20) is unreachable, the same way the `useApolloClient()` fallback that deviation 1 removed was unreachable.
  2. `@nuxtjs/apollo` is a dev dependency but not in `nuxt.config.ts` `modules`, so nothing outside these two files reads or writes those slots. The spec names them "nuxt-apollo compatibility slots".
  3. None of the 79 `getApolloClient` calls passes `clientId`.
  4. Commit `2396303c53` adds `_apolloClients?` and `$apollo?` to the app-wide `NuxtApp` type only so this dead branch type-checks. That makes one client available under four names on every `useNuxtApp()`.
- Consequence: dead code and a compatibility surface stay in files this change touches. The new augmentation advertises `nuxtApp.$apollo` as a supported binding, which future code may start to read.
- Required action, bounded:
  1. In `getApolloClient()`, drop the `clientId` parameter. Return `nuxtApp[BOUND_APOLLO_CLIENT_KEY]`, or throw the existing "not bound" error.
  2. In `registerBoundApolloClient`, write only the bound key. Shrink `NuxtAppLike` and the `#app` augmentation to `[BOUND_APOLLO_CLIENT_KEY]?`.
  3. Make the plugin spec assert the bound key only.
  4. Rerun `typecheck`, the plugin spec and `test:nuxt`.
- Not required here: removing the unused `@nuxtjs/apollo` dev dependency. It changes the lockfile beyond R-2 and is recorded as FU-010.

## Follow-ups

- Follow-ups this review added: FU-010 (unused `@nuxtjs/apollo` dev dependency and its stale `@ts-expect-error` comment).

## Classification

- `Local Fix` (implementation-owned): bounded to two production files and one spec, with no requirement or design change.

## Recommended Recipient

- Implementation Engineer (`/software_engineering_team/implementation_engineer`): "source review identifies an implementation-owned Local Fix … before executable coverage". After the fix: source review again (Targeted Delta Review on CR-001), then API/E2E.

## Residual Risks

- The handoff's not-run list remains API/E2E's: the Agent Runtimes and projects probes, `test:e2e:electron:isolation`, the `RUN_CODEX_E2E` and `RUN_CLAUDE_E2E` runs, full `test:integration` and `test:e2e`, the team-run-v1 upgrade E2E, the gateway checks and the clean clone.
- The projects probe's backends now refuse all outside network (`outside-network-offline.mjs`). Any other probe case that silently relied on an outside call will show up only in the probe run; `<node>-outside-network.log` lists the refused hosts.
- BEH-032 (d)'s spec fails on base partly because the new `data-testid` is missing. Its `not.toContain('null')` assertion still pins the actual bug.
- The handoff counts 51 Electron specs under the old `test:nuxt`, against 49 tracked files. No tracked spec is lost (C-07).

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.2 average; categories 5, 9 and 10 at 8.8 (CR-001); all others ≥ 9.2.
- Failure Origin: N/A
- Recommended Recipient: Implementation Engineer (Local Fix CR-001)
- Notes: the rest of the change is sound. Every production type fix matches SD-18 with unchanged behaviour or an approved BEH-032 fix. No `any` or suppression was added to production code. The gate fails closed as specified. No changed test assertion is weakened (QR-001).
