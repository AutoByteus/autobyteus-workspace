# API/E2E Coverage Investigation — autobyteus-ts-dependency-hygiene

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-001)
- Supplemental Task Artifacts: `probes/standalone-install-probe.txt`; `handoff-sr-001.md`; `follow-ups.md` (FU-001, FU-002)
- Design Review Report: `N/A — not applicable` (architecture review not selected, Small/Low)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md` (after the first result)
- Current API/E2E Revision ID: `N/A` until `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (direct low-risk route)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

The change deletes `autobyteus-ts/pnpm-lock.yaml` and `autobyteus-ts/.github/workflows/trigger-server-docker-rebuild.yml`, removes `"hono"` from `autobyteus-ts` `dependencies`, and removes the importer's 3 `hono` lines from the root `pnpm-lock.yaml` (commit `54c9259858`; head `0438027348` adds only ticket docs). The proof required:
- installs still use the root lockfile, including from inside `autobyteus-ts` (AC-001);
- no `hono` in the manifest or the importer (AC-002); no `autobyteus-ts/.github` (AC-003);
- build with `verify:runtime-deps`, tests, server build and typecheck pass (AC-004);
- the packaged server starts (AC-005), nothing in it misses `hono`, and MCP works (AC-006).

The design's escalation trigger is a missing `hono` or a changed install.

Decision asked of API/E2E (L-1): the design said "regenerate with `pnpm install`; any diff beyond the importer's `hono` → stop". A plain `pnpm install` after the manifest edit also dedupes `eventsource-parser` 3.0.6 → 3.1.1 inside `@modelcontextprotocol/sdk@1.32.1`. The implementer committed the base lockfile minus the 3 importer lines instead (IMP-01).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (install, root or inside a package), SCN-002 (build), SCN-003 (desktop and Docker packaging and start).
- Real-use scenarios added from investigating the implemented behavior:
  - The release and image installs: `release-desktop.yml` (5 jobs) and `Dockerfile.monorepo` run `pnpm install --no-frozen-lockfile` on a fresh checkout. This is the install path that decides whether the committed minimal lockfile (L-1) stays as committed in real builds (API-01).
  - The Docker image (DS-002 names it; not run by implementation): fresh Linux install, server start, MCP in the container (API-04).
  - MCP in the packaged desktop server through the product (AC-006 asks "MCP works"; IMP-08 ran the core suite outside the package): an isolated instance previews a stdio and an HTTP MCP server and calls a tool through `/mcp/gateway` (API-03).
- Recorded `Technically Possible but Unsupported/Contrived` (not tested): SCN-004, standalone install of `autobyteus-ts` with `--ignore-workspace`.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 install uses the root lockfile | Preserved (stale file removed) | IMP-02 | Reuse; fresh-checkout installs in API-01 |
| BEH-002 build without `hono` | Changed (entry removed) | IMP-03…05 | Reuse |
| BEH-003 packaged server / image without direct `hono` | Changed | IMP-06, IMP-07, IMP-08 | Reuse IMP-06/07; add API-03 (packaged MCP journey), API-04 (Docker) |
| BEH-004 nested workflow removed | Removed | IMP-02 | Reuse; reference grep API-02 |
| Root lockfile content (L-1) | Changed (3 lines) | IMP-01 | API-01 independent reproduction and decision |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | Yes | Packaged server `node_modules` | IMP-06, IMP-07 | MCP use inside the packaged server not exercised | Project Desktop Validation (API-03) |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Dependency resolution: pnpm (lockfile) and the Docker image install | IMP-01, IMP-02 | `--no-frozen-lockfile` on a fresh checkout; Linux image | Other (API-01, API-04) |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-dependency-hygiene` (branch `codex/autobyteus-ts-dependency-hygiene`)
- Project type and runtime stack: pnpm 10.28.2 monorepo, Node 22.23.1; Electron desktop app; Docker server image
- Project testing guideline path(s): `TESTING.md` (root); no closer `TESTING*.md`
- Conflicting, missing, or unclear project instructions: none
- Required environment variables or secrets available: `N/A` (no provider keys needed)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global guideline | worktree builds only; isolated instances (`isolated-app start --from-worktree`, `stop <id>`); test-owned Docker containers on 127.0.0.1 without user volumes; never `git add -A` |
| `.github/workflows/release-desktop.yml` | Release installs | `pnpm install --no-frozen-lockfile` (L139, 269, 404, 488, 564); `verify-packaged-server-startup.mjs` |
| `autobyteus-server-ts/docker/Dockerfile.monorepo`, `build.sh` | Image | copies the root lockfile; `pnpm install --no-frozen-lockfile` |
| `docs/isolated-app-instances.md` | Packaged instance | start/stop JSON, ports |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Fresh checkout (API-01) | temp worktree of `0438027348` | `git worktree add --detach`; installs as listed | own `node_modules` | exit codes, `cmp` | `git worktree remove --force` |
| Packaged instance (API-03) | this worktree | `pnpm --silent isolated-app start --from-worktree` (app from IMP-06) | own ports and data root | `start` JSON, `/rest/health` | `isolated-app stop <id>` |
| Docker image (API-04) | this worktree | `docker buildx build -f autobyteus-server-ts/docker/Dockerfile.monorepo --load --platform linux/arm64` | test-owned tag; container on 127.0.0.1 | `/rest/health` | `docker rm -f -v`, `docker rmi` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| MCP servers | Node stdio fixture `autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs`; a local HTTP MCP server on the v2 server packages with a dummy token | dummy values; local only | processes end with the probe / instance |
| Server configs | GraphQL `previewMcpServerTools`, `configureMcpServer`, `discoverAndRegisterMcpServerTools` | own data root / container | removed with it |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` `verify:runtime-deps` (build script) | built code imports only declared runtime deps | AC-004 | Still Valid | IMP-03 | Reuse |
| `autobyteus-ts` test suite | library behavior | AC-004 | Still Valid | IMP-05 | Reuse |
| `autobyteus-ts/tests/integration/tools/mcp` | MCP client vs fixtures | AC-006 | Still Valid | IMP-08 | Reuse |
| `autobyteus-web/scripts/verify-packaged-server-startup.mjs` | packaged server starts | AC-005 | Still Valid | IMP-06 | Reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001, AC-002, AC-003 | install scope, manifest, lockfile, `.github` | Reused | IMP-02 | Ran on a tree identical to `54c9259858`; only `tickets/` changed since |
| API-R02 | AC-004 | builds, typecheck, tests | Reused | IMP-03, IMP-04, IMP-05 | Same |
| API-R03 | AC-005, AC-006 | packaged start; `hono` resolution; core MCP suite | Reused | IMP-06, IMP-07, IMP-08 | Same; the packaged app is from that tree |
| API-01 | AC-001, AC-002, L-1 | root lockfile under real install paths on a fresh checkout | Temporary Probe | temp worktree of head: `pnpm install --frozen-lockfile`; `pnpm install --no-frozen-lockfile` + `cmp`; `pnpm install --lockfile-only` + `cmp`; `pnpm dedupe --check` on head and on base | Decides L-1 from the install paths CI and the image use |
| API-02 | AC-001, AC-003 | references to the deleted files | Temporary Probe | `git grep` over the whole tree (workflows, Dockerfiles, scripts, docs) | Nothing must still use them |
| API-03 | AC-006, BEH-003 | packaged desktop server: MCP through the product | Journey | isolated instance; GraphQL preview of a stdio (Node fixture) and an HTTP (token) MCP server; configure + discover; `/mcp/gateway` tool calls; stop | AC-006 "MCP works" inside the package |
| API-04 | AC-006, BEH-003, DS-002 | Docker image: fresh Linux install, start, MCP | Temporary Probe | build the image from the worktree; container on 127.0.0.1; check `hono` resolution and `autobyteus-ts/node_modules`; GraphQL preview of an HTTP server and of the Node fixture; gateway call | Docker was not run by implementation |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None. The change is a dependency and repository cleanup; the existing build verifier, test suites and packaged smoke check are the durable guards.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron, packaged mac-arm64 build of this worktree (IMP-06 build).
- Testing guideline, README, or development instructions used: `TESTING.md`, `docs/isolated-app-instances.md`.
- Web-equivalent behavior: none changed.
- Shell-specific or lifecycle behavior: the packaged server's dependency tree.
- Chosen validation approach: an isolated instance from the worktree, driven through its backend URL.
- How the run avoids disturbing an already-running desktop application: own ports and data root; only my instance id is stopped.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Packaged Linux and Windows desktop builds | No such host here; CI runs the packaged smoke check on Linux at release | Low: same manifest; Docker covers a Linux install | No | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| L-1: committed lockfile made by editing instead of `pnpm install` | To be decided by API-01 (an install-path question, not a behavior one) | IMP-01 | API/E2E decides; Solution Designer informed through the result |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Notes: none
