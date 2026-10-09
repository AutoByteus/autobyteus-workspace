# Design Spec — composer-context-file-removal

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline: `requirements-doc.md` @ SR-003, approved by the user 2026-10-09 ("when it cannot delete it, it's a bug we should fix … We first fix this ticket and then it will be deleteable"), following the SR-002 direction "delete should be a universal functionality".
- Behavior-defining supplements: None.
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md` (same folder), incl. "Architecture Investigation Findings (SR-003)".
- Authorities read (2026-10-09): `references/architecture-design.md`, `design-principles.md`, `DESIGN.md` (repo root), `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`, `TESTING.md`. `design-examples.md` not used.
- Project design-principle conflicts / discrepancies: None.

## Current-State Read

An uploaded composer attachment is a **draft file owned by exactly one agent run's draft** (owner kinds: `agent_draft`, `team_member_draft`, `org_member_draft`, `agent_collaboration_member_draft`). Its identity is its **locator** (`/rest/drafts/<owner path>/context-files/<storedFilename>`), built by one server function, `buildDraftContextFileLocator`.

Storage and deletion are already owner-generic (`ContextFileLayout.getDraftFilePath`, `ContextFileReadService.getDraftFilePath/deleteDraftFile`). The locator *shape*, however, is re-implemented four more times, and each copy is maintained per owner kind by hand:

1. server REST: per-kind `GET`/`DELETE` route registrations (`src/api/rest/context-files.ts`) — **DELETE for `agent_collaboration_member_draft` was never registered** (root cause of BEH-001, live 404);
2. server `ContextFileLocalPathResolver`: per-kind draft regexes;
3. web `buildDraftContextFileEndpoint`: per-kind delete URL rebuilt from the composer's *current* owner rather than the attachment's own locator;
4. web `contextAttachmentModel` locator parser (already covers all kinds; kept).

The composer (`useContextAttachmentComposer` + `ContextFilePathInputArea.vue`) swallows upload/delete errors to the console, and offers `+`/paste/drop even when the target has no upload owner (BEH-004..006).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: ~9 source files across two packages (server context-files domain + REST + local-path resolver; web upload store, composer composable, composer component, owner utils, localization), plus tests. All within existing owners; no new subsystem.
- Architectural risk: `High`
- Risk rationale: rewires an existing REST route family (all draft GET/DELETE routes collapse into one wildcard pair, error mapping unified) and replaces the draft-locator parsing used by `ContextFileLocalPathResolver`, which runtimes use (`general-process-run-supervisor.ts:187`, `application-execution-scope-kernel-builder.ts:77`) to resolve attachments to local files. URLs and storage are unchanged, but this is a shared contract surface with a blast radius beyond the composer.
- Escalation trigger: any need to change locator strings, storage layout, finalization, final-file routes, or the remote-access route policy → return `Design Impact`.

## Architecture Investigation Evidence

| Source / Probe | Reference | Observation | Decision Supported |
| --- | --- | --- | --- |
| Live server probe | investigation-notes §Runtime | collab DELETE → 404 route-not-found; agent/team DELETE → 204 | Root cause = missing route registration, not deletion logic |
| Code | `context-files.ts` | 4 GET / 3 DELETE hand-registered draft routes, inconsistent error mapping | D1: one codec-driven route pair |
| Code | `context-file-local-path-resolver.ts` | duplicate draft regexes | D2: same codec |
| Code | `context-file-read-service.ts` | owner-generic read/delete | Reuse, no change |
| Code | `build-studio-server.ts:314-318` | REST prefix `/rest` | Wildcard handler parses `/rest/drafts/...` path = locator form |
| Code | `contextFileUploadStore.ts`, `contextFileOwner.ts` | client rebuilds delete URL from current owner | D3: delete at attachment's own locator |
| Code | `useContextAttachmentComposer.ts` | console-only errors; no-owner silent returns | D4/D5 |
| Data | `~/.autobyteus/server-data/draft_context_files` | only collab drafts stranded | Confirms single failing kind; TTL handles leftovers |

## Intended Change

- **D1 (server, universal delete):** add `parseDraftContextFileLocator(pathname)` — the exact inverse of `buildDraftContextFileLocator` — in the owner-types domain file, driven by the same per-kind shape so build and parse are defined together. Replace all per-kind draft routes with **one `GET /drafts/*` and one `DELETE /drafts/*`** that parse the request path with it and call the existing `ContextFileReadService`. Every owner kind the codec knows is therefore readable *and* deletable; a new owner kind cannot get one without the other.
- **D2 (server):** `ContextFileLocalPathResolver` resolves draft locators through the same codec (drop its four draft regexes).
- **D3 (web, universal delete):** `contextFileUploadStore.deleteDraftAttachment(attachment)` deletes **at the attachment's own locator** (same authorized node URL used to read it). Remove `buildDraftContextFileEndpoint`.
- **D4 (web composer, REQ-003):** remove-× / Clear All delete the server copy only when the attachment's locator owner equals the composer target's draft owner; otherwise (foreign draft, or composer without upload owner) the item is removed from this composer only.
- **D5 (web composer, REQ-004/005):** composer-local visible error line for failed upload / remove / Clear All (names the file; failed delete keeps the item for retry); `+` disabled and file paste/drop show a visible message when the target has no upload owner.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001/002, AC-001..003, AC-005 | × / Clear All in a delegated child of a standalone run | DELETE 404, silent | Removed + draft deleted | DS-001 |
| BEH-002 | User | REQ-002, AC-004 | × / Clear All in other run kinds | Works | Preserved (same URLs, now via universal route) | DS-001 |
| BEH-003 | User | REQ-002, AC-004 | Remove a path attachment | Local removal | Preserved | DS-001 (no server call) |
| BEH-004 | User | REQ-004, AC-007 | `+`/paste/drop with no upload owner | Silent no-op | Disabled / visible message | DS-003 |
| BEH-005 | User | REQ-003/005, AC-006/008 | Remove foreign/owner-less draft; delete failure | Silent no-op | Local removal for foreign; visible error on failure | DS-001 |
| BEH-006 | User | REQ-005, AC-008 | Upload fails | Silent | Visible error | DS-003 |
| (contract) | Contract | QR-001, AC-005 | Runtime resolves an attachment locator to a local file | Per-kind regexes | Preserved outcome via codec | DS-002 |

## Relevant Supplemental Task Artifacts

None (19.png / 20.png are evidence only).

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers: **Repeated coordination / duplicated policy** — the draft locator shape (owner kind ↔ URL path) is encoded five times (server build, server routes, server local-path regexes, web endpoint builder, web parser); the bug is a missed copy. **Authoritative-boundary**: the client deletes by re-deriving an address from the current composer owner instead of using the attachment's own identity. Ruled out: persistence change (none), security boundary (same `/rest/drafts/` policy prefix), concurrency (none).
- Root cause classification: `Duplicated Policy Or Coordination`
- Refactor needed now: `Yes` (bounded)
- Evidence: investigation-notes §Architecture Investigation Findings.
- Design response: one server codec (build + parse) owns the draft locator shape; routes and local-path resolution derive from it; the client deletes by the locator it already holds. The web parser (`contextAttachmentModel`) remains the client's single parser (already complete); the web endpoint builder is removed.
- Intentional deferrals: final-file (non-draft) GET routes and their resolver regexes follow the same per-kind pattern but have no delete operation and no defect; consolidating them is a follow-up candidate, not in scope (no approved behavior needs it).

## Terminology

- **Draft locator**: `/rest/drafts/<owner path>/context-files/<storedFilename>`; the attachment's identity and address.
- **Draft locator codec**: `buildDraftContextFileLocator` + new `parseDraftContextFileLocator`.
- **Upload owner**: the composer target's `draftOwner` (null = target accepts no uploads).

## Legacy Removal Policy (Mandatory)

No backward compatibility. Per-kind draft route registrations, per-kind draft regexes in the local-path resolver, and the web per-kind delete endpoint builder are removed, not kept beside the new path. Locator strings are unchanged, so there is nothing to be compatible with.

## Persisted Data / State Transition Decision

- Stored subject: draft files under `server-data/draft_context_files/<owner path>/context_files/`.
- Change: none to layout or locator format.
- Decision: `Not Affected`. Already-stranded collab drafts are reclaimed by the existing 24h TTL (`CONTEXT_FILE_DRAFT_TTL_MS`).

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Governing Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001/002/003/005 | User clicks × / Clear All | Item gone from composer; draft file unlinked | Composer (`useContextAttachmentComposer`) → server `ContextFileReadService` | The broken path |
| DS-002 | Primary (contract) | contract | Runtime / REST receives a draft locator | Local file path / served bytes | Draft locator codec | Shared parse used by routes + runtimes |
| DS-003 | Primary | BEH-004/006 | User pastes/drops/picks a file | Attachment shown, or visible message | Composer | Attach gating + visible upload errors |

## Primary Execution Spine(s)

- DS-001: `ContextFilePathInputArea (×/Clear All) → useContextAttachmentComposer.removeItem/clear → [own draft?] contextFileUploadStore.deleteDraftAttachment(attachment) → DELETE <attachment.locator> → REST DELETE /rest/drafts/* → parseDraftContextFileLocator → ContextFileReadService.deleteDraftFile → unlink → 204 → composer commits removal`
- DS-002: `GET|DELETE /rest/drafts/* or runtime locator → parseDraftContextFileLocator → {owner, storedFilename} → ContextFileReadService / ContextFileLayout → file`
- DS-003: `paste/drop/+ → ContextFilePathInputArea → [target.draftOwner?] uploadFiles → contextFileUploadStore.uploadAttachment → POST /rest/context-files/upload → attachment committed | composer error`

## Spine Narratives (Mandatory)

| Spine | Narrative | Nodes | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | The composer decides whether the server copy is its own (locator owner == target owner). If so it asks the upload store to delete that exact locator; the server's single draft route parses the locator into owner + file and the read service validates and unlinks it. On success the item leaves the list; on failure the item stays and the composer shows an error naming the file. Foreign/owner-less drafts leave the list without a server call. Path attachments never call the server. | composer, upload store, REST draft route, codec, read service | composer (decision), read service (deletion) | error presentation, localization |
| DS-002 | Anything holding a draft locator resolves it through one codec — REST handlers for read/delete and the runtime local-path resolver. Build and parse sit together so they cannot drift. | codec, read service, layout | codec | owner validation (existing resolver) |
| DS-003 | Upload is offered only when the target has an upload owner; otherwise `+` is disabled with a reason and file paste/drop produce a visible message. Upload failures produce a visible error naming the file. Path attachments are unaffected. | component, composer, upload store | composer | localization |

## Spine Actors / Main-Line Nodes

`ContextFilePathInputArea.vue`, `useContextAttachmentComposer`, `contextFileUploadStore`, REST draft routes (`context-files.ts`), draft locator codec (`context-file-owner-types.ts`), `ContextFileReadService`.

## Ownership Map

- **Draft locator codec** (`context-file-owner-types.ts`): owns the owner-kind ↔ locator path mapping (build and parse). Single source of truth on the server.
- **REST draft routes**: thin transport — parse via codec, call read service, map errors to HTTP. Owns HTTP status mapping only.
- **`ContextFileReadService`**: owner validation + read/delete of draft files (unchanged).
- **`ContextFileLocalPathResolver`**: maps locators to local paths for runtimes; delegates draft parsing to the codec.
- **`contextFileUploadStore`**: client HTTP for upload/delete/finalize; deletes by locator; no global error state.
- **`useContextAttachmentComposer`**: per-composer attachment list, own-draft decision, composer-local error state, upload gating.
- **`ContextFilePathInputArea.vue`**: rendering (disabled `+`, error line), wiring of paste/drop/picker.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind It | Why | Must Not Own |
| --- | --- | --- | --- |
| REST `GET`/`DELETE /rest/drafts/*` | codec + `ContextFileReadService` | HTTP transport | Per-kind path knowledge |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope |
| --- | --- | --- | --- |
| Per-kind draft GET routes (agent, team, Org, collab) and DELETE routes (agent, team, Org) in `src/api/rest/context-files.ts`, incl. `sendAgentCollaborationFile` draft use and the `orgDraftRoute`/`OrgFileParams` draft usage | Superseded | `GET`/`DELETE /drafts/*` via codec | In This Change |
| `AGENT_DRAFT_ROUTE`, `TEAM_MEMBER_DRAFT_ROUTE`, `ORG_MEMBER_DRAFT_ROUTE`, `AGENT_COLLABORATION_MEMBER_DRAFT_ROUTE` and their match branches in `context-file-local-path-resolver.ts` | Duplicate parse | `parseDraftContextFileLocator` | In This Change |
| `buildDraftContextFileEndpoint` (`autobyteus-web/utils/contextFiles/contextFileOwner.ts`) | Dead after D3 (only caller is `deleteDraftAttachment`) | Attachment's own locator | In This Change |
| `owner` parameter of `contextFileUploadStore.deleteDraftAttachment` | Locator carries the owner | — | In This Change |
| `contextFileUploadStore.error` state and its writes | Dead: written, never read by any component (grep) | Composer-local error (D5) | In This Change |
| `console.warn('Cannot delete draft context file without an active owner.')` branch | Replaced by D4 rule | — | In This Change |
| Final-file per-kind routes / regexes | Same pattern, no defect | — | Follow-up candidate |

## Return Or Event Spine(s)

DS-001 return: `204 → store resolves → composer commits removal`; non-2xx → store throws `Error(detail)` → composer keeps item and sets error.

## Bounded Local / Internal Spines

N/A — no loops/state machines.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Risk If On Main Line |
| --- | --- | --- | --- | --- |
| Draft owner validation (`ContextFileOwnerResolver.validateDraftOwner`) | DS-001/002 | read service | Reject unknown Org/collab owners | — (existing) |
| Localized messages (`localization/messages/{en,zh-CN}/agentInput*`) | DS-001/003 | composer component | Error / disabled-reason text | — |
| Locator → node URL (`resolveAttachmentFetchUrl`, `authorizedFetch`) | DS-001 | upload store | Authorized absolute URL for a locator | Duplicate URL logic |

## Ownership Boundaries

The codec is the only server code that knows draft locator path shapes. REST routes and the local-path resolver must not contain owner-kind path patterns. On the client, the attachment's locator is the delete address; no client code re-derives a draft URL from an owner.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| `parseDraftContextFileLocator` / `buildDraftContextFileLocator` | Owner-kind path shapes | REST routes, local-path resolver, upload service | Route/regex literals per owner kind outside the codec | Extend codec |
| `contextFileUploadStore.deleteDraftAttachment(attachment)` | HTTP delete at locator | composer | Composer calling `apiService`/`authorizedFetch` directly for delete | Extend store |

## Dependency Rules

- `api/rest/context-files.ts` → codec, `ContextFileReadService`, owner-resolver error types. Not → layout directly.
- `context-file-local-path-resolver.ts` → codec, layout, owner resolver.
- Web composer → upload store, `contextAttachmentModel` parser. Upload store → `authorizedFetch` + locator URL resolution. No web code → per-kind draft URL building.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape |
| --- | --- | --- | --- |
| `parseDraftContextFileLocator(pathname: string): { owner: ContextFileDraftOwnerDescriptor; storedFilename: string } \| null` | Draft locator | Inverse of build; accepts `/rest/drafts/...` path (no query/fragment); decodes segments; validates owner via `parseDraftContextFileOwnerDescriptor` and filename via `assertStoredFilename` (throws `ContextFileDescriptorError` on a recognized-but-invalid shape; returns `null` when not a draft locator) | Path string |
| `GET /rest/drafts/*` | Draft file | Serve bytes | Locator path |
| `DELETE /rest/drafts/*` | Draft file | Unlink (missing file → 204) | Locator path |
| `contextFileUploadStore.deleteDraftAttachment(attachment: UploadedContextAttachment)` | Draft attachment | DELETE at `attachment.locator`; throws `Error` with server `detail` on non-2xx | Attachment |

HTTP mapping for both routes (one function): not a draft locator → 404; `ContextFileDescriptorError` / `CollaborationContractError` → 400 `{detail}`; `*ContextFileOwnerNotFoundError` → 404; GET missing file → 404; DELETE → 204 whether or not the file existed; anything else → rethrow (500). Note the deliberate unification: today agent/team DELETE map every error to 400 and agent/team GET 500 on a bad owner.

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| codec parse | Yes | Yes (locator encodes owner kind) | Low | — |
| `/rest/drafts/*` | Yes | Yes (path = locator) | Low | Wildcard only under `/drafts/`; no other route there (grep) |
| `deleteDraftAttachment` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Action |
| --- | --- | --- | --- |
| codec parse | `parseDraftContextFileLocator` | Yes (mirrors `buildDraftContextFileLocator`) | — |
| composer error | `attachmentError` (composable return) | Yes | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Draft read/delete | `ContextFileReadService` | Reuse |
| Owner parsing/validation | `parseDraftContextFileOwnerDescriptor`, `ContextFileOwnerResolver` | Reuse |
| Locator → owner on client | `parseDraftUploadedContextAttachmentLocator` | Reuse |
| Authorized fetch to node | `authorizedFetch` + node base (`windowNodeContextStore.nodeBaseUrl`) | Reuse; move the composer's `resolveAttachmentFetchUrl` into `utils/contextFiles` as `resolveContextAttachmentUrl` so the store and composer share it |
| Owner equality | `sameDraftOwner` (composer-local) | Reuse |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Decision |
| --- | --- | --- |
| server `context-files/domain` | codec | Extend |
| server `api/rest` | draft routes | Modify (consolidate) |
| server `context-files/services` | local-path resolver | Modify |
| web `stores` | upload store delete/error | Modify |
| web `composables` | composer remove/clear/upload/gating/error | Modify |
| web `components/agentInput` | tray rendering | Modify |
| web `utils/contextFiles` | locator URL resolution; owner utils | Extend / remove dead builder |

## Draft → Final File Responsibility Mapping

| File | Concern |
| --- | --- |
| `autobyteus-server-ts/src/context-files/domain/context-file-owner-types.ts` | Add `parseDraftContextFileLocator`; keep build/parse shapes adjacent (one per-kind table or switch used by both) |
| `autobyteus-server-ts/src/api/rest/context-files.ts` | Replace per-kind draft routes with `GET`/`DELETE /drafts/*` + one error-mapping function; final routes unchanged |
| `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts` | Draft branch → codec; final branches unchanged |
| `autobyteus-web/utils/contextFiles/contextAttachmentUrl.ts` (new) | `resolveContextAttachmentUrl(locator)` — moved from composer |
| `autobyteus-web/stores/contextFileUploadStore.ts` | `deleteDraftAttachment(attachment)` via `authorizedFetch(resolveContextAttachmentUrl(locator), { method: 'DELETE' })`; throw on non-2xx with `detail`; drop `error` state |
| `autobyteus-web/utils/contextFiles/contextFileOwner.ts` | Remove `buildDraftContextFileEndpoint` |
| `autobyteus-web/composables/useContextAttachmentComposer.ts` | D4 own-draft rule in `removeItem` and `clearCurrentTargetAttachments`; `attachmentError` ref set on upload/remove/clear failure and on owner-less file attach; cleared on next successful action / target key change; expose `canUpload` (target has draftOwner); use shared URL resolver |
| `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | `+` disabled when `!canUpload` (tooltip reason); paste/drop of files with `!canUpload` → `attachmentError` message; render error line in tray (role="alert") |
| `autobyteus-web/localization/messages/{en,zh-CN}/agentInput*.ts` | New keys: upload failed, remove failed, uploads unavailable |

## Reusable Owned Structures Check

| Structure | Shared File | Owner | Notes |
| --- | --- | --- | --- |
| Draft locator shape | `context-file-owner-types.ts` | server context-files domain | Build + parse together; must not become a generic router |
| Locator → node URL | `utils/contextFiles/contextAttachmentUrl.ts` | web context files | Must not embed owner-kind knowledge |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Action |
| --- | --- | --- |
| `{ owner, storedFilename }` parse result | Yes | — |
| `deleteDraftAttachment` input | Yes (attachment only; owner removed) | — |

## Applied Patterns

None beyond a codec pair (build/parse).

## Target Subsystem / Folder / File Mapping

As in the file responsibility table; no new folders. One new web file `autobyteus-web/utils/contextFiles/contextAttachmentUrl.ts`.

## Folder Boundary Check

| Path | Depth | Clear | Risk |
| --- | --- | --- | --- |
| server `context-files/domain` | Domain | Yes | Low |
| server `api/rest` | Transport | Yes | Low |
| web `utils/contextFiles` | Off-spine | Yes | Low |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Server route | `app.delete("/drafts/*", h)` → `parseDraftContextFileLocator(pathOf(request.url))` → `readService.deleteDraftFile(owner, file)` | One `app.delete("/drafts/<kind-specific pattern>")` per owner kind |
| Client delete | `deleteDraftAttachment(item.attachment)` → `DELETE <attachment.locator>` | `DELETE buildDraftContextFileEndpoint(target.draftOwner, storedFilename)` |
| Own-draft rule | `const draft = parseDraftUploadedContextAttachmentLocator(a.locator); if (draft && target.draftOwner && sameDraftOwner(draft.owner, target.draftOwner)) await store.deleteDraftAttachment(a)` then commit removal | Deleting a foreign owner's draft because it appears in this composer |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Just add the missing collab DELETE route beside the others | Smallest diff | Rejected | Codec-driven universal routes (prevents recurrence; QR-001) |
| Keep per-kind routes and add wildcard as fallback | Safety | Rejected | Clean cut |
| Keep `owner` param on delete for callers | Compat | Rejected | Locator-only |

## Change / Refactor Sequence

1. Server codec `parseDraftContextFileLocator` + unit round-trip test over all four owner kinds (build → parse = identity; invalid shapes rejected; non-draft path → null).
2. Server REST: add `GET`/`DELETE /drafts/*`, remove per-kind draft routes; integration test: for every owner kind (agent, team member, Org member, agent-collaboration member with real fixtures as in existing tests) upload → GET 200 → DELETE 204 → GET 404; DELETE missing → 204; bad owner → 400/404 per mapping. Update existing tests that assert old per-kind error codes.
3. Server local-path resolver → codec; existing resolver tests must pass unchanged in outcome.
4. Web: `resolveContextAttachmentUrl` move; upload store `deleteDraftAttachment(attachment)`; remove endpoint builder and `error` state; update `contextFileUploadStore.spec.ts`.
5. Web composer + component: D4, D5; tests: delegated-child target (`agent_collaboration_member_draft` owner) × and Clear All delete at the attachment's locator and remove the item; foreign/owner-less draft removed locally without a delete call; failed delete keeps the item and shows the error; failed upload shows the error; no-owner target disables `+` and shows a message on file paste/drop; path attachments removed without server call.
6. `pnpm -C autobyteus-server-ts typecheck`, server unit + integration (after `test:integration:prepare`), `pnpm -C autobyteus-web test:nuxt <files> --run`.
7. Desktop verification by the user, including the 19.png case (delegated Software Engineering Team member under the Project Task Manager), paste + `+` picker, × and Clear All; confirm the draft file disappears under `~/.autobyteus/server-data/draft_context_files/agent-collaborations/…`.

## Key Tradeoffs

- Wildcard route vs. registering per-kind routes generated from a table: wildcard + codec keeps path knowledge in one place and guarantees GET/DELETE parity; cost is a hand-written path parse in the codec (already mirrored on the client).
- Own-draft rule leaves a foreign or owner-less draft on disk until TTL — accepted to never delete another composer's file (REQ-003).

## Risks

- Wildcard handler must use the raw path (not Fastify-decoded params) and decode segments exactly like the old param routes (e.g. team `memberAddress` `%2F`); covered by round-trip tests including an encoded team member address.
- Runtime attachment resolution regression → covered by existing local-path-resolver tests plus codec tests.
- Error-code unification may break tests asserting old codes; update them to the documented mapping.

## Guidance For Implementation

- Keep URLs byte-for-byte identical; do not change `buildDraftContextFileLocator`.
- Do not touch final-file routes, finalization, upload, or remote-access policy.
- Composer error text must include the file's display name; errors are per composer instance (not a global store field).
- Follow `TESTING.md`; record any environment limits honestly.
