# Investigation Notes — S1: node desktop through the node's own server

## Investigation Meta

- Package identifier: `node-desktop-through-node-server` (Project Task `autobyteus-405`, slice S1 of autobyteus-394)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server`
- Repository mode: `Git`; branch `codex/node-desktop-through-node-server`
- Resolved base: `origin/personal` @ `9e0681bf39b43f4aecb893866d0e7d50c19cbaf7` (fetched 2026-11-06; includes S0 merge `dc8bee36b6`)
- Finalization target: `origin` / `personal` (RELEASE.md)
- Bootstrap: worktree and ticket folder created; blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-06, this conversation): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`, `references/handoff.md`, `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, root `DESIGN.md`, `TESTING.md`, `GLOSSARY.md`
- Canonical evidence: the parent investigation notes `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-desktop-access-through-node-server/tickets/in-progress/remote-desktop-access-through-node-server/investigation-notes.md` (Source Log, Runtime findings, AF-01 … AF-17, "Slice S0 Delivery Facts"). This file records only what S1 adds or re-checks.
- Investigation status: complete for design

## Re-check On The S1 Base

| ID | Command / Path | Observation | Established |
| --- | --- | --- | --- |
| S1-01 | `git log --oneline b78fd86fe4..HEAD -- autobyteus-server-ts/src/api autobyteus-server-ts/src/remote-access autobyteus-server-ts/src/node-update autobyteus-server-ts/src/services/server-settings-service.ts autobyteus-web/composables/useVncSession.ts autobyteus-web/components/workspace/tools autobyteus-web/utils autobyteus-web/types/node.ts autobyteus-web/components/settings/ServerSettingsEndpointCards.vue scripts/public/docker autobyteus-server-ts/docker` | Only `2575d870e8` (S0, launcher/compose/docs) | Read — the parent's file/line citations for server and web still hold |
| S1-02 | `grep NOVNC_PORT|noVncPort|AUTOBYTEUS_VNC|CONFIG_HASH_VERSION` in `scripts/public/docker/autobyteus-docker.d/*/*`, compose, `.env.example`, `docker-start.sh` | bash `container-config.sh:9` (hash text uses `NOVNC_PORT` twice), `:29` (`-e AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:${NOVNC_PORT}`), `:42` (`-p "127.0.0.1:${NOVNC_PORT}:6080"`); `core.sh:6` `v8`, `:38` help, `:116`, `:128` state; `docker-runtime.sh:192,253,292,299,307,318,333,344,355`; PowerShell `ContainerConfig.ps1:11,26,44,57`, `Core.ps1:7,38,138`, `DockerRuntime.ps1:182,207,210`; `docker-compose.yml:16,22`; `.env.example:7-8`; `docker-start.sh:243,276` | Read — S1's launcher removal points |
| S1-03 | S0 archive `evidence/API-07-03` (via its delivery receipt) | VNC Viewer port listens on IPv4 loopback only | Read — irrelevant after S1 removes it |
| S1-05 | `autobyteus-web/node_modules/@novnc/novnc/core/rfb.js` `RFB.messages` (types sent: 4 keyEvent, 255/0 QEMUExtendedKeyEvent, 5 pointerEvent and extendedPointerEvent, 6 clientCutText incl. extended clipboard, 251 setDesktopSize, 248 clientFence, 150 enableContinuousUpdates, 0 pixelFormat, 2 clientEncodings, 3 fbUpdateRequest, 250 xvpOp); `:2272` advertises `pseudoEncodingExtendedMouseButtons` (−316, `encodings.js:33`); `:2707-2708` enables `_extendedPointerEventSupported` when the server confirms; `extendedPointerEvent` writes 7 bytes | Read | The filter strips −316 from SetEncodings so pointer events stay 6 bytes (design D-5) |
| S1-06 | noVNC `core/websock.js:258-296` (`attach` sets `onmessage`/`onopen`/`onclose`/`onerror` as properties), `core/rfb.js:92-115` (URL or channel), `:562-571` (attach a channel in any readyState), `:950-952` (`disconnect` detail is only `{ clean }`); `ServerSettingsEndpointCards.vue:151,174,196,236,252` (`hostPort` used only by the VNC entry); `types/novnc.d.ts:2,9,24`; `tests/integration/app-font-size-fixed-px-audit.integration.test.ts:43`; `localization/messages/en/workspace.generated.ts` `VncHostTile.*` keys | Read (architecture review ARCH-REV-001 findings re-checked) | Close codes reach the UI only through a listener on a socket the composable creates (D-7); four extra removals |
| S1-07 | Implementation evidence `evidence/IMP-14-real-node-clipboard-per-mode.txt`, `evidence/IMP-13-browser-probe-view-only-clipboard-desync.txt` (IR-001, IMP-DI-001); noVNC `core/rfb.js:2397-2406` (Caps reply in every mode), `:2408-2439` (Request/Peek/Notify return in View only; Notify has no payload beyond flags), `:2448-2459` (Provide returns in View only without consuming the zlib payload) | Measured (real Xvnc, test-owned container) and Read | View only must forward the client's Caps reply and nothing else of ClientCutText (design D-5 row 6) |
| S1-04 | Related Tasks autobyteus-403 (Origin check) and autobyteus-404 (phone deny) | Not merged on the base; content not readable from this Task | Read — overlap handled by using the shared policy (DEC-S1-1) |

## Notes For Architecture Design

- Scenario IDs to map: SCN-001, 002, 003, 006, 007, 008, 009.
- Everything else as in the parent design (D-1 … D-7, D-9), restricted to S1 in `design-spec.md`.
