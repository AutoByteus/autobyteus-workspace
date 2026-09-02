# Docs Sync Report

## Scope

- Ticket: `codex-fast-mode-investigation`
- Current delivery revision: `DR-004`
- Trigger: `CRR-003` cumulative delivery handoff after implementation-source Pass and proportional durable test-code Pass for API/E2E `API-REV-002`
- Bootstrap base reference: `origin/personal@773bce779f195c22194c6bed1b242be6e222d06e`
- Integrated base reference used for docs sync: `origin/personal@bed4c05a1c7860c7bd392c61dd7d26c239598284`, integrated at ticket HEAD `a923fdf0a75b1a865a7dac6dcc2a2408bed22ac5`
- Post-integration verification reference: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/delivery-evidence/dr-004-post-acceptance-normalizer.log`; API/E2E authority remains `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-execution-coverage-report.md` (`API-REV-003`, Pass / 98.7%)

## Why Docs Were Updated

- Summary: Canonical Codex documentation no longer says deprecated `additionalSpeedTiers` / `additional_speed_tiers` enables Fast. It now records structured `serviceTiers[].id = priority` as the sole capability-discovery authority while preserving the distinct AutoByteus product/runtime value `fast`. The root runtime summary was also corrected so it does not describe the provider catalog as advertising a `fast` tier.
- Why this should live in long-lived project docs: Provider capability vocabulary (`priority`) and stored/submitted product vocabulary (`fast`) are deliberately different. Future catalog, normalizer, runtime, and UI maintainers need that boundary in canonical docs so deprecated discovery is not reintroduced and existing persisted configuration is not rewritten incorrectly.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Canonical Codex catalog, reasoning, Fast configuration, and runtime contract. | `Updated` | Replaced the stale deprecated-field authority with structured `serviceTiers[].id = priority`, explicitly rejected deprecated fallback, and preserved product/runtime `fast` plus Default omission. |
| `README.md` | Root user/developer summary of Codex runtime model configuration. | `Updated` | Replaced the ambiguous provider `fast` speed-tier description with structured provider ID `priority` and the distinct persisted AutoByteus value `fast`. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Generic schema-driven advanced configuration ownership. | `No change` | Its statement that a fast-capable model exposes the existing `service_tier` / **Fast mode** control remains accurate and provider-neutral. |
| `autobyteus-web/docs/settings.md` | Generic settings/configuration behavior. | `No change` | The UI still consumes the normalized schema and does not own Codex `serviceTiers` parsing. |
| `autobyteus-web/docs/agent_management.md` and `autobyteus-web/docs/agent_teams.md` | Persisted launch/member configuration behavior. | `No change` | Their stored `service_tier: "fast"` descriptions remain correct; no provider catalog contract is claimed there. |
| Project release/build guidance | Determine whether packaging, release, publication, or deployment instructions changed. | `No change` | This backend catalog-normalization fix changes no packaging or deployment method. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Provider-to-product runtime contract | Documented canonical structured tier-ID discovery, trim/case normalization, no deprecated fallback, stable `fast` configuration, and Default omission. | Make the long-lived Codex integration guide match the reviewed implementation. |
| `README.md` | User/developer runtime summary | Clarified that provider `priority` capability enables the existing Fast control and is not the persisted product value. | Prevent the root overview from preserving obsolete/ambiguous provider vocabulary. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Fast capability authority | Only canonical camel-case `serviceTiers` entries with a trimmed, case-normalized `id` equal to `priority` enable Fast discovery. Malformed, missing, non-priority, deprecated-only, and snake-case inputs fail closed. | `requirements.md`; `design-spec.md`; `implementation-handoff.md`; `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/codex_integration.md`; `README.md` |
| Provider/product vocabulary separation | `priority` is the provider catalog capability ID; `fast` remains the AutoByteus schema, persisted, and runtime request value. They are related by the existing normalizer but are not interchangeable storage values. | Same | Same |
| Preserved runtime and UI boundary | Fast still uses the existing generic configuration form and flows to thread start/resume/turn. Default remains omitted. No effective-tier header/status, public transport, GraphQL, or persistence change is introduced. | `requirements.md`; `fast-mode-probe-report.md`; `design-spec.md`; `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/codex_integration.md`; existing provider-neutral web docs remain authoritative |
| Persisted-data disposition | Existing `llmConfig.service_tier: "fast"` is directly usable; no migration, backfill, or rewrite to `priority` is required. | `requirements.md`; `design-spec.md`; `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/codex_integration.md`; `README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Deprecated `additionalSpeedTiers` / `additional_speed_tiers` capability authority | Canonical structured `serviceTiers[].id = priority` discovery | `autobyteus-server-ts/docs/modules/codex_integration.md`; `README.md` |
| Treating provider discovery and product submission as the same `fast` vocabulary | Explicit provider `priority` -> AutoByteus product/runtime `fast` mapping | Same |

No public API, database schema, persisted record format, UI surface, packaging path, or deployment component was removed.

## Verification

- Fresh Delivery refreshes left `origin/personal` unchanged at `773bce779f195c22194c6bed1b242be6e222d06e`; it is already an ancestor of reviewed/API-E2E-tested HEAD `06bcb57cf365ebc6ba12aef4ba4472e091fcd066` with divergence `3 ahead / 0 behind`.
- No merge or post-refresh duplicate executable rerun was required because no new base commit entered the validated state. `API-REV-003` validates the exact unchanged source/test HEAD through the requested real browser journey; Delivery changed only documentation and ticket-local artifacts.
- `git diff --check`, integrated ancestry, no-unmerged-path, durable doc assertion, deprecated production/live-projection absence, cumulative-artifact presence, Round 2/3 evidence presence, Round 3 cleanup, and residual-health-statement checks passed.
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/delivery-evidence/dr-001-integration-docs-handoff.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/delivery-evidence/dr-003-round3-return-handoff.log`.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: User verification and release authorization are complete. Archive the ticket, finalize the ticket branch and `personal`, publish stable `v1.4.65` with the documented release helper, verify rollout outputs, and perform safe cleanup.
- Notes: The Round 1 full live-enabled server command remains non-clean (`63` failed files / `177` failed tests) for broad unrelated/stale repository debt, while the exact changed-boundary catalog test passed inside that run and focused runs. The generic server typecheck remains unusable because of the pre-existing `rootDir=src` plus included-tests `TS6059` mismatch. Neither condition is relabeled as clean or attributed to this change.

## Blocked Or Escalated Follow-Up

`N/A — docs sync completed truthfully on the current integrated, reviewed, and validated branch state.`

## DR-002 Real-Browser Validation Re-entry

- Trigger: The user requested an additional full-stack browser journey after DR-001, and API/E2E Round 3 was recorded before service startup.
- Current docs impact: `No additional impact established yet.` The DR-001 documentation edits remain accurate for the last completed source/test state, but their final delivery authority is held until Round 3 completes.
- Authoritative pre-execution plan: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-coverage-investigation.md`.
- Result: `Pass for documentation status recording; delivery continuation held.` Do not infer the Round 3 browser result, cleanup result, or final acceptance from this entry.

## DR-003 Completed Real-Browser Re-entry Check

- `API-REV-003` passed at `98.7%` with the real isolated backend/frontend, Settings package import, Daily Assistant Codex Fast selection, live exact response, persisted/runtime `service_tier: "fast"`, WebSocket/publication correlation, and owned-state cleanup.
- Repository HEAD and durable code/test scope remained unchanged; `CRR-004` is correctly `Not Applicable` for Round 3 and preserves the prior review passes.
- The completed journey confirms the DR-001 documentation statements rather than changing the provider/product contract, persistence posture, UI ownership, packaging, or deployment method.
- Result: `Pass — no additional long-lived documentation edit required.` The existing README and Codex integration edits remain the authoritative documentation delta.

## DR-004 Post-Acceptance Integration Check

- The user explicitly accepted the DR-003 browser result and requested finalization plus release.
- The mandatory refresh advanced `origin/personal` from `773bce779f195c22194c6bed1b242be6e222d06e` to `bed4c05a1c7860c7bd392c61dd7d26c239598284` by six commits concerning agent-team handoff prompt selection and that ticket's records.
- Delivery protected the accepted state at `c91749e089ddd9658231eafb351918c22922e914`, merged the new base as `a923fdf0a75b1a865a7dac6dcc2a2408bed22ac5`, confirmed no overlap with the Codex implementation/docs paths, and passed the focused normalizer suite `10/10`.
- The new base does not change Fast discovery, stored/runtime `fast`, the generic configuration form, the real-browser journey, packaging, or release documentation. Renewed verification is not required.
- Result: `Pass — existing long-lived documentation remains accurate on the post-acceptance integrated state.`
