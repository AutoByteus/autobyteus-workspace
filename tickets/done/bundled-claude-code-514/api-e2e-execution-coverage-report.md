# API/E2E Execution Coverage Report — bundled-claude-code-514

## Round

- Coverage investigation: `tickets/in-progress/bundled-claude-code-514/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/bundled-claude-code-514/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/bundled-claude-code-514/api-e2e-test-progress.md`
- Round and trigger: round 1; implementation handoff IR-001 (direct route, Small/Low)
- Prior round reviewed: None
- Deviations from the investigation's plan: None. API-03 also ran the same check on the image's built-in package (baseline) to compare the Claude row.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/bundled-claude-code-514/tickets/in-progress/bundled-claude-code-514/evidence/` (API-* files; IMP-* from implementation)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `365fde4e5b` (HEAD `14fcc911ea` adds only ticket documents) | macOS 26 arm64 host; Docker 29.0.1 linux/arm64 | `docker buildx … Dockerfile.monorepo --target server-package` | local build of this worktree |
| ENV-2 | `365fde4e5b` | GitHub runners (release run 44105389247) | macOS x64 zip/dmg, Linux x64 and ARM64 AppImages, Windows x64 NSIS installer | listed on the host (zip) and in a throwaway `alpine:3.20` container (squashfs-tools, 7zip) |
| ENV-3 | `365fde4e5b` | Docker linux/arm64 | test-owned container `ab514-test` of `autobyteus/autobyteus-server:beta` (sha256:52db87304cc4, image 1.5.13-beta.8, `/usr/bin/claude` 2.1.319), fresh volumes, `127.0.0.1` random port; this worktree's server package mounted read-only over `/opt/autobyteus/server-package` (baseline run: no mount) | CLIs signed out (fresh `/root`); node key from a setup code, kept in the script's memory only; the user's `autobyteus-server-*` containers untouched |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001 (unit, both layouts, missing SDK fails) | prune module | Reused: IMP-01 | — | Pass | (handoff) | (handoff) | same commit |
| API-R2 | AC-001 (deploy stage; local macOS arm64 build and app) | packaging | Reused: IMP-02, IMP-03, IMP-04 | — | Pass | (handoff) | (handoff) | same commit |
| API-R3 | REQ-003 (packaged server start, macOS) | packaged server | Reused: IMP-05 | — | Pass | (handoff) | (handoff) | same commit |
| API-R4 | AC-002, AC-003 (macOS packaged build) | isolated instance of the local build | Reused: IMP-06 | — | Pass | (handoff) | (handoff) | evidence judged: `enabled=true`; 13 Claude models; reply `PACKAGED-514-OK`; `/Users/normy/.local/bin/claude … --model haiku` child of the instance's server; Settings row "Installed 2.1.325 / Update available (version 2.1.326) / Signed in" (screenshot) |
| API-R5 | AC-001 (all five release jobs ran the prune) | release runners | Reused: IMP-08 | — | Pass | (handoff) | (handoff) | same commit |
| API-01 | AC-001 (Docker server package) | `Dockerfile.monorepo` server-package target | `docker buildx build --progress=plain -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package --output type=local,dest=/tmp/sp-514 .`; list `node_modules` | ENV-1 | Pass | `API-01-docker-server-package-build.log`, `API-01-docker-server-package-listing.log` | `Removed 233 MB of Claude Agent SDK platform binaries`; `# exit: 0`; `claude-agent-sdk-<platform> paths: 0`; `@anthropic-ai/claude-agent-sdk` and its `.pnpm` folder present; `SDK version: 0.3.280`; package 531M | — |
| API-02 | AC-001 (shipped desktop artifacts) | release run 44105389247 artifacts | `gh run download 44105389247 -n <name>`; `unzip -l` (macOS x64); `API-02-list-linux-windows.sh` in `alpine:3.20` (Linux AppImages via `unsquashfs -o <ELF end> -l`; Windows via `7z` on `$PLUGINSDIR/app-64.7z`) | ENV-2 | Pass | `API-02-release-artifacts-listing.log`, `API-02-list-linux-windows.sh` | each artifact: `claude-agent-sdk-<platform> paths: 0`; SDK `package.json` present; Windows `resources/server/node_modules/@anthropic-ai/claude-agent-sdk` and `…/sdk` only; positive control on the installed (pre-change) app finds `.pnpm/@anthropic-ai+claude-agent-sdk-darwin-arm64@0.3.280` and its link | macOS arm64 artifact not downloaded (covered by the local build of the same commit, API-R2, and the job log, API-R5) |
| API-03 | REQ-001, REQ-003 (Docker node) | test-owned server container with this server package | `evidence/API-03-docker-node-check.sh` (and `BASELINE=1` for the image's built-in package) | ENV-3 | Pass | `API-03-docker-node.log`, `API-03-docker-node-baseline.log`, `API-03-docker-node-check.sh` | `health: {"status":"ok"…}`; server `/opt/autobyteus/server-package/dist/app.js`; package has no platform entry (baseline lists `.pnpm/@anthropic-ai+claude-agent-sdk-linux-arm64@0.3.280`); `runtimeAvailability … "enabled":true`; Claude row after `checkAgentRuntimes`: `installed true, installedVersion 2.1.319, UPDATE_AVAILABLE 2.1.326, SIGNED_OUT` — identical in both logs; no error lines in the server log | Before the runtime check the row reads `NOT_CHECKED` (same for both; the desktop asks for a check). First script runs failed to obtain the node key (script bugs: took the wrong output line, then the wrong JSON field); fixed |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-R1, API-R2, API-R5, API-01 (Docker package), API-02 (macOS x64, Linux x64/ARM64, Windows x64 artifacts) | Proven | — |
| AC-002 | Yes | API-R4 (macOS packaged build: turn and model list with the installed program); API-03 (Docker node: Claude enabled with the image's `claude`, same as before) | Proven | A Claude turn on Windows/Linux desktop and in Docker was not run (no Windows/Linux desktop host; the Docker node's `claude` is signed out). Same SDK call path as macOS, where it is proven; low risk |
| AC-003 | Yes | API-R4 (desktop Settings row unchanged), API-03 (Docker node row identical to the image's own package) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 97% | API-R1..R5, API-01..03 | Claude turn proven on macOS only | a turn on Linux/Windows desktops |
| Changed-boundary execution directness | 85% | 98% | shipped artifacts of every target listed; Docker package built and listed | macOS arm64 release artifact not re-listed (local build of the same commit was) | — |
| Cross-boundary integration realism and mock gap | 90% | 96% | packaged macOS instance (turn); Docker node from the published image | no turn in Docker (signed-out CLI) | a signed-in test container |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | release runners, published image, fresh volumes | Docker linux/amd64 package not built here | the server-docker release workflow |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | missing-SDK failure (unit), packaged start (mac, Linux runners, Docker) | — | — |
| User-surface, browser, and desktop-shell confidence | 90% | 95% | Settings row (mac screenshot), Docker node row | Windows/Linux desktop UI not opened | — |
| Durable regression coverage quality and relevance | 95% | 95% | unit spec of the prune (both layouts); the prune fails the build when the SDK is missing | no durable artifact listing (one-off) | — |

- Overall post-repository confidence: 90%
- Overall final confidence: 95.9%
- Calculation method: simple average of the seven final scores.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: a Claude turn on Windows/Linux desktop and in Docker is not run (same code path as the macOS turn); a future SDK that looks up its binary even with a path passed (design Risks; explicit error).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Other` (artifact inspection, Docker build), `Lifecycle` (test-owned Docker node)
- Confidence gap it addresses: the shipped files on each platform and the Docker package, which the logs proved only indirectly; a Docker node starting and finding Claude with the pruned package.
- Browser validation needed: No (no rendered change; the Settings row was observed on the packaged macOS build, API-R4).

## Desktop Application Validation (When Applicable)

- Approach executed: reused the isolated instance of the local macOS build (IMP-06); listed the release artifacts of the other targets.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: a Claude turn on Windows/Linux desktop builds (low; same server code, files only removed).

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`
- Compatibility-only behavior observed: `No`
- Durable coverage for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (the implementation's unit spec `autobyteus-web/scripts/__tests__/claudeAgentSdkBinaryPackaging.spec.ts` covers the prune; reused)

## Dependencies Mocked Or Emulated

None.

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Server package output `/tmp/sp-514` | Yes | removed after the round | removed |
| Release artifacts `/tmp/rel-514`, scratch `/tmp/ab514*` | Yes | removed after the round | removed |
| Containers `ab514-test` (two runs) and `ab514-list`, volumes `ab514-data`, `ab514-home` | Yes | `docker rm -f -v`, `docker volume rm` (`--rm` for the listing container) | none left (`docker ps -a`, `docker volume ls`) |
| Image `alpine:3.20` pulled for the listing | Yes | kept (small public base image) | — |
| Docker build cache from the server-package build | Yes | left in the builder cache | — |
| Owner credential issued by the test node | Yes | lived only in the removed container's data volume | gone with it |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: None.
- Next recipient from `get_handoff_rules`: `/delivery_engineer` (direct route, Small/Low)
- Notes:
  - Size removed per target (release run and this round): macOS arm64 217 MB, macOS x64 217 MB, Windows x64 237 MB, Linux x64 234 MB, Linux ARM64 233 MB, Docker server package (linux/arm64) 233 MB.
  - Release only on the founder's word.
