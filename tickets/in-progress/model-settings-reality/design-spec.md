# Design Spec — model-settings-reality

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (revises SR-002 after ARCH-REV-001: AR-001..AR-003, R-3, R-4)
- Approved requirements baseline: [requirements-doc.md](requirements-doc.md) at SR-002 (unchanged by SR-003, which revises only the design) (SR-001 baseline + SR-002 design-driven clarifications DEC-013/DEC-014, REQ-007/REQ-008 wording); approved by the Solution Designer within the direction, user informed (SR-001: 2026-11-10 message; SR-002: handoff message of this design, 2026-11-10). The user said "if you think it's clear now, then we could start to work on it now" (2026-11-10).
- Behavior-defining supplements: None
- User approval of the design: `Not required` (the direction does not ask for design approval)
- Design status: `Ready`
- Canonical investigation-notes path: [investigation-notes.md](investigation-notes.md)
- Authorities read (2026-11-10): `references/architecture-design.md`, `references/design-principles.md`, `references/handoff.md`, `references/project-documents.md`, `templates/design-spec-template.md`; project `DESIGN.md` (root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–2, `GLOSSARY.md`, `autobyteus-server-ts/docs/modules/llm_management.md` (Claude mapping, ensure/reload sections), `autobyteus-ts/docs/llm_module_design*.md`, `autobyteus-ts/docs/provider_model_catalogs.md` (extraParams contract)
- Project design-principle conflicts or discrepancies: None. Noted (not changed here): the server validator drops undeclared standard fields such as `temperature` on validated save paths while the application portable launch contract accepts them (pre-existing; this design keeps standard fields out of its projection rule, see DEC-013).

## Current-State Read

- **AutoByteus Claude requests:** catalog schema → web menu → stored `llmConfig` → `LLMFactory.createLLM` (`composeEffectiveConfig`, llm-factory.ts L175-190) → `applyRawLlmConfigOverrides` (unknown keys → `extraParams`, llm-config-overrides.ts L187-191) → `AnthropicLLM.applyAnthropicRequestParams` (anthropic-llm.ts L203-246) using `resolveAnthropicModelRequestPolicy`. Opus 5/Fable 5/Fable 5.1 have off shape `omit` (policy L38-40); Fable 5 offers a switch it cannot honor; switch rows default to `false` (catalog). Measured: BEH-001..004 (PRB-A2).
- **Claude Agent SDK sessions:** SDK `supportedModels()` → `toModelInfo` builds `thinking_enabled` (default false) + effort (default `medium`) for every adaptive model (normalizer L39-68) → stored config → `buildClaudeSessionConfig` (session-config L27-48) → query options `thinking`, `effort` (claude-sdk-client L348-349) → CLI. Measured: Off is ineffective (PRB-A1).
- **Raw forwarding:** five adapters spread remaining `extraParams` into requests (SRC-011). External runtime backends already read only their own keys (`claude-session-config.ts` L34-35, `codex-app-server-model-normalizer.ts` L21/L29, `acp-session-launcher.ts` L80-83).
- **New runs:** `AgentRunProvisioningService.validateAndPrepareRunInput` stores `input.llmConfig` unchanged (L265); `TeamRunService.createTeamRun` (L132-141) and `createTeamRunFromRootConfig` (L174-183) likewise. Validated paths (stopped saves, delegated, Org launch, collaborator launch, model routing) already store the validator's canonical config (autobyteus-8 SR-005).
- **Model lists:** server reads each runtime's list per request (`ModelCatalogService.runtimeModelSelectionCatalog` L166-185; Claude spawns a CLI control query per read, `ClaudeSdkClient.listModels` L174-196, ≈2.3 s, failures return `[]`); validation reads fresh per Save (`RunModelSelectionService` L49-85). The web keeps one list per runtime for the app's lifetime (`llmProviderConfig.fetchProvidersWithModels` L190-193); `refreshLocalCatalog` (L243-246) flips the snapshot to `idle`/`loading`; only Retry-after-error and provider settings call it. Locked run-settings menus get server options per editor open (`existingRunModelOptionsClient.ts` L14, `delegatedLaunchSelectionClient.ts` L85).
- **Refusals:** eight sites word "unavailable" themselves (SRC-022 + `agent-org-run-service.ts` L160-170, `launch-usability-check.ts` L60-66, `model-routing-settings.ts` L110-115); read failures and "not offered" share `model_unavailable` (run-model-selection-service L58-69). The web marks scopes on `MODEL_UNAVAILABLE`/`SCHEMA_UNAVAILABLE` (`existingRunConfigResultActions.ts` L84).
- **Existing rule reused:** "an available runtime always offers a model: an empty list is a failed read" (`available-agent-runtimes-service.ts` L262-263).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: three packages (`autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web`) and five areas: Anthropic catalog/policy/adapter; config projection in `LLMFactory`; Claude SDK schema/session/client; run creation (agent + team); model-list refresh across the web store, two picker families and run-settings menus; validation result kinds and refusal wording at eight server sites; docs and glossary. Roughly 30 production files plus tests.
- Architectural risk: `High`
- Risk rationale: shared contracts change — `RunModelSelectionValidationResult` gains `model_list_unavailable` and a GraphQL outcome `MODEL_LIST_UNAVAILABLE`; `ModelCatalogService.runtimeModelSelectionCatalog` throws on an empty external list (consumers: availability, GraphQL catalog, validation); the documented `LLMFactory` raw-config contract changes (unknown provider keys no longer flow to `extraParams`); stored run configs are projected at creation (persistence writer behavior); a web store gains background refresh with concurrency (coalescing, late-response ordering).
- Escalation trigger: return a Design Impact if (a) a production caller relies on undeclared keys reaching a provider (e.g. an application using `extra_params` for a schema-less model), (b) projection at creation needs a runtime catalog read for correctness, (c) a Claude SDK/CLI version honors `thinking: disabled` for a current model (RSK-001), (d) explicit adaptive thinking is rejected live for Fable 5/5.1 (measured accepted, PRB-A3), (e) the web cannot keep a list usable during refresh without changing the GraphQL catalog query.

## Architecture Investigation Evidence

| Source | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `autobyteus-ts/src/llm/llm-factory.ts` L175-190, L197-219 | `composeEffectiveConfig` has the model (incl. `configSchema`) and the raw stored config | Projection owner for runtime (DS-001) | — |
| Code | `autobyteus-ts/src/llm/utils/llm-config-overrides.ts` L7-41, L113-191 | Owns standard vs extra key classification; unknown top-level keys and `extra_params` entries → `extraParams` | Projection rule lives here | — |
| Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/available-llm-construction.ts`; `autobyteus-agent-run-backend-factory.ts` L416-419 | Server passes the stored raw record to `createLLM` | Runtime projection covers every AutoByteus run, new or resumed | — |
| Code | `application-portable-launch-config-schemas.ts` L55-90; `application-portable-launch-config-policy.ts` L135-150 | Applications may set AutoByteus model settings only via `extra_params`; Claude runtime: `thinking_enabled`, `reasoning_effort` | Projection includes the `extra_params` container (DEC-013); portable schema unchanged (DEC-015) | No in-repo application uses `extra_params` or `thinking_enabled` (`rg`) |
| Code | `autobyteus-ts/src/llm/api/anthropic-llm.ts` L111-246 | `adaptive_required` fails locally on stored `false`; `omit` branches L183, L199 | `adaptive_required` for every always-on row (AR-003); projection keeps stored `thinking_enabled` away from it` mode; remove `omit` | — |
| Code | `claude-session-config.ts`, `claude-sdk-client.ts` L67, L348; normalizer L39-115 | Only consumers of SDK `thinking`; `supportsAdaptiveThinking` read only in the normalizer | Removal list | — |
| Code | `agent-run-provisioning-service.ts` L220-268; `team-run-service.ts` L114-190 | New-run creation entry points | Creation projection points (DS-003) | — |
| Code | `run-model-selection-service.ts` L49-85; refusal sites (Current-State Read) | One kind for two causes; eight wordings | New result kind + one wording owner (DS-006) | — |
| Code | `available-agent-runtimes-service.ts` L240-264 | Empty external list = failed read | Rule moves to the catalog owner | — |
| Code | `autobyteus-web/stores/llmProviderConfig.ts` L190-246; `composables/chat/useChatModelCatalog.ts`; `components/chat/ChatModelMenu.vue` L245-266; `useRuntimeScopedModelSelection.ts` L105-127 | Cache, open hooks (availability re-check on open), Retry | Store-owned refresh; pickers call it (DS-004) | — |
| Probe | PRB-D1/D3 | Fresh server reads; ≈2.3 s per Claude read | Background, coalesced refresh; no creation-time catalog read | — |
| Probe | PRB-A1/A2 | Off behavior per model and runtime | Policy/schema decisions | RSK-001 |

## Intended Change

Make every offered model setting real and its default the provider's (Part A), keep undeclared stored settings away from providers and new runs (Part B), sync the LLM docs (Part C), and let every model picker re-read its runtime's list on open and on demand, with actionable refusals when a Save names a model the runtime no longer offers or whose list cannot be read (Part D).

## Change Scope (Mandatory)

- In scope: UC-001..UC-006. Areas: Anthropic catalog/policy/adapter (`autobyteus-ts/src/llm`), raw config projection (`llm-config-overrides.ts`, `llm-factory.ts`), autobyteus-ts LLM docs; Claude SDK model normalizer, session config and client options; new-run config projection (agent provisioning, team creation) with per-runtime setting keys exported by each backend reader; `ModelCatalogService` empty-list rule; `RunModelSelectionService` result kinds; one refusal wording owner used by the eight refusal sites; web catalog store refresh, chat model menu, launch-config model fields (desktop, mobile, application editors), run-settings locked menus, result-state handling, i18n; server `llm_management.md`; `GLOSSARY.md` entries.
- Derived consumers (complete list, ARCH-REV-001 AR-001; searches: `rg "runtimeModelSelectionCatalog|\.listLlmModels\(|resolveExactCurrentLlmModel|listProviderModelCatalogSnapshots"` and `rg "model_unavailable|schema_unavailable"` in `autobyteus-server-ts/src`, 2026-11-10):
  1. `RunModelSelectionValidationResult` (new `model_list_unavailable`):
     - The eight refusal sites (`delegated-launch-selection-command.ts`, `team-run-delegated-launch-plan.ts`, `standalone-stopped-run-selection-updater.ts`, `standalone-agent-run-root-manager.ts`, `agent-org-run-manager.ts`, `agent-org-run-service.ts`, `launch-usability-check.ts` `invalidModelMessage` L61-66, `model-routing-settings.ts` `refusalOf` L111-115) all take their text from the wording owner, including for the new kind (no site may fall through to `""` or a generic text). Save sites set outcome `MODEL_LIST_UNAVAILABLE`; Org launch keeps `AGENT_ORG_CONFIGURATION_INVALID` with the owner's detail (diagnostic message kept).
     - `launch-usability-check.ts` L163-168 fallback `reason` — a persisted vocabulary (`LaunchConfigurationFallbackReason`, `agent-collaboration/domain/launch-configuration-source.ts` L16-24/L60-62, validated by `run-history/store/launch-configuration-source-schema.ts` L42, frozen copy in `app-data-migrations/frozen/...`). **Decision DEC-D1 (option a):** keep the vocabulary unchanged; map `model_list_unavailable` to the stored reason `model_unavailable` (exactly what a read failure records today) and carry the distinction in the stored `detail`, worded by the owner ("The model list of <runtime> could not be read: <diagnostic>."). Why: no code branches on the stored reason (`rg` shows only the type, the list and this mapping); the web renders recorded fallbacks from `detail` (`useRunMemberFacts.ts` `runSettings.delegated.fallback`), so the user sees the distinction; no persisted vocabulary change, existing records unaffected (Persisted data: Not Affected). `model_settings_invalid` stays only for `invalid` and `schema_unavailable`.
     - web `existingRunConfigResultActions.ts` L84: add `MODEL_LIST_UNAVAILABLE` to the scope-marking outcomes.
  2. `ModelCatalogService.runtimeModelSelectionCatalog` (throws `ModelListUnavailableError` for an external runtime with no models):
     - `RunModelSelectionService` validate/validateMany → `model_list_unavailable`; `listOptions*` → existing catch → "Runtime model catalog is unavailable…" reason (accepted: correct text for this case).
     - `available-agent-runtimes-service.ts` L245/L262-267: the duplicate empty check is removed; the thrown error reaches `failureText("<runtime> model list", error)` (text changes from "unknown: no models could be read" to the failure text; accepted). L279 reads AutoByteus (unaffected).
     - GraphQL `providerModelCatalogSnapshots` (via `listExternalRuntimeSnapshots` L310) → GraphQL error → web store error state keeps the last list (QR-001).
     - GraphQL `runtimeCurrentModelDescriptors` (`api/graphql/types/llm-provider.ts` L164-175): today an empty read yields `model: null` per identifier (indistinguishable from "not offered"); now a GraphQL error, which `useRuntimeCurrentModelDescriptor` (web L25-32, L53-56) already turns into `error`. Accepted behavior change (truthful: the list could not be read). Tests: resolver error for an empty external list; composable `error` path.
     - `application-launch-host-capability-validator.ts` L113-138 (`resolveExactCurrentLlmModel`): an empty external read moves from issue `MODEL_UNAVAILABLE` to the existing catalog-failure issue `RUNTIME_AUTHENTICATION_UNAVAILABLE` (accepted; that issue already covers every catalog read failure). Its two texts ("not offered" and "list could not be read") come from the wording owner (REQ-013 covers application launch refusals); issue codes unchanged. Tests: both issues with owner texts.
     - `startup/cache-preloader.ts` L22: `listLlmModels()` reads the default runtime (AutoByteus); the empty-list rule applies to external runtimes only → unaffected.
  3. Claude SDK schema → web thinking menu (parameters mode, "Default"), `getDefaultThinkingConfig` (writes nothing for an effort without default), validator (old `thinking_enabled` omitted as undeclared), portable application schema (unchanged; projected away at creation).
  4. Anthropic schemas/policy → web menu/defaults, validator, docs; FU-001 (Fable 5.2 → `adaptive_required`, consistent).
  5. Raw config projection → every AutoByteus adapter (no adapter code change needed for FU-004); stored new-run configs in canonical top-level form (R-3), which the validator and the web settings editor read.
- Deliberately left alone: adapter-level request builders (they receive only declared keys after projection); external backends' owned-key reads (already correct); validated save/launch paths' canonicalization (autobyteus-8); the server validator's treatment of standard fields; application portable schema; non-Claude thinking menus (FU-003); catalog rows (FU-001); Claude CLI executable discovery (FU-002); `teamRunLaunchReadiness` web codes (separate readiness check).
- Follow-ups: FU-001, FU-002, FU-003 (in [follow-ups.md](follow-ups.md)).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Approved Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, AC-001 | Off on Opus 5 (AutoByteus) | nothing sent, thinks | `disabled`, no effort | DS-001 |
| BEH-002 | User | REQ-002, AC-002 | Fable 5 menu / stored Off | Off offered; stored Off = nothing sent | effort only; stored switch ignored | DS-001 |
| BEH-003 | User | REQ-003, AC-003 | untouched switch row | default Off | default On | DS-001 (catalog default → web default config) |
| BEH-004 | User | REQ-004, AC-004 | Off on Sonnet 5/5.5, Haiku 5.5 | real off | preserved | DS-001 |
| BEH-005 | User | REQ-005, AC-005 | SDK thinking menu / stored Off | Off passed, ineffective | no switch, no `thinking` | DS-002 |
| BEH-006 | User | REQ-006, AC-006 | SDK effort untouched | `medium` written and sent | nothing sent, "Default" | DS-002 |
| BEH-007 | System | REQ-007, AC-007 | AutoByteus LLM creation | undeclared keys forwarded | projected away | DS-001 |
| BEH-008 | User | REQ-008, AC-008 | new agent/team run | stored as submitted | projected at creation | DS-003 |
| BEH-009 | Contract | REQ-009, AC-009 | docs | stale | synced | — |
| BEH-010 | User | REQ-010..012, REQ-014, AC-010..012 | picker open / Refresh | list fixed until restart | re-read on open and on demand | DS-004, DS-005 |
| BEH-011 | System | preserved | Save / options read | fresh server reads | preserved | DS-006 |
| BEH-012 | User | REQ-013, AC-013 | refused Save | generic text | actionable text, distinct unreadable case | DS-006 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| [evidence/probe-results-2026-11-10.md](evidence/probe-results-2026-11-10.md) | Probe outputs | REQ-001..006, REQ-010..014 | Basis of policy/schema decisions and refresh cost | Final, evidence |
| [probes/](probes/) | Reproductions | AC-001, AC-004..006, AC-010 | Start points for live tests and the CLI-update simulation | Final, evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (+ `Bug Fix` for Off and stale keys, `Feature` for refresh)
- Current design issue found: `Yes`
- Structural triggers that fire:
  - **Repeated coordination** (Principle 13): eight refusal sites word unavailability themselves, in seven variants (Current-State Read) → one wording owner.
  - **Behavior by absence** (Principle 13): "list unreadable" is reached only because a read returns `[]` and the model is then "not found" (`ClaudeSdkClient.listModels` L190-193 + `RunModelSelectionService` L69) → explicit rule and result kind.
  - **Derived data** (Principle 11): "empty external list = failed read" lives in availability only; validation and the web catalog derive the opposite → the catalog owner decides once.
  - **Legacy cleanup** (Principle 8): `omit` off shape and SDK `thinking` path become unreachable → removed.
  - **Persisted-data transition** (Principle 5): stored configs → decision below.
  - **Several kinds or forms** (Principle 1): new runs have three entry forms (agent, team, team-from-root-config) and six runtimes; settings come as top-level keys and inside `extra_params` → each traced in the DS-003 creation trace table (Spine Narratives).
  - Ruled out: Authoritative boundary (callers keep using `RunModelSelectionService` and `LLMFactory`; no internal bypass), Empty indirection (new projection owner holds the per-runtime key policy).
- Root cause classification: `Missing Invariant` (only declared settings travel; Off/defaults must match provider) + `Duplicated Policy Or Coordination` (refusal wording, empty-list rule)
- Refactor needed now: `Yes` (bounded: refusal wording owner; empty-list rule moved; result kind split)
- Evidence: Current-State Read citations; SRC-018, SRC-021, SRC-022.
- Design response: below (DS-001..DS-006).
- Refactor rationale: REQ-013 cannot be met consistently while eight sites word it and read failures masquerade as "not offered".
- Intentional deferrals: validator vs portable-schema standard-field inconsistency (noted above, not a ticket finding: nothing in scope depends on it).

## Terminology

Project glossary: `GLOSSARY.md`. Implementation adds two entries under **Agent Runtimes**:
- **Offered models:** the models an agent runtime offers now, read from the runtime (`offeredModels` in code). The UI label "Refresh models" re-reads them; "model list" is UI copy only, not a second domain name.
- **Declared settings:** the model settings keys a model's settings schema declares (`config_schema`; for external runtimes at run creation, the keys the runtime's backend reads). Only declared settings are stored in a new run and reach a provider.

Existing words used unchanged: model settings (`llmConfig`), agent runtime, Off (thinking choice), effort (`reasoning_effort`), off shape.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: `omit` off shape and its branches; Claude SDK `thinking` session/query option and `thinking_enabled` schema parameter; the SDK effort default `medium`; per-site refusal wordings; availability's own empty-list check; `refreshLocalCatalog`'s idle-flip refresh.
- Compatibility wrappers, dual paths, or legacy fallbacks kept: `None`. Stored keys that lose meaning are not read (projection), not translated.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: `llmConfig` in run metadata (agent runs, team/org execution trees, delegated copies), definitions' `defaultLaunchConfig`, application launch profiles. JSON objects of a few keys; volume = number of runs.
- Change: readers stop reading keys a model no longer declares (`thinking_enabled` on Fable 5 and on SDK models; any undeclared key); writers of new runs store only declared settings; switch default changes for configs that never stored `thinking_enabled`.
- Normal reader/writer behavior: AutoByteus — projection at `LLMFactory.createLLM`; SDK — `buildClaudeSessionConfig` reads `reasoning_effort` only; validated saves already omit undeclared keys; history views show residual keys (existing rule).
- Required semantics under direct use: explicit Off on Opus 5/Sonnet 5/Sonnet 5.5/Haiku 5.5 stays Off (now real on Opus 5); stored effort keeps its value; nothing fails because a stored key lost meaning (AC-002, AC-005, AC-008).
- Decision: `Directly Usable — No Migration`
- Run-history launch-source fallback records (`LaunchConfigurationSource.fallbacks[].reason`, validated by `run-history/store/launch-configuration-source-schema.ts` L42): `Not Affected` — the reason vocabulary is unchanged (DEC-D1); a list-read failure keeps being recorded as `model_unavailable`, with a more precise `detail` text.
- Rationale: the current version-agnostic projection ignores obsolete keys without old-version branches; rewriting stored configs gives no benefit (next validated save drops them anyway).
- Data Migration Guideline §2: (1) no migration, tolerant projection; (2) availability unaffected; (3) shapes: `{thinking_enabled?, reasoning_effort?}`, `{reasoning_effort?, thinking_display?}` (autobyteus-8 era), application `extra_params` — all read by the projection; (4)–(6) N/A; (7) no extra I/O; (8) N/A; (9) AC-002/005/008 tests; (10) consulted autobyteus-8 SR-005 decision (omit undeclared keys).

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001..004, BEH-007 | stored `llmConfig` of an AutoByteus run | provider request | `LLMFactory` (projection) → adapter (`AnthropicLLM` policy) | Off truth, defaults, no stale keys |
| DS-002 | Primary | BEH-005, BEH-006 | SDK `supportedModels()` | Claude CLI session options | Claude normalizer → `buildClaudeSessionConfig` | No ineffective Off; no invented default |
| DS-003 | Primary | BEH-008 | GraphQL/app/router run creation | stored run config | `NewRunLlmConfigProjection` (new) called by provisioning/team service | No undeclared keys copied |
| DS-004 | Primary | BEH-010 | picker open / Refresh models | every picker of that runtime | web `llmProviderConfig` store | Lists current without restart |
| DS-005 | Primary | BEH-010 | locked run-settings menu open / Refresh | that scope's options | run-config draft store | Saved-runtime lists current |
| DS-006 | Primary | BEH-011, BEH-012 | Save / launch with a selection | refusal or canonical store | `RunModelSelectionService` + refusal wording owner | Fresh check, actionable text |
| DS-007 | Bounded local | BEH-010 | refresh request | snapshot replaced or kept | store per-runtime refresh (coalesce, epoch) | No flicker, no late overwrite |

## Primary Execution Spine(s)

- DS-001: `Run activation -> createAvailableLlm -> LLMFactory.createLLM -> composeEffectiveConfig (projectRawLlmConfig onto declared settings) -> AnthropicLLM / provider adapter -> Provider API`
- DS-002: `Claude CLI supportedModels -> ClaudeSdkClient.listModels -> toModelInfo (effort-only schema) -> web menu -> stored llmConfig -> buildClaudeSessionConfig (effort only) -> query options -> Claude CLI`
- DS-003: `createAgentRun / createAgentTeamRun (GraphQL, application binding, model router) -> AgentRunProvisioningService.validateAndPrepareRunInput / TeamRunService.createTeamRun* -> NewRunLlmConfigProjection.project -> AgentRunConfig / team plan -> run metadata`
- DS-004: `ChatModelMenu / RuntimeModelConfigFields / MobileRuntimeModelRows open (or Refresh models) -> useChatModelCatalog / useRuntimeScopedModelSelection -> llmProviderConfig.refreshCatalog(runtime) [+ reloadProvider for discovered providers on explicit refresh] -> providerModelCatalogSnapshots -> ModelCatalogService.runtimeModelSelectionCatalog -> runtime -> store snapshot -> every picker`
- DS-005: `ChatModelMenu (runtimeLocked) open / Refresh -> emit refresh-locked-models -> ExistingRunConfigEditor -> draft store reloadModelOptions(address) -> runModelOptions / delegatedLaunchModelOptions query -> RunModelSelectionService.listOptions* -> fresh catalog`
- DS-006: `Save (stopped agent/team/org, delegated, standalone root) or launch (Org, collaborator, model routing) -> RunModelSelectionService.validate(Many) -> ModelCatalogService (throws ModelListUnavailable) -> result kind -> runModelSelectionRefusal (text) -> mutation result outcome/message -> web feedback + scope marking`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The stored config is cut to the model's declared settings (top-level and in `extra_params`; standard fields untouched) before any adapter sees it; `AnthropicLLM` then sends the model's real Off shape or nothing for always-on rows | LLMFactory, AnthropicLLM | LLMFactory / AnthropicLLM | Anthropic request policy table |
| DS-002 | The SDK schema offers only effort (levels from the SDK, no default); the session reads only `reasoning_effort` | normalizer, session config, client | Claude normalizer / session config | — |
| DS-003 | Creation projects each submitted config: AutoByteus via `LLMFactory.canonicalRunLlmConfig` (model schema, in-process); external runtimes via the setting keys their backend reads; no catalog read | provisioning, team service, projection | NewRunLlmConfigProjection | per-runtime key exports |
| DS-004 | Opening a picker refreshes that runtime in the background while the list stays usable; Refresh models does the same and, on AutoByteus, re-discovers discovered providers; all pickers share the snapshot | pickers, composables, store, GraphQL, catalog | llmProviderConfig store | i18n, busy/error UI |
| DS-005 | Locked menus (saved runtime) ask the editor to reload that scope's server options | menu, editor, draft store | run-config draft store | — |
| DS-006 | Validation distinguishes "list unreadable" from "not offered"; one owner words the refusal | validator, catalog, refusal owner | RunModelSelectionService | diagnostics (agy/grok/dsh) |

### DS-003 creation trace (AR-002)

Every new-run creation reaches one of two projection points (`rg "\.createAgentRun\(|\.prepareAgentRun\(|\.createTeamRun\(|\.createTeamRunFromRootConfig\("`, 2026-11-10):

| Entry form | Callers | Projection point |
| --- | --- | --- |
| Agent run | GraphQL `createAgentRun` (`api/graphql/types/agent-run.ts` L206) and `prepareAgentRun` (L237); application binding (`application-run-binding-launch-service.ts` L115); application execution scope (`application-execution-scope.ts` L44); Model Router (`model-router-agent.ts` L134 via `model-routing-composition.ts` L29); remote inbound delegation (`remote-collaboration/inbound/remote-delegation-receiver.ts` L98) | `AgentRunProvisioningService.validateAndPrepareRunInput` (all reach it through `prepareAgentRun`, `agent-run-service.ts` L247/L265) |
| Team run | GraphQL `createAgentTeamRun` (`agent-team-run.ts` L184); application binding (L219); application execution scope (L55); remote team run starter (`remote-collaboration/inbound/remote-team-run-starter.ts` L76) | `TeamRunService.createTeamRun` (once; team scope and member configs) |
| Team run from root config | application binding (L201); application execution scope (L60) | delegates to `createTeamRun` (`team-run-service.ts` L185) |

| Runtime | Declared settings at creation | Source |
| --- | --- | --- |
| AutoByteus | keys of the selected model's `configSchema` (canonical top-level form) | `LLMFactory.canonicalRunLlmConfig` |
| Claude Agent SDK | `reasoning_effort` | `CLAUDE_SESSION_SETTING_KEYS` (`claude-session-config.ts`) |
| Codex App Server | `reasoning_effort`, `service_tier` | `CODEX_SESSION_SETTING_KEYS` (Codex normalizer) |
| Grok Build, DeepSeek Harness (ACP) | `reasoning_effort` | `ACP_SESSION_SETTING_KEYS` (`acp-session-launcher.ts`) |
| Antigravity CLI | none (its backend reads no `llmConfig` key) | empty set in the projection |

## Spine Actors / Main-Line Nodes

`LLMFactory`, `AnthropicLLM`, Claude normalizer, `buildClaudeSessionConfig`, `AgentRunProvisioningService`, `TeamRunService`, `NewRunLlmConfigProjection`, `ModelCatalogService`, `RunModelSelectionService`, web `llmProviderConfig` store, chat model menu / launch-config model fields, run-config draft store.

## Ownership Map

- `llm-config-overrides.ts` owns the raw-config rule: which keys are standard/reserved and, now, that settings keys (top-level unknown keys and `extra_params`/`extraParams` entries) survive only when declared, in one canonical form: declared settings as top-level keys, no container (`projectRawLlmConfig(raw, declaredSettingKeys)`; a top-level value wins over a container value, as `applyRawLlmConfigOverrides` L187-191 does today).
- `LLMFactory` owns applying it: `composeEffectiveConfig` (runtime) and `canonicalRunLlmConfig(modelIdentifier, raw)` (creation; unregistered model → raw unchanged, the runtime projection still applies at activation).
- `anthropic-model-request-policy.ts` owns per-model thinking facts; `AnthropicLLM` owns request shaping from them.
- Claude normalizer owns the SDK schema; `claude-session-config.ts` owns what an SDK session reads (`CLAUDE_SESSION_SETTING_KEYS`); Codex normalizer and ACP launcher likewise export theirs.
- `NewRunLlmConfigProjection` (server, `llm-management/services/new-run-llm-config-projection.ts`) owns "which keys a new run keeps" per runtime; provisioning and team service own calling it before building configs.
- `ModelCatalogService` owns "an external runtime's empty list is an unreadable list".
- `RunModelSelectionService` owns result kinds; `run-model-selection-refusal.ts` owns the wording.
- Web `llmProviderConfig` store owns catalog snapshots and their refresh lifecycle; pickers own only when to ask.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner | Why | Must Not Secretly Own |
| --- | --- | --- | --- |
| `useChatModelCatalog`, `useRuntimeScopedModelSelection` | `llmProviderConfig` store | picker-facing API | refresh coalescing, snapshot state |
| `LLMFactory.canonicalRunLlmConfig` | `projectRawLlmConfig` | model lookup by identifier | its own key rule |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `'omit'` in `AnthropicThinkingOffShape`; `offShape !== 'omit'` branches (anthropic-llm L183, L199) | Dead: after the change no catalog row has it | `adaptive_required` for every always-on row | |
| `thinking_enabled` parameter in `buildClaudeThinkingConfigSchema` | Off ineffective (PRB-A1) | effort-only schema builder | rename builder to effort |
| `ClaudeSessionConfig.thinking`, `claudeSessionReasoningOptions` thinking, `ClaudeSdkStreamingSessionOptions.thinking` + L348 | Dead once nothing sets it | — | |
| SDK effort `defaultValue` (`medium`) | Invented default (DEC-005) | no default | |
| `NormalizedModelDescriptor.supportsAdaptiveThinking` and `supportsClaudeThinking` | Dead: no reader outside `claude-sdk-model-normalizer.ts` (`rg supportsAdaptiveThinking` in server src and web, 2026-11-10) | `supportsEffort`/levels | |
| Refusal strings at eight sites | Repeated policy | `run-model-selection-refusal.ts` | |
| `modelsEntry` empty-list check (availability L262-263) | Rule moved | catalog owner throw | text via `failureText` |
| `refreshLocalCatalog` idle-flip | Replaced | `refreshCatalog` (keeps list) | update its two callers |
| Docs naming removed models; "unknown provider-specific keys flow into extraParams" lines | Stale | synced text | Part C |

## Return Or Event Spine(s) (If Applicable)

DS-006 return: refusal message → GraphQL `outcome`/`message` → web `applyResultState` (marks affected scopes for `MODEL_UNAVAILABLE`, `MODEL_LIST_UNAVAILABLE`, `SCHEMA_UNAVAILABLE`).

## Bounded Local / Internal Spines (If Applicable)

DS-007, parent `llmProviderConfig` store: `refreshCatalog(runtime) -> no successful payload ? fetchProvidersWithModels (normal load) : (in-flight refresh for runtime ? join it : mark refreshing, keep state 'ready' and providersById -> query network-only -> current request? -> replace snapshot (merge as today) : ignore) -> on error keep providersById, state 'ready', refreshError = message`. Matters for QR-001/QR-002.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Per-runtime setting keys (`CLAUDE_SESSION_SETTING_KEYS`, `CODEX_SESSION_SETTING_KEYS`, `ACP_SESSION_SETTING_KEYS`) | DS-003 | NewRunLlmConfigProjection | name what each backend reads | one source per runtime | duplicated lists drift |
| Refusal wording | DS-006 | validator callers | text from result + model + runtime + scope + saved | REQ-013 | per-site drift |
| i18n strings | DS-004 | pickers | "Refresh models", busy, error | UI | — |

## Ownership Boundaries

- Server callers depend on `RunModelSelectionService` (validation) and the refusal owner (text); none inspects catalog errors directly.
- `NewRunLlmConfigProjection` is the only creation-time owner; provisioning/team service must not filter keys themselves. It must not read runtime catalogs (QR-003).
- Pickers call the composables; only the store mutates snapshots or issues catalog queries.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Upstream Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `LLMFactory` | `projectRawLlmConfig`, model registry | server LLM construction, projection | server calling `applyRawLlmConfigOverrides` or reading `configSchema` itself | add a factory method |
| `RunModelSelectionService` | catalog reads, schema validation | 8 refusal sites | sites calling `ModelCatalogService` to decide unavailability | extend result kinds |
| `llmProviderConfig` store | GraphQL catalog reads, refresh state | composables, pickers | components issuing catalog queries | add store action |

## Dependency Rules

- `autobyteus-server-ts` → `autobyteus-ts` (`LLMFactory.canonicalRunLlmConfig`); never the reverse.
- `new-run-llm-config-projection.ts` → backend key exports (claude, codex, acp) and `LLMFactory`; backends do not import the projection.
- Refusal owner depends on validation result types and `agentRuntimeName`; not on catalogs.
- Web components → composables → store → Apollo; components never query catalogs directly.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `projectRawLlmConfig(raw, declaredSettingKeys)` | raw stored config | keep standard/reserved keys as given; keep settings keys (top-level and from `extra_params`/`extraParams`) only if declared, written as top-level keys; no container in the result; `null` when nothing remains | raw record + `ReadonlySet<string>` | pure |
| `LLMFactory.canonicalRunLlmConfig(modelIdentifier, raw)` | one registered model's run config | projection with that model's declared keys | exact model identifier | unregistered → raw |
| `projectNewRunLlmConfig({ runtimeKind, llmModelIdentifier, llmConfig })` | one new run scope | per-runtime projection | runtime + model | async (AutoByteus registry init) |
| `RunModelSelectionValidationResult` | one selection check | `valid` / `invalid` / `schema_unavailable` / `model_unavailable` (not in the current list) / `model_list_unavailable` (list unreadable, optional `catalogDiagnostic`) | — | |
| `runModelSelectionRefusal({ result, llmModelIdentifier, runtimeKind, scopeAddress?, savedSettingsUnchanged })`, built on `modelNotOfferedText(...)` and `modelListUnreadableText(runtimeKind, diagnostic?)` | one refusal | text | — | used by the 8 sites; the two text functions also by `application-launch-host-capability-validator.ts` and the usability fallback `detail` |
| store `refreshCatalog(runtime)`; `refreshModelList(runtime)` | one runtime's snapshot | background re-read; explicit = re-read + reload discovered providers (AutoByteus) | runtime kind | coalesced |
| draft store `reloadModelOptions(address)` | one saved-run scope's options | re-query options | scope address | |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| all above | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| list unreadable | `model_list_unavailable` / `MODEL_LIST_UNAVAILABLE` | Yes | Yes (new) | Low | glossary "Offered models" |
| not in current list | `model_unavailable` (existing) | Yes | Yes | Low | its meaning narrows to "not offered now" (read failures move out) |
| always-on thinking row | `adaptive_required` (existing mode, now for Fable 5, Fable 5.1, Opus 5.5) | Yes | Yes | Low | one mode for Anthropic's "Always on" class (AR-003) |
| declared settings | `declaredSettingKeys`, `*_SESSION_SETTING_KEYS` | Yes | Yes | Low | glossary |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Settings projection | `llm-config-overrides.ts` | Extend | already classifies keys |
| Creation-time projection | none | Create New (one small file) | per-runtime policy needs one owner |
| Refresh | `llmProviderConfig` store, `useChatModelCatalog` open hook, `reloadProvider` | Extend | — |
| Locked options reload | run-config draft store, options clients | Extend | — |
| Unreadable list rule | availability rule | Move to `ModelCatalogService` | one owner |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| autobyteus-ts LLM | policy, catalog, adapter, projection, factory, docs | DS-001 | Extend |
| server llm-management | projection (new run), catalog rule, validator kinds, refusal wording | DS-003, DS-006 | Extend / Create New (2 files) |
| server Claude/Codex/ACP backends | schema, session settings keys | DS-002, DS-003 | Extend |
| server run creation (agent, team) | calling projection | DS-003 | Extend |
| web catalog + pickers + run settings | refresh, UI, outcomes | DS-004, DS-005 | Extend |

## Final File Responsibility Mapping

| File | Owner | Concern |
| --- | --- | --- |
| `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts` | policy | off shapes `disabled`/`between_tools`; modes `adaptive` (switch rows) and `adaptive_required` (always-on rows: opus-5-5 with `rejectsForcedToolChoice: true`; fable-5, fable-5-1 with `false`, unchanged); opus-5 → `adaptive('disabled')` |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | adapter | remove `omit` branches; `adaptive_required` handling unchanged (now also for Fable 5/5.1: sends `thinking: {type:'adaptive'}`, per-call sampling kwargs fail locally — the API rejects them for these models, PRB-A3); effort rule unchanged |
| `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts` | catalog | Fable 5 → effort-only (default high); switch default `true`; Opus 5 switch description states Off really disables thinking and Anthropic's tool-call caveat |
| `autobyteus-ts/src/llm/utils/llm-config-overrides.ts` | raw config rule | `projectRawLlmConfig` |
| `autobyteus-ts/src/llm/llm-factory.ts` | factory | apply projection in `composeEffectiveConfig` (raw record form); `canonicalRunLlmConfig`; declared keys from `model.configSchema` parameter names |
| `autobyteus-ts/docs/llm_module_design.md`, `llm_module_design_nodejs.md`, `provider_model_catalogs.md` | docs | Part C + new raw-config contract + Claude settings |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-model-normalizer.ts` | SDK schema | effort-only, no default |
| `.../claude/client/claude-sdk-client.ts` | SDK client | drop `thinking` option |
| `.../backends/claude/session/claude-session-config.ts` | SDK session | effort only; export `CLAUDE_SESSION_SETTING_KEYS` |
| `.../backends/codex/codex-app-server-model-normalizer.ts` | Codex | export `CODEX_SESSION_SETTING_KEYS` |
| `.../backends/acp/session/acp-session-launcher.ts` | ACP | export `ACP_SESSION_SETTING_KEYS` |
| `autobyteus-server-ts/src/llm-management/services/new-run-llm-config-projection.ts` (new) | creation projection | per-runtime projection (Antigravity: no keys) |
| `.../agent-execution/services/agent-run-provisioning-service.ts` | agent creation | call projection |
| `.../agent-team-execution/services/team-run-service.ts` | team creation | call projection once, in `createTeamRun` (team and member configs); `createTeamRunFromRootConfig` delegates to it (L185) |
| `.../llm-management/services/model-catalog-service.ts` | catalog | external empty list → throw `ModelListUnavailableError` |
| `.../available-agent-runtimes/available-agent-runtimes-service.ts` | availability | remove duplicate empty check |
| `.../llm-management/services/run-model-selection-service.ts` | validation | `model_list_unavailable` on read failure (with diagnostics) |
| `.../llm-management/services/run-model-selection-refusal.ts` (new) | wording | refusal text |
| 8 refusal sites (Current-State Read) | callers | use the wording owner; outcome `MODEL_LIST_UNAVAILABLE` where they set outcomes |
| `autobyteus-web/stores/llmProviderConfig.ts` (+ snapshot type) | store | `refreshing`/`refreshError`; `refreshCatalog`, `refreshModelList`; replace `refreshLocalCatalog` |
| `autobyteus-web/composables/chat/useChatModelCatalog.ts`, `composables/useRuntimeScopedModelSelection.ts` | facades | expose refresh-on-open and explicit refresh |
| `autobyteus-web/components/chat/ChatModelMenu.vue`, `ChatModelList.vue` | picker | refresh current/opened runtime on open; Refresh models control with busy/error; locked mode emits `refresh-locked-models` |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue`, `components/agentTeams/SearchableGroupedSelect.vue` (`open` event), `components/mobile/newRun/MobileRuntimeModelRows.vue`, application launch-profile editors | pickers | refresh on open; Refresh models control |
| `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue`, `components/run-settings/*` (event wiring), run-config draft store + delegated draft | run settings | `reloadModelOptions(address)` on locked refresh |
| `autobyteus-web/stores/existingRunConfigResultActions.ts` | result state | include `MODEL_LIST_UNAVAILABLE` |
| `autobyteus-web` i18n locale files | text | new strings |
| `autobyteus-server-ts/docs/modules/llm_management.md`, `GLOSSARY.md` | docs | Claude mapping, refresh behavior, list-unreadable outcome; glossary entries |

## Target Subsystem / Folder / File Mapping

All files stay in their existing folders; the two new server files sit in `autobyteus-server-ts/src/llm-management/services/` next to `run-model-selection-service.ts`, which owns the subject they serve. No folder changes.

## Concrete Examples / Shape Guidance

| Topic | Good Example | Avoided Shape | Why |
| --- | --- | --- | --- |
| Projection (AutoByteus, Claude Sonnet 5 schema `{thinking_enabled, reasoning_effort}`) | raw `{ temperature: 0.2, thinking_enabled: false, thinking_display: 'omitted', extra_params: { reasoning_effort: 'low', top_k: 5 } }` → `{ temperature: 0.2, thinking_enabled: false, reasoning_effort: 'low' }` | dropping `temperature`; keeping `top_k`; keeping the container (a later validated Save would drop it, R-3) | standard fields stay; only declared settings survive, in the top-level form the validator and web editor read |
| Fable 5 stored Off | `{ thinking_enabled: false, reasoning_effort: 'max' }` → projected `{ reasoning_effort: 'max' }` → request: `thinking: {type:'adaptive'}`, `output_config.effort: 'max'` | local "adaptive only" failure; effort dropped because of a stale switch | REQ-002 |
| New SDK run | submitted `{ thinking_enabled: false, reasoning_effort: 'xhigh', thinking_display: 'x' }` → stored `{ reasoning_effort: 'xhigh' }`; session options `{ effort: 'xhigh' }` | `thinking: disabled` sent | REQ-005, REQ-008 |
| Refusal text | "'claude-fable-5-1[1m]' is not offered by Claude Agent SDK now (for '/supervised_research_team/researcher'). Refresh the model list and choose again. Saved settings were not changed." / "The model list of Claude Agent SDK could not be read. Try again. Saved settings were not changed." | "Model options for … are unavailable" | REQ-013 (wording may vary; content fixed) |
| Refresh | open menu → list shows at once with a small busy indicator → new row appears when the read answers | spinner replacing the list; second concurrent CLI read | QR-001/002 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep `thinking_enabled` read on SDK for old runs | stored Off | Rejected | not read; Off was ineffective anyway (PRB-A1) |
| Map stored Fable 5 Off to something | stored data | Rejected | projection ignores it |
| Keep raw forwarding for schema-less models | provider-specific params | Rejected (DEC-013) | declared settings only |
| Keep old refusal strings beside new ones | tests | Rejected | one owner; tests follow |
| Rewrite stored configs | cleanliness | Rejected | no migration |

## Change / Refactor Sequence

1. autobyteus-ts: projection + factory; Anthropic policy/catalog/adapter; unit tests; live Anthropic tests (AC-001, AC-002, AC-004).
2. Server: Claude normalizer/session/client; key exports; new-run projection + provisioning/team calls; catalog empty-list rule + availability; validator kind; refusal owner + 8 sites; tests (AC-005..AC-008, AC-013); live SDK session test.
3. Web: store refresh; composables; pickers; run-settings reload; result outcome; i18n; component/unit tests (AC-010, AC-011, QR-001/002).
4. Docs + glossary (AC-009).
5. Realistic check (isolated Electron + test vault): Opus 5 Off / Fable 5 menu / SDK menu; CLI-update simulation (`CLAUDE_CODE_EXECUTABLE_PATH` → symlink, bundled CLI then system CLI) for new-run picker and stopped team member + delegated copy Save (AC-010, AC-012); refusal texts; launch with stale definition keys (AC-008).

## Key Tradeoffs

- Creation projection for external runtimes uses the backend's setting keys instead of the model's live schema (no ≈2.3 s catalog read on launch, QR-003); a key the runtime reads but a specific model does not declare could still be stored (inert or as today). Accepted (DEC-014).
- Refresh on every picker open costs one runtime read per open (coalesced); no TTL added until usage shows a need (DESIGN.md "remove before caching").
- Automatic refresh on AutoByteus re-reads registered models without re-probing discovered providers; explicit Refresh re-discovers them (local hosts, custom endpoints).

## Risks

- RSK-001: a future CLI honors `thinking: disabled` → re-measure on SDK upgrades (live SDK test asserts effort-only options).
- Fable 5/5.1 move to `adaptive_required`: explicit adaptive thinking (measured accepted, PRB-A3) instead of nothing; per-call sampling kwargs now fail locally instead of being stripped — the API rejects them for both models (PRB-A3), and Opus 5.5 already behaves so.
- Switch default On raises token use for new runs (DEC-002).
- Background refresh UI: list replacement while the user is scrolling/searching — keep selection and query; replace rows only.

## Guidance For Implementation

- Reproductions to start from: `probes/prb-api-off.mts` (Opus 5 omit thinks; `disabled` off; Fable 5 `disabled` 400) and `probes/prb-sdk-off.mts` (SDK Off ineffective); commands in [evidence/probe-results-2026-11-10.md](evidence/probe-results-2026-11-10.md). Live tests replace the probes: extend `autobyteus-ts/tests/integration/llm/api/anthropic-llm.test.ts` "thinking off" cases to assert `thinking_tokens === 0` (or no thinking block) for Opus 5/Sonnet 5/Haiku 5.5, and add Fable 5 stored-Off resume.
- Declared keys come from `model.configSchema.parameters` names (`autobyteus-ts/src/utils/parameter-schema.ts` L191); `extra_params` and `extraParams` containers are both read today — project both into top-level keys (canonical form, no container in the result).
- Keep `getDefaultThinkingConfig` behavior; verify the SDK effort-only schema renders the parameters menu with "Default" and writes nothing.
- `MODEL_LIST_UNAVAILABLE` must appear in every mutation result type/union the web parses (outcome is a string field today; check generated GraphQL types).
- Do not add a catalog read to run creation; do not add a client-side TTL cache.
