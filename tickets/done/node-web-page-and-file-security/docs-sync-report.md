# Docs Sync Report

## Scope

- Ticket: autobyteus-416, `node-web-page-and-file-security`
- Trigger: validated package from the code reviewer (CRR-001 Pass, API-REV-001 Pass at 95%, CRR-002 Not Applicable). `task_size` `Large`, `architectural_risk` `High`, route `Reviewed` (architecture review, source review, API/E2E, test-code review)
- Bootstrap base reference: `origin/personal` @ `6225a734a3`
- Integrated base reference used for docs sync: `origin/personal` @ `99f67dc120`, merged into the ticket branch as `232f0b3d76`
- Post-integration verification reference: DEL-02 (`evidence/DEL-02-electron-tests.log`: 479 passed, 1 skipped) and DEL-03 (`evidence/DEL-03-mobile-shell.log`, `evidence/DEL-03-mobile-shell/mobile-shell-probe.json`: MSP-01…MSP-16 Pass, 0 refusal lines), on `232f0b3d76`

## Why Docs Were Updated

- Summary: the implementation commit `da207045a5` already updated the product docs: the Host rule, `AUTOBYTEUS_ALLOWED_HOSTS`, the changed localhost-origin rule, the tool-endpoint rule, the user-file headers, `file://` pages in the in-app browser, and the glossary. Delivery checked them against the merged code and found them accurate. Delivery added three short statements for the developer and test workflows the change also affects. Those places described a probe-owned backend and the `pnpm dev` backend without saying that each must now be told its frontend's origin.
- Why this should live in long-lived project docs: the next author of a browser probe, and a developer pointing a local tool at the `pnpm dev` backend, would otherwise hit `REMOTE_ACCESS_ORIGIN_REFUSED` without a pointer to the rule.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/remote_access.md` | Product contract for the Host and Origin rules and user files (REQ-010) | No change (updated in `da207045a5`) | Allowed Hosts (classes, setting, `.suffix`, no allow-all, refusal code and log line, who needs it), Allowed Origins (localhost not an exception, launchers), tool endpoints, User Files: each matches `remote-access-request-host.ts`, `remote-access-request-origin.ts`, `user-file-reply.ts` |
| `autobyteus-server-ts/README.md` | Settings and dev stack | Updated (dev stack section) | The settings lines from `da207045a5` match; one sentence added on the dev stack's `AUTOBYTEUS_ALLOWED_ORIGINS` |
| `README.md` (root) | Local full-stack development | Updated | Same sentence as above |
| `autobyteus-server-ts/docs/modules/node_desktop.md`, `autobyteus-web/docs/remote_access.md`, `autobyteus-web/docs/browser_sessions.md`, `docs/android_mobile_access.md`, `GLOSSARY.md` | Updated by implementation | No change | Match the merged code (`browser-file-document-request.ts`, `embeddedServerLaunchConfig.ts`) |
| `DESIGN.md` | Project design rules | No change | No rule changed; the design case entry for this ticket is in `docs/design-cases.md` (Case 2), kept beside autobyteus-427's entry in the base-refresh merge |
| `docs/design-cases.md` | Merge conflict with the base (autobyteus-427 added an entry to the same case) | No change beyond the merge | Both "Again in" entries kept; the base's wider "Notice it by" line kept |
| `TESTING.md` | Browser-probe rules | Updated | A probe-owned backend must list the probe's frontend origin |
| `RELEASE.md` | Release guide | No change | This change adds no release step. The base's newer guide (autobyteus-412) was used |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `TESTING.md` § Browser probes | Rule statement of the changed setup | A probe-owned backend gets `AUTOBYTEUS_ALLOWED_ORIGINS=<frontend origin>`; choose the frontend port before the node; list every frontend on every node of a multi-node probe | The 40 existing probes do it (D7); a new probe must too |
| `README.md` § Local full-stack development | Behavior note | `pnpm dev` sets the backend's `AUTOBYTEUS_ALLOWED_ORIGINS` to the two frontend origins and replaces any other value | Launcher-owned key (`development-runtime.mjs:38,250,266`); implementation handoff Known Risks |
| `autobyteus-server-ts/README.md` § Start the real backend and frontend | Behavior note | Same, with a link to Allowed Origins | Same |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Node Host rule | Which names a node accepts, `AUTOBYTEUS_ALLOWED_HOSTS`, the refusal and log | `design-spec.md` D1–D3, D8, D9 | `remote_access.md` § Allowed Hosts (implementation) |
| Localhost origins | Not trusted by default; exact entries only; launchers list theirs | `design-spec.md` D4, D7 | `remote_access.md` § Allowed Origins, `TESTING.md`, READMEs |
| User file replies | One owner, `sandbox allow-scripts` + `nosniff`, architecture test | `design-spec.md` D5 | `remote_access.md` § User Files (implementation) |
| `file://` pages in the in-app browser | Marked `Origin: null` | `design-spec.md` D6 | `autobyteus-web/docs/browser_sessions.md` (implementation) |
| Frame-origin measurement lesson | Measure every entry form | `design-review-report.md` AR-001/AR-002 | `docs/design-cases.md` Case 2 (Solution Designer) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Loopback-origin class in `createRequestOriginPolicy`; MCP `isOriginAllowed`; local access gate `isAllowedOrigin` | `createToolEndpointOriginPolicy` and exact `AUTOBYTEUS_ALLOWED_ORIGINS` entries | `remote_access.md` § Allowed Origins |
| `PREVIEW_DOCUMENT_SANDBOX`, `context-files.ts` `sendFile` | `sendUserFile` (`src/api/rest/user-file-reply.ts`) | `remote_access.md` § User Files; GLOSSARY "User file reply" |
| Two Host parsers (`mcp-gateway-access.ts`, local access gate) | `request-host-name.ts` | Code; implementation handoff |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, ticket archive, Secret Gate, finalization into `origin/personal`
- Notes: no follow-up from docs sync. CR-N1 (`parseWebOrigin` duplicated) is an optional cleanup that changes no behavior; it stays as recorded in the code review report.
