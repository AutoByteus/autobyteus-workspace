# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Initial architecture review of the approved solution package | `SR-001`–`SR-005` | `N/A` | `Fail` | `ARCH-DESIGN-001`, `ARCH-DESIGN-002`, `ARCH-DESIGN-003` |
| ARCH-REV-002 | Re-review after solution contract rework | `SR-006` | `Fail` | `Pass` | `ARCH-DESIGN-001`, `ARCH-DESIGN-002`, `ARCH-DESIGN-003` resolved |
| ARCH-REV-003 | Re-review of approved endpoint-scoped wire-alias profiles | `SR-007`, `SR-008` | `Pass` | `Pass` | None |
| ARCH-REV-004 | Fresh review of the SR-010 material replacement | `SR-010` | `Pass` (superseded) | `Fail` | `ARCH-DESIGN-004`, `ARCH-DESIGN-005` |
| ARCH-REV-005 | Re-review after durable-save and endpoint-source contract rework | `SR-010`, `SR-011` | `Fail` | `Pass` | `ARCH-DESIGN-004`, `ARCH-DESIGN-005` resolved |

## Revision Entries

### ARCH-REV-001 — Initial source-contract and exact-identity review

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Review round and trigger: Round `1`; initial architecture review after the user-approved `SR-005` package was handed off.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`; `ARCH-DESIGN-001`–`ARCH-DESIGN-003`.
- Relevant solution revision IDs: `SR-001`–`SR-005`.
- Prior authoritative decision: `N/A`.
- Current authoritative decision: `Fail` — `Design Impact`.
- What changed in the review result or what baseline was established: The approved behavior and production-path basis were confirmed, and the spine/ownership/refactor posture passed. Implementation was blocked by three concrete design omissions: source provenance was not representable/preserved, exact built-in identity/conflict provenance was not actionable, and advertised alias/profile canonicalization contracts were not enumerated.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: `ARCH-DESIGN-001`, `ARCH-DESIGN-002`, `ARCH-DESIGN-003`.
- Material classification changes: None; the user-approved `SR-005` precedence remained the governing requirement.
- Recommended recipient: `solution_designer`.
- Remaining risks or uncertainty: Profile facts can become stale; inferred fallback can differ from a plan-specific serving limit; no implementation or executable coverage evidence existed.

### ARCH-REV-002 — Re-review of resolved source and identity contracts

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Review round and trigger: Round `2`; solution designer rework under `SR-006`.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`; prior findings `ARCH-DESIGN-001`–`ARCH-DESIGN-003`.
- Relevant solution revision IDs: `SR-006`, with `SR-005` retained as the approved behavior baseline.
- Prior authoritative decision: `Fail` — `Design Impact` at `ARCH-REV-001`.
- Current authoritative decision: `Pass`.
- What changed in the review result or what baseline was established: Revalidated the approved behavior basis and each prior finding. `SR-006` now specifies the five-kind source union and mandatory non-secret `ModelInfo`/server propagation, the exact `SupportedModelDefinition.value` fallback index and `{provider, value}` references with per-field conservative conflict/provenance selection, and the fixed advertised alias, duplicate precedence, invalid fall-through, and canonical endpoint tuple contracts. The query/fragment rule is also explicit: query-dependent plans are not profile-addressable and use advertised/fallback resolution, satisfying the near-match requirement. No new policy or implementation machinery is required.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-DESIGN-001` | Open; blocking | Resolved | `SR-006`; `REQ-006`, `REQ-009`; `AC-011`; design-spec source-bearing per-field contract and server merge section | Revised `ResolvedMetadataSource` union distinguishes `live`, `endpoint_profile`, `inferred_builtin`, `static_definition`, and `unknown`; `LLMModel.toModelInfo()` and `ModelInfo/EnrichedModelInfo` propagation is mandatory; built-in live-over-static and coarse GraphQL mapping are explicit. |
| `ARCH-DESIGN-002` | Open; blocking | Resolved | `SR-006`; `REQ-010`; `AC-012`; design-spec exact fallback index/profile reference section | Index is keyed only by exact non-empty `SupportedModelDefinition.value`; all exact candidates are retained; `{provider, value}` references are exact; each field selects the lowest valid value with deterministic tie-breaking and selected provenance. |
| `ARCH-DESIGN-003` | Open; blocking | Resolved | `SR-006`; `REQ-001`, `REQ-011`; `AC-001`, `AC-002`, `AC-013`; design-spec alias and canonical endpoint sections | Fixed top-level alias tables, JSON-number validation, duplicate alias/row precedence, independent invalid fall-through, canonical protocol/hostname/port/base-path handling, query/fragment exclusion, and near-match rejection are explicit. |

- New or remaining finding IDs: None.
- Material classification changes: `Fail` -> `Pass`; no change to the user-approved `SR-005` precedence.
- Recommended recipient: `implementation_engineer`.
- Remaining risks or uncertainty: Profile facts remain time-sensitive; exact built-in fallback remains best effort; no implementation or durable coverage evidence exists yet.

### ARCH-REV-003 — Re-review of the approved endpoint-scoped wire-alias contract

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Review round and trigger: Round `3`; solution designer added the user-approved `SR-008` endpoint-scoped wire-alias behavior after `ARCH-REV-002`.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`; no new finding IDs.
- Relevant solution revision IDs: `SR-007`, `SR-008`, with `SR-005` retained as the approved precedence baseline and `SR-006` retaining the prior contract rework.
- Prior authoritative decision: `Pass` at `ARCH-REV-002`.
- Current authoritative decision: `Pass`.
- What changed in the review result or what baseline was established: The newly approved behavior permits a provider wire ID that differs from a built-in value to reference canonical built-in metadata only through an exact endpoint-scoped profile. The revised requirements and design specify the exact returned `modelValue`, canonical `{provider, value}` reference, profile provenance/overrides, endpoint tuple matching, and unknown behavior when the profile is absent. No global suffix stripping, fuzzy matching, family matching, or cross-endpoint aliasing is introduced.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-DESIGN-001` | Resolved at `ARCH-REV-002` | Remains resolved | `SR-006`; `SR-007`/`SR-008`; `REQ-006`, `REQ-009`; `AC-011`, `AC-014` | Alias results use the existing `endpoint_profile` source kind and carry profile provenance/reference without changing source propagation or coarse GraphQL mapping. |
| `ARCH-DESIGN-002` | Resolved at `ARCH-REV-002` | Remains resolved | `SR-006`; `SR-007`/`SR-008`; `REQ-010`, `REQ-012`; `AC-012`, `AC-014` | The global fallback index remains exact `SupportedModelDefinition.value`; a differing wire ID reaches a canonical value only through an exact profile `{provider, value}` reference. |
| `ARCH-DESIGN-003` | Resolved at `ARCH-REV-002` | Remains resolved | `SR-006`; `SR-007`/`SR-008`; `REQ-003`, `REQ-011`, `REQ-012`; `AC-013`, `AC-014` | Profile matching remains exact on canonical endpoint tuple plus returned wire ID; unrecognized endpoints and absent profiles fall through to exact fallback/unknown. |

- New or remaining finding IDs: None.
- Material classification changes: None. The approved scope is extended only by the explicit endpoint-scoped alias case; the `SR-005` source precedence is unchanged.
- Recommended recipient: `implementation_engineer`.
- Remaining risks or uncertainty: The specific Alibaba alias profile needs source-dated endpoint equivalence/context facts during implementation; absent that exact profile, `deepseek-v4-flash-0731` remains unknown. No implementation or durable coverage evidence exists yet.

### ARCH-REV-004 — Fresh review of native Qwen and exact-only custom metadata

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Review round and trigger: Round `4`; solution designer delivered the user-approved `SR-010` material replacement after the prior implementation/review/API-E2E/delivery cycle.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`; new findings `ARCH-DESIGN-004`, `ARCH-DESIGN-005`.
- Relevant solution revision IDs: `SR-010`; `SR-001`–`SR-009` are historical context only.
- Prior authoritative decision: `Pass` at `ARCH-REV-003`, superseded because it approved the endpoint-profile design that SR-010 replaces.
- Current authoritative decision: `Fail` — `Design Impact`.
- What changed in the review result or what baseline was established: SR-010's exact-only custom fallback, endpoint-profile/alias removal, native Qwen endpoint owner, three exact Qwen-served values, unique identifier overrides, reduced source union, and no-migration posture are sound. The new Qwen Settings spine is not implementation-ready: current `AppConfig.set` can report only session-local success after a durable write failure while the design saves the key first, and the proposed provider projection cannot distinguish an absent URL using the effective default from an explicitly saved URL as required by the approved UI specification.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-DESIGN-001` | Resolved at `ARCH-REV-002` | Remains resolved under the replacement | `SR-010`; `REQ-004`, `REQ-009` | The target four-kind source union remains discriminated and preserves non-secret per-field source through model/server projection; only the obsolete `endpoint_profile` variant is removed. |
| `ARCH-DESIGN-002` | Resolved at `ARCH-REV-002` | Remains resolved under the replacement | `SR-010`; `REQ-002`; `AC-003` | Exact `SupportedModelDefinition.value` indexing, all-candidate retention, lowest-valid per-field selection, deterministic tie-breaking, and selected provenance remain explicit. |
| `ARCH-DESIGN-003` | Resolved at `ARCH-REV-002` | Obsolete by approved removal | `SR-010`; `REQ-003`; `AC-004` | SR-010 removes advertised alias-policy expansion, endpoint canonicalization, profile matching, and wire aliases/references. No replacement machinery depends on those contracts. |

- New or remaining finding IDs: `ARCH-DESIGN-004`, `ARCH-DESIGN-005`.
- Material classification changes: Prior endpoint-profile `Pass` is superseded; current result is `Fail — Design Impact`. The reachable AppConfig durability premise is recorded as `PREM-QWEN-001` in the canonical report.
- Recommended recipient: `solution_designer`.
- Remaining risks or uncertainty: Qwen3.8 production provenance needs a later vendor-source refresh; Alibaba GLM documentation has conflicted; duplicate exact-value fallback remains deliberately conservative; the branch and every prior downstream result require rework/revalidation after the design passes.

### ARCH-REV-005 — Re-review of durable Qwen configuration and setup status

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Review round and trigger: Round `5`; solution designer delivered focused `SR-011` rework for the two blocking findings from `ARCH-REV-004`.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`; prior findings `ARCH-DESIGN-004`, `ARCH-DESIGN-005` and material premise `PREM-QWEN-001`.
- Relevant solution revision IDs: `SR-010`, `SR-011`; `SR-001`–`SR-009` remain historical context only.
- Prior authoritative decision: `Fail` — `Design Impact` at `ARCH-REV-004`.
- Current authoritative decision: `Pass`.
- What changed in the review result or what baseline was established: The approved native-Qwen and exact-only custom-metadata direction is unchanged. `SR-011` makes the Qwen save implementation-ready by defining one synchronous atomic AppConfig setting commit, command-local previous-secret compensation, distinct truthful failure codes, and a Qwen-only configured/default setup projection. The rework closes both prior blockers without a generalized transaction or provider/model schema.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-DESIGN-004` | Open; blocking | Resolved | `SR-011`; `BEH-004`; `REQ-011`; `AC-013`; design-spec Qwen configuration, strict AppConfig, DS-001, interfaces, examples, and sequence; UI previous-restored/repair-required states | `AppConfig.setDurably` exclusively writes/fsyncs a same-directory temp, atomically renames before runtime mutation, throws on every pre-commit failure, and has no fallible persistence after the rename commit. `LlmProviderService` probes, snapshots the prior command-scoped `SecretValue`, saves the new key, strictly commits the URL, restores/removes the key on URL failure, returns success only after commit, and distinguishes successful compensation from repair-required double failure with allowlisted sanitized codes. The reachable `PREM-QWEN-001` failure now has a bounded, truthful response. |
| `ARCH-DESIGN-005` | Open; blocking | Resolved | `SR-011`; `BEH-006`; `REQ-012`; `AC-014`; design-spec Qwen setup-status contract and DS-001; UI default/configured states and API dependencies | `getQwenSetupStatus` returns only `{effectiveBaseUrl, endpointSource, apiKeyConfigured}`; source derives from normalized configured-setting presence rather than URL equality. Query and successful mutation return the same projection, an explicitly configured default-equal URL remains `CONFIGURED`, and the browser neither embeds nor compares the default. |

- New or remaining finding IDs: None.
- Material classification changes: `Fail — Design Impact` -> `Pass`; `PREM-QWEN-001` remains `Reachable`, but the design response is now proportionate and complete.
- Recommended recipient: `implementation_engineer`.
- Remaining risks or uncertainty: Compensation double-failure is intentionally repair-required; vendor provenance remains time-sensitive; duplicate exact-value fallback remains conservative; the branch is behind its tracked base; all implementation/review/API-E2E/delivery evidence predating `SR-010`/`SR-011` remains superseded and must be repeated.
