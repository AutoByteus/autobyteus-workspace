# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Requirements approved by user and design produced for architecture review.
- Investigation Goal: Diagnose the 401 shown when Electron opens a `mobile-safe` Docker container URL; define the approved claim-backed Electron owner trust approach; include the discovered Docker `/mobile` asset packaging failure.
- Scope Classification: Medium.
- Scope Classification Rationale: The issue crosses Docker launcher profile startup, server remote-access policy, Electron node window routing, Phone Access owner claims, and Docker image packaging for mobile assets.
- Scope Summary: User ran `autobyteus-docker new-container --profile mobile-safe`, configured the resulting localhost port in Electron, clicked Open, and saw HTTP 401 while loading agent definitions. Android QR scan also failed because `/mobile` static assets were absent from the running Docker image. User approved adding a claim-backed owner trust path for Electron and asked to kick off the ticket.
- Primary Questions Resolved:
  - Does `mobile-safe` require a pairing/claim token before API access? Yes for Phone Access owner routes, and a paired mobile bearer credential for normal protected GraphQL/REST access from non-loopback peers.
  - What exact credential/header/cookie does Electron need to send? The node-admin claim uses `x-autobyteus-node-admin-claim-id` and `x-autobyteus-node-admin-claim` but only for Phone Access owner REST routes; it is not accepted by GraphQL agent-definition queries.
  - Is the server actually started? Yes; `/rest/health` returns 200 on the user's port.

## Request Context

User provided screenshot showing Autobyteus Electron app with node URL `http://localhost:58645`, node chips `REMOTE`, `ready`, and `Unpaired`, plus `Pair local browser` and `Open` buttons. On opening, the app shell displays `Error loading agent definitions: Response not successful: Received status code 401`.

## Environment Discovery / Bootstrap Context

- Project Type: Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-safe-container-401`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/mobile-safe-container-401`.
- Current Branch: `codex/mobile-safe-container-401`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-safe-container-401`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin --prune` completed successfully before creating worktree.
- Task Branch: `codex/mobile-safe-container-401`.
- Expected Base Branch: `origin/personal`.
- Expected Finalization Target: likely `personal` unless user directs otherwise.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Do not weaken remote-access auth. The observed 401 is a correct protection response for non-loopback GraphQL without a paired mobile credential. The UX/packaging issues are separate from auth correctness.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-23 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repository state | Main checkout on `personal`, origin default `origin/personal` | No |
| 2026-05-23 | Command | `git fetch origin --prune`; `git worktree add -b codex/mobile-safe-container-401 ... origin/personal` | Create isolated task worktree | Dedicated worktree created at `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-safe-container-401` | No |
| 2026-05-23 | Data | User screenshot/context image | Identify observable behavior | Node is `REMOTE ready` but `Unpaired`; app API receives HTTP 401 loading agent definitions | No |
| 2026-05-23 | Code/Docs | `README.md`, `docs/android_mobile_access.md`, `autobyteus-web/docs/remote_access.md` | Check intended mobile-safe Docker flow | Docs explicitly say to create `mobile-safe`, save Backend URL, claim ID, and claim secret, add remote node, open Docker node window, then paste node-admin claim in Phone Setup before creating QR | No |
| 2026-05-23 | Code | `scripts/public/docker/autobyteus-docker.sh` | Check launcher behavior | `mobile-safe` prints Backend plus node-admin claim when created; `admin-claim show --name <node>` prints it later. It sets `AUTOBYTEUS_NODE_PROFILE=mobile-safe`, claim ID, claim hash, and scope in container env | No |
| 2026-05-23 | Command | `docker ps --format ...` | Identify live container for screenshot port | `autobyteus-server-1` maps `127.0.0.1:58645->8000` and is `mobile-safe`; `autobyteus-server-0` is standard on port 8001 | No |
| 2026-05-23 | Command | `docker inspect autobyteus-server-1 --format '{{json .Config.Env}}'` | Confirm profile and claim env | Env includes `AUTOBYTEUS_NODE_PROFILE=mobile-safe`, `AUTOBYTEUS_NODE_ADMIN_CLAIM_ID=nac_g1yM4S4733YedCBJmIjhncIn`, `AUTOBYTEUS_NODE_ADMIN_CLAIM_HASH=...`, scope `phone-access-management`; secret is not in the container | No |
| 2026-05-23 | Probe | `curl -i http://localhost:58645/rest/health` | Confirm server startup | `HTTP/1.1 200 OK` with `{"status":"ok","message":"Server is running"}` | No |
| 2026-05-23 | Probe | `curl -i http://localhost:58645/rest/remote-access/status` | Check public remote-access status | `HTTP/1.1 200 OK`; `phoneAccessEnabled:false`, `pairingAvailable:false`, server instance ID present | No |
| 2026-05-23 | Probe | `curl -i http://localhost:58645/` and `/api/agent-definitions` | Reproduce uncredentialed protected access | Both return `401` with `REMOTE_ACCESS_AUTH_REQUIRED` / `Remote Access credential is required.` | No |
| 2026-05-23 | Probe | `curl -i -X POST http://localhost:58645/graphql ...` without auth | Reproduce GraphQL behavior matching screenshot | Server logs and probe show GraphQL POST returns `401` | No |
| 2026-05-23 | Code | `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | Identify auth policy | GraphQL POST is classified `LOCAL_OR_MOBILE`; loopback peers pass, otherwise it requires a mobile bearer credential. Phone Access owner routes accept loopback or node-admin claim headers | No |
| 2026-05-23 | Code | `autobyteus-server-ts/src/remote-access/services/remote-access-auth-service.ts` | Identify normal protected API auth | Non-loopback GraphQL/REST requires `Authorization: Bearer <mobile credential>`. Missing credential returns `REMOTE_ACCESS_AUTH_REQUIRED` | No |
| 2026-05-23 | Code | `autobyteus-server-ts/src/remote-access/services/remote-node-admin-service.ts`, `domain/models.ts` | Identify claim auth scope | Node-admin claim is validated through `x-autobyteus-node-admin-claim-id` and `x-autobyteus-node-admin-claim`, scope `phone-access-management`; it produces auth mode `node_admin_claim` | No |
| 2026-05-23 | Probe | `curl -i /rest/remote-access/settings` with node-admin claim headers | Verify claim function | Claim-backed owner route returns `HTTP/1.1 200 OK` and current Phone Access settings | No |
| 2026-05-23 | Probe | `curl -i -X POST /graphql` with node-admin claim headers | Verify claim does not authorize agent definitions | GraphQL still returns `401 REMOTE_ACCESS_AUTH_REQUIRED`; node-admin claim is not a general desktop/app credential | No |
| 2026-05-23 | Probe | `curl -i http://localhost:58645/mobile` | Check mobile shell availability | Returns `404` with `Mobile web assets are not installed.` This is a separate packaging issue for Android/mobile shell use | Yes, if implementing mobile-safe end-to-end fix |
| 2026-05-23 | Code | `autobyteus-server-ts/src/api/static/mobile-web.ts`, `autobyteus-server-ts/docker/Dockerfile.monorepo`, `docker/Dockerfile.remote-server` | Investigate missing `/mobile` assets | Server looks for `mobile-web`, `public/mobile`, or web dist candidates under app root; Docker runtime image copies server dist but not `mobile-web` assets | Yes, if implementing packaging fix |
| 2026-05-23 | Command | `docker exec autobyteus-server-1 ... ls mobile candidate paths` | Confirm image contents | `/app/autobyteus-server-ts/mobile-web`, `/app/autobyteus-server-ts/public/mobile`, and `/app/autobyteus-web/dist/public` are absent | Yes, if implementing packaging fix |
| 2026-05-23 | Discussion | User approval in chat: approved claim-backed Electron trust approach and asked to kick off ticket | Confirm requirements basis | Scope includes Electron owner trust after node-admin claim plus durable Docker `/mobile` asset packaging fix | No |
| 2026-05-23 | Probe/Setup | `pnpm -C autobyteus-web build:mobile-web`; `docker cp autobyteus-web/dist-mobile/public/. autobyteus-server-1:/app/autobyteus-server-ts/mobile-web/`; `curl -i http://localhost:58645/mobile` | Temporary local workaround and proof of root cause | After copying built assets into running container, `/mobile` returned `200 OK` with HTML; confirms image packaging, not phone/network, caused `Mobile web assets are not installed` | Durable Dockerfile/build fix required |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Electron node manager `Open` action for a configured remote Docker node URL.
- Current execution flow:
  1. User starts `mobile-safe` Docker container.
  2. Launcher maps container backend to host loopback, here `http://localhost:58645`.
  3. Electron records that backend as a remote node and opens a node-bound local renderer window.
  4. Window defaults to `/agents` and the Agents page queries GraphQL `agentDefinitions` against `http://localhost:58645/graphql`.
  5. Server sees the request as a non-loopback peer from inside Docker's networking boundary and classifies GraphQL POST as `LOCAL_OR_MOBILE`.
  6. No mobile bearer credential is present, so server returns `401 REMOTE_ACCESS_AUTH_REQUIRED`.
- Ownership or boundary observations:
  - Server remote-access policy correctly rejects protected GraphQL from non-loopback unauthenticated peers.
  - Node-admin claim ownership is restricted to Phone Access management routes and should not be used as a broad GraphQL credential.
  - Electron remote node open UX currently lands on Agents, which is not the intended first setup surface for a mobile-safe Docker node.
  - Published Docker image does not include mobile static assets, so the Android `/mobile` shell would fail independently with 404.
- Current behavior summary: The server is started and reachable. The screenshot is an authorization/pairing/setup state, not a server-start failure.

## Design Health Assessment Evidence

- Change posture: Behavior change plus bug fix.
- Candidate root cause classification:
  - Main screenshot 401: Boundary Or Ownership Issue. Backend route policy is correct to reject unauthenticated remote traffic, but the product lacks a claim-backed Electron owner trust boundary for Docker nodes.
  - Android/mobile shell readiness: Local implementation/packaging defect, because docs and route contract expect packaged server Docker to serve `/mobile` but image lacks `mobile-web`.
- Refactor posture evidence summary: Bounded refactor needed. Add an owner-session authority inside the remote-access subsystem instead of broadening loopback trust or reusing mobile credentials. Add Docker packaging fix for mobile assets.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot | Node is `Unpaired`; error is HTTP 401, not connection refused/timeout | The immediate problem is missing authorization/pairing, not server startup | No |
| `/rest/health` probe | 200 OK | Server is running | No |
| `/graphql` probe | 401 without bearer credential | Protected API access is blocked as designed | No |
| Claim-backed `/rest/remote-access/settings` probe | 200 OK with claim headers | Claim works for Phone Access management | No |
| Claim-backed `/graphql` probe | Still 401 | Claim is not general app authorization; telling user to paste claim will not make Agents page load | No |
| `/mobile` probe | 404 assets missing | Separate Docker packaging issue blocks actual Android/mobile shell | Yes if implementing |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Public Docker launcher and `mobile-safe` profile | Generates node-admin claim ID/secret locally, passes only claim hash to container, binds ports to `127.0.0.1` | Correctly keeps secret out of container; user can re-show with `admin-claim show --name autobyteus-server-1` |
| `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | Classifies routes and selects auth mode | GraphQL POST is `LOCAL_OR_MOBILE`; Phone Access owner routes are `PHONE_ACCESS_OWNER` | Backend auth boundary is intentionally narrow; node-admin claim should not authorize all GraphQL |
| `autobyteus-server-ts/src/remote-access/services/remote-access-auth-service.ts` | Loopback-or-mobile bearer authorization | Missing bearer credential returns `REMOTE_ACCESS_AUTH_REQUIRED` | Explains screenshot error |
| `autobyteus-server-ts/src/remote-access/services/remote-node-admin-service.ts` | Node-admin claim validation | Validates claim headers only for owner route callers | Claim is for Phone Setup/Phone Access management |
| `autobyteus-web/stores/phoneAccessStore.ts` | Phone Access UI state and owner request config | Fetches node-admin claim headers from Electron and adds them only to `/remote-access/...` owner calls | User should navigate to Settings -> Nodes -> Phone Setup to register claim |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | Claim input and Phone Access management UI | Has fields for Claim ID and secret in remote node windows | Correct setup surface already exists |
| `autobyteus-web/electron/nodeAdminClaimStore.ts` | Stores node-admin claim in Electron user data | Binds claims to node ID and normalized management base URL, returns claim headers on demand | Claim is local owner-side state |
| `autobyteus-web/electron/main.ts` / `WorkspaceShellWindow` | Opens node-bound renderer window | Always opens generic start URL; remote window defaults to app route `/agents` via Nuxt index redirect | UX can route setup-first for mobile-safe/uncredentialed remote nodes |
| `autobyteus-server-ts/src/api/static/mobile-web.ts` | Serves `/mobile` static assets | Returns 404 if `mobile-web` assets are absent | Docker image must include mobile assets for Android flow |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | Runtime image used by `autobyteus/autobyteus-server:latest` | Does not copy `mobile-web` assets into runtime image | Packaging fix needed for full mobile-safe flow |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-23 | Repro | `docker ps --format 'table ...'` | `autobyteus-server-1` is mobile-safe at `http://localhost:58645` | Port in screenshot maps to live mobile-safe container |
| 2026-05-23 | Probe | `curl -i http://localhost:58645/rest/health` | 200 OK | Server started successfully |
| 2026-05-23 | Probe | `curl -i http://localhost:58645/rest/remote-access/status` | 200 OK; phone disabled and pairing unavailable | Public status route works |
| 2026-05-23 | Repro | `curl -i -X POST http://localhost:58645/graphql --data '{"query":"query { agentDefinitions { id name } }"}'` | 401 `REMOTE_ACCESS_AUTH_REQUIRED` | Matches Electron Agents error |
| 2026-05-23 | Probe | `curl -i /rest/remote-access/settings` with claim headers | 200 OK | Claim is valid and sufficient for Phone Setup management |
| 2026-05-23 | Probe | GraphQL with same claim headers | 401 | Claim does not and should not unlock Agents page |
| 2026-05-23 | Probe | `curl -i http://localhost:58645/mobile` | 404 `Mobile web assets are not installed.` | Separate packaging issue for Android/mobile shell |

## External / Public Source Findings

N/A; all facts came from local repository and live container probes.

## Reproduction / Environment Setup

- User command: `autobyteus-docker new-container --profile mobile-safe`.
- Observed node URL: `http://localhost:58645`.
- Live container: `autobyteus-server-1` with image `autobyteus/autobyteus-server:latest`.
- Useful local commands:
  - `autobyteus-docker status`
  - `autobyteus-docker admin-claim show --name autobyteus-server-1`
  - `curl -i http://localhost:58645/rest/health`
  - `curl -i http://localhost:58645/rest/remote-access/status`

## Findings From Code / Docs / Data / Logs

- The server-side 401 is expected for protected APIs because Docker host-loopback mapping does not make the request peer loopback from the containerized server's perspective.
- The node-admin claim is required for Phone Access owner actions in the Docker node window. It is not a replacement for a mobile bearer credential and is not used by GraphQL agent-definition queries.
- The `Pair local browser` UI is unrelated; it controls whether a remote node may use the local Electron browser bridge.
- The current Electron open flow can be confusing because it defaults to Agents, which immediately triggers protected GraphQL and surfaces 401 before the user reaches Phone Setup.
- The current `autobyteus/autobyteus-server:latest` container inspected locally lacks the mobile web bundle, making `/mobile` return 404. A temporary build/copy into `/app/autobyteus-server-ts/mobile-web` made `/mobile` return 200, so the durable fix belongs in image packaging.
- User approved a claim-backed Electron owner trust path: Electron should become owner-trusted for a specific Docker node after proving the node-admin claim; phone/mobile access must remain separate.

## Constraints / Dependencies / Compatibility Facts

- `mobile-safe` exists to avoid broad trust and reduce blast radius. Do not solve by broadly allowing Docker gateway peers or exposing raw ports.
- Node-admin claim secret should remain local to launcher/Electron owner state; container only stores a hash.
- A private network such as Tailscale provides reachability, not authorization.
- Phone Access QR creation requires an HTTPS Android-facing `/mobile` URL and server-instance verification.

## Open Unknowns / Risks

- Whether the published image tag should be rebuilt immediately with `mobile-web` or whether a newer unpublished/package build already contains it.
- Whether the product should add an explicit `mobile-safe` node kind to the node registry, or infer setup-needed state from `/rest/remote-access/status` plus claim state.

## Notes For Architect Reviewer

Design should separate but coordinate two changes:
1. Owner trust: add claim-backed Electron owner sessions so Docker-node windows can use protected GraphQL/REST/WebSocket APIs after claim verification. Do not trust localhost, Electron user-agent, or Docker bridge addresses directly.
2. UX: remote Docker node setup flow should guide users to Settings -> Nodes -> Phone Setup / claim registration when no owner session exists.
3. Packaging: Docker server image must include `mobile-web/` so `/mobile` works for the intended Android flow.

## Requirement Rework - Remove Claim Model (2026-05-23)

The user rejected the claim/owner-session direction after validating the implemented flow. Key observations from the discussion:

- Phone/mobile security does not use the node-admin claim. Phone access is secured by QR pairing and the paired mobile credential (`mra_...`).
- The claim became an Electron owner/admin mechanism, forcing the user to visit **Settings -> Nodes -> Phone Setup** before Electron could use a locally created Docker node.
- The user stated this drifted away from the original purpose and requested complete removal of claim-related code.
- The revised requirement is: local Electron-to-Docker setup should be natural and require no claim; phone QR pairing remains token-based; Docker mobile-safe runtime hardening and `/mobile` asset packaging remain in scope.

Current implementation concern discovered during rework triage:

- `autobyteus-web/stores/remoteOwnerSessionStore.ts` currently computes `requiresOwnerSession` as any Electron non-embedded window, which is broader than the earlier intended `mobile-safe` scope and would make standard remote Docker nodes require claim setup too. This supports removing/reworking the owner-session path rather than continuing to build on it.

## Architecture Review Round 2 Rework - Concrete Local Management Boundary (2026-05-23)

Architecture review failed the pure no-claim design because “local managed-node trust” was abstract. The key implementation/security concern is valid: Docker host-mapped localhost requests are not loopback inside the container, and trusting Docker gateway IP or request headers would be unsafe if a phone-facing proxy such as Tailscale Serve forwards traffic to the same backend.

Design response recorded in the revised requirements/design:

- Remove user-facing node-admin claims and claim-derived owner sessions.
- Add a non-user-facing launcher-managed local management credential, proposed prefix `lmn_...`.
- Launcher stores the raw `lmn_...` only in local launcher state and passes only a hash/verifier to the container.
- Electron main reads local launcher state, matches the current Docker node URL, and gives the renderer the active credential for API transport injection.
- Server validates `lmn_...` by prefix plus timing-safe hash comparison. No peer-address/header/profile shortcut is accepted.
- Route policy matrix is explicit:
  - public bootstrap/status/pairing-exchange routes stay public;
  - Phone Access owner-management routes accept loopback or `lmn_...`, not `mra_...`;
  - protected app REST/GraphQL routes accept loopback, `lmn_...`, or `mra_...`;
  - WebSocket and GraphQL-WS routes accept loopback or `access_token` with `lmn_...`/`mra_...`;
  - dev-only routes remain loopback-only.
- Standard and mobile-safe launcher-created nodes both get `lmn_...`; mobile-safe retains localhost-bound/no-privileged/no-shared-mount hardening.

## Requirement Rework - Remove `lmn` And Restore Trusted-Network Remote Nodes (2026-05-23)

After Round 3 code review, the user clarified the historical product context:

- Add Remote Node was introduced because most users work on trusted home/company LANs or trusted private tailnets/VPNs.
- This trusted-network remote-node workflow is core product usage and must not be broken by Phone Access work.
- Android/phone pairing was added later for mobile access while travelling and should be additive only.
- The `lmn_...` local management credential still breaks non-local LAN/tailnet remote nodes because Electron cannot read same-host launcher state for nodes created/run on another machine.
- The user explicitly requested removing `lmn` as well as claim-related code.

Revised direction:

- Restore existing Electron remote-node behavior over trusted LAN/company VPN/tailnet/private network URLs.
- Remove claim, owner-session, and `lmn` gates from the default active flow.
- Keep QR pairing and `mra_...` mobile credential for the phone/mobile journey.
- Document that the full backend is intended for trusted private networks, not direct public internet exposure.
- Keep Docker `mobile-safe` runtime hardening and `/mobile` asset packaging fixes.
