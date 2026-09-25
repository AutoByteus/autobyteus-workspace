# Investigation Notes — Runtime-specific stopped-run model switching

## Investigation Meta
- Package: `runtime-specific-stopped-model-switch`; investigation status: requirements approved, architecture investigation in progress; provider smaller-window execution unverified.
- Git task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch`; branch `codex/runtime-specific-stopped-model-switch`.
- Resolved base: refreshed `origin/personal` `a2694ed453e353550d8b345fa82ef489634dcaf2` (2026-09-25). Finalization target: `origin/personal` / `personal`, subject to delivery workflow.
- Bootstrap: clean isolated worktree, new canonical ticket artifacts; no earlier artifacts for this new package. Shared integration checkout was not edited. Current revision `SR-003`; approved requirements baseline `SR-002`.
- Related predecessor, read-only: `tickets/done/stopped-run-compatible-model/`.

## Initial Request And Clarifications
- User (2026-09-25): “user should be able to switch to any model provided by the runtime as long as its not autobyteus our runtime ... other runtime ... antigravity, claude codex ... currently we support switch model, but not like how i described here.” Requests analysis, not a direct implementation order.
- User image: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_c4679009eae342829ca9397f5224a9d7/solution_designer_ccc76494f523485bb3ce745671dd8b90/context_files/ctx_2e4254c59c0d__image.png`. Claude Agent SDK stopped Team Settings; saved `claude-fable-5-1[1m]` is the only displayed picker item; UI says replacement context ≥ saved model. Orange “Saved value is unavailable in current options” appears under **workspace**, not under model, so it is a separate observation.
- Clarification/approval received 2026-09-25: “yes. basically no need to consider context sidze for those runtime. because its handled by those runtimes right? it should not be blcoked by our platform”. This confirms no platform capacity gate for external runtimes, including smaller/unknown-capacity catalog models, across the presented stopped Agent/Team/Org scope. External runtime context ownership is approved, with visible failure/no silent history reset rather than an unproven universal-success guarantee.

## Product And Domain Understanding
- Product area: existing stopped-run Settings of standalone Agent, configured Team and Agent Org scopes. Runtime is fixed; model identifier and model-specific settings form the editable selection. The normal next message restores the saved run/provider binding.
- Current policy was introduced by the completed `stopped-run-compatible-model` package with explicit 2026-09-08 approval; new user request changes that policy only for external runtimes.
- Runtime kinds in `runtime-kind-enum.ts`: AutoByteus, Claude Agent SDK, Codex App Server, Antigravity CLI. `isExternalProviderRuntimeKind` names the latter three.

## Source Log
| ID | Type / exact source or command | Observation / implication |
| --- | --- | --- |
| E01 | User screenshot absolute path above; viewed in request | Claude Team picker presents only saved model and universal capacity help; this alone does not prove what the runtime catalog returned. Workspace warning is distinct. |
| E02 | `autobyteus-server-ts/src/llm-management/services/run-model-selection-service.ts` | `optionsWithEvidence` resolves capacities and returns only `capacity >= current`; unknown current returns no options. `validateWithEvidence` rechecks both capacities and rejects smaller/unknown. This is the authoritative shared gate. |
| E03 | `autobyteus-server-ts/src/llm-management/services/runtime-model-capacity-service.ts`; `antigravity-model-catalog.ts`; `runtime-management/antigravity-cli-capability.ts` | Antigravity capacity is deliberately always unknown, while `agy models` supplies catalog slugs. Thus current policy makes every Antigravity replacement ineligible despite model discovery. |
| E04 | `autobyteus-server-ts/src/run-history/services/studio-run-model-config-service.ts`; `src/agent-org-execution/services/agent-org-run-service.ts`; `src/api/graphql/types/run-model-config.ts` | Agent, Team and Org options all call the shared selection service. GraphQL `RunModelOption.contextTokens` is currently non-nullable Float, a concrete contract implication if external options lack capacity. |
| E05 | `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue`; `autobyteus-web/types/agent/ExistingRunModelConfigDraft.ts`; `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` | Picker displays only saved/current plus server replacements; rejects nonlisted selection locally. Copy and loading/error states presume capacity policy for all runtimes. |
| E06 | `autobyteus-server-ts/tests/unit/llm-management/run-model-selection-service.test.ts` | Existing tests explicitly require equal/larger positive capacity for Codex, reject unknown/decreasing, and cover fresh validation and same-model settings. They encode the current rather than desired rule. |
| E07 | `tickets/done/stopped-run-compatible-model/requirements-doc.md` RER-004; `release-notes.md`; `design-spec.md` | Explicit prior approval and delivered rule: fixed runtime, verified target capacity ≥ saved for all runtimes; smaller/unknown unsupported. This user request cannot be deemed already approved. |
| E08 | `autobyteus-server-ts/src/agent-execution/backends/{codex/thread/codex-thread-manager.ts,claude/session/claude-session.ts,antigravity/backend/agy-agent-run-backend-factory.ts}` | Restore paths pass the saved model with existing thread/session/conversation binding. Antigravity checks exact conversation ID and selected model. These are feasibility evidence, not a successful small-context-switch test. |
| E09 | `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue`; `autobyteus-web/docs/settings.md:975–1055`; `autobyteus-web/docs/agent_orgs.md:300–310` | Current Settings supports Agent/Team/Org stopped config, uses the same option structure, and documents non-decreasing policy. Org is a real current product surface, not a synthetic new workflow. |
| E10 | `tickets/done/stopped-run-compatible-model/handoff-summary.md`; `api-e2e-execution-coverage-report.md` | Live Codex Luna→Astra stopped Team Save and same provider/local identity continuation passed with equal 272k capacities. Prior report explicitly did **not** test live Claude/native replacements or smaller-context matrix. |
| E11 | Official [Antigravity headless docs](https://antigravity.google/docs/cli/headless/) and [CLI changelog](https://www.antigravity.google/changelog), checked 2026-09-25 | Official docs show `--conversation` continuation and `--model` selection, and changelog documents mid-conversation model execution. This supports plausibility, not proof that every saved AutoByteus-integrated Antigravity conversation can switch to every smaller model. |
| E12 | `autobyteus-web/components/workspace/config/WorkspaceSelector.vue`; `TeamScopeConfigEditor.vue` | The orange screenshot warning is generated by workspace selector; model help is passed via `fixedIdentity`. Do not conflate these issues. |
| E13 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-service.ts`; `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue` | Org lists options and edits configured scopes through existing stopped-run editor. Shared service policy changes would affect it even if only Agent/Team UI were considered. |
| E14 | `git fetch origin personal`; `git worktree add -b codex/runtime-specific-stopped-model-switch ... origin/personal`; `git status --short --branch` | Base refreshed; isolated worktree clean before task docs. |
| E15 | User reply 2026-09-25 quoted above | Explicit approval of REQ-001–007/AC-001–009 baseline; removes our external capacity gate without changing the AutoByteus rule. |

## Relevant Existing Behavior And Supported Product Paths
| BEH | Supported trigger | Current path/outcome | Evidence / confidence |
| --- | --- | --- | --- |
| BEH-001 | Open existing stopped Agent/Team/Org Settings | Catalog loads; capacity filter constructs options; UI shows saved plus eligible replacement only. | E01–E06/E09, high static confidence; live Claude catalog values not measured. |
| BEH-002 | Save changed model/settings | Fresh server catalog/capacity/schema validation; changed selection saved or rejected. | E02/E04/E06, high static confidence. |
| BEH-003 | Save AutoByteus switch | Same capacity rule as all runtimes; native capacity comes from verified metadata. | E02/E03/E07, high static confidence. |
| BEH-004 | Normal resume after stopped Save | Restore adapters pass persisted model and binding. | E08/E10; actual smaller-window continuation unverified. |
| BEH-005 | Inspect Settings status/copy | Universal context-capacity text and capacity-specific no-choice messaging. | E01/E05/E12, high confidence. |
| BEH-006 | Edit configured Team/Org scopes | Same option service per scope; existing scope propagation/atomic Save semantics. | E04/E09/E13, high confidence. |

## Relevant Codebase And Technical Facts
- Root cause of apparent one-choice picker: filtering occurs in the shared server `RunModelSelectionService`, then again in the frontend allowed-ID projection. Merely changing copy or frontend filtering would still fail server Save. Conversely only relaxing server validation would leave the UI without options.
- Antigravity is a particularly decisive counterexample: current capacity service returns unknown for all Antigravity models, so all actual replacement attempts fail capacity validation. No need to invent capacity values to solve the user's proposed eligibility rule.
- Claude/Codex capacity readers may produce verified values; a 1M saved model can exclude available smaller targets. Exact live catalog contents for the user's machine remain unknown; the screenshot demonstrates the resulting picker state, not the upstream rows.
- Option contract currently has non-null `contextTokens`, even though external options would not need/always have it. Future architecture must reconcile GraphQL, frontend types and rendering without fabricating zero/guessed capacity.
- Existing current-model settings do not call the capacity reader. Preserve that fact. Catalog membership and target settings schema remain separate mandatory validity checks.
- Org is now an existing consumer of the same shared service; a shared policy change reaches it. It should be named in approval rather than accidentally included or forked.

## Structural And Payload Surface Inventory
- Payload: runtime-catalog model IDs, nullable capacity facts, saved model/settings pair, localized copy, docs, fixtures.
- Structural: shared server selection/validation service; runtime catalog/capacity service; GraphQL option type; web picker and draft option type; Agent/Team/Org stopped Save and restore lifecycles. There is likely an API contract change to make external option capacity optional/meaningful, but target design is not yet selected.
- Persistence shape: existing records already store model identifier/settings. Desired behavior changes the eligibility invariant, not necessarily stored schema. No bulk migration is inferred.
- Lifecycle/security: preserve stopped-only, ownership, configured-scope, all-before-write and same-binding restore guards.

## Runtime, Probe, Or Reproduction Findings
- Static source and predecessor validation report inspected; no production app, provider inference, browser, Electron, or test suite was executed for this analysis. No claim of feature acceptance.
- Screenshot reproduction is user-provided, not independently re-run. Prior Codex equal-capacity continuation evidence E10 is historical and does not prove the new smaller/unknown-capacity cases.

## Stakeholder And User Evidence
- High-authority approved intent: external runtimes should allow any runtime-provided model, including downward/unknown capacity, without our context-size gate; AutoByteus should not be loosened. User explicitly approved the presented baseline on 2026-09-25.
- User did not request Product Design/prototyping or new visual layout. Screenshot provides a current-surface example.
- Provider-native handling of oversized context and universal pair compatibility are unverified. Distinguish product entitlement to choose from a claim every provider execution succeeds.

## External Contracts And Dependencies
- [Official Antigravity headless docs](https://antigravity.google/docs/cli/headless/) show model selection/continuation commands, but do not establish universal arbitrary model-pair history compatibility in this integration.
- Claude Agent SDK and Codex App Server are represented by current local adapters E08. Do **not** substitute Claude Managed Agents session rules for the different Claude Agent SDK integration. No universal vendor guarantee asserted.
- Current authentication, plan, catalog availability, model-specific settings and provider errors remain legitimate runtime conditions.

## Persisted Data And State Facts
- Agent metadata and Team/Org execution trees store runtime/model/settings with existing provider binding. Readers are stopped Settings and normal restore; writers are existing stopped-save owners. No source edits were made.
- Preserve saved conversation/transcripts, summaries, local/provider IDs and unaffected configured scopes. No Save-time loss/reset acceptable. A later provider-native compaction may alter effective context; raw retained history need not be identical to the model's next prompt.
- Volume: per selected run/tree; production counts unknown. No migration or downtime obligation inferred.

## Product Design Request Context / Findings
- Product Design request: Not stated. Product-owned prototype, UI/UX spec, ticket/review URL and final visual references: N/A — not applicable. Existing UI component and screenshot are enough to define the bounded option/copy behavior for approval; no Product handoff made.

## Supplemental Artifact Inventory
| Artifact | Owner | Purpose / scope | Status / approval |
| --- | --- | --- | --- |
| User screenshot absolute path above | User | Current Claude Team Settings state, BEH-001/005 | Evidence only; not normative new UI. |
| `tickets/done/stopped-run-compatible-model/` | Prior team | Prior authority/evidence, REQ-003/005 | Delivered read-only predecessor, not approval of new policy. |

## Assumptions, Unknowns, And Risks
| ID | Type | Finding | Resolution |
| --- | --- | --- | --- |
| DEC-001 | Intended-behavior decision | Include smaller and unknown-capacity external catalog targets. | Resolved: explicit 2026-09-25 approval. |
| DEC-002 | Intended-behavior decision | Apply to existing Agent, Team and Org stopped Settings. | Resolved: approval of presented scope. |
| DEC-003 | Intended-behavior decision | Runtime-native later compaction/rejection allowed; no guarantee every history pair succeeds; never silently reset. | Resolved: approval of presented caveat. |
| RISK-001 | Risk | A smaller model may reject a long prior conversation or compact differently. | Real provider test matrix and visible failure handling downstream. |
| RISK-002 | Risk | Existing GraphQL/UI capacity field assumes a number. | Architecture design after approval. |
| RISK-003 | Risk | Catalog list can change between display and Save. | Existing fresh Save validation retained. |

## Architecture Investigation Findings
Architecture investigation began after the SR-002 approval. These are current-state facts, not target design decisions.

| ID | Exact source / command | Observation / implication |
| --- | --- | --- |
| AE-01 | `src/llm-management/services/run-model-selection-service.ts:26–128` | One owner builds options and validates Save. `validateMany` coalesces catalog and capacity evidence per runtime/workspace. Capacity is only needed for AutoByteus under the approved rule, but current shared evidence path gathers replacement IDs for every runtime. |
| AE-02 | `src/llm-management/services/runtime-model-capacity-service.ts`; `src/runtime-management/{codex/client/codex-model-capacity-reader.ts,claude/client/claude-sdk-context-capacity.ts}`; `src/runtime-management/claude/client/claude-sdk-client.ts:257–269`; `rg -n 'RuntimeModelCapacityService|resolveContextCapacities|CodexModelCapacityReader|readClaudeContextCapacities' autobyteus-server-ts/src autobyteus-server-ts/tests` | External capacity readers exist solely for stopped-run selection and become obsolete if the new rule is applied; no other production caller found. Native provenance check must remain. |
| AE-03 | `src/agent-execution/services/standalone-agent-run-lifecycle-service.ts:84–174`; `src/agent-team-execution/services/agent-team-run-manager.ts:234–328`; `src/agent-org-execution/services/agent-org-run-manager.ts:225–321` | Each stopped-save owner performs lifecycle/ownership/target checks, uses the shared validator, and commits only after successful validation. Restore paths remain separate and already consume persisted model. No need to alter these guards/writers to implement eligibility. |
| AE-04 | `autobyteus-web/stores/existingRunConfigStore.ts:68–145,357–443`; `services/runConfigEditing/{existingAgentModelConfigDraft.ts,existingRunModelOptionsClient.ts}`; `components/launch-config/RuntimeModelConfigFields.vue:190–215,326–347` | UI options drive both visible IDs and Save enablement. The web store already handles Agent/Team/Org and treats server options as authority; selector status text is capacity-specific and needs accurate runtime-sensitive copy. No extra draft/persistence protocol is required. |
| AE-05 | `src/api/graphql/types/run-model-config.ts:29–49`; `autobyteus-web/graphql/queries/runModelOptionsQueries.ts`; `types/agent/ExistingRunModelConfigDraft.ts`; `generated/graphql.ts`; repo-wide `rg -n 'currentContextTokens|contextTokens'` excluding tickets/dist | Numeric option capacities are present in public GraphQL and generated/web types but are not read by production UI logic, only fixtures/tests. They can be removed from the option contract instead of fabricated for unknown external capacities. `shell.tokenUsage.contextTokens` is unrelated token-usage UI. |
| AE-06 | `autobyteus-web/components/workspace/config/{AgentRunConfigForm.vue,TeamScopeConfigEditor.vue}`; `localization/messages/{en,zh-CN}/workspace.ts`; `autobyteus-web/docs/{settings.md,agent_orgs.md}` | Universal capacity text is passed into both runtime-help and model-help props for existing Agent/Team/Org scopes; docs also describe universal non-decreasing eligibility. All require synchronization with approved policy. |
| AE-07 | Read-only Node key/size inventory of `/Users/normy/.autobyteus/server-data/memory/{agents,agent_teams,agent_orgs}` on 2026-09-25 (no conversation content printed) | Local samples: 459 Agent `run_metadata.json` files, 358734 bytes; 540 Team V2 trees, 2716678 bytes; 23 Org V1 trees, 448941 bytes. Representative records already have runtimeKind, llmModelIdentifier, llmConfig; Team/Org configured launch objects also have these fields. Counts are local, not production estimates. Current readers/writers need no stored-shape change. |
| AE-08 | `autobyteus-web/codegen.ts`; `package.json` codegen script | Generated frontend GraphQL types are derived from the running backend URL and changed operation documents; implementation must regenerate/synchronize them with the changed schema instead of hand-patching or retaining old fields. |
| AE-09 | `autobyteus-web/composables/useRuntimeScopedModelSelection.ts`; `components/launch-config/RuntimeModelConfigFields.vue` | Frontend fetches provider/model catalog separately for labels/schema. Server option IDs are filtered through this local grouped catalog. A temporary mismatch should be retried or surfaced, not silently interpreted as capacity ineligibility. |

Persistence transition input: only stored model/settings **values** change through the already-existing Save path; Agent metadata and Team/Org tree shape, schema version, exact provider ID, and readers stay the same. The local representative key inventory plus AE-03 support `Directly Usable — No Migration`; no bulk rewrite or dual-shape compatibility path is justified. The existing runtime-owned provider continuation may compact/reject after Save; validation owns proving representative actual cases, not a new Save-time data transform.

## Requirement Implications / Notes For Architecture Design
The apparent restriction is a deliberate, server-enforced cross-runtime policy, not just a dropdown bug. Approved behavior is runtime-specific eligibility: external = currently offered catalog model + valid target settings, AutoByteus = current verified non-decreasing capacity rule. Apply consistently to option discovery and Save; keep fixed runtime, stopped lifecycle, configured-scope semantics, durable identity/history and normal provider context ownership. The shared GraphQL option capacity field and universal UI copy require attention; target technical choices are in `design-spec.md`, not in these evidence notes.
