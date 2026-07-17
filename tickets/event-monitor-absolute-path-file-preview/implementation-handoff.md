# Implementation Handoff

## Ticket / Review Gate

- Ticket: `event-monitor-absolute-path-file-preview`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview`
- Branch: `codex/event-monitor-absolute-path-file-preview`
- Base: `origin/personal` at `fbd7b6764bd43751956d69ffe22b943d06188444`
- Architecture review: **Pass, round 2**
- Implementation status: **CR-F-006 local fix complete; resubmission required for implementation source review**

## Cumulative Reviewed Solution Package

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/design-spec.md`
- Intake/task context: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/task.md`
- Reference screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/event-monitor-absolute-path-reference.png`
- Architecture review: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/design-review-report.md`
- Implementation source review round 1: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/code-review-report.md`
- User verification report: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/user-verification-unsupported-file-preview-report.md`
- This implementation handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/implementation-handoff.md`

## What Changed

- Added pure POSIX/Windows absolute-path grammar, punctuation trimming, normalization, source-kind descriptors, and active-workspace containment mapping.
- Added an opt-in Markdown token/render-model capability. Raw Markdown destinations are classified before sanitization; sanitized DOM carries only render-scoped action IDs. Prose, inline code, and fenced-code controls remain adjacent to literal source text/code.
- Threaded the capability and typed `file-path-action` event through the Event Monitor conversation chain: `AgentEventMonitor -> AgentConversationFeed -> AIMessage/segment -> MarkdownRenderer`. Generic Markdown consumers remain default-off.
- Added an Event Monitor launcher that performs no work on message arrival, resolves embedded local versus active-workspace remote/mobile identity, requests the existing shared preview owner, opens the desktop panel idempotently, selects Files, and reports localized refusal/failure status.
- Added transient `FilePreviewAccessIntent` to the existing File Explorer preview path. Event Monitor opens force preview mode, hide edit controls, pass `readOnly=true`, and reuse existing tabs/viewer adapters without artifact/reference persistence.
- Added phone-first `MobileFilePreviewRequest` with revision/context/workspace matching. `MobileFiles` owns request consumption and selection; Event Monitor requests render the existing `MobileFileViewer` inline and suppress Attach. Manual mobile row taps retain their existing fullscreen/attach behavior.
- Centralized trusted Electron absolute/existence/readability/regular-file validation for both text IPC and `local-file://` media requests.
- Added localized English and Simplified Chinese action, host-availability, and preview-failure messages.

### Local Fix round after implementation source review

- CR-F-001: Local preview now requires the actual Electron `readLocalTextFile` bridge; the embedded-node sentinel alone routes through active-workspace containment mapping/refusal. File Explorer also refuses its local branch without the trusted bridge. Added text/media browser-sentinel regressions.
- CR-F-002: Raw Markdown link destinations decode before canonical normalization, while the raw href remains in the action descriptor. Added encoded-space POSIX/Windows action tests.
- CR-F-003: Fenced-code policy recognizes only unambiguous complete path lines and raw Markdown-link destinations, allowing literal spaces without changing rendered/copied code text. Added exact candidate/code-preservation tests.
- CR-F-004: Mobile mismatched requests are consumed, team focus changes clear pending requests, async completion rechecks revision/context/workspace before committing selection, and in-flight state resets on every exit/completion path. Added context-switch and async stale-request tests.
- CR-F-005: Action button labels are supplied by the localized render-time callback rather than an English HTML placeholder. Electron validation returns stable categories, and File Explorer maps those categories to localized failure messages instead of showing native OS errors.

### Bounded local fix after user Electron verification

- Added the pure `determineFilePreviewType()` policy in `utils/fileExplorer/fileTypePolicy.ts`, with the shared FileViewer family allowlist and deliberate `Unsupported` result for unknown extensions, archives, installers, application bundles, and binary artifacts.
- Routed `determineFileType()` through the shared policy and retained the existing FileViewer `Unsupported` state for non-Event-Monitor callers. Unsupported routing does not call text IPC, construct a local-file URL, or request workspace content.
- Gated `createAbsoluteFilePathAction()` and all Markdown token action registration on the shared policy. Supported descriptors now carry `previewType`; unsupported candidates remain source-faithful text/code with no action ID/control. Generic Markdown remains default-off.
- Added regressions for `.dmg`, `.zip`, installers, archives, binary/unknown extensions, supported text/media families, exact fenced-code preservation, default-off rendering, and no-read/no-URL/no-workspace-fetch routing.

### Bounded local fix for implementation review CR-F-006

- Compared the shared Text policy against the existing `MobileFiles.vue` Markdown/code filter. Every existing code-family extension is present in the shared policy; `.lua` was the omitted supported family.
- Added `.lua` to the shared Text policy. `determineFileType('/tmp/script.lua')` now returns `Text`, action descriptors carry `previewType: 'Text'`, Event Monitor Markdown renders the Lua path action, and File Explorer routes it through the text reader rather than `Unsupported`.
- Added policy, action, MarkdownRenderer, and File Explorer regressions for the Lua path. Archive/installer/binary refusal behavior remains unchanged.

## Behavior Traceability

| Behavior | Implemented path | Outcome |
| --- | --- | --- |
| BEH-001 — Event-Monitor-only absolute actions and source preservation | `utils/eventMonitorFilePaths/absoluteFilePathAction.ts`; `utils/fileExplorer/fileTypePolicy.ts`; `composables/useMarkdownSegments.ts`; `MarkdownRenderer.vue`; segment/feed capability transport | Opt-in only. Supported POSIX/Windows links, prose, inline code, and fences receive explicit keyboard-accessible actions; unsupported archive/installer/binary candidates remain literal copyable text/code. |
| BEH-002 — Raw link destination and ordinary-link preservation | Raw `link_open` token metadata in `useMarkdownSegments`; ID lookup/delegation in `MarkdownRenderer.vue` | File actions never inspect browser-resolved `anchor.href`; HTTP(S) remains the existing external-link path; relative/non-file links remain ordinary Markdown. |
| BEH-003 — Shared transient read-only preview and dedupe | `fileExplorerContentActions.ts`; `fileExplorerState.ts`; `fileTypePolicy.ts`; `FileExplorerTabs.vue`; `FileViewer.vue` | Existing supported path tabs are reused/selected; Event Monitor intent forces preview, hides edit controls, and uses shared text/media/PDF/spreadsheet adapters. Unsupported candidates never enter this Event Monitor path. |
| BEH-004 — Desktop idempotent Files selection | `useEventMonitorFilePreview.ts`; `useRightPanel.ts`; `useRightSideTabs.ts`; active tab focus marker in `FileExplorerTabs.vue` | `openRightPanel()` sets visible rather than toggling; Files is selected after the preview request; no overlay or focus trap is created. |
| BEH-005 — Phone-first Files request/inline presentation | `types/mobileWork.ts`; `mobileWorkStore.ts`; `MobileFiles.vue`; `MobileFileViewer.vue` | Matching revision/context/workspace request selects the existing Mobile Files preview inline and read-only; stale/mismatched requests do nothing. |
| BEH-006 — Trusted embedded local boundary | `fileTypePolicy.ts`; `fileExplorerContentActions.ts`; `electron/localFileValidation.ts`; `electron/main.ts` | Unsupported types stop before local text/media routing; supported types still reach the trusted boundary, which rejects non-absolute, missing, unreadable, directory, and invalid paths before bytes are returned. |
| BEH-007 — Active-workspace-only remote/mobile mapping | `utils/fileExplorer/absoluteWorkspacePathMapping.ts`; `useEventMonitorFilePreview.ts`; existing workspace-relative File Explorer routes | Remote/mobile paths outside the active/context workspace return localized host-availability status; no arbitrary absolute-path endpoint is introduced. |
| BEH-008 — References/artifacts remain separate | No artifact/reference/persistence calls in the action or preview path | Incidental Event Monitor paths are transient File Explorer state only; structured Message references and Agent artifacts are untouched. |

## Key Source Changes

- Markdown capability and action transport:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/composables/useMarkdownSegments.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`
  - Segment/feed/AI transport files under `autobyteus-web/components/conversation/` and `autobyteus-web/components/workspace/agent/`
- Event Monitor orchestration:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/composables/useEventMonitorFilePreview.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/utils/fileExplorer/absoluteWorkspacePathMapping.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/utils/fileExplorer/localFileCapability.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/utils/fileExplorer/localFileError.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/utils/fileExplorer/fileTypePolicy.ts`
- Desktop preview and shell:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/stores/fileExplorerContentActions.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/stores/fileExplorerState.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/components/fileExplorer/FileExplorerTabs.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/components/fileExplorer/FileViewer.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/composables/useRightPanel.ts`
- Phone-first mobile:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/types/mobileWork.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/stores/mobileWorkStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/components/mobile/MobileFiles.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/components/mobile/MobileFileViewer.vue`
- Trusted native boundary and localization:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/electron/localFileValidation.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/electron/main.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/localization/messages/en/workspace.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/localization/messages/zh-CN/workspace.ts`

## Durable Tests Added / Updated

- `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts`
- `autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts`
- `autobyteus-web/utils/fileExplorer/__tests__/absoluteWorkspacePathMapping.spec.ts`
- `autobyteus-web/electron/__tests__/localFileValidation.spec.ts`
- `autobyteus-web/stores/__tests__/mobileWorkStore.spec.ts`
- `autobyteus-web/stores/__tests__/fileExplorerNodeRouting.spec.ts`
- `autobyteus-web/utils/fileExplorer/__tests__/fileUtils.test.ts`
- `autobyteus-web/components/mobile/__tests__/MobileFiles.spec.ts`

## Implementation-Scoped Validation

All checks below were run in this task worktree before the temporary dependency symlinks were removed. They are implementation checks only, not API/E2E sign-off.

- ✅ `pnpm --dir autobyteus-web exec nuxt prepare`
  - Nuxt preparation passed; generated `.nuxt` output is ignored and no dependency symlinks remain in the worktree.
- ✅ Focused Markdown/path/mobile component checks:
  - `pnpm --dir autobyteus-web exec vitest run utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts utils/fileExplorer/__tests__/absoluteWorkspacePathMapping.spec.ts components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts components/mobile/__tests__/MobileFileViewer.spec.ts components/mobile/__tests__/MobileFiles.spec.ts stores/__tests__/mobileWorkStore.spec.ts stores/__tests__/fileExplorerNodeRouting.spec.ts electron/__tests__/localFileValidation.spec.ts`
  - Result: `8 files, 38 tests passed`.
- ✅ Broader changed-chain/store/file checks:
  - `pnpm --dir autobyteus-web exec vitest run components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts components/conversation/__tests__/AIMessage.spec.ts components/workspace/agent/__tests__/AgentConversationFeed.spec.ts components/workspace/agent/__tests__/AgentEventMonitor.spec.ts components/fileExplorer/__tests__/FileExplorerTabs.spec.ts components/mobile/__tests__/MobileFiles.spec.ts components/mobile/__tests__/MobileFileViewer.spec.ts stores/__tests__/mobileWorkStore.spec.ts stores/__tests__/fileExplorerNodeRouting.spec.ts composables/__tests__/useRightPanel.spec.ts`
  - Result: `11 files, 52 tests passed`.
- ✅ Latest monitor/mobile regression rerun:
  - `pnpm --dir autobyteus-web exec vitest run stores/__tests__/mobileWorkStore.spec.ts components/mobile/__tests__/MobileFiles.spec.ts components/mobile/__tests__/MobileFileViewer.spec.ts components/workspace/agent/__tests__/AgentEventMonitor.spec.ts`
  - Result: `4 files, 19 tests passed`.
- ✅ Electron validator check:
  - `pnpm --dir autobyteus-web exec vitest run --config electron/vitest.config.ts electron/__tests__/localFileValidation.spec.ts --reporter=dot`
  - Result: `1 file, 1 test passed`.
- ✅ `git diff --check`
  - Passed.
- ✅ `pnpm --dir autobyteus-web audit:localization-literals`
  - Passed with zero unresolved findings.
- ✅ `pnpm --dir autobyteus-web guard:localization-boundary`
  - Passed.
- ✅ `pnpm --dir autobyteus-web guard:web-boundary`
  - Passed.
- ✅ `pnpm --dir autobyteus-web exec tsc -p electron/tsconfig.json --noEmit --pretty false`
  - Passed.
- ✅ User-verification unsupported-preview regression suite:
  - `pnpm --dir autobyteus-web exec vitest run utils/fileExplorer/__tests__/fileUtils.test.ts utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts stores/__tests__/fileExplorerNodeRouting.spec.ts --reporter=dot`
  - Result: `4 files, 41 tests passed`.
- ✅ Broader changed-chain plus Lua regression suite:
  - `pnpm --dir autobyteus-web exec vitest run utils/fileExplorer/__tests__/fileUtils.test.ts utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts components/conversation/__tests__/AIMessage.spec.ts components/workspace/agent/__tests__/AgentConversationFeed.spec.ts components/workspace/agent/__tests__/AgentEventMonitor.spec.ts components/fileExplorer/__tests__/FileExplorerTabs.spec.ts components/mobile/__tests__/MobileFiles.spec.ts components/mobile/__tests__/MobileFileViewer.spec.ts stores/__tests__/mobileWorkStore.spec.ts stores/__tests__/fileExplorerNodeRouting.spec.ts composables/__tests__/useRightPanel.spec.ts --reporter=dot`
  - Result: `14 files, 93 tests passed`.
- ✅ Unsupported policy source checks:
  - `git diff --check` on changed implementation/test paths passed.
  - The pure policy classifies `.dmg`, `.zip`, installers, application bundles, and unknown binary extensions as `Unsupported`; supported text/media families remain action-eligible.
- ✅ Existing supported-code matrix comparison:
  - Compared the extension alternatives in `MobileFiles.vue:isMarkdownOrCodePath()` against `fileTypePolicy.ts`; result: no missing extensions after adding `.lua` (including both `yaml` and `yml`).
- ⚠️ `pnpm --dir autobyteus-web exec nuxi typecheck`
  - Attempted after the local fix; repository-wide process exceeded the Node heap limit before diagnostics were emitted. This is not reported as a passing repository typecheck; focused Vitest compilation and execution passed.
- ⚠️ `pnpm --dir autobyteus-web exec tsc --noEmit --pretty false`
  - Attempted but non-gating: the repository's ordinary TypeScript invocation emitted a large pre-existing baseline set involving generated Nuxt/Vue module declarations and temporary dependency/type resolution. No changed-production-source-specific error remained after filtering the output during implementation, but this is not reported as a passing repository typecheck.

## Frontend Feedback Loop

- Component-level rendering and interaction checks passed for the Markdown opt-in/default-off behavior, action emission, mobile viewer presentation, and File Explorer host states.
- A full browser/dev-renderer visual inspection of the mounted desktop shell, collapsed-panel focus handoff, and phone viewport was not completed; no independent live browser surface was started. This remains an explicit downstream API/E2E validation item; no visual sign-off is claimed here.

## Known Risks / Downstream Validation Requirements

Code review should inspect:

- Raw token decoration and DOMPurify allow-list boundaries, especially Markdown links, punctuation, inline/fenced code, math/Mermaid/image interactions, and action-map rerender scoping.
- Event propagation and keyboard behavior for click/Enter/Space; verify passive content updates never instantiate the launcher or perform I/O.
- Explicit read-only intent on repeat opens and all FileViewer adapters; confirm no edit/save affordance leaks.
- Desktop panel mount timing and focus target when Files is initially collapsed or already open.
- Mobile revision/context/workspace matching, stale-request behavior, inline layout, and attach suppression.
- Electron Windows URL parsing and the shared validator for both text and media paths.

API/E2E owns independent executable coverage and environment validation after source review. Required scenarios include:

- Event Monitor-only link/prose/inline/fenced POSIX and Windows actions; click/Enter/Space; negative relative/HTTP(S)/data/blob links; passive-arrival no-open.
- Supported image/audio/video/Markdown/text/PDF/CSV/Excel paths through existing shared viewers; missing, directory, unreadable, invalid, and unsupported failure states.
- Repeat activation/dedupe, preservation of existing tabs, collapsed right-panel opening, Files selection, center conversation retention, no overlay/focus trap, and focus handoff.
- Browser/remote mapping only within active workspace, refusal outside root, no browser-resolved `href` local classification, and server negative authorization coverage.
- Phone-first context switch/stale request handling, inline read-only presentation, and no Attach for Event Monitor requests while manual row taps retain existing behavior.
- Packaged/native Electron text and media protocol validation on the relevant platform.
- Regression confirmation that Message references, Agent artifacts, and other Markdown consumers remain unchanged.

## Persistence / Compatibility / Scope Checks

- New action descriptors, access intent, and mobile request are transient in-memory UI state only. No artifact, reference, database, or persisted file schema changes were introduced; no migration is required.
- No arbitrary absolute-path server endpoint was added.
- No global Markdown path activation, browser-`href` filesystem classification, second viewer, overlay, or compatibility/dual-path wrapper was introduced.
- Changed implementation files remain below the 500 effective non-empty-line guardrail; no source file exceeded the 220-line delta escalation signal.

## Downstream Handoff Status

- `code_reviewer`: **resubmission required — implementation source/structural review after the user-verification unsupported-preview fix and CR-F-001 through CR-F-005 fixes**.
- `api_e2e_engineer`: **not yet run and no sign-off claimed**; begin only after source review passes.
- `delivery_engineer`: **held; do not finalize or rebuild the delivery handoff until the user verifies the rebuilt Electron artifact**.
