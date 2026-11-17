# API/E2E Coverage Investigation — bundled-claude-code-514

## Investigation Meta

- Requirements Doc: `tickets/in-progress/bundled-claude-code-514/requirements-doc.md` (SR-002, option A+, approved by the user)
- Investigation Notes: `tickets/in-progress/bundled-claude-code-514/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/bundled-claude-code-514/solution-revision-record.md`
- Design Spec: `tickets/in-progress/bundled-claude-code-514/design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts: `evidence/probes-2026-11-17.md`
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (direct route, Small/Low)
- Implementation Handoff: `tickets/in-progress/bundled-claude-code-514/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/bundled-claude-code-514/implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable`
- API/E2E Revision Record: `tickets/in-progress/bundled-claude-code-514/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001, direct API/E2E validation
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-002 / AC-001: no `@anthropic-ai/claude-agent-sdk-<platform>` package or link in any packaged server (macOS arm64/x64, Windows, Linux x64/arm64 desktop builds, the Docker server package); `@anthropic-ai/claude-agent-sdk` stays; a stage without the SDK fails the build. One prune module (`autobyteus-web/scripts/claude-agent-sdk-binary-packaging.mjs`) called by `prepare-server.sh`, `prepare-server.mjs` and `Dockerfile.monorepo`.
- REQ-003 / AC-002: a packaged build runs a Claude turn and lists Claude models with the installed program.
- REQ-001 / AC-003: Claude runtime row (installed version, sign-in, update) unchanged.
- No runtime code changed; persisted data `Not Affected`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: desktop packaging on every platform; Docker server package; Claude run/catalog/Settings row in a packaged build.
- Real-use scenario added: SCN-A1 the Docker server node: the image's starter runs the server package (`/opt/autobyteus/server-package`) with the image's own installed `claude`; checked by running this worktree's server package in a test-owned container of the published image.
- Contrived/unsupported: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-005 packaged platform binaries | Removed | REQ-002, design DS-001 | Inspect real artifacts of every packaging path |
| BEH-001 Claude through the installed program | Preserved | REQ-001, REQ-003 | Live checks on a packaged build (desktop: IMP-06; Docker: API-03) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No (row only observed) | — | IMP-06 screenshot | — | — |
| Desktop shell / packaging | Yes | staged server contents of each package | IMP-01 unit, IMP-02 deploy stage, IMP-03/04 local mac arm64, IMP-08 release logs | Windows, Linux and macOS x64 artifacts not opened; Docker package not built | list the release artifacts; build the Docker server package |
| Process / lifecycle | Yes (startup of a pruned server) | packaged server start | IMP-05 (mac), IMP-08 (Linux startup step) | Docker node start | test-owned container |
| Persisted-data transition | No | — | — | — | — |
| Worker / distributed | No | — | — | — | — |
| External integration | Yes (Claude Code program) | which program the SDK starts | IMP-06 (mac) | Docker image's `claude` | API-03 |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/bundled-claude-code-514`, branch `codex/bundled-claude-code-514`, product commit `365fde4e5b` (HEAD `14fcc911ea` adds only ticket documents).
- Testing guideline: `TESTING.md` (root; no closer one). Relevant rules: Docker server nodes (test-owned container from the same image, `127.0.0.1` free port, fresh volumes, mount this worktree's server package read-only over `/opt/autobyteus/server-package`, `docker rm -f -v` afterwards, never the user's node containers or volumes); Fresh-start build (build inputs touched: `*/scripts/**`, `autobyteus-server-ts/docker/**` → the release runners' fresh checkout in IMP-08 is that proof; RELEASE.md build-only run done).
- Conflicting or unclear instructions: None.
- Changed build-input paths: `autobyteus-web/scripts/**`, `autobyteus-server-ts/docker/Dockerfile.monorepo` → fresh-start build proven by IMP-08 (five release runners from a fresh checkout); the Docker workflow's server-package build is API-01 here.
- Required secrets: none for these checks (no provider call in the container; the user's node containers are not touched).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` "Docker server nodes" | how to run a server package in Docker | `docker buildx build -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package --output type=local,dest=<new folder> .`; test-owned container, read-only mount over `/opt/autobyteus/server-package` |
| `RELEASE.md` build-only run | release proof for build steps | done by implementation (IMP-08) |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | server package and runtime image | runtime image installs `claude` globally; server package from `pnpm deploy … --legacy --prod` |

| Component / Dependency | Working Directory | Start / Setup Command | Notes | Readiness Check | Stop / Cleanup |
| --- | --- | --- | --- | --- | --- |
| Server package build | worktree root | `docker buildx build … --target server-package --output type=local,dest=/tmp/sp-514` | linux/arm64 (host Docker) | build exit 0 | remove `/tmp/sp-514` |
| Test container | — | `docker run -d --name ab514-test -p 127.0.0.1:<free>:8000 -v <fresh volumes> -v /tmp/sp-514:/opt/autobyteus/server-package:ro autobyteus/autobyteus-server:beta` | fresh volumes; signed-out CLIs | `/rest/health` | `docker rm -f -v ab514-test`; remove its volumes |
| Release artifacts | `/tmp/rel-514` | `gh run download 44105389247 -n <name>` | Windows NSIS listed with 7z in a throwaway container; AppImages with `unsquashfs` in a throwaway container; dmg with `hdiutil` | listing | remove `/tmp/rel-514` |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/scripts/__tests__/claudeAgentSdkBinaryPackaging.spec.ts` | prune on pnpm and flat npm layouts, no-op, missing SDK throws | AC-001 | Still Valid | IMP-01 on `365fde4e5b` | Reused |
| `autobyteus-web/scripts/__tests__/` onnx prune spec and `verify-packaged-server-startup.mjs` | unchanged neighbours | — | Still Valid | IMP-05, IMP-08 | Reused |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001 (unit) | prune module | Reused | IMP-01 | same commit; log readable |
| API-R2 | AC-001 (deploy stage, mac arm64 build and app) | packaging | Reused | IMP-02, IMP-03, IMP-04 | same commit |
| API-R3 | REQ-003 (packaged start, mac) | packaged server | Reused | IMP-05 | same commit |
| API-R4 | AC-002, AC-003 (mac packaged build) | isolated instance | Reused | IMP-06 | same commit; turn reply, `ps` of the started program and the Settings screenshot are in the evidence |
| API-R5 | AC-001 (release logs, all five targets) | release runners | Reused | IMP-08 | same commit |
| API-01 | AC-001 (Docker server package) | `Dockerfile.monorepo --target server-package` | Journey | buildx build; list `node_modules` for `claude-agent-sdk*`; SDK present; size | not run upstream |
| API-02 | AC-001 (artifacts) | release run artifacts | Journey | download `windows-x64`, `linux-x64`, `linux-arm64`, `macos-x64`; list the packaged server's `node_modules` in each | release logs prove the prune ran; this proves the shipped files |
| API-03 | REQ-001, REQ-003 (Docker) | test-owned server container with this server package | Journey | start, health, server log; Claude runtime availability and the Agent Runtimes row through the node's API; `which claude` in the container | the Docker node is a packaged build too |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None. The prune has its unit spec; the artifact checks are one-off inspections of this ticket's builds (a durable artifact inspection would duplicate the prune's own failure on a missing SDK and the release jobs' logs).

## Desktop Application Validation Plan

- Shell-specific behavior: packaging only; proven through artifacts (API-02), the local mac build (API-R2) and the isolated instance of it (API-R4).
- The user's running AutoByteus and node containers are not touched.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| A Claude turn in a Windows or Linux desktop install | no Windows/Linux desktop host here | Low (same SDK code path as macOS; only files removed) | No | — |
| A Claude turn in the Docker node | needs a signed-in `claude` in the container (would mean copying a credential from the user's node) | Low (same SDK path; the image's `claude` is passed as before) | No | — |
| linux/amd64 Docker server package | host builds linux/arm64; amd64 needs emulation | Low (same script, arch-independent match) | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
