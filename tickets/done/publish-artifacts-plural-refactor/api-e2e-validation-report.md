# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor/tickets/done/publish-artifacts-plural-refactor/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor/tickets/done/publish-artifacts-plural-refactor/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor/tickets/done/publish-artifacts-plural-refactor/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor/tickets/done/publish-artifacts-plural-refactor/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor/tickets/done/publish-artifacts-plural-refactor/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor/tickets/done/publish-artifacts-plural-refactor/review-report.md`
- Current Validation Round: `1`
- Trigger: Code-review pass after `PAP-CR-001` re-review; API/E2E validation requested.
- Prior Round Reviewed: `N/A`
- Latest Authoritative Round: `1`

Round rules:
- Reuse the same scenario IDs across reruns for the same scenarios.
- Create new scenario IDs only for newly discovered coverage.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review pass after `PAP-CR-001` re-review | N/A | None | Pass | Yes | Validated native/Codex/Claude/discovery/app-package boundaries with temporary executable harness plus existing durable suites and builds. |

## Validation Basis

Validation was derived from the refined requirements and reviewed design/implementation:

- Canonical tool contract is `publish_artifacts({ artifacts: [{ path, description? }] })`.
- Single-file publication must use the same plural tool with a one-item array.
- `description` accepts string, `null`, or omission; blank strings normalize to `null`.
- Top-level legacy `{ path }`, old rich artifact fields, missing/empty/non-array `artifacts`, blank/non-string paths, and unknown fields must reject before publication.
- Native AutoByteus, Codex dynamic tools, and Claude MCP/allowed-tools must expose/execute plural only.
- Singular `publish_artifact` must not be registered, exposed, allowlisted, discoverable, or treated as an alias.
- Old/custom singular-only configs intentionally receive no artifact-publication tool; mixed configs expose only `publish_artifacts`.
- Existing durable publication owner, snapshots/projections/events/app relay semantics remain authoritative and unchanged per item.
- Multi-item publication is sequential and intentionally non-atomic.
- Brief Studio and Socratic Math source/generated/importable packages must teach/request plural only.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

Evidence:
- Exact singular source/generated search passed with no matches: `rg -n -P "publish_artifact(?!s)" autobyteus-server-ts/src applications autobyteus-ts/src --glob '!node_modules' --glob '!tmp' --glob '!tickets/**'`.
- Claude blank-description schema drift search passed with no matches: `rg -n -P "description:\s*z\.string\(\)\.min\(1\)|min\(1\).*nullable\(\).*optional\(\).*description" autobyteus-server-ts/src autobyteus-server-ts/tests --glob '!node_modules' --glob '!tmp' --glob '!tickets/**'`.
- Temporary API/E2E harness validated singular-only and mixed old/new runtime configs for Codex and Claude.

## Validation Surfaces / Modes

- Existing repository-resident unit/integration suites added by implementation/review.
- Temporary Vitest API/E2E harness against real TS modules, real file I/O, real projection/snapshot stores, real native tool execution, real Codex bootstrap dynamic handler map, real Claude MCP tool builder/handler, and real GraphQL resolver methods.
- Direct package-validation runtime via `FileApplicationBundleProvider.validatePackageRoot(...)` for Brief Studio and Socratic Math importable packages.
- Direct backend entry-module imports for both app packages.
- App package build scripts for Brief Studio and Socratic Math.
- Server build and shared package builds.
- Static cleanup/search checks.

## Platform / Runtime Targets

- Host: macOS/Darwin arm64 (`Darwin MacBookPro 25.2.0 ... RELEASE_ARM64_T6000 arm64`).
- Node.js: `v22.21.1`.
- pnpm: `10.28.2`.
- Primary worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor`.
- Runtime boundaries exercised: native AutoByteus local tool, Codex app-server dynamic tool bootstrap/handler, Claude Agent SDK MCP/allowed-tool path, GraphQL resolver discovery, importable application packages.

## Lifecycle / Upgrade / Restart / Migration Checks

- No desktop installer/updater/restart/migration flow is in scope.
- Historical run-history tool-call migration remains explicitly out of scope per requirements.
- Old/custom config behavior was validated as a clean-cut removal: singular-only configs receive no artifact-publication tool; mixed configs expose only plural.

## Coverage Matrix

| Scenario ID | Requirements / ACs | Boundary | Method | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| PAP-E2E-001 | REQ-PAP-001/002/004/005/006, AC-PAP-001/002 | Native AutoByteus tool -> publication service -> projection/event | Temporary Vitest harness executed `registerPublishArtifactsTool().execute(...)` with a real fallback runtime context, one absolute path and one relative path | Pass | Result `success: true`; two summaries/revisions/notifications in input order; descriptions normalized (`" First file "` -> `"First file"`, omitted -> `null`). |
| PAP-E2E-002 | REQ-PAP-003/008/009, AC-PAP-003/006 | Native contract rejection | Temporary harness invoked old top-level `{ path }` and rich item `{ artifactType }` payloads | Pass | Both rejected; projection summaries remained empty. |
| PAP-E2E-003 | REQ-PAP-001/004/005/006/008/009, AC-PAP-002/004/006/007 | Codex dynamic exposure/execution | Temporary harness bootstrapped `CodexThreadBootstrapper` with plural, singular-only, and mixed toolNames, then executed the real dynamic handler against an active run | Pass | Plural config exposed one `publish_artifacts` dynamic tool and handler; handler persisted two artifacts/events in order; singular-only exposed none; mixed exposed only plural. |
| PAP-E2E-004 | REQ-PAP-002/004/005/006/008/009, AC-PAP-002/005/006/007 | Claude MCP/allowed-tools/execution | Temporary harness resolved allowed tools, built MCP server via fake SDK adapter, and executed the real handler against an active run | Pass | Allowed tools were `publish_artifacts` and `mcp__autobyteus_published_artifacts__publish_artifacts`; singular-only allowed none; mixed allowed only plural; blank/omitted/null descriptions all persisted as `null`; old top-level payload returned tool error and did not add summaries. |
| PAP-E2E-005 | REQ-PAP-010, AC-PAP-010 | Discovery/listing | Temporary harness invoked `list_available_tools`, `AgentCustomizationOptionsResolver.availableToolNames`, `ToolManagementResolver.tools`, and `toolsGroupedByCategory(LOCAL)` | Pass | All listed `publish_artifacts`; none listed `publish_artifact`. |
| PAP-E2E-006 | REQ-PAP-007/010, AC-PAP-008/009 | Brief Studio and Socratic Math app packages | App builds plus temporary harness validated package roots, package configs/prompts, and backend entry imports | Pass | `FileApplicationBundleProvider.validatePackageRoot(...)` passed for both importable packages; researcher/writer/tutor configs contain `publish_artifacts` and not singular; packaged prompts/backend launch guidance contain plural one-item-array examples; backend `entry.mjs` modules imported and exposed artifact handlers. |
| PAP-E2E-007 | Requirement non-atomic residual risk, AC-PAP-002 | Batch partial failure behavior | Temporary harness used real `PublishedArtifactPublicationService.publishManyForRun(...)` with first file existing and second missing | Pass | The call rejected on the missing second file; first artifact summary/revision/event remained durable, confirming approved sequential non-atomic behavior. |

## Test Scope

Validation included:

- Runtime execution of the real plural native tool with real durable stores.
- Codex dynamic tool exposure and handler execution from bootstrapped runtime context.
- Claude MCP server/tool definition, allowed-tools names, and handler execution.
- Blank, omitted, and `null` description normalization.
- Old top-level and old rich metadata rejection before publication.
- Old/custom singular-only and mixed old/new config exposure behavior.
- Registry-backed tool discovery plus GraphQL resolver discovery/grouping surfaces.
- Importable Brief Studio and Socratic Math package integrity and runtime-load sanity.
- Sequential non-atomic batch semantics.
- Existing targeted durable unit/integration suites and builds.

## Validation Setup / Environment

- Dependencies were already installed in the worktree.
- Temporary Vitest harness used isolated temporary app-data, workspace, and memory directories under OS temp paths.
- Temporary harness used real source modules and real file/projection/snapshot I/O.
- External LLM/model turns were not invoked; the deterministic runtime tool boundaries were exercised directly.
- For GraphQL resolver imports, the temporary harness loaded `reflect-metadata` as required by `type-graphql` decorators.

## Tests Implemented Or Updated

- Repository-resident durable tests added/updated by API/E2E this round: `No`.
- Existing implementation/review durable test updates were run as part of validation.
- Temporary executable harness was created only for this validation round and removed after the successful run.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: `N/A`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A`
- Post-validation code review artifact: `N/A`

Because API/E2E did not leave any repository-resident validation changes, the task may proceed directly to `delivery_engineer` on pass.

## Other Validation Artifacts

- Validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor/tickets/done/publish-artifacts-plural-refactor/api-e2e-validation-report.md`

## Temporary Validation Methods / Scaffolding

- Created temporary file: `autobyteus-server-ts/tests/publish-artifacts-api-e2e-validation.test.ts`.
- Final command: `pnpm -C autobyteus-server-ts exec vitest run tests/publish-artifacts-api-e2e-validation.test.ts --testTimeout 30000`.
- Result: Passed, `1` file / `7` tests.
- Cleanup: temporary test file removed; verification `test ! -e autobyteus-server-ts/tests/publish-artifacts-api-e2e-validation.test.ts && echo removed` printed `removed`.

Temporary setup notes:
- First attempted to run the temporary file under `autobyteus-server-ts/tmp`, but Vitest config includes only `tests/**/*.test.ts`; file was moved under `tests/` for execution.
- Initial GraphQL-resolver import required the normal `reflect-metadata` polyfill; the temporary harness was adjusted accordingly before final pass.
- These were harness setup issues, not product behavior failures.

## Dependencies Mocked Or Emulated

- No external LLM turn was executed.
- Active run backend was emulated with a no-op `AgentRunBackend` so the real publication service could resolve active runs without contacting Codex/Claude/LLM infrastructure.
- Run file-change, published-artifact relay attach, and memory recorder attachments were no-op in the harness.
- Codex app-server client was mocked only for the bootstrapper's skills/list preflight; the dynamic tool registration, filtering, handler map, and `publish_artifacts` handler were real.
- Claude SDK client was mocked only for `createToolDefinition` / `createMcpServer` object normalization; the tool schema and handler were real.
- File system, workspace path canonicalization, projection store, snapshot store, result/event ordering, app package validation, and backend entry imports were real local execution.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | No prior API/E2E round. |

## Scenarios Checked

1. `PAP-E2E-001` Native AutoByteus real plural publication with one-item/multi-item behavior.
2. `PAP-E2E-002` Native old/rich payload rejection before publication.
3. `PAP-E2E-003` Codex dynamic tool exposure/execution and singular/mixed config behavior.
4. `PAP-E2E-004` Claude MCP/allowed-tools exposure/execution, blank/omitted/null descriptions, and old payload tool error behavior.
5. `PAP-E2E-005` Discovery/listing surfaces including GraphQL resolvers.
6. `PAP-E2E-006` Brief Studio and Socratic Math importable app package validation/runtime-load sanity.
7. `PAP-E2E-007` Sequential non-atomic batch behavior.

## Passed

Commands/checks passed:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/published-artifacts/publish-artifacts-tool.test.ts tests/unit/services/published-artifacts/published-artifact-publication-service.test.ts tests/unit/agent-execution/shared/configured-agent-tool-exposure.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/codex/published-artifacts/build-codex-publish-artifacts-dynamic-tool-registration.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/claude/published-artifacts/build-claude-publish-artifacts-tool-definition.test.ts tests/unit/agent-tools/tool-management/list-available-tools.test.ts tests/integration/application-backend/brief-studio-team-config.integration.test.ts` — Passed, `9` files / `44` tests.
- Temporary API/E2E harness: `pnpm -C autobyteus-server-ts exec vitest run tests/publish-artifacts-api-e2e-validation.test.ts --testTimeout 30000` — Passed, `1` file / `7` tests.
- `pnpm -C applications/brief-studio build && pnpm -C applications/socratic-math-teacher build` — Passed; importable packages regenerated.
- `pnpm --filter autobyteus-ts exec vitest run tests/unit/llm/prompt-renderers/lmstudio-chat-renderer.test.ts` — Passed, `1` file / `2` tests.
- `pnpm -C autobyteus-server-ts build` — Passed, including shared builds, Prisma client generation, TypeScript build, and managed messaging asset copy.
- `git diff --check` — Passed.
- Exact singular source/generated search — Passed with no matches.
- Claude `.min(1)` description-drift search — Passed with no matches.

## Failed

No API/E2E scenario failed in the latest authoritative round.

Non-authoritative harness setup attempts:
- Running the temporary test under `autobyteus-server-ts/tmp` produced `No test files found` because Vitest config includes `tests/**/*.test.ts` only.
- The first GraphQL-resolver import attempt failed until `reflect-metadata` was imported in the temporary harness.
- Both issues were fixed in temporary scaffolding; final harness run passed and the file was removed.

## Not Tested / Out Of Scope

- Full external LLM-driven interactive turns against live AutoByteus/Codex/Claude models were not run. The deterministic tool boundaries, runtime exposure, handlers, persistence, event, and discovery behavior were exercised directly without external model nondeterminism.
- Desktop UI/browser Artifacts tab behavior was not changed by this ticket and remains out of scope.
- Historical run records containing old tool-call names were not migrated, per approved requirements.
- Existing custom configs containing only `publish_artifact` are intentionally not migrated; their plural-only exposure behavior was validated.

## Blocked

- `pnpm -C autobyteus-server-ts typecheck` remains blocked by the pre-existing repository-wide `TS6059` configuration issue: `tsconfig.json` has `rootDir` set to `src` while the include pattern also matches `tests`. The rerun failed with the same class of errors recorded upstream (test files under `autobyteus-server-ts/tests/...` are outside `rootDir`).
- This is not classified as a task regression because `pnpm -C autobyteus-server-ts build` passed using `tsconfig.build.json`, targeted affected tests passed, and the typecheck failure is repository-wide and unrelated to the plural publish-artifacts implementation.

## Cleanup Performed

- Removed temporary API/E2E harness file `autobyteus-server-ts/tests/publish-artifacts-api-e2e-validation.test.ts`.
- Removed empty temporary harness directory `autobyteus-server-ts/tmp` if present.
- Verified no temporary harness file remains.
- Temporary OS workspace/memory/app-data directories created by the harness were removed by the harness `afterAll` cleanup.

## Classification

- No implementation, design, requirement, or unclear failure found in the latest authoritative API/E2E validation round.
- No reroute classification applies.

## Recommended Recipient

- `delivery_engineer`

Rationale: API/E2E validation passed and API/E2E did not add/update repository-resident durable validation after code review.

## Evidence / Notes

Key evidence details:

- Native AutoByteus actual tool execution returned `{ success: true, artifacts: [...] }`, persisted summaries/revisions in order, and emitted one notifier event per artifact in order.
- Codex bootstrap produced dynamic tool specs/handlers only for `publish_artifacts`; singular-only produced no dynamic tools; mixed old/new produced only plural. Executing the dynamic handler persisted ordered durable artifacts/events.
- Claude allowed tools contained only `publish_artifacts` and `mcp__autobyteus_published_artifacts__publish_artifacts`; singular-only allowed none; mixed old/new allowed only plural. Handler normalized blank/omitted/null descriptions to `null` and old top-level payloads returned a tool error without extra publication.
- Discovery surfaces (`list_available_tools`, `availableToolNames`, `tools`, `toolsGroupedByCategory`) include plural and exclude singular.
- Brief Studio and Socratic Math importable packages validate through application-bundle provider, configs resolve plural publication exposure, packaged prompts/launch guidance contain one-item plural array examples, and backend entries import successfully.
- Sequential batch partial-success behavior matches approved non-atomic design: first item persisted before a later missing file failure.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: All in-scope API/E2E and executable validation scenarios passed. The only blocked command is the known repository-wide `autobyteus-server-ts typecheck` `TS6059` rootDir/tests include issue, already documented upstream and not caused by this change. No repository-resident durable validation was added by API/E2E, so the next recipient is `delivery_engineer`.

## Addendum: Existing Live E2E Follow-Up After User Challenge

After the user explicitly asked whether the existing Codex/live E2E tests were run, I audited the existing tests for `publish_artifacts` coverage and ran the repository's live publish-artifact tests that directly exercise this ticket's runtime boundaries.

Additional commands/checks passed:

- Existing live Codex publish-artifacts integration test:
  - Command: `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t "publishes an existing workspace file through the live Codex publish_artifacts dynamic tool path" --testTimeout 180000`
  - Result: Passed, `1` selected live test passed / `11` unrelated tests skipped by `-t` selection.
  - Evidence: the live Codex app-server transport started, selected a Codex model, created a real Codex app-server run, observed a `publish_artifacts` tool-call segment with the requested plural `artifacts` payload, observed tool logs and segment completion, observed `ARTIFACT_PERSISTED`, read the durable published-artifacts projection and revision snapshot, and verified the snapshot text matched the source artifact body.

- Existing live AutoByteus / LM Studio publish-artifacts integration test:
  - Command: `RUN_LMSTUDIO_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts -t "publishes an existing workspace file through the live AutoByteus publish_artifacts tool path" --testTimeout 240000`
  - Result: Passed, `1` selected live test passed / `3` unrelated tests skipped by `-t` selection.
  - Evidence: LM Studio model discovery found local models, a real AutoByteus agent run started, the LLM received one `publish_artifacts` tool schema, the model produced one tool invocation, the tool execution succeeded with `{ success: true, artifacts: [...] }`, `ARTIFACT_PERSISTED` was emitted, and the durable projection/revision snapshot matched the published file.

Scope clarification:

- I did not run every unrelated Codex E2E test in the repository, such as Codex team messaging roundtrips, browser-tool E2E, memory persistence, or mixed-runtime team E2E. Those validate broader Codex/runtime behavior that this ticket did not change and are much longer/costlier live suites.
- For this ticket's changed surface, the existing live tests that directly cover `publish_artifacts` through Codex and AutoByteus were run and passed, in addition to the direct API/E2E harness, Claude MCP harness, discovery checks, app package validation, targeted unit/integration suites, app builds, and server build already recorded above.

Updated latest authoritative result remains: `Pass`.

## Addendum: Brief Studio App Runtime Follow-Up After User Request

After the user explicitly called out that Brief Studio depends on `publish_artifacts`, I performed an additional Brief Studio-specific runtime validation pass instead of relying only on source/package inspection.

Environment setup performed:

- Copied the main checkout test env files into this worktree before runtime validation:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/.env.test` -> `autobyteus-server-ts/.env.test`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test` -> `autobyteus-ts/.env.test`
- Verified both copied `.env.test` files are gitignored and not staged/tracked.
- Read the runtime startup instructions in:
  - `autobyteus-server-ts/README.md`
  - `autobyteus-web/README.md`
  - `applications/brief-studio/README.md`

Additional commands/checks passed:

- Existing Brief Studio imported-package integration suite:
  - Command: `pnpm -C autobyteus-server-ts exec vitest run tests/integration/application-backend/brief-studio-imported-package.integration.test.ts --testTimeout 90000`
  - Result: Passed, `1` file / `3` tests.
  - Evidence: The suite discovered Brief Studio as an imported package, exercised the hosted REST/WebSocket/application GraphQL backend mount, created briefs, executed `launchDraftRun` through the app-owned API, persisted simulated `publish_artifacts` revisions/events for `researcher` and `writer`, invoked the application artifact handler, verified `brief.ready_for_review`, verified app-owned SQLite projections and GraphQL detail/list state, verified packaged frontend generated GraphQL client behavior through the hosted backend mount, and verified unexpected producers are rejected without committing projection state.

- Actual backend/frontend runtime smoke with Brief Studio imported from the built package:
  - Backend command shape from README: `node autobyteus-server-ts/dist/app.js --data-dir <tmp-data-dir> --host 127.0.0.1 --port 18080`
  - Runtime env included `APP_ENV=test`, `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:18080`, SQLite, and `AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS=/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor/applications/brief-studio/dist/importable-package`.
  - Server startup evidence: migrations applied to the temp SQLite DB, server listened on `127.0.0.1:18080`, application package discovery listed Brief Studio, and the `publish_artifacts` tool group registered.
  - GraphQL evidence: `applicationsCapability` was enabled, `listApplications` returned `Brief Studio`, `entryHtmlAssetPath` resolved, and `GET /rest/<entryHtmlAssetPath>` returned HTTP `200` with the Brief Studio HTML entry.
  - Frontend command shape from README: `pnpm -C autobyteus-web exec nuxi dev --host 127.0.0.1 --port 13000` with `BACKEND_NODE_BASE_URL=http://127.0.0.1:18080` and matching backend WebSocket endpoints.
  - Browser evidence: `/applications` rendered the Applications page with the `Brief Studio` card; opening it rendered the Brief Studio launch setup page; after saving a valid launch setup, `Enter application` became enabled; entering the app created the hosted iframe against the backend bundle asset URL and rendered the Brief Studio app UI.
  - Visual evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor/tickets/done/publish-artifacts-plural-refactor/evidence/brief-studio-runtime-smoke.png`.

- Running-server app-owned GraphQL smoke through the hosted application backend:
  - Endpoint: `POST http://127.0.0.1:18080/rest/applications/<brief-studio-app-id>/backend/graphql`
  - Result: Passed.
  - Evidence: `ensure-ready` returned `state: "ready"` with GraphQL/notifications/eventHandlers exposed; `BriefsQuery` returned an empty list; `CreateBriefMutation` created `brief-ce10030e-ef0d-474b-bd7c-a8917400b705`; `AddReviewNoteMutation` succeeded; `BriefQuery` returned the created brief, `status: "in_review"`, and the review note from the app-owned backend state.

Scope clarification for this addendum:

- I did not trigger a live LLM-backed Brief Studio draft run from the browser runtime because that would start an external model/team execution. The existing Brief Studio imported-package integration suite covers `launchDraftRun` and the `publish_artifacts` artifact-ingress/projection path deterministically, including researcher/writer artifact events and final ready-for-review projection.
- The browser/runtime smoke proves the packaged Brief Studio app still starts through the actual server and actual frontend and that the app-owned backend is callable in the same runtime.

Updated latest authoritative result remains: `Pass`.

## Addendum: Live Brief Studio Codex GPT-5.5 Application Run After User Request

After the user explicitly requested a real Brief Studio process using Codex as the runtime and `gpt-5.5` as the model, I ran an additional live application validation pass.

Runtime setup:

- Started a fresh backend data directory with the built Brief Studio importable package registered via `AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS`.
- Started the backend on `http://127.0.0.1:18080` and the Nuxt frontend on `http://127.0.0.1:13000`.
- Verified the Codex App Server model catalog included `gpt-5.5`.
- Configured Brief Studio's `draftingTeam` launch setup to:
  - runtime: `codex_app_server`
  - model: `gpt-5.5`
  - workspace root: `/tmp/autobyteus-brief-studio-codex-workspace`
  - auto tool execution: enabled through the app-managed launch profile
- Browser-verified the launch setup page showed `Codex App Server` and `OpenAI / GPT-5.5 (default reasoning: medium)`.

Evidence files:

- Launch setup screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor/tickets/done/publish-artifacts-plural-refactor/evidence/brief-studio-codex-gpt55-launch-setup.png`
- App-rendered screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor/tickets/done/publish-artifacts-plural-refactor/evidence/brief-studio-codex-gpt55-app-rendered.png`
- Structured run evidence JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor/tickets/done/publish-artifacts-plural-refactor/evidence/brief-studio-codex-gpt55-run.json`

Live run details:

- Created brief through the hosted Brief Studio application backend:
  - title: `Codex GPT-5.5 runtime validation brief for publish_artifacts`
  - brief id: `brief-e7761aef-6104-4f49-8e5f-5a8bd3646b3a`
- Launched the draft run through the hosted Brief Studio application backend:
  - binding id: `ec780eaa-3641-450f-80c7-157c06ee2ea5`
  - team run id: `team_bundle-team-6170706c69636174696f6e2d6c6f_82bdbccd`
- Team run metadata verified both members used the requested runtime/model:
  - `researcher`: `runtimeKind=codex_app_server`, `llmModelIdentifier=gpt-5.5`, `autoExecuteTools=true`
  - `writer`: `runtimeKind=codex_app_server`, `llmModelIdentifier=gpt-5.5`, `autoExecuteTools=true`
- The real Codex-backed team process created and published both Brief Studio artifacts:
  - researcher artifact: `brief-studio/research.md`, publication kind `research`, revision `44838417-6599-49f8-afdb-d6d493989f94`
  - writer artifact: `brief-studio/final-brief.md`, publication kind `final`, revision `2fe643d7-12c2-4af2-bada-998a54133eec`
- Brief Studio projection reached:
  - `status: "in_review"`
  - `artifact count: 2`
  - `lastErrorMessage: null`
- After successful evidence capture, I terminated the still-attached team run for cleanup. Post-termination Brief Studio execution state was:
  - `status: "TERMINATED"`
  - `terminatedAt: "2026-05-05T05:22:46.690Z"`
  - `lastErrorMessage: null`
  - brief remained `status: "in_review"` with both artifacts projected.

Result: Pass.

This addendum validates the exact user-requested path: Brief Studio configured to Codex App Server + `gpt-5.5`, a real brief created, a real draft process launched, real Codex-backed researcher/writer work executed, and `publish_artifacts` outputs projected into Brief Studio's app-owned state.

## Addendum: Artifact Workspace Path Contract Clarification After User Question

After the user asked whether artifact publication requires files to be inside the agent workspace, I rechecked the validation evidence and implementation contract.

Clarification:

- Yes: `publish_artifacts` publishes files from the current run workspace. A provided path may be relative to the workspace, or absolute, but it must resolve to a readable file inside the current workspace.
- The publication service rejects paths outside the workspace with `Published artifact path must resolve to a file inside the current workspace.` It also rejects missing/non-file paths with `Published artifact path '<path>' does not resolve to a readable file.`
- This is an intended safety/data-boundary behavior, not a regression from the plural refactor.

Observed during validation:

- I did not observe this outside-workspace artifact error during the final live Brief Studio Codex GPT-5.5 run. That run used workspace root `/tmp/autobyteus-brief-studio-codex-workspace`, and the successful published artifact paths were workspace-contained relative paths:
  - `brief-studio/research.md`
  - `brief-studio/final-brief.md`
- The live run's Brief Studio execution state had `lastErrorMessage: null`, and the brief reached `in_review` with both artifacts projected.
- I did intentionally exercise a different artifact failure path earlier in temporary validation: a sequential batch where the first file existed and the second path was missing. That validated the approved non-atomic behavior, but it was a missing-file failure, not an outside-workspace failure.

Operational implication:

- If Brief Studio, Codex, or another runtime writes an output file in a temporary directory, app package directory, or other location outside the configured `workspaceRootPath`, `publish_artifacts` should not publish it directly. The correct behavior is to write or copy the file into the agent workspace first, then publish the workspace-relative path or an absolute path that resolves inside that same workspace.

## Addendum: User-Raised Requirement/Design Gap Escalation

After the live Brief Studio Codex GPT-5.5 validation passed, the user clarified that they had solved an artifact-related problem and specifically called out that artifacts must be inside the agent workspace.

Current observed implementation behavior:

- `PublishedArtifactPublicationService` intentionally requires `publish_artifacts` paths to resolve to readable files inside the current run workspace.
- The final live Brief Studio Codex GPT-5.5 validation succeeded because the generated files were workspace-contained at `/tmp/autobyteus-brief-studio-codex-workspace` and were published as:
  - `brief-studio/research.md`
  - `brief-studio/final-brief.md`

Why this is being escalated despite the passing live run:

- The user indicated that an artifact/workspace problem needed manual attention outside my recorded validation steps.
- The approved requirements for this ticket focus on the singular-to-plural contract and preserve existing file-based artifact semantics, but they do not explicitly decide whether any additional Brief Studio UX, prompt hardening, path-copy behavior, or launch-profile guardrail is required when an output is produced outside the workspace.
- Because changing the workspace-boundary behavior itself would affect the artifact safety/data-boundary model, this should not be decided ad hoc in API/E2E.

Classification:

- `Requirement Gap` / `Design Impact` for `solution_designer` to decide whether the ticket scope should add an explicit requirement and design for one of the following:
  1. document/status-quo only: artifacts must be workspace-contained and app prompts/tool descriptions are sufficient;
  2. prompt/Brief Studio hardening: make the application instructions more explicit about copying/writing outputs into the configured workspace before publishing;
  3. runtime/UX guardrail: surface a clearer app-level error or launch validation when artifact paths are outside the workspace;
  4. deeper behavior change: allow or stage outside-workspace files, which would require explicit safety review.

Delivery should pause on this concern until solution/design ownership confirms whether the current behavior is acceptable or additional implementation is required.
