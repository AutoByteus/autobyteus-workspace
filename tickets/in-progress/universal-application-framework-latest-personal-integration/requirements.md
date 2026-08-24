# Requirements — Universal Application Framework Latest-Personal Integration

## Status

Design-ready `SR-008` revision for the mandatory Personal v1.4.57 refresh. The integrated and DR-007-verified ticket checkpoint `95c63b5a982ba90ccbb8c6345af66a9485fa5a78` remains protected and already contains the approved SR-007 provider, physical-scope, migration, and dual-host implementation through Personal `52b4be02ea793f2071fe5a63a94664ab25196433`. The user requires this same ticket branch to incorporate current `origin/personal@389748b0b9f0dea051aaed18641de131cf0adbbb` (`v1.4.57`), four commits later. A fresh non-mutating preview finds exactly two content conflicts and two changed-both paths, both durable Vue form tests; the Personal production workspace-selection change auto-merges. No actual merge or production edit has started. SR-008 defines the exact combined controlled-workspace and provider-granular test/verification contract. Implementation and Electron rebuild remain paused until this revision passes architecture review.

## Goal / Problem Statement

Refresh the DR-007-verified Universal Application Framework checkpoint from integrated Personal base `52b4be02e...` to current `origin/personal@389748b0b...`. Preserve the proven Studio/standalone, provider/model, physical-scope/migration, graph-local execution, scoped Agent Tools, publication/projection, package-parity, and cleanup behavior while adopting Personal's controlled `WorkspaceSelectionState` for Agent and Team launch forms. Resolve the two test conflicts by retaining both the complete workspace relay and the provider-granular callable store fixture. Do not select either test side wholesale, restore retired partial workspace events, weaken provider snapshot/discovery coverage, introduce a new production owner, or add a migration for transient frontend state.

## Current And Desired Behavior

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | The DR-007 checkpoint contains the proven dual-host foundation and Personal through `52b4be02e...`, but it is four commits behind current Personal v1.4.57. | The same ticket branch history incorporates `origin/personal@389748b0b...` once and remains the verification branch; `personal` itself is untouched by this ticket. | The protected checkpoint and source branches remain recoverable and are not rewritten. | REQ-001, REQ-002; AC-001, AC-002, AC-026 |
| BEH-002 | The finalized feature provides `pnpm dev`, `dev:studio`, `build`, `validate`, and `start`; latest Personal applications still use custom package builders and mirrored/generated trees. | Retain the native application developer workflow and one canonical source tree, adapted to current Personal package contracts. | A package built once remains importable in Studio and runnable as standalone. | REQ-003; AC-003, AC-004 |
| BEH-003 | DR-007 already combines Personal's current agent/team lifecycle and rooted identity with application-scoped execution/publication, messaging, cleanup, and projection. | Preserve that exact combined execution authority while applying v1.4.57 workspace changes only. | No global/process fallback may replace an application-scoped dependency. Native provider tools and the external Studio MCP gateway remain outside the application transport change. | REQ-004, REQ-005; AC-005–AC-008 |
| BEH-004 | DR-007 already has self-contained Codex/Luna package defaults, sparse Studio overrides, host readiness, and current AutoByteus model/provider validation in the retained launch/readiness/direct-run boundaries. | Preserve this launch model unchanged through v1.4.57. | Studio overrides never mutate packages; no model alias, silent replacement, row rewrite, or package-default fallback is allowed. | REQ-005, REQ-008; AC-006, AC-009, AC-012 |
| BEH-005 | The physical-scope/provider refresh is integrated and verified. The current four-commit v1.4.57 refresh changes 95 paths but has only two changed-both paths and two conflicts, both Agent/Team form tests at the workspace/provider fixture junction. | Resolve both tests by current owner, accept Personal's controlled workspace production change, and retain the already-passed provider-granular form contract. | Do not reopen the passed platform architecture, alter provider owners, or select either conflicted test side wholesale. | REQ-002, REQ-006, REQ-010, REQ-011; AC-002, AC-026–AC-029 |
| BEH-006 | Checkpoint `95c63b5a...` has passed architecture, source, API/E2E, package, provider, dual-host, and Electron verification on v1.4.56; Personal v1.4.57 separately proves controlled workspace selection. Neither proves their combined tree. | Re-run the focused workspace/provider component contract, retained architecture/provider/dual-host checks, package parity, and Electron. | Prior evidence is characterization only, not proof of the refreshed commit. | REQ-007–REQ-011; AC-011, AC-025–AC-029 |
| BEH-007 | New Personal preserves original redacted-safe provider messages and native safe metadata, while the verified application stream still emits a generic local message and has an exact closed v6 identity/field contract. | Accept the latest native error path and project only the original safe nonblank message through the application ERROR variant; preserve exact `agentRunId`/`memberAddress`/URL semantics and reject provider metadata at the application SDK boundary. | Diagnostic filtering and strict exclusion of raw errors, secrets, stacks, headers, provider IDs, and extra fields remain unchanged. | REQ-008; AC-013, AC-015 |
| BEH-008 | DR-007 already combines graph-local run/session/memory services, atomic prepared activation, immutable containing-TeamRun physical scope, exact cleanup, and the shared startup migration for old flat nested Agent memory. | Preserve that implemented behavior unchanged through v1.4.57. | Direct-root and standalone Agent memory remain unchanged; no runtime dual read, global fallback, package-specific branch, DB schema change, or second migration runner is introduced. | REQ-004, REQ-005, REQ-009; AC-005, AC-008, AC-016–AC-020 |
| BEH-009 | DR-007 already implements Personal's split credentials/catalogs, network-free static rows, provider-granularity discovery, exact identifier/endpoint post-check, fresh exact per-leaf model lookup, credential-authority equivalence, and settled `ERROR`/`STALE_ERROR` Studio snapshots. | Preserve that provider/model behavior unchanged while composing it with v1.4.57 workspace form state. | Codex/Claude ownership, package/saved values, package bytes, provider persistence, application business behavior, and host boundaries stay unchanged; no endpoint-local application lifecycle, application-local catalog, all-provider readiness gate, compatibility API, or hidden fallback is added. | REQ-005, REQ-008, REQ-010; AC-006, AC-009, AC-012, AC-021–AC-025 |
| BEH-010 | Personal v1.4.57 replaces split workspace selector state/events with one controlled `WorkspaceSelectionState`; the integrated ticket form tests instead carry the current provider-granular callable store fixture. | Agent/Team forms relay complete workspace state without a local copy while preserving callable runtime provider rows, provider snapshots, and settled dynamic-provider discovery. Explicit New mode/path survives unrelated edits and delayed workspace discovery; launch registers that path before delegating. | Provider/model selection, existing workspace registry/history rows, standalone hosting, application packages, and cumulative migrations remain unchanged. | REQ-007, REQ-010, REQ-011; AC-026–AC-029 |

## Investigation Findings

- The protected checkpoint is `95c63b5a...`; `origin/personal@389748b0b...` is four commits beyond integrated base `52b4be02e...`. The delta changes 95 paths (`81` add, `14` modify). A fresh non-mutating merge-tree preview produces exactly two content conflicts and two changed-both paths and leaves the index clean.
- The prior v1.4.56 integration from `a23849f...` through `c5b87df4d...` had five conflicts, ten overlaps, and 2,194 paths; it is now implemented and verified at DR-007. Its evidence remains historical characterization, not the current conflict set.
- Personal production/runtime semantics remain pinned by `3ab4946c7...`: the six later commits change only 1,934 files under isolated `ui-prototypes/autobyteus-web-prototype` and eight ticket/delivery-record paths (`1,938` adds, `4` modifications total). They do not change root `pnpm-workspace.yaml`, shared production/runtime source, or the five-conflict/ten-overlap result. The prototype stays outside the root workspace and is accepted as non-overlapping Personal-owned content, not as another application implementation.
- `TeamRunPhysicalScope` is the latest-Personal domain authority: root scope is `{rootTeamRunId, ancestorTeamRunIds: []}` and each child TeamRun appends its own `teamRunId`; `TeamRunContext` validates that its containing TeamRun matches the scope.
- Application construction already passes one graph-local `AgentRunManager`, `AgentToolMcpSessionManager`, `AgentMemoryLocationService`, member-context builder, and workspace family recursively through `MixedTeamRunBackendFactory`. The production conflict is therefore one local combination: retain those injected dependencies and exact `revokeAgentToolMcpSessionsForRun`, but derive memory through `{...teamContext.physicalScope, agentRunId}`.
- The new required `TeamAgentMemoryLayoutAppDataMigration` runs in the existing shared app-data migration phase, after TeamRun V1 and before working-context snapshot migrations. It moves only affected nested AgentRun directories by whole-directory rename, validates the result, records warnings/failures, and does not teach runtime code to read both layouts.
- Persisted-data outcomes are domain-specific: launch overrides remain `Directly Usable — No Migration`; affected old flat nested Team Agent memory is `Migration Required`; fresh/current/direct-root/standalone Agent memory needs no transformation.
- The physical-scope overlaps remain semantically compatible: execution-tree location adopts physical scope while retaining stored-only manager construction; MCP cleanup and termination tests add physical-scope fixtures while preserving exact scoped cleanup assertions. The mixed-task E2E additionally combines lifecycle-owned tool readiness with Personal's new catalog snapshot query.
- The prior SR-004 refresh had 11 conflicts and 13 changed-both paths; it is now integrated and verified. Its current-model and provider-error decisions remain authoritative historical context, not pending current work.
- Personal v1.4.56 deletes old aggregate/cached provider and media owners, makes static catalog reads network-free, and introduces provider-owned dynamic lifecycle plus `ModelAvailabilityService`. A selected identifier resolves to a provider ID; the provider ensure may enumerate all configured hosts and, for AutoByteus, all supported model kinds before the service checks exact identifier/endpoint registration.
- Personal now exposes credentials separately from `ProviderModelCatalogSnapshot`. `ApplicationProviderCredentialReadinessAdapter` must replace deleted `listProviderSettings` use with the network-free exact credential setting and map serving runtime to credential owner; model `provider_id` remains creator identity for gateway/local models.
- Personal's web store publishes runtime/provider snapshots and ensures missing dynamic providers asynchronously with `Promise.allSettled`. Normal provider failures become source-level `ERROR`/`STALE_ERROR` state while the aggregate action fulfills. The shared application composable must re-read rows/status after settlement while retaining inherited runtime and explicit no-default-null behavior.
- The current two conflicts are `AgentRunConfigForm.spec.ts` and `TeamRunConfigForm.spec.ts`. They must combine Personal's controlled workspace prop/event/relay contract with the ticket's callable provider-selection rows, provider snapshots, and settled dynamic-provider fixture. The exact dispositions are in `latest-base-refresh-round-4-design-analysis.md`.
- Personal's `WorkspaceSelectionState`, `WorkspaceSelector`, Agent/Team forms, and `RunConfigPanel` auto-merge cleanly. The governing panel owns transient state and registration-before-launch; provider/runtime model state remains owned by `RuntimeModelConfigFields`, `useRuntimeScopedModelSelection`, and the provider store.
- Latest Personal has not independently absorbed the feature: its tree lacks the explicit Studio and standalone builders, the four-projection application platform boundary, the standalone host, and maintained application devkit configuration.
- Rebase or selective replay would rewrite/fragment the already-verified integration. One additional semantic merge of the current Personal advance is the least risky and most auditable strategy.
- Personal remains authoritative for current workspace/provider/agent/team behavior; the verified ticket remains authoritative for the same-package/two-host boundary. The v1.4.57 delta requires only a two-test semantic combination and broad proof, not another structural application-framework adaptation.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `integration-strategy-analysis.md` | Intended integration strategy and semantic authority matrix | REQ-001–REQ-007 | AC-001–AC-011 | Design-ready; approved by the user's delegated technical-direction instruction | Constrains how the merge may be resolved and verified. |
| `integration-runtime-contracts.md` | Exact lifecycle, activation/provisioning, construction, launch persistence, and verification contract | REQ-004–REQ-007 | AC-005–AC-011 | Design-ready; within the approved preserved-behavior boundary | Closes the bounded architecture-review precision gaps without adding product scope. |
| `latest-base-refresh-design-analysis.md` | Exact 32-commit refresh authority, conflict, current-model, provider-error, inventory, and verification design | REQ-001–REQ-008 | AC-001–AC-015 | Implemented and verified; retained historical authority | Defines how the previously integrated Personal behavior entered current owners without reopening the passed platform architecture. |
| `latest-base-refresh-round-2-design-analysis.md` | Exact five-commit physical-scope, memory migration, conflict/overlap, data transition, and verification design | REQ-001–REQ-009 | AC-001–AC-020 | Implemented and verified in DR-007 | Historical physical-scope/migration authority preserved by SR-008. |
| `latest-base-refresh-round-3-design-analysis.md` | Exact v1.4.56 provider/catalog/model/credential/UI integration, five-conflict/ten-overlap map, data decision, file inventory, and verification design | REQ-001–REQ-010 | AC-001–AC-025 | Implemented and verified in DR-007 | Historical authority for the integrated physical-scope/provider state preserved by SR-008. |
| `latest-base-refresh-round-4-design-analysis.md` | Exact v1.4.57 controlled-workspace/provider-form intersection, two-conflict map, data decision, inventory, and proof design | REQ-001–REQ-002, REQ-007, REQ-010–REQ-011 | AC-001–AC-002, AC-026–AC-029 | Design-ready SR-008 supplement; pending architecture review | Current normative refresh delta; adds no production application-framework owner. |
| `merge-conflict-inventory.txt` | Evidence: exact no-commit conflict set | REQ-002, REQ-006 | AC-002, AC-010 | Complete; approval N/A | Supports conflict classification. |
| `branch-overlap-inventory.txt` | Evidence: changed-both path inventory | REQ-002, REQ-006 | AC-002, AC-010 | Complete; approval N/A | Prevents reliance on conflict markers alone. |
| `integration-path-inventory.txt` | Evidence: add/modify/remove/regenerate candidate inventory | REQ-003–REQ-007 | AC-003–AC-011 | Complete; approval N/A | Drives detailed implementation and review inventory. |
| `merge-attempt.log` | Evidence: isolated merge transcript | REQ-002 | AC-002 | Complete; approval N/A | Proves the measured conflict surface. |
| `latest-base-refresh-conflict-report.md` | Delivery blocker and original 31-commit refresh measurement | REQ-001–REQ-002, REQ-006–REQ-008 | AC-001–AC-002, AC-010–AC-015 | Complete delivery evidence; approval N/A | Triggers SR-004 and records why delivery stopped before merge/build. |
| `evidence/delivery/dr-004-base-refresh-and-integration.log` | Raw fetch/ref/path/merge-tree evidence from delivery | REQ-001–REQ-002, REQ-006 | AC-001–AC-002, AC-010 | Complete delivery evidence; approval N/A | Grounds the original refresh measurement; solution-design revalidation extends it to current `7edfb1625...`. |
| `latest-base-refresh-round-2-conflict-report.md` | DR-006 delivery blocker for the five-commit nested physical-scope refresh | REQ-001–REQ-002, REQ-006–REQ-009 | AC-001–AC-002, AC-016–AC-020 | Complete delivery evidence; approval N/A | Triggers SR-005 and records why delivery stopped before merge/build. |
| `evidence/delivery/dr-006-base-refresh-and-integration.log` | Raw fetch/path/migration/merge-tree evidence for DR-006 | REQ-001–REQ-002, REQ-006, REQ-009 | AC-001–AC-002, AC-016 | Complete delivery evidence; approval N/A | Grounds the five-commit, three-conflict, six-overlap measurement. |
| `evidence/solution/latest-base-refresh-round-3-merge-preview.log` | Solution-owned historical v1.4.56 immutable-ref/count/non-mutating merge preview | REQ-001–REQ-002, REQ-006, REQ-010 | AC-016, AC-021 | Complete evidence; approval N/A | Grounds the implemented SR-007 ref, divergence, five conflicts, clean index, and protected checkpoint. |
| `evidence/solution/latest-base-refresh-round-3-conflict-inventory.txt` | Exact five-path content-conflict inventory | REQ-002, REQ-006, REQ-010 | AC-002, AC-021 | Complete evidence; approval N/A | Drives semantic conflict resolution. |
| `evidence/solution/latest-base-refresh-round-3-overlap-inventory.txt` | Exact ten-path changed-both inventory | REQ-002, REQ-006, REQ-010 | AC-002, AC-021 | Complete evidence; approval N/A | Prevents reliance on conflict markers alone. |
| `evidence/solution/latest-base-refresh-round-3-path-inventory.txt` | Full 2,194-path previous-target-to-current-Personal inventory | REQ-002, REQ-006, REQ-010 | AC-009–AC-011, AC-021–AC-025 | Complete evidence; approval N/A | Proves provider deletions/additions, isolated prototype additions, and the bounded application source-review set. |
| `latest-base-refresh-round-4-conflict-report.md` | DR-008 delivery blocker for the v1.4.57 controlled-workspace refresh | REQ-001–REQ-002, REQ-007, REQ-011 | AC-001–AC-002, AC-026–AC-029 | Complete delivery evidence; approval N/A | Triggers SR-008 and records why delivery stopped before merge/build. |
| `evidence/delivery/dr-008-base-refresh-and-integration.log` | Delivery fetch/ref/path/merge-tree evidence for DR-008 | REQ-001–REQ-002, REQ-007, REQ-011 | AC-001–AC-002, AC-026 | Complete delivery evidence; approval N/A | Grounds the four-commit, two-conflict/two-overlap measurement. |
| `evidence/solution/latest-base-refresh-round-4-{merge-preview.log,conflict-inventory.txt,overlap-inventory.txt,path-inventory.txt}` | Solution-owned current ref/count/merge/path evidence | REQ-001–REQ-002, REQ-007, REQ-011 | AC-001–AC-002, AC-026–AC-029 | Complete evidence; approval N/A | Independently confirms the stable v1.4.57 target and exact bounded surface. |

## Design Health Assessment

- Change posture: `Refactor` and integration of a previously completed `Larger Requirement`.
- Initial design issue signal: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue` in integration coverage; both production owners are healthy.
- Refactor posture: `No production refactor`; bounded two-test semantic resolution plus integrated verification.
- Evidence basis: selecting Personal's test side wholesale drops the current provider snapshot fixture; selecting the ticket side restores retired partial workspace events. The production tree itself auto-merges and keeps workspace and provider concerns separate.
- Requirement or scope impact: adopt approved latest-Personal controlled workspace behavior while preserving implemented provider/dual-host behavior. Do not add a coordinator, compatibility events, provider duplication, new persistence, or migration.

## Recommendations

1. Keep the dedicated verified ticket branch and merge v1.4.57 once without rewriting history.
2. Accept Personal's controlled workspace production owner and resolve both form tests by composition, not side selection.
3. Preserve the current provider-granular callable store fixtures and all previously verified application boundaries.
4. Run the focused workspace/provider suites, real Studio New-workspace journey, retained dual-host/package parity, and Electron rebuild before finalization.

## Scope Classification

`Large` overall ticket; **small bounded Design Impact refresh** for SR-008 — four Personal commits, 95 changed paths dominated by completed-ticket evidence, two content conflicts/two changed-both paths limited to durable Vue form tests, no production conflict, no new production owner, and mandatory integrated verification.

## Scope Guardrail

### In-Scope Use Cases

- **UC-001:** Create an integration branch/worktree from the latest tracked Personal ref and merge the finalized feature history once.
- **UC-002:** Resolve canonical source, contract, application, server, web, SDK/devkit, and durable-test overlaps semantically.
- **UC-003:** Develop, validate, build, start standalone, and import/run the same maintained package in Studio.
- **UC-004:** Launch current agent/team resources from an application using package defaults or a valid Studio override.
- **UC-005:** Use application-scoped Agent Tools, team messaging, artifact publication, projection, recovery, and cleanup in both hosts.
- **UC-006:** Regenerate disposable outputs and prove package/source parity.
- **UC-007:** Verify current Personal behavior, dual-host behavior, and Electron packaging on the integrated candidate.
- **UC-008:** Preserve the already-integrated SR-004 semantic resolution of its 11 conflicts and marker-free overlaps while applying the current five-conflict/ten-overlap refresh; do not regress the retained current-model, provider-error, identity, or contract outcomes.
- **UC-009:** Evaluate current and removed AutoByteus model selections through package/saved/direct agent and team paths without affecting Codex/Claude ownership or mutating stored/package values.
- **UC-010:** Propagate a safe provider failure through native transports and the message-only application agent/team stream while retaining v6 identity and strict field exclusion.
- **UC-011:** Run a nested configured team, task agent, or task team from application business behavior and retain exact containing-TeamRun memory placement plus graph-local session cleanup.
- **UC-012:** Start Studio or standalone on a fresh, directly upgraded, or skip-version data root; execute and record the registered nested Team Agent memory-layout migration during the existing pre-application migration phase, preserving the current startup warning/failure policy and evidence.
- **UC-013:** Preserve the SR-005 nested physical-scope/migration decisions while refreshing the DR-005 checkpoint to current Personal; resolve the current member/memory overlaps semantically and re-prove nested history/restart behavior without weakening the dual-host baseline.
- **UC-014:** Evaluate one or more static/canonical-dynamic AutoByteus leaves from a package default, saved sparse override, Save, or direct launch. Each dynamic identifier delegates to Personal's owning-provider discovery and each leaf receives a fresh exact post-ensure `ModelInfo`; distinguish removed static selection, unavailable dynamic source/model, and missing credential before upsert, allocation, or provider execution, including two leaves backed by distinct dynamic providers.
- **UC-015:** Edit an application agent/team launch profile in Studio using an explicit or inherited runtime; show current static/cached model rows immediately, ensure missing dynamic providers in the background, await settled per-provider attempts, re-read the same runtime rows/source statuses, and retain stale rows with Personal's safe `ERROR`/`STALE_ERROR` status when discovery fails.
- **UC-016:** In Studio, select a New workspace path for an Agent or Team draft, perform unrelated runtime/model/member edits and allow delayed workspace/provider discovery to settle, then launch exactly in the still-visible New workspace; preserve the path and launch nothing when registration fails.

### Out of Scope

- Merging or pushing the result into `personal`, releasing, deploying, tagging, or deleting either source branch.
- Rewriting the feature branch through rebase.
- A repository-wide redesign of agent/team execution, providers, MCP, or application manifests.
- Authentication/user support, a shared external Studio MCP gateway for standalone, or alteration of native Codex/Claude tools.
- Compatibility aliases/wrappers for source seams removed on either branch.
- Hand-maintaining generated package output as an independent source of truth.

### Preserved Behavior Boundary

BEH-001–BEH-010 govern. The integrated branch must preserve latest Personal semantics except where the approved dual-host behavior explicitly extends them; Studio and standalone differ in hosting/ingress, not in application business behavior.

### Review Authority

- Every blocking Design Impact or implementation correction must cite an approved BEH, REQ, or AC ID.
- New product behavior, migration, security, or operational policy is a Requirement Gap and requires user approval.
- Technical possibility or aesthetic preference alone is non-blocking.
- Reviewer comments do not silently amend this requirements basis.

## Functional Requirements

- **REQ-001 — Latest-base isolation:** The authoritative work remains on the dedicated ticket branch and protected checkpoint; it must incorporate fetched `origin/personal@389748b0b...` once without rewriting or directly modifying `personal` or the finalized feature history.
- **REQ-002 — History-preserving semantic integration:** Preserve the completed feature integration history, merge the newly fetched Personal ref once, and resolve every current conflict and changed-both path by behavior and ownership, never by wholesale `ours`/`theirs` selection.
- **REQ-003 — Dual-host developer experience:** The maintained Brief and Socratic packages retain devkit-owned `dev`, `dev:studio`, `build`, `validate`, and `start`, one canonical source tree, and build-once Studio/standalone use.
- **REQ-004 — Current Personal execution authority:** Retain current Personal agent/team provisioning and preparation, claim-before-await activation, private candidates, metadata-before-publication, provider-identity validation, quarantine, rooted-member identity, event publication, exact teardown, provider availability, migration gates, and current package contract values.
- **REQ-005 — Dual-host application authority:** Retain explicit Studio and standalone assembly roots, narrow application-platform projections, one awaited required-tool readiness owner, package-owned launch defaults, sparse non-mutating overrides, host readiness, scoped Agent Tools session/publication, application communication, projection, recovery, and ordered stop.
- **REQ-006 — Clean source transition:** Remove obsolete mirrored/custom-builder/old-owner paths; regenerate derived outputs from the integrated canonical source; do not add compatibility wrappers or global fallbacks.
- **REQ-007 — Integrated proof:** Validate architecture boundaries and omission cases, compile/build affected workspaces, run focused and broad regressions, exercise real Brief/Socratic flows in both hosts, prove package parity, and rebuild/test Electron.
- **REQ-008 — Latest provider/model behavior on current boundaries:** Preserve newest Personal's exact AutoByteus current-model rejection, external-runtime ownership, original redacted-safe provider message, and native error metadata. Implement application current-model validation through the retained launch/readiness/direct-run owners, preserve stale values without rewrite or fallback, and keep the focused application-agent ERROR contract message-only with exact v6 identity and strict metadata/secret exclusion.
- **REQ-009 — Nested TeamRun physical scope and persisted memory:** Adopt current Personal `TeamRunPhysicalScope` and nested history/navigation behavior across configured members, task agents, task teams, restore, and memory sync. Preserve the exact application graph-local run/session/memory dependency family, atomic prepared activation/platform binding, and scoped cleanup. Register the current Team Agent memory-layout migration in the existing required startup migration chain for both hosts; do not add runtime dual reads, global fallbacks, or a second migration runner.
- **REQ-010 — Current Personal provider/catalog integration:** Preserve Personal v1.4.56's network-free provider descriptors/static catalogs, split credential and model-snapshot contracts, provider-granularity dynamic discovery lifecycle, exact identifier/endpoint post-check, current model/media factory ownership, GraphQL/Pinia contracts, settled per-provider source states, and deleted-owner cleanup. Application readiness/Save/direct launch must delegate canonical dynamic identifiers to the process-owned provider ensure and perform a fresh exact model lookup for every leaf without runtime-only cache reuse across source mutation. Credential caching, if used, must be keyed only by the resolved credential authority. Studio model selection must combine current snapshots and `Promise.allSettled` missing-provider behavior with sparse inherited runtime; normal provider failure is read from snapshot source status, not aggregate rejection.
- **REQ-011 — Controlled Studio workspace selection:** Preserve Personal v1.4.57's one-owner `WorkspaceSelectionState`: `RunConfigPanel` owns transient mode/existing-ID/New-path state and register-before-launch sequencing; `WorkspaceSelector` renders/emits complete controlled values; Agent/Team forms relay without local copies. Explicit New state survives unrelated configuration edits and delayed discovery. The merged forms must simultaneously retain the current provider-granular callable selection/snapshot/settlement contract; no retired partial event, fallback launch, compatibility path, or migration is allowed.

## Acceptance Criteria

- **AC-001:** `git merge-base --is-ancestor 389748b0b9f0dea051aaed18641de131cf0adbbb HEAD` succeeds on the refreshed ticket branch; `origin/personal`, the protected checkpoint, and the finalized feature history have not been rewritten.
- **AC-002:** The v1.4.57 refresh merge preserves both histories, has no unresolved index entries or conflict markers, and records a semantic resolution for both conflicts and both changed-both paths. The already-integrated SR-007 conflict/overlap ledger remains preserved as historical evidence.
- **AC-003:** From each maintained application directory, `pnpm dev` starts standalone, `pnpm dev:studio` targets Studio, `pnpm build` creates the importable package, `pnpm validate` accepts it, and `pnpm start` runs the built standalone package.
- **AC-004:** One package build is byte/contract compatible with both the Studio import path and standalone selection path; canonical source is not duplicated into maintained editable mirrors.
- **AC-005:** Current Personal provisioning/preparation/activation/publication semantics remain authoritative: claims precede provider awaits, candidates remain private until durable metadata commits, provider identity is validated, indeterminate cleanup/commit is quarantined, rooted `memberAddress` identifies team placement, and old feature-era manager/member-registry identity paths are absent.
- **AC-006:** Brief and Socratic package defaults resolve to `codex_app_server` + `gpt-5.6-luna`; Studio sparse overrides/reset and current unavailable-model retention/blocking operate without mutating package bytes.
- **AC-007:** Before either host listens, one shared awaited owner registers the existing required Core, Browser, Task Delegation, Agent Communication, Published Artifact, Media, and provisioned Search tool units exactly once; both hosts then register the internal `/mcp/agent-tools/:sessionId` transport with application-scoped session/publication identity, while standalone does not expose Studio's external `/mcp/gateway`.
- **AC-008:** A real team run in each host performs recipient-name handoff, publishes artifacts, projects them into the application, survives the supported recovery/restart paths, and revokes/detaches resources exactly once on termination/stop.
- **AC-009:** Current Personal readable-provider migration/startup gating, model availability, serialized manifest/bundle/SDK contract values, event-await semantics, and user-facing warnings remain intact.
- **AC-010:** Generated/derived conflicts are resolved by removal and deterministic regeneration; obsolete custom builders, mirrored source directories, old runtime owners, and compatibility aliases are absent.
- **AC-011:** The final candidate passes git integrity checks, architecture-boundary tests, affected workspace builds/typechecks, focused server/web/devkit/application suites, both real host journeys, package parity, current Personal regression suites identified during overlap review, and Electron build/smoke verification.
- **AC-012:** A removed AutoByteus model already stored remains byte-for-byte visible and yields `HOST_REQUIREMENT_MISSING` with `CURRENT_MODEL_SELECTION_REQUIRED`; Save rejects before store upsert; direct agent/team launch rejects before run/team allocation; current AutoByteus and provider-owned Codex/Claude selections retain their existing owners and behavior.
- **AC-013:** A representative provider failure reaches native clients with latest Personal's safe message/metadata contract and reaches the application agent/team SDK as exactly `{ type: "ERROR", message }`; diagnostic filtering remains, and provider metadata, details, raw errors, stacks, credentials, provider IDs, and extra keys do not cross the application boundary.
- **AC-014:** The three retired application configuration paths and two generated SDK declaration paths remain absent; the current run-binding service has no import/reference to them; the SDK retains current launch/readiness types, unversioned iframe symbols, exact `agentRunId` URL codec, and the new issue code.
- **AC-015:** The refreshed candidate passes newest Personal catalog/pricing/missing-key/provider/native-error suites, focused current-model and application-error tests, retained architecture/source checks, both real Studio/standalone package journeys, package parity, recovery/cleanup, and a new Electron build/smoke verification.
- **AC-016:** The integrated candidate contains `origin/personal@c5b87df4d...`, has no merge state or conflict markers, and retains the approved combined physical-scope decision for `mixed-agent-member-handle.ts`, both coupled physical-scope tests, execution-tree lookup, MCP cleanup, and termination; the protected `a23849f...` checkpoint and delivery-owned evidence remain recoverable.
- **AC-017:** Root TeamRuns use an empty ancestor list; every configured or task child TeamRun appends that child `teamRunId` exactly once; every configured or task leaf Agent uses its containing TeamRun scope plus its own `agentRunId` through the injected graph-local `AgentMemoryLocationService`. `prepareNewAgentRun`, durable activation publication, platform binding, abort behavior, injected `AgentToolMcpSessionManager`, and `revokeAgentToolMcpSessionsForRun` remain unchanged in meaning.
- **AC-018:** Migration `20260823_repair_team_agent_memory_layout` is registered once after TeamRun V1 and before dependent working-context snapshot migrations. It migrates only affected nested flat AgentRun directories by validated whole-directory rename, no-ops for unmaterialized/current/direct-root cases, preserves both sides on conflict with an explicit warning, records failures without silent fallback, and never introduces runtime old/new path branching.
- **AC-019:** Current nested-team history restart hydration, memory sync, task-team/configured-member behavior, and settled historical-task navigation remain intact. Focused durable proof exercises nested configured and task-agent physical scope together with application injection/activation/cleanup invariants; no new maintained application package is required solely as a fixture.
- **AC-020:** The final `c5b87df4d...`-based candidate passes affected source builds, exact physical-scope/migration tests, nested restart/history/frontend suites, application architecture/source gates, real Studio and standalone Brief/Socratic journeys, package parity, cleanup/recovery, and a newly rebuilt Electron artifact/smoke check. The non-workspace prototype subtree matches Personal exactly and is not pulled into the root build graph.
- **AC-021:** The integrated candidate records all five conflict outcomes and all ten overlap outcomes from the SR-007 evidence. Personal-deleted aggregate/cached provider and media owners, old aggregate GraphQL/store fields, and `listProviderSettings` application calls remain absent; no compatibility alias restores them. The 1,934-file prototype subtree matches `c5b87df4d...`, root workspace membership is unchanged, and no production code imports from the prototype.
- **AC-022:** Static AutoByteus selections use network-free exact current membership. Each canonical dynamic custom/Ollama/LM Studio/AutoByteus identifier resolves to its owning provider, invokes Personal's provider-granularity ensure, and passes Personal's exact identifier/endpoint registration post-check; the validator then obtains a fresh exact-identifier `ModelInfo` for that leaf. The validator has no runtime-only model-list cache across leaves. A durable two-leaf/two-dynamic-provider case proves leaf B sees catalog mutation after leaf A and both resolve correctly. Removed static selections yield `CURRENT_MODEL_SELECTION_REQUIRED`; unavailable dynamic sources/models yield `MODEL_UNAVAILABLE`; reads retain exact values/provenance, Save rejects before upsert, and direct launch rejects before allocation. Codex/Claude do not enter AutoByteus discovery.
- **AC-023:** Application credential readiness uses Personal's network-free `getProviderCredentialSetting` and maps serving runtime exactly: API and OpenAI-compatible use `model.provider_id`, AutoByteus gateway uses `AUTOBYTEUS`, Ollama/LM Studio require no API key after host/model availability, and unknown runtimes fail closed. Codex account and Claude authentication checks remain unchanged; credential readiness performs no model discovery. Any cache key is supplied by the credential adapter's resolved authority: provider ID for provider credentials, workspace root for Codex, process identity for Claude, and serving runtime for no-credential local runtimes; creator identity and runtime-only model grouping cannot imply equivalence.
- **AC-024:** The merged runtime-scoped model composable preserves stored-runtime -> inherited-runtime -> optional-default precedence, makes no catalog call when the effective runtime is intentionally null, publishes `providersWithModelsForSelection(runtime)` immediately after the snapshot read, starts missing dynamic-provider discovery asynchronously, awaits its settled per-provider attempts, and then re-reads the same runtime rows/source statuses. Normal provider failure fulfills the aggregate action and remains represented by Personal's safe `ERROR`/`STALE_ERROR` source state with stale rows retained; an aggregate catch is defensive only.
- **AC-025:** The final current-Personal candidate passes Personal's provider-granularity catalog/model availability and exact endpoint tests; settled `ERROR`/`STALE_ERROR` Pinia/store/composable cases; a two-leaf/two-dynamic-provider fresh-resolution and credential-authority case; no-upsert/no-allocation failure ordering; credential/Qwen/Gemini/custom provider, media, GraphQL/Pinia, and UI suites; the complete SR-005 physical-scope/migration proof; all application architecture/source gates; both real hosts; package parity/recovery/cleanup; and a newly rebuilt Electron artifact/smoke check.
- **AC-026:** The final candidate contains `origin/personal@389748b0b9f0dea051aaed18641de131cf0adbbb`, records 2/2 conflict and 2/2 changed-both dispositions, has no merge state/markers, and preserves protected checkpoint `95c63b5a...` plus delivery-owned evidence.
- **AC-027:** `WorkspaceSelector` accepts one complete `WorkspaceSelectionState` and emits complete replacements; Agent/Team forms pass the exact value and relay `update:workspaceSelection` without local state. Retired `workspaceId`/`initialPath` and `select-existing`/`workspace-input-change` contracts are absent from this replaced seam.
- **AC-028:** An explicit New path survives unrelated Agent/Team runtime, model, member, and other config edits plus delayed workspace discovery. Accepted launch registers the trimmed path once through the bound `workspaceStore`, launches with the canonical workspace, and appears in current history; registration failure retains the displayed New/path and invokes no Agent/Team launch or stale Existing/Temp fallback. Existing persisted workspace/history data remains directly usable without migration.
- **AC-029:** Both conflicted form suites retain callable `providersWithModelsForSelection(runtimeKind)`, callable `providerSnapshots(runtimeKind)`, and async `ensureMissingDynamicProviders(runtimeKind)` while adding the complete workspace relay assertions. The focused four workspace suites, provider store/composable and runtime-model suites, affected/full web checks, real Studio workspace journey, retained architecture/dual-host/package-parity checks, cleanup/recovery, and Electron v1.4.57 rebuild/smoke pass on the merged commit.

## Constraints / Dependencies

- Node/pnpm workspace tooling and the existing repository build/test scripts remain authoritative.
- The integration must use current Personal contract numbers: application manifest 4, backend bundle 1, and current backend/frontend SDK contract 6 where applicable; clean internal names remain unversioned.
- The application path must fail closed when an application-scoped dependency is omitted; general-process assembly may retain deliberately named defaults.
- Process/provider startup remains network-free for static catalogs. Dynamic model discovery is selected-provider-granularity on selection/readiness or background-on-demand in Studio; a provider may enumerate its configured hosts/kinds, but applications never create endpoint-local lifecycle state or make all providers a readiness gate.
- No generic DI container, service locator, generic event bus, mode-switched `buildServer(mode)`, later-bound proxy, singleton fallback, compatibility wrapper, or package-ID special case.
- The feature's existing passing evidence and Personal's existing tests are characterization baselines only.

## Persisted Data Outcome

| Persisted subject | Decision | Required treatment |
| --- | --- | --- |
| Launch override rows in `__autobyteus_resource_configurations` | `Directly Usable — No Migration` | Preserve the current rooted sparse contract, exact values/provenance, side-effect-free reads, explicit Save/Reset only, and stale/invalid diagnostics. |
| Provider credentials, custom-provider records, provider host settings, and saved model identifiers | `Directly Usable — No Migration` | Personal changes current service/catalog presentation and in-memory discovery lifecycle, not these stored shapes. Never seed, rewrite, or copy them into application storage. |
| Dynamic provider model-source status/catalog rows | `Not Persisted / Not Affected` | Reconstruct process-local state through Personal's provider/kind lifecycle and snapshots; do not introduce application persistence. |
| Workspace registry rows, Agent/Team saved workspace IDs, and run history | `Directly Usable — No Migration` | Personal v1.4.57 changes transient controlled frontend state only. Continue using the current store/launch readers and writers without rewrite, fallback, or compatibility events. |
| Team/Agent run metadata and current TeamRun V1 packages | `Directly Usable — No Migration` after their already-registered prerequisite | Use current indexed `containingTeamRunId` to derive physical scope; do not rewrite the package for this refresh. |
| Affected pre-refresh nested Team Agent memory directories stored flat under the root TeamRun | `Migration Required` | The registered `TeamAgentMemoryLayoutAppDataMigration` moves the complete AgentRun directory into the canonical ordered nested TeamRun scope before normal application readiness. |
| Fresh/current nested directories, direct-root team members, and standalone AgentRuns | `Not Affected` | No migration and no runtime fallback; current canonical paths remain direct. |

- Existing data to preserve: all current Personal data and migration ledger, launch overrides, run/history state, memory files, raw traces, artifact revisions, and host provider configuration.
- Migration boundary: the existing `AppDataMigrationRunner.runPending()` phase used by both Studio and standalone; no application-runtime-specific runner or business-path migration.
- Ordering: TeamRun Execution Tree V1 prerequisite -> Team Agent memory layout -> external/native working-context snapshot migrations that consume current memory placement -> later process/application readiness.
- Transformation: for each nested leaf from current TeamRun V1, compute the old flat root path and canonical physical-scope path; when only the source directory exists, create the parent, rename the whole directory, then verify source missing/target directory. Do not merge file trees, overwrite targets, copy defaults, or read both layouts.
- Completion/recovery: successful/warning ledger states follow the existing migration runner; missing/failed work is retryable under its `ANYTIME` policy. Unmaterialized and already-current cases are explicit no-ops. Both source and target present are preserved with a bounded warning; unsupported/failed paths are recorded as failures, never silently discarded.
- Direct upgrade and skip-version: registry prerequisites make TeamRun V1 run first when needed; the memory migration then derives current scopes. A fresh root has no affected directories and completes as a no-op.
- Unacceptable loss/corruption: deleting or merging conflicting memory directories, partial per-file copying, runtime dual-path lookup, skipped Personal migration, launch-row rewrite, run/history loss, package mutation, or global service fallback.
- Related IDs: REQ-004–REQ-011; AC-005–AC-009, AC-011–AC-029.

## Assumptions

- Protected ticket checkpoint `95c63b5a...` and `origin/personal@389748b0b...` are the explicit refresh inputs. Implementation must re-fetch and stop for re-analysis if Personal moves again before the merge.
- Generated application outputs are reproducible from canonical source and may be deleted/regenerated.
- The user wants the existing finalized behavior, not a greenfield rewrite.

## Risks / Open Questions

- Personal may advance again before finalization; delivery must refresh and repeat semantic integration against the then-current ref.
- Auto-merged files can contain semantic regressions despite no conflict marker; the five workspace production/type files and both adjacent Personal owner suites require the recorded focused audit even though only two tests conflict.
- Exact source-file inventory may change while adapting to Personal's current owners, but behavior and boundary IDs may not drift.
- Full Electron/provider tests depend on the existing environment and credentials; unavailable infrastructure must be reported, not replaced by false proof.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-008 |
| REQ-002 | UC-001, UC-002, UC-008 |
| REQ-003 | UC-003, UC-006 |
| REQ-004 | UC-002, UC-004, UC-005, UC-007–UC-013 |
| REQ-005 | UC-003–UC-005, UC-009–UC-012, UC-014–UC-015 |
| REQ-006 | UC-002, UC-006, UC-008 |
| REQ-007 | UC-007–UC-013, UC-016 |
| REQ-008 | UC-008–UC-010, UC-014 |
| REQ-009 | UC-011–UC-013 |
| REQ-010 | UC-002, UC-004, UC-007, UC-009, UC-014–UC-015 |
| REQ-011 | UC-002, UC-007, UC-015–UC-016 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Intended Scenario |
| --- | --- |
| AC-001–AC-002 | Latest-ref ancestry, refresh parentage, worktree, two-conflict, and two-overlap semantic-resolution audit |
| AC-003–AC-004 | Maintained application CLI workflow and package parity |
| AC-005 | Current Personal run/team identity and lifecycle characterization plus application-scope construction proof |
| AC-006 | Fresh-root defaults and Studio override/reset/unavailable-model journeys |
| AC-007–AC-008 | Real Studio/standalone Agent Tools, handoff, publication, projection, recovery, and cleanup |
| AC-009 | Retained Personal provider/migration/model/event regression matrix |
| AC-010 | Source/derived/legacy inventory and regeneration proof |
| AC-011 | Full integrated source, API/E2E, package, and Electron evidence |
| AC-012 | Current/stale AutoByteus read, Save, direct agent/team, and external-runtime ownership matrix |
| AC-013 | Native provider error plus strict application agent/team message-only projection |
| AC-014 | Exact conflict deletion/contract/identity/no-retired-import audit |
| AC-015 | Complete refreshed latest-Personal and dual-host verification matrix |
| AC-016 | Exact second-refresh conflict/overlap resolution and protected-checkpoint audit |
| AC-017 | Root/nested physical-scope plus graph-local activation/session/memory/cleanup proof |
| AC-018 | Migration order, direct/skip/fresh outcomes, warning/failure, and no-dual-read proof |
| AC-019 | Nested configured/task/history/frontend behavior with proportional application coverage |
| AC-020 | Full newest-Personal, dual-host, package, cleanup/recovery, and Electron matrix |
| AC-021 | Exact v1.4.56 conflict/overlap/deleted-owner transition audit |
| AC-022 | Static/dynamic model selection, provider-granularity discovery, fresh per-leaf resolution, read/Save/direct-run proof |
| AC-023 | Serving-runtime credential-owner and network-free credential-readiness proof |
| AC-024 | Studio inherited-runtime plus immediate/background catalog publication proof |
| AC-025 | Complete Personal provider/catalog plus physical-scope/dual-host/Electron verification matrix |
| AC-026 | Exact v1.4.57 ref, two-conflict/two-overlap, clean-index, and protected-checkpoint audit |
| AC-027 | Controlled selector and thin Agent/Team complete-state relay contract |
| AC-028 | Explicit New preservation, register-before-launch, failure/no-fallback, and no-migration journey |
| AC-029 | Combined workspace/provider fixtures plus focused/full web, real Studio, retained dual-host, and Electron proof |

## Approval Status

Approved requirements basis through the user's explicit instruction to keep the ticket on the newest `origin/personal`; SR-008 preserves the already-approved/verified dual-host and provider contracts while adopting Personal v1.4.57's current controlled workspace behavior. No refresh merge, implementation continuation, or Electron rebuild is authorized until architecture review passes.
