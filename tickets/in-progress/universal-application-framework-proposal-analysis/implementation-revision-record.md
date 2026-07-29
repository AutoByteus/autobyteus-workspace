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
