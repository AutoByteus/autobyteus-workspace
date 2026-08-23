# Investigation Notes — Universal Application Framework Latest-Personal Integration

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Latest-base refresh investigation complete; SR-004 design input ready for architecture review.
- Investigation Goal: Preserve the completed integration while mapping the newest Personal delta into current owners, resolving the bounded conflict set, and defining the exact re-verification delta.
- Scope Classification: `Large`.
- Scope Classification Rationale: Large cumulative integration; current SR-004 is a bounded Design Impact refresh of 31 new commits, 11 conflicts, 13 changed-both paths, several package boundaries, and mandatory dual-host/Electron re-verification.
- Scope Summary: History-preserving latest-base refresh plus bounded relocation of current-model validation and provider-error projection into the already-approved application-platform owners.
- Primary Questions To Resolve: Which newest-Personal behaviors land in retired owners, where do they belong now, how are exact v6 identity/error contracts combined, which paths remain deleted, and what must be reverified?

## Request Context

The finalized Universal Application Framework branch was completed, reviewed, tested, and pushed. The user reports that `origin/personal` has since undergone a very large refactor and asks for the easiest safe way to make the feature branch based on latest Personal. The user explicitly permits a separate worktree and trial merge.

## Environment Discovery / Bootstrap Context

- Project Type: `Git` super-repository.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration`
- Current Branch: `codex/universal-application-framework-latest-personal-integration`
- Current Worktree / Working Directory: same as task workspace root.
- Bootstrap Base Branch: historical `origin/personal@8ef282b...`; previously integrated through `d7d4eace46dc6534d50e9150c3e84d4bd41fedfb`; current refresh target `origin/personal@7edfb162559ec5a6eb4c00c23a929920eabe3dc1`
- Remote Refresh Result: fetched successfully; newest target is 32 commits beyond the prior integrated base. The newest commit after delivery's measured `1629441a3...` target changes only two unrelated completed-ticket delivery documents.
- Task Branch: created from and tracking latest `origin/personal`.
- Expected Base Branch: `origin/personal`.
- Expected Finalization Target: the ticket branch only unless the user later explicitly requests Personal integration.
- Feature Input: `origin/codex/universal-application-framework-proposal-analysis@a5ffd289aa58293574e44dfa8b38ed8b1978ffd0`
- Merge Base: `acb8985930ccce49b632cdca22b92f5b237e35bf`
- Divergence: Personal 238 unique commits; feature 115 unique commits.
- Bootstrap Blockers: delivery is paused on the reviewed semantic conflict set; no actual refresh merge has started.
- Notes For Downstream Agents: the latest refresh used a non-mutating merge-tree preview. No refresh merge or production edit has begun. Preserve checkpoint `663f44d...`, the six delivery-owned DR-004 changes/evidence, and both source histories.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `integration-strategy-analysis.md` | Strategy/authority/verification supplement | Options, merge classification, semantic authority matrix, construction adaptation | Requirements, design | REQ-001–REQ-007; AC-001–AC-011 | Complete | Intended behavior; approved by delegated technical direction | Architecture review |
| `merge-attempt.log` | Raw no-commit merge transcript | Exact Git conflicts | Investigation, design | REQ-002; AC-002 | Complete | N/A evidence | Retain |
| `merge-conflict-inventory.txt` | Classified conflict paths | Status/category counts and exact paths | Investigation, design | REQ-002, REQ-006; AC-002, AC-010 | Complete | N/A evidence | Implementation consumes |
| `branch-overlap-inventory.txt` | Common changes from merge base | 227 changed-both paths and canonical subset | Investigation, design | REQ-002, REQ-006; AC-002, AC-010 | Complete | N/A evidence | Implementation audits all canonical paths |
| `integration-path-inventory.txt` | Raw merge classes plus corrected target disposition inventory | Measured add/changed-both/remove/regenerate sets, explicit Personal/integration-only target modifications, retained dependencies, and removals | Design | REQ-003–REQ-007; AC-003–AC-011 | Complete; corrected through SR-003 | N/A evidence | Implementation consumes target dispositions, not raw branch membership alone |
| `integration-runtime-contracts.md` | Exact integration seam contract | Host lifecycle allocation, source-backed tool readiness, activation/provisioning state and construction DAG, general-process exemptions, one launch store/direct-use proof, verification delta | Requirements, design | REQ-004–REQ-007; AC-005–AC-011 | Complete; corrected through SR-003 | Intended behavior precision within approved scope | Architecture re-review |
| `latest-base-refresh-design-analysis.md` | Latest-base refresh semantic contract | New ref evidence, reachability, authority, current-model/error spines, 11-conflict decisions, marker-free overlaps, exact inventory, and verification delta | Requirements, design | REQ-001–REQ-008; AC-001–AC-015 | Complete for SR-004 | Intended bounded integration behavior | Architecture review |
| `latest-base-refresh-conflict-report.md` | Delivery-owned blocker report | Original 31-commit ref/divergence, 11 conflicts, changed-both classification, and Design Impact rationale | Investigation, requirements, design | REQ-001–REQ-002, REQ-006–REQ-008; AC-001–AC-002, AC-010–AC-015 | Complete; preserved untouched | N/A evidence | Retain and hand off |
| `evidence/delivery/dr-004-base-refresh-and-integration.log` | Delivery-owned raw refresh evidence | Fetch, commits, paths, non-mutating preview, clean index | Investigation, requirements, design | REQ-001–REQ-002, REQ-006; AC-001–AC-002, AC-010 | Complete; preserved untouched | N/A evidence | Retain and hand off |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-22 | Command | `git fetch origin personal codex/universal-application-framework-proposal-analysis` | Refresh inputs | Personal=`8ef282b...`; feature=`a5ffd28...` | Re-fetch at delivery |
| 2026-08-22 | Command | `git merge-base`, `git rev-list --left-right --count` | Measure divergence | Merge base `acb8985...`; 238/115 unique commits | No |
| 2026-08-22 | Setup | `git worktree add ... origin/personal` | Isolate task | Dedicated latest-Personal task branch created | No |
| 2026-08-22 | Probe | `git merge --no-commit --no-ff origin/codex/...` | Measure real conflict surface | 177 conflict paths; merge then aborted cleanly | Yes, semantic implementation after review |
| 2026-08-22 | Script | Conflict classifier stored in `merge-conflict-inventory.txt` | Separate mechanical from semantic work | 137 generated, 2 old builders, ~38 source/test | No |
| 2026-08-22 | Script | Three-way `git diff --name-status` comparison | Find marker-free overlap | 227 common paths; 77 canonical non-generated | Yes, audit all 77 |
| 2026-08-22 | Code | `git show <ref>:applications/*/package.json` and source trees | Compare developer workflow | Feature owns devkit scripts/canonical source; Personal owns newer app logic | No |
| 2026-08-22 | Code | Personal current agent/team managers, Codex/Claude factories, MCP session owners | Identify integration seam | Personal activation and rooted identity supersede feature-era registries; application-scoped publication still required | Design defines adapted construction |
| 2026-08-22 | Code | Personal `server-runtime.ts`, app-data runner/registry, token readiness, TeamRun catalog, background runner; feature host starters/builders and `ApplicationPlatformLifecycle` | Resolve AR-001 | Enumerated every process, application-readiness, recovery, background, unwind, and stop phase with host applicability and failure policy | Recorded in `integration-runtime-contracts.md` section 1 |
| 2026-08-22 | Code | Personal `agent-run-manager.ts`, `agent-run-activation-candidate.ts`, `standalone-agent-run-activation-service.ts`, `agent-run-provisioning-service.ts`, current mixed-team factories/registries/handles | Resolve AR-002 | Confirmed claim-before-await, private candidate, durable metadata before publication, provider identity, quarantine, current registry names, and defaulting constructor seams | Recorded in supplement section 2 and target inventory |
| 2026-08-22 | Code/data contract | Personal `application-execution-resource-configuration-*`, `execution-resources.ts`, feature launch service/store, current configuration tests/migration fixtures | Resolve AR-003 | Physical table is shared; valid Personal agent/team profile shapes become target sparse overrides unchanged when target uses `memberAddress`/`displayName`; feature `memberRouteKey`/`memberName` cannot be retained | One target store/current-rooted contract selected; no read-time rewrite/fallback |
| 2026-08-22 | Code | Personal/final `startup/agent-tool-loader.ts`, `register-search-tool.ts`, core `register-tools.ts`, `agent-factory.ts`, background runner, lifecycle builder/tests, and every production `registerTools()` caller | Resolve remaining AR-001 | Final loader has six server specs, no Skills registrar exists, Search calls Core, and eager `defaultAgentFactory` construction calls Core through the normal host import graph | Use Core as the truthful seventh unit; one memoized lifecycle owner; remove all early/duplicate triggers and add exact order/once/failure/omission proof |
| 2026-08-22 | Doc | Final feature requirements/design/review/delivery artifacts under prior ticket `done/` | Recover approved behavior | Same-package two hosts, four projections, scoped MCP, Codex/Luna, no compatibility, real parity passed | Preserve as characterization baseline |
| 2026-08-23 | Delivery evidence | `latest-base-refresh-conflict-report.md`; `evidence/delivery/dr-004-base-refresh-and-integration.log` | Measure newest refresh without mutating the verified checkpoint | Personal advanced 31 commits; branch is 140/31; preview has 11 conflicts and zero actual unmerged index entries | Design-led resolution required before merge/build |
| 2026-08-23 | Git/source revalidation | `git rev-parse origin/personal`; `git diff 1629441a3..7edfb1625`; `git merge-tree --write-tree HEAD origin/personal`; `git ls-files -u` | Reconfirm the target immediately before solution handoff | Personal advanced once more to `7edfb1625...`; the one new commit changes only two unrelated delivery documents; the non-mutating preview still has exactly the same 11 conflicts and leaves the index clean; branch divergence is 140/32 | Update target ref/count, accept the unrelated documents, preserve all semantic resolutions |
| 2026-08-23 | Git/source probe | `git diff d7d4eace..origin/personal`, changed-both intersection, three-way `git merge-file` for marker-free overlaps | Separate clean latest-Personal changes from semantic overlaps | 13 changed-both paths; run binding auto-merges an import of a deleted helper; SDK README auto-merge is compatible | Record both marker-free decisions |
| 2026-08-23 | Code | latest Personal `LLMFactory.requireCurrentModelIdentifier`, `CurrentModelSelectionRequiredError`, retired configuration service/launch-profile helper, and run-binding delta | Recover exact current-model behavior and ownership scope | Only AutoByteus pairs use exact current membership; Claude/Codex bypass; saved/direct team leaves validate before readiness or allocation | Relocate to one explicit current policy and current owners |
| 2026-08-23 | Code | current `ApplicationLaunchConfigurationService`, `ApplicationLaunchHostCapabilityValidator`, `ApplicationLaunchOverrideStore`, `ApplicationRunBindingLaunchService` | Identify retained target boundaries | One current baseline/overlay/readiness/store owner exists; stale/unavailable values remain visible; direct command is a separate defensive boundary | No retired owner restoration |
| 2026-08-23 | Code/contract | latest Personal provider error supplement and producer/native event diffs; current application projector, v6 SDK event/URL/producer validators and tests | Reconcile user-visible error behavior with strict application boundary | Native path carries code/message/safe metadata; application SDK intentionally carries only original safe message and exact v6 identity | Accept native path; project message only; reject extra keys |
| 2026-08-23 | Git/tree | current tracked application SDK `dist`, package build scripts, modify/delete conflicts | Decide generated declaration treatment | Current ticket tracks no application SDK dist; source build generates it locally | Keep deletions; no second source truth |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Run latest Personal or finalized feature branch | Separate branch histories; no integrated current candidate | Feature is complete but older; Personal is current but lacks dual host | Refs, merge-base, existence probes |
| BEH-002 | User | Develop/build maintained application | Personal custom builder + canonical and mirrored output; feature devkit scripts + canonical source | Developer workflow exists only on feature | Package.json/tree comparison |
| BEH-003 | System | Application launches agent/team and consumes events | Personal current prepare/publish activation, RootTeamRun, rooted member identity; feature application-scoped runtime services | Neither side alone is the desired combined path | Current source read and final feature design |
| BEH-004 | User/Contract | Package defaults or Studio launch override | Feature launch resolver/defaults; Personal newer model availability and contract schemas | Package and host config meanings must compose | App configs, manifests, launch-profile code |
| BEH-005 | Operational | Trial merge | Git identifies 177 conflicts; marker-free shared edits remain | Conflict markers are an incomplete semantic inventory | Merge and overlap artifacts |
| BEH-006 | Contract | Existing tests/reports | Each branch's suite validates its own state | No evidence yet validates the combined latest-Personal state | Prior final reports and current task probe |

## Design Health Assessment Evidence

- Change posture: `Refactor` / integration.
- Candidate root cause classification: `Boundary Or Ownership Issue` and `Legacy Or Compatibility Pressure`.
- Refactor posture evidence summary: a semantic merge is required; only the current owner intersections should be adapted.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Conflict inventory | 139/177 conflicts are generated or obsolete builder output | Do not treat conflict count as 177 independent design choices | Remove/regenerate |
| Canonical overlap inventory | 77 canonical paths changed by both | Auto-merge cannot be trusted without owner-by-owner audit | Mandatory audit |
| Personal execution source | New prepare/activation and RootTeamRun semantics are absent from feature versions | Selecting feature files wholesale would regress Personal | Personal authoritative |
| Feature platform source/evidence | Explicit host builders, standalone host, four projections, scoped publication are absent from Personal | Selecting Personal wholesale would lose the feature | Feature behavior authoritative |
| App mirrors | Personal `frontend-src` equals `ui`; backend migration copies also match | Mirrors are derived, not independent current owners | Remove and regenerate |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/server-runtime.ts` | Personal Studio/process startup | New Personal provider/migration gates overlap feature extraction | Keep Personal gates; route application startup through explicit Studio builder |
| `.../standalone-application-host/start-standalone-application-host.ts` | Feature standalone process coordinator | Lacks exact latest-Personal token readiness/TeamRun catalog policy | Apply the same current process prerequisites before shared application preparation; retain isolated-root failure/unwind surface |
| `.../application-platform/runtime/application-platform-lifecycle.ts` | Shared application readiness/recovery/stop | Correct owner, but must not duplicate process migrations/transports/background work | Own only workspace/customizations/Core plus six server tool units/session/catalog/built-ins/definitions, application recovery, and application shutdown |
| `.../startup/agent-tool-loader.ts` | Personal background loader / feature readiness candidate | Personal has five best-effort specs; feature has six required specs but labels them seven and omits Core as a named result | Become the single memoized readiness owner for Core, Browser, Task Delegation, Agent Communication, Published Artifact, Media, and provisioned Search |
| `autobyteus-ts/src/tools/register-tools.ts` | Idempotent Core registrar | Registers file/terminal/basic Search/media/URL definitions; unchanged on both refs | Retain as the source-backed Core unit called first by readiness |
| `.../agent-tools/search/register-search-tool.ts` | Provisioned Search replacement | Calls Core registration before overwriting Search | Remove the Core call; own only the Search replacement after vault/Core readiness |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | Agent construction and default singleton | Constructor calls Core registration, and the exported default instance is eager | Remove the unrelated registry side effect so importing/constructing the factory cannot pre-empt lifecycle readiness |
| `.../agent-execution/services/agent-run-manager.ts` | Personal current run preparation/activation/termination | State/lifecycle newer than feature | Retain; inject application-scoped dependencies explicitly |
| `.../agent-execution/services/agent-run-activation-candidate.ts` | Private pre-publication handle | Preserves the current metadata-before-publication boundary | Retain current states and public surface |
| `.../agent-execution/services/standalone-agent-run-activation-service.ts` | Activation/restore deduplication and durable commit | Current provider-identity/quarantine contract is required in application scope | Retain/modify for explicit graph-local construction only |
| `.../agent-execution/services/agent-run-provisioning-service.ts` | Durable PREPARED metadata, TTL, allocation | Current provisioning is upstream of activation | Retain/modify for explicit graph-local construction only |
| `.../agent-team-execution/services/agent-team-run-manager.ts` | Current RootTeamRun lifecycle | Supersedes feature-era flattened team handling | Retain current owner/identity |
| `.../agent-tools/mcp/*` | MCP process sessions and route execution | Feature adds scoped application publisher/session behavior | Adapt to current run identity; preserve external/internal route split |
| `.../services/published-artifacts/published-artifact-publication-service.ts` | Validates active run and publishes artifact event | Both branches changed authority/event semantics | Use current awaited event lifecycle with exact application active-run lookup |
| `autobyteus-server-ts/src/application-platform/**` | Feature-only dual-host shared platform | Absent on Personal | Bring forward, adapted to current owners |
| `.../compositions/build-studio-server.ts`, `build-standalone-application-server.ts` | Feature explicit assembly roots | Absent on Personal | Retain distinct roots; no mode switch |
| `applications/*/frontend-src`, `backend-src` | Canonical maintained application source | Personal has newer changes | Personal source content wins semantically, then dual-host contracts are applied |
| `applications/*/ui`, `backend`, `dist` | Personal mirrored/generated package trees | Conflicts dominate count | Remove/regenerate from canonical source |
| `autobyteus-application-devkit/**` | Feature developer commands and packaging | Personal package contracts evolved | Retain devkit workflow with Personal contract values |
| `autobyteus-web/components/applications/setup/**` | Studio overrides and model availability | Both branches changed | Combine sparse inheritance with current unavailable-model warnings/blocking |
| `.../application-orchestration/stores/application-execution-resource-configuration-store.ts` | Personal current physical configuration store | Competes with feature launch override store over the same table | Remove; feature-named launch override store becomes the single target owner using current rooted fields |
| `.../application-orchestration/stores/application-launch-override-store.ts` | Feature target store | Physical schema fits but feature type names use obsolete member identity | Retain/adapt as the only store; safe-parse raw JSON and never rewrite on read |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-22 | Probe | no-commit merge | 177 conflicts; 1223 staged paths before abort | Large but bounded integration; not safe as blind merge |
| 2026-08-22 | Script | conflict status/category count | DU=3, UD=132, UU=42; generated=137 | Mechanical deletion/regeneration removes most textual work |
| 2026-08-22 | Script | path intersection | Personal changed 5717, feature 1415, common 227, canonical common 77 | Semantic review extends beyond markers |
| 2026-08-22 | Code probe | path existence at Personal ref | No explicit builders/platform runtime/standalone host | Feature is materially still needed |
| 2026-08-22 | Code probe | app config comparison | Personal Brief lacks model; feature sets Codex/Luna | Preserve approved package completeness |
| 2026-08-22 | Lifecycle trace | Personal process plus feature host/lifecycle comparison | Shared readiness work was duplicated or at different lifecycle points; process transports are Studio-only | Exact target order and one owner per phase are now fixed in supplement section 1 |
| 2026-08-22 | Activation trace | Current prepare/create/restore/abort/terminate path | The current state machine spans four owners and claims before provider await; active-only feature registry cannot be copied verbatim | Target registry owns claims/active identity while manager, candidate, provisioning, and activation service retain their current roles |
| 2026-08-22 | Persisted-row shape comparison | Current contract and physical store versus feature contract/store | Agent profiles are field-compatible; team profiles are compatible only if the target keeps `memberAddress`/`displayName`, not feature `memberRouteKey`/`memberName` | Direct use is proven for current-rooted rows; one store selected; old service/store removed |
| 2026-08-22 | Required-tool call-graph trace | `rg` plus exact source reads across server/core production and direct tests | Production Core calls are only Search and eager AgentFactory; Personal background calls the five-group loader; feature lifecycle calls the six-spec readiness owner | Core can be the seventh unit without inventing Skills; remove alternate calls, call Core first and Search last, and update the three direct loader tests |

## External / Public Source Findings

N/A. This is a repository-internal integration; no external source was required.

## Reproduction / Environment Setup

- Required services: none for merge measurement.
- Setup: fetched both remote refs; created isolated worktree/branch from latest Personal.
- Merge probe: used `--no-commit --no-ff`; saved inventories; ran `git merge --abort`.
- Cleanup: worktree remains intentionally for the ticket. No production change or merge state remains.

## Findings From Code / Docs / Data / Logs

1. **Recommended method:** one semantic merge into the latest-Personal-based ticket branch.
2. **Why not rebase:** it would replay conflict resolution across 115 feature commits and rewrite the finalized branch history.
3. **Why not cherry-pick:** the feature's behavior emerged across many design/implementation/review corrections; selecting commits risks hidden omissions.
4. **Why not copy/reimplement:** 110 canonical feature-only additions and their verified interactions would be manually reconstructed.
5. **Why merge is feasible:** only ~38 textual conflicts are canonical source/tests; most other conflicts are derived output. The 77 marker-free canonical overlaps are review work but not all rewrites.
6. **Hardest seam:** current Personal run activation must be the source of truth while feature application sessions require an exact application publisher before provider factories are built. The target constructs an early application session ownership scope, resource manager, and exact claim/active registry; the manager retains backend/candidate orchestration. No global fallback or later-bound proxy is needed.
7. **Identity seam:** use current rooted `memberAddress`, `agentRunId`, and `teamRunId`; do not restore `memberRouteKey` or older feature registries.
8. **Contract seam:** preserve current serialized numbers (manifest 4, bundle 1, SDK 6) while retaining unversioned code-symbol naming in in-scope code.
9. **Lifecycle allocation:** host starters own logging/database/token/vault/migration and host process work; `ApplicationPlatformLifecycle` owns one shared application readiness/recovery/stop sequence. The exact order, host applicability, failure and close rules are in `integration-runtime-contracts.md` section 1.
10. **Launch persistence:** `application-launch-override-store.ts` is the single target store. Valid Personal `launch_profile_json` agent/team rows are read unchanged using current rooted identity; reads never normalize or write. Invalid/stale/legacy-only rows block and remain resettable without fallback.
11. **Required-tool ownership:** the seventh source-backed readiness unit is Core, not Skills. `AgentToolRegistryReadiness` is the only application-host registration owner: Core first, five independent server groups, and provisioned Search last. Search, `AgentFactory`, Studio startup, background tasks, and the removed wrapper do not register Core/tools independently.

## Persisted Data Transition Evidence

- Current stored subject/location: Personal server database/data root and per-application data/configuration.
- Change: construction and ownership adaptation, not a new physical schema requirement.
- Readers/writers: target `ApplicationLaunchOverrideStore` is the only physical row owner and `ApplicationLaunchConfigurationService` is the only semantic reader/writer. The Personal configuration service/store and feature member-route field names are removed.
- Representative current rows: an agent `AGENT` profile and a rooted team `AGENT_TEAM` profile containing `memberAddress`, `displayName`, and `agentDefinitionId` are accepted directly as sparse host overlays. Null resource selection continues to mean the package default resource. Alternate shared resource selection builds its own baseline first.
- Read policy: parse/validate/evaluate only; no seed, normalization write, compatibility conversion, stale-row delete, or package-default fallback. Explicit Save writes the current-rooted normalized sparse shape; explicit Reset deletes.
- Invalid/unavailable policy: retain the saved value/diagnostic, return the existing non-runnable host state, and expose Reset. Historical `launch_defaults_json`-only or `memberRouteKey` rows are invalid, not translated.
- Direct-use invariants preserved: Yes for valid current Personal rows without transformation; physical table and columns are unchanged.
- Physical/operational constraints: user data and history must not be seeded, copied, reset, or rewritten.
- Decision: `Directly Usable — No Migration`; evidence and examples are in `integration-runtime-contracts.md` section 3.

## Constraints / Dependencies / Compatibility Facts

- Source refs are immutable inputs.
- Personal current lifecycle and provider behavior must not be overwritten by older feature source.
- Feature dual-host public behavior must not be silently dropped because Personal lacks it.
- Derived paths must be regenerated, not hand-authored.
- No compatibility aliases or source-level version suffixes for in-scope contracts.
- No external `/mcp/gateway` in standalone; both hosts use internal scoped `/mcp/agent-tools/:sessionId`.

## Open Unknowns / Risks

- The implementation may discover additional semantic conflicts among the 77 auto-merged paths; those are implementation corrections only if they remain within approved BEH/REQ/AC scope.
- If Personal advances, this evidence becomes a prior-baseline input and delivery must repeat the refresh.
- Actual provider/Electron checks require the project's normal environment.

## SR-004 Latest-Base Refresh Findings

### Newest-Personal Change Classification

- Personal-authoritative clean changes: provider catalog/model definitions, pricing schedules and snapshots, missing-key handling, provider extraction/redaction, canonical native error code/message/metadata, native web/team transport, and their durable suites.
- Application-boundary semantic changes: current-model selection currently targets retired configuration owners; provider message passthrough must combine with current v6 application identity and exact-key parsing.
- Mechanical deletions: two generated application SDK declaration files plus the retired configuration service, launch-profile helper, and predecessor test remain deleted.
- Marker-free defects if left to Git: `ApplicationRunBindingLaunchService` imports the deleted helper; the SDK README needs explicit combined wording.

### Selected Target Owners

1. `ApplicationLaunchConfigurationService` remains the only semantic baseline/overlay/readiness/Save owner.
2. `ApplicationLaunchOverrideStore` remains the only physical launch-row owner.
3. Add one explicit stateless `ApplicationCurrentModelSelectionPolicy` that normalizes runtime and delegates only AutoByteus identifiers to latest Personal's `LLMFactory` guard.
4. `ApplicationLaunchHostCapabilityValidator` maps a stale AutoByteus selection to the current `ApplicationLaunchIssue` code `CURRENT_MODEL_SELECTION_REQUIRED`.
5. `ApplicationRunBindingLaunchService` applies the same policy to every direct agent/team config before allocation/creation and does not import any retired helper.
6. `ApplicationAgentStreamEventProjector` uses the latest safe nonblank event message while retaining diagnostic filtering and the closed message-only SDK projection.

### Persisted-State Evidence

No schema or stored-shape change exists in the 32-commit refresh; the 32nd commit is delivery-document-only. A removed AutoByteus model identifier remains an ordinary string in the existing sparse row. The target reads it without mutation, exposes the saved/effective value and provenance, blocks readiness with the exact current-selection issue, rejects an attempted stale Save before upsert, and allows only explicit Save/Reset to mutate. Package defaults and valid current rows remain directly usable. Decision remains `Directly Usable — No Migration`.

### Verification Consequence

Prior `ARCH-REV-003`, implementation/source review, API/E2E, provider, package, and Electron evidence remain characterization baselines only. The refreshed commit requires the focused current-model/error tests, retained latest-Personal provider suites, all application architecture/source checks, real Studio and standalone journeys, package parity/recovery/cleanup, and a new Electron build/smoke.

## Notes For Architecture Reviewer

`SR-004` responds to delivery `DR-004` latest-base Design Impact after the previously integrated design and behavior passed. Review `latest-base-refresh-design-analysis.md`: the exact current-model policy boundary, stale read/Save/direct-run results, provider-error message-only projection, 11 conflict decisions, two marker-free overlap decisions, add/modify/remove inventory, and complete verification delta. `ARCH-REV-003` remains the passed baseline for the unchanged platform architecture. No refresh production change or merge has begun.
