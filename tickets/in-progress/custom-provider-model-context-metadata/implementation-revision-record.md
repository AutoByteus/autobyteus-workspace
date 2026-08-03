# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `implementation_engineer` initial implementation after architecture review round `ARCH-REV-002` | N/A | `Initial Baseline` | `SR-005`, `SR-006`, `ARCH-REV-002` | Reviewed design implemented; implementation handoff ready for source review. |
| IR-002 | `architecture_reviewer` architecture re-review round `ARCH-REV-003` after approved `SR-008` | N/A | `Local Fix` | `SR-005`–`SR-008`, `ARCH-REV-002`, `ARCH-REV-003` | Added the exact Alibaba DeepSeek wire-alias profile and focused regression coverage; handoff is refreshed for source review. |
| IR-003 | `code_reviewer` source review round `CRR-001` | `CR-001` | `Local Fix` | `SR-005`–`SR-008`, `ARCH-REV-002`, `ARCH-REV-003`, `CRR-001` | Refused profile matching for query/fragment-bearing endpoint URLs, added focused fallback/unknown regression coverage, and returned the implementation for source re-review. |

## Revision Entries

### IR-001 — Initial reviewed implementation baseline

- Triggering role, report path, and round: `implementation_engineer`; architecture re-review package at `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`; round `ARCH-REV-002`.
- Triggering finding IDs: `N/A`; architecture findings were already resolved before implementation.
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: The reviewed custom-provider metadata path is implemented, including exact discovery normalization, endpoint/profile/fallback resolution, source propagation, catalog merge preservation, and unknown-capacity UI rendering. Source review and downstream API/E2E investigation remain required.
- Related solution revision IDs: `SR-005`, `SR-006`.
- Related architecture-review revision IDs: `ARCH-REV-002`.
- Related code-review revision IDs: `N/A`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this baseline is recorded: Establish the first implementation handoff against the passed architecture package. No prior implementation result or code-review finding exists.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-005`; `REQ-001`–`REQ-011`; `AC-001`–`AC-013`.
- Implementation delta:
  - Added strict top-level advertised metadata alias normalization with JSON-number validation and payload-order duplicate merging.
  - Added the pure exact endpoint identity/profile resolver, Alibaba Token Plan profile facts, exact `SupportedModelDefinition.value` fallback index, conservative per-field duplicate selection, and the five-kind source union.
  - Passed resolved metadata into custom `LLMModel` construction and required non-secret `resolved_model_metadata` on `ModelInfo`.
  - Preserved source-bearing custom metadata in server enrichment while retaining built-in live-over-static behavior and truthful coarse provenance.
  - Added the explicit unknown-context token-meter state and localized copy.
- Changed files or areas: `autobyteus-ts/src/llm/metadata/`, custom endpoint discovery/model/provider files, `autobyteus-ts/src/llm/models.ts`, server model normalizers and provisioning service, and workspace token-meter component/locales.
- Local validation and result: TypeScript build checks passed for `autobyteus-ts` and `autobyteus-server-ts` build configurations; 23 focused `autobyteus-ts` unit tests passed; 9 server metadata-provisioning unit tests passed; 9 token-meter component tests passed; localization/web-boundary guards and localization-literal audit passed; `git diff --check` passed. A repository-wide web `tsc -p tsconfig.json --noEmit` remains blocked by pre-existing generated Nuxt/type errors outside this change.
- Next recipient or routing: `code_reviewer` for source and architecture review before API/E2E coverage investigation.
- Remaining limitations or risks: Vendor profile facts are source-dated and may become stale; exact built-in fallback is explicitly inferred and can differ from a plan-specific serving limit; broader API/E2E/runtime compaction evidence and browser-level UI inspection remain downstream work. No secrets or raw provider payloads were added.

### IR-002 — Implement approved endpoint-scoped DeepSeek wire alias

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`; round `ARCH-REV-003` after solution revisions `SR-007` and `SR-008`.
- Triggering finding IDs: `N/A`; the architecture decision remained `Pass` and extended the already-approved contract without opening a new finding.
- Classification: `Local Fix`.
- Prior authoritative result: `IR-001` implemented exact profiles and fallback resolution but had no profile entry for the newly approved Alibaba returned wire ID `deepseek-v4-flash-0731`; that differing value therefore could not reach canonical DeepSeek metadata.
- Current authoritative result: The exact Alibaba Token Plan canonical endpoint tuple plus returned `deepseek-v4-flash-0731` now matches a source-dated `endpoint_profile` carrying `{ provider: DEEPSEEK, value: deepseek-v4-flash }`. Referenced context/output values carry endpoint-profile provenance and the canonical reference. The same wire ID on an unrecognized endpoint remains unknown; the implementation has no global suffix stripping, fuzzy/family matching, or cross-endpoint aliasing.
- Related solution revision IDs: `SR-005`, `SR-006`, `SR-007`, `SR-008`.
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`.
- Related code-review revision IDs: `N/A`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this revision is recorded: Complete the approved `SR-008` behavior before source review and preserve the prior implementation baseline as historical context without treating it as current authority.
- Approved behavior or requirement IDs affected: `BEH-002`, `BEH-004`; `REQ-003`, `REQ-012`; `AC-004`, `AC-014`.
- Implementation delta:
  - Added `alibaba-token-plan-deepseek-wire-alias-2026-08-03` to the exact endpoint profile table with returned wire ID, DeepSeek `{provider, value}` reference, and source URL/date provenance.
  - Added focused resolver coverage for exact alias resolution, referenced provenance, cross-endpoint unknown behavior, and the canonical built-in ID remaining a separate exact fallback case.
- Changed files or areas: `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts`; `autobyteus-ts/tests/unit/llm/metadata/openai-compatible-endpoint-model-metadata.test.ts`; refreshed current handoff artifacts.
- Local validation and result: `autobyteus-ts` build typecheck passed; the focused Vitest selection passed with 24 tests; `git diff --check` passed. Temporary dependency symlinks were removed after execution.
- Next recipient or routing: `code_reviewer` for source review; API/E2E coverage investigation remains blocked on that review as required by the team workflow.
- Remaining limitations or risks: The alias profile is source-dated and can become stale if Alibaba changes the returned wire ID or serving semantics. The profile has no independent Alibaba context override; it references the canonical DeepSeek static metadata, and absent the exact profile the differing wire ID remains unknown. Downstream API/E2E validation remains pending.

### IR-003 — Fix query/fragment profile addressability gap

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md`; source review round `CRR-001`.
- Triggering finding IDs: `CR-001`.
- Classification: `Local Fix`.
- Prior authoritative result: `IR-002` failed source review because `canonicalizeOpenAICompatibleEndpointIdentity` removed URL search/hash components before profile lookup. A reachable query/fragment-bearing custom-provider URL could therefore receive the query-free Alibaba profile and an unsupported compaction capacity.
- Current authoritative result: Profile matching now uses an internal parsed endpoint result with an explicit `profileAddressable` guard. Any non-empty search or hash refuses profile matching while preserving normal protocol/hostname/port/base-path canonicalization. Query and fragment variants therefore use advertised values, then exact wire-value fallback, then unknown; `deepseek-v4-flash-0731` has no global fallback and remains unknown without the exact profile.
- Related solution revision IDs: `SR-005`, `SR-006`, `SR-007`, `SR-008`.
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`.
- Related implementation revision IDs: `IR-001`, `IR-002`, `IR-003`.
- Related code-review revision IDs: `CRR-001` (`CR-001`).
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this revision is recorded: Resolve the blocking source-review finding with the smallest implementation-owned change and preserve the reviewed non-profile-addressable query/fragment contract.
- Approved behavior or requirement IDs affected: `BEH-004`; `REQ-011`; `AC-013`.
- Implementation delta:
  - Added an internal endpoint parser that retains the canonical tuple and marks search/hash-bearing inputs as non-profile-addressable; exported canonicalization remains tuple-only for existing callers.
  - Gated exact profile lookup on `profileAddressable` without changing advertised metadata, exact fallback, or source precedence.
  - Added query-only and fragment-bearing resolver tests covering advertised precedence, exact built-in fallback after a profile miss, and unknown differing wire IDs.
- Changed files or areas: `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts`; `autobyteus-ts/tests/unit/llm/metadata/openai-compatible-endpoint-model-metadata.test.ts`; refreshed current handoff artifacts.
- Local validation and result: `autobyteus-ts` build typecheck passed; the focused Vitest selection passed with 25 tests; `git diff --check` passed. Temporary dependency symlinks were removed after execution.
- Next recipient or routing: `code_reviewer` for source re-review; API/E2E remains blocked until source review passes.
- Remaining limitations or risks: Canonical profile facts remain source-dated. Query/hash-bearing URLs intentionally cannot use endpoint profiles even when their tuple matches; they may still use live advertised fields or exact built-in fallback. Downstream API/E2E validation remains pending.
