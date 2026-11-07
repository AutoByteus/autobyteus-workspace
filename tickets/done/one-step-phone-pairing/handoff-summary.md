# Handoff Summary: one-step-phone-pairing (autobyteus-395, with autobyteus-391)

- Status: verified from the evidence (audited, not redone; DR-001). Archived, finalized on `personal` and released as **beta** on the user's word in the requirements doc ("For this ticket, we need to release a beta … i waive for codex if delivery engineer asks"). Release outcome: [release-deployment-report.md](release-deployment-report.md).
- Classification: `task_size=Large`, `architectural_risk=High`, reviewed route. Architecture review ARCH-REV-003 Pass. Implementation IR-002. Source review CRR-001 Pass, CRR-002 failure-origin review (CR-001, phones-list dates), CRR-003 Pass after the fix. API/E2E API-REV-002 Pass, final confidence 95% (target 95%; no category below 90%). Test-code review CRR-004 Pass (`mobile-shell-probe.mjs` MSP-06/09, `TESTING.md` fresh-start Android rule).
- Solution revision: SR-014 (requirements SR-013, DEC-001…DEC-024).

## What Changed

- **Desktop, Nodes › Phone Setup:** one **Phones** panel replaces the Tailscale Serve guide and the Phone Access card. It shows four ways to connect as tabs (Same Wi-Fi or LAN, Tailscale, Your VPN, Company address). It works out each way's addresses from the node's network facts, checks every address by node ID in parallel (2 s) and pre-selects the best ready way as **Recommended**. One press on **Show QR code** makes a code holding that way's best checked address. The panel also has the per-node **Phone access** switch, the once-per-network "Allow phones on this network?", the typed company address, the optional Advanced `tailscale serve` command (shown, never run, no `serve reset`), the code timer, discard and New code, and Connected phones with History (n). It works the same in the windows of Docker nodes and of nodes on other machines.
- **Server:** `GET /rest/remote-access/network` (`NodeNetworkService`: Tailscale, VPN, local network and network ID, computer name; runs no Tailscale command), `PUT …/network/local-networks/:networkId`, `DELETE …/pairing-sessions/:sessionId`. Sessions require `connectionWay`; device records carry it. Status drops `serverName`. `address-candidates` is removed.
- **`/mobile`:** the pairing page pairs at once in the app, and in a browser with one **Connect to <node>** tap. The session keeps `nodeName`. The node sheet has a refresh icon or Retry, Switch node (app only) and "Unpair from <node>", and no peer list.
- **Android:** scan-first start screen with the saved nodes' reachability, its own Scan screen, `NodeConnectionFlow` (parse → check → open → save on `paired`), Can't reach reasons, Switch node through the `androidx.webkit` shell bridge (main frame of the node's origin only, no credential). New dependency `androidx.webkit:webkit:1.12.1`, no new permission.
- Docs (delivery): `autobyteus-web/docs/remote_access.md`, `docs/android_mobile_access.md`, `autobyteus-android/README.md`, `README.md`, `autobyteus-web/README.md` ([docs-sync-report.md](docs-sync-report.md)). The implementation already updated `autobyteus-server-ts/docs/features/remote_access.md` and `GLOSSARY.md`, and API/E2E updated `TESTING.md`; delivery checked all three as current.

## Integration

- Bootstrap base `origin/personal` @ `677f61de0b`. At delivery start `git fetch origin personal` gave the same tip, and the merge-base of the ticket branch and `origin/personal` is `677f61de0b`: the branch was already current. No base commits, no merge, so no post-integration rerun (the release guide's "delivery audits; it does not redo").
- Delivery first committed the reviewers' uncommitted ticket documents (`49c56d4041`: design-review edits, code-review report and record, API/E2E test-code review, FU-006).

## Verification (audit of the evidence)

Each criterion was traced through the execution report to its cases; the files were opened for the lines named.

- AC-001 (Tailscale pre-selected, one press turns access on and shows the QR): API-08 `Tailscale Recommended: ready=True selected=true`, `ms click → QR: 194`, `line: "Works anywhere through Tailscale"`.
- AC-002 (Wi-Fi asked once per network): API-08 `"Allow and show QR code"`, `line: "Works on this network"`, `PUT …/local-networks/gw_<16 hex> 200`; switch off asks again. API-07: another network ID is not allowed, and `this-computer` without a default route.
- AC-003 (never offered): API-07 classified link-local `169.254.10.10`, every IPv6 address, public `8.8.4.4`, bridges and loopback as excluded on a real Linux kernel. Unit tests in IMP-02 cover the rest.
- AC-004 (Docker node): API-09 `serverBaseUrl":"http://<tailnet address>:49816"` and the `<lan address>` code, `serverName":"Docker Test Node"`; loopback-only node `"…isn't reachable from other devices. Publish its port …"`. API-12: the emulator paired with that Docker node.
- AC-005 (node on another machine): API-10 `ms tab click → ready: 2079`, remote node keeps its own network answer; typed wrong address `"This address doesn't reach Linux Test Node."`, right one `"connectionWay":"company_address"`; tunnel-only: every tab `ready=False` and the field `Enter the address your IT gave you`. The second computer was emulated by its own network namespace.
- AC-006 (Advanced command): API-08 shows the exact `serve --bg 49411` command with Copy and Check again. API-08 also exercised the HTTPS-name check: the name answered with another node's ID and was excluded. Non-critical.
- AC-007 (released app reads the new QR): API-18 old APK, `'Connect to Docker Test Node'` → run list; API-04 parser.
- AC-008 (scan → run list, no checkbox/name/tap): API-12 for the Share form, `('sdk_gphone64_arm64', 'tailscale')` and `('sdk_gphone64_arm64', 'local_network')` devices with model names, run list reached. The scanner itself opened with its permission flow (API-12, IMP-10 screenshot). The decode is zxing's `BarcodeView.decodeSingle` (QR only) into the same `flow.connect(text, EntryForm.Scan)`, and the post-decode path is unit-tested per entry form (API-04). API-13 could not show a QR to the emulator camera headless.
- AC-009/010/011 (names, scan-first, Switch node): API-12 first launch `['AutoByteus', 'Scan the QR code on your computer', …, 'Other ways to connect', 'Scan']`, two nodes by name, `Switch node` → `Docker Test Node, Not reachable` (screenshot checked).
- AC-012 (phones list, History): API-03 History (31) component test; API-15 real revoke → `History (1)`; API-17 round 2 English and zh-CN rows on a German OS.
- AC-013 (timer, discard, used, expired): API-08 `DELETE … 204` then `REMOTE_ACCESS_PAIRING_INVALID`, `REMOTE_ACCESS_PAIRING_CONSUMED`; API-11 `"This code has expired"`, `REMOTE_ACCESS_PAIRING_EXPIRED`, New code `Valid for 5:00`.
- AC-014 (phone paired before the change): API-15 released server + base APK, upgraded in place: `['10.0.2.2:54021, Connected. Connection', 'No runs yet', …]` with no input, same `nodeId`, `"connectionWay":null`.
- AC-015 (browser one tap): API-06 `"button": "Connect to Alpha Test Node"`; API-18.
- AC-016 (node sheet): API-06 `"peerRows": 0`, `"text": "Retry"`, cleanup `"serversLeft": 0`, `"rootRemoved": true`; connection-sheet screenshot shows refresh icon and "Unpair from Alpha Test Node".
- QR-001 (no code in logs): 0 matches for each of the 8 codes and for `pairing=`. QR-003 (no new permission): API-05 `aapt2` lists INTERNET, ACCESS_NETWORK_STATE, CAMERA only. API-14: sandboxed frames get no bridge (`"type": "undefined"`).
- Release build input: API-05 fresh clone, empty Gradle home, `BUILD SUCCESSFUL in 1m 22s`, `androidx.webkit` downloaded.
- Reused implementation checks: IMP-02 `Tests 119 passed (119)`; IMP-06 affected `Tests 125 passed (125)`. The full-suite failures in IMP-01 (tracked-imports before staging) and IMP-06 (`mobile-root-shell.spec.ts` before its update) are explained in the handoff and pass in the reruns. IMP-03/04 show 0 production type errors, and the test-file errors equal the baseline.
- **Judgement: Sufficient.** Every critical criterion is directly proven at 95% final confidence. Three parts can only be checked on the user's own devices and network; API/E2E showed what it tried for each. None of them is a gap in the proof of the code that changed:
  - AC-008: a real camera decoding the QR. This is library behavior with standard wiring; the path after the decode is proven.
  - AC-005: the user's own second computer. Proven against an emulated one.
  - AC-006: the HTTPS state after running Serve on his tailnet (non-critical; running it would change his tailnet).
  The user asked for a beta, and a beta is the channel through which these builds reach his phone and nodes. Delivery therefore does not hold the merge for them; they are listed below for the user to check on the beta.

## For the user to check on the beta (not blockers)

1. On his phone with the new APK: tap **Scan** and scan a desktop QR (AC-008 camera decode).
2. A node on his second computer, updated to this beta: Phone Setup in its window shows its ways, and a code pairs (AC-005).
3. Optional: run the Advanced `tailscale serve` command shown for a node, then **Check again** shows the secure address (AC-006).

## Residual

- Windows hosts: low priority by the user's decision (QR-006). There was no Windows-specific work and no Windows check; Windows uses the safe fallbacks.
- Linux Tailscale/WireGuard interfaces were real kernel interfaces made by the test, with no peer traffic (API-07).
- New desktop + node on an older server: Phone Setup in that node's window shows a raw request error. The release notes tell users to update their nodes first; FU-007.
- Follow-ups FU-001…FU-007 are in [follow-ups.md](follow-ups.md); the Solution Designer sends them.

## Release

- Beta, by the user's decision. Tag, workflows and assets: [release-deployment-report.md](release-deployment-report.md).
