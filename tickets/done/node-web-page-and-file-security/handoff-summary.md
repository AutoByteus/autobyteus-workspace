# Handoff Summary

## Summary Meta

- Ticket: `node-web-page-and-file-security` (Project Task autobyteus-416)
- Date: `2026-11-08`
- Current status: `Verified from evidence; finalized into origin/personal; no release` (see the release/deployment report for the final merge and push)
- Routing: `task_size` `Large`, `architectural_risk` `High`, route `Reviewed`. Gates: ARCH-REV-002 Pass, CRR-001 Pass, API-REV-001 Pass (95%), CRR-002 Not Applicable
- Archived ticket folder: `tickets/done/node-web-page-and-file-security/`

## Delivery Summary

- Delivered scope (implementation `da207045a5`):
  - **Host rule**: the node's first request rule refuses any HTTP request or WebSocket upgrade addressed to a name that is not the node's. The answer is 403 `REMOTE_ACCESS_HOST_REFUSED`, and the log line names the host and the setting. Names that pass: IPs, `localhost`, special-use and `.ts.net` names, `AUTOBYTEUS_SERVER_HOST`, `AUTOBYTEUS_ALLOWED_ORIGINS` hosts, pairing sessions, paired phones, and the new `AUTOBYTEUS_ALLOWED_HOSTS` setting. `X-Forwarded-Host` is ignored.
  - **Localhost origins**: no longer accepted by default on the main gate, `/mcp/gateway`, or the agent-tools and credential-proxy listeners. Only exact `AUTOBYTEUS_ALLOWED_ORIGINS` entries pass. Electron dev, `pnpm dev`, 40 browser probes and the server tests list their frontend origin.
  - **User files**: all of F1–F15 answer through `sendUserFile`, with `CSP: sandbox allow-scripts` and `nosniff`. An architecture test keeps every file route on that owner.
  - **In-app browser**: requests made by `file://` documents, and by anything those documents create, carry `Origin: null`.
  - **Docs**: `remote_access.md`, READMEs, `browser_sessions.md`, `node_desktop.md`, `android_mobile_access.md` and GLOSSARY were updated by implementation. Delivery added statements to TESTING.md and two dev-stack READMEs.
- Deferred / not delivered: FU-001 (standalone application host rebinding; urgent), FU-002 (a peer's add error names the wrong cause), FU-003 and FU-004 (unrelated probe defects), all in `follow-ups.md`. The Solution Designer sends them.
- Accepted residual risks: RSK-001/RSK-002. Setups reached by an unknown public DNS name, and local tools on other ports, need a setting. The node logs a hint, and the docs and release note cover it. R-7: a `file://` page's GET subresources from a node also carry `Origin: null`. CR-N1: an optional cleanup that changes no behavior.

## Integration

- Base checked at delivery start: `origin/personal` @ `99f67dc120`, 21 commits past the bootstrap base `6225a734a3` (autobyteus-412 and autobyteus-427).
- Method: merge (`232f0b3d76`). One conflict, documentation only: `docs/design-cases.md`, where both tickets added an entry to Case 2. Both entries were kept. `electronApplication.ts` and `mobile-shell-probe.mjs` merged automatically in separate regions. The base changes no server source.
- Post-integration checks on `232f0b3d76`:
  - DEL-01: `pnpm -C autobyteus-web build:mobile-web`, exit 0.
  - DEL-02: Electron main-process suite, `Tests 479 passed | 1 skipped (480)`.
  - DEL-03: `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell`, `mobile-shell probe: Pass`, MSP-01…MSP-16. This includes 427's new MSP-16, which opens a conversation file on the phone under this ticket's user-file headers and origin rule. 0 Host/Origin refusal lines on both nodes and the frontend, `unknownBrowserErrors: 0`, cleanup `serversLeft: 0`.

## Verification Summary

- Judged from the evidence by delivery. The execution report's AC proof was followed to the cases, and the critical files were opened (details in the release/deployment report). Final confidence is 95%, with no category below 94%. Every critical AC is directly proven on real surfaces: the packaged in-app browser with the embedded node, Electron dev, `pnpm dev`, real browsers through Host-preserving TLS proxies, two-node and Docker collaboration, and 11 browser probes.
- AC-004 (phone via Tailscale Serve and a company URL) is proven as its verification intent asks ("server e2e or browser probe"). The proxies send the same `Host`, `Origin` and `X-Forwarded-*` headers. The rule reads `Host` only, and either form a real proxy can send passes: a kept `*.ts.net` name or company `AUTOBYTEUS_SERVER_HOST`, or a rewrite to the node's IP or `localhost`. Not a user gate. Optionally, the user can open `/mobile` once on their own tailnet or company proxy after upgrading.
- Not tested: signing, notarization, and the non-macOS release builds (runner-only; no build step of theirs changed). Live-provider probes were not run. Neither affects this change.

## Documentation Sync Summary

- Docs sync report: `tickets/done/node-web-page-and-file-security/docs-sync-report.md`
- Result: `Updated` (`TESTING.md`, `README.md`, `autobyteus-server-ts/README.md`). The implementation's docs were confirmed accurate.

## Release Notes Status

- Release notes: `tickets/done/node-web-page-and-file-security/release-notes.md`, for the release that includes this change. It has a `## What you need to do` section, to be carried into beta notes as RELEASE.md describes.
- Release decision: no release. The Task says "Release only on the user's word", and RELEASE.md's default is "No release". A beta or stable release is available on request.
