# Implementation Handoff — composer-context-file-removal

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review selected (Medium/High) and passed (ARCH-REV-001). Implementation handoff routed by `get_handoff_rules`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/requirements-doc.md` (Approved, SR-003)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/design-spec.md`
- Supplemental task artifacts: none behavior-defining; 19.png / 20.png evidence only (project task context folder).
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial).

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A` (AR-001, AR-002 non-blocking guidance applied)

Summary:
- **Server (D1/D2):** One draft-locator codec in `context-file-owner-types.ts`: `DRAFT_LOCATOR_SHAPES` (a mapped type keyed by every `ContextFileDraftOwnerDescriptor` kind, so a new kind fails to compile until it has a shape) drives both `buildDraftContextFileLocator` (byte-identical URLs) and the new `parseDraftContextFileLocator` (returns `null` for a non-draft path, throws `ContextFileDescriptorError`/`CollaborationContractError` for a draft-shaped path with an invalid owner/file). `context-files.ts` registers exactly one `GET /drafts/*` and one `DELETE /drafts/*`. They parse the raw `request.url` path with the query stripped, because the wildcard param is URL-decoded. A single `sendDraftRouteError` maps errors: descriptor/contract error → 400 `{detail}`; owner-not-found or not-a-draft-locator → 404; anything else → rethrow (500). DELETE returns 204 whether or not the file existed. `ContextFileLocalPathResolver` resolves draft locators through the codec, and a codec throw maps to `null`.
- **Web (D3):** `contextFileUploadStore.deleteDraftAttachment(attachment)` issues `DELETE` to `resolveContextAttachmentUrl(attachment.locator)` via `authorizedFetch`. On non-2xx it throws `Error(detail)`, and it keeps the `activeRequestCount` increment/decrement (AR-002(3)). `buildDraftContextFileEndpoint` and the store `error` state are removed. `resolveContextAttachmentUrl` moved from the composer to `utils/contextFiles/contextAttachmentUrl.ts` and is shared by the store and the composer's clone path.
- **Web (D4):** `removeItem`/`clearCurrentTargetAttachments` call the server only when `isOwnDraftAttachment` holds (draft locator parsed by the client parser, owner equal to the target's `draftOwner` via the exhaustive `sameDraftOwner` with a `never` default). Foreign or owner-less drafts and path attachments are removed locally.
- **Web (D5):** The composer exposes `attachmentError` (structured: `upload_failed`/`remove_failed` with file names + optional server detail, or `uploads_unavailable`) and `canUpload`. The error is stored with its target key and shown only on that target. It clears on the next successful attach/remove on that target or on a target change. The gate sits in `uploadFiles` (AR-002(1)), so the Electron native-drop branch still produces path attachments. Clone failures in `appendLocatorAttachments` are reported as `upload_failed` (AR-002(2)). The component disables `+`/file input with a reason tooltip and renders the localized error line (`role="alert"`). New en/zh-CN keys were added.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation: changes stayed within the mapped files: server context-files domain/REST/resolver, web store/composable/component/utils/localization. The shared REST route family and runtime locator resolution were rewired as designed. No locator, storage, finalization, final-route or remote-access policy change.
- Selected route: `Code Review` (per `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High risk → independent code review)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | × / Clear All in a delegated child removes the item and deletes the server draft | `ContextFilePathInputArea.vue` → `useContextAttachmentComposer.removeItem/clearCurrentTargetAttachments` → `isOwnDraftAttachment` → `contextFileUploadStore.deleteDraftAttachment` → `DELETE <locator>` → `context-files.ts` `DELETE /drafts/*` → `parseDraftContextFileLocator` → `ContextFileReadService.deleteDraftFile` | Done. Live dev server: collab DELETE 204 (was 404), file unlinked; rendered × and Clear All emptied the tray and the draft folder |
| BEH-002 | Other run kinds unchanged | Same path; URLs unchanged | Preserved; standalone rendered check, Org spec and Team specs pass |
| BEH-003 | Path attachments removed locally | `removeItem` (no server call for non-draft) | Preserved; tested |
| BEH-004 | No upload owner: `+` disabled with reason; paste/drop shows message; path attachments still allowed | `canUpload`, `uploadFiles` gate, component `:disabled`/`:title` | Done; native Electron drop still yields path attachments |
| BEH-005 | Foreign/owner-less draft removed locally; delete failure keeps item and shows error naming file | `isOwnDraftAttachment`, `reportFailure('remove_failed')` | Done |
| BEH-006 | Failed upload visible, naming the file | `uploadFiles` failure collection → `reportFailure('upload_failed')`; clone failures included | Done |
| (contract) QR-001 | Every draft owner kind readable ⇔ deletable; runtime locator resolution preserved | `DRAFT_LOCATOR_SHAPES` mapped type; wildcard route pair; resolver via codec | Done; codec round-trip over all kinds, REST test iterating all kinds, resolver tests |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts`):
- `src/context-files/domain/context-file-owner-types.ts`: shape table, `buildDraftContextFileLocator` (now derived), `parseDraftContextFileLocator`.
- `src/api/rest/context-files.ts`: `GET`/`DELETE /drafts/*`, `sendDraftRouteError`. Per-kind draft routes, `orgDraftRoute` and `sendAgentCollaborationFile` were removed; the final collab route was inlined with unchanged semantics.
- `src/context-files/services/context-file-local-path-resolver.ts`: draft branch → codec; draft regexes removed.
- Tests: `tests/unit/context-files/context-file-owner-types.test.ts` (codec), `tests/unit/context-files/context-file-local-path-resolver.test.ts`, new `tests/integration/api/rest/draft-context-files-universal.integration.test.ts`.

Web (`autobyteus-web`):
- `utils/contextFiles/contextAttachmentUrl.ts` (new), `utils/contextFiles/contextFileOwner.ts` (builder removed).
- `stores/contextFileUploadStore.ts`.
- `composables/useContextAttachmentComposer.ts`.
- `components/agentInput/ContextFilePathInputArea.vue`.
- `localization/messages/{en,zh-CN}/agentInput.generated.ts` (3 keys each: `remove_failed`, `upload_failed`, `uploads_unavailable`).
- Tests: `components/agentInput/__tests__/ContextFilePathInputArea.spec.ts` (updated + 12 delegated-child cases), new `composables/__tests__/useContextAttachmentComposer.spec.ts` (AR-001 over all kinds), `stores/__tests__/contextFileUploadStore.spec.ts`, `services/agentOrgExecution/__tests__/agentOrgContextFiles.spec.ts` (now asserts the DELETE at the locator via `authorizedFetch`).

## Important Assumptions

- The client's `parseDraftUploadedContextAttachmentLocator` remains the client's single draft-locator parser (design decision). The AR-001 test pins its agreement with server-shaped locators for every kind, including an encoded nested team `memberAddress`.
- When a target has no upload owner, an uploaded draft removed from that composer stays on disk until the 24h TTL (design tradeoff for REQ-003).

## Known Risks

- Status codes changed by design: agent/team draft GET with a bad owner 500→400; DELETE owner-not-found 400→404. An unexpected server fault on DELETE (e.g. EACCES) now yields 500 instead of 400; the client shows it as a remove failure either way. No existing test asserted the old codes.
- Under Fastify `inject`, `%2E%2E` segments are normalized before routing (observed in tests), so such a path reaches the route as a non-draft path → 404. Real HTTP does not normalize.
- Pre-existing, not changed: `agent_draft.draftRunId` is validated with `required()` (trim only), not `safeIdentity`. A `..` draft run id therefore resolves inside the draft root (`resolveSafeChildPath` contains it). This is a separate hardening candidate, not in scope.
- Desktop verification of the real 19.png flow (a delegated Software Engineering Team member under the Project Task Manager) is still required from the user.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix`
- Reviewed root-cause classification: `Duplicated Policy Or Coordination`
- Reviewed refactor decision: `Refactor Needed Now` (bounded)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the server now has a single place knowing draft locator path shapes; no web code builds a draft URL from an owner.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. Removed per-kind draft routes, draft regexes, `buildDraftContextFileEndpoint`, store `error` state and its writes, the `console.warn` owner-less branch, the composer-local URL resolver (moved) and the single-use `sendAgentCollaborationFile` helper (inlined). Also removed the unused `delete` mock in the store spec.
- Dead code found elsewhere, listed as follow-up: final-file per-kind routes/regexes (design-declared follow-up candidate, not dead).
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source implementation files within size guardrails: `Yes`. Largest: `ContextFilePathInputArea.vue` 459 effective lines incl. template/styles; composable 416; no changed source file has a >220-line delta.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: design-spec.md "Persisted Data / State Transition Decision".
- Implementation follows the approved decision: `Yes`. Locator strings are byte-identical (codec test pins them) and the storage layout is untouched.
- Direct-use evidence: the existing Org/Team/standalone integration tests read/delete drafts uploaded under the unchanged locators.
- Migration implementation: N/A.
- Deviation: `None`

## Environment Or Dependency Notes

- Fresh worktree needed `pnpm install`, `pnpm -C autobyteus-server-ts prebuild` (Prisma client and shared builds), `pnpm -C autobyteus-web exec nuxi prepare` (`.nuxt/tsconfig.json`), and `test:integration:prepare`. The untracked `*/dist/` folders are build outputs from these steps and are not staged.

## Local Implementation Checks Run

- `pnpm -C autobyteus-server-ts typecheck`: pass.
- `pnpm -C autobyteus-server-ts test:unit`: 669 files passed, 4 skipped.
- `pnpm -C autobyteus-server-ts test:integration`: 71 files passed, 18 skipped, 1 failed.
  - The failure, `tests/integration/agent/agent-status-websocket.integration.test.ts` (2 cases: "coalesces a representative fine-grained canonical stream…" and "uses a changed interval only…"), also fails identically on the base with this change's server src/tests stashed.
  - Investigation (TESTING.md Rule 9): the flush interval resolves to 500 ms in the test environment, but the coalesced `SEGMENT_CONTENT` frame reaches the socket about 10 ms after the batch instead of at the 500 ms window. No visible non-content frame triggers a flush. The cause lies in the agent streaming egress/run-event path, a product area outside this ticket, so I did not fix it here; it is reported as a separate baseline item.
- Targeted server: `tests/unit/context-files/*` (67 tests), `draft-context-files-universal.integration.test.ts` (7), `context-files.integration.test.ts`, `agent-org-context-files.integration.test.ts`, `user-attachment-history.integration.test.ts`: all pass.
- `pnpm -C autobyteus-web test:nuxt --run` (full): before the final composer edit, one file failed: `agentOrgContextFiles.spec.ts`, whose authorizedTransport mock lacked `authorizedFetch`. That spec was updated, and the affected specs were re-run after the last change: `ContextFilePathInputArea.spec.ts` (17), `useContextAttachmentComposer.spec.ts` (9), `contextFileUploadStore.spec.ts` (4), `agentOrgContextFiles.spec.ts` (9): all pass.
- `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`: pass.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Context Files tray of the shared composer (`ContextFilePathInputArea`) in a delegated Team-copy member, a delegated Agent copy, a target without an upload owner, and standalone.
- Approved UI/UX references: requirements "UI, Interaction, And Experience Requirements": an inline error line and a disabled `+` with a tooltip reason; no other redesign.
- Design system / adjacent surfaces reviewed: existing tray styles (red ×, blue `+`, `disabled:opacity-50`) reused; error line uses `text-xs text-red-600`, consistent with adjacent inline errors.
- Surface used: `pnpm dev` (real built backend at 127.0.0.1:8000, Nuxt dev at 127.0.0.1:3000, worktree-owned `.autobyteus/development` data). An Agent-root package (host + two delegated children) was seeded. A temporary, uncommitted page mounted the real composer with delegated-child/no-owner/standalone targets, and real paste events were dispatched. The page and data were removed afterwards.
- States inspected: delegated Team member pasted image + text → both in the tray and on disk under `draft_context_files/agent-collaborations/host/agent-runs/child`. × on the image → removed from the tray and disk. Path + upload + Clear All → tray empty, folder empty. No upload owner → `+` dimmed/disabled, tooltip and red message "This agent can't receive uploaded files right now." Simulated DELETE 500 → item kept with "Couldn't remove review-notes.md. Simulated server failure."; the retry succeeded and cleared the error. zh-CN locale strings were checked in the DOM. Standalone upload + × → removed and deleted (regression). Viewport was 400 CSS px wide (narrow panel); the error line wraps cleanly.
- Issues found and corrected: none in the product UI. The probe page's own width needed adjusting.
- Limitations: the browser tool returned stale frames after some state changes (throttled tab), so the zh-CN state was verified via DOM text rather than a fresh screenshot. Font Awesome icons are not loaded on the standalone probe page (pre-existing app-shell asset). The real desktop journey (Workspaces tree → delegated child under the Project Task Manager) was not driven; the user verifies the 19.png case on desktop.

## Downstream Coverage Hints / Suggested Scenarios

- Real product journey: Project Task Manager (standalone) delegates to a Team copy. In a member's composer, paste an image and use `+`, then × and Clear All. Confirm the files disappear from `~/.autobyteus/server-data/draft_context_files/agent-collaborations/<host>/agent-runs/<child>/`.
- Same with a delegated Agent copy, and after the child goes offline / app restart (AC-003).
- Org task agent while its message is pending (no upload owner): `+` disabled, paste file → message; workspace path drop still attaches.
- Paste a draft URL from another composer: it is cloned under this owner; removing it never deletes the source composer's file (REQ-003).
- Remote node (`authorizedFetch` with bearer) deleting a draft: the delete now uses `authorizedFetch` + node base URL rather than axios `apiService`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E validation of the universal draft routes against a running server for every owner kind, including status-code mapping.
- Executable UI coverage of the delegated-child composer journeys in the real app, and the user's desktop verification of the 19.png case.
