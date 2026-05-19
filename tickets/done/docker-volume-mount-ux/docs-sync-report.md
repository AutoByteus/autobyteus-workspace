# Docs Sync Report

## Scope

- Ticket: `docker-volume-mount-ux`
- Trigger: Delivery-stage docs sync after API/E2E validation passed for Docker shared workspace bind-mount UX.
- Bootstrap base reference: `origin/personal` at `98cfdc24612a8cce8525e934cfd373589ad51ec4` (`98cfdc24`) when `codex/docker-volume-mount-ux` was created.
- Integrated base reference used for docs sync: `origin/personal` at `4aae26b4a6f81a8cac6b2df8c80b1e95392d7645` (`4aae26b4`) after `git fetch origin --prune` on 2026-05-19. Delivery integrated the 14 new tracked-base commits by merging `origin/personal` into the ticket branch.
- Post-integration verification reference: merge commit `711994560fe0ce3297ea01521e2c7d8a0b633181` (`71199456`) plus `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/delivery-integration-checks.log`.

## Why Docs Were Updated

- Summary: The public Docker launcher now exposes a durable shared-workspace storage model: existing named volumes remain private server state, while new host bind mounts provide a node-specific workspace and a cross-node shared folder. The final integrated state required long-lived docs and Settings guidance to describe the new commands, one-time apply/recreate workflow, default temp workspace change, and residual Linux ownership risk.
- Why this should live in long-lived project docs: This is user-facing Docker behavior, not an internal ticket detail. Users and future maintainers need the storage contract, host/container path mapping, and safe adoption path documented outside the ticket artifacts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `README.md` | Monorepo public Docker entry point for no-clone users. | Updated | Documents named volumes unchanged, shared workspace host root, `workspace paths`, `storage`, `workspace apply --all`, temp workspace change, and Linux root-owned file warning. |
| `autobyteus-server-ts/README.md` | Server package Docker quick-start summary. | Updated | Documents launcher-managed named volumes, host-visible workspaces, inspection/apply commands, temp workspace change, and Linux root-owned file warning. |
| `autobyteus-server-ts/docker/README.md` | Canonical Docker guide for public launcher and source-helper behavior. | Updated | Documents shared workspace model, management command catalog, persistence details, apply/recreate behavior, and residual Linux ownership note. |
| `autobyteus-web/docs/settings.md` | Durable docs for Settings -> Nodes Docker Guide behavior. | Updated | Promotes the new command catalog and private-data versus host-visible workspace mental model into Settings documentation. |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Server runtime config overview mentions app-data/temp workspace ownership. | No change | Still accurate: `AppConfig` owns temp workspace resolution; Docker launcher changes the effective env value. Canonical Docker docs carry the launcher-specific behavior. |
| `autobyteus-server-ts/docs/README.md` | Server docs inventory. | No change | Existing index remains accurate; no new server feature doc was needed because the canonical Docker guide already exists. |
| `autobyteus-web/README.md` | Web app contributor README. | No change | Docker node storage UX is documented in Settings docs and public Docker docs rather than generic web setup. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | User-facing Docker quick-start | Added/retained launcher shared workspace root, container path mapping, inspection/apply commands, old temp workspace preservation note, and Linux root-owned bind-file warning. | Root README is the first no-clone Docker entry point. |
| `autobyteus-server-ts/README.md` | Server Docker quick-start | Added/retained named-volume/private-state summary, host-visible workspace mapping, apply workflow, temp workspace change, and Linux ownership warning. | Server README must match the published image launcher behavior. |
| `autobyteus-server-ts/docker/README.md` | Canonical Docker guide | Added/retained full management command catalog, data/persistence tables, shared workspace host paths, apply/recreate semantics, and residual risk note. | This is the long-lived detailed Docker operating guide. |
| `autobyteus-web/docs/settings.md` | Settings documentation | Added `workspace paths`, `workspace apply --all`, and `storage` to the Docker Guide command summary and documented the named-volume versus bind-mounted workspace mental model. | Prevents Settings documentation from lagging the new UI command cards. |
| `tickets/done/docker-volume-mount-ux/release-notes.md` | Ticket release notes | Created concise release notes for the user-facing Docker workspace feature. | Supports later release/publication work if requested after verification. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Named-volume preservation | `<node>-data`, `<node>-root-home`, and `<node>-workspace` remain unchanged; `/home/autobyteus/data` stays private app/server state. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` |
| Host-visible workspace model | Each node has `/home/autobyteus/workspace` backed by a node-specific host folder; all managed nodes share `/home/autobyteus/shared`. | `requirements.md`, `design-spec.md`, `api-e2e-report.md` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |
| Safe adoption for existing containers | Adding bind mounts requires recreate, but `autobyteus-docker workspace apply --all` preserves named volumes and host folders. | `requirements.md`, `implementation-handoff.md`, `api-e2e-report.md` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |
| Default temp workspace change | New/apply managed containers use `AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace`; old `/home/autobyteus/data/temp_workspace` content remains preserved. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` |
| Linux bind-file ownership risk | The current Docker image runs the server as root, so host files written through bind mounts may be root-owned on Linux. | `requirements.md`, `design-spec.md`, `review-report.md`, `api-e2e-report.md` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Default launcher temp workspace implicitly under `/home/autobyteus/data/temp_workspace` for managed Docker containers | `AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace` for new/apply public-launcher containers; old data remains preserved | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` |
| Manual raw Docker bind-mount advice as the practical default for host-visible files | Launcher-owned `workspace paths`, `workspace apply`, and `storage` commands | `README.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |
| Ambiguous mental model that user files and private app/server data should share `/home/autobyteus/data` | Separate private server state (`/home/autobyteus/data`, `/root`) from user workspace (`/home/autobyteus/workspace`, `/home/autobyteus/shared`) | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A — long-lived docs and ticket release notes were updated.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against the latest-base integrated branch. Repository finalization, ticket archival, pushing, target-branch merge, release/publication/deployment, and cleanup remain on hold until explicit user verification/finalization instruction.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
