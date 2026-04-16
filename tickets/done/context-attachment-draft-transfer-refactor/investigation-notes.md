# Investigation Notes

Use one canonical file:
- `tickets/in-progress/context-attachment-draft-transfer-refactor/investigation-notes.md`

Purpose:
- capture durable investigation evidence in enough detail that later stages can reuse the work without repeating the same major searches unless facts have changed
- keep the artifact readable with short synthesis sections, but preserve concrete evidence, source paths, URLs, commands, and observations

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Small`
- Triage Rationale: The issue is limited to draft-context attachment ownership transfer and the supporting finalize/path-resolution flow across a small set of web and server files. No product-scope or API-contract redesign is required.
- Investigation Goal: Preserve the live draft-image fix while correcting the Stage 8 ownership/placement problem and removing the source-file size violation in the Vue composer component.
- Primary Questions To Resolve:
  - Where does cross-owner draft transfer currently happen?
  - Which shared boundary should own draft-transfer policy?
  - Which send-time fallbacks must remain in place to preserve correctness?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-16 | Code | `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | Inspect current paste flow and Stage 8 finding location | Cross-owner draft clone logic currently lives in the Vue component and includes owner comparison, locator fetch resolution, blob-to-file conversion, and re-upload orchestration | Yes |
| 2026-04-16 | Code | `autobyteus-web/composables/useContextAttachmentComposer.ts` | Inspect the shared attachment mutation boundary | Shared composer already owns attachment list mutation, dedupe, upload, removal, and preview coordination; it is the most natural home for transfer orchestration | Yes |
| 2026-04-16 | Code | `autobyteus-web/stores/contextFileUploadStore.ts` | Verify send/finalize fallback behavior | `finalizeDraftAttachments()` already recovers flattened draft locators by coercing them back into draft uploaded attachments before finalize | No |
| 2026-04-16 | Code | `autobyteus-web/utils/contextFiles/contextAttachmentModel.ts` | Verify locator parsing and hydration behavior | The attachment model now parses draft/final uploaded locators, exposes draft-owner metadata, and can coerce flattened draft locators back into uploaded-attachment shapes | No |
| 2026-04-16 | Code | `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts` | Verify backend protection for localhost draft locators | Backend resolver now resolves both final and draft `/rest/.../context-files/...` locators to existing local files before upstream model mapping | No |
| 2026-04-16 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts` and `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` | Confirm where backend resolution is consumed | Both model-input mapping paths consult `ContextFileLocalPathResolver`, so preserving draft-path support there keeps localhost URLs from leaking upstream | No |
| 2026-04-16 | Command | `pnpm -C autobyteus-web exec vitest --run components/agentInput/__tests__/ContextFilePathInputArea.spec.ts stores/__tests__/contextFileUploadStore.spec.ts && pnpm -C autobyteus-server-ts exec vitest --run tests/unit/context-files/context-file-local-path-resolver.test.ts` | Validate current tracked patch before refactor | Focused frontend and backend tests passed on the tracked patch | Re-run after refactor |
| 2026-04-16 | Command | `node` line-count probe for changed source files | Confirm Stage 8 size-gate risk | `ContextFilePathInputArea.vue` is `506` non-empty lines after the patch, which fails the workflow hard limit for changed source files | Yes |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue:onPaste`
  - `autobyteus-web/stores/agentRunStore.ts:sendUserInputAndSubscribe`
  - `autobyteus-web/stores/agentTeamRunStore.ts:sendMessageToFocusedMember`
- Execution boundaries:
  - shared attachment model parsing: `autobyteus-web/utils/contextFiles/contextAttachmentModel.ts`
  - shared attachment composition: `autobyteus-web/composables/useContextAttachmentComposer.ts`
  - draft upload/finalize boundary: `autobyteus-web/stores/contextFileUploadStore.ts`
  - backend local-path resolution: `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts`
- Owning subsystems / capability areas:
  - web attachment composition and ownership state
  - web send/finalize path
  - server local-path normalization for model input
- Optional modules involved: none
- Folder / file placement observations:
  - The Vue component currently owns attachment-transfer policy that belongs in shared attachment infrastructure.
  - The attachment model and upload store already hold the reusable ownership primitives needed by the refactor.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | `appendPastedTextAttachments`, `cloneDraftAttachmentForTarget` | Paste handling for the active composer surface | Contains policy and mechanics for cross-owner draft transfer, causing the Stage 8 ownership issue and file-size overflow | Transfer behavior should move out of the component |
| `autobyteus-web/composables/useContextAttachmentComposer.ts` | attachment append/upload/remove helpers | Shared attachment list mutation for the active target | Already owns target-aware attachment operations and dedupe rules | Best candidate to own shared transfer orchestration |
| `autobyteus-web/stores/contextFileUploadStore.ts` | `finalizeDraftAttachments` | Upload and finalize boundary | Correctly provides send-time fallback for flattened draft locators | Must be preserved |
| `autobyteus-web/utils/contextFiles/contextAttachmentModel.ts` | locator parsing and draft-owner extraction | Shared locator normalization/hydration | Already exposes the metadata needed to decide whether a pasted draft locator must be cloned | Keep as shared parsing authority |
| `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts` | draft/final locator local path resolution | Server-side local-path recovery | Prevents remote model services from trying to fetch localhost draft URLs directly | Keep as backend correctness backstop |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-16 | Test | `pnpm -C autobyteus-web exec vitest --run components/agentInput/__tests__/ContextFilePathInputArea.spec.ts stores/__tests__/contextFileUploadStore.spec.ts` | Frontend attachment tests passed on the current patch | Refactor should preserve these behaviors and may move assertions to a shared-boundary test |
| 2026-04-16 | Test | `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/context-files/context-file-local-path-resolver.test.ts` | Backend draft-path resolver test passed | Backend support is already correct for this ticket |
| 2026-04-16 | Probe | Changed source-file non-empty line count for `ContextFilePathInputArea.vue` | Measured `506` non-empty lines | Refactor must reduce the component below the Stage 8 limit |

## Constraints

- Technical constraints:
  - Source edits are not allowed until the workflow reaches Stage 6 with `Code Edit Permission = Unlocked`.
  - The existing backend draft-local-path resolution must remain intact.
- Environment constraints:
  - Validation is currently focused on repo-resident Vitest coverage rather than full Electron lifecycle automation.
- Third-party / API constraints:
  - Upstream model services cannot fetch `127.0.0.1` URLs from the user's local Electron runtime.

## Unknowns / Open Questions

- Unknown: Whether any non-composer attachment entrypoint will also need the shared transfer helper immediately.
- Why it matters: If another path bypasses the shared composer, the same ownership bug could recur outside the current UI surface.
- Planned follow-up: Search for other attachment insertion entrypoints after the refactor boundary is chosen.

## Implications

### Requirements Implications

- The refactor must make shared ownership transfer an explicit requirement, not just a review preference.

### Design Implications

- The design should keep draft-owner parsing in the attachment model, keep finalize fallback in the upload store, and move transfer orchestration into the shared composer boundary instead of the Vue component.

### Implementation / Placement Implications

- A shared helper or shared composer operation should perform: draft locator inspection, foreign-owner detection, fetch + re-upload cloning, and target-aware append.
- `ContextFilePathInputArea.vue` should delegate to that shared behavior and stop owning transfer-specific mechanics.

## Re-Entry Additions

Append new dated evidence here when later stages reopen investigation.

### 2026-04-16 Re-Entry Update

- Trigger: Stage 8 review failure on ownership placement and file-size gate
- New evidence:
  - `ContextFilePathInputArea.vue` exceeded the `500` effective non-empty line limit after the bug fix.
  - The shared composer already owns adjacent attachment responsibilities and can absorb transfer behavior cleanly.
- Updated implications:
  - This ticket remains a `Local Fix`, but the fix must be implemented as a shared-boundary extraction rather than another local patch in the component.
