# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/requirements.md`
- Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/design-spec.md`
- Design Review Report: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/design-review-report.md`
- Linux ARM64 Solution Rework: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/solution-linux-arm64-rework.md`
- Linux AppImage Blockmap Solution Rework: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/solution-linux-appimage-blockmap-rework.md`
- Delivery Linux ARM64 Reroute: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/delivery-linux-arm64-reroute.md`
- Prior Linux Electron Validation Log: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/linux-electron-app-run.log`
- Implementation Handoff: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/implementation-handoff.md`
- Code Review Report: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/code-review-report.md`
- Prior API/E2E Round 2 LF Evidence: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/api-e2e-round2-preexecution-reroute-evidence.log`
- Prior API/E2E Round 3 Final Execution Log: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/api-e2e-round3-final-execution.log`
- Prior API/E2E Round 3 LF-002 Evidence: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/api-e2e-round3-lf002-blockmap-evidence.log`
- Current Investigation Round: 5
- Trigger: Code-review pass for LF-002 implementation rework; resume final API/E2E validation under the superseding Linux AppImage embedded-blockmap contract.
- Prior Investigation Reviewed: Yes — Round 1 browser/MCP pass, Round 2 `LF-001` blockage, Round 3 execution evidence, and Round 4 `LF-002` blockage/design correction were reviewed.
- Latest Authoritative Investigation: Round 5 in this file.

## Current Requirement And Design Basis

Current approved behavior that must be proven before delivery resumes:

- Prior browser/MCP behavior remains valid: remote/Docker browser tools come from configured MCPs such as BrowserServer MCP, inactive embedded browser adapters do not reserve names, host Electron embedded browser support remains env-injected only, protected platform tools remain protected, and removed remote pairing surfaces stay removed.
- Linux local packaging must be target/host architecture aware. On this Linux ARM64 host, the official ARM64 Linux entrypoint must produce unambiguous `linux-arm64` artifacts and an unpacked ARM64 app.
- Linux explicit architecture entrypoints must exist for x64 and ARM64 and fail clearly for unsupported host/target cross-architecture packaging.
- Linux packaged server preparation must include and validate target-architecture Prisma engines, including `linux-arm64-openssl-3.0.x` on ARM64.
- Server startup must prefer compatible Linux Prisma engines for `process.arch`; ARM64 must not choose x64 Debian engines when both are bundled.
- Packaged Linux ARM64 startup validation must prove Prisma migration success and `/rest/health` under the packaged Electron-as-Node runtime while clearing inherited Prisma engine override env vars.
- GitHub release workflow must build native Linux x64 and Linux ARM64 packages, validate AppImage architecture, validate required Prisma engines, validate packaged server startup/migration health, and publish distinct `latest-linux.yml` and `latest-linux-arm64.yml` metadata/assets without ambiguity.
- `LF-001` remains fixed: the workflow discovers the actual unpacked executable entry instead of hard-coding a case-mismatched `AutoByteus` path.
- `LF-002` is resolved by superseding design: Linux AppImage differential update data is embedded in AppImages and represented by positive `blockMapSize` entries in `latest-linux*.yml`; standalone Linux `*.AppImage.blockmap` assets must not be uploaded, published, documented, or tested. macOS standalone `.dmg.blockmap` and `.zip.blockmap` assets remain valid and unaffected.
- Documentation must describe the Linux architecture defaults, explicit entrypoints, artifact names, release workflow behavior, metadata names, Linux AppImage embedded-blockmap behavior/no standalone Linux `.AppImage.blockmap` assets, and packaged startup validation.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Browser/MCP route-backed exposure and remote-pairing removal | Preserved | Requirements REQ-001 through REQ-015; AC-001 through AC-013; Round 1 and Round 3 API/E2E passes | Round 3 focused regression already passed and LF-002 did not touch browser/MCP code; no rerun required unless a final smoke signal fails. |
| Linux host-architecture package scripts and explicit `linux:x64` / `linux:arm64` scripts | Preserved | REQ-016 through REQ-018; AC-014 through AC-016; Round 3 build/guard pass | Round 3 ARM64 build and cross-arch guards remain valid; LF-002 did not change package build implementation. |
| Linux Prisma engine packaging/runtime selection | Preserved | REQ-020 through REQ-022; AC-017 through AC-019; Round 3 startup pass | Round 3 packaged startup/migration/health remains valid; run targeted verifier only if needed. |
| Release workflow executable discovery (`LF-001`) | Preserved | API/E2E Round 2 LF evidence; code review Round 3 pass; Round 3 API/E2E recheck | Recheck hard-coded path absence as part of workflow static validation. |
| Linux AppImage embedded blockmap release contract (`LF-002`) | Changed | Requirements/design rework; solution-linux-appimage-blockmap-rework; code review Round 4 | Validate workflow has no Linux `AppImage.blockmap` references, macOS blockmap references remain, metadata validator is invoked for build and publish, actual ARM64 metadata passes, synthetic x64 metadata passes, and negative metadata cases fail. |
| Linux release docs for blockmaps | Changed | REQ-026; AC-023; code review Round 4 stale-doc check | Validate docs no longer state standalone Linux AppImage blockmap assets are expected and do state embedded `blockMapSize` behavior. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/startup/migrations-prisma-engine-env.test.ts` | Runtime Prisma engine selection prefers current-platform/current-arch bundled or cached engines and preserves explicit env overrides. | REQ-021; AC-017, AC-018 | Still Valid | Round 3 ran 1 file / 7 tests passed. LF-002 does not affect runtime engine selection. | No rerun required for LF-002; preserve Round 3 evidence. |
| `autobyteus-web/scripts/verify-packaged-server-startup.mjs` | Starts packaged server with temp SQLite data dir, clears inherited Prisma engine env, waits for `/rest/health`, and requires migration success output. | REQ-022, REQ-025; AC-017, AC-022 | Still Valid | Round 3 verifier passed against fresh ARM64 unpacked app with discovered `autobyteus` executable. | Optional targeted rerun after metadata checks; no durable change. |
| `autobyteus-web/scripts/prepare-server.sh` and `autobyteus-web/scripts/prepare-server.mjs` | Target-aware package preparation, Prisma engine validation, ARM64 client engine materialization, unsupported cross-arch rejection. | REQ-017, REQ-020; AC-016, AC-019 | Still Valid | Round 3 syntax, ARM64 build/prepare, ARM64 engine checks, and x64-on-ARM64 guard passed. | No rerun required for LF-002. |
| `autobyteus-web/build/scripts/build.ts` and `autobyteus-web/package.json` Linux scripts | Host/default Linux arch resolution, explicit arch flags, cross-arch guard, architecture-named artifacts. | REQ-016 through REQ-018; AC-014 through AC-016 | Still Valid | Round 3 explicit ARM64 build produced `linux-arm64`; x64 cross-arch build failed clearly before packaging. | No rerun required for LF-002. |
| `.github/workflows/release-desktop.yml` executable discovery | Linux packaged startup validation resolves actual unpacked executable and invokes startup verifier. | REQ-025; AC-022; `LF-001` | Still Valid | Round 3 hard-coded path search/resolver/startup passed. | Recheck static absence of hard-coded `AutoByteus` paths. |
| `.github/workflows/release-desktop.yml` Linux metadata/artifact contract | Upload/publish Linux x64 and ARM64 AppImages plus `latest-linux*.yml`, validate `blockMapSize`, and avoid Linux standalone `.AppImage.blockmap` assets. | REQ-023 through REQ-025; AC-020 through AC-022; `LF-002` | Still Valid after LF-002 implementation | Code review Round 4 says Linux `.AppImage.blockmap` paths removed and four validator invocations present. | Run final static workflow validation. |
| `scripts/validate_linux_updater_metadata.py` | Validates Linux updater metadata uses matching architecture AppImage URL/path, positive numeric `blockMapSize`, and no standalone `.AppImage.blockmap` references. | REQ-025; AC-020 through AC-022 | Still Valid | Script inspected and code-reviewed. | Run py_compile, actual ARM64 metadata validation, synthetic x64 validation, negative missing-blockMapSize and standalone-blockmap cases. |
| Durable docs (`README.md`, `autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/docs/github-actions-tag-build.md`) | Document Linux AppImage + metadata with embedded blockmap and no standalone Linux `.AppImage.blockmap` assets. | REQ-026; AC-023 | Still Valid after LF-002 implementation | Grep shows updated wording. | Run stale-doc search and positive docs grep. |
| Browser/MCP route, browser result normalizer, Codex event converter, NodeManager, BrowserRuntime, and node registry durable tests from Round 1 | Preserve MCP-origin BrowserServer exposure, removed remote pairing, and host Electron embedded browser behavior. | REQ-001 through REQ-015; AC-001 through AC-013 | Still Valid | Round 3 focused server/web/Electron regression passed: 11 server files / 89 tests, NodeManager 1 file / 9 tests, Electron 2 files / 5 tests. | Do not rerun for LF-002 unless needed; preserve evidence. |
| Removed remote bridge/pairing tests from Round 1 | Obsolete remote host-browser pairing behavior. | REQ-001 through REQ-008; AC-010 | Stale / Remove | Round 1 investigation proved obsolete; Round 3 search showed only intentional legacy-drop assertions remain. | Keep removed. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Round 1 deleted remote bridge/pairing tests | Remote/Docker node can pair to host Electron browser. | Remote pairing is intentionally removed. | REQ-001 through REQ-008; AC-010 | MCP route/list/call coverage and source absence checks. | No direct compatibility replacement is valid. |
| Linux standalone `*.AppImage.blockmap` release artifact checks/docs from Round 3 | Linux AppImage builds must upload/publish standalone `.AppImage.blockmap` assets. | Superseding LF-002 design says Linux blockmaps are embedded and represented by `blockMapSize`; standalone Linux `.AppImage.blockmap` files are invalid expectations. | REQ-023 through REQ-026 and AC-020 through AC-023 as corrected; `solution-linux-appimage-blockmap-rework.md`. | Linux metadata validator and workflow/doc checks. | No standalone Linux blockmap replacement file is valid; the replacement is metadata `blockMapSize` validation. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | LF-002 implementation already added repository-resident release validation tooling. API/E2E will not add durable coverage code. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | LF-002 code/docs/workflow changes have already been implemented and code-reviewed. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A by API/E2E | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEP-009 | `python3 -m py_compile scripts/validate_linux_updater_metadata.py`. | Validator script is syntactically valid. | One-off executable evidence; script remains durable implementation tooling. |
| TEP-010 | Validate actual ARM64 `latest-linux-arm64.yml`, synthetic x64 metadata, and negative missing `blockMapSize` / `.AppImage.blockmap` metadata. | LF-002 embedded-blockmap metadata contract is enforced for both arch tokens and rejects stale standalone-blockmap expectations. | Temporary fixture files under `/tmp` only. |
| TEP-011 | Static workflow validation: no Linux `AppImage.blockmap`, macOS blockmaps remain, four validator invocations exist, Linux/publish jobs and upload/publish globs are correct, YAML parses. | Release workflow matches corrected LF-002 contract. | One-off static evidence; workflow is implementation artifact. |
| TEP-012 | Docs stale/positive grep across durable docs and requirements/design. | Docs no longer promise standalone Linux `.AppImage.blockmap`; they describe embedded `blockMapSize`. | One-off search evidence. |
| TEP-013 | Targeted packaged startup verifier with current ARM64 unpacked app if outputs are still present. | Prior ARM64 startup remains healthy after workflow/docs/script rework. | Runtime evidence only; no new durable coverage. |
| TEP-014 | `git diff --check`. | Workspace diff remains whitespace-clean after report updates. | One-off repository hygiene evidence. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Native Linux x64 package startup/metadata from a real x64 build on this host | Current host is Linux ARM64 and cross-arch packaging is intentionally unsupported locally. | Medium until CI/native x64 runner runs it. | Workflow validates on native x64 runner; API/E2E validates x64 metadata contract synthetically and workflow structure locally. |
| Actual GitHub Actions release run | Not available in local worktree. | Medium for workflow runtime issues not visible statically. | Static validation locally; CI/release path must execute workflow before publication. |
| Full model-driven Codex run against a live BrowserServer subprocess | Round 1 covered representative route/list/call, actual BrowserServer output shape, and event normalization deterministically; LF-002 did not alter this path. | Low to medium. | Round 3 focused regression remains evidence; delivery may note no live provider/browser run. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None before resumed final execution. | N/A | Code review Round 4 resolved LF-002 against superseding design. | N/A |

## Execution Plan

1. Run LF-002 validator and workflow checks (TEP-009 through TEP-012).
2. Rerun packaged startup verifier with current ARM64 unpacked app if available (TEP-013).
3. Run `git diff --check` after report updates (TEP-014).
4. Update the canonical execution report with Round 4 results.
5. If all checks pass and no API/E2E durable coverage code changed, hand off cumulative package to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: LF-002 has been code-reviewed as fixed. Final validation can resume with targeted release metadata/workflow checks and prior unaffected Round 3 package/browser evidence.
