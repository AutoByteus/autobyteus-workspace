# Design Review Report — S3: node desktop on the phone and in a desktop browser (autobyteus-407)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone/tickets/in-progress/node-desktop-on-phone/requirements-doc.md` (SR-002, `Approved`; REQ-S3-2, REQ-S3-3, DEC-S3-4, DEC-S3-5 refined within the direction, user informed)
- Upstream Investigation Notes: `.../node-desktop-on-phone/investigation-notes.md` (S3-01 … S3-12)
- Upstream Solution Revision Record: `.../node-desktop-on-phone/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `.../node-desktop-on-phone/design-spec.md` (SR-002, `Ready`; user approval of the design `Not required`)
- Supplemental Task Artifacts Reviewed: `pre-001-delivery-receipt-verification.md` (PRE-001 receipt; status only)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Architecture Review Revision Record: `.../node-desktop-on-phone/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: SR-002 revision for ARCH-REV-001 findings AR-S3-001 … 008
- Prior Review Round Reviewed: `1` (ARCH-REV-001, `Fail`)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis (round 2 addition: `node-desktop-stream.ts:46-73`: the constructor opens nothing; `start()` connects TCP and registers the end paths). Round 1: worktree `codex/node-desktop-on-phone` @ `e427a0c9cf`. Read on 2026-11-06:
  - Server: `autobyteus-server-ts/src/api/websocket/node-desktop.ts:1-92`; `src/node-desktop/node-desktop-stream.ts` (structure); `src/remote-access/services/remote-access-auth-service.ts:37-79`; `src/remote-access/services/paired-device-service.ts:69-77`; `src/api/websocket/remote-access-websocket-auth.ts`.
  - Web: `autobyteus-web/utils/nodeDesktopClient.ts:1-70`; `components/workspace/tools/NodeDesktopTile.vue:150-260`; `components/mobile/runScreen/MobileRunMenu.vue:1-56`; `composables/mobile/useMobileNavigation.ts:1-30,70-120`; `components/mobile/MobilePairedShell.vue` (screen `v-if`s); `components/mobile/runScreen/MobileRunTargetView.vue:12-62`; `utils/mobileFeatureGates.ts:1-80` and its readers; `docs/remote_access.md` (headings, lines 41, 49, 176-194); `tests/integration/novnc-package-contract.integration.test.ts:62-72`.
  - noVNC 1.7.0-g7c36fab: `package.json` (`"exports": "./core/rfb.js"`); `core/rfb.js` `sendKey`; `core/input/keysymdef.js:672-690` (`lookup`).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: a new concurrency/lifecycle owner (registry and timer), live revocation cut-off (security), a contract addition (4429), a client-side input surface on the View only boundary, and the Android lifecycle premise. These match the shared definitions.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

> Reading note (round 2): the verdict tables from here to "Round 2 Recheck" record the round 1 result. Every `Fail` / `Needs Correction` row in them is rechecked and resolved in the "Round 2 Recheck" section, which is authoritative together with "Latest Authoritative Result". `Pass` rows stand unchanged.

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. The parent REQ-009, 014–016 and 019 are approved by the user; the placement is in the user's own words; DEC-S3-1…8 were decided within the direction and the user was informed.
- Relevant existing behavior and evidence confirmed: Yes.
  - The run menu lists Artifacts/Files/Messages/Activity (`MobileRunMenu.vue:44-50`; S3-02 omits Activity, which is immaterial).
  - `openView` pushes `?screen=<view>` (`useMobileNavigation.ts:105`).
  - The shell renders each view under its own `v-if` (`MobilePairedShell.vue:28-35`), so leaving a view unmounts it.
  - The run screen knows a remote run (`MobileRunTargetView.vue:60-61`).
  - The route order is authorize → validate → resolve → stream, and the auth context carries `deviceId` for phones (`node-desktop.ts:74-89`; `remote-access-auth-service.ts:64-69`).
  - Phone credentials are long-lived device credentials with no expiry; revoked → `REMOTE_ACCESS_DEVICE_REVOKED`, disabled → `PHONE_ACCESS_DISABLED` (`remote-access-auth-service.ts:47-62`). The 30 s re-check therefore never closes a legitimate stream on token expiry.
  - The visibility/reconnect policy lives in the tile (`NodeDesktopTile.vue:175-245`).
- Scope guardrail confirmed: Yes (UC-002, UC-003 phone, UC-006 phone; out of scope: iOS, node switching, remote-run desktops, 403/404, the 415 follow-up, S2).
- Every prospective blocking `Design Impact` finding traceable: `Yes`
- Remaining material ambiguity: AR-S3-003 is a design-level reconciliation of REQ-S3-1 and REQ-S3-3 (see that finding).
- Statements about existing code, opened at their cited lines:
  - `remote_access.md` "lines 18, 38, 54, 189": the statements are at 41, 49 and 184 (AR-S3-008).
  - S3-07 `keysymdef.lookup` exists (`keysymdef.js:673`) but cannot be imported (AR-S3-001).
  - The other statements hold.

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-003 (view, zoom, Control, keyboard, full screen) | User | Pass | Pass | Fail | Needs Correction | AR-S3-001, 002, 003 |
| BEH-S3-2 (entry visibility) | User | Pass | Pass | Pass | Confirmed | AR-S3-007 (one owner) |
| REQ-016 (background) | System | Pass | Unclear (MP-001, verified first) | Pass | Confirmed with the declared premise gate | — |
| BEH-008 (revocation ≤ 30 s) | Contract | Pass | Pass | Fail | Needs Correction | AR-S3-004, 005 |
| BEH-S3-1 (limits) | System | Pass | Pass | Fail | Needs Correction | AR-S3-004 |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope | Linked | Internally Complete | Consistent | Status / Approval | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `pre-001-delivery-receipt-verification.md` | Pass | Pass (requirements Prerequisites, investigation PRE-001) | Pass | Pass | Pass (delivered) | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | Design spec | — |
| Root-cause classification explicit and evidence-backed | Pass | Duplicated policy risk; the tile owns the policy (`NodeDesktopTile.vue:175-245`) | — |
| Refactor decision explicit | Pass | Extract `useNodeDesktopConnection` first | — |
| Decision reflected in concrete sections | Pass | Removal plan, file mapping, sequence | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade vs Owner | Naming | One Owner / Call Order | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-S3-1 | Primary (phone) | Pass | Pass | Pass | Pass | Fail | Pass | Fail (AR-S3-003: Control + full screen has no traced way back; AR-S3-002: the keyboard input path is not traced) |
| DS-S3-2 | Primary (server admission) | Pass | Pass | Pass | Pass | Fail | Pass | Fail (AR-S3-004) |
| DS-S3-3 | Bounded local (re-check) | Pass | Pass | N/A | Pass | Fail | Pass | Fail (AR-S3-004, AR-S3-005) |
| DS-S3-4 | Bounded local (zoom) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

Review point 3: zoom only in View only is sound. A CSS transform does not change the layout size that noVNC's `scaleViewport` and ResizeObserver read, so the fit is unaffected. In View only the gesture layer receives every touch, so noVNC's own gesture handler sees none. Control removes the layer and returns to scale 1, and the S1 mode switch reconnects (D-4), so noVNC's pointer mapping in Control is never under a transform.

Implementation notes:
- Reset the zoom on resize and rotation.
- Ctrl+wheel needs a non-passive listener with `preventDefault` so the browser does not zoom the page (AC-018).
- A single tap has to wait out the double-tap window.

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| WS route → `NodeDesktopViewers` → `NodeDesktopStream` | Pass | Fail | Pass | Fail | AR-S3-004: the registry's interface cannot reach the stream it must close |
| `useNodeDesktopConnection` (both clients) | Pass | Pass | Pass | Pass | Review point 2: one owner, a move rather than a copy. The tile's gate also needs the screen element's size (`NodeDesktopTile.vue:181-185`), so the composable reads it from the session's container or takes the element. This is non-blocking. |
| `useVncSession` (only noVNC importer) | Pass | Pass | Pass | Pass | Gains `typeText`/`pressKey` (AR-S3-001 changes how) |
| `nodeDesktopClient.ts` | Pass | Pass | Pass | Pass | `too-many` added |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `node-desktop/node-desktop-viewers.ts` → `remote-access/services/remote-access-auth-service.ts` | Pass | Pass | Pass | Pass | — |
| `node-desktop/node-desktop-viewers.ts` → `api/websocket/remote-access-websocket-auth.ts` (exported mapping) | Pass | Fail | Fail | Fail | AR-S3-006 |
| Stream ← registry (notification only) | Pass | Pass | Pass | Pass | Review point 1: the ownership split is right. The interface is incomplete (AR-S3-004). |
| Web: view → connection policy → session → noVNC root import only | Pass | Fail | Pass | Fail | AR-S3-001 (deep import of `keysymdef`) |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Close 4429 `NODE_DESKTOP_TOO_MANY_VIEWERS` | Pass | Pass | Pass | Low | Pass |
| `NodeDesktopViewers.admit(viewer)` / `release(id)` | Pass | Pass | Pass | Medium | Fail (AR-S3-004) |
| `viewerStateForClose` → `too-many` | Pass | Pass | Pass | Low | Pass |
| `MobileView`/`MobileScreen` `desktop` | Pass | Pass | Pass | Low | Pass |
| `useVncSession.typeText(text)`, `pressKey(key)` | Pass | Pass | Pass | Low | Pass (shape). The mechanism changes under AR-S3-001. |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Credential re-check | Pass | Pass | N/A | Pass | `authorizeMobileCredential`. Each successful check also calls `markLastSeen`, a store write (`paired-device-service.ts:69-77`): one write per phone stream per tick. This is acceptable and truthful, since the phone is connected. |
| Failure → close code | Pass | Fail | N/A | Fail | AR-S3-006 (placement) |
| Session, client contract, availability, navigation | Pass | Pass | N/A | Pass | — |
| Availability on the client | Pass | Fail | Pass | Fail | AR-S3-007 |
| Mobile capability gating (`mobileFeatureGates.ts`) | Fail | Fail | N/A | Fail | AR-S3-008: not checked by the design |
| Keysym mapping | Pass | Fail | N/A | Fail | AR-S3-001 |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/node-desktop/` (registry) | Pass | Pass | Fail | Fail | AR-S3-004 |
| `composables/` (connection, availability), `composables/mobile/` (zoom), `components/mobile/views/` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Connection policy | Pass | Pass | Pass | Pass | Extracted |
| Failure → close mapping | Pass | Fail | Fail | Fail | AR-S3-006 |
| Node-desktop availability | Pass | Fail | Fail | Fail | AR-S3-007 |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `viewer = { kind, deviceId?, credential? }` | Pass | Pass | Pass | Pass (phone fields only for `mobile`) | Pass | A discriminated type would make "phone fields only for `mobile`" enforceable. Optional. |

- Derived consumers of a changed structure listed with a decision for each: `Pass` (`viewerStateForClose` → both clients; screen unions → `back()`).
- One vocabulary: `Fail`, minor. `mobileFeatureGates` keeps `'vnc'` as unsupported on mobile while S3 ships a VNC Viewer on mobile (AR-S3-008). Separately, the close-state message keys live under `workspace.components.workspace.tools.NodeDesktopTile.*` (`nodeDesktopClient.ts:18`) and are now shown by the phone view too. Moving them under the client contract's own namespace is optional.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `node-desktop-viewers.ts` | Pass | Pass | N/A | Pass | — |
| `useVncSession.ts` + `types/novnc.d.ts` (`keysymdef`) | Pass | Fail | N/A | Fail | AR-S3-001 |
| `MobileNodeDesktop.vue` (incl. hidden keyboard input) | Pass | Pass | N/A | Pass | AR-S3-002 fills in its behavior |
| `utils/mobileFeatureGates.ts` (+ spec) | — | — | — | Fail | Missing from the mapping (AR-S3-008) |
| Others | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear | Folder Matches | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Close mapping exported from `api/websocket/` for `node-desktop/` | Pass | Fail | Medium | Fail | AR-S3-006 |
| Other new files | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tile visibility/reconnect code | Pass | Pass | Pass | Pass | — |
| `remote_access.md` "no mobile VNC" statements | Pass | Pass | Fail | Fail | AR-S3-008: they are at 41, 49 and 184, and the "Mobile Capability Gating" section (176-194) needs the same update |
| Mobile tests asserting no VNC | Fail | Pass | Fail | Fail | AR-S3-008: no VNC assertion remains in `components/mobile/__tests__/`. The one left is `utils/__tests__/mobileFeatureGates.spec.ts:15`. |
| `mobileFeatureGates.ts` `'vnc'` | Fail | N/A | Fail | Fail | AR-S3-008 |

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retained | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Visibility policy | No | Pass | Pass | Moved, not copied |

## Persisted-Data Transition Verdict

`Not Affected`: the registry is in memory. Pass.

## Change / Refactor Sequence Verdict

| Area | Sequence Realistic | Temporary Seams | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| MP-001 first → server → web → docs → validation | Pass | Pass | Fail (AR-S3-008) | Fail |

Review point 4: making MP-001 the first implementation step, with a stop-and-return if it fails, is proportionate. It is the only Android-dependent premise, and S3-08 records why it is unclear.

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Policy reuse, zoom, revocation, limits | Yes | Pass | Pass | Pass | — |
| Registry ↔ stream wiring | Yes | Fail | N/A | Fail | AR-S3-004 |
| Keyboard bridge event handling | Yes | Fail | N/A | Fail | AR-S3-002 |

## Material Premise Validation

### MP-001 (design's own) — The Android page goes hidden when the app is backgrounded

- Reachability of the trigger: `Reachable` (user backgrounds the app; REQ-016). The consequence is `Unclear`, verified first in implementation with a declared escalation. This is accepted as the design's premise gate, and no machinery depends on it before verification.

### MP-R1 — Android soft keyboards do not deliver typed characters as usable `keydown` events

- Related requirement: REQ-S3-2 / AC-S3-1.
- Initiating basis kind: `User`. On the phone, in Control, the user taps Keyboard and types `abc`, Backspace, Enter (AC-S3-1, on the emulator's default keyboard).
- Forward path: a tap focuses the hidden input and the soft keyboard opens. Chrome/WebView on Android reports most soft-keyboard keys as `keydown` with `key: 'Unidentified'` / `keyCode 229`. With word suggestions on (Gboard's default), Latin letters arrive as composition updates (`compositionupdate`, `input` with `inputType: 'insertCompositionText'`), and Backspace arrives as `inputType: 'deleteContentBackward'`. This is documented platform behavior, and it is why noVNC's own web app reads its hidden textarea by diffing values (upstream `app/ui.js`; that file is not in the npm package).
- Consequence: a bridge built on `keydown`, or one that ignores composition (misreading the non-goal "no IME composition"), sends nothing or wrong keys, and AC-S3-1 fails.
- Reachability: `Reachable`
- Review consequence: AR-S3-002.

### MP-R2 — A tap in Control full screen is a desktop click

- Related requirement: REQ-S3-1 ("in Control … tap = click") and REQ-S3-3 ("one tap shows the controls again").
- Initiating basis kind: `User`. The user switches to Control, then taps Full screen (both offered by the view), then wants the bar back to type or leave Control.
- Forward path: in Control the gesture layer is removed (DS-S3-4) and touches go to noVNC (tap = click). The bars are hidden, and nothing in the design shows them again.
- Consequence: the user can return only through system Back, which leaves the view (`useMobileNavigation.back`), or not at all in a desktop browser. Either way the "one tap" promise cannot hold without clicking the desktop.
- Reachability: `Reachable`
- Review consequence: AR-S3-003.

## Unresolved Approved-Behavior Or Current-State Gaps

None beyond the findings.

## Round 2 Recheck (SR-002)

The unaffected round 1 verdicts stand. Every row of round 1 that failed was rechecked here.

The requirements refinements stay within the approved direction. REQ-S3-2 now covers Latin text that arrives through composition and leaves CJK input not guaranteed (that was already a non-goal). REQ-S3-3 now names the Control handle and has Back leave full screen first. Both were made the same way the baseline DEC-S3-* were approved: by the Solution Designer within the direction, with the user informed. This is not a change in intended behavior that would need a new approval.

| Finding | Status | Verification |
| --- | --- | --- |
| AR-S3-001 | Resolved | `useVncSession` owns the mapping: 0x20–0x7E and 0xA0–0xFF map to themselves, others to `0x01000000 \| cp`, plus Enter/Backspace/Tab. Keys go out through public `rfb.sendKey(keysym, null, down)`, which is already a no-op in View only. `types/novnc.d.ts` is updated to `sendKey`. There is no deep import, consistent with `novnc-package-contract.integration.test.ts:70`. Excluding 0x7F–0x9F (the control characters) is correct. |
| AR-S3-002 | Resolved, with an implementation note | The textarea attributes, `focus()` inside the tap handler, and diffing the value on every `input` event, never `keydown`, are all specified. Composition growth is covered, unit cases are listed and AC-S3-1 runs with Gboard. **AR-S3-009** (below) concerns the reset value. |
| AR-S3-003 | Resolved | In View only a tap shows the controls. In Control a top-edge handle outside noVNC's canvas does it, so it is never a desktop click. Full screen is the route key `full=1`, written only by `useMobileNavigation`, so Back walks full screen → view → run. Tests and an emulator case are listed. |
| AR-S3-004 | Resolved | The route constructs the stream; the S1 constructor opens nothing (`node-desktop-stream.ts:55-57`). Then `admit(viewer, stream)` subscribes to the stream's end. A refusal closes 4429 without `start()`, so no TCP connection opens. On admission the route calls `start()`, synchronously after the checks, so no socket close can slip in between. A rejected re-check calls `stream.close`, and the end notification removes the entry. The stream does not know the registry. |
| AR-S3-005 | Resolved | 20 s non-overlapping cycles (`setTimeout` after each cycle, `unref`) with a 5 s timeout per check give a bound of 25 s, under 30 s. Note: run one cycle's checks concurrently, with at most 4 phone streams. Otherwise a cycle of slow sequential checks could stretch the bound. The `lastSeenAt` write is noted. |
| AR-S3-006 | Resolved | The mapping moves to `src/remote-access/domain/remote-access-close-codes.ts`, imported by both the WS auth and the registry. |
| AR-S3-007 | Resolved | `useNodeDesktopAvailability` is the one owner. `VncViewer` uses it and its own fetch is removed. |
| AR-S3-008 | Resolved | `'vnc'` and its spec row are removed, with the evidence that nothing reads it. The doc references are corrected (41, 49, 184; section 176-194). The moot test row is dropped. |
| Review residual (mode switch at the limit) | Resolved | `switchMode` waits for the old socket's `close`. The wait is bounded: noVNC's own disconnect timeout fires `disconnected` after 3 s at the latest. |

### AR-S3-009 — An empty textarea loses Backspace (non-blocking; required in implementation)

- Type: `Design Impact`. Severity: Low.
- Protects: REQ-S3-2 (Backspace reaches the desktop), AC-S3-1.
- Evidence:
  - The bridge resets the textarea "to empty" once no composition is active, and it ignores `keydown`.
  - Once the textarea is empty, a Backspace press has nothing to delete, so no `input` event fires and nothing is sent. This happens, for example, after typing a word, committing it with space or Enter, then correcting.
  - noVNC's own web UI avoids this by resetting its hidden input to a non-empty sentinel (upstream `app/ui.js` `keyboardinputReset`, a run of `_` characters) and diffing against it.
- Required update, in implementation: reset to a fixed sentinel with the caret at its end, not to empty, and diff against the sentinel. A deletion into the sentinel becomes Backspace. Add unit cases for Backspace after a reset and for repeated Backspace. In the AC-S3-1 emulator run, type `abc`, then Enter, then Backspace. Record the choice in the implementation handoff. The design's mechanism (diffing the value) is unchanged, so this needs no design round.
- Recipient: implementation engineer (the Solution Designer informed).

### AR-S3-010 — Three stale summary lines in the design spec (non-blocking)

- Type: `Design Impact`. Severity: Low.
- Evidence:
  - Intended Change (line 39) still says "every 30 s".
  - Change Scope (line 43) still lists "`remote-access-websocket-auth.ts` (export the failure → close mapping)" and "`types/novnc.d.ts` (sendKey, keysymdef)".
  - Dependency Rules (line 129) still say "only `useVncSession` imports noVNC (`keysymdef` included)".

  These contradict the revised Ownership Map, DS-S3-3, the file mapping and AR-S3-001/006.
- Required update: implementation follows the revised Ownership Map, the spines and the file mapping. The Solution Designer corrects the three lines at the next revision of the spec. No design round is needed.
- Recipient: Solution Designer (informational); implementation engineer (follow the authoritative sections).

## Review Decision

- `Pass` (round 2): the basis is confirmed, AR-S3-001 … 008 are resolved in SR-002, and no in-scope machinery depends on an unsupported premise. AR-S3-009 and AR-S3-010 are non-blocking.

## Findings

Round 1 findings AR-S3-001 … 008 are resolved (see ARCH-REV-002). The open findings are the non-blocking AR-S3-009 and AR-S3-010 above.

## Classification

N/A — `Pass`.

## Recommended Recipient

Implementation engineer (`/software_engineering_team/implementation_engineer`), with an informational notice to the Solution Designer.

## Residual Risks

- MP-001: if backgrounding does not hide the page, it comes back as a prerequisite (declared, verified first).
- A successful re-check writes `lastSeenAt` once per phone stream per cycle (accepted).
- iOS is not verified (out of scope).
- REQ-S3-2 feasibility column still mentions "keysym lookup". This is evidence wording only.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-002)
- Material-Premise Gate: `Pass` (MP-001 is the declared first-step gate; MP-R1 resolved by AR-S3-002/009; MP-R2 resolved by AR-S3-003)
- Notes: classification Large/High is unchanged.
