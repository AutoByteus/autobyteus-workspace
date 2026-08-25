# Investigation Notes — Universal Application Framework Latest-Personal Integration

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: `ARCH-REV-012` accepted SR-012's task-ownership/session/native-tool direction and narrowed `AR-007` to one construction-completeness issue. SR-013 exhaustively closes the general/application constructor, executable callback-default, fixture, and omission inventory and is prepared for architecture re-review.
- Investigation Goal: Preserve the accepted one-catalog/two-execution-scope design while making every Team-member task-delegation call resolve only through the exact RootTeamRun that created that member and its authenticated session.
- Scope Classification: `Large`.
- Scope Classification Rationale: Large cumulative integration; current SR-013 is a bounded medium construction-completeness correction. SR-011 and SR-012's ownership design remain accepted. Production changes stay inside RootTeamRun member-context construction, task-delegation resolver propagation, the existing general/application mixed-Team constructors, specialized session capability construction, the existing task service/router/adapters, bound AutoByteus task-tool creation, and focused guards/tests. No wire, schema, provider, Team V2, host, route, or manager redesign is required.
- Scope Summary: Preserve the implemented v1.4.58 dual-host baseline and accepted canonical definition family. Replace the task adapter’s ambient `getTeamRunService()` lookup with an exact root resolver created by the owning RootTeamRun, propagated through the member context, and projected into Team-member MCP sessions.
- Primary Questions To Resolve: Which exact production and test construction sites must carry the accepted root-local resolver; how is the general supervisor's custom Team manager kept scope-correct; how is the executable mixed-factory no-op callback seam removed without forbidding context-only factory use; and what occurrence/omission proof prevents a later unbound resolver path?

## Request Context

The finalized Universal Application Framework branch was completed, reviewed, tested, and pushed. The user reports that `origin/personal` has since undergone a very large refactor and asks for the easiest safe way to make the feature branch based on latest Personal. The user explicitly permits a separate worktree and trial merge.

## Environment Discovery / Bootstrap Context

- Project Type: `Git` super-repository.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration`
- Current Branch: `codex/universal-application-framework-latest-personal-integration`
- Current Worktree / Working Directory: same as task workspace root.
- Bootstrap Base Branch: historical `origin/personal@8ef282b...`; current target `origin/personal@fb1335867a4223b2499e4513f58c609b6ac33ab4` is already integrated through merge `52ab1fe6f...`.
- Remote Refresh Result: v1.4.58 merge completed and ancestry succeeds at current reviewer HEAD `a5a6131531658e8a8a323989b1863b7202464f11`. CRR-020 is a post-integration design reroute.
- Task Branch: dedicated integration branch containing the completed semantic merge and current implementation/review artifacts.
- Expected Base Branch: `origin/personal`.
- Expected Finalization Target: the ticket branch only unless the user later explicitly requests Personal integration.
- Feature Input: `origin/codex/universal-application-framework-proposal-analysis@a5ffd289aa58293574e44dfa8b38ed8b1978ffd0`
- Merge Base: `acb8985930ccce49b632cdca22b92f5b237e35bf`
- Current HEAD / integrated Personal: `a5a6131531658e8a8a323989b1863b7202464f11`; `fb1335867a4223b2499e4513f58c609b6ac33ab4` is an ancestor.
- Bootstrap Blockers: none. Implementation is blocked only by ARCH-REV-012 / AR-007 and the required SR-013 architecture re-review.
- Notes For Downstream Agents: preserve all delivery/review/API-E2E-owned dirty artifacts and evidence. Do not repeat or rewrite the completed v1.4.58 merge. Preserve the accepted SR-011 catalog and SR-012 task-ownership designs and implement only after SR-013 passes architecture review.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `integration-strategy-analysis.md` | Strategy/authority/verification supplement | Completed merge authority plus SR-011 canonical catalog and SR-012/SR-013 member/session-bound task-delegation addenda | Requirements, design | REQ-001–REQ-007; AC-001–AC-011, AC-035–AC-036 | Revised for SR-013 | Intended behavior; approved preserved-behavior correction | Architecture re-review |
| `merge-attempt.log` | Raw no-commit merge transcript | Exact Git conflicts | Investigation, design | REQ-002; AC-002 | Complete | N/A evidence | Retain |
| `merge-conflict-inventory.txt` | Classified conflict paths | Status/category counts and exact paths | Investigation, design | REQ-002, REQ-006; AC-002, AC-010 | Complete | N/A evidence | Implementation consumes |
| `branch-overlap-inventory.txt` | Common changes from merge base | 227 changed-both paths and canonical subset | Investigation, design | REQ-002, REQ-006; AC-002, AC-010 | Complete | N/A evidence | Implementation audits all canonical paths |
| `integration-path-inventory.txt` | Historical cumulative target disposition inventory | Implemented merge inventory plus exact SR-011 and SR-012/SR-013 Add/Modify/Rename/Remove/test sets | Design | REQ-003–REQ-012; AC-003–AC-036 | Revised for SR-013 | N/A evidence | Implementation consumes current addenda only |
| `integration-runtime-contracts.md` | Exact integration seam contract | Passed host/lifecycle/activation/launch/physical-scope/provider/workspace/Team V2 contracts plus SR-011 host definition/run ownership section 9 and SR-012/SR-013 task-delegation scope section 10 | Requirements, design | REQ-004–REQ-012; AC-005–AC-036 | Design-ready SR-013 | Intended behavior precision within approved scope | Architecture re-review |
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
| `latest-base-refresh-round-4-design-analysis.md` | Historical v1.4.57 semantic contract | Controlled workspace owner, provider-form junction, two conflicts/two overlaps, no-migration decision, exact inventory and proof | Requirements, design | REQ-001–REQ-002, REQ-007, REQ-010–REQ-011; AC-001–AC-002, AC-026–AC-029 | Implemented and verified in DR-009 | Historical intended behavior now preserved | Retain |
| `latest-base-refresh-round-4-conflict-report.md` | Delivery-owned DR-008 blocker | v1.4.57 refs, two conflicts, semantic junction and stop rationale | Investigation, requirements, design | REQ-001–REQ-002, REQ-007, REQ-011; AC-001–AC-002, AC-026 | Complete; preserved untouched | N/A evidence | Retain and hand off |
| `evidence/delivery/dr-008-base-refresh-and-integration.log` | Delivery-owned raw DR-008 evidence | Fetch, commits, paths, merge preview, clean index | Investigation, requirements, design | REQ-001–REQ-002, REQ-007, REQ-011; AC-001–AC-002, AC-026 | Complete; preserved untouched | N/A evidence | Retain and hand off |
| `evidence/solution/latest-base-refresh-round-4-{merge-preview.log,conflict-inventory.txt,overlap-inventory.txt,path-inventory.txt}` | Solution-owned v1.4.57 evidence | Stable ref, 95 paths, two conflicts, two overlaps, protected HEAD and clean index | Investigation, requirements, design | REQ-001–REQ-002, REQ-007, REQ-011; AC-001–AC-002, AC-026–AC-029 | Complete | N/A evidence | Architecture/implementation consume |
| `latest-base-refresh-round-5-design-analysis.md` | Integrated v1.4.58 normative semantic contract | Hierarchical Team/application launch, exact effective-to-wire mapping, V2 migration, all conflict/overlap/generated-output decisions, data, file, sequence, and proof map | Requirements, design | REQ-001–REQ-012; AC-001–AC-035 | Implemented and source-reviewed through SR-010 | Historical intended behavior now preserved by SR-012 | Retain |
| `latest-base-refresh-round-5-conflict-report.md` | Delivery-owned DR-010 blocker | v1.4.58 refs, 633 paths, 13 content and 30 modify/delete conflicts, 50 overlaps, stop rationale | Investigation, requirements, design | REQ-001–REQ-002, REQ-004–REQ-007, REQ-009–REQ-012; AC-030–AC-035 | Complete; preserved untouched | N/A evidence | Retain and hand off |
| `evidence/delivery/dr-010-base-refresh-and-integration.log` | Delivery-owned raw DR-010 evidence | Fetch, commits, paths, non-mutating merge preview, clean protected state | Investigation, requirements, design | REQ-001–REQ-002, REQ-006–REQ-007; AC-030, AC-035 | Complete; preserved untouched | N/A evidence | Retain and hand off |
| `evidence/solution/latest-base-refresh-round-5-{merge-preview.log,conflict-inventory.txt,overlap-inventory.txt,path-inventory.txt}` | Solution-owned v1.4.58 evidence | Stable ref, 633 paths, exact 13/30/50 inventories, protected HEAD and clean index | Investigation, requirements, design | REQ-001–REQ-002, REQ-006–REQ-007, REQ-012; AC-030–AC-035 | Complete | N/A evidence | Architecture/implementation consume |

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

| 2026-08-25 | Architecture review/source trace | `ARCH-REV-011` / `AR-007`; `runtime-agent-tool-exposure.ts`; `agent-tools-mcp-runtime.ts`; session types/service/registry; task adapter/service/router; `MemberTeamContext`; mixed Team callbacks/handles; `RootTeamRun`; AutoByteus task-tool resolution | Trace the reachable application `delegate_task` authority and find the smallest acyclic correction | Every Team member automatically receives `delegate_task`; the other task lifecycle tools retain their existing configured/task-member exposure. The MCP adapter captures one service whose default router calls process-general `getTeamRunService()`. The exact RootTeamRun already owns task lifecycle and already creates root-bound message/platform callbacks during materialization. A root resolver can follow that same owned callback path into immutable member context and a specialized Team-member session capability, eliminating the global lookup without a new manager, route, catalog, generic container, or late binding. Native AutoByteus task tools must consume the same bound member resolver rather than reconstruct only identity from process custom data. | Define SR-012 exact contracts, inventory, failure semantics, and dual-scope proof |
| 2026-08-25 | Architecture re-review plus exact source occurrence audit | `ARCH-REV-012` / narrowed `AR-007`; `rg` over all production/tests for `new MixedTeamManager`, `new MixedTeamRunBackendFactory`, `MemberTeamContextBuilder.build`, direct `new MemberTeamContext`, and `MixedTeamRunCallbacks` | Prove whether SR-012's propagation inventory covers the supported general path and every newly required construction input | Production has three `MixedTeamManager` constructors (default mixed factory, general supervisor, application run services), three mixed-factory constructors (the same two assembly roots plus the cached default), one builder call, and one direct context constructor. Tests add three direct managers, eight direct factories, five builder calls, four direct contexts, and one typed fake callback factory. The general supervisor and application custom managers both must forward the resolver. `createBackend`/`restoreBackend` currently permit omitted callbacks through `noopCallbacks`; that executable default contradicts the no-default resolver invariant. Two context-only subteam-factory tests may retain `new MixedTeamRunBackendFactory()` because they call only `buildTeamRunContext` and cannot materialize an executable root. | Define SR-013 exact occurrence table, remove `noopCallbacks`, require callbacks for executable factory methods, update all affected fixtures, and add current-tree occurrence plus omission/null/undefined guards |

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

| 2026-08-25 | Delivery evidence | `latest-base-refresh-round-5-conflict-report.md`; `evidence/delivery/dr-010-base-refresh-and-integration.log` | Measure v1.4.58 without mutating DR-009 checkpoint | Personal advanced 38 commits from integrated `8a4c3868c...`; preview has 13 content and 30 generated-output modify/delete conflicts across 50 changed-both paths; index remains clean | Design-led resolution before merge/build |
| 2026-08-25 | Git/source revalidation | `git fetch origin personal`; `git rev-parse`; `git rev-list`; `git diff`; `git merge-tree --write-tree`; generated-output inventory scripts | Reconfirm stable target and exact conflict classes | Target remains `fb1335867...`; delta is 633 paths; protected HEAD `c6d74710a...` unchanged; no actual merge or unmerged entry | Stop/reanalyse if ref advances |
| 2026-08-25 | Personal completed-ticket/source | hierarchical Team launch docs, SDK `launch-profile.ts`, `team-definition-topology-planner.ts`, `team-run-service.ts`, identity allocator, TeamRun V2 schemas/catalog/history, V2 app-data migration and registry | Recover current semantic owners | Every Team/Agent selection must be complete; planner validates exact topology before any ID allocation; current runtime/history are V2-only; migration reconstructs Team defaults from direct coordinators and preserves binding | Map application effective Team scopes to these owners |
| 2026-08-25 | Ticket application source | launch baseline/configuration/host validators, SDK/backend SDK, run-binding service, maintained package Team/Agent defaults, application construction | Identify current boundary mismatch | Current effective Team configuration and SDK carry leaves only; run binding allocates root Team ID; maintained root Teams lack complete defaults although leaves have Codex/Luna | Extend Team variant to scopes + leaves; remove application allocation |
| 2026-08-25 | Web/tests | Personal hierarchical Agent/Team/member editors and stored view; ticket workspace/provider/null-runtime corrections; 13 conflicts and seven auto-merges | Define combined UI/test contract | Personal hierarchy/stored behavior is current owner; ticket corrections remain required at nullable runtime, effective runtime provider ensure, controlled workspace, and provider-settlement junctions | Resolve by semantics, not side |
| 2026-08-25 | Build/package source | tracked SDK/package outputs, devkit pack/build scripts, 30 modify/delete paths | Decide generated-output authority | Ticket intentionally tracks no SDK dist or maintained package vendor/importable outputs; Personal regenerated them | Keep deleted, regenerate disposable proof only |

| 2026-08-25 | Architecture review/source reconciliation | `design-review-report.md` `ARCH-REV-009` / AR-006; current application SDK effective/wire types; Personal `TeamRunTeamConfigInput`/`TeamRunMemberConfigInput` | Resolve the sole SR-009 blocker | Reduced runtime example omitted atomic config/workspace and used undefined generic wire types. Correct mapping retains full effective provenance, carries required launch fields through concrete SDK types, and drops only explicitly diagnostic fields before Personal | Align section 8, round-5 supplement, core example, and SR metadata |

## SR-011 Canonical Host Definition-Service Investigation Delta

| Date | Source / Method | Question | Observation | Design Consequence |
| --- | --- | --- | --- | --- |
| 2026-08-25 | `code-review-report.md` CRR-020; `evidence/api-e2e/api-rev-010-definition-run-authority-failure.json`; `...source-correlation.log`; `...failing-e2e-isolated.log` | Is public definition-to-run failure product-reachable? | A real built Studio server successfully creates/lists an Agent and Team through public GraphQL, then both public run mutations fail to load those IDs. Server output initializes two Agent and two Team definition caches. | `Reachable`; preserve the public workflow and correct authority before implementation/delivery. |
| 2026-08-25 | `build-studio-server.ts`, configured GraphQL holder, Agent/Team definition/run resolvers | Where does the split occur? | General process run owners are constructed first. Definition resolvers later receive bundle-aware services, while run resolvers capture ambient process run services whose definition dependencies default to separately cached singletons. | One host definition family must be constructed/bound before general or application run owners; public run resolvers must consume configured exact services. |
| 2026-08-25 | Agent/Team definition services and all `getInstance()` callers | Can a single resolver redirect close the issue? | Thirty-one production call sites use process definition getters, including backends, allocators, management tools, preloader, history, external channels, and package refresh. Mirroring only GraphQL or one allocator would retain competing caches. | Add fail-closed exact bind/release lifecycle to the existing definition services; normal host getters return the exact bundle-aware objects. No cache synchronization/fallback. |
| 2026-08-25 | `create-application-run-services.ts` | Must run scopes be collapsed to share definitions? | Application construction already injects exact definitions into AutoByteus/Codex/Claude backends, Agent allocator/history, Team context/planner/service, while constructing its own managers/session scope/publication. | Share definition objects only. General and application run managers/session managers remain non-identical and independently stopped. |
| 2026-08-25 | `general-process-run-supervisor.ts`, AgentRunService, TeamRunService | What explicit general-process contract is missing? | The supervisor constructs managers but not the public/general run services; those services are lazily cached elsewhere and default nested definition dependencies. | Supervisor explicitly constructs/binds AgentRunService and TeamRunService with exact managers, definitions, backends, allocators, history, workspace, and sessions; public/general getters return those exact services. |
| 2026-08-25 | `application-standalone-package-validator.ts`, `create-application-definition-services.ts` caller inventory | Does pre-host package validation belong to the canonical runtime catalog? | Standalone validation needs a short-lived read-only bundle-backed Agent/Team pair before host process resources and runtime binding exist. It never publishes those services to routes, process getters, run construction, or catalog refresh. | Split reusable provider/service construction from executable-host binding. Permit exactly two governed callers: transient validation and `HostDefinitionServices`; only the latter binds the one runtime catalog. |
| 2026-08-25 | `application-definition-runtime-readiness.ts`, `startup/cache-preloader.ts`, `background-runner.ts` | Can the fire-and-forget post-ready preloader outlive the bound definition catalog? | Phase 20 already awaits `refreshCache()` on the exact Agent/Team services before listen. The later background task repeats `getInstance().getAll*` and is not joined during close, so a fast supported shutdown can race release and recreate/retain a default service. | Remove only redundant Agent/Team preload imports/blocks. Keep MCP/model background preloads; runtime definition readiness remains the sole awaited definition preload owner. |
| 2026-08-25 | history index V2 migrations | Can supported startup instantiate the wrong singleton before host assembly? | Two migrations dynamically call definition `getInstance()` only to enrich optional display names, and migrations run before Studio host definition assembly. | Replace those lookups with direct non-caching persistence readers local to migration. Preserve ID fallback/warnings; do not make migration lookup a current runtime authority. |
| 2026-08-25 | `APIE2E-F006` source trace | Is dependent-migration cascade part of SR-011? | The runner executes one requested migration; V2 remains independently retryable after the memory prerequisite. The stale test queried a V2-only view too early. | No production cascade or compatibility reader. API/E2E owns the corrected memory-retry -> V2-retry/restart -> projection sequence. |

## SR-012 Task-Delegation Execution-Scope Investigation Delta

### Supported Trigger And Current Failure

- Independent supported trigger: a user starts a Team through application business behavior in Studio or standalone and supplies input. `runtime-agent-tool-exposure.ts` automatically exposes `delegate_task` to every member; Codex/Claude receive an authenticated `/mcp/agent-tools/:sessionId` descriptor.
- Current forward path: application TeamRunService/manager -> RootTeamRun -> member context -> scoped MCP session -> shared task adapter -> cached `TaskDelegationToolService` -> `TaskDelegationToolRunRouter` -> process-general `getTeamRunService()`.
- Material consequence: the process-general manager does not own the active application RootTeamRun, so an otherwise authenticated, correctly scoped tool call cannot reach its task lifecycle. This is `Reachable`, not a synthetic possibility.

### Source-Backed Owner Decision

1. `RootTeamRun` remains the sole public operation boundary and task-lifecycle owner; its existing `delegateTask`, `submitTaskResult`, and `reviewTaskResult` methods remain unchanged.
2. `AgentTeamRunManager.materializeRoot()` already owns the exact point where one RootTeamRun is correlated with callbacks recursively supplied to root, configured subteams, task teams, configured Agents, restored Agents, and task Agents. Add one root resolver callback there, using the same root-local construction pattern as message delivery and platform binding.
3. `MemberTeamContextBuilder` creates the immutable member identity. It must require the exact resolver and place it in `MemberTeamContext`; no tool or adapter may reconstruct scope from an application ID or process singleton.
4. `AgentToolMcpSessionExecutionCapabilities` becomes a tight discriminated shape: every session has the scoped publisher; a Team-member session additionally requires the resolver derived from the exact member context. Session issuance fails if a Team sender lacks it.
5. The existing task tool service/router remain the one dispatch seam, but their resolver is required per tool context/session. The default `getTeamRunService()` construction path is removed. The MCP adapter reads only the Team-member session capability.
6. AutoByteus task tools are server-owned task tools, not native Codex/Claude file tools. Their runtime instances bind the same exact `MemberTeamContext` resolver at tool resolution time. The old custom-data-only task context parser is removed rather than kept as a fallback.

### Acyclicity And Lifecycle

```text
AgentTeamRunManager materializes RootTeamRun
  -> root-local resolver callback
  -> MemberTeamContextBuilder binds identity + resolver
  -> member AgentRun
  -> scoped MCP session projects Team-member capability
  -> shared adapter/service/router
  -> exact RootTeamRun task operation
```

The resolver closure is created inside the existing RootTeamRun materialization boundary and never requires a reverse manager lookup. It is not a service locator, generic deferred value, registry mirror, or mutable bind-once proxy. Before the root is bound, on root-ID mismatch, after RootTeamRun admission closes, or after session revocation, it returns/fails closed and performs no task mutation or restore. Normal root termination already closes the task gate and exact Agent resource cleanup revokes sessions; no new lifecycle owner is introduced.

### Rejected Alternatives

- injecting one process-general `TeamRunService` into the shared adapter;
- selecting a manager by application ID at request time;
- a global map from root ID to general/application services;
- unifying general and application Team managers;
- duplicating Agent Tools routes, catalogs, adapters, or task stores;
- an optional resolver with `getTeamRunService()` fallback;
- an inactive-root restore attempt from a still-present session;
- a generic capability container or later-bound service proxy.

## SR-013 Exact General/Fixture Propagation Audit

### Production Occurrences And Target Disposition

| Constructed boundary | Exact current occurrences | Target disposition |
| --- | --- | --- |
| `new MixedTeamManager(...)` | `mixed-team-run-backend-factory.ts`; `agent-execution/runtime/general-process-run-supervisor.ts`; `application-platform/runtime/create-application-run-services.ts` | All three pass required `taskRootResolver`. The default factory manager consumes `input.callbacks.taskRootResolver`; both custom assembly managers forward `callbacks.taskRootResolver`. No other production constructor is permitted without an inventory update. |
| `new MixedTeamRunBackendFactory(...)` | cached default in `mixed-team-run-backend-factory.ts`; general supervisor; application run services | The optional custom-manager factory option remains legitimate, but executable `createBackend`/`restoreBackend` callbacks are required. Remove `noopCallbacks`; the cached default is safe only because `AgentTeamRunManager.materializeRoot()` always supplies exact callbacks. |
| `MemberTeamContextBuilder.build(...)` | `mixed-agent-member-handle.ts` | Add required `taskRootResolver` from the handle's required options. The builder owns the only production `new MemberTeamContext(...)` and freezes the same resolver. |
| `MixedTeamRunCallbacks` construction | `AgentTeamRunManager.materializeRoot()` | Add the sole root-local resolver beside publish/message/platform callbacks; fresh and restore calls both receive the complete callback object. |

### Test And Fixture Occurrences

| Occurrence family | Exact files | Required target |
| --- | --- | --- |
| Direct `MixedTeamManager` | `mixed-team-manager.test.ts`; `team-manager-member-interrupt.test.ts`; `team-run-resolver-configured-overlap.test.ts` | Supply an explicit resolver; the configured-overlap custom factory forwards the callback resolver. |
| Executable direct `MixedTeamRunBackendFactory` | unit and integration `mixed-team-run-backend-factory` tests; `team-run-resolver-configured-overlap.test.ts` | Every `createBackend`/`restoreBackend` call supplies complete callbacks. Add omission/null/undefined cases that fail type/architecture contract rather than receiving no-op behavior. |
| Context-only direct factory | two constructors in `mixed-sub-team-run-factory.test.ts` | No production change and no resolver fixture: calls are limited to `buildTeamRunContext`; architecture proof rejects any executable create/restore call from this category. |
| Typed fake factory/callback capture | `agent-team-run-manager.integration.test.ts` | Extend the fake callback type/assertions with the exact resolver and prove fresh/restore managers receive it. |
| `MemberTeamContextBuilder.build` | four calls in `member-team-context-builder.test.ts`; one in `brief-package-team-prompt.integration.test.ts` | Supply an explicit test resolver and assert reference identity is preserved. |
| Direct `new MemberTeamContext` | `tests/fixtures/current-team-run-fixtures.ts`; Codex thread/manager tests; token-usage enrichment test | Require an explicit resolver. The shared current-Team fixture owns one clearly named rejecting/root-returning test resolver; it is test-only and never becomes a production default. |
| Architecture guard | `tests/architecture/application-framework-boundaries.test.ts` | Count and classify every governed occurrence; require forwarding in the default, general, and application manager constructors; forbid `noopCallbacks`; prove executable callback and builder/context omission/null/undefined rejection while allowing the two named context-only factory constructors. |

The audit is exhaustive against current reviewer HEAD `a5a613153...`. A later added occurrence fails the current-tree count until assigned to a supported general/application/context-only category. This is an exact construction obligation, not a generic recursive AST rule, service locator, or repository-wide constructor policy.

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Retain the newest-Personal integrated ticket branch | The history-preserving v1.4.58 merge is complete and latest Personal is an ancestor of reviewer HEAD | Do not repeat/rewrite the merge; apply only the bounded SR-013 correction on the ticket branch | Current refs, ancestry check, merge commit, DR-010 evidence |
| BEH-002 | User | Develop/build maintained application | Current branch retains devkit scripts, canonical source, and build-once Studio/standalone package behavior | Preserve unchanged | Current package scripts/tree and retained delivery evidence |
| BEH-003 | System | Application launches agent/team and consumes events/tools | Current source combines Personal execution/rooted identity with application-scoped managers, publication, sessions, messaging, cleanup, and projection | Preserve graph-local scope; correct the one task-delegation bypass through BEH-013 | Current source, CRR-020/API-REV-010, ARCH-REV-011 |
| BEH-004 | User/Contract | Package defaults or Studio launch override | Integrated launch resolver composes complete Codex/Luna package defaults, sparse overrides, Team scopes/leaves, and current provider availability | Preserve unchanged | Current app configs, launch source, SR-010/CRR-019 |
| BEH-005 | Operational | Retain integrated workspace/provider/Team V2 behavior | The v1.4.57/v1.4.58 semantic junctions are implemented and source-reviewed | Do not reopen those owners in SR-013 | Round-4/5 artifacts, SR-010, CRR-019 |
| BEH-006 | Contract | Review/test the SR-013 candidate | Earlier passes characterize the preserved baseline; no result yet proves the member/session-bound task correction | Run focused dual-scope task proof then the retained full gates | CRR-019, API-REV-010, ARCH-REV-011/012 and prior delivery evidence |
| BEH-007 | User/Contract | Provider failure in native or application execution | Integrated and reverified through SR-007/DR-007 | Safe native metadata and closed message-only application projection remain verified | Current source/reports/evidence |
| BEH-008 | System/Operational | Application executes/restores a nested configured/task team; host upgrades an existing data root | DR-007 current source combines graph-local activation/session/memory, exact physical scope, registered migration, restart hydration, and cleanup | Preserve unchanged | Current source, API-REV-008/DR-007 evidence |
| BEH-009 | System/User | Application readiness/Save/direct launch for AutoByteus leaves, or Studio model editing | DR-007 current source uses split credentials, provider-granularity dynamic discovery, exact post-check, fresh per-leaf model lookup, authority-equivalent credential caching, and snapshot-settled UI state | Preserve unchanged beside controlled workspace state | Current source, ARCH-REV-007, API-REV-008/DR-007 evidence |
| BEH-010 | User/System | Studio Agent/Team draft selects New workspace, receives unrelated configuration/provider edits or delayed workspace discovery, then launches | DR-007 forms use current provider-granular fixtures; Personal v1.4.57 changes panel/selector/forms to one controlled workspace state | Complete workspace state must survive and register before launch while provider rows/snapshots/settlement remain callable and independent | DR-008 report, round-4 merge evidence, three-way test diffs, auto-merged production read, Personal completed ticket |
| BEH-011 | System/Operational | Application launches a configured nested Team, or either host opens/restores TeamRun history | Integrated SR-010 carries complete Team scopes/leaves through exact SDK types; Personal validates topology before allocation, persists V2 only, and runs the ordered V1/memory/V2 migrations | Preserve unchanged through SR-013 | DR-010, round-5 evidence, ARCH-REV-009/010, CRR-019 |
| BEH-012 | User/Contract | Studio user or public GraphQL client creates/lists/updates/deletes an Agent or Team definition and launches it in the same host or after restart | Configured definition APIs use one bundle-aware family; public run mutations currently reach a different cached family through ambient general services, so created/listed definitions fail launch | One exact host definition family serves definition APIs, general runs, application configuration/runs and refresh; public/general run services are explicitly constructed; general/application run/session state remains isolated | CRR-020, API-REV-010 real server JSON/log, current composition/getter/source trace |
| BEH-013 | System/Contract | Active general or application Team member invokes an automatically exposed task tool | MCP/native task adapters share the task service/router, whose default resolver calls process-general `getTeamRunService()`; application root state is therefore invisible | Create one root-specific resolver at RootTeamRun materialization, carry it through immutable member/session/native-tool scope, and remove global lookup/restore fallback | ARCH-REV-011 / AR-007; current exposure/session/adapter/service/router/member/root source trace |

## Design Health Assessment Evidence

- Change posture: post-integration bug fix with a bounded execution-authority correction; the accepted SR-011 composition/lifecycle design remains fixed.
- Candidate root cause classification: `Boundary Or Ownership Issue` plus `Missing Invariant`. The shared task adapter owns transport translation but currently selects a process-general run authority instead of consuming the exact member/session authority.
- Refactor posture evidence summary: a request-time application-ID switch, manager registry, or fallback would create another hidden authority. The proportional response is one root-local resolver propagated through the already-existing member-context/session spine and consumed by the existing service/router. RootTeamRun task logic, managers, route/catalog, stores, provider/workspace/Team V2/SDK/wire/persistence remain unchanged.
- Empty-indirection check: the new resolver owns exact root identity/liveness selection and is created at RootTeamRun materialization. It is not a facade or generic container. The specialized session capability is a projection of that exact resolver, not another authority.
- Rejected alternatives: request-time service selection, global root/service registry, fallback reads/restores, general/application manager unification, duplicate MCP/task infrastructure, generic container/deferred proxy, compatibility alias, and leaving native AutoByteus task tools on the ambient path.

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

### SR-011 Relevant Definition/Run Files

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts` | Studio assembly | Builds general run owners before a separate application definition family; configures only definition/package APIs | Build one host definition family first, pass it to both run families, and configure public run services too |
| `.../standalone-application-host/start-standalone-application-host.ts` | standalone process assembly | Also constructs separate definitions after migrations and before application runtime, but general run defaults remain unrelated | Use the same host-definition construction/release contract; no public GraphQL added |
| `.../application-platform/runtime/create-application-definition-services.ts` | bundle-aware definition construction used by hosts and package validation | Name/location incorrectly imply application-runtime ownership and do not distinguish transient validation from the one bound host catalog | Clean rename/move to `application-platform/definitions/create-bundle-backed-definition-services.ts`; add `compositions/host-definition-services.ts` as the only runtime binding/close owner; no alias |
| `.../application-platform/launch-configuration/application-standalone-package-validator.ts` | pre-host source-package validation | Needs an isolated read-only definition pair before runtime resources exist | Consume the bundle-backed constructor without binding; never expose the pair to process getters/routes/runs/refresh |
| `.../agent-definition/services/agent-definition-service.ts` / Team counterpart | definition CRUD/cache | Lazy singleton only; no fail-closed bind/release lifecycle | Add exact `bindProcessInstance`/`releaseProcessInstance`; bind the bundle-aware runtime pair once |
| `.../agent-execution/runtime/general-process-run-supervisor.ts` | process run managers and stop | Does not own the cached public/general AgentRunService/TeamRunService; several nested constructors default definitions | Accept exact definitions; explicitly construct/bind services, allocators, backends, contexts; release exactly once |
| `.../agent-execution/services/agent-run-service.ts` / `.../team-run-service.ts` | public/general run lifecycle | Ambient getters lazily create services with default definition dependencies | Add named exact bind/release around current getter; retain getter for established process consumers, not as fallback in host assembly |
| `.../api/graphql/studio-application-api-services.ts` and four definition/run resolver files | public GraphQL boundary | Definition services configured; run services ambient | Register exact definition and general run services together; identity-checked release; resolvers consume configured subject service |
| `.../application-platform/runtime/create-application-run-services.ts` | application-scoped run graph | Already supplies exact definitions and separate run/session/publication owners | Preserve implementation; add identity/isolation proof, no manager/session unification |
| two history-index V2 migrations | startup data transition | Optional label lookup can instantiate default definition singletons before bundle-aware host binding | Use migration-local non-caching persistence lookup; retain ID fallback and stored output |
| `.../startup/cache-preloader.ts` | noncritical post-ready cache reads | Agent/Team reads duplicate awaited definition readiness and can outlive host definition release | Remove Agent/Team imports/blocks only; retain MCP/model cache work |
| `tests/unit/application-platform/application-framework-boundaries.test.ts` | executable architecture guard | Does not govern canonical host definition/service binding | Add exact host-construction, nested injection, forbidden duplicate/lazy path, and synthetic omission cases |

### SR-012/SR-013 Relevant Task-Delegation Scope Files

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `agent-team-execution/services/agent-team-run-manager.ts` | materializes and owns each RootTeamRun | already creates root-bound message/platform callbacks and recursively supplies them to mixed Team managers | add the exact active-root resolver here; no process/general lookup |
| `agent-team-execution/domain/member-team-context.ts`; `services/member-team-context-builder.ts` | immutable rooted member identity, authored Team instruction, and collaboration context | lacks task execution authority even though every member receives the task tools | require and carry the root resolver; builder remains the identity-binding owner |
| mixed Team factory/manager/configured/task-Agent handle chain | recursively constructs root/subteam/configured/task members | already carries graph-local manager/session/memory/message dependencies | propagate the one required resolver through the same root-local chain; do not add another manager |
| `agent-execution/runtime/general-process-run-supervisor.ts`; `application-platform/runtime/create-application-run-services.ts` | construct the supported general and application custom mixed Team managers | each explicitly copies the current callback fields and would omit the new resolver unless updated | forward `callbacks.taskRootResolver` in both owners; preserve separate managers/sessions and identical construction obligation |
| `mixed-team-run-backend-factory.ts` executable methods | builds/restores executable root backends and recursively creates managers | current `noopCallbacks()` makes the callback argument optional and can produce an unbound executable root | remove `noopCallbacks`; require complete callbacks for create/restore; retain context-only `buildTeamRunContext` and the optional custom manager factory |
| `agent-tools/mcp/agent-tool-mcp-session.ts`; session service/registry/runtime; application run construction | authenticated session identity and scoped execution capability snapshot | publisher is scoped, task root is not; runtime currently supplies one prebuilt publisher object per scope | keep a tight base publisher input, derive a discriminated final Team-member capability per issue, and fail Team session issuance if absent/mismatched |
| `agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.ts` | shared MCP translation for three task tools | captures the default service and thereby the process-general resolver | consume only the authenticated session’s Team-member capability |
| `agent-tools/task-delegation/task-delegation-tool-service.ts`; `task-delegation-tool-run-router.ts` | tool-level root resolution and dispatch to RootTeamRun | default router calls `getTeamRunService()` | require the exact resolver in the tool context; remove the ambient default and inactive restore path |
| AutoByteus task tool files and `autobyteus-agent-tool-resolver.ts` | server-owned native task-tool instances | reconstruct identity from custom data and then call the same ambient service | bind the exact `MemberTeamContext`/resolver when creating member task tools; remove the custom-data parser, no Codex/Claude native-file-tool change |
| focused task/MCP/application boundary tests | current service/router/native/MCP behavior proof | no dual-scope task authority proof | add application/general positive cases and missing/mismatch/closed/revoked/global-non-use negatives |
| direct mixed-manager/factory/builder/context fixtures listed in the SR-013 audit | focused construction and prompt/event fixtures | newly required resolver inputs affect more occurrences than SR-012 listed | update every exact occurrence or explicitly classify it context-only; add current-tree counts so later omissions fail closed |

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
- Launch-row decision: `Directly Usable — No Migration`; the new Team-scope projection is recomputed from current definitions plus the same sparse row. Evidence is in `integration-runtime-contracts.md` sections 3 and 8.
- New affected subject: pre-`a00f0d` nested Team Agent memory may physically reside in the old flat root-TeamRun directory although current runtime derives an ordered containing-TeamRun path.
- Representative path evidence: direct-root scope remains `{rootTeamRunId, []}`; nested configured/task agents use `{rootTeamRunId, [containingTeamRunId, ...]}`. `TeamExecutionIndex.getTeamRunPhysicalScope(containingTeamRunId)` supplies the current ordered scope.
- Nested-memory decision: `Migration Required` for affected old flat nested AgentRun directories. Direct use would make current runtime miss persisted memory; rebuild/discard is unacceptable user-data loss.
- Migration owner/mechanics: existing `AppDataMigrationRunner` invokes registered `TeamAgentMemoryLayoutAppDataMigration` after TeamRun V1, then `TeamRunExecutionTreeV2AppDataMigration`. Memory uses deterministic whole-directory rename; V2 reconstructs complete Team defaults from direct coordinator snapshots, preserves binding, writes atomically, and rereads before admission.
- Completion/recovery: unmaterialized/current/direct-root memory cases are explicit skips; source-plus-target conflicts are preserved with warnings; current V2/fresh histories need no conversion; unsupported/failed paths are recorded; the existing ledger/`ANYTIME` policy owns retry. Both hosts use V1 -> memory -> V2 before application readiness.
- Provider persisted subjects: credentials, custom-provider rows, provider host settings, and saved model identifiers retain their current physical schemas and are directly usable. Personal's new dynamic source lifecycle and model snapshots are in-memory, reconstructed on demand, and require no new migration or application-local persistence.
- Definition persisted-data decision: `Directly Usable — No Migration`. SR-011 changes which in-memory cached services read the existing shared/application bundle roots; it does not change Agent/Team definition JSON, locations, IDs, package bytes, or public CRUD shapes. Existing files are reread into one cache family on restart. No copy, rewrite, seed, mirror, or compatibility lookup is allowed.

## Constraints / Dependencies / Compatibility Facts

- Source refs are immutable inputs.
- Personal current lifecycle and provider behavior must not be overwritten by older feature source.
- Feature dual-host public behavior must not be silently dropped because Personal lacks it.
- Derived paths must be regenerated, not hand-authored.
- No compatibility aliases or source-level version suffixes for in-scope contracts.
- No external `/mcp/gateway` in standalone; both hosts use internal scoped `/mcp/agent-tools/:sessionId`.
- One host definition family is process-scoped catalog state; separate general/application run managers and application MCP-session/publication state remain mandatory.
- Normal host assembly must fail if any lazy default definition or run service was created before explicit binding; it must not replace, merge, or synchronize that instance.
- Team-member task tools must receive a resolver from their exact RootTeamRun/member context. The adapter, service, router, and AutoByteus bound tool must not import or call `getTeamRunService()` for member execution.

## Open Unknowns / Risks

- The implementation may discover an additional concrete interaction in the 633-path v1.4.58 delta; it is a bounded implementation correction only if it remains within approved BEH/REQ/AC scope. Any new owner, persistence/startup policy, product behavior, or compatibility/global/generated authority returns as Design/Requirement Impact.
- If Personal advances, this evidence becomes a prior-baseline input and delivery must repeat the refresh.
- Actual provider/Electron checks require the project's normal environment.
- The root-local resolver must be propagated to configured, restored, nested, and task Agent members. Omission in any one handle path must fail compilation/architecture tests rather than fall back.

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

## SR-009 Personal v1.4.58 Hierarchical Team/V2 Findings

### Launch And Topology Authority

1. Personal owns `TeamDefinitionTopologyPlanner`, `TeamRunIdentityAllocator`, `TeamRunService`, TeamRun V2 persistence/history, and the V1-to-V2 migration. The application layer must consume those owners rather than reproduce topology or allocation.
2. Application package behavior remains a deliberate specialization: every application-owned Team scope and leaf Agent resolves a complete effective launch value. A Team scope inherits from its own Team default then outer Team defaults; a leaf retains innermost Team -> outer Teams -> Agent definition precedence. Sparse host Team fields overlay all scopes/leaves; an exact member override overlays only that leaf.
3. The Team variant of the effective application configuration carries `teamScopes` plus leaves. The Agent variant does not carry Team fields. The SDK explicit Team branch carries complete `teamConfigs` plus `memberConfigs` and does not retain a second `teamDefaultConfig` root authority.
4. Brief and Socratic root Team definitions gain the same application-owned `codex_app_server` / `gpt-5.6-luna` default already present at leaf Agents. Package validation and host readiness cover all Team scopes and leaves because dynamic task Agents inherit Team defaults.
5. `ApplicationRunBindingLaunchService` preserves exact injected application dependencies/current-model validation but delegates explicit topology to `TeamRunService.createTeamRun`; preset launch uses the current root-inherited path. Application code no longer allocates the root Team ID. Graph-local construction explicitly injects `TeamRunIdentityAllocator`.

### V2 Migration And Stored Authority

- Current TeamRun creation, persistence, history, restore, and location are V2-only. Historical V1 knowledge is isolated in required migration `20260824_team_run_execution_tree_v2`.
- The fixed startup order is TeamRun V1 -> Team Agent memory layout -> TeamRun V2 -> later snapshot/history migrations -> application readiness. Direct coordinator snapshots reconstruct each Team default; `applicationBinding` and physical scope are preserved; write/reread admission is atomic and retryable through the existing runner.
- `RuntimeMemoryLocationClassifier` and `TeamRunExecutionTreeLocationService` adopt V2 types/catalog while retaining the stored-only construction path. Migrations never use a process-global live TeamRun manager.
- Launch override/provider/workspace rows remain directly usable. Team scope values are recomputed from definitions plus sparse rows. Generated SDK/vendor/importable package trees are discard/rebuild outputs, not source.

### Exact Surface And Verification

- 13 content conflicts are assigned individually across SDK launch types, runtime binding/location/server migration, one web member editor, and durable tests.
- 30 modify/delete conflicts remain deleted and are regenerated only for validation/parity.
- Seven auto-merged overlaps are accepted only with the recorded semantic audit; `RuntimeModelConfigFields.vue` retains effective-runtime provider ensure and generated contracts remain source-derived.
- Required proof covers 13/30/50 disposition, complete Team/Agent readiness and validation-before-allocation, V1 -> memory -> V2 migration, V2-only restore/history/location, controlled workspace/provider hierarchy, real dual-host Brief/Socratic execution, package parity, cleanup/recovery, and Electron v1.4.58.
- Canonical detail: `latest-base-refresh-round-5-design-analysis.md` plus the DR-010 and solution evidence inventories.

## Notes For Architecture Reviewer

`SR-013` is the current normative correction. SR-011's canonical definition catalog and SR-012's RootTeamRun/member/session/task/AutoByteus direction remain accepted and unchanged. Review `design-spec.md` DS-025/SR-012–SR-013 and `integration-runtime-contracts.md` section 10 for the exact general/application constructor forwarding, required executable callbacks, removal of `noopCallbacks`, exhaustive production/test occurrence table, context-only factory exception, and omission proof. The solution adds no route, catalog, task system, manager, storage, schema, migration, generic container, or later-bound proxy. All delivery/review/API-E2E-owned dirty artifacts and evidence remain untouched.
