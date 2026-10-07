# Design Spec — Restore Native Workspace Folder Selection

## Solution And Approval Basis
- Package: restore-native-workspace-folder-picker; current solution revision **SR-007**; design **Ready**.
- Requirements: canonical `requirements-doc.md` **R3, Approved UREQ-001**, user “approve” on 2026-10-07. Exact approval context/hash: `requirements-approval.md` and `history/requirements-r3-as-presented.md`.
- Product supplement: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-ux-spec.md`, **UCONF-001**; approved UI code `a677e01558b2b9d48253950bc2b8db821358625a`, complete artifact revision `15cb0d9be3b8bfdf3a7ee5f7f7862f7a89baa406`; VIS-001..012 and manifest alongside spec.
- Canonical evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/investigation-notes.md`, AE-001..010.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker`; branch `codex/restore-native-workspace-folder-picker`; resolved base `origin/personal@88fad73cbd20201642acdcfe75e69b1897ec135c`; eventual finalization target `origin/personal`. No release requested.
- Authorities read in full, 2026-10-07: solution-designer SKILL, requirements-engineering, architecture-design, design-principles, design-spec template (authoritative skill root in shared checkout); task-root `DESIGN.md`, root/web `AGENTS.md`, root `TESTING.md`. No closer web DESIGN*.md. No conflicts/discrepancies. design-examples not needed for this local design.
- No intended-behavior delta from approved R3. Review artifacts **N/A — not applicable** before rule selection; implementation/validation/delivery not performed.

## Current-State Read
The shared `ChatWorkspaceMenu` owns input text, its path form, validation and a `select(RunWorkspaceChoice)` event. It contains no native picker call; former forms had gated Browse before unification. The current Electron bridge already opens a native directory dialog and returns path/canceled/error. Agent/Team Chat, Org root and placed-Team configuration share this menu, while their respective draft/save/launch owners remain separate (AE-001..007).

`pickFolderPath()` is a stateless, lossy path-or-null convenience function used by unrelated sidebar/application workflows. It is not the workspace or native-host authority; its caller contract intentionally cannot deliver the newly approved inline failure feedback. The authoritative host API is already `window.electronAPI.showFolderDialog()` and includes the needed error. No expansion of that contract or unrelated consumers is necessary.

## Task Size And Architectural Risk
- **task_size: Small.** Three production files: shared menu plus English/Chinese catalogs. Supporting colocated tests and a scoped realistic probe/documentation do not add runtime owners. Multiple requested surfaces already share the same control.
- **architectural_risk: Low.** Existing public native bridge, IPC/result type, capability gate, workspace choice/events, draft stores and registration/save/launch boundaries remain unchanged. Only local renderer input/pending/error/focus behavior is added. No persistence, API, security-policy, global concurrency, deployment or ownership-boundary change; no unresolved structural fact blocks design.
- Payload inventory: five localized strings per existing catalog, normative external screenshots/spec and task documents. Structural delta: one Vue owner consumes existing host API; no new types/services/subsystems. Neither document volume nor Product repository size drives classification.
- Escalate as Design Impact before broadening if implementation needs an IPC/main contract change, altered native-window ownership/global dialog coordination, shared-helper consumer rewrite, changed workspace registration/save policy, persistence or security changes, or cannot satisfy approved native focus/cancel behavior through the existing bridge. New intended behavior requires renewed requirements approval.

## Architecture Investigation Evidence
Evidence lives in investigation notes, not this design. Decision mapping:
| Evidence | Decision supported | Remaining uncertainty |
| --- | --- | --- |
| AE-001,005..007 | One input owner, unchanged draft/select/save/launch paths and locks | Source-current runtime validation still required |
| AE-002,003 | Consume complete existing public bridge response; leave lossy path-only helper and its clients untouched | Actual OS failure/modal behavior not yet run |
| AE-004,010 | Reuse actual window context + mobile gate; preserve popover lifecycle | Native focus/Escape proof downstream |
| AE-008 | Extend menu/preload/caller coverage; browser mocks are insufficient | Environment/build prerequisites not tested here |
| AE-009 | Approved UI markup/copy/focus states are source reference, not its simulated adapters | Product full-root typecheck/locale limits retained |

## Intended Change
Inside Open another folder, add the approved Browse/input row, local/nonlocal hint, inline picker error and pending presentation. Route Browse directly through the **existing public renderer host bridge**. Native return only edits this form's text; unchanged Use folder selects the workspace. No prototype dialog, direct Node filesystem access, additional native API or automatic registration.

## Relevant Behavior And Production-Path Map
| Behavior | Approved basis | Trigger/current evidence | Target/preserved path |
| --- | --- | --- | --- |
| BEH-001 User | REQ-001,005; AC-001..003,008; SCN-001,002 | Editable Chat/Org/member field; current form text-only, AE-001/005/006 | DS-001 native input then DS-002/003 explicit apply |
| BEH-002 Contract | REQ-002,005; AC-004,007,008; SCN-003 | Local-versus-remote/mobile workspace selection; AE-004/010 | Gate before rendering/calling bridge; ineligible users stay on typed-path DS-002/003/004 |
| BEH-003 User | REQ-003,005; AC-003,005,008; SCN-004 | Choose/cancel/empty/invocation error from native contract; AE-002 | DS-005 result handling and DS-006 local lifetime preserve input/selection |
| BEH-004 User/System | REQ-004,005; AC-002,006..008; SCN-002,005 | Search/existing/temp/known path/locked saved roots; AE-005..007 | Unchanged select union and owners; DS-002..004 register/save only at existing boundaries |

## Relevant Supplemental Task Artifacts
External Product base path **P** = `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker`.
- `P/ui-ux-spec.md`, `P/user-confirmation.md`, `P/visual-references/manifest.json` and VIS-001..012: approved behavioral/visual authority for REQ-001..005/AC-001..008. Follow all affected-control details; only explicit illustrative data/native chrome/unrelated-surrounding-UI exceptions vary.
- `P/product-handoff.md`, `P/product-ticket.md`, `P/final-validation.md`, `P/ui-behavior-test-matrix.md`, `P/integration-record.md`, `P/ui-reference-runbook.md`: durable provenance/evidence/launch instructions; reference only, not production proof.
- `P/baseline-reevaluation.md`, `P/scoped-baseline-check.json`, `P/review-round-1.md`, review/final evidence folders and canonical design-root `ui-baseline-report.md`: scoped baseline and historical evidence. Final spec supersedes old Escape prose; no broad refresh/fixture rewrite.
- Local `requirements-approval.md`, archived requirement snapshots, Product request/receipts and cumulative `solution-revision-record.md`: approval/history. Complete absolute supplement inventory stays in investigation notes. No supplement is silently dropped or copied into a competing Product specification.

## Task Design Health Assessment
- Posture: **Bug Fix**, restoring a supported input affordance; root cause **Local Implementation Defect** during shared-control replacement. Approved error/recovery refinement fits the same owner.
- Current structural design issue: **No**. Existing shared menu, actual-context policy and native API already provide the right boundaries. **Refactor needed now: No**.
- Capability-reuse trigger applies: reuse host bridge, node/mobile gate, shared menu and existing popover/draft lifecycle.
- Boundary-bypass trigger ruled out: the public bridge is the host boundary, not the internal `ipcRenderer`; no call to both a workspace owner and its internal persistence. `pickFolderPath` is optional lossful convenience, not a governing owner. New menu depends only on the full host API, not that helper plus its internals.
- Repeated-coordination/overload/structure triggers ruled out: native presentation is localized in one existing shared component; no per-Agent/Team/Org picker handlers, no new generic state machine or duplicate workspace representation.
- Shared-helper refactor rejected: changing its return/error semantics would touch two out-of-scope workflows solely to enable this one control. Extending public host capabilities is unnecessary because the existing response already suffices.
- Deferrals: no required structural refactor deferred. OS-native validation, Product full-root static-check issue and locale QA remain explicit evidence risks, not justification for speculative machinery.

## Terminology
**Browse** supplies input; **Use folder** selects a setting; **Send/Run/Save** invokes existing persistence/runtime owners. These are distinct lifecycle steps. **Local** means embedded-node Electron, not merely a narrow/wide viewport or a URL that looks local.

## Legacy Removal Policy
No backward-compatibility paths. Retired forms stay retired; do not resurrect WorkspaceSelector. Do not introduce alternate old/new folder-result APIs, compatibility adapters or prototype fallbacks. Existing manual entry is an approved coequal input method, not a compatibility branch. Path-only helper workflows are not replaced by this task, so remain unchanged.

## Persisted Data / State Transition Decision
**Not Affected.** `RunWorkspaceChoice` remains `{kind:'existing',workspaceId}` or `{kind:'folder',rootPath}`; current select consumers, launch resolver and save operations remain unchanged (AE-005..007). New state is ephemeral pending/error/form lifetime. No stored schema/format/reader/writer/physical-store change, loss, reset or migration. Data migration conventions/plan **N/A** for this non-persisted delta; do not inspect or transform user data.

## Data-Flow Spine Inventory
| ID | Scope | Start → end | Owner / purpose |
| --- | --- | --- | --- |
| DS-001 | Primary native input; BEH-001,002 | Eligible editable form Browse → native directory chooser | Menu owns request presentation; existing main/OS owns chooser |
| DS-002 | Primary Agent/Team apply; BEH-001,004 | Form Use folder → Chat draft → later Send/launch resolution | Chat draft + launch service keep pending/registration boundary |
| DS-003 | Primary Org apply; BEH-001,004 | Root/member Use folder → root/placement draft → later Run | Org draft + launch service preserve scoped overrides |
| DS-004 | Primary saved placed-Team; BEH-004 | Allowed Use folder → saved-run draft → later explicit Save | Existing run-config owner enforces editability/save; locked roots stop at fixed text |
| DS-005 | Return/event; BEH-003 | OS/main reply or rejected invoke → current form input/error/focus | Menu interprets full existing response |
| DS-006 | Bounded local; BEH-001,003 | Idle form → pending → result/cancel/error → editable form | Menu prevents duplicate invocation/implicit apply and stale destination updates |

## Primary Execution Spines And Narratives
- **DS-001:** ChatNewSurface / OrgLaunchPage / RunMemberRow / allowed saved member → ChatWorkspaceMenu eligibility + Browse → `window.electronAPI.showFolderDialog()` → preload `show-folder-dialog` → ElectronApplication registered handler → `dialog.showOpenDialog({properties:['openDirectory']})`. Native machinery unchanged.
- **DS-002:** native-filled or typed path → confirmFolder (trim, absolute validation, known lookup) → select existing/folder → ChatNewSurface → chatDraftStore.setWorkspace → **later explicit Send** → chatLaunchService → resolveRunWorkspaceChoice → existing workspace resolution/registration → normal Agent/Team launch. Browse never calls downstream resolver.
- **DS-003:** Use folder → RunSettingsCard workspace intent → OrgLaunchPage.changeRoot / member row address intent → agentOrgLaunchDraftStore root or teamWorkspaces → **later explicit Run** → agentOrgLaunchService.resolveRunWorkspaceChoice → current Org launch request. Only the selected root/placement changes.
- **DS-004:** stopped/editable Org member card → Use folder → ExistingRunConfigEditor.changeScope → toWorkspaceSelection → existingRunConfigStore.updateAgentOrgWorkspaceSelection → **later explicit Save** → saveAgentOrg → current contexts store saveRunConfig with teamWorkspacePatches. Fixed saved roots still render no menu.

These separate narratives expose the lifecycle beyond the edited UI segment without redesigning downstream runtime/server code.

## Spine Actors / Ownership Map
| Node | Concrete responsibility |
| --- | --- |
| Menu | Form input/validation/error/pending/focus; guarded one-call native request; only explicit confirmation emits selection |
| Public preload bridge | Existing narrow host entrypoint and IPC transport, no workspace/domain policy |
| Main dialog handler / OS | Existing native directory interaction and response/error transport |
| Chat/Org/saved-run draft owners | Apply selection to intended subject/address, enforce their existing editing rules |
| Launch/save services | Existing registration, serialization, persistence/runtime effects after explicit action |

## Thin Entry Facades / Public Wrappers
Preload `showFolderDialog` is the existing transport facade; must not gain workspace selection, registration or save policy. Menu call need not pass through the optional `pickFolderPath` path-only convenience because it would erase required information. No new forwarding wrapper.

## Removal / Decommission Plan
| Item | Action / reason |
| --- | --- |
| Text-only form layout assumption | Replace locally with approved flex field/Browse row and contextual hint; keep typing |
| Inline form-cancel assignment | Replace with local cancellation/focus function matching Product spec |
| New-path error not cleared on typing | Update input handler to clear stale path/picker feedback as approved |
| Prototype HTML dialog/fixtures/synthetic delay | Never import; not a production path |
| Existing native helper, IPC, retired forms | No removal/addition: outside affected ownership or already removed; no compatibility seam introduced |

## Return / Event And Bounded Local Spines
**DS-005:** main `{canceled,path,error?}` or rejected IPC Promise → menu handler → transient state → nextTick focus. Handle an **error member before canceled/path**: main failures currently also set `canceled:true`. Treat presence of error (including an empty error message) as invocation failure, and rejected invocation identically. Show approved localized inline copy, not raw exception/path details. Without error, canceled or absent/empty path is silent/no mutation. Successful path changes only input and clears both stale feedback states.

**DS-006:** parent owner ChatWorkspaceMenu. `idle → guarded Browse → pending → selected | canceled/empty | failed → idle`. Use existing refs plus `picking:boolean`, `pickerError:boolean`, `browseRef`; no persistent/global state. Disable Browse and Use folder while pending and also guard their handlers (Enter must not bypass disabled submit). Reset pending in finally before returning focus to the appropriate visible control.

Respect actual form lifetime: normal Cancel, menu outside/Escape dismissal and unmount invalidate its destination. A small local form generation/disposed marker (or equivalent existing-lifetime check) plus captured node binding/selected-workspace identity avoids a late native reply filling or focusing a different form/context. Keep a pending request single until it settles; closing/reopening must not spawn a second call. Discard stale reply without selection, re-opening or invented cancellation IPC. This preserves approved input/selection ownership; do not add a global queue, route guards, timers or OS-dialog manager. Native focus/modal behavior must be proven on the real build, not assumed from the simulation.

## Off-Spine Concerns
| Concern | Serves | Reuse / why |
| --- | --- | --- |
| canUseLocalFolderPicker + windowNodeContextStore | Menu eligibility | Actual embedded node + bridge + non-mobile; no policy copy; async bootstrap already resolves context before UI |
| Localization catalogs | Menu copy | Existing en/zh-CN keys/fallback; five approved additions |
| isAbsoluteFolderPath + known workspace lookup | confirmFolder | Existing syntactic validation/path reuse, not existence probing |
| useAnchoredPopover/useMenuInBoundary | Menu lifetime/position | Existing Escape/outside/viewport/panel behavior, no shared-composable rewrite |

## Ownership Boundaries / Encapsulation Map
| Boundary | Callers | Forbidden shortcut |
| --- | --- | --- |
| window.electronAPI.showFolderDialog | Menu when eligible | Renderer importing Electron, raw ipcRenderer/Node fs, browser folder API or prototype dialog |
| Menu select union | Current Chat/RunSettingsCard parents | Native result emitting directly or mutating parent draft/store |
| Current draft/launch/save methods | Existing parents/services | Menu registering workspace, saving configs, starting run or querying backend just to browse |

## Dependency Rules
Menu may read workspace options/context, reuse feature/validation/popover utilities and invoke public host bridge. It must not use both path-only helper and bridge, copy node/mobile policy, import server/core, or acquire new application-state ownership. IPC/main and current downstream owner dependency directions stay unchanged.

## Interface Boundary Mapping / Check
| Interface | Subject / accepted identity | Responsibility and result | Check |
| --- | --- | --- | --- |
| showFolderDialog() | No workspace identity/arguments | Native directory choice, Promise<{canceled:boolean,path:string\|null,error?:string}> unchanged | Singular, explicit, low ambiguity |
| select(RunWorkspaceChoice) | Existing workspaceId OR rootPath, discriminated kind | Select form-confirmed workspace; unchanged | Singular, explicit, low ambiguity |
| Existing parent change-member | Existing member address + workspace choice | Scoped Org override; unchanged | No guessed subject ID |

No API/type/DTO edit. Main subject names Browse, folder path, workspace choice and pending picker are natural and distinct; no vague manager/support naming.

## Existing Capability Reuse / Subsystem Allocation
Extend shared Chat/workspace-selection presentation; reuse desktop host boundary, node/mobile policy, localization and draft owners. No new subsystem, module grouping, generic picker adapter or service. This is intentionally flat inside the current component because the added local state is one coherent input concern.

## Draft And Final File Responsibility Mapping
Initial candidate mapping: menu owns interaction; native helper might adapt response; locales own copy. AE-002/003 prove full response already exists and helper consumers expect lossy semantics, so remove the helper-change candidate. Final mapping:
| Change | File (under autobyteus-web/) | One concrete concern |
| --- | --- | --- |
| Modify | components/chat/ChatWorkspaceMenu.vue | Approved input UI, actual-context eligibility, native reply/pending/error/focus/lifetime; unchanged confirmation event |
| Modify | localization/messages/en/chat.ts | Approved browse/openingPicker/localPathHint/serverPathHint/pickerError copy |
| Modify | localization/messages/zh-CN/chat.ts | Same approved Chinese keys through existing localization |
| Modify | components/chat/__tests__/ChatWorkspaceMenu.spec.ts | Native response/cancel/error/pending/focus/context plus existing search/placement regressions |
| Add or extend colocated caller tests | components/run-settings/__tests__/RunSettingsCard.spec.ts and existing OrgLaunchPage/RunMembersLine tests as needed | Workspace event propagation and locks; prove actual shared menu integration, not only stubs |
| Modify test only | electron/__tests__/preload.spec.ts | Existing show-folder-dialog invoke and path/cancel/error/rejection propagation |
| Downstream test-owner addition | tests/e2e/workspace-folder-picker-probe.mjs or established equivalent; package script and docs only if needed | Durable realistic journey harness/evidence, no production fixture layer |

Production unchanged: native helper/its consumers, main/preload/types, gates/bootstrap/popover, callers/stores/launch/save/services. Any need to change these materially re-enters design; test files may be chosen by responsible specialist while preserving coverage intent.

## Reusable Owned Structures / Model Tightness
No new shared type or parallel representation. Reuse existing bridge result and RunWorkspaceChoice. Store only transient boolean pending/error and refs; do not store duplicate selected-workspace data or a second path-normalization policy. A private menu handler owns UI-specific response translation, not a generalized shared API.

## Applied Patterns / Folder Boundary Check
Existing host bridge is an adapter/transport boundary; the small local async state transition is inside the menu. Components remain renderer presentation, locales off-spine content, Electron tests transport checks, E2E tests test-owned validation. No folder moves or added production grouping; no mixed renderer/main logic.

## Concrete Shape Guidance
```
Browse eligible + not pending
  -> existing showFolderDialog()
  -> current form only:
       error field / rejected invoke => localized picker error; preserve text/choice
       canceled / no path            => silent preserve
       selected path                => text only, clear feedback
  -> pending ends; focus text on selection, Browse on cancel/error
Use folder (not pending)
  -> existing validation + known-path mapping -> existing select event
```
Avoid `if (result.canceled) return` before checking error, because main failure also carries canceled:true. Avoid `await pickFolderPath()` for this error-aware UI; avoid raw bridge error text as user copy.

## Backward-Compatibility Rejection Log
| Candidate | Decision / clean target |
| --- | --- |
| Change helper result and retain a legacy wrapper for sidebar/apps | Rejected; existing complete bridge suffices, no out-of-scope consumer migration |
| Restore retired WorkspaceSelector/form stack | Rejected; extend current shared menu |
| Browser custom dialog fallback if native missing | Rejected; approved manual entry is the only ineligible path |
| Old/new payload or persistence compatibility | N/A; no shape transition |

## Derived Layering
Not needed beyond boundaries above; adding a layer solely to forward one existing API obscures the simple path.

## Change / Refactor Sequence
1. Reconfirm approved R3/Product pins and source-current task workspace; do not copy prototype state/dialog/adapters.
2. Add approved localized strings and shared form presentation/accessible relationships.
3. Add actual-context gate and guarded local native-call handling with error-before-cancel, lifetime and focus; preserve confirmFolder mapping and caller signatures.
4. Add/run focused renderer, caller and preload tests; retain earlier search/placement/gate coverage. No production main refactor just for a test seam.
5. Inspect rendered desktop/narrow/locale UI against final references, then validate native open/select/cancel on a newly built isolated Electron app plus controlled failure/empty cases. API/E2E and Delivery own their downstream artifacts/claims.
6. Update relevant documentation during normal delivery, no release or cleanup of other tasks. No migration, wrapper-removal phase or cutover required.

## Verification Intent / Guidance For Implementation
Per TESTING.md, execute one-shot tests, e.g. `pnpm -C autobyteus-web test:nuxt components/chat/__tests__/ChatWorkspaceMenu.spec.ts components/run-settings/__tests__ utils/__tests__/mobileFeatureGates.spec.ts --run` and `pnpm -C autobyteus-web test:electron __tests__/preload.spec.ts --run`; adjust only to actual new test paths. These are proposed commands, **not executed evidence**.

Required assertions: actual full bridge outcomes including error+canceled, rejected Promise, empty, success; no select/workspace creation on return; known/new choice on explicit apply; pending duplicate activation/form Enter blocked; label/description/alert/focus; cancel preserves typed and current selection; retry/input clears stale feedback; local versus remote/no-bridge/mobile zero-call matrix; close/unmount pending reply does not mutate/refocus a different destination. Existing manual syntax/search/temp and locked-field behavior remain.

Realistic UI: Agent and Team Chat, Org root and editable placed Team must all use same behavior; saved roots stay locked and allowed saved-Org team changes only its existing draft until Save. Validate 1512×862 and 390×844 app layouts and English/Chinese copy against Product spec/VIS, honoring explicit fixture/OS variation. Track coverage gaps honestly, not blanket passes.

Native proof: `pnpm --silent isolated-app start --build` from this task, per docs/isolated-app-instances.md, then actual OS chooser open/select/cancel via native UI, returned path and unchanged selection until Use folder. Own fixtures/data/ports only; never target installed user app. Stop exact owned instance and retain evidence. Controlled returned errors/empty are UI-boundary tests, not OS permission/failure proof. No paid-model inference is needed for these setup/selection checks. Full E2E/validation ownership stays with API E2E Engineer; implementation self-checks do not replace it.

## Key Tradeoffs
Direct public bridge consumption avoids information loss, unrelated helper API churn and compatibility layers. UI-specific outcome handling remains in the existing single shared presentation owner, where approved feedback belongs. Bounded local callback guard adds only necessary ephemeral lifetime state. No global filesystem/dialog/persistence redesign.

## Risks
Actual unparented native chooser focus/Escape/window behavior requires isolated build evidence; return a Design Impact if existing bridge cannot satisfy approved semantics. Existing Product full-root vue-tsc failure and Chinese QA gap are not waived by reference build success. No claim of all-OS certification, installed-build reproduction, backend persistence or production delivery. Current task source is pinned; if integration advances before delivery, reconcile without discarding unrelated work or silently weakening approved UI. Approval/role boundaries remain in force.

## Applied Route
After completed classification, current get_handoff_rules selected Small/Low Architecture Design Complete → /implementation_engineer. Independent architecture review N/A — not applicable. Approved requirements, Product supplement and all normal implementation/API-E2E/delivery gates remain required. Cumulative dispatch receipt: solution-handoff.md.
