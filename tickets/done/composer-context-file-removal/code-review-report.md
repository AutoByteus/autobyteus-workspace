# Code Review Report — composer-context-file-removal

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-003)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed As Context: None behavior-defining (19.png / 20.png are evidence only)
- Relevant Solution Revision IDs: `SR-003`
- Design Review Report Reviewed As Context: `design-review-report.md` (Pass; AR-001, AR-002 non-blocking guidance)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: Initial implementation review requested by `/software_engineering_team/implementation_engineer` (IR-001)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation-review entry point)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The change stays inside the mapped files. It rewires the shared draft REST route family and the runtime draft-locator resolution, as the design's risk rationale describes. Locator strings, storage, finalization, final-file routes and remote-access policy are unchanged, so no escalation trigger fired.

## Review Scope

- Changed implementation and behavior reviewed: `git diff 46e94fdea..dbd2e9a91` (commit `dbd2e9a91`, branch `codex/composer-context-file-removal`). Covers D1–D5: the server draft-locator codec, the universal `GET`/`DELETE /rest/drafts/*` routes with one error mapping, the local-path resolver through the codec, web delete-at-locator, the own-draft rule, composer-local errors and upload gating, and localization.
- Files / areas reviewed:
  - Server: `src/context-files/domain/context-file-owner-types.ts`, `src/api/rest/context-files.ts`, `src/context-files/services/context-file-local-path-resolver.ts`.
  - Web: `stores/contextFileUploadStore.ts`, `utils/contextFiles/contextAttachmentUrl.ts` (new), `utils/contextFiles/contextFileOwner.ts`, `composables/useContextAttachmentComposer.ts`, `components/agentInput/ContextFilePathInputArea.vue`, `localization/messages/{en,zh-CN}/agentInput.generated.ts`.
  - Also read for context: `contextAttachmentModel.ts` (client parser), `authorizedTransport.ts`, `build-studio-server.ts` (the `/rest` prefix) and `api/rest/index.ts` (the single route registration).
  - All changed tests (server codec, resolver and universal REST integration; web composable, component, store and Org spec).
- Reviewer verification run: server `vitest run tests/unit/context-files tests/integration/api/rest/draft-context-files-universal.integration.test.ts` gave 10 files and 74 tests passing. Web `vitest run` on the 4 changed specs gave 39 tests passing.
- Explicit exclusions: final-file (non-draft) routes and regexes, which are design-declared out of scope. Also excluded: the pre-existing `agent-status-websocket` integration failure (reproduced on the base by the implementer; unrelated area) and the pre-existing `draftRunId` trim-only validation (pre-existing, not changed).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Draft deletion is one universal operation by the attachment's own identity (REQ-001). × and Clear All work for every run kind (REQ-002). Foreign drafts are never deleted (REQ-003). Uploads are gated with a visible reason (REQ-004). Failures are visible and name the file (REQ-005). Tests cover these (REQ-006).
- Design-spec behavior map verified against the implementation: Yes. DS-001, DS-002 and DS-003 match the code (traces below).
- Design review report and round confirmed: ARCH-REV-001 Pass. AR-001 and AR-002 were applied (see the table below).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: UNK-001 (whether a delegated child is composable after its Task is DONE/CANCELLED) remains non-blocking. The fix is keyed to the owner, not to the run state.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `ContextFilePathInputArea` × / Clear All → `useContextAttachmentComposer.removeItem`/`clearCurrentTargetAttachments` → `isOwnDraftAttachment` (client parser + exhaustive `sameDraftOwner`) → `contextFileUploadStore.deleteDraftAttachment(attachment)` → `authorizedFetch(resolveContextAttachmentUrl(locator), DELETE)` → `DELETE /rest/drafts/*` → `parseDraftContextFileLocator(request.url sans query)` → `ContextFileReadService.deleteDraftFile` → 204 → the composer commits the removal. The collab kind is covered end-to-end by `draft-context-files-universal.integration.test.ts` and the component "delegated child" cases. | — |
| BEH-002 | Confirmed | Same path. `buildDraftContextFileLocator` is now derived from `DRAFT_LOCATOR_SHAPES`, and the "keeps the established locator strings" test pins the exact strings for all 4 kinds. The Org spec asserts the DELETE goes to the same locator URL. | — |
| BEH-003 | Confirmed | `isOwnDraftAttachment` is false for path attachments, so they are removed locally with no server call (component tests). | — |
| BEH-004 | Confirmed | `canUpload = Boolean(target.draftOwner)`. `+` and the file input are `:disabled` with the `uploads_unavailable` tooltip. The gate sits inside `uploadFiles` and sets `uploads_unavailable`. The Electron native-drop branch (`getPathForFile`) runs before `uploadFiles`, so path drops still attach (AR-002(1); tested). | — |
| BEH-005 | Confirmed | A foreign or owner-less draft is removed locally with no delete call. A failed own-draft delete keeps the item, and `reportFailure('remove_failed')` names the file with the server detail. Clear All keeps exactly the failed items. | — |
| BEH-006 | Confirmed | Upload failures (including clone failures, AR-002(2)) are collected per file, then `reportFailure('upload_failed')` runs. The placeholder is still removed in `finally`. | — |
| Contract QR-001 / AC-005 | Confirmed | `DRAFT_LOCATOR_SHAPES` is typed `{ [K in DraftOwnerKind]: … }`, so a new draft owner kind fails to compile without a shape. Read and delete are one wildcard pair driven by one parse. The client `sameDraftOwner` has a `never` default. The integration test iterates over every kind through a typed map. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, REQ-001/002 | User | Desktop/web user | Remove a mistaken upload from a delegated child's composer | Workspaces tree → delegated Agent / Team-copy member composer → × / Clear All | Normal | DS-001 (see BEH-001 row) | Item gone; draft unlinked | Requirements, 19.png, live 404 in the investigation, implementer's live 204 | Supported Normal Scenario | Use |
| SCN-002 | BEH-002/003, REQ-002 | User | User | Remove attachments in other run views | Standalone / New chat / Team / Org composers | Normal | DS-001 with unchanged locators | Unchanged removal | Requirements, existing specs | Supported Normal Scenario | Use |
| SCN-003 | BEH-004, REQ-004 | User | User | Attach where the target cannot accept uploads | Org task agent / member composer while its message is pending | Explicit Edge | DS-003 gate in `uploadFiles` and the disabled `+` | Visible reason; path attachments still work | Requirements SCN-003, code | Supported Explicit Edge Scenario | Use |
| SCN-004 | BEH-005/006, REQ-005 | User | User | Understand a failed attach/remove | Any composer; server/network failure | Normal | `reportFailure` → `attachmentError` → `role="alert"` line | Error names the file; failed delete keeps the item | Requirements AC-008 | Supported Normal Scenario | Use |
| CT-001 | QR-001, AC-005 | Contract | Server REST + runtime resolver | Every draft locator the server builds is readable, deletable and resolvable | `buildDraftContextFileLocator` output reaching `GET`/`DELETE /rest/drafts/*` or `ContextFileLocalPathResolver.resolve` | Normal | DS-002 | Round-trip identity; uniform status mapping | Design D1/D2, codec tests | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CND-001 | Resolver behavior change: a draft-shaped locator with an invalid owner (or bad `%` encoding) used to throw out of `resolve()` (or fall back to raw segments); it now returns `null`. | CT-001 | None independent. Draft locators reaching runtimes are built by `buildDraftContextFileLocator` from validated owners. | An invalid draft locator only arises from hand-crafted text. | Codec tests; resolver test asserts `null` for `no-root`, `C/D` and a bad `%` | Reject | Technically possible but unsupported. No product surface produces an invalid draft locator. A uniform `null` is the stated design (D2). |
| CND-002 | The wildcard handler parses the absolute `request.url`, so it relies on the router being mounted at `/rest` (the codec prefix is `/rest/drafts/`). | CT-001 | None. There is exactly one registration (`build-studio-server.ts:318`, `{ prefix: "/rest" }`), and locators are absolute `/rest/...` by contract. | A different mount prefix is not a supported configuration. | grep of `registerRestRoutes` / `registerContextFileRoutes` | Reject | Not reachable in the current product; the integration test mounts at `/rest` the same way. Listed as a residual note only. |
| CND-003 | A single `errorState` slot means a late failure on target A, landing while B shows its own error, replaces B's error (hidden because the key differs). | SCN-004 | Requires an upload/delete on A that finishes after the user switched to B, *and* a concurrent error on B | Artificial cross-target timing | Code | Reject | Two individually supported actions do not make a supported concurrent workflow. The cross-target late-failure case the design cares about (not shown on the other target) is handled and tested. |
| CND-004 | Clone-failure detail includes the raw locator text (`Failed to fetch pasted draft attachment '/rest/drafts/…' (404).`) after the localized "Couldn't attach <name>." | SCN-004 | User pastes another composer's draft URL whose file has expired or been removed | `appendLocatorAttachments` → clone fails → `upload_failed` with `Error.message` as detail | Code, component test | Reject (as finding) | REQ-005/AC-008 is satisfied: the error is visible and names the file. The extra technical detail is cosmetic, with no approved UX requirement against it. Noted as optional polish. |
| CND-005 | `buildDraftContextFileLocator` uses `owner as unknown as Record<string,string>` and a widened `draftLocatorShape` accessor. | Engineering contract (type safety) | — | Field names are constrained by the mapped type `DraftOwnerField<K>`, so a wrong field is a compile error at the table; the cast only bridges the correlated-union indexing TS cannot express | Code | Reject | Proportionate, localized cast; the table typing keeps the guarantee. |
| CND-006 | AR-001 / AR-002 guidance applied | Design review | — | — | `sameDraftOwner` `never` default; composable test over every kind with server-shaped locators incl. encoded `/delivery/lead`; gate in `uploadFiles`; clone failure → `upload_failed`; `activeRequestCount` kept in `deleteDraftAttachment` (store test asserts in-flight) | Confirmed (no finding) | — |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | `Duplicated Policy Or Coordination`. Locator-shape knowledge on the server now exists only in `DRAFT_LOCATOR_SHAPES`; the web per-kind URL builder is gone. | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None exist | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001/002/003 traced exactly as designed | — |
| Ownership boundary preservation and clarity | Pass | The codec owns shapes. Routes own only the HTTP mapping (`sendDraftRouteError`). The read service owns validation and unlink. The store owns HTTP. The composer owns the own-draft decision and error state. | — |
| Off-spine concern clarity | Pass | `resolveContextAttachmentUrl` is extracted to `utils/contextFiles` and shared by the store and the clone path; localization keys are separate | — |
| Existing capability/subsystem reuse | Pass | Reuses `ContextFileReadService`, `parseDraftContextFileOwnerDescriptor`, `filename()` validation, the client parser and `authorizedFetch` | — |
| Reusable owned structures | Pass | One shape table drives both build and parse | — |
| Shared-structure/data-model tightness | Pass | `{ owner, storedFilename }`; `deleteDraftAttachment(attachment)` takes the attachment only; `ContextAttachmentComposerError` is a tight discriminated union | — |
| Repeated coordination ownership | Pass | 4 GET + 3 DELETE per-kind handlers collapsed into one pair with one error mapper | — |
| Empty indirection | Pass | `parseDraftRequest` adds the not-a-locator → 404 translation; `parseDraftLocator` in the resolver maps throws to `null`; neither is a pure pass-through | — |
| Separation of concerns / file responsibility | Pass | Each file keeps its concern | — |
| Ownership-driven dependency check | Pass | REST depends on the codec and read service, not on the layout. The composer no longer depends on `windowNodeContextStore` directly. | — |
| Authoritative Boundary Rule | Pass | The composer deletes only through `contextFileUploadStore.deleteDraftAttachment`, never with `authorizedFetch` DELETE directly. Routes and the resolver hold no owner-kind path literals. | — |
| File placement | Pass | Codec in `context-files/domain`; URL resolver in `utils/contextFiles` | — |
| Flat-vs-over-split layout | Pass | One new 14-line util, justified by two callers | — |
| Interface boundary clarity | Pass | `parseDraftContextFileLocator(pathname)` returns null for a non-draft path and throws for an invalid draft, as specified | — |
| Naming quality | Pass | `parseDraftContextFileLocator` mirrors build; `isOwnDraftAttachment`, `canUpload`, `attachmentError` are clear | — |
| No unjustified duplication | Pass | The client parser is the one remaining cross-package copy, and the design accepts it (pinned by the AR-001 test) | — |
| Patch-on-patch complexity control | Pass | Clean replacement, not layered | — |
| Dead code removed in touched files | Pass | Per-kind routes, `orgDraftRoute`, `sendAgentCollaborationFile`, draft regexes, `buildDraftContextFileEndpoint`, store `error` state and the `console.warn` branch are removed. A grep finds no remaining references. All remaining store imports are used. | — |
| Test scenarios and assertions are requirement-aligned | Pass | Integration test iterates over every kind (AC-005); composable test over every kind (AR-001); the component covers AC-001..003 and AC-006..008 | — |
| Test fixtures/helpers reusable and coherent | Pass | Typed per-kind maps (`DRAFT_OWNERS`, `SERVER_DRAFTS`) make kind coverage compile-checked; existing Org/attachment fixtures reused | — |
| No stale / compatibility-only tests | Pass | The unused `delete` mocks were removed; the Org spec now asserts the new transport | — |
| API/E2E readiness | Pass | Universal routes and the status mapping are well defined for executable validation. The handoff lists the scenarios, including the real desktop 19.png journey. | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/rest/context-files.ts` | ~225 (244 raw) | Pass | Pass (net −65) | Pass | Pass | OK | — |
| `autobyteus-server-ts/src/context-files/domain/context-file-owner-types.ts` | ~180 (192 raw) | Pass | Pass (+57) | Pass | Pass | OK | — |
| `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts` | ~160 (177 raw) | Pass | Pass (net −56) | Pass | Pass | OK | — |
| `autobyteus-web/composables/useContextAttachmentComposer.ts` | ~416 (468 raw) | Pass | Pass (+~110) | Pass | Pass | OK | — |
| `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | 458 (509 raw incl. template/styles) | Pass | Pass (+~32) | Pass | Pass | OK | — |
| `autobyteus-web/stores/contextFileUploadStore.ts` | ~135 (151 raw) | Pass | Pass | Pass | Pass | OK | — |
| `autobyteus-web/utils/contextFiles/contextAttachmentUrl.ts` | 12 | Pass | Pass | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No fallback routes kept beside the wildcard; no `owner` parameter retained on delete |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files | Pass | See the structural row |
| Approved persisted-data transition decision followed | Pass | `Not Affected`; the locator strings are pinned byte-for-byte by a test |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the reviewed design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None. Final-file per-kind routes and regexes remain a design-declared follow-up candidate. They are live code, not dead.

## Docs-Impact Verdict

- Docs impact: `No` (no user docs describe per-kind draft routes; REST status-code changes are internal to the web client and server). The delivery stage may confirm.
- Files or areas likely affected: None identified.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| Design-review premises (router wildcard/raw-path behavior; owner-keyed fix independent of run state) | Confirmed | The integration test exercises the wildcard with an encoded `%2F` team member address and a query string; the AC-003 offline/restart component test is present |

New or reclassified premises: None.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | Data-Flow Spine Inventory and Clarity | 9.5 | All three spines are implemented exactly as designed, with one route pair and one parse | — | — |
| `2` | Ownership Clarity and Boundary Encapsulation | 9.5 | The codec is the sole owner of server locator shapes; the client deletes only through the store at the attachment's own identity | — | — |
| `3` | API / Interface / Query / Command Clarity | 9.3 | `parseDraftContextFileLocator` has a crisp contract: null means not a draft, a throw means an invalid draft. `deleteDraftAttachment(attachment)` is a single-subject API. | The wildcard depends on the absolute `/rest` mount (CND-002, rejected; residual note only) | Optional: a comment at the route noting the absolute-path parse |
| `4` | Separation of Concerns and File Placement | 9.4 | Error presentation is in the component, error state in the composable, HTTP in the store, the URL resolver in utils | — | — |
| `5` | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.5 | The mapped-type table guarantees build/parse parity and compile-time completeness; the error union is tight | A localized cast in build (CND-005, accepted) | — |
| `6` | Naming Quality and Local Readability | 9.2 | Clear names; good doc comments on the codec and gate | The codec's parse loop is compact and needs a second read | — |
| `7` | API/E2E Readiness | 9.3 | Status mapping is uniform and documented; the scenario hints are concrete | The real desktop 19.png journey is still pending user verification | API/E2E plus user verification |
| `8` | Runtime Correctness And Behavioral Fidelity | 9.4 | Every AC traced. Reviewer re-ran the targeted server tests (74) and web tests (39), all passing. | Clone-failure detail text is technical (CND-004, cosmetic) | Optional polish |
| `9` | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cut; no fallback routes or compat params | — | — |
| `10` | Cleanup Completeness | 9.5 | All designed removals done plus the single-use helper inlined; no residual references | — | — |

## Findings

None. No candidate was promoted. Optional, non-blocking polish (not required for pass):

- CND-004: the server/clone detail appended after "Couldn't attach <name>." can include raw locator text for clone failures.
- CND-002: a brief comment at `parseDraftRequest` noting that it parses the absolute `/rest/drafts/...` path would aid future readers.

## Classification

N/A — Pass.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer` (primary pass rule). Informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- Status codes changed by design: draft GET with a bad owner 500→400; DELETE owner-not-found 400→404; an unexpected DELETE fault now returns 500. No in-repo client relies on the old codes; the web client treats any non-2xx as a remove failure.
- Under Fastify `inject`, `%2E%2E` segments are normalized before routing. Real HTTP should be validated by API/E2E for the traversal-shaped 400 path.
- The real desktop 19.png journey (delegated Software Engineering Team member under the Project Task Manager) is not yet driven; it needs user/E2E verification.
- Pre-existing and out of scope: `agent_draft.draftRunId` is trim-only validated (hardening candidate). The `agent-status-websocket` integration cadence failure reproduces on the base.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10 (94/100); every category ≥ 9.0
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: Classification preserved: Medium / High. AR-001 and AR-002 verified as applied.
