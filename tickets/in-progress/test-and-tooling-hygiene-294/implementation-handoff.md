# Implementation Handoff — test-and-tooling-hygiene-294 (autobyteus-294)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large / High) and passed (ARCH-REV-002); after implementation the route is source review (Code Reviewer).
- Requirements doc: `tickets/in-progress/test-and-tooling-hygiene-294/requirements-doc.md` (SR-005, approved)
- Investigation notes: `tickets/in-progress/test-and-tooling-hygiene-294/investigation-notes.md`
- Solution revision record: `tickets/in-progress/test-and-tooling-hygiene-294/solution-revision-record.md` (SR-001..SR-005)
- Design spec: `tickets/in-progress/test-and-tooling-hygiene-294/design-spec.md` (SR-005; § Group C table and its restated escalation trigger govern, R-6)
- Supplemental task artifacts: `follow-ups.md` (FU-001..FU-009; FU-009 added here), `evidence/` (SD-* from design, IMP-* from this implementation)
- Design review report: `tickets/in-progress/test-and-tooling-hygiene-294/design-review-report.md` (round 2, Pass)
- Architecture review revision record: `tickets/in-progress/test-and-tooling-hygiene-294/architecture-review-revision-record.md` (ARCH-REV-002)
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial)

All paths are under the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-294`, branch `codex/test-and-tooling-hygiene-294`, base `origin/personal` `2f48d85d4d`. The code commit range is `origin/personal..6fa5f443c6`; the ticket documents and evidence are committed after it (see the handoff message for the final commit).

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-002, SR-004, SR-005
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A

Every work item H-01..H-32 of groups A–F is implemented, mostly one commit per item, with each test-caused fix labelled "baseline fix" and naming its test and cause (TESTING.md Rule 9). TESTING.md changes are four separate `docs(testing): …` commits. 43 code commits (`origin/personal..6fa5f443c6`), 217 files changed.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the type gate joins every `build:electron*` chain (deployment pipeline); `autobyteus-web/package.json` and `pnpm-lock.yaml` change (no package version moves, IMP-15); the type fixes touch about 45 production web files (blast radius). No persistence, server API or concurrency change.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (Large / High)
- New design impact or escalation trigger: `None`. Every production type error resolved type-only, as dead code, or through the four approved BEH-032 fixes. No file's correct fix needed a visible behaviour change beyond the Group C table. The deviations listed below are within the approved requirements and recorded for review.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (H-01) | architecture lists match the source; `tests/architecture` in `test:unit` | `tests/architecture/application-framework-boundaries.test.ts`; `autobyteus-server-ts/package.json` `test:unit` | 54/54. Two more list lags were hidden behind the first failures and are fixed the same way: Memory Search in the background runner list (4ed53de608), and the Model Routing composition root in the ambient run-service list (930597c730). |
| BEH-002 (H-02) | Agent create/update return `internal` | `graphql/mutations/agentDefinitionMutations.ts` fragment; `generated/graphql.ts` (the 4 lines codegen emits); spec fixture | spec 10/10; generated code shows 0 drift against this branch's printed schema (IMP-16) |
| BEH-003 (H-03) | archive E2E double offers `getAgentDefinitionsWithTeamLocal` | `tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | 6/6 (IMP-18) |
| BEH-004 (H-04) | live harness owns and closes a native command scope per scenario | `test-support/live-e2e/live-e2e-harness.ts` (both scenario methods) | secret-management unit 160/160; no live run (DEC-025) |
| BEH-005 (H-05) | Work Journal tests in `test:unit` | `test:unit` script | runs in IMP-02; the perf file stays gated |
| BEH-006 (H-06) | agent(-team)-management tools removed | 12 src files, 10 tests + 10 `.js` twins, 10 SR-011 entries, doc mentions, comment | `git grep` for the 10 names finds only UI i18n keys; typecheck and unit pass |
| BEH-007 (H-07) | web type gate | `scripts/typecheck.mjs`, `scripts/lib/typecheckGate.mjs` (+ spec), `typecheck-baseline.json`, `electron/tsconfig.typecheck.json`, `nuxt.config.ts` `typescript.tsConfig.exclude`, `package.json` scripts and `build:electron*` | PASS: 0 production, 298 test-file errors in 139 files (271 Nuxt + 27 Electron), about 40 s (IMP-05); fail-closed self-check (IMP-06) |
| BEH-009 (H-09) | DLC expects the D-5 member shape; DLC-008 restores recorded values | `tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts` | gated 3/3 (IMP-10, receipt) |
| BEH-010 (H-10) | SUN-E2E-003 head reads stubbed | `tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts` | gated 3/3; receipt lists the head read; any other github.com request now fails as unexpected (IMP-11) |
| BEH-011 (H-11) | Team member artifacts read through the team run | `tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts` | gated 2/2 (IMP-14) |
| BEH-012 (H-12) | probe stubs Codex's `releases/latest` redirect; ARP-07 reopens after the locale reset | `tests/e2e/fixtures/agent-runtimes-vendor-sources.mjs`, `tests/e2e/agent-runtimes-settings-probe.mjs` | the same two edits SD-14 proved; probe not run here (API/E2E) |
| BEH-014 (H-14) | no change | — | packaged isolation probe left to API/E2E |
| BEH-016 (H-16) | dead V2-warning assertion removed | `team-run-v1-production-upgrade.e2e.test.ts` | the log line was removed in c76fbf90aa (`git log -S`) |
| BEH-018 (H-18) | no Fastify deprecation at startup; request logging off | the three Fastify compositions: `logController: new LogController({ disableRequestLogging: true })` and `routerOptions: { maxParamLength }` | built server start: 0 FSTDEP lines, 0 request log lines (IMP-12). FSTDEP022 was found during this check (see Deviations). |
| BEH-019 (H-19) | Markdown injection spec under jsdom; TESTING.md rule | `composables/__tests__/useMarkdownSegments.sanitization.spec.ts`; TESTING.md | 3/3 under jsdom; the injection case fails under happy-dom (IMP-17) |
| BEH-020 (H-20) | gateway packaging scripts removed | `autobyteus-message-gateway/scripts/*`, `package.json`, `.gitignore` | no reference left (`git grep`) |
| BEH-022 (H-22) | RA-04 presses Check once | `agent-runtimes-running-agents.e2e.test.ts` | 4/4 (IMP-09a) |
| BEH-023 (H-23) | Brief Studio suites fail naming the prerequisite | `tests/e2e/helpers/brief-studio-package.ts` + 3 suites; TESTING.md row | missing package: fails with the message and command (IMP-09b); built: 4 + 7 pass (IMP-09a/c) |
| BEH-024 (H-24) | Claude `env` option removed | `claude-sdk-client.ts` `resolveSpawnEnvironment()`; tests use `vi.stubEnv` | Claude client tests 69/69 |
| BEH-025 (H-25) | 55 remaining `.js` twins removed | `autobyteus-server-ts/tests/**/*.js` | `git ls-files 'autobyteus-server-ts/tests/**/*.js'` is empty |
| BEH-026 (H-26) | Codex routing E2E uses the lease API | `codex-standalone-send-message-global-routing.e2e.test.ts` (+ the gated manager integration test) | both load and type-check; the live run needs a signed-in codex (API/E2E) |
| BEH-027 (H-27) | PT-E2E-013 deterministic: meaning search unavailable | `tests/e2e/fixtures/outside-network-offline.mjs`; `projects-feature-probe.mjs` | logic read: an offline download leaves the model unavailable (`embedding-index.ts` prepareModel/failModel). Probe not run here (API/E2E). |
| BEH-028 (H-28) | former class icons render | 27 Vue files: `<Icon icon="heroicons:…">`; computed names in ToastContainer, ToolCard, ToolList | `git grep i-heroicons-` empty; rendered check (IMP-13) |
| BEH-030 (H-30) | MCP doc lists every adapter family | `docs/modules/agent_tools_mcp_server.md` | read against `default-agent-tool-mcp-adapter-providers.ts` |
| BEH-031 (H-31) | live compaction rule | TESTING.md "Forcing compaction early" | text as the design gives it |
| BEH-032 a | phone Team setup loads a workspace path | `composables/mobile/useMobileRunSetupController.ts` `loadWorkspacePath` | spec fails on base with "loadingStore.setWorkspaceLoading is not a function" and passes with the fix (IMP-08) |
| BEH-032 b | display name in RUNTIME_REQUIRED | `utils/teamLaunchReadinessCore.ts` | fails on base ("undefined needs a runtime…"), passes (IMP-08) |
| BEH-032 c | counterpart label on phone | `components/mobile/MobileTeamMessages.vue` | fails on base ("From teammate"), passes (IMP-08) |
| BEH-032 d | "—" with the loading label for an unknown count | `CustomProviderDetailsCard.vue` | fails on base, passes; known count unchanged (IMP-08) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The additions below fix checks named in TESTING.md that were red, under Rule 9, or remove dead code in touched files. None adds product behaviour.

### Deviations and additions (for review)

1. **Typed Apollo client (H-07).** The design typed each of the 45 implicit-`any` callback parameters. Their cause was `getApolloClient()` returning `any`, so I fixed that instead. The plugin declares its Nuxt-app bindings (a `#app` NuxtApp augmentation, like `types/localization.d.ts`) as `ApolloClient<NormalizedCacheObject>`. This also removed the 2 `utils/apolloClient.ts` errors. The typed results surfaced type-only corrections in 6 more files; commit `2396303c53` lists them with their reasons. One is `'LOCAL' as ToolOriginEnum` / `'MCP' as ToolOriginEnum`: the wire value typed as the generated enum. It's a cast that hides no mismatch, chosen because importing the enum value would bundle all of `generated/graphql.ts`. The getter's last fallback, `useApolloClient()`, could never return a client (nothing provides one, so it always threw "Apollo client with id default not found"). It now throws that outcome directly.
2. **More dead code removed in touched files (H-07, Principle 7):** `runtimeConfig.public.audio`'s capture settings (read only by the removed `audioStore`); `nuxt.config.ts` `routeRules` (`middleware: ['workspace']`: Nuxt reads `appMiddleware`, and no `workspace` middleware exists); `modules/devhandler-compat.ts` (Nuxt 3.21's only `server:devHandler` caller always passes two arguments, so it never acted); `VncViewer`'s `config.public.vncPassword` (an undeclared key, always undefined); the `useApolloClient` fallback (item 1). The transcription URL chain is live config and stays, recorded as FU-009.
3. **`TreeNode` private sort helpers became module functions** (same code). Pinia's state unwrapping drops private members, which made the file-explorer store's state unassignable to its own type.
4. **FSTDEP022 (H-18).** The built server, once FSTDEP023 was gone, still printed FSTDEP022 twice: the top-level `maxParamLength` router option is deprecated. Moved to `routerOptions` in the same three servers and five test setups (`6fa5f443c6`). This is REQ-017 / AC-019 ("no Fastify deprecation warnings").
5. **Pre-existing web test failures fixed under TESTING.md Rule 9:** `test:nuxt` also ran the 51 `electron/**` specs in the Nuxt environment, where 2 failed; they're now excluded there and still run under `test:electron`, with the same file set (`9fa0fe34f0`). `e2eLaunchPreflight.spec.ts` expected a message that `f34ad8749f` removed (`2fd4461897`).
6. **Gated tests on removed APIs, same cause as H-24 and H-26:** `codex-app-server-client-manager.integration.test.ts` (`RUN_CODEX_E2E`) and the cancel-queued live contract in `claude-sdk-client.integration.test.ts` (`RUN_CLAUDE_E2E`).
7. **Generated code:** the codegen setting changes one import line, not two. The H-02 fragment change adds the four lines codegen emits for `internal`.
8. **Production error count:** 103 in the table → 79 type-only after the dead/codegen/bug rows. The 2 `../autobyteus-server-ts/tests/fixtures/recorded-upload-labels.ts` errors disappear after a fresh `nuxt prepare`. A vitest run (`NUXT_TEST`) rewrites `.nuxt/` in test mode and registers 538 specs as components, which pulls the excluded spec back in. `pnpm typecheck` always runs `nuxt prepare` first.
9. **H-23** also removes the `dist-runtime` ignore line, the default output of the removed gateway script.
10. **Size guardrail:** `VoiceInputExtensionCard.vue` and `ApplicationLaunchSetupPanel.vue` would have crossed 500 effective lines. Both are 498 after `e1d5ded2e9`.

## Key Files Or Areas

- Web type gate: `autobyteus-web/scripts/typecheck.mjs`, `scripts/lib/typecheckGate.mjs`, `scripts/__tests__/typecheckGate.spec.ts`, `typecheck-baseline.json`, `electron/tsconfig.typecheck.json`, `nuxt.config.ts`, `package.json`.
- Apollo typing: `autobyteus-web/plugins/30.apollo.client.ts`, `utils/apolloClient.ts`.
- BEH-032: the four files and specs in the trace.
- Server: `src/compositions/build-studio-server.ts`, `build-standalone-application-server.ts`, `src/agent-tools/mcp/agent-tools-mcp-local-server.ts`, `src/runtime-management/claude/client/claude-sdk-client.ts`.
- Tests and tooling: the E2E files in the trace, `tests/e2e/helpers/brief-studio-package.ts`, `test-support/live-e2e/live-e2e-harness.ts`, the probe fixtures.

## Important Assumptions

- A Team member's `followsTeam` launch in the DLC copy is the copy's team value. Assertions follow the recorded receipt (SD-04b and IMP-10).
- The board search on an offline node settles to `UNAVAILABLE`: `syncCollection` starts `prepareModel`, and a failed download sets the model unavailable until a retry.

## Known Risks

- The gate fails a release build on a lower test-file count until the baseline is shrunk. This is intended and documented in TESTING.md.
- `pnpm typecheck` must not run while a vitest run rewrites `.nuxt/` in the same worktree (TESTING.md already serializes heavy runs).
- `typescript.tsConfig.exclude` makes the three cross-package specs orphans in the IDE until FU-003.
- Lockfile: only new packages (vue-tsc 3.3.13 and its deps, @types/qrcode 1.5.6) and optional-peer suffixes (crossws 0.3.5 for graphql-ws/h3, vue-tsc for nuxt) change; no version moves (IMP-15).
- Observation outside scope: several icon-only buttons (for example the MCP argument delete) have no accessible name. This predates the change and is not recorded as a follow-up.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup, with the bug-fix parts H-02, H-18, H-28 and BEH-032 (a)–(d).
- Reviewed root-cause classification: per item; H-07 Boundary Or Ownership Issue (undeclared dependencies, project scope).
- Reviewed refactor decision: `No Refactor Needed` beyond removals and the dependency/scope corrections.
- Implementation matched the reviewed assessment: `Yes`. The Apollo typing and the `TreeNode` helper move are type corrections at their cause, not refactors of ownership.
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: deviations 1–10 above.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (Removal Plan items plus deviation 2)
- Dead code found elsewhere, added to `follow-ups.md`: FU-009 (transcription WebSocket URL chain)
- Shared structures remain tight: `Yes` (the `ArtifactOwner` and `PreviewedTool` types are local to their file)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. None is over 500 effective lines after the change (the two candidates are 498). The largest changed-line delta in a source file is well under 220.
- Notes: no `any`, no `@ts-ignore`, no suppression added.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- New dev dependency `vue-tsc` 3.3.13; declared at the resolved versions: `@apollo/client` 3.14.0, `graphql` 16.12.0, `@vue/apollo-composable` 4.2.2, `vite` 7.3.7, `vue-bundle-renderer` 2.4.0, `@types/qrcode` (1.5.6). `pnpm install --frozen-lockfile` passes.
- Checks ran on macOS 26.5.2, Node v22.23.1, pnpm 10.28.2. The machine was heavily loaded for part of the session; that only affected timings.

## Checks Run

Evidence is in `tickets/in-progress/test-and-tooling-hygiene-294/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | 6fa5f443c6 | macOS, node 22 | server `src` | BEH-006, 018, 024; AC-006, AC-025 | Pass | IMP-01-server-typecheck.log | `exit 0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | 4a97ded528 | same | server unit, app-data-migrations, architecture, agent-work-journal | BEH-001, 004, 005, 006, 024, 025; AC-001, 004, 005, 006, 025, 026 | Pass | IMP-02-server-test-unit.log | `Test Files  864 passed \| 5 skipped (869)` |
| IMP-02b | the 2 unit + 3 integration files touched by the routerOptions change | 6fa5f443c6 | same | Fastify test setups | BEH-018 | Pass | IMP-02b-fastify-routeroptions-tests.log | `Tests  6 passed (6)` |
| IMP-03 | `pnpm -C autobyteus-web test:nuxt --run` | 3a87152631 (then e1d5ded2e9: components/settings + applications, 64 files 362 passed) | same | all web specs (Electron now excluded) | BEH-002, 007, 019, 028, 032 | Pass | IMP-03-web-test-nuxt.log | `Test Files  666 passed (666)` |
| IMP-04 | `pnpm -C autobyteus-web test:electron --run` | 6fa5f443c6 | same | Electron main specs | preserved | Pass | IMP-04-web-test-electron.log | `Test Files  48 passed \| 1 skipped (49)` |
| IMP-05 | `pnpm -C autobyteus-web typecheck` | 6fa5f443c6 | same | the gate over Nuxt, Electron, build | BEH-007; AC-007, QR-002 | Pass | IMP-05-web-typecheck.log | `[typecheck] PASS`, `production errors: 0`, Nuxt run about 35 s |
| IMP-06 | gate self-check SC-1..SC-10 (temporary edits, reverted) | 9af64a9052 (now 55d6c1d5b0; the gate is unchanged since) | same | `typecheck.mjs` + lib | AC-008, AR-003 | Pass | IMP-06-typecheck-gate-selfcheck.log | SC-1..SC-5 `exit: 1`; SC-6 `ended by signal SIGKILL`; SC-7 `test-file errors went down`; SC-8 `baseline written`; SC-9 `the baseline only shrinks`; SC-10 `exit: 0` |
| IMP-07 | the three web guards | 6fa5f443c6 | same | guards | AC-009 chain, DEC-006 keys | Pass | IMP-07-web-guards.log | `Passed` ×3 |
| IMP-08 | each BEH-032 spec on the base file, then on the fix | 6fa5f443c6 | same | the four fixes | BEH-032; AC-034 | Pass | IMP-08-beh032-base-fail.log | `Failed Tests` on base, `passed` with the fix, per bug |
| IMP-09a/b/c | running-agents E2E; a Brief Studio suite with the package moved aside; the other two suites | 4026eb59f6/ee936fc3a2 content | clean env | H-22, H-23 | AC-023, AC-024 | Pass | IMP-09a…, IMP-09b…, IMP-09c… | `Tests  4 passed`; `Brief Studio importable package missing (…); build it with: pnpm -C autobyteus-server-ts test:integration:prepare`; `Tests  7 passed` |
| IMP-10 | DLC E2E gated (scripted AGY CLI) | b5cc864214 | clean env | H-09 | AC-011 | Pass | IMP-10-dlc-e2e.log, IMP-10-dlc-receipt.json | `Tests  3 passed (3)`; receipt `followsTeam` per member |
| IMP-11 | SUN E2E gated | bba6f08252 | clean env | H-10 | AC-012 | Pass | IMP-11-sun-e2e.log, IMP-11-sun-receipt.json | `Tests  3 passed (3)`; `githubRequests` includes `https://github.com/apar-sun-e2e/skills.git/git-upload-pack` |
| IMP-12 | built server start (probe recipe), 3 health + 3 GraphQL requests | 6fa5f443c6 | clean env | H-18 | AC-019 | Pass | IMP-12-server-start-no-fastify-deprecation.log | `FSTDEP lines: 0`, `request-log lines: 0` (before: 2 × FSTDEP022 quoted) |
| IMP-13 | rendered check: Nuxt dev against IMP-12's server; /settings and MCP Servers → Add Server → Add Argument | 6fa5f443c6 | Chrome tab | H-28 icons | AC-029 (self-check) | Pass | IMP-13-rendered-icons.txt + 3 PNG | settings nav svg `[20,20]` ×14; Bulk Import/Add Server svg `[16,16]`; argument delete svg `[20,20]` |
| IMP-14 | multi-image E2E gated | d0a4dd0ec4 | clean env | H-11 | AC-013 | Pass | IMP-14-multi-image-e2e.log | `Tests  2 passed (2)` |
| IMP-15 | frozen install, `pnpm why`, lockfile package-key diff | 6fa5f443c6 | same | dependency declarations | R-2, QR-003 | Pass | IMP-15-dependencies.log | `package entries removed: []`; one version each |
| IMP-16 | codegen against the schema printed from this branch's build | 6fa5f443c6 | same | `generated/graphql.ts`, `codegen.ts` | BEH-002, DEC-007 | Pass | IMP-16-codegen-drift.log | `diff: 0 lines (identical)` |
| IMP-17 | sanitisation spec under jsdom, then happy-dom | 6fa5f443c6 | same | `useMarkdownSegments` | BEH-019; AC-020 | Pass | IMP-17-sanitisation-jsdom.log | jsdom `3 passed`; happy-dom `1 failed` (the injection case) |
| IMP-18 | archive E2E | 6fa5f443c6 | clean env | H-03 | AC-003 | Pass | IMP-18-archive-e2e.log | `Tests  6 passed (6)` |

- Not run, and why:
  - Agent Runtimes probe (AC-014), projects probe (AC-028), `test:e2e:electron:isolation` (AC-016): browser and packaged probes that need a server build and their own stacks. These are API/E2E validation; SD-14 already proved the H-12 edits.
  - Codex routing E2E and the Codex manager integration test with `RUN_CODEX_E2E=1` (AC-027), and the Claude live contract (`RUN_CLAUDE_E2E`): they need a signed-in CLI and real model calls (API/E2E; the Codex run is named in DEC-025).
  - Server `test:integration` in full, `pnpm test:e2e` in full, the team-run-v1 upgrade E2E (AC-018), gateway build/test/Docker context (AC-021): not run; only the changed files were run as listed.
  - A clean-clone run (AC-032): delivery.
  - No live compaction run (DEC-025).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: settings navigation icons; MCP Servers list buttons, Add MCP Server form (Add Argument, argument delete); the other converted icon sites (toasts, tool cards, Qwen key visibility, migrations, custom provider editor, application setup); BEH-032 (a) phone Team setup path load, (c) phone team messages, (d) custom provider details card.
- Approved UI/UX, interaction, requirement, or design references: requirements § UI ("each former class renders the heroicon its class names, at its current size and colour"); BEH-032 desired outcomes.
- Existing design system, shared components, and adjacent product surfaces reviewed: `@iconify/vue` `<Icon icon="heroicons:…">` (the app's existing mechanism); `ProviderModelBrowser.vue`'s "—" with the `model_count_loading` label (reused for d); `CollaborationMessagesPanel` (c).
- Testing guideline or development / preview instructions and rendered surface used: Nuxt dev server (`nuxi dev`, probe env recipe) against the branch's built server on a test-owned data root, in a Chrome tab.
- States, layouts, viewports, and interactions inspected: /settings at the default desktop viewport; MCP Servers → Add Server → Add Argument; DOM sizes read.
- Visual or interaction issues found and corrected: none in the rendered surfaces. The icons sit at their class sizes and colours and align with their labels.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-13. Not rendered by me: toasts, tool cards, the mobile views of BEH-032 (a)/(c), and the custom provider card (d), which need a running team, a saved custom provider in a loading state, or a phone layout. Their behaviour is covered by specs (IMP-03, IMP-08). Icon data loads from the Iconify API on first show (FU-002).

## Downstream Coverage Hints / Suggested Scenarios

- `pnpm -C autobyteus-web test:e2e:agent-runtimes-settings` on macOS (ARP-08 not applicable) and Linux when available (AC-014).
- `pnpm -C autobyteus-web test:e2e:projects`: PT-E2E-013 `obs.meaningSearch.state === 'UNAVAILABLE'`; check `<node>-outside-network.log` (AC-028).
- `test:e2e:electron:isolation` on macOS; it builds through `build:electron:mac`, which now runs the gate (AC-016, AC-009 build log).
- `RUN_CODEX_E2E=1` Codex routing E2E with a signed-in codex and real HOME (AC-027); optionally the manager integration test.
- The team-run-v1 upgrade E2E (AC-018), and the gateway `build`, `typecheck` and `test` (AC-021).
- Open the pages with former class icons (MCP args, Bulk Import, Add Server, agent detail) in the desktop app (AC-029).
- Clean clone: install, `nuxt prepare`, `test:integration:prepare`, the suites (AC-032).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. All of the "Not run" list above is required, plus API/E2E's own coverage investigation for UC-001..UC-006.
