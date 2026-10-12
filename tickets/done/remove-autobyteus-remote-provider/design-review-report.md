# Design Review Report — remove-autobyteus-remote-provider

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/requirements-doc.md` (Approved, SR-002)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/design-spec.md` (SR-004, status Ready)
- Supplemental Task Artifacts Reviewed: None are behavior-defining. The origin brief (PTM context file) is listed as input only. Triggering downstream evidence: `code-review-report.md` (CRR-003, CR-001).
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003, SR-004
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Revised design SR-004 from `/software_engineering_team/solution_designer` (2026-10-12). It answers code-review Design Impact CR-001 (CRR-003) and the user's 2026-10-12 request to include that cleanup in this ticket.
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Pass on SR-003)
- Latest Authoritative Round: 2
- Round 2 evidence: on the implemented branch (HEAD `ac3868577`) I ran:
  - `git grep MultimediaRuntime` outside tickets. Hits are limited to the enum, the index export, the three media models (option, field, default and `toString`), the three client factories' `requiresGeminiRuntimeResolver`, and `runtimes.test.ts`.
  - a search for media `.runtime` reads in server `multimedia-management` and `agent-tools/media`. The only reads are the `video-model-provider.ts:18-31` by-runtime log and `mapMedia` `String(model.runtime)` (`llm-provider-model-catalog.ts:127`).
  - a search for web `.runtime` reads outside runtime kind and tests. There are none.
  - a search for docs mentioning `MultimediaRuntime`. There are none.
- Current-State Evidence Basis: worktree at base `origin/personal` @ `beb6b3b49`. Code read directly:
  - `autobyteus-ts/src/llm/{runtimes,providers,provider-display-names,models}.ts`
  - `model-availability-service.ts`, `model-catalog-service.ts`, `llm-provider-service.ts`, `built-in-llm-provider-catalog.ts`
  - `application-provider-credential-readiness-adapter.ts`
  - `secret-management/{catalog/provider-credential-catalog.ts,domain/secret-id.ts}`
  - `media-tool-model-resolver.ts`
  - `token-usage-model-display-projection.ts`
  - all of `src/app-data-migrations/migrations/*` (their imports of `autobyteus-ts` LLM symbols, the built-in catalog and the host-scoped parser)
  - `data_migration_guideline.md` §4 and §7
  - web `types/llm.ts`, `stores/serverSettings.ts`, `ServerSettingsEndpointCards.vue`

  Commands run:
  - repo-wide `git grep` for remote-provider symbols, outside tickets
  - `registerEnumType` / strict enum-parse search
  - `git tag --contains` on the two token-usage and readable-id migrations
  - `git show v1.4.46:…/llm-provider-service.ts` (provider-name conflict rule)

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: Yes. The deletion spans 3 packages and several subsystems. Shared exported enums, the root `clients` export, the GraphQL provider catalog entry and the `modelDiscovery` secret consumer kind are all removed. A released app-data migration is repointed. The test blast radius is wide.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. This is a clean-cut removal of the remote AutoByteus LLM/image/audio provider and `LLMRuntime.AUTOBYTEUS`. There is no migration (DEC-002). The native `RuntimeKind.AUTOBYTEUS` is preserved (REQ-009). Released migrations keep their released behavior (REQ-008).
- Relevant existing behavior and evidence confirmed: Yes. The code matches the investigation notes for every seam checked (details in the table below).
- Scope guardrail confirmed: Yes. UC-001..UC-006 are in scope. The native runtime, the unrelated `AUTOBYTEUS_*` env keys, historical records and the anthropic ticket are out of scope. BEH-010 plus the preserved columns of BEH-001..BEH-009 are preserved. Review authority is per the requirements doc.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (no blocking findings)
- Remaining material ambiguity, if any: None.
- Round 2 basis check:
  - SR-004 changes no requirement, AC or scenario. It adds the REQ-002 dead-code follow-through, which Core Principle 7 requires in touched files, and the user requested it on 2026-10-12.
  - The observable GraphQL value for media rows (`runtime: 'api'`, `hostUrl: null`) is unchanged, and there is no schema, web or data change.
  - The OBS-001 note added to requirements records a pre-existing limitation that also occurs with any unavailable model, for example LM Studio. It does not change approved behavior for this ticket, and AC-004 still holds.
  - The basis remains `Confirmed`.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass. `ModelCatalogService` AUTOBYTEUS source branches; `BUILT_IN_LLM_PROVIDER_IDS` derives from the enum. | Pass. DS-001 | Confirmed | None |
| BEH-002 | System | Pass | Pass. The media source-registry callers are only the catalog AUTOBYTEUS branches (`model-catalog-service.ts:365-483`). | Pass. DS-001 | Confirmed | None |
| BEH-003 | User | Pass | Pass. The provider row is server-driven from the built-in catalog. | Pass. DS-002 | Confirmed | None |
| BEH-004 | User | Pass | Pass. `ServerSettingsEndpointCards.vue:174`; `stores/serverSettings.ts:64`. | Pass. DS-002 | Confirmed | None |
| BEH-005 | System | Pass | Pass. `provider-credential-catalog.ts:19,41-44,73-76`; `secret-id.ts:12-14`; readiness adapter `:168-172`. The serialized consumer identity is never persisted; it is used only as an in-memory key at `provider-credential-catalog.ts:92`. | Pass. DS-003 | Confirmed | None |
| BEH-006 | System | Pass | Pass. The preprocessor and its loader registration were found. Unknown names in saved definitions are skipped (UNK-002). | Pass. DS-003 | Confirmed | None |
| BEH-007 | User | Pass | Pass. After the marker is removed, `parseHostScopedLlmModelIdentifier('x:autobyteus@h')` iterates only the `:ollama@` and `:lmstudio@` markers and returns `null`. The media identifier `img@h` is unregistered, and the dynamic resolver then returns `null` → `MODEL_IDENTIFIER_NOT_AVAILABLE`. `MediaModelResolver` keeps the configured value and does not fall back. | Pass. DS-004 | Confirmed | None |
| BEH-008 | Operational | Pass | Pass. Unknown `.env` keys are custom and deletable (`server-settings-service.ts:212-236`). The vault has no enumeration. | Pass. DS-004 | Confirmed | None |
| BEH-009 | User | Pass | Pass. The backfill migration (`token-usage-provider-name-snapshot-backfill-migration.ts:1-2,47-55`) uses the current helpers. The display projection is snapshot-first. | Pass. DS-005 | Confirmed | None |
| BEH-010 | User/System | Pass | Pass. The server's `LLMRuntime` users are limited to the readiness adapter, catalog, availability, claude/grok normalizers. There is no native-runtime dependency on `LLMRuntime.AUTOBYTEUS`. `RuntimeKind` strings in migrations and fixtures are the native runtime. | Pass. Explicit do-not-touch list | Confirmed | None |

## Supplemental Artifact Coherence Verdict

None. No behavior-defining supplements exist. The origin brief is recorded as input, and the user's correction supersedes its `LLMRuntime` note consistently across all artifacts.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Posture is `Cleanup` (feature removal). | None |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`. The integration plugs into owners at isolated seams; I verified this for the catalog, availability, secret catalog, readiness and web stores. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No refactor. The `MultimediaRuntime` single value is deferred as a Follow-up. | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | The Removal Plan and Key Tradeoffs give the reasons for the GraphQL `ModelDetail.runtime` contract. | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Catalog listing | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Settings UI | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Credential / tool preprocessing | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Leftover saved data | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Backfill migration (bounded local) | Pass | Pass | N/A | Pass | Pass | Pass (frozen table off-spine, migration-owned) | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ModelCatalogService` | Pass | Pass | Pass | Pass | Removing the media source registry eliminates factory-level writes outside the catalog. |
| `ProviderCredentialCatalog` | Pass | Pass | Pass | Pass | — |
| Frozen display-name table | Pass | Pass | Pass | Pass | Only `src/app-data-migrations/` may import it (Dependency Rules). |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server → autobyteus-ts | Pass | Pass | Pass | Pass | The type checker enforces that no removed symbol is referenced. |
| runtime → `app-data-migrations/legacy` | Pass | Pass (forbidden) | Pass | Pass | — |
| Native runtime surfaces | Pass | Pass (explicit do-not-touch list) | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| GraphQL provider catalog ensure/reload/snapshots | Pass | Pass | Pass | Low | Pass |
| GraphQL `setLlmProviderApiKey` | Pass | Pass | Pass | Low | Pass |
| `SecretConsumerIdentity` union | Pass | Pass | Pass | Low | Pass |

No provider or runtime enum is registered as a GraphQL enum (`registerEnumType` search). Removing the members therefore cannot cause enum serialization failures for stored values.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Frozen released shapes | Pass | Pass | Pass | Pass | `src/app-data-migrations/legacy/` is the established home. |
| Unavailable saved selection | Pass | Pass | N/A | Pass | The existing `ensureModelAvailable` and UI states are reused. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts llm/multimedia/clients | Pass | Pass | Pass | Pass | Deletion only. |
| server llm-management / secret-management / application-platform / agent-customization / settings | Pass | Pass | Pass | Pass | Deletion only. |
| server app-data-migrations | Pass | Pass | Pass | Pass | One new frozen file. |
| web settings | Pass | Pass | Pass | Pass | Deletion and `modelKinds` simplification. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| None introduced | Pass | N/A | N/A | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GraphQL `ModelDetail` (media `runtime`/`hostUrl`) | Pass | Pass | Pass | Pass | Pass | SR-004: the shape is unchanged. LLM rows carry a real `runtime`. `mapMedia` writes the literal `'api'`, the same value it emitted before, with no backing media field. The SR-003 deferral premise was incorrect and has been corrected. |
| Media models (`runtime`) | Pass | Pass (SR-004 removes the single-valued field and enum) | Pass | N/A | Pass | The six `runtime === API && provider === GEMINI` checks reduce to `provider === GEMINI`, which is semantically identical because `runtime` was always `API`. |
| Server dynamic-source `modelKind` | Pass | Deferred (Follow-up) | Pass | N/A | Pass | It feeds GraphQL `ModelSourceStatus.modelKind`, which the web reads. Removing it is a contract change, so the Follow-up is justified (resolves R-003). |
| Web `DiscoverySettingCatalogTarget` | Pass | Pass (`modelKinds` removed) | Pass | N/A | Pass | — |
| Media models (`hostUrl`, `modelIdentifier`) | Pass | Pass | Pass | N/A | Pass | `modelIdentifier` collapses to `name`. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/app-data-migrations/legacy/released-llm-provider-display-names.ts` (new) | Pass | Pass | N/A | Pass | Frozen at base `beb6b3b49`. Using the literal `'OPENAI_COMPATIBLE'` in the migration is preferred, and I agree. |
| `token-usage-provider-name-snapshot-backfill-migration.ts` (modify) | Pass | Pass | N/A | Pass | — |
| Deleted/edited files per Removal Plan | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/app-data-migrations/legacy/released-llm-provider-display-names.ts` | Pass | Pass | Low | Pass | Follows `released-skill-access-mode.ts` / `released-team-run-config.ts`. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts remote LLM, clients, media providers/clients, enum members | Pass | N/A | Pass | Pass | Repo-wide `git grep` (non-test, outside tickets) matches the plan; nothing is missing. |
| Dead follow-ons: media source registry, LLM `syncRuntimeModels`/`retainSourceModels`, `model-identifier.ts`, media `hostUrl`, video AUTOBYTEUS branch, `notifyCredentialRevision`/`credentialRevisions`, web `modelKinds` | Pass | Pass | Pass | Pass | Verified: `syncRuntimeModels` is used only by `autobyteus-gateway-routing.test.ts` and e2e mocks. `credentialRevisions` is incremented only via the AUTOBYTEUS caller (`llm-provider-service.ts:210-212`). |
| Server discovery service, catalog/availability/provider/built-in/settings/secret/readiness/preprocessor branches | Pass | N/A | Pass | Pass | — |
| Web card, store target, post-save refresh, enum member | Pass | N/A | Pass | Pass | — |
| Docker, live-E2E harness, docs | Pass | N/A | Pass | Pass | Matches the grep inventory (llm_management, secret_management, autobyteus-ts docs, web settings.md). |
| Tests (delete vs retarget) | Pass | Pass | Pass | Pass | Explicit lists; generic tests are retargeted (DEC-003). |
| SR-004: `MultimediaRuntime` enum and export, media `runtime` option/field/`toString`, always-true GEMINI check halves, `video-model-provider.ts` by-runtime log, `runtimes.test.ts` | Pass | Pass (`mapMedia` literal `'api'`) | Pass (Change Sequence step 6) | Pass | The inventory matches my `git grep`; there is no missed consumer. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Host-scoped parser marker | No | Pass | Pass | Rejected in the log. |
| Enum member kept for history | No | Pass | Pass | Uses snapshots plus the frozen migration table. |
| Frozen display-name table | No (migration-owned, isolated) | Pass | Pass | Guideline §4 pattern; runtime import is forbidden. |
| Hidden predefined setting / startup cleanup / deprecated export alias | No | Pass | Pass | Rejected per DEC-002 and the non-goals. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `.env` `AUTOBYTEUS_LLM_SERVER_HOSTS` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Tolerant custom-setting reader. |
| Vault `provider.autobyteus.api-key` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Addressed by ID only; consumer identity is not persisted. |
| Saved remote model identifiers | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Verified parser and resolver paths (BEH-007 row). |
| Token-usage ledger rows | Directly Usable — No Migration | Pass | Pass | N/A | Pass | The released backfill is repointed with an identical-output frozen table. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| ts → server (freeze first) → web → ops/docs → static search | Pass | Pass (none needed) | Pass | Pass |
| SR-004 delta on the implemented branch (step 6), followed by source re-review and an API/E2E rerun | Pass | Pass (none needed) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Saved remote identifier after removal | Yes | Pass | Pass | Pass | — |
| Backfill migration freeze | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `PRM-001` — The released `custom-provider-readable-id` migration changes behavior when `AUTOBYTEUS` leaves the built-in provider list

- Related approved requirement or established contract: REQ-008 ("Released app-data migrations keep their released behavior"); data-migration guideline §4. The design spec's escalation trigger names "any released migration besides the backfill one that depends on a removed member".
- Relevant behavior ID(s): BEH-009 (preserved migrations), BEH-008
- Initiating basis kind: `Contract` (governing released-migration contract) and `Operational` (upgrade with a pending migration)
- Independent product-supported initiating trigger or applicable governing contract:
  - The trigger is an install upgrading from a pre-v1.4.47 release with a pending `CustomProviderReadableIdAppDataMigration` (`requiredOnStartup = true`, released since v1.4.47).
  - Its `buildMappings` rejects any custom provider whose normalized name equals a built-in provider name. The default `builtInProviderNames` comes from the current `getBuiltInLlmProviderCatalog()` (`custom-provider-readable-id-app-data-migration.ts:144-145, 261-265`).
- Support evidence: Removing `LLMProvider.AUTOBYTEUS` drops "AutoByteus" from that list. Only a custom provider named "AutoByteus" would be classified differently.
- Forward current or approved target production caller/event path: the user creates a custom provider in Settings → `LlmProviderService.assertProviderNameAvailable`. In v1.4.46 that check rejects any name that conflicts with a built-in provider name (`git show v1.4.46:…/llm-provider-service.ts:375-386`). So a supported user action cannot produce a stored custom provider named "AutoByteus" in the source shape.
- Lifecycle preconditions and material consequence at the claimed point: the input needed for divergence is not producible through supported product actions. Separately, this use of the current catalog is output validation: it checks that a migrated ID does not collide with a *current* built-in name. Guideline §4 explicitly permits importing current code for that purpose, and once AUTOBYTEUS is gone there is no current collision to prevent.
- Reachability: `Not Reachable` (through supported actions). The dependency is also a legitimate validation against the current target.
- Review consequence / proportionate response: No finding and no freeze machinery. The design's §2 checklist item 3 says "The only owner affected is the released backfill migration". It would be more accurate if it also named this migration and gave the reason it is not affected (recommendation R-001, non-blocking). Implementation should not treat this migration as firing the escalation trigger.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None (blocking). Non-blocking recommendations:

- **R-001 (documentation accuracy, non-blocking):** `design-spec.md` §2 checklist item 3 and the escalation trigger imply that the backfill migration is the only released migration touching removed members. `custom-provider-readable-id-app-data-migration.ts` also reads the current built-in provider names. It needs no freeze, because the dependency is output validation and the divergent input cannot be produced (PRM-001). The Solution Designer or the implementer may add a one-line note so the escalation trigger is not misread. This is not required for Pass.
  This is still open and optional; SR-004 did not adopt it.
- **R-002 (factual correction):** Resolved in SR-004. The investigation and design now say "first released in v1.4.31".
- **R-003 (follow-up candidate):** Resolved in SR-004. The server dynamic-source `modelKind` is an explicit Follow-up with a correct contract rationale: the web reads `ModelSourceStatus.modelKind`.
- **R-004 (non-blocking, requirements bookkeeping):** OBS-001 is recorded as a pre-existing limitation of SCN-004 for stopped native runs, and the handoff says it was raised with the user. It does not change this ticket's behavior. The separate-ticket candidate should be tracked so it is not lost.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary pass handoff, for the SR-004 delta on the implemented branch); `/software_engineering_team/solution_designer` (informational).

## Residual Risks

- ASM-002: an external consumer of the removed `autobyteus-ts` root exports. Low risk; the approved non-goals exclude any deprecation alias.
- Coverage loss if implementation deletes generic tests instead of retargeting them. The explicit retarget list mitigates this, and code review should check it.
- Rebase coordination with anthropic-incomplete-content-block (`autobyteus-llm.ts`).
- Rows in token-usage history with neither a snapshot nor a migration fill render `Unknown Provider (AUTOBYTEUS)`. The approved BEH-009 wording ("still displays") allows this, and such rows are expected to be rare.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (PRM-001 Not Reachable; it drives no finding or machinery). SR-004 adds no new premise.
- Notes:
  - Round 2 (ARCH-REV-002, SR-004): Pass.
  - The `MultimediaRuntime` removal is a correct application of Core Principle 7 in touched files. It is behavior-preserving: `mapMedia` writes the same `'api'` value and the GEMINI checks are equivalent.
  - The corrected Key Tradeoffs rationale is accurate, and keeping `modelKind` as a Follow-up is justified.
  - The SR-003 conclusions still stand: a proportionate clean-cut deletion at existing seams, the frozen backfill table per guideline §4, and no migration for leftover data.
