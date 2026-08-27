# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/requirements.md`
- Investigation notes: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/investigation-notes.md`
- Design spec: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-spec.md`
- Supplemental task artifacts: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/application-owned-mcp-intended-behavior.md`
- Solution revision record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/solution-revision-record.md`
- Design review report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`
- Architecture review revision record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/architecture-review-revision-record.md`
- Triggering rework report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`
- Triggering code review revision record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-revision-record.md`

## Current Implementation Summary

The implementation adds the strict application-owned agent-tool contract and carries it from import-safe package declarations through application-scoped MCP/native projection, one authorization/validation gateway, and exact application-worker dispatch. It also replaces the prior destructive refresh/reentry split with the reviewed serialized, staged target-slice catalog transition and integrates application-tool admission/drain into reload and shutdown. Maintained source applications and the devkit template use manifest v5/backend-definition v7; Brief Studio contains the reviewed binding-derived, read-only `get_brief_context` sample. IR-002 corrects CR-DI-001 by reserving every catalog-registered static adapter name from application declarations and routes, while preserving the distinct no-application configured-MCP precedence behavior.

- Implementation cycle: `Rework`
- Implementation revision record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`, `SR-005`
- Related architecture-review revision IDs: `ARCH-REV-004`, `ARCH-REV-005`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-DI-001` — resolved at design level by `SR-005` / `ARCH-REV-005` and corrected in source by `IR-002`; prior `ARCH-DI-001` and `ARCH-DI-002` remain resolved.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Add import-safe static declarations and exact worker handler matching. | `autobyteus-application-sdk-contracts/src/application-agent-tools.ts` -> manifest parser/provider/bundle model -> `ApplicationAgentToolCatalog`; backend v7 types -> `application-backend-definition-loader.ts`. | Implemented. Declaration names/schema are normalized and fail closed; worker load requires the declared/implemented handler-name sets to match exactly. |
| BEH-002 | Make application-local declarations part of readiness and selected runtime exposure without global registration. | `agent-tool-mcp-catalog.ts` / `agent-tools-mcp-host.ts` complete static-name snapshot -> `application-definition-runtime-readiness.ts`; `application-runtime-definition-validator.ts`; sealed capability assembly in `build-application-platform-runtime.ts`; application execution-scope injection. | Implemented. Every name in the static adapter registration index is forbidden to every application declaration regardless of availability, selection, or configured-MCP policy; only the immutable names snapshot crosses into readiness. Invalid definitions quarantine/fail readiness, and the capability is absent from the general-process scope. |
| BEH-003 | Project the same selected application routes to shared MCP for Claude/Codex and checked bound tools for AutoByteus. | `agent-tool-mcp-catalog.ts`, `application-agent-tool-mcp-adapter.ts`, `application-agent-tool-composer.ts`, `application-agent-tool-native-schema-projector.ts`, `application-agent-tool.ts`. | Implemented. A defensive route collision with any registered static adapter fails. A non-static application route still outranks configured MCP, while the no-application branch keeps configured-protected, active-static, and `prefer_configured_mcp` precedence distinct (including configured `open_tab` winning over browser static). Native schemas must round-trip exactly through the unchanged mapper/model. |
| BEH-004 | Authorize and validate one raw call, dispatch once to the exact worker, and return a bounded safe result. | `application-agent-tool-gateway.ts` -> `application-run-ownership-service.ts` -> Ajv `application-agent-tool-payload-validator.ts` -> worker invoker/controller/protocol/host/entry. | Implemented. AutoByteus preparation keeps the original argument object and does not call `super.prepareExecution`; configured members and live server-minted Team descendants use the existing ownership/root-run authorities. Input and result envelopes are strict JSON and capped at 1 MiB. |
| BEH-005 | Coordinate reload/removal/crash/shutdown with application-tool admission and one staged catalog owner. | `application-agent-tool-call-lifecycle.ts`, `application-catalog-transition-service.ts`, revised participant-only `application-reentry-service.ts`, staged `application-bundle-service.ts` and tool-catalog deltas, package command integration, platform lifecycle. | Implemented. Old target participants drain and stop before mutation; paired prepared bundle/tool assignments commit without an `await`; actual rollback state is re-staged; added apps remain lazily startable; exact repair reentry can recover a quarantined app; removed/invalid apps stay closed/quarantined; unrelated slices and lanes remain untouched. |
| BEH-006 | Perform the clean v5/v7 transition and regenerate/validate maintained packages. | Contract constants/readers, devkit validator/template, Brief Studio and Socratic Math Teacher source. | Implemented. No v4/v6 production fallback was retained. Maintained packages built and validated from current source; generated output was removed from the worktree afterward because it is reproducible and untracked. |
| BEH-007 | Preserve automatic/configured tools and generic native preparation. | Application-aware composition is confined to the application execution scope and filters only selected application route names before the existing resolver. | Implemented. `BaseTool`, `McpSchemaMapper`, `ParameterSchema`, automatic exposure builders, configured-tool materialization, and general-process capability remain unchanged. |

## Key Files Or Areas

- Canonical contract and SDK exports: `autobyteus-application-sdk-contracts/src/application-agent-tools.ts`, `src/manifests.ts`, `src/index.ts`, and `autobyteus-application-backend-sdk/src/index.ts`.
- Application catalog/gateway: `autobyteus-server-ts/src/application-agent-tools/{domain,services}/`.
- Native projection: `autobyteus-server-ts/src/agent-execution/backends/autobyteus/application-agent-tools/` plus the provider factory boundary.
- MCP projection: `autobyteus-server-ts/src/agent-tools/mcp/`.
- Worker contract and dispatch: `autobyteus-server-ts/src/application-engine/{runtime,services,worker}/`.
- Ownership: `autobyteus-server-ts/src/application-orchestration/services/application-run-ownership-service.ts` and the application execution-scope Team identity adapter.
- Catalog lifecycle: `application-catalog-transition-service.ts`, `application-catalog-transition-plan.ts`, revised reentry/package command/bundle services, readiness, and platform lifecycle.
- Clean contract sources: application devkit validator/template and the two maintained applications; Brief Studio's sample handler is `applications/brief-studio/backend-src/agent-tools/get-brief-context.ts`.
- Dependency: direct Ajv 8 declaration in `autobyteus-server-ts/package.json` and resolved lockfile importer entry.

## Important Assumptions

- Package `dist/` directories are reproducible outputs and are not repository source; they were used for build/package validation and then removed from the worktree.
- The reviewed strict clean cut is authoritative: v4/v6 package artifacts must be rebuilt rather than read through fallback branches.
- Ajv remains configured without coercion, defaults, or removal, so the common gateway validates but does not transform the provider/native argument object.
- Existing application/platform databases, Agent/Team definitions, and configured MCP state do not encode the new declaration/handler fields and therefore require no migration.

## Known Risks

- IR-002 has not yet received renewed source review. It must return through `/code_reviewer` before API/E2E begins.
- API/E2E coverage investigation and execution have not run. The full AutoByteus/Claude/Codex runtime matrix, real child-worker calls, realistic Team descendant calls, concurrent reload/removal, crash recovery, and Studio/standalone shutdown remain downstream validation work.
- Existing repository-resident coverage fixtures still contain retired v4/v6 examples. The API/E2E engineer must classify and update/remove/replace those fixtures before relying on broad test results. IR-002 added only focused implementation-owned unit coverage for the corrected static collision boundary; it did not perform the downstream coverage investigation or edit API/E2E suites.
- Project README/module documentation still describes some v4/v6 contracts. This is a delivery documentation impact, not a retained runtime compatibility path.
- The managed-install removal finalizer intentionally runs only after the empty target slice is committed. A filesystem deletion failure reports failure while retaining the already-safe removed catalog state and undeleted managed files for operator cleanup.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature / Larger Requirement`
- Reviewed root-cause classification: `Boundary Or Ownership Issue`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `Yes`
- Evidence / notes: `CRR-001` correctly routed `CR-DI-001` upstream. `SR-005` / `ARCH-REV-005` resolved the design boundary and IR-002 implements it. The implementation otherwise continues to use one sealed application capability/gateway rather than global registration or provider-specific policy, and one serialized staged catalog-transition owner rather than retaining competing refresh/reentry mutation paths. The native raw-preparation specialization remains application-only; fundamental generic tool behavior remains unchanged.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` — `ApplicationCatalogRefreshCoordinator`, `ApplicationBundleService.refresh/reloadApplication`, and the old reentry catalog-mutation method are removed from production.
- Ambiguous prior static-name readers/properties removed without compatibility aliases: `Yes` — `listSupportedToolNames()`, public `listProtectedStaticToolNames()`, and host `protectedStaticToolNames` are absent; `listStaticAdapterToolNames()` and immutable `staticAdapterToolNames` are the sole public names.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: No changed source file exceeds 500 effective non-empty lines. After IR-002, `agent-tool-mcp-catalog.ts` is 342 effective lines, `agent-tools-mcp-host.ts` is 82, and readiness is 109. The 343-line new canonical SDK schema contract/parser was retained as one cohesive normalization authority after assessment. The native composition helper was extracted so the pre-existing AutoByteus backend factory remains at 498 effective lines. Other near-limit provider/parser files received only small deltas (2 and 6 lines respectively).

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Discard or Rebuild` for generated/importable package artifacts; `Directly Usable — No Migration` for application/platform databases, Agent/Team definition storage, and global MCP configuration.
- Design-spec decision reference: `design-spec.md` -> `Persisted Data / State Transition Decision`.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: no database/store model or migration changed; maintained application packages were rebuilt and validated under v5/v7; reproducible generated output was cleaned after validation.
- Migration implementation and focused checks, only when `Migration Required`: `N/A`
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Environment used: Node `v22.23.1`, pnpm `10.28.2` through Corepack.
- Established the workspace dependency environment with `corepack pnpm install`; a later `pnpm install --force` relinked the built devkit CLI before package validation.
- Added Ajv as a direct server dependency (`^8.17.1`, resolved `8.18.0`).
- Server prebuild generated Prisma Client and built the shared workspace dependencies before TypeScript compilation.
- Generated application/SDK `dist/` directories were intentionally cleaned after all implementation checks.

## Local Implementation Checks Run

- IR-002 focused correction coverage: `corepack pnpm --filter autobyteus-server-ts test --run tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts tests/unit/agent-tools/mcp/agent-tools-mcp-host.test.ts tests/unit/application-platform/application-definition-runtime-readiness.test.ts` — passed (3 files, 16 tests). This covers all default-provider static names, application `open_tab`, protected and inactive registered static collisions, non-static application-over-configured routing, configured browser precedence without an application route, and all-declaration readiness from the names snapshot.
- `corepack pnpm --filter @autobyteus/application-sdk-contracts build` — passed.
- `corepack pnpm --filter @autobyteus/application-backend-sdk build` — passed.
- `corepack pnpm --filter autobyteus-server-ts build` — passed again after the final IR-002 implementation edits; this included shared builds, Prisma generation, server TypeScript compilation, managed-asset copying, and the sanitized built-in-agent bootstrap smoke check.
- `corepack pnpm --filter @autobyteus/application-devkit build` — passed.
- `corepack pnpm --filter @autobyteus-example/brief-studio-authoring typecheck:backend` and the Socratic Math Teacher equivalent — passed.
- Maintained Brief Studio and Socratic Math Teacher `build` followed by `validate` — both generated current packages and reported them valid.
- Narrow Node implementation checks — passed for the accepted/rejected portable-schema matrix and native mapper round trip; raw strict Ajv parity and 1 MiB/JSON-structure guards; native same-object preparation/inherited execution; worker exact handler maps; MCP application-over-configured precedence/protected collisions; application bundle target-slice preservation/prepared commit; application call admission/drain; package participant recovery policy; added-app lazy readiness; exact quarantined-app repair; and configured/dynamic Team ownership mapping.
- Source/invariant checks — `git diff --check` passed; removed names `listSupportedToolNames`, public `listProtectedStaticToolNames`, host `protectedStaticToolNames`, and prior wiring identifiers are absent from source/tests; readiness/native projection has no MCP-provider/adapter/policy import; no changed production source file exceeded 500 effective non-empty lines; no application adapter calls `super.prepareExecution`; no removed refresh coordinator or direct package/orchestration bundle refresh call remains; and `BaseTool`, `McpSchemaMapper`, and `ParameterSchema` have no diff.

These are implementation-scoped local checks only, not API/E2E sign-off.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable. The change adds package/backend contracts, execution routing, lifecycle coordination, and a read-only sample business tool; it does not alter a rendered frontend surface or user interaction layout.

## Downstream Coverage Hints / Suggested Scenarios

- Exercise zero-tool packages plus recursive accepted schema keywords and explicit nullable/length/default/closed-object/composition rejection.
- Run integer/number/boolean string aliases, empty-string arrays, and nested coercible values through real AutoByteus and Claude/Codex MCP adapters; assert the same invalid-input code, unchanged argument meaning, and zero worker calls.
- Verify selected/unselected App A/App B/general-process isolation, same-name declarations, non-static application-over-configured precedence, every registered-static collision quarantine (including unavailable and `prefer_configured_mcp` names), and unchanged configured-browser precedence when no application declares the name.
- Cover standalone Agent, configured Team member, task-created descendant, stale/forged member identity, wrong binding/application, and terminal binding authorization.
- Validate exact missing/extra handler load failures, one-call completion, caller-aware handler context, rich/error results, non-JSON values, input/result 1 MiB bounds, and unexpected worker crash with no invocation-boundary retry.
- Cover unchanged versus changed fingerprints across old sessions.
- Drive real Settings/GraphQL import, reload, removal, rollback restoration, rollback quarantine, and exact reentry while calls are admitted; assert target-only drain/worker stop and unrelated lane/catalog identity preservation.
- Verify import does not eagerly start a worker, a newly imported ready app is normally startable, package reload only recovers previously active apps, and exact repair reentry can recover a previously quarantined app.
- Verify Studio/standalone shutdown ordering and session revocation.
- Exercise Brief Studio `get_brief_context` across AutoByteus/Claude/Codex using durable binding-derived state, including missing correlation, without accepting model-provided routing authority.
- Investigate all existing v4/v6 durable fixtures and update/remove/replace them before broad execution.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required. No API/E2E coverage investigation, environment setup, durable coverage edit, or broad executable test classification was performed in this implementation stage.
