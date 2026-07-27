# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Delta-defining supplement: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/custom-provider-v1-migration-contract.md`
- Other directly affected supplements: `encrypted-secret-vault-contract.md`, `credential-consumer-mapping.md`, `use-case-spine-validation.md`, `secret-storage-architecture.md`, `live-test-secret-provisioning.md`, and `threat-model-and-option-analysis.md`
- Carried-forward unchanged supplements: `gemini-setup-ui-ux-spec.md`, `repository-prisma-1.0.8-assessment.md`, and superseded tombstone `secret-storage-backend-contract.md`
- Current Review Round: 33
- Trigger: user-approved fixed-path custom-provider-v1 migrate-or-delete transition after the observed packaged existing-user Settings failure
- Prior Review Round Reviewed: 32
- Latest Authoritative Round: 33
- Review Scope: **bounded delta review only**. The review covers the custom-provider-v1 persisted-data transition, its exact create-only vault batch/compensation boundary, delete-and-reconfigure outcome, current-v2-only runtime, Settings/catalog containment, directly affected spines, and package consistency. The previously passed one-database vault, importer, provider-centric Settings shape, Gemini, Claude, Codex, Docker, test bootstrap, dependency, and assurance decisions are carried forward without re-review.
- Current-State Evidence Basis: direct `origin/personal` custom-provider v1 schema/writer and create/list/use/delete path; current target v2-only custom-provider store and assembled `listProviderSettings()` path; existing `AppDataMigrationRunner`/registry/status GraphQL and startup ordering; value-free post-delivery evidence `238`/`240`; no real custom-provider file, credential, vault row, DB content, root key, or authentication state was opened.
- Independent Delta Checks: 11 active package files passed link/fence checks; exact 17 BEH / 18 REQ / 15 AC / 18 UC sets and 43 spine rows passed; scoped `git diff --check` passed; focused recovery/runtime-v1 contradiction scan passed. The solution package records a successful 15/15 Mermaid render; the delta diagram also received focused semantic inspection.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1–31 | Earlier clean-state/provider-centric rounds | AR-001–AR-026 and recorded material premises | As historically recorded | Fail/Pass iterations | No | Historical progression; unchanged areas are not re-reviewed here. |
| 32 | Bounded AR-026 correction | AR-026 / MP-012 | None | Pass | No | Provider-centric Settings contract became coherent. |
| 33 | User-approved custom-provider-v1 migration/reset delta | Round-32 Pass plus post-delivery custom-provider requirement gap | None | Pass | Yes | Fixed-path historical data gets one isolated migration; failure is contained to custom providers and uses the approved delete-and-reconfigure outcome. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round / Trigger | Finding Or Gap | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 32 | AR-026 / MP-012 | Medium | Remains resolved | The custom-provider delta does not change the four non-null provider capability-list contract. | Carried forward without re-review. |
| Post-delivery observed journey | Fixed v1 file caused `CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED` and could reject the general Settings read | Requirement gap / Design Impact | Resolved in design | BEH-008, REQ-012, AC-008, UC-007, DS-UC007D, DS-L007, and the normative migration contract define preservation, reset, and Settings containment. | Implementation must reconcile the preserved downstream source rather than treat it as design authority. |
| 1–31 | AR-001–AR-025 / MP-001–MP-011 and CR-027 design impact | Critical–Low | Resolved or superseded | Round-32 authoritative report and current clean-state package | No unchanged decision was reopened. |

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: yes.
- Relevant existing behavior and evidence confirmed: yes.
- Approved change, preserved behavior, and outside scope understood: yes.
- Remaining material ambiguity: none.

| Behavior ID | Kind | Design Alignment With Approved Intent | Trigger / Current Evidence | Target Path Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-008 | System + User | Pass | `origin/personal` writes the fixed v1 plaintext-key file; packaged upgrade evidence reaches the current v2-only rejection; New Provider is the supported recovery surface. | Pass | Confirmed | None. |
| BEH-010 | System | Pass | Arbitrary `.env` sources remain separate and receive no automatic transition. | Pass | Confirmed | None. |
| BEH-001 / BEH-017 | User / Operational | Pass | General API-key Settings and packaged startup are the independently supported surfaces affected by the v1 failure. | Pass | Confirmed | None. |
| Remaining behaviors | Previously reviewed | Pass | Round-32 basis | Pass | Carried forward | None. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose/Scope | Linked | Complete | Consistent | Status/Approval | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `custom-provider-v1-migration-contract.md` | Exact fixed-path migration/reset and Settings-containment behavior | Pass | Pass | Pass | User-approved normative behavior | None. |
| `encrypted-secret-vault-contract.md` | Create-only batch and exact same-process compensation boundary | Pass | Pass | Pass | User-approved delta | None. |
| `credential-consumer-mapping.md` | Preserved-ID to deterministic current `SecretId` mapping | Pass | Pass | Pass | User-approved delta | None. |
| `use-case-spine-validation.md` | DS-UC007D / DS-L007 and coverage matrices | Pass | Pass | Pass | Architecture-validation artifact | None. |
| `secret-storage-architecture.md` | Startup and migration/reset diagrams | Pass | Pass | Pass | Architecture-validation artifact | None. |
| `live-test-secret-provisioning.md` | Deterministic, packaged, reset, leak, and reconfiguration proof | Pass | Pass | Pass | User-approved delta | None. |
| `threat-model-and-option-analysis.md` | Destructive reset tradeoff and controls | Pass | Pass | Pass | Architecture-validation artifact | None. |
| Unchanged supplements | Previously reviewed purposes | Pass | Pass | Pass | Carried forward | None. |

The investigation notes contain the canonical supplement inventory, and every delta-defining supplement is linked from the core package with purpose, scope, status, and approval applicability.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Current task posture present | Pass | The package classifies the fixed v1 file as `Migration Required`; arbitrary `.env` and superseded Store data retain their prior distinct decisions. | None. |
| Root-cause classification explicit/evidence-backed | Pass | The historical application-owned v1 schema contains plaintext `apiKey`; the current v2 reader rejects it; the assembled Settings path propagates the failure. | None. |
| Refactor decision explicit | Pass | Historical parsing is isolated in one existing app-data migration owner; normal store/runtime remain v2-only. | None. |
| Concrete design supports decision | Pass | Ordering, fixed identity, complete validation, create-only transaction, staged publish, interruption handling, delete fallback, status, current runtime, files, and tests are actionable. | None. |

## Spine Inventory Verdict

| Spine IDs | Scope | Readable | Span Sufficient | Facade/Owner | Ownership | Off-Spine | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-UC007D | Existing-user startup through preservation or reset to usable Settings/Create | Pass | Pass | Pass | Pass | Pass | Pass | Spans startup, vault, migration, file/DB publish outcome, and user recovery. |
| DS-L007 | Cross-resource staged publish / transaction / compensation / interruption loop | Pass | Pass | Pass | Pass | Pass | Pass | Correctly bounded under the migration owner. |
| DS-UC007A–C / DS-L006 | Current create/probe/list/use/delete | Pass | Pass | Pass | Pass | Pass | Pass | Remain current-v2-only and distinct from migration. |
| Remaining 38 spines | Previously reviewed behavior | Pass | Pass | Pass/N/A | Pass | Pass | Pass | Carried forward. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AppDataMigrationRunner` -> `CustomProviderV1AppDataMigration` | Pass | Pass | Pass | Pass | Reuses the established non-critical startup migration lifecycle. |
| `CustomProviderV1AppDataMigration` | Pass | Pass | Pass | Pass | Sole owner of v1 parse/validation, staged v2, reset deletion, and sanitized result. |
| `SecretManagementService` | Pass | Pass | Pass | Pass | Owns only the authorized create-missing batch and receipt-based conditional compensation. |
| `CustomLlmProviderStore` | Pass | Pass | Pass | Pass | Missing-as-empty, v2-only normal store; no historical parser or migration policy. |
| `LlmProviderService.listProviderSettings()` | Pass | Pass | Pass | Pass | Contains custom contribution failure without weakening built-in provider/catalog authority. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Clear | Forbidden Shortcuts Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| App-data migration | Pass | Pass | Pass | Pass | May call the fixed-path file boundary and internal secret batch only. |
| Secret service/repository | Pass | Pass | Pass | Pass | Never parses historical files or owns reset policy. |
| Normal provider runtime | Pass | Pass | Pass | Pass | Depends only on v2 metadata and point-of-use resolver; no v1/environment fallback. |
| Settings/catalog composition | Pass | Pass | Pass | Pass | Custom failure becomes an empty custom contribution, not a general-query failure or synthetic availability DTO. |

## Interface Boundary Verdict

| Interface / Query / Command | Subject Clear | Singular Responsibility | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `CustomProviderV1AppDataMigration.execute()` | Pass | Pass | Pass | Low | Pass |
| `createMissingBatchForCustomProviderMigration(entries)` | Pass | Pass | Pass | Low | Pass |
| `compensateUnpublishedCustomProviderBatch(receipt)` | Pass | Pass | Pass | Low | Pass |
| Existing app-data migration status projection | Pass | Pass | Pass | Low | Pass |
| Current custom Create/Probe/Delete and `providerSettings` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Existing Area Checked | Reuse Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Startup migration lifecycle | Pass | Pass | N/A | Pass | Existing runner already records warning/failure without aborting startup. |
| Current custom metadata store | Pass | Pass | N/A | Pass | Remains secret-free and v2-only. |
| Vault encryption/transactions | Pass | Pass | Pass | Pass | Two narrow internal migration operations extend the authoritative service instead of bypassing it. |
| Settings/catalog composition | Pass | Pass | N/A | Pass | Existing provider owner performs containment; no new read service/DTO. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Ownership Clear | Decision Sound | Supports Spine | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| App-data migrations | Pass | Pass | Pass | Pass | Historical schema and reset sequencing only. |
| Secret management | Pass | Pass | Pass | Pass | Current encrypted batch/compensation only. |
| LLM provider management | Pass | Pass | Pass | Pass | Current v2 store, current CRUD, and failure-contained Settings composition. |
| Test/package validation | Pass | Pass | Pass | Pass | Synthetic existing-user fixtures and actual packaged lifecycle. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Evaluated | Shared File Choice Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Deterministic custom-provider `SecretId` derivation | Pass | Pass | Pass | Pass | One canonical mapping shared by migration authorization and current runtime. |
| Migration batch receipt | Pass | Pass | Pass | Pass | Opaque, memory-only, owned by secret service; not a generic transaction coordinator. |
| Migration outward result | Pass | Pass | Pass | Pass | Reuses existing app-data status/summary instead of adding provider availability/status DTOs. |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning/Field | Redundant Removed | Overlap Controlled | Composition Sound | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Historical v1 shape | Pass | Pass | Pass | N/A | Pass | Exists only inside the migration file. |
| Current v2 provider record | Pass | Pass | Pass | Pass | Pass | ID/name/type/base URL only; credential value stays in vault. |
| `CustomProviderV1MigrationOutcome` | Pass | Pass | Pass | Pass | Pass | Exactly migrated, reconfiguration required, or reset unavailable. |
| `CustomProviderMigrationBatchReceipt` | Pass | Pass | Pass | Pass | Pass | Contains only opaque exact-row compensation authority and never crosses process/output boundaries. |

## File Responsibility Mapping Verdict

| File | Responsibility Singular/Clear | Matches Owner | Re-tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `app-data-migrations/migrations/custom-provider-v1-app-data-migration.ts` | Pass | Pass | Pass | Pass | Fixed-path historical transition and reset only. |
| `secret-management/services/secret-management-service.ts` | Pass | Pass | Pass | Pass | Current lifecycle plus narrow internal batch/compensation methods. |
| `secret-management/persistence/secret-vault-prisma-repository.ts` | Pass | Pass | Pass | Pass | Transactional create-only insert and exact conditional compensation. |
| `llm-management/.../custom-llm-provider-store.ts` | Pass | Pass | Pass | Pass | Current v2 read/write; missing means empty. |
| provider Settings/runtime sync files | Pass | Pass | Pass | Pass | Contain custom omission and clear stale custom contribution without carrying v1 types. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear | Folder Matches Owner | Mixed/Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/app-data-migrations/migrations/custom-provider-v1-app-data-migration.ts` | Pass | Pass | Low | Pass | Correct existing historical-data boundary. |
| Secret service/repository changes | Pass | Pass | Low | Pass | No separate migration subsystem or generic coordinator. |
| Current custom-provider store/service | Pass | Pass | Low | Pass | Remain under LLM provider management. |

## Removal / Decommission Completeness Verdict

| Item / Area | Obsolete Piece Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime v1 parser/error authority | Pass | Pass | Pass | Pass | Historical parser moves exclusively to migration; current runtime stays v2-only. |
| Backup/recovery/quarantine machinery | Pass | N/A | Pass | Pass | Explicitly absent; approved failure outcome is deletion and normal reconfiguration. |
| Whole-Settings rejection from custom state | Pass | Pass | Pass | Pass | Bounded empty custom contribution retains built-ins/catalogs/New Provider. |
| Arbitrary `.env` automatic migration/fallback | Pass | Pass | Pass | Pass | Remains excluded and separate from this fixed-path transition. |

## Legacy / Backward-Compatibility Verdict

| Area | Wrapper/Dual Path/Legacy Retention Exists | Clean Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Historical custom-provider v1 | No runtime compatibility; migration-only historical parser | Pass | Pass | Required isolated migration is not a normal-runtime dual path. |
| Current custom-provider runtime | No | Pass | Pass | One v2 metadata path plus vault resolver. |
| Environment credentials | No | Pass | Pass | No automatic import or runtime fallback. |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Evidence Sufficient | Choice Proportionate | Migration Safety Complete | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Fixed application-owned custom-provider v1 file | Migration Required, otherwise delete and reconfigure | Pass | Pass | Pass | Pass | Complete validation; preserved IDs; all-missing gate; one create-only DB transaction; staged atomic v2 publish; exact same-process compensation; interruption collision rule; explicit destructive reset; deletion-failure containment; idempotent completion. |
| Current custom-provider v2 | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Already secret-free/current. |
| Arbitrary `.env` credentials | Prior Discard/Rebuild-as-authority decision | Pass | Pass | N/A | Pass | Not affected by this exception. |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup/Removal Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Prisma/vault startup -> app-data migration -> provider exposure | Pass | Pass | Pass | Pass |
| v1 stage -> DB batch -> file publish / compensation / reset | Pass | Pass | Pass | Pass |
| Settings containment and current-v2-only cutover | Pass | Pass | Pass | Pass |
| Downstream dirty-work reconciliation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Needed | Present/Clear | Avoided Shape Explained | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Success sequence | Yes | Pass | Pass | Pass | Exact stage/batch/publish ordering is shown. |
| Failure/interruption matrix | Yes | Pass | Pass | Pass | Collision, staging, DB, publish, power loss, deletion, and finalization are separated. |
| User reconfiguration | Yes | Pass | Pass | Pass | Built-ins/New Provider and new generated IDs are explicit. |
| Forbidden compatibility/recovery shapes | Yes | Pass | Pass | Pass | Runtime v1 reader, backups, fallback, overwrite, and wrapper DTOs are rejected. |

## Material Premise Validation

### MP-013 — A supported existing installation can contain the fixed plaintext custom-provider-v1 file

- Related approved requirement or established contract: BEH-008 / REQ-012 / AC-008; preserve supported existing-user custom providers when safe and never let custom state disable general Settings.
- Relevant behavior ID(s): BEH-008, BEH-001, BEH-017.
- Initiating basis kind: `User` + `System`.
- Independent product-supported initiating trigger or applicable governing contract: under `origin/personal`, the user creates a custom OpenAI-compatible provider through the supported Settings surface; that version writes `<app-data-dir>/llm/custom-llm-providers.json` v1 with the key. The user then starts the upgraded packaged application.
- Support evidence: direct `origin/personal` schema/store/service source; observed packaged value-free `CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED`; evidence `238`/`240`.
- Forward production path: `Settings Create custom provider -> origin/personal v1 writer -> persisted fixed app-owned file -> install/start upgraded application -> Prisma/vault startup -> provider Settings/list path -> current v2-only rejection`.
- Lifecycle preconditions and consequence: a normal supported prior write persists v1; the upgraded read cannot treat it as v2 and can hide built-ins if uncontained.
- Reachability: `Reachable`.
- Review consequence / proportionate response: one fixed-path migration plus independent Settings containment is justified; arbitrary-source migration and permanent v1 runtime compatibility are not.

### MP-014 — The cross-resource migration can be interrupted after the DB batch commits and before v2 publication

- Related approved requirement or established contract: persisted-data migration safety under REQ-012 / AC-008.
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: `Operational` / `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: process termination or power loss during an approved startup migration; durable migrations must define interruption behavior.
- Support evidence: existing app-data runner persists RUNNING/terminal records and retries failed/stale work; the approved target necessarily spans SQLite commit and filesystem rename, which cannot be one physical transaction.
- Forward production path: `upgraded server startup -> app-data migration -> staged v2 -> create-only DB commit -> process/power interruption before canonical rename -> restart -> runner re-enters migration -> v1 still canonical + target IDs configured`.
- Lifecycle preconditions and consequence: DB entries may exist without authoritative v2 metadata; guessing ownership or overwriting/deleting existing rows would risk current credentials.
- Reachability: `Reachable` under the governing persisted-migration contract.
- Review consequence / proportionate response: treat configured targets as collision, never overwrite/delete them, delete only the approved legacy file, and reconfigure with newly generated IDs. Do not add recovery scanning or a runtime fallback.

### MP-015 — The approved failed-preservation deletion can itself be unavailable

- Related approved requirement or established contract: REQ-012 / AC-008 availability containment.
- Relevant behavior ID(s): BEH-008, BEH-001.
- Initiating basis kind: `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: the approved destructive reset attempts to unlink the fixed app-owned file; the explicit contract requires a truthful non-blocking outcome if the filesystem refuses that operation.
- Support evidence: user-approved migration contract and existing non-critical app-data migration lifecycle; the normal Settings surface is independently supported and must remain available.
- Forward production path: `startup migration -> preservation failure -> canonical v1 delete attempt -> filesystem rejects delete -> RESET_UNAVAILABLE/FAILED -> API exposure -> providerSettings built-ins + empty custom contribution`.
- Lifecycle preconditions and consequence: physical v1 remains, so current custom Create cannot safely replace it; allowing the custom error to reject general Settings would repeat the observed product failure.
- Reachability: `Reachable` by the applicable approved transition/availability contract.
- Review consequence / proportionate response: keep the file untouched, omit custom rows, retain built-ins/New Provider, block only custom creation until repair and restart, and expose existing value-free migration guidance. No availability wrapper or recovery service is needed.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`.

The bounded custom-provider-v1 delta is ready for implementation. The prior round-32 pass remains inherited for unchanged areas. The fixed historical source has one isolated migration owner; the normal runtime remains v2-only; destructive reset and deletion-unavailable behavior are explicit; general Settings/catalog availability is preserved; and no reviewed mechanism depends on an unsupported premise.

## Findings

None.

## Classification

- Overall: `Pass`
- Routing classification: implementation-ready bounded design delta

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- JSON metadata and SQLite secret rows cannot commit atomically. The reviewed staged-publish, exact same-process compensation, and restart collision/reset rules must be implemented exactly.
- A crash after DB commit can leave non-authoritative encrypted rows. They must never become runtime fallback or be guessed/deleted on restart; reconfiguration uses new provider IDs.
- Failed preservation intentionally deletes the plaintext legacy custom-provider configuration. This user-approved loss is limited to custom providers and requires clear value-free reconfiguration guidance.
- If deletion is unavailable, custom creation remains unavailable until filesystem repair and restart, while built-ins and the rest of Settings must remain usable.
- Existing downstream dirty source/tests/reports/evidence and configured E2E state must be preserved and reconciled against this reviewed delta, not reset.
- Prior carried-forward risks remain: DB and root key are an inseparable backup pair; JavaScript zeroization is best effort; `LOCAL_HARDENED` does not claim `STRONG_AGENT_ISOLATION`; Codex remains excluded from governed child-environment claims; and `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a delivery/release recheck only.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Mode: `Bounded delta review`
- Material-Premise Gate: `Pass`
- Notes: the user-approved custom-provider-v1 migrate-or-delete design is ready for implementation. All unchanged round-32 architecture remains carried forward without re-review; API/E2E and delivery remain governed by their normal downstream gates.
