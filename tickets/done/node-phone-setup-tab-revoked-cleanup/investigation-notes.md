# Investigation Notes

## Investigation Status

- Bootstrap Status: Dedicated worktree and branch created successfully.
- Current Status: Architecture review round 1 returned Design Impact; design spec revised for round 2 review.
- Investigation Goal: Determine why revoked phone pairings still render on the node page and identify the correct UI/design placement for a Phone Setup tab with Tailscale Serve instructions.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Requires cross-cutting read of web/node page UI, pairing API/data semantics, Android setup expectations, external Tailscale command guidance, tests/localization/docs.
- Scope Summary: Hide or segregate revoked phone pairings from active node page display; add separate Phone Setup tab with detailed Tailscale Serve setup/run instructions.
- Primary Questions Resolved:
  - Where is the paired-phone list rendered? `autobyteus-web/components/settings/PhoneAccessCard.vue`.
  - Does the API intentionally return revoked pairings? Yes. `GET /remote-access/devices` calls `PairedDeviceService.listDeviceSummaries()`, which maps every stored record including revoked records.
  - Why are so many revoked entries visible? Persistence keeps revoked records, API returns them all, store saves them in `devices`, and the component renders `store.devices` instead of the existing `activeDevices` computed filter.
  - Where is the current Docker tab/setup area implemented? `NodeManagerTabs.vue`, `NodeManager.vue`, `DockerNodeStartGuideCard.vue`, and `utils/dockerNodeLauncherCommands.ts`.
  - Where does Android currently hint about Tailscale Serve and HTTPS? `autobyteus-android/README.md` and `ConnectionScreen.kt`, plus remote-access web docs.
  - What Tailscale Serve command facts should be shown? Official docs support `tailscale up`, `tailscale serve <port>`, `tailscale serve --bg <port>`, `tailscale serve status`, and `tailscale serve reset`; Serve shares a local service privately within the tailnet and can prompt to enable HTTPS certs.

## Request Context

User reports that many revoked paired-phone entries still exist in the node page and asks why. User also notes Android app hints about using Tailscale Serve to serve HTTPS and suggests moving phone setup into another tab: keep Docker tab and create a Phone Setup tab. Follow-up clarification: include all Tailscale Serve instructions in the Phone Setup tab because users may not know how to set up or run the commands.

Reference screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_9a71b67f/solution_designer_c70467fc66f1c860/context_files/ctx_3241c34ef3f0__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-phone-setup-tab-revoked-cleanup`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-phone-setup-tab-revoked-cleanup/tickets/done/node-phone-setup-tab-revoked-cleanup`
- Current Branch: `codex/node-phone-setup-tab-revoked-cleanup`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-phone-setup-tab-revoked-cleanup`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-05-22.
- Task Branch: `codex/node-phone-setup-tab-revoked-cleanup`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Authoritative artifacts live in the task worktree, not the original superrepo checkout. The original checkout had an unrelated untracked file at `autobyteus-server-ts/tmp-repro-chokidar-spawn-ebadf.mjs`; do not touch it.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-22 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v` | Bootstrap repository identity and current state | Root is superrepo, current shared branch was `personal`, origin is `AutoByteus/autobyteus-workspace`. | No |
| 2026-05-22 | Command | `git remote show origin`, `git worktree list --porcelain` | Resolve base branch and existing task worktrees | Remote HEAD/base is `personal`; no matching task worktree existed. | No |
| 2026-05-22 | Command | `git fetch origin personal` | Refresh tracked base before creating task branch | Fetch succeeded. | No |
| 2026-05-22 | Setup | `git branch codex/node-phone-setup-tab-revoked-cleanup origin/personal`; `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/node-phone-setup-tab-revoked-cleanup codex/node-phone-setup-tab-revoked-cleanup` | Create mandatory dedicated ticket worktree | Worktree created at task root on branch `codex/node-phone-setup-tab-revoked-cleanup`. | No |
| 2026-05-22 | Other | User screenshot reference file | Understand reported UI state | Screenshot shows Paired Phones card listing multiple entries with red revoked timestamps and Revoke buttons still visible/disabled-looking. | No |
| 2026-05-22 | Command | `rg -n "revok|paired phones|Paired Phones|pairedPhones|pairing|Tailscale|tailscale|Docker" -S autobyteus-web autobyteus-server-ts autobyteus-android autobyteus-message-gateway` | Locate affected UI, backend, docs, and Android hints | Found PhoneAccessCard, phoneAccessStore, remote-access REST/service/store, Android README/ConnectionScreen, remote_access docs, localization, Docker tab files. | No |
| 2026-05-22 | Code | `autobyteus-web/components/settings/PhoneAccessCard.vue` | Inspect current paired-phone rendering | The component renders `store.devices` directly, shows `device.revokedAt`, disables revoke for revoked rows, and disables Revoke all only when `store.devices.length === 0`. | Yes, change to active device source and remove revoked-row display. |
| 2026-05-22 | Code | `autobyteus-web/stores/phoneAccessStore.ts` | Inspect data owner on frontend | Store loads `/remote-access/devices` into `devices`; it already defines `activeDevices = computed(() => devices.value.filter((device) => !device.revokedAt))`, but this is not used by PhoneAccessCard. | Yes, clarify store/API active-list semantics. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/api/rest/remote-access.ts` | Inspect API route | `GET /remote-access/devices` returns `getPairedDeviceService().listDeviceSummaries()` with no active filter. | Yes, consider service/API active-list boundary. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/remote-access/services/paired-device-service.ts` | Inspect pairing device state transitions | `listDeviceSummaries()` returns all records; `revokeDevice()` and `revokeAllDevices()` mark `revokedAt` without deleting records. `revokeAllDevices()` counts only active records. | Yes, add/rename active summary list method. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/remote-access/stores/paired-device-store.ts` | Inspect persistence semantics | Store reads/writes `remote-access/paired-devices.json`; retained records are normalized with `revokedAt`. | No, retention is expected. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/remote-access/services/remote-access-auth-service.ts` | Check why revoked records might need retention | Auth finds a device by credential, then returns `REMOTE_ACCESS_DEVICE_REVOKED` when `revokedAt` is set. Retaining revoked records supports correct rejected-credential diagnostics. | Yes, optional rename `findActiveDeviceByCredential` because it actually returns revoked records too. |
| 2026-05-22 | Data | Python read of `/Users/normy/.autobyteus/server-data/remote-access/paired-devices.json` | Confirm user-reported local data shape | File contains 20 records: 1 active, 19 revoked. This matches the noisy UI symptom. | No |
| 2026-05-22 | Code | `autobyteus-web/components/settings/NodeManager.vue` | Inspect current node tab/panel structure | Active tab type is `manage | dockerGuide`; PhoneAccessCard is rendered inside Manage tab; Docker guide uses the `v-else` panel. | Yes, add explicit phone setup panel and avoid catch-all `v-else` for docker only. |
| 2026-05-22 | Code | `autobyteus-web/components/settings/NodeManagerTabs.vue` | Inspect tab data source | Tab list contains Manage Nodes and Docker Guide only. | Yes, add Phone Setup tab. |
| 2026-05-22 | Code | `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue`, `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Inspect existing copyable command-card pattern | Docker guide uses a command builder utility and local command card copy behavior, with tests. Phone setup can reuse this pattern conceptually. | Yes, add phone setup command utility/card/tests. |
| 2026-05-22 | Code/Doc | `autobyteus-android/README.md`, `autobyteus-android/app/src/main/java/org/autobyteus/mobile/ui/ConnectionScreen.kt` | Confirm Android hint and origin-scoped warning | Android copy recommends Tailscale Serve HTTPS, stable `https://desktop.tailnet-name.ts.net/mobile`, and warns re-pairing may be required after changing origins. | No |
| 2026-05-22 | Doc | `autobyteus-web/docs/remote_access.md` | Check existing web docs for semantics | Docs say device records remain in server data when disabled and revoke marks credentials revoked; Tailscale Serve HTTPS is recommended for Android/travel; pairing with a stable origin prevents re-pairing. | Yes, update docs after UI change. |
| 2026-05-22 | Web | `https://tailscale.com/docs/features/tailscale-serve` | Verify current Serve behavior and prerequisites | Last validated Jan 20, 2026. Serve shares local services within the tailnet, requires HTTPS certs, can prompt to enable prerequisites, and example `tailscale serve 3000` proxies local port over HTTPS. | No |
| 2026-05-22 | Web | `https://tailscale.com/docs/reference/tailscale-cli/serve` | Verify Serve CLI syntax | Last validated Jan 26, 2026. Syntax is `tailscale serve [flags] <target>`; supports `--bg`, `--https`, `status`, `reset`; target can be a port such as `3000`; `--bg` persists through reboot/restart behavior per docs. | No |
| 2026-05-22 | Web | `https://tailscale.com/docs/reference/tailscale-cli/up` | Verify basic connect command | Last validated Jan 26, 2026. `tailscale up` connects/authenticates a device. | No |
| 2026-05-22 | Web | `https://tailscale.com/docs/install/android` | Verify Android install guidance | Last validated Jan 5, 2026. Android Tailscale client supports Android 8+; install via Google Play or Download page and sign in. | No |
| 2026-05-22 | Web | `https://tailscale.com/docs/install` | Verify install-from-zero entrypoint | Official install page links platform-specific instructions for Linux, macOS, Windows, Android, and update options. | No |
| 2026-05-22 | Web | `https://tailscale.com/kb/1016/install-mac` and `https://tailscale.com/docs/concepts/macos-variants` | Verify macOS install guidance | Current macOS client requires macOS Monterey 12.0+; standalone app from Tailscale package server is recommended; app onboarding installs VPN config and sign-in. | No |
| 2026-05-22 | Web | `https://tailscale.com/docs/install/windows` | Verify Windows install guidance | Current Windows client requires Windows 10+ or Windows Server 2016+; install with `.exe`, then sign in from system tray. | No |
| 2026-05-22 | Web | `https://tailscale.com/docs/install/linux` | Verify Linux install guidance | Official docs provide `curl -fsSL https://tailscale.com/install.sh | sh`, then starting/checking Tailscale status. | No |
| 2026-05-22 | Code | `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts`, `DockerNodeStartGuideCard.spec.ts`, `autobyteus-server-ts/tests/unit/remote-access/pairing-auth-service.test.ts` | Identify current validation coverage | Existing NodeManager tests cover tab separation for Docker; backend tests cover revoke/auth semantics but not active-list semantics; no PhoneAccessCard test found. | Yes, add tests. |
| 2026-05-22 | Doc | `solution-designer/design-principles.md`, `references/design-examples.md` | Follow required design workflow | Use spine/ownership and boundary rules; examples reinforce clear active-list boundary and avoiding helper-like mixed ownership. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Settings -> Nodes -> `NodeManager.vue` -> Manage tab -> `PhoneAccessCard.vue`.
- Current execution flow for paired phone list:
  1. `PhoneAccessCard.onMounted()` calls `store.loadAll()`.
  2. `phoneAccessStore.loadAll()` requests `/remote-access/devices`.
  3. `remote-access.ts` route returns `PairedDeviceService.listDeviceSummaries()`.
  4. `PairedDeviceService.listDeviceSummaries()` reads every persisted `PairedDeviceRecord` and maps all to summaries.
  5. `PhoneAccessCard` renders `store.devices` directly, including records with `revokedAt`.
- Current execution flow for revocation:
  1. UI calls `store.revokeDevice(deviceId)` or `store.revokeAllDevices()`.
  2. Backend marks active records with `revokedAt` but retains records.
  3. Store refreshes `/remote-access/devices`, receiving the retained revoked record(s) again.
  4. UI shows the revoked record(s) in the same active Paired Phones list with the red revoked timestamp.
- Ownership or boundary observations:
  - Persistence retention is intentional and useful for revoked-credential rejection.
  - Active-list semantics are not owned at the API/UI boundary; the UI already has an active filter but bypasses it.
  - Phone setup concerns are currently colocated with node management, unlike Docker setup which has a distinct guide tab.
- Current behavior summary: Revoked records remain because the system revokes by marking records, then returns and renders all marked records in the active list.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Feature + UX Cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + File Placement / Responsibility Drift
- Refactor posture evidence summary: Small refactor likely needed to make active-device list ownership explicit and move phone setup out of the Manage Nodes tab.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot | Revoked rows are rendered in active paired-phone section with Revoke buttons. | Active vs historical pairing state boundary is not enforced in the presentation. | Fix UI/API active list. |
| `PhoneAccessCard.vue` | Renders `store.devices`; explicitly displays `device.revokedAt`. | UI intentionally displays revoked rows even though section label says Paired Phones. | Remove revoked rendering from active section. |
| `phoneAccessStore.ts` | Has unused `activeDevices` computed selector. | The intended invariant exists but is not applied; a local implementation defect is present. | Use/replace with authoritative active list. |
| `PairedDeviceService` + REST route | API returns all summaries. | Active list is not owned at the boundary; every client must remember to filter. | Add explicit active-list method/semantics. |
| `NodeManager.vue` | PhoneAccessCard inside Manage tab; Docker guide separate. | Phone setup concern has drifted into node-management surface. | Add Phone Setup tab. |
| Android README/ConnectionScreen | Android gives only hint-level Tailscale Serve guidance. | Desktop setup owner should teach setup before users pair Android. | Add detailed desktop/node setup guide. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/settings/NodeManager.vue` | Owns node settings tab panel composition and node CRUD flow | Only two tab states; PhoneAccessCard lives in Manage; Docker panel is catch-all `v-else`. | Add `phoneSetup` tab and explicit panels for each tab. Move PhoneAccessCard to Phone Setup. |
| `autobyteus-web/components/settings/NodeManagerTabs.vue` | Owns node settings tab list | Contains Manage + Docker only. | Add Phone Setup tab metadata and localization key. |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | Owns Phone Access controls and paired-phone rendering | Renders all devices including revoked. Contains short Tailscale hint. | Render active devices only; reduce/relocate detailed setup copy to Phone Setup guide. |
| `autobyteus-web/stores/phoneAccessStore.ts` | Owns frontend state/actions for phone access API | Stores all API devices and computes unused activeDevices. | Make active-device state/selector authoritative for UI. |
| `autobyteus-server-ts/src/api/rest/remote-access.ts` | REST entrypoint for remote/phone access management | `/remote-access/devices` returns all summaries. | Prefer active-list route semantics unless a separate history endpoint is added later. |
| `autobyteus-server-ts/src/remote-access/services/paired-device-service.ts` | Domain/service owner for paired device lifecycle | Creates devices, revokes by marking, lists all, auth lookup has naming drift. | Add/rename active-list method; retain revoked storage. |
| `autobyteus-server-ts/src/remote-access/stores/paired-device-store.ts` | Persistence for paired-device records | Retains records; no deletion on revoke. | Correct; do not delete as UI fix. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/ui/ConnectionScreen.kt` | Android first-run connection UI | Recommends Tailscale Serve HTTPS and stable origin. | Web Phone Setup should provide the detailed commands that Android does not. |
| `autobyteus-android/README.md` | Android setup docs | Lists high-level Tailscale setup steps. | Align web tab and docs with this guidance. |
| `autobyteus-web/docs/remote_access.md` | Durable remote access docs | Documents record retention, Tailscale Serve recommendation, origin-scoping. | Update to mention new Phone Setup tab. |
| `autobyteus-web/localization/messages/en/settings.ts` and `zh-CN/settings.ts` | Settings UI strings | Contains NodeManager tab and PhoneAccess/Docker strings. | Add Phone Setup and guide strings. |
| `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` | Node tab/component coverage | Covers Docker tab separation. | Extend for Phone Setup tab. |
| `autobyteus-server-ts/tests/unit/remote-access/pairing-auth-service.test.ts` | Backend remote access service coverage | Covers revoke/auth, not active list. | Add active-list assertion. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-22 | Data probe | `python3 - <<'PY' ... read /Users/normy/.autobyteus/server-data/remote-access/paired-devices.json ... PY` | Local paired-devices store has `count 20`, `active 1`, `revoked 19`. | The screenshot symptom is explained by retained revoked records plus all-record rendering. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: `https://tailscale.com/docs/features/tailscale-serve`
  - Version / freshness: Last validated Jan 20, 2026; checked May 22, 2026.
  - Relevant contract: Serve shares local services within the tailnet; requires HTTPS certs and prompts/consent when needed; example `tailscale serve 3000` proxies local port over an HTTPS tailnet URL.
  - Why it matters: Phone Setup can safely recommend Serve for private tailnet HTTPS rather than Funnel/public internet.
- Public API / spec / issue / upstream source: `https://tailscale.com/docs/reference/tailscale-cli/serve`
  - Version / freshness: Last validated Jan 26, 2026; checked May 22, 2026.
  - Relevant contract: `tailscale serve [flags] <target>`; target can be a port like `3000`; flags include `--bg`, `--https`, `--http`; subcommands include `status` and `reset`; background serving persists/resumes when configured with `--bg`.
  - Why it matters: UI copy should include current CLI syntax and avoid outdated pre-1.52 command shapes.
- Public API / spec / issue / upstream source: `https://tailscale.com/docs/reference/tailscale-cli/up`
  - Version / freshness: Last validated Jan 26, 2026; checked May 22, 2026.
  - Relevant contract: `tailscale up` connects/authenticates a device.
  - Why it matters: Beginner setup should include how to connect the desktop/server node to Tailscale.
- Public API / spec / issue / upstream source: `https://tailscale.com/docs/install/android`
  - Version / freshness: Last validated Jan 5, 2026; checked May 22, 2026.
  - Relevant contract: Tailscale supports Android 8.0+; install via Google Play/Download page and sign in.
  - Why it matters: Phone Setup can tell users what must also happen on the Android device.


- Public API / spec / issue / upstream source: `https://tailscale.com/docs/install`, `https://tailscale.com/kb/1016/install-mac`, `https://tailscale.com/docs/concepts/macos-variants`, `https://tailscale.com/docs/install/windows`, `https://tailscale.com/docs/install/linux`
  - Version / freshness: macOS/Linux docs last validated Jan 5, 2026; install overview last validated Dec 19, 2025; Windows docs last validated Nov 21, 2025; checked May 22, 2026.
  - Relevant contract: Official platform install paths exist for macOS, Windows, Linux, and Android. macOS standalone app is recommended; Windows uses installer/system tray login; Linux docs include the official install script and `tailscale status`.
  - Why it matters: The Phone Setup tab must start before `tailscale up` for users who have not installed Tailscale yet.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not needed for current investigation; data/file/code analysis was sufficient to explain symptom.
- Required config, feature flags, env vars, or accounts: Existing local `/Users/normy/.autobyteus/server-data` used for data-count probe; no credentials exposed.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree setup above.
- Cleanup notes for temporary investigation-only setup: Removed accidental `typescript` file created by an earlier unquoted heredoc mistake; no other cleanup required.

## Findings From Code / Docs / Data / Logs

### Why revoked phones still exist in the node page

Revocation is modeled as a state transition, not deletion. This is good for credential rejection: an old credential can still be recognized as belonging to a revoked device and rejected with `REMOTE_ACCESS_DEVICE_REVOKED` instead of looking like an unknown credential. However, the active management list does not enforce the same state distinction. `GET /remote-access/devices` returns all retained records, and `PhoneAccessCard` renders that all-record list. Therefore every previously revoked phone remains visible as a row with a red revoked timestamp.

### Why the fix should not be raw deletion

Raw deletion would remove the retained record and may make an old credential indistinguishable from a never-seen credential. Existing docs also state that paired-device records remain in server data. The better fix is to make active-list semantics explicit at the management API/store/UI boundary and optionally add a separate history surface in a future task.

### Phone setup tab shape

The current Node Manager already has a tab pattern. Docker setup is separated into a Docker Guide tab because it is tutorial/help guidance rather than saved node settings. Phone setup has the same tutorial/setup character and should likewise be separated. The operational Phone Access controls belong with the setup guide in the new Phone Setup tab.

### Tailscale Serve instructions shape

Use official current CLI syntax, but do not force macOS users through CLI-wrapper installation when Tailscale.app is already installed. Recommended command shape for the tab:

```bash
# First install Tailscale on the desktop/server and Android phone.
# macOS: install Tailscale.app, sign in through the app UI, and use the MagicDNS
# value shown there. The app UI is enough for connection/status/address checks.
# Windows/Linux: install from the official Tailscale Download page.
# Android: install Tailscale from Google Play or Tailscale's Android download page, then sign in.

# macOS Serve commands using the bundled app executable directly.
# No /usr/local/bin CLI wrapper is required.
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve 29695
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 29695
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve status
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve reset

# Generic CLI path for platforms/users that already have `tailscale`.
# Connect/authenticate the desktop or server node to Tailscale if needed.
tailscale up

# Confirm the desktop/server and Android phone are visible in the tailnet.
tailscale status

# Serve the local AutoByteus node over private tailnet HTTPS in the foreground.
tailscale serve 29695

# Or keep it running in the background.
tailscale serve --bg 29695

# Inspect current Serve configuration/status.
tailscale serve status

# Clear Serve configuration if you need to start over.
tailscale serve reset
```

Instruction text should tell users to use the printed URL as `https://<machine>.<tailnet>.ts.net/mobile` in AutoByteus before creating the pairing QR. It should explain that changing from `http://192.168...:29695/mobile` to `https://...ts.net/mobile` later changes the WebView origin and can require re-pairing.

User testing of the implemented draft exposed an additional UX gap: after `Tailscale serve --bg 29695`, the Electron Phone Access URL dropdown still shows interface-derived HTTP candidates such as `http://100.127.30.107:29695`. That `100.x` address is the Tailscale private IPv4 address, not the Tailscale Serve HTTPS origin. The correct next step is to copy the HTTPS hostname printed by `tailscale serve status` or shown as MagicDNS, append `/mobile`, paste it into the manual URL field, then create the QR. The design must make that explicit and must not auto-select an HTTP candidate as the QR target when HTTPS is required.

Follow-up probe showed the desktop runtime could technically read Tailscale JSON status and derive the Serve host. Product decision after user feedback: do not have AutoByteus run local Tailscale commands on the user's behalf. Keep the setup user-controlled: the page instructs users to run `serve status`, copy the HTTPS/MagicDNS URL, append `/mobile`, and paste it into the UI form themselves. The probe remains evidence for what users will see, but it is explicitly not part of the target implementation.

## Constraints / Dependencies / Compatibility Facts

- Must align web/node setup guidance with Android app HTTPS expectation; new desktop-created Phone Access QR/pairing sessions must require HTTPS, with Tailscale Serve as the guided path.
- Tailscale Serve instructions must be based on current official docs because CLI syntax changed in Tailscale 1.52.
- Revoked records should remain in persistence; the UI/API active-list boundary should filter or expose active records only.
- No backward-compatible dual active/history list in the same UI section; create an explicit Revoked/History tab or section boundary for retained revoked records.

## Open Unknowns / Risks

- A simple separate Revoked/History device view is now in scope; advanced history management such as delete/export/search/bulk retention controls remains out of scope.
- Actual Tailscale HTTPS hostname is user-specific; command output must be used rather than hardcoding.
- If the app supports non-embedded node windows in this settings area, the Phone Setup tab should gracefully explain that Phone Access controls apply to the embedded/server node.

## Notes For Architect Reviewer

Design spec produced at `/Users/normy/autobyteus_org/autobyteus-worktrees/node-phone-setup-tab-revoked-cleanup/tickets/done/node-phone-setup-tab-revoked-cleanup/design-spec.md`. Key review focus areas:

- Backend active/revoked split: design makes `PairedDeviceService` the authoritative owner and changes `GET /remote-access/devices` to active-only with a separate revoked-history endpoint.
- Retained revoked records remain in persistence for auth/history; active UI must not treat them as active phones.
- Phone setup moves out of Manage Nodes into a new top-level Phone Setup tab.
- A simple separate Revoked/History device view is now in scope; advanced history management is explicitly out of scope.
- Phone Setup guide is install-from-zero and HTTPS-required with Tailscale Serve as guided path.
- HTTP is blocked for new desktop-created QR/pairing-session creation; no advanced acknowledgement escape hatch is added in this task.
- AR-001 rework: canonical `serverBaseUrl` excludes `/mobile`; user-facing `mobileUrl` includes `/mobile`; web/server normalizers strip recognized `/mobile` shell paths and pairing service builds mobile URLs while preserving optional base paths.
- AR-002 rework: frontend store blocks HTTP before POST and backend pairing service rejects non-HTTPS as defense in depth.

## User Clarification Log

| Date | Clarification | Requirements Impact |
| --- | --- | --- |
| 2026-05-22 | User expects revoke to remove the phone from the normal active list and asks why revoked records are kept; if kept/visible, active and revoked should be separated, for example with two tabs. | Requirements updated so revoke removes rows from the active view. Retained revoked records are backend/security/history state only. Any visible revoked history must be separate and non-actionable. |

| 2026-05-22 | User emphasized that phone setup must use HTTPS because HTTP is a security issue, and concrete Tailscale instructions should let users follow the setup without guessing commands. | Requirements updated to make HTTPS required for new desktop-created QR/pairing-session creation. Later architecture rework chose full HTTP blocking rather than an advanced acknowledgement flow. |

| 2026-05-22 | User clarified that instructions must cover Tailscale not being installed yet, otherwise users cannot follow the command-only guide. | Requirements updated so Phone Setup starts with install-from-zero guidance for desktop/server and Android before `tailscale up`, `status`, and `serve`. |

| 2026-05-22 | User approved the requirements basis and asked to start work. | Requirements status set to Design-ready; design spec production started. |


## Architecture Review Rework Investigation

| Date | Finding | Additional Investigation | Design/Requirements Impact |
| --- | --- | --- | --- |
| 2026-05-22 | AR-001 | Reviewed `autobyteus-web/utils/nodeEndpoints.ts`, `autobyteus-server-ts/src/remote-access/services/url-normalization.ts`, `remote-access-pairing-service.ts`, `mobileNodeSessionStore.ts`, Android `NodeUrlNormalizer.kt`, and tests. Web/server normalizers strip API suffixes but not `/mobile`; Android already normalizes `/mobile` to a clean base URL. Server `buildMobileUrl` uses `new URL("/mobile", serverBaseUrl)`, which would drop an optional deployment base path. | Target design must make `serverBaseUrl` canonical internal node base and `mobileUrl` user-facing shell URL. Web/server normalizers must accept and strip `/mobile` shell paths before storing/sending `serverBaseUrl`. Mobile URL construction must append `/mobile` while preserving an optional base path. |
| 2026-05-22 | AR-002 | Reviewed current `PhoneAccessCard` and `phoneAccessStore.createPairingSession()`; current design left HTTP block vs acknowledgement undecided. | Target design now chooses full HTTP blocking for new desktop-created Phone Access QR/pairing sessions. `PhoneAccessCard` owns the warning display/disabled action state, `phoneAccessStore` owns validation and no-POST behavior, and backend pairing service rejects non-HTTPS as defense in depth. No advanced HTTP acknowledgement UI is added in this task. |
| 2026-05-22 | Residual route-policy note | Reviewed `remote-access-route-policy.ts`; `/rest/remote-access/devices/revoked` currently matches the local-only `/devices/[^/]+` shape if added as a path, but explicit regression coverage is still needed. | Add route-policy regression test for revoked endpoint local-only classification/authorization. |
| 2026-05-22 | Residual remote-node Phone Setup note | Reviewed `NodeManager.vue`; PhoneAccessCard is currently gated by `isEmbeddedWindow`. | Design clarifies that Phone Setup tab may render guide content in remote-node windows, but Phone Access controls are replaced by an unavailable notice directing users to open the embedded/server node window. |


## Local macOS Tailscale CLI Probe

| Date | Probe | Observation | Requirement / Design Impact |
| --- | --- | --- | --- |
| 2026-05-22 | `command -v tailscale`; inspect `/Applications/Tailscale.app` | Tailscale.app is installed at `/Applications/Tailscale.app` version 1.96.5, but `tailscale` is not in PATH. `/usr/local/bin` is in PATH. The app bundle includes `/Applications/Tailscale.app/Contents/Resources/InstallTailscaleCLI.scpt`. Decompiled script creates `/usr/local/bin/tailscale` as a wrapper that execs `/Applications/Tailscale.app/Contents/MacOS/Tailscale` and prompts for administrator privileges. | Phone Setup guide should not assume `tailscale` is in PATH on macOS. Use `/Applications/Tailscale.app/Contents/MacOS/Tailscale ...` directly for macOS Serve commands; keep CLI-wrapper setup only as optional troubleshooting. |
| 2026-05-22 | User screenshot/testing note | Tailscale app UI shows MagicDNS, IPv4, and IPv6 values. | Phone Setup guide should tell users to use the MagicDNS hostname for the HTTPS Serve URL (`https://<MagicDNS>/mobile`). IPv4/IPv6 are useful for diagnostics but are not the preferred HTTPS Serve URL because certificates/Serve URL are tied to the MagicDNS name. |

| 2026-05-22 | User ran `osascript /Applications/Tailscale.app/Contents/Resources/InstallTailscaleCLI.scpt` | The script failed with AppleScript error -1728: cannot read application id `io.tailscale.ipn.macsys`. Local probe shows installed bundle id is `io.tailscale.ipn.macos`, while the script references `io.tailscale.ipn.macsys`; executable exists at `/Applications/Tailscale.app/Contents/MacOS/Tailscale`. | Phone Setup guide must not make the bundled AppleScript the primary path. Prefer direct app-executable commands for macOS. If wrapper guidance is included, keep it optional/advanced. |
| 2026-05-22 | User ran `/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 29695` successfully | Direct execution of the bundled Tailscale.app binary works for Serve on macOS without installing `/usr/local/bin/tailscale`. | Update requirements/design so macOS command cards use direct app-executable commands as the normal path; avoid misleading users into unnecessary CLI installation. |
| 2026-05-22 | Local `Tailscale serve status`; user screenshot of Electron Phone Access dropdown | Serve status prints an HTTPS tailnet URL proxying `/` to `http://127.0.0.1:29695`. The Electron dropdown still shows HTTP local/interface candidates, including a Tailscale `100.x` IP URL. | Product needs a clearer post-Serve next step: paste `https://<MagicDNS>/mobile` into manual URL. HTTP candidates must not be auto-selected/recommended under HTTPS-required QR creation; they are diagnostics/advanced local addresses only. |
| 2026-05-22 | `/Applications/Tailscale.app/Contents/MacOS/Tailscale status --json`; `/Applications/Tailscale.app/Contents/MacOS/Tailscale serve status --json` | `status --json` includes `Self.DNSName` `normys-macbook-pro.tail0347f8.ts.net.` and Tailscale IPs. `serve status --json` includes `Web["normys-macbook-pro.tail0347f8.ts.net:443"].Handlers["/"].Proxy = "http://127.0.0.1:29695"`. | Although auto-derivation is technically possible, user feedback rejected app-executed Tailscale commands. Target design is manual/user-controlled: show instructions, let the user run/read Tailscale output, and paste `https://<MagicDNS>/mobile` into the form. |
