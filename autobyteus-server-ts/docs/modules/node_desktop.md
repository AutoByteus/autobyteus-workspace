# Node Desktop

The **node desktop** is the virtual graphical desktop inside a Docker node: Xvnc display `:99`
with RFB on `127.0.0.1:5900` in the server's own network namespace, where the node's agents run
their browser and sign-ins. The desktop app's **VNC Viewer** tab shows it. Every viewer reaches it
only through the node's own server address; the node decides whether it has one, checks access with
the same rules as its other WebSocket routes, enforces View only, and never lets a viewer resize it.

Source: `src/node-desktop/` (availability, input filter, stream) and the entries
`src/api/rest/node-desktop.ts`, `src/api/websocket/node-desktop.ts`. Client contract:
`autobyteus-web/utils/nodeDesktopClient.ts`, `composables/useVncSession.ts`.

## Availability

`resolveNodeDesktop(env)` (`node-desktop-availability.ts`) is the only rule: a server run by the
Docker starter (`AUTOBYTEUS_STARTER_SOCKET` set, node-update contract C4) is a Docker node, and every
Docker node image runs Xvnc at `127.0.0.1:5900`. An embedded or development server has no node
desktop. Nothing else names the target; a client cannot name a host, port or URL.

## Routes

- `GET /rest/node-desktop` → `200 { available: boolean }`. Route class
  `TRUSTED_NETWORK_PROTECTED`.
- `GET /ws/node-desktop?mode=view|control[&access_token=…]` (WebSocket upgrade): one viewer stream.
  Before the route runs, the request gate refuses a request addressed to a name that is not
  the node's with HTTP 403 `REMOTE_ACCESS_HOST_REFUSED`, and a browser `Origin` that is not
  allowed with HTTP 403 `REMOTE_ACCESS_ORIGIN_REFUSED`, so the handshake fails and no socket
  opens (`../features/remote_access.md`, Allowed Hosts and Allowed Origins). `/ws/node-desktop` is a phone WebSocket
  route, so a paired phone's credential is accepted here.
  The route, in this order:
  1. authorizes with the shared WebSocket policy (`authorizeRemoteAccessWebSocket`, the same as
     `/ws/terminal`): trusted network and loopback viewers, and paired phones with a valid
     credential while Phone Access is on;
  2. validates the query: exactly one `mode` (`view` or `control`), at most one `access_token`,
     nothing else;
  3. resolves the node desktop;
  4. starts the stream, which only then opens TCP to Xvnc.

  A viewer that sends bytes before the stream starts is closed (an RFB viewer speaks only after
  the server's version string).

Close codes:

| Code | Reason | When |
| --- | --- | --- |
| 4401 / 4403 / 4404 | shared policy reasons (`REMOTE_ACCESS_AUTH_INVALID`, `REMOTE_ACCESS_DEVICE_REVOKED`, `PHONE_ACCESS_DISABLED`, …) | refused by the access policy |
| 4400 | `NODE_DESKTOP_INVALID_REQUEST` | a missing, repeated or unknown `mode`, or any other query parameter |
| 4400 | `NODE_DESKTOP_VIEWER_PROTOCOL` | bytes before the stream started, or a message the input filter rejects |
| 4404 | `NODE_DESKTOP_UNAVAILABLE` | this node has no node desktop |
| 4429 | `NODE_DESKTOP_TOO_MANY_VIEWERS` | the node already serves 4 streams, or this phone 2 |
| 4502 | `NODE_DESKTOP_DISCONNECTED` | Xvnc refused, failed or ended the connection |
| 1005 (no code) | — | the server shuts down: the WebSocket plugin closes its clients without a code |

The web client maps these with `viewerStateForClose` (not allowed, no shared desktop, disconnected
with Reconnect, cannot reach the node, closed).

## Viewer limits and live revocation

`NodeDesktopViewers` (`node-desktop-viewers.ts`, one per server, created with the route) is the node's list of open desktop streams. After the route has authorized the viewer, validated the query and resolved the node desktop, it constructs the stream (which opens nothing yet) and asks the registry to admit it:

- at most **4** streams at once on the node, of every kind, and at most **2** per paired phone (by its device id); a further stream is closed with **4429 `NODE_DESKTOP_TOO_MANY_VIEWERS`** before any connection to Xvnc. Trusted-network and loopback viewers count toward the node-wide limit only.
- An admitted stream is started at once; the registry forgets it when the stream ends (`onEnd`).
- While any phone stream is open, the registry re-checks each phone stream's credential with the shared `RemoteAccessAuthService` in cycles that never overlap: the next cycle is scheduled 20 s after the previous one finished; one cycle checks its phones concurrently, each with a 5 s timeout (a timeout or an error leaves the stream for the next cycle). A rejected credential ends the stream with the shared policy's close code (`src/remote-access/domain/remote-access-close-codes.ts`): 4403 `REMOTE_ACCESS_DEVICE_REVOKED` or `PHONE_ACCESS_DISABLED`, 4401 for an invalid credential. A revocation is therefore detected within 25 s. Each successful check updates the device's `lastSeenAt`.
- The timer is `unref`'d, stops when no phone stream remains, and stops for good when the server closes. The credential lives only in memory and is never logged.

## Mode and the input filter

The mode is fixed per stream; switching between View only and Control reconnects. Every stream the
viewer opens on its own (first open, Reconnect, window visible again) is View only.

`RfbViewerInputFilter` (`rfb-viewer-input-filter.ts`) frames the RFB 3.7/3.8 client→server stream
(version, security type None, ClientInit forced to shared, then messages) and decides per message:

| Type | Message | view | control |
| --- | --- | --- | --- |
| 0 | SetPixelFormat | forward | forward |
| 2 | SetEncodings | forward without −316 | forward without −316 |
| 3 | FramebufferUpdateRequest | forward | forward |
| 4 | KeyEvent | drop | forward |
| 5 | PointerEvent (always 6 bytes) | drop | forward |
| 6 | ClientCutText (≤ 1 MiB) | only a well-formed extended-clipboard Caps | forward |
| 150 | EnableContinuousUpdates | forward | forward |
| 248 | ClientFence (payload ≤ 64 bytes) | forward | forward |
| 250 | xvp (shutdown/reboot) | drop | drop |
| 251 | SetDesktopSize | drop | drop |
| 255 / 0 | QEMU extended key | drop | forward |
| other | — | close 4400 | close 4400 |

- The ExtendedMouseButtons pseudo-encoding (−316) is removed from SetEncodings, so Xvnc never
  enables noVNC's 7-byte pointer event; mouse buttons 8 and above are not sent.
- No viewer can resize the agent desktop: SetDesktopSize is dropped in both modes, and the viewer
  scales the picture instead (`resizeSession` is always false).
- In Control, a paste larger than 1 MiB ends the stream with 4400 (the filter fails closed rather
  than buffer it).
- In View only the one ClientCutText that passes is a well-formed extended-clipboard **Caps**
  message (negative length, Caps bit 1<<24, length = 4 + 4 × the format bits in the flags' low 16
  bits). It carries capabilities only. With it Xvnc tells a View only viewer about clipboard changes
  with a content-free Notify, which noVNC ignores; without it Xvnc would push the agent's clipboard
  as a Provide, which noVNC 1.7.0 misreads in View only and which would put the clipboard on the
  viewer's device. Plain text, Request, Peek, Notify and Provide are dropped.

The web contract test `autobyteus-web/tests/integration/novnc-node-desktop-filter-contract.integration.test.ts`
runs every encoder of noVNC's `RFB.messages` through the filter and fails when a noVNC upgrade adds one.

## Stream lifecycle

`NodeDesktopStream` (`node-desktop-stream.ts`) bridges one viewer WebSocket to Xvnc's TCP port:

- Xvnc bytes go to the viewer unchanged. When the viewer's `bufferedAmount` reaches
  8 MiB − 64 KiB − 16 bytes, reading from Xvnc pauses; it resumes below 1 MiB. One TCP read is at
  most 64 KiB and a frame header at most 10 bytes, so at most 8 MiB waits for a slow viewer; other
  viewers are unaffected.
- When Xvnc's socket is full, reading from the viewer pauses until it drains.
- Whichever side ends first, the other is closed at once (Xvnc's connection within the same tick
  of the viewer's close).
- A stream exists only while a VNC Viewer tile is open and its window visible: the tile disconnects
  when it unmounts or the window is hidden, and reconnects (View only) when the window is visible
  again. Server shutdown closes every stream through the WebSocket plugin's `preClose`.

Each stream logs one line when it ends, with metadata only:

```text
[node-desktop] stream ended mode=view viewer=trusted_network durationMs=… toViewer=… fromViewer=… reason=viewer-closed
```

`viewer` is how the viewer was admitted (`RemoteAccessAuthContext.mode`); `reason` is one of
`viewer-closed`, `viewer-error`, `viewer-protocol`, `desktop-closed`, `desktop-error`, or `node-closed`
followed by `close=<reason>` when the node ended it (a revoked phone: `close=REMOTE_ACCESS_DEVICE_REVOKED`).
No pixels, keystrokes, clipboard text, credentials or URLs are logged.

A stream refused for the viewer limit (4429) logs one line too, before the close, with metadata only:

```text
[node-desktop] stream refused reason=NODE_DESKTOP_TOO_MANY_VIEWERS limit=node|phone mode=view|control viewer=… open=… max=…
```

`limit` says which limit was reached (`node`: 4 streams node-wide; `phone`: 2 from that phone), `open` the streams
already open under it and `max` that limit. No device ID, credential or address is logged.

## Exposure

Docker nodes publish only the backend port (launcher config hash `v9`, compose file). Inside the
node Xvnc (5900), websockify (6080) and the Chrome debug proxy (9223) still listen on the
container interface until the image changes (slice S2 of autobyteus-394), but none is published.
