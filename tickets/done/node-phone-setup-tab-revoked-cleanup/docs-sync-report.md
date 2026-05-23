# Docs Sync Report

## Scope

- Ticket: `node-phone-setup-tab-revoked-cleanup`
- Trigger: Delivery refresh after API/E2E validation round 4 passed for code-review round 6.
- Bootstrap base reference: `origin/personal` at `fcf435ec1894de13fad54002cd70e62d59dd12b8`
- Integrated base reference used for docs sync: `origin/personal` at `fcf435ec1894de13fad54002cd70e62d59dd12b8` after `git fetch origin personal` on 2026-05-22.
- Post-integration verification reference: Base did not advance, so no post-merge rerun was required. Latest API/E2E round 4 and code review round 6 passed before this refresh; delivery sanity `git diff --check` passed after delivery artifact refresh.

## Why Docs Were Updated

- Summary: Prior delivery artifacts predated the round-6 correction. Long-lived docs were reviewed against the final integrated behavior: the Phone Setup guide is manual/user-controlled, has a macOS install link plus direct `/Applications/Tailscale.app/Contents/MacOS/Tailscale` Serve/status/reset commands only, does not ship generic `tailscale ...` command cards, does not mention `/usr/local/bin/tailscale` wrapper setup or `InstallTailscaleCLI.scpt`, does not inspect local Tailscale state, makes manual HTTPS MagicDNS `/mobile` entry primary, and leaves HTTP candidates as diagnostics that are not auto-selected for QR creation.
- Why this should live in long-lived project docs: These are durable user/operator setup and product-boundary facts. Future testers and users must understand that AutoByteus does not automate or inspect Tailscale and that the expected QR path is a manually supplied HTTPS MagicDNS `/mobile` URL.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/README.md` | Root user-facing Phone Access overview. | Updated | Points users to Settings -> Nodes -> Phone Setup and states HTTPS-required QR creation. No stale wrapper/generic command guidance found. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/remote_access.md` | Canonical user/operator Remote Access guide. | Updated | Documents direct Tailscale.app commands, manual MagicDNS `/mobile` entry, no AutoByteus Tailscale inspection/execution, and HTTP candidates as diagnostics. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/settings.md` | Canonical Settings -> Nodes UI/ownership guide. | Updated | Documents Phone Setup guide data ownership, direct macOS command catalog, manual URL field, and HTTP diagnostic candidates. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/features/remote_access.md` | Backend route/auth contract guide. | Updated | Backend active/revoked split, HTTPS pairing-session requirement, URL normalization, and retained revoked records remain current; round 6 did not change backend contract semantics. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/docs/android_mobile_access.md` | Android/Tailscale live-validation guide. | Updated | Documents app-direct macOS commands, manual HTTPS MagicDNS `/mobile` URL entry, and HTTP/IP values as diagnostics. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-android/README.md` | Android package setup and validation handoff guide. | Updated | Documents app-direct macOS commands and manual HTTPS MagicDNS `/mobile` URL entry. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/URL_GENERATION_AND_ENV_STRATEGY.md` | URL-generation guidance references paired phone bases. | No change | Existing guidance remains accurate: phone-facing resources use paired private-network base/relative URLs, not desktop loopback. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | User-facing overview | Phone Setup + HTTPS-required QR creation. | Avoid stale root instructions. |
| `autobyteus-web/docs/remote_access.md` | User/operator guide | Current manual/user-controlled Tailscale flow, direct macOS commands, MagicDNS `/mobile` entry, HTTP diagnostic candidates, no local Tailscale inspection, URL identity, and active/revoked lists. | Main Remote Access guide must match round-6 behavior. |
| `autobyteus-web/docs/settings.md` | Settings architecture/user guide | Current Phone Setup guide command ownership, direct macOS command catalog, manual URL field, and diagnostic candidate behavior. | Maintainers need the current component/utility ownership map. |
| `autobyteus-server-ts/docs/features/remote_access.md` | Backend contract guide | Active/revoked route split, HTTPS pairing-session creation, URL surface normalization, retained revoked records. | Backend maintainers need route and pairing invariants. |
| `docs/android_mobile_access.md` | Android/Tailscale validation guide | App-direct macOS Serve/status commands, manual HTTPS MagicDNS `/mobile`, no AutoByteus Tailscale execution, IP/HTTP diagnostics. | Android validation instructions must match round-6 product boundary. |
| `autobyteus-android/README.md` | Android project README | App-direct macOS Serve/status commands and manual HTTPS MagicDNS `/mobile` QR setup. | Android users/maintainers need current desktop-side setup instructions. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Phone Setup tab ownership | Phone Access controls moved out of Manage Nodes; Phone Setup owns Tailscale guide + Phone Access controls. | Requirements, design spec, implementation handoff, validation report | `README.md`, `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/remote_access.md`, Android docs |
| Manual/user-controlled Tailscale boundary | AutoByteus shows copyable instructions only; it does not run Tailscale, inspect local Tailscale state, parse `serve status`, or create/fabricate Serve HTTPS candidates. | Code review round 6, API/E2E round 4 | `autobyteus-web/docs/remote_access.md`, `autobyteus-web/docs/settings.md`, Android docs, Phone Setup guide UI |
| Direct macOS Tailscale.app commands | The guide uses direct `/Applications/Tailscale.app/Contents/MacOS/Tailscale` Serve/status/reset commands and a macOS install link only; generic CLI cards and wrapper/installer guidance are intentionally absent. | Code review round 6, API/E2E round 4 | `autobyteus-web/docs/remote_access.md`, `autobyteus-web/docs/settings.md`, Android docs, Phone Setup guide UI |
| Manual HTTPS MagicDNS `/mobile` QR target | User pastes the HTTPS MagicDNS `/mobile` URL manually. The preferred QR target normally has no `:29695`; IP/HTTP addresses are diagnostics. | Code review round 6, API/E2E round 4 | `autobyteus-web/docs/remote_access.md`, `autobyteus-web/docs/settings.md`, Android docs |
| HTTPS-only desktop QR creation | New desktop-created pairing sessions require `https://`; HTTP QR creation is blocked in UI and backend. | Requirements AC-009A/AC-009B, validation S-003/S-012 | `README.md`, `autobyteus-web/docs/remote_access.md`, Android docs, server backend docs |
| Canonical base vs mobile URL | Pairing payload/session/device stores canonical `serverBaseUrl`; QR and user-facing entry use `/mobile`. | Requirements AC-009C, validation S-004/S-012 | `autobyteus-web/docs/remote_access.md`, `autobyteus-server-ts/docs/features/remote_access.md`, Android docs |
| Active vs revoked device records | Active management endpoint/list excludes revoked devices; retained revoked records are local history only and non-actionable. | Requirements REQ-001 through REQ-004, validation S-001/S-002/S-008 | `autobyteus-web/docs/remote_access.md`, `autobyteus-server-ts/docs/features/remote_access.md`, `autobyteus-web/docs/settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Settings -> Nodes -> Phone Access as the desktop setup location | Settings -> Nodes -> Phone Setup with guide + controls | `README.md`, `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/remote_access.md`, Android docs |
| Active paired-phone list rendering all retained records | Active endpoint/list plus separate Revoked/History view | `autobyteus-web/docs/remote_access.md`, `autobyteus-server-ts/docs/features/remote_access.md` |
| New QR creation with HTTP/private URL fallback or acknowledgement | HTTPS-required desktop QR creation; Tailscale Serve HTTPS recommended through manual MagicDNS `/mobile` entry | `README.md`, `autobyteus-web/docs/remote_access.md`, Android docs, server backend docs |
| Treating `/mobile` as part of internal API base | Canonical `serverBaseUrl` without reserved app/API surfaces; user-facing `mobileUrl` appends `/mobile` | `autobyteus-web/docs/remote_access.md`, `autobyteus-server-ts/docs/features/remote_access.md` |
| Generic `tailscale ...` command cards and wrapper/installer guidance | macOS install link plus direct Tailscale.app Serve/status/reset commands only | `autobyteus-web/docs/remote_access.md`, `autobyteus-web/docs/settings.md`, Android docs, Phone Setup guide UI |
| Auto-detecting or fabricating local Tailscale Serve HTTPS candidates | Manual user-supplied HTTPS MagicDNS `/mobile` URL field; HTTP candidates are diagnostics | `autobyteus-web/docs/remote_access.md`, `autobyteus-web/docs/settings.md`, Android docs, Phone Access UI |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

N/A — docs were reviewed/refreshed for round 6.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is current with code-review round 6 and API/E2E round 4 validation. Final repository finalization remains on hold pending explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

N/A — docs sync completed.
