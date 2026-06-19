# Docs Sync Report

## Scope

- Ticket: `mcp-tool-exposure-docker`
- Trigger: Resumed delivery-stage docs sync after API/E2E Round 5 pass and successful validation-only GitHub Desktop Release workflow rerun for MCP/browser cleanup plus Linux x64/ARM64 packaging/release and Linux AppImage metadata scope.
- Bootstrap base reference: `origin/personal` at `39449cfb9307c5dddcf24bc4c9710ccc8d8baf72` from `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/investigation-notes.md`; first delivery refresh integrated `origin/personal` at `79857c513dd6d6e25c4b7761cb5aa0d3a805c227` in merge commit `a3791dc947f8e81f7e47fceca35b55abf0946772`.
- Integrated base reference used for docs sync: `origin/personal` at `79857c513dd6d6e25c4b7761cb5aa0d3a805c227` after `git fetch --prune origin` on 2026-06-19; no additional base commits were available beyond the prior delivery merge.
- Post-integration verification reference: API/E2E Round 5 pass in `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/api-e2e-execution-coverage-report.md`; validation-only GitHub Desktop Release workflow run `27810921946` passed at `c45ed6fc31614a22f53a0e0d2773d3c6ba52bf53` with `publish_release=false` and blank `release_tag`; resumed delivery sanity checks and `git diff --check` passed on the integrated branch state.

## Why Docs Were Updated

- Summary: Long-lived docs were refreshed for the final integrated behavior: Docker/remote browser automation is MCP-origin rather than host-browser-pairing-based; Agent Tools MCP sessions use source-aware routes; Linux desktop packaging now supports native host-architecture Linux builds plus explicit x64/ARM64 entrypoints; Linux release CI builds x64 and ARM64 AppImages with explicit `linux-x64`/`linux-arm64` artifact names and architecture-specific metadata; Linux AppImage update metadata uses embedded blockmaps represented by `blockMapSize` in `latest-linux*.yml`, not standalone Linux `*.AppImage.blockmap` assets.
- Why this should live in long-lived project docs: These are durable runtime, packaging, release, and update-contract invariants. Future browser/MCP work must not reintroduce remote host-browser pairing or inactive static-name reservation, and future release work must not regress Linux ARM64 packaging or publish invalid Linux standalone AppImage blockmap expectations.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `README.md` | Root release artifact and workflow overview. | `Updated` | Describes Linux x64 and Linux ARM64 release artifacts/metadata and validation scope. |
| `autobyteus-web/README.md` | Developer Electron build instructions. | `Updated` | Documents host-architecture Linux builds and explicit `build:electron:linux:x64` / `build:electron:linux:arm64` scripts. |
| `autobyteus-web/docs/electron_packaging.md` | Canonical Electron packaging/runtime doc. | `Updated` | Documents explicit Linux x64/ARM64 AppImage names, native-architecture validation, Prisma engine requirements, packaged startup checks, and embedded AppImage blockmap metadata. |
| `autobyteus-web/docs/github-actions-tag-build.md` | Canonical tag-triggered desktop release workflow doc. | `Updated` | Documents Linux x64 and ARM64 jobs, artifact/metadata names, validation, and no standalone Linux AppImage blockmap assets. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Canonical server module overview for browser tool and Agent Tools MCP ownership. | `Updated` | Documents env-injected embedded Electron bridge vs configured MCP-origin Docker/remote browser tools and source-aware route/collision policy. |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Canonical Agent Tools MCP server lifecycle/source-boundary doc. | `Updated` | Documents per-session source-aware route table and protected-vs-browser collision policy. |
| `autobyteus-web/docs/browser_sessions.md` | Browser session runtime and adapter behavior. | `Updated` | Clarifies Docker/remote BrowserServer MCP routes do not require the host Electron Browser bridge. |
| `.github/workflows/release-desktop.yml` | Release behavior was reviewed as executable workflow rather than docs. | `No change` | Already reflects final x64/ARM64 Linux jobs, metadata validation, startup checks, and no Linux AppImage blockmap upload/publish. |
| `scripts/validate_linux_updater_metadata.py` | Release metadata validation tool. | `No change` | Tool is implementation/runtime validation, not docs; py_compile and ARM64 metadata validation passed. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | Release artifact summary | Added Linux x64 AppImage + `latest-linux.yml` and Linux ARM64 AppImage + `latest-linux-arm64.yml` with embedded `blockMapSize`; release validation summary includes Linux architecture, Prisma, metadata, and startup checks. | Keeps root release expectations aligned with the final release workflow. |
| `autobyteus-web/README.md` | Developer build instructions | Added host-architecture Linux build semantics and explicit x64/ARM64 scripts. | Lets developers build the correct Linux artifact on native Linux hosts/runners. |
| `autobyteus-web/docs/electron_packaging.md` | Packaging and release contract | Added architecture-specific Linux artifact naming, Linux native-architecture guard/Prisma engine validation, Linux release metadata names, and embedded blockmap metadata behavior. | Captures the packaging invariants needed to avoid misleading x64 artifacts on ARM64 and invalid blockmap release expectations. |
| `autobyteus-web/docs/github-actions-tag-build.md` | CI/release workflow docs | Added Linux ARM64 job, Linux metadata validation, AppImage + metadata release assets, and no standalone Linux AppImage blockmaps. | Aligns release documentation with the executable workflow. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Browser/MCP ownership | Replaced remote runtime browser registration guidance with env-only embedded Electron vs configured MCP-origin Docker/remote browser tools and source-aware route policy. | Prevents future work from treating remote host-browser pairing as active. |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Agent Tools MCP source model | Documented `static_adapter` vs `configured_mcp_tool` routes, protected adapter collisions, browser configured-MCP precedence, and list/call consistency. | Captures the durable route-table design that fixed BrowserServer MCP name exposure. |
| `autobyteus-web/docs/browser_sessions.md` | Runtime adapter notes | Clarified that Codex/Claude embedded browser tools require the Browser bridge while Docker/remote BrowserServer MCP tools are configured MCP-origin routes. | Keeps browser session docs aligned with removed host pairing and MCP browser behavior. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Docker/remote browser source ownership | Docker and remote nodes do not pair back to the host Electron browser; they use configured MCP-origin browser tools inside the node/container or expose no browser tools. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/agent_tools.md`, `autobyteus-web/docs/browser_sessions.md` |
| Agent Tools MCP route table | Each Agent Tools MCP session stores one source-aware route per enabled wire tool so descriptor `enabledTools`, `tools/list`, and `tools/call` agree. | `design-spec.md`, `implementation-handoff.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |
| Collision policy | Protected first-party platform/control adapters block configured MCP collisions; browser static adapters prefer selected configured MCP-origin overlaps such as BrowserServer `open_tab`. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/agent_tools.md`, `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |
| Linux native architecture packaging | Linux desktop packaging prepares native server resources before electron-builder, so x64 and ARM64 builds must run on matching native Linux hosts/runners and produce architecture-named artifacts. | `delivery-linux-arm64-reroute.md`, `solution-linux-arm64-rework.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-web/README.md`, `autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/docs/github-actions-tag-build.md` |
| Linux Prisma engine selection | Packaged Linux ARM64 startup must select bundled `linux-arm64-openssl-3.0.x` Prisma engines and reach `/rest/health` after migrations. | `solution-linux-arm64-rework.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/docs/github-actions-tag-build.md` |
| Linux AppImage update metadata | Linux AppImage blockmaps are embedded in AppImage files and represented by positive numeric `blockMapSize` in `latest-linux*.yml`; standalone Linux `*.AppImage.blockmap` assets are not release assets. | `solution-linux-appimage-blockmap-rework.md`, `code-review-report.md`, `api-e2e-execution-coverage-report.md` | `README.md`, `autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/docs/github-actions-tag-build.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Remote “Pair local browser” / runtime host-browser bridge registration for Docker/remote nodes | Configured MCP-origin browser tools inside the node/container, e.g. BrowserServer MCP, or no browser tools | `autobyteus-server-ts/docs/modules/agent_tools.md`, `autobyteus-web/docs/browser_sessions.md` |
| Global static adapter name reservation that suppressed configured MCP browser names | Per-session source-aware route table with adapter-defined collision policy | `autobyteus-server-ts/docs/modules/agent_tools.md`, `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |
| Generic Linux x64-only build output from `build:electron:linux` | Host-architecture Linux default plus explicit native `build:electron:linux:x64` and `build:electron:linux:arm64` scripts with `linux-{arch}` artifact names | `autobyteus-web/README.md`, `autobyteus-web/docs/electron_packaging.md` |
| Linux release expectation for standalone `*.AppImage.blockmap` assets | AppImage + `latest-linux*.yml` metadata with embedded `blockMapSize`; no standalone Linux AppImage blockmap release assets | `README.md`, `autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/docs/github-actions-tag-build.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

N/A — long-lived docs were updated and reviewed.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Long-lived docs now match the integrated, reviewed, API/E2E Round 5 validated, and GitHub workflow validated implementation state. Delivery can proceed to user-verification handoff. The ticket branch was pushed only for validation-only workflow execution; target-branch merge, release publication, ticket archival, and cleanup remain blocked until explicit user verification/finalization instruction.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

N/A.
