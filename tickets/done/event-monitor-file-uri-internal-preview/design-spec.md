# Design Spec

## Current-State Read

The finalized predecessor established a scoped Event Monitor capability in the shared Markdown pipeline. `AgentEventMonitor.vue` enables it, `useMarkdownSegments.ts` creates typed `AbsoluteFilePathAction` records from raw tokens, `MarkdownRenderer.vue` owns delegated activation, and `useEventMonitorFilePreview.ts` owns desktop, Electron, remote-workspace, and mobile preview coordination.

The remaining gap is protocol-form Markdown links. `normalizeMarkdownLinkPath()` decodes a raw `href` and sends it to `normalizeAbsoluteFilePath()`, which accepts POSIX/Windows absolute paths but not a string beginning with `file:`. `resolveExternalHttpUrl()` accepts only HTTP(S), so an unrecognized `file:` anchor can retain browser/native default navigation. The raw `link_open` token is available before sanitization, and the existing preview launcher/trusted content owners are correct and will be reused.

## Intended Change

Add a pure, Event Monitor-scoped `file:///` destination parser to the existing absolute-path policy.

1. At the raw `link_open` token, classify the destination as `not-file`, `valid-supported-file`, or `invalid-file`. Runtime workspace mapping is deliberately not part of this pure render-time classification.
2. For valid supported destinations, decode once, normalize to a POSIX or Windows drive-absolute path, register the existing action descriptor, and render the compact authored-label action.
3. For invalid `file:` destinations, preserve rendered child content but render an inert non-anchor shell in Event Monitor mode. It must not be focusable, keyboard actionable, or passed to generic external-link handling.
4. Preserve the existing `file-path-action` event and `useEventMonitorFilePreview().openPath(action)` boundary.
5. Keep the capability default-off and leave ordinary Markdown, non-file links, and bare absolute-path behavior unchanged.

## Relevant Behavior And Production-Path Map

| Behavior ID | Required outcome | Target path |
| --- | --- | --- |
| BEH-URI-001 | Recognize valid supported file URIs from raw tokens | `useMarkdownSegments` -> URI utility -> action registry |
| BEH-URI-002 | Invalid file URIs are inert, not browser/native links | renderer token metadata -> delegated event guard |
| BEH-URI-003 | Valid URI keeps authored label and opens read-only Files when an owner is available | action anchor -> `MarkdownRenderer` -> existing launcher |
| BEH-URI-004 | Shared completeness and supported-type policy applies | URI utility -> `normalizeAbsoluteFilePath` -> `fileTypePolicy` |
| BEH-URI-005 | Raw destination is retained without href authorization | action model -> safe action ID/data marker |
| BEH-URI-006 | Electron/remote/mobile boundaries remain authoritative | `useEventMonitorFilePreview` -> existing owners |
| BEH-URI-007 | No passive filesystem or panel effects | computed render model only; launcher only on event |
| BEH-URI-008 | Non-file and non-Event-Monitor links remain compatible | existing generic Markdown/external-link path |
| BEH-URI-009 | A valid but remote-unmapped URI returns host-only/unavailable without a preview request | launcher mapping branch -> status return before File Explorer/mobile request |

## Relevant Supplemental Task Artifacts

- [`user-verification-file-uri-display-preservation-report.md`](./user-verification-file-uri-display-preservation-report.md) records the user-approved valid-label/internal-preview versus lexical-invalid-inert behavior and the clarified remote-unmapped activation status; it supports REQ-URI-003/004/010 and AC-URI-005/006/009.

## Task Design Health Assessment

- **Change posture:** Feature extension plus navigation-safety correction.
- **Root cause:** Local implementation gap at the raw Markdown protocol parser and delegated invalid-file event boundary.
- **Refactor posture:** No broad refactor is needed. The existing render model, action registry, preview launcher, and FileViewer owner are healthy for this scope.
- **Residual risk:** URL parsing for Windows drive paths and sanitizer treatment of custom markers require focused tests and browser validation.

## Terminology

- **Raw destination:** The Markdown token's authored destination before browser URL resolution or sanitization.
- **Valid file URI:** Case-insensitive `file` scheme, empty authority, no query/fragment, decodable absolute path, no forbidden placeholder/traversal component, and supported FileViewer type.
- **Invalid file URI:** Any `file:` destination failing URI syntax, authority, path, completeness, or supported-type policy; displayed but inert in Event Monitor mode.
- **Action descriptor:** Typed in-memory `AbsoluteFilePathAction` resolved by action ID; it is not an authorization grant.

## Legacy Removal Policy

- Remove Event Monitor's implicit fall-through for unrecognized `file:` links; browser/native navigation is not retained as compatibility behavior.
- Do not classify `anchor.href` or add a compatibility wrapper around it.
- Do not alter generic Markdown behavior when `enableEventMonitorFileActions` is false.
- Do not add a second visible action button or viewer.

## Persisted Data / State Transition Decision

- **Outcome:** Directly usable — no migration.
- No persisted schema, route, artifact, reference, or file-record changes are required.
- Action descriptors, open tabs, panel state, and mobile pending requests remain in-memory; existing tabs and structured ownership must be preserved.

## Data-Flow Spine Inventory

| Spine ID | Name | Governing owner |
| --- | --- | --- |
| D1 | Raw URI classification | `useMarkdownSegments` + pure path utility |
| D2 | Sanitized visual render | MarkdownIt renderer + DOMPurify |
| D3 | Explicit user activation | `MarkdownRenderer.vue` |
| D4 | Environment-specific preview | `useEventMonitorFilePreview.ts` and existing stores |
| D5 | Activation return/status | `AgentEventMonitor.vue` |
| D6 | Bounded pure URI/path policy loop | `absoluteFilePathAction.ts` + `fileTypePolicy.ts` |

## Primary Execution Spine(s)

### D1/D2 — Parse, classify, render

During the existing inline-token decoration pass, `link_open` inspects raw `href` only when Event Monitor actions are enabled. The pure result is a three-way object equivalent to `{ kind: 'not-file' }`, `{ kind: 'valid', normalizedPath, rawDestination }`, or `{ kind: 'invalid-file', rawDestination }`.

For valid results, registration creates the existing action descriptor with `sourceKind: 'markdown-link'`, optional `rawDestination`, canonical path, display label, and preview type. For invalid results, matching link tokens receive inert metadata. No store lookup, fetch, or filesystem probe occurs. Workspace mapping is not consulted during this pure render phase.

Renderer rules choose an ordinary Markdown anchor, a valid action anchor with a safe action ID and `href="#"`, or an inert non-anchor shell with the same child token content. DOMPurify continues to sanitize the result; only action IDs and boolean inert markers are emitted into HTML.

### D3/D4/D5 — Activation and preview

`MarkdownRenderer` handles valid actions before generic anchors: prevent default, stop propagation, and emit `file-path-action`; Enter and Space use the same path. Invalid markers are consumed as inert and emit nothing. `AgentEventMonitor` invokes the existing launcher only after explicit activation. The launcher continues to select trusted Electron local access or active-workspace mapping. If a syntactically valid supported action cannot map in a browser/remote/mobile runtime, the launcher returns the existing localized host-only/unavailable result before `fileExplorerStore.openFilePreview`, mobile preview request, Files-panel switching, or content fetch. When an owner is available, it requests the existing read-only Files preview and mobile inline request bridge.

## Spine Actors / Main-Line Nodes

1. `AgentEventMonitor.vue` — Event Monitor capability and launcher entry.
2. `AgentConversationFeed` and message segments — capability propagation only.
3. `MarkdownRenderer.vue` — DOM action/inert semantics and event authority.
4. `useMarkdownSegments.ts` — raw token decoration, action registry, sanitized model.
5. `absoluteFilePathAction.ts` — pure URI/path grammar and path/type policy.
6. `useEventMonitorFilePreview.ts` — environment locator and read-only preview.
7. Existing File Explorer/Electron/server owners — bytes and authorization.

## Ownership Map

| Concern | Owner | Forbidden shortcut |
| --- | --- | --- |
| Raw destination parsing | `useMarkdownSegments` + pure utility | Browser-resolved `anchor.href` authorization |
| Supported type | `fileTypePolicy.ts` | Infer unknown binaries as text |
| Sanitized markers | `useMarkdownSegments` | Put raw filesystem paths in executable HTML |
| DOM semantics | `MarkdownRenderer.vue` | Let invalid file links reach default navigation |
| Preview selection | `useEventMonitorFilePreview.ts` | Renderer filesystem reads/new route |
| Bytes | trusted Electron/workspace owners | Treat UI classification as authorization |

## Thin Entry Facades / Public Wrappers

`AgentEventMonitor` remains a thin launcher facade. `MarkdownRenderer` remains a DOM/event facade. Neither parses filesystem paths or reads files. `useEventMonitorFilePreview` remains the preview coordinator, not a Markdown parser.

## Removal / Decommission Plan

1. Replace only the current absolute-path-only Markdown-link decision with the three-way protocol-aware result.
2. Remove Event Monitor's ability to leave an unrecognized `file:` anchor with default navigation.
3. Retain ordinary anchor output for non-file links and for renderer instances without the capability.
4. No persisted migration or compatibility cleanup is required.

## Return Or Event Spine(s)

- Valid pointer/keyboard activation -> `file-path-action` -> launcher -> existing `opened` or localized `unavailable`/`failed` status.
- Invalid file activation -> no emitted action; event is consumed/inert.
- Non-file activation -> existing HTTP(S) external-link path.

## Bounded Local / Internal Spines

### D6 / DS-006 URI normalization

1. Detect a case-insensitive `file:` scheme.
2. Parse URI syntax; require empty authority, no query, and no fragment.
3. Decode the URL path exactly once and normalize encoded Windows separators where appropriate.
4. Convert `file:///C:/...` to `C:/...`; retain `/Users/...` as POSIX.
5. Run `normalizeAbsoluteFilePath` to reject NUL, root-only, `.`, `..`, `...`, and Unicode `…` components.
6. Run `determineFilePreviewType`; return valid only for supported families.

This loop is pure and must not call stores, Electron APIs, network, or filesystem APIs.

Mapping availability is intentionally outside D6/DS-006. A valid D6 result remains a valid action. The existing activation launcher performs the runtime mapping check; an absent browser/remote mapping returns a localized host-only/unavailable status before any Files/mobile/content request.

## Off-Spine Concerns Around The Spine

- Accessibility: valid actions retain keyboard semantics and focus, including when activation will report remote unavailability; lexical-invalid links are not focusable and expose no action label.
- Localization: reuse existing accessible open-file, unavailable, and failure strings.
- Sanitization: test post-DOMPurify markers and keep canonical paths out of HTML.
- Copying: preserve authored labels/source text and never insert visible action phrases.
- Responsive behavior: reuse predecessor mobile presentation; add no overlay/full-screen path.
- Browser compatibility: validate URL parsing in unit tests and a real browser.

## Ownership Boundaries

Presentation classification is separate from authorization. A valid URI is only eligible for activation. Electron/native or workspace-relative owners revalidate path safety and content access. Invalid display is a renderer concern and does not create an unavailable content request.

## Boundary Encapsulation Map

| Boundary | Input | Output | Validation |
| --- | --- | --- | --- |
| Markdown token -> policy | raw destination | typed resolution | pure URI/path/type policy |
| Policy -> HTML | action ID/inert marker | sanitized data marker | allowlisted marker names |
| DOM -> Vue action | explicit event | typed action or no-op | marker lookup, never href classification |
| Launcher -> File Explorer | typed action | read-only preview result | Electron/workspace validation |
| File Explorer -> bytes | canonical locator | viewer content/error | trusted native/server boundary |

## Dependency Rules

- The pure URI utility may depend on existing absolute-path and preview-type policy, but not Vue, stores, Electron, network, or filesystem APIs.
- `useMarkdownSegments` may register markers, but not open previews.
- `MarkdownRenderer` may emit actions and neutralize lexical-invalid markers, but not resolve workspace roots or read files.
- `useEventMonitorFilePreview` may coordinate stores/environment, but not parse raw Markdown or inspect DOM hrefs.
- No new path-bearing HTTP API, IPC channel, or persistence layer is permitted.

## Interface Boundary Mapping

The policy utility should expose a narrow function equivalent to `resolveEventMonitorMarkdownFileDestination(rawDestination)` returning one of `not-file`, `valid` with `normalizedPath` and `previewType`, or `invalid-file`. The name may follow repository conventions, but the three-way result is required so invalid `file:` links cannot be confused with ordinary links.

The existing descriptor may gain optional provenance: `rawDestination?: string`, alongside its existing `id`, `rawCandidate`, `normalizedCandidate`, `sourceKind`, `displayLabel`, and `previewType`. Raw destination is provenance, not a trust token; existing bare-path callers remain valid without it.

Render markers remain narrow:

- valid: existing `data-event-monitor-file-action-id` and control marker;
- invalid: a non-secret `data-event-monitor-invalid-file-link="true"` marker or equivalent internal token metadata, with no raw destination in HTML.

## Interface Boundary Check

- No generic arbitrary URL interface is introduced.
- No browser-resolved URL is treated as an authorization identity.
- Invalid markers are local to Event Monitor rendering and are not exposed to generic Markdown consumers.
- The action event remains typed and uses the established launcher.

## Main Domain Subject Naming Check

The subject remains an **Event Monitor Markdown file link**. `AbsoluteFilePathAction` is the correct action subject because bare absolute paths and URI destinations resolve to the same preview identity. Source kind and optional raw destination preserve provenance without creating a second action model.

## Existing Capability / Subsystem Reuse Check

Reuse `absoluteFilePathAction.ts`, `fileTypePolicy.ts`, `useMarkdownSegments.ts`, `MarkdownRenderer.vue`, `useEventMonitorFilePreview.ts`, the existing FileViewer, File Explorer tabs, Electron trust boundary, and workspace routes. Reject direct `window.open(fileUri)`, a second viewer, raw absolute-path server access, render-time existence probes, and a visible duplicate action button.

## Subsystem / Capability-Area Allocation

| Capability area | Allocation |
| --- | --- |
| URI/path policy | Existing `utils/eventMonitorFilePaths` |
| Markdown model | Existing `useMarkdownSegments` |
| DOM activation | Existing `MarkdownRenderer` |
| Preview | Existing `useEventMonitorFilePreview` |
| Content access/viewing | Existing File Explorer/Electron/server owners |
| Tests | Existing utility and MarkdownRenderer suites; downstream API/E2E owns durable execution decisions |

## Draft File Responsibility Mapping

1. `absoluteFilePathAction.ts` — pure file-URI resolution and optional raw-destination provenance.
2. `useMarkdownSegments.ts` — raw link classification, valid/inert token metadata, sanitization.
3. `MarkdownRenderer.vue` — visual shells and event ordering/accessibility.
4. Existing launcher — unchanged owner; regression tests only if needed.
5. Existing test suites — policy, render, keyboard, inert, and compatibility contracts.

## Reusable Owned Structures Check

Reuse `AbsoluteFilePathAction` and `MarkdownRenderModel.fileActions`. A separate `FileUriAction` would duplicate preview identity. A private three-way parser result is the only new structure needed; runtime mapping failure is represented by the existing launcher result, not by a fourth render marker.

## Shared Structure / Data Model Tightness Check

The descriptor carries canonical path, preview type, source kind, and optional raw destination. It does not carry arbitrary hrefs, DOM nodes, workspace metadata, or authorization state. Raw provenance remains optional and is never emitted into executable HTML.

## Final File Responsibility Mapping

| File | Responsibility | Must not own |
| --- | --- | --- |
| `utils/eventMonitorFilePaths/absoluteFilePathAction.ts` | URI/path/type policy | DOM, stores, filesystem |
| `composables/useMarkdownSegments.ts` | Token classification and sanitized model | Preview opening, authorization |
| `components/.../MarkdownRenderer.vue` | DOM/event semantics | Path policy, filesystem |
| `composables/useEventMonitorFilePreview.ts` | Existing preview coordination | Markdown parsing/DOM hrefs |
| Existing `__tests__` files | Durable unit/component contracts | Production behavior |

## Applied Patterns

- Opt-in capability with generic Markdown unchanged.
- Raw-token model before browser resolution/sanitization.
- Opaque typed action IDs in HTML.
- Explicit activation only.
- Trusted native/server boundary for bytes.
- Clean-cut inert fallback for invalid Event Monitor file links.

## Target Subsystem / Folder / File Mapping

```text
autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts
  pure file:/// parser + existing canonical path/type policy
autobyteus-web/composables/useMarkdownSegments.ts
  raw link resolution + valid/inert token metadata
autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue
  valid action and inert-link DOM/event semantics
autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts
  URI grammar/normalization tests
autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts
  sanitized render, label, keyboard, inert, and compatibility tests
```

No Electron/server path is expected to change unless source review finds a concrete predecessor regression.

## Folder Boundary Check

All new policy remains under the existing Event Monitor path utility, Markdown render boundary, and test suites. No generic URL helper or File Explorer viewer folder is widened.

## Concrete Examples / Shape Guidance

Valid:

`[requirements.md](file:///Users/normy/project/requirements.md)` renders the authored `requirements.md` as the compact underlined action. Activation emits canonical `/Users/normy/project/requirements.md`; it does not open the browser.

Invalid or unsupported:

`[report.md](file:///Users/normy/.../report.md)` and `[archive.zip](file:///tmp/archive.zip)` preserve visible Markdown child content, render no valid action, and consume Event Monitor activation as inert. No browser/native handler, Files switch, Electron read, or workspace request occurs.

Valid but remote-unmapped:

`[report.md](file:///Users/name/another-workspace/report.md)` is lexically valid and supported, so it retains the normal valid action affordance. On explicit activation, the existing launcher reports the localized host-only/unavailable result before opening Files, requesting mobile preview, or fetching workspace content. It is not rendered as a lexical-invalid inert link.

Non-file compatibility:

`[Docs](https://example.test/docs)` and `[relative](docs/report.md)` return `not-file`; current generic behavior remains.

## Backward-Compatibility Rejection Log

| Rejected approach | Reason |
| --- | --- |
| Classify `anchor.href` | Browser resolution loses the authored raw-token contract. |
| Let invalid `file:` links fall through | This is the reported browser/native UX and safety defect. |
| Treat a valid but remote-unmapped URI as lexical-invalid during render | Mapping depends on runtime workspace context; the existing launcher can return a safe status without a preview/content request. |
| Treat `file://host/...` as local | URI authority is not an authorization grant. |
| Probe filesystem during render | Breaks purity, remote safety, and passive-render guarantees. |
| Add a second action/viewer model | Duplicates predecessor identity and ownership. |
| Keep visible `Open in Files` wording | Conflicts with the approved compact label UX. |
| Broaden generic Markdown behavior | Regresses FileViewer and other non-Event-Monitor surfaces. |

## Derived Layering

`raw Markdown destination -> pure URI/path/type resolution -> typed action OR inert marker -> sanitized HTML shell -> explicit DOM event -> existing Event Monitor launcher -> trusted Electron/workspace content owner`.

No layer skips from a raw URI directly to browser navigation or bytes.

## Change / Refactor Sequence

1. Add utility tests for empty authority, POSIX/Windows output, encoding, malformed inputs, placeholders, query/fragment/host rejection, and supported types.
2. Implement the pure three-way resolver and optional action provenance; do not add runtime mapping to render-time classification.
3. Extend raw token decoration to register valid actions and mark invalid file links.
4. Render valid action/inert shells and enforce event ordering before generic HTTP(S) handling.
5. Run focused component tests for authored labels, no visible action words/button, raw-token emission, invalid inert behavior, keyboard activation, and generic compatibility.
6. Run implementation checks and hand off for source review.
7. After source review, API/E2E must validate browser behavior, Electron/native non-navigation, remote mapping, and no-read/no-persistence outcomes.

## Key Tradeoffs

- **Empty authority only:** Narrower than every RFC file URI form, but avoids treating another host as an authorized local path.
- **Three-way resolution:** Explicitly distinguishes inert lexical-invalid `file:` links from ordinary links; runtime mapping failure remains an activation-time launcher result.
- **Inert non-anchor shell:** Changes invalid-link DOM semantics but preserves visible child content and guarantees no default navigation or keyboard activation.
- **Optional raw provenance:** Keeps canonical action identity while retaining raw-token evidence without exposing it in HTML.
- **No render-time existence check:** Preserves performance and trusted activation boundaries.
- **Activation-time unavailable status:** Preserves the existing safe host-only result without making render-time Markdown depend on workspace context.

## Risks

- Windows drive and encoded backslash handling may differ between JSDOM, browser, and Electron; lock canonical output with tests and browser validation.
- DOMPurify may strip custom inert markers; test post-sanitization DOM.
- Nested formatted/image labels must preserve child token rendering when the anchor shell changes.
- Existing generic `file:` fixtures must remain unchanged with capability disabled.

## Guidance For Implementation

- Prefer an explicit result kind over a permissive regex that strips `file:` text.
- Parse raw destinations before `mdWithPrism` rendering and DOMPurify.
- Keep action IDs opaque in HTML and resolve descriptors in Vue.
- For invalid Event Monitor links, remove anchor navigation semantics rather than relying only on pointer `preventDefault`.
- Use `action.displayLabel` for visible text and existing localized metadata for assistive context.
- Do not modify `useEventMonitorFilePreview` unless a test proves a predecessor regression; this ticket ends at the existing typed launcher boundary.
