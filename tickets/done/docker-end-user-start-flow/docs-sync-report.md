# Docs Sync Report

## Scope

- Ticket: `docker-end-user-start-flow`
- Trigger: API/E2E validation round 5 passed after the independent code-review pass and architecture-approved `update` vs `start` ownership split on 2026-05-12; delivery restarted from the updated cumulative artifact package.
- Bootstrap base reference: `origin/personal @ be56cab9b41b850c92690d79a8dfa70c52c369a0` (recorded worktree creation point in `investigation-notes.md`).
- Integrated base reference used for docs sync: `origin/personal @ d066ac32d77e8caf019d41c083eed04d95b17bdd`.
- Post-integration verification reference: Delivery created local checkpoint commit `517a0bce` to protect the reviewed/validated candidate, merged latest `origin/personal` into the ticket branch, producing integrated ticket HEAD `ec09019a9d21c3013f5bdfd0c43f69d4f13c85d5`, then reran post-integration checks: Bash syntax, ShellCheck, targeted Vitest (`3` files / `11` tests), localization/web guards, and `git diff --check`; all passed. Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/done/docker-end-user-start-flow/validation-evidence/round-5/delivery-post-integration-check.log`.

## Why Docs Were Updated

- Summary: The final implementation adds no-clone public Docker launchers, changes the primary UX to install once and then run local `autobyteus-docker ...` commands, surfaces those commands in Settings -> Nodes before Add Remote Node, and documents the approved ownership split: `install`/`update` only refresh the local launcher, while `start` owns Docker image check/pull and server container start-or-refresh.
- Why this should live in long-lived project docs: The change is user-facing and operator-facing. Packaged app users need durable install-once commands, maintainers need to know where the command catalog and public launcher scripts live, and future release/finalization work must understand that raw GitHub script URLs only become reachable after the files land on the referenced `personal` branch.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `README.md` | Root user-facing Docker startup guidance already documented the published server image. | Updated | Makes the public launcher the primary no-clone path, shows macOS/Linux and Windows install commands, switches repeated lifecycle examples to local `autobyteus-docker ...`, documents `start` image/container refresh ownership, and separates the source helper for cloned-repo users. |
| `autobyteus-server-ts/README.md` | Server README previously presented direct `docker run` as the recommended no-clone user path. | Updated | Mirrors install-once launcher guidance, direct local commands, `start` refresh semantics, and links to Docker README for advanced direct `docker run` fallback. |
| `autobyteus-server-ts/docker/README.md` | Canonical Docker image/operator documentation. | Updated | Documents no-clone install-once flow, state locations, public launcher commands, source-checkout developer helper, advanced direct Docker fallback, per-node volumes, and the `update` vs `start` ownership split. |
| `autobyteus-web/docs/settings.md` | Canonical frontend Settings page documentation. | Updated | Documents `DockerNodeStartGuideCard`, install/direct command phases, command catalog ownership, Add Remote Node handoff, and `start`/`start --new` semantics. |
| `autobyteus-web/README.md` | Frontend README has setup/build guidance, not durable Settings/Nodes behavior. | No change | The Settings behavior belongs in `autobyteus-web/docs/settings.md`. |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` and server module docs | Reviewed for Docker/user-startup overlap. | No change | These docs describe backend architecture/modules rather than operator Docker startup. Docker startup is documented in root/server Docker docs. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | User/operator startup guidance | Replaced repeated raw lifecycle commands with install-once commands plus direct `autobyteus-docker start`, `start --new`, `urls`, and `stop` examples; documented that `start` checks/pulls the image and only recreates when image/config changed or the container is missing. | Keeps the root quick start aligned with packaged-app user behavior, Settings -> Nodes guidance, and the approved ownership split. |
| `autobyteus-server-ts/README.md` | Server README operator guidance | Replaced stale direct `docker run` primary guidance with public launcher install commands and direct local lifecycle commands. | Prevents the server README from preserving obsolete no-clone guidance after the launcher becomes the primary path. |
| `autobyteus-server-ts/docker/README.md` | Docker runtime documentation | Documented public launcher quick start, `install`/`update`, `start`, `start --new`, lifecycle commands, state locations, source-helper boundary, direct Docker fallback, endpoints, and volume naming. | Promotes durable launcher/source-helper separation and the new end-user Docker lifecycle contract. |
| `autobyteus-web/docs/settings.md` | Frontend Settings documentation | Added the Start Docker node guide under Nodes and documented install/direct command phases plus command-catalog ownership and app-vs-launcher responsibility split. | Gives future frontend maintainers a canonical reference for the Settings -> Nodes Docker guidance. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Public install-once launcher | Packaged users install the launcher once from raw GitHub, then run direct local `autobyteus-docker ...` commands instead of repeatedly piping raw lifecycle commands. | `requirements.md`, `design-impact-rework-install-once-cli.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |
| `update` vs `start` ownership split | `install`/`update` only refresh the local launcher and must not touch Docker runtime state; `start` checks/pulls the configured image and starts/restarts/recreates the server container only as needed. | `design-impact-rework-install-once-cli.md`, `implementation-handoff.md`, `review-report.md`, `api-e2e-validation-report.md`, `install-update-isolation.log`, `real-docker-lifecycle-update-start-split.log` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |
| App/launcher ownership boundary | Settings -> Nodes shows copyable commands and then uses Add Remote Node; the external launcher owns Docker lifecycle and state. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `browser-ui-add-remote-node.log` | `autobyteus-web/docs/settings.md`, `README.md`, `autobyteus-server-ts/docker/README.md` |
| Command catalog ownership | Raw GitHub owner/repo/ref, public script paths, install commands, and direct command variants are owned by `autobyteus-web/utils/dockerNodeLauncherCommands.ts`, not duplicated literals in the component template. | `design-spec.md`, `implementation-handoff.md`, `static-unit.log` | `autobyteus-web/docs/settings.md` |
| Clarified multi-node behavior | Plain `start` is idempotent for the default node; `start --new` creates a new isolated friendly node with automatic naming and non-conflicting ports. Public implementation surfaces avoid the superseded “Start another Docker node” title. | `requirements.md`, `review-report.md`, `api-e2e-validation-report.md`, `real-docker-lifecycle-update-start-split.log`, `static-unit.log`, `browser-ui-add-remote-node.log` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |
| Publication dependency for raw URLs | Raw script URLs target the `personal` ref and are expected to 404 before repository finalization pushes these new files to `origin/personal`; they must be rechecked after finalization. | `api-e2e-validation-report.md`, `raw-ref-powershell-residual.log`, `delivery-integrated-raw-url-recheck.log` | `release-deployment-report.md`, `handoff-summary.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Fixed-port direct `docker run` as the primary no-clone user path | Public install-once launcher commands with state outside the source tree and automatic port selection | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` |
| Repeated raw `curl | bash ... start` lifecycle commands as the primary UX | `install` once, then direct local `autobyteus-docker ...` commands | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |
| Source-checkout `docker-start.sh` helper as the implied path for end users | Source helper remains for cloned-repo/developer use; no-clone users use `scripts/public/docker/autobyteus-docker.*` | `autobyteus-server-ts/docker/README.md`, `README.md`, `autobyteus-server-ts/README.md` |
| Public exposure of developer Compose project terminology for multiple instances | Friendly node names plus `start --new` automatic naming/ports | `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |
| Superseded public title `Start another Docker node` | `Start new Docker node` / `Start a new Docker node with automatic name and ports` while preserving command `start --new` | `autobyteus-web/docs/settings.md`, public launcher help, `api-e2e-validation-report.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete for the current integrated, reviewed, and validated round-5 state. Repository finalization, ticket archival, raw GitHub URL recheck after push, release/publication/deployment decisions, and cleanup remain on hold until explicit user verification/completion is received.
