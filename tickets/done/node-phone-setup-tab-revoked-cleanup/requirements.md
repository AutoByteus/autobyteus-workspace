# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — approved by user on 2026-05-22.

## Goal / Problem Statement

The node setup page currently shows many revoked paired-phone entries in the Paired Phones area, creating noise and implying revoked phones are still active or actionable. The immediate root cause is that revoked device records are intentionally retained in server persistence, the `/remote-access/devices` API currently returns all retained records, and the `PhoneAccessCard` renders `store.devices` directly even though the store already has an `activeDevices` computed filter.

The setup guidance also mixes phone-access hints into the node-management surface. The Android app tells users to prefer Tailscale Serve HTTPS, but the desktop/node UI only provides a short hint and does not teach users how to install/sign in, run `tailscale serve`, keep it running, find the HTTPS URL, and use that URL before pairing. The node settings area should have a separate Phone Setup tab, next to the existing Docker Guide tab, that owns phone connection setup and detailed Tailscale Serve instructions. The UI must distinguish the user-facing mobile shell URL (`https://host/mobile`) from the internal node server base URL (`https://host`) used by REST/GraphQL/WebSocket calls.

## Investigation Findings

- `autobyteus-server-ts/src/remote-access/stores/paired-device-store.ts` persists all valid paired-device records in `remote-access/paired-devices.json`, normalizing `revokedAt` to `null` when absent.
- `PairedDeviceService.revokeDevice()` and `revokeAllDevices()` mark records with `revokedAt`; they do not delete historical records. That matches existing docs: paired-device records remain in server data while disabled/revoked credentials are rejected.
- `PairedDeviceService.listDeviceSummaries()` maps every stored record, including revoked records, and the REST route `GET /remote-access/devices` returns that full list.
- `autobyteus-web/stores/phoneAccessStore.ts` stores the API response in `devices` and already computes `activeDevices = devices.filter((device) => !device.revokedAt)`, but `PhoneAccessCard.vue` uses `store.devices` for the row list, empty state, and Revoke-all button disablement.
- Local data confirms the user-visible symptom: `/Users/normy/.autobyteus/server-data/remote-access/paired-devices.json` currently contains 20 records: 1 active and 19 revoked.
- The current node tabs are `manage` and `dockerGuide`. `PhoneAccessCard` is embedded inside the Manage Nodes tab, while `DockerNodeStartGuideCard` is separated into its own Docker Guide tab.
- Android setup copy already recommends Tailscale Serve HTTPS and warns that WebView credentials are origin-scoped; the web/docs copy says the same but lacks copyable in-product Serve commands.
- Official Tailscale docs, last validated January 2026, confirm that `tailscale serve` shares a local service inside the tailnet, requires/enables HTTPS certificates, accepts a local port target such as `3000`, supports `--bg` for persistent background serving, and has `status` / `reset` commands.
- Architecture review found that current web/server normalizers preserve `/mobile`; the approved target must strip recognized `/mobile` shell paths into the canonical internal server base URL before creating/storing pairing payloads.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Feature + UX Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + File Placement / Responsibility Drift
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, small and local
- Evidence basis: Active-vs-revoked pairing state is not enforced at the list boundary; the UI has an active filter but bypasses it. Phone setup controls and travel/Tailscale guidance are embedded in Manage Nodes instead of a phone-focused setup surface, while Docker guidance already has a separate tab.
- Requirement or scope impact: The implementation should explicitly distinguish active device lists from retained revoked history, and should move phone setup guidance/controls into a new Phone Setup tab with detailed Tailscale Serve commands.

## Recommendations

1. Keep revoked records in persistence for authentication rejection/history; do not delete them as the primary fix.
2. Make the active-device list invariant explicit:
   - Preferred clean cut: expose active phone summaries from the paired-device management boundary (`GET /remote-access/devices` and/or a renamed active-list service method), then render only active devices in the UI.
   - At minimum, use the existing `activeDevices` store selector everywhere the UI means “paired phones”.
3. Remove the misleading revoked-row display from the active Paired Phones list. If history is wanted later, add a separate explicit history surface rather than mixing it into active rows.
4. Add a third node settings tab: `Phone Setup`, alongside `Manage Nodes` and `Docker Guide`.
5. Move the Phone Access controls (`PhoneAccessCard`) out of the Manage Nodes tab into the Phone Setup tab for embedded-node windows.
6. Add a dedicated phone setup guide card in that tab with practical, copyable Tailscale Serve commands:
   - install Tailscale on desktop/server and Android, including macOS app, Windows, Linux, and Android install pointers;
   - sign in / connect Tailscale on desktop/server and Android;
   - on macOS, explain that the Tailscale app UI is enough to confirm connection, MagicDNS, IPv4, and IPv6, and that command-line usage is mainly needed for Tailscale Serve;
   - serve the AutoByteus local port (`29695`) over tailnet HTTPS, including macOS direct app-executable commands and generic `tailscale` CLI foreground/background variants;
   - inspect Serve status;
   - reset/stop Serve configuration;
   - copy the resulting `https://<machine>.<tailnet>.ts.net/mobile` URL into AutoByteus before creating the QR, with the manual HTTPS URL field presented as the primary next step after Serve.
7. Update docs/tests/localization alongside the UI so the behavior remains durable.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- User opens the node page and views paired phones without noise from old revoked entries.
- User revokes a phone pairing and sees the active paired-phone list update appropriately.
- User opens a Phone Setup tab to manage Phone Access for the embedded node.
- User reads concrete Tailscale Serve instructions in the Phone Setup tab, including setup prerequisites and copyable commands.
- User can distinguish Docker/node setup from phone setup without scanning unrelated instructions.

## Out of Scope

- Changing the Android app pairing protocol or implementing Android-side UI changes.
- Building or releasing Android APKs.
- Changing Tailscale itself or automating Tailscale account/device setup outside the app UI.
- Deleting historical pairing records from persistence.
- Adding advanced revoked-history management such as delete/export/search/bulk retention controls. A simple separate Revoked/History tab is in scope.
- Making HTTP the normal supported phone pairing path.
- Supporting public Tailscale Funnel as the recommended phone setup path.

## Functional Requirements

- REQ-001: The node page active paired-phone list must not display revoked pairings as active/actionable phone entries.
- REQ-002: Revoked pairings must be handled consistently after initial load, after single-device revoke, and after revoke-all without requiring a manual page refresh.
- REQ-003: Revoked pairing records may remain in persistence for auth/history, but active-list UI/API boundaries must not treat them as active paired phones.
- REQ-004: The Phone Access UI must separate active and revoked device records with two clearly labeled views/tabs: Active Paired Phones and Revoked/History. Revoked records must be non-actionable and must never be mixed into the active Paired Phones list.
- REQ-005: The node settings area must provide a separate Phone Setup tab alongside the existing Manage Nodes and Docker Guide tabs.
- REQ-006: Phone Access controls for enabling access, selecting the reachable URL, creating a QR/link, and listing active phones must live in the Phone Setup tab for embedded-node windows.
- REQ-007: Phone setup guidance must start from zero and include clear Tailscale installation, macOS app-first guidance, sign-in/connect, and Serve instructions for exposing the AutoByteus node over HTTPS, including commands users need to run and enough context for users unfamiliar with Tailscale Serve.
- REQ-008: Tailscale Serve guidance must emphasize private tailnet access with Serve, stable HTTPS origin use before pairing, and the risk of re-pairing when switching between LAN IP and Tailscale HTTPS origins.
- REQ-008A: New Phone Access QR/pairing-session creation from the desktop Phone Setup path must require an `https://` server URL. HTTP URLs must be blocked for new QR creation; this task must not add an advanced HTTP acknowledgement escape hatch.
- REQ-008B: Phone setup URL handling must define two distinct identities: the canonical internal `serverBaseUrl` used for REST/GraphQL/WebSocket and stored in pairing payload/session/device records, and the user-facing `mobileUrl` used for QR/WebView entry. Inputs such as `https://desktop.tailnet.ts.net/mobile` must normalize to internal `serverBaseUrl` `https://desktop.tailnet.ts.net` while producing/displaying `mobileUrl` `https://desktop.tailnet.ts.net/mobile`.
- REQ-008C: The Phone Access QR creation flow must make the post-Serve next step explicit: paste the HTTPS URL printed by `tailscale serve status` (plus `/mobile`) into the manual URL field. Automatically listed HTTP LAN/Tailscale-IP candidates, including `100.x.y.z:29695`, must not be presented as the recommended next step when HTTPS pairing is required.
- REQ-009: Existing Docker setup instructions must remain available in the Docker Guide tab and must not absorb phone-only setup content.
- REQ-010: Tests and durable docs must be updated to cover the active-device filtering and the new Phone Setup tab/instructions.

## Acceptance Criteria

- AC-001: Given the backend has retained device records with non-null `revokedAt`, when the node settings UI renders Paired Phones, those revoked records are absent from the active list.
- AC-002: Given the local paired-device data has 1 active record and 19 revoked records, the UI shows 1 paired-phone row and does not show the 19 revoked rows.
- AC-003: Given a user clicks Revoke on an active phone and the revoke request succeeds, the phone row is removed from the active list immediately after refresh/update.
- AC-004: Given no active phones exist but revoked history exists, the active Paired Phones view shows the no-active-phones empty state and the Revoke all phones action is disabled or otherwise non-misleading.
- AC-004A: Given revoked history exists, it appears only under the separate Revoked/History view/tab, with no Revoke action on already-revoked rows.
- AC-005: Given the user opens Settings -> Nodes, the tab strip includes Manage Nodes, Phone Setup, and Docker Guide.
- AC-006: Given the user opens Manage Nodes, phone setup controls are not mixed into the node CRUD/remote-browser sharing flow.
- AC-007: Given the user opens Phone Setup on an embedded-node window, they can see Phone Access controls and the Tailscale Serve setup guide.
- AC-008: Given the user opens Phone Setup without Tailscale installed, they can find installation instructions/links for desktop/server and Android before the command steps.
- AC-008B: Given a macOS user has Tailscale.app installed but `tailscale` is not available in Terminal, the primary macOS instructions use the app's bundled executable directly, for example `/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 29695`, so the user can configure Serve without installing a separate CLI wrapper. Any `/usr/local/bin/tailscale` wrapper or app-bundled installer script guidance must be optional troubleshooting/advanced material, not the primary path.
- AC-008A: Given Tailscale is installed, the user can copy commands for serving local port `29695` over HTTPS, background serving, Serve status, and Serve reset/stop guidance; for macOS these commands must be available in direct app-executable form, while generic CLI commands may be shown for users whose `tailscale` command is already installed.
- AC-009: Given the user follows the Phone Setup instructions, the target URL shape is clearly shown as `https://<machine>.<tailnet>.ts.net/mobile` before QR creation, and the guide explains that the MagicDNS name shown in the Tailscale app is the preferred hostname for this HTTPS URL while IPv4/IPv6 are diagnostic addresses, not the preferred HTTPS Serve URL.
- AC-009A: Given the user enters or selects an HTTP URL in the desktop Phone Setup path, the UI blocks QR creation with a clear HTTPS-required message and does not call the pairing-session API.
- AC-009B: Given a caller attempts to create a pairing session with an HTTP `serverBaseUrl`, the backend rejects the request as invalid instead of creating a QR/payload.
- AC-009C: Given the user enters or pastes `https://desktop.tailnet.ts.net/mobile`, the created pairing payload stores `serverBaseUrl: "https://desktop.tailnet.ts.net"`, the QR/mobile URL is `https://desktop.tailnet.ts.net/mobile?pairing=...`, and mobile status/exchange requests target `https://desktop.tailnet.ts.net/rest/...` rather than `https://desktop.tailnet.ts.net/mobile/rest/...`.
- AC-009D: Given the local address candidates are only HTTP URLs such as `http://100.127.30.107:29695` or `http://192.168.x.x:29695`, the Phone Access UI does not auto-select one as the QR target. Instead it tells the user to paste the Tailscale Serve HTTPS URL from Serve status/MagicDNS into the manual field; selecting an HTTP candidate remains blocked with the HTTPS-required message.
- AC-010: Given the user opens Docker Guide, the existing Docker launcher commands and next-step guidance remain available and unchanged except for tab-neighbor navigation.

## Constraints / Dependencies

- Must preserve existing node management and Docker guide workflows.
- Must align with existing Android app expectations for HTTPS endpoints and origin-scoped WebView storage; HTTPS is required for new desktop-created Phone Access pairing sessions.
- Tailscale installation and Serve command guidance must be based on official Tailscale docs current as of May 22, 2026; the docs note CLI changes since Tailscale 1.52.
- Do not use a compatibility dual path that shows both revoked and active entries in the same active list. Do not preserve `/mobile` inside the internal `serverBaseUrl` contract.

## Assumptions

- The AutoByteus node's local server port for the phone-access setup guide is `29695`, as shown in current screenshots, docs, and Android examples.
- Revoked paired-device records should remain stored so old credentials can be rejected with the correct revoked-device diagnostic.
- The Phone Setup tab is only fully useful for embedded-node windows; if rendered for remote-node windows, it should clearly explain that Phone Access controls are available on the embedded/server node.

## Risks / Open Questions

- Revoked history should be visible in a simple separate Revoked/History tab for transparency, but advanced history management remains out of scope.
- Exact Tailscale device DNS name is user-specific, so UI must use placeholder text and tell the user to copy the URL printed by `tailscale serve status` or shown by MagicDNS and append `/mobile`; if the copied URL includes `/mobile`, the app must normalize it to the internal base before storing/sending pairing payloads.
- If Tailscale changes Serve CLI syntax again, the instructions must be revisited against official docs.

## Requirement-To-Use-Case Coverage

- Active paired-phone clarity and revoked-history separation: REQ-001, REQ-002, REQ-003, REQ-004
- Phone setup tab: REQ-005, REQ-006, REQ-009
- Tailscale Serve guidance, HTTPS requirement, and URL identity: REQ-007, REQ-008, REQ-008A, REQ-008B, REQ-008C
- Durability/testing/docs: REQ-010

## Acceptance-Criteria-To-Scenario Intent

- AC-001 and AC-002 cover initial rendering with retained revoked data.
- AC-003 covers mutation/update after single revoke.
- AC-004 covers all-revoked/no-active state correctness.
- AC-004A covers the separate revoked-history view.
- AC-005 through AC-007 cover tab navigation and separation of responsibilities.
- AC-008 and AC-008B cover install-from-zero and macOS app-first command guidance; AC-008A, AC-009, AC-009A, AC-009B, AC-009C, and AC-009D cover actionable Tailscale Serve guidance, MagicDNS URL guidance, the HTTPS-required posture, base-vs-mobile URL identity, and HTTP candidate de-prioritization.
- AC-010 covers preservation of existing Docker setup.

## Approval Status

Approved by user on 2026-05-22. User said: “I’ll prove/approve the ticket now. Now you can start to work on it.”


## Design Review Rework Notes

- Architecture review round 1 returned Design Impact on 2026-05-22. Requirements were tightened to require canonical base-vs-mobile URL normalization and to choose full HTTP blocking for new Phone Access QR/pairing-session creation rather than an advanced acknowledgement flow.

- User testing clarified that macOS users may have Tailscale.app installed while `tailscale` is absent from PATH. The app's bundled executable works directly for Serve commands, so macOS instructions should make `/Applications/Tailscale.app/Contents/MacOS/Tailscale ...` the primary command path. The bundled CLI installer script can fail when the installed app bundle id differs from the script’s expected bundle id; wrapper/installer guidance should remain optional troubleshooting rather than the main setup flow.

- User clarified that AutoByteus should not run Tailscale commands on the user's behalf, even read-only status commands. Requirements now keep Tailscale setup fully user-controlled: show instructions, have users run/read the commands themselves, and paste the HTTPS/MagicDNS `/mobile` URL into the form.
