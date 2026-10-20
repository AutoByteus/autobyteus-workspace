# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience/tickets/in-progress/test-vault-developer-experience/requirements-doc.md` (@ SR-009)
- Upstream Investigation Notes: `.../investigation-notes.md` (A-01..A-29)
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001..SR-009)
- Reviewed Design Spec: `.../design-spec.md` (@ SR-010, commit `14df2e9005`), section "SR-009 Design Delta (Authoritative Where It Differs; Revised At SR-010)" plus the sections it amends and the review-response rows
- Supplemental Task Artifacts Reviewed: `test-vault-evaluation-report.md` (@ SR-008, minor SR-009 edits); `code-review-report.md` (CRR-001, context)
- Relevant Solution Revision IDs: SR-010 (design revision answering ARCH-REV-003; DEC-013 wording only); SR-009 (requirements delta); SR-006..SR-008 (unchanged basis, passed at ARCH-REV-002)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: Solution Designer resubmission at SR-010 answering ARCH-REV-003 (AR-008..AR-012), over the SR-009 delta (the user's words relayed from the code-review conversation, 2026-10-20) and the implemented IR-001 (`12a23e7b8a`)
- Prior Review Round Reviewed: Round 3 (`ARCH-REV-003`, Fail on AR-009)
- Latest Authoritative Round: 4
- Current-State Evidence Basis: the code as implemented at IR-001 (`12a23e7b8a`), read at commit `a55dbc4a44`; round 4 also rechecked the IR-001 `API_KEY_BINDINGS` set and the delta at `14df2e9005`:
  - `autobyteus-server-ts/src/secret-management/catalog/provider-credential-catalog.ts` and `domain/secret-id.ts`;
  - `autobyteus-ts/src/secrets/provider-api-key-resolver.ts`;
  - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/available-llm-construction.ts`, which passes explicit resolvers;
  - consumer-kind callers `runtime-management/claude/client/claude-sdk-client.ts` (`agentRuntime`) and `agent-tools/search/search-provisioning-service.ts` (`search`);
  - `autobyteus-server-ts/vitest.config.ts` (no autobyteus-ts alias, so server tests use dist);
  - `test-support/**` imports of `../../autobyteus-ts/src/*`;
  - `autobyteus-ts/package.json` exports (`./*` → `dist/*`; workspace package, not published);
  - `embeddings/runtime/*` (a worker that does not import autobyteus-ts).
- Branch note: `67d1aaaacc..a55dbc4a44` includes a merge of `origin/personal` (`303a04e945`), which accounts for most of the 18k-file diff. The SR-009 commit itself changes six ticket documents.

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High`. Security-critical code moves across packages, the core library gains an environment-driven credential source, and public autobyteus-ts exports change.
- Independent Architecture Review required: `Yes`
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. SR-009 (the user's relayed words) wants autobyteus-ts to read `AUTOBYTEUS_TEST_VAULT` itself in any process, including plain `tsx`/`node`, with no setup code:
  - REQ-004's forbidden locations apply;
  - the AutoByteus server disables the default (AC-018);
  - the Vitest gate is kept (AC-009);
  - REQ-005(c), REQ-014 and AC-013 are rewritten, and DEC-011 is superseded by DEC-013.
- Approval: recorded in the requirements doc and SR-009 with the user's words and the relaying run. The requirements owner accepted it as approval. That is not a reviewer decision.
- Scope guardrail: unchanged. The SR-008 preserved boundary (deterministic harnesses, AC-017) is retained, and DS-005 is unchanged.
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-003, BEH-009 (SR-009) | Operational | Pass | Pass (A-27: a plain script gets `MissingApiKeyError` today) | Pass: explicit resolver → environment default (lazy, read-only, cached) → `MissingApiKeyError` | Confirmed | — |
| BEH-002, 004, 008 (server; AC-018) | Operational | Pass | Pass (server LLM construction passes explicit resolvers) | Pass (disable at both startup sites and in `initializeLiveServerVault`) | Confirmed | — |
| BEH-005 (AC-009, AC-017) | Contract | Pass | Pass | Pass (Vitest setup deletes the selector without the gate; server-side DS-005 unchanged) | Confirmed | — |
| BEH-001, 006, 007 | — | Unchanged since ARCH-REV-002 | — | — | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `test-vault-evaluation-report.md` | Pass | Pass | Pass | Pass | Pass | — |
| `code-review-report.md` (CRR-001) | Pass | Pass | Pass | Pass (SR-009 supersedes its DEC-011 basis) | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | SR-009 delta "Why" plus A-27..A-29 | — |
| Root cause explicit | Pass | The test-setup-only installer cannot reach plain scripts; one owner for the vault format is needed | — |
| Refactor decision explicit | Pass | Clean-cut move; no shims | — |
| Supported by concrete sections | Pass | Move table split per AR-009; S9-1 includes the split and the existing catalog tests | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-003 (SR-009/010): any process → client without resolver → environment default → `openTestVaultReader` → `providerSecretId` → `readSecretEntry` → provider | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 (+ disable at startup) | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-001, DS-004, DS-005 | — | Unchanged since ARCH-REV-002 | | | | | | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts `resolveProviderApiKeyResolver` + environment default | Pass | Pass (vault modules dynamic-imported only inside the default) | Pass | Pass | |
| autobyteus-ts `secrets/vault/*` (format primitives, read-only reader, `providerSecretId`, location policy) | Pass | Pass | Pass | Pass | The server imports it through the package (dist) |
| Server `SecretManagementService` + `ProviderCredentialCatalog` | Pass | Pass | Pass | Pass | Authorization stays in the server, built on `providerSecretId` (AR-009 resolved) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server → `autobyteus-ts/secrets/vault/*` | Pass | Pass (no copies or re-exports) | Pass | Pass | |
| autobyteus-ts → server/test-support | Pass | Pass (forbidden, incl. "server consumer kinds or authorization rules in autobyteus-ts") | Pass | Pass | |
| `provider-api-key-resolver.ts` → `secrets/vault/*` via dynamic import only | Pass | Pass (module-graph check) | Pass | Pass | |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `providerSecretId(providerId, slot): SecretId` (throws `SECRET_PROVIDER_UNKNOWN`) | Pass | Pass | Pass (`ProviderApiKeySlot`, no second union) | Low | Pass |
| `openTestVaultReader(directory)` → `{location, readProviderApiKey(providerId, slot), close()}` | Pass | Pass | Pass | Low | Pass |
| `readSecretEntry(store, rootKey, metadata, secretId)` with NOT_FOUND / CORRUPT_VAULT contract | Pass | Pass | Pass | Low | Pass |
| `disableEnvironmentProviderApiKeySource()` | Pass | Pass | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Vault format | Pass | Pass (one owner) | N/A | Pass | |
| Provider-key naming | Pass | Pass (one mapping, `providerSecretId`) | Pass | Pass | |
| Consumer authorization | Pass | Pass (kept in the server) | N/A | Pass | |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts `secrets/vault/` | Pass | Pass | Pass | Pass | |
| server `secret-management/` | Pass | Pass | Pass | Pass | Lifecycle, source selection, guard, authorization, service, commands |
| `test-support/test-vault` | Pass | Pass | Pass | Pass | Installer removed |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `verifyEstablishedVault`, `readSecretEntry` | Pass | Pass | Pass | Pass | |
| `vault/provider-secret-id.ts` | Pass | Pass | Pass | Pass | AR-013 note on the binding list |
| Test-vault location policy | Pass | Pass | Pass | Pass | |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SecretId`, `ProviderApiKeySlot` (shared core) / `SecretConsumerIdentity` (server-specialized) | Pass | Pass (`SecretCredentialSlot` collapses into `ProviderApiKeySlot`; same three members) | Pass | Pass | Pass | |
| Records, store interface, `SecretVaultError` codes | Pass | Pass | Pass | Pass | Pass | |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `vault/*` files | Pass | Pass | Pass | Pass | |
| server `domain/secret-id.ts` (consumer identity only), `catalog/provider-credential-catalog.ts` (authorization) | Pass | Pass | Pass | Pass | |
| `secrets/provider-api-key-resolver.ts` | Pass | Pass | Pass | Pass | Setter removed |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/secrets/vault/` | Pass | Pass | Low | Pass | |
| server `secret-management/` remaining files | Pass | Pass | Low | Pass | |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `test-support/test-vault/test-vault-default-resolver.ts`; `setDefaultProviderApiKeyResolver` | Pass | Pass | Pass | Pass | |
| Server copies of moved modules; `SecretCredentialSlot` duplicate union | Pass | Pass | Pass | Pass | |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Moved modules; default resolver | No | Pass | Pass | |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Proportionate? | Migration Safety If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Vault format and bytes | Not Affected | Pass | Pass | N/A | Pass | Secret ids unchanged by the split |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| S9-1..S9-4 over IR-001 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Plain-script probe; resolution order; server disable; built-server AC-018 | Yes | Pass | Pass | Pass | |

## Material Premise Validation

- P-004 (two autobyteus-ts module instances in server tests): unchanged. Reachable with no consequence, and AC-018 is now also proven against the built server.
- P-001 and P-003 are unchanged (ARCH-REV-002). P-002 remains Unclear.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

Blocking findings: None. AR-009 is resolved, AR-010..AR-012 are accepted and AR-008 is corrected (see `ARCH-REV-004`).

### AR-013 (non-blocking, implementation guidance) — Port the provider bindings exactly; unknown-provider error in the environment default

- At IR-001, `API_KEY_BINDINGS` covers OPENAI, ANTHROPIC, MISTRAL, DEEPSEEK, GROK, KIMI, QWEN, GLM, MINIMAX and LMSTUDIO. There is no AUTOBYTEUS entry: the catalog's media branch names AUTOBYTEUS, but the binding lookup rejects it first.
- The delta's "OPENAI…AUTOBYTEUS" wording should not add a binding. Port the existing set exactly, so server authorization results are unchanged and the existing catalog tests pass.
- In `TestVaultProviderApiKeyResolver`, surface `SECRET_PROVIDER_UNKNOWN` as a clear error naming the provider and slot. This keeps REQ-014's "clear error" for scripts, and the error must never be counted as a pass.

## Classification

N/A (Pass)

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)

## Residual Risks

- R-A, R-B, R-C, R-D/P-003 and P-002 are unchanged.
- The core library carries a process-global, environment-driven credential source. It is constrained by lazy loading (module-graph check), REQ-004 forbidden locations, the Vitest gate, the server disabling it at startup (AC-018, unit and built-server E2E), and explicit resolvers in server LLM construction.
- In the test-only environment default, media clients resolve through `providerSecretId` without the server's media restrictions. This is acceptable: it is the user's own test vault, and the server's authorization path is unchanged.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: The SR-009/SR-010 delta is ready for implementation on top of IR-001. AR-013 is non-blocking guidance.
