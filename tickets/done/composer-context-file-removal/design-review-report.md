# Design Review Report — composer-context-file-removal

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/requirements-doc.md` (Approved, SR-003)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts Reviewed: none behavior-defining; 19.png / 20.png are evidence only.
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: `Architecture Design Complete` from `/software_engineering_team/solution_designer` (SR-003).
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `codex/composer-context-file-removal` @ `46e94fdea` (clean apart from ticket folder). Read: `autobyteus-server-ts/src/api/rest/context-files.ts`, `src/context-files/domain/context-file-owner-types.ts`, `src/context-files/services/context-file-local-path-resolver.ts`, `src/api/security/remote-access-route-policy.ts`, `src/compositions/build-studio-server.ts` (REST prefix, `maxParamLength`), installed `find-my-way@8.2.2` wildcard matching; `autobyteus-web/stores/contextFileUploadStore.ts`, `utils/contextFiles/contextFileOwner.ts`, `utils/contextFiles/contextAttachmentModel.ts`, `composables/useContextAttachmentComposer.ts`, `components/agentInput/ContextFilePathInputArea.vue`, `composables/agentInput/useComposerTarget.ts`, `stores/windowNodeContextStore.ts`, `plugins/20.windowNodeBootstrap.client.ts`, `services/api.ts`, `utils/remoteAccess/authorizedTransport.ts`; root `DESIGN.md`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: the change collapses the whole `/rest/drafts/*` route family into one codec-driven GET/DELETE pair with a unified HTTP error mapping, and swaps the draft-locator parsing in `ContextFileLocalPathResolver`, which runtimes use to resolve attachments to local files. That is a shared contract surface beyond the composer.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Wherever a file can be attached, it can be removed. Delete is one operation that works for every owner kind. Removing an item never deletes another composer's draft. Upload controls are gated where no upload owner exists. Attach and remove failures are visible. DEC-001 is withdrawn: a failed delete keeps the item and shows an error.
- Relevant existing behavior and evidence confirmed: Yes. `context-files.ts` registers GET for all four draft kinds but DELETE only for agent, team-member and Org drafts. No DELETE route exists for `/drafts/agent-collaborations/...`. `removeItem` and `clearCurrentTargetAttachments` log to the console and keep the item, `uploadFiles` returns silently without an owner, and upload failure only logs to the console. `store.error` is written but never read by the UI (grep). The client rebuilds the delete URL from the current target owner (`buildDraftContextFileEndpoint`).
- Scope guardrail confirmed: Yes. In scope: UC-001..UC-004. Out of scope: mobile, the Project Task composer, send-error surfacing, composer visibility, TTL and finalization. Preserved: BEH-002, BEH-003, upload and finalize for all kinds, and other composers' drafts.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: Yes (no blocking findings).
- Remaining material ambiguity: UNK-001 (whether a delegated child can still be composed to after its Task is DONE or CANCELLED). This does not block. The fix is keyed to the owner, so it applies in any state where the composer is visible.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (missing DELETE route confirmed in code; live 404 in investigation) | Pass (DS-001: delete at the attachment's locator → `DELETE /rest/drafts/*` → codec → `deleteDraftFile`) | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass (locator strings unchanged; the same read service is used) | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass (no server call for path attachments) | Confirmed | — |
| BEH-004 | User | Pass | Pass (`uploadFiles` silently returns when `!draftOwner`; `+` gated only on `!target`) | Pass (DS-003), see AR-002 | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass (D4 own-draft rule + visible error; AC-006 explicitly approves local-only removal for foreign or owner-less drafts) | Confirmed | — |
| BEH-006 | User | Pass | Pass | Pass (DS-003 composer error), see AR-002 for the clone path | Confirmed | — |
| Contract (QR-001 / AC-005) | Contract | Pass | Pass | Pass on the server (one parse drives both GET and DELETE); client coverage is noted in AR-001 | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None. 19.png and 20.png are evidence-only references, listed consistently in the requirements and investigation notes.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug Fix; design issue found | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Duplicated Policy Or Coordination`. Verified: the locator shape is encoded in `buildDraftContextFileLocator`, in the per-kind REST registrations, in four resolver regexes, in `buildDraftContextFileEndpoint` and in the client parser. The defect is a copy that was missed. | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes (bounded); consolidating the final-file routes is explicitly deferred with a reason (no delete operation, no defect) | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | D1–D3, the removal plan and the file mapping all reflect the refactor | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Remove / Clear All | Pass | Pass | Pass (REST routes are thin transport; the read service deletes) | Pass | Pass | Pass | Pass |
| DS-002 | Locator → owner/file (REST + runtime) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Attach gating + upload errors | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Draft locator codec (`context-file-owner-types.ts`) | Pass | Pass | Pass | Pass | Routes and the resolver must contain no owner-kind path literals (stated) |
| `ContextFileReadService` | Pass | Pass | Pass | Pass | REST must not call the layout directly (stated) |
| `contextFileUploadStore.deleteDraftAttachment(attachment)` | Pass | Pass | Pass | Pass | Composer must not call `authorizedFetch` itself for delete (stated) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server REST draft routes | Pass | Pass | Pass | Pass | → codec, read service, error types |
| Local-path resolver | Pass | Pass | Pass | Pass | → codec, layout, owner resolver |
| Web composer / store | Pass | Pass | Pass | Pass | No web code builds a per-kind draft URL |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `parseDraftContextFileLocator(pathname)` | Pass | Pass | Pass (the locator encodes the owner kind; `null` vs throw semantics are defined) | Low | Pass |
| `GET` / `DELETE /rest/drafts/*` | Pass | Pass | Pass | Low (only draft routes live under `/drafts/`; grep confirmed) | Pass |
| `deleteDraftAttachment(attachment)` | Pass | Pass | Pass | Low | Pass |

The wildcard is not an ambiguous-identity boundary. The path is the typed locator and the codec has exactly one inverse per kind.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Draft read/delete | Pass | Pass | N/A | Pass | `ContextFileReadService` is unchanged |
| Owner parse/validate | Pass | Pass | N/A | Pass | `parseDraftContextFileOwnerDescriptor`, `assertStoredFilename` |
| Locator → node URL | Pass | Pass | Pass | Pass | Moving `resolveAttachmentFetchUrl` into `utils/contextFiles` lets the store and the composer share one resolver. Verified: `nodeBaseUrl` is initialized on every client, browser included (`20.windowNodeBootstrap.client.ts`). `authorizedFetch` and the axios interceptor attach the same credential, so the read and delete transports are equivalent. |
| Client owner parse / equality | Pass | Pass | N/A | Pass | `parseDraftUploadedContextAttachmentLocator`, `sameDraftOwner` |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `context-files/domain` | Pass | Pass | Pass | Pass | Codec placed next to `buildDraftContextFileLocator` |
| server `api/rest` | Pass | Pass | Pass | Pass | Consolidated |
| server `context-files/services` | Pass | Pass | Pass | Pass | Resolver draft branch → codec |
| web stores / composables / components / utils | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Draft locator shape (server) | Pass | Pass | Pass | Pass | Build and parse share one per-kind definition |
| Locator → URL (web) | Pass | Pass | Pass | Pass | Holds no owner-kind knowledge |
| Client draft parser | Pass | N/A (kept) | Pass | Pass | Copying across packages is unavoidable. Coverage is noted in AR-001. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `{ owner, storedFilename }` parse result | Pass | Pass | Pass | N/A | Pass | — |
| `deleteDraftAttachment` input | Pass | Pass (redundant `owner` removed) | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `context-file-owner-types.ts` | Pass | Pass | Pass | Pass | — |
| `api/rest/context-files.ts` | Pass | Pass | Pass | Pass | `sendAgentCollaborationFile` and `OrgFileParams` stay for the final-file routes. Only their draft use is removed. |
| `context-file-local-path-resolver.ts` | Pass | Pass | Pass | Pass | Final regexes stay (deferred) |
| `utils/contextFiles/contextAttachmentUrl.ts` (new) | Pass | Pass | Pass | Pass | — |
| `stores/contextFileUploadStore.ts` | Pass | Pass | Pass | Pass | See AR-002: keep the `activeRequestCount` accounting |
| `composables/useContextAttachmentComposer.ts` | Pass | Pass | Pass | Pass | Gating belongs in `uploadFiles` (AR-002) |
| `components/agentInput/ContextFilePathInputArea.vue` | Pass | Pass | N/A | Pass | — |
| localization `en` / `zh-CN` | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Codec in `context-files/domain` | Pass | Pass | Low | Pass | — |
| `utils/contextFiles/contextAttachmentUrl.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Per-kind draft GET/DELETE routes | Pass | Pass | Pass | Pass | — |
| Resolver draft regexes | Pass | Pass | Pass | Pass | — |
| `buildDraftContextFileEndpoint` | Pass | Pass | Pass | Pass | grep shows its only caller is `deleteDraftAttachment` |
| `deleteDraftAttachment` `owner` param | Pass | Pass | Pass | Pass | Existing `ContextFilePathInputArea.spec.ts` assertions on `{ owner, attachment }` must be updated |
| `contextFileUploadStore.error` | Pass | Pass | Pass | Pass | grep shows no reader |
| owner-less `console.warn` branch | Pass | Pass | Pass | Pass | — |
| Final-file routes / regexes | Pass | N/A | Pass (follow-up candidate) | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Draft routes | No | Pass | Pass | No fallback routes kept alongside the wildcard |
| Client delete | No | Pass | Pass | Delete is by locator only |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Draft files / locators | Not Affected | Pass (locator strings and layout unchanged) | Pass (stranded collab drafts are covered by the existing 24h TTL) | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server codec → routes → resolver | Pass | Pass (none) | Pass | Pass |
| Web store → composer → component | Pass | Pass | Pass | Pass |

Verified against the installed router (`find-my-way@8.2.2`):

- A wildcard param is not subject to `maxParamLength`, so long locators are safe.
- The wildcard param is URL-decoded, which would turn the team `memberAddress` `%2F` into `/`.

So the design's instruction to parse the raw `request.url` path (`pathOf`, with the query stripped) and decode each segment is required and correct. Keep the round-trip test with an encoded team member address.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server wildcard route | Yes | Pass | Pass | Pass | — |
| Client delete | Yes | Pass | Pass | Pass | — |
| Own-draft rule | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A composer can hold an uploaded draft whose locator owner differs from the target's current upload owner

- Related approved requirement or established contract: REQ-003, AC-006.
- Relevant behavior ID(s): BEH-005.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger: a user pastes draft-locator text into a composer whose target has no upload owner. The product surface is the composer paste. The supported action is pasting text, which `appendLocatorAttachments` hydrates. With `draftOwner = null`, no clone happens and the foreign locator is appended as-is. The concrete target is an Org task agent or member whose message is pending (composer visible, owner null).
- Support evidence: `ContextFilePathInputArea.vue` `onPaste` → `appendLocatorAttachments`. The clone branch runs only when `target.draftOwner` is set (`useContextAttachmentComposer.ts:219`).
- Forward path: paste → `hydrateContextAttachment` → `appendAttachments` → × → `removeItem`.
- Lifecycle preconditions and consequence: today this is a silent no-op. Under D4 the item is removed locally and the draft owned by the other composer stays untouched, which is what AC-006 approves.
- Reachability: `Reachable` (an explicit edge case already covered by approved AC-006).
- Review consequence: the D4 own-draft rule is justified by approved scope. No added machinery.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| UNK-001 | Whether a delegated child can still be composed to after its Task is DONE or CANCELLED | Downstream validation observes it. The fix is owner-based, so no design change. | Open (non-blocking) |

## Review Decision

`Pass`

## Findings

Both findings are non-blocking implementation guidance. Neither changes approved behavior or requires a design revision.

### AR-001 — Client-side owner-kind coverage for the own-draft decision (Low, non-blocking)

- Type: Design Impact (implementation guidance only)
- Protects: QR-001, AC-005 ("server integration test + client unit test", "One test iterates over all owner kinds").
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Evidence: the client decides whether to call DELETE using `parseDraftUploadedContextAttachmentLocator` (per-kind regexes) plus `sameDraftOwner`, whose non-matching fallback is `return false`. If a future draft-owner kind were missing from the client parser, D4 would treat the attachment as foreign: it would be removed locally without a server delete or an error. That recreates the "readable but not deletable" outcome QR-001 forbids. Design step 5 tests only the delegated-child kind on the client.
- Required update (implementation): add a client unit test that iterates over every `DraftContextFileOwnerDescriptor` kind. For each kind, a server-shaped locator → `parseDraftUploadedContextAttachmentLocator` → `sameDraftOwner(target owner)` is true → `deleteDraftAttachment` is called at that exact locator. Include an encoded team `memberAddress`. Making `sameDraftOwner` exhaustive (a `never` check) is recommended.
- Why proportionate: it is one test plus an optional type guard, and it directly enforces an approved quality requirement.
- Recommended recipient: `/software_engineering_team/implementation_engineer`.

### AR-002 — Gating and error placement details for D5 (Low, non-blocking)

- Type: Design Impact (implementation guidance only)
- Protects: AC-007 (alternate: "Path attachments still accepted"), BEH-003, REQ-005, and preserved Clear All disabling.
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Evidence and required update:
  1. In Electron embedded windows, `onFileDrop` turns dropped OS files into **path** attachments (`getPathForFile`), not uploads. The upload gate must therefore sit in the upload path, as DS-003 shows (`uploadFiles` / browser-file drop / file paste / `+`). It must not sit ahead of the Electron native-drop branch, or native path drops would be blocked for owner-less targets.
  2. When the target has an owner, `appendLocatorAttachments` clones a pasted foreign draft through `uploadAttachment`. Its failure is currently console-only. Treat it as an upload failure and set `attachmentError` (REQ-005).
  3. `deleteDraftAttachment` moves from `apiService` to `authorizedFetch`. It must keep the `activeRequestCount` increment and decrement: Clear All is disabled while `isUploading`, and that preserved behavior should stay.
- Why proportionate: these are placement clarifications inside the owners the design already names. No new structure.
- Recommended recipient: `/software_engineering_team/implementation_engineer`.

## Classification

N/A — Pass. AR-001 and AR-002 are non-blocking guidance carried to implementation.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary pass rule).

## Residual Risks

- Unifying the error mapping intentionally changes status codes on draft routes: agent and team GET with a bad owner go 500 → 400, and DELETE owner-not-found goes 400 → 404. The client treats any non-2xx as an error, so user-visible behavior is unchanged. Existing tests that assert the old codes must be updated (the design already lists this).
- After the change, an uploaded draft in an owner-less Org-pending composer is removed locally and left to the 24h TTL, as approved in AC-006.
- Full UI click-through across run kinds has not been done yet. Validation must exercise the UI paths, and the user verifies the 19.png case in the desktop app.
- Final-file routes and resolver regexes keep the same per-kind duplication. This is a follow-up candidate and is not in scope.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 Reachable and covered by AC-006)
- Notes: The root cause is confirmed in current code. The codec plus a single wildcard GET/DELETE pair makes server deletability follow structurally from readability. Deleting at the attachment's own locator removes the client-side copy of the locator shape. The router behavior the design relies on was verified in the installed `find-my-way`. AR-001 and AR-002 are non-blocking implementation guidance.
