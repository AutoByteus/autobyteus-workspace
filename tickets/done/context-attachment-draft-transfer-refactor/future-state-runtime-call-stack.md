# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/context-attachment-draft-transfer-refactor/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/in-progress/context-attachment-draft-transfer-refactor/implementation.md` (solution sketch as lightweight design basis)
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `Solution Sketch`
  - Ownership sections: `File Placement Plan`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- Every use case declares the spine it exercises from the design basis.
- No legacy or compatibility-only branches are modeled.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-001` | `Primary End-to-End` | `useContextAttachmentComposer.ts` | `Requirement` | `R-001`, `R-003`, `R-004` | `N/A` | Cross-owner draft paste into active target owner | `Yes/Yes/Yes` |
| `UC-002` | `DS-001`, `DS-002`, `DS-003` | `Primary End-to-End` | `contextFileUploadStore.ts` | `Requirement` | `R-002` | `N/A` | Send after source draft removal | `Yes/N/A/Yes` |
| `UC-003` | `DS-002` | `Bounded Local` | `contextFileUploadStore.ts` | `Requirement` | `R-002` | `N/A` | Finalize flattened draft locator attachments | `Yes/N/A/Yes` |

## Transition Notes

- No migration wrapper is planned.
- The source fix already exists functionally; this ticket only relocates ownership and reduces source-file pressure while preserving the same behavior.

## Use Case: UC-001 [Cross-owner draft paste into active target owner]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-web/composables/useContextAttachmentComposer.ts`
- Why This Use Case Matters To This Spine: It is the ownership-transfer path that failed Stage 8 when it lived in the Vue component.

### Goal

Clone a pasted foreign-owner draft attachment into the active target owner before the attachment is stored in the target context.

### Preconditions

- The active target context has a non-null draft owner.
- The pasted locator resolves to a draft uploaded attachment owned by a different draft owner.

### Expected Outcome

- The active target context stores a cloned uploaded draft attachment owned by the active target owner.
- The target context does not retain the foreign-owner locator.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/agentInput/ContextFilePathInputArea.vue:onPaste(event)
└── autobyteus-web/composables/useContextAttachmentComposer.ts:appendLocatorAttachments(locators, target)
    ├── autobyteus-web/utils/contextFiles/contextAttachmentModel.ts:hydrateContextAttachment({ locator })
    ├── autobyteus-web/utils/contextFiles/contextAttachmentModel.ts:parseDraftUploadedContextAttachmentLocator(locator)
    ├── autobyteus-web/composables/useContextAttachmentComposer.ts:cloneDraftAttachmentToTarget(attachment, target.draftOwner) [ASYNC]
    │   ├── autobyteus-web/composables/useContextAttachmentComposer.ts:resolveAttachmentFetchUrl(locator)
    │   ├── fetch(url) [IO]
    │   └── autobyteus-web/stores/contextFileUploadStore.ts:uploadAttachment({ owner, file }) [IO]
    └── autobyteus-web/composables/useContextAttachmentComposer.ts:appendAttachments(attachments, target) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if locator is already owned by the active target or is not a draft upload
autobyteus-web/composables/useContextAttachmentComposer.ts:appendLocatorAttachments(...)
├── autobyteus-web/utils/contextFiles/contextAttachmentModel.ts:hydrateContextAttachment({ locator })
└── autobyteus-web/composables/useContextAttachmentComposer.ts:appendAttachments(...)
```

```text
[ERROR] if foreign-owner draft clone fetch or upload fails
autobyteus-web/composables/useContextAttachmentComposer.ts:cloneDraftAttachmentToTarget(...)
└── autobyteus-web/composables/useContextAttachmentComposer.ts:appendLocatorAttachments(...) # log and skip invalid foreign-owner attachment instead of storing a stale locator
```

### State And Data Transformations

- raw pasted locator -> hydrated context attachment
- foreign draft attachment -> fetched blob -> uploaded `File`
- uploaded draft response -> target-owned uploaded attachment in target context

### Observability And Debug Points

- Console error on clone failure
- Test assertions on resulting target attachment locator path

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Send after source draft removal]

### Spine Context

- Spine ID(s): `DS-001`, `DS-002`, `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-web/stores/contextFileUploadStore.ts`
- Why This Use Case Matters To This Spine: It proves the destination owner no longer depends on the original source draft path after cloning.

### Goal

Send successfully from the destination context after the original owner removes the source draft file.

### Preconditions

- The destination context already holds a cloned draft attachment owned by the active target owner.
- The source owner draft file may no longer exist.

### Expected Outcome

- Finalize and send use the destination-owned draft attachment, not the deleted source path.
- Backend model mapping resolves local files from the owned locator when needed.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/activeContextStore.ts:send()
└── autobyteus-web/stores/agentTeamRunStore.ts:sendMessageToFocusedMember(text, contextAttachments)
    ├── autobyteus-web/stores/contextFileUploadStore.ts:finalizeDraftAttachments({ draftOwner, finalOwner, attachments }) [ASYNC]
    │   ├── autobyteus-web/utils/contextFiles/contextAttachmentModel.ts:coerceDraftUploadedContextAttachment(attachment)
    │   ├── apiService.post('/context-files/finalize', ...) [IO]
    │   └── autobyteus-web/utils/contextFiles/contextAttachmentModel.ts:createUploadedContextAttachment(...)
    ├── autobyteus-web/utils/contextFiles/contextAttachmentSend.ts:partitionContextAttachmentsForStreaming(finalizedAttachments)
    └── team service sendMessage(...)
        └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts:toCodexImageInput(uri)
            └── autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts:resolve(locator)
```

### Branching / Fallback Paths

```text
[ERROR] if finalize response does not return one of the expected attachments
autobyteus-web/stores/contextFileUploadStore.ts:finalizeDraftAttachments(...)
└── throw Error("Finalized attachment ... was not returned by the server.")
```

### State And Data Transformations

- target-owned draft locator -> final uploaded locator
- final uploaded locator -> local file path for model image input when backend resolution applies

### Observability And Debug Points

- Focused finalize tests
- Backend resolver tests

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 [Finalize flattened draft locator attachments]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Bounded Local`
- Governing Owner: `autobyteus-web/stores/contextFileUploadStore.ts`
- Why This Use Case Matters To This Spine: It preserves the send-time fallback that repairs flattened draft locators even when the attachment metadata shape was degraded earlier.

### Goal

Recover flattened draft locator attachments into the normal finalize flow.

### Preconditions

- An attachment has a draft locator but is not currently typed as an uploaded draft attachment.

### Expected Outcome

- The attachment is coerced into a draft uploaded attachment and finalized into a final uploaded attachment.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/contextFileUploadStore.ts:finalizeDraftAttachments(input)
├── autobyteus-web/utils/contextFiles/contextAttachmentModel.ts:coerceDraftUploadedContextAttachment(attachment)
├── apiService.post('/context-files/finalize', ...) [IO]
└── autobyteus-web/utils/contextFiles/contextAttachmentModel.ts:createUploadedContextAttachment(...)
```

### Branching / Fallback Paths

```text
[ERROR] if coercion fails because the locator is not a draft uploaded locator
autobyteus-web/stores/contextFileUploadStore.ts:finalizeDraftAttachments(input)
└── return original attachment unchanged
```

### State And Data Transformations

- workspace/external attachment carrying a draft locator -> coerced uploaded draft attachment
- coerced uploaded draft attachment -> final uploaded attachment

### Observability And Debug Points

- Store-focused finalize test

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
