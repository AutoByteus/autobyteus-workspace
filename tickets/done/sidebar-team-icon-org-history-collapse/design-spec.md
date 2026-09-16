# Design spec — Sidebar fixes and Org authoring parity

## Solution And Approval Basis
**SIDEBAR-ORG-20260916-001 · SR-006 · DS-REV-002 · Ready / Architecture Design Complete.** This is the complete current design, superseding DS-001. REQ-001–003 remain approved under USER-APPROVAL-20260916-001; REQ-004/005, AC-005–008 approved under USER-APPROVAL-20260916-002 and reconfirmed by “Yes, let's do it. I think the requirement is clear now. Let's do it.” All SCN-001–005 supported; no unapproved prototype or additional behavioral supplement. Canonical authority: requirements-doc.md. Evidence: investigation-notes.md E-001–011; personal-team-deletion-comparison.md evidence-only. IR-001 source and evidence already exist and MUST be preserved. No designer implementation/test result is claimed.

## Current-State Read
Original sidebar: Team images fallback to initials; Org images were not consumed; Org root disclosure shared an open action whose active+expanded gate skipped collapse. IR-001 already implements independent disclosure and avatar-first container headers using existing owners; keep it, validate cumulatively.
Expanded scope: AgentOrgExperience has no avatar editor, catalog/detail use initials, detail lacks Delete. Existing Org data/query/store support avatarUrl; existing create/update/delete API and source ownership checks exist. Org deletion removes the exact owned package directory, not member reference graph/history/runtime. Existing store create/delete only adjust Pinia membership, leaving cached collection membership potentially stale. Team source at pinned origin/personal confirms package deletion principle but its unconditional cache callback must not be copied. See E-007–011.

## Task Size And Architectural Risk (Mandatory)
**task_size=Medium; architectural_risk=Low**, assessed after completing this expanded design (not inherited automatically from DS-001). Several frontend files within existing authoring, metadata and presentation owners, plus bounded shared modal enhancements and tests. No backend production change, public query/mutation schema change, new persistence semantics, new runtime owner, lifecycle/concurrency protocol or deployment change. The new Delete control invokes an existing destructive operation; its known folder boundary and source guards are preserved, explicitly approved, and tested. Functional destructive-operation precautions do not require a new deletion architecture. Avatar writes use existing normal readers/writers; no migration or authoring conversion.
Escalate if backend deletion must change ownership/cascade, cache identity requires a new source resolver, upload requires public API/schema/security change, source write restrictions need alteration, or implementation needs runtime/history cleanup. Then reclassify/review before dependent work. Do not make new policy to keep Low. Document/image volume does not determine risk. Direct route is appropriate only for this specified existing-boundary solution.

## Architecture Investigation Evidence
E-001–006 and IR-001: sidebar owner seams and original validation limits. E-007–009: Team/Org form comparison, exact Org delete service/provider/transaction scope, empty-string clear encoding. E-010: pinned Sep11 original-personal Team package deletion. E-011: mutation/cache/form integration and existing reusable modal. Source inspection only for expanded work; no upload/delete/app action performed by Designer.

## Intended Change
1. Preserve IR-001 Team/Org sidebar avatar-first + glyph fallback and independent exact-root disclosure.
2. Add optional avatar upload/preview/removal in Org create/edit, Save-bound persistence and images in Org catalog/detail.
3. Add Org detail Delete with named irreversible confirmation: delete only own package and local definitions, not shared references/history, using existing mutation.
4. Keep metadata cache/list coherent only after successful writes. Retain errors, source protection, revision safety and all original sidebar acceptance.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior / acceptance | Supported trigger | Production path | Boundary |
|---|---|---|---|
| BEH-001 / AC-001 | Browse sidebar | Definition stores → avatar state/bindings → group image/glyph | Read/view DS-001 |
| BEH-002 / AC-002–003 | Root chevron mouse/keyboard | Org collection → tree-state toggle(rootRunId) → visible children/ARIA | Local visibility DS-002 |
| BEH-003 / AC-004 | Title/open/Stop/navigation | Existing subject actions/context/router → workspace | Existing lifecycle unchanged DS-003 |
| BEH-004 / AC-005/006/008 | Pick image, preview/remove, Save/cancel | Avatar editor → file upload owner → draft → Org store create/update → current backend → returned definition/catalog | Draft vs persisted metadata DS-005 |
| BEH-005 / AC-007/008 | Detail Delete → confirmation | Captured definition ID → Org store.remove → existing GraphQL/service/provider/source guard → exact package deletion → catalog/navigation | Existing definition write authority DS-006 |

## Relevant Supplemental Task Artifacts
requirements-doc.md current approval; investigation-notes.md evidence inventory; four user reference screenshots, not target prototype. personal-team-deletion-comparison.md pinned source-only reference. design-spec.ds001-historical.md superseded record for IR-001 lineage, NOT current spec. Implementation-owned implementation-handoff.md/revision and validation logs remain read-only evidence. No Product Design request inferred from old dummy message.

## Task Design Health Assessment (Mandatory)
Posture local bug fixes and bounded authoring enhancement. Root cause Local Implementation Defect/Missing Invariant: conflated disclosure/open; missing avatar and delete surfaces; catalog coherence omitted. Existing ownership remains sound. **Refactor needed now: bounded local extraction only**, not subsystem rewrite: keep new upload asynchronous UI concern in a small Org avatar editor, reuse one Org image presenter for repeated editor/catalog/detail artwork, extend existing generic confirmation shell instead of copying a dialog. Store remains mutation/cache owner; no data access in child components. Preserve IR-001 source and original avatar state owner; do not merge definition artwork with execution status.

## Terminology
Org definition package = `agent-orgs/<id>/` containing org.md, org-config.json and optional local agents/agent-teams folders. Shared member ref is a reference, not ownership. Delete definition is not Stop run or Delete history. Uploaded asset is independently stored; removing avatar reference is not asset deletion. DefinitionId drives authoring; rootRunId drives sidebar disclosure.

## Design Reading Order
Approved scenarios/evidence → spines and state ownership → targeted file/interface changes → tests. This replaces, rather than layers a compatibility path over, DS-001.

## Legacy Removal Policy (Mandatory)
Remove replaced Org create hardcoded avatar null only where create now uses draft value; replace initials-only render branches with image/fallback, preserve initials fallback on catalog/detail. Remove sidebar old disclosure/open gate (already IR-001). Remove obsolete unconditional claims/tests that ALL Org edits omit avatar; retain them for unchanged-avatar edits. No old/new modes, new migration compatibility layer or duplicate API.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)
**Directly Usable — No Migration** for avatar definitions: existing org-config.json string/null field and optional-reader normalization remain canonical. Normal GraphQL/string update accepted today. Unchanged edits omit avatar; edited empty string passes current service and normalizes to null via domain, so existing current serializer/reader round-trip absent avatar. Representative existing tests carry string avatar, hidden metadata and expected revision; include expanded real boundary tests before acceptance.
Deletion is explicitly requested loss of ONE writable definition package including contained local definitions. Existing package source locator/guard + path-locked recursive removal remain unchanged. Shared paths, history/conversation/attachment storage and uploaded asset storage are outside that removal path. No data migration, reset, conversion, global cleanup, new cascade or startup action. No runtime stop or promise of future launch/restore with a deleted required definition. Existing external read-only source rejection retained. Tests use isolated disposable data only; no user package deletion permission follows from design approval. Data volume irrelevant to representation change; no bulk scan introduced.

## Data-Flow Spine Inventory
| Spine | Scope / start → effect | Owner |
|---|---|---|
| DS-001 | Primary: sidebar catalog metadata → avatar/glyph | Existing definition stores + avatar state |
| DS-002 | Primary: root chevron → expansion map → descendants | Tree-state composable |
| DS-003 | Primary preserved: title/open/Stop → subject action → context/route | Existing subject action owner |
| DS-004 | Return/local: image error → failed URL fallback; new URL → fresh image | Existing sidebar/avatar presenter |
| DS-005 | Primary: Org image picker → upload endpoint → draft → Save → definition writer → visible returned avatar | Org form/store; upload service ancillary |
| DS-006 | Primary: confirmed detail Delete → existing deletion authority → catalog removal → list | Org form/store and unchanged definition provider |
| DS-007 | Return/local: successful mutation → Pinia + Apollo collection → dependent views; false/error → feedback | Org definition store/form |

## Primary Execution Spine(s)
DS-001: sidebar panel mount → existing Org/Team definition queries/stores → useRunHistoryAvatarState → typed bindings → headers. IR-001 preserved.
DS-002: native chevron button → exact-root toggle → existing map → children hidden/shown. No command/network.
DS-003: title ensures expanded → existing open action → inspection/context/router → one-shot genuine selection reveal. Stop unchanged.
DS-005: user image picker → AgentOrgAvatarEditor → fileUploadStore.uploadFile → existing `/upload-file` → returned URL → local draft preview → Save via OrgDefinitionStore → GraphQL → AgentOrgDefinitionService (revision validation) → provider current serializer → returned full definition → store/cache/image.
DS-006: detail Delete → capture ID/name → named confirmation → OrgDefinitionStore.remove(ID) → deleteAgentOrgDefinition → Studio-bound Org service → existing source guard/provider/transaction.remove(packagePath) → true → exact metadata cache/list removal → catalog. False/error → no success/navigation.

## Spine Narratives (Mandatory)
Artwork is metadata, not execution state. Upload creates an asset but does not save Org until Save. The editor owns only upload UI; parent owns editable draft and unchanged-versus-edited intent; store owns mutation projection and catalog state. Cancel leaves definition unchanged (asset orphan policy unchanged from Team). On deletion, one captured ID crosses the existing authority once; no list of member IDs is submitted and no referenced member services are called. True deletion updates metadata, not runtime/history. Original-personal provides ownership precedent, not code to paste wholesale.

## Spine Actors / Main-Line Nodes
AgentOrgExperience orchestrates form/confirmation/navigation. AgentOrgAvatarEditor owns picker/pending/errors tied to its mounted draft. AgentOrgAvatar renders URL/name/fallback only. fileUploadStore owns existing transport. agentOrgDefinitionStore owns all authoring commands and cache coherence. Server provider alone decides source writability and physical removal. Common ConfirmationModal remains a presentational shell without mutations.

## Ownership Map
Draft/avatar dirty state and delete target: Org Experience. Upload request state/lifetime: Org editor. Image failure: image presenter (catalog/detail/edit) and existing sidebar avatar-state owner. Catalog/query cache: Org definition store. Permanent files: current server services/providers. Root expansion, selection, streams and runtime: unchanged original owners. No runtime state is cleared to refresh a definition page.

## Thin Entry Facades / Public Wrappers (If Applicable)
N/A — existing store/GraphQL methods are real boundaries; no new pass-through service. New UI components own concrete rendering or upload-lifetime state.

## Removal / Decommission Plan (Mandatory)
Replace Org static create-avatar assignment with explicit draft field. Replace catalog/detail initials-only markup with shared Org presenter preserving fallback. Keep hidden-field omissions for unchanged inputs. Replace cache-only-Pinia mutation completion with success-gated cache/list publication. Do not delete old tests indiscriminately or replace original sidebar implementation. No public API or file removal planned.

## Return Or Event Spine(s) (If Applicable)
DS-004: image error tied to URL; replacement URL can load. DS-007: successful mutation updates currently cached collection if present and Pinia, then UI completion; unsuccessful mutation does neither. True delete is not silently retried because navigation later fails. Store must validate expected response before claiming success; HTTP/GraphQL error remains error, false deletion is non-success. No optimistic deletion.

## Bounded Local / Internal Spines (If Applicable)
Upload editor is keyed by form view + Org ID; unmount/disposal invalidates the local pending result before it can emit into another draft. Disable picker/remove while its upload is pending; disable Save both visually and in handler. Reset parent pending state on form hydration. No network cancellation guarantee/registry/version protocol added. Save and delete each have local in-flight guard. Delete target captures ID/name at confirmation opening; route change closes stale dialog; a response cannot delete a newly selected Org or steal newer navigation. Existing selection intent machinery stays out of authoring.

## Off-Spine Concerns Around The Spine
Localization en/zh-CN Org catalogs; image accept parity JPEG/PNG/GIF/WebP; no new cropper/type pipeline/garbage collector. Current revision conflicts and read-only rejections surface as errors while draft remains. Missing/broken avatars preserve layout/initials on catalog/detail, Team/Org glyphs only on sidebar. Confirmation states exact name, local-package scope, shared/history preservation and irreversible action; names rendered as text, never interpolated into raw HTML. Common modal pending disables double action and cancel after submission; pre-submit Cancel is mutation-free.

## Ownership Boundaries
UI reads/writes through existing stores; image component never fetches definitions. Org delete does not call shared Agent/Team removal, runtime stop, history purge or filesystem API. Store cache effects touch only relevant Org catalog/entities; do not invalidate runtime contexts or unrelated shared definitions. Server source restrictions remain authority (no inference from frontend ID shape). An external source may show action and receive existing truthful rejection; no new writability query/schema proposed.

## Boundary Encapsulation Map
Experience → editor/presenter/confirmation for UI; Experience → Org store for create/update/delete; editor → upload store for upload; Org store → current GraphQL; server resolver → current domain service/provider. No frontend route reaches provider/cache internals behind store; no new definition deletion service.

## Dependency Rules
Keep empty-string removal encoding at UI command boundary because current server semantics already support it; do not alter null semantics on backend. Preserve unrelated fields via omission and exact member-input projection. Cache changes only AFTER verified mutation success; no old Team callback that evicts on false. Do not copy avatars into history trees. No new execution traversal, provider startup, schema/migration, state reset, shared-definition deletion or runtime cleanup.

## Interface Boundary Mapping
- AgentOrgAvatar: props name, optional avatarUrl, size/style variant as minimally needed; renders img/error fallback initials. Key/reset failure by URL. No definition store or upload responsibility.
- AgentOrgAvatarEditor: string v-model draft URL + disabled input; emits pending state and new draft value; owns file input/upload error and uses presenter. Key by form identity. Empty value means no draft avatar.
- Org Experience: initialize draft from definition or empty; remember initial string. On edit, include avatarUrl only when current differs from initial (including explicit empty clear); on create use URL or null. After successful save refresh initial baseline from returned canonical definition; do not reset unrelated draft from background catalog changes.
- Common ConfirmationModal: additive optional `pending=false` and default content slot (existing message fallback retained for current callers). Default slot allows safe text name/scope/error; existing callers keep default behavior. Pending guards click handlers/buttons and Cancel. Keep existing danger variant/localized Cancel. Do not interpolate user names into its v-html message fallback.
- Org store existing create/update/remove signatures stay. Success-gated cache membership maintenance internal, no extra API exposed.

## Interface Boundary Check
Only exact definition ID passed for save/delete, with existing expectedRevision on update. Root run IDs remain confined to sidebar actions. Upload URL is a value, not definition authority. Additive modal props/slot are local renderer contract, defaults preserve all existing consumers. GraphQL schema unchanged.

## Main Domain Subject Naming Check
Names retain Org/avatar/definition distinctions. No generic ObjectMutationManager, combined run/definition ID, or new coordinator. Uploaded-file reference removal is not deletion of an uploaded file.

## Existing Capability / Subsystem Reuse Check
Reuse fileUploadStore, existing current Org mutations/store, source guards and transaction, generic ConfirmationModal, existing sidebar composition and locale catalogs. Add only bounded Org artwork/editor components, not duplicate file upload or modal frameworks. Existing old AgentDeleteConfirmDialog was inspected; common modal is a closer fit for localized named package-scope body and danger style.

## Subsystem / Capability-Area Allocation
Org authoring UI extends agentOrgs components; metadata/cache stays in stores; general dialog shell stays common with no Org dependency; current server definitions unchanged. Sidebar stays original IR-001 ownership. Tests aligned to each concern; no module migration.

## Draft File Responsibility Mapping
Experience: draft/delete orchestration; new avatar presenter: repeated image/fallback; new editor: picker/upload pending/errors; Org store: successful cache/list mutation results; common modal: optional slot/pending rendering only; locales: labels; current sidebar files preserved. Extraction avoids adding asynchronous upload mechanics and three repeated image-error branches to Experience.

## Reusable Owned Structures Check
One small Org image presenter serves edit preview/catalog/detail. No new cross-product avatar framework: sidebar glyph semantics differ and existing state is already tested. Reuse one internal success publication/cache helper inside Org store if it reduces repetition across create/update/delete; must keep operation/ID explicit and must not become global cache manager. No duplicated history-avatar fields.

## Shared Structure / Data Model Tightness Check
AgentOrgDefinition already carries optional avatarUrl; no new persisted shape. Distinguish absent edit field (preserve) from empty edit value (clear via current domain); create null is valid. Draft string is transient UI state, not a second durable definition. Delete target record only ID/name, not copied member graph. Common modal slot/pending has one meaning and no Org ownership fields.

## Final File Responsibility Mapping
All frontend paths under autobyteus-web/:
- **Preserve IR-001** sidebar/composable/binding/locale files and tests; rerun impacted acceptance, do not recreate assignment.
- **Modify** `components/agentOrgs/AgentOrgExperience.vue`: avatar draft integration, create/update intent, saved display, detail Delete target/confirmation/pending/error and success navigation. Keep Run, members/handoffs/reference validation and existing editor behavior intact.
- **Add** `components/agentOrgs/AgentOrgAvatar.vue`: scoped image/initials renderer used in form/catalog/detail; no stores.
- **Add** `components/agentOrgs/AgentOrgAvatarEditor.vue`: image picker/upload/preview/remove; existing upload store, draft lifetime and feedback.
- **Modify** `stores/agentOrgDefinitionStore.ts`: keep public methods; after successful response update Pinia and cached Org catalog membership; exact successful deletion entity eviction where appropriate. Normalization of update response retained; no history mutation.
- **Modify** `components/common/ConfirmationModal.vue`: optional pending and content slot, preserve current no-slot/nonpending defaults; test existing legacy consumers' appearance/interaction unchanged (not a legacy code path).
- **Modify** `localization/messages/{en,zh-CN}/agentOrgs.ts`: avatar/deletion/feedback/warning strings. Existing common Cancel reused.
- **Add/extend tests** in nearby component/store __tests__; extend real Apollo Org editing/owned-authoring scenarios and modal regression. Add server integration/fixture assertions only as necessary to demonstrate unchanged empty-string write and exact delete scope through real current services; no server production edit planned.

## Applied Patterns (If Any)
Controlled draft component; presentational reuse; existing store as command/cache boundary; named confirmation before destructive command. No new transaction pattern—the current backend transaction remains authoritative.

## Target Subsystem / Folder / File Mapping
components/agentOrgs contains Org-specific UI; common contains reusable modal shell only; stores contains definition data/cache owner; localization contains language text; colocated __tests__ follows repository convention. No new production folder/rename/delete. Full inventory above; test fixture files must not leak private data.

## Folder Boundary Check
One feature folder for Org UI with small concrete components keeps responsibility clear; no transport/persistence in UI. Shared modal must not import Org stores/types. Existing same-level components appropriate for this depth; adding framework or generic service would over-split.

## Concrete Examples / Shape Guidance (Mandatory When Needed)
Unchanged image: `{description: 'new'}` omits avatarUrl. New image: `{avatarUrl: '/...uploaded...'}`. Remove: `{avatarUrl: ''}`; backend normalizes stored value to null. Do NOT send null assuming it clears (current service would preserve). On successful Delete X, remove X from Org list/cache; do not call deleteAgent(sharedRef) or deleteTeam(sharedRef). A failed Delete returns false/error without hiding X. Dialog name rendered `{{ target.name }}`, not raw HTML in message. Upload A returning after its editor unmounted cannot emit into editor B.

## Backward-Compatibility Rejection Log (Mandatory)
No backend old/new avatar semantics, schema switch or per-version deletion path. Preserve existing current API, not compatibility wrappers. Slot fallback and pending=false are ordinary reusable component defaults, not retained superseded flow. Historical personal implementation is rationale only. Missing-image fallback is approved behavior, not legacy mode.

## Derived Layering (If Useful)
N/A — concrete UI/store/server ownership above is sufficient; no new layer.

## Change / Refactor Sequence
1. Preserve original IR-001 source/tests and record expanded basis; do not overwrite other-owner work.
2. Add Org avatar presentation/editor and wire controlled draft, upload pending and create/update omission/clear semantics; test save/cancel/failure/identity before broad UI work.
3. Add success-gated catalog coherence in Org store; real Apollo test cache-first reread after create/update/delete, false/error preserved.
4. Extend modal shell minimally; wire Org detail captured-target Delete, owned-package warning, pending/error and exact success navigation; keep Run/Edit.
5. Extend en/zh-CN, add durable component/store and backend-boundary fixture tests; validate rendered surfaces with actual components.
6. Re-run original sidebar regressions and retain baseline diagnostics. Hand cumulative implementation/evidence to existing downstream API owner through current workflow, not a new parallel validation assignment.

## Key Tradeoffs
Reuse existing delete operation rather than new graph cascade: preserves original-personal ownership pattern and current source restrictions. No custom avatar removal endpoint because it changes definition reference only. Small local upload component gives clear lifetime without broader concurrency machinery. Cache fixes belong to mutation owner and run only on true success; not a global refresh/reset. Uploaded-but-unsaved asset cleanup remains existing behavior, not additional policy.

## Risks
Irreversible local-package removal must be visible and fixture-tested. Imported read-only package rejection must remain truthful. Null-vs-empty clear pitfall requires actual persistence test. Cached collection can resurrect deleted entries if only Pinia filters; use real Apollo test. Late upload and stale delete target require simple scoped guards. Existing modal message uses v-html: avoid it for dynamic Org name through safe slot. Baseline test/type failures persist; do not claim global green/no-new-errors without evidence. Functional tests of future restore after deleted definitions are NOT a new product guarantee.

## Guidance For Implementation
**Cumulative validation:** AC-001–004 remain; keep IR-001 narrow evidence with original broader failure/typecheck qualifications (not API Pass). AC-005/006: actual picker/upload preview, Save/reload, replace, remove/reload, unchanged edit omission, cancel, rejected upload preserving draft, Save disabled while pending, stale result after route change, broken image fallback, en/zh-CN labels; unrelated metadata/members/handoffs unchanged. Do not fake upload success by only seeding URL for acceptance.
**Mutation boundary:** exercise current GraphQL/service/provider empty-string clear with normal current serializer; no manual file patch as substitute. Real Apollo cache membership tests for create/update/remove; errors/false must not evict or announce success. Component double Confirm yields one in-flight command; cancel yields zero. Navigation failure after confirmed backend success must not auto-resend deletion.
**AC-007/008 delete acceptance:** isolated new Org fixture with both Org-owned child definition folders and separately shared Agent/Team references, plus separately stored run-history evidence. Actual detail button → named warning → Cancel proof → confirm → catalog absence after refresh; exact package/local children absent, shared definitions/history/attachments unchanged. Separate read-only/failure case produces error and no false navigation. No real user/external package deletion; no providers required merely for definition tests. Runtime Stop must not be called from Delete.
**UI review:** inspect actual Org create/edit/catalog/detail/sidebar, confirm images/controls not clipped and modal frontmost, keyboard usable. Real browser for web-equivalent UI; do not infer native/Electron coverage or provider/platform certification. API reports explicitly distinguish controlled boundary tests from actual UI journeys.
**Routing/recovery:** previous API handoff for sidebar already exists. Revised package authorizes extending the same execution/ticket only. Forward through rule-selected cumulative workflow after new implementation, maintaining hold against incomplete expanded-ticket completion. If real persistent/API/ownership changes are required, return Design Impact before altering them. No commit/push/merge/release, app launch against user data or user package deletion authorized here.
