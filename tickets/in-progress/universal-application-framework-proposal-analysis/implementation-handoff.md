# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-spec.md`
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/proposal-critical-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-self-validation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/sources/autobyteus-vertical-application-developer-experience-proposal.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/architecture-review-revision-record.md`
- Triggering and downstream context:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-005-brief-dev-standalone.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-005-brief-standalone-real-team.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-005-brief-standalone-stall-api.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-005-brief-standalone-tool-exposure.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-005-standalone-agent-tools-route-regression.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-004-brief-dev-standalone.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-004-brief-standalone-real-team.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-004-brief-standalone-failure-api.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-004-brief-standalone-configuration.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-004-standalone-launch-profile-surface.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-004-studio-provider-artifact-excerpt.log`

## Current Implementation Summary

Source commit `e8e06afddcbc56ad57584a3289b562cf3ddda351` implements the authoritative `SR-009` / `CRR-016` bounded `CR-013` correction on top of the approved `ARCH-REV-006` implementation. The standalone Fastify composition now awaits the existing `registerAgentToolsMcpRoutes(app)` after its current plugin/browser-ingress setup and before the selected application's static wildcard. Studio remains unchanged, and standalone still does not register the separate external `/mcp/gateway`.

This implementation reuses the existing Agent Tools route, session, catalog, dispatcher, adapters, authorization, base-URL, and cleanup behavior unchanged. It adds no runtime owner, MCP configuration inheritance, adapter, gateway proxy, compatibility route, fallback, persistence, readiness phase, or shutdown responsibility. Application-owned MCP declarations/provisioning and runtime-internal tooling are outside this ticket; their existing upstream behavior is untouched.

The retained production implementation also preserves the prior dual-host foundation and SR-006 launch/edit/prompt authority, including the four distinct configuration meanings: immutable manifest `packageBaseline`, current pre-overlay `selectedResourceBaseline`, sparse raw `savedOverride`, and post-overlay `effectiveConfiguration`.

- `buildStandaloneApplicationServerComposition()` now mounts the established run-scoped Agent Tools route before `registerStandaloneApplicationStaticRoutes()`; the external MCP gateway remains absent.
- `ApplicationLaunchConfigurationService` remains the authoritative graph-local boundary for stored GET evaluation, unsaved selection preview, PUT re-resolution, readiness, host validation, and launch guarding. Its one `ApplicationLaunchResourceBaselineBuilder` owns definition traversal and precedence for all three evaluation paths.
- `ApplicationLaunchSelectionPreview` is a closed, exact app/slot/resource identity response exposed by a narrow Studio POST route. Preview resolves only the current selected definition baseline or selection issues: it does not read/write the override store, apply an override, validate host capability, transition readiness, or fall back to the package selection.
- Stored slot views expose both package and selected baselines. No row makes the two equal. A valid alternate row exposes the current selected baseline before overlay and its effective result after sparse overlay. Missing selections and stale team topology keep the raw row and diagnostics without fallback or read-time repair.
- PUT re-resolves the current resource and team topology through the same builder before writing. A resource/topology change between preview and save is therefore rejected without a stale write.
- Studio obtains alternate-resource editing context only from a stored selected baseline or an exact identity-bound preview. It discards stale preview responses, blocks save while preview is pending/invalid, invalidates previews after definition/catalog/save/reset changes, and reloads authoritative state after a failed PUT.
- Clearing a saved field persists its absence and reveals the current selected definition value. Team member runtime/model inheritance is per member; a mixed-runtime team has no implicit common runtime and keeps bulk model selection disabled until the user explicitly selects one.
- The package/effective inheritance heuristic and Studio-side agent/team definition traversal were removed. Application setup model selection opts out of global AutoByteus runtime fallback.
- `ApplicationPortableLaunchConfigPolicy` is one recursive, schema-aware package validator policy. It accepts the exact supported token-count fields and typed pricing schema, while rejecting nested credential/password/authorization/bearer/token-value/endpoint/base-URL/host/workspace/machine-path semantics with exact paths and without reporting values. IR-009 extends the same classifier to URL/URI, connection-string/DSN, qualified endpoint-address, access/account/client/subscription-key, and authentication aliases; it does not add an app/runtime exception.
- The former `ApplicationLaunchPackageBaselineBuilder` file and symbol were cleanly renamed to `ApplicationLaunchResourceBaselineBuilder`; no alias, wrapper, or parallel implementation remains.
- Existing override rows remain directly usable. Selected baselines and previews are derived only; no persisted field, migration, compatibility reader, or dual write was added.

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/implementation-revision-record.md`
- Current implementation revision ID: `IR-010`
- Related solution revision IDs: `SR-009` (`SR-007` withdrawn; `SR-001`–`SR-006` and `SR-008` retained as history)
- Related architecture-review revision IDs: `ARCH-REV-006` (`ARCH-REV-007` withdrawn; `ARCH-REV-001`–`ARCH-REV-005` retained as history)
- Related code-review revision IDs: `CRR-016` trigger (`CRR-015` superseded); `CRR-001`–`CRR-014` history
- Related API/E2E revision IDs: `API-REV-005` trigger; `API-REV-001`–`API-REV-004` history
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-013`, `APIE2E-F005`, `APIE2E-STANDALONE-MCP-001`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-001` | One immutable current package remains usable through Studio and standalone. | Existing providers/compositions/devkit hosts plus the retained SR-005 launch gate. | Preserved; SR-006 adds no package copy, manifest change, or host-specific application branch. |
| `BEH-002` | Application code continues to use one host-neutral `startApplication`. | Existing frontend SDK coordinator/providers. | Preserved; no application-facing API change. |
| `BEH-003` | Strict manifest v4 and stable package identity remain unchanged. | Existing package parser/selection and devkit source-only standalone metadata. | Preserved; baseline/preview projections are not manifest fields. |
| `BEH-004` | Resolve manifest and selected-resource baselines server-side, preview unsaved selection without writes, overlay only sparse host fields, and launch only a complete runnable result. | `application-launch-{configuration-service,resource-baseline-builder,override-overlay,configuration-diagnostics}.ts`; contracts; REST preview route; Studio setup preview coordinator/editors. | Implemented. Package, selected, saved, and effective meanings stay distinct; no fallback or UI definition traversal. |
| `BEH-005` | Preserve explicit Studio/standalone compositions and separate process health from application readiness; mount the established run-scoped Agent Tools route in both hosts without exposing the external gateway in standalone. | `build-standalone-application-server-composition.ts` reuses `registerAgentToolsMcpRoutes(app)` before static fallback; Studio registration/lifecycle remain unchanged. | Implemented. Standalone now reaches the established auth/session route while `/mcp/gateway` remains absent. |
| `BEH-006` | Native package commands reject non-portable launch data while accepting exact runtime-portable tuning. | `application-portable-launch-config-{policy,schemas}.ts`; standalone package validator; devkit validate/build path. | Implemented. Policy and real-package probes reject the CRR-013 URL/connection/key aliases at exact paths without values while preserving exact token-count/pricing positives. |
| `BEH-007` | Current override rows remain directly usable; invalid rows stay visible and blocking until explicit replacement/reset. | Launch service/overlay, existing store, REST save/reset, Studio setup. | Preserved and strengthened. Selected baselines/previews are computed only, and PUT is the final resource/topology authority. |
| `BEH-008` | Exact graph-local package-team definition authority reaches runtime prompts. | Existing SR-005 run authorities and `MemberTeamContextBuilder` path. | Preserved; SR-006 adds no global catalog lookup. |

## Key Files Or Areas

- Current bounded delta: `autobyteus-server-ts/src/compositions/build-standalone-application-server-composition.ts`.
- Contracts: `autobyteus-application-sdk-contracts/src/execution-resources.ts` and generated declaration output.
- Launch authority: `autobyteus-server-ts/src/application-platform/launch-configuration/application-launch-configuration-service.ts`.
- Baseline traversal: `application-launch-resource-baseline-builder.ts` (clean rename/replacement of the removed package-only name).
- Sparse overlay/diagnostics: `application-launch-override-overlay.ts`; `application-launch-configuration-diagnostics.ts`.
- Portable package policy: `application-portable-launch-config-policy.ts`; `application-portable-launch-config-schemas.ts`; `application-standalone-package-validator.ts`.
- Host surfaces/wiring: `application-execution-resources.ts`; `application-route-error.ts`; `application-orchestration-host-service.ts`; `create-application-orchestration-authorities.ts`.
- Studio coordination: `ApplicationLaunchSetupPanel.vue`; `useApplicationLaunchSelectionPreviews.ts`; `useApplicationLaunchSetupPresentation.ts`.
- Studio editors: `ApplicationExecutionResourceSlotEditor.vue`; `ApplicationAgentLaunchProfileEditor.vue`; `ApplicationTeamLaunchProfileEditor.vue`; `ApplicationTeamMemberOverrideItem.vue`; `useRuntimeScopedModelSelection.ts`; launch profile/readiness utilities and localized labels.

## Important Assumptions

- The existing Agent Tools MCP registrar and its established process-scoped collaborators remain the authority; IR-010 adds only the missing standalone mount.
- Application-owned MCP declarations/provisioning and runtime-internal tooling are outside this ticket and remain untouched.
- Current graph-local agent/team definition services are the sole definition authorities; preview and PUT intentionally observe their current state rather than persisting a snapshot.
- The exact app/slot/resource identity is sufficient to reject stale preview responses in one setup session; PUT re-resolution is the server-side concurrency authority.
- Runtime/model catalogs and authentication remain host capability authorities. No alternate runtime/model is inferred when the selected baseline is incomplete or unavailable.
- Existing stored sparse rows already have the required meaning and need no transformation.

## Known Risks

- The focused implementation checks prove route reachability and preserved auth/session behavior but not the full real standalone callback, handoff, or artifact projection journey; API/E2E owns that rerun.
- No full live Studio stack was started during this implementation round. Exact browser request timing, real catalog refresh invalidation, save/reset interactions, and a true preview/PUT race require downstream API/E2E execution.
- The rendered component checks exercised the actual team editor through Nuxt/Vitest, not the complete Studio page or authenticated provider journey. Full viewport, keyboard/accessibility, and live network-state inspection remain downstream.
- Full web typecheck is globally red on existing repository diagnostics. The changed-area filter found only the intentionally preserved API/E2E-owned obsolete `ApplicationTeamLaunchProfileEditor.spec.ts` fixture type errors and no changed production-source diagnostic.
- API/E2E-owned tests, reports, and evidence remain intentionally dirty/untracked in the shared worktree. They predate SR-006 and must be reconciled and rerun by `api_e2e_engineer` after source review passes.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix / Local Fix`
- Reviewed root-cause classification: `Local Implementation Defect`
- Reviewed refactor decision: `Not Required`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`; `CRR-016` and `SR-009` confirm the existing subsystem is correct and only the standalone mount was omitted
- Evidence / notes: the standalone composition now mounts the same existing run-scoped registrar as Studio before its static wildcard. No Agent Tools owner, API, adapter, lifecycle, or external-gateway boundary changed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in production scope: `No`; obsolete durable API/E2E assertions remain preserved for downstream ownership only
- Dead/obsolete production code, obsolete files, unused helpers/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight: `Yes`; selected baseline and preview contracts are specialized rather than optional fields on an unrelated common result
- Canonical shared design guidance was reapplied: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`
- Notes: the old package-baseline builder path/symbol and Studio package/effective inheritance heuristic were removed with no alias. Studio definition traversal was removed. All changed source implementation files remain at or below 500 effective non-empty lines. The recursive policy was split from its schemas because the original combined delta crossed the 220-line review signal.

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: `design-spec.md` — “Persisted Data / State Transition Decision” and DS-012
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: the store/table/JSON shapes are unchanged; current rows are read as sparse host overrides; valid rows overlay the currently resolved selected baseline; invalid or stale rows remain stored and blocking; selected baselines/previews are never persisted; DELETE remains the only reset write.
- Migration implementation: `N/A`
- Deviation: `None`

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis`
- Branch: `codex/universal-application-framework-proposal-analysis`
- SR-006 source commit: `25ad035ca126e789a9c233cf858d48ea3b41ea50`
- IR-009 CR-009 local-fix source commit: `957b928b131d6953ffc5ace7000e1f954db90fdd`
- SR-009 solution clarification commit: `571e1be0c`
- IR-010 CR-013 standalone route-mount source commit: `e8e06afddcbc56ad57584a3289b562cf3ddda351`
- Reviewed base `6caf809303294252c109420b238588f0c68aca6a` remains in history. Delivery owns final refresh/integration against the latest tracked base; implementation did not merge or rebase.
- The devkit must be built before invoking a maintained application validation command in this worktree. After that normal prerequisite, Brief validation passed.
- API/E2E-owned modified/untracked tests, reports, and evidence were preserved exactly; no durable API/E2E test was authored or committed in IR-008 or IR-009.

## Local Implementation Checks Run

- `pnpm --filter @autobyteus/application-sdk-contracts build` — Pass.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — Pass.
- `pnpm -C autobyteus-server-ts build` — Pass, including dependent shared builds, Prisma generation, managed assets, built-in bootstrap smoke, and sanitized built-module smoke.
- `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, and `audit:localization-literals` — Pass; localization audit reported zero findings.
- Full Nuxt typecheck — repository-global Fail on existing diagnostics. Filtered changed-area output contains no IR-008 production-source diagnostic; only the preserved API/E2E-owned stale team-editor test fixtures are reported.
- Disposable focused server Vitest probe — Pass, 2/2: recursive portable policy; same-builder GET/preview/PUT; preview no store read/write; selected pre-overlay versus effective host override; cleared field behavior; and race rejection without write. Probe removed after execution.
- Disposable rendered Nuxt/Vitest team-editor probe — Pass, 1/1: distinct per-member inherited runtimes/models, mixed-runtime display, disabled bulk model selection, and explicit common-runtime unlock. Probe removed after execution.
- Disposable frontend preview coordinator probe — Pass, 1/1: stale exact-identity response discarded. Probe removed after execution.
- Disposable sparse-draft utility probe — Pass, 1/1: clearing the saved model omits the field while the selected definition baseline remains available. Probe removed after execution.
- `pnpm -C autobyteus-application-devkit build` followed by `pnpm -C applications/brief-studio validate` — Pass. Generated devkit build output was removed afterward.
- Disposable copied real Brief package positive case — Pass: exact AutoByteus `max_tokens`, `token_limit`, `safety_margin_tokens`, typed pricing tiers, and harmless nested extra parameters accepted.
- Disposable copied real Brief package negative case — Pass: nested `extra_params.nested.authorization` rejected at the exact path without echoing its value. Copy removed afterward.
- `git diff --check`, staged-diff check, obsolete builder symbol/path search, source-size/responsibility audit, and implementation-owned staging inventory — Pass.
- IR-009 `pnpm exec tsc -p tsconfig.build.json --noEmit` and `pnpm build` in `autobyteus-server-ts` — Pass, including dependent shared builds, Prisma generation, managed assets, built-in bootstrap smoke, and sanitized built-module smoke.
- IR-009 disposable direct built-policy probe — Pass: `server_url`, `api_url`, `connection_string`, `access_key`, `baseUri`, `service_address`, `client_key`, and `auth_config` were rejected recursively at exact paths without values; exact token counts, typed pricing tiers, and harmless nested response-format data remained accepted.
- IR-009 disposable copied real Brief package probe — Pass: an AutoByteus package with exact token counts, typed pricing, and harmless extra params validated; four independent copies containing `server_url`, `api_url`, `connection_string`, or `access_key` failed through `validateStandaloneApplicationPackage` at exact paths without values. Temporary packages were removed.
- IR-009 `git diff --check`, one-file implementation-owned staging audit, 232-effective-line cohesive policy audit, and scratch cleanup — Pass. The local delta is 34 lines and does not cross the 220-changed-line split trigger.


### IR-010 focused checks

- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — Pass.
- Existing API/E2E-owned standalone composition file, executed unchanged: `pnpm -C autobyteus-server-ts exec vitest run tests/integration/application-backend/standalone-application-composition.integration.test.ts --reporter=verbose` — Pass, 1 file / 2 tests. The standalone request to `/mcp/agent-tools/missing-session` reached the established missing-bearer `401 unauthorized` gate instead of static/generic `404`.
- Existing Agent Tools route suite, executed unchanged: `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts --reporter=dot` — Pass, 1 file / 11 tests, including missing-bearer `401` and unknown/wrong/revoked session `404 session_unavailable` behavior.
- Disposable source route-inventory probe — Pass: the internal registrar is after Fastify plugin setup and before standalone static fallback; the standalone composition contains no external MCP gateway import/registration. Probe was inline and left no file.
- `git diff --check`, two-line source delta, 44-effective-line source-size guard, and implementation-owned staging audit — Pass.
- API/E2E-owned dirty tests, reports, and evidence were not modified or staged by implementation.

## Frontend Rendered-Result Check

IR-010 changes only backend Fastify route composition, so a new frontend rendered-result check is `Not Applicable`. The retained IR-008 frontend self-validation remains:

- Affected surfaces / journeys: Studio application execution-resource selection; alternate agent/team editing; inherited per-member runtime/model display; mixed-runtime bulk edit; pending/invalid preview save gate.
- Approved references: `requirements.md` AC-015/AC-016; `design-spec.md` BEH-004, DS-012, UC-020; `ARCH-REV-006`.
- Existing design system/adjacent surfaces reviewed: current application setup panel, slot editor, agent/team/member editors, shared runtime/model fields, and existing localized status/issue patterns.
- Rendered surface used: actual team launch profile component through the repository-supported Nuxt/Vitest renderer.
- States/interactions inspected: two members inheriting distinct selected-baseline runtimes/models, mixed-runtime message, disabled bulk model selector, explicit runtime selection, and enabled bulk selector.
- Issues corrected: removed global runtime fallback, removed UI definition traversal and inferred package/effective context, and prevented a mixed team from presenting a false common model catalog.
- Remaining limitation: the complete Studio page, live preview requests, save/reset race, responsive viewports, keyboard/accessibility, and authenticated Luna execution were not rendered in an implementation-stage live browser. This is not API/E2E sign-off.

## Downstream Coverage Hints / Suggested Scenarios

- Standalone route mount: unauthenticated `/mcp/agent-tools/:sessionId` reaches the existing `401` gate; unknown/wrong/revoked sessions retain established non-enumerating `404`; external `/mcp/gateway` remains absent.
- Real API/E2E rerun: retry `APIE2E-STANDALONE-MCP-001` and `APIE2E-F005` using the existing descriptor/session boundary. Application-owned MCP declarations/provisioning and runtime-internal tooling are not targets in this ticket.
- Contract/API: assert stored slot view includes `selectedResourceBaseline`; preview is closed and exact identity-bound; invalid preview returns paths/issues without fallback; preview performs no store read/write.
- Authority reuse: prove GET, preview, and PUT invoke the same graph-local baseline owner and use the same precedence, including nested teams and atomic `llmConfig`.
- Sparse editing: first-save alternate resource inherits its own runtime/model; clearing an override field omits it and reveals the current selected definition value; reset deletes only the row.
- Mixed team: distinct member runtimes/models remain distinct; bulk model is disabled without an explicit common runtime; no AutoByteus/previous-result fallback.
- Concurrency: delayed stale preview cannot replace a newer selection; definition/catalog change refreshes preview; preview/PUT resource or topology race rejects without write and reloads current state.
- Portable package policy: positive exact token-count/typed-pricing cases plus nested credential/password/authorization/bearer/token-value/endpoint/base-URL/host/workspace/machine-path negatives, including `server_url`, `api_url`, `connection_string`, `access_key`, URL/URI, DSN, qualified address, client/account/subscription key, and auth aliases; assert exact paths and absence of secret values.
- Real Studio journey: select an alternate resource, observe preview, save sparse override, reload, clear a field, save, reset, and verify readiness/entry behavior throughout.
- Resume the retained full dual-host matrix: authenticated Luna prompt/provider/events/artifacts journeys, real application-folder commands, Studio remount/reload, static/SPA/origin behavior, parity/digests, worker recovery, graph isolation, and cleanup/leak checks.

## API / E2E / Executable Coverage Investigation And Execution Still Required

`api_e2e_engineer` still owns durable test reconciliation and all broader executable/API/E2E evidence. Source review must pass before that stage resumes. IR-010 checks are implementation-scoped only and do not establish API/E2E Pass.
