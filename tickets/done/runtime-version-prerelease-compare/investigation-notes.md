# Investigation Notes

## Investigation Meta

- Package identifier: `runtime-version-prerelease-compare` (Project Task `autobyteus-393`, item 1 only)
- Request / ticket: autobyteus-393 item 1 (FU-002 of autobyteus-387)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-version-prerelease-compare`
- Repository mode: `Git`
- Task worktree / branch: same path, `codex/runtime-version-prerelease-compare`
- Resolved base remote / branch / revision: `origin/personal` at `b78fd86fe4` (fetched 2026-11-06)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: the first `git worktree add` was interrupted mid-checkout and left a folder with no worktree record. That folder and its empty branch were removed and the worktree was created again cleanly at the same base.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/project-documents.md` (read earlier in this conversation; `DESIGN.md` unchanged since then, `git diff 3ef5e33eec HEAD -- DESIGN.md` empty)
- Investigation status: Complete

## Initial Request And Clarifications

- Request (Task description): "FU-002: the Agent Runtimes page drops prerelease suffixes … Direction from the team (leads): read the full semver, compare with semver precedence for every runtime, add a unit case for 0.2.2-rc.1 versus 0.2.2."
- User's word (Task comment, 2026-11-06): "yesss. should definitely be fixed i think" — dispatched for item 1 only.
- Item 2 (dsh in the release smoke check) is the user's decision and is not part of this work.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-06 | Code | `autobyteus-server-ts/src/runtime-management/agent-runtimes/runtime-version.ts:4-17` | The reader | `extractRuntimeVersion` takes the first `(\d+)\.(\d+)\.(\d+)`; `compareRuntimeVersions` compares three numbers | — |
| 2026-11-06 | Code | `grep extractRuntimeVersion\|compareRuntimeVersions\|readRuntimeVersion` | Callers | Five strategies (Codex `:46`, Antigravity `:38`, Grok `:27`, Claude `:63`, dsh `:36`) extract the latest version; `readRuntimeVersion` reads the installed one; `agent-runtime-status-service.ts:200,299,341` compare | — |
| 2026-11-06 | Code | `runtime-management/grok/grok-build-capability.ts:50-58,93-94`; `runtime-management/antigravity-cli-capability.ts:119-133` | Other version policy | Two private copies of the same parse/compare for minimum-version gates (`GROK_BUILD_MINIMUM_VERSION` `1.0.41`, `AGY_COMPACTION_DETECTION_MIN_VERSION` `1.2.16`) | Folded into the one owner (DEC-002) |
| 2026-11-06 | Command | `claude/codex/grok/agy --version`; `/tmp/ab387-dsh-bin/dsh --version` | Real version texts | `2.1.318 (Claude Code)`; `codex-cli 0.167.0`; `grok 1.0.77 (50ca579fa996) [stable]`; `1.5.2`; `0.2.2-rc.1` | Parser must stop at whitespace |
| 2026-11-06 | Code | `agent-runtime-status-service.ts:180-205,290-302,330-348`; `agent-runtime-types.ts:50` | Persistence | Versions live only in memory (status rows); nothing stored | No data transition |
| 2026-11-06 | Evidence | autobyteus-387 API-30 (archived `api-e2e-execution-coverage-report.md`) | Observed defect | Row "Installed Version 0.2.2 … Up to date" while `dsh --version` prints `0.2.2-rc.1` | — |
| 2026-11-06 | Code | tests `agent-runtime-strategies.test.ts`, `agent-runtime-status-service.test.ts`, `agent-runtime-update-automation.test.ts`, `grok/grok-build-capability.test.ts`, `antigravity-cli-capability.test.ts:221-222` | Existing coverage | No direct unit test of the reader; gates tested through their probes | Add `runtime-version.test.ts` |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User opens Settings → Agent Runtimes | `AgentRuntimeStatusService.check` → `strategy.readVersion` (`readRuntimeVersion` → `extractRuntimeVersion`) and `readLatestVersion` (→ `extractRuntimeVersion`) → `compareRuntimeVersions(latest, installed)` → row `installedVersion`, `latestVersion`, `updateState` | Prerelease suffix dropped: `0.2.2-rc.1` shown as `0.2.2`; a stable `0.2.2` against an installed `0.2.2-rc.1` reads "Up to date" | Code, API-30 | Reproduced (API-30) / Read |
| BEH-002 | User | User runs an update from the page | `update` → `readVersion` after the command → `compareRuntimeVersions(version, fromVersion) > 0` decides "succeeded" (`:341`) | `0.2.2-rc.1 → 0.2.2` would count as not updated | Code | Read |
| BEH-003 | System | Runtime readiness | Grok minimum-version gate (`grok-build-capability.ts:93-94`); AGY compaction-detection gate (`antigravity-cli-capability.ts:127-133`) | Private parse/compare; prerelease ignored (`1.0.41-rc.1` passes `1.0.41`) | Code | Read |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `runtime-version.ts` | Shared extract/compare | REQ-001/002 | Owner of the full semver rule |
| `grok-build-capability.ts:50-58` | Private `compareVersions` | REQ-003 | Use the shared owner |
| `antigravity-cli-capability.ts:121-133` | Private `parseVersion` | REQ-003 | Use the shared owner |

## Structural And Payload Surface Inventory

- Payload: none.
- Structural: one shared module and its callers; no API, contract, persistence, security or concurrency change.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| `--version` of each installed runtime | Real texts | Listed in Source Log | Reproduced | Parser stops at whitespace and does not take parenthesised hashes | — |
| autobyteus-387 API-30 | dsh row | `0.2.2` shown for `0.2.2-rc.1` | Reproduced (by API/E2E, archived) | REQ-001 | archived `api-e2e-execution-coverage-report.md` |

- Temporary diagnostics: None.
- Reproduction for implementation to start from: the new unit cases (design spec) fail on the current code: `extractRuntimeVersion("0.2.2-rc.1")` returns `"0.2.2"`, and `compareRuntimeVersions("0.2.2", "0.2.2-rc.1")` returns `0`.

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Semantic Versioning 2.0.0 | semver.org §9–§11 | Prerelease `-` followed by dot-separated identifiers `[0-9A-Za-z-]`; build metadata `+…` ignored for precedence; precedence: core numerically, then a version with a prerelease is lower, identifiers compared numeric-numerically, alphanumeric in ASCII order, numeric lower than alphanumeric, a longer set is higher when all preceding are equal | Standard | — |

## Persisted Data And State Facts

- Not affected: versions are in-memory status fields (`agent-runtime-status-service.ts`).

## Product Design Request Context

- Not stated.

## Supplemental Artifact Inventory

None.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | A runtime prints a non-semver suffix right after `x.y.z` with a hyphen | It would be read as a prerelease | None of the five real texts does (Source Log) | Accepted |

## Architecture Investigation Findings

- One owner (`runtime-version.ts`) is used by the status service and every strategy; two minimum-version gates keep private copies of the same rule.

## Requirement Implications

- Full `x.y.z[-prerelease]` everywhere a runtime version is read; one semver precedence rule.

## Notes For Architecture Design

- Keep the function names; change their rule; make the two gates call them.
