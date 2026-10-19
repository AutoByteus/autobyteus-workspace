# Docker Usage Investigation — User Decision Brief

Package: fix-legacy-docker-workspace-builds; evidence rounds SR-003/004, updated at SR-005/006; 2026-10-12.
Current scope status: User approved retiring both legacy recipes/personal-test wiring. R2/D2 are authoritative; earlier sections describe the historical investigation/approval hold, not a current blocker.
User clarification: “First, check whether what they are, what are they used for. I remember we have a personal Docker Compose personal and the remote and what they are and what are they used for.” No implementation handoff has occurred; no product files changed.

## What Each Path Does
| Path | Purpose / caller | Actual runtime |
| --- | --- | --- |
| docker/compose.personal-test.yml + scripts/personal-docker.sh | Source-built local developer/testing harness. Starts one main-allinone and optional scaled remote-server services; assigns reusable collision-safe localhost ports; seeds test Agents/Teams by default. | Main image supplies backend on 8000, Nuxt development web on 3000, Chrome/VNC/noVNC/debug services; main app data and browser profile are persisted. |
| docker/Dockerfile.allinone | Main image for that personal test Compose stack. Not the public Docker release recipe. | Server + full web source/dev dependencies; inherited Chrome/VNC base supervisor starts backend then GraphQL codegen and Nuxt dev. |
| docker/Dockerfile.remote-server | Optional extra lightweight backend node(s) in the same personal test Compose network. Originally used for node sync/multi-node testing. Not the removed remote AutoByteus LLM provider. | Server + generated mobile web assets; no Nuxt dev server or Chrome/VNC. Compose uses tmpfs for app data (ephemeral) and a persistent log volume; no host ports are published for this service. |
| autobyteus-server-ts/docker/Dockerfile.monorepo + associated docker-compose.yml + public autobyteus-docker launcher | Released/server-node workflow: images published as autobyteus/autobyteus-server:{version,latest,beta}; launcher creates separately named nodes and exposes backend/browser ports for desktop Nodes → Add Remote Node. | Backend + mobile assets + browser environment and packaged Codex/Claude/AGY/Grok CLIs; private persistent node volumes and host-backed workspace/shared folders. No separate Nuxt development web service on 3000. |

## What Is In Use On This Machine
Read-only Docker inventory (`docker ps -a --format ...`) shows seven running autobyteus-server-0..6 containers, all with image reference autobyteus/autobyteus-server:beta. Selected label inspection (no environment/credentials) confirms com.autobyteus.launcher=server-docker for every one. No personal-allinone or personal-remote-server container appears, including stopped containers. No personal/allinone/remote-server image tags are currently listed. No docker/.runtime saved-stack folder is present in the shared checkout. These establish current local non-use, not proof nobody uses the harness elsewhere or in the past.
No containers were started, stopped, queried through application APIs, or modified for this investigation. No model calls, user data reads or credential inspection.

## Historical Versus Current Purpose
Original personal-branch-docker-setup requirements and aggregated validation report (2026-02-26) describe allinone web/server/gateway, automatic fixture seeding and automatic sync to one remote. Current wrapper has only Compose start + fixture seeding; gateway and automatic sync are no longer in the current path. Git history includes sync decommission (2026-05-20) and external messaging removal (2026-09-24). Do not present historical gateway/sync as current supported behavior.

## References Consulted
- docker/compose.personal-test.yml (full), docker/README.md, Dockerfile.allinone, Dockerfile.remote-server and startup/supervisor wrappers.
- scripts/personal-docker.sh (up dispatch and CLI); scripts/seed-personal-test-fixtures.py (header/default fixtures/main actions).
- README.md “All-in-one Docker startup (personal branch)” and current published Docker launcher quick start.
- autobyteus-server-ts/docker/{Dockerfile.monorepo,docker-compose.yml,README.md}; .github/workflows/release-server-docker.yml.
- tickets/in-progress/personal-branch-docker-setup/{requirements.md,aggregated-validation.md}.
- `git grep -n -E 'Dockerfile\\.(allinone|remote-server)|compose.personal-test.yml|personal-docker.sh' -- ':!tickets' ':!pnpm-lock.yaml'`: references confined to that wrapper/Compose/docs and source checks; no application runtime or release dependency on either legacy recipe.
- `git log -8 --date=short --format='%h %ad %s' -- docker/Dockerfile.allinone docker/Dockerfile.remote-server scripts/personal-docker.sh`.
- Read-only live Docker inventory, image tag inventory and selected labels described above.

## Recommendation And User Decision
Keep the released monorepo image and public launcher: those are demonstrably in current local use. If the user no longer uses personal-docker.sh's source-built web-in-Docker test harness, recommend retiring that harness and both associated Dockerfiles together rather than repairing two unused packaging paths. This does not remove remote Docker node support: the monorepo image/launcher retain it. Retirement should include its Compose/wrapper/documentation/test references, not a dangling Dockerfile-only deletion, and should not touch any containers, existing data volumes or the unrelated seed script without reference investigation.
If this developer test harness is still valuable, retain and repair both under the already authored R1/D1 proposal. Local non-use alone does not authorize deletion. User must decide; no removal approval is recorded.

## Status / Next Action
Needs user scope decision, directly in this conversation. Requirements R1 had been approved within original repair direction; current forward work is held until the user confirms keeping versus retiring the developer harness. No implementation message sent, no rule-based forwarding while the approval/scope conversation remains open.

## SR-004 — Build Error And Monorepo Sufficiency Evaluation
Latest user request: evaluate the actual error and whether a separate remote-server/source-build workflow is needed; user says they believe monorepo is already enough. This is direction/preferences for evaluation, not yet an explicit deletion approval.

### Which Error, Which Build
The documented failure is ERR_PNPM_WORKSPACE_PKG_NOT_FOUND during pnpm install, in docker/Dockerfile.remote-server and docker/Dockerfile.allinone. Both files contain zero references to autobyteus-agent-presentation-contracts or autobyteus-collaboration-stream-contracts although server production dependencies require both as workspace:*. The monorepo file includes their manifest/source/build/runtime materialization (13 textual directory references each). BAS-001 (prior API/E2E report, 2026-10-12) and UD-002 (AGPL handoff, 2026-10-08) independently report the same baseline defect. It was not introduced by licensing or remote-LLM-provider removal. The testing task attempted the old remote-server recipe, encountered the baseline break, and used a retained validation-only fix to continue its own unrelated validation. No new Docker build was executed for this evaluation; current comparison is source-backed and historical failures remain attributed to their actual owners.

### Monorepo Also Supports Local Source Builds
Read autobyteus-server-ts/docker/docker-start.sh, build.sh and associated docker-compose.yml. docker-start.sh up --build-local invokes build.sh, whose DOCKERFILE_PATH is Dockerfile.monorepo and context is the repository root. The default local build loads a matching single architecture. Thus local source builds do NOT require either broken legacy Dockerfile. --pull-remote instead consumes the published release image under a local Compose alias. Release workflow's default and zh build-push steps both explicitly use autobyteus-server-ts/docker/Dockerfile.monorepo for linux/amd64,linux/arm64.

### Do We Need A Separate Remote-Server Recipe?
Not for current desktop remote-node operation or multiple Docker nodes: the public launcher creates as many monorepo-backed nodes as needed, and seven such nodes are already present locally. The extra recipe's distinct value is a lighter no-browser backend in the legacy developer harness, originally for automatic sync testing; sync automation was removed (git show b2ba00a23: personal wrapper lost 47 lines). There is no user need for that lighter testing variant established in this conversation. A monorepo container already IS a backend node usable remotely; “remote” is a connection/deployment role, not a reason to require a separate image implementation.

### Recommended Direction
Consolidate supported server packaging on Dockerfile.monorepo. Keep its pipeline, current public launcher, server docker-compose.yml, docker-start.sh and build.sh (both local source build and published-image use). Recommend retiring the legacy personal developer stack and its two recipes together, with reference cleanup, rather than investing in the held repair proposal. Preserve root pnpm dev/isolated desktop workflows for frontend development; monorepo does not itself provide the old separate Nuxt dev web server. No claim that nobody else uses the old harness; known local/user evidence supports asking for deliberate retirement approval.

Proposed retirement scope for user approval: docker/Dockerfile.remote-server, docker/Dockerfile.allinone, docker/compose.personal-test.yml, scripts/personal-docker.sh, their owned startup/supervisor files if reference-free, and affected docs/source-check references. Do not delete generic fixture seeding or historical evidence unless separately proven unreferenced/in-scope. Do not stop/delete current containers/images/volumes/user data. Removal design/validation must explicitly preserve monorepo source-build and release pathways. No deletion has occurred.

## Approved Outcome (SR-005/006)
User explicitly chose removal on 2026-10-12. Current requirements R2 and design D2 retire the dedicated source closure and preserve monorepo releases/local-source helpers/remote-node launcher, licenses and all existing data. Prior repair and approval-hold text above is historical evidence. No implementation or repository finalization is claimed by this brief.
