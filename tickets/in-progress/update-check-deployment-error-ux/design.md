# Design Spec

## Current-State Read

The desktop updater path already has a clear high-level owner: `autobyteus-web/electron/updater/appUpdater.ts` owns Electron main-process updater lifecycle, IPC handlers, and state broadcast. The defect is inside that boundary and its renderer consumers: `AppUpdater.handleError()` currently copies raw `Error.message` into `AppUpdateState.error`; the renderer store then makes all `error` states visible and emits a toast containing that same raw value; the update card and Settings > Updates panel interpolate that value into user-facing copy.

This makes transient and expected conditions look frightening. A raw `net::ERR_CONNECTION_CLOSED` becomes visible in the update card. During GitHub release deployment, the app can query a public “latest” release before desktop updater metadata/assets have been uploaded; `electron-updater` then throws long provider errors (missing `latest-mac.yml` / `latest-linux.yml` / `latest.yml`, missing assets, or no compatible zip file). The current renderer path displays those dependency diagnostics verbatim.

Release investigation also found a repeated deployment window: tag pushes start several release workflows at once, and lighter Android / messaging-gateway release jobs can publish the GitHub Release 12-15 minutes before the Desktop Release job uploads updater metadata. The final release can be correct, but checks during that window can still fail. This design keeps release workflow coordination as follow-up and fixes the app-side UX boundary now.

Constraints the target design must respect:

- Keep `electron-updater` + GitHub Releases as the provider.
- Keep preload/IPC as the renderer boundary; renderer must not call raw updater APIs.
- Preserve raw diagnostics in Electron logs.
- Do not expose raw provider/network details in normal UI or toasts.
- Use simple but meaningful messages: name the situation and next action without scary internals.

## Intended Change

Add an explicit updater-error classification and display policy:

1. Electron main classifies raw updater errors into stable user-relevant categories.
2. Electron main logs raw diagnostics but broadcasts only safe updater state.
3. Renderer store uses category + operation source to decide visibility/toasts.
4. Update notice and Settings > Updates render shared safe localized messages.
5. Raw `error` detail is removed from the renderer-facing update state contract instead of kept as a hidden compatibility leak.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant plus Duplicated Policy Or Coordination
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, focused refactor inside existing updater boundary and renderer display policy.
- Evidence:
  - `AppUpdater.handleError()` broadcasts raw `Error.message`.
  - Store and two UI components independently expose raw details.
  - GitHub release deployment creates a real transient missing-metadata window.
  - `electron-updater` can produce long provider diagnostics.
- Design response:
  - Introduce one classifier under the Electron updater subsystem.
  - Tighten `AppUpdateState` so it contains `errorKind` / operation context instead of raw diagnostic text.
  - Centralize renderer error display-key mapping so both global notice and Settings agree.
- Refactor rationale:
  - Without changing the state contract, raw detail remains available for future UI code to accidentally display.
  - Without a single classifier, each component/store would duplicate fragile pattern matching.
- Intentional deferrals and residual risk, if any:
  - Release workflow coordination remains deferred. The app will explain “release still preparing” during the gap, but GitHub Releases may still be publicly incomplete until a release-orchestration follow-up changes workflow sequencing.

## Terminology

- `Updater lifecycle`: check/download/install state machine owned by Electron main.
- `Raw diagnostic`: original error message, stack, code, URLs, YAML/rawData, or provider JSON from `electron-updater` / Electron / network stack.
- `Error kind`: stable safe category used by renderer display policy.
- `Operation`: user/source context for the error, e.g. startup check, manual check, download, install, updater event.

## Design Reading Order

Read this design from:

1. updater data-flow spines;
2. updater main-process ownership;
3. renderer visibility/display ownership;
4. shared state type tightening;
5. file mapping and migration.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove renderer-facing raw `error` from `AppUpdateState` and remove raw-detail localization/display branches for in-scope updater errors.
- Obsolete paths/files included in this scope:
  - `AppUpdateState.error` as a raw diagnostic display field.
  - `errorWithDetail` UI copy branches for app-update failures.
  - Store toast path `Update error: {{error}}`.
- The design must not keep both old raw-detail and new classified-display behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User clicks manual update check/download/install | Safe update state rendered in update notice/settings | `AppUpdater` for lifecycle, `appUpdateStore` for renderer visibility | Main user path for reported screenshot and retry UX. |
| DS-002 | Primary End-to-End | Startup auto-check timer fires | Quiet classified state logged/applied without scary card/toast | `AppUpdater` for lifecycle, `appUpdateStore` for quiet policy | Prevents background checks from frightening users. |
| DS-003 | Bounded Local | Raw updater error enters main process | Classified safe error summary + raw log entry | `AppUpdateErrorClassifier` under `AppUpdater` | Stops raw provider/network text at the main-process boundary. |
| DS-004 | Return-Event | `AppUpdater.applyState()` broadcasts state | Renderer store and UI update | `AppUpdater` event broadcaster then `appUpdateStore` | Ensures all windows receive only safe state. |
| DS-005 | Bounded Local | Renderer receives classified error state | Notice/toast visibility decision | `appUpdateStore` | Separates background suppression from user-initiated feedback. |

## Primary Execution Spine(s)

- Manual check: `Update UI -> appUpdateStore -> preload IPC -> AppUpdater -> electron-updater GitHub provider -> AppUpdateErrorClassifier -> safe AppUpdateState -> renderer display`
- Startup check: `App startup timer -> AppUpdater -> electron-updater GitHub provider -> AppUpdateErrorClassifier -> logged quiet AppUpdateState -> appUpdateStore quiet policy`
- Download/install failure: `User action -> appUpdateStore -> preload IPC -> AppUpdater operation -> AppUpdateErrorClassifier -> safe AppUpdateState -> recovery UI`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A user-initiated update action crosses the preload boundary into Electron main. Main invokes `electron-updater`; if it fails, main classifies the raw error, logs details, and emits safe state. Renderer shows concise recovery copy. | User action, renderer store, IPC, updater lifecycle, provider, classified state, renderer display | `AppUpdater` and `appUpdateStore` | Error classification, localization, toast policy, logging |
| DS-002 | Startup auto-check runs without direct user intent. Transient failures are classified and logged, but renderer store does not force a global error card/toast for expected network/deployment conditions. | Startup timer, updater lifecycle, provider, classified state, store visibility policy | `AppUpdater` and `appUpdateStore` | Quiet policy, logs, Settings status |
| DS-003 | Any raw thrown value is converted to normalized diagnostic text internally, matched to a stable `AppUpdateErrorKind`, and returned as a safe summary. Raw diagnostics do not leave Electron main except through logs. | Raw error, classifier, classified summary, logger/state | `AppUpdateErrorClassifier` used by `AppUpdater` | Pattern matching, diagnostic normalization |
| DS-004 | State broadcast remains the single event spine from main to renderer. The payload changes from raw detail to safe categories. | `applyState`, BrowserWindow broadcast, preload listener, store apply | `AppUpdater` broadcast boundary | IPC type safety |
| DS-005 | Renderer store receives safe state and decides whether to show card/toast based on operation + category. Components only render computed safe text. | Store state, visibility, toast, components | `appUpdateStore` | Localization-key mapping, no duplicate toasts |

## Spine Actors / Main-Line Nodes

- `AppUpdateNotice` / `AboutSettingsManager`: user-visible entry/display surfaces.
- `appUpdateStore`: renderer updater state, visibility, toast owner.
- `preload.ts` IPC bridge: thin typed boundary.
- `AppUpdater`: main-process updater lifecycle owner.
- `electron-updater`: provider/downloader dependency.
- `AppUpdateErrorClassifier`: internal classification owner for raw errors.
- `shared/appUpdateTypes.ts`: shared IPC state shape owner.

## Ownership Map

- `AppUpdater` owns:
  - lifecycle state transitions;
  - current operation/source context;
  - invoking `electron-updater`;
  - logging raw diagnostics;
  - broadcasting safe state.
- `AppUpdateErrorClassifier` owns:
  - normalizing unknown thrown values to diagnostic text;
  - classifying raw diagnostics into `AppUpdateErrorKind`;
  - selecting a safe fallback message for main-process state.
  - It must not own UI localization, toast decisions, or updater lifecycle.
- `shared/appUpdateTypes.ts` owns:
  - `AppUpdateStatus`, `AppUpdateErrorKind`, `AppUpdateOperation`, and `AppUpdateState` contract.
  - It must not import Electron, Vue, Pinia, or localization.
- `appUpdateStore` owns:
  - renderer copy of update state;
  - visible/dismissed state;
  - background-vs-manual visibility and toast policy;
  - one-toast-per-error decision.
- `AppUpdateNotice` and `AboutSettingsManager` own presentation only.
- `utils/appUpdateErrorDisplay.ts` owns renderer mapping from `errorKind` to localization keys so card/settings/toasts stay consistent.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `window.electronAPI.checkForAppUpdates()` | `AppUpdater.checkForUpdates('manual')` | Sandboxed renderer IPC boundary. | Error classification or UI display policy. |
| `window.electronAPI.downloadAppUpdate()` | `AppUpdater.downloadUpdate()` | Sandboxed renderer IPC boundary. | Provider/download retry policy beyond invoking main. |
| `window.electronAPI.onAppUpdateState()` | `AppUpdater.broadcastState()` | Event bridge to renderer. | State shaping or raw diagnostic filtering. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `AppUpdateState.error` as raw UI detail | Violates no-raw-diagnostics invariant. | `errorKind` + `errorOperation` in `shared/appUpdateTypes.ts`; raw logs in `AppUpdater`. | In This Change | Do not keep as deprecated renderer field. |
| `errorWithDetail` branches in update notice/settings | They interpolate raw detail. | `utils/appUpdateErrorDisplay.ts` + localized safe messages. | In This Change | Remove or stop using the keys. |
| Store toast `Update error: {{error}}` | Duplicates raw-detail leak and scares users. | Safe category toast keys. | In This Change | Suppress startup transient toasts. |
| Component-local error-kind copy decisions duplicated between card/settings | Would reintroduce policy drift. | Shared renderer display helper. | In This Change | Components remain presentation-only. |
| Public-release-before-desktop-ready workflow behavior | Creates deployment window. | Future release-orchestration invariant. | Follow-up | Not required for approved simple-message UX fix. |

## Return Or Event Spine(s) (If Applicable)

`AppUpdater.applyState(partial)` -> safe `AppUpdateState` snapshot -> `BrowserWindow.webContents.send('app-update-state', snapshot)` -> preload listener -> `appUpdateStore.applyRemoteState(payload)` -> UI computed text + visibility/toast effects.

The event spine must only carry safe update state. Raw diagnostics stay in the Electron main log call that happens before `applyState()`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AppUpdater`
  - `catch/error event -> classifyAppUpdateError(error, context) -> logger.error(raw + classification) -> applyState(safe error fields)`
  - Matters because it is the boundary where raw dependency text is stopped.
- Parent owner: `appUpdateStore`
  - `applyRemoteState(payload) -> classify visibility by operation/kind -> optionally show card -> optionally toast once`
  - Matters because startup/background transient failures should be quiet while manual failures remain recoverable.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Raw diagnostic logging | DS-003 | `AppUpdater` | Persist raw error details with category/operation. | Developers need evidence without scaring users. | UI would leak raw diagnostics. |
| Error pattern classification | DS-003 | `AppUpdater` | Map raw text/codes to stable categories. | Dependency errors are technical and unstable. | Components/store would duplicate regexes. |
| Localization-key mapping | DS-001, DS-005 | Renderer components/store | Select safe title/message/toast keys by `errorKind`. | Keep copy consistent across card/settings/toast. | UI surfaces drift and reintroduce raw detail. |
| Startup quiet policy | DS-002, DS-005 | `appUpdateStore` | Suppress visible card/toast for background transient failures. | Startup checks are not user-initiated. | Main would need renderer UX knowledge. |
| Release workflow gap documentation | DS-001 | Delivery/docs | Record why “release preparing” exists. | Future maintainers need release-context explanation. | App code would contain release-process narrative. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Updater lifecycle and raw error handling | `autobyteus-web/electron/updater` | Extend | Already owns `electron-updater` calls and state broadcast. | N/A |
| Renderer state/visibility/toasts | `autobyteus-web/stores/appUpdateStore.ts` | Extend | Already owns update notice visibility and toasts. | N/A |
| Localized UI copy | `autobyteus-web/localization/messages/*` | Extend | Existing localization runtime serves card/settings. | N/A |
| Shared IPC type shape | `autobyteus-web/shared` / `types` | Create small shared type file | Current type duplication is loose; updater state now needs a safe semantic contract. | Existing global d.ts files are not suitable as the single imported model owner. |
| Error display key mapping | `autobyteus-web/utils` | Create | Existing components duplicate status display logic; new error categories need one renderer policy. | Store alone should not own component title copy; main cannot own localization. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Electron updater subsystem | Lifecycle, provider invocation, raw diagnostics, error classification, safe state broadcast. | DS-001, DS-002, DS-003, DS-004 | `AppUpdater` | Extend | Add classifier beside `appUpdater.ts`. |
| Shared web/electron contract | Tight `AppUpdateState` and enums. | DS-004 | Main + renderer IPC | Create | Keep dependency-free. |
| Renderer updater state subsystem | Store state, quiet policy, toasts. | DS-001, DS-002, DS-005 | `appUpdateStore` | Extend | Must not parse raw errors. |
| Renderer display utilities | Error-kind localization-key mapping. | DS-001, DS-005 | Components/store | Create | Avoid duplicated copy policy. |
| Localization catalogs | Safe messages in English and Chinese. | DS-001, DS-005 | UI surfaces | Extend | Remove raw-detail display path. |
| Release documentation | Deployment gap explanation and follow-up. | DS-001 | Developers/delivery | Extend | Not workflow logic in this ticket. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/shared/appUpdateTypes.ts` | Shared contract | IPC type contract | Export status/error kind/operation/state types. | One dependency-free model used by main, renderer, and global types. | N/A |
| `autobyteus-web/electron/updater/appUpdateErrorClassifier.ts` | Electron updater | Internal classifier | Classify raw errors and generate safe fallback message. | Pure classification concern separate from lifecycle orchestration. | Yes |
| `autobyteus-web/electron/updater/appUpdater.ts` | Electron updater | Lifecycle owner | Use classifier, track operation/source, log raw diagnostics, broadcast safe state. | Existing lifecycle owner remains correct. | Yes |
| `autobyteus-web/stores/appUpdateStore.ts` | Renderer updater state | Store owner | Apply safe state, visibility/toast policy, no raw error. | Existing renderer state owner remains correct. | Yes |
| `autobyteus-web/utils/appUpdateErrorDisplay.ts` | Renderer display utilities | Display mapping | Map `AppUpdateErrorKind` to title/message/toast localization keys. | Prevents duplicated copy policy in components/store. | Yes |
| `AppUpdateNotice.vue` | Renderer presentation | Global notice | Render safe error title/message and actions. | Existing UI surface. | Yes |
| `AboutSettingsManager.vue` | Renderer presentation | Settings panel | Render same safe error message policy. | Existing settings surface. | Yes |
| Localization files | Localization | Copy catalog | Add safe messages; remove/stop using raw detail keys. | Existing copy owner. | N/A |
| Tests | Validation | Regression tests | Prove raw detail not displayed and logs retained. | Existing targeted test locations. | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `AppUpdateStatus`, state payload, error category fields repeated across main/store/global d.ts | `autobyteus-web/shared/appUpdateTypes.ts` | Shared contract | One IPC payload shape prevents drift. | Yes, removes raw `error`. | Yes, `errorKind` is the one display selector. | A mixed Electron/Vue utility module. |
| Error display key mapping repeated across notice/settings/toast | `autobyteus-web/utils/appUpdateErrorDisplay.ts` | Renderer display utilities | One policy for all renderer surfaces. | Yes | Yes | A classifier for raw diagnostics. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AppUpdateState.status` | Yes | N/A | Low | Keep lifecycle status. |
| `AppUpdateState.message` | Yes if safe fallback only | Yes | Medium | Document and enforce: safe fallback text only, never raw diagnostics. |
| `AppUpdateState.errorKind` | Yes | Yes | Low | Stable category for display/retry policy. |
| `AppUpdateState.errorOperation` | Yes | Yes | Low | Source/phase context for quiet/manual behavior. |
| Removed `AppUpdateState.error` | N/A | Yes | N/A | Do not retain raw detail in renderer state. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/shared/appUpdateTypes.ts` | Shared contract | IPC model | App update status, error kind, operation, state. | Dependency-free shared model. | N/A |
| `autobyteus-web/electron/updater/appUpdateErrorClassifier.ts` | Electron updater | Internal classifier | Pure raw-error classification and safe fallback message generation. | Keeps lifecycle file from accumulating regex policy. | Yes |
| `autobyteus-web/electron/updater/appUpdater.ts` | Electron updater | Lifecycle/broadcast owner | Operation tracking, calls to `electron-updater`, classifier use, raw logging, safe state broadcast. | Existing owner remains authoritative. | Yes |
| `autobyteus-web/electron/types.d.ts` | Electron globals | Type declaration | Use/import shared `AppUpdateState` instead of redefining loose raw-error shape. | Keeps global electron API typed. | Yes |
| `autobyteus-web/types/electron.d.ts` | Renderer globals | Type declaration | Use/import shared `AppUpdateState` instead of redefining loose raw-error shape. | Keeps renderer API typed. | Yes |
| `autobyteus-web/stores/appUpdateStore.ts` | Renderer updater state | Store owner | Safe state application, quiet/manual visibility, safe toasts. | Existing store owner remains authoritative. | Yes |
| `autobyteus-web/utils/appUpdateErrorDisplay.ts` | Renderer display utilities | Display-key mapping | Map error kinds to localization keys and user-initiated toast eligibility helpers. | Prevents duplicated copy policy. | Yes |
| `autobyteus-web/components/app/AppUpdateNotice.vue` | Renderer presentation | Global notice | Render safe status title/message/actions. | Presentation only. | Yes |
| `autobyteus-web/components/settings/AboutSettingsManager.vue` | Renderer presentation | Settings updates panel | Render safe status message and actions. | Presentation only. | Yes |
| `autobyteus-web/localization/messages/en/shell.ts`, `zh-CN/shell.ts`, `en/settings.ts`, `zh-CN/settings.ts` | Localization | Copy catalog | Safe messages for each error kind. | Existing localization structure. | N/A |
| `autobyteus-web/electron/updater/__tests__/appUpdater.spec.ts` | Validation | Main updater tests | Classification/logging/state regression tests. | Existing updater test owner. | Yes |
| `autobyteus-web/stores/__tests__/appUpdateStore.spec.ts` | Validation | Store tests | Startup quiet/manual visible/toast-safe tests. | Existing store test owner. | Yes |
| `autobyteus-web/components/app/__tests__/AppUpdateNotice.spec.ts` | Validation | Notice tests | Raw detail not rendered. | Existing component test owner. | Yes |
| `autobyteus-web/components/settings/__tests__/AboutSettingsManager.spec.ts` | Validation | Settings tests | Raw detail not rendered. | Existing component test owner. | Yes |
| `autobyteus-web/docs/electron_packaging.md` or ticket docs | Documentation | Release/updater docs | Record deployment gap and release-preparing message rationale. | Existing updater delivery docs are the durable location if docs sync finds impact. | N/A |

## Ownership Boundaries

The authoritative updater boundary is `AppUpdater`. Callers above it (renderer/store/components) must not parse or display provider errors. The raw diagnostic boundary is internal to Electron main: raw diagnostics enter via caught errors/events, are classified and logged, and then stop. The renderer boundary receives only safe state. The display boundary in renderer maps safe category to localized copy and never reaches into main-process diagnostics.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AppUpdater` IPC handlers | `electron-updater`, classifier, raw logs | Renderer store via preload | Renderer calling/parsing `electron-updater` or raw errors | Add safe fields to `AppUpdateState`. |
| `AppUpdateErrorClassifier` | Regex/pattern matching and safe fallback message selection | `AppUpdater` only | Components/store importing classifier or matching raw strings | Add missing `errorKind` values. |
| `appUpdateStore` | Visibility, dismiss, toast policy | Components | Components deciding background/manual toast suppression | Add store getters/actions. |
| `utils/appUpdateErrorDisplay.ts` | Localization-key selection by error kind | Components/store | Components duplicating error-kind switch statements | Add helper mappings. |

## Dependency Rules

- `AppUpdater` may depend on `electron-updater`, logger, shared app update types, and the classifier.
- `AppUpdateErrorClassifier` may depend only on shared app update types and local constants; no Electron, Vue, Pinia, or localization dependencies.
- Renderer store/components may depend on shared app update types and renderer display helper; they must not depend on classifier or raw provider error strings.
- Components must use store state and display helper/localization; they must not inspect raw diagnostics.
- Shared app update types must remain dependency-free.
- No layer may reintroduce renderer-facing raw diagnostic fields.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `app-update:get-state` | App update state | Return latest safe state. | No args | Returns no raw diagnostics. |
| `app-update:check` | Manual update check | Trigger user-initiated check. | No args; operation inferred as `manual-check` | Failure visible but safe. |
| `app-update:download` | Download available update | Trigger download. | No args; existing state must be `available` | Failure visible but safe. |
| `app-update:install` | Install downloaded update | Trigger restart/install. | No args; existing state must be `downloaded` | Failure visible but safe. |
| `app-update-state` event | App update state event | Broadcast safe state to renderer windows. | `AppUpdateState` | Must not include raw diagnostics. |
| `classifyAppUpdateError(error, context)` | Error classification | Convert raw error + operation into kind/safe message/raw diagnostic for logs. | `{ operation, fallbackMessage }` | Internal main-process function. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `app-update:get-state` | Yes | Yes | Low | Keep. |
| `app-update:check` | Yes | Yes | Low | Main marks operation `manual-check`. |
| `app-update:download` | Yes | Yes | Low | Main marks operation `download`. |
| `app-update:install` | Yes | Yes | Low | Main marks operation `install`. |
| `classifyAppUpdateError` | Yes | Yes | Low | Keep internal; no renderer import. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Updater lifecycle owner | `AppUpdater` | Yes | Low | Keep. |
| Error classifier | `AppUpdateErrorClassifier` / `classifyAppUpdateError` | Yes | Low | Add. |
| Error category | `AppUpdateErrorKind` | Yes | Low | Add. |
| Operation/source | `AppUpdateOperation` | Yes | Low | Add. |
| Display mapping | `appUpdateErrorDisplay` | Yes | Low | Add under renderer `utils`. |

## Applied Patterns (If Any)

- Classifier/strategy-like pure function: used locally inside Electron updater subsystem to convert external dependency errors into stable domain categories.
- State machine: existing updater status model remains the lifecycle state machine; `errorKind` adds category detail without replacing `status`.
- Adapter boundary: preload/IPC remains the adapter from Electron main to renderer.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/shared/appUpdateTypes.ts` | File | Shared state contract | Dependency-free updater state/types. | Used by Electron and renderer without boundary imports. | Electron APIs, Vue, localization, raw diagnostics. |
| `autobyteus-web/electron/updater/appUpdateErrorClassifier.ts` | File | Electron updater internal | Raw error -> safe category. | Same subsystem as updater lifecycle. | UI copy keys, toasts, renderer visibility. |
| `autobyteus-web/electron/updater/appUpdater.ts` | File | Electron updater lifecycle | Use classifier and safe state. | Existing owner. | Renderer localization or component policy. |
| `autobyteus-web/utils/appUpdateErrorDisplay.ts` | File | Renderer display helper | Error-kind -> localization keys/helpers. | Renderer-specific shared display policy. | Raw error parsing, Electron imports. |
| `autobyteus-web/stores/appUpdateStore.ts` | File | Renderer update state | Visibility/toast policy by operation/kind. | Existing owner. | Raw diagnostic parsing. |
| `autobyteus-web/components/app/AppUpdateNotice.vue` | File | Presentation | Global card safe display. | Existing surface. | Error regexes or raw interpolation. |
| `autobyteus-web/components/settings/AboutSettingsManager.vue` | File | Presentation | Settings safe display. | Existing surface. | Error regexes or raw interpolation. |

Rules:
- Keep the layout compact. This is a focused updater change; no new folder hierarchy is needed beyond one shared type and one renderer utility.
- Do not flatten classifier logic into `appUpdater.ts` if it makes lifecycle and pattern matching hard to review.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `electron/updater` | Main-Line Domain-Control + internal off-spine classifier | Yes | Low | Existing updater subsystem; classifier serves lifecycle owner. |
| `shared` | Shared contract | Yes | Low | Dependency-free IPC model only. |
| `stores` | Renderer state | Yes | Low | Existing store. |
| `utils` | Renderer off-spine display mapping | Yes | Medium | Keep only localization-key mapping, not raw parsing. |
| `components` | Presentation | Yes | Low | Components render store state. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Network error | Raw: `net::ERR_CONNECTION_CLOSED`; state: `{ status: 'error', errorKind: 'network', errorOperation: 'manual-check', message: 'Could not reach the update server. Try again later.' }`; UI: “Couldn’t check for updates. AutoByteus is still usable. Try again later.” | UI: `Could not complete the app update flow: net::ERR_CONNECTION_CLOSED` | Shows simple but meaningful message. |
| Release preparing | Raw: `Cannot find latest-mac.yml in the latest release artifacts (...)`; state kind: `release-preparing`; UI: “The latest update is still being prepared on GitHub. Try again in a few minutes.” | UI: long provider URL / stack / YAML | Explains deployment gap without blaming user. |
| Metadata long list | Raw: `ZIP file not provided: [{...large files...}]`; state kind: `metadata`; UI: “Update information is incomplete right now. Try again in a few minutes.” | UI: giant JSON file list | Prevents frightening technical walls of text. |
| Background quiet | Startup network error logs raw detail and updates state but `appUpdateStore.shouldShow` remains false. | Startup check opens an error card/toast over active work. | Keeps background checks non-disruptive. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `AppUpdateState.error` raw but stop using it in components | Easier incremental patch. | Rejected | Remove raw field from renderer contract; log raw diagnostics in main. |
| Truncate raw error to first 80 chars | Simpler than classification. | Rejected | It still exposes scary codes and URLs. Use `errorKind`. |
| Add “Details” accordion with raw dependency text | Technical users may want details. | Rejected for this scope | Use logs / optional future “Open Logs” action; normal UI remains simple. |
| Keep old `errorWithDetail` localization keys as fallback | Avoids catalog churn. | Rejected | Replace with safe category copy; no raw-detail fallback. |

## Derived Layering (If Useful)

- Electron main layer: raw provider interaction, classification, logging, safe state emission.
- IPC/preload layer: thin transport only.
- Renderer state layer: safe state application, visibility, toasts.
- Renderer presentation layer: localized display from safe state.

Layering is derived from ownership: renderer never reaches below the IPC boundary into provider diagnostics.

## Migration / Refactor Sequence

1. Add `shared/appUpdateTypes.ts` with tightened `AppUpdateState`, `AppUpdateErrorKind`, and `AppUpdateOperation`.
2. Add `appUpdateErrorClassifier.ts` with unit-covered classification patterns:
   - network/connection (`net::ERR_*`, `ECONNRESET`, `ENOTFOUND`, `ETIMEDOUT`, offline strings);
   - release preparing (`ERR_UPDATER_CHANNEL_FILE_NOT_FOUND`, missing `latest-*.yml`, missing release asset);
   - metadata/package (`ERR_UPDATER_ZIP_FILE_NOT_FOUND`, invalid update info, no files/checksum);
   - download/install/unavailable/unknown by operation/fallback.
3. Modify `AppUpdater`:
   - track operation (`startup-check`, `manual-check`, `download`, `install`, `updater-event`);
   - classify errors in all catch/event paths;
   - log raw diagnostic plus kind/operation;
   - apply safe state with `errorKind`, `errorOperation`, safe `message`, and no raw `error`.
4. Update global/preload/renderer types to import or mirror the shared safe type; remove raw `error` references.
5. Modify `appUpdateStore`:
   - apply new safe fields;
   - suppress card/toast for startup transient network/release-preparing errors;
   - show manual/user-initiated failures;
   - toast safe messages only once per error occurrence.
6. Add `utils/appUpdateErrorDisplay.ts` and modify `AppUpdateNotice.vue` / `AboutSettingsManager.vue` to use safe display mapping.
7. Update English and Chinese localization messages; remove/stop using raw-detail keys.
8. Update targeted tests.
9. Record release deployment gap in ticket docs and, if docs sync later confirms durable docs impact, `autobyteus-web/docs/electron_packaging.md`.

## Key Tradeoffs

- Removing raw error from renderer state is slightly more invasive than hiding it in components, but it prevents future leaks.
- App-side classification does not eliminate the GitHub deployment gap; it makes the user experience correct during the gap.
- A separate release-orchestration change would reduce transient failures, but it crosses workflow ownership and is intentionally deferred from the approved simple-message UX scope.

## Risks

- Classifier patterns may miss a new `electron-updater` error phrase. Mitigation: unknown errors still get safe generic copy and raw logs.
- Some errors may be emitted both as a rejected promise and `autoUpdater.on('error')`. Mitigation: store should toast once per classified error occurrence, and implementation should avoid duplicate state churn where practical.
- Type extraction can touch several files. Mitigation: keep shared type dependency-free and update targeted tests.

## Guidance For Implementation

- Do not add raw diagnostic display to any normal UI path.
- Keep messages simple but meaningful:
  - network: “Couldn’t reach the update server. AutoByteus is still usable. Try again later.”
  - release preparing: “The latest update is still being prepared on GitHub. Try again in a few minutes.”
  - metadata: “Update information is incomplete right now. Try again in a few minutes.”
  - download: “The update download was interrupted. Check your connection and try again.”
  - install: “The update was downloaded, but AutoByteus couldn’t restart to install it. Try again.”
  - unknown: “AutoByteus couldn’t complete the update check. Try again later.”
- Preserve existing successful states/actions (`available`, `downloading`, `downloaded`, `installing`, `no-update`).
- Keep `Check Again` and `Later` for error states where retry/dismiss is safe.
- Add tests that assert forbidden raw substrings are absent from rendered text and toast calls.
