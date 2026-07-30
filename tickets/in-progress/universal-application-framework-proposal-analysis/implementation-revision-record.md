# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record is a concise chronological index of completed implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer; `design-review-report.md`; architecture round 3 | `N/A` | `Initial Baseline` | `SR-003`, `ARCH-REV-003`; `CRR/API-REV/DR: N/A` | `Ready for source review` |
| IR-002 | Code reviewer; `code-review-report.md`; `CRR-001` | `CR-001`, `CR-002` | `Local Fix` | `SR-003`, `ARCH-REV-003`, `CRR-001`; `API-REV/DR: N/A` | `Ready for source re-review` |
| IR-003 | Code reviewer; `code-review-report.md`; `CRR-003` / `API-REV-001` | `CR-003`, `APIE2E-F001` | `Local Fix` | `SR-003`, `ARCH-REV-003`, `CRR-003`, `API-REV-001`; `DR: N/A` | `Ready for source re-review` |
| IR-004 | Code reviewer; `code-review-report.md`; `CRR-005` / `API-REV-002` | `CR-004`, `APIE2E-STUDIO-001`, `APIE2E-F002` | `Local Fix` | `SR-003`, `ARCH-REV-003`, `CRR-005`, `API-REV-002`; `DR: N/A` | `Ready for source re-review` |
| IR-005 | Code reviewer; `code-review-report.md`; `CRR-007` / `API-REV-003` | `CR-005`, `APIE2E-BRIEF-002`, `APIE2E-F003` | `Local Fix` | `SR-003`, `ARCH-REV-003`, `CRR-007`, `API-REV-003`; `DR: N/A` | `Ready for source re-review` |
| IR-006 | Architecture reviewer; `design-review-report.md`; `ARCH-REV-005`, after `CRR-010` / `API-REV-004` | `CR-006`, `CR-007`, `CR-008`, `APIE2E-BRIEF-003`, `APIE2E-F004`, `AR-007` | `Design Impact` | `SR-005`, `ARCH-REV-005`, `CRR-010`, `API-REV-004`; `DR: N/A` | `Ready for source re-review` |
| IR-007 | Code reviewer; `code-review-report.md`; `CRR-011` | `CR-009`, `CR-010`, `CR-011` | `Local Fix` | `SR-005`, `ARCH-REV-005`, `CRR-011`, `API-REV-004`; `DR: N/A` | `Ready for source re-review` |
| IR-008 | Architecture reviewer; `design-review-report.md`; `ARCH-REV-006`, after `CRR-012` | `CR-009`, `CR-012` | `Design Impact` | `SR-006`, `ARCH-REV-006`, `CRR-012`, `API-REV-004`; `DR: N/A` | `Ready for source re-review` |
| IR-009 | Code reviewer; `code-review-report.md`; `CRR-013` | `CR-009` | `Local Fix` | `SR-006`, `ARCH-REV-006`, `CRR-013`, `API-REV-004`; `DR: N/A` | `Ready for source re-review` |
| IR-010 | Solution designer; `solution-revision-record.md`; `SR-009` after corrective `CRR-016` / `API-REV-005` | `CR-013`, `APIE2E-F005`, `APIE2E-STANDALONE-MCP-001` | `Local Fix` | `SR-009`, `ARCH-REV-006`, `CRR-016`, `API-REV-005`; `DR: N/A` | `Ready for source re-review` |

## Revision Entries

### IR-001 — Universal application dual-host implementation baseline

- Triggering role, report path, and round: architecture reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`; architecture round 3.
- Triggering finding IDs: `N/A`
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: `Ready for source review`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: records the first complete implementation of the architecture-approved universal application dual-host foundation and its source-review handoff.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-007`; `REQ-001`–`REQ-006`; `AC-001`–`AC-013`; `DS-001`–`DS-010`.
- Implementation delta: introduced host-neutral startup/bootstrap contracts and providers; explicit Studio/standalone compositions and graph-local application authorities; reusable readiness/recovery/cleanup lifecycle; standalone selection/static/bootstrap/ingress/process host; real devkit development and build-free start commands; maintained-app mappings/package regeneration; and clean removal of hosted-only, mock, custom-builder, generated-mirror, and compatibility-noise paths.
- Changed files or areas: `autobyteus-application-{sdk-contracts,frontend-sdk,devkit}`; `autobyteus-server-ts/src/{application-platform,compositions,standalone-application-host,api}`; `autobyteus-web/components/applications`; `applications/{brief-studio,socratic-math-teacher}`; directly affected docs and lockfile.
- Local validation and result: code commit `247795f5f4fd9fda2e45347b7a9680b4c385e0a7`; all builds/typechecks and 6 contract, 12 frontend SDK, 16 devkit, 85 focused server, and 9 focused Studio tests passed; both maintained packages built/validated/typechecked; two-round live standalone, origin/static/SPA/restart, direct SIGTERM, and rendered Brief checks passed. Six assertions in two stale implicit-registrar REST unit files remain for downstream existing-test validity/test maintenance.
- Next recipient or routing: `code_reviewer` for implementation-source and structural review.
- Remaining limitations or risks: live Studio development, durable dual-host digest conformance, real team execution, worker recovery, graph isolation, broader cleanup/leak coverage, and durable stale-test changes remain downstream; see canonical `implementation-handoff.md`.

### IR-002 — Deterministic development reload and current project-state refresh

- Triggering role, report path, and round: code reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; source-review round `CRR-001`.
- Triggering finding IDs: `CR-001`, `CR-002`
- Classification: `Local Fix`
- Prior authoritative result: `Ready for source review` (`IR-001`); triggering source-review result `Fail — Local Fix` (`CRR-001`).
- Current authoritative result: `Ready for source re-review`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: the first source review confirmed the architecture and broader implementation but found two bounded DS-006/AC-011 lifecycle defects: no deterministic full reload of the active standalone document and frozen watcher/session state after supported config or manifest edits.
- Approved behavior or requirement IDs affected: `BEH-006`; `UC-015`; `REQ-006`; `AC-011`; `DS-006`.
- Implementation delta: replaced the stateless OS launcher with a retained Playwright-controlled Chrome/Edge page that explicitly reloads after a successful same-host restart and navigates that same page when the effective host URL changes; added current project-state resolution; made the project watcher retain manifest/config paths and replace configured source subscriptions after successful rebuilds; made standalone reread current manifest/config port values; and made Studio reread current output/manifest values, reimport the local package to refresh catalog state, then resolve and reload the current canonical application.
- Changed files or areas: `autobyteus-application-devkit/src/development/{application-development-project-state,application-project-watch,development-browser-session,standalone-development-session,studio-development-session,studio-application-client}.ts`; `src/{commands/dev,config/load-application-devkit-config,package/package-assembler}.ts`; devkit focused tests; devkit dependency metadata and `pnpm-lock.yaml`; removed `src/development/open-development-browser.ts`.
- Local validation and result: source commit `0762cd7e37122e0c6c4e5d4ed463a28c9030d38f`; devkit build/test passed 19/19; focused real filesystem watcher/config/manifest and Studio selection scenarios passed; a real system-Chrome headless smoke observed root navigation before and after same-port server replacement through the retained browser session; Brief Studio and Socratic package build/validate passed; diff and source-size checks passed.
- Next recipient or routing: `code_reviewer` for implementation-source and structural re-review.
- Remaining limitations or risks: API/E2E still owns full application-folder command execution, repeated live edit/reload behavior, live Studio connection/remount, graph isolation, package immutability, worker recovery, and cleanup/leak evidence. Existing stale REST test validity remains API/E2E-owned after source review passes.

### IR-003 — Reuse and refresh registered Studio packages on repeated edits

- Triggering role, report path, and round: code reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; focused failure-origin review `CRR-003`, triggered by API/E2E round `API-REV-001`.
- Triggering finding IDs: `CR-003`, `APIE2E-007`, `APIE2E-F001`
- Classification: `Local Fix`
- Prior authoritative result: `Ready for source re-review` (`IR-002`); source review subsequently passed in `CRR-002`, then API/E2E produced `Fail / 89%` (`API-REV-001`) and focused review classified `Fail — Local Fix` (`CRR-003`).
- Current authoritative result: `Ready for source re-review`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-003` (`CRR-002` is the superseded source-pass entry)
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: real repeated Brief `dev:studio` edits proved that IR-002 unconditionally re-imported a root already registered during the initial development build. The server correctly rejected the second registration before identity selection or backend reload.
- Approved behavior or requirement IDs affected: `BEH-006`; `UC-015`; `AC-011`; `DS-006`.
- Implementation delta: `StudioApplicationClient.ensureLocalPackage()` now resolves the package root before deciding registration. An absent root uses the existing import mutation once. An existing root uses the new `reloadApplicationPackage` Studio mutation, which delegates to the existing `ApplicationPackageRegistryService.reloadPackage()` cache/catalog refresh owner without changing root uniqueness. Only after import or refresh does the devkit resolve the current manifest-local/canonical application identity; `StudioDevelopmentSession` then invokes the existing backend reload/re-entry endpoint.
- Changed files or areas: `autobyteus-application-devkit/src/development/studio-application-client.ts`; `autobyteus-server-ts/src/api/graphql/types/application-packages.ts`; canonical `implementation-handoff.md` and this revision record. API/E2E-owned uncommitted tests, reports, and evidence were preserved exactly and are not part of the implementation source commit.
- Local validation and result: source commit `b0eaa5f8aa9bce49be61a916349e04eb5c2eb28f`; devkit build and server TypeScript no-emit check passed; existing application-package service tests passed 13/13; a disposable ordering probe passed initial import and two existing-root refresh generations with current renamed identities and backend reload after selection, with no repeated import. The shared-worktree devkit suite is 18/19 because the preserved API/E2E-owned regression mock does not yet model the new package-reload mutation; its extension and rerun remain API/E2E-owned.
- Next recipient or routing: `code_reviewer` for implementation-source and structural re-review; after Pass, return to `api_e2e_engineer` for the full rerun and durable-test update.
- Remaining limitations or risks: no implementation-stage live Studio environment was started for this local fix. The full repeated-edit live proof, Studio remount, remaining command matrix, dual-host parity/digests, and proportional review of API/E2E durable changes remain pending. The preserved API/E2E-owned Studio regression must be extended to assert package reload/current identity/backend reload ordering during rerun.

### IR-004 — Align Studio GraphQL with composition-owned definition authorities

- Triggering role, report path, and round: code reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; focused failure-origin review `CRR-005`, triggered by API/E2E round `API-REV-002`.
- Triggering finding IDs: `CR-004`, `APIE2E-STUDIO-001`, `APIE2E-F002`
- Classification: `Local Fix`
- Prior authoritative result: `Ready for source re-review` (`IR-003`); source review passed in `CRR-004`, then `API-REV-002` confirmed `CR-003` resolved but produced `Fail / 88%` on the Studio definition gate, and `CRR-005` classified the new failure `Fail — Local Fix`.
- Current authoritative result: `Ready for source re-review`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-005` (`CRR-004` is the superseded source-pass entry)
- Related API/E2E revision IDs: `API-REV-002`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: the real imported Brief application graph refreshed and reported its exact package-owned team `READY`, while Studio's setup GraphQL resolver read a process-global team catalog that omitted it. The setup editor therefore disabled entry and created no iframe despite the composition-owned catalog being correct.
- Approved behavior or requirement IDs affected: `BEH-001`, `BEH-004`, `BEH-006`; `UC-002`, `UC-003`, `UC-009`, `UC-015`; `AC-003`, `AC-005`, `AC-006`, `AC-011`; `DS-001`, `DS-004`, `DS-009`, P9.
- Implementation delta: extended `StudioApplicationApiAuthorities` with the exact `AgentDefinitionService` and `AgentTeamDefinitionService` returned by `createApplicationDefinitionServices`; `buildStudioServerComposition` now configures GraphQL with those same instances; and every agent/team definition GraphQL read, refresh, create, update, and delete operation uses the configured authority getters. The team refresh sequence still refreshes agent definitions before team definitions. No process-global fallback, catalog merge, duplicate definition registration, or compatibility path was added.
- Changed files or areas: `autobyteus-server-ts/src/api/graphql/studio-application-api-authorities.ts`; `src/api/graphql/types/{agent-definition,agent-team-definition}.ts`; `src/compositions/build-studio-server-composition.ts`; canonical `implementation-handoff.md` and this revision record. API/E2E-owned uncommitted tests, reports, and evidence were preserved and are not part of the implementation source commit.
- Local validation and result: source commit `b14dee08fecf42beb8cb5eb78cccea3f149215ee`; server TypeScript no-emit check passed; singleton guard found no agent/team definition singleton lookup in the two resolvers; a disposable authority probe confirmed exact service identity, coherent agent/team list reads, agent refresh, and agent-before-team refresh ordering. Owned-source diff/commit and file-size guards passed. The existing three-test refresh-boundary file is 1/3 until API/E2E replaces its two singleton spies with configured-authority coverage; schema exposure remains passing.
- Next recipient or routing: `code_reviewer` for implementation-source and structural re-review; after Pass, return to `api_e2e_engineer` to adjust durable boundary coverage and rerun `APIE2E-STUDIO-001` first.
- Remaining limitations or risks: no implementation-stage Studio live stack was started for this bounded fix. API/E2E must prove the exact bundled team is present through GraphQL, the setup gate enables entry, the iframe mounts/remounts, and the real in-Studio Brief team journey proceeds before resuming parity/digest and remaining command coverage.

### IR-005 — Keep application run identity allocation graph-local

- Triggering role, report path, and round: code reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; focused failure-origin review `CRR-007`, triggered by API/E2E round `API-REV-003`.
- Triggering finding IDs: `CR-005`, `APIE2E-BRIEF-002`, `APIE2E-F003`
- Classification: `Local Fix`
- Prior authoritative result: `Ready for source re-review` (`IR-004`); source review passed in `CRR-006`, then `API-REV-003` confirmed `CR-004` resolved but produced `Fail / 88%` when the real Brief team member allocator could not load the package-owned `researcher`; `CRR-007` classified that failure `Fail — Local Fix`.
- Current authoritative result: `Ready for source re-review`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-007` (`CRR-006` is the superseded source-pass entry)
- Related API/E2E revision IDs: `API-REV-003`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: the supported real Brief `Generate draft` path reached `TeamRunService`, but its default `AgentRunIdentityAllocator` selected process-global definition and collision authorities instead of the exact application graph. Allocation failed before provider invocation, binding/run creation, or artifact publication.
- Approved behavior or requirement IDs affected: `BEH-004`, `BEH-006`; `UC-009`; `AC-005`, `AC-006`; `DS-003`, `DS-004`.
- Implementation delta: `createApplicationRunAuthorities()` now constructs one application-graph `AgentRunIdentityAllocator` with the exact graph-local `AgentDefinitionService`, `AgentRunManager`, `AgentRunMetadataService`, `TeamRunMetadataService`, and memory root. It injects that allocator into `TeamRunService` and `AgentRunService`, so application agent and team-member identities share one reservation/uniqueness authority and neither application launch path falls back to process-global collaborators. The same graph-local agent metadata service now also feeds the agent run service and published-artifact projection. No bundled-ID special case, catalog merge, compatibility branch, or weakened collision check was added.
- Changed files or areas: `autobyteus-server-ts/src/application-platform/runtime/create-application-run-authorities.ts`; canonical `implementation-handoff.md` and this revision record. API/E2E-owned uncommitted durable tests, reports, and evidence were preserved exactly and are not part of the implementation source commit.
- Local validation and result: source commit `feb5e7a3efc284fd4eeef75dc42875a2b621eee6`; server build-config TypeScript no-emit passed; existing allocator, launch-assignment, and team-run-service unit selection passed 3 files / 16 tests; and a disposable direct non-fake allocator probe passed 1/1. The probe verified the exact definition service, active-run manager, agent/team metadata collision services, shared agent/team allocator identity, shared agent metadata projection authority, and successful package-owned `Researcher` ID allocation. The disposable probe was removed after execution; diff and 101-effective-line source-size guards passed.
- Next recipient or routing: `code_reviewer` for implementation-source and structural re-review; after Pass, return to `api_e2e_engineer` to add the direct non-fake allocator regression and rerun `APIE2E-BRIEF-002` first.
- Remaining limitations or risks: no implementation-stage Studio/live provider environment was started for this bounded backend wiring fix. API/E2E must prove binding/run creation, provider invocation, successful Brief artifact publication, then complete both-host parity/digests and the remaining maintained-application command matrix.

### IR-006 — Make package launch configuration portable and authoritative

- Triggering role, report path, and round: architecture reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`; architecture round 5 / `ARCH-REV-005`, following the `CRR-010` design-impact classification and `API-REV-004`.
- Triggering finding IDs: `CR-006`, `CR-007`, `CR-008`, `APIE2E-BRIEF-003`, `APIE2E-F004`, and architecture correction `AR-007`
- Classification: `Design Impact`
- Prior authoritative result: `Ready for source re-review` (`IR-005`); source review passed in `CRR-008`, API/E2E then produced `Fail / 89%` (`API-REV-004`), `CRR-009`/`CRR-010` routed the configuration/readiness/prompt gaps as design impact, and `SR-005` passed in `ARCH-REV-005`.
- Current authoritative result: `Ready for source re-review`
- Related solution revision IDs: `SR-005`
- Related architecture-review revision IDs: `ARCH-REV-005`
- Related code-review revision IDs: `CRR-010` (`CRR-009` is the original design-impact review; `CRR-008` is the superseded pre-impact source pass)
- Related API/E2E revision IDs: `API-REV-004`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: the real fresh-root standalone Brief journey proved that a bundled resource selection was incorrectly considered ready without a complete model profile, and a fresh source review also found final mixed-team prompt construction selecting the process-global definition catalog. The reviewed correction requires complete portable package defaults, one truthful launch/readiness authority, invalid saved-row preservation without fallback, and exact graph-local prompt context.
- Approved behavior or requirement IDs affected: `BEH-003`–`BEH-008`; `REQ-003`–`REQ-008`; `AC-005`, `AC-006`, `AC-011`–`AC-017`; `DS-003`–`DS-007`, `DS-010`–`DS-013`; `UC-004`, `UC-009`, `UC-018`–`UC-023`.
- Implementation delta: added source-only standalone project capability metadata and pure package validation; set Brief researcher/writer and Socratic tutor to exact `codex_app_server` / `gpt-5.6-luna`; replaced ambiguous configured-profile/status contracts with package baseline, saved host override/state, effective per-leaf configuration/provenance, scoped issues, and the exact three-state readiness union; refactored the configuration service/store/normalizer into one `ApplicationLaunchConfigurationService` boundary plus focused baseline/overlay/host/credential adapters; preserved invalid resource/topology rows without read-time writes or fallback; added explicit REST/UI reset; made lifecycle, standalone, Studio, worker context, backend SDK, and business services consume that authority; removed all business model/resource/null-profile rescue; and propagated one exact `MemberTeamContextBuilder` through mixed root/nested/persistent/task/restored construction to final prompts.
- Changed files or areas: `autobyteus-application-sdk-contracts`; `autobyteus-application-backend-sdk`; `autobyteus-application-devkit` source/template; `autobyteus-server-ts/src/application-platform/launch-configuration`; application runtime/orchestration/engine/REST and mixed-team paths; `autobyteus-web` application setup components/utilities/localization; Brief/Socratic source definitions, schemas/services/configs, and regenerated importable packages.
- Local validation and result: implementation source commit `f86ea03c138ea08f500a2acd839b096eb1a29cc9`; SDK-contract, backend-SDK, devkit, and full server builds passed; Brief and Socratic real project build/validate/backend-typecheck passed; focused disposable launch/prompt probe passed both AR-007 cases, exact Luna/model/auth behavior, Codex client ordering, nested precedence, atomic `llmConfig`, reset, and final distinct-catalog prompt semantics; disposable Nuxt renderer probe passed invalid-state display and separate cancel/DELETE reset interaction; web boundary/localization guards passed; generated-output/obsolete-symbol/diff/source-size guards passed. Full web typecheck remains globally red on unrelated existing diagnostics, with no changed production-file diagnostic.
- Next recipient or routing: `code_reviewer` for complete implementation-source and structural re-review. After Pass, route through `api_e2e_engineer` for durable contract/test updates and a full API/E2E rerun.
- Remaining limitations or risks: implementation did not run a live authenticated Luna team or full Studio browser stack. API/E2E must first re-run the clean standalone Brief real-team failure path, then validate package/default/valid override/invalid shared resource/stale topology/reset, direct prompt semantics across reconstruction paths, both-host real execution and digests, maintained command matrix, host-negative cases, worker recovery, and cleanup. API/E2E-owned uncommitted tests/reports/evidence were preserved and were not changed or committed by implementation.

### IR-007 — Correct portable tuning and Studio sparse/stale override presentation

- Triggering role, report path, and round: code reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; source-review round `CRR-011`.
- Triggering finding IDs: `CR-009`, `CR-010`, `CR-011`
- Classification: `Local Fix`
- Prior authoritative result: `Ready for source re-review` (`IR-006`); triggering source-review result `Fail — Local Fix` (`CRR-011`, `89/100`).
- Current authoritative result: `Ready for source re-review`
- Related solution revision IDs: `SR-005`
- Related architecture-review revision IDs: `ARCH-REV-005`
- Related code-review revision IDs: `CRR-011`
- Related API/E2E revision IDs: `API-REV-004` (retained downstream context; no new API/E2E round triggered this source review)
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: the SR-005 source review found three bounded mismatches at existing package-validation and Studio presentation boundaries: accepted AutoByteus token-count tuning was caught by a credential substring heuristic; a blank sparse runtime selected the global AutoByteus catalog instead of the inherited package/effective runtime; and the Studio team editor silently repaired/dropped a preserved stale topology instead of presenting its structured identities until explicit replacement/reset.
- Approved behavior or requirement IDs affected: `BEH-004`, `BEH-006`, `BEH-007`; `REQ-007`; `UC-019`, `UC-020`, `UC-023`; `AC-014`, `AC-015`, `AC-016`; DS-011 rule 6 and DS-012 Studio steps 2, 4–7.
- Implementation delta: replaced the generic token substring heuristic with an explicit credential/secret/API-key/endpoint/base-URL/workspace plus credential-token policy that accepts `max_tokens`, `token_limit`, and `safety_margin_tokens`; added inherited runtime input to runtime-scoped model selection without changing normalized stored runtime; passed applicable package/effective leaf profiles through agent, team-default, and team-member editors/readiness; rendered every structured stale member route/name/old/current agent identity; preserved and locked the raw invalid team draft against sanitization/repair; forwarded child readiness; and reset a launch draft only after the user explicitly selects a replacement resource. No secret fallback, package mutation, server-contract weakening, catalog merge, or compatibility branch was added.
- Changed files or areas: `autobyteus-server-ts/src/application-platform/launch-configuration/application-standalone-package-validator.ts`; `autobyteus-web/composables/useRuntimeScopedModelSelection.ts`; `utils/teamLaunchReadinessCore.ts`; application setup agent/slot/team/member editors; English and Simplified Chinese application messages.
- Local validation and result: source commit `3c38ca7e6f4d32e281b6af07e8bf046ef7cc253a`; server build-config no-emit and full build passed; a disposable real Brief package probe accepted all three token-count tuning fields and rejected nested `api_token`/`endpoint`; disposable Nuxt rendered probes passed 4/4 for agent/team/member Codex/Luna inheritance, blank persisted runtime/no draft write, structured stale details, blocked readiness, no automatic repair, explicit alternate-resource replacement, and explicit current-topology replacement with exact-match override retention; web boundary/localization guards passed; diff and source-size guards passed. Full web typecheck remains globally red on pre-existing diagnostics with no IR-007 production-file diagnostic.
- Next recipient or routing: `code_reviewer` for implementation-source and structural re-review. After Pass, route through `api_e2e_engineer` to replace the obsolete stale test, add portable/sparse override coverage, and execute the full API/E2E rerun.
- Remaining limitations or risks: the implementation stage did not run a live Studio stack, save a real sparse override, invoke DELETE reset, or execute authenticated Luna. The API/E2E-owned stale topology test still asserts obsolete automatic repair and was preserved unchanged exactly as `CRR-011` instructed; it is not passing evidence and must be replaced downstream. All other API/E2E-owned dirty tests, reports, and evidence remain preserved.

### IR-008 — Add selected-resource previews and recursive portable package policy

- Triggering role, report path, and round: architecture reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`; architecture round 6 / `ARCH-REV-006`, following the `CRR-012` design-impact classification.
- Triggering finding IDs: `CR-009` (remaining recursive policy gap), `CR-012`
- Classification: `Design Impact`
- Prior authoritative result: `Ready for source re-review` (`IR-007`); triggering source review superseded `CRR-011` with `Fail — Design Impact` (`CRR-012`, `88/100`), then `SR-006` passed architecture review as `ARCH-REV-006`.
- Current authoritative result: `Ready for source re-review`
- Related solution revision IDs: `SR-006`
- Related architecture-review revision IDs: `ARCH-REV-006`
- Related code-review revision IDs: `CRR-012`
- Related API/E2E revision IDs: `API-REV-004` (retained downstream context; no new API/E2E round triggered this design revision)
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: IR-007 correctly fixed the maintained manifest-selected sparse case but exposed no authoritative pre-overlay baseline for a newly selected alternate resource, leaving Studio to infer edit context from package or effective state. The package policy also still needed schema-aware recursive rejection of reachable nested secret/endpoint/host-local semantics without rejecting portable token counts and pricing.
- Approved behavior or requirement IDs affected: `BEH-004`, `BEH-006`, `BEH-007`; `REQ-004`, `REQ-007`; `UC-019`, `UC-020`; `AC-005`, `AC-006`, `AC-014`–`AC-016`; `DS-011`, `DS-012`.
- Implementation delta: cleanly renamed the graph-local traversal owner to `ApplicationLaunchResourceBaselineBuilder`; added distinct selected-resource baselines to stored views; added a closed no-write selection preview and narrow Studio POST route; made GET, preview, and PUT use the same builder; made PUT re-resolve current resource/topology before writing; added an exact-identity Studio preview coordinator with stale-response discard and save gating; removed package/effective inheritance heuristics and UI definition traversal; preserved sparse field clearing and per-member mixed-runtime inheritance; and replaced the distributed keyword validator with one recursive schema-aware portable policy plus typed schemas. No preview/baseline persistence, migration, global fallback, catalog merge, compatibility alias, or parallel readiness path was added.
- Changed files or areas: `autobyteus-application-sdk-contracts/src/execution-resources.ts` and generated declarations; `autobyteus-server-ts/src/application-platform/launch-configuration/**`; orchestration/REST wiring; `autobyteus-web` application setup panel/editors, preview/presentation composables, runtime/model selection, launch-profile/readiness utilities, adjacent nullable consumers, and localization.
- Local validation and result: source commit `25ad035ca126e789a9c233cf858d48ea3b41ea50`; contracts build, server build-config TypeScript no-emit, full server build, web boundary/localization guards, Brief validation after devkit build, diff/obsolete-symbol/source-size guards all passed. Disposable probes passed server semantics 2/2, rendered mixed-runtime editing 1/1, stale preview coordination 1/1, sparse field clearing 1/1, and positive/negative copied real-package portable cases. Full web typecheck remains globally red on existing diagnostics; the changed-area filter found no IR-008 production-source diagnostic.
- Next recipient or routing: `code_reviewer` for complete implementation-source and structural re-review. After Pass, route through `api_e2e_engineer` for durable contract/test reconciliation and the full API/E2E rerun.
- Remaining limitations or risks: implementation did not start the full live Studio stack, execute authenticated Luna, or create a real network preview/PUT race. API/E2E must replace obsolete no-context auto-repair coverage, add direct baseline/preview/policy/race coverage, validate the full Studio edit/save/clear/reset flow, and resume prompt/provider/events/artifacts, parity/digests, command, recovery, and cleanup scenarios. All API/E2E-owned dirty tests, reports, and evidence remain preserved.

### IR-009 — Reject endpoint and credential semantic aliases in portable package data

- Triggering role, report path, and round: code reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; source-review round `CRR-013`.
- Triggering finding IDs: `CR-009`
- Classification: `Local Fix`
- Prior authoritative result: `Ready for source re-review` (`IR-008`); triggering source-review result `Fail — Local Fix` (`CRR-013`, `93/100`). `CR-012` passed and remains resolved.
- Current authoritative result: `Ready for source re-review`
- Related solution revision IDs: `SR-006`
- Related architecture-review revision IDs: `ARCH-REV-006`
- Related code-review revision IDs: `CRR-013`
- Related API/E2E revision IDs: `API-REV-004` (retained downstream context; no new API/E2E round triggered this source review)
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: CRR-013 confirmed the selected-resource architecture and all other SR-006 behavior but proved that supported AutoByteus `extra_params` could still admit clear host endpoint/credential aliases such as `server_url`, `api_url`, `connection_string`, and `access_key` through documented package validation.
- Approved behavior or requirement IDs affected: `BEH-006`; `REQ-006`, `REQ-007`; `UC-019`; `AC-014`; `DS-011`.
- Implementation delta: extended the existing recursive semantic classifier to reject URL/URI fields, connection strings/DSNs, qualified endpoint addresses, access/account/client/subscription-key aliases, and authentication aliases. Existing endpoint/base/API-base/host, credential/secret/password/authorization/bearer/token-value/workspace/path rules remain. Exact token-count exceptions and typed pricing schemas are unchanged. No new policy family, runtime/app special case, fallback, compatibility path, contract, persistence, or migration change was added.
- Changed files or areas: `autobyteus-server-ts/src/application-platform/launch-configuration/application-portable-launch-config-policy.ts` only.
- Local validation and result: source commit `957b928b131d6953ffc5ace7000e1f954db90fdd`; server build-config TypeScript no-emit and full build passed. A disposable direct built-policy probe rejected eight endpoint/credential/auth alias forms recursively at exact paths without values while accepting token counts, typed pricing, and harmless nested parameters. A disposable copied real Brief package probe accepted the positive AutoByteus profile and rejected independent `server_url`, `api_url`, `connection_string`, and `access_key` packages through the real validator boundary. Temporary packages were removed; diff, ownership, file-size, and staging checks passed.
- Next recipient or routing: `code_reviewer` for focused implementation-source re-review. After Pass, normal routing may resume to `api_e2e_engineer` for durable test reconciliation and the full API/E2E rerun.
- Remaining limitations or risks: implementation-scoped probes are disposable and do not replace durable API/E2E coverage. API/E2E must add the alias matrix while preserving exact token-count/pricing positives, then complete the retained selected-baseline/preview/sparse/mixed-runtime and live dual-host scenarios. All API/E2E-owned dirty tests, reports, and evidence remain preserved.

### IR-010 — Mount the existing Agent Tools MCP route in standalone

- Triggering role, report path, and round: solution designer; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`; authoritative `SR-009`, following corrective focused review `CRR-016` and API/E2E round `API-REV-005`.
- Triggering finding IDs: `CR-013`, `APIE2E-F005`, `APIE2E-STANDALONE-MCP-001`
- Classification: `Local Fix`
- Prior authoritative result: `Ready for source re-review` (`IR-009`); source review passed in `CRR-014`, then `API-REV-005` reached the advertised run-scoped Agent Tools URL in standalone and received the generic/static `404`. `CRR-016` superseded the withdrawn `CRR-015` design-impact classification and identified the missing existing registrar call as the only source defect.
- Current authoritative result: `Ready for source re-review`
- Related solution revision IDs: `SR-009` (`SR-007` withdrawn; `SR-008` is the bounded correction basis)
- Related architecture-review revision IDs: `ARCH-REV-006` (`ARCH-REV-007` withdrawn with no decision)
- Related code-review revision IDs: `CRR-016` (`CRR-015` superseded; `CRR-014` prior source pass)
- Related API/E2E revision IDs: `API-REV-005`
- Related delivery revision IDs: `N/A`
- Why this implementation revision is recorded: Studio already mounted the established run-scoped Agent Tools MCP registrar, while standalone advertised the same session URL but installed only selected-app ingress and its static wildcard. The supported standalone request therefore never reached the existing bearer/session gate.
- Approved behavior or requirement IDs affected: `BEH-004`–`BEH-006`; `REQ-004`, `REQ-005`, `REQ-007`; `AC-003`, `AC-005`, `AC-006`, `AC-009`, `AC-010`, `AC-014`–`AC-016`; `DS-014`.
- Implementation delta: imported and awaited the existing `registerAgentToolsMcpRoutes(app)` in `buildStandaloneApplicationServerComposition()` after the current plugin/browser-ingress registration and before `registerStandaloneApplicationStaticRoutes()`. The registrar, session/catalog/dispatcher/adapters, auth, base-URL, cleanup, Studio composition, external gateway boundary, and all application launch/edit/prompt behavior remain unchanged. No runtime-internal tooling or application-owned MCP declaration/provisioning source was added or modified.
- Changed files or areas: `autobyteus-server-ts/src/compositions/build-standalone-application-server-composition.ts`; canonical `implementation-handoff.md`; this revision record. API/E2E-owned dirty tests/reports/evidence were preserved and are not part of the implementation commits.
- Local validation and result: source commit `e8e06afddcbc56ad57584a3289b562cf3ddda351`; server build-config TypeScript no-emit passed; the unchanged standalone composition integration file passed 2/2 and proved unauthenticated standalone Agent Tools ingress now returns the established `401 unauthorized`; the unchanged Agent Tools route integration suite passed 11/11 and preserved unknown/wrong/revoked `404 session_unavailable`; an inline route-inventory probe confirmed the internal mount precedes static fallback and no external gateway is registered; diff, source-size, and staging guards passed.
- Next recipient or routing: `code_reviewer` for implementation-source and structural re-review. After Pass, return through `api_e2e_engineer` for the corrected durable expectation and rerun of `APIE2E-STANDALONE-MCP-001` / `APIE2E-F005`.
- Remaining limitations or risks: implementation checks do not replace a real standalone runtime callback and artifact/handoff completion rerun. Application-owned MCP declarations/provisioning and runtime-internal tooling are explicitly outside this ticket. The secondary `APIE2E-REPO-005` remains separately `Unclear` and must not broaden this fix without verified origin.
