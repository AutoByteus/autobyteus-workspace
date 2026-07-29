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
- Triggering rework reports, revision records, and evidence:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-004-brief-dev-standalone.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-004-brief-standalone-real-team.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-004-brief-standalone-failure-api.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-004-brief-standalone-configuration.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-004-standalone-launch-profile-surface.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-004-studio-provider-artifact-excerpt.log`

## Current Implementation Summary

Source commit `f86ea03c138ea08f500a2acd839b096eb1a29cc9` implements the architecture-approved `SR-005` / `ARCH-REV-005` correction. Local-fix source commit `3c38ca7e6f4d32e281b6af07e8bf046ef7cc253a` resolves `CR-009`–`CR-011` without changing that authority model.

The current implementation now has one application launch authority across package validation, Studio setup, lifecycle projection, standalone startup, backend context, and runtime launch:

- `ApplicationLaunchConfigurationService` owns immutable package-baseline resolution, raw saved host-override validity, valid override overlay, effective per-leaf configuration/provenance, host runtime/model/credential validation, the exact three-state aggregate readiness result, explicit override save/delete, and `requireRunnableConfiguration`.
- Package baseline traversal uses the exact graph-local application definitions and resolves each runtime/model field by nearest enclosing team, then outer teams, then leaf agent. Host member and host slot defaults overlay that baseline; `llmConfig` is atomic and is cleared when an overriding runtime/model makes inherited tuning inapplicable.
- Invalid saved resource selections and stale saved member topologies retain both the package baseline and raw stored row, expose `HOST_REQUIREMENT_MISSING` with `HOST_OVERRIDE` issues, null only the affected effective configuration, never write during reads, and remain blocked until explicit replacement or DELETE reset.
- Host capability validation checks the exact runtime, exact model identifier, workspace, and provider/runtime authentication. It never substitutes another runtime or model. Codex readiness uses the existing app-server client's `account/read` boundary and always releases the acquired client.
- The maintained Brief researcher/writer and Socratic tutor now package exact `codex_app_server` / `gpt-5.6-luna` defaults. Their business launch paths consume only `agentResources.requireRunnable`; hard-coded resource refs, request-model rescue, null-profile presets, and Socratic's hard-coded reasoning rescue are removed.
- `standalone.enabled` is source-only devkit metadata. Pack, project validation, standalone development, and production start invoke the same pure current-package validator; `start` remains build-free. Manifest v4 is unchanged. The portable-key policy now rejects actual credential/secret/token/endpoint keys while accepting schema-supported tuning such as `max_tokens`, `token_limit`, and `safety_margin_tokens`.
- Studio setup renders package baseline, saved host override/state, effective configuration, field provenance, aggregate/scoped issues, separate cancel-draft and reset-to-package-default actions, and delegates entry readiness to the authoritative aggregate result. Sparse runtime overrides remain blank in persisted drafts while model catalogs and readiness inherit the selected package/effective runtime across agent, team-default, and team-member editors.
- Stale saved team topology now renders every stale route/member/agent identity plus changed current agent identity. Its raw invalid draft is locked against read-time repair/sanitization until the user explicitly accepts the current team topology, selects a replacement resource, or invokes package Reset/DELETE; resource uniqueness and server validation remain unchanged.
- One `MemberTeamContextBuilder` constructed from the exact application graph team-definition service now reaches mixed root and nested managers, persistent and task registries, new/restored handles, and final prompt composition. No member handle selects a global catalog.
- All prior dual-host behavior remains: one `startApplication`, provider-local Studio/standalone bootstrap, explicit Studio and standalone compositions, shared engine/gateway/storage/orchestration/runtime authorities, current package selection, host-specific ingress cardinality, real devkit hosts/reload behavior, worker recovery, and staged cleanup.

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/implementation-revision-record.md`
- Current implementation revision ID: `IR-007`
- Related solution revision IDs: `SR-005` (`SR-001`–`SR-004` retained as history)
- Related architecture-review revision IDs: `ARCH-REV-005` (`ARCH-REV-001`–`ARCH-REV-004` retained as history)
- Related code-review revision IDs: `CRR-011` trigger; `CRR-001`–`CRR-010` history
- Related API/E2E revision IDs: `API-REV-004` trigger; `API-REV-001`–`API-REV-003` history
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-009`, `CR-010`, `CR-011` (IR-006 findings `CR-006`–`CR-008` remain source-resolved and await API/E2E)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-001` | One immutable package remains usable through Studio iframe and standalone root lifecycle. | Existing SDK providers/compositions plus `start-standalone-application-host.ts`; package defaults in maintained application definitions. | Preserved. Standalone now gates the selected application on the same runnable authority before listen/mount. |
| `BEH-002` | Application code uses one host-neutral `startApplication` and shared client. | Existing frontend SDK startup coordinator/providers and generated maintained frontend assets. | Preserved; no host branch added to application code. |
| `BEH-003` | Keep strict manifest v4/current package identity; standalone capability is source-only project metadata. | `application-devkit-config.ts`, package assembler/validator, maintained configs. | Implemented. Manifest v4 remains unchanged and package validation is read-only. |
| `BEH-004` | Complete package baseline plus optional valid host override becomes the only executable launch input. | `application-platform/launch-configuration/**`; orchestration/engine protocol bridge; backend SDK `buildEffective*RunLaunch`; maintained business services; Studio runtime-scoped model-selection editors. | Implemented. Invalid overrides do not fall back; sparse Studio model overrides use the inherited package/effective runtime while persisting a blank runtime delta. |
| `BEH-005` | Preserve explicit Studio/standalone compositions and separate process health from application-run readiness. | `create-application-orchestration-authorities.ts`, `application-definition-runtime-readiness.ts`, standalone start boundary. | Implemented. Process preparation still precedes host-capability checks; launch readiness is a separate projection. |
| `BEH-006` | Native build/validate/dev/start must reject incomplete standalone packages and use real hosts. | Devkit config, pack, pure standalone package validator, standalone session, start; maintained app commands and regenerated packages. | Implemented. Portable token-count tuning validates; actual token credential and endpoint fields remain rejected. |
| `BEH-007` | Existing storage rows remain directly usable; invalid rows remain visible until explicit reset. | `application-launch-override-store.ts`, launch authority, REST DELETE, Studio setup panel/slot/team editors. | Implemented with no schema/migration. Structured stale member identities render and the raw invalid draft is not rewritten before explicit replacement/reset. |
| `BEH-008` | Exact graph-local package team instruction reaches final member prompt. | `create-application-run-authorities.ts`; mixed factory/manager/registries/handle; `member-team-context-builder.ts`; provider prompt composers. | Implemented. Focused distinct-authority probe confirmed the package instruction in the final AutoByteus member system prompt. |

## Key Files Or Areas

- Contracts: `autobyteus-application-sdk-contracts/src/{execution-resources,manifests,index}.ts`
- Backend SDK: `autobyteus-application-backend-sdk/src/{launch-profile,index}.ts`
- Launch authority: `autobyteus-server-ts/src/application-platform/launch-configuration/**`, including the corrected portable secret/endpoint policy in `application-standalone-package-validator.ts`
- Graph/runtime wiring: `autobyteus-server-ts/src/application-platform/runtime/{create-application-orchestration-authorities,create-application-run-authorities,application-definition-runtime-readiness,application-runtime-definition-validator}.ts`
- Store and REST: `autobyteus-server-ts/src/application-orchestration/stores/application-launch-override-store.ts`; `src/api/rest/{application-execution-resources,application-route-error}.ts`
- Engine/backend bridge: `autobyteus-server-ts/src/application-{engine,orchestration}/**`
- Prompt authority: `autobyteus-server-ts/src/agent-team-execution/backends/mixed/**`; `src/agent-team-execution/services/member-team-context-builder.ts`
- Devkit: `autobyteus-application-devkit/src/{config,commands,package,development}` plus starter template
- Studio UI: `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue`; `components/applications/setup/{ApplicationExecutionResourceSlotEditor,ApplicationAgentLaunchProfileEditor,ApplicationTeamLaunchProfileEditor,ApplicationTeamMemberOverrideItem}.vue`; `composables/useRuntimeScopedModelSelection.ts`; `utils/{teamLaunchReadinessCore,application/applicationLaunchProfile,application/applicationSetupGate}.ts`; localized messages
- Maintained applications: `applications/{brief-studio,socratic-math-teacher}` source definitions, manifests/config, backend services/schema, and regenerated importable packages

## Important Assumptions

- The current runtime/model catalogs are the host authorities. A host that cannot list exact Luna or authenticate Codex is correctly non-runnable; implementation does not infer entitlement or silently substitute Sol.
- `standalone.enabled` describes a project packaging promise only and is deliberately absent from application manifest v4.
- Current stored selection/profile JSON rows map directly to the saved host override model; invalid current rows remain data, not migration failures.
- General non-application team composition may construct its own process-catalog member-context builder at its factory boundary. The application graph always supplies its exact builder through the full mixed path.

## Known Risks

- Real Luna entitlement/authentication and live provider execution are host/environment facts and require downstream API/E2E validation on an authenticated machine.
- Focused frontend self-checks mounted the real agent, slot, and team editors, exercised blank-runtime Codex inheritance, structured stale diagnosis, locked raw topology, readiness, and explicit replacement. A complete live Studio stack and browser viewport/accessibility sweep remain downstream.
- Existing API/E2E-owned tests and reports in the shared worktree predate the SR-005 contract and remain intentionally uncommitted. They must be updated and rerun by `api_e2e_engineer`, not treated as current passing evidence.
- The API/E2E-owned `ApplicationTeamLaunchProfileEditor.spec.ts` still asserts automatic stale-topology repair. Per `CRR-011` stage ownership it was preserved unchanged; it is not correctness evidence and must be replaced after source review passes.
- Full repository web typecheck remains globally red on unrelated existing application/store/test/dependency diagnostics. No IR-007 changed production file appeared in the typecheck output; the application setup matches were the known stale durable test fixture diagnostics.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement`
- Reviewed root-cause classification: `Boundary Or Ownership Issue` plus `Missing Invariant`
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A` after `SR-005` / `ARCH-REV-005` supplied the corrected design
- Evidence / notes: the implementation preserves the already-passed coordinator/compositions, replaces split launch policy with one authoritative package/override/effective/readiness owner, and removes the mixed member-handle authority bypass. It does not add a standalone setup subsystem, package-specific branch, or parallel readiness family.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in production scope: `No`; the obsolete API/E2E-owned stale-topology assertion remains intentionally unmodified for downstream replacement
- Dead/obsolete production code, obsolete files, unused helpers/flags/adapters, and dormant replaced paths removed in scope: `Yes`; durable test cleanup remains API/E2E-owned
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`
- Notes: old configured/effective/status contracts, service/normalizer names, business resource/model rescues, null-profile SDK builders, and configuration route semantics were cleanly replaced. IR-007 adds no compatibility path or fallback. Its largest changed production file is the team editor at `418` effective non-empty lines; every changed source implementation file remains below `500`.

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: `design-spec.md` — “Persisted Data / State Transition Decision” and DS-012 invalid-override semantics
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: the physical per-application platform table and columns remain unchanged; current resource-ref/profile/default JSON is read in place; valid rows overlay the package baseline; invalid selection/topology rows remain persisted and blocking; explicit DELETE removes only the selected row; no package-default row is written.
- Migration implementation: `N/A`
- Deviation: `None`

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis`
- Branch: `codex/universal-application-framework-proposal-analysis`
- Current implementation local-fix source commit: `3c38ca7e6f4d32e281b6af07e8bf046ef7cc253a`
- SR-005 implementation source baseline: `f86ea03c138ea08f500a2acd839b096eb1a29cc9`
- Reviewed base commit `6caf809303294252c109420b238588f0c68aca6a` remains in history. Delivery owns refresh/integration against the latest tracked base.
- API/E2E-owned modified/untracked tests, reports, and evidence were preserved exactly; no API/E2E durable test was authored or committed by implementation.

## Local Implementation Checks Run

- `pnpm exec tsc -p tsconfig.build.json --noEmit` and `pnpm build` in `autobyteus-server-ts` after IR-007 — Pass, including shared builds, Prisma generation, managed assets, built-in-agent bootstrap smoke, and sanitized built-module/bootstrap smoke.
- Disposable real-package portable configuration probe against the built validator — Pass: `max_tokens: 128`, `token_limit: 4096`, and `safety_margin_tokens: 256` validated on both Brief leaves; nested `api_token` credential and `endpoint` were rejected. Temporary package data was removed.
- Disposable Nuxt agent/slot/team rendered probes — Pass, 4/4: blank persisted runtime loaded the inherited `codex_app_server` catalog and Luna option; team defaults and both member editors inherited Codex/Luna with readiness true and no draft write; stale topology rendered route/member/old-agent/current-agent details, kept readiness false, and emitted no automatic draft repair; explicit resource replacement created an empty current draft, while the explicit same-team topology action retained exact current member overrides and replaced stale identities. Temporary probes were removed.
- `pnpm guard:web-boundary`, `pnpm guard:localization-boundary`, and `pnpm audit:localization-literals` after IR-007 — Pass with zero unresolved findings.
- `pnpm exec nuxi typecheck` after IR-007 — Global repository failure on pre-existing diagnostics. No IR-007 production path emitted a diagnostic; changed-area matches were limited to the known stale API/E2E-owned `ApplicationTeamLaunchProfileEditor.spec.ts` fixture.
- `git diff --check` and effective source-size audit after IR-007 — Pass; changed production files range from `105` to `418` effective non-empty lines.
- `pnpm -C autobyteus-application-sdk-contracts build` — Pass.
- `pnpm -C autobyteus-application-backend-sdk build` — Pass.
- `pnpm -C autobyteus-application-devkit build` — Pass; generated untracked devkit `dist/` was removed afterward.
- IR-006 `pnpm build` in `autobyteus-server-ts` — Pass, including shared builds, Prisma generation, TypeScript build, managed assets, built-in-agent bootstrap smoke, and sanitized built-module/bootstrap smoke.
- `pnpm build && pnpm validate && pnpm typecheck:backend` in `applications/brief-studio` — Pass. Real package validation traversed the bundled team and exact Luna leaf defaults.
- Same command set in `applications/socratic-math-teacher` — Pass.
- Disposable focused launch/prompt probe against built server modules — Pass: package baseline, valid override, guarded launch, explicit reset, both AR-007 invalidation cases with no read writes/fallback, exact Luna/model/auth classification, Codex acquire/account-read/release ordering, nested precedence, atomic `llmConfig`, final graph-local team instruction, and maintained defaults. Probe removed after execution.
- Disposable Nuxt component render/interaction probe — Pass: invalid host override, package baseline and saved state, absent effective state, separate cancel and package-reset controls, responsive authority-summary classes, DELETE reset, and resulting runnable/ABSENT/effective display. Probe removed after execution.
- `pnpm guard:web-boundary`, `pnpm guard:localization-boundary`, `pnpm audit:localization-literals` in `autobyteus-web` — Pass; zero localization audit findings.
- `pnpm exec nuxi typecheck` in `autobyteus-web` — Global repository failure on numerous pre-existing unrelated diagnostics. Changed production setup files emitted no diagnostics; only the existing API/E2E-owned/stale `ApplicationTeamLaunchProfileEditor.spec.ts` fixture matched changed-area names.
- Generated-package/source guards — Pass: exact Luna defaults and `requireRunnable` are present; forbidden configured-status/resource/model rescue symbols are absent from application production source.
- `git diff --check` and changed-source size guard — Pass.

## Frontend Rendered-Result Check

- Affected surfaces / journeys: Studio launch setup for a model-only override that inherits package runtime, and diagnosis/replacement/reset of a stale saved team topology.
- Approved references: `REQ-007`, `UC-020`, `UC-023`, `AC-015`, `AC-016`, `BEH-004`, `BEH-007`, and DS-012 Studio steps 2, 4–7.
- Existing design system and adjacent surfaces reviewed: current Tailwind warning/status cards, application authority summary, runtime/model selectors, agent/team/member profile editors, localized message catalogs, and separate cancel versus package-reset actions.
- Rendered surface used: real `ApplicationAgentLaunchProfileEditor`, `ApplicationExecutionResourceSlotEditor`, and `ApplicationTeamLaunchProfileEditor` mounted with the project Nuxt Vitest renderer. Only generic searchable-select/workspace/member leaf widgets and stores were narrowly stubbed to provide deterministic catalogs/current topology.
- States/interactions inspected: blank runtime field with inherited Codex baseline; Luna catalog visibility; blank override retained without draft emission; team-default and per-member Codex/Luna inheritance/readiness; `HOST_OVERRIDE / SAVED_MEMBER_TOPOLOGY_STALE`; changed and missing member rows with old/current agent IDs; disabled stale profile editing; blocked readiness; no automatic repair/sanitization; and explicit resource selection producing a replacement draft.
- Visual or interaction issues found and corrected: the prior single generic warning was expanded into a scan-friendly structured diagnosis list, and the stale editor now explains why launch values are locked while offering an explicit current-topology replacement, alternate resource selection, and outer package Reset. Inherited runtime is presentation/readiness context only and never populates the sparse persisted field.
- Supporting evidence and remaining limitations: disposable rendered probes passed 4/4 and were removed. No implementation-stage full live Studio/browser stack was started; responsive pixel inspection, keyboard/focus/accessibility traversal, live model selection/save, iframe entry, and DELETE reset remain for independent API/E2E.

## Downstream Coverage Hints / Suggested Scenarios

1. Add durable positive package validation for `max_tokens`, `token_limit`, and `safety_margin_tokens`, plus negative actual token credential/secret/endpoint cases.
2. Add rendered Studio coverage for agent, team-default, and team-member model-only overrides: runtime stays blank in the PUT payload while the Codex package/effective runtime supplies catalog selection and readiness.
3. Replace the obsolete automatic-repair test with the two exact AR-007 cases: delete a saved shared team and change saved member topology. Assert baseline/raw row preservation, structured route/member/agent details, no read-time draft/store rewrite, disabled stale editing, null effective configuration, blocked launch/save, explicit replacement PUT, then DELETE Reset.
4. Retain durable service-level cases for package-only nested precedence/provenance and atomic `llmConfig`; valid host slot/member overlay; exact Luna catalog success; Sol-only catalog failure; credential failure; and aggregate three-state invariants.
5. Add a direct distinct-catalog mixed runtime test covering root/nested/persistent/task/restored member handles and final prompt output, not only builder construction.
6. Rerun the previously failing clean Brief standalone real team journey first with a fresh data root and no configuration row. Confirm exact Luna baseline reaches both members, binding/provider/events/notifications/artifacts complete, and package digests remain unchanged.
7. Rerun real Studio package-default, valid alternate override, unavailable saved resource, stale topology, reset, entry/remount, and real team execution; confirm the setup surface never rescues a non-runnable result.
8. Execute the full maintained starter/Brief/Socratic `build`, `validate`, `dev`, `dev:studio`, and build-free `start` matrix, including missing runtime/model/auth negative startup and graceful cleanup.
9. Reconfirm all earlier graph isolation, static/SPA/origin, worker recovery, event-pipeline/vault/Prisma cleanup, repeated watch/reload, and dual-host digest scenarios after the launch-authority refactor.

## API / E2E / Executable Coverage Investigation And Execution Still Required

The API/E2E engineer must update/validate durable coverage, execute the realistic repository and two-host scenarios, score confidence, and report residual risks. The implementation-scoped builds and disposable probes above are not API/E2E sign-off.
