# Investigation Notes — Universal Application Framework Latest-Personal Integration

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: DR-008 v1.4.57 semantic re-investigation complete; SR-008 bounded design correction ready for architecture review.
- Investigation Goal: Preserve the DR-007-verified v1.4.56 integration while mapping Personal v1.4.57 controlled workspace selection into the current form/provider boundary, resolving the exact two-test conflict set, and defining proportional complete re-verification.
- Scope Classification: `Large`.
- Scope Classification Rationale: Large cumulative integration; current SR-008 is a small bounded Design Impact refresh. Personal is four commits ahead, changes 95 paths dominated by completed-ticket evidence, and produces exactly two conflicts/two overlaps in durable Vue form tests. Production workspace changes auto-merge and no application-platform refactor or migration is required.
- Scope Summary: History-preserving v1.4.57 refresh that preserves the implemented provider/physical-scope/dual-host foundation and adds Personal's controlled Studio workspace-selection contract through a bounded test and verification integration.
- Primary Questions To Resolve: Do the auto-merged workspace production owners compose with the current provider/runtime form boundary; what exact fixture retains both controlled workspace relay and provider-granular callable store semantics; and what focused plus retained proof is sufficient without changing production architecture?

## Request Context

The finalized Universal Application Framework branch was completed, reviewed, tested, and pushed. The user reports that `origin/personal` has since undergone a very large refactor and asks for the easiest safe way to make the feature branch based on latest Personal. The user explicitly permits a separate worktree and trial merge.

## Environment Discovery / Bootstrap Context

- Project Type: `Git` super-repository.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration`
- Current Branch: `codex/universal-application-framework-latest-personal-integration`
- Current Worktree / Working Directory: same as task workspace root.
- Bootstrap Base Branch: historical `origin/personal@8ef282b...`; currently integrated through `52b4be02ea793f2071fe5a63a94664ab25196433`; current refresh target `origin/personal@389748b0b9f0dea051aaed18641de131cf0adbbb`.
- Remote Refresh Result: fetched successfully and revalidated by solution design; newest target is four commits beyond the integrated base. It finalizes controlled remote workspace selection and the v1.4.57 release. Exactly five production/type workspace files plus adjacent tests/docs/version metadata change; the merge conflicts only in two form tests.
- Task Branch: dedicated integration branch originally created from fetched `origin/personal`; it remains at the protected verified checkpoint until the reviewed current Personal ref is merged.
- Expected Base Branch: `origin/personal`.
- Expected Finalization Target: the ticket branch only unless the user later explicitly requests Personal integration.
- Feature Input: `origin/codex/universal-application-framework-proposal-analysis@a5ffd289aa58293574e44dfa8b38ed8b1978ffd0`
- Merge Base: `acb8985930ccce49b632cdca22b92f5b237e35bf`
- Current protected-HEAD/latest-Personal divergence: 153 ticket-branch-only commits / 4 Personal-only commits.
- Bootstrap Blockers: delivery stopped after the v1.4.57 non-mutating preview found a two-test semantic junction; no actual refresh merge has started.
- Notes For Downstream Agents: the latest refresh used a non-mutating merge-tree preview. No refresh merge or production edit has begun. Preserve checkpoint `95c63b5a...`, all delivery/review-owned dirty artifacts/evidence, and both source histories.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `integration-strategy-analysis.md` | Strategy/authority/verification supplement | Options, merge classification, semantic authority matrix, construction adaptation | Requirements, design | REQ-001–REQ-007; AC-001–AC-011 | Complete | Intended behavior; approved by delegated technical direction | Architecture review |
| `merge-attempt.log` | Raw no-commit merge transcript | Exact Git conflicts | Investigation, design | REQ-002; AC-002 | Complete | N/A evidence | Retain |
| `merge-conflict-inventory.txt` | Classified conflict paths | Status/category counts and exact paths | Investigation, design | REQ-002, REQ-006; AC-002, AC-010 | Complete | N/A evidence | Implementation consumes |
| `branch-overlap-inventory.txt` | Common changes from merge base | 227 changed-both paths and canonical subset | Investigation, design | REQ-002, REQ-006; AC-002, AC-010 | Complete | N/A evidence | Implementation audits all canonical paths |
| `integration-path-inventory.txt` | Historical cumulative target disposition inventory | Implemented add/changed-both/remove/regenerate sets, dependencies, removals, and SR-007 provider-contract changes; points to the separate round-4 current inventory | Design | REQ-003–REQ-011; AC-003–AC-029 | Implemented through SR-007; SR-008 addendum linked | N/A evidence | Implementation consumes round-4 inventory for current merge |
| `integration-runtime-contracts.md` | Exact implemented integration seam contract | Host lifecycle, tool readiness, activation/provisioning DAG, launch store/direct use, physical scope/migration, provider-granularity per-leaf resolution, credential authority, settled Studio state and verification | Requirements, design | REQ-004–REQ-011; AC-005–AC-029 | Implemented through SR-007; unchanged by SR-008 | Intended behavior precision within approved scope | Retain |
| `latest-base-refresh-design-analysis.md` | Latest-base refresh semantic contract | New ref evidence, reachability, authority, current-model/error spines, 11-conflict decisions, marker-free overlaps, exact inventory, and verification delta | Requirements, design | REQ-001–REQ-008; AC-001–AC-015 | Complete for SR-004 | Intended bounded integration behavior | Architecture review |
| `latest-base-refresh-conflict-report.md` | Delivery-owned blocker report | Original 31-commit ref/divergence, 11 conflicts, changed-both classification, and Design Impact rationale | Investigation, requirements, design | REQ-001–REQ-002, REQ-006–REQ-008; AC-001–AC-002, AC-010–AC-015 | Complete; preserved untouched | N/A evidence | Retain and hand off |
| `evidence/delivery/dr-004-base-refresh-and-integration.log` | Delivery-owned raw refresh evidence | Fetch, commits, paths, non-mutating preview, clean index | Investigation, requirements, design | REQ-001–REQ-002, REQ-006; AC-001–AC-002, AC-010 | Complete; preserved untouched | N/A evidence | Retain and hand off |
| `latest-base-refresh-round-2-design-analysis.md` | Current refresh semantic contract | Physical-scope/runtime/migration spines, exact conflict/overlap/file map, data transition, verification | Requirements, design | REQ-001–REQ-009; AC-001–AC-020 | Complete for SR-005 | Intended bounded integration behavior | Architecture review |
| `latest-base-refresh-round-2-conflict-report.md` | Delivery-owned DR-006 blocker report | New ref/divergence, three conflicts, nested memory/migration Design Impact rationale | Investigation, requirements, design | REQ-001–REQ-002, REQ-006–REQ-009; AC-001–AC-002, AC-016–AC-020 | Complete; preserved untouched | N/A evidence | Retain and hand off |
| `evidence/delivery/dr-006-base-refresh-and-integration.log` | Delivery-owned raw DR-006 evidence | Fetch, paths, migration audit, non-mutating preview, clean index | Investigation, requirements, design | REQ-001–REQ-002, REQ-006, REQ-009; AC-001–AC-002, AC-016 | Complete; preserved untouched | N/A evidence | Retain and hand off |
| `latest-base-refresh-round-3-design-analysis.md` | Implemented v1.4.56 semantic contract | Provider/catalog/model/credential/UI spines, five conflicts, ten overlaps, data/file/verification map, and AR-004/AR-005 corrections | Requirements, design | REQ-001–REQ-010; AC-001–AC-025 | Implemented and verified in DR-007 | Historical intended behavior now preserved | Retain |
| `evidence/solution/latest-base-refresh-round-3-merge-preview.log` | Historical non-mutating v1.4.56 evidence | Exact refs/counts/shortstats, merge tree, five conflicts, clean index and protected HEAD for SR-007 | Investigation, requirements, design | REQ-001–REQ-002, REQ-006, REQ-010; AC-016, AC-021 | Complete | N/A evidence | Retain |
| `evidence/solution/latest-base-refresh-round-3-conflict-inventory.txt` | Exact current conflict inventory | Five content-conflict paths | Investigation, design | REQ-002, REQ-006, REQ-010; AC-002, AC-021 | Complete | N/A evidence | Implementation consumes |
| `evidence/solution/latest-base-refresh-round-3-overlap-inventory.txt` | Exact current changed-both inventory | Ten semantic overlap paths | Investigation, design | REQ-002, REQ-006, REQ-010; AC-002, AC-021 | Complete | N/A evidence | Implementation audits all ten |
| `evidence/solution/latest-base-refresh-round-3-path-inventory.txt` | Full previous-target-to-current path evidence | 2,194 paths with add/modify/delete status, including the isolated prototype subtree | Investigation, design | REQ-002, REQ-006, REQ-010; AC-009–AC-011, AC-021–AC-025 | Complete | N/A evidence | Implementation/source review consume |
| `latest-base-refresh-round-4-design-analysis.md` | Current v1.4.57 semantic contract | Controlled workspace owner, provider-form junction, two conflicts/two overlaps, no-migration decision, exact inventory and proof | Requirements, design | REQ-001–REQ-002, REQ-007, REQ-010–REQ-011; AC-001–AC-002, AC-026–AC-029 | Complete for SR-008 | Intended bounded integration behavior | Architecture review |
| `latest-base-refresh-round-4-conflict-report.md` | Delivery-owned DR-008 blocker | v1.4.57 refs, two conflicts, semantic junction and stop rationale | Investigation, requirements, design | REQ-001–REQ-002, REQ-007, REQ-011; AC-001–AC-002, AC-026 | Complete; preserved untouched | N/A evidence | Retain and hand off |
| `evidence/delivery/dr-008-base-refresh-and-integration.log` | Delivery-owned raw DR-008 evidence | Fetch, commits, paths, merge preview, clean index | Investigation, requirements, design | REQ-001–REQ-002, REQ-007, REQ-011; AC-001–AC-002, AC-026 | Complete; preserved untouched | N/A evidence | Retain and hand off |
| `evidence/solution/latest-base-refresh-round-4-{merge-preview.log,conflict-inventory.txt,overlap-inventory.txt,path-inventory.txt}` | Solution-owned v1.4.57 evidence | Stable ref, 95 paths, two conflicts, two overlaps, protected HEAD and clean index | Investigation, requirements, design | REQ-001–REQ-002, REQ-007, REQ-011; AC-001–AC-002, AC-026–AC-029 | Complete | N/A evidence | Architecture/implementation consume |

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
| 2026-08-24 | Delivery evidence | `latest-base-refresh-round-2-conflict-report.md`; `evidence/delivery/dr-006-base-refresh-and-integration.log` | Measure newest refresh without mutating DR-005 checkpoint | Personal advanced five commits to `a00f0d07d...`; divergence 145/5; preview has three content conflicts and zero actual unmerged index entries | Design-led resolution before merge/build |
| 2026-08-24 | Git/source revalidation | `git log 7edfb..origin/personal`; `git diff --name-status`; `git merge-tree --write-tree HEAD origin/personal`; changed-both intersection | Reconfirm exact target and marker-free overlaps | Newest ticket finalizes nested history; exactly six changed-both paths, of which three conflict and three auto-merge | Record every resolution |
| 2026-08-24 | Code | newest Personal `team-run-physical-scope.ts`, `team-run-context.ts`, root/subteam factories, execution index, mixed member/task registries | Trace physical scope end to end | Root scope has no ancestors; each containing child TeamRun appends its ID; configured/task/subteam members inherit exact context | Adopt current Personal domain shape unchanged |
| 2026-08-24 | Code | current `create-application-run-services.ts`, `MixedTeamRunBackendFactory`, `MixedTeamManager`, `MixedAgentMemberHandle` and newest Personal conflict side | Reconcile application graph-local dependencies with new scope | Recursive team-manager closure already preserves one graph-local manager/session/memory/context family; only leaf memory coordinate conflicts | Keep injection/cleanup; use complete physical scope |
| 2026-08-24 | Code/data | newest Personal `TeamAgentMemoryLayoutAppDataMigration`, migration registry/runner, TeamRun V1 package/index, dependent snapshot migrations | Decide data transition and ordering | Required `ANYTIME` migration follows TeamRun V1, moves whole nested AgentRun dirs, validates, warns/fails without overwrite; both host starters already invoke common migration phase | `Migration Required` only for affected old flat nested memory |
| 2026-08-24 | Test/evidence | newest Personal nested restart ticket under `tickets/done/nested-team-history-restart-hydration`; conflict-test three-way diffs; three marker-free merged files | Determine proof and semantic compatibility | Personal has real nested restart/migration/memory/frontend proof; ticket tests own atomic activation/platform binding/scoped cleanup | Reconcile focused tests and rerun both baselines; no new product package solely for fixtures |
| 2026-08-24 | Implementation reroute | mandatory `git fetch`, ref/path measurement from `a00f0d...` to `3ab4946c7...` | Detect stale reviewed target before merge | Personal advanced eleven more commits; 256 paths and completed provider-catalog/API-key refactor intersect application model/readiness owners | Stop without merge; renew solution analysis |
| 2026-08-24 | Historical SR-006 Git/source evidence | `git rev-list`, `git diff --shortstat/name-status`, changed-both intersection, `git merge-tree --write-tree HEAD origin/personal`, `git ls-files -u` | Re-measure then-current v1.4.56 target safely | That target was sixteen commits beyond its integrated base; preview had five conflicts and ten changed-both paths; index remained clean and HEAD protected | Retained historical evidence; implemented through DR-007 |
| 2026-08-24 | Git/history confirmation | `git log 91134347..3ab4946c7`; `git diff --name-status/shortstat` | Determine whether the final v1.4.56 ref movement changes the semantic design | Two additional commits change only the completed API-key ticket's delivery records/evidence (six paths), with no production/runtime delta and no conflict/overlap change | Update the immutable target and counts; preserve the accepted conflict/ownership decisions while correcting AR-004/AR-005 in SR-007 |
| 2026-08-24 | Mandatory final refresh | `git fetch origin personal`; `git log/diff 3ab4946c7..c5b87df4d`; root `pnpm-workspace.yaml`; isolated prototype `package.json`; fresh `merge-tree` and changed-both intersection | Confirm whether Personal movement after the AR-004/AR-005 correction reopens production design | Six commits change 1,942 paths: 1,934 additions under `ui-prototypes/autobyteus-web-prototype` and eight ticket/delivery paths; root workspace membership and shared production/runtime source are unchanged. Current total delta is 2,194 paths, while conflicts remain five and changed-both remains ten | Update current ref/count/evidence; accept prototype byte-for-byte as isolated Personal-owned content; no new application-framework design or test owner |
| 2026-08-24 | Code | Personal `model-catalog-service.ts`, `dynamic-model-source-lifecycle.ts`, `model-availability-service.ts`, endpoint/model parsers, `available-llm-construction.ts` and tests | Trace current catalog/availability authority | Static initialization is network-free; selected dynamic identifiers resolve to a provider-granularity ensure followed by an exact registration/endpoint post-check; old aggregate/cached owners are deleted | Application policy delegates to that provider owner and the validator performs a fresh exact leaf lookup; no duplicate/eager catalog |
| 2026-08-24 | Code | Personal `llm-provider-service.ts`, provider domain/catalog, credential catalog and GraphQL/store contracts | Trace credential/catalog split and identity | Credential settings contain descriptor + configured status but no model arrays; catalog snapshots expose `ownerProvider`; model `provider_id` is not always serving credential owner | Adapt credential readiness by `ModelInfo.runtime`; no discovery in credential read |
| 2026-08-24 | Code | current application model policy/guard/host validator/credential adapter/construction and Personal model availability | Trace read/Save/direct-run path | Current static-only guard can falsely reject dynamic identifiers; current credential adapter calls deleted `listProviderSettings` | Add static/dynamic classification and safe unavailable result in current policy; inject exact Personal owners |
| 2026-08-24 | Code/test | both sides of `useRuntimeScopedModelSelection.ts`, new Personal Pinia store/test, three-way diffs for Qwen/catalog/task delegation overlaps | Trace Studio and test contract | Personal supplies callable runtime snapshot getters and asynchronous missing-source ensure; ticket supplies inherited/no-default runtime; both are required | Define exact combined composable and test cases |
| 2026-08-24 | Architecture review / source re-read | `design-review-report.md` `ARCH-REV-006` AR-004; Personal `model-availability-service.ts`, `model-catalog-service.ts`, provider implementations and store tests | Verify the discovery unit and return contract rather than rely on SR-006 wording | A selected identifier resolves to one provider ID; that provider ensure may enumerate all configured hosts and, for AutoByteus, LLM/audio/image sources. Exact identifier/endpoint registration is checked only after provider-level work | Replace endpoint/source-only promises with selected-provider ensure plus exact post-check; add provider-granularity proof |
| 2026-08-24 | Architecture review / source re-read | Personal `llmProviderConfig.ts`, `llmProviderConfigStore.test.ts`, `useRuntimeScopedModelSelection.spec.ts` | Trace normal dynamic-provider failure through the real UI owner | Provider mutation records `ERROR`/`STALE_ERROR` and rejects individually; `ensureMissingDynamicProviders` awaits them with `Promise.allSettled`, so the aggregate fulfills and the composable must re-read store state | Make snapshot status the normal failure authority; retain aggregate catch only for defensive unexpected rejection |
| 2026-08-24 | Architecture review / source re-read | current `application-launch-host-capability-validator.ts`; baseline builder per-leaf output; AR-005 MP-ARCH-006-002 | Verify multi-leaf mutation/read order | Validator caches `listLlmModels(runtimeKind)` after leaf A; ensuring a distinct source for leaf B can mutate the same runtime registry while the cached list stays stale | Remove runtime-only model cache; after every leaf's policy/ensure, perform a fresh exact model lookup and pass that `ModelInfo` to credential resolution |

## SR-008 v1.4.57 Investigation Delta

| Date | Source / Method | Question | Observation | Design Consequence |
| --- | --- | --- | --- | --- |
| 2026-08-24 | `git fetch origin personal`; refs/log/divergence | Is the delivery target still current? | `origin/personal` remains `389748b0b...` (v1.4.57), four commits beyond integrated `52b4be02e...`; ticket is 153 ahead / 4 behind. | Review one immutable target; re-fetch immediately before implementation. |
| 2026-08-24 | `git diff 52b4be02e...389748b0b`; path/status inventory | How broad is the new base delta? | 95 paths: 81 adds, 14 modifications. Modified production web is limited to `WorkspaceSelectionState`, selector/forms/panel plus adjacent tests/docs/version metadata; additions are mainly the completed Personal ticket package/evidence. | Accept Personal-owned non-overlap; keep semantic work at the two-test junction. |
| 2026-08-24 | `git merge-tree --write-tree HEAD origin/personal`; changed-both intersection | What actually conflicts? | Exactly two conflicts and two changed-both paths: `AgentRunConfigForm.spec.ts` and `TeamRunConfigForm.spec.ts`. Index remains clean and protected HEAD unchanged. | No production conflict or broad application-framework refactor. Resolve both tests semantically. |
| 2026-08-24 | Three-way test diff | What must each conflict retain? | Ticket side requires callable `providersWithModelsForSelection`, `providerSnapshots`, and `ensureMissingDynamicProviders`; Personal requires controlled `modelValue`/`update:modelValue`, complete `workspaceSelection`, and exact relay assertions. | Combined fixtures retain both; no whole-side selection. |
| 2026-08-24 | Auto-merged tree read of `WorkspaceSelector`, forms, `RunConfigPanel` | Do production owners compose? | Personal's complete-state relay and panel owner apply cleanly. Provider/model selection remains in `RuntimeModelConfigFields -> useRuntimeScopedModelSelection`; workspace selection remains in panel/selector. | Accept production auto-merge after focused review; no new owner or adapter. |
| 2026-08-24 | Current composable/store read | Is `providerSnapshots` optional in the conflicted fixtures? | No. `useRuntimeScopedModelSelection` reads source snapshots when publishing initial and settled runtime state. | Both combined fixtures must retain the callable snapshot getter even if a narrow model-option case could pass without exercising failure status. |
| 2026-08-24 | Personal completed ticket requirements/design/tests | Does the workspace change require persisted-data transformation? | `WorkspaceSelectionState` is transient; existing workspace registry, Team/Agent configuration, and run history remain the canonical persisted owners. | `Directly Usable — No Migration`; preserve existing cumulative migrations. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Refresh the verified ticket branch to latest Personal | DR-007 integrates/validates v1.4.56; v1.4.57 is four commits ahead and not yet merged | One additional history-preserving semantic merge is required; Personal itself remains untouched | Current refs, divergence, merge-tree preview |
| BEH-002 | User | Develop/build maintained application | DR-007 has devkit scripts, canonical source, and verified build-once Studio/standalone packages | v1.4.57 does not change this path | Current package scripts/tree and DR-007 evidence |
| BEH-003 | System | Application launches agent/team and consumes events | DR-007 current source combines Personal prepare/publish activation, RootTeamRun/rooted identity, and application-scoped runtime services | Preserve unchanged | Current source and API-REV-008/DR-007 evidence |
| BEH-004 | User/Contract | Package defaults or Studio launch override | DR-007 current launch resolver composes package defaults/sparse overrides with current Personal model availability/contracts | Preserve unchanged | App configs, launch source, API-REV-008 |
| BEH-005 | Operational | Trial current v1.4.57 merge | Git identifies two conflicts and the same two changed-both paths, both form tests | Whole-side resolution would lose either controlled workspace or provider-granular fixture behavior | Round-4 merge and overlap artifacts |
| BEH-006 | Contract | Existing tests/reports | DR-007 validates the integrated v1.4.56 state; Personal's completed ticket validates v1.4.57 workspace behavior separately | No evidence yet validates their combined commit | Prior final reports, Personal ticket proof, current task probe |
| BEH-007 | User/Contract | Provider failure in native or application execution | Integrated and reverified through SR-007/DR-007 | Safe native metadata and closed message-only application projection remain verified | Current source/reports/evidence |
| BEH-008 | System/Operational | Application executes/restores a nested configured/task team; host upgrades an existing data root | DR-007 current source combines graph-local activation/session/memory, exact physical scope, registered migration, restart hydration, and cleanup | Preserve unchanged | Current source, API-REV-008/DR-007 evidence |
| BEH-009 | System/User | Application readiness/Save/direct launch for AutoByteus leaves, or Studio model editing | DR-007 current source uses split credentials, provider-granularity dynamic discovery, exact post-check, fresh per-leaf model lookup, authority-equivalent credential caching, and snapshot-settled UI state | Preserve unchanged beside controlled workspace state | Current source, ARCH-REV-007, API-REV-008/DR-007 evidence |
| BEH-010 | User/System | Studio Agent/Team draft selects New workspace, receives unrelated configuration/provider edits or delayed workspace discovery, then launches | DR-007 forms use current provider-granular fixtures; Personal v1.4.57 changes panel/selector/forms to one controlled workspace state | Complete workspace state must survive and register before launch while provider rows/snapshots/settlement remain callable and independent | DR-008 report, round-4 merge evidence, three-way test diffs, auto-merged production read, Personal completed ticket |

## Design Health Assessment Evidence

- Change posture: `Refactor` / integration.
- Candidate root cause classification: `Boundary Or Ownership Issue` in integration coverage; no production owner defect is found in SR-008.
- Refactor posture evidence summary: a semantic merge is required, but production refactoring is not. Personal's workspace owner and the ticket's provider owner compose; only the two conflicted test fixtures and complete verification need integration.

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
- Launch-row decision: `Directly Usable — No Migration`; evidence and examples are in `integration-runtime-contracts.md` section 3.
- New affected subject: pre-`a00f0d` nested Team Agent memory may physically reside in the old flat root-TeamRun directory although current runtime derives an ordered containing-TeamRun path.
- Representative path evidence: direct-root scope remains `{rootTeamRunId, []}`; nested configured/task agents use `{rootTeamRunId, [containingTeamRunId, ...]}`. `TeamExecutionIndex.getTeamRunPhysicalScope(containingTeamRunId)` supplies the current ordered scope.
- Nested-memory decision: `Migration Required` for affected old flat nested AgentRun directories. Direct use would make current runtime miss persisted memory; rebuild/discard is unacceptable user-data loss.
- Migration owner/mechanics: existing `AppDataMigrationRunner` invokes registered `TeamAgentMemoryLayoutAppDataMigration` after TeamRun V1. It performs deterministic whole-directory rename and postcondition validation, never per-file merge or runtime dual read.
- Completion/recovery: unmaterialized/current/direct-root cases are explicit skips; source-plus-target conflicts are preserved with warnings; unsupported/failed paths are recorded; the existing ledger/`ANYTIME` policy owns retry. Both hosts use the same phase before application readiness.
- Provider persisted subjects: credentials, custom-provider rows, provider host settings, and saved model identifiers retain their current physical schemas and are directly usable. Personal's new dynamic source lifecycle and model snapshots are in-memory, reconstructed on demand, and require no new migration or application-local persistence.

## Constraints / Dependencies / Compatibility Facts

- Source refs are immutable inputs.
- Personal current lifecycle and provider behavior must not be overwritten by older feature source.
- Feature dual-host public behavior must not be silently dropped because Personal lacks it.
- Derived paths must be regenerated, not hand-authored.
- No compatibility aliases or source-level version suffixes for in-scope contracts.
- No external `/mcp/gateway` in standalone; both hosts use internal scoped `/mcp/agent-tools/:sessionId`.

## Open Unknowns / Risks

- The implementation may discover an additional concrete interaction in the 2,194-path Personal delta; it is a bounded implementation correction only if it remains within approved BEH/REQ/AC scope. Any new owner, persistence change, startup policy, product behavior, or production dependence on the isolated prototype returns as Design/Requirement Impact.
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

## SR-005 Nested Physical-Scope Refresh Findings

### Runtime Authority

1. `TeamRunPhysicalScope` is an immutable domain value owned by team execution, not by application platform or memory persistence.
2. Root construction creates an empty ancestor list; each child TeamRun construction appends the child's `teamRunId`; `TeamRunContext` rejects a scope whose last containing ID differs from `teamRunId`.
3. `MixedAgentMemberHandle` remains the leaf activation owner. The combined target uses the injected `AgentMemoryLocationService` with `{...teamContext.physicalScope, agentRunId}` and the injected `AgentToolMcpSessionManager` for exact run-session revocation.
4. The application `createTeamManager` recursion remains the dependency authority: root and every nested manager receive the same graph-local run/session/memory/context/workspace family. No new graph, service, proxy, or branch is needed.
5. Prepared activation, durable publication, platform binding, abort/quarantine, task release-after-commit, and termination remain unchanged.

### Migration And History Authority

- Newest Personal owns the physical-scope type, root/child propagation, TeamRun index reconstruction, nested history hydration, memory sync semantics, settled historical-task visibility, and registered memory-layout migration.
- The migration is part of the existing host startup migration phase. It is neither application business logic nor an application-platform lifecycle phase.
- Runtime code reads only the canonical current physical path. Historical flat-layout knowledge remains isolated inside the migration.
- Direct and skip-version upgrades use the same ordered registry: TeamRun V1 first, Team Agent memory layout next, then dependent snapshot migrations. Fresh/current roots are safe no-ops.

### Conflict And Overlap Result

- Conflict `mixed-agent-member-handle.ts`: combine latest physical scope with ticket injection and exact cleanup; no whole-side selection.
- Conflict `mixed-agent-member-handle-memory-invariant.test.ts`: latest root/nested scope fixtures plus ticket private prepared activation/platform-binding assertions and explicit injected services.
- Conflict `mixed-team-member-registry-task-agent-memory.test.ts`: latest nested task-agent scope plus ticket seal/durability/commit/release and exact dependency assertions.
- Marker-free execution-tree location service: retain the auto-merged current scope lookup plus stored-only construction.
- Marker-free cleanup and termination tests: retain added physical-scope fixtures and exact application session/termination assertions.

## SR-006/SR-007 Personal v1.4.56 Provider/Catalog Refresh Findings

### Current Provider Authority

1. `ModelCatalogService` owns process-local snapshots and provider-keyed dynamic lifecycle; factories own registered model rows. Static reads call initialization only and do not contact remote providers.
2. `ModelAvailabilityService` parses canonical custom/host-scoped identifiers, resolves one provider ID, invokes that provider's catalog ensure, and then verifies exact identifier/endpoint registration. Ollama/LM Studio provider work enumerates configured hosts; AutoByteus provider work settles its LLM/audio/image source operations; only a custom provider record is endpoint-local.
3. `LlmProviderService` now separates network-free credential settings from model snapshots. Deleted aggregate/cached provider/media services are not valid compatibility targets.
4. `ApplicationLaunchConfigurationService`, its current policy/guard/host validator, and `ApplicationRunBindingLaunchService` remain the application authority for package/saved/Save/direct-run outcomes.
5. The correct seam is consumption, not duplication: static selection uses exact membership; canonical dynamic selection calls Personal provider-granularity availability and the validator immediately performs a fresh exact lookup for that leaf; serving runtime determines credential owner.

### Studio Selection Authority

- Personal's Pinia store owns runtime-scoped snapshots and missing dynamic-provider ensures.
- The ticket composable remains the owner of sparse application runtime precedence. The merged behavior is stored -> inherited -> optional default, with no request for explicit null/no-default.
- Initial static/current snapshot rows are published before dynamic ensure settles. Individual provider failure writes safe `ERROR`/`STALE_ERROR` source state and is consumed by `Promise.allSettled`; the aggregate normally fulfills, after which the composable re-reads the same runtime bucket. An aggregate rejection branch is defensive only.

### Current Conflict And Overlap Result

- Five conflicts: the three SR-005 physical-scope paths, Qwen GraphQL E2E, and current model-catalog service test.
- Ten changed-both paths: those five plus execution-tree location, mixed task-delegation E2E, MCP cleanup, termination, and runtime-scoped model selection.
- The six commits after `3ab4946c7...` add only the isolated `ui-prototypes/autobyteus-web-prototype` tree and eight ticket/delivery paths. The prototype is not listed by root `pnpm-workspace.yaml`, has no changed-both or conflict path, and changes no application-framework authority; the merge must preserve it exactly without importing it into production or root verification.
- Qwen proof uses current credential/catalog GraphQL contracts while retaining exact current GLM inventory.
- The current model-catalog test replaces the retired aggregate-owner test; existing supported-model and GraphQL provenance tests retain current model inventory proof.
- The complete per-path decision ledger is in the SR-007-revised round-3 supplement; no whole-side conflict resolution is authorized.

## Notes For Architecture Reviewer

`SR-008` is the current normative delta. Review `latest-base-refresh-round-4-design-analysis.md` for the exact v1.4.57 two-test resolution, DS-017 controlled workspace spine, no-migration decision, production auto-merge disposition, and focused/full verification matrix. SR-004–SR-007 are implemented historical authority at protected DR-007 checkpoint `95c63b5a...`; their physical-scope, provider, application-platform, dual-host, package, and cleanup outcomes remain fixed. No v1.4.57 merge, production edit, or Electron rebuild has begun; delivery-owned dirty artifacts/evidence remain untouched.
