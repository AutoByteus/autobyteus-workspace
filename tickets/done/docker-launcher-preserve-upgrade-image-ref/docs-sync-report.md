# Docs Sync Report

## Scope

- Ticket: `docker-launcher-preserve-upgrade-image-ref`
- Trigger: Delivery-stage integrated-state docs sync after code review and API/E2E coverage passed.
- Bootstrap base reference: `origin/personal` / finalization target `personal` from upstream bootstrap context; delivery fetch confirmed `origin/personal@7508f3de95c7aebf2d5a2816e95e81023324aadf`.
- Integrated base reference used for docs sync: `origin/personal@7508f3de95c7aebf2d5a2816e95e81023324aadf`; ticket branch was already current with the latest tracked remote base, so no merge or rebase was required.
- Post-integration verification reference: worktree on `codex/docker-launcher-preserve-upgrade-image-ref` with `HEAD@7508f3de95c7aebf2d5a2816e95e81023324aadf` plus the reviewed/validated ticket diff; delivery reran Bash syntax, whitespace, focused Python 3.11 launcher coverage, localization boundary guard, and localization literal audit.

## Why Docs Were Updated

- Summary: Public launcher upgrade semantics changed. Plain `autobyteus-docker upgrade --all` now preserves each managed node's saved image reference, while explicit `--tag` or `--image` remains the mechanism for retargeting all nodes. Long-lived docs and user-facing copy needed to stop describing plain upgrade as applying a single latest/default image.
- Why this should live in long-lived project docs: This is a user-facing launcher contract for mixed Docker fleets, including `latest` and `latest-zh` nodes. Future launcher, docs, support, and UI work needs the preserve-by-default versus explicit-retarget distinction outside ticket-local artifacts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/README.md` | Root public Docker quickstart includes `upgrade --all` guidance. | Updated | Now explains saved image-ref preservation and explicit all-node retarget examples. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/autobyteus-server-ts/docker/README.md` | Canonical server Docker README and public launcher command reference. | Updated | Now explains saved image-ref preservation, explicit retarget examples, and command summary wording. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/autobyteus-server-ts/README.md` | Server package README repeats the Docker lifecycle quickstart. | Updated | Delivery sync removed stale “latest image” wording and added the same preserve/retarget distinction. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/scripts/public/docker/autobyteus-docker.d/bash/core.sh` | Public Bash launcher help text is installed/read by users. | Updated | Help now says `upgrade --all` uses saved image refs and notes explicit override retargeting. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1` | Public PowerShell launcher help text is installed/read by users. | Updated | Help mirrors Bash semantics. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/autobyteus-web/localization/messages/en/settings.ts` | Settings UI Docker node guide describes the same direct lifecycle command. | Updated | English user-facing copy now says upgrade recreates nodes with each node's saved image ref. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/autobyteus-web/localization/messages/zh-CN/settings.ts` | Chinese settings UI Docker node guide had equivalent stale “latest image” wording. | Updated | Chinese user-facing copy now describes saved image references. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Settings UI command list was reviewed to see whether the command shape itself needed an explicit flag. | No change | The displayed command remains `autobyteus-docker upgrade --all`; only its description needed sync. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/README.md` | Public usage docs | Replaced “latest image” upgrade wording with saved image-ref preservation, mixed `latest`/`latest-zh` example, and explicit `--tag`/`--image` retarget examples. | Root README must communicate the new default contract. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/autobyteus-server-ts/docker/README.md` | Public Docker docs / command reference | Added preserve-by-default wording and explicit retarget examples; updated command reference row to mention saved image refs and explicit override flags. | This is the canonical Docker README for launcher users. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/autobyteus-server-ts/README.md` | Package README quickstart | Replaced stale “latest image” wording with saved image-ref preservation and explicit retarget examples. | Prevents duplicate quickstart docs from preserving obsolete behavior. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/scripts/public/docker/autobyteus-docker.d/bash/core.sh` | CLI help text | Updated `upgrade --all`, `--tag`, and `--image` help copy for preserve-by-default and explicit retargeting. | Installed Bash help must match runtime semantics. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1` | CLI help text | Mirrored the Bash help text update in PowerShell. | Installed PowerShell help must match runtime semantics. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/autobyteus-web/localization/messages/en/settings.ts` | User-facing UI copy | Updated the Docker node guide upgrade description to saved image-ref wording. | The settings guide is a durable user-facing command guide. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/autobyteus-web/localization/messages/zh-CN/settings.ts` | User-facing UI copy | Updated the Chinese Docker node guide upgrade description to saved image-reference wording. | Keeps localized guidance aligned with the new contract. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Preserve-by-default upgrade | Plain `autobyteus-docker upgrade --all` visits every managed node but resolves the target image from each node's saved state, preserving mixed `latest`, `latest-zh`, and pinned image lines. | `requirements.md`, `investigation-notes.md`, `design-spec.md`, `implementation-handoff.md`, API/E2E reports | `README.md`; `autobyteus-server-ts/README.md`; `autobyteus-server-ts/docker/README.md`; Bash/PowerShell help |
| Explicit all-node retargeting | `--tag` and `--image` on `upgrade --all` are intentional override inputs and retarget every managed node to the computed image ref. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, code review report | `README.md`; `autobyteus-server-ts/README.md`; `autobyteus-server-ts/docker/README.md`; Bash/PowerShell help |
| Settings UI command guide wording | The UI direct command guide should describe the installed command's preserve-current-image behavior instead of implying one global latest/default image. | `requirements.md`, code review docs-impact verdict, API/E2E docs/help check | `autobyteus-web/localization/messages/en/settings.ts`; `autobyteus-web/localization/messages/zh-CN/settings.ts` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Plain `upgrade --all` described as recreating all nodes with “the latest image”. | Plain upgrade preserves each node's saved image ref; explicit `--tag`/`--image` retargets all nodes. | Root/server READMEs, Docker README command reference, Bash/PowerShell help, settings UI copy. |
| Implicit default-latest retargeting as the apparent normal upgrade path. | Explicit retarget examples for users who want all nodes moved to a new tag or image. | Root/server READMEs and `autobyteus-server-ts/docker/README.md`. |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A — docs and user-facing guidance were updated.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed after delivery confirmed the ticket branch was current with latest `origin/personal` and reran focused post-integration checks. Repository finalization remains held for explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
