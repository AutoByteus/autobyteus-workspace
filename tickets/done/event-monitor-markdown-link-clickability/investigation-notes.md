# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated ticket worktree created from refreshed `origin/personal`.
- Current Status: `Design-ready` investigation complete; solution package ready for architecture review.
- Investigation Goal: Establish why some Event Monitor Markdown links render visually as links without a usable click action, define the supported link contract, and produce a design-ready fix.
- Scope Classification (`Small`/`Medium`/`Large`): `Small`.
- Scope Classification Rationale: One pure destination-policy branch and focused frontend tests; no API, persistence, or runtime launcher change.
- Scope Summary: Event Monitor Markdown link classification/rendering for unsupported absolute local artifact destinations, especially DMG/ZIP/PKG, with regression protection for supported paths and HTTP(S) links.
- Primary Questions To Resolve:
  - Which component/parser renders Event Monitor content? **Resolved.**
  - How are link destinations classified and click handlers attached? **Resolved.**
  - Why does `[DMG](/absolute/path/to/file.dmg)` look actionable but fail to activate? **Resolved.**
  - Which links are intentionally clickable today and what should remain unchanged? **Resolved.**

## Request Context

The user reports that delivery output such as `[DMG](/absolute/path/to/file.dmg)` is rendered by the Event Monitor as a clickable-looking link, but it is not actually clickable. They believe only a limited subset of links are truly clickable and ask why.

The existing product contract in `autobyteus-web/docs/content_rendering.md` and `autobyteus-web/docs/file_explorer.md` says Event Monitor file actions are opt-in, supported preview families use a typed read-only preview action, and unsupported archive/installer/binary types remain literal and inert. The implementation currently fails to apply that inert treatment to unsupported *bare absolute Markdown destinations*.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability`
- Current Branch: `codex/event-monitor-markdown-link-clickability`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-07-30; `origin/HEAD -> origin/personal`.
- Task Branch: `codex/event-monitor-markdown-link-clickability`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal` after delivery review.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` contained unrelated dirty changes; authoritative work is isolated here. Test dependencies and generated Nuxt types were reused from the clean shared checkout through temporary ignored symlinks for local investigation only; no dependency files were changed.

## Supplemental Task Artifact Inventory

No supplements are needed. The core artifacts contain the evidence and intended behavior; no separate screenshot, probe result, or UI specification materially improves this small classification fix.

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-30 | Setup | `git fetch origin --prune` | Refresh tracked refs before creating task worktree | Remote default is `origin/personal`; refresh succeeded. | No |
| 2026-07-30 | Command | `git worktree add -b codex/event-monitor-markdown-link-clickability /Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability origin/personal` | Create isolated authoritative task workspace | Dedicated clean worktree created from latest tracked remote base. | No |
| 2026-07-30 | Code | `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Identify Event Monitor entrypoint and action boundary | Passes `enable-event-monitor-file-actions="true"` to the conversation feed and handles typed `file-path-action` by launching `useEventMonitorFilePreview().openPath(action)`. | No |
| 2026-07-30 | Code | `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue`, `autobyteus-web/components/conversation/AIMessage.vue`, `autobyteus-web/components/conversation/segments/{TextSegment,ThinkSegment,InterAgentMessageSegment,SystemTaskNotificationSegment}.vue` | Trace the flag and event through the segment chain | The opt-in flag is forwarded to `MarkdownRenderer`; action events bubble back without each segment opening files. | No |
| 2026-07-30 | Code | `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Inspect rendered DOM and click handling | Delegated `handleFileAction` handles only render-scoped action IDs; ordinary anchors are passed to `resolveExternalHttpUrl`, which only accepts HTTP(S). | No |
| 2026-07-30 | Code | `autobyteus-web/composables/useMarkdownSegments.ts` | Inspect Markdown token decoration and invalid-link rendering | Supported file destinations become action anchors with `href="#"`; `invalid-file` destinations become span text. Unsupported bare absolute destinations currently remain ordinary anchors because the policy returns `not-file`. | No |
| 2026-07-30 | Code | `autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts` | Inspect destination classification and action registration | `resolveEventMonitorMarkdownFileDestination()` normalizes a bare absolute destination, calls `determineFilePreviewType()`, and returns `not-file` when preview type is `Unsupported`; `file:` invalid cases return `invalid-file`. | No |
| 2026-07-30 | Code | `autobyteus-web/utils/fileExplorer/fileTypePolicy.ts` | Verify supported preview families | `.dmg`, `.zip`, `.pkg`, `.app`, generic binaries, and unknown extensions are `Unsupported`; supported text/media/PDF/CSV/Excel families are explicit. | No |
| 2026-07-30 | Doc | `autobyteus-web/docs/content_rendering.md` | Verify documented Event Monitor action contract | Event Monitor-only actions are opt-in; unsupported archives/installers/binaries remain literal/source-faithful with no Files affordance. | No |
| 2026-07-30 | Doc | `autobyteus-web/docs/file_explorer.md` | Verify raw link and runtime safety contract | Unsupported raw `file:` destinations are documented as literal and inert; no generic browser navigation should be used for unsupported local file references. | No |
| 2026-07-30 | Test | `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` | Inspect existing renderer coverage | Existing tests cover supported bare paths, supported/invalid `file:` URIs, unsupported prose/fenced paths, external links, keyboard action, and generic opt-in isolation; no unsupported bare absolute Markdown-link case exists. | No |
| 2026-07-30 | Test | `autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts` | Inspect pure policy coverage | Existing tests assert unsupported `file:` URI invalidity and `createAbsoluteFilePathAction()` returns null for `.dmg`/archives, but do not assert unsupported bare Markdown destinations. | No |
| 2026-07-30 | Command | `pnpm -C autobyteus-web exec vitest --run components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` | Establish current focused baseline | 17 tests passed in the clean source state after temporary dependency/type setup. | No |
| 2026-07-30 | Probe | Temporary Vitest mount of `MarkdownRenderer` with content `[DMG](/absolute/path/to/file.dmg)` and actions enabled | Observe actual current DOM | Output was `<p><a href="/absolute/path/to/file.dmg">DMG</a></p>`; the anchor had no Event Monitor action ID/class. | No |
| 2026-07-30 | History | `git log --oneline -- autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue autobyteus-web/utils/eventMonitorFilePaths` and commits `47fd56803`, `66185f725`, `46b9b8e13`, `bc1edf63f`, `c489f92da` | Confirm the current action policy was deliberate and identify regression seam | Prior work added scoped previews, gated actions by shared supported type policy, neutralized invalid file URIs, and retained compact action links. The missing branch is localized to bare unsupported destination classification. | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User views central Event Monitor content containing `[DMG](/absolute/path/to/file.dmg)` or another absolute local Markdown destination. | `AgentEventMonitor` enables the action capability -> `AgentConversationFeed` forwards it through `AIMessage`/segment components -> `MarkdownRenderer` calls `useMarkdownSegments` -> raw link token is classified -> sanitized HTML is injected into the Event Monitor. A click bubbles to `MarkdownRenderer.handleLinkClick`. | Current unsupported `.dmg` destination becomes an ordinary anchor with root-relative `href`; no action ID is registered, no `file-path-action` event is emitted, and only HTTP(S) anchors are routed to the external opener. The visual `prose a` styling creates a false affordance; native anchor behavior may attempt application navigation rather than file access. | `AgentEventMonitor.vue`, `MarkdownRenderer.vue`, `useMarkdownSegments.ts`, `absoluteFilePathAction.ts`; temporary Vitest probe on 2026-07-30. |
| BEH-002 | User | User views/activates a supported local destination such as `[report.md](/tmp/report.md)` in the central Event Monitor. | Same Event Monitor/segment chain -> `useMarkdownSegments` resolves a valid supported path -> registers render-scoped action ID -> `MarkdownRenderer` replaces anchor `href` with `#` and delegates pointer/keyboard activation -> `AgentEventMonitor` launches `useEventMonitorFilePreview` -> desktop/browser/mobile FileViewer route. | Explicit activation only; type policy and runtime mapping decide whether preview opens or shows unavailable/failed status. Rendering itself does not read bytes or open panels. | `useMarkdownSegments.ts`, `MarkdownRenderer.vue`, `AgentEventMonitor.vue`, `useEventMonitorFilePreview.ts`, renderer tests, `docs/file_explorer.md`. |
| BEH-003 | User | User views/activates an HTTP(S) Markdown link in the central Event Monitor. | `MarkdownRenderer` receives ordinary anchor -> `resolveExternalHttpUrl` accepts only HTTP(S) -> `openExternalLink` uses the Electron bridge or `window.open`. | External links remain ordinary Markdown content and are not treated as local file actions. | `MarkdownRenderer.vue`, `externalHttpLink.ts`, renderer external-link tests. |
| BEH-004 | Contract | Non-Event-Monitor Markdown consumer does not pass `enableEventMonitorFileActions`. | Segment/component -> `MarkdownRenderer` -> `useMarkdownSegments` without action decoration -> normal sanitized Markdown output. | File paths and `file:` links do not gain Event Monitor action controls outside the opt-in surface. | `MarkdownRenderer.vue`, renderer generic isolation test, `docs/content_rendering.md`. |
| BEH-005 | Contract | Event Monitor file-action policy accepts only FileViewer-supported families. | Destination normalization -> shared `determineFilePreviewType()` -> action registration only when type is not `Unsupported`. | Supported text/image/audio/video/PDF/CSV/Excel families can become actions; DMG/ZIP/PKG/application bundles/generic binaries/unknown extensions do not. | `fileTypePolicy.ts`, `absoluteFilePathAction.ts`, policy tests, docs, prior commit `66185f725`. |

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Local Implementation Defect`
- Refactor posture evidence summary: The correct ownership already exists. `absoluteFilePathAction.ts` owns destination classification, `useMarkdownSegments.ts` owns token-to-DOM projection, `MarkdownRenderer.vue` owns delegated activation, and `AgentEventMonitor.vue` owns preview launch. Only unsupported bare absolute destinations fail to enter the existing invalid-file projection.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `absoluteFilePathAction.ts` and `fileTypePolicy.ts` | Unsupported file types intentionally produce no `AbsoluteFilePathAction`. | Do not expand the preview type policy; add the missing inert classification at the same policy boundary. | No |
| `useMarkdownSegments.ts` | `invalid-file` already maps to `<span>` and suppresses raw destination exposure. | Reuse existing renderer branch; no new component or event protocol. | No |
| `MarkdownRenderer.vue` | Only action IDs and HTTP(S) links have explicit delegated behavior. | Unsupported local anchors must not survive as ordinary anchors. | No |
| `docs/content_rendering.md` / `docs/file_explorer.md` | Product contract says unsupported local artifacts remain literal/inert and raw file URLs do not fall through to generic browser navigation. | Current bare-link output violates documented behavior. | No |
| Existing tests | Supported local, invalid file URI, unsupported prose/fenced, external, keyboard, and generic isolation cases pass; reported shape is uncovered. | Add a narrow utility and renderer regression pair. | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Event Monitor surface and preview launcher boundary | Enables file actions and launches `useEventMonitorFilePreview` only after typed event. | Remains the authoritative side-effect boundary; no change required. |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Forwards Event Monitor file-action capability/events into message rendering | Pass-through only. | Remains a thin propagation boundary. |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Renders sanitized Markdown and delegates link/action events | Already renders `invalid-file` spans and handles action IDs/HTTP(S). | Reuse current inert branch; no new handler or side effect. |
| `autobyteus-web/composables/useMarkdownSegments.ts` | Tokenizes, classifies, decorates, renders Markdown | Existing `invalid-file` metadata path is the correct projection. | No change expected unless implementation reviewer finds a renderer seam; policy result drives it. |
| `autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts` | Owns absolute path normalization and Markdown destination classification | Unsupported bare absolute path returns `not-file`, unlike unsupported `file:` URI. | Modify this policy owner to return `invalid-file` after successful absolute normalization and `Unsupported` type classification. |
| `autobyteus-web/utils/fileExplorer/fileTypePolicy.ts` | Shared FileViewer type eligibility | Correctly excludes DMG/ZIP/PKG/binaries/unknown extensions. | Reuse without modification. |
| `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` | Renderer behavioral tests | No bare unsupported Markdown-link coverage. | Add reported DOM and activation regression. |
| `autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts` | Pure destination/action policy tests | No unsupported bare-link classification coverage. | Add parameterized policy assertions. |
| `autobyteus-web/docs/file_explorer.md` | Documents Event Monitor preview and inert local-reference contract | The intended policy is present but raw bare-link wording is narrower than the code path under repair. | Delivery/docs sync may add a short clarification; no architecture change. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-30 | Test | `pnpm -C autobyteus-web exec vitest --run components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` | Current focused renderer suite passed: 17 tests. | Baseline is green; the reported shape lacks a test. |
| 2026-07-30 | Probe | Temporary colocated Vitest mount with `content: '[DMG](/absolute/path/to/file.dmg)'`, `enableEventMonitorFileActions: true`; logged `wrapper.html()` and anchor attributes. | Rendered HTML: `<p><a href="/absolute/path/to/file.dmg">DMG</a></p>`; anchor had no action class/id. | Visual link comes from generic Markdown/prose anchor styling, not Event Monitor action styling; no preview event can fire. |
| 2026-07-30 | Trace | Read `MarkdownRenderer.handleLinkClick` and `resolveExternalHttpUrl`. | File action IDs are handled first; only HTTP(S) ordinary links are explicitly opened. The local root-relative anchor is not converted to a file action. | The false affordance is a classification/projection mismatch, not a missing FileViewer launcher. |
| 2026-07-30 | Test/History | Read policy and renderer tests plus prior commits `47fd56803`, `66185f725`, `46b9b8e13`, `bc1edf63f`, `c489f92da`. | Existing design intentionally gates action creation by preview type and neutralizes invalid `file:` URIs. | Fix must preserve the clean-cut supported-type boundary and reuse the existing inert path. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None consulted.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A; local code and documentation are authoritative.
- Why it matters: No external behavior needs to be introduced.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None; component/policy tests reproduce the issue.
- Required config, feature flags, env vars, or accounts: `enableEventMonitorFileActions: true` in the component harness; no account or service.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; dedicated worktree creation; temporary ignored symlinks to the shared clean `node_modules` and generated `.nuxt` types so the worktree could run Vitest without reinstalling dependencies. The symlinks were not part of the task artifacts.
- Cleanup notes for temporary investigation-only setup: Temporary probe test and symlinked dependency/generated directories were moved outside the worktree; only ignored `.nuxt` symlink remains available for later local checks and is not tracked.

## Findings From Code / Docs / Data / Logs

- `MarkdownRenderer` uses `v-html` for sanitized Markdown. It adds Event Monitor action controls only when `useMarkdownSegments` registers an action ID.
- `resolveEventMonitorMarkdownFileDestination()` currently has three semantic outcomes: valid supported file action, invalid `file:` URI, or not-file. A bare absolute `.dmg` path enters the last branch after preview type gating.
- `mdWithPrism.renderer.rules.link_open` already checks `eventMonitorInvalidFileLink` and emits a span. `link_close` mirrors it. This is exactly the desired output shape for unsupported local artifact links.
- `determineFilePreviewType('/tmp/AutoByteus.dmg')` is `Unsupported`; `createAbsoluteFilePathAction()` returns `null` for that family. That policy is deliberate and tested.
- The reported DOM includes only the authored label and a root-relative `href`. The path is not a `file:` URI and is not a local filesystem opener, so the browser cannot treat it as a host artifact through this renderer.
- No database, message schema, API, or persisted locator changes are required.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Conversation/run-history source content may contain Markdown strings; rendering reads those strings at presentation time. No stored sample or schema is changed by this task.
- Relevant code-model, serialization, semantic, or physical-store change: None; only transient token classification and DOM projection change.
- Normal readers and writers, including unknown/extra-field behavior: Not affected; message readers/writers continue to store original content.
- Representative direct-read or compatibility evidence: N/A; no persisted model transition.
- Required semantics and invariants preserved by direct use: `Yes` — original source text and label remain intact; only unsupported local link interactivity/presentation changes.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: No migration, availability window, or rebuild. Removing raw local `href` from rendered DOM improves the existing safety contract.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Migration is not a candidate; there is no stored shape change.
- Existing migration framework or lifecycle constraints, only if migration may be required: N/A.

## Constraints / Dependencies / Compatibility Facts

- Use the existing shared FileViewer type policy; do not add `.dmg`, `.zip`, `.pkg`, application bundles, or arbitrary binaries to supported preview types.
- Keep action recognition opt-in to Event Monitor.
- Keep raw local/file URI provenance transient and out of rendered DOM attributes for invalid destinations.
- Preserve valid supported local actions, external HTTP(S) handling, invalid `file:` URI handling, source label readability, and generic Markdown consumers.
- The existing `invalid-file` renderer branch is the sole intended inert projection; no compatibility wrapper or alternate legacy path is needed.

## Open Unknowns / Risks

- Product behavior for an absolute root-relative application route embedded in an Event Monitor Markdown link is not separately documented. Current Event Monitor path policy treats absolute destinations as file candidates, and supported families already use Files preview; this fix makes only unsupported families inert and does not alter supported or ordinary relative/HTTP links.
- Manual GUI validation is not required to establish the pure DOM/policy defect, but API/E2E should decide whether a browser-level Event Monitor validation adds value after implementation review.
- The user may expect OS-level opening of a DMG/ZIP rather than an inert label. That would be a new capability requiring a separate security/runtime design; this task follows the existing approved no-preview policy and only removes the misleading affordance.

## Notes For Architecture Reviewer

The complete solution is intentionally small and reuses existing ownership: change one branch in the absolute Markdown destination policy, add policy and renderer tests, optionally clarify the existing docs. The architecture decision requested is `Pass` if this clean-cut inert classification is accepted; no requirement gap or design impact is expected unless the reviewer determines that unsupported artifacts should become OS-open actions instead.
