# Markdown Preview Relative Images — Design Spec

## Current-State Read

The current workspace Markdown preview spine is:

`Files UI -> OpenFileState -> FileViewer -> MarkdownPreviewer -> MarkdownRenderer/useMarkdownSegments -> v-html -> Chromium resource request`

The Markdown document path reaches `MarkdownPreviewer.vue`, but that component forwards only the Markdown content to the shared renderer. `markdown-it` consequently emits the source image URL unchanged, for example `<img src="assets/card.png">`. DOMPurify correctly retains a normal relative URL, and Chromium then resolves it against AutoByteus's renderer document (`file:///.../renderer/index.html` in the packaged desktop application or the web application origin), not against the Markdown document.

Current ownership is split as follows:

- the file-explorer state knows how the open file was obtained and which workspace identity authorized it;
- `MarkdownPreviewer.vue` is the file-specific adapter into the shared Markdown renderer;
- `MarkdownRenderer.vue` and `useMarkdownSegments.ts` own generic parsing, sanitization, Mermaid segmentation, and rendered DOM lifecycle;
- `mobileNodeSessionStore.activeCredential` owns the reactive Phone Access credential value, while `useAuthorizedObjectUrl`/`useAuthorizedObjectUrlMap` own protected-resource classification, fetch, invalidation, and blob URL lifecycle;
- the workspace REST content route owns byte delivery and MIME type;
- `FileSystemWorkspace` is the server-side workspace path boundary.

Two design defects are exposed by this bug:

1. **Resource context is lost at the file-preview/shared-renderer boundary.** The renderer receives content without the document/workspace identity needed for relative resources.
2. **Workspace containment policy is duplicated and inconsistent.** `WorkspaceFileExplorer.getPath()` uses a segment-aware `path.relative` check, while `FileSystemWorkspace.getAbsolutePath()` uses a vulnerable string-prefix check.

Architecture review also exposed a required lifecycle extension: the current authorized object URL helpers watch source URLs only. Credential establishment, replacement, or removal does not refresh unchanged sources, and the map remains published while old blobs are revoked. The target must therefore treat the full reactive credential value as an input to the authorized-resource generation and must invalidate published results before revocation/refetch.

The target must preserve the generic renderer's context neutrality. Conversation messages, thought segments, task descriptions, artifacts, and team-reference Markdown do not have a verified workspace-document identity and must not be resolved through whichever workspace happens to be active.

## Intended Change

Add an explicit, discriminated relative-resource context to workspace-backed open-file state. Carry that context through `FileViewer` and `MarkdownPreviewer`, where it is converted into an opt-in Markdown image resolver. Resolve valid relative image sources against the Markdown document directory, build the existing bound-node workspace content URL, and mark that URL as a managed inline resource rather than emitting it immediately as `<img src>`.

Extend the shared Markdown render model to return both sanitized segments and managed image fetch URLs. Extend the existing authorized object-URL owner so its source generation includes `mobileNodeSessionStore.activeCredential`, captured as a credential snapshot for each load generation. On source or credential change it invalidates published results, causes the renderer to remove managed bindings, revokes obsolete blobs, reclassifies/refetches with the captured current credential, suppresses stale completions, and publishes only the current generation. `MarkdownRenderer` then binds each current direct/blob URL to its sanitized `<img>` element. Managed images have no initial `src`, preventing both the incorrect application-relative request and an unauthenticated protected-resource request.

Consolidate workspace path containment into the existing workspace path utility owner and have both `FileSystemWorkspace` and `WorkspaceFileExplorer` use it. Reuse the existing REST route; do not add another file-serving endpoint.

## Supplemental Solution Artifacts

`None`.

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | N/A |

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Primary: `Boundary Or Ownership Issue`; secondary: `Duplicated Policy Or Coordination` for server path containment.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `Yes`, bounded to the affected preview/resource and workspace-path boundaries.
- Evidence: `MarkdownPreviewer` receives but discards the source path; the generic renderer has many non-file call sites; direct workspace media already uses the correct content route; authorized object URL machinery exists but watches only source URLs; `mobileNodeSessionStore.activeCredential` is reactive; server path owners currently implement two different containment checks.
- Design response: Preserve resource identity in open-file state, adapt it at the file-specific preview boundary, make shared Markdown resource handling explicitly opt-in, extend the authorized-resource owner for credential-reactive transactional refresh, and consolidate server containment.
- Refactor rationale: A local string rewrite in `MarkdownPreviewer`, a global active-workspace lookup in `MarkdownRenderer`, or a document-wide `<base>` would hide identity and violate the authoritative boundary rule. The bounded refactor makes the identity and lifecycle explicit without replacing the Markdown subsystem.
- Intentional deferrals and residual risk, if any: Relative resources in artifact/team-reference/conversation Markdown remain unsupported until those owners expose an explicit resource identity. Symlink semantics remain unchanged under the existing workspace content policy.

## Terminology

- **Relative resource context**: a discriminated value that states which authoritative subject may resolve relative references. In this change the only supported variant is `{ kind: 'workspace', workspaceId }`.
- **Direct image resource**: a source that retains current browser behavior, such as HTTP(S), protocol-relative, root-relative, or data image URLs, subject to existing Markdown and DOMPurify validation.
- **Managed image resource**: a valid document-relative workspace image represented by an authorized fetch URL and optional display fragment; it is bound to the DOM only after direct/authorized-object-URL resolution.
- **Blocked image resource**: a malformed, ambiguous, or out-of-workspace relative source that is rendered without a fetchable `src`, preserving its alt text.

## Design Reading Order

1. Persisted data: not affected.
2. Workspace Markdown preview and workspace image delivery spines.
3. File-explorer, Markdown-rendering, authorized-resource, and workspace-path owners.
4. File responsibility mapping and shared structures.
5. Concrete folder/file changes.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the ineffective content-only file-preview handoff for Markdown; workspace Markdown preview must carry explicit relative-resource context.
- Replace inline workspace media URL construction in `fileExplorerContentActions.ts` with the canonical workspace resource URL builder.
- Replace both local workspace containment implementations with one canonical resolver; do not keep a fallback string-prefix check.
- Do not retain a second relative-image flow, source-regex rewrite, global active-workspace fallback, or unauthenticated static-path fallback.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Markdown and image files remain ordinary workspace files; `OpenFileState` is ephemeral Pinia state.
- Relevant code-model, serialization, semantic, or physical-store change: `OpenFileState` gains an in-memory `relativeResourceContext`; no serialized or stored schema changes.
- Normal reader/writer behavior and representative evidence: Text continues through GraphQL and images through the existing workspace REST content route; file writes are unchanged.
- Required semantics and invariants under direct use: Source and assets remain unchanged; all derived URLs are ephemeral.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No mutation or migration; workspace containment remains mandatory.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Not Affected`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: There is no persisted representation to transform. Migration would provide no benefit and would risk modifying user-authored Markdown unnecessarily.
- Acceptance criteria or design constraints supported by this decision: `REQ-MPRI-010`; all existing workspace files must remain directly usable.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-MPRI-001` | `Primary End-to-End` | Desktop/mobile workspace Files preview action | Managed workspace image request descriptor | `MarkdownPreviewer` as workspace-file adapter | Preserves explicit document/workspace identity through parsing |
| `DS-MPRI-002` | `Primary End-to-End` | Managed workspace image fetch URL | Authorized workspace image bytes | Workspace content boundary (`FileSystemWorkspace` behind REST facade) | Enforces workspace identity, authorization, containment, and MIME delivery |
| `DS-MPRI-003` | `Return-Event` | Workspace content response | Visible inline `<img>` or alt-text failure state | `MarkdownRenderer` | Owns post-sanitization URL binding and rendered result |
| `DS-MPRI-004` | `Bounded Local` | Content/path/context or full credential value change | Published results invalidated, obsolete bindings/blobs cleared, and current images rebound | `useAuthorizedObjectUrlMap` for load generation; `MarkdownRenderer` for DOM binding | Prevents stale credential results, stale images, leaks, and unauthenticated first requests |

## Primary Execution Spine(s)

### `DS-MPRI-001` — Resolve a workspace Markdown image

`Desktop/Mobile Files -> OpenFileState(relativeResourceContext) -> FileViewer -> MarkdownPreviewer -> workspace Markdown image resolver -> useMarkdownSegments -> managed image descriptor`

### `DS-MPRI-002` — Load the resolved image securely

`managed image fetch URL -> authorized resource loader -> workspace REST content route -> FileSystemWorkspace -> canonical workspace path resolver -> filesystem stream/image bytes`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-MPRI-001` | File-explorer state records that this file's relative resources belong to a named workspace. `MarkdownPreviewer` combines that identity with the document path and current bound REST endpoint, then supplies an image resolver to the shared parser. Relative image tokens become managed descriptors; direct sources remain direct; invalid sources become blocked. | Open workspace file, workspace Markdown preview, Markdown render model | `MarkdownPreviewer` | URL classification, percent decoding, path normalization |
| `DS-MPRI-002` | The managed descriptor is loaded through the extended authorized resource map using the credential snapshot for its current generation. The existing REST route delegates path authority to `FileSystemWorkspace`, whose canonical resolver rejects paths outside the workspace before streaming bytes with MIME type. | Managed image, authorized resource generation, workspace content request, workspace path | `FileSystemWorkspace` behind REST facade | Reactive mobile credential, MIME lookup, file existence |
| `DS-MPRI-003` | The loader returns either the original protected URL (trusted/direct mode) or a blob URL (credentialed mobile mode). `MarkdownRenderer` binds it to the sanitized image element, preserving alt text on failure. | Rendered image element | `MarkdownRenderer` | DOM data markers, error marker |
| `DS-MPRI-004` | Any source/context change or change to the full `activeCredential` value starts a new URL-map generation. The helper increments its generation, snapshots sources and credential, synchronously publishes empty resolved/error maps, and the renderer's synchronous map watcher removes managed `src` bindings. The helper then revokes old blobs, reclassifies/refetches using only the snapshot, discards and cleans up stale-generation completions, and atomically publishes only the current generation for rebinding. | Authorized resource generation and rendered Markdown resource lifecycle | `useAuthorizedObjectUrlMap` for load state; `MarkdownRenderer` for DOM state | Credential ref, synchronous invalidation watch, generation guards, object URL cleanup |

## Spine Actors / Main-Line Nodes

| Node | Role On Spine |
| --- | --- |
| `OpenFileState` | Carries content plus authoritative relative-resource identity established by file loading |
| `MarkdownPreviewer` | Adapts a workspace file into the generic Markdown image resolver contract |
| `useMarkdownSegments` | Transforms image tokens safely and produces sanitized segments plus managed URL inventory |
| `MarkdownRenderer` | Renders segments and binds resolved managed image URLs after sanitization |
| `useAuthorizedObjectUrlMap` | Reacts to sources and the full credential value; transactionally resolves protected URLs to direct/blob URLs and owns invalidation/stale suppression/blob cleanup |
| `mobileNodeSessionStore.activeCredential` | Authoritative reactive credential identity; changes on pairing establishment, replacement, rejection, and deletion |
| Workspace content REST route | Thin HTTP entry for workspace file bytes |
| `FileSystemWorkspace` | Authoritative workspace identity/root boundary |
| Canonical workspace path resolver | Enforces lexical containment for all workspace path consumers |

## Ownership Map

- `fileExplorerContentActions` owns classification of an opened path as workspace-backed versus local/external and sets `relativeResourceContext` exactly once when loading begins.
- `OpenFileState` owns the ephemeral presentation state and the relative-resource identity associated with that content. It does not own URL construction.
- `MarkdownPreviewer` owns file-specific resolution policy and is the only file-explorer component allowed to supply a workspace image resolver to generic Markdown rendering.
- `workspaceResourceUrl.ts` owns normalized workspace-relative resource paths and the canonical workspace content URL shape.
- `useMarkdownSegments` owns token traversal, resolution-result application, sanitization, and the managed-source inventory. It does not fetch resources or read global workspace state.
- `MarkdownRenderer` owns rendered DOM lifecycle, including binding managed URLs and presenting per-image failure without breaking the document.
- `mobileNodeSessionStore` remains the owner of credential state. `useAuthorizedObjectUrl` observes `activeCredential` via a reactive ref but may not mutate session state.
- `useAuthorizedObjectUrl`/`useAuthorizedObjectUrlMap` own credential-snapshot-aware classification/fetch, synchronous published-result invalidation, deduplication, object URL creation, stale-result suppression, and cleanup.
- `FileSystemWorkspace` is the authoritative server-side workspace root boundary. The REST route is a thin transport facade.
- `workspace-path-utils.ts` owns the reusable canonical path normalization/containment algorithm serving both `FileSystemWorkspace` and `WorkspaceFileExplorer`.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `FileViewer.vue` | Selected viewer, especially `MarkdownPreviewer` for this use case | Shared file-type/mode dispatch | Workspace lookup, path normalization, fetch lifecycle |
| `GET /rest/workspaces/:workspaceId/content` | `FileSystemWorkspace` + canonical path resolver | HTTP parameter/result mapping and byte streaming | Independent containment policy or Markdown-specific behavior |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Markdown preview handoff that ignores `path`/resource identity | It causes the reported application-relative resolution | `OpenFileState.relativeResourceContext` -> `MarkdownPreviewer` resolver | `In This Change` | `path` becomes actively authoritative |
| Inline workspace content URL string construction in `fileExplorerContentActions.ts` | URL policy would otherwise be duplicated with Markdown images | `utils/fileExplorer/workspaceResourceUrl.ts` | `In This Change` | Existing media and Markdown use one builder |
| `FileSystemWorkspace` naive `startsWith(root)` containment | Accepts sibling-prefix paths | Canonical workspace path resolver | `In This Change` | No fallback retained |
| Duplicate normalization body in `WorkspaceFileExplorer.getPath()` | Same invariant should have one owner | Canonical workspace path resolver | `In This Change` | Preserve caller-specific error mapping only if needed |
| Source-only authorized object URL watch key | Misses credential establishment/replacement/removal for unchanged URLs | Full source+credential generation key in `useAuthorizedObjectUrl.ts` | `In This Change` | Applies to single and map variants |
| Revocation while prior resolved map remains published | Leaves stale direct/blob bindings during refresh | Invalidate published result first, then revoke/refetch/commit | `In This Change` | Renderer synchronously reacts to invalidation |
| Temporary investigation probe | Investigation-only evidence | Durable unit/component coverage | `In This Change` | Probe already removed; do not commit it |

## Return Or Event Spine(s) (If Applicable)

`Workspace content response -> authorized loader direct/blob URL -> MarkdownRenderer DOM binding -> browser decode/render -> visible image`

Failure return:

`Fetch rejection / blocked resolution -> per-source error map / blocked marker -> image remains without src -> alt text and surrounding Markdown remain visible`

## Bounded Local / Internal Spines (If Applicable)

- Parent owners: `useAuthorizedObjectUrlMap` owns the load generation; `MarkdownRenderer` owns current DOM bindings.
- Authoritative reactive credential input: `storeToRefs(useMobileNodeSessionStore()).activeCredential`. The watcher key uses the full credential string or `null`, not a boolean, so null -> A, A -> B, and A -> null are all distinct transitions. Credential ownership remains in `mobileNodeSessionStore`.
- Chain: `source list or activeCredential value change -> increment generation/capture sources+credential -> publish empty maps -> synchronous renderer binding removal -> revoke prior committed blobs -> classify/fetch with captured credential -> discard/revoke stale-generation outputs -> atomically publish current maps+blob registry -> synchronous current-node rebind`.
- Exact ordering and invariants:
  1. Increment `loadToken` before any asynchronous work so every earlier completion is stale.
  2. Snapshot the deduplicated source list and current credential value for this generation.
  3. Assign empty resolved and error maps synchronously. `MarkdownRenderer` watches map replacement with `flush: 'sync'` and removes `src` from every currently managed image before the helper revokes prior blobs.
  4. Revoke only the previously committed generation's blob URLs and clear its registry.
  5. Classify each source using the credential snapshot. Fetch protected sources with that same explicit snapshot; do not imperatively switch credential midway through one generation.
  6. Keep newly created blob URLs in a generation-local registry until commit. After every await, compare the generation token. If stale, revoke generation-local blobs immediately and publish nothing.
  7. Commit the resolved map, error map, and generation-local blob registry only when the token is still current. The renderer's synchronous map watcher binds only nodes whose data marker still matches a current source.
  8. On unmount, increment the token, publish empty results, and revoke both committed and any generation-local blobs that can still be reached by the active invocation's stale cleanup.
- Why it matters: this sequence prevents old-credential content or direct/blob URLs from remaining bound when credential state changes, while keeping credential state and header construction outside `MarkdownRenderer`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Image source classification | `DS-MPRI-001` | Workspace Markdown resolver | Distinguish relative from direct/sanitizer-owned sources | Prevent rewriting remote/data/root-relative sources | Parser becomes workspace-aware |
| Percent decoding/path segment validation | `DS-MPRI-001` | Workspace Markdown resolver | Decode once; reject malformed/encoded separators/NUL; normalize `.`/`..` | Correct spaces without traversal/double encoding | Ad hoc string replacement becomes vulnerable |
| Bound node endpoint lookup | `DS-MPRI-001` | `MarkdownPreviewer` | Supply current REST base reactively | Multi-node correctness | Generic renderer depends on node store |
| Sanitization | `DS-MPRI-001`, `DS-MPRI-003` | `useMarkdownSegments` | Retain DOMPurify policy | Prevent unsafe schemes/HTML | Resource loader bypasses sanitizer |
| Mobile bearer authorization | `DS-MPRI-002` | Authorized loader | Attach credential through fetch | Plain `<img>` cannot add Authorization | Markdown preview duplicates auth logic |
| Reactive credential observation | `DS-MPRI-002`, `DS-MPRI-004` | Authorized loader | Observe full `activeCredential` value and trigger a new load generation | Pairing/rotation/removal can occur without URL changes | Renderer becomes credential owner or stale blobs survive |
| Explicit credential snapshot transport | `DS-MPRI-002`, `DS-MPRI-004` | Authorized loader | Classify and fetch one generation with the same credential value | Avoid mid-generation global credential rereads | One generation mixes credentials |
| MIME/file existence | `DS-MPRI-002` | REST route | Stream valid file response | Browser needs correct content type | Resolver performs filesystem work |
| Error/alt-text presentation | `DS-MPRI-003` | `MarkdownRenderer` | Isolate failure to one image | Document remains readable | Whole preview enters error state |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Markdown parsing/sanitization | `useMarkdownSegments` / `MarkdownRenderer` | `Extend` | Existing canonical pipeline already owns tokens and sanitized DOM | N/A |
| Protected single/multi-image loading | `useAuthorizedObjectUrl` / `useAuthorizedObjectUrlMap` | `Extend` | Correct existing owner, but it must observe the full credential value, invalidate published results before revoke, and use generation-scoped credential/blob state | N/A |
| Reactive credential authority | `mobileNodeSessionStore.activeCredential` | `Reuse` | Already changes for establishment, replacement, rejection, and removal | N/A |
| Explicit snapshot-aware authorized fetch | `authorizedResourceUrl.ts` + `authorizedTransport.ts` | `Extend` | The load generation must classify and fetch with one captured credential rather than rereading global state after awaits | N/A |
| Workspace file bytes | Workspace REST content route | `Reuse` | Already streams arbitrary workspace file types with MIME | N/A |
| Bound node REST identity | `windowNodeContextStore` | `Reuse` | Existing multi-node endpoint authority | N/A |
| Workspace content URL policy | Existing construction in `fileExplorerContentActions` | `Extend/extract` | Same route/identity is needed in two callers | N/A |
| Workspace path containment | `workspace-path-utils.ts` + current callers | `Extend/consolidate` | Existing capability area is correct; implementation is duplicated | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| File explorer open-file state | Relative-resource identity for workspace-backed content | `DS-MPRI-001` | File preview | `Extend` | One required nullable discriminated field |
| Markdown rendering | Resolver contract, token metadata, sanitized segments, DOM binding | `DS-MPRI-001`, `DS-MPRI-003`, `DS-MPRI-004` | `MarkdownPreviewer`, generic consumers | `Extend` | Workspace policy remains outside |
| File-explorer workspace URL utilities | Relative target normalization and content URL construction | `DS-MPRI-001` | `MarkdownPreviewer`, content actions | `Extend` | One canonical file |
| Remote-access resources | Reactive credential observation, protected URL classification/fetch, result invalidation, object URL lifecycle | `DS-MPRI-002`–`004` | Resource consumers including `MarkdownRenderer` | `Extend` | Credential state stays in mobile session store; loader owns observation/transaction |
| Server workspaces | Root identity and canonical containment | `DS-MPRI-002` | REST route, file explorer | `Extend/consolidate` | Removes sibling-prefix weakness |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `stores/fileExplorerState.ts` | File explorer | `OpenFileState` | Add relative-resource context type/field | State identity belongs with state | N/A |
| `utils/markdownImageResource.ts` | Markdown rendering | Resolver contract | Tight direct/managed/blocked resolution union and resolver type | Shared by preview adapter, parser, renderer | New shared structure |
| `utils/fileExplorer/workspaceResourceUrl.ts` | File explorer workspace resources | Workspace URL policy | Normalize a document-relative source and build canonical content URL | Path/URL policy is one cohesive concern | Uses resolver union |
| `composables/useMarkdownSegments.ts` | Markdown rendering | Render model | Apply resolver to image tokens; emit segments + managed sources | Already owns token transformation | Uses resolver union |
| `components/.../MarkdownRenderer.vue` | Markdown rendering | DOM lifecycle | Authorized map and post-sanitize DOM binding | Existing rendered-DOM owner | Uses managed source inventory |
| `components/.../MarkdownPreviewer.vue` | File preview | Workspace adapter | Build resolver from file path/context/bound endpoint | Existing file-specific adapter | Uses resolver union/context |
| `composables/useAuthorizedObjectUrl.ts` | Remote-access resources | Authorized load generation | Observe full credential value; invalidate, snapshot, fetch, commit, and clean direct/blob results | Existing authoritative resource URL owner | Uses credential ref and snapshot-aware transport |
| `utils/remoteAccess/authorizedResourceUrl.ts` | Remote-access resources | Protected resource policy | Classify and fetch with an explicit credential snapshot | Existing protected URL-family owner | Uses explicit transport boundary |
| `utils/remoteAccess/authorizedTransport.ts` | Remote-access transport | Authorization header boundary | Apply a supplied credential snapshot while retaining the active-credential convenience entrypoint | Existing header owner | Reuses bearer construction |
| `workspaces/workspace-path-utils.ts` | Server workspaces | Path invariant | Canonical workspace-relative containment | Existing path utility owner | Shared by two callers |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Direct/managed/blocked Markdown image result | `utils/markdownImageResource.ts` | Markdown rendering | Parser and file-preview resolver need one contract | `Yes` | `Yes` | A generic file origin bag |
| Workspace content URL construction | `utils/fileExplorer/workspaceResourceUrl.ts` | File explorer | Existing media and new Markdown image paths use same endpoint | `Yes` | `Yes` | A general URL helper |
| Workspace containment | `workspaces/workspace-path-utils.ts` | Server workspaces | Two current implementations enforce one invariant | `Yes` | `Yes` | Filesystem helper collection |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `FileRelativeResourceContext = { kind: 'workspace'; workspaceId }` | `Yes` | `Yes` | `Low` | Do not add file path; `OpenFileState.path` is authoritative |
| `MarkdownImageResourceResolution` union | `Yes` | `Yes` | `Low` | Managed variant has fetch URL + optional fragment; blocked has reason; direct has URL |
| Managed source inventory | `Yes` | `Yes` | `Low` | Derive/deduplicate from the same render model, not a second parser pass |
| Authorized resource generation snapshot | `Yes` | `Yes` | `Low` | Keep one immutable `{ sources, credential, token }` per refresh; never store credential in Markdown state |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/fileExplorerState.ts` | File explorer | Open-file state | Define required nullable relative-resource context | Keeps identity with content state | Yes |
| `autobyteus-web/stores/fileExplorerContentActions.ts` | File explorer | Open/load sequencing | Assign context for workspace branch; clear for local/external; call URL builder | Existing sequencing owner | Yes |
| `autobyteus-web/utils/markdownImageResource.ts` | Markdown rendering | Resolver contract | Define direct/managed/blocked result and resolver type | Small coherent shared contract | N/A |
| `autobyteus-web/utils/fileExplorer/workspaceResourceUrl.ts` | File explorer workspace resources | Workspace relative resource policy | Classify/normalize relative source and construct workspace content URL | Cohesive pure policy | Yes |
| `autobyteus-web/composables/useMarkdownSegments.ts` | Markdown rendering | Token/render model | Apply optional resolver to nested image tokens before sanitize; emit managed URLs | Canonical parser owner | Yes |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Markdown rendering | Rendered DOM/resource lifecycle | Optional resolver prop, synchronous invalidation/rebind against authorized URL map, DOM error markers | Canonical DOM owner | Yes |
| `autobyteus-web/composables/useAuthorizedObjectUrl.ts` | Remote-access resources | Authorized resource lifecycle | Observe `activeCredential`; transactionally invalidate, classify/fetch, stale-suppress, commit, and revoke for single/map variants | Canonical direct/blob URL owner | Yes |
| `autobyteus-web/utils/remoteAccess/authorizedResourceUrl.ts` | Remote-access resources | Protected resource policy | Classify/fetch using one explicit captured credential | Keeps protected URL semantics outside consumers | Yes |
| `autobyteus-web/utils/remoteAccess/authorizedTransport.ts` | Remote-access transport | Authorization header boundary | Apply explicit credential snapshot; keep `authorizedFetch` delegating to current credential for existing callers | Keeps header formation singular | Yes |
| `autobyteus-web/components/fileExplorer/FileViewer.vue` | File viewing | Thin dispatcher | Forward file path + relative-resource context only to Markdown preview | Existing type dispatcher | Yes |
| `autobyteus-web/components/fileExplorer/viewers/MarkdownPreviewer.vue` | File preview | Workspace Markdown adapter | Create reactive workspace resolver from explicit context | Correct policy boundary | Yes |
| `autobyteus-web/components/mobile/MobileFileViewer.vue` | Mobile file preview | Mobile wrapper | Preserve `relativeResourceContext` when projecting `OpenFileState` to `FileViewer` | Current projection drops extra state | Yes |
| `autobyteus-server-ts/src/workspaces/workspace-path-utils.ts` | Server workspaces | Canonical path invariant | Resolve and reject out-of-root paths segment-aware | Existing correct capability area | N/A |
| `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | Server workspaces | Workspace owner | Delegate absolute-path resolution to canonical utility | Keeps public boundary | Yes |
| `autobyteus-server-ts/src/file-explorer/file-explorer.ts` | Server file explorer | Workspace file operations | Delegate `getPath` to canonical utility | Removes duplicate policy | Yes |

## Ownership Boundaries

- The file-explorer store establishes resource context because it knows whether a path was loaded as a workspace file, an external URL, or an Electron-local absolute path.
- `MarkdownPreviewer` is the only workspace-aware Markdown adapter. It may depend on the file context and bound node endpoint; `MarkdownRenderer` may not.
- The generic renderer consumes only the resolver contract. It owns rendering mechanics, not the meaning of workspace identity.
- `mobileNodeSessionStore` is authoritative for the active credential value. The authorized loader observes but never mutates it, snapshots it per generation, and remains authoritative for protected classification/fetch/blob lifecycle. `MarkdownRenderer` must not read the credential, create bearer headers, force refreshes, or own an object URL registry.
- The REST route must use `FileSystemWorkspace.getAbsolutePath`; it must not import or duplicate the lower-level path utility directly because `FileSystemWorkspace` is the authoritative workspace boundary.
- `WorkspaceFileExplorer` is an internal workspace mechanism and may reuse the canonical path utility; callers above `FileSystemWorkspace` may not bypass the workspace owner.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MarkdownPreviewer` workspace adapter | Workspace resolver construction | `FileViewer` | `FileViewer/MarkdownRenderer -> workspaceStore.activeWorkspace` | Extend explicit preview props/context |
| `MarkdownRenderer` | `useMarkdownSegments`, authorized URL map, DOM binding | All Markdown consumers | Caller mutates rendered DOM or prefetches protected images independently | Extend resolver/result contract |
| `useAuthorizedObjectUrlMap` | Reactive credential ref, generation snapshots, explicit-credential resource transport, blob registries | `MarkdownRenderer` and existing media viewers | Renderer reads credentials, calls refresh on pairing events, builds bearer headers, or owns blobs | Extend the authorized-resource owner itself |
| `mobileNodeSessionStore` | Session storage/binding and computed `activeCredential` | Authorized transport/resource consumers | Resource helper copies credential into Markdown/file state or mutates session | Expose a tighter reactive ref only if the current computed becomes insufficient |
| `FileSystemWorkspace.getAbsolutePath` | Canonical workspace path utility | Workspace REST route | REST route -> raw `path.resolve`/filesystem path utility | Strengthen workspace method |

## Dependency Rules

Allowed:

- `fileExplorerContentActions` -> `workspaceResourceUrl` and `OpenFileState` context.
- `FileViewer` -> `MarkdownPreviewer` with explicit file path/context.
- `MarkdownPreviewer` -> `windowNodeContextStore`, `workspaceResourceUrl`, and Markdown resolver contract.
- `MarkdownRenderer` -> `useMarkdownSegments`, Markdown resolver contract, `useAuthorizedObjectUrlMap`.
- `useAuthorizedObjectUrl` -> reactive `mobileNodeSessionStore.activeCredential`, snapshot-aware protected resource policy/transport.
- `authorizedResourceUrl` -> explicit-credential transport boundary; its default convenience overload may still obtain the current credential for existing non-reactive callers.
- `useMarkdownSegments` -> generic resolver contract only.
- REST route -> `FileSystemWorkspace` public path method.
- `FileSystemWorkspace` and `WorkspaceFileExplorer` -> canonical workspace path utility.

Forbidden:

- `MarkdownRenderer` or `useMarkdownSegments` -> `workspaceStore`, `fileExplorerStore`, `windowNodeContextStore`, or REST URL construction.
- `MarkdownPreviewer` -> direct `fetch`, bearer header construction, or object URL ownership.
- `MarkdownRenderer` -> `mobileNodeSessionStore`, `getActiveRemoteAccessCredential`, pairing events, or manual `refresh()` calls.
- One authorized load generation -> multiple credential values.
- Any caller -> regex/string replacement over raw Markdown source to rewrite images.
- Any caller -> global `<base>` mutation.
- REST route -> independent containment check alongside `FileSystemWorkspace`.
- Frontend acceptance of traversal as a substitute for server containment.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `FileRelativeResourceContext` | Open workspace file | Identify the workspace allowed to resolve relative resources | `{ kind: 'workspace', workspaceId: string }` or `null` | File path remains `OpenFileState.path` |
| `resolveWorkspaceMarkdownImageResource(input)` | Workspace Markdown image | Classify source, normalize target, build managed URL | `{ source, documentPath, context, restBaseUrl }` | Pure; no fetch/global stores |
| `MarkdownImageResourceResolver(source)` | Markdown image token | Return direct, managed, or blocked result | One source string | Generic contract |
| `useMarkdownSegments(markdownSource, resolverRef?)` | Markdown render model | Parse/sanitize segments and inventory managed sources once | Content plus optional resolver | No resource I/O |
| `MarkdownRenderer.imageResourceResolver` | Rendered Markdown images | Opt into caller-owned resolution policy | Resolver function or absent | Absent preserves context-neutral behavior |
| `useAuthorizedObjectUrlMap(sourceUrls)` | Protected resource set | Reactively resolve the current source set under the current credential generation | Source URL getter; internally observes full `activeCredential` ref | Invalidate published map before revoke/refetch |
| `fetchAuthorizedResourceBlob(url, init, credentialSnapshot)` | One protected resource | Fetch bytes using the generation's explicit credential | URL + request init + `string | null` snapshot | No global credential reread when snapshot supplied |
| `fetchWithRemoteAccessCredential(input, init, credentialSnapshot)` | Remote-access HTTP request | Apply exactly the supplied bearer credential or no bearer | Request + `string | null` | `authorizedFetch` remains convenience wrapper for current credential |
| `buildWorkspaceContentUrl(restBase, workspaceId, path)` | Workspace content resource | Canonical endpoint formatting/encoding | Explicit compound identity | Used by direct media and Markdown |
| `resolveWorkspaceRelativePath(root, candidate)` | Server workspace path | Return contained absolute path or throw | Root + relative candidate | One canonical containment policy |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Relative resource context | `Yes` | `Yes` | `Low` | Keep discriminated; no bare workspace ID prop in generic renderer |
| Workspace Markdown resolver | `Yes` | `Yes` | `Low` | Require document path + context + endpoint |
| Generic image resolver | `Yes` | `Yes` | `Low` | Return discriminated result, not nullable string |
| Authorized URL map reactive input | `Yes` | `Yes` | `Low` | Observe full credential value inside loader; snapshot per token |
| Explicit-credential fetch | `Yes` | `Yes` | `Low` | Distinguish explicit `null` from default/current-credential convenience API |
| Workspace content URL builder | `Yes` | `Yes` | `Low` | Keep workspace ID and path separate inputs |
| Server path resolver | `Yes` | `Yes` | `Low` | Reject absolute/outside candidates uniformly |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Open-file context | `FileRelativeResourceContext` | `Yes` | Low | Do not call it generic `context` |
| Markdown result | `MarkdownImageResourceResolution` | `Yes` | Low | Use direct/managed/blocked variants |
| Workspace URL policy | `workspaceResourceUrl` | `Yes` | Low | Do not call `urlHelper` |
| Server invariant | `resolveWorkspaceRelativePath` | `Yes` | Low | Name workspace subject explicitly |

## Applied Patterns (If Any)

- **Adapter at authoritative context boundary**: `MarkdownPreviewer` adapts workspace identity into a generic resolver without making the shared renderer workspace-aware.
- **Discriminated result**: direct/managed/blocked makes resource behavior explicit and prevents overloaded nullable strings.
- **Sanitize before managed DOM binding**: tokens carry inert data attributes; protected URLs are bound only after sanitized DOM exists.
- **Credential-reactive load generation**: `useAuthorizedObjectUrl` is extended—not bypassed—so credential observation, explicit snapshot fetch, invalidation, stale suppression, and cleanup remain centralized.
- **Canonical invariant extraction**: workspace containment is consolidated under the workspace subsystem and reused by both owners.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/markdownImageResource.ts` | `File` | Markdown rendering contract | Resolution union/resolver type | Existing Markdown utilities are flat in `utils/` | Workspace stores, fetch |
| `autobyteus-web/utils/fileExplorer/workspaceResourceUrl.ts` | `File` | Workspace file resources | Pure relative path + endpoint policy | Existing file-explorer utility grouping | DOM, Pinia, fetch |
| `autobyteus-web/stores/fileExplorerState.ts` | `File` | Open file state | Context type/field | State owner | REST endpoint strings |
| `autobyteus-web/stores/fileExplorerContentActions.ts` | `File` | File open/load sequencing | Assign context and reuse URL builder | Existing owner | Markdown token logic |
| `autobyteus-web/components/fileExplorer/FileViewer.vue` | `File` | Thin viewer dispatch | Forward context | Existing facade | Resolution/fetch logic |
| `autobyteus-web/components/fileExplorer/viewers/MarkdownPreviewer.vue` | `File` | Workspace Markdown adapter | Create resolver | Existing file-specific preview | Global active-workspace guessing |
| `autobyteus-web/composables/useMarkdownSegments.ts` | `File` | Markdown render model | Token transform and managed inventory | Existing parser owner | Resource fetch/global context |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | `File` | DOM/render lifecycle | Authorized source binding and cleanup | Existing DOM owner | Workspace URL construction |
| `autobyteus-web/composables/useAuthorizedObjectUrl.ts` | `File` | Authorized resource lifecycle | Full-credential reactive generation, invalidation, commit, stale cleanup | Existing correct owner needs extension | Credential mutation, Markdown policy |
| `autobyteus-web/utils/remoteAccess/authorizedResourceUrl.ts` | `File` | Protected resource policy | Snapshot-aware classification/blob fetch | Existing protected URL owner | Pinia watching, DOM |
| `autobyteus-web/utils/remoteAccess/authorizedTransport.ts` | `File` | Remote-access transport | Explicit/current credential header entrypoints | Existing header owner | Resource classification, object URLs |
| `autobyteus-server-ts/src/workspaces/workspace-path-utils.ts` | `File` | Workspace path invariant | Canonical containment | Existing workspace path policy file | HTTP/file streaming |
| `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | `File` | Workspace boundary | Delegate path resolution | Existing public owner | Duplicate containment |
| `autobyteus-server-ts/src/file-explorer/file-explorer.ts` | `File` | Workspace file operations | Reuse path invariant | Existing internal owner | Duplicate containment |

The frontend layout remains intentionally compact: the change adds two cohesive utility files but does not create a new multi-level module hierarchy for a bounded renderer feature. Existing `utils/markdown*.ts` and `utils/fileExplorer/` conventions remain readable.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/fileExplorer/viewers/` | Main-line presentation adapter | `Yes` | Low | Workspace-aware preview stays here |
| `components/conversation/segments/renderer/` | Shared rendering mechanism | `Yes` | Low | Generic renderer remains context-neutral |
| `utils/fileExplorer/` | Off-spine workspace file policy | `Yes` | Low | Pure URL/path policy only |
| `src/workspaces/` | Main-line domain/control | `Yes` | Low | Canonical root/path invariant belongs here |
| `src/file-explorer/` | Internal workspace mechanism | `Yes` | Low | Depends on shared workspace invariant, does not redefine it |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Explicit identity | `{ path: 'docs/readme.md', relativeResourceContext: { kind: 'workspace', workspaceId: 'ws-1' } }` | `workspaceStore.activeWorkspace` lookup inside `MarkdownRenderer` | Prevents cross-workspace/stale identity |
| Relative resolution | `docs/readme.md + assets/a b.png -> docs/assets/a b.png -> ...content?path=docs%2Fassets%2Fa%20b.png` | Regex replacement `src="assets/` -> `src="/rest/...` | Handles nesting/encoding safely |
| Managed render | Sanitized `<img data-markdown-image-url="...">`, then authorized direct/blob `src` binding | Emit protected URL as initial `src`, then replace later | Avoids unauthenticated/wrong first request |
| Credential establishment | `null -> credential A`: empty map removes direct binding, old results are revoked, sources refetch with A, then A-backed blobs bind | Source URL is unchanged so no refresh occurs | Pairing must change classification even without URL change |
| Credential replacement | `A -> B`: increment token, clear map/remove A binding, revoke A blobs, fetch with captured B, ignore/revoke late A completion, bind only B result | Keep A blob visible until B finishes or let A completion overwrite B | Prevents stale-credential data and race bugs |
| Credential removal | `A -> null`: clear map/remove binding, revoke A blobs, reclassify under explicit null, then bind direct URL only if current policy permits | Retain A blob because source did not change | Session removal must invalidate protected content immediately |
| Traversal | `docs/readme.md + ../../secret.png -> blocked` and server rejects sibling-prefix path | Frontend normalization only or `absolute.startsWith(root)` | Server remains authoritative |
| Generic renderer | Resolver absent for conversation Markdown | Guess workspace for every Markdown string | Preserves subject ownership |

### Target resolution contract example

```ts
type MarkdownImageResourceResolution =
  | { kind: 'direct'; url: string }
  | { kind: 'managed'; fetchUrl: string; fragment: string | null }
  | { kind: 'blocked'; reason: 'invalid-path' | 'outside-workspace' };
```

For `docs/readme.md` + `../images/diagram.svg#node-a`, the workspace resolver returns a managed fetch URL for `images/diagram.svg` and `fragment: '#node-a'`. The fragment is applied to the final direct/blob display URL, never included in the filesystem path. Local query text is excluded from filesystem identity; it may be ignored for fetch/cache purposes rather than being appended as duplicate REST query parameters.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Global active-workspace fallback when context absent | Minimal caller changes | `Rejected` | Only explicit workspace-backed state enables resolution |
| Retain raw relative `src` then fix after browser error | Preserves old HTML | `Rejected` | Managed tokens omit initial `src` and bind only resolved URL |
| Add `<base>` to preview or application document | Browser-native resolution | `Rejected` | Token-specific resolution; no global link/resource side effects |
| Regex rewrite raw Markdown/HTML | Quick patch | `Rejected` | Transform parsed image tokens with typed resolver |
| New static or unauthenticated image route | Simpler `<img>` | `Rejected` | Reuse protected workspace content route + authorized object URL |
| Keep both workspace containment algorithms | Avoid server refactor | `Rejected` | One canonical workspace path resolver |
| Globally allow `local-file:`/unknown DOMPurify protocols | Could support standalone local Markdown | `Rejected` | Local absolute Markdown remains out of scope; sanitizer stays strict |
| Renderer watches credential or pairing events | Could trigger refresh at the visible consumer | `Rejected` | Authorized-resource helper observes `activeCredential`; renderer only observes published URL maps |
| Caller invokes `refresh()` after pairing/session changes | Minimal helper change | `Rejected` | Full credential value is part of the helper's authoritative reactive generation key |
| Fetch generation rereads whichever credential is globally current after each await | Avoid transport API change | `Rejected` | Capture one credential snapshot and pass it explicitly through classification/fetch |

## Derived Layering (If Useful)

- Presentation entry: Desktop/mobile Files and `FileViewer`.
- File-specific adapter: `MarkdownPreviewer`.
- Shared render model/lifecycle: `useMarkdownSegments` + `MarkdownRenderer`.
- Protected resource adapter: credential-reactive authorized object URL generation plus explicit-credential transport.
- Transport facade: workspace content REST route.
- Workspace authority: `FileSystemWorkspace` + canonical path invariant.

This layering is descriptive only. Dependency direction follows the ownership rules above; the renderer does not skip the file-specific adapter to reach workspace state.

## Change / Refactor Sequence

1. Add durable unit tests for the canonical workspace containment invariant, including sibling-prefix and absolute/outside candidates; then consolidate both server callers on it.
2. Add the pure Markdown image resolution contract and workspace resource URL/path utility with a table-driven path/source classification suite.
3. Add required nullable `relativeResourceContext` to `OpenFileState`; set it in the workspace load branch and keep it null for local/external branches. Replace existing media URL construction with the canonical builder.
4. Extend `authorizedTransport.ts` and `authorizedResourceUrl.ts` with explicit-credential snapshot entrypoints while keeping existing current-credential convenience APIs delegated to the same header owner. Add tests distinguishing explicit `null`, credential A, and credential B.
5. Extend both `useAuthorizedObjectUrl` variants to observe `storeToRefs(useMobileNodeSessionStore()).activeCredential`, use full source+credential generation keys, invalidate published results before revocation, hold generation-local blobs until atomic commit, and clean stale completions. Add focused composable tests for null -> A, A -> B during an in-flight A request, A -> null, unchanged URLs, error reset, and unmount.
6. Extend `useMarkdownSegments` to consume an optional reactive resolver, transform nested image tokens, omit initial `src` for managed/blocked images, and produce one render model containing segments plus deduplicated managed fetch URLs.
7. Extend `MarkdownRenderer` with the optional resolver prop, attach the existing root ref, reuse the extended `useAuthorizedObjectUrlMap`, synchronously remove/rebind managed `src` values when the published map invalidates/commits, and use `nextTick` only when segment DOM itself changes. Mark per-source failures and guard current nodes/source markers.
8. Update `MarkdownPreviewer` to build the resolver only from explicit workspace context + document path + bound endpoint. Update `FileViewer` and mobile state projection to carry the context.
9. Add component/integration coverage for the reported `assets/...` case, nested `../`, spaces/encoding, direct remote/data images, blocked traversal, mobile authorized blob loading, no unauthenticated initial `src`, stale-context replacement, credential establishment/replacement/removal with unchanged source URLs, late old-credential completion suppression, and generic Markdown no-resolution.
10. Remove obsolete inline URL construction and duplicate containment bodies. Do not leave temporary compatibility branches or caller-driven credential refresh seams.
11. Run implementation-scoped type/unit checks; downstream API/E2E owns broader desktop/mobile/browser execution and durable coverage decisions.

## Key Tradeoffs

- **Optional resolver callback vs workspace context inside renderer**: The callback adds a small interface but preserves renderer reuse and boundary correctness. Direct workspace dependency is simpler but wrong for non-file Markdown.
- **Managed post-sanitize DOM binding vs custom Vue image AST/components**: Post-sanitize binding is a bounded extension of the current `v-html` architecture and reuses existing resource helpers. A full Markdown AST-to-Vue renderer would be disproportionate and introduce a parallel rendering model.
- **Reactive credential inside loader vs caller-provided refresh**: Observing the authoritative store inside the authorized-resource capability adds a Pinia dependency already used by its transport policy, but prevents every media consumer from duplicating pairing-event coordination and makes rotation/removal correct for unchanged URLs.
- **Explicit credential snapshot transport vs imperative global lookup only**: The snapshot API adds a small overload/entrypoint but guarantees that one async generation cannot mix credentials. Existing callers retain the convenience API through delegation, not a parallel implementation.
- **Context in `OpenFileState` vs active-workspace lookup**: State context requires updating test literals/projections but makes identity stable, explicit, and multi-node safe.
- **Canonical path utility extraction vs patching one check**: Extraction slightly broadens server changes but removes duplicated policy and prevents regression between REST and file-explorer paths.

## Risks

- DOM replacement and asynchronous URL resolution can race; token/load generation and current DOM queries must prevent stale binding.
- Credential changes can occur while fetches are in flight; every fetch/classification in a generation must use its captured credential, and stale generation-local blobs must be revoked even though they were never committed.
- Clearing a map without synchronously removing existing managed `src` values can display old-credential content after session rotation/removal; renderer map watches must use synchronous binding invalidation for existing DOM.
- Data attributes holding resource URLs must remain sanitized/escaped; do not use raw HTML concatenation.
- Percent decoding can create hidden separators; decode segment-by-segment once and reject encoded `/`, `\\`, NUL, or malformed escapes.
- Blob URL fragments must be appended only after blob resolution; fragments/query text must never enter filesystem identity.
- Existing stale server test `tests/unit/file-explorer/file-explorer.test.ts` is unrelated and may need downstream classification rather than being “fixed” opportunistically.
- Direct remote images retain current privacy/network behavior; this task neither expands nor restricts them.

## Guidance For Implementation

- Treat this design and the approved requirements as authoritative; route any need to infer workspace identity or expand artifact/team-reference behavior back as design impact.
- Prefer table-driven pure utility tests before component wiring.
- Use token attribute APIs, not Markdown string regexes or unsafe HTML concatenation.
- Ensure managed/blocked images have no initial `src`; otherwise Chromium can issue the wrong request before Vue post-processing.
- Extend `useAuthorizedObjectUrl` as the protected-resource owner. Observe `mobileNodeSessionStore.activeCredential` there through a reactive ref; do not pass credential state into `MarkdownRenderer` or make callers manually refresh after pairing.
- Use a generation-local credential snapshot and blob registry. Publish nothing from a stale generation and revoke every stale local blob before returning.
- Publish empty result maps before revoking committed blobs. `MarkdownRenderer` must synchronously remove existing managed `src` bindings on that invalidation and bind only after a current map commit.
- Keep `MarkdownRenderer` unaware of workspaces, file paths, node stores, and REST route shapes.
- Keep server containment authoritative and canonical; frontend blocking is defense-in-depth.
- Update relevant documentation (`autobyteus-web/docs/content_rendering.md` and, if needed, file explorer/remote access docs) downstream after implementation validation.
