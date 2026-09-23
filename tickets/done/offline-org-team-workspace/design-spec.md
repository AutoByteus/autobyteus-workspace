# Design Spec — Offline Org Team Workspace

## Solution and approval basis
- Package: `OFFLINE-ORG-TEAM-WORKSPACE-20260922`; current revision `SR-006`.
- Requirements: **Approved SR-002**, `USER-20260922-SCOPE`: user identifies the expanded mounted-Team Workspace Directory control, confirms Team-global changes update its Agents, then asks “continue please”.
- Design status: **Reviewed — ARCH-REV-003 Pass** on the unchanged SR-005 technical design. SR-006 is an evidence-only design-principles audit requested by the user; it makes no technical or intended-behavior change and does not reopen review. Downstream IR-003 corrected API-F001 and CRR-003 passed source review; API/E2E retains its own current result until revalidation completes. Solution Designer does not claim those executions independently.
- Canonical requirements/investigation/revision files are siblings of this file in `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/done/offline-org-team-workspace`.
- Worktree/branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace`, `codex/offline-org-team-workspace`; base `origin/personal` at `da86efe07f7f71e7455db6a866286af0bf0debd7`. SR-005 review basis was implemented HEAD `3a52e67ba72ee53497f5d9492f406289f23f28f3`; downstream IR-003 correction is `cb139904c68b65e3af9f6b07de0e8e5275ed8169`, with artifact-only HEAD `66213bd539ed422d39d101bdd218d73760a4100f` observed during this audit. Original base retained above. Finalization target `origin/personal`; no merge/release authorization inferred.
- Product-owned UI/UX/prototype: **N/A — not applicable**. User screenshot is approved surface-location evidence, not a pixel-perfect target or a Product request. Prior independent review: sibling `design-review-report.md` and `architecture-review-revision-record.md`, **ARCH-REV-003 Pass on SR-005**, retaining AR-F001 resolution and approving the bounded FileExplorer correction for API-F001. SR-006 only audits the same design against canonical principles and corrects explanatory terminology; ARCH-REV-003 remains applicable. Approved SR-002 behavior is unchanged; no renewed approval is required.

## Current-state read
Original-base investigation: whole-Org Settings is already the right entrypoint and has one inactive-root lifecycle owner, aggregate Save, strict canonical readback and retained-context publication. Its model-only restriction was intentional. Workspace is stored on every configured scope, not dynamically inherited on restore; a Team-only field change cannot realize this request.

The missing capability is a single stopped-Org edit command that composes existing model patches with **mounted-Team workspace intent**, expands that intent to configured children, and publishes corresponding workspace metadata to existing frontend Agent contexts. Current runtime restore already consumes the saved child paths; no new restore owner is needed. AR-F001 additionally exposed a Files consumer gap: clearing unavailable canonical metadata is insufficient while missing IDs mean global launch-draft fallback. DS-002 now reaches a focused layout gate covering both tree and editor. IR-001 implements that design. API-F001 subsequently exposed an existing FileExplorer metadata-only activation loop and incomplete loading settlement on normal read/reopen recovery; the clean correction is local to that consumer, not Save, Resume, the layout or the metadata store.

## Task size and architectural risk
- `task_size`: **Medium**. Several existing server/web configuration owners, a narrow draft composition, scoped API rename/extension and canonical workspace publication; runtime/persistence formats are reused. Mechanical import/test updates for the shared editor rename do not constitute a new subsystem. SR-004 adds two existing presentation owners (RightSideTabs and FileExplorerLayout), their focused regressions and unavailable-target text; no global workspace-store or navigation refactor. SR-005 permits one additional existing production file, FileExplorer.vue, plus focused regressions for its activation lifecycle; no new owner/framework or broad refactor.
- `architectural_risk`: **High**. The public stopped-Org contract and persisted mutable-field invariant change; a defect can leave children on different directories or the UI pointed at the wrong filesystem root. Workspace-contextual model validation, same-root restore/save exclusion and filesystem consumer activation remain material risk surfaces. API-REV-001 reports sampled real native/Codex/Claude continuation Pass; those attributed results reduce the earlier provider uncertainty but do not cancel API-F001 or downgrade the package contract/persistence risk.
- Payload inventory: one existing execution-tree JSON per edited Org, plus fixtures/docs. No bulk content conversion or migration.
- Structural inventory: GraphQL/domain command, Org manager/mutator, existing-run draft/store/form contract, Org canonical context adoption, workspace metadata resolution and explicit unavailable-target consumption by the Files layout and bounded local FileExplorer activation/settlement.
- Escalation triggers: new schema/inheritance storage, history/provider-session relocation or reset, edits while Org managed, root/Agent/standalone workspace authoring, mutable task snapshots, runtime-owner changes, incompatible external-provider continuation, broad catalog/schema subsystem refactor. Return Design Impact or Requirement Gap rather than widen implementation silently.

## Architecture investigation evidence
Canonical evidence E01–E42 is in `investigation-notes.md`; key additional facts are E20 selector modes, E21 shared save-state ownership, E22 retained-context guards, E23 metadata resolution, E24 metadata-only registration, E25–26 workspace-contextual model options/validation, E27 composition injection, E28 schema fixtures, E29 exact provider restore, E30 model-only transport naming.
E31–E36 independently confirm review premise AR-P001: normal launch-draft → History selection retains an unrelated workspace, and missing Files IDs fall back to that draft; existing unmount cleanup supports a bounded layout gate. This is a source trace, not a live reproduction. The current-owner synthetic probe proves that parent-only mutation does not re-inherit children. At SR-004 authoring no real provider/UI validation had run. Current API-REV-001 records sampled real provider continuation, core browser Save/reopen/Send, HTTP/restart and fresh-task Pass, but first metadata-only Files recovery C09/C09-R1 fails. E37–E42 records the new source trace, attributed reproduction and scope decision; Solution Designer does not repeat downstream execution or claim a fix.

## Intended change
Enable the existing Workspace Directory selector **only on mounted-Team cards inside eligible stopped Org Settings**. Root Org and all Agent-level workspace controls remain stored/read-only. A draft Team choice previews that directory for every configured Agent in the Team, independently of model inheritance. One Save commits workspace and any requested model edits together. Ordinary Send continues the same configured Agent with the saved path and retained history.

## Relevant behavior and production-path map
| Behavior | Approved requirements / ACs | Approved trigger and lifecycle | Target path / preserved outcome | Spine |
| --- | --- | --- | --- | --- |
| BEH-001,006 | REQ-001,002 / AC-001,002 | Stopped Org Settings → Team workspace selection | Workspace draft independent of model linkage; server expands to all configured Team children | DS-001, DS-004 |
| BEH-002 | REQ-001,007 / AC-001,005 | Same existing form and explicit Save | Existing/New/picker enabled only at approved Team scopes; existing model/standalone behavior retained | DS-001 |
| BEH-004 | REQ-004,005 / AC-004,005 | Save/reopen/error/stale target | Single manager gate/write/readback; canonical publication updates retained contexts; explicit unavailable Files target mounts neither tree nor editor, never an unrelated draft | DS-001, DS-002, DS-004 |
| BEH-003 | REQ-003,005 / AC-003 | Next normal Send from stopped Org | Reload saved tree, lazy Agent activation, same conversation/provider binding with new cwd | DS-003 |
| BEH-005 | REQ-006 / AC-006 | Fresh task delegation after restore | Existing current-configured-source projection sees new paths; old task snapshots untouched | DS-005 |

## Relevant supplemental task artifacts
| Path (relative to package) | Purpose / related IDs | Authority |
| --- | --- | --- |
| `evidence/user-subteam-workspace-control.png` | Exact existing Team card/Workspace Directory location; REQ-001,002 / AC-001,002 | User-supplied scope/surface evidence. Names/path/model are illustrative. |
| `evidence/current-owner-probe.json` | Current model mutator and runtime projector behavior; REQ-002,003 | Non-normative feasibility probe, not E2E. |
| `analysis-result.md` | Historical SR-001 investigation result and route hold | Superseded status only; no competing design authority. |
| `design-review-report.md`, `architecture-review-revision-record.md` | ARCH-REV-001/002 / AR-F001 / AR-P001 | Reviewer-owned ARCH-REV-002 Pass on SR-004; not yet a review of SR-005. |
| `implementation-handoff.md`, `implementation-revision-record.md`, `evidence/implementation-ir002-*` | IR-001/002, exact scope constraint and independently reproduced API-F001 | Implementation-owned; no corrective source edit in IR-002. |
| `code-review-report.md`, `code-review-revision-record.md` | CRR-002 failure-origin disposition | Reviewer-owned Fail / Local Fix; API-F001 implementation ownership unchanged. |
| `api-e2e-*.md`, `evidence/api-*` and durable tests linked in handoff | API-REV-001 C09/C09-R1 and positive sampled cases | API-owned Fail; positive cases retained, no overall acceptance inferred. |

## Task design health assessment
- Cumulative change posture: **Behavior Change** with bounded refactor. Current SR-005 correction posture: **Bug Fix / design-scope correction**. SR-006 posture: **Evidence-only design audit**.
- Current design issue found: **Yes, relative to the newly approved editable field scope**; not a defect in the former requirements.
- Root cause: **Boundary Or Ownership Issue / File Placement Or Responsibility Drift** if workspace writes are bolted onto a second endpoint/store or smuggled through model-only names.
- Refactor needed now: **Yes**. Generalize the Org stopped-config contract and shared existing-run editor orchestration names, compose workspace intent with the still-valid model planner, and replace model-only Org publication with permitted-run-config publication.
- SR-004 consumer root cause: **Boundary Or Ownership Issue** — selected Org target unavailability is erased into an omitted default selector. Complete the existing presentation boundary, not the workspace registry or global draft lifecycle. `RightSideTabs` preserves explicit unavailability; `FileExplorerLayout` prevents both consumers from mounting. No lower-consumer fallback rewrite is needed.
- SR-005 root cause classification: **Local Implementation Defect** (reactive activation lifecycle), confirmed implementation-owned by CRR-002, not a new architecture owner. FileExplorer observes an aggregate array that is reallocated when its registration action replaces same-ID metadata; early terminal branches can leave Loading set after superseding an earlier async attempt. Bounded local correction is needed now; **Refactor needed now for SR-005: No**. The existing FileExplorer owner, store boundary and file placement remain correct; repair its local watch/settlement logic without a new abstraction or general refactor (359 physical lines before correction). The prior unchanged-file assumption is superseded for this owner only.
- Evidence: E05–08, E16, E21–23, E30–42. Server lifecycle owner, atomic writer and runtime restore are already correct.
- Response: one save authority per Org; no second save button, sequential per-child API calls or root Team manager bypass.
- Deferrals: no redesign of global runtime model catalog, standalone configuration semantics, all run-history abstractions or provider internals. Server final validation remains authoritative; any proven provider failure returns a scoped finding.

## Design principles conformance audit (SR-006)
This is a technical-document audit against the canonical `solution-designer/design-principles.md`, not a new implementation or independent review. Outcome: the design remains coherent and proportionate. One terminology defect was corrected in place: use the canonical `Local Implementation Defect` classification rather than an ad hoc label. The technical design is unchanged.

| Principle / required check | Evidence in this design | Audit result |
| --- | --- | --- |
| Approved behavior before structure | SR-002 / USER-20260922-SCOPE remains the sole intended-behavior authority; BEH/REQ/AC mapping precedes spines. Save is the feature; Resume stays an existing consumer. | Pass; no renewed approval |
| Supported scenario / independent origin | SCN-001/004 and AR-P001 start from supported launch-draft, History, stopped Settings, Save and canonical read/reopen actions. C09/C09-R1 reproduce that established path; tests do not invent its origin. | Pass |
| Spine span sufficiency | DS-001 covers selector through canonical tree store; DS-002 covers canonical result through metadata, retained context, availability gate and usable Files; DS-003 reaches the next provider turn; DS-005 reaches a newly created task. DS-004 and FileExplorer activation are explicitly bounded local spines. | Pass; no local-only spine substituted for the product path |
| Concrete ownership and authoritative boundaries | Org manager alone owns stopped-run mutation; context facade owns guarded publication; RightSideTabs/layout own target availability; FileExplorer owns local activation; workspace store/action owns registration. Callers do not combine an outer boundary with its internals. | Pass |
| Off-spine reuse | Model validation, workspace normalization/metadata, atomic persistence and provider/task projection reuse existing capability owners. No new helper/service/framework is created for API-F001. | Pass |
| Proportionate persisted-state decision | Existing schema-v1 `workspaceRootPath` fields and normal readers/writers preserve meaning; one ordinary tree save changes values. No version branch, file move or history rewrite. | `Directly Usable — No Migration` remains justified |
| Design health / proportional refactor | Cumulative feature needs the named Org/editor contract refactor; SR-004 fixes a boundary loss; SR-005 is a local implementation defect in the correct owner and needs no architectural refactor. | Pass after terminology correction |
| Removal and clean cut | Old model-only Org aggregate boundaries are replaced without aliases; null→undefined fallback and fresh-array watcher behavior are removed rather than wrapped. No dual path or pre-registration workaround. | Pass |
| Interface and structure tightness | Aggregate command has explicit Org identity and separate model/workspace arrays; Team patch has one Team address/path; layout tri-state has singular semantics; local activation adds no public DTO. | Pass |
| File/folder placement | Server transport/control/persistence separation is retained. Web configuration planning stays under runConfigEditing; Files availability/activation remain in their existing component concern. A new module for a small local repair would be artificial fragmentation. Tests stay colocated. | Pass |
| Concrete examples and forbidden shortcuts | A→B Save and metadata-only recovery examples show the intended state. Explicit rejections cover per-child Save, draft clearing, pre-registration, remount/tab-toggle, session reset and fallback-policy rewrite. | Pass |
| Classification proportionality | Cumulative public config/persistence/targeting impact remains Medium / High; SR-005 alone is one existing component plus focused tests and does not create a new subsystem. | Pass |

No known design smell remains that requires new machinery, a broader refactor or changed product scope. Independent ARCH-REV-003 already passed the SR-005 technical basis; this audit does not claim source/API acceptance and does not supersede downstream owners.

## Terminology
- **Team workspace intent:** `{ teamAddress, workspaceRootPath }`, scoped by an explicit `orgRunId`, targeting a configured mounted Team, never a Team definition or delegated Team execution.
- **Configured children:** Team `members` Agents including coordinator; not `taskExecutions` or task records.
- **Stopped:** no managed/active entry in the enclosing Org manager, with existing eligibility checks satisfied; not merely an offline/idle Agent badge.

## Legacy removal policy
**No backward compatibility; remove legacy code paths.** Replace the Org-specific model-only read/save/config-adoption boundaries cleanly. Keep model-only helpers only where they continue to own actual model logic. Standalone Agent/Team model APIs are current out-of-scope behavior, not legacy.

## Persisted data / state transition decision
- Decision: **Directly Usable — No Migration**.
- Subject: `agent-org-run-execution-tree.json`, schema v1, one file per Org under stable Org/Team/Agent memory IDs. Representative shape: `rootOrg.defaultLaunchConfiguration`, mounted Team `defaultLaunchConfiguration`, configured Agent `launchConfiguration`; each already contains `workspaceRootPath`. Separate task snapshots have the same launch shape but are not editing targets.
- Evidence: E03, E14–15, E28, current strict fixture/store tests. Readers/writers and restore consume exactly the existing shape; no extra field/version or historical decoder is introduced.
- Semantic delta: permitted edits to existing Team and child path values on explicit Save. Old packages remain usable unchanged until edited. No need to infer whether a previous child path originated from inheritance.
- Invariants: Org root and direct Agent paths locked, unrelated Team paths untouched, all configured children of an edited Team receive its canonical destination, task snapshots and every non-permitted field unchanged. Model-only changes remain possible at existing configured scopes.
- Data continuity: no migration/copy/deletion of workspace project files, local conversation/memory, attachments, provider sessions or historical path references. Provider identity remains stable under existing restore checks. Skills may be materialized normally at activation; that is not a project migration.
- Volume/operations: no user-data inventory, startup scan, downtime or bulk rewrite; one normal per-Org write on explicit Save. Registry descriptors may be registered independently (see DS-004). Extra migration machinery would add I/O/failure/recovery cost with no semantic benefit.
- Migration plan: **N/A**, no incompatible stored shape. Real provider cross-directory continuation is an explicit validation gate, not a reason to add speculative session relocation.
- Protects REQ-002–006 / AC-001–006.

## Data-flow spine inventory and primary execution spines
| Spine | Scope | Start → end | Governing owner | Why |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | Team selector → existing-run store → Org context facade → GraphQL → Org service/manager → tree store | Existing-run draft for client state; Org manager for canonical change | One coherent Save |
| DS-002 | Return | Canonical result → metadata resolution → guarded retained-context adoption/draft rebase → RightSideTabs explicit target → FileExplorerLayout gate → FileExplorer metadata registration/settled activation + editor at canonical ID, or unavailable placeholder | Org facade/context for publication; RightSideTabs/layout for target availability; FileExplorer for local activation | No unrelated fallback, stale file view or lost conversation |
| DS-003 | Primary | Ordinary Send → existing Org restore → tree/scope projector → configured Agent activation → backend resume → next turn | Existing Org/Agent lifecycle owners | New cwd with old conversation |
| DS-004 | Bounded local | Root gate → eligibility → resolve/expand → validate → one write/readback → result | Org manager | Atomic canonical invariant and restore exclusion |
| DS-005 | Primary, unchanged | New delegation → Org task lifecycle adapter → current configured source → task execution factory → new task Agent(s) | Existing task lifecycle owner | New tasks inherit updated source; old snapshots untouched |

## Spine narratives
- **DS-001:** The stopped editor reads canonical Org configuration. Selecting a mounted Team's Existing/New workspace changes only a draft and renders the new path for its Agents. Save sends Team intent plus model patches in one request. The server is authoritative for target resolution, propagation and persistence; the UI never enumerates child workspace writes for trust purposes.
- **DS-002:** Read/Save response supplies the complete canonical execution tree and lifecycle/result. The Org facade resolves metadata for changed configured paths, rechecks exact context/view/window binding, and publishes permitted configuration changes into existing Agent context objects. Draft state rebases on returned canonical data; user conversation/composer/history objects are not replaced. For a selected Org target, RightSideTabs forwards a resolved ID or explicit null, not omission. FileExplorerLayout consumes null by unmounting/omitting **both** FileExplorer and FileExplorerTabs and showing unavailable feedback; a resolved ID reaches both explicitly. Metadata-only B then activates through FileExplorer and the existing workspace registration action; its watcher must converge and Loading must settle without a tab toggle. Unrelated launch drafts and intentional unscoped defaulting remain unchanged. Missing metadata must not leave an old or unrelated directory usable under the new label.
- **DS-003:** No new runtime branch. Ordinary Send reloads the saved root and builds each child's configuration from its updated launch path. Current native memory restore and external thread/session restore keep identities. Validate with real cwd/file operations and preexisting conversation content, not just payload mocks.
- **DS-004:** Manager serializes with restore and other canonical writes, resolves all edits before mutation, expands Team workspace targets and validates final model selections using final cwd, performs one tree write and exact readback, then returns the established truthful outcome contract.
- **DS-005:** Task adapter obtains the current configured recipient at delegation time; its source now contains updated Team/child paths. No historical task traversal or retroactive mutation is added.

## Spine actors / ownership map
| Main-line owner | Owns |
| --- | --- |
| `ExistingRunConfigEditor` + generalized `existingRunConfigStore` | Explicit subject selection, canonical draft, dirty/readiness, load/options/save generations, one Save/reconcile state machine |
| Org workspace draft and form projector | Workspace UI intent/preview at configured-Team scopes, independent of model linking; not persistence authority |
| `agentOrgContextsStore` + `AgentOrgExecutionContext` | Retained subject/view/window/submission guard, configuration operation lock, metadata preparation and synchronous permitted-field publication |
| GraphQL resolver / `AgentOrgRunService` | Typed transport/application boundary; forwards canonical save to manager; read-only model-option preview orchestration |
| `AgentOrgRunManager` | Active/admission/ownership eligibility, serialized canonical transition, all target validation, one tree commit/readback/outcome |
| `RightSideTabs` | Translate selected Org context ID into explicit resolved/unavailable Files target, preserving intentional non-Org default semantics |
| `FileExplorerLayout` | Consume unavailable target before mounting either Files tree/actions or editor/tabs; resolved target passed explicitly to both |
| `FileExplorer.vue` | Existing local activation, loading/error settlement and live-session consumer lifecycle; call the existing metadata registration owner, never duplicate it |
| Existing runtime and task owners | Consume the canonical saved configuration; preserve their current lifecycle/identity rules |

## Thin entry facades / public wrappers
| Facade | Governing owner | Purpose | Must not own |
| --- | --- | --- | --- |
| Org GraphQL config methods | Org service/manager | Input/output transport | Child expansion, file writes, provider startup |
| Org service save method | Org manager | Public Org capability boundary | Registration before lifecycle guard, second lock, repeated child saves |
| Org client adapter | Org context facade / editor store | Parse typed result and transport fields | UI drafts or canonical context mutation |

## Boundary encapsulation and dependency rules
| Authoritative boundary | Internal mechanism | Callers / forbidden bypass |
| --- | --- | --- |
| Org service config API | Manager transition, mutator, tree store | GraphQL calls service only, never tree store or standalone Team manager |
| Org manager | Pure scope planner, workspace capability, model validator, tree writer | All stopped-config writes enter same manager gate; no mutation in read/preview |
| Org context facade | Client adapter, metadata resolver, context publication | Editor never patches member workspace metadata directly |
| Workspace capability | Root normalization/registration and metadata | Reuse workspace owner; no reimplementation of IDs or registry files in Org/UI |
| Files layout target boundary | Tri-state prop and tree/editor mount gate | RightSideTabs supplies explicit Org target; null is consumed at layout, never delegated to lower global fallback |
| FileExplorer activation | Primitive watch sources, current-attempt sequence and terminal settlement | Existing workspaceStore.ensureWorkspaceMetadata remains registration boundary; no pre-registration in facade/layout or new activation service |

Allowed flow is UI → editor store → Org context facade → client → GraphQL → service → manager → owned mechanisms. Runtime reads only committed trees. Model planner remains independent from workspace planner; workspace propagation must not use `linkedToParentAtDraftStart`, model equality or `directlyEdited` model flags. No direct updates to live Agent handles, definitions or delegated execution trees. Do not broaden type unions with unrelated root/Agent workspace setters. Files target consumption uses activeContextStore's selected target, not workspaceStore's draft-derived getter as a replacement. Do not clear agentRunConfigStore/teamRunConfigStore, rewrite History selection, change global workspace getters, or sweep file caches to hide missing-target fallback. Existing lower Files consumers keep their intended omitted-ID default behavior; only the layout interprets explicit null.

## Interface boundary mapping and check
All listed interfaces have one subject and explicit identity (Low ambiguous-selector risk).

| Interface | Subject / shape | Responsibility |
| --- | --- | --- |
| `getAgentOrgRunConfig(orgRunId)` | One retained Org | Replace model-only-named read; returns `{orgRunId,executionTree,isActive,editability}` |
| `updateStoppedAgentOrgRunConfig(input)` | `{orgRunId, modelPatches: OrgModelPatch[], teamWorkspacePatches: TeamWorkspacePatch[]}` | Replaces model-only mutation; at least one patch across arrays; one aggregate outcome |
| `TeamWorkspacePatch` | `{teamAddress:string, workspaceRootPath:string}` | Configured mounted-Team intent only; no redundant scopeKind/runId/children payload |
| `agentOrgRunModelOptions(orgRunId, teamWorkspacePatches=[])` | Same explicit Org, read-only candidate Team paths | Options for saved original model IDs evaluated under proposed cwd; no workspace registration/write/restore |
| Manager `getRunConfig` / `updateStoppedRunConfig` | Same Org identity/domain command | Canonical authority, no optional alternate target selector |
| Context facade `readRunConfig` / `saveRunConfig` | Org ID + aggregate command | Async guard/metadata orchestration |
| Context `applyRunConfig(tree,isActive,metadataByRootPath)` | Exact Org canonical tree and resolved metadata | Validate all changes then synchronously publish; no awaiting inside commit |
| `FileExplorerLayout.workspaceId?: string \| null` | Nonempty string = explicit target; null = selected target unavailable; omitted/undefined = existing intentional default | Layout owns null gate for both tree and editor, not a new persistent target model; do not default this prop to null |
| FileExplorer internal activation attempt | Explicit/effective workspace ID + metadata readiness/root + registered readiness + active state | Component-local lifecycle only: call existing registration boundary, settle current attempt, reject stale completion; no new public interface or identity selector |

Keep existing result outcomes (`UPDATED`, `UNCHANGED`, lifecycle/not-found/validation/model/schema/persistence errors) and field-error shape. Workspace errors use `teamWorkspacePatches[/team].workspaceRootPath`; model errors identify exact configured scope. If an error requires no new outcome, reuse `VALIDATION_FAILED` rather than proliferating enums. Response canonical may be null on unreadable state as today.

## Server command algorithm (DS-004)
1. Enter existing `withTransition(orgRunId)`; read current canonical tree. Preserve package admission, exact identity, managed/active, archive, application binding and root-admission guards. Empty aggregate, duplicate/unknown/mismatched targets or malformed paths fail without a tree write.
2. Resolve model targets using current configured-scope policy. Resolve workspace intents **only** against `rootOrg.members` nodes with `teamRunId`; reject `/`, direct Agents, Agent addresses, definitions, task execution identities and duplicate Team addresses. No current-definition lookup.
3. For valid nonempty path strings, use existing workspace normalization/registration capability injected into the manager by process composition. Existing path semantics apply (including supported temp root); no new filesystem-existence/writability policy. Reuse returned canonical `getBasePath()` for the proposed tree. Registration is metadata-only and must not start a conversation or file explorer.
4. Pure mutator builds proposed tree: apply requested model changes; replace each targeted Team default workspace and **all its configured `members` paths**, preserving each child's independent runtime/model/config/tool/skill fields. Never traverse `taskExecutions`. Multiple Team edits are disjoint; model and workspace edits to a child compose instead of overwriting one another.
5. Validate the union of explicitly model-patched scopes and workspace-affected Team/Agent scopes, deduplicated by address. Use saved current model ID as compatibility basis and **final** workspace path/runtime/selection. `validateMany` shares request-local evidence as today. Any failure prevents the entire tree write. Only normalize/persist model fields for explicit model patches; validating unchanged models for a workspace edit must not silently change them.
6. If complete expected tree equals saved tree, return `UNCHANGED`. Reconfirm admission before writing if it closed while awaited work ran. Otherwise use existing atomic tree store once, read canonical tree back, require strict equality, and retain current failed/indeterminate result rules. Do not re-read/merge speculative client child snapshots.
7. Return canonical result. No history/run IDs/statuses/timestamps/sidecars are rewritten except existing permitted model fields and new scoped workspace fields.

**Atomicity boundary:** Tree configuration is all-or-none. Workspace registry descriptors can remain if registration succeeded but model validation/tree commit later failed; they are not a partially updated Team. Do not delete shared descriptors/project directories as rollback. This is consistent with existing workspace ownership and must not be falsely described as a multi-file transaction.

## Frontend draft / form flow
- Generalize the existing save-state store name to `existingRunConfigStore`; retain one store instance and all existing load/target/window/reconciliation guards. Rename its aggregate draft union to `ExistingRunConfigDraft`; standalone Agent/Team branches remain model-only.
- Org branch composes canonical tree, existing model planner, and a new **Team workspace draft** keyed by configured Team address. Canonical tree remains the baseline; no parallel mutable persisted-tree cache. UI selection state uses existing `WorkspaceSelectionState`; Existing resolves a known workspace's root, New uses entered path. Keep errors/loading separate from saved values.
- Initialize selection from saved Team path/known metadata; otherwise seed New with the saved path. Set selector `autoSelectDefault=false` so opening a historical run cannot silently select Temp. Do not register or launch anything on open, typing, or draft discard. Registration occurs at explicit Save.
- Workspace dirty detection is independent of model dirty detection; workspace-only Save is enabled when its own intent is valid, lifecycle is eligible, and relevant existing model/schema checks are satisfied. Changing/reverting a Team path restores its workspace draft baseline without mutating the model planner. Missing stored child equality alone does not make a newly opened draft dirty or trigger unsolicited repair.
- Preview the chosen Team path on all configured Agent rows even if their model/runtime overrides are customized; preview is not canonical publication. The Team's inherited/customized presentation must account for workspace difference from Org root in addition to existing model customization. Model reset semantics must not silently reset workspace; a complete Team reset control, if used by existing form semantics, must explicitly reset the composed draft under the same owner.
- Extend the **scope** form model with a discriminated workspace control using the existing selector shape: stored vs editable. Only Org mounted-Team projections supply editable controls; Org root, standalone Team scopes and Agent nodes remain stored. Extract the selector's inline model type to `types/workspace/WorkspaceSelectorModel.ts` for reuse instead of parallel flags (`workspaceEditable`, `storedWorkspace`, optional selection) that can contradict each other.
- Thread workspace-selection events through existing `TeamScopeConfigEditor` → `TeamMemberConfigTree` → `AgentOrgRunConfigForm` → editor/store. Do not unlock runtime/tool/skill controls when workspace is editable. Keep existing layout, Existing/New and platform-appropriate picker.
- A valid changed Team workspace invalidates affected Org model option requests; query proposed Team paths read-only. Preserve draft models and original comparison baseline; ignore late results after selection/window/workspace-generation changes. Debounce free-text option refresh; do not query invalid/blank partial input. The existing generic runtime schema display is not redesigned; server validates final cwd authoritatively. Surface any destination-specific unavailability and permit correction/refresh rather than silently choosing a model.
- Send **only Team workspace intentions**, never one child-workspace request per Agent. One Save combines model and workspace arrays. On canonical success/reconciliation, rebuild both draft parts from canonical returned tree, not submitted raw text.

## Return/event spine and canonical adoption (DS-002)
- Extend/rename the existing model-only canonical client and context operations rather than adding an alternate workspace cache. Read and Save both use the broadened adoption logic.
- Compare trees after masking only approved editable fields: model fields at existing configured scopes; workspace at mounted Team defaults and their configured Agents. Root/direct-Agent workspace, runtime/tool/skill policy, identities, topology, task snapshots, handoffs, archive/application data and all unrelated fields remain protected.
- If any workspace in a Team changed, the canonical Team default and every configured child must now agree. An unchanged Team containing a historically distinct child path is not rejected or repaired merely by reading or saving another scope.
- Prepare metadata for changed paths and retry unresolved canonical paths on read/reopen using the existing workspace metadata owner, deduplicating lookup per final root path. Recheck same Org object, view, operation/window binding and inactive phase after every async preparation before publishing. Do not adopt into a replaced or newly active context.
- Synchronous commit changes `view`/index and permitted `context.config` fields (`llmModelIdentifier`, `llmConfig`, `workspaceId`, `workspaceMetadata`) in existing context objects. Preserve state, conversation/Activity, selection, drafts/attachments and task context objects. Unchanged resolved scopes retain metadata and object identity; successful retry of a previously unresolved canonical path fills its metadata on the same context object.
- On lookup failure/null for a **changed** path, publish its canonical path in the tree with workspaceId/metadata null rather than keeping the old ID. Pass that explicit unavailability through the Files contract below and Terminal's existing null-aware metadata prop; do not invent a workspace ID or select a launch draft as a substitute. The saved canonical tree remains authoritative and reopen may retry metadata resolution. A confirmed server commit must not be described as rolled back because metadata failed; no automatic Save replay.
- Preserve existing uncertain-write reconciliation: no false success, no replay until canonical refresh. A stale response may have committed server-side; ignore local publication and require relevant canonical read, not rollback or cross-target adoption.
- No new stream event is required for stopped configuration editing. Subsequent ordinary restore uses normal stream publication.

### Files selected-target contract and lifecycle (AR-F001)
This completes BEH-004 / REQ-005 / AC-005 without changing approved behavior. The supported edge is AR-P001: retain launch draft A, select a stopped Org via History, Save Team destination B, then B metadata resolution is unavailable. The canonical path is still B; Files must be unavailable, never A.

| State at layout boundary | RightSideTabs mapping | FileExplorerLayout result |
| --- | --- | --- |
| Selected Org target with resolved workspace ID B | Forward B explicitly | Mount tree and editor with B; normal workspace-scoped actions |
| Selected Org target with absent/null ID after unresolved canonical metadata | Forward **null**, not undefined | Unavailable placeholder; neither FileExplorer nor FileExplorerTabs exists, so neither can evaluate its missing-ID fallback |
| Existing non-Org/no-selected-target use with omitted ID | Preserve existing `workspaceId ?? undefined` behavior | Normal omitted-target behavior remains; any intended global fallback is unchanged |

- In `RightSideTabs.vue`, use the existing ActiveAgentWorkspaceTarget discriminant for the four `agent_org_*` variants to map missing/empty IDs to null; do not infer the kind from paths or register metadata here. These are target-consumption semantics, **not** additional workspace-edit subjects. Known IDs pass unchanged; standalone branches keep their current behavior. Terminal continues receiving explicit null metadata and needs no production change.
- In `FileExplorerLayout.vue`, widen only this prop to `string | null | undefined`. The **entire tree, divider and editor branch** is under `v-if="workspaceId !== null"`; the alternate branch is localized workspace-details-unavailable feedback advising canonical refresh/reopen. Do not use `v-show`, CSS hiding, or `active=false` as the unavailable gate, and do not pass null through to lower components. The layout owns display availability only, not Save or metadata retry.
- Resolved → null unmounts both consumers even if the Files panel was already visited and remains cached by RightSideTabs. Existing FileExplorer cleanup releases its live session, cancels pending search work and detaches listeners; FileExplorerTabs detaches global editor shortcuts. No cached tree/editor remains usable behind the placeholder. No new Files reads/searches/subscriptions/writes may be initiated for A while unavailable, including Cmd/Ctrl+S. Existing in-flight work issued before the transition remains scoped by its original request; this change does not promise transactional cancellation of already-issued writes.
- Null remains null across Files tab deactivation/reactivation. Canonical read/reopen may retry B metadata without replaying Save. On guarded success, same context receives B ID/metadata; the gate mounts both consumers with explicit B. An unrelated launch draft, its values/identity and any stored file state are not cleared. Conversation/composer preservation remains unchanged.
- Preserve the lower consumers' **target/defaulting semantics**. SR-005 specifically permits the bounded activation/lifecycle correction in `FileExplorer.vue` described below; the earlier blanket unchanged-file restriction for that file is superseded. `FileExplorerTabs.vue`, `useWorkspaceFileExplorer.ts`, workspace global getters/metadata actions, unrelated direct consumers (including SkillDetail/mobile) and Terminal need no production changes for this correction. The explicit-null whole-consumer layout gate remains unchanged; AR-F001 is not reopened.

### Metadata-only Files activation correction (SR-005 / API-F001)
**Scope authorization:** permit local edits to `autobyteus-web/components/fileExplorer/FileExplorer.vue` and focused regressions to realize the already-approved first canonical read/reopen recovery. This is not a Requirement Gap or a change to CRR-002's implementation-defect ownership. Review this narrow amendment before dependent correction; no new public contract, framework, Save, Resume or persisted-data change.

- Supported path: B metadata becomes available on canonical read, the retained context receives B ID, the layout mounts Files, but the client `workspaces[B]` entry does not yet exist. Server registration during Save is not client Files registration. FileExplorer must activate B on this **first** attempt using its existing `ensureWorkspaceMetadata` call, without pre-registering B in the test or upstream application code.
- Replace the activation watch's single fresh-array-returning getter with **individually compared primitive watch sources** for the semantic target and readiness: effective target ID, metadata availability for that ID, active state, and any registration path primitive actually used. Do not depend on descriptor object identity. Metadata appearing later for the same explicit ID must trigger activation; watching only the ID is insufficient. Same-ID equivalent cache object replacement must not restart the attempt. No global cache mutation policy change is needed.
- Keep the current activation sequence/stale-result discipline. Every current-attempt terminal branch must settle Loading and relevant error state: inactive, already registered, no usable metadata, fulfilled registration, or rejected registration. A new attempt clears obsolete errors; rejection exposes existing Retry; stale completions cannot set ID/error/loading for a newer target or after inactivity/unmount. In particular, an already-registered fast path cannot leave Loading from a superseded sequence, and a missing-metadata branch must remain retryable when metadata appears.
- Apply the same primitive-identity discipline to the existing live-session watcher: effective registered workspace ID and active state govern acquire/release, not replacement of an equivalent workspace object. Preserve one existing consumer lease per active target and existing release/search/listener cleanup. Do not introduce another registration task map or a new lifecycle owner.
- Preserve explicit vs omitted target resolution and the layout's null gate, all retained launch/composer/conversation state, canonical saved B and no Save replay. Do not fix by forcing component remount, requiring tab toggling, moving activation into the display-only layout/facade, clearing drafts, or pre-registering B to avoid the failing owner. No FileExplorerTabs/composable/global fallback rewrite.
- Mandatory evidence after correction: C09-R1 with real reactive metadata registration and delayed transport; both composed first-recovery variants without `register('B')`; no recursive/unhandled errors, Loading settled on first recovery, B usable, no stale writes or Save replay. Source re-review and API/E2E revalidation remain required. This design authorizes the local fix; it does not claim it has been made or passed.

## Bounded local / internal spines
- Org manager DS-004: the same transition queue excludes restore/config writes; no nested `withTransition` calls that deadlock the same Org.
- FileExplorer under DS-002: semantic target/readiness change → current activation → existing registration action → guarded ID/error/loading settlement → stable live-session lease. This stays inside the existing component; it is not a new workflow/service.
- Existing-run store: load → editable draft → saving → canonical rebase, or refresh-required/reconcile. Workspace and model drafts share this state machine; option-preview request generation is subordinate, not a second save coordinator.

## Off-spine concerns around the spines
| Concern | Spines / served owner | Responsibility | Risk if misplaced |
| --- | --- | --- | --- |
| Pure configured-scope mutator | DS-001,004 / manager | Target checks, immutable model/workspace composition, Team expansion | UI-only propagation or persistence in helper violates authority |
| Workspace capability | DS-004 / manager; DS-002 / facade | Normalize/register path; resolve metadata | Reimplemented IDs, unexpected file moves or stale views |
| Model options/validator | DS-001,004 / service/manager | Workspace-aware options and final selection validation | Wrong cwd validation or model-driven workspace inheritance |
| Atomic writer/readback | DS-004 / manager | Existing durability outcomes | Parallel child writes create partial config |
| Form projector | DS-001 / editor | Render baseline + model/workspace draft | Mutable view becomes alternate persisted truth |
| Files availability lifecycle | DS-002 / layout | Mount/unmount both tree and editor using explicit target availability | A hidden tree with live editor can still save into unrelated fallback A |
| Metadata registration and activation | DS-002 / FileExplorer served by workspace store/action | Register a resolved metadata-only target once, settle activation, and hold one stable live-session lease | Moving this into layout/facade bypasses the owner; object-identity observation can loop |
| Provider bootstrap and task projection | DS-003,005 / existing owners | Consume canonical saved path; exact continuation binding | Special reset/migration fallback loses history |

## Removal / decommission plan
| Remove/replace | Replacement | Scope |
| --- | --- | --- |
| Org `getAgentOrgRunModelConfig` / `updateStoppedAgentOrgRunModelConfigs` and model-only aggregate input/result names | `getAgentOrgRunConfig` / `updateStoppedAgentOrgRunConfig` aggregate | This change, server and client together; no aliases |
| `agent-org-run-model-config.ts` and `agent-org-run-model-config-mutator.ts` filenames | `agent-org-run-config.ts`, `agent-org-run-config-mutator.ts`; model-specific internal types/functions retained where still truthful | This change |
| `agentOrgRunModelConfigClient.ts`, Org mutation implementation embedded in `existingRunModelConfigMutationClient.ts` | One `agentOrgRunConfigClient.ts` for Org config transport; shared mutation client retains only Agent/Team model operations | This change; no duplicate Org transport |
| `existingRunModelConfigStore.ts` aggregate orchestration name and `ExistingRunModelConfigDraft` aggregate union | `existingRunConfigStore.ts`, `types/agent/ExistingRunConfigDraft.ts`; keep actual model-only primitives/planners | This change; update callers/tests, no re-export wrappers |
| `applyRunModelConfig` on Org context and old facade methods | `applyRunConfig`, `readRunConfig`, `saveRunConfig` | This change |
| Unconditional stored-only workspace control on eligible Org Team projection; model-only dirty/save branch | Capability-specific selector projection + composed Org draft | This change, preserving stored-only controls elsewhere |
| Fresh-array identity activation/live-session watch and unsettled early returns in FileExplorer | Primitive-source observation and complete current-attempt terminal settlement | SR-005 only; keep target/defaulting semantics, registry and cleanup owner |
| Selected Org missing-ID → undefined coercion in RightSideTabs; unconditional Files descendants for that state | Explicit null propagated to layout; whole tree/editor branch absent | Remove only this fallback path. Keep lower components' intentional omitted-ID behavior and all launch drafts |

## Main domain subject naming check
`AgentOrgRunConfig` names the saved Org configuration subject; `TeamWorkspacePatch` names user intent; `ExistingAgentOrgWorkspaceDraft` names noncanonical editing state; existing `ExistingAgentOrgModelConfigDraft` continues to name actual model linkage. All have singular meaning. Do not rename runtime `AgentRunConfig`, runtime Teams or global launch preferences for this feature.

## Existing capability reuse and subsystem allocation
| Need / capability | Decision | Ownership |
| --- | --- | --- |
| Org inactive configuration/lifecycle | Extend | Org execution service/manager; no new runtime service |
| Configured-scope transforms | Extend/rename existing mutator | Org execution services, pure transforms |
| Workspace registry/path/metadata | Reuse | Server workspaces and web workspace metadata stores |
| Existing-run editor/save | Extend/rename shared orchestrator | Web runConfigEditing/store; model planners retained |
| Form/selector | Extend capability projection, reuse selector | Web config components and shared workspace selector type |
| Files target availability | Extend existing presentation boundary, reuse cleanup | RightSideTabs → FileExplorerLayout, not a global workspace policy owner |
| Metadata-only consumer activation | Bounded local correction; reuse registry/lease owner | FileExplorer.vue, no new subsystem |
| Persistence / continuation / delegation | Reuse unchanged format and control flow | Existing tree store, Agent/backend/task owners |

## Draft file responsibility mapping
Initial candidates were: add workspace fields directly to model patches/store, reuse current form, broaden context adoption. Review tightened this into separate Team workspace intent composed with real model edits, a neutral aggregate store/Org boundary, and a discriminated scope selector capability. A separate workspace save service, per-child mutation client, or second whole-tree store is unnecessary and rejected. ARCH-REV-001 then identified that context-level null clearing did not cover Files consumers. SR-004 assigns that missing contract to RightSideTabs and its one Files layout, choosing a gate over a cross-consumer/global-store refactor.

## Reusable owned structures / tightness check
| Structure | Owned file / reuse | Tightness decision |
| --- | --- | --- |
| Aggregate Org config command | server `agent-org-run-config.ts`; matching typed client adapter | Two distinct patch arrays, not a kitchen-sink optional generic patch. Org ID once; Team address once; no client-supplied descendants. |
| Existing selector model | web `types/workspace/WorkspaceSelectorModel.ts` | Extract inline union; each branch contains only relevant fields. No parallel editable boolean. |
| Existing-run aggregate draft | web `types/agent/ExistingRunConfigDraft.ts` | Discriminated Agent/Team/Org subjects; only Org adds workspace draft. Existing model-selection primitives stay model-only. |
| Team workspace draft | web `services/runConfigEditing/existingAgentOrgWorkspaceDraft.ts` | Per-Team UI intent with original tree supplied by owner; derive preview/patches, do not keep a competing canonical tree. |
| Files target availability prop | Existing `FileExplorerLayout.vue` prop, widened to include null | Three deliberate states, consumed once at layout. No new persisted flag or shared recovery service; no default-to-null coercion of omitted props. |
| Tree launch configuration / metadata | Existing server/contracts/workspace types | Reuse unchanged; no new inherited flag or duplicate rootPath/workspaceId authority. |

## Final file responsibilities and target folder mapping
Paths below relative to task worktree. Existing imports/tests must be currentized; no compatibility aliases.

| Action / path | Owner / concrete responsibility | Boundary / exclusions |
| --- | --- | --- |
| Rename `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run-model-config.ts` → `agent-org-run-config.ts` | Aggregate command/read/result and Team intent types | Domain only, no filesystem/provider calls |
| Rename `.../services/agent-org-run-model-config-mutator.ts` → `agent-org-run-config-mutator.ts` | Resolve configured model/Team targets and immutable composed projection | No lifecycle/store/registration side effects |
| Modify `.../services/agent-org-run-manager.ts` | Gated algorithm, workspace capability, combined validation and one write | Only canonical write owner |
| Modify `.../services/agent-org-run-service.ts` | New public config methods; read-only options candidate projection | No pre-gate registration or write bypass |
| Modify `autobyteus-server-ts/src/api/graphql/types/agent-org-run.ts` | New input/read/mutation names and options argument | Transport mapping only |
| Modify `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts` | Inject existing workspaceManager into Org manager | Composition only |
| Rename `autobyteus-web/stores/existingRunModelConfigStore.ts` → `existingRunConfigStore.ts` | Shared load/save/reconcile owner with composed Org draft and options generation | Preserve Agent/Team model-only behavior |
| Add `autobyteus-web/types/agent/ExistingRunConfigDraft.ts`; modify `ExistingRunModelConfigDraft.ts` | Move aggregate union/Org aggregate there; old file retains real model primitives and Agent/Team model draft types | Remove obsolete aggregate export, no alias |
| Add `autobyteus-web/services/runConfigEditing/existingAgentOrgWorkspaceDraft.ts` | Team selection initialization/update/dirty/patch/preview | No store/API effects or model-link policy |
| Keep `.../existingAgentOrgModelConfigDraft.ts` | Existing model inheritance/patch planning | Must not become workspace planner |
| Modify `.../existingAgentOrgRunFormModel.ts` | Compose model + workspace preview; editable only for Org Team scopes | Root/direct Agent remain stored |
| Rename `.../agentOrgRunModelConfigClient.ts` → `agentOrgRunConfigClient.ts`; modify `existingRunModelConfigMutationClient.ts` | Consolidate Org read/mutation with new names and parsing; remove old Org mutation | Other model mutation clients remain |
| Modify `.../existingRunModelOptionsClient.ts`, `graphql/queries/runModelOptionsQueries.ts`, `graphql/mutations/agentOrgRunMutations.ts` | New config names, destination-aware Org options preview | No alias or generic endpoint fallback |
| Modify `autobyteus-web/stores/agentOrgContextsStore.ts`, `services/agentOrgExecution/agentOrgExecutionContext.ts` | Guarded metadata preparation and permitted-field publication | Retain context/conversation identity; no task edits |
| Modify `autobyteus-web/components/layout/RightSideTabs.vue` | Preserve explicit unavailable target for selected Org variants | No global getter/draft mutation; non-Org default mapping and Terminal unchanged |
| Modify `autobyteus-web/components/fileExplorer/FileExplorer.vue` (SR-005) | Convergent primitive-source activation, terminal loading/error settlement and stable live-session identity; preserve stale/unmount guards | Only local API-F001 correction; no registration-owner or fallback-policy changes, no broad refactor |
| Retain/extend `autobyteus-web/components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts`, focused `FileExplorer.spec.ts`; strengthen `components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts` | Delayed real-store metadata-only registration, lifecycle and both first-recovery variants | Preserve API-owned regression intent; no pre-registration bypass or weakened assertions |
| Modify `autobyteus-web/components/fileExplorer/FileExplorerLayout.vue` | Nullable prop, unavailable placeholder, v-if gate enclosing both tree and editor | Null never reaches lower fallback consumers; no Save/retry ownership |
| Add `autobyteus-web/components/fileExplorer/__tests__/FileExplorerLayout.spec.ts`; update `components/layout/__tests__/RightSideTabs.spec.ts`; add `RightSideTabs.workspaceTarget.spec.ts` alongside it | Tri-state contract, both-child lifecycle and composed retained-draft regression | Shallow prop assertions alone do not prove no fallback/display/write |
| Add `autobyteus-web/types/workspace/WorkspaceSelectorModel.ts`; modify `WorkspaceSelector.vue`, `types/agent/ExistingTeamRunFormModel.ts` | Reusable selector union; explicit scope workspace capability | Do not unlock every existing scope |
| Modify `components/workspace/config/{ExistingRunConfigEditor,AgentOrgRunConfigForm,TeamMemberConfigTree,TeamScopeConfigEditor}.vue` | Wire workspace control/events/feedback and Save state | Same form structure; no runtime/tool unlock |
| Modify relevant localization entries and `autobyteus-web/docs/agent_orgs.md` | Precise stopped-Team workspace policy, error/helper text and localized Files-unavailable placeholder (`localization/messages/` entries) | No claim files/history move |
| Update/add server and web tests listed below | Cover approved owner paths and regressions | Implementation/API-E2E owned, not completed by this design |

## Folder boundary check / derived layering
Current `domain` / `services` / `api/graphql` / `run-history/store` separation remains clear: transport → control → pure projection/persistence capability. Web components → store/context facade → client, with typed pure draft/projector files under existing runConfigEditing and metadata in workspace owner. Compact existing folders are sufficient; no new subsystem directory or generic “support” layer is justified. All runtime/provider production files remain unchanged unless evidence yields a scoped design finding.

## Applied patterns
Reuse current root transition serialization, draft state machine, typed adapters, pure immutable projection, canonical readback and prepare-then-publish. No new event bus, inheritance engine, transaction framework or runtime strategy. The Files layout consumes explicit unavailability before existing default-capable children mount; it is not a global fallback rewrite.

## Concrete examples / shape guidance
```ts
// One stopped Org Save. /marketing_team is a configured mount address.
{
  orgRunId: "org-123",
  modelPatches: [],
  teamWorkspacePatches: [
    { teamAddress: "/marketing_team", workspaceRootPath: "/work/marketing" }
  ]
}
```
Before: Org `/work/global`; marketing default `/work/global`; coordinator/worker `/work/global`; worker has a custom model. After: marketing default and both child paths `/work/marketing`, custom model intact; software Team and Org still `/work/global`; old task snapshots untouched. Reopen shows same canonical values, next Send uses `/work/marketing` with existing conversation.

Unavailable-target example: keep a new-Agent launch draft at `/work/draft-A`, select the stopped Org via History, then save `/marketing_team` to `/work/B`. If B metadata fails, saved Team/children paths remain B, context IDs/metadata become null, RightSideTabs sends null and the layout shows only unavailable feedback. Neither A's tree nor A's open editor is shown or writable through this panel. Reopen/read resolves B later, and both consumers mount at B; draft A survives unchanged. If B is metadata-only in the client, FileExplorer performs its normal registration once and leaves Loading without a tab toggle; it must not rely on test setup already inserting B into `workspaces`.

Avoid `{scopeAddress:'/marketing_team',workspaceRootPath:...}` being accepted as an unrestricted generic scope patch, or changing only Team default, or saving each Agent sequentially, or choosing affected children using model-equality flags.

## Backward-compatibility rejection log
| Candidate | Decision | Replacement |
| --- | --- | --- |
| Keep old Org model endpoint as alias to new | Rejected | Cut over server/web and tests together; remove old boundary |
| UI tries new workspace mutation then falls back to model-only endpoint | Rejected | One aggregate contract, truthful failure |
| Old/new persisted shapes or inherited-workspace marker migration | N/A / not needed | Same schema-v1 fields and reader |
| Provider fails resume → start fresh session/copy history | Rejected | Preserve strict existing identity; report scoped failure for design recovery |
| Separate model Save followed by workspace Save | Rejected | One command + one tree write/readback |
| Missing selected Org ID falls back to draft; clear all launch drafts to avoid it | Rejected | Explicit null plus layout gate; preserve omitted-ID defaults elsewhere and retain drafts |

## Change / refactor sequence
The original sequence below is retained for cumulative context; IR-001 has implemented it. **Current SR-005 delta:** review this one-file scope amendment → implementation corrects FileExplorer activation and strengthens focused recovery tests without pre-registration → source re-review → API C09/C09-R1 revalidation and applicable regression checks. Do not repeat existing renames, broaden Save/Resume, or discard positive API evidence.

1. Add typed aggregate intent and pure configured-target expansion tests; rename Org contract/mutator cleanly. Keep persisted tree schema unchanged.
2. Extend manager/composition and read-only options preview. Preserve single gate/write/readback; test combined edits, unchanged/invalid/active/uncertain outcomes and exact saved invariants.
3. Cut over GraphQL and Org client read/save names in same implementation; remove old endpoints/client mutation. Existing standalone APIs remain unchanged.
4. Rename shared editor owner/aggregate draft, compose workspace planner, update form capability/events/dirty/readiness and target-aware options. Keep model planner and existing standalone behavior.
5. Extend canonical context publication and metadata preparation with post-await guards and unresolved-path retry. In the same implementation, preserve Org null in RightSideTabs and add the whole tree/editor layout gate. Add tri-state and composed retained-A-draft/B-metadata-failure regressions before claiming safe publication. Update UI status/localization/docs.
6. Run implementation-scoped tests/render checks; route per completed size/risk. API/E2E proves Save→reopen→Send and future task behavior, including real providers. Return requirement/design findings instead of resetting history or weakening lifecycle gates.
7. Delivery owns docs sync, explicit user verification, finalization and any separately authorized release. No migration or cleanup of users' old workspaces.

## Validation guidance / implementation ownership
Validation obligations below remain normative. Existing IR-001/CRR/API executions are attributed to their reports, not rerun by Solution Designer; API-REV-001 remains Fail. SR-005 correction/tests are not yet implemented or validated:
- Server unit/integration: extend/rename `tests/unit/agent-org-execution/agent-org-run-model-config.test.ts`, GraphQL model-config tests; current fixtures with two Teams/direct Agent, model/runtime overrides, distinct child path and retained tasks. Verify only allowed fields change, mixed model/workspace Save writes once, duplicate/invalid targets rejected, destination used in validation, no restore on Save, registry failure/write failure/indeterminate readback and serialize Save versus restore.
- Frontend: workspace planner/model planner independence; form Projector/TeamScope/Org form/ExistingRunConfigEditor; shared store dirty/workspace-only/mixed Save, reset/cancel, late preview result, target/window change; context publication preserves conversation and clears old metadata when new metadata unavailable; standalone Agent/Team unchanged.
- AR-F001 consumer regression (REQ-005 / AC-005 / BEH-004), not merely a context-store assertion:
  1. Unit contract: `FileExplorerLayout.spec.ts` covers explicit B, explicit null, omitted/undefined, both split/stacked layout and resolved→null→resolved transitions. Null means both child components absent; omitted retains intentional defaults. `RightSideTabs.spec.ts` checks null forwarding for Org variants, explicit known IDs, unchanged standalone mapping and Terminal null behavior; extend the layout stub to accept workspaceId.
  2. Composed `RightSideTabs.workspaceTarget.spec.ts`: mount the real layout and Files consumers with production workspace getter/draft ownership (stub external I/O/editor renderer as needed, not target fallback). Prepare a retained new-Agent launch draft at registered A with an open editable file; select a stopped Org member through the History selection path; Save the Team to B and inject failure at B metadata resolution. Do not simulate the finding by corrupting persisted data or by clearing the draft. Assert saved path B, retained context/conversation/composer identity, null metadata, and draft A unchanged.
  3. Assert unavailable placeholder and absence of both tree/editor, no display of A as selected Org files, and no new A-target file reads/search/subscriptions/writes caused by opening Files or Cmd/Ctrl+S. Test Files initially unopened and previously mounted with an old resolved Org workspace C; the latter must release the prior live session and detach editor/tree listeners. Switch tabs away/back while null and assert no fallback consumer remount. Do not confuse cleanup or already-issued requests with new unavailable-target work.
  4. Retry via canonical read/reopen, resolve **metadata-only B (no client pre-registration)**, allow delayed real registration to complete, and assert both consumers explicitly target usable B with Loading settled and a new file action targets B, with draft A still unchanged. Strengthen both initially unopened and previously mounted/dirty variants; removing the metadata fault alone must suffice, without tab toggles/remounts. Control case: omitted/unscoped use retains existing A fallback. Preserve Terminal's explicit-null no-fallback behavior. This composed boundary coverage is mandatory; shallow parent-prop tests alone are insufficient.
- API-F001 local regressions: preserve C09-R1 delayed registration with zero recursive/unhandled errors and one registration/live-session acquisition for stable B. Cover metadata arriving later at the same explicit ID, already-registered target, failure/Retry, switching target or active state and unmount while registration is pending. Assert current ID/error/loading is not changed by stale completion, all terminal paths settle, equivalent metadata replacement does not churn leases, and intentional omitted-target behavior is unchanged.
- Runtime owner tests: `configured-agent-execution-handle.test.ts`, `configured-agent-activation-planner.test.ts`, Codex thread bootstrap/manager, Claude session bootstrap. Verify updated path arrives at restore with same exact provider ID and same memoryDir.
- Browser/desktop-equivalent journey: reproduce screenshot location with eligible stopped Org; Existing and New selection, Save/reopen, inherited child paths and unaffected siblings; inactive leaf in active Org remains locked; picker platform behavior preserved. Include the retained launch-draft A / canonical B metadata-unavailable regression using controlled lookup failure; verify unavailable Files and recovery to B without losing A. Actual Electron only if needed for native folder dialog boundary.
- Real API/E2E: separate safe temporary A/B directories, a preexisting conversation and a never-started Agent; Save while stopped, query/readback, next message calls cwd/file operation in B and recalls prior context. Prove no Agent/provider conversation started on Save. Cover supported native/Codex/Claude; unavailable credentials/provider is a named blocked test, not a pass. Verify future task source uses B, historical task snapshots and A files unchanged.
- Existing commands: server `pnpm -C autobyteus-server-ts exec vitest run <focused-files> --no-watch`; web `pnpm -C autobyteus-web test:nuxt <focused-files> --run`. Each specialist owns its scoped tests/evidence.

## Key tradeoffs, risks and implementation guidance
- Server propagation is authoritative; client preview duplicates only presentation semantics, not trust. Test both against same scenario table.
- Separate model/workspace intents avoid falsely linking workspace to model overrides and prohibit unsupported Agent/root path editing. One combined Save preserves existing form coherence.
- Localized naming/contract refactor is larger than a disabled-flag change but prevents two save authorities. Do not expand it into unrelated API/store cleanup.
- Workspace registration and model catalog reads may perform metadata work but must not create a conversation or move project files. Registration success does not certify future filesystem access.
- No application-data migration is needed. API-REV-001 reports sampled real external/native continuation Pass; carry those attributed results and their environment limits. No general provider guarantee or overall acceptance is inferred; no provider/Resume adjustment is part of API-F001.
- Model display/schema catalog remains current runtime-scoped behavior; replacement options and server validation use proposed cwd. A discovered user-blocking destination-specific schema mismatch returns Design Impact rather than broad catalog redesign.
- On failed metadata publication, never show old/unrelated workspace as if it were current, never erase conversation or launch-draft state, never silently replay a committed Save. A null context field alone is not sufficient: the layout gate must remove both tree and editor. Existing omitted-target fallback is intentional only outside that explicit unavailable state.
- The SR-005 exception is deliberately small: fix the actual FileExplorer owner rather than expand upstream responsibilities. Do not turn an unchanged-file assumption into permission to ship a proven in-scope defect, or into a broad consumer refactor.
- Follow approved SR-002 and all ACs; user screenshot identifies the exact control, not a request to redesign the form. No implementation has been performed by Solution Designer.
