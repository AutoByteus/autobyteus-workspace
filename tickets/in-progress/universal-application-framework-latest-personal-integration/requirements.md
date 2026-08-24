# Requirements — Universal Application Framework Latest-Personal Integration

## Status

Design-ready `SR-007` revision for the renewed mandatory latest-base refresh. The integrated and DR-005-verified ticket checkpoint `a23849f165879050e2c9b676a2e9652d8a593c93` remains protected. The user requires the same ticket branch to incorporate current `origin/personal@c5b87df4d6db15969ba70adee9dfd8394b1e7385` (`v1.4.56`), 22 commits beyond integrated Personal base `7edfb162559ec5a6eb4c00c23a929920eabe3dc1` and 17 commits beyond the superseded reviewed target `a00f0d07d...`. The fresh non-mutating merge preview still finds five content conflicts and ten changed-both paths; no merge or production edit has started. The six commits after the provider/runtime semantic pin `3ab4946c7...` add only an isolated, non-workspace UI prototype plus ticket/delivery records and do not alter production owners or the conflict map. SR-007 corrects the provider-granularity discovery, settled Studio snapshot, and fresh per-leaf model-resolution contracts identified by `ARCH-REV-006`. Implementation and Electron rebuild remain paused until this revised package passes architecture review.

## Goal / Problem Statement

Refresh the verified Universal Application Framework checkpoint from integrated Personal base `7edfb1625...` to current `origin/personal@c5b87df4d...`. Preserve the proven Studio/standalone, launch/readiness, current activation/platform binding, graph-local run/session/memory dependencies, scoped Agent Tools, publication/projection, and exact cleanup while adopting Personal's nested `TeamRunPhysicalScope`/memory migration and completed provider-catalog/API-key architecture. Integrate process-owned static/dynamic model availability, split credential/catalog contracts, and asynchronous Studio model discovery through the existing application configuration boundary. Preserve the newly tracked, isolated `ui-prototypes/autobyteus-web-prototype` subtree byte-for-byte without making it a root workspace or application-framework dependency. Do not select either side wholesale, resurrect deleted aggregate provider owners, introduce eager all-provider discovery, reintroduce global fallbacks, dual-read old memory paths, or skip the current migration.

## Current And Desired Behavior

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | The DR-005 checkpoint contains the proven dual-host foundation and Personal through `7edfb1625...`, but it is 22 commits behind current Personal. | The same ticket branch history incorporates `origin/personal@c5b87df4d...` once and remains the verification branch; `personal` itself is untouched by this ticket. | The protected checkpoint and source branches remain recoverable and are not rewritten. | REQ-001, REQ-002; AC-001, AC-002, AC-014, AC-016, AC-021 |
| BEH-002 | The finalized feature provides `pnpm dev`, `dev:studio`, `build`, `validate`, and `start`; latest Personal applications still use custom package builders and mirrored/generated trees. | Retain the native application developer workflow and one canonical source tree, adapted to current Personal package contracts. | A package built once remains importable in Studio and runnable as standalone. | REQ-003; AC-003, AC-004 |
| BEH-003 | Personal has newer agent/team execution state, rooted member identity, provider preparation/publication, and cleanup behavior. The feature branch has application-scoped execution/publication integration against older owners. | Dual-host application execution uses Personal's current lifecycle and identity owners while preserving application-scoped publication, messaging, cleanup, and projection. | No global/process fallback may replace an application-scoped dependency. Native provider tools and the external Studio MCP gateway remain outside the application transport change. | REQ-004, REQ-005; AC-005–AC-008 |
| BEH-004 | The verified ticket has self-contained Codex/Luna package defaults, Studio sparse overrides, and host readiness. New Personal removes old AutoByteus catalog IDs and rejects them through a current-model guard in legacy configuration owners that the ticket removed. | Preserve the ticket launch model while relocating exact AutoByteus current-model validation into the retained launch/readiness/direct-run boundaries. Stale values stay visible and block; Codex/Claude remain owned by their provider runtimes. | Studio overrides never mutate packages; no model alias, silent replacement, row rewrite, or package-default fallback is allowed. | REQ-005, REQ-008; AC-006, AC-009, AC-012 |
| BEH-005 | The earlier provider refresh is integrated and verified. The current 22-commit refresh produces five conflicts and ten changed-both paths spanning the already-designed physical-scope seam, new provider/catalog tests and the shared runtime-scoped Studio model picker; its final six commits add only an isolated prototype subtree and ticket/delivery records. | Resolve the exact five conflicts and audit all ten overlaps by current owner; accept current Personal provider deletions/contracts, preserve the isolated prototype subtree without application-framework coupling, and adapt only the application-facing seams. | Do not reopen the passed platform architecture, add the prototype to the root workspace, or select whole files/directories from one side. | REQ-002, REQ-006, REQ-009, REQ-010; AC-002, AC-010, AC-016–AC-025 |
| BEH-006 | Checkpoint `a23849f...` has passed architecture, source, API/E2E, package, provider, dual-host, and Electron verification; newest Personal has separate nested-history/migration and provider-catalog/API-key evidence. Neither proves their current combination. | Re-run focused physical-scope/migration/activation/cleanup and provider/model/credential/UI checks, existing architecture/source checks, both real hosts, package parity, current Personal regressions, and Electron. | Prior evidence is a characterization baseline, not proof of the refreshed commit. | REQ-007–REQ-010; AC-011, AC-015–AC-025 |
| BEH-007 | New Personal preserves original redacted-safe provider messages and native safe metadata, while the verified application stream still emits a generic local message and has an exact closed v6 identity/field contract. | Accept the latest native error path and project only the original safe nonblank message through the application ERROR variant; preserve exact `agentRunId`/`memberAddress`/URL semantics and reject provider metadata at the application SDK boundary. | Diagnostic filtering and strict exclusion of raw errors, secrets, stacks, headers, provider IDs, and extra fields remain unchanged. | REQ-008; AC-013, AC-015 |
| BEH-008 | The verified application path injects graph-local run/session/memory services and uses atomic prepared activation, while newest Personal adds containing-TeamRun physical scope and a startup migration from old flat nested Agent memory paths. | Every root, nested configured member, task agent, and task-team member uses the exact immutable physical scope from its `TeamRunContext`; application execution retains the same injected dependency family and atomic activation/cleanup. Both hosts run the new migration through the existing app-data migration phase before application readiness. | Direct-root and standalone Agent memory remain unchanged; no runtime dual read, global fallback, package-specific branch, DB schema change, or second migration runner is introduced. | REQ-004, REQ-005, REQ-009; AC-005, AC-008, AC-016–AC-020 |
| BEH-009 | Personal v1.4.56 separates provider credentials from model catalogs, makes static catalogs network-free, resolves a selected dynamic identifier to its owning provider, performs provider-granularity discovery, and changes GraphQL/Pinia selection contracts. Its Pinia missing-provider action settles normal per-provider failures into `ERROR`/`STALE_ERROR` snapshots. The verified application validator still uses static-only membership, caches one runtime model list across leaves, and the credential adapter calls the deleted aggregate provider API. | Application readiness, Save, and direct launch use the Personal provider-granularity availability owner and its exact identifier/endpoint post-check, then perform a fresh exact `ModelInfo` lookup for every leaf; a later source mutation can never reuse an earlier runtime-only model snapshot. Unavailable dynamic sources/models block as `MODEL_UNAVAILABLE`. Credential readiness uses network-free settings and caches only equivalent resolved credential authorities. Studio retains sparse inherited runtime, publishes current rows before discovery, awaits the settled provider attempts, then re-reads rows and source status; aggregate rejection handling is defensive only. | Codex/Claude ownership, package/saved values, package bytes, provider persistence, application business behavior, and host boundaries stay unchanged; no endpoint-local application lifecycle, application-local catalog, all-provider readiness gate, compatibility API, or hidden fallback is added. | REQ-005, REQ-008, REQ-010; AC-006, AC-009, AC-012, AC-021–AC-025 |

## Investigation Findings

- The protected checkpoint is `a23849f...`; `origin/personal@c5b87df4d...` is 22 commits beyond its integrated base. The 17-commit delta after superseded target `a00f0d...` changes 2,194 paths (`2,069` add, `98` modify, `27` delete). A fresh non-mutating merge-tree preview still produces exactly five content conflicts and ten changed-both paths and leaves the index clean.
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
- The five conflicts comprise the SR-005 production/test seam plus current Qwen GraphQL and model-catalog tests. The ten changed-both paths have exact dispositions in `latest-base-refresh-round-3-design-analysis.md`.
- Latest Personal has not independently absorbed the feature: its tree lacks the explicit Studio and standalone builders, the four-projection application platform boundary, the standalone host, and maintained application devkit configuration.
- Rebase or selective replay would rewrite/fragment the already-verified integration. One additional semantic merge of the current Personal advance is the least risky and most auditable strategy.
- Personal is authoritative for newer provider and agent/team execution behavior; the feature is authoritative for the same-package/two-host boundary and its tested developer experience. The integration requires a small structural adaptation where those authorities meet, not a wholesale selection of either version.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `integration-strategy-analysis.md` | Intended integration strategy and semantic authority matrix | REQ-001–REQ-007 | AC-001–AC-011 | Design-ready; approved by the user's delegated technical-direction instruction | Constrains how the merge may be resolved and verified. |
| `integration-runtime-contracts.md` | Exact lifecycle, activation/provisioning, construction, launch persistence, and verification contract | REQ-004–REQ-007 | AC-005–AC-011 | Design-ready; within the approved preserved-behavior boundary | Closes the bounded architecture-review precision gaps without adding product scope. |
| `latest-base-refresh-design-analysis.md` | Exact 32-commit refresh authority, conflict, current-model, provider-error, inventory, and verification design | REQ-001–REQ-008 | AC-001–AC-015 | Implemented and verified; retained historical authority | Defines how the previously integrated Personal behavior entered current owners without reopening the passed platform architecture. |
| `latest-base-refresh-round-2-design-analysis.md` | Exact five-commit physical-scope, memory migration, conflict/overlap, data transition, and verification design | REQ-001–REQ-009 | AC-001–AC-020 | Architecture-approved SR-005 basis; target superseded before merge | Physical-scope/migration decisions remain normative and are incorporated into the current SR-007 target. |
| `latest-base-refresh-round-3-design-analysis.md` | Exact v1.4.56 provider/catalog/model/credential/UI integration, five-conflict/ten-overlap map, data decision, file inventory, and verification design | REQ-001–REQ-010 | AC-001–AC-025 | Design-ready SR-007 supplement; pending architecture re-review | Supersedes SR-005 as the current merge target while preserving its physical-scope/migration decisions; revised for AR-004/AR-005. |
| `merge-conflict-inventory.txt` | Evidence: exact no-commit conflict set | REQ-002, REQ-006 | AC-002, AC-010 | Complete; approval N/A | Supports conflict classification. |
| `branch-overlap-inventory.txt` | Evidence: changed-both path inventory | REQ-002, REQ-006 | AC-002, AC-010 | Complete; approval N/A | Prevents reliance on conflict markers alone. |
| `integration-path-inventory.txt` | Evidence: add/modify/remove/regenerate candidate inventory | REQ-003–REQ-007 | AC-003–AC-011 | Complete; approval N/A | Drives detailed implementation and review inventory. |
| `merge-attempt.log` | Evidence: isolated merge transcript | REQ-002 | AC-002 | Complete; approval N/A | Proves the measured conflict surface. |
| `latest-base-refresh-conflict-report.md` | Delivery blocker and original 31-commit refresh measurement | REQ-001–REQ-002, REQ-006–REQ-008 | AC-001–AC-002, AC-010–AC-015 | Complete delivery evidence; approval N/A | Triggers SR-004 and records why delivery stopped before merge/build. |
| `evidence/delivery/dr-004-base-refresh-and-integration.log` | Raw fetch/ref/path/merge-tree evidence from delivery | REQ-001–REQ-002, REQ-006 | AC-001–AC-002, AC-010 | Complete delivery evidence; approval N/A | Grounds the original refresh measurement; solution-design revalidation extends it to current `7edfb1625...`. |
| `latest-base-refresh-round-2-conflict-report.md` | DR-006 delivery blocker for the five-commit nested physical-scope refresh | REQ-001–REQ-002, REQ-006–REQ-009 | AC-001–AC-002, AC-016–AC-020 | Complete delivery evidence; approval N/A | Triggers SR-005 and records why delivery stopped before merge/build. |
| `evidence/delivery/dr-006-base-refresh-and-integration.log` | Raw fetch/path/migration/merge-tree evidence for DR-006 | REQ-001–REQ-002, REQ-006, REQ-009 | AC-001–AC-002, AC-016 | Complete delivery evidence; approval N/A | Grounds the five-commit, three-conflict, six-overlap measurement. |
| `evidence/solution/latest-base-refresh-round-3-merge-preview.log` | Solution-owned immutable-ref/count/non-mutating merge preview | REQ-001–REQ-002, REQ-006, REQ-010 | AC-001–AC-002, AC-021 | Complete evidence; approval N/A | Grounds current ref, divergence, five conflicts, clean index, and protected HEAD. |
| `evidence/solution/latest-base-refresh-round-3-conflict-inventory.txt` | Exact five-path content-conflict inventory | REQ-002, REQ-006, REQ-010 | AC-002, AC-021 | Complete evidence; approval N/A | Drives semantic conflict resolution. |
| `evidence/solution/latest-base-refresh-round-3-overlap-inventory.txt` | Exact ten-path changed-both inventory | REQ-002, REQ-006, REQ-010 | AC-002, AC-021 | Complete evidence; approval N/A | Prevents reliance on conflict markers alone. |
| `evidence/solution/latest-base-refresh-round-3-path-inventory.txt` | Full 2,194-path previous-target-to-current-Personal inventory | REQ-002, REQ-006, REQ-010 | AC-009–AC-011, AC-021–AC-025 | Complete evidence; approval N/A | Proves provider deletions/additions, isolated prototype additions, and the bounded application source-review set. |

## Design Health Assessment

- Change posture: `Refactor` and integration of a previously completed `Larger Requirement`.
- Initial design issue signal: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue` plus `Legacy Or Compatibility Pressure`; SR-007 corrects the bounded evolved-provider boundary intersection identified during SR-006 review.
- Refactor posture: `Needed and bounded` for the current refresh.
- Evidence basis: the passed application path and newest Personal edit the same member-activation/memory seam for different correct reasons, while Personal's provider refactor deletes APIs used by application credential readiness and changes the provider-discovery and snapshot-return contracts needed before dynamic model validation. Existing application policy/validator/adapter/composable owners can absorb the adaptation without a new catalog, facade, or broad platform refactor.
- Requirement or scope impact: adopt approved latest-Personal nested-team and provider/catalog behavior through current owners. Do not redesign agent/team execution, add runtime fallback, add a second migration authority, duplicate provider state, or make all dynamic sources a process-start prerequisite.

## Recommendations

1. Keep the dedicated branch created from latest Personal.
2. Perform one history-preserving semantic merge of the finalized feature branch.
3. Use an explicit authority matrix: current Personal owns evolved runtime behavior; the feature owns dual-host requirements and boundary behavior.
4. Delete/regenerate derived package outputs instead of manually resolving them.
5. Adapt application-scoped run/session/publication wiring to Personal's current activation and rooted-member identity model; do not resurrect feature-era registries.
6. Verify the integrated state from source, not by inheriting either branch's old test result.
7. Treat `TeamRunPhysicalScope` as current domain truth, keep application graph-local dependencies exact, and run the new memory-layout migration only through the existing app-data migration runner.
8. Treat Personal's `ModelCatalogService`/`ModelAvailabilityService` and split credential settings as process truth; adapt the application readiness policy and Studio picker rather than retaining deleted aggregate APIs.

## Scope Classification

`Large` overall ticket; **bounded Design Impact refresh** for SR-007 — 22 Personal commits beyond the integrated base, five content conflicts, ten changed-both paths, one provider/model/credential/UI boundary adaptation, the already-designed physical-scope/migration seam, an isolated non-workspace prototype addition, and mandatory integrated verification.

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

### Out of Scope

- Merging or pushing the result into `personal`, releasing, deploying, tagging, or deleting either source branch.
- Rewriting the feature branch through rebase.
- A repository-wide redesign of agent/team execution, providers, MCP, or application manifests.
- Authentication/user support, a shared external Studio MCP gateway for standalone, or alteration of native Codex/Claude tools.
- Compatibility aliases/wrappers for source seams removed on either branch.
- Hand-maintaining generated package output as an independent source of truth.

### Preserved Behavior Boundary

BEH-001–BEH-009 govern. The integrated branch must preserve latest Personal semantics except where the approved dual-host behavior explicitly extends them; Studio and standalone differ in hosting/ingress, not in application business behavior.

### Review Authority

- Every blocking Design Impact or implementation correction must cite an approved BEH, REQ, or AC ID.
- New product behavior, migration, security, or operational policy is a Requirement Gap and requires user approval.
- Technical possibility or aesthetic preference alone is non-blocking.
- Reviewer comments do not silently amend this requirements basis.

## Functional Requirements

- **REQ-001 — Latest-base isolation:** The authoritative work remains on the dedicated ticket branch and protected checkpoint; it must incorporate fetched `origin/personal@c5b87df4d...` once without rewriting or directly modifying `personal` or the finalized feature history.
- **REQ-002 — History-preserving semantic integration:** Preserve the completed feature integration history, merge the newly fetched Personal ref once, and resolve every current conflict and changed-both path by behavior and ownership, never by wholesale `ours`/`theirs` selection.
- **REQ-003 — Dual-host developer experience:** The maintained Brief and Socratic packages retain devkit-owned `dev`, `dev:studio`, `build`, `validate`, and `start`, one canonical source tree, and build-once Studio/standalone use.
- **REQ-004 — Current Personal execution authority:** Retain current Personal agent/team provisioning and preparation, claim-before-await activation, private candidates, metadata-before-publication, provider-identity validation, quarantine, rooted-member identity, event publication, exact teardown, provider availability, migration gates, and current package contract values.
- **REQ-005 — Dual-host application authority:** Retain explicit Studio and standalone assembly roots, narrow application-platform projections, one awaited required-tool readiness owner, package-owned launch defaults, sparse non-mutating overrides, host readiness, scoped Agent Tools session/publication, application communication, projection, recovery, and ordered stop.
- **REQ-006 — Clean source transition:** Remove obsolete mirrored/custom-builder/old-owner paths; regenerate derived outputs from the integrated canonical source; do not add compatibility wrappers or global fallbacks.
- **REQ-007 — Integrated proof:** Validate architecture boundaries and omission cases, compile/build affected workspaces, run focused and broad regressions, exercise real Brief/Socratic flows in both hosts, prove package parity, and rebuild/test Electron.
- **REQ-008 — Latest provider/model behavior on current boundaries:** Preserve newest Personal's exact AutoByteus current-model rejection, external-runtime ownership, original redacted-safe provider message, and native error metadata. Implement application current-model validation through the retained launch/readiness/direct-run owners, preserve stale values without rewrite or fallback, and keep the focused application-agent ERROR contract message-only with exact v6 identity and strict metadata/secret exclusion.
- **REQ-009 — Nested TeamRun physical scope and persisted memory:** Adopt current Personal `TeamRunPhysicalScope` and nested history/navigation behavior across configured members, task agents, task teams, restore, and memory sync. Preserve the exact application graph-local run/session/memory dependency family, atomic prepared activation/platform binding, and scoped cleanup. Register the current Team Agent memory-layout migration in the existing required startup migration chain for both hosts; do not add runtime dual reads, global fallbacks, or a second migration runner.
- **REQ-010 — Current Personal provider/catalog integration:** Preserve Personal v1.4.56's network-free provider descriptors/static catalogs, split credential and model-snapshot contracts, provider-granularity dynamic discovery lifecycle, exact identifier/endpoint post-check, current model/media factory ownership, GraphQL/Pinia contracts, settled per-provider source states, and deleted-owner cleanup. Application readiness/Save/direct launch must delegate canonical dynamic identifiers to the process-owned provider ensure and perform a fresh exact model lookup for every leaf without runtime-only cache reuse across source mutation. Credential caching, if used, must be keyed only by the resolved credential authority. Studio model selection must combine current snapshots and `Promise.allSettled` missing-provider behavior with sparse inherited runtime; normal provider failure is read from snapshot source status, not aggregate rejection.

## Acceptance Criteria

- **AC-001:** `git merge-base --is-ancestor c5b87df4d6db15969ba70adee9dfd8394b1e7385 HEAD` succeeds on the refreshed ticket branch; `origin/personal`, the protected checkpoint, and the finalized feature history have not been rewritten.
- **AC-002:** The refresh merge preserves both histories, has no unresolved index entries or conflict markers, and records a semantic resolution for all five conflicts and all ten changed-both paths.
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
- Related IDs: REQ-004–REQ-010; AC-005–AC-009, AC-011–AC-025.

## Assumptions

- Protected ticket checkpoint `a23849f...` and `origin/personal@c5b87df4d...` are the explicit refresh inputs. Implementation must re-fetch and stop for re-analysis if Personal moves again before the merge.
- Generated application outputs are reproducible from canonical source and may be deleted/regenerated.
- The user wants the existing finalized behavior, not a greenfield rewrite.

## Risks / Open Questions

- Personal may advance again before finalization; delivery must refresh and repeat semantic integration against the then-current ref.
- Auto-merged files can contain semantic regressions despite no conflict marker; all ten changed-both paths plus the application model/credential/store seams require the recorded audit.
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
| REQ-007 | UC-007–UC-013 |
| REQ-008 | UC-008–UC-010, UC-014 |
| REQ-009 | UC-011–UC-013 |
| REQ-010 | UC-002, UC-004, UC-007, UC-009, UC-014–UC-015 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Intended Scenario |
| --- | --- |
| AC-001–AC-002 | Latest-ref ancestry, refresh parentage, worktree, five-conflict, and ten-overlap semantic-resolution audit |
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

## Approval Status

Approved requirements basis through the user's explicit instruction to keep the ticket on the newest `origin/personal`; SR-007 preserves both already-approved product contracts and makes the Personal v1.4.56 nested-team/provider/catalog integration source-truthful after AR-004/AR-005. No refresh merge, implementation continuation, or Electron rebuild is authorized until architecture review passes.
