# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/requirements.md`
- Upstream Investigation Notes: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/investigation-notes.md`
- Reviewed Design Spec: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/design-spec.md`
- Current Review Round: 1 for the refreshed latest-`origin/personal` package
- Trigger: Fresh architecture review handoff after reset/re-probe on 2026-06-18.
- Prior Review Round Reviewed: N/A in the refreshed artifact package; previous pre-reset work was preserved in stash/backups but no current canonical review report exists in this worktree.
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the three upstream artifacts and latest-base source at `3171a5a4416e718cb4b38464206d9603733bf7a1`, including `autobyteus-ts/src/tools/terminal/node-pty-bootstrap.ts`, `autobyteus-ts/scripts/fix-node-pty-permissions.mjs`, `autobyteus-ts/src/tools/terminal/isolated-pty-session.ts`, `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts`, `autobyteus-server-ts/src/api/websocket/terminal.ts`, `autobyteus-web/composables/useTerminalSession.ts`, `autobyteus-web/scripts/prepare-server-dispatch.mjs`, `autobyteus-web/scripts/prepare-server.sh`, `autobyteus-web/scripts/prepare-server.mjs`, `autobyteus-web/build/scripts/afterPack.ts`, `.github/workflows/release-desktop.yml`, current terminal tests, and the installed `node-pty@1.1.0/lib/utils.js` resolution behavior.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Refreshed latest-base handoff | N/A | No blocking findings | Pass | Yes | Design is ready for implementation with explicit implementation constraints in residual risks. |

## Reviewed Design Spec

The design addresses a verified packaged Intel macOS failure in AutoByteus v1.3.58: the runtime-selected `node-pty/prebuilds/darwin-x64/spawn-helper` is mode `0644`, while AutoByteus' current bootstrap resolves an executable but wrong-architecture `build/Release/spawn-helper`. The proposed design changes the invariant from “some helper is executable” to “the helper adjacent to the native module actually selected by `node-pty` is executable,” enforces that invariant at runtime and in packaging/release validation, and surfaces startup failures through the terminal protocol/UI.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The design classifies the work as a bug fix against a refreshed latest-base package failure. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Root cause is `Missing Invariant` with duplicated helper-selection policy; evidence includes selected x64 helper mode `0644`, packaged websocket `1011`, `posix_spawnp failed`, and runtime bootstrap choosing arm64 `build/Release`. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Targeted refactor is required for selected-helper resolution; fallback terminal backends and broad package pruning are intentionally deferred/out of scope. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Runtime, packaging, validator, backend error path, frontend preservation, tests, removal plan, and dependency rules all align to the selected-helper invariant. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No current prior canonical design review report exists after latest-base reset. | N/A |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Terminal tab to prompt/output | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Build/release to valid packaged helper | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Startup failure to visible error/log | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Isolated PTY selected-helper repair | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` terminal backend | Pass | Pass | Pass | Pass | `node-pty-bootstrap` is the correct runtime invariant owner. |
| `autobyteus-web` desktop packaging | Pass | Pass | Pass | Pass | Current macOS build dispatch uses `prepare-server.sh`; that path must be updated at minimum. `afterPack.ts` is a valid second defense before signing. |
| `autobyteus-server-ts` terminal streaming | Pass | Pass | Pass | Pass | `TerminalHandler` should own startup error frame/logging and cleanup semantics. |
| `autobyteus-web` terminal UI/composable | Pass | Pass | Pass | Pass | `useTerminalSession` should preserve backend errors instead of overwriting them on close. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| node-pty selected-helper resolution/diagnostics | Pass | Pass | Pass | Pass | Keep the authoritative runtime resolver in `node-pty-bootstrap.ts`; postinstall may mirror only where importing built TS is unsafe. |
| Packaged helper scan/validation | Pass | Pass | Pass | Pass | New `verify-packaged-terminal-runtime.mjs` is justified; workflow should invoke it instead of spreading checks inline. |
| Terminal startup error payload | Pass | Pass | Pass | Pass | Reuse existing terminal `type:error` message shape; avoid parallel generic error protocols. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `NodePtySpawnHelperDiagnostics` if added | Pass | Pass | Pass | N/A | Pass | Proposed fields are bounded: platform, arch, selected native dir, helper path/mode/executable, resolution error. |
| Validator CLI inputs | Pass | Pass | Pass | N/A | Pass | Identity should be explicit through server/app path plus platform/arch or actual runtime selection. |
| Terminal websocket error frame | Pass | Pass | Pass | N/A | Pass | One user-safe startup message is enough; close reason may supplement. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Static-order runtime helper authority | Pass | Pass | Pass | Pass | Static search must not remain the normal authority; if retained, it is diagnostic fallback only after selected-native resolution failure. |
| Codesign/artifact-only validation as terminal guard | Pass | Pass | Pass | Pass | Codesigning candidacy does not set execute bits; terminal-specific package validation is required. |
| Generic close overwriting startup error | Pass | Pass | Pass | Pass | Preserve backend startup error through websocket close. |
| Fallback terminal backend for this failure | Pass | Pass | Pass | Pass | Rejected in scope because it would hide native package defects. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/node-pty-bootstrap.ts` | Pass | Pass | Pass | Pass | Runtime selected-helper resolver/chmod/diagnostics owner. |
| `autobyteus-ts/scripts/fix-node-pty-permissions.mjs` | Pass | Pass | Pass | Pass | Install-time repair must align with the selected/current-arch invariant and not preserve stale build-first authority. |
| `autobyteus-web/scripts/prepare-server.sh` | Pass | Pass | N/A | Pass | Current macOS packaging path; must chmod Darwin helpers after native rebuild or any step that may recreate helper files. |
| `autobyteus-web/scripts/prepare-server.mjs` | Pass | Pass | N/A | Pass | Primarily current Windows dispatch path; update only if shared future/parity logic is useful. Do not rely on this alone for macOS. |
| `autobyteus-web/build/scripts/afterPack.ts` | Pass | Pass | N/A | Pass | Valid place to ensure helpers inside `.app` are executable before resource signing; chmod must not be hidden behind the signing-identity early return if used as a correctness gate. |
| `autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs` | Pass | Pass | N/A | Pass | New focused release/package validator. |
| `.github/workflows/release-desktop.yml` | Pass | Pass | N/A | Pass | Should call validator for mac x64 and arm64 jobs. |
| `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts` | Pass | Pass | N/A | Pass | Backend startup error frame/logging owner. |
| `autobyteus-web/composables/useTerminalSession.ts` | Pass | Pass | N/A | Pass | Frontend websocket state/error preservation owner. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `IsolatedPtySession` -> `node-pty-bootstrap` | Pass | Pass | Pass | Pass | The session should call the bootstrap boundary, not duplicate path scanning. |
| `node-pty-bootstrap` -> node-pty internals | Pass | Pass | Pass | Pass | Private API coupling is acceptable only when encapsulated in one resolver with diagnostics/tests. |
| Release workflow -> validator | Pass | Pass | Pass | Pass | Workflow may pass target artifact info, but must not own helper-selection policy. |
| Frontend terminal code -> backend errors | Pass | Pass | Pass | Pass | UI displays protocol errors; it must not inspect native helper state. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ensureNodePtySpawnHelperExecutable()` / diagnostics API | Pass | Pass | Pass | Pass | Correct runtime public boundary. |
| `TerminalHandler.connect()` | Pass | Pass | Pass | Pass | Route should not own PTY-native error formatting. |
| Packaged terminal validator script | Pass | Pass | Pass | Pass | Correct release validation boundary. |
| `useTerminalSession` | Pass | Pass | Pass | Pass | `Terminal.vue` should remain a display/binding surface. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `ensureNodePtySpawnHelperExecutable()` | Pass | Pass | Pass | Low | Pass |
| `getNodePtySpawnHelperDiagnostics()` if added | Pass | Pass | Pass | Low | Pass |
| `verify-packaged-terminal-runtime.mjs` CLI | Pass | Pass | Pass | Low/Medium | Pass |
| Terminal websocket `error` frame | Pass | Pass | Pass | Low | Pass |
| `TerminalHandler.connect()` startup failure contract | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/` | Pass | Pass | Low | Pass | Terminal runtime/native startup owner. |
| `autobyteus-ts/scripts/` | Pass | Pass | Low | Pass | Package install repair hook. |
| `autobyteus-web/scripts/` | Pass | Pass | Low | Pass | Packaging/validation scripts. |
| `autobyteus-web/build/scripts/` | Pass | Pass | Low | Pass | Electron-builder hook location. |
| `autobyteus-server-ts/src/services/terminal-streaming/` | Pass | Pass | Low | Pass | Backend terminal lifecycle owner. |
| `autobyteus-web/composables/` | Pass | Pass | Low | Pass | Frontend websocket state owner. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime helper repair | Pass | Pass | N/A | Pass | Existing bootstrap owner should be extended. |
| Postinstall repair | Pass | Pass | N/A | Pass | Existing script should align with runtime invariant. |
| Packaged resource chmod | Pass | Pass | N/A | Pass | Existing packaging hooks/scripts are the right place. |
| Packaged terminal validator | Pass | Pass | Pass | Pass | Source/dev tests cannot catch installed package helper modes. |
| Startup error visibility | Pass | Pass | N/A | Pass | Existing server handler/composable should be extended. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Runtime helper selection | No steady-state dual path | Pass | Pass | Static first-found search is rejected as authority. |
| Terminal backend fallback | No | Pass | Pass | Fallback remains out of scope. |
| Error handling | No | Pass | Pass | Startup errors become explicit rather than silently closed. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Runtime resolver/postinstall tests | Pass | Pass | Pass | Pass |
| Packaging chmod and afterPack/signing | Pass | Pass | Pass | Pass |
| Release/package validator | Pass | Pass | Pass | Pass |
| Backend/frontend error propagation | Pass | Pass | Pass | Pass |
| Final Intel packaged websocket proof | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Helper repair | Yes | Pass | Pass | Pass | Good/bad examples map exactly to the current failure. |
| Package validation | Yes | Pass | Pass | Pass | Makes clear that codesigning is not enough. |
| Error visibility | Yes | Pass | Pass | Pass | Clarifies protocol error before close. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Whether to use `node-pty/lib/utils.js.loadNativeModule('pty')` | It is private API and it loads the native module, but it is the most faithful oracle for actual `node-pty` selection. | Approved if encapsulated in `node-pty-bootstrap.ts`, covered by tests, and accompanied by diagnostics/fallback. A local mirror is acceptable only if it attempts native-module loading in the same order, not file-existence-only search. | Not blocking. |
| Exact chmod placement | Correctness requires mode normalization before signing and after any step that recreates helpers. | Minimum: update current macOS preparation path (`prepare-server.sh`) after `electron-rebuild`; also update `afterPack.ts` before codesigning as a final `.app` resource defense if implementation confirms packaged output can differ from `resources/server`. | Not blocking. |
| Static check vs Electron Node spawn probe | Static helper mode check catches the reproduced failure; spawn probe gives stronger package-runtime evidence but can be cross-arch/host-sensitive. | Required minimum: selected-helper existence/mode/executable validation. Add Electron Node spawn probe when runnable; make cross-arch probe best-effort or clearly gated rather than the only check. | Not blocking. |
| Parent-process native module load side effect | Using `loadNativeModule('pty')` in bootstrap may load `pty.node` in the server process, while `IsolatedPtySession` otherwise spawns `node-pty` in a bridge. | Acceptable because it does not spawn a PTY or create terminal descriptors; keep it localized and revisit only if implementation observes process-lifetime side effects. | Not blocking. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking design findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The selected-native-dir oracle may couple to `node-pty` internals. Keep the private dependency behind one bootstrap function, test the stale `build/Release` vs current-arch prebuild scenario, and emit diagnostics when resolution fails.
- Do not rely on `prepare-server.mjs` alone for macOS: current non-Windows `prepare-server` dispatch runs `prepare-server.sh`. Chmod should run after `electron-rebuild`; if `afterPack.ts` is used, chmod must happen before signing and not be skipped merely because signing identity is absent.
- A filesystem selected-helper mode check is mandatory. Electron Node spawn validation is preferred where runnable, but cross-arch execution should not make release validation flaky.
- Fallback terminal backends must remain out of scope for this bug so the native packaging invariant remains visible and testable.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Ownership split is approved: runtime selected-helper repair/diagnostics in `autobyteus-ts`, packaging chmod and package validator in `autobyteus-web`, startup error propagation in `autobyteus-server-ts` plus `autobyteus-web`. Implementation may proceed.
