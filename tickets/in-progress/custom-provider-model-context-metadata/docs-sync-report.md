# Docs Sync Report

## Scope

- Ticket: custom-provider-model-context-metadata
- Delivery revision: DR-007
- Trigger: IR-012, CRR-016 Pass at 9.40/10, API-REV-008 Pass at 96.9%, and CRR-017 Not Applicable.
- Recorded base: personal, tracked as origin/personal.
- Current base: origin/personal@3cddeec6b93602da172fec2e7b9a80acc7c05117.
- Integrated implementation merge: ea8dbfd2d4f78312806bee7a41f38daa6a0e9a06.
- Protected reviewed/build checkpoint: 7f02e49f6897b3c2715d2c7e2fb712a424514f82.

## Result

**Updated / Pass.** Five long-lived documents now describe the integrated readable custom-provider identity, strict V3 store, startup reset, secret lifecycle, ordinary recreation, and unavailable-selector behavior. The earlier UUID/V2/secret-transfer descriptions were removed.

## Why Durable Docs Changed

SR-016 changes stable identity and persisted-data behavior rather than only implementation internals:

- new provider IDs are deterministic, readable, and derived from normalized names;
- normal runtime accepts strict version-3 metadata;
- upgrade resets legacy providers and credentials instead of preserving them;
- exact active/default/resumable selector prefixes move before empty V3 is published;
- old UUID secrets are removed only after the reset commit and are never resolved or copied;
- users recreate desired providers through the existing form;
- stale selectors remain raw-visible and unavailable instead of clearing or falling back.

These contracts affect future provider development, operators upgrading app data, vault ownership, and frontend launch behavior and therefore cannot remain ticket-only knowledge.

## Long-Lived Docs Updated

| Document | Update |
| --- | --- |
| autobyteus-ts/docs/llm_module_design.md | Replaced UUID examples with readable identifiers; documented canonical-name derivation, deterministic non-ASCII tokens, immutable IDs, and atomic collision rejection. |
| autobyteus-ts/docs/llm_module_design_nodejs.md | Documented the core identity owner, metadata-only V3 record, separate vault key, exact model identifier shape, same-name recreation, and strict V3 runtime validation. |
| autobyteus-server-ts/docs/modules/llm_management.md | Replaced the obsolete V1-to-secretful-V2 account with the final V1/V2-to-empty-V3 reset, exact prerequisite/order and selector inventory, post-commit cleanup, startup gate, provider-absent interval, ordinary recreation, and updated create lifecycle. |
| autobyteus-server-ts/docs/modules/secret_management.md | Corrected startup/vault ownership: V1 values are discarded, no secret transfers, old UUID consumers are removal-only after empty V3, normal consumers are readable-ID V3, and recent-RUNNING/failure boundaries remain explicit. |
| autobyteus-web/docs/settings.md | Documented server-derived readable IDs, unchanged create form, same-name recreation, unavailable raw selectors, blocking behavior, and manual reselection conditions. |

## Durable Knowledge Promoted

### Readable identity

The browser submits name, Base URL, and key only. The server derives provider_<body> from the normalized name, using readable ASCII words and deterministic u<hex> tokens for non-ASCII code points. Names that cannot derive an ID and canonical-name/ID collisions fail without a suffix or partial provider/secret commit.

### Persisted-data transition

V1 credential values do not enter the vault. Valid V1 stages secretless V2. The final readable migration requires the five exact selector-writing/name-snapshot prerequisites, maps only exact old provider prefixes, attempts every allowlisted selector owner, and publishes empty V3 last. Provider publication failure blocks startup; individual selector failures produce warnings and leave stale values.

### Secret boundary

The readable migration does not call secret status, resolve, save, copy, or re-encryption. After empty V3 is durable it attempts each trusted old UUID consumer removal independently. Cleanup failure or interruption can leave an unreachable orphan; there is no UUID alias or fallback lookup.

### Recreation and unavailable selections

No legacy provider, Base URL, readable credential, or catalog group survives reset. Reusing the same canonical name through New Provider restores the migrated prefix when the exact model suffix is advertised. Otherwise users reselect manually. Missing values remain stored and visible and block launch/resume rather than clearing or selecting another model.

## Existing Docs Reviewed Without New DR-007 Edits

| Document | Decision |
| --- | --- |
| autobyteus-ts/docs/provider_model_catalogs.md | No change. Its exact-only advertised -> exact built-in value -> unknown metadata contract and Qwen rows remain accurate; provider-record identity is owned by the two core design docs. |
| autobyteus-server-ts/docs/modules/token_usage.md | No change. Provider-name snapshot/order changes do not rewrite token identifiers or alter the documented Token Meter contract. |
| autobyteus-web/docs/agent_execution_architecture.md | No change. Unknown-context Token Meter behavior remains accurate; unavailable custom selection is documented in Settings. |

## Removed Or Replaced Truth

| Obsolete statement | Current truth |
| --- | --- |
| provider_<uuid> custom identity | Deterministic provider_<name-derived-body>, immutable, no suffix |
| Metadata file version 2 in normal runtime | Strict metadata-only version 3 |
| V1 credentials migrate into the encrypted vault | V1 values are discarded; desired providers require a newly entered key |
| Legacy provider records/Base URLs survive migration | Empty V3 reset; users recreate through the ordinary form |
| UUID identity remains a stable runtime selector | Exact allowlisted prefixes migrate; no runtime UUID alias |
| Missing application launch selector clears on initial load | Raw value remains visible/unavailable and blocks until valid reselection |

## Verification

- Documentation was compared against current source, requirements, the readable migration specification, IR-012/CRR-016, and API-REV-008.
- Obsolete provider_<uuid>, sample UUID provider ID, version-2 normal-runtime, and secret-transfer language is absent from the five target docs.
- git diff --check for all five updated docs passed.
- The full README-guided Electron build subsequently passed, so the synchronized docs coexist with a successful current integrated package.

## Delivery Continuation

- Result: Pass.
- Current handoff: ready for explicit user verification through the DR-007 Electron package.
- Finalization hold: no archive, push, final-target merge, tag, release, deployment, or cleanup until explicit user acceptance and another tracked-base refresh.
