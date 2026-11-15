# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/context-file-large-video-upload/requirements-doc.md` (Approved at SR-002; SR-003 wording only, approval carries over)
- Upstream Investigation Notes: `…/investigation-notes.md` (SR-003 addendum P4/P5)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001..SR-003)
- Reviewed Design Spec: `…/design-spec.md` (SR-003, status Ready)
- Supplemental Task Artifacts Reviewed: `probes/large-upload-probe.integration.test.ts.txt` (P1–P5), `probes/probe-results-2026-11-15.txt`, `follow-ups.md`, `handoff-sr-003.md`, `GLOSSARY.md` (worktree root)
- Relevant Solution Revision IDs: `SR-002`, `SR-003`
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: SR-003 revision for ARCH-REV-001 (AR-001..AR-007)
- Prior Review Round Reviewed: 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus-org/autobyteus-task-worktrees/context-file-large-video-upload`, HEAD `bc230b7b7`. The SR-003 delta covers `GLOSSARY.md` plus ticket documents and probes; no source changes. The round-1 code evidence still holds. New checks this round:
  - `project-task-service.ts:123,183`: `importLocalFiles` callers.
  - `media-payload-formatter.ts:125-162`: `mediaSourceToBase64` reads a file only when `isValidMediaPath` is true.
  - P4/P5 probe code and results.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged from round 1. SR-003 adds `project-task-service.ts` and `GLOSSARY.md` and no new risk surface.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. SR-003 rewords REQ-001, REQ-002 and DEC-003 with the new limit names. It also states the per-limit grouping in REQ-006 and AC-005; REQ-006 already required "for size, the limit", so this is not a new behavior. Approval carries over.
- Relevant existing behavior and evidence confirmed: Yes. Round-1 citations are still valid, since source is unchanged at HEAD.
- Scope guardrail confirmed: Yes, unchanged.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: N/A, no blocking findings this round.
- Remaining material ambiguity: None.
- Statements about existing code, opened at their cited lines: the round-1 list stands. New this round:
  - `ProjectTaskService` calls `importLocalFiles` at `:123` (create) and `:183` (update). Confirmed.
  - `isValidMediaPath` is the exact condition under which `mediaSourceToBase64` reads a local file whole (`:155-156`). The size check therefore covers exactly the sources the renderers would read from disk. Confirmed.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass (DS-001, DS-002) | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass (grouping by reason and limit) | Confirmed | — |
| BEH-003 | System | Pass | Pass (P1, P3, P5) | Pass (writer drains, then removes) | Confirmed | — |
| BEH-004 | System | Pass | Pass (P2) | Pass | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | System | Pass | Pass | Pass (DS-005, ordered size check) | Confirmed | — |
| BEH-008 | User/Contract | Pass | Pass | Pass (DS-004, limits resolved once per operation) | Confirmed | — |
| BEH-009 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-010 | User | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose/Scope | Linked | Complete | Consistent | Status/Approval | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Probes P1–P5 and results | Pass | Pass (design Bounded Local Spines, investigation addendum) | Pass | Pass | Pass (evidence only) | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |
| `GLOSSARY.md` "Context Files" | Pass | Pass (design Terminology) | Pass | Pass | Pass (committed on the branch; ships with the change) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | unchanged | — |
| Root cause explicit and evidence-backed | Pass | unchanged | — |
| Refactor decision explicit | Pass | unchanged | — |
| Decision reflected in sections | Pass | unchanged, plus the writer drain rule | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade vs Owner | Naming | One Owner, Call Order | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Return | Pass | Pass: lines keyed by `(too_large, maxBytes)` or by reason; a composable computed groups; the component only renders | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Primary | Pass | Pass | N/A | Pass | Pass: limits resolved once at the route or in `ProjectTaskService`, then passed down | Pass | Pass |
| DS-005 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| Writer (bounded local) | Local | Pass | Pass: over limit → stop writing, keep consuming the rest of the file, remove the created file, throw the typed error | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `writeContextFileUpload` | Pass | Pass | Pass | Pass | — |
| `contextFileUploadStore` | Pass | Pass | Pass | Pass | — |
| `resolveContextFileSizeLimits` | Pass | Pass | Pass | Pass | Callers: the two upload routes and `ProjectTaskService`. Stores and the writer never call it. |
| `sanitizeMediaInputMessages` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server config → domain (type only) | Pass | Pass | Pass | Pass | — |
| routes / `ProjectTaskService` → resolver; stores → writer + policy | Pass | Pass | Pass | Pass | AR-003 resolved |
| web component → composable → store → api | Pass | Pass | Pass | Pass | — |
| autobyteus-ts self-contained | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `GET /rest/context-files/size-limits` → `{otherFileMaxBytes, audioVideoMaxBytes, audioVideoMimeTypes}` | Pass | Pass | Pass | Low | Pass |
| Upload refusals (both route groups, each in its own envelope) | Pass | Pass | Pass | Low | Pass |
| `contextFileUploadFailureFor({status, code, maxBytes})`, with each transport unwrapping its own envelope | Pass | Pass | Pass | Low | Pass (AR-004 resolved) |
| `importLocalFiles(projectId, taskId, sourcePaths, limits)` | Pass | Pass | Pass | Low | Pass |
| Settings `AUTOBYTEUS_CONTEXT_FILE_OTHER_MAX_MB`, `AUTOBYTEUS_CONTEXT_FILE_AUDIO_VIDEO_MAX_MB` | Pass | Pass | Pass | Low | Pass (AR-001 resolved) |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Typed setting, byte enforcement, axios progress/abort, locale format, provider media filter | Pass | Pass | N/A | Pass | `isValidMediaPath` is reused for the local-path rule |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation | Decision | Supports Spine | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server, web, autobyteus-ts areas | Pass | Pass | Pass | Pass | Unchanged, plus `projects/services/project-task-service.ts` |

## Reusable Owned Structures Verdict

| Structure | Evaluated | File Choice | Ownership | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ContextFileSizeLimits`, web published limits, `ContextFileUploadFailure` | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning/Field | No Redundancy | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ContextFileSizeLimits {audioVideoMaxBytes, otherFileMaxBytes}` | Pass | Pass | Pass | N/A | Pass | — |
| `ContextFileUploadFailure` | Pass | Pass | Pass | Pass | Pass | — |

Derived consumers of a changed structure listed with a decision for each: `Pass`.

Each domain word keeps one meaning (Principle 15): `Pass`.
- "Media" is no longer used for context-file limits. `GLOSSARY.md` defines context file, audio/video limit, other-file limit and context-file size limits, and states that media means image, audio and video.
- Two stale wording remnants in ticket documents only: design-spec `:24` "published media type list" and investigation-notes `:123` "new media limit". They are not names in code or on the wire. Recorded under Residual Risks for the implementer to read as the audio/video type list and the audio/video limit.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All mapped files, incl. `project-task-service.ts` and `GLOSSARY.md` | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Clear | Matches Owner | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All new files in existing folders | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Constant, global plugin limit, plain-error strings, duplicate type check, `detail` concatenation, Project Task `e.message` for upload refusals | Pass | Pass | Pass | Pass | Unchanged from round 1 |

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retained | Clean Cut | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Upload error contract; constant alias | No | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Drafts, finals, manifests | Not Affected | Pass | Pass | N/A | Pass | — |
| Two new server settings | New keys with defaults | Pass | Pass | N/A | Pass | The final names are fixed before anything is persisted. |

## Change / Refactor Safety Verdict

| Area | Sequence | Seams | Cleanup | Verdict |
| --- | --- | --- | --- | --- |
| Server → autobyteus-ts → web → docs → phone probe | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Message copy, mixed reasons, two size limits in one pick | Yes | Pass | Pass | Pass | AR-002 example added |
| Limit display, route cap, pre-check | Yes | Pass | Pass | Pass | — |
| Writer drain (P4 vs P5) | Yes | Pass | Pass | Pass | Probe-backed |

## Material Premise Validation

### P-001 — A long Project Task upload holds the draft lock and stalls other draft operations

Unchanged from round 1. Reachability is `Unclear`: a concurrent two-composer workflow is not established. Recorded as a residual risk with no machinery; the design records it in its Risks section.

### P-002 — A cancel lands after the server has written the draft

Unchanged from round 1. `Reachable` in a narrow window. The 24 h cleanup covers it, so no machinery is needed.

### P-003 — Refusals before the file is read leave the request undrained

- Related requirement: REQ-004 / AC-009 (unsupported-type refusal is localized). Preserved behavior: the refusal arrives as today.
- Behavior: BEH-002
- Initiating basis kind: User
- Trigger: the user drops a file whose type is not accepted into the composer. Drop is a supported entry form, and the pre-check checks only size.
- Forward path: `POST /rest/context-files/upload` → the service/writer type check throws before the file stream is read. Today the service check at `:29-31` does this; after this change the writer does. The same happens for a bad owner field after `request.file()`.
- Lifecycle state and consequence: the same shape as P4. The client receives the refusal, but the request is not drained, so that keep-alive connection stays busy and a server close waits on it. This is not new: it happens today at `context-file-upload-service.ts:29-31`, and the client-facing outcome is correct.
- Reachability: `Reachable`. The consequence is operational, not user-visible.
- Review consequence: non-blocking guidance AR-008. It is cheap to make the drain rule cover every refusal after `request.file()`. Not required for this ticket's acceptance criteria.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

Prior findings AR-001..AR-007 are resolved; see `ARCH-REV-002` in the revision record.

### AR-008 — Apply the drain rule to every refusal after `request.file()` (non-blocking, implementation guidance)

- Evidence: P-003. P4 showed that an undrained request leaves the connection busy. SR-003 drains only over-limit files. The unsupported-type refusal in the writer, and owner-field errors in the route after `request.file()`, still return without reading the part. This is pre-existing behavior, and the client still gets its refusal.
- Recommendation: since the writer and both upload routes are touched files, consume and discard the rest of the part (for example `file.file.resume()` or the same discarding path) before throwing any refusal after `request.file()`. Cover the 415 case in the integration test with the same prompt-close check.
- Scope status: Within Approved Scope as guidance. It does not change approved behavior and does not block.
- Recipient: Implementation Engineer.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`). Informational notice to the Solution Designer.

## Residual Risks

- P-001: Project Task draft lock held during long uploads (delay only).
- P-002: cancel race, covered by the 24 h cleanup.
- P-003 / AR-008: undrained requests on refusals made before the file is read (pre-existing; guidance given).
- A non-audio/video file over its limit sent by a client that skips the pre-check is drained in full before the 413 arrives, up to the audio/video cap. The design accepts this; the web pre-check prevents it in the UI.
- R-001 / FU-001 Memory Sync with large files, release order RC-001 (`autobyteus-workspace-7`).
- FU-002: the paste re-download path bypasses the pre-check, and the server still refuses.
- ASM-001: phone `File.type` to be confirmed on the phone bundle.
- Stale wording in ticket documents only: design-spec `:24` "published media type list" means the audio/video type list (`audioVideoMimeTypes`); investigation-notes `:123` "new media limit" means the audio/video limit.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: the design is ready for implementation at SR-003.
