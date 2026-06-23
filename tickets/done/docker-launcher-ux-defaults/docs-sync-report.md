# Docs Sync Report

## Scope

- Ticket: `docker-launcher-ux-defaults`
- Trigger: API/E2E round 2 pass handoff requested delivery-stage public docs sync for Bash Docker launcher install/PATH guidance, persistent setup block behavior, sequential friendly ports, and read-only command defaults.
- Bootstrap base reference: `origin/personal@02440c9b357c7bf85d2bc7484a571fc0d58a55be`
- Integrated base reference used for docs sync: `origin/personal@02440c9b357c7bf85d2bc7484a571fc0d58a55be` after renewed `git fetch origin personal` on 2026-06-23.
- Post-integration verification reference: no new base commits were integrated because `HEAD`, `origin/personal`, and their merge-base were identical. Delivery still ran focused checks after docs sync; see `handoff-summary.md` and `release-deployment-report.md`.

## Why Docs Were Updated

- Summary: Public launcher behavior changed in user-visible ways: macOS/Linux install now gives truthful direct-path/current-shell PATH guidance plus persistent profile update or copy/paste setup guidance, fresh indexed Docker nodes prefer deterministic sequential host ports, and read-only discovery commands now show all managed nodes by default.
- Why this should live in long-lived project docs: `README.md` is the canonical public server Docker quick-start, and the in-app Docker Guide localization strings are the canonical user-facing command guide for Nodes -> Docker Guide. Both would otherwise preserve stale PATH, default-node, or random-port expectations.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `README.md` | Canonical public Docker launcher install/start/inspect documentation. | `Updated` | Added install PATH truth, persistent copy/paste setup fallback, sequential friendly ports, all-node read-only defaults, explicit single-node narrowing, and safe stop targeting. |
| `autobyteus-web/localization/messages/en/settings.ts` | English in-app Docker Guide command descriptions under Nodes -> Docker Guide. | `Updated` | Synchronized install, new-container, workspace paths, storage, and URLs descriptions with final behavior. |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | Chinese in-app Docker Guide command descriptions under Nodes -> Docker Guide. | `Updated` | Mirrored the English Docker Guide copy changes. |
| `docs/android_mobile_access.md` | Normal Docker-node setup references the Docker Guide and `new-container`. | `No change` | Existing flow remains accurate; it does not document port allocation, PATH behavior, or read-only discovery defaults. |
| `autobyteus-web/docs/remote_access.md` | Normal Docker-node pairing flow references Docker launcher setup. | `No change` | Existing pairing flow remains accurate; detailed launcher command semantics belong in `README.md` and the Docker Guide. |
| `docs/ios_mobile_access.md` | iOS mobile access guide cross-referenced from public Docker section. | `No change` | No launcher command semantics requiring sync were present. |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Docker Guide command list source. | `No change` | Command strings remain valid; descriptions/localized copy needed sync. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | Public Docker launcher behavior docs | Added macOS/Linux install PATH/direct-path/profile guidance; documented copy/paste persistent setup output when automatic profile update is skipped/unavailable/blocked; documented sequential friendly port offsets and fallback; documented `workspace paths`, `storage`, `urls`, and `ports` as all-node read-only defaults; documented explicit single-node narrowing; clarified `stop` remains default/single-node unless `--all` is intentional. | Keeps the public quick-start truthful for first install, multi-node port expectations, and read-only vs mutating command targeting. |
| `autobyteus-web/localization/messages/en/settings.ts` | In-app Docker Guide English copy | Updated install/new-container/workspace/storage/URLs command descriptions for direct-path/current-shell PATH guidance, persistent update or copy/paste profile setup guidance, sequential friendly ports, and all-node read-only defaults. | Prevents the app guide from implying old PATH, default-node-only, or generic/random-port behavior. |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | In-app Docker Guide Chinese copy | Mirrored the English Docker Guide description updates. | Keeps localized public guidance aligned with final behavior. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| macOS/Linux installer PATH truth | Installer can write files and profile guidance, but cannot mutate the already-running parent shell; users can use direct path, current-shell export, or a new terminal after persistent profile update. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` round 2 | `README.md`; Docker Guide localization strings |
| persistent setup fallback | When automatic profile update is skipped, unavailable, or blocked by a different managed block, the installer prints copy/paste persistent setup commands for the detected profile; API/E2E round 2 proved shell-safe quoting and idempotency. | `implementation-handoff.md`, `code-review-report.md`, `api-e2e-execution-coverage-report.md` round 2 | `README.md`; Docker Guide localization strings |
| sequential friendly ports for indexed Docker nodes | Fresh `autobyteus-server-N` nodes prefer deterministic offsets from backend/VNC/noVNC/debug ports `8001/5908/6080/9228`; unavailable preferred ports fall back safely and saved ports remain authoritative until unavailable. | `requirements.md`, `design-spec.md`, `api-e2e-execution-coverage-report.md` round 2 | `README.md`; Docker Guide localization strings |
| read-only discovery defaults | `urls`/`ports`, `workspace paths`, and `storage` now show all managed nodes by default, while explicit single-node forms remain available. | `requirements.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` round 2 | `README.md`; Docker Guide localization strings |
| mutating command safety | `stop` remains default/single-node unless a node or `--all` is explicitly used; `workspace apply --all`, `upgrade --all`, and `destroy --all` remain intentional all-node actions. | `requirements.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` round 2 | `README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Public docs omitting current-shell PATH limitation after install. | Direct path/current-shell export/profile update or copy/paste persistent setup guidance. | `README.md`; Docker Guide install description. |
| Public docs implying generic/non-deterministic port selection for additional nodes. | Sequential friendly indexed port preference with random fallback only when needed. | `README.md`; Docker Guide descriptions. |
| Public docs implying `urls` was only a single Backend URL reprint. | All-node URL/port discovery by default, with explicit single-node narrowing. | `README.md`; Docker Guide descriptions. |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A — docs updated`
- Rationale: Code review round 2 correctly identified durable docs impact; public README and Docker Guide copy required sync.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed after renewed round 2 delivery refresh confirmed the ticket branch was current with `origin/personal`. Repository finalization, ticket archival, push/merge, cleanup, and any release/publication remain held pending explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
