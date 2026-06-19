# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/requirements.md`
- Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/design-spec.md`
- Design Review Report: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/design-review-report.md`
- Linux ARM64 Solution Rework: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/solution-linux-arm64-rework.md`
- Linux AppImage Blockmap Solution Rework: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/solution-linux-appimage-blockmap-rework.md`
- Delivery Linux ARM64 Reroute: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/delivery-linux-arm64-reroute.md`
- Delivery GitHub Workflow Reroute: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/delivery-github-workflow-reroute.md`
- Prior Linux Electron Validation Log: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/linux-electron-app-run.log`
- Prior GitHub Linux x64 Job Log: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27809155072-job-82295399169.log`
- Prior GitHub Windows x64 Job Log: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27809155072-job-82295399178.log`
- Implementation Handoff: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/implementation-handoff.md`
- Code Review Report: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/code-review-report.md`
- Prior API/E2E Round 2 LF Evidence: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/api-e2e-round2-preexecution-reroute-evidence.log`
- Prior API/E2E Round 3 Final Execution Log: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/api-e2e-round3-final-execution.log`
- Prior API/E2E Round 3 LF-002 Evidence: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/api-e2e-round3-lf002-blockmap-evidence.log`
- Prior API/E2E Round 4 Final Execution Log: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/api-e2e-round4-final-execution.log`
- Current Investigation Round: 6
- Trigger: Code-review Round 5 pass for the delivery-rerouted Desktop Release workflow Local Fix: Linux x64 AppImage names must be emitted as `linux-x64` instead of electron-builder's AppImage `${arch}` expansion `linux-x86_64`, and staged Windows npm install/prune paths are hardened with bounded fetch retry env after the GitHub-hosted `ECONNRESET` failure.
- Prior Investigation Reviewed: Yes — Rounds 1 through 5 were reviewed, including Browser/MCP pass, `LF-001`, `LF-002`, Round 4 final API/E2E pass, delivery's validation-only GitHub workflow reroute, and code-review Round 5.
- Latest Authoritative Investigation: Round 6 in this file.

## Current Requirement And Design Basis

Current approved behavior that must be proven or handed to the owner that can prove it before delivery finalization:

- Prior browser/MCP behavior remains valid: remote/Docker browser tools come from configured MCPs such as BrowserServer MCP, inactive embedded browser adapters do not reserve names, host Electron embedded browser support remains env-injected only, protected platform tools remain protected, and removed remote pairing surfaces stay removed.
- Linux local packaging must be target/host architecture aware. On this Linux ARM64 host, the official ARM64 Linux entrypoint must produce unambiguous `linux-arm64` artifacts and an unpacked ARM64 app.
- Linux explicit architecture entrypoints must exist for x64 and ARM64 and fail clearly for unsupported host/target cross-architecture packaging.
- Linux packaged server preparation must include and validate target-architecture Prisma engines, including `linux-arm64-openssl-3.0.x` on ARM64.
- Server startup must prefer compatible Linux Prisma engines for `process.arch`; ARM64 must not choose x64 Debian engines when both are bundled.
- Packaged Linux startup validation must prove Prisma migration success and `/rest/health` under the packaged Electron-as-Node runtime while clearing inherited Prisma engine override env vars.
- GitHub release workflow must build native Linux x64 and Linux ARM64 packages, validate AppImage architecture, validate required Prisma engines, validate packaged server startup/migration health, and publish distinct `latest-linux.yml` and `latest-linux-arm64.yml` metadata/assets without ambiguity.
- `LF-001` remains fixed: the workflow discovers the actual unpacked executable entry instead of hard-coding a case-mismatched `AutoByteus` path.
- `LF-002` remains fixed by the superseding design: Linux AppImage differential update data is embedded in AppImages and represented by positive `blockMapSize` entries in `latest-linux*.yml`; standalone Linux `*.AppImage.blockmap` assets must not be uploaded, published, documented, or tested. macOS standalone `.dmg.blockmap` and `.zip.blockmap` assets remain valid and unaffected.
- Delivery's validation-only GitHub workflow run `27809155072` proved the ARM64 GitHub runner path is viable, but surfaced two follow-up issues: deterministic Linux x64 artifact naming (`linux-x86_64` instead of `linux-x64`) and a Windows hosted-runner npm `ECONNRESET` during staged runtime dependency install.
- The Round 5 implementation fixes the deterministic Linux x64 artifact-token bug at the build-owner boundary by deriving an explicit `x64`/`arm64` release token from `resolveLinuxTargetArch()` for Linux artifact names. It intentionally does not preserve `linux-x86_64` as a compatibility alias.
- The Round 5 implementation hardens staged Windows/npm dependency preparation by passing bounded `npm_config_fetch_*` retry env to `npm install` and `npm prune`, without changing dependency semantics or Prisma generation.
- Documentation must describe Linux architecture defaults, explicit entrypoints, artifact names, release workflow behavior, metadata names, Linux AppImage embedded-blockmap behavior/no standalone Linux `.AppImage.blockmap` assets, and packaged startup validation.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Browser/MCP route-backed exposure and remote-pairing removal | Preserved | Requirements REQ-001 through REQ-015; AC-001 through AC-013; Round 1 and Round 3 API/E2E passes | No rerun required for Round 5 because code changes are limited to packaging/release paths. Preserve prior evidence. |
| Linux host-architecture package scripts and explicit `linux:x64` / `linux:arm64` scripts | Preserved | REQ-016 through REQ-018; AC-014 through AC-016; Round 3 build/guard pass | Recheck build-script transpilation and source/generated artifact-name invariants because Round 5 touched `build.ts`. |
| Linux Prisma engine packaging/runtime selection | Preserved | REQ-020 through REQ-022; AC-017 through AC-019; Round 3/Round 4 startup passes | Preserve prior startup verifier evidence; no Round 5 runtime engine selection change. |
| Release workflow executable discovery (`LF-001`) | Preserved | API/E2E Round 2 LF evidence; code review Round 3 pass; Round 3/Round 4 API/E2E rechecks | Recheck no hard-coded `linux-unpacked/AutoByteus` or `linux-arm64-unpacked/AutoByteus` path returned in workflow. |
| Linux AppImage embedded blockmap release contract (`LF-002`) | Preserved | Requirements/design rework; solution-linux-appimage-blockmap-rework; code review Round 4; API/E2E Round 4 pass | Recheck metadata validator still passes for actual ARM64 and synthetic x64, workflow still has no Linux `AppImage.blockmap`, and macOS blockmaps remain. |
| GitHub Linux x64 artifact token | Changed | Delivery GitHub workflow reroute; code review Round 5 | Run local transpile/static/source-generated checks proving Linux artifact names derive from explicit `x64`/`arm64` tokens and no Linux `linux-${arch}` macro remains; request delivery rerun the GitHub workflow to prove native x64 output. |
| Windows staged npm dependency fetch path | Changed | Delivery GitHub workflow reroute; code review Round 5 | Run syntax/static checks proving staged `npm install` and `npm prune` receive bounded retry env. Real hosted-runner npm/network behavior must be confirmed by delivery's validation-only workflow rerun. |
| Packaging docs for Linux artifact patterns | Changed | Code review Round 5; implementation handoff | Recheck docs use explicit `linux-x64` / `linux-arm64` patterns and do not reintroduce standalone Linux AppImage blockmap expectations. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/startup/migrations-prisma-engine-env.test.ts` | Runtime Prisma engine selection prefers current-platform/current-arch bundled or cached engines and preserves explicit env overrides. | REQ-021; AC-017, AC-018 | Still Valid | Round 3 ran 1 file / 7 tests passed. Round 5 does not affect runtime engine selection. | Preserve Round 3 evidence. |
| `autobyteus-web/scripts/verify-packaged-server-startup.mjs` | Starts packaged server with temp SQLite data dir, clears inherited Prisma engine env, waits for `/rest/health`, and requires migration success output. | REQ-022, REQ-025; AC-017, AC-022 | Still Valid | Round 4 packaged startup verifier passed with discovered `autobyteus` executable and ARM64 engines. | Preserve Round 4 evidence; no rerun required unless local artifact evidence is needed. |
| `autobyteus-web/scripts/prepare-server.sh` and `autobyteus-web/scripts/prepare-server.mjs` | Target-aware package preparation, Prisma engine validation, ARM64 client engine materialization, unsupported cross-arch rejection; Round 5 adds staged npm retry env for install/prune. | REQ-017, REQ-020; AC-016, AC-019; delivery Windows workflow reroute | Still Valid after Round 5 | Code review Round 5 says retry env is bounded and dependency semantics are unchanged. | Run `node --check` and static checks that staged `npm install` and `npm prune` pass `npmNetworkRetryEnv` containing retry settings. |
| `autobyteus-web/build/scripts/build.ts` and generated `autobyteus-web/build/dist/build.js` | Host/default Linux arch resolution, explicit arch flags, cross-arch guard, architecture-named artifacts. | REQ-016 through REQ-019; AC-014 through AC-016 | Still Valid after Round 5 | Code review Round 5 says Linux `${arch}` macro is removed and explicit release token helper is used for single Linux builds and the `ALL` Linux leg. | Run `pnpm -C autobyteus-web transpile-build`; static check source/generated helpers and absence of Linux `linux-${arch}` artifact macro. |
| `.github/workflows/release-desktop.yml` executable discovery | Linux packaged startup validation resolves actual unpacked executable and invokes startup verifier. | REQ-025; AC-022; `LF-001` | Still Valid | Round 3/Round 4 checks passed. | Recheck static absence of hard-coded `linux-unpacked/AutoByteus` and `linux-arm64-unpacked/AutoByteus`. |
| `.github/workflows/release-desktop.yml` Linux metadata/artifact contract | Upload/publish Linux x64 and ARM64 AppImages plus `latest-linux*.yml`, validate `blockMapSize`, and avoid Linux standalone `.AppImage.blockmap` assets. | REQ-023 through REQ-025; AC-020 through AC-022; `LF-002`; delivery GitHub reroute | Still Valid after Round 5 | Delivery run proved Linux ARM64 GitHub path passed; Linux x64 failed before Round 5 due build output token mismatch. | Recheck YAML parse/static invariants locally; delivery must rerun validation-only workflow to prove native x64 and Windows jobs. |
| `scripts/validate_linux_updater_metadata.py` | Validates Linux updater metadata uses matching architecture AppImage URL/path, positive numeric `blockMapSize`, and no standalone `.AppImage.blockmap` references. | REQ-025; AC-020 through AC-022 | Still Valid | Round 4 passed syntax, actual ARM64, synthetic x64, and negative checks. | Rerun actual ARM64 and synthetic x64 metadata checks for Round 5 preservation. |
| Durable docs (`README.md`, `autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/docs/github-actions-tag-build.md`) | Document Linux AppImage + metadata with explicit `linux-x64`/`linux-arm64` artifact tokens, embedded blockmap, and no standalone Linux `.AppImage.blockmap` assets. | REQ-026; AC-023 | Still Valid after Round 5 | Code review Round 5 says packaging docs use explicit token patterns. | Run stale/positive docs validation. |
| Delivery GitHub workflow run `27809155072` logs | Real hosted workflow evidence for Linux ARM64 success and Linux x64/Windows failures. | AC-015, AC-020 through AC-022; user-requested validation-only workflow dispatch | Still Valid as prior-failure evidence | Delivery reroute recorded run URL, job IDs, Linux x64 `linux-x86_64` failure, Windows `ECONNRESET`, Linux ARM64 success. | Recheck prior failures in execution report and hand to delivery for fresh workflow rerun. |
| Browser/MCP route, browser result normalizer, Codex event converter, NodeManager, BrowserRuntime, and node registry durable tests from Round 1 | Preserve MCP-origin BrowserServer exposure, removed remote pairing, and host Electron embedded browser behavior. | REQ-001 through REQ-015; AC-001 through AC-013 | Still Valid | Round 3 focused server/web/Electron regression passed: 11 server files / 89 tests, NodeManager 1 file / 9 tests, Electron 2 files / 5 tests. | Preserve evidence; Round 5 did not touch browser/MCP code. |
| Removed remote bridge/pairing tests from Round 1 | Obsolete remote host-browser pairing behavior. | REQ-001 through REQ-008; AC-010 | Stale / Remove | Round 1 investigation proved obsolete; Round 3 search showed only intentional legacy-drop assertions remain. | Keep removed. |
| Round 3 standalone Linux `.AppImage.blockmap` expectation | Obsolete standalone Linux AppImage blockmap release asset expectation. | Corrected REQ-023 through REQ-026; AC-020 through AC-023; `solution-linux-appimage-blockmap-rework.md` | Stale / Remove / Replace | Round 4 proved embedded-blockmap metadata contract. | Keep replaced by metadata `blockMapSize` validation. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Round 1 deleted remote bridge/pairing tests | Remote/Docker node can pair to host Electron browser. | Remote pairing is intentionally removed. | REQ-001 through REQ-008; AC-010 | MCP route/list/call coverage and source absence checks. | No direct compatibility replacement is valid. |
| Linux standalone `*.AppImage.blockmap` release artifact checks/docs from Round 3 | Linux AppImage builds must upload/publish standalone `.AppImage.blockmap` assets. | Superseding LF-002 design says Linux blockmaps are embedded and represented by `blockMapSize`; standalone Linux `.AppImage.blockmap` files are invalid expectations. | Corrected REQ-023 through REQ-026 and AC-020 through AC-023; `solution-linux-appimage-blockmap-rework.md`. | Linux metadata validator and workflow/doc checks. | No standalone Linux blockmap replacement file is valid; the replacement is metadata `blockMapSize` validation. |
| GitHub Linux x64 `linux-x86_64` AppImage output from run `27809155072` | Electron-builder AppImage `${arch}` macro may stand in for the release artifact architecture token. | Requirements require unambiguous `linux-x64`; Round 5 code review rejected compatibility retention and fixed the artifact name at build source. | REQ-018, REQ-019, REQ-025; AC-015, AC-021; delivery reroute. | Explicit build-owner Linux artifact-name helper and workflow native x64 validation. | No `linux-x86_64` compatibility alias should be retained. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No new API/E2E durable coverage code is needed in Round 6. The implementation changed production workflow/build/docs/script code and was code-reviewed; API/E2E will use temporary executable/static probes and route real GitHub workflow rerun to delivery. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | API/E2E will not update repository-resident durable coverage code. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A by API/E2E | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEP-015 | `pnpm -C autobyteus-web transpile-build`. | Generated build runner stays in sync after the Round 5 `build.ts` artifact-name change. | One-off build/transpile evidence; generated file is implementation artifact. |
| TEP-016 | Source/generated static checks for Linux artifact-name helper, no Linux `linux-${arch}` macro, explicit `linux-x64`/`linux-arm64` workflow/docs patterns, and no hard-coded LF-001 executable path regression. | Round 5 removed the `linux-x86_64` source of truth and preserved LF-001/LF-002 contracts locally. | Static one-off validation; real x64 runtime output must be proven by delivery workflow rerun. |
| TEP-017 | `node --check autobyteus-web/scripts/prepare-server.mjs` plus static check that staged `npm install` and `npm prune` pass `npmNetworkRetryEnv` with retry keys. | Windows staged runtime dependency install/prune is syntax-valid and includes bounded npm fetch retry hardening. | One-off source validation; hosted npm/network outcome must be proven by delivery workflow rerun. |
| TEP-018 | `python3 scripts/validate_linux_updater_metadata.py` against actual ARM64 metadata and a temporary synthetic x64 metadata file. | LF-002 metadata contract remains intact after Round 5. | Temporary metadata fixture under `/tmp`; validator remains durable implementation tooling. |
| TEP-019 | Workflow YAML parse/static preservation: Linux metadata validators, no Linux `AppImage.blockmap`, macOS blockmaps remain, Linux upload/publish globs use AppImage + `latest-linux*.yml`. | GitHub workflow static contract remains aligned before delivery rerun. | One-off static evidence. |
| TEP-020 | `git diff --check` after report/log updates. | Workspace diff remains whitespace-clean. | One-off repository hygiene evidence. |
| TEP-021 | Delivery-owned manual `workflow_dispatch` on branch `codex/mcp-tool-exposure-docker` with `publish_release=false` and no `release_tag`. | Real GitHub native Linux x64 output emits `*linux-x64*.AppImage`/`latest-linux.yml`, Windows job no longer fails on the prior npm `ECONNRESET` path, Linux ARM64 remains green, and no release is published. | This is not a local durable test; delivery owns branch push/dispatch/finalization evidence. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Native Linux x64 package output on this host | Current host is Linux ARM64 and cross-architecture Linux packaging is intentionally unsupported locally. | Medium until GitHub native x64 runner reruns. | Delivery must rerun validation-only Desktop Release workflow and capture run/job logs/artifacts. |
| Hosted Windows npm/network behavior after retry hardening | The prior failure occurred on a GitHub `windows-2022` runner against external npm/network services; local Linux host cannot reproduce that exact environment. | Medium; retry hardening lowers transient risk but cannot guarantee external registry availability. | Delivery must rerun the Windows job as part of the Desktop Release workflow and reroute with fresh evidence if it still fails. |
| Actual GitHub Actions workflow rerun by API/E2E | API/E2E is not committing/pushing/dispatching in this stage; user requested delivery perform the validation-only dispatch, and delivery owns final branch/workflow evidence. | Medium until delivery rerun passes. | Handoff to `delivery_engineer` with explicit workflow-dispatch instructions. |
| Full model-driven Codex run against a live BrowserServer subprocess | Round 1 covered representative route/list/call, actual BrowserServer output shape, and event normalization deterministically; Round 5 did not alter this path. | Low to medium. | Preserve Round 3 focused regression evidence; delivery may note no live provider/browser run. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None before local Round 5 execution. | N/A | Code review Round 5 resolved the delivery-rerouted Local Fix and reported no findings. | N/A |
| If the fresh delivery-owned workflow still emits `linux-x86_64` or fails Linux x64 metadata/startup after this fix. | Local Fix | Would be fresh GitHub job log evidence against REQ-018/AC-015. | `implementation_engineer` after delivery captures evidence. |
| If the fresh Windows job still fails with npm/network after retry hardening. | Local Fix or Environmental depending on log evidence | Would be fresh Windows job log evidence after retry env. | `implementation_engineer` if deterministic/actionable; otherwise delivery records environmental retry decision. |

## Execution Plan

1. Run local Round 5 API/E2E validation checks from TEP-015 through TEP-020 and capture evidence in `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/api-e2e-round5-final-execution.log`.
2. Recheck prior unresolved delivery failures in the execution coverage report: Linux x64 `linux-x86_64` artifact token and Windows npm `ECONNRESET`.
3. Do not add/update/remove repository-resident durable coverage code in API/E2E.
4. If local checks pass, update the canonical execution coverage report with Round 5 results and route the cumulative package to `delivery_engineer` for the delivery-owned manual GitHub workflow rerun (`workflow_dispatch`, branch `codex/mcp-tool-exposure-docker`, `publish_release=false`, no `release_tag`).
5. If local checks fail with an actionable implementation issue, classify as `Local Fix` and route to `implementation_engineer` with evidence.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Round 6 local validation can resume after code-review Round 5. Passing local checks is not a substitute for the delivery-owned GitHub workflow rerun; it is the API/E2E gate before asking delivery to repeat the validation-only Desktop Release dispatch.
