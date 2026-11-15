# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `context-file-large-video-upload`
- Request / ticket: Project Task `autobyteus-workspace-6` (Project `project_3165230d-b602-4efc-ac42-fb61a03f1ed5`)
- Requested by: `/project_task_manager` (run id `project_task_manager_89e33a2ea30f422fab0407e4dc2b13bb`), on the user's report of 2026-11-16
- Requirements owner: Solution Designer
- Date: 2026-11-15
- Approved by and reference: `Solution Designer within the direction (user informed)` for DEC-002..DEC-009; DEC-001 decided by the manager under the user's delegation (the Task: "the manager decides the product numbers under the user's delegation"), message from `/project_task_manager` run `project_task_manager_89e33a2ea30f422fab0407e4dc2b13bb` on 2026-11-15: "use the recommendation: default limit 2 GiB for video and audio … Proceed: approval recorded"
- Exact approved requirements baseline / solution revision: this document at SR-002 (SR-001 content plus DEC-001 = 2048 MiB and the release-order constraint RC-001)
- Behavior-defining supplements and their approved versions: None (probes are evidence only)

## Problem And Desired Outcome

- Problem: every context file is limited to 25 MiB, so ordinary phone videos cannot be attached; the failure message mixes the localized sentence with the raw English server text and does not say the limit.
- Affected actors or systems: the user on the phone (Android app's `/mobile` page) and desktop; the node server; agents on every runtime; LLM providers reached by the native runtime.
- Desired outcome: phone videos of ordinary length attach and reach the agent as a file on disk; the limit is configurable per node; an over-limit file is refused at once with one localized message naming the file and the limit; long uploads show progress and can be cancelled; nothing half-written stays on disk; a large video is never base64-inlined into a model request.
- Observable definition of success: AC-001 … AC-015 pass, proven on the server, the web unit layer and the phone bundle.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario IDs | Current Behavior (evidence) | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | All types ≤ 25 MiB; videos larger fail (P1) | Video and audio up to the media limit (default DEC-001); other types up to the file limit (default 25 MiB) | Allowed type list; draft → final flow; send blocked while uploading | investigation-notes Source Log, P1 |
| BEH-002 | User | SCN-002, SCN-004 | "无法附加 X。 Uploaded file is too large." (raw server text) | One localized message per failure reason, with names and (for size) the limit; no raw server text | Message appears in the same place, per composer target | screenshot, `ContextFilePathInputArea.vue` |
| BEH-003 | System | SCN-002, SCN-003 | Partial file removed on over-limit and abort (P1, P3) | Same, also for cancel | Yes | probes |
| BEH-004 | System | SCN-001 | Upload streams, no whole-file buffering (P2) | Same at the larger limit | Yes | P2 |
| BEH-005 | System | SCN-005 | Unsent drafts deleted after 24 h | Same for large files | Yes | code |
| BEH-006 | System | SCN-001 | Agent gets the absolute path in `Reference files:` | Same for large videos | Yes | code |
| BEH-007 | System | SCN-006 | Native runtime base64-inlines media into requests for video-capable models (Gemini), on every later request of the run | Local media files larger than 25 MiB are not inlined; the path stays in `Reference files:` | Media ≤ 25 MiB keeps today's handling | code, Gemini limit |
| BEH-008 | User / Contract | SCN-007 | Project Task uploads and agent-tool `context_files` share the 25 MiB limit; web shows raw server message; tool text says "25 MiB" | Same per-type limits as the composer; localized size/type messages; truthful tool text | Other Project Task errors and codes unchanged | code |
| BEH-009 | User | SCN-004 | "Couldn't remove X." + raw detail | Localized message only | — | code |
| BEH-010 | User | — | `/upload-file` (avatars) 25 MiB | Unchanged | Yes | code |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User on a phone | Give the agent a video | Video attaches over a mobile network with visible progress, or a clear localized reason why not | Mobile data, unstable links |
| User on desktop | Same | Same | — |
| Node owner | Control disk use | Can set the limits | Setting documented, takes effect without restart |
| Agent | Work on the file | Absolute path to the full file | Not inlined when large |
| LLM provider | — | No oversized inline payloads | Gemini 100 MB base64 inline limit |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenario IDs |
| --- | --- | --- |
| UC-001 | Attach a video/audio file larger than 25 MiB in the message composer (desktop and phone) and send it to an agent | SCN-001 |
| UC-002 | Be told, in the UI language, that a file is over the limit, before it is uploaded | SCN-002 |
| UC-003 | Follow and cancel a long upload; recover from a dropped connection | SCN-003 |
| UC-004 | See localized messages for every other composer attach/remove failure | SCN-004 |
| UC-005 | Node owner sets the file and media size limits | SCN-008 |
| UC-006 | Agent on the native runtime receives a large video safely | SCN-006 |
| UC-007 | Attach the same files to a Project Task (web composer and agent tools) under the same limits | SCN-007 |

### Out Of Scope

- Memory Sync's handling of large files (FU-001), the paste-from-another-composer re-download (FU-002), the untranslated `Context Files (n)` label and other localization gaps outside the failure messages (FU-003).
- Resumable/chunked uploads (tus-style resume after a dropped connection); disk quotas; uploading media to a provider's Files API so a model can watch a large video.
- `/upload-file` (avatars) and other multipart routes.
- Any change to how agents read files, to the allowed type list, or to the draft TTL.

### Non-Goals

- A model "seeing" a video larger than 25 MiB through inline media; the agent works with the file through its tools.
- Retrying an interrupted upload automatically.

### Preserved Behavior Boundary

BEH-003, BEH-004, BEH-005, BEH-006, BEH-010; the preserved column of BEH-001, BEH-002, BEH-007, BEH-008; AC-003, AC-013.

### Release-Order Constraint

- RC-001: this ticket may be merged independently, but it must not be released before, or must be released together with, the Memory Sync large-file Task `autobyteus-workspace-7` created from FU-001 (manager, Task comment 2026-11-16). Delivery checks this at release time; the Task Manager owns the order.

### Prerequisites

None. (Memory Sync, R-001/FU-001, does not block this ticket's goal: the attach journey works without it and Memory Sync is opt-in; see DEC-009.)

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| ID | Requirement | Behavior IDs | Priority | Rationale | Feasibility | Source / Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The node accepts a context file whose type is video or audio up to the **media limit**, and any other allowed type up to the **file limit**; a file exactly at its limit is accepted, one byte more is refused. | BEH-001 | Must | User's videos | P2 (600 MiB streamed, constant memory) | Task; DEC-001, DEC-002 |
| REQ-002 | Both limits are node settings, in MiB, settable as environment variables and in the node's server settings, validated (whole numbers in a documented range; invalid values refused on save and ignored with the default at use), and applied to the next upload without a restart. Defaults: file limit 25 MiB; media limit 2048 MiB (DEC-001). | BEH-001 | Must | Configurable per Task | N/A | DEC-003 |
| REQ-003 | The same per-type limits govern every context-file entry: composer uploads, Project Task uploads, and Project Task agent-tool local-file copies. Agent-tool descriptions state the rule without a stale number. | BEH-008 | Must | One policy, "same limit as the app" contract | N/A | DEC-008 |
| REQ-004 | An over-limit refusal from the server is machine-readable: it identifies the reason (too large, unsupported type) and carries the limit in bytes that applied. | BEH-002, BEH-008 | Must | Lets every client localize | N/A | DEC-006 |
| REQ-005 | The web app knows the node's current limits and refuses an over-limit file before sending any of its bytes. The server remains the authority (a file that passes the client check but exceeds the server's current limit is still refused). | BEH-001, BEH-002 | Must | No wasted mobile data | N/A | DEC-004 |
| REQ-006 | Composer failures are shown as one localized message per failure reason, naming the files and, for size, the limit formatted in the UI language (e.g. `25 MB`, `2 GB`); a raw server or exception text is never shown (it goes to the console). Reasons: too large, unsupported type, interrupted connection, other. Remove failures likewise. | BEH-002, BEH-009 | Must | Task item (3) | N/A | DEC-006 |
| REQ-007 | While a composer upload runs, its item shows progress (percent) and a cancel control. Cancel stops the transfer, removes the item without an error message, and leaves no file on the node. Send stays blocked while any upload runs. | BEH-001, BEH-003 | Must | Mobile robustness | P3 (abort cleans up) | DEC-005 |
| REQ-008 | A dropped connection during an upload ends that item with the localized "interrupted" message and leaves no file on the node. | BEH-003 | Must | Mobile robustness | P3 | DEC-006 |
| REQ-009 | Drafts of any size keep the 24 h cleanup; finalized large files reach the agent as an absolute path like any other context file. | BEH-005, BEH-006 | Must | Preserved | Code read | Task |
| REQ-010 | The native runtime never base64-inlines a local media file (image, audio, video) larger than 25 MiB into a model request; it is left out of the request's media with a logged diagnostic, and its path remains in the message's `Reference files:`. Media ≤ 25 MiB keeps today's handling. | BEH-007 | Must | Provider and memory safety | Gemini 100 MB base64 limit; V8 string limit | DEC-007 |
| REQ-011 | Project Task web uploads show the same localized too-large / unsupported-type messages (with the limit) and refuse over-limit files before uploading. | BEH-008 | Should | Same raw-English defect on the second upload surface | N/A | DEC-008 |
| REQ-012 | The limits, their settings, defaults and ranges are documented for node owners and developers. | BEH-001 | Must | Configurable must be findable | N/A | Task |

## Acceptance Criteria

| AC ID | REQ IDs | Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-009 | SCN-001 | Phone bundle: attach a 200 MiB `.mp4` and send | Item shows progress, attaches, message sends; the agent's message lists an absolute path to the full file | — | Server integration (route) + mobile-shell browser probe |
| AC-002 | REQ-001, REQ-004 | SCN-002 | Server: upload a video exactly at the media limit, and one byte over (test override of the limit) | At limit: 200 + draft; over: refused with code `too large` and the limit in bytes; no file on disk | — | Server unit (writer) + integration (route) |
| AC-003 | REQ-001 | SCN-002 | Non-media file exactly 25 MiB and 25 MiB + 1 | Accepted / refused as today, now with the structured reason | — | Server unit + integration |
| AC-004 | REQ-002, REQ-005 | SCN-008 | Change a limit setting, then upload | The next upload (server enforcement and the web pre-check) uses the new value without restart; an invalid value is refused on save and, if present in the environment, ignored in favor of the default | — | Server unit (parse/normalize) + integration |
| AC-005 | REQ-005, REQ-006 | SCN-002 | zh-CN UI, pick a file over the limit | No upload request is made; message `无法附加 <name>：文件超过 <limit> 大小限制。`; English UI: the English equivalent; several such files → one message listing them | — | Web unit (composable + component) + mobile-shell probe |
| AC-006 | REQ-004, REQ-006 | SCN-002 | Server refuses a file the client let through (limit lowered after the client read it) | Same localized message with the server's limit | — | Web unit |
| AC-007 | REQ-007 | SCN-003 | Cancel an upload mid-way | Request aborted, item removed, no error message, no draft file on the node, send unblocked | — | Web unit + server integration (abort cleanup) |
| AC-008 | REQ-008 | SCN-003 | Connection drops mid-upload | Localized "interrupted" message; no draft file on the node | — | Web unit (network error mapping) + server integration (P3 as regression) |
| AC-009 | REQ-006 | SCN-004 | Unsupported type, generic server failure, remove failure | Localized messages only; no raw server/exception text in the UI | Regression: the screenshot string never appears | Web unit (regression for the reported message) |
| AC-010 | REQ-009 | SCN-005 | Draft older than 24 h, large | Removed by the next upload's cleanup | — | Server unit (existing cleanup test extended or confirmed) |
| AC-011 | REQ-010 | SCN-006 | Native runtime, video-capable model, attached video > 25 MiB; and one ≤ 25 MiB | > 25 MiB: not in the provider request's media, diagnostic logged, path in `Reference files:`; ≤ 25 MiB: inlined as today | — | autobyteus-ts unit (sanitizer) |
| AC-012 | REQ-003, REQ-011 | SCN-007 | Project Task: upload a video > 25 MiB within the media limit; an over-limit one; agent tool with a local video path | Accepted; localized too-large message before upload; tool copy accepted under the same limit and refused over it with `TASK_CONTEXT_INVALID` naming the limit | — | Server unit/integration + web unit |
| AC-013 | — | — | `/upload-file` with 26 MiB | Refused as today (25 MiB unchanged) | — | Server integration |
| AC-014 | REQ-012 | SCN-008 | Read docs | Settings, defaults, ranges and the per-type rule are documented (server settings/remote-access or context-files docs and web docs) | — | Doc review |
| AC-015 | REQ-001 | SCN-001 | Memory during a large upload | Server memory stays bounded (streaming) at the media limit | — | Server integration (P2 shape, or measured once in validation) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User (phone or desktop) | Give the agent a video | `+` / drop / paste in the composer | Paired phone or desktop, agent run or new run | Pick video → progress → attached → send | Agent gets the path | — | Supported Normal Scenario | Screenshot; Task | REQ-001, REQ-009; AC-001, AC-015 |
| SCN-002 | User | User | Learn why a file can't attach | Pick an over-limit file | Same | Pick → immediate message | Localized message with name and limit; nothing uploaded | Server-side refusal shows the same | Supported Normal Scenario | Screenshot | REQ-004–006; AC-002, AC-003, AC-005, AC-006 |
| SCN-003 | User | User on a mobile network | Control a long upload | Long upload | Upload running | Watch % → cancel, or link drops | Cancel: item gone; drop: "interrupted" message; no file left | — | Supported Normal Scenario | Task (mobile robustness) | REQ-007, REQ-008; AC-007, AC-008 |
| SCN-004 | User | User | Understand other failures | Unsupported type, server error, remove failure | — | — | Localized message only | — | Supported Normal Scenario | code | REQ-006; AC-009 |
| SCN-005 | System | Node | Clean unsent drafts | Next upload after 24 h | Unsent large draft | Cleanup | Draft removed | — | Supported Normal Scenario | code | REQ-009; AC-010 |
| SCN-006 | System | Native runtime | Send a turn with a large video | Message with a > 25 MiB video, video-capable model | — | Request assembly | Video not inlined; path present | — | Supported Normal Scenario | code | REQ-010; AC-011 |
| SCN-007 | User / Contract | User; agent via `create_task`/`update_task` | Attach a video to a Project Task | Task composer upload; tool `context_files` | — | — | Same limits, localized web messages | — | Supported Normal Scenario | code, tool contract | REQ-003, REQ-011; AC-012 |
| SCN-008 | Operational | Node owner | Set limits | Server settings or environment | — | Save → next upload | New limits apply | Invalid value refused | Supported Normal Scenario | settings pattern | REQ-002, REQ-012; AC-004, AC-014 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (small deltas in the existing composer; no Product Design requested)
- Linked UI/UX supplement / runnable reference / Product ticket / design revision / confirmation / visual baseline: `N/A — not applicable` (no Product handoff)
- Normative details: the uploading item shows `NN%` and a cancel (×) control with an accessible label ("Cancel upload of {{name}}" / "取消上传 {{name}}"); the error line stays where it is today; message copy (implementation may polish wording within the meaning):
  - too large — en `Couldn't attach {{name}}: over the {{limit}} size limit.` / zh-CN `无法附加 {{name}}：文件超过 {{limit}} 大小限制。`
  - unsupported type — en `Couldn't attach {{name}}: this file type isn't supported.` / zh-CN `无法附加 {{name}}：不支持此文件类型。`
  - interrupted — en `Couldn't attach {{name}}: the upload was interrupted. Check your connection and try again.` / zh-CN `无法附加 {{name}}：上传中断，请检查网络后重试。`
  - other — the existing `Couldn't attach {{name}}.` / `无法附加 {{name}}。` without any appended detail; remove — existing `Couldn't remove {{name}}.` / `无法移除 {{name}}。`
- Limit format: base-1024 values labeled `MB`/`GB` (as phones and Windows show sizes), whole numbers or one decimal, formatted with the app's UI locale.
- Product decisions that need the user: DEC-001 (via the manager, per the Task).

## Quality And Non-Functional Requirements

| Quality ID | REQ / AC | Area | Constraint | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 / AC-015 | Performance | Server memory does not grow with file size (streaming) | Uploads up to the media limit | Integration/measurement |
| QR-002 | REQ-007, REQ-008 / AC-007, AC-008 | Reliability | No partial file remains after over-limit, cancel or disconnect | All three causes | Server integration |
| QR-003 | REQ-010 / AC-011 | Reliability | No model request carries an inline local media file > 25 MiB | Native runtime | autobyteus-ts unit |
| QR-004 | REQ-002 | Security / Operability | Limits are owner-controlled; the upload route stays behind node access (owner and phone credentials) | — | Existing access tests unchanged |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (no format change; existing drafts and finals untouched)
- Data that must be preserved: all existing context files
- Acceptable loss: none
- Constraints: larger files use more disk; owner can lower the limit (R-002)
- Unknowns: none

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| `@fastify/multipart` 10.1.6 | Per-request `limits.fileSize` | source | Low |
| Gemini inline data | ≤ 100 MB base64 per request | Google blog 2026-01-12 | Covered by REQ-010 |
| Android WebView / phone browsers | XHR upload progress and abort | platform | Low |

## Supplemental Artifacts

| Path | Purpose | REQ / AC | Status | Approval |
| --- | --- | --- | --- | --- |
| `probes/large-upload-probe.integration.test.ts.txt`, `probes/probe-results-2026-11-15.txt` | Reproduction and measurements | AC-002, AC-007, AC-008, AC-015 | Current | Evidence only |
| `follow-ups.md` | FU-001..FU-003 | — | Current | N/A |

## Assumptions

| ID | Assumption | Why | Validation / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The browser's `File.type` for a picked video is `video/*` (the server classifies by the same multipart Content-Type) | Client and server must classify alike | Web unit + phone probe; server stays authoritative | Open |

## Decisions

| ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Default media (video/audio) limit | Decides which phone videos attach out of the box | 500 MiB (Task's floor) ≈ 4 min 1080p / ~1.3 min 4K; 1 GiB ≈ 8 min / ~2.5 min; 2 GiB ≈ 16 min / ~5 min. Telegram and WhatsApp documents allow 2 GB. Streaming and cleanup are size-independent (P2, P3); the client refuses over-limit files before sending, so a high ceiling costs nothing unless used; disk is the only cost and the owner can lower it. | **Recommend 2048 MiB (2 GiB)**: covers ordinary phone recordings, including several minutes of 4K, matching what users know from messengers. 500 MiB would refuse many 4K clips and longer screen recordings. | Manager (user-delegated, per the Task) | Decided by the manager 2026-11-15: 2048 MiB |
| DEC-002 | Do other types change? | Images are inlined into model requests; documents/text > 25 MiB are rare | Raising them adds provider risk with no reported need | Keep 25 MiB default for every non-video/audio type, configurable | Solution Designer | Decided |
| DEC-003 | Configuration shape | Owner control | One number vs. per-type | Two settings: `AUTOBYTEUS_CONTEXT_FILE_MAX_MB` (default 25, range 1–1024) and `AUTOBYTEUS_CONTEXT_FILE_MEDIA_MAX_MB` (default 2048, range 1–10240), in the existing typed-setting pattern, read at each upload | Solution Designer | Decided |
| DEC-004 | Where the limit is checked | Mobile data | Server only (today) wastes the upload | Client pre-check from the node's published limits + server enforcement | Solution Designer | Decided |
| DEC-005 | Progress/cancel scope | Effort vs. need | Chat composer is where the user attaches videos | Progress + cancel in the message composer (desktop and phone); Project Task composer gets the pre-check and messages only | Solution Designer | Decided |
| DEC-006 | Error model | Mixed-language text | Raw detail appended today | Server sends a reason code and limit; web maps reasons to localized copy; raw text only to the console; one message per reason | Solution Designer | Decided |
| DEC-007 | Keep agents safe with large media | Gemini inline limit, V8 string limit, history re-rendering | Inline cap equal to today's upload limit (25 MiB) changes nothing that worked before | Provider-neutral guard in the native runtime's media filtering: local media > 25 MiB not inlined, path kept | Solution Designer | Decided |
| DEC-008 | Project Task context files | Shared writer/policy, "same limit as the app" tool contract | Separate limits would break that contract | Same per-type policy; tool text "Same file types and size limits as the app"; Project Task web gets localized size/type messages and pre-check | Solution Designer | Decided |
| DEC-009 | Memory Sync with large attachments | Opt-in sync stops on a > ~37 MiB file | Fixing it here changes another feature; it is already fragile at 2 × 25 MiB | Follow-up FU-001 (urgent) raised now to the manager; not a prerequisite because the ticket's journey does not depend on it | Solution Designer | Decided (manager informed) |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002, AC-003, AC-015 | SCN-001, SCN-002 |
| REQ-002 | UC-005 | BEH-001 | AC-004 | SCN-008 |
| REQ-003 | UC-007 | BEH-008 | AC-012 | SCN-007 |
| REQ-004 | UC-002 | BEH-002 | AC-002, AC-006 | SCN-002 |
| REQ-005 | UC-002 | BEH-001, BEH-002 | AC-004, AC-005 | SCN-002 |
| REQ-006 | UC-002, UC-004 | BEH-002, BEH-009 | AC-005, AC-006, AC-009 | SCN-002, SCN-004 |
| REQ-007 | UC-003 | BEH-001, BEH-003 | AC-007 | SCN-003 |
| REQ-008 | UC-003 | BEH-003 | AC-008 | SCN-003 |
| REQ-009 | UC-001 | BEH-005, BEH-006 | AC-001, AC-010 | SCN-001, SCN-005 |
| REQ-010 | UC-006 | BEH-007 | AC-011 | SCN-006 |
| REQ-011 | UC-007 | BEH-008 | AC-012 | SCN-007 |
| REQ-012 | UC-005 | BEH-001 | AC-014 | SCN-008 |

## Architecture Phase Input

- Scenario paths to map: SCN-001…SCN-008.
- Constraints: `/upload-file` keeps 25 MiB; writer keeps exclusive create and cleanup; route stays behind node access; no persisted-format change.
- Deferred to design: policy owner and setting files, error contract shape and status codes, how the web reads limits per bound node, progress/cancel mechanics, inline-guard placement, Project Task error shape.
- Facts to verify: phone credential can read the limits route; axios progress/abort in WebView; mobile-shell probe can drive a file pick.
- Risks: R-001 (FU-001), R-003 (FU-002).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
