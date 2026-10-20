# API/E2E Execution Coverage Report — autobyteus-ts-dependency-hygiene

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (direct low-risk route)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-04 gained a simulation of the Dockerfile's install context for base and branch (`--lockfile-only`). Inside the image, the v1 SDK got `eventsource-parser` 3.1.1 although the committed lockfile pins 3.0.6, and that needed attributing.
  - API-03 gained three stop reproductions. The first instance stop was forced.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-dependency-hygiene/tickets/in-progress/autobyteus-ts-dependency-hygiene/evidence/` (API-01…API-04; the handoff message gives the commit)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Decision On L-1 (the committed lockfile)

**Accepted as delivered.** The committed root lockfile is the base lockfile minus the importer's 3 `hono` lines. It is the faithful result of this change. Established by: Reproduced (API-01).
- **It does not churn.** On a fresh checkout, every install path keeps it byte-identical:
  - `--frozen-lockfile`;
  - `--no-frozen-lockfile`, which release CI uses;
  - `--lockfile-only`;
  - an install from inside `autobyteus-ts`.

  pnpm reports `Lockfile is up to date, resolution step is skipped`.
- **The extra dedupe is not this change's.** The `eventsource-parser` 3.0.6 → 3.1.1 change that a plain re-resolve picked up is one of 8 dedupes that `pnpm dedupe --check` reports identically on base `5de6a698b9` and on this branch (with `tar`, `undici`, `tslib` and `extsprintf`). Bringing in one of them here would have mixed an unrelated transitive change into this ticket. They are recorded as FU-004.
- **The Docker image gets the same result either way.** Its install re-resolves on base and branch alike (FU-003), and the outcome differs from base only by the importer's `hono` (API-04).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `0438027348` (source = `54c9259858`) | macOS 26 arm64, Node 22.23.1, pnpm 10.28.2 | Fresh temporary checkout `/tmp/hyg224/fresh` (no `node_modules`) | `--ignore-scripts` for the install-path checks |
| ENV-2 | tree = `54c9259858` | macOS 26 arm64 | Packaged app from IMP-06 (`autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`, unsigned). Its packaged `autobyteus-ts` dependencies equal the committed manifest (`diff`). Isolated instances via `isolated-app start --from-worktree` | own ports and data roots; the user's app and other instances untouched |
| ENV-3 | `0438027348` | Docker 29.0.1, linux/arm64, Node 22.23.3 | Image `autobyteus-server:hyg224` from `Dockerfile.monorepo` (`build.sh` flags, local arm64); container on `127.0.0.1:48190`, no user volumes | dummy `AUTOBYTEUS_MCP_GATEWAY_TOKEN`; the repo's Node fixture mounted read-only |
| MCP servers | — | host | The repo's Node fixture `autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs`: as the stdio server (env `HYG_ENV`, own cwd), and in HTTP mode with `--require-token test-dummy` | dummy values only |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001, AC-002, AC-003 | install scope, manifest, importer, `.github` | Reused IMP-02 | — | Pass | (implementation handoff) | — | Tree identical to `54c9259858`; `git diff --name-only 54c9259858 0438027348` touches only `tickets/` |
| API-R02 | AC-004 | `autobyteus-ts` build + `verify:runtime-deps`, tests; server build + typecheck | Reused IMP-03, IMP-04, IMP-05 | — | Pass | (implementation handoff) | — | Same |
| API-R03 | AC-005, AC-006 | packaged start; `hono` resolution in the package; core MCP suite | Reused IMP-06, IMP-07, IMP-08 | — | Pass | (implementation handoff) | — | Same tree; the packaged app is from that tree |
| API-01 | AC-001, AC-002, L-1 | root lockfile under the real install paths | Fresh checkout: `pnpm install --frozen-lockfile`; `pnpm install --no-frozen-lockfile` + `cmp`; `pnpm install --lockfile-only` + `cmp`; `(cd autobyteus-ts && pnpm install --frozen-lockfile)`; `hono` link check; `pnpm dedupe --check` on the branch and with base's lockfile and manifest | ENV-1 | Pass | `API-01-lockfile-install-paths.log` | `Lockfile is up to date, resolution step is skipped`; `cmp: lockfile byte-identical after --no-frozen-lockfile`; `cmp: lockfile byte-identical after --lockfile-only`; `Scope: all 13 workspace projects`; `ls: autobyteus-ts/node_modules/hono: No such file or directory`; 3 × `-> hono 4.12.0`; sections 7 and 8 list the same dedupes, including `eventsource-parser 3.0.6 → 3.1.1` | The first section-6 attempt failed in my probe (`require.resolve('hono/package.json')`: hono does not export it). It was replaced by a file check and an `import("hono")`; that run is the one recorded |
| API-02 | AC-001, AC-003 | references to the deleted files; `hono` imports | `git grep` over all tracked files except `tickets/` | ENV-1 | Pass | `API-02-references.log` | `autobyteus-ts/pnpm-lock`, `trigger-server-docker-rebuild`, `autobyteus-ts/\.github`: `exit=1 (1 = no match)`; `hono` imports in `autobyteus-ts`: `exit=1` | The `--ignore-workspace` matches are the wechaty sidecar (out of scope). The `pnpm-lock.yaml` matches in `autobyteus-ts` are a Dockerfile string inside an edit-file benchmark fixture |
| API-03 | AC-006, BEH-003 | packaged desktop server: MCP through the product | isolated instance `iso-51062-8fa3`; `node mcp-journey.mjs <backendUrl> node <fixture> http://127.0.0.1:47510/mcp <out>`: preview, configure, discover a stdio and an HTTP server; `/mcp/gateway` calls; stop. Then 3 start/stop reproductions (idle, after the same journey, idle) | ENV-2 | Pass | `API-03-packaged-mcp-journey.txt` | both previews 5 tools, discover `success: true`; `hyg_stdio_report_env_and_cwd` → `{"value":"hyg-env-dummy","cwd":"/private/tmp/hyg224/cwd"}`; `hyg_stdio_add` structured `{"sum":5}`; `hyg_stdio_fail` `isError: true`; `hyg_http_echo` → `hyg-http-echo`; `auth=ok 12, auth=missing\|wrong 0`; `0` lines mentioning hono / cannot find module; repro `3 of 3 stops graceful in 1-2 s` | The first stop reported `"forced": true`, meaning the app took longer than the 10 s grace period. The log is deleted on stop, so its cause could not be read. It did not reproduce in 3 runs, including one after the same journey. No process was left, and the data root was removed. Nothing in this change touches shutdown, and every instance log has no module errors. Recorded as an observation (load average 41-45) |
| API-04 | AC-006, BEH-003, DS-002 | Docker image: fresh Linux install, start, MCP; install-context attribution | `docker buildx build … -f autobyteus-server-ts/docker/Dockerfile.monorepo -t autobyteus-server:hyg224`; `docker run` on 127.0.0.1; package checks via `docker exec`; the same journey with the fixture mounted and the HTTP fixture via `host.docker.internal`; cleanup. Plus: the Dockerfile's install context simulated with `--lockfile-only` for base and branch | ENV-3, ENV-1 | Pass | `API-04-docker-image.txt`, `API-04-docker-install-context.log` | `autobyteus-ts manifest names hono: 0`; `autobyteus-ts/node_modules/hono: No such file or directory`; 3 × `-> hono 4.12.0`; `import(hono) from @modelcontextprotocol/node: OK`; journey: env/cwd, `{"sum":5}`, tool error, HTTP echo; `auth=ok 12`; container log `0` module-error lines, dummy token `0`; context: base and branch `90 lines` each, both `eventsource-parser: 3.1.1`, re-resolved lockfiles differ only by the importer's `hono` | The image's re-resolution is pre-existing (FU-003). Container and image removed; the user's `autobyteus-server-*` containers untouched |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 standalone lockfile gone; install from inside `autobyteus-ts` uses the root lockfile | Yes | API-R01, API-01 (fresh checkout), API-02 | Proven | — |
| AC-002 no `hono` in the manifest or the importer | Yes | API-R01, API-01, API-04 | Proven | — |
| AC-003 no `autobyteus-ts/.github` | No | API-R01, API-02 | Proven | — |
| AC-004 builds, `verify:runtime-deps`, tests, server build and typecheck | Yes | API-R02 | Proven | — |
| AC-005 packaged server starts | Yes | API-R03 (`verify-packaged-server-startup.mjs`), API-03 (isolated instances start and stop) | Proven | — |
| AC-006 nothing in the package misses `hono`; MCP works | Yes | API-R03, API-03 (packaged), API-04 (Docker) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 96% | All ACs proven, with reused and independent evidence | — | — |
| Changed-boundary execution directness | 85% | 96% | Lockfile under every real install path; packaged server and image resolve and use their dependencies | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | No mocks: real packaged app, real image, real MCP servers (the repo fixture) | MCP servers are fixtures | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Fresh checkout; macOS packaged app; Linux image | Packaged Linux and Windows desktop builds not run here (CI runs the Linux packaged smoke check at release) | A Linux packaged build |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 94% | Tool error path, missing-module scans, start/stop ×4, no orphans | One forced stop whose cause could not be read (did not reproduce in 3 runs) | — |
| User-surface, browser, and desktop-shell confidence | 80% | 95% | Isolated packaged instances driven through their public API | Renderer not driven (no renderer change) | — |
| Durable regression coverage quality and relevance | 95% | 95% | `verify:runtime-deps` and `verify-packaged-server-startup.mjs` (CI) remain the guards; no durable test needed for a manifest/lockfile cleanup | — | — |

- Overall post-repository confidence: 86.0% (92, 85, 85, 85, 80, 80, 95)
- Overall final confidence: 95.1% (96, 96, 95, 95, 94, 95, 95; simple average)
- Calculation method: simple average
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: packaged Linux and Windows desktop builds not run locally; one unexplained forced stop, not reproduced.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (isolated packaged instances), `Other` (Docker image; fresh-checkout installs)
- Confidence gap addressed: the reused checks proved the build, the packaged start and `hono` resolution. They did not prove the real install paths for the hand-made lockfile (L-1), MCP use inside the packaged server, or the Docker image (DS-002), which implementation did not run. All three are now proven.
- Browser validation needed: No. No renderer or web change.

## Desktop Application Validation

- Approach executed: `pnpm --silent isolated-app start --from-worktree` (app from IMP-06), driven through GraphQL and `/mcp/gateway`, and stopped with `isolated-app stop`, 4 times in all.
- Cases: API-03.
- Effect on any already-running desktop application: `None`
- Behavior not directly proven: none material.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- The MCP journey probe is temporary. Its source is in `evidence/API-03-packaged-mcp-journey.txt`, and the existing CI guards cover the regression this change could cause.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| External MCP servers | The repo's Node fixture (stdio and HTTP with a dummy token) | Dummy values, local only | None for dependency resolution |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instances `iso-51062-8fa3`, `iso-51200-4128`, `iso-51277-d39f`, `iso-51379-21e9` | Yes | `isolated-app stop` | stopped; data roots removed; ports released; none of mine listed afterwards |
| Probe-owned HTTP fixtures (:47510, :47511, :47512) and the instances' stdio fixtures | Yes | killed / ended with the instances | no fixture process left (`ps`) |
| Docker container `hyg224` and image `autobyteus-server:hyg224` | Yes | `docker rm -f -v`, `docker rmi` | removed; buildx cache left (shared builder cache) |
| Fresh checkout `/tmp/hyg224/fresh` (temporary worktree), `/tmp/hyg224` | Yes | `git worktree remove --force`; `rm -rf` | removed |
| Packaged app in the worktree (from IMP-06) | No (implementation's) | left | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: Delivery Engineer (`/software_engineering_team/delivery_engineer`)
- Notes:
  - L-1 accepted (section above).
  - Escalation trigger checked: no missing `hono` and no changed install anywhere: fresh installs, packaged app, image.
  - New follow-ups: FU-003 (the image re-resolves the lockfile) and FU-004 (pending lockfile dedupes). Both are pre-existing.
  - Observation: one forced instance stop, not reproduced (API-03 Notes).
