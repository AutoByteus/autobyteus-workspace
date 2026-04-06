# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- Comments: use brief inline comments with `# ...`.
- Do not include legacy/backward-compatibility branches.
- Keep decoupling visible in call paths: avoid bidirectional cross-subsystem loops and unclear dependency direction.

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/browser-navigate-load-hang/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/done/browser-navigate-load-hang/implementation.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `Solution Sketch`, `Spine-Led Dependency And Sequencing Map`
  - Ownership sections: `Primary Owners / Main Domain Subjects`, `Principles`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- If migration from as-is to to-be requires transition logic, describe that logic in `Transition Notes`; do not replace the to-be call stack with current flow.
- Every use case must declare which spine(s) it exercises from the approved design basis.
- `Primary End-to-End` in this document means the primary top-level business spine for that use case. There can be multiple primary use cases and multiple primary spines across one ticket.
- If a use case primarily validates a bounded local spine, state that explicitly instead of hiding it inside a generic end-to-end stack.
- A bounded local spine is always attached to a parent owner.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001, DS-002, DS-003 | Primary End-to-End | Browser navigation stack | Requirement | R-001, R-004 | N/A | Document navigation completes and returns success | Yes/No/Yes |
| UC-002 | DS-001, DS-002, DS-003 | Primary End-to-End | Browser navigation stack | Requirement | R-002, R-004 | N/A | Same-document navigation completes and returns success | Yes/No/Yes |
| UC-003 | DS-001, DS-002, DS-003 | Primary End-to-End | Browser navigation stack | Requirement | R-003, R-004 | N/A | Failed or cancelled navigation returns deterministic error | Yes/No/Yes |
| UC-004 | DS-004 | Bounded Local | `autobyteus-web` build/handoff path | Requirement | R-005 | N/A | Stage 7 build and user-validation handoff is produced | Yes/N/A/Yes |

## Transition Notes

- Target state keeps one authoritative navigation wait owner in `BrowserTabNavigation`.
- Current narrow event-only wait logic is replaced by a unified settlement helper that handles:
  - document navigation readiness
  - same-document navigation success
  - provisional/main-frame failure rejection
  - guarded cleanup to avoid double settlement

## Use Case: UC-001 [Document navigation completes and returns success]

### Spine Context

- Spine ID(s): `DS-001`, `DS-002`, `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `BrowserTabNavigation`
- Why This Use Case Matters To This Spine:
  - It is the primary broken agent-visible path reported by the user.
- Why This Spine Span Is Long Enough:
  - It begins at the browser tool entrypoint, crosses the server/browser bridge boundary, reaches the Electron wait owner, and returns through the bridge response path.

### Goal

Return a successful `navigate_to` result once a normal document navigation reaches the requested ready state.

### Preconditions

- A browser session already exists and `tab_id` is valid.
- Requested URL normalizes successfully.

### Expected Outcome

- Browser bridge returns `{ tab_id, status: "navigated", url }`.
- Session URL/title state reflects the new document.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-tools/browser/navigate-to.ts:navigateTo(...)
├── autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts:BrowserToolService.navigateTo(...) [ASYNC]
├── autobyteus-server-ts/src/agent-tools/browser/browser-bridge-client.ts:BrowserBridgeClient.navigateTo(...) [IO]
├── autobyteus-web/electron/browser/browser-bridge-server.ts:BrowserBridgeServer.handleRequest(...) [IO]
├── autobyteus-web/electron/browser/browser-tab-manager.ts:BrowserTabManager.navigateSession(...) [STATE]
├── autobyteus-web/electron/browser/browser-tab-navigation.ts:BrowserTabNavigation.loadUrl(...) [ASYNC]
│   ├── autobyteus-web/electron/browser/browser-tab-navigation.ts:BrowserTabNavigation.waitForRequestedReadyState(...) [STATE]
│   └── electron:webContents.loadURL(...) [ASYNC]
└── autobyteus-web/electron/browser/browser-bridge-server.ts:BrowserBridgeServer.writeJson(...) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] requested wait_until is domcontentloaded
autobyteus-web/electron/browser/browser-tab-navigation.ts:BrowserTabNavigation.waitForRequestedReadyState(...)
└── resolve on electron:'dom-ready' for the main document path
```

```text
[ERROR] main-frame navigation fails
electron:'did-fail-load' / electron:'did-fail-provisional-load'
└── autobyteus-web/electron/browser/browser-tab-navigation.ts:BrowserTabNavigation.waitForRequestedReadyState(...)
```

### State And Data Transformations

- tool input -> normalized navigate request
- normalized URL -> Electron navigation attempt
- successful ready-state wait -> browser bridge JSON success payload

### Observability And Debug Points

- Logs emitted at browser tool invocation/failure boundaries.
- Browser session summary updates emitted by `BrowserTabManager`.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- none after Stage 3 design basis for this use case

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Same-document navigation completes and returns success]

### Spine Context

- Spine ID(s): `DS-001`, `DS-002`, `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `BrowserTabNavigation`
- Why This Use Case Matters To This Spine:
  - It is the most obvious blind spot in the current event-only wait model and explains at least one observed user symptom.
- Why This Spine Span Is Long Enough:
  - It still shows the full user-visible request and response path, not only the local in-page event handling.

### Goal

Return success for same-document navigation without depending on `did-finish-load`.

### Preconditions

- Existing session is open.
- Target URL is same-document/in-page for the current page.

### Expected Outcome

- Browser bridge returns success promptly.
- Session URL updates to the requested same-document target.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-tools/browser/navigate-to.ts:navigateTo(...)
├── autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts:BrowserToolService.navigateTo(...) [ASYNC]
├── autobyteus-server-ts/src/agent-tools/browser/browser-bridge-client.ts:BrowserBridgeClient.navigateTo(...) [IO]
├── autobyteus-web/electron/browser/browser-bridge-server.ts:BrowserBridgeServer.handleRequest(...) [IO]
├── autobyteus-web/electron/browser/browser-tab-manager.ts:BrowserTabManager.navigateSession(...) [STATE]
├── autobyteus-web/electron/browser/browser-tab-navigation.ts:BrowserTabNavigation.loadUrl(...) [ASYNC]
│   ├── electron:webContents.loadURL(...) [ASYNC]
│   └── autobyteus-web/electron/browser/browser-tab-navigation.ts:BrowserTabNavigation.waitForRequestedReadyState(...)
│       └── resolve on electron:'did-navigate-in-page' when the main-frame URL matches the requested target
└── autobyteus-web/electron/browser/browser-bridge-server.ts:BrowserBridgeServer.writeJson(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] in-page navigation never reaches requested target URL
autobyteus-web/electron/browser/browser-tab-navigation.ts:BrowserTabNavigation.waitForRequestedReadyState(...)
└── reject on fail/provisional-fail or loadURL rejection instead of hanging indefinitely
```

### State And Data Transformations

- requested same-document URL -> main-frame in-page navigation event
- in-page event -> session URL mutation -> bridge success payload

### Observability And Debug Points

- Session upsert events from `BrowserTabManager`
- browser tool success result payload

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- none after Stage 3 design basis for this use case

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 [Failed or cancelled navigation returns deterministic error]

### Spine Context

- Spine ID(s): `DS-001`, `DS-002`, `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `BrowserTabNavigation`
- Why This Use Case Matters To This Spine:
  - The current defect class includes indefinite waits when failure signals do not match the narrow handled set.
- Why This Spine Span Is Long Enough:
  - It includes the full failure propagation path back to the browser tool result, which is the user-visible outcome.

### Goal

Reject failed or cancelled main-frame navigations deterministically.

### Preconditions

- A navigation attempt has started.
- Electron reports a main-frame load failure, provisional failure, or `loadURL()` rejection.

### Expected Outcome

- Browser bridge responds with `browser_navigation_failed`.
- Agent runtime receives a serialized browser error instead of a stuck invocation.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-tools/browser/navigate-to.ts:navigateTo(...)
├── autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts:BrowserToolService.navigateTo(...) [ASYNC]
├── autobyteus-server-ts/src/agent-tools/browser/browser-bridge-client.ts:BrowserBridgeClient.navigateTo(...) [IO]
├── autobyteus-web/electron/browser/browser-bridge-server.ts:BrowserBridgeServer.handleRequest(...) [IO]
├── autobyteus-web/electron/browser/browser-tab-manager.ts:BrowserTabManager.navigateSession(...) [STATE]
├── autobyteus-web/electron/browser/browser-tab-navigation.ts:BrowserTabNavigation.loadUrl(...) [ASYNC]
│   └── autobyteus-web/electron/browser/browser-tab-navigation.ts:BrowserTabNavigation.waitForRequestedReadyState(...)
│       ├── reject on electron:'did-fail-load'
│       ├── reject on electron:'did-fail-provisional-load'
│       └── reject on electron:webContents.loadURL(...) promise failure
└── autobyteus-web/electron/browser/browser-bridge-server.ts:BrowserBridgeServer.writeJson(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] failure path serialization
autobyteus-web/electron/browser/browser-bridge-server.ts:BrowserBridgeServer.handleRequest(...)
└── wrap BrowserTabError into JSON error payload for the browser tool client
```

### State And Data Transformations

- Electron failure signal -> `BrowserTabError`
- `BrowserTabError` -> bridge JSON error payload -> serialized browser tool error

### Observability And Debug Points

- browser tool failure logging
- browser bridge error payloads

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- none after Stage 3 design basis for this use case

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 [Stage 7 build and user-validation handoff is produced]

### Spine Context

- Spine ID(s): `DS-004`
- Spine Scope: `Bounded Local`
- Governing Owner: `autobyteus-web` build/handoff path
- Why This Use Case Matters To This Spine:
  - The user explicitly requested a Stage 7 Electron build so they can run the app and verify the fix themselves.
- Why This Spine Span Is Long Enough:
  - The bounded local spine covers the concrete build pipeline and the artifact handoff path needed for manual executable validation.
- If `Spine Scope = Bounded Local`, Parent Owner:
  - Stage 7 executable validation workflow for this ticket

### Goal

Produce a built Electron app and precise validation instructions for user testing.

### Preconditions

- Stage 6 implementation and focused validation are complete.
- Worktree dependencies are bootstrapped.

### Expected Outcome

- `api-e2e-testing.md` records the automated evidence gathered.
- Electron app build command succeeds and output path is documented for the user.

### Primary Runtime Call Stack

```text
[ENTRY] operator shell command:pnpm build:electron
├── autobyteus-web/package.json:scripts.build:electron [ASYNC]
├── autobyteus-web/scripts/guard-web-boundary.mjs [IO]
├── autobyteus-web/scripts/prepare-server-dispatch.mjs [ASYNC][IO]
├── autobyteus-web/node_modules/.bin/tsc (electron/build transpilation) [ASYNC][IO]
└── autobyteus-web/build/dist/build.js [ASYNC][IO]
```

### Branching / Fallback Paths

```text
[ERROR] dependency bootstrap or build failure
operator shell command
└── Stage 7 artifact records blocker and exact command failure for user visibility
```

### State And Data Transformations

- source tree + installed dependencies -> packaged Electron build artifacts
- Stage 6 validation output -> Stage 7 user handoff instructions

### Observability And Debug Points

- shell command logs
- build artifact output paths
- Stage 7 ticket artifact updates

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- exact dependency bootstrap method in the dedicated worktree will be chosen in Stage 6/7 based on the safest available environment path

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
