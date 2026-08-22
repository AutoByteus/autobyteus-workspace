# Investigation Notes — Universal Application Framework Latest-Personal Integration

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Complete; design input ready.
- Investigation Goal: Quantify divergence and conflicts, identify semantic authorities, and choose the lowest-risk method for rebuilding the finalized dual-host feature on latest Personal.
- Scope Classification: `Large`.
- Scope Classification Rationale: 238 Personal-only commits, 115 feature-only commits, 177 merge conflicts, 227 changed-both paths, multiple workspaces, and real dual-host/Electron verification.
- Scope Summary: Git integration plus bounded adaptation of the application-platform construction and current agent/team identity/lifecycle seams.
- Primary Questions To Resolve: How much conflict is real? Which branch owns each overlapping behavior? Is merge, rebase, replay, or reimplementation safest? What must be reverified?

## Request Context

The finalized Universal Application Framework branch was completed, reviewed, tested, and pushed. The user reports that `origin/personal` has since undergone a very large refactor and asks for the easiest safe way to make the feature branch based on latest Personal. The user explicitly permits a separate worktree and trial merge.

## Environment Discovery / Bootstrap Context

- Project Type: `Git` super-repository.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration`
- Current Branch: `codex/universal-application-framework-latest-personal-integration`
- Current Worktree / Working Directory: same as task workspace root.
- Bootstrap Base Branch: `origin/personal@8ef282ba77705180d985e7000d801f0e0068cdc1`
- Remote Refresh Result: fetched successfully.
- Task Branch: created from and tracking latest `origin/personal`.
- Expected Base Branch: `origin/personal`.
- Expected Finalization Target: the ticket branch only unless the user later explicitly requests Personal integration.
- Feature Input: `origin/codex/universal-application-framework-proposal-analysis@a5ffd289aa58293574e44dfa8b38ed8b1978ffd0`
- Merge Base: `acb8985930ccce49b632cdca22b92f5b237e35bf`
- Divergence: Personal 238 unique commits; feature 115 unique commits.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: the trial merge was aborted after evidence capture. No production source has been modified. Preserve both source refs.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `integration-strategy-analysis.md` | Strategy/authority/verification supplement | Options, merge classification, semantic authority matrix, construction adaptation | Requirements, design | REQ-001–REQ-007; AC-001–AC-011 | Complete | Intended behavior; approved by delegated technical direction | Architecture review |
| `merge-attempt.log` | Raw no-commit merge transcript | Exact Git conflicts | Investigation, design | REQ-002; AC-002 | Complete | N/A evidence | Retain |
| `merge-conflict-inventory.txt` | Classified conflict paths | Status/category counts and exact paths | Investigation, design | REQ-002, REQ-006; AC-002, AC-010 | Complete | N/A evidence | Implementation consumes |
| `branch-overlap-inventory.txt` | Common changes from merge base | 227 changed-both paths and canonical subset | Investigation, design | REQ-002, REQ-006; AC-002, AC-010 | Complete | N/A evidence | Implementation audits all canonical paths |
| `integration-path-inventory.txt` | Raw merge classes plus corrected target disposition inventory | Measured add/changed-both/remove/regenerate sets and explicit Personal-only target modifications/removals | Design | REQ-003–REQ-007; AC-003–AC-011 | Complete; corrected in SR-002 | N/A evidence | Implementation consumes target dispositions, not raw branch membership alone |
| `integration-runtime-contracts.md` | Exact integration seam contract | Host lifecycle allocation, activation/provisioning state and construction DAG, general-process exemptions, one launch store/direct-use proof, verification delta | Requirements, design | REQ-004–REQ-007; AC-005–AC-011 | Complete | Intended behavior precision within approved scope | Architecture re-review |

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
| 2026-08-22 | Doc | Final feature requirements/design/review/delivery artifacts under prior ticket `done/` | Recover approved behavior | Same-package two hosts, four projections, scoped MCP, Codex/Luna, no compatibility, real parity passed | Preserve as characterization baseline |

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
| `.../application-platform/runtime/application-platform-lifecycle.ts` | Shared application readiness/recovery/stop | Correct owner, but must not duplicate process migrations/transports/background work | Own only workspace/customizations/seven tool groups/session/catalog/built-ins/definitions, application recovery, and application shutdown |
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

## Notes For Architecture Reviewer

`SR-002` responds only to `ARCH-REV-001` (`AR-001`–`AR-003`). Review the exact lifecycle table, activation APIs/construction obligations, corrected current-registry inventory, and launch row direct-use proof in `integration-runtime-contracts.md` alongside the aligned core design. No production source change has begun.
