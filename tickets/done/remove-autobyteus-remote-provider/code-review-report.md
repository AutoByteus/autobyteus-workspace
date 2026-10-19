# Code Review Report — remove-autobyteus-remote-provider

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/requirements-doc.md` (Approved; SR-001 baseline + DEC-001(a), DEC-002(a), recorded in SR-002)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/solution-revision-record.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed As Context: None are behavior-defining. Product Design artifacts: N/A — not applicable. Rendered-check evidence: `implementation-checks/settings-removal-run-1/result.json`.
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/design-review-report.md` (Pass)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Current Review Round: 2
- Review Scope: `Targeted Delta Review` (round 1 was `Full Review`, CRR-001; CRR-003 reopened it)
- Review Scope Evidence (round >1): IR-002 is one commit, `403eb2784` (12 files, +10/−59), confined to CR-001: the `MultimediaRuntime` enum, its export, the media model `runtime` field/option, six Gemini checks, `mapMedia`, by-runtime video logging and stale test mocks. It changes no data-flow spine, no shared interface beyond deleting the dead enum, and the GraphQL shape is unchanged. Unaffected checks from CRR-001 carry forward.
- Relevant Solution / Architecture / Implementation Revision IDs added this round: SR-004, ARCH-REV-002, IR-002
- Trigger: Implementation-complete handoff from `/software_engineering_team/implementation_engineer` (IR-001, Large/High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The code commit changes 108 files (+338/−5424) across 3 packages plus Docker and the live-E2E harness. It shrinks shared exported enums, the root `clients` export, the GraphQL provider list and the secret consumer union, and it repoints a released app-data migration. That matches the design's Large/High rationale.

## Review Scope

- Changed implementation and behavior reviewed: branch `codex/remove-autobyteus-remote-provider`, commits `4196f55a5` (frozen display names + backfill repoint), `fdb7635f3` (removal), `ac3868577` (docs), against base `beb6b3b49`. Every added or modified source file was read in full diff. Deleted files were confirmed absent and checked for no remaining importers.
- Files / areas reviewed:
  - **autobyteus-ts:** `llm/{runtimes,providers,provider-display-names,models,llm-factory}.ts`, `llm/prompt-renderers/index.ts`, `multimedia/{runtimes,providers,index}.ts`, `multimedia/{audio,image,video}/*-model.ts`, `multimedia/{audio,image}/*-client-factory.ts`, `multimedia/{audio,image}/api/index.ts`, `src/index.ts`.
  - **Server:** `model-catalog-service.ts`, `model-availability-service.ts`, `llm-provider-service.ts`, `built-in-llm-provider-catalog.ts`, `server-settings-service.ts`, `secret-id.ts`, `provider-credential-catalog.ts`, `local-import-credential-alias-registry.ts`, `application-provider-credential-readiness-adapter.ts`, `agent-customization-loader.ts`, `llm-provider-model-catalog.ts`, `app-data-migrations/legacy/released-llm-provider-display-names.ts` (new), `token-usage-provider-name-snapshot-backfill-migration.ts`.
  - **Web:** `ServerSettingsEndpointCards.vue`, `useProviderApiKeySectionRuntime.ts`, `stores/{llmProviderConfig,llmProviderConfigSupport,serverSettings}.ts`, `types/llm.ts`.
  - **Ops / test-support:** Docker scripts and compose; `test-support/live-e2e/*`.
  - **Tests:** the retargeted and new tests (catalog, availability, credential catalog, settings, backfill, summary port, GraphQL provider, real-e2e capabilities).
  - **Docs:** the changed current docs.
- Focused reruns by the reviewer: server `vitest run` on `tests/unit/llm-management/services`, `provider-credential-catalog`, `server-settings-service`, the backfill migration and `agent-customization-loader` → 7 files / 82 tests pass. autobyteus-ts `llm-phase-summary-port` and `dynamic-model-identifiers` → 2 files / 14 tests pass.
- Explicit exclusions: historical `tickets/` folders, `test-results/` logs, release notes and UI prototypes (DEC-004). Executable validation of AC-002..AC-008 belongs to API/E2E.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. This is a clean-cut removal of the remote AutoByteus LLM/image/audio provider and `LLMRuntime/LLMProvider/MultimediaRuntime/MultimediaProvider.AUTOBYTEUS`. There is no migration of leftover data (DEC-002). The native `RuntimeKind.AUTOBYTEUS` agent runtime is preserved (REQ-009/BEH-010).
- Design-spec behavior map verified against the implementation: Yes. Every row is confirmed below.
- Design review report and round confirmed: ARCH-REV-001 Pass, round 1. R-001 (do not freeze `custom-provider-readable-id`) and R-003 (no GraphQL `modelKind` reshape) were honored.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Remote LLM files and `src/clients/` are deleted. `ModelCatalogService.ensure/reload` now go only through `ensureLlmSource`. `HOST_SCOPED_LLM_RUNTIMES` = Ollama, LM Studio. | — |
| BEH-002 | Confirmed | Media providers/clients, `model-identifier.ts`, media `hostUrl` and the factory source registries are deleted. `snapshotFor` lists media from factory built-ins by provider. | — |
| BEH-003 | Confirmed | The provider list derives from the enum (`BUILT_IN_LLM_PROVIDER_IDS`); the AUTOBYTEUS member and DISCOVERED clause are removed; the web enum member is removed. Rendered check: no AutoByteus row. | — |
| BEH-004 | Confirmed | The quick-setup field, predefined setting, refresh clause and web discovery target are removed. Rendered check: LM Studio, Ollama, VNC cards only. | — |
| BEH-005 | Confirmed | The `modelDiscovery` consumer variant and serializer case, the AUTOBYTEUS binding, media AUTOBYTEUS allowance, import alias, readiness case, provider-service notify branch, `notifyCredentialRevision`/`credentialRevisions` and the web post-save refresh are all removed. `resolveAutoByteusAuthority` is kept (native runtime). | — |
| BEH-006 | Confirmed | The preprocessor, its tests and its loader registration are deleted. Saved definitions that name it are skipped by the existing unknown-name path (UNK-002, verified at design review). | — |
| BEH-007 | Confirmed | Resolution path: `ensureModelAvailable` → not registered → `resolveDynamicProvider`. For LLM, `parseHostScopedLlmModelIdentifier('x:autobyteus@h')` returns `null`. For media, `kind !== 'LLM'` returns `null`. The result is `MODEL_IDENTIFIER_NOT_AVAILABLE`. A new unit test covers LLM, IMAGE and AUDIO. | — |
| BEH-008 | Confirmed | No code path reads the leftovers. The unknown `.env` key is custom/deletable (new unit test plus rendered delete). The vault row has no binding, and the alias is skipped. | — |
| BEH-009 | Confirmed | The frozen table equals base `beb6b3b49` `LLM_PROVIDER_DISPLAY_NAMES` minus `OPENAI_COMPATIBLE`, entry for entry (verified with `git show`). The migration compares against the literal `"OPENAI_COMPATIBLE"`, and its ID and SQL are unchanged. The only importer is the backfill migration. A new classification test covers it. | — |
| BEH-010 | Confirmed | `git diff beb6b3b49..HEAD -- autobyteus-server-ts/src/runtime-management autobyteus-server-ts/src/agent-execution autobyteus-ts/src/agent` is empty. `RuntimeKind`, `DEFAULT_RUNTIME_KIND`, `normalizeRuntime` and native fixtures are unchanged. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001/002 | System | Server model catalog | Build catalog | Start; list/ensure/reload | Normal | DS-001: resolver → `ModelCatalogService` → built-ins + Ollama/LM Studio/custom sources | No AUTOBYTEUS source; ensure/reload with `AUTOBYTEUS` → `UNKNOWN_MODEL_PROVIDER` | requirements SCN-001; catalog unit tests; rendered GraphQL probe | Supported Normal Scenario | Use |
| SCN-002 | BEH-003/004 | User | App user | Configure providers | Settings page | Normal | DS-002: Settings → stores → GraphQL → provider/settings services | No AutoByteus row/card; others unchanged | requirements SCN-002; rendered check | Supported Normal Scenario | Use |
| SCN-003 | BEH-005/006 | System | Vault / readiness / tool preprocessing | Resolve credentials, preprocess tools | Run launch, media tool, `.env` import | Normal | DS-003 | Only remaining bindings | requirements SCN-003; credential catalog tests | Supported Normal Scenario | Use |
| SCN-004 | BEH-007/009 | User | User with old saved selections | Open/launch saved work | Editors, resume, launch, media tools | Normal (established convention) | DS-004: `ensureModelAvailable` → not available | Unavailable, value kept, launch blocked | requirements SCN-004; availability tests | Supported Normal Scenario | Use |
| SCN-005 | BEH-008 | Operational | Upgrading install | Start upgraded server | Server start | Normal | Tolerant settings reader; unbound vault row | Normal start; leftovers inert | requirements SCN-005; settings test; rendered start | Supported Normal Scenario | Use |
| SCN-006 | BEH-010 | User | App user | Use native runtime | Run launch/resume | Normal | Unchanged runtime paths | Unchanged | Empty diff on runtime folders | Supported Normal Scenario | Use |
| CON-001 | REQ-008, guideline §4 | Contract | Released app-data migration | Released migrations keep released output | Migration runner | Normal | DS-005 | Identical classification | Frozen-table comparison with base | Supported Normal Scenario | Use |
| CON-002 | Core Principle 7, design Removal Plan | Contract | Engineering contract | No dead code in touched files | — | — | — | Dead code removed or listed | design-principles §7 | Supported (contract) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-001 | `BaseLLM.releaseConversation` (default no-op) and the bounded release in `LlmPhaseSummaryPort.release` have no production override after `AutobyteusLLM` is deleted. The summary-port tests were retargeted to a test-only `SessionScriptedLLM`. | CON-002 | Compaction of any agent conversation | The port still calls the hook; in production it is a no-op, so the bounding has no effect. | `git grep releaseConversation` → only `base.ts:221` and `llm-phase-summary-port.ts:188`. Neither file is touched by this change. | Reject (as a finding) | Core Principle 7 scope: dead code outside the touched files is listed as a follow-up, not removed in this change. The implementer recorded it as follow-up 1. The design explicitly listed `llm-phase-summary-port.test.ts` for retargeting. Carried as a residual follow-up. |
| CAND-002 | `listExternalRuntimeSnapshots` now uses `llmModels[0]!` in place of the `?? LLMProvider.AUTOBYTEUS` fallback | CON-002 | External-runtime catalog listing | Groups are created only when a model is added, so `llmModels` is never empty. | `model-catalog-service.ts:298-306` | Reject | The fallback was unreachable; the assertion is correct by construction. |
| CAND-003 | The design's doc list named `docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` and `docs/features/artifact_file_serving_design.md`, but neither was changed | REQ-010 | Docs sync | Their "AutoByteus image/audio/video MCP forms" are the server's `mcp__autobyteus_agent_tools__generate_*` tools (`file-change-tool-semantics.ts:10-13`), not the remote provider. | `git grep` on both docs | Reject | No remote-provider content to remove. Leaving the docs unchanged is correct. |
| CAND-004 | `configuredHostsFor` returns LM Studio hosts for any non-Ollama runtime | BEH-007 | Availability resolution | The parameter type is `HostScopedLlmModelIdentifier['runtime']` = `OLLAMA \| LMSTUDIO`, so the switch is exhaustive. | `models.ts:72-80` | Reject | Correct for the narrowed type. |
| CAND-005 | Media availability now uses `hasRegisteredModel` and does no dynamic resolution | BEH-002/007 | Media tool with a saved/default model | Built-in media models were always API-runtime, so registered meant available. Unregistered → `MODEL_IDENTIFIER_NOT_AVAILABLE`. | Diff; new availability tests | Reject | Behavior-preserving for every remaining provider. |
| CAND-006 | `test-support/live-e2e/live-e2e-harness.ts` has 1295 effective lines (>500) | CON-002 | — | Pre-existing test-support infrastructure; this change only removes 30 lines. | Line count | Reject | Not changed implementation source under size pressure; out of scope. |
| CAND-007 | The web convergence uses a module constant `DISCOVERY_SETTING_MODEL_KINDS = {'LLM'}` and resets only `llmModels` | BEH-004 | Editing Ollama/LM Studio hosts | The previous Ollama/LM Studio targets were `['LLM']`, so the behavior is identical. | `llmProviderConfig.ts:256-290`; store tests | Reject | Correct dead-generality removal. |
| CAND-008 | `MultimediaRuntime` keeps a single value (`API`). Every check of it is always true, and the media `runtime` field always holds `API`. | CON-002 (Core Principle 7: a configuration value with one remaining option, and the code behind the other values) | — | Six always-true checks remain in files this change touches: `{audio,image,video}-model.ts` `createClient` and `{audio,image,video}-client-factory.ts` `requiresGeminiRuntimeResolver`. The models carry a field that always holds one value. | CRR-003 investigation: `git grep MultimediaRuntime` shows uses only in `autobyteus-ts/src/multimedia/*`; no server src use beyond `mapMedia`'s `String(model.runtime)`. The web declares `runtime`/`hostUrl` on `ModelInfo` but never reads them (search of components, stores, composables, utils, pages, types). The GraphQL `ModelDetail.runtime` field is shared with LLM rows, which do vary, so the field stays. Removing the media enum does not change the GraphQL shape. | Promote (CRR-003; was Reject in CRR-001) — resolved in CRR-005 by IR-002 | CR-001. The design's deferral rationale ("would reshape the shared GraphQL contract") does not hold: the server can write `"api"` for media rows with no contract change. The cleanup is in touched files and the user explicitly asked for it in this ticket on 2026-10-12. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Cleanup / No Design Issue Found; each seam was removed inside its existing owner | None |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None exist; UI requirement (card/row disappear, order kept) verified by rendered check | None |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-005 are intact; the catalog's ensure/reload spine is simplified to one `ensureLlmSource` path | None |
| Ownership boundary preservation and clarity | Pass | `ModelCatalogService` remains the only writer of dynamic sources. Removing the media source registry eliminates factory writes outside it. | None |
| Off-spine concern clarity | Pass | The frozen table sits under migration-owned `legacy/` and is imported only by the backfill | None |
| Existing capability/subsystem reuse | Pass | Reuses `app-data-migrations/legacy/` and the existing unavailable-model path | None |
| Reusable owned structures | Pass | No new duplication | None |
| Shared-structure/data-model tightness | Pass | Media models lose `hostUrl`; `DiscoverySettingCatalogTarget` is reduced to `ownerProviderId`; the `SecretConsumerIdentity` union loses `modelDiscovery` | None |
| Repeated coordination ownership | Pass | No new policy repetition | None |
| Empty indirection | Pass | `configuredHostsFor` deduplicates two call sites; no pass-through layers | None |
| Separation of concerns and file responsibility | Pass | Each touched file keeps one concern | None |
| Ownership-driven dependency check | Pass | No server reference to a removed `autobyteus-ts` symbol (typecheck); no runtime import of the legacy table | None |
| Authoritative Boundary Rule | Pass | No caller depends on both the catalog and the factory source registry; that registry no longer exists for media | None |
| File placement | Pass | New file is in the established `legacy/` home | None |
| Flat-vs-over-split layout | Pass | Deletion only, plus one small file | None |
| Interface/API boundary clarity | Pass | GraphQL shapes are unchanged; `AUTOBYTEUS` is rejected via the existing `UNKNOWN_MODEL_PROVIDER` / `requireBuiltInProviderId` | None |
| Naming quality | Pass | `RELEASED_LLM_PROVIDER_DISPLAY_NAMES`, `isReleasedBuiltInLlmProviderId`, `configuredHostsFor` and `DISCOVERY_SETTING_MODEL_KINDS` are self-descriptive | None |
| No unjustified duplication | Pass | The frozen table duplicates display names by design (guideline §4) | None |
| Patch-on-patch complexity control | Pass | Initial round; clean deletions | None |
| Dead code removed in touched files (Core Principle 7) | Pass | Design list complete. Extra items removed: `registerToolInvocationPreprocessor` + `logger.warn` (no other caller), the always-true `runtime === API` filter in `snapshotFor`, the `retainSourceModels`/`syncRuntimeModels` family, the live-E2E `hosts` field. Remaining items outside touched files are listed as follow-ups. | None |
| Test scenarios and assertions are clear and requirement-aligned | Pass | New tests map to AC-003 (catalog reject), AC-004 (availability), AC-005 (settings leftover), AC-006 (backfill classification) and the credential-catalog rejection | None |
| Test fixtures/helpers reusable and coherent | Pass | The catalog test uses an `ollamaModel` builder plus `OllamaModelProvider` spies; the credential test was renamed to its real subject | None |
| No stale, duplicated, or compatibility-only tests | Pass | Remote-only tests deleted per the design list. The remaining `AUTOBYTEUS` mentions in tests assert the approved leftover/rejection behavior. | None |
| API/E2E readiness | Pass | Typecheck, builds and suites green per the handoff; focused reruns green; coverage hints provided | None |

## Source File Size And Structure Audit

All changed implementation-source files shrank or are new and small. None crosses a threshold through this change.

| Source File | Effective Non-Empty Lines | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/llmProviderConfig.ts` | 496 | Pass (pre-existing, under 500) | Pass (+4/−5) | Pass | Pass | No action | None |
| `server/.../model-catalog-service.ts` | 334 | Pass | Pass (+10/−142) | Pass | Pass | Improved | None |
| `server/.../model-availability-service.ts` | 97 | Pass | Pass (+17/−74) | Pass | Pass | Improved | None |
| `autobyteus-ts/src/llm/llm-factory.ts` | 294 | Pass | Pass (−30) | Pass | Pass | Improved | None |
| `autobyteus-ts/.../{audio,image}-client-factory.ts` | 184 / 256 | Pass | Pass (−56 each) | Pass | Pass | Improved | None |
| `server/.../legacy/released-llm-provider-display-names.ts` (new) | 21 | Pass | Pass | Pass | Pass | New, migration-owned | None |
| Other touched source files | ≤ 433 | Pass | Pass (deletions) | Pass | Pass | No action | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No parser marker, alias, hidden setting or deprecated export kept |
| No legacy old-behavior retention | Pass | Every remote branch was removed |
| Dead code removed in touched files | Pass | See the structural check |
| Approved persisted-data transition decision followed | Pass | `Directly Usable — No Migration`; no cleanup or migration added |
| No version-specific dual reads/writes or old-shape fallback | Pass | Saved remote identifiers fall to the generic unavailable path |
| Transition mechanics match the design | Pass | Backfill ID and SQL unchanged; classifier source frozen and identical |

## Dead / Obsolete / Legacy Items Requiring Removal

None in the changed scope. Follow-ups outside the touched files, recorded by the implementer and confirmed here:

1. `BaseLLM.releaseConversation` plus the release step in `LlmPhaseSummaryPort` have no production override (CAND-001).
2. The `logicalConversationId` kwarg is consumed only by the deny-list in `provider-request-kwargs.ts`.
3. Single-valued `MultimediaRuntime`, the media `runtime`/`hostUrl` GraphQL fields and the source-row `modelKind` (design Follow-up, R-003).
4. Multi-kind freshness aggregation in `useProviderApiKeySectionRuntime`.

## Docs-Impact Verdict

- Docs impact: `Yes`, already addressed in `ac3868577`.
- Why: The current docs described the remote provider, its settings card and the credential binding.
- Files or areas updated:
  - `autobyteus-ts/docs/{provider_model_catalogs,llm_module_design,llm_module_design_nodejs,agent_memory_design}.md`
  - `autobyteus-server-ts/docs/modules/{llm_management,multimedia_management,secret_management,agent_customization}.md`
  - `autobyteus-web/docs/settings.md`
- Leftover-data notes intentionally name the old key so users know what they can delete. The two server docs the design listed were left unchanged correctly (CAND-003).

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| PRM-001 | Confirmed | `custom-provider-readable-id-app-data-migration.ts` is unchanged, as R-001 directed. |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.5
- Overall score (`/100`): 95

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | All five spines are intact. Catalog ensure/reload collapses to one dynamic-source path. | Nothing material | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | Owners are unchanged. Removing the media source registry strengthens the catalog boundary. | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | GraphQL shapes are unchanged, and `AUTOBYTEUS` is rejected via the existing errors. The secret union is tighter. | The media `runtime`/`hostUrl` fields are now constants (approved follow-up) | Address in the follow-up ticket |
| 4 | Separation of Concerns and File Placement | 9.6 | Deletions stay within owners; the new file is in `legacy/`. | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | Media models lose `hostUrl`; the discovery target is minimal. | Single-valued `MultimediaRuntime` remains (approved follow-up) | Follow-up |
| 6 | Naming Quality and Local Readability | 9.5 | Clear new names; the frozen table has an explanatory header. | — | — |
| 7 | API/E2E Readiness | 9.4 | Broad suites green; AC-mapped unit tests added; coverage hints given. | The Electron shell and saved-selection editors were not rendered (handoff limitation) | Covered by the API/E2E plan |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | The leftover identifier, setting, vault and backfill paths were traced and tested. Native-runtime folders have an empty diff. | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.7 | No marker, alias, hidden setting or cleanup; the frozen table is migration-only. | — | — |
| 10 | Cleanup Completeness | 9.3 | AC-001 search is clean outside tickets, records, intentional tests and docs. Extra dead code in touched files was removed. | The release hook remains effect-less outside touched files (recorded follow-up) | Separate follow-up ticket |

## Findings

| Finding ID | Area | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| CR-001 (CRR-003) | Single-valued `MultimediaRuntime` and the always-true media runtime checks (CAND-008, CON-002) | `autobyteus-ts/src/multimedia/runtimes.ts` now has only `API`. The audio/image/video models default `runtime` to `API`, and nothing sets anything else. `requiresGeminiRuntimeResolver` (`audio-client-factory.ts:188`, `image-client-factory.ts:264`, `video-client-factory.ts:116`) and `createClient` (`audio-model.ts:73`, `image-model.ts:76`, `video-model.ts:76`) test `runtime === API && provider === GEMINI`, whose first half is always true. The web never reads media `runtime`/`hostUrl`. The design's Follow-up rationale (GraphQL contract reshape) is not needed: `ModelDetail.runtime` stays for LLM rows, and media rows can emit `"api"`. All these files are touched by this change. | Solution Designer: move this item from Follow-up to "In This Change" in the Removal Plan and correct the Key Tradeoffs rationale. Expected shape (designer to confirm): delete `MultimediaRuntime` and its `multimedia/index.ts` export; remove `runtime` from the audio/image/video model options and fields; reduce the six checks to `provider === GEMINI`; server `mapMedia` emits `runtime: 'api'` (no GraphQL schema change); update `tests/unit/multimedia/runtimes.test.ts` and affected tests. Then implementation, source re-review, and an API/E2E rerun. | `Design Impact` — `/software_engineering_team/solution_designer`. **Resolved (CRR-005):** SR-004 moved the item In This Change (ARCH-REV-002 Pass). IR-002 `403eb2784` deletes `runtimes.ts` and its export, removes the media `runtime` option/field/default/`toString` mention, reduces all six checks to `provider === MultimediaProvider.GEMINI`, has `mapMedia` emit `runtime: 'api'`, drops by-runtime video logging, and removes stale mock fields. Verification: `git grep MultimediaRuntime` finds only historical tickets; no media `.runtime` reads remain in server src, test-support or autobyteus-ts src; server `pnpm typecheck` and the autobyteus-ts build typecheck exit 0; reviewer reruns pass (autobyteus-ts `tests/unit/multimedia` 131 tests; server GraphQL types, llm-management services, multimedia-management 70 tests). |

## Classification

N/A (Pass, CRR-005). CR-001 was `Design Impact` in CRR-003 and is resolved through SR-004 / ARCH-REV-002 / IR-002.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer` (primary pass handoff, for the API/E2E rerun); `/software_engineering_team/implementation_engineer` (informational).

## Residual Risks

- Follow-ups 1–4 above (non-blocking, outside the touched files or approved as design follow-ups).
- ASM-002: an external consumer of the removed `autobyteus-ts` root exports. Low risk; no deprecation alias, per the non-goals.
- RSK-003: rebase coordination with anthropic-incomplete-content-block (`autobyteus-llm.ts` is deleted here).
- Token-usage rows with neither a snapshot nor a backfill fill render `Unknown Provider (AUTOBYTEUS)` (accepted at design review).
- Not yet executed beyond unit level: AC-004 rendered in the editors, AC-005 with a real vault row, AC-007 native-runtime launch/resume in a desktop instance, AC-008 Docker start. These belong to API/E2E.

## Latest Authoritative Result

- Review Decision: `Pass` (CRR-005, round 2)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.6/10 (96/100). Cleanup Completeness restored to 9.5 and Shared-Structure Tightness to 9.5 (CR-001 resolved); other categories as in CRR-001; every category ≥ 9.3.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: The removal plus the `MultimediaRuntime` cleanup is complete and clean. The native `RuntimeKind.AUTOBYTEUS` runtime remains untouched. Remaining follow-ups (outside touched files or explicitly deferred): the effect-less `BaseLLM.releaseConversation` / summary-port release step, the `logicalConversationId` kwarg, the server dynamic-source `modelKind` (R-003), and multi-kind freshness aggregation in the web. The test review (CRR-004) passed earlier; after this rerun, a fresh proportional test review is required before delivery.
