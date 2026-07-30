# Design Spec

## Current-State Read

The central Event Monitor enables the scoped Event Monitor file-action capability at `AgentEventMonitor.vue`. The flag is forwarded through `AgentConversationFeed.vue`, `AIMessage.vue`, and the conversation segment components into `MarkdownRenderer.vue`. `MarkdownRenderer` is the rendering boundary: it consumes the token model from `useMarkdownSegments`, injects sanitized HTML, delegates click/keyboard events, emits typed `file-path-action` events, and never opens files itself. `AgentEventMonitor` is the side-effect boundary that launches `useEventMonitorFilePreview` only after explicit user activation.

For a Markdown link whose destination is a supported absolute local path, `useMarkdownSegments` asks `resolveEventMonitorMarkdownFileDestination()` for a valid destination, registers an action ID, and renders a `href="#"` action anchor. For malformed or unsupported `file:` URIs, the policy returns `invalid-file`; the renderer converts the link to a non-anchor span. For a bare absolute unsupported destination such as `/absolute/path/to/file.dmg`, the policy currently returns `not-file` after `determineFilePreviewType()` reports `Unsupported`. The ordinary Markdown renderer therefore emits `<a href="/absolute/path/to/file.dmg">DMG</a>`. Generic `.prose a` styling makes it look actionable, but no action ID exists and `MarkdownRenderer` only delegates ordinary HTTP(S) links. The local root-relative anchor is not a host-file opener or Event Monitor preview action.

The shared FileViewer policy intentionally excludes DMG/ZIP/PKG/application bundles, generic binaries, and unknown extensions. Existing docs state that unsupported Event Monitor local references remain literal and inert. The defect is therefore a local classification omission, not a missing side-effect boundary or a need to broaden preview support.

## Intended Change

When Event Monitor file actions are enabled, classify a bare Markdown destination that decodes and normalizes to an absolute path but has `Unsupported` preview type as `invalid-file`. Reuse the existing invalid-file token metadata and renderer rules so the authored link label remains readable as inert text while no anchor, action ID, raw destination, or activation event is produced.

Keep all other paths unchanged:

- Supported absolute paths and supported empty-authority `file:` URIs remain typed render-scoped actions.
- HTTP(S) links remain ordinary external links.
- Generic Markdown consumers remain opt-out and unchanged.
- Files preview/runtime mapping, filesystem access, OS openers, localization, and persisted data remain unchanged.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | R-001, R-002; AC-001, AC-002 | User views Event Monitor output containing an absolute Markdown destination for a DMG/ZIP/PKG/unknown local artifact. | `MarkdownRenderer` currently produces an ordinary root-relative anchor; no action ID/event exists. Investigation probe and `absoluteFilePathAction.ts`. | Classify unsupported normalized absolute destinations as `invalid-file`; render authored label as inert text with no local `href` or action. | `AgentEventMonitor -> AgentConversationFeed -> conversation segment -> MarkdownRenderer -> useMarkdownSegments -> absoluteFilePathAction -> sanitized inert span`, DS-001 and DS-003. |
| BEH-002 | User | R-003; AC-003 | User explicitly clicks, presses Enter, or presses Space on a supported local Event Monitor file reference. | Existing render-scoped action ID emits `file-path-action` and Event Monitor launches read-only preview. | Preserve exactly; no change to action/preview boundary. | `MarkdownRenderer -> AgentEventMonitor -> useEventMonitorFilePreview -> FileViewer/MobileFiles`, DS-002. |
| BEH-003 | User | R-004; AC-004 | User activates HTTP(S) Markdown link. | `resolveExternalHttpUrl` and the existing Electron/browser external opener handle it. | Preserve ordinary external-link authority. | `MarkdownRenderer -> resolveExternalHttpUrl -> openExternalLink`, DS-001. |
| BEH-004 | Contract | R-004, R-005; AC-004, AC-005 | A Markdown consumer omits the Event Monitor action opt-in. | `MarkdownRenderer`/`useMarkdownSegments` do not decorate file paths or file URIs. | Preserve opt-in isolation and sanitized generic Markdown output. | `Generic segment -> MarkdownRenderer -> useMarkdownSegments (actions disabled)`, DS-001. |

## Relevant Supplemental Task Artifacts

None. No separate supplement is required for this localized policy/rendering correction.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Local Implementation Defect`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `No`
- Evidence: The policy owner already computes absolute path normalization and FileViewer eligibility; the renderer already owns an inert `invalid-file` projection; the Event Monitor already owns the only preview side effect. The only missing case is the bare absolute destination branch when the shared type policy returns `Unsupported`.
- Design response: Add one policy classification branch and test it through the existing inert renderer path. Do not add a new helper, event, component, or opener.
- Refactor rationale: Splitting or renaming current owners would increase risk without improving the ownership model. The existing boundaries are thin and coherent.
- Intentional deferrals and residual risk, if any: OS-level opening of DMG/ZIP/PKG is explicitly deferred/out of scope. If that capability is desired later, it requires a separate security/runtime design rather than reusing this preview action.

## Terminology

- **Supported local destination:** A normalized POSIX/Windows absolute path whose shared `determineFilePreviewType()` result is supported by `FileViewer`.
- **Unsupported local destination:** A normalized absolute path whose shared type result is `Unsupported`, including DMG/ZIP/PKG/application bundles, generic binaries, and unknown extensions.
- **Inert link:** Authored link label rendered as text/span without an anchor, action ID, raw destination, or activation side effect.

## Design Reading Order

This design follows the actual path from Event Monitor entry to token classification, then derives ownership, file mapping, and the minimal change sequence. The return/event spine for supported paths is included to show that the existing side-effect boundary remains intact.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete path in scope: the ordinary Markdown anchor projection for normalized but unsupported absolute local destinations in the Event Monitor.
- Removal action: stop returning `not-file` for this specific unsupported absolute-file case; return `invalid-file` so the existing inert projection replaces the false link affordance.
- No compatibility wrapper, dual render path, or old-path fallback is retained.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Conversation/run-history source strings containing Markdown; no representation change.
- Relevant code-model, serialization, semantic, or physical-store change: None. Only transient token classification and sanitized DOM projection change.
- Normal reader/writer behavior and representative evidence: Existing readers/writers continue to store and load the original message content. `MarkdownRenderer` reads content at presentation time.
- Required semantics and invariants under direct use: Preserve the exact authored label/source content; only remove unsupported local link interactivity from the rendered view.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No storage or migration concerns. Suppressing raw unsupported local `href` values is consistent with the existing no-generic-navigation safety rule.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Not Affected`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: No persisted bytes, schema, or rollout boundary changes; a migration would be unnecessary and harmful scope.
- Acceptance criteria or design constraints supported by this decision: R-005 and AC-005.

### Migration Plan (Only When Decision Is `Migration Required`)

`N/A` — persisted data is not affected.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003, BEH-004 | Event Monitor message presentation | Inert text, external open request, or sanitized generic Markdown DOM | `MarkdownRenderer` for rendering/dispatch, with `AgentEventMonitor` as surface owner | Shows the real user-facing path and why unsupported local links must not survive as ordinary anchors. |
| DS-002 | Return-Event | BEH-002 | Supported action activation | Read-only Files/Mobile preview result or localized unavailable/failed status | `AgentEventMonitor` preview launcher | Confirms supported actions retain their existing side-effect boundary. |
| DS-003 | Bounded Local | BEH-001, BEH-002 | Markdown source tokens | Render-scoped action metadata or invalid-file metadata | `useMarkdownSegments` plus `absoluteFilePathAction` policy | Shows the local classification seam where the defect is repaired. |

## Primary Execution Spine(s)

`Event Monitor surface -> conversation feed/segment -> MarkdownRenderer -> useMarkdownSegments -> absolute destination policy -> sanitized HTML/action DOM -> inert label or delegated user action`

For supported actions, the action path continues:

`Action DOM -> MarkdownRenderer delegated event -> AgentEventMonitor -> useEventMonitorFilePreview -> existing FileViewer/MobileFiles surface`

For HTTP(S) links, the ordinary path is:

`Ordinary anchor -> MarkdownRenderer delegated event -> resolveExternalHttpUrl -> Electron bridge/window external opener`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The Event Monitor enables the scoped capability while message segments remain pass-through wrappers. `MarkdownRenderer` renders the content and delegates links. The destination policy distinguishes supported local files, unsupported local files, and HTTP(S) links before sanitized HTML reaches the browser surface. Unsupported local artifacts terminate as readable inert labels rather than entering the generic anchor path. | Event Monitor surface; MarkdownRenderer; Markdown token model; rendered message surface | `MarkdownRenderer` for rendering; `AgentEventMonitor` for the surface boundary | DOMPurify sanitization, localization for supported action accessibility, external-link bridge. |
| DS-002 | Only a supported action control can emit `file-path-action`. The Event Monitor receives that typed event and invokes its existing preview launcher, which maps the path by runtime and delegates to FileViewer/MobileFiles. The renderer never performs this side effect. | Action control; Event Monitor launcher; File preview surface | `AgentEventMonitor` | Workspace/runtime locator mapping, File Explorer store, mobile request state. |
| DS-003 | `useMarkdownSegments` walks parsed inline tokens. For a link-open token it passes the raw destination to the policy. A valid supported result registers a render-scoped ID; an invalid-file result marks both open/close tokens so the renderer emits a span; ordinary links continue through Markdown rendering. | Token decorator; absolute-file destination policy; Markdown renderer rules | `absoluteFilePathAction` for classification and `useMarkdownSegments` for projection | Shared FileViewer type policy, encoded path decoding, DOMPurify. |

## Spine Actors / Main-Line Nodes

- `AgentEventMonitor.vue` — owns Event Monitor capability enablement and preview side effects.
- `AgentConversationFeed.vue` / message segment wrappers — forward the capability and typed event without owning file behavior.
- `MarkdownRenderer.vue` — owns sanitized Markdown output and delegated user activation routing.
- `useMarkdownSegments.ts` — owns token decoration and HTML segment projection.
- `absoluteFilePathAction.ts` — owns absolute-path normalization, preview eligibility classification, and action candidate semantics.
- `fileTypePolicy.ts` — owns shared FileViewer family eligibility.
- `useEventMonitorFilePreview.ts` / File Explorer — owns runtime file preview effects for supported actions only.

## Ownership Map

| Main-Line Node | Concrete Ownership |
| --- | --- |
| `AgentEventMonitor.vue` | Event Monitor surface lifecycle, opt-in configuration, typed action receipt, preview launcher invocation, localized status state. It is the governing side-effect boundary, not a Markdown parser. |
| Message segment wrappers | Forward props/events across the conversation shape; do not classify paths or open files. |
| `MarkdownRenderer.vue` | Sanitized Markdown DOM projection, Mermaid/external-link event routing, render-scoped action activation, accessibility attributes. It must not inspect filesystem state or open panels. |
| `useMarkdownSegments.ts` | Markdown token traversal, link/file action metadata, segment batching, sanitized HTML preparation. It must not perform runtime file access. |
| `absoluteFilePathAction.ts` | Absolute path normalization, raw Markdown destination semantic classification, action candidate construction, display-label derivation. It must not launch previews or inspect the filesystem. |
| `fileTypePolicy.ts` | Pure FileViewer-supported type policy. It must not render Markdown or own Event Monitor behavior. |
| `useEventMonitorFilePreview.ts` | Runtime locator selection and read-only preview request. It is called only after explicit typed Event Monitor action activation. |

`AgentEventMonitor` is the governing owner behind the public Event Monitor feed surface. `MarkdownRenderer` is a rendering boundary, not a hidden preview owner.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentConversationFeed.vue` and segment components | `MarkdownRenderer` for rendering; `AgentEventMonitor` for preview side effects | Reuse conversation/message presentation across Event Monitor and generic surfaces. | Path classification, filesystem access, panel navigation, or alternate compatibility behavior. |
| `MarkdownRenderer.vue` | `useMarkdownSegments` for token policy; `AgentEventMonitor` for preview side effects | Provides a stable rendering/activation boundary to multiple Markdown consumers. | File existence checks, preview launch, OS open, or persisted reference creation. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Ordinary `<a href="absolute-unsupported-local-path">` projection in Event Monitor | It falsely advertises an action that has no Event Monitor action ID or supported preview target. | `invalid-file` result from `absoluteFilePathAction.ts` and existing inert span rules in `useMarkdownSegments.ts`. | In This Change | No new DOM class or compatibility branch. |
| Any temptation to add a DMG/ZIP OS opener as a fallback | It would bypass the existing FileViewer/security boundary and is not approved by requirements. | None; explicitly rejected. | Follow-up only if separately approved | Requires separate product/security/runtime design. |

## Return Or Event Spine(s) (If Applicable)

`Supported action anchor click/Enter/Space -> MarkdownRenderer.handleFileAction -> emit('file-path-action', typed action) -> AgentEventMonitor.handleFilePathAction -> useEventMonitorFilePreview.openPath -> File Explorer/Mobile Files -> opened/unavailable/failed status`

The new invalid-file classification has no return/event spine: click and keyboard events find no action control and no side effect is emitted.

## Bounded Local / Internal Spines (If Applicable)

- **Parent owner:** `useMarkdownSegments`.
- **Short arrow chain:** `MarkdownIt link_open token -> resolveEventMonitorMarkdownFileDestination -> valid / invalid-file / ordinary -> token metadata -> mdWithPrism renderer rule -> sanitized segment HTML`.
- **Why it matters:** The bug is entirely in the local transition between absolute-path classification and HTML projection. Repairing that transition avoids touching downstream lifecycle owners.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `fileTypePolicy.ts` | DS-003, DS-002 | `absoluteFilePathAction`, File Explorer | Pure preview family eligibility | One shared source of truth prevents renderer/FileViewer drift. | If embedded in the renderer, supported types would diverge and UI would own file policy. |
| `DOMPurify` sanitization | DS-001, DS-003 | `MarkdownRenderer` | Remove unsafe/raw attributes after rendering. | Maintains safe HTML boundary. | If mixed with destination semantics, safety and product policy become coupled. |
| `resolveExternalHttpUrl` / Electron bridge | DS-001 | `MarkdownRenderer` | Open ordinary HTTP(S) links. | Preserves external-link behavior without treating local paths as web URLs. | If used for local file paths, it would create the reported false action and bypass File Explorer. |
| `useEventMonitorFilePreview` | DS-002 | `AgentEventMonitor` | Runtime mapping and read-only preview effects. | Keeps side effects behind the Event Monitor owner. | If called by Markdown rendering, passive message arrival could open panels/read files. |

## Ownership Boundaries

- The Event Monitor surface owns whether file actions are enabled and what happens after a typed action event.
- The Markdown renderer owns presentation and delegated activation only; it depends on the token policy and emits typed actions upward.
- The absolute path policy owns semantic classification before HTML rendering. It may reuse the shared type policy but does not access the runtime/filesystem.
- The File Explorer/FileViewer owner remains authoritative for actual supported-file preview and runtime validation.
- Generic Markdown consumers do not cross into Event Monitor action behavior because the option remains false by default.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentEventMonitor.handleFilePathAction` / `useEventMonitorFilePreview.openPath` | Runtime locator mapping, File Explorer open, mobile request, status result | `MarkdownRenderer` via typed emitted event | Renderer importing File Explorer stores or opening files directly | Strengthen the typed action contract, not a renderer shortcut. |
| `resolveEventMonitorMarkdownFileDestination` | Absolute-path decoding, normalization, supported/invalid distinction | `useMarkdownSegments` token decorator | Renderer or external-link handler reinterpreting `anchor.href` | Extend the policy result; do not inspect browser-resolved URLs. |
| `fileTypePolicy.determineFilePreviewType` | Shared extension/family eligibility | Path policy and File Explorer routing | Separate renderer-local extension lists | Extend the shared policy only when FileViewer support is actually added. |
| `MarkdownRenderer` | Sanitized DOM, action metadata lookup, delegated event routing | Conversation segment consumers | Segment wrappers adding competing click/open handlers | Add a singular renderer event/API if a real behavior needs exposure. |

## Dependency Rules

- `AgentEventMonitor` may depend on conversation feed and preview composable; it must not be bypassed by Markdown rendering for file side effects.
- `MarkdownRenderer` may depend on `useMarkdownSegments`, localization, sanitization/object URL helpers, and external-link authority; it must not depend on File Explorer state for classification or launch.
- `useMarkdownSegments` may depend on pure path/type policy; it must not call stores, composables with side effects, or browser navigation.
- `absoluteFilePathAction.ts` may depend on `fileTypePolicy.ts`; the reverse dependency is forbidden.
- Generic ordinary links may use the external HTTP authority only when their resolved protocol is HTTP(S); local absolute destinations must never fall through to that authority.
- No raw browser-resolved `anchor.href` may authorize a local file. The raw Markdown destination is classified before sanitization and represented by a render-scoped action ID only for valid supported actions.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `resolveEventMonitorMarkdownFileDestination(rawDestination)` | Markdown file destination policy | Classify raw destination as `valid`, `invalid-file`, or `not-file`; normalize supported candidate. | Raw Markdown destination string | Pure; no filesystem authorization. |
| `createAbsoluteFilePathAction(id, candidate, sourceKind)` | Event Monitor action model | Build typed action only for shared supported preview families. | Render-scoped ID + normalized candidate + source kind | Existing API; unchanged. |
| `MarkdownRenderer` `file-path-action` emit | Rendering boundary | Report explicit supported action activation upward. | `AbsoluteFilePathAction` | No new event for invalid files. |
| `useEventMonitorFilePreview.openPath(action)` | Event Monitor preview owner | Map and open supported read-only preview. | Typed `AbsoluteFilePathAction` | Existing effect boundary; unchanged. |
| `determineFilePreviewType(filePath)` | Shared FileViewer policy | Determine preview family without reading bytes. | Path string | Existing shared policy; unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveEventMonitorMarkdownFileDestination` | Yes | Yes | Low | Return `invalid-file` for unsupported normalized absolute local destinations. |
| `MarkdownRenderer` `file-path-action` | Yes | Yes | Low | Keep typed action emission only for supported controls. |
| `useEventMonitorFilePreview.openPath` | Yes | Yes | Low | No change. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Destination classification | `EventMonitorMarkdownFileDestination` | Yes | Low | Keep existing name and union. |
| Invalid local reference projection | `invalid-file` | Yes | Low | Reuse existing semantic state. |
| Supported preview action | `AbsoluteFilePathAction` | Yes | Low | Keep existing typed model. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Unsupported destination classification | Event Monitor file-path policy | `Extend` | The policy already normalizes destinations and distinguishes valid/invalid file URIs. | N/A |
| Inert DOM projection | Markdown rendering/token decoration | `Reuse` | Existing invalid-file renderer rules already produce spans and strip raw destination. | N/A |
| Preview type eligibility | File Explorer/FileViewer policy | `Reuse` | It is the established source of truth and already excludes DMG/ZIP/PKG. | N/A |
| Durable verification | Colocated frontend Vitest suites | `Extend` | Existing policy and renderer suites cover adjacent behavior. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Event Monitor presentation | Opt-in message rendering and typed action events | DS-001, DS-002 | `AgentEventMonitor`, `MarkdownRenderer` | `Reuse` | No new surface. |
| Markdown token/render pipeline | Token decoration, sanitized HTML, inert/active link projection | DS-001, DS-003 | `useMarkdownSegments` | `Reuse` | Consumes the corrected policy result. |
| Event Monitor file-path policy | Raw destination normalization and valid/invalid semantics | DS-003 | `absoluteFilePathAction.ts` | `Extend` | One branch for unsupported normalized absolute destinations. |
| File Explorer/FileViewer | Supported family policy and preview effects | DS-002 | Existing File Explorer owners | `Reuse` | No supported-family change. |
| Frontend verification/docs | Regression tests and contract wording | DS-001, DS-003 | Colocated test owners / docs | `Extend` | Add focused coverage; docs sync may clarify bare absolute links. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts` | Event Monitor file-path policy | Destination classification owner | Return `invalid-file` for normalized unsupported bare absolute destinations. | It already owns this union and all relevant path/type logic. | Reuses `fileTypePolicy`. |
| `autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts` | Frontend verification | Pure policy test boundary | Parameterized bare unsupported destination classification. | Colocated with the policy and independent of Vue mounting. | Reuses shared policy behavior. |
| `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` | Frontend verification | Renderer behavior test boundary | DOM and activation regression for unsupported local Markdown links. | It already tests valid/invalid file links and delegated behavior. | Reuses renderer action model. |
| `autobyteus-web/docs/file_explorer.md` | Documentation | Existing Event Monitor preview contract | Clarify that bare absolute unsupported Markdown destinations are inert. | Existing section owns the contract and runtime distinctions. | Reuses existing policy terminology. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `valid` / `invalid-file` / `not-file` destination union | Existing `absoluteFilePathAction.ts` | Event Monitor file-path policy | Both token rendering and tests need one semantic result. | Yes; no new fields. | Yes; no second classifier. | A renderer-specific duplicate union. |
| Preview family eligibility | Existing `fileTypePolicy.ts` | File Explorer/FileViewer | Shared by action creation and FileViewer routing. | Yes; unchanged. | Yes; reuse only. | A DMG-specific exception list in Markdown code. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `EventMonitorMarkdownFileDestination` | Yes | Yes | Low | Add no fields; change only the result for the existing semantic case. |
| `AbsoluteFilePathAction` | Yes | Yes | Low | No change. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts` | Event Monitor file-path policy | Raw destination classifier | `Unsupported` after successful absolute normalization returns `invalid-file`; valid supported paths remain `valid`. | Keeps product semantics at the existing pure policy boundary. | Yes, `fileTypePolicy`. |
| `autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts` | Frontend verification | Policy tests | Assert DMG/ZIP/PKG/unknown bare destinations are inert classifications while supported bare paths remain valid. | Pure tests isolate policy from Vue/DOM. | Yes. |
| `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` | Frontend verification | Renderer tests | Assert no anchor/raw destination/action event for reported and neighboring unsupported links. | Existing renderer suite owns DOM/activation behavior. | Yes. |
| `autobyteus-web/docs/file_explorer.md` | Documentation | Existing Event Monitor preview docs | State bare absolute unsupported Markdown destinations are literal/inert and do not generic-navigate. | Keeps durable contract aligned with code. | Yes. |

## Applied Patterns (If Any)

- **Opt-in capability:** `enableEventMonitorFileActions` keeps the file-action behavior confined to Event Monitor.
- **Pure policy before side effects:** raw Markdown is classified before DOM/browser resolution; preview side effects remain in `useEventMonitorFilePreview`.
- **Render-scoped action IDs:** supported actions use ephemeral IDs rather than raw local destinations in DOM attributes.
- **Existing inert-file projection:** invalid file links render as spans and preserve labels without exposing raw destination URLs.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts` | File | Event Monitor file-path policy | Correct unsupported bare absolute destination classification. | Existing path policy owns the semantic distinction. | Vue rendering, stores, filesystem probes, OS openers. |
| `autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts` | File | Pure policy verification | Cover valid/invalid/not-file distinctions. | Colocated with policy. | Component snapshots or runtime setup. |
| `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` | File | Renderer verification | Cover inert DOM and no activation event. | Existing renderer suite already owns adjacent cases. | Production policy logic. |
| `autobyteus-web/docs/file_explorer.md` | File | Durable documentation | Clarify unsupported bare absolute links. | Existing Event Monitor preview documentation location. | Implementation-only test details. |

The layout remains intentionally flat within existing capability folders because each touched path already has a clear owner and the change does not create a new structural depth.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/utils/eventMonitorFilePaths` | Off-Spine Concern / pure policy | Yes | Low | Existing folder isolates Event Monitor path semantics. |
| `autobyteus-web/components/conversation/segments/renderer` | Main-Line Presentation | Yes | Low | Existing renderer owns sanitized Markdown projection and delegated activation. |
| `autobyteus-web/docs` | Off-Spine Contract Context | Yes | Low | Existing docs chapter owns file/rendering behavior. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Unsupported local artifact | `[DMG](/tmp/AutoByteus.dmg)` -> `<span>DMG</span>` with no action ID | `[DMG](/tmp/AutoByteus.dmg)` -> `<a href="/tmp/AutoByteus.dmg">DMG</a>` | The good shape is honest about the absence of a supported preview/open action. |
| Supported local preview | `[report.md](/tmp/report.md)` -> action anchor with render-scoped ID -> typed `file-path-action` | Generic browser anchor or renderer-side File Explorer store access | Keeps authorization/side effects behind the Event Monitor owner. |
| External link | `[Docs](https://example.com)` -> ordinary anchor -> external-link authority | Treating every absolute-looking destination as a local file | Preserves ordinary web Markdown behavior. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep ordinary anchors for unsupported local paths and add a no-op click handler | Would avoid DOM changes for old messages. | `Rejected` | Reclassify to `invalid-file` and remove the false anchor projection. |
| Add a DMG/ZIP opener fallback through Electron or `window.open` | User may want to access delivery artifacts. | `Rejected` | Keep unsupported types inert; a real OS-open capability requires separate approved security/runtime design. |
| Add a renderer-local unsupported-extension list | Would make the reported case easy to patch. | `Rejected` | Reuse shared `fileTypePolicy` at `absoluteFilePathAction` boundary. |
| Preserve a second legacy `not-file` branch for old content | Could retain old browser navigation. | `Rejected` | Behavior is presentation-time and source remains unchanged; current contract requires inert unsupported local references. |

## Derived Layering (If Useful)

The change is best understood as ownership flow rather than a new layer: pure destination policy feeds Markdown token projection; the renderer emits typed actions; the Event Monitor owns effects. No new abstraction or layer is introduced.

## Change / Refactor Sequence

1. Modify `resolveEventMonitorMarkdownFileDestination()` so a successfully normalized bare absolute destination with `Unsupported` preview type returns `invalid-file` with the raw destination retained only in the transient result.
2. Add policy tests for DMG/ZIP/PKG/unknown bare absolute destinations and keep supported bare destinations valid.
3. Add renderer tests that mount the reported Markdown, assert the authored label remains, assert no anchor/action/raw destination is emitted, and attempt pointer/keyboard activation without a `file-path-action` event. Preserve existing supported/external/generic tests.
4. Optionally update the existing Event Monitor/file-explorer docs wording to cover bare absolute unsupported destinations explicitly; no source/runtime contract changes are required.
5. Run focused policy/renderer Vitest suites and implementation-scoped frontend checks; inspect the diff for no new filesystem or navigation bypass.
6. Hand implementation to source review, then API/E2E for browser-level coverage decision. No migration, compatibility shim, or legacy file removal is needed beyond decommissioning the ordinary unsupported-local anchor projection.

## Key Tradeoffs

- **Inert span vs. actionable artifact opener:** Inert span follows the existing FileViewer-supported policy and avoids unsafe/ambiguous OS behavior; opening DMG/ZIP would be a larger capability.
- **Policy branch vs. renderer special case:** A policy result keeps destination semantics centralized and lets the existing renderer branch handle all invalid local references consistently.
- **Preserve authored label vs. expose raw path:** Label preservation keeps message readability while sanitization and no `href` prevent misleading navigation or raw local path exposure.

## Risks

- A user who intended an absolute app route in Event Monitor Markdown will no longer receive a browser anchor when its extension is unsupported; existing Event Monitor absolute-path policy and documented file-reference semantics make that a deliberate, bounded tradeoff.
- Unsupported artifacts remain non-openable from the Event Monitor after this fix. That is a known out-of-scope limitation, not a regression in preview support.
- Test coverage is primarily component/policy-level; API/E2E should decide whether a live browser validation is proportionate after implementation review.

## Guidance For Implementation

- Make the smallest change in `absoluteFilePathAction.ts`; do not add a new union member or duplicate type list.
- Use the existing `invalidFileDestination(rawDestination)` helper after `normalizeAbsoluteFilePath()` succeeds and `determineFilePreviewType()` returns `Unsupported`.
- Do not alter `MarkdownRenderer.vue` unless tests reveal the existing `invalid-file` span path cannot handle bare destinations; the intended path is already implemented.
- Add table-driven policy tests and a renderer test for the exact user example plus at least ZIP/PKG/unknown neighbors.
- Assert both positive and negative outcomes: supported `/tmp/report.md` still emits action; unsupported `.dmg`/`.zip` emits no anchor/action; HTTP(S) and generic opt-out behavior stay intact.
- Keep raw destination transient; do not add it to `data-*` attributes, persisted state, preview requests, or external opener calls.
- No implementation-handoff artifact is created at this stage; `implementation_engineer` owns it after architecture approval and source changes.
