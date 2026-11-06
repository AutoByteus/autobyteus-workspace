# Handoff Summary: node-desktop-through-node-server (autobyteus-405, slice S1 of autobyteus-394)

- Status: verified from the evidence (audited, not redone), archived, finalized on `personal`, released as a beta (see `release-deployment-report.md` for the tag and rollout).
- Classification: `task_size=Large`, `architectural_risk=High`, reviewed route. Implementation review CRR-001 Pass (9.5/10). API/E2E API-REV-001 Pass at 95.1%: every critical AC directly proven, no category below 92%. Test-code review CRR-002 Not Applicable: no durable test changed.

## What Changed

- The desktop app's VNC Viewer reaches a Docker node's desktop through the node's own server:
  - `GET /rest/node-desktop` reports `{ available }`.
  - `/ws/node-desktop?mode=view|control` carries one viewer stream to the in-container Xvnc.
- Any other query is refused with 4400, before any desktop connection.
- The same remote-access policy as the other `/ws` routes applies (phone credentials, Phone Access).
- An RFB input filter enforces the mode:
  - View only passes no key, pointer or clipboard input.
  - Control passes input.
  - Neither mode passes resize (SetDesktopSize).
- Each slow viewer is capped at 8 MiB buffered. Logs are metadata only.
- The viewer opens in View only, switches to Control on purpose, disconnects when hidden, and reconnects in View only. It shows desktop or server restarts and offers Reconnect. The embedded node says "This node has no shared desktop".
- Retired:
  - `AUTOBYTEUS_VNC_SERVER_HOSTS` and the "AutoByteus VNC Hosts" Server Settings card. A saved value shows as a deletable custom setting.
  - The launcher's and compose's VNC Viewer port. Nodes publish only the Backend port.
- The launcher config moves to `v9`, so the next `upgrade --all` / `workspace apply` recreates each node once, keeping its Backend port and volumes.

## Integration

- `origin/personal` had moved from `9e0681bf39` to `26fa57697e`: autobyteus-277 (phone redesign) and the v1.5.12-beta.4 release.
- The code reviewer's three reports were committed first as a checkpoint (`bd842ac2be`). The base was then merged as `ee1c715547`, with no conflicts. `autobyteus-web/docs/workspace_layout.md`, changed on both sides, merged cleanly.
- Rerun on the merged state (`evidence/DEL-01-merged-state-rerun.log`), all `exit=0`:
  - `pnpm install --frozen-lockfile`;
  - web `typecheck` `[typecheck] PASS`;
  - web specs `Test Files 236 passed`, `Tests 1569 passed`;
  - the three web guards `Passed`;
  - server node-desktop `Tests 52 passed (52)`;
  - launcher `Ran 46 tests` / `OK (skipped=2)`.
- Build-only release run `42268386569` on `codex/node-desktop-through-node-server` @ `ee1c715547`: all five desktop builds `success`, publish skipped. RELEASE.md does not require it for this change (see the release/deployment report); it passed.

## Verification (audit of the evidence)

- AC-003, AC-005 (refusals before any desktop connection):
  - Route E2E tests "refuses every other query with 4400 before any desktop connection (AC-003)" and "refuses invalid, revoked and disabled phone credentials … (AC-005)" (IMP-21, `Tests 52 passed`).
  - IMP-16: `code 4400`, upstream 0.
- AC-006 (View only passes nothing):
  - API-05-04: pointer stays `x:960 y:540`, `typed-bytes=0` after a click and typing.
  - API-04 view: `"repliesToRequest":[]`, `"serverRepliesToNotify":[]`, `"nodeClipboardIsViewerText":false`.
  - API-08 view: mouse unchanged through `wss`.
- AC-007 (Control by switch): API-05-05b `"Connected · Control"`, `typed=[abxcontrol42]`, pointer `x:301 y:299`. API-04 control positives are `true`.
- AC-008/009 (no resize, several viewers): API-05-06 `openAfterSetDesktopSize: true` ×2; the desktop stays `1920x1080`.
- AC-010 (no stream while hidden): upstream drops to 0 when the window is minimized (API-05-07b, +894 ms) and when the app is hidden (08b, +264 ms).
- AC-011 (restarts): API-05-09 shows "The node's desktop disconnected" with Reconnect, and `Connected · View only` after it, for both an Xvnc and a server restart.
- AC-013 (8 MiB cap): the integration test "keeps at most 8 MiB buffered for a viewer that stops reading, and resumes when it reads again".
- AC-014 (metadata-only logs): API-09, every typed or clipboard marker `docker=0 data-logs=0`.
- AC-022 (Backend port only, viewer works through the server):
  - PowerShell API-06c-02: `0.0.0.0:61616->8000/tcp` only, env `[]`, marker kept.
  - bash on a real S1 image, API-10: `{"8000/tcp":…}` only, app `Connected · View only` over `ws://localhost:64491/ws/node-desktop?mode=view`.
- AC-001/004 (the app renders; embedded node): screenshots `API-05-03` (node window, "Node desktop · Connected · View only", node desktop shown) and `API-05-01`.
- AC-002 (reachable only by its Backend URL): proven over the LAN (loopback refused) and through a TLS-terminating proxy (`wss`). **User check after the beta:** the desktop app over `wss` against a real Tailscale Serve node. API/E2E could not run it without starting Tailscale on this Mac and changing the user's network. The user asked for the beta, which is what puts the new server on their nodes.

## Residual

- The AC-002 Tailscale check above.
- The PowerShell launcher has not run on a Windows host.
- No durable Electron-shell or real-Xvnc suite exists.
- A fully covered window reads as hidden and drops the stream, by design (REQ-008); Control resumes as View only.
- Follow-ups FU-001 (deployment-time opt-out for the node desktop) and FU-002 (icons loaded from api.iconify.design at run time), both not urgent, in `follow-ups.md`. The Solution Designer sends them.

## Release

- Beta, as the user asked before delivery ("release a beta for it"). The tag and the rollout are in `release-deployment-report.md`.
- Users need the new server on their nodes for the viewer to work. `release-notes.md` says so under "What you need to do".
