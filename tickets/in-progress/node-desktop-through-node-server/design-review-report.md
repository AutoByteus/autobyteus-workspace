# Design Review Report — S1: node desktop through the node's own server (autobyteus-405)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server/tickets/in-progress/node-desktop-through-node-server/requirements-doc.md` (SR-001, `Approved`)
- Upstream Investigation Notes: `.../node-desktop-through-node-server/investigation-notes.md` (S1-01 … S1-06) + parent `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-desktop-access-through-node-server/tickets/in-progress/remote-desktop-access-through-node-server/investigation-notes.md` (AF-01 … AF-17)
- Upstream Solution Revision Record: `.../node-desktop-through-node-server/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `.../node-desktop-through-node-server/design-spec.md` (SR-002, `Ready`)
- Supplemental Task Artifacts Reviewed: parent `probes/rfb-forwarding-probe.mjs`, `handshake-result.json`, `resize-result.json` (existence and role only)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Architecture Review Revision Record: `.../node-desktop-through-node-server/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: SR-002 design revision for ARCH-REV-001 findings AR-001 … AR-005
- Prior Review Round Reviewed: `1` (ARCH-REV-001, `Fail`)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis (round 2 additions: `@fastify/websocket/index.js:208-221` default preClose `client.close()` with no code; noVNC `websock.js:297-307` `close()` with no code; `ServerSettingsEndpointCards.vue:236,252`; Node `net.Socket` `readableHighWaterMark` 65536). Round 1: worktree `codex/node-desktop-through-node-server` @ `9e0681bf39` (base `origin/personal`); code read on 2026-11-06: `autobyteus-server-ts/src/api/websocket/{terminal.ts, remote-access-websocket-auth.ts, index.ts}`, `src/api/security/{remote-access-route-policy.ts:60-100,160-185, remote-access-policy-plugin.ts}`, `src/node-update/{starter-client.ts:10, node-update-routes.ts:1-35}`, `docker/starter/server-supervisor.mjs:56`, `docker/docker-compose.yml`, `src/services/server-settings-service.ts:113-116`; web `composables/useVncSession.ts`, `components/workspace/tools/{VncViewer.vue, VncHostTile.vue}`, `components/layout/{RightSideTabs.vue:68, WorkspaceToolShell.vue:19-28}`, `utils/nodeEndpoints.ts`, `composables/useTerminalSession.ts:107-140`, `components/settings/ServerSettingsEndpointCards.vue:151-300`, `types/novnc.d.ts`; noVNC 1.7.0-g7c36fab `core/rfb.js` (constructor 92-115, 560-575, `_socketClose` 659-694, state dispatch 930-952, `_fail` 962-982, `RFB.messages` 3091-3402) and `core/websock.js` attach 265-290; `ws` 8 `lib/websocket.js:120-124,341,422`; launcher `bash/container-config.sh:1-49`, `bash/core.sh`, `bash/docker-runtime.sh` (grep); `DESIGN.md` rules 9, 11, "Before accepting a design".

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: new server subsystem and two routes, new client contract, security-relevant protocol filter as the View only boundary, long-lived binary streams with backpressure, settings-surface removal, deployment change (published ports). Matches the shared definitions.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. Design approval recorded as `Obtained`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. The parent REQ/AC IDs at parent SR-004 are restricted to S1, and DEC-S1-1 is decided within the direction. The requirements did not change in SR-002. D-10 reads the approved REQ-005; it adds no new behavior.
- Relevant existing behavior and evidence confirmed: Yes (round 1 evidence stands). In round 2 I also confirmed the noVNC channel and close behavior cited in S1-06, `@fastify/websocket` default preClose (`index.js:208-221`), and the dead `hostPort` lines (`ServerSettingsEndpointCards.vue:151,196,236,252`).
- Scope guardrail confirmed: Yes. No change in SR-002.
- Every prospective blocking `Design Impact` finding traceable: `Yes` (no blocking finding remains)
- Remaining material ambiguity: None. AR-006 is a non-blocking detail for implementation.
- Statements about existing code, opened at their cited lines: hold. The round 1 drifts are fixed, apart from `triggerInitialRemoteResize` at 79-100 against the cited 80-101, which is immaterial.

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001/002 | User | Pass | Pass | Pass | Confirmed | — (AR-001 resolved) |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | System | Pass | Pass | Pass | Confirmed | — (D-10 covers reconnect mode) |
| BEH-007 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | Contract | Pass | Pass | Pass | Confirmed | — |
| REQ-002 / AC-003 | Contract | Pass | Pass | Pass | Confirmed | — (AR-002 resolved) |
| REQ-008/010/011 (DS-004) | System | Pass | Pass | Pass | Confirmed | — (AR-004 resolved; AR-006 non-blocking) |
| BEH-011 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-012 | User | Pass | Pass | Pass | Confirmed | — (AR-003 resolved) |
| BEH-009 | User | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope | Linked | Internally Complete | Consistent | Status / Approval | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Parent `probes/rfb-forwarding-probe.mjs` (+ results) | Pass | Pass | Pass | Pass | Pass | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | Design spec, Task Design Health Assessment | — |
| Root-cause classification explicit and evidence-backed | Pass | Boundary/ownership issue plus legacy pressure (`VncViewer.vue:34-52`, `useVncSession.ts:79-100`) | — |
| Refactor decision explicit | Pass | `Yes`, clean cut in this change | — |
| Decision reflected in concrete sections | Pass | Removal plan (now complete), rejection log, file mapping | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade vs Owner | Naming | One Owner / Call Order | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Return/Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Operational | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

Notes:

- DS-001 now shows the client driving the sequence: `useVncSession` creates the socket, registers its close listener, then hands the socket to RFB.
- DS-004 now traces the close code back to the tile: close event → listener → noVNC `disconnect` → `viewerStateForClose` → tile. The ordering holds. noVNC sets `onclose` as a property during `attach` inside the RFB constructor (`rfb.js:560-575`, `websock.js:284`), after the composable's `addEventListener` call. The composable's listener therefore runs first, also on the `_fail` path, which dispatches `disconnect` synchronously from inside `onclose`.
- Endpoint source: the existing pattern is `useWindowNodeContextStore().getBoundEndpoints()` (`useTerminalSession.ts:111-112`). This is a non-blocking note.

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `/ws/node-desktop` route → `NodeDesktopStream` → `RfbViewerInputFilter` | Pass | Pass | Pass | Pass | The route authorizes, validates the query, resolves the target, then starts the stream |
| `resolveNodeDesktop` | Pass | Pass | Pass | Pass | — |
| `nodeDesktopClient.ts` (URL, `viewerStateForClose`) | Pass | Pass | Pass | Pass | — |
| `useVncSession` (only noVNC importer; owns socket + RFB) | Pass | Pass | Pass | Pass | One socket and one RFB per connection |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `api/{rest,websocket}/node-desktop.ts` → `node-desktop/*`, shared WS auth | Pass | Pass | Pass | Pass | — |
| `node-desktop-availability.ts` → `starter-client.ts` (constant) | Pass | Pass | Pass | Pass | The C4 fact is read, not changed |
| Web components → `nodeDesktopClient` / `useVncSession` | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `GET /rest/node-desktop` → `{ available }` | Pass | Pass | Pass | Low | Pass |
| `/ws/node-desktop?mode=view\|control[&access_token]` (exactly one `mode`, at most one `access_token`, nothing else) | Pass | Pass | Pass | Low | Pass |
| `resolveNodeDesktop(env)` | Pass | Pass | Pass | Low | Pass |
| `RfbViewerInputFilter(mode).accept(chunk)` | Pass | Pass | Pass | Low | Pass |
| `fetchNodeDesktop`, `nodeDesktopStreamUrl`, `viewerStateForClose({code, reason})` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| WS authorization, Docker-node fact, shutdown, redaction, endpoints | Pass | Pass | N/A | Pass | As round 1 |
| Visibility handling | Pass | Pass | N/A | Pass | Electron does not disable `backgroundThrottling`, so the Page Visibility API reports minimize and hide |
| noVNC channel mode | Pass | Pass | N/A | Pass | Uses noVNC's public `urlOrChannel` and leaves noVNC unpatched |
| Binary bridge + RFB framing | Pass | Pass | Pass | Pass | D-1 |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/node-desktop/` | Pass | Pass | Pass | Pass | — |
| `src/api/{rest,websocket}` | Pass | Pass | Pass | Pass | — |
| Web tools/composable/utils | Pass | Pass | Pass | Pass | — |
| Settings card | Pass | Pass | Pass | Pass | — |
| Launcher/compose | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `NodeDesktopMode` | Pass | N/A (wire contract across packages) | Pass | Pass | — |
| Close-code map | Pass | Pass (`nodeDesktopClient.ts`) | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `NodeEndpoints.nodeDesktopWs` | Pass | Pass | Pass | N/A | Pass | — |
| `{ available: boolean }` | Pass | Pass | Pass | N/A | Pass | — |
| Viewer state union (`not-allowed`/`unavailable`/`disconnected`/`unreachable`/`closed`) | Pass | Pass | Pass | N/A | Pass | — |

- Derived consumers of a changed structure listed with a decision for each: `Pass`
- One vocabulary: `Pass`. "Node desktop" is added to GLOSSARY. Implementation note: keep the stream's field typed `NodeDesktopMode` and log the auth kind as `viewer=`, so it stays apart from `RemoteAccessAuthContext.mode`.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server `node-desktop/*` (3 files), WS/REST entries | Pass | Pass | N/A | Pass | — |
| `useVncSession.ts` | Pass | Pass | N/A | Pass | Owns the socket and the RFB |
| `types/novnc.d.ts` | Pass | Pass | N/A | Pass | Now in the mapping |
| `NodeDesktopTile.vue`, `VncViewer.vue`, `nodeDesktopClient.ts`, `ServerSettingsEndpointCards.vue` | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear | Folder Matches | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/node-desktop/` (flat) | Pass | Pass | Low | Pass | — |
| Entries in `src/api/{rest,websocket}/` | Pass | Pass | Low | Pass | — |
| `components/workspace/tools/NodeDesktopTile.vue` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Round 1 items (host list, password, resize, settings key, launcher/compose env and 6080, `vncHosts.ts`) | Pass | Pass | Pass | Pass | — |
| `hostPort` format code in `ServerSettingsEndpointCards.vue` | Pass | Pass | Pass | Pass | The other `field.format === 'url'` checks (`:270`, `:283`) become always true. Implementation should simplify them under the same row. |
| `types/novnc.d.ts` credentials typings | Pass | Pass | Pass | Pass | — |
| Font-size audit path | Pass | Pass | Pass | Pass | — |
| Generated `VncHostTile.*` keys | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retained | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Client host list / password / resize | No | Pass | Pass | DESIGN.md rule 9 |
| Launcher 6080 / host env | No | Pass | Pass | `v9` recreate |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Saved `AUTOBYTEUS_VNC_*` in data-dir `.env` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | — |
| Launcher state `NOVNC_PORT` / `noVncPort` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Server → web → launcher → docs → validation | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Filter table and −316 rationale | Yes | Pass | Pass | Pass | Verified against noVNC 1.7.0 `RFB.messages` (round 1) |
| Close code → viewer state (D-7 table) | Yes | Pass | N/A | Pass | See AR-006 (1005 row) |
| Socket ownership in `useVncSession` | Yes | Pass | Pass | Pass | Code shape given in the Ownership Map |
| Query validation, backpressure bound, reconnect mode | Yes | Pass | Pass | Pass | AR-004: one Node TCP read is ≤ 64 KiB (`net.Socket` `readableHighWaterMark` 65536) |

## Material Premise Validation

### MP-001 — A server-side close reaches the viewer without its close code

- Reachability: `Reachable` (round 1 record unchanged).
- Review consequence: AR-001 is resolved. The composable owns the socket and reads `CloseEvent.code`/`reason` itself.

### MP-002 — A server restart closes viewer sockets with no status code

- Related approved requirement: AC-011 ("server restarts → viewer shows disconnected and can reconnect"); D-7.
- Relevant behavior IDs: DS-004.
- Initiating basis kind: `Operational`. The node restarts or updates in place (supported: node-update C4, SIGTERM).
- Forward path: Fastify close runs `@fastify/websocket` `defaultPreClose`, which calls `client.close()` with no code (`index.js:208-221`). The browser's `CloseEvent.code` is then 1005, which matches none of D-7's rows (4401/4403, 4404, 4502, 4400, 1006, 1000/1001). noVNC's own client-initiated close also sends no code (`websock.js:302`).
- Consequence: the D-7 mapping has no defined result for the AC-011 server-restart case.
- Reachability: `Reachable`
- Review consequence: AR-006 is non-blocking. Every D-7 state already offers Connect or Reconnect, so AC-011's outcome holds whichever row 1005 joins. Only the shown text is undefined.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass` — the behavior basis is confirmed and AR-001 … AR-005 are resolved in the SR-002 design spec. No in-scope machinery depends on an unsupported premise, so the design is ready for implementation.

## Findings

Round 1 findings AR-001 … AR-005 are resolved; see `architecture-review-revision-record.md` ARCH-REV-002.

### AR-006 — D-7 has no row for close code 1005 or for unlisted codes (non-blocking)

- Type: `Design Impact`. Severity: Low (non-blocking).
- Protects: AC-011, plus the requirements UI state "disconnected with reason".
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Evidence: MP-002.
- Required update: in `viewerStateForClose`, map 1005, and any code the table does not list, explicitly to a state that offers Reconnect. `disconnected` is the closest to AC-011's "shows disconnected and can reconnect". Add one unit case for 1005 and one for an unlisted code. When the user ends the stream themselves (Disconnect, mode switch, hidden window), the composable knows it initiated the close and should not show an error state. The implementation engineer may settle this and record it in the implementation handoff. It does not need another design round.
- Why proportionate: one table row and two tests.
- Recipient: implementation engineer (informational to the Solution Designer).

## Classification

N/A — `Pass`. AR-006 is non-blocking.

## Recommended Recipient

Implementation engineer (`/software_engineering_team/implementation_engineer`), with an informational notice to the Solution Designer.

## Residual Risks

- DEC-S1-1: a paired phone with a valid credential can open a `control` stream through a raw client before S3. This is approved (REQ-003, parent DEC-002). The live revocation cut-off is S3.
- Until S2, 5900/6080/9223 still listen on the container interface inside the node, but none is published after S1.
- In Control, a paste larger than the filter's 1 MiB `ClientCutText` cap closes the stream with 4400. This is fail-closed; record it in the module doc.
- AR-004's bound counts payload bytes. `bufferedAmount` also counts the WebSocket frame header (≤ 10 bytes per message for an unmasked server frame), so the edge case can exceed 8 MiB by a few bytes. Leave a small extra margin, for example 8 MiB − 64 KiB − 16, or assert on payload in the test.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 resolved by AR-001; MP-002 drives only the non-blocking AR-006)
- Notes: the −316 removal (D-5), D-3, D-4, D-10 and DEC-S1-1 pass. Classification Large/High is unchanged.
