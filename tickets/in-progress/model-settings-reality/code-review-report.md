# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited sections only: Current-State Read sources)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed As Context: `evidence/probe-results-2026-11-10.md` (evidence only), `follow-ups.md`
- Relevant Solution Revision IDs: SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 Pass, IG-1..IG-3)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: Implementation Engineer handoff, IR-001, 2026-11-10
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage / execution / API/E2E / delivery fields: N/A (implementation review)
- Code reviewed: worktree `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality`, branch `codex/model-settings-reality`, `git diff fd0eb664c..f31fa1821` (106 files)

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. Three packages; shared contracts changed as designed (`model_list_unavailable` / `MODEL_LIST_UNAVAILABLE`, catalog empty-list throw, `LLMFactory` raw-config contract, new-run writer, concurrent web refresh). No new risk surface beyond the design.

## Review Scope

- Changed implementation and behavior reviewed: UC-001..UC-006 (BEH-001..BEH-012) across autobyteus-ts (Anthropic policy/catalog/adapter, `projectRawLlmConfig`, `LLMFactory`), autobyteus-server-ts (Claude SDK normalizer/session/client, setting-key exports, `new-run-llm-config-projection.ts`, provisioning and team creation, catalog empty-list rule, validator kind, `run-model-selection-refusal.ts` and the eight sites, application validator, availability), autobyteus-web (store refresh, composables, `ModelListRefreshControl`, chat menu/list, `SearchableGroupedSelect`, `RuntimeModelConfigFields`, mobile sheet, application editors, saved-run reload via provide/inject, result outcomes, thinking adapter, i18n), docs and glossary.
- Files / areas reviewed: every production file in the diff; the new and changed unit tests for projection, factory, refusal, store refresh, locked refresh, thinking adapter (proportionately).
- Explicit exclusions: gated live suites and realistic Electron journeys (not run; API/E2E). No check was rerun: the code IMP-01..IMP-06 exercised has not changed since they ran.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (REQ-001..REQ-014, AC-001..AC-013, QR-001..QR-003, DEC-001..DEC-015).
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-002 Pass; IG-1..IG-3 applied (verified: top-level wins over container in `projectRawLlmConfig`; DEC-D1 fallback detail keeps the diagnostic; Fable 5/5.1 `adaptive_required`).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | policy `claude-opus-5` → `adaptive('disabled')`; `buildThinkingFromToggle` returns `{type:'disabled'}`; effort skipped when `thinkingEnabled === false` (anthropic-llm.ts) | — |
| BEH-002 | Confirmed | catalog `claudeEffortOnlySchema('high')`; policy `adaptive_required`; `composeEffectiveConfig` → `projectRawLlmConfig` drops stored `thinking_enabled` before `validateStrictRequestRules` | — |
| BEH-003 | Confirmed | `claudeThinkingSwitchSchema` default `true` | — |
| BEH-004 | Confirmed | Sonnet 5 / 5.5 / Haiku 5.5 entries unchanged; `omit` branches removed | — |
| BEH-005 | Confirmed | `buildClaudeEffortConfigSchema`; `ClaudeSessionConfig.thinking` and the SDK `thinking` option removed | — |
| BEH-006 | Confirmed | SDK effort parameter has no default; adapter `alwaysOn` shows thinking on with "Default" and writes nothing | — |
| BEH-007 | Confirmed | `LLMFactory.composeEffectiveConfig` projects raw records; only production raw caller is `createAvailableLlm` | — |
| BEH-008 | Confirmed | `AgentRunProvisioningService.validateAndPrepareRunInput` and `TeamRunService.createTeamRun` call `projectNewRunLlmConfig`; no catalog read | — |
| BEH-009 | Confirmed | docs synced; IMP-06 | — |
| BEH-010 | Confirmed | store `refreshCatalog` / `refreshModelList` / `readRuntimeCatalog`; pickers call on open and on Refresh; saved-run menus via `provideLockedModelOptionsRefresh` | — |
| BEH-011 | Confirmed | server read path unchanged apart from the empty-list throw | — |
| BEH-012 | Confirmed | `model_list_unavailable`; `runModelSelectionRefusal` at all eight sites; web marks `MODEL_LIST_UNAVAILABLE` scopes | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

The review relies on the requirements' scenarios unchanged: SCN-001..SCN-008, all `Supported Normal Scenario`, `Use`. Scenario rows are not copied here; see requirements-doc "Relevant Scenarios And Journeys". One scenario detail the findings use:

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-008-alt (AC-013 alternate) | REQ-013, AC-013 | User | User | Launch/Save while the Claude CLI fails | application launch setup, run settings Save | Normal (named alternate in AC-013) | `ClaudeSdkClient.listModels` → `[]` on failure → `ModelCatalogService.runtimeModelSelectionCatalog` throws `ModelListUnavailableError` → `ApplicationLaunchHostCapabilityValidator` `RUNTIME_AUTHENTICATION_UNAVAILABLE` with `modelListUnreadableText(runtime, failure.message)` | User reads why the list could not be read | AC-013 "List unreadable (e.g. runtime CLI failing)"; code path read | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `RuntimeModelConfigFields.vue` keeps a saved-run mode (`originalModelIdentifier`, `modelOptions`, `runChoice`, replacement branches) and props (`readOnly`, `runtimeSelectionLocked`, `modelSelectionLocked`, `modelConfigDisabled`, `modelConfigReadOnly`, `historicalModelConfig`, `missingHistoricalConfig`, `validationErrors`, `historical*` texts) reached only by its own spec; this change adds new branches on that mode (`:refreshable="originalModelIdentifier === undefined"`, the `onModelPickerOpen` guard) | Contract: Core Principle 7 (dead code in touched files); DESIGN.md Mandatory Rule 11 (no production code only tests reach) | The change touched the file (open/refresh wiring) | The one production caller `DefinitionLaunchPreferencesSection.vue` L28-41 passes none of those props; the dead mode now also carries new refresh branches | `rg` for the props/kebab names outside the component and its spec finds nothing (FU-004 evidence, re-run 2026-11-10) | Promote | This ticket | Remove the mode, the props and the spec cases that exist only for them (CR-001). FU-004 becomes this ticket. |
| C-02 | `ModelListUnavailableError` words its message with the raw enum value (`The claude_agent_sdk runtime returned no models.`); for Claude SDK the application validator passes it as the diagnostic, so the user reads "The model list of Claude Agent SDK could not be read: The claude_agent_sdk runtime returned no models. Try again."; its public `runtimeKind` field has no reader | SCN-008-alt; REQ-013; Principle 15 (one name per concept: the runtime's display name); Principle 7 / Rule 11 (unused field) | Claude CLI failing while an application launch is validated | see SCN-008-alt | model-catalog-service.ts L71-76, L186; application-launch-host-capability-validator.ts L117-127 (`failure.message` for Claude); `llm-provider.test.ts` L255 shows the same text reaching GraphQL errors; `rg "\.runtimeKind"` on the error: no reader | Promote | This ticket (code this change added) | Word the message with `agentRuntimeName` (or without the runtime, since the outer text names it) and drop the unused field (CR-002). Minor. |
| C-03 | GLOSSARY "Offered models" says "model list" is UI copy only, not a second domain name, while the code this change adds names the concept with it: `model_list_unavailable`, `MODEL_LIST_UNAVAILABLE`, `ModelListUnavailableError`, `modelListUnreadableText`, `ModelListRefreshControl`, `modelListRefreshing` | Contract: Principle 15; the glossary is the vocabulary authority (DESIGN.md) | The change added both the glossary entry and the identifiers | A reader of the glossary is told the opposite of what the code does | GLOSSARY.md diff; identifiers above | Promote | This ticket | Make the glossary entry state truthfully how "model list" is used in names (e.g. the read of a runtime's offered models; `model_list_unavailable` = that read failed). Doc-only (CR-003). No rename asked: the design named these identifiers and ARCH-REV-002 passed them. |
| C-04 | Deviation 1: saved-run refresh through provide/inject instead of an emitted event relayed by five `run-settings/*` components | Design DS-005 ownership | — | The menu still only asks; the editor owns the reload; no pass-through layers | `useLockedModelOptionsRefresh.ts`, `ExistingRunConfigEditor.vue` L166-167, `ChatModelMenu.vue` L311-318 | Reject | — | Same ownership, fewer empty layers (Principle 13). Accepted. |
| C-05 | Deviation 2: `reloadModelOptions()` / `reloadOptions()` per run, not per address | Design interface table | — | The options query is one read per run | `existingRunModelOptionsActions.ts` | Reject | — | The address parameter would select nothing the read does not already return. Accepted. |
| C-06 | Usability fallback `detail` says "Refresh the model list and choose again" where no picker is in front of the reader | REQ-013, DEC-D1 | — | Designed wording; content required by REQ-013 | design-spec Derived consumers 1 | Reject | — | Approved behavior; a shorter text there would be a requirement change, not a defect. |
| C-07 | `refreshCatalog` never rejects; `createCustomProvider` no longer fails after the provider was created | REQ-011 | — | The provider is created; a failed follow-up read shows on the snapshot (`refreshError`) | `llmProviderConfig.ts` L205-209, L429 | Reject | — | More truthful than failing a create that succeeded. Accepted. |
| C-08 | A locked-menu reload started while the editor's first options read is in flight supersedes it; if the reload then fails, scopes stay `loading` | SCN-008 | Needs a transport failure of the options query inside the first read's window | Self-heals on the next menu opening (another reload) | `existingRunModelOptionsActions.ts` L37-52 | Reject | — | Infrastructure failure is outside scope by default (Principle 6); `listOptions*` turns catalog failures into a reason, not a thrown query. |
| C-09 | Thinking adapter `alwaysOn` could change non-Claude effort rows | REQ-005/006; FU-003 boundary | — | Applies only to an effort schema with no default and no `none` level | every other `reasoning_effort` definition has a default (`rg` in autobyteus-ts and server src) | Reject | — | Only the SDK schema reaches the new branch. |
| C-10 | Each locked-menu opening reads both the run's options and its delegated copies' options | DS-005; QR-001 | — | One extra read per opening; concurrent openings coalesce | `provideLockedModelOptionsRefresh` in-flight join | Reject | — | Accepted cost (design Key Tradeoffs: one read per open, no TTL). |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | Refusal wording has one owner; the empty-list rule lives in `ModelCatalogService`; the result kind is split | — |
| Implementation matches behavior-defining supplemental artifacts | Pass | No behavior-defining supplements; probe evidence consistent | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-007 traced in code (see basis table) | — |
| Ownership boundary preservation and clarity | Pass | `NewRunLlmConfigProjection` sole creation owner; `LLMFactory` owns projection; store owns snapshots | — |
| Off-spine concern clarity | Pass | key exports per backend; refusal text owner; refresh control | — |
| Existing capability/subsystem reuse | Pass | extends `llm-config-overrides.ts`, store in-flight map and request ids, `reloadProvider` | — |
| Reusable owned structures | Pass | `ModelListRefreshControl` shared by four picker families; snapshot transitions in `llmProviderCatalogPublication.ts` | — |
| Shared-structure/data-model tightness | Pass | `model_unavailable` lost the diagnostic it no longer needs; `RuntimeCatalogSnapshot` gains two state fields with distinct meanings | — |
| Repeated coordination ownership | Pass | eight sites call `runModelSelectionRefusal`; the application validator and fallback use its two text functions | — |
| Empty indirection | Pass | provide/inject avoided five pass-through relays | — |
| Separation of concerns and file responsibility | Pass | `existingRunModelOptionsActions` mixin moves option reads out of a 501-line store | — |
| Ownership-driven dependency | Pass | server → autobyteus-ts only; projection → backend exports; backends import nothing back | — |
| Authoritative Boundary Rule | Pass | no caller reads `configSchema` or calls `applyRawLlmConfigOverrides` outside `LLMFactory`; components never query catalogs | — |
| File placement | Pass | new server files next to `run-model-selection-service.ts`; web control in `components/common` | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | explicit identity shapes (runtime + model; runtime kind) | — |
| Naming quality; one meaning per word (Principle 15) | Fail | C-02 raw enum in user text; C-03 glossary contradicts the identifiers | CR-002, CR-003 |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity control | Pass | the two rendered-check fixes are local and tested | — |
| Dead code removed in touched files (Principle 7) | Fail | C-01 (`RuntimeModelConfigFields.vue`); C-02 unused `runtimeKind` field | CR-001, CR-002 |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | AC IDs named in test titles; request-level assertions for Anthropic; per-runtime projection table | — |
| Test fixtures/helpers reusable, structure coherent | Pass | — | — |
| No stale, duplicated or compatibility-only tests | Fail | the `RuntimeModelConfigFields.spec.ts` cases that exist only for the dead mode (C-01) | CR-001 |
| API/E2E readiness | Pass | after the Local Fixes; handoff lists the realistic journeys and live SDK checks | — |

## Source File Size And Structure Audit

All changed implementation files stay at or under 500 effective non-empty lines; none was over on the base except `existingRunConfigStore.ts` (501 → 479, shrunk).

| Source File | Before | After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/llmProviderConfig.ts` | 480 | 495 | Pass | Pass (+37/-22) | Pass (transitions moved out) | Pass | — | — |
| `autobyteus-web/stores/existingRunConfigStore.ts` | 501 | 479 | Pass (shrunk) | Pass | Pass | Pass | — | — |
| `autobyteus-server-ts/.../standalone-agent-run-root-manager.ts` | 480 | 483 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-server-ts/.../agent-org-run-manager.ts` | 480 | 481 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/.../ApplicationTeamLaunchProfileEditor.vue` | 470 | 479 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/components/chat/ChatModelMenu.vue` | 399 | 428 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/.../RuntimeModelConfigFields.vue` | 375 | 388 | Pass | Pass | Fail (dead mode, C-01) | Pass | Local Fix | CR-001 |
| other changed files | ≤ 455 | ≤ 455 | Pass | Pass (largest delta 59) | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | stored keys are projected away, not translated |
| No legacy old-behavior retention in changed scope | Pass | `omit`, SDK `thinking`, SDK effort default, per-site wordings, availability empty check, `refreshLocalCatalog` removed |
| Dead code removed in touched files | Fail | CR-001, CR-002 |
| Approved persisted-data transition followed | Pass | `Directly Usable — No Migration`; fallback reason vocabulary unchanged (DEC-D1) |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue`: saved-run mode (`originalModelIdentifier`, `modelOptions`, `runChoice`, replacement-options branches, `modelOptionsMessage`, `track-automatic-changes` switch) and props `readOnly`, `runtimeSelectionLocked`, `modelSelectionLocked`, `modelConfigDisabled`, `modelConfigReadOnly`, `historicalModelConfig`, `missingHistoricalConfig`, `validationErrors`, `historical*` texts; plus the new `originalModelIdentifier === undefined` guards this change added | DormantPath / UnusedTest | only caller `DefinitionLaunchPreferencesSection.vue` passes none of them; FU-004 `rg` | Principle 7 (touched file), DESIGN.md Rule 11 | Remove; keep the new-run mode; delete or rewrite the spec cases that exist only for the removed mode; check what the removal leaves unused (e.g. `projectHistoricalModelConfigFields` is still used by `ModelConfigSection.vue`, so it stays) |
| `ModelListUnavailableError.runtimeKind` | DeadCode | no reader in src or tests | Principle 7 | Remove, or use it to word the message (CR-002) |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: LLM raw-config contract, Claude settings, refresh behavior, new outcome, glossary entries.
- Files: already updated (`autobyteus-ts/docs/*`, `llm_management.md`, `run_history.md`, `autobyteus-web/docs/chat.md`, `GLOSSARY.md`); `GLOSSARY.md` needs the CR-003 wording fix.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

None new or reclassified.

## Review Scorecard (Mandatory)

- Overall score: 9.3 / 10 (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every DS spine is visible in code in the designed order; projection sits at the two designed points | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One owner each for projection, empty-list rule, refusal wording, snapshot lifecycle; no bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Result kind split is explicit; refusal API takes explicit identity and `savedSettingsUnchanged` | — | — |
| 4 | Separation of Concerns and File Placement | 9.3 | Store kept under 500 by moving transitions and option reads out | `RuntimeModelConfigFields.vue` mixes a live and a dead mode (CR-001) | CR-001 |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | `model_unavailable` tightened; snapshot fields singular | — | — |
| 6 | Naming Quality and Local Readability | 9.0 | Clear comments and names overall | raw enum in a user-facing diagnostic (CR-002); glossary contradicts identifiers (CR-003) | CR-002, CR-003 |
| 7 | API/E2E Readiness | 9.3 | Handoff names the realistic journeys and live SDK checks; unit coverage per AC | AC-007 is asserted on `LLMConfig.extraParams`, not on captured requests (adapters spread it; acceptable) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Traced Opus 5 Off, Fable stored Off, SDK effort, projection, refresh coalescing and late-answer guards; live IMP-02 | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | Clean removals listed in the design are done | — | — |
| 10 | Cleanup Completeness | 8.6 | Design removal plan complete | dead saved-run mode left in a touched file and extended (CR-001); unused error field (CR-002) | CR-001, CR-002 |

## Findings

### CR-001 — Dead saved-run mode left in touched `RuntimeModelConfigFields.vue` (Local Fix, implementation)

- Basis: C-01; Core Principle 7 (dead code in touched files is this ticket); DESIGN.md Mandatory Rule 11.
- Evidence: the only production caller (`DefinitionLaunchPreferencesSection.vue` L28-41) passes none of the saved-run props; the implementation engineer's own `rg` (FU-004) confirms only the component and its spec reach them. This change also added new branches on that mode (`:refreshable="originalModelIdentifier === undefined"`, `onModelPickerOpen`), so the dead mode grew.
- Required action: remove the saved-run mode and the unused props listed above, keep the new-run mode used by definition launch preferences, and change or delete the spec cases that exist only for the removed mode (Rule 11: tests follow the code). Remove the FU-004 row from `follow-ups.md` (or mark it resolved in this ticket) when done. Rerun the web unit suite and type check for the component.

### CR-002 — `ModelListUnavailableError` puts the raw runtime enum into user text; unused field (Local Fix, implementation, minor)

- Basis: C-02; REQ-013 / AC-013 alternate (list unreadable); Principle 15; Principle 7.
- Evidence: model-catalog-service.ts L71-76 (`The ${runtimeKind} runtime returned no models.`); application-launch-host-capability-validator.ts passes `failure.message` as the Claude diagnostic, so the application launch issue reads "The model list of Claude Agent SDK could not be read: The claude_agent_sdk runtime returned no models. Try again."; the same message reaches GraphQL errors (`llm-provider.test.ts` L255). `runtimeKind` on the error has no reader.
- Required action: word the message with the runtime's display name (`agentRuntimeName`) or without the runtime (the outer text names it), and drop the unused field or use it only for that wording. Update the tests that pin the old message.

### CR-003 — Glossary says "model list" is not a domain name while the new identifiers use it (Local Fix, implementation, docs-only, minor)

- Basis: C-03; Principle 15; the glossary is the vocabulary authority.
- Evidence: GLOSSARY.md "Offered models" entry vs `model_list_unavailable`, `MODEL_LIST_UNAVAILABLE`, `ModelListUnavailableError`, `modelListUnreadableText`, `ModelListRefreshControl`, `modelListRefreshing`.
- Required action: reword the entry so it states how "model list" appears in names (for example: the model list is a read of a runtime's offered models; `model_list_unavailable` / `MODEL_LIST_UNAVAILABLE` means that read failed). No code rename.

## Follow-ups

- Follow-ups this review added: None.
- FU-004 ruled this ticket (CR-001). FU-005 (pre-existing `projectRunsStore.spec.ts` failure on base) confirmed as a follow-up.

## Classification

- `Local Fix` (implementation-owned): CR-001, CR-002, CR-003. No upstream design or requirement change needed.

## Recommended Recipient

- Implementation Engineer: `/software_engineering_team/implementation_engineer`

Routing note: after the fixes, the change returns through source review (targeted delta) and then API/E2E.

## Residual Risks

- RSK-001 (a future CLI honoring `thinking: disabled`): no effect now that nothing sends it.
- RSK-004: switch default On raises token use on new runs (approved, DEC-002).
- One Claude CLI read per locked or chosen-runtime menu opening (accepted design tradeoff).
- Not yet exercised in a real app: AC-010 / AC-012 Electron journeys with a CLI swap, live SDK session options (AC-005/006), saved-run locked menu rendering. API/E2E owns these.

## Latest Authoritative Result

- Review Decision: `Fail` (Local Fix)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.3 average; Naming 9.0 and Cleanup Completeness 8.6 below the 9.2 bar, both from CR-001..CR-003; every other category ≥ 9.3.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/implementation_engineer`
- Notes: the architecture and behavior are sound; the three fixes are bounded and local. Deviations 1, 2, 5 and the DEC-D1 wording (handoff items 1, 3, 5) are accepted (C-04..C-07).
