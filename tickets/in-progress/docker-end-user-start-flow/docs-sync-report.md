# Docs Sync Report

## Scope

- Ticket: `docker-end-user-start-flow`
- Trigger: API/E2E validation round 3 passed for the reviewed CLI wording clarification on 2026-05-12; delivery restarted after receiving the updated cumulative artifact package from `api_e2e_engineer`.
- Bootstrap base reference: `origin/personal @ be56cab9b41b850c92690d79a8dfa70c52c369a0` (recorded worktree creation point in `investigation-notes.md`).
- Integrated base reference used for docs sync: `origin/personal @ be56cab9b41b850c92690d79a8dfa70c52c369a0`.
- Post-integration verification reference: Delivery refresh on 2026-05-12 ran `git fetch origin personal`, confirmed `HEAD == origin/personal == be56cab9b41b850c92690d79a8dfa70c52c369a0` and `git rev-list --left-right --count HEAD...origin/personal = 0 0`; no base commits were integrated after validation. Delivery-owned docs/artifact edits then passed full-candidate `git diff --check` including untracked files via temporary intent-to-add.

## Why Docs Were Updated

- Summary: The final implementation adds no-clone public Docker launchers for macOS/Linux and Windows PowerShell, surfaces copyable launcher commands in Settings -> Nodes before Add Remote Node, keeps Docker lifecycle outside the app, makes the launcher the primary published-server startup path in project documentation, and clarifies that `start --new` creates a new isolated Docker node while plain `start` remains the idempotent default-node path.
- Why this should live in long-lived project docs: The change is user-facing and operator-facing. Packaged app users need a durable no-clone Docker start path, maintainers need to know where the command catalog and public launcher scripts live, and future release/finalization work must understand that raw GitHub script URLs only become reachable after the files land on the referenced `personal` branch.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `README.md` | Root user-facing Docker startup guidance already documented the published server image. | Updated | Now makes the public launcher the primary no-clone path, shows macOS/Linux and Windows commands, describes launcher-printed URLs, uses `Start a new isolated Docker node` wording for `start --new`, and separates the source helper for cloned-repo users. |
| `autobyteus-server-ts/README.md` | Server README previously presented direct `docker run` as the recommended no-clone user path. | Updated | Now uses the public launcher, includes Windows PowerShell and new-node/URL rediscovery commands, and links to the Docker README for advanced direct `docker run` fallback. |
| `autobyteus-server-ts/docker/README.md` | Canonical Docker image/operator documentation. | Updated | Now distinguishes no-clone public launcher, source-checkout developer helper, advanced direct Docker fallback, launcher state locations, launcher/source-helper management commands, per-node volumes, and clarified `start --new` new-node wording. |
| `autobyteus-web/docs/settings.md` | Canonical frontend Settings page documentation. | Updated | Documents the new `DockerNodeStartGuideCard`, command catalog ownership in `utils/dockerNodeLauncherCommands.ts`, public script paths, Add Remote Node handoff, and that `start --new` creates a new isolated node with automatic naming/ports. |
| `autobyteus-web/README.md` | Frontend README has setup/build guidance, not durable Settings/Nodes behavior. | No change | The Settings behavior belongs in `autobyteus-web/docs/settings.md`. |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` and server module docs | Reviewed for Docker/user-startup overlap. | No change | These docs describe backend architecture/modules rather than operator Docker startup. Docker startup is documented in root/server Docker docs. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | User/operator startup guidance | Replaced the old primary no-clone direct `docker run` block with public launcher commands and source-helper separation; public prose now describes `start --new` as starting a new isolated Docker node. | Keeps the root quick start aligned with packaged-app user behavior, Settings -> Nodes guidance, and the clarified CLI semantics. |
| `autobyteus-server-ts/README.md` | Server README operator guidance | Replaced stale recommended direct `docker run` guidance with public launcher commands and linked advanced fallback details. | Prevents the server README from preserving obsolete no-clone guidance after the launcher becomes the primary path. |
| `autobyteus-server-ts/docker/README.md` | Docker runtime documentation | Documented public launcher quick start, state locations, command vocabulary, source-helper boundary, direct Docker fallback, endpoints, volume naming, and `start --new` new-node semantics. | Promotes durable launcher/source-helper separation and the new end-user Docker lifecycle contract. |
| `autobyteus-web/docs/settings.md` | Frontend Settings documentation | Added the Start Docker node guide card under Nodes and documented command-catalog ownership and app-vs-launcher responsibility split. | Gives future frontend maintainers a canonical reference for the Settings -> Nodes Docker guidance. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Public no-clone launcher | Packaged users should use raw GitHub public launcher commands instead of cloning the repo or running fixed-port Docker commands. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` |
| App/launcher ownership boundary | Settings -> Nodes shows copyable commands and then uses Add Remote Node; the external launcher owns Docker lifecycle and state. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `browser-ui-add-node.log` | `autobyteus-web/docs/settings.md`, `README.md`, `autobyteus-server-ts/docker/README.md` |
| Command catalog ownership | Raw GitHub owner/repo/ref, public script paths, and rendered command variants are owned by `autobyteus-web/utils/dockerNodeLauncherCommands.ts`, not duplicated literals in the component template. | `design-spec.md`, `implementation-handoff.md`, `static-unit.log`, `cli-wording-static.log` | `autobyteus-web/docs/settings.md` |
| Clarified multi-node behavior | Plain `start` is idempotent for the default node; `start --new` creates a new isolated friendly node with automatic naming and non-conflicting ports. Public implementation surfaces avoid the superseded “Start another Docker node” title. | `requirements.md`, `review-report.md`, `api-e2e-validation-report.md`, `docker-lifecycle-round2.log`, `cli-wording-static.log`, `browser-ui-wording.log` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |
| Publication dependency for raw URLs | Raw script URLs target the `personal` ref and are expected to 404 before repository finalization pushes these new files to `origin/personal`; they must be rechecked after finalization. | `api-e2e-validation-report.md`, `raw-ref-powershell-residual.log`, `delivery-raw-url-recheck.log` | `release-deployment-report.md`, `handoff-summary.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Fixed-port direct `docker run` as the primary no-clone user path | Public launcher commands with state outside the source tree and automatic port selection | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` |
| Source-checkout `docker-start.sh` helper as the implied path for end users | Source helper remains for cloned-repo/developer use; no-clone users use `scripts/public/docker/autobyteus-docker.*` | `autobyteus-server-ts/docker/README.md`, `README.md`, `autobyteus-server-ts/README.md` |
| Public exposure of developer Compose project terminology for multiple instances | Friendly node names plus `start --new` automatic naming/ports | `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md` |
| Superseded public title `Start another Docker node` | `Start new Docker node` / `Start a new Docker node with automatic name and ports` while preserving command `start --new` | `autobyteus-web/docs/settings.md`, public launcher help, `api-e2e-validation-report.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete for the current integrated, reviewed, and validated round-3 state. Repository finalization, ticket archival, raw GitHub URL recheck after push, release/publication/deployment decisions, and cleanup remain on hold until explicit user verification/completion is received.
