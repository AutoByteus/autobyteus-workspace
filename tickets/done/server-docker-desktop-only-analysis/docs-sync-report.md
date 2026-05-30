# Docs Sync Report

## Scope

- Ticket: `server-docker-desktop-only-analysis`
- Trigger: Updated API/E2E validation passed on 2026-05-30 with authoritative Round 2 live frontend/browser coverage for Settings > Nodes > Phone Setup and Docker Guide.
- Bootstrap base reference: `origin/personal @ 21d05cf9e685b99f08de2b2e02a0b15a9e76a3b7`
- Integrated base reference used for docs sync: `origin/personal @ 21d05cf9e685b99f08de2b2e02a0b15a9e76a3b7` after `git fetch origin personal` on 2026-05-30.
- Post-integration verification reference: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/delivery-evidence/round-2/delivery-integration-checks.log`

## Why Docs Were Updated

- Summary: The final validated implementation removes the public Docker launcher profile model and makes the prior normal/desktop Docker launch shape the single managed Docker path. Long-lived Docker, Phone Access, Android, and settings docs must no longer recommend or describe a separate mobile-safe launcher profile, and must instead describe normal Docker plus trusted private HTTPS Phone Access pairing. Round 2 live browser validation confirmed that the rendered Phone Setup and Docker Guide UI now match that documented behavior.
- Why this should live in long-lived project docs: Users install and operate the public launcher from README/settings docs, create Docker nodes from the Docker Guide, and pair phones from the Phone Setup docs. Keeping the removed profile in canonical docs would cause users to run obsolete commands and misunderstand the supported security boundary.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `README.md` | Top-level user-facing Docker and Phone Access guidance. | Updated | Replaces mobile-safe recommendation with normal Docker node + trusted private HTTPS Phone Access wording; records managed-container named volume and host-visible workspace behavior. |
| `autobyteus-server-ts/README.md` | Server package Docker launcher usage. | Updated | Removes profile command and keeps the single `autobyteus-docker new-container` path. |
| `autobyteus-server-ts/docker/README.md` | Docker-specific launcher operations guide. | Updated | Removes profile-specific setup and documents normal managed Docker node shape plus `/mobile` packaging. |
| `autobyteus-server-ts/docs/features/remote_access.md` | Backend feature semantics for pairing, identity verification, and phase boundary. | Updated | Rewords remote Docker / Android-facing identity language to generic remote-node / phone-facing private HTTPS language. |
| `autobyteus-web/docs/remote_access.md` | User-facing Phone Access and remote-node pairing guide. | Updated | Renames the flow to normal Docker node pairing, removes `--profile mobile-safe`, and keeps same-node `serverInstanceId` verification. |
| `autobyteus-web/docs/settings.md` | Canonical settings UI documentation for Nodes, Phone Setup, and Docker Guide. | Updated | Documents normal Docker Guide command catalog and removes profile-specific copy. Round 2 live browser validation confirmed rendered Settings > Nodes tabs match this. |
| `docs/android_mobile_access.md` | Android setup guide. | Updated | Replaces mobile-safe setup with normal Docker/embedded-node private HTTPS pairing model and updated Docker launcher ownership. |
| `docs/future-tickets/mobile-backend-authorization-hardening.md` | Future hardening scope that previously referenced mobile-safe as the Phase One boundary. | Updated | Reframes Phase One around trusted private HTTPS node pairing and removes obsolete node-kind taxonomy. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | User guide / operations | Removed mobile-safe command and profile behavior; documented single normal Docker path, trusted private-network warning, paired-phone credential boundary, `/mobile` packaging, and managed-container workspace mounts. | Aligns top-level instructions with the only supported launcher path. |
| `autobyteus-server-ts/README.md` | Server package guide | Removed the mobile-safe profile command and kept normal Docker launch plus Phone Access credential boundary. | Prevents server package readers from using a removed CLI surface. |
| `autobyteus-server-ts/docker/README.md` | Docker operations guide | Removed mobile-safe setup; describes normal managed containers, named volumes, host-visible folders, and `/mobile` packaging. | Keeps Docker-specific docs accurate for runtime behavior validated against real Docker. |
| `autobyteus-server-ts/docs/features/remote_access.md` | Backend feature doc | Replaced Docker/mobile-safe-specific identity-verification wording with remote-node/phone-facing private HTTPS wording. | Matches unchanged same-node verification behavior without tying it to a removed profile. |
| `autobyteus-web/docs/remote_access.md` | Remote Access user guide | Changed the recommended Docker pairing flow to `autobyteus-docker new-container`, removed profile hardening claims, and kept credential/trusted-network boundaries. | Ensures Phone Access guidance matches UI copy and launcher behavior. |
| `autobyteus-web/docs/settings.md` | Settings UI architecture/user doc | Updated Docker Guide command list and guidance to one normal public server Docker node path. | Keeps UI documentation consistent with the command catalog, localized guide copy, and Round 2 live browser evidence. |
| `docs/android_mobile_access.md` | Android setup guide | Replaced mobile-safe Docker-node setup with normal Docker node setup and generic private HTTPS pairing. | Android users should follow the supported launcher path while preserving private-network warnings. |
| `docs/future-tickets/mobile-backend-authorization-hardening.md` | Future ticket / roadmap doc | Removed mobile-safe as the Phase One premise and updated future session node kind examples. | Avoids future hardening work depending on an obsolete launcher profile. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Single public Docker launcher path | `autobyteus-docker new-container` is the single managed server Docker creation path; public profile selection and `--profile mobile-safe` are removed. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `validation-report.md`, `validation-evidence/round-2/docker-guide-ui-check.json` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |
| Normal managed Docker runtime shape | Managed containers use the normal run shape: `SYS_ADMIN`, `seccomp=unconfined`, unqualified host ports, named volumes, node workspace bind mount, and shared folder bind mount. | `implementation-handoff.md`, `validation-report.md`, `validation-evidence/round-1/docker-lifecycle-summary.md` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |
| Phone Access private HTTPS pairing | Remote-node Phone Access requires a phone-facing private HTTPS `/mobile` URL that reaches the same `serverInstanceId` as the desktop management URL; mobile credentials remain separate from owner-management access. Round 2 rendered Phone Setup verification showed the private HTTPS/Tailscale Serve copy and backend-loaded candidate data. | `requirements.md`, `design-spec.md`, `validation-report.md`, `validation-evidence/round-2/phone-setup-ui-check.json` | `README.md`, `autobyteus-server-ts/docs/features/remote_access.md`, `autobyteus-web/docs/remote_access.md`, `docs/android_mobile_access.md` |
| Docker `/mobile` packaging preservation | Removing the launcher profile does not remove Docker image mobile-web packaging; fresh managed Docker containers should serve `/mobile`. | `requirements.md`, `implementation-handoff.md`, `validation-report.md` | `README.md`, `autobyteus-server-ts/docker/README.md`, `docs/android_mobile_access.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Public launcher `mobile-safe` profile and `--profile mobile-safe` command examples. | Single `autobyteus-docker new-container` command with normal managed Docker behavior. | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |
| Mobile-safe-specific runtime description: no `SYS_ADMIN`, no `seccomp=unconfined`, localhost-bound ports, no automatic shared host bind mounts. | Normal managed Docker runtime shape with privileged browser/container flags, unqualified published ports, named volumes, and host-visible workspace/shared bind mounts. | `README.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |
| Android/Phone Access wording that treated mobile-safe Docker as the recommended Phase One path. | Trusted private HTTPS pairing to the intended current node, with same-node `serverInstanceId` verification and separate mobile credentials. | `autobyteus-web/docs/remote_access.md`, `autobyteus-server-ts/docs/features/remote_access.md`, `docs/android_mobile_access.md`, `docs/future-tickets/mobile-backend-authorization-hardening.md` |
| Future-ticket node kind taxonomy containing `docker-mobile-safe` / `docker-standard`. | Generic `docker` / `embedded-host` node-kind language for future mobile session hardening. | `docs/future-tickets/mobile-backend-authorization-hardening.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A — docs impact existed and the candidate includes long-lived documentation updates.`
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Delivery reviewed the long-lived docs against the integrated branch state after confirming `origin/personal` had not advanced beyond the bootstrap base. Round 2 validation added live browser evidence for Settings > Nodes > Phone Setup and Docker Guide; those results support the existing docs/UI sync and did not require additional long-lived doc edits beyond updating delivery artifacts.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
