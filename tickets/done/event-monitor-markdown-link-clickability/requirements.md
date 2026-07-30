# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready`

## Goal / Problem Statement

Make Event Monitor Markdown output honest about local artifact links. A message such as `[DMG](/Users/.../AutoByteus.dmg)` currently receives the browser's ordinary link styling but does not enter the Event Monitor file-preview action path. The user sees a clickable-looking label that is not a usable link. The renderer must preserve the artifact label and source meaning without presenting an unsupported local artifact as an actionable link.

The existing Event Monitor contract intentionally supports read-only preview only for file families that the shared FileViewer can render. DMG, ZIP, PKG/application bundles, generic binaries, and unknown extensions are not previewable in Files and must remain inert. This task aligns bare absolute-path Markdown destinations with that existing contract; it does not add OS-level opening or arbitrary local-file navigation.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | In the Event Monitor, `[DMG](/absolute/path/to/file.dmg)` is parsed as an ordinary `<a href="/absolute/path/to/file.dmg">DMG</a>`. The file destination policy recognizes `.dmg` as unsupported and therefore creates no Event Monitor action, while the ordinary anchor remains visually link-like. Delegated handling only routes HTTP(S) anchors and file-action IDs, so no preview action is emitted. | A bare absolute Markdown destination whose normalized path is unsupported is classified as an invalid Event Monitor file destination and rendered as inert label text (no anchor, action ID, raw file URL, or keyboard activation). | The authored label remains readable; no filesystem read, panel switch, OS opener, or persisted record is created. | R-001, R-002, AC-001, AC-002 |
| BEH-002 | Supported absolute local destinations such as `/tmp/report.md` are converted to render-scoped Event Monitor action IDs and emit a typed action on explicit activation. | Continue converting supported local destinations to the existing read-only preview action path. | File-type eligibility, workspace/runtime mapping, localized unavailable/failed status, and generic renderer opt-in boundaries remain unchanged. | R-003, AC-003 |
| BEH-003 | HTTP(S) Markdown links remain ordinary anchors and are routed by the renderer's external-link authority; non-Event-Monitor Markdown consumers do not opt into file actions. | Keep ordinary external links and generic Markdown behavior unchanged. | No new navigation is introduced for local unsupported destinations. | R-004, AC-004 |
| BEH-004 | Invalid `file:` URIs are already neutralized as inert text in the Event Monitor. | Bare absolute unsupported file destinations follow the same inert treatment, without exposing the raw destination through the DOM. | Valid empty-authority `file:` URIs for supported preview types continue using the existing typed action path. | R-002, R-003, AC-002, AC-003 |

## Investigation Findings

1. `AgentEventMonitor.vue` opts the Event Monitor feed into file actions and handles only typed `file-path-action` events by calling `useEventMonitorFilePreview().openPath(action)`.
2. `MarkdownRenderer.vue` delegates clicks. It handles a render-scoped file-action ID first, then sends only HTTP(S) links to the external-link opener. A local ordinary anchor is not converted into a file action or prevented from following its browser URL.
3. `useMarkdownSegments.ts` already has an `invalid-file` rendering path that emits a `<span>` instead of an anchor. `resolveEventMonitorMarkdownFileDestination()` uses that path for malformed/unsupported `file:` URIs but returns `not-file` for unsupported bare absolute destinations.
4. `fileTypePolicy.ts` intentionally returns `Unsupported` for `.dmg`, `.zip`, `.pkg`, application bundles, generic binaries, and unknown extensions. Existing documentation states that unsupported Event Monitor file references are literal and inert.
5. The smallest coherent correction is to classify a normalized bare absolute destination with `Unsupported` preview type as `invalid-file`; the existing renderer path then removes the false anchor affordance without changing the preview boundary.

## Relevant Supplemental Task Artifacts

None. The requirements and investigation notes contain the complete evidence and intended behavior for this localized change.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Initial design issue signal: `Yes`
- Root cause classification: `Local Implementation Defect`
- Refactor posture: `Likely Not Needed`
- Evidence basis: The existing `invalid-file` owner and renderer path are already correct and used for invalid `file:` URIs. The defect is a missing classification branch for unsupported bare absolute Markdown destinations, not an ownership or boundary failure.
- Requirement or scope impact: Align raw absolute Markdown destination classification with the existing FileViewer-supported type policy and inert-rendering contract. Do not broaden supported file types or create a second click/open path.

## Recommendations

Reuse the existing `invalid-file` state and renderer branch. Add utility-level classification coverage and renderer-level DOM/activation coverage for DMG/ZIP/PKG or unknown bare absolute destinations. Keep supported local action, external HTTP(S), and generic Markdown coverage passing.

## Scope Classification (`Small`/`Medium`/`Large`)

`Small`

The change is limited to one pure destination-policy branch, focused renderer/policy tests, and a possible one-sentence documentation clarification. No API, persisted schema, runtime launcher, or FileViewer behavior changes.

## In-Scope Use Cases

- **UC-001 — Unsupported local artifact Markdown link:** User views an Event Monitor message containing `[DMG](/absolute/path/to/file.dmg)` or another unsupported absolute artifact destination; the label is readable but inert and does not look or behave like an action.
- **UC-002 — Supported local preview link regression guard:** User activates a supported local destination; the existing typed Event Monitor preview action remains available.
- **UC-003 — External link regression guard:** User activates an HTTP(S) Markdown link; the existing external-link authority remains responsible.
- **UC-004 — Generic renderer isolation:** A non-Event-Monitor Markdown consumer remains unaffected because the file-action capability is still opt-in.

## Out of Scope

- Making DMG, ZIP, PKG, application bundles, or generic binaries previewable in the Files surface.
- Opening local artifacts in Finder, the operating system, Electron shell, or an arbitrary browser/file URL.
- Changing FileViewer's supported type policy or runtime path/workspace authorization.
- Changing ordinary relative Markdown navigation, Mermaid link handling, or persisted message/history data.
- Reformatting delivery messages beyond removing the false local unsupported-link affordance.

## Functional Requirements

- **R-001 — Classify unsupported bare absolute destinations:** When Event Monitor file actions are enabled and a Markdown link destination decodes to a normalized POSIX or Windows absolute path whose shared preview type is `Unsupported`, classify it as `invalid-file`, not as an ordinary non-file link.
- **R-002 — Render invalid local destinations inertly:** Render `invalid-file` Markdown links through the existing inert text path. Preserve the authored label, but do not emit an anchor, `href`, render-scoped action ID, raw destination, file-action event, or keyboard activation affordance.
- **R-003 — Preserve supported local action behavior:** Supported absolute paths and supported empty-authority `file:` URIs continue to produce the existing typed Event Monitor action and remain eligible for explicit pointer/Enter/Space activation.
- **R-004 — Preserve other Markdown behavior:** HTTP(S) links retain external-link routing, and generic Markdown consumers that do not opt into Event Monitor file actions retain their current output and behavior.
- **R-005 — Keep the security boundary:** The fix must not introduce filesystem probing, file-byte reads, OS-level openers, persisted locators, or raw local destinations in rendered DOM attributes.

## Acceptance Criteria

- **AC-001 — Reported DMG case is visibly inert:** With Event Monitor actions enabled, rendering `[DMG](/absolute/path/to/file.dmg)` produces readable `DMG` text, no `<a>` element for the destination, no `data-event-monitor-file-action-id`, no raw `.dmg` destination in rendered HTML, and no `file-path-action` event after click, Enter, or Space attempts.
- **AC-002 — Unsupported families are covered:** Bare absolute `.zip`, `.pkg`, application-bundle, generic-binary, and unknown-extension destinations are classified/rendered with the same inert behavior; supported `file:` URI invalid cases remain inert.
- **AC-003 — Supported local actions remain usable:** A supported destination such as `/tmp/report.md` remains a render-scoped action with the normalized path, `href="#"`, accessibility metadata, and a typed `file-path-action` event on explicit activation.
- **AC-004 — External and generic regressions are absent:** An HTTP(S) Markdown link still reaches the existing external-link opener, while a renderer mounted without `enableEventMonitorFileActions` does not gain Event Monitor file-action controls.
- **AC-005 — No persisted-data or boundary regression:** The implementation changes no message/storage schema and does not add filesystem/runtime access to Markdown rendering; existing focused tests and repository frontend checks pass.

## Constraints / Dependencies

- `autobyteus-web/utils/fileExplorer/fileTypePolicy.ts` is the shared source of truth for FileViewer eligibility.
- The Event Monitor opt-in boundary is `AgentEventMonitor.vue` -> `AgentConversationFeed.vue` -> conversation segment -> `MarkdownRenderer.vue`.
- `DOMPurify` sanitization must continue to remove raw local destinations from inert rendered output.
- Existing localization and preview failure/unavailable states are not changed.
- Follow repository test guidance: use colocated Vitest tests and `--run` for one-shot execution.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Existing conversation/event text and run history may contain the original Markdown source; no stored representation is changed.
- Required outcome: `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all message source/content exactly as stored.
- Unacceptable data loss or corruption: Dropping the authored label or mutating persisted Markdown destinations.
- Relevant availability, maintenance-window, or rollout constraints: None; renderer/policy-only change.
- Related requirement and acceptance-criteria IDs: R-005, AC-005.

## Assumptions

- The user report refers to the central Event Monitor, where file actions are enabled, rather than generic conversation rendering.
- The intended product behavior is the existing documented policy that unsupported local artifacts remain inert, not that the app should launch installers/archives.
- `[DMG](/path/file.dmg)` is an absolute local destination and should not be treated as an application route or external web URL.

## Risks / Open Questions

- A rare Event Monitor message may intentionally use an absolute root-relative application route as Markdown. The current product contract and path policy treat absolute destinations in the opted-in Event Monitor as file candidates; this change makes unsupported candidates inert, while supported candidates retain the existing preview path.
- Browser/remote users may still see a localized unavailable state for supported files outside the active workspace; this is existing behavior and remains separate from type ineligibility.

## Requirement-To-Use-Case Coverage

| Use Case | Requirement IDs | Acceptance-Criteria IDs |
| --- | --- | --- |
| UC-001 | R-001, R-002, R-005 | AC-001, AC-002, AC-005 |
| UC-002 | R-003, R-005 | AC-003, AC-005 |
| UC-003 | R-004 | AC-004 |
| UC-004 | R-004, R-005 | AC-004, AC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | MarkdownRenderer DOM and activation test for the reported DMG link. |
| AC-002 | Destination-policy parameterized tests plus renderer inertness for ZIP/PKG/unknown families. |
| AC-003 | Existing supported bare path/URI action tests remain green and continue asserting typed activation. |
| AC-004 | Existing HTTP(S) delegated-link and opt-in isolation tests remain green. |
| AC-005 | Focused frontend test run, type/build boundary checks as applicable, and source diff review verify no persistence/runtime boundary change. |

## Approval Status

`Design-ready` based on the user's defect report and the existing documented Event Monitor contract that unsupported local artifact references are literal and inert. No supplemental intended-behavior artifact requires separate approval.
