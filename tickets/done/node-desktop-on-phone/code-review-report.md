# Code Review Report — S3: Node desktop on the phone and in a desktop browser (autobyteus-407)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md`, as cited by the design spec
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts Reviewed As Context: none behavior-defining; evidence read as cited by the handoff
- Relevant Solution Revision IDs: SR-001, SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): `git diff 2a90f99cf8 165de82af4` outside `tickets/` changes only `autobyteus-web/composables/useNodeDesktopAvailability.ts` (+4 lines and a doc comment) and its spec (+1 case). That is the file and behavior of CR-001. No spine, shared interface or other file changed.
- Trigger: Implementation Engineer IR-002 (CR-001 Local Fix, commit `0baf15a981`)
- Prior Review Round Reviewed: `1` (CRR-001, Fail)
- Latest Authoritative Round: `2`
- Failure-origin and delivery fields: N/A

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone`, branch `codex/node-desktop-on-phone`, base `origin/personal` @ `e427a0c9cf`, round 1 reviewed at `2a90f99cf8` (source `d84d2d0fdd`); round 2 at `165de82af4` (source `0baf15a981`).

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High`; route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The change adds a viewer registry with a timer, live revocation, close code 4429, a phone view with input handling, and an Android lifecycle premise.

## Review Scope

- Changed implementation and behavior reviewed: the full source diff `origin/personal...HEAD`, excluding `tickets/`.
- Files / areas reviewed:
  - Server: `src/node-desktop/{node-desktop-viewers,node-desktop-stream}.ts`, `src/api/websocket/{node-desktop,remote-access-websocket-auth}.ts`, `src/remote-access/domain/remote-access-close-codes.ts`. I also read `RemoteAccessAuthService.authorizeMobileCredential` and `RemoteAccessAuthContext` as context.
  - Web: `composables/{useVncSession,useNodeDesktopConnection,useNodeDesktopAvailability}.ts`, `composables/mobile/{useNodeDesktopZoom,useMobileNavigation}.ts`, `components/mobile/views/MobileNodeDesktop.vue`, `components/mobile/runScreen/{MobileRunMenu,MobileRunTargetView}.vue`, `components/mobile/MobilePairedShell.vue`, `components/workspace/tools/{NodeDesktopTile,VncViewer}.vue`, `utils/{nodeDesktopClient,mobileFeatureGates}.ts`, `types/novnc.d.ts`.
  - Tests: the registry unit tests, the route E2E additions, and the availability, phone view, session and connection specs (names and key assertions).
- Explicit exclusions: I reran no checks; all were recorded on the commits that contain the code they exercise. For docs and localization I checked only that the diffs exist.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`
- Design-spec behavior map verified against the implementation: `Yes`
- Design review report and round confirmed: ARCH-REV-002 Pass
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None
- Remaining material ambiguity: None

| Behavior ID | Status | Current Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| BEH-003 (REQ-014, 015, S3-1 … S3-3) | Confirmed | ⋮ (`MobileRunMenu` `showDesktop`) → `openView('desktop')` → `MobilePairedShell` → `MobileNodeDesktop` → `useNodeDesktopConnection.openViewOnly` → `useVncSession.connect('view')`. The gesture layer exists only in `view`, and the picture transform is `none` in `control`. Full screen is the route key `full=1`, and `back()` maps it to `screen: 'desktop'`. |
| REQ-016 | Confirmed | `useNodeDesktopConnection.handleVisibilityChange` was moved unchanged from the S1 tile. The tile has no visibility code left. |
| REQ-S3-2 | Confirmed | Hidden textarea, value diff that follows the caret, sentinel reset (`MobileNodeDesktop.vue:167-212`) → `typeText` / `pressKey` → `rfb.sendKey`. Keys are sent only in `control` while connected. |
| BEH-008 / REQ-009 | Confirmed | `NodeDesktopViewers.recheck` → `authorizeMobileCredential` (revocation and Phone Access both checked, `remote-access-auth-service.ts:50-61`) → `stream.close(remoteAccessCloseForFailure(code))`. Cycles do not overlap: `timer` stays set until the cycle ends (`:90-95`). |
| BEH-S3-1 / REQ-019 | Confirmed | The route constructs the stream (no TCP yet), calls `viewers.admit` and then `start()` only if admitted (`node-desktop.ts`). The entry is removed through `stream.onEnd`. |
| BEH-S3-2 / REQ-S3-4 | Confirmed | `MobileRunTargetView`: `availability === 'available' && !remote`. Since IR-002, `stateFor` asks the node again when the cached state is `error` (`useNodeDesktopAvailability.ts:38-40`). CR-001 is resolved. |
| Preserved: desktop app tile | Confirmed | The policy was moved, not copied. The only addition is Retry for `too-many`. |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related | Kind | Actor | Goal / Event | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-004/005 | REQ-014, S3-1…S3-4 | User | User on the phone or in a browser | See the agent's screen, optionally control it | Run ⋮ → VNC Viewer | Normal | as above | Desktop shown, View only first | requirements; emulator/browser evidence | Supported Normal Scenario | Use |
| SCN-004a | REQ-014, S3-4 | User | User on the phone | Open a run, then the VNC Viewer, after the paired node was briefly unreachable when the run screen was first shown (mobile network change, Tailscale reconnect, node restarting) | Run screen → ⋮ | Normal | `MobileRunTargetView` → `useNodeDesktopAvailability` → `fetchNodeDesktop` fails → `error` is cached in the module-level map | The entry should appear once the node answers again | The shell is built for the phone being off its node's network (pairing over Tailscale/HTTPS). The Android app keeps its page across rotation and background (autobyteus-415). | Supported Normal Scenario | Use |
| SCN-006 | REQ-019 | System | Node | Bounded viewers | 5th / 3rd-per-phone stream | Normal | admit → refused → 4429, no `start()` | Refused before upstream | route E2E | Supported Normal Scenario | Use |
| SCN-009 | REQ-009, 016 | System | Node / app lifecycle | No orphaned or unauthorized streams | Background, revoke, disable | Normal | visibility policy; re-check cycle | Stream ends ≤ 25 s / on hide | emulator, route E2E | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR-C-01 | `useNodeDesktopAvailability` caches a failed fetch (`error`) for the page's life. On the phone, nothing ever calls `reload`, so the VNC Viewer entry stays hidden even after the node answers again. | SCN-004a; REQ-014, REQ-S3-4 | The paired node is briefly unreachable when the user first opens a run screen | `stateFor` loads only when the map has no entry (`useNodeDesktopAvailability.ts:30-38`). Every later `MobileRunTargetView` mount gets the cached `error`, so `showDesktop` stays false until the app is restarted. | Code read. The only `reload` caller is the desktop app's `VncViewer` Retry (grep). The spec "reports an error and asks again on reload" covers only the explicit reload. | Promote | This ticket | Local Fix (CR-001). Resolved in IR-002 (`0baf15a981`). |
| CR-C-02 | A mode switch at a phone's 2-stream limit could race the server's `close` (registry release) against the browser's `close` event. | REQ-019 | The phone is already at its limit with two open streams, then switches mode | The new stream needs a fresh TCP connection, upgrade and async authorization before admission, so it reaches `admit` well after both sides have closed. | Design residual (AR review); emulator mode switches pass | Reject | — | Artificial timing at an edge; no machinery is needed. |
| CR-C-03 | A revoked phone still sees the ⋮ entry (available is cached). | REQ-S3-4 | Revocation | Opening the view shows "not allowed" and is refused | Handoff Known Risks | Reject | — | Correct refusal, no dead end. The phone's whole session is revoked anyway. |
| CR-C-04 | `viewerFor` refuses a `mobile` context without `deviceId` or credential with 4400. | Typing / fail-closed | — | `authorizeMobileCredential` always sets `deviceId`, and the credential is the one it just accepted | `remote-access-auth-service.ts:67-72`; `deviceId?` is optional in the type | Reject | — | It narrows an optional type and fails closed. It is not product machinery. |
| CR-C-05 | `new NodeDesktopViewers()` captures `getRemoteAccessAuthService()` at registration. | Ownership | — | The production singleton is never replaced; only `resetRemoteAccessAuthServiceForTests` resets it, and route tests inject their own registry | Code read | Reject | — | No production consequence. |
| CR-C-06 | `REMOTE_ACCESS_CLOSE_CODE_BY_FAILURE[failure] ?? 4401` has a fallback over an exhaustive record. | Principle 7 | — | Moved verbatim from `remote-access-websocket-auth.ts`, as the design asked (moved, not modified) | diff | Reject | — | Pre-existing and negligible. It keeps the move pure. |
| CR-C-07 | Re-check bound. | REQ-009 | Revocation during an open phone stream | Worst case is the 20 s interval plus a 5 s timeout = 25 s < 30 s; a timeout retries next cycle; `entries.has(entry)` guards a stream that ended mid-cycle; `dispose` during a cycle is safe | unit "at most one interval plus one timeout", route E2E ≤ 25 s, emulator 2.3 s | Reject (no defect) | — | — |
| CR-C-08 | Keyboard diff and composition. | REQ-S3-2 | Gboard | Prefix diff after a caret-aware suffix trim; no reset during composition; textarea only in Control | unit cases + `xev-run2-keysyms.txt` | Reject (no defect) | — | CJK is not guaranteed, as approved. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | The tile's policy was extracted first (moved, not copied) | None |
| Matches approved behavior-defining artifacts | Pass | CR-001 resolved: an `error` answer is asked again by the next caller | None |
| Data-flow spine clarity | Pass | DS-S3-1 … DS-S3-4 each have one owner file | None |
| Ownership boundary preservation | Pass | The registry owns limits and re-checks; the stream only notifies (`onEnd`) and never knows the registry; the route orders the steps. On the web, `useNodeDesktopConnection` decides when to connect, `useVncSession` owns noVNC and keysyms, and `useNodeDesktopAvailability` is the one availability owner. | None |
| Off-spine concern clarity | Pass | Auth service and close mapping reused; navigation owns `full=1` | None |
| Existing capability reuse | Pass | Close mapping moved to `remote-access/domain`, auth service reused, S1 session/client reused | None |
| Reusable owned structures | Pass | One close mapping, one `NodeDesktopClose` type, the tile's `NodeDesktopTile.*` keys reused for state texts | None |
| Shared-structure tightness | Pass | `NodeDesktopViewer` is a discriminated union, and only `mobile` carries a device and credential | None |
| Repeated coordination ownership | Pass | One connection policy for both clients | None |
| Empty indirection | Pass | `useNodeDesktopConnection.switchMode` is a one-line pass-through to the session. It is acceptable because it keeps the clients on a single policy surface. | None |
| SoC / file responsibility | Pass | Zoom, keyboard bridge (in the view, per design), registry and availability are each in their own place | None |
| Dependency direction | Pass | `node-desktop-viewers.ts` → auth service and domain mapping, with no Fastify | None |
| Authoritative Boundary Rule | Pass | The phone view and the tile reach the session only for state, `typeText` and `pressKey`, which the design names as the session's API. Connect, disconnect and mode go through the policy. | None |
| File placement | Pass | `composables/mobile/` for the phone-only zoom, `components/mobile/views/` for the view | None |
| Flat-vs-over-split | Pass | — | None |
| Interface clarity | Pass | `admit(viewer, stream) → 'admitted' \| { refused }`; `offer` = connect / reconnect / retry / null | None |
| Naming / one vocabulary | Pass | "node desktop", "viewer", "VNC Viewer" (UI) match GLOSSARY and the design | None |
| No unjustified duplication | Pass | — | None |
| Patch-on-patch control | Pass | The caret fix replaces the diff rule; it is not layered on top of it | None |
| Dead code removed in touched files | Pass | Tile visibility code, `'vnc'` gate and its spec row, `VncViewer`'s own fetch | None |
| Test scenarios/assertions requirement-aligned | Pass | Registry limits, re-check timing and non-overlap, credential never logged; route E2E 4429 before upstream and revoke/disable ≤ 25 s; keyboard cases including the Gboard caret; full-screen handle; zoom | None (CR-001 case added) |
| Test fixtures coherent | Pass | `FakeStream`, `phone()` builders | None |
| No stale/duplicate/compat-only tests | Pass | Gate spec row removed | None |
| API/E2E readiness | Pass | CR-001 resolved; remaining device coverage named in the handoff | None |

## Source File Size And Structure Audit (If Applicable)

| Source File | Before | After (non-empty) | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `server src/node-desktop/node-desktop-viewers.ts` | 0 | 106 | Pass | Pass | Pass | Pass | — | None |
| `server src/node-desktop/node-desktop-stream.ts` | 114 | 130 | Pass | Pass | Pass | Pass | — | None |
| `server src/api/websocket/node-desktop.ts` | 86 | 108 | Pass | Pass | Pass | Pass | — | None |
| `server src/remote-access/domain/remote-access-close-codes.ts` | 0 | 22 | Pass | Pass | Pass | Pass | — | None |
| `web components/mobile/views/MobileNodeDesktop.vue` | 0 | 204 | Pass | Pass | Pass | Pass | — | None |
| `web composables/mobile/useNodeDesktopZoom.ts` | 0 | 167 | Pass | Pass | Pass | Pass | — | None |
| `web composables/useVncSession.ts` | 118 | 186 | Pass | Pass | Pass | Pass | — | None |
| `web composables/useNodeDesktopConnection.ts` | 0 | ~90 | Pass | Pass | Pass | Pass | — | None |
| `web components/workspace/tools/NodeDesktopTile.vue` | 322 | 241 | Pass (shrank) | Pass | Pass | Pass | — | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | — |
| No legacy retention | Pass | The tile policy was moved, not duplicated. The mapping was moved, not re-exported. |
| Dead code removed in touched files | Pass | — |
| Persisted-data decision followed | Pass | `Not Affected` (in memory) |
| No dual reads/writes | Pass | — |
| Transition mechanics | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`. Implementation already updated `autobyteus-web/docs/remote_access.md` (phone desktop; the Phase One text replaced) and `autobyteus-server-ts/docs/modules/node_desktop.md` (limits, re-check, 4429, `node-closed`). Delivery verifies them in docs sync.

## Additional Material Premise Validation (When Required)

| Premise ID | Status | Reason |
| --- | --- | --- |
| MP-001 (Android background → hidden) | Confirmed | `evidence/MP-001/`: hidden on Home, visible on return, same pid |

New or reclassified premises: none. SCN-004a is a normal phone network event; it is recorded in the scenario gate above.

## Review Scorecard (Mandatory)

- Overall score: `9.5 / 10` (simple average)

| Priority | Category | Score | Why | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | The admit-then-start ordering and the end notification read directly in the route and the stream | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | The registry, policy, availability and session owners are distinct, and the stream knows nothing of the registry | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Tight union types, `offer`, `admit` result | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | The keyboard bridge sits in the view as the design says | `MobileNodeDesktop.vue` holds both the view and the bridge (204 lines); still coherent | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | The `NodeDesktopViewer` union carries phone fields only for phones | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | Comments state the why (sentinel, caret, non-overlap) | — | — |
| 7 | API/E2E Readiness | 9.3 | Strong unit, E2E, emulator and browser evidence; the CR-001 case fails on IR-001 and passes now | AC-021 has not been rendered on a device | Render AC-021 in API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Limits, re-check bound, mode-switch wait, keyboard and zoom are correct, and an availability error no longer hides the entry (CR-001 resolved) | Only Gboard was exercised | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean moves | — | — |
| 10 | Cleanup Completeness | 9.5 | `'vnc'` gate and doc text removed | — | — |

## Findings

None open. CR-001 (a failed availability fetch hid the phone's VNC Viewer entry until the app restarted) was resolved in IR-002. `stateFor` now asks the node again when the cached state is `error`; `available`/`unavailable` stay cached; `reload` is unchanged. Verified in `0baf15a981` and in the new spec case (`error`, then a later caller fetches and both see `available`, with a third caller not fetching: 2 fetches). Resolution history is in `code-review-revision-record.md` CRR-002.

## Follow-ups

- Follow-ups this review added: None.

## Classification

N/A — Pass.

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (implementation review pass). Implementation Engineer gets an informational notice.

## Residual Risks

- AC-021 "too many viewers" has not been rendered on a device or in a browser (server E2E and specs only). The handoff suggests three tabs of one paired browser.
- Only Gboard Latin was exercised for the keyboard bridge.
- Fresh-start build not run. The handoff says S3 changes no build input; the change touches only source, tests, localization and docs, with no `tsconfig`, `package.json` or `nuxt.config` change.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5 / 10; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: Round 2 was a targeted delta review. CR-001 is resolved; nothing else changed.
