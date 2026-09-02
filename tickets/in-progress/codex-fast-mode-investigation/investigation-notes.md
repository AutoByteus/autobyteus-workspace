# Investigation Notes

## Investigation Status

- Bootstrap status: Complete.
- Current status: Requirements approved; architecture design complete for review.
- Original diagnostic result: **The backend Fast implementation is correct. Shared-process tier pinning was disproved.**
- Approved follow-up: replace deprecated capability discovery only.
- Explicitly rejected follow-up: effective-tier header/runtime UI.
- Scope classification: `Small`.

## Request Context And User Decision

The user initially suspected that a shared same-workspace Codex app-server process might preserve Default and suppress later Fast runs. Direct probing disproved that. The user then agreed to fix deprecated capability discovery. After considering an effective-tier header badge, the user rejected it because global run headers must not contain model/runtime-specific state. The existing configuration form is the only desired user-facing Fast surface.

Reference screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_dfd262862a3e4a66b044794c1713eaf1/solution_designer_42e4b5c86f1242b794b72ff42712bd26/context_files/ctx_3920a91f1647__image.png`.

## Bootstrap Context

- Owning Git repository: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Dedicated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation`
- Task branch: `codex/codex-fast-mode-investigation`
- Refreshed base: `origin/personal` at `773bce779f195c22194c6bed1b242be6e222d06e`
- Remote refresh: `git fetch origin --prune` succeeded on 2026-09-01 before worktree creation.
- Expected finalization target: `personal`.
- Artifact folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation`
- Note: `/Users/normy/autobyteus_org/browser_docker` is the selected Codex execution workspace, not the repository owning this integration.

## Supplemental Artifact Inventory

| Artifact Path | Purpose | Related IDs | Status / Approval |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/fast-mode-probe-report.md` | Runtime, protocol, model-list, code-path, and real-run evidence | `REQ-001`–`REQ-006`; `AC-001`–`AC-010` | Complete / `N/A` evidence |

The rejected draft effective-tier UI/UX supplement was removed after the user declined that behavior; it is not part of the authoritative package.

## Source Log

| Date | Source / Command | Why Consulted | Finding |
| --- | --- | --- | --- |
| 2026-09-01 | Official OpenAI service-tier reference | Confirm current Fast contract | `fast`/`priority` are accepted Fast request vocabulary; effective Fast is `priority`. |
| 2026-09-01 | AutoByteus source/tests | Trace current Fast execution | Config reaches thread start/resume/every turn; client sharing is per workspace. |
| 2026-09-01 | Generated Codex 0.152 protocol types | Inspect current contract | `serviceTier` remains run-persistent; structured model-list tiers are current. |
| 2026-09-01 | Codex 0.152 same-process probe | Test suspected process pinning | One PID returned `default` -> `priority` -> `default`. |
| 2026-09-01 | Codex 0.151 executable probe | Verify active AutoByteus binary compatibility | 0.151 returns structured `serviceTiers` and effective `priority` for Fast. |
| 2026-09-01 | Historical AutoByteus tree/Codex logs | Verify real product path | Stored Fast reached multiple Codex turns as Fast. |
| 2026-09-01 | `codex-app-server-model-normalizer.ts` | Locate deprecated dependency | `toAdditionalSpeedTiers()` reads deprecated camel/snake fields and enables schema when array contains `fast`. |
| 2026-09-01 | Normalizer unit test | Identify implementation-scoped coverage | Current fixtures assert deprecated camel/snake metadata; must align to structured entries. |
| 2026-09-01 | Live catalog integration test | Identify downstream executable coverage | Its independent raw-capability projection also reads deprecated metadata and will require API/E2E validity/update investigation. |
| 2026-09-01 | Frontend config components/tests | Determine whether UI source must change | Existing generic schema-driven form already renders/removes the parameter; no frontend source change is needed. |

Official source: `https://developers.openai.com/api/reference/cli/resources/responses/methods/create` (consulted 2026-09-01).

## Current Relevant Behavior And Production Paths

| Behavior ID | Kind | Supported Trigger / Contract | Current Production Path | Finding / Approved Outcome |
| --- | --- | --- | --- | --- |
| `BEH-001` | User/System | User selects Fast | Config form -> `llmConfig.fast` -> launch/bootstrap -> start/resume/turn | Correct; preserve. |
| `BEH-002` | System | Runs share a normalized workspace | Thread manager -> client manager -> shared process -> distinct threads | Correct; preserve. |
| `BEH-003` | Contract | Codex receives `fast` | App server -> provider -> effective `priority` | Correct; preserve. |
| `BEH-004` | Contract/User | `model/list` advertises structured tiers and user opens configuration | `CodexModelCatalog` -> model normalizer -> generic config schema -> GraphQL/store -> generic form | Replace deprecated adapter field source with `serviceTiers[].id === "priority"`; preserve form contract. |
| `BEH-005` | User | User views an active run | Generic run header/status | No effective-tier UI change by explicit user decision. |

## Relevant Components

| Path / Component | Current Responsibility | Finding / Design Implication |
| --- | --- | --- |
| `autobyteus-server-ts/src/llm-management/services/codex-model-catalog.ts` | Owns Codex `model/list` pagination and feeds raw rows to the adapter | Preserve; no interface change. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` | Adapts raw Codex rows to generic `ModelInfo`/config schema | Correct owner for the clean-cut metadata-source change. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-app-server-model-normalizer.test.ts` | Deterministic adapter/config-schema coverage | Replace deprecated fixtures/assertions with structured tier cases; retain runtime config normalization coverage. |
| `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` | Live raw-to-catalog-to-GraphQL parity | Currently independently reads deprecated fields; candidate durable coverage update for API/E2E investigation. |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` / `ModelConfigAdvanced.vue` | Generic schema-driven configuration form | No change; it should receive the same schema shape. |
| Codex thread/runtime/header/status components | Execution and current-status presentation | Explicitly out of scope; no response parsing or UI badge. |

## Direct Probe Results

### Codex 0.152 shared-process isolation

- Requests on one process: Default -> Fast -> Default.
- Returned tiers: `default` -> `priority` -> `default`.
- Result: process reuse does not pin tier.

### Codex 0.151 structured capability

- Binary: `/Users/normy/.codex/packages/standalone/releases/0.151.0-aarch64-apple-darwin/bin/codex`.
- `gpt-5.6-sol` returned `serviceTiers: [{ id: "priority", name: "Fast", description: "1.5x speed, increased usage" }]`.
- It also returned deprecated `additionalSpeedTiers: ["fast"]`.
- Default -> Fast -> Default starts returned `default` -> `priority` -> `default`.
- Result: removing deprecated discovery is supported by both locally verified Codex versions.

### Real AutoByteus Fast evidence

- Team run: `software_engineering_team_18262a8ace9447e29f7f92b8940a94fd`.
- Thread: `01a053d0-2f86-71a3-b3f0-fd2074d0f02a`.
- Stored `service_tier: "fast"`; Codex logged Fast on multiple turns.

## Findings

1. Runtime Fast execution and shared-process architecture are correct.
2. The sole approved defect is deprecated capability parsing in the Codex model adapter and matching live parity coverage.
3. Both supported local Codex versions expose the canonical structured field, so a fallback is unnecessary.
4. Provider capability ID `priority` should enable the stable product config value `fast`; stored config must not change to `priority`.
5. Existing UI is generic and schema-driven, so no frontend source edit is warranted.
6. No effective-tier runtime state or UI is authorized.

## Design Health Assessment

- Change posture: cleanup.
- Root cause classification: `Local Implementation Defect`.
- Refactor posture: `Not Needed`.
- Existing owner/boundary/file placement remain healthy: one adapter already owns provider-to-product metadata translation.
- Design response: replace one private deprecated metadata parser with a structured-tier predicate and remove obsolete tests/branches.
- Forbidden shortcuts: no dual-read fallback, no provider metadata parsing in frontend, no runtime/header changes.

## Persisted Data Assessment

- Stored `llmConfig.service_tier: "fast"`: `Directly Usable — No Migration`.
- Capability catalog rows are runtime-derived, not durable application data.
- No existing execution tree, stored configuration, database schema, or history must change.

## Reproduction / Temporary Setup

- Required: logged-in local Codex account and installed 0.151/0.152 binaries.
- Probe scripts and generated schemas remain in `/tmp`; they are not repository artifacts.
- Probe processes terminated after execution.
- No credentials, keys, or persistent provider settings were modified.

## Notes For Architecture Reviewer

Review the clean-cut adapter change only. Reject any proposed effective-tier UI/transport addition or process-per-tier workaround as outside approved scope. Confirm that the design removes deprecated metadata reads rather than retaining a fallback and preserves the generic config-schema output/stored `fast` value.
