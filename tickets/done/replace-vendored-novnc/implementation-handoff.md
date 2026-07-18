# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/proposed-design.md`
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/upstream-novnc-evaluation.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/design-review-report.md`

## What Changed

- Added exact runtime dependency `@novnc/novnc@1.7.0-g7c36fab` to `autobyteus-web/package.json` and recorded registry integrity `sha512-MAG6tCn4LA7QfxlEHv0+EQiQCFfS/7tIT8y4A+/GgXxsLzz2chIRRzvRGQddr9o30d/A7lhljOPNwCBsszzlwA==` in `pnpm-lock.yaml` through pnpm.
- Changed the sole production RFB import to the official package root and limited construction to the supported `credentials` and `shared` options. Existing post-construction viewport/view-only policy, event handling, state, timers, retry/restore logic, commands, and cleanup were not changed.
- Added `autobyteus-web/types/novnc.d.ts`, a compile-time-only root module declaration for the narrow public RFB surface used by the application. No deep-path declarations or runtime wrapper were added.
- Updated the two existing Vitest mocks to the same `@novnc/novnc` root boundary.
- Deleted all 57 tracked files under `autobyteus-web/lib/novnc/`, including the copied pako subset. No alias, fallback, patch, conditional provider, or copied source remains.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-001` | Use the official package while preserving connection, credentials, state/event translation, disconnect, and cleanup outcomes. | `VncHostTile.vue` -> unchanged `useVncSession()` -> root `@novnc/novnc` `RFB`; `useVncSession.ts`, manifest, lockfile. | Implemented. Session ownership and every existing lifecycle/event branch remain in the composable. |
| `BEH-002` | Preserve view-only default, interaction toggle, client scaling, fullscreen remote resize, and initial retry/restore timing. | Unchanged `VncHostTile` commands -> unchanged composable policy methods -> public `RFB` properties; `useVncSession.ts`. | Implemented. Removed only constructor keys proven ignored; existing `applyViewportStrategy()` and 120 ms/320 ms timer sequence are unchanged. |
| `BEH-003` | Preserve permission-aware automatic clipboard behavior without adding a parallel application owner. | Exact package root -> upstream `RFB` -> package `AsyncClipboard`; manifest/lock plus package-content verification. | Implemented at the provider boundary. Installed package contains the approved `AsyncClipboard`, browser availability check, `readText()`, and `writeText()` path. Real bidirectional operation remains for API/E2E. |
| `BEH-004` | Make manifest/lock the upstream revision authority and remove repository-owned source while keeping tests/build resolvable. | `package.json` + `pnpm-lock.yaml`; one production import; two test mocks; deleted `lib/novnc/**`; narrow ambient declaration. | Implemented. Frozen-lock install, 30 targeted tests, and production generation pass; forbidden-reference scan is clean. |

## Key Files Or Areas

- Modified: `autobyteus-web/composables/useVncSession.ts`
- Added: `autobyteus-web/types/novnc.d.ts`
- Modified: `autobyteus-web/composables/__tests__/useVncSession.spec.ts`
- Modified: `autobyteus-web/components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts`
- Modified: `autobyteus-web/package.json`
- Modified: `pnpm-lock.yaml`
- Removed: `autobyteus-web/lib/novnc/**` (57 files)

## Important Assumptions

- The approved exact development build remains the required interim provider because stable `1.7.0` omits the currently reachable automatic clipboard behavior.
- The removed constructor display/viewport/compression keys were ignored by both the vendored and selected upstream constructors; preserving their apparent values elsewhere would have changed behavior and was intentionally not done.
- `useVncSession` remains the sole application production owner of RFB instance identity, lifecycle, session policy, state translation, timers, and cleanup.

## Known Risks

- `1.7.0-g7c36fab` is an exact published development build; a later version change requires renewed behavior and declaration review.
- Unit/build evidence does not prove a real VNC handshake or bidirectional browser clipboard behavior. API/E2E must exercise the strongest realistic VNC/browser environment and preserve denied/unsupported clipboard fallback evidence.
- `types/novnc.d.ts` is application-owned and may drift on a future provider upgrade; remove or revise it if official package-root declarations become adequate.
- Delivery must verify normal MPL-2.0 dependency-license/attribution handling after removal of the checked-in source.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup/refactor; replace an unmodified checked-in upstream provider with the official dependency.
- Reviewed root-cause classification: Legacy/compatibility pressure came from the historical unscoped-package resolution failure, not a current fork or domain requirement.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` — direct package replacement and complete vendored-source deletion.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A; implementation evidence did not challenge the reviewed assessment.
- Evidence / notes: Exact package-root resolution passed production generation; the provider tree was confirmed as 57 tracked files before deletion and is now absent; one production import and two mocks are the only active root references beyond manifest/lock/type declaration.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: `useVncSession.ts` is 269 lines after an eight-line net reduction and retains its prior responsibility. The new declaration is 26 lines and root-only. No new runtime structure was introduced.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Not Affected`
- Design-spec decision reference: `proposed-design.md`, “Persisted Data / State Transition Decision”.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A.
- Migration implementation and focused checks, only when `Migration Required`: N/A.
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc`
- Branch: `codex/replace-vendored-novnc`
- Dependency metadata was changed with pnpm. A final `corepack pnpm@10.28.2 install --frozen-lockfile --offline` passed, confirming manifest/lock consistency without refreshing unrelated dependency resolutions.
- pnpm reported the repository's existing Nuxt peer warnings (`@nuxt/schema` version mismatch through `@nuxt/cli`); they are unrelated to this replacement.

## Local Implementation Checks Run

- `corepack pnpm@10.28.2 install --frozen-lockfile --offline` — Pass; lockfile current, resolution skipped.
- Structural scan for `~/lib/novnc`, `lib/novnc/core/rfb`, internal `@novnc/novnc/...`, and unscoped runtime/mock `novnc` references — Pass; no forbidden active source/test reference found.
- Provider/inventory inspection — Pass; exact manifest version, registry integrity, root export `./core/rfb.js`, installed async clipboard implementation, one production root import, two root mocks, and absent vendored directory confirmed.
- `pnpm -C autobyteus-web test:nuxt composables/__tests__/useVncSession.spec.ts components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts utils/__tests__/vncHosts.spec.ts --run` — Pass; 3 files and 30 tests.
- `pnpm -C autobyteus-web generate` — Pass; Nuxt static production generation completed with 3,552 client modules transformed. Existing large-chunk warning remains.
- `pnpm -C autobyteus-web exec nuxi typecheck` — Expected global failure; exactly 242 TypeScript errors, equal to the recorded baseline. There is no `@novnc/novnc` or `types/novnc.d.ts` error. The two existing `useVncSession.ts` `unref()` errors at lines 24–25 remain part of that same baseline, so the noVNC-specific delta is zero.
- `git diff --check` — Pass.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: VNC workspace host connection, status/display, view-only/interactive toggle, maximize/restore sizing, and clipboard-observable interaction.
- Approved UI/UX, interaction, requirement, or design references: `requirements.md`, `proposed-design.md`, and `upstream-novnc-evaluation.md`; no visual redesign is approved.
- Existing design system, shared components, and adjacent product surfaces reviewed: Existing `VncViewer.vue` host resolution and `VncHostTile.vue` controls/status/maximize/resize lifecycle were inspected; they remain unchanged and continue to depend only on `useVncSession`.
- Project development / preview instructions and rendered surface used: Repository `AGENTS.md` and frontend scripts were followed. The existing layout test rendered the surrounding workspace surface in the Nuxt Vitest environment; production static generation validated the package in the actual client bundling path.
- States, layouts, viewports, and interactions inspected: Mock-backed initial connection/resize and fullscreen-fit policy were exercised by the targeted session suite; workspace layout states were exercised by its 25-test suite. No markup, CSS, label, control, or UI-component source changed.
- Visual or interaction issues found and corrected: None observed in implementation-owned checks; the change is a provider/dependency ownership replacement rather than a UI change.
- Supporting evidence and remaining unverified states or limitations: No configured live VNC/websockify endpoint was available in this stage, so a rendered remote desktop, real focus/input, server events, and bidirectional clipboard could not be exercised without taking over API/E2E-owned environment discovery. Those states remain explicitly unverified for downstream realistic browser/live validation.

## Downstream Coverage Hints / Suggested Scenarios

- Start a realistic VNC/websockify endpoint and validate one configured host through connecting -> connected -> clean disconnect plus failure/security/credentials-required paths.
- Confirm one official package-root RFB instance is created with password credentials and shared-session behavior, and that cleanup/timer guards prevent stale instance effects.
- Exercise default view-only scaling, explicit interactive mode, maximize remote resize, Escape/restore, late layout retry, and the intended mode restoration after 320 ms.
- In an actual browser context with supported APIs, validate focused-canvas local-to-remote clipboard and server-to-browser clipboard; also validate permission denial/unsupported APIs do not block VNC interaction.
- Preserve exact package/version/content assertions so stable `1.7.0` cannot silently replace the approved development build.
- Delivery should verify MPL-2.0 dependency attribution/license handling.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. Implementation-scoped unit, package, lock, type-delta, and production-generation checks are complete, but API/E2E still owns environment discovery, durable broader coverage decisions, real VNC/browser execution, bidirectional clipboard validation, execution confidence scoring, and evidence.

## Delivery Packaging Local Fix — 2026-07-18

### Trigger And Classification

- Trigger: Delivery's MPL-2.0 packaging verification in `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/delivery-reroute-report.md` found that the installed exact package carried required license/provenance material but neither tracked project notices nor generated/desktop packaging retained it.
- Classification: Bounded `Local Fix / implementation_engineer` as requested by delivery. This fixes distributable packaging only; it does not alter provider identity, VNC runtime behavior, session ownership, or persisted data.

### Local-Fix Changes

- Added the single canonical tracked artifact `autobyteus-web/public/THIRD_PARTY_NOTICES/noVNC-1.7.0-g7c36fab.txt` for the exact runtime dependency. It records the exact package/version, package author, 2022 noVNC authorship notice, MPL-2.0 status, official repository, exact commit and corresponding-source/archive locations, upstream `LICENSE.txt`, upstream `AUTHORS`, bundled DES attribution, bundled pako MIT notice, and the full upstream MPL-2.0 text.
- Added `autobyteus-web/build/scripts/noVncThirdPartyNotice.ts` as the one packaging-path authority for the canonical source, generic web output, Electron renderer output, and desktop resource destination.
- Extended `autobyteus-web/build/scripts/build.ts` so Electron packages the canonical file as `resources/THIRD_PARTY_NOTICES/noVNC-1.7.0-g7c36fab.txt` and fails before packaging if either the tracked source or `generate:electron`'s `dist/renderer` copy is absent. Generic web generation remains independently represented by `dist/public`.
- Extended `autobyteus-web/tests/integration/novnc-package-contract.integration.test.ts` so exact dependency author/license/repository drift, notice omission/content drift, source/commit drift, generic-web/Electron-renderer path drift, or desktop packaging mapping drift fails focused durable coverage.
- No vendored runtime source, provider fallback, alias, deep import, runtime wrapper, or clipboard/session behavior was introduced.

### Local-Fix Behavior Trace

| Behavior ID | Local-Fix Outcome | Implementation Path | Result |
| --- | --- | --- | --- |
| `BEH-003` | Preserve the exact automatic-clipboard provider without changing its owner or source. | Exact dependency remains unchanged; notice only records its copyright/license/source obligations. | Preserved; no runtime source changed. |
| `BEH-004` | Make distributable dependency handling complete and drift-detectable. | Canonical public notice -> generic Nuxt `dist/public` or Electron Nuxt `dist/renderer`; Electron preflight requires the renderer copy and explicit `extraResources` carries the canonical source; focused contract test protects both modes. | Implemented. Frontend and desktop packaging inputs now retain the exact license/provenance artifact. |

### Local Implementation Checks

- `pnpm -C autobyteus-web test:nuxt tests/integration/novnc-package-contract.integration.test.ts --run` — Pass; 1 file / 4 tests after the local fix.
- Focused noVNC set (`useVncSession`, layout, host parser, package contract) — Pass; 4 files / 36 tests. This is implementation-scoped evidence, not a replacement for the previously completed API/E2E stage.
- `pnpm -C autobyteus-web generate` — Pass; 3,552 modules transformed and the exact notice generated under generic web output `dist/public`.
- `pnpm -C autobyteus-web generate:electron` — Pass; 3,552 modules transformed, Electron main/preload output generated, the exact notice generated under `dist/renderer`, and the prior generic `dist/public` output correctly absent after the clean mode-specific generation.
- Canonical/generated notice byte assertion — Pass; both files are 26,305 bytes with SHA-256 `399fad4dac55bd3226ed40c5e4f5c366f44654e1738a037272ff3e6661a097b3`.
- `pnpm -C autobyteus-web transpile-build` — Pass; the desktop build configuration and notice packaging contract compile.
- Compiled packaging assertion — Pass; the mapping distinguishes generic web `dist/public` from Electron renderer `dist/renderer`, and Electron `extraResources` maps the canonical source to `THIRD_PARTY_NOTICES/noVNC-1.7.0-g7c36fab.txt`.
- Normal compiled Electron-flow interception — Pass; after clean `generate:electron`, compiled `build.js --mac --arm64` accepted the renderer notice, reached the intercepted electron-builder boundary, and captured the expected notice extra resource.
- `git diff --check` — Pass with the intentionally uncommitted downstream API/E2E package preserved.
- Changed implementation source guardrail — Pass; `build.ts` remains at 449 effective non-empty lines (below 500), and the packaging authority is 15 effective non-empty lines.

### Frontend Rendered-Result Check

Not Applicable for this local fix. It adds a distributable legal text asset and build/package wiring; no application markup, styling, controls, labels, session interaction, or rendered VNC behavior changed. Generic and Electron-mode Nuxt generation plus exact output-byte comparisons validate both affected frontend artifact paths. The earlier live VNC/browser evidence remains unchanged but must pass through the required downstream revalidation route after source review.

### Preserved Downstream State And Revalidation

- Delivery confirmed the refreshed base remained `dbc83fdb51c1e158b5707c219dd8574dc49fa493`; no integration commit was required.
- The previously passed 97.1% API/E2E result, 4-file/35-test evidence, live VNC browser/service journey, cleanup evidence, proportional test-code review, four unrelated full-Nuxt assertion failures, reports, and retained probe files were preserved in the working tree. Round-3 `VNC-PKG-DESKTOP-001` failure evidence is also preserved. The focused count is now 36 because the package contract gained one notice/packaging case.
- Per the requested flow, this packaging fix returns to `code_reviewer` for implementation-source review, then to `api_e2e_engineer` for coverage/execution revalidation before delivery resumes.

### Remaining Risks

- Exact development-build pinning and future ambient-declaration drift remain unchanged.
- Any future noVNC dependency upgrade must update the canonical versioned notice and packaging contract from the new upstream package/license/source evidence; the focused test intentionally fails until that review occurs.

### CR-001 Mode-Specific Output Correction

- Failure origin: Commit `7fe03f83e` incorrectly used generic `dist/public` as the Electron preflight output even though every documented `build:electron*` script runs `generate:electron`, which emits public assets under `dist/renderer`.
- Correction: `NO_VNC_THIRD_PARTY_NOTICE_PACKAGING` now names `genericWebOutputPath` and `electronRendererOutputPath` separately. `NO_VNC_ELECTRON_REQUIRED_NOTICE_FILES` contains only the canonical source and the renderer output required by the actual desktop lifecycle; `build.ts` consumes that array.
- Durable protection: The fourth package-contract case asserts both Nuxt `publicDir` values, the two distinct output paths, the Electron-required input set, and the unchanged `extraResources` destination.
- Revalidation: Generic generation produced an exact `dist/public` copy. Electron generation then produced an exact `dist/renderer` copy while removing `dist/public`. The compiled build preflight passed and reached the intercepted electron-builder boundary with the correct extra-resource mapping.
