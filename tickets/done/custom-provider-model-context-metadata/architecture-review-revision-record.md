# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Initial architecture review of the approved solution package | `SR-001`–`SR-005` | `N/A` | `Fail` | `ARCH-DESIGN-001`, `ARCH-DESIGN-002`, `ARCH-DESIGN-003` |
| ARCH-REV-002 | Re-review after solution contract rework | `SR-006` | `Fail` | `Pass` | `ARCH-DESIGN-001`, `ARCH-DESIGN-002`, `ARCH-DESIGN-003` resolved |
| ARCH-REV-003 | Re-review of approved endpoint-scoped wire-alias profiles | `SR-007`, `SR-008` | `Pass` | `Pass` | None |
| ARCH-REV-004 | Fresh review of the SR-010 material replacement | `SR-010` | `Pass` (superseded) | `Fail` | `ARCH-DESIGN-004`, `ARCH-DESIGN-005` |
| ARCH-REV-005 | Re-review after durable-save and endpoint-source contract rework | `SR-010`, `SR-011` | `Fail` | `Pass` | `ARCH-DESIGN-004`, `ARCH-DESIGN-005` resolved |
| ARCH-REV-006 | Re-review of the corrected native-Qwen catalog scope | `SR-012` (with `SR-010`, `SR-011` retained) | `Pass` | `Pass` | None |
| ARCH-REV-007 | Cumulative review of readable custom-provider identity and V2-to-V3 transition | `SR-013` (with `SR-010`–`SR-012` retained) | `Pass` | `Fail` | `ARCH-DESIGN-006` |
| ARCH-REV-008 | Recovery re-review plus current migration-order integration | `SR-014` (with `SR-013` and `SR-010`–`SR-012` retained) | `Fail` | `Fail` | `ARCH-DESIGN-006` resolved; `ARCH-DESIGN-007` |
| ARCH-REV-009 | Re-review of final readable-ID registry boundary and prerequisites | `SR-015` (retaining `SR-014` and `SR-010`–`SR-013`) | `Fail` | `Pass` | `ARCH-DESIGN-007` resolved |
| ARCH-REV-010 | Fresh review of secretless empty-V3 reset and ordinary recreation | `SR-016` (retaining `SR-010`–`SR-012`; replacing `SR-013`–`SR-015`) | `Pass` (superseded) | `Pass` | `ARCH-DESIGN-006` obsolete; `ARCH-DESIGN-007` remains resolved |
| ARCH-REV-011 | Fresh review of friendly live-Qwen presentation with internal selectors unchanged | `SR-017` (retaining `SR-016` and `SR-010`–`SR-012`) | `Pass` | `Pass` | None |

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


### ARCH-REV-006 — Re-review of the corrected native-Qwen catalog scope

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Review round and trigger: Round `6`; solution designer delivered `SR-012` after the user identified the missing exact native-Qwen catalog value `deepseek-v4-flash-0731`.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`; requirement/design scope `BEH-005`, `BEH-006`, `REQ-007`, and `AC-008`–`AC-010`.
- Relevant solution revision IDs: `SR-012`, with `SR-010` and `SR-011` retained as the approved current Qwen/custom architecture; earlier revisions are historical context only.
- Prior authoritative decision: `Pass` at `ARCH-REV-005`.
- Current authoritative decision: `Pass`.
- What changed in the review result or what baseline was established: The requirement correction is architecturally coherent and proportionate. It adds one exact static Qwen catalog definition in the existing catalog owner, with `QWEN`/`QwenLLM` ownership, `qwen:deepseek-v4-flash-0731` identity, and source-dated 1M curated Alibaba-route context. The existing built-in registry and exact-value fallback consume the entry without new machinery. The exact wire value remains distinct from direct-provider `deepseek-v4-flash`; no endpoint profile, alias, suffix normalization, or producer/offering schema returns.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-DESIGN-001`–`ARCH-DESIGN-003` | Resolved in earlier rounds | Remain resolved | `SR-006` and `SR-010` replacement | Source/provenance propagation, exact-value fallback, and the replacement's removal of profile/alias policy remain explicit; the new native entry uses the existing source-bearing static metadata. |
| `ARCH-DESIGN-004` | Resolved at `ARCH-REV-005` | Remains resolved | `SR-011` | The SR-012 catalog-only correction does not alter the strict AppConfig commit or bounded secret compensation. |
| `ARCH-DESIGN-005` | Resolved at `ARCH-REV-005` | Remains resolved | `SR-011` | The SR-012 catalog-only correction does not alter the Qwen-specific `DEFAULT|CONFIGURED` setup status. |

- New or remaining finding IDs: None.
- Material classification changes: None. The prior `Pass` remains valid; SR-012 corrects approved catalog scope rather than introducing a new design policy.
- Recommended recipient: `implementation_engineer`.
- Remaining risks or uncertainty: The user-observed dated wire ID is supported by the screenshots, while the public Alibaba source names canonical `deepseek-v4-flash`; implementation must preserve the exact value and record the approved 1M curated fact with source URL/date. All downstream implementation, review, coverage, docs, integration, and build evidence predating SR-012 is superseded.

### ARCH-REV-007 — Review of readable custom-provider identity and required persisted transition

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Review round and trigger: Round `7`; solution designer delivered the cumulative user-approved `SR-013` package after readable custom-provider identity expanded the passed SR-012 design into provider, authenticated-secret, active-selector, and startup-migration ownership.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`; new finding `ARCH-DESIGN-006` and material premises `PREM-CPMIG-001`, `PREM-CPMIG-002`.
- Relevant solution revision IDs: `SR-013`, with `SR-010`–`SR-012` retained for the unchanged exact-only custom metadata and native Qwen design; earlier revisions remain historical context only.
- Prior authoritative decision: `Pass` at `ARCH-REV-006` for SR-012, superseded as the implementation-ready decision because SR-013 materially adds a persisted identity transition.
- Current authoritative decision: `Fail` — `Design Impact`.
- What changed in the review result or what baseline was established: The readable identity direction is proportionate: one core codec derives the immutable provider ID from the existing frontend name, the store atomically owns name/ID uniqueness, the current V3 record adds no attributes, exact model wire values remain unchanged, V2 knowledge is migration-private, and only authenticated secrets plus allowlisted active/resumable selectors migrate. The V3-last journaled transition and exact startup gate are otherwise sound. The package is blocked because it promises immediate next-start recovery without specifying how a new process gets past the current runner's fifteen-minute recent-`RUNNING` guard or how migration entry distinguishes fresh V2 from journaled/post-commit V3 and already-completed V3 states.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-DESIGN-001`–`ARCH-DESIGN-003` | Resolved/obsolete in earlier rounds | Remain resolved/obsolete | `SR-006`, `SR-010`, `SR-013` | SR-013 retains source-bearing exact fallback and profile/alias removal; readable identity adds no source/profile behavior. |
| `ARCH-DESIGN-004` | Resolved at `ARCH-REV-005` | Remains resolved | `SR-011`, retained by `SR-013` | The strict AppConfig commit and Qwen command-local secret compensation are unchanged. |
| `ARCH-DESIGN-005` | Resolved at `ARCH-REV-005` | Remains resolved | `SR-011`, retained by `SR-013` | The Qwen-specific configured/default status is unchanged. |

- New or remaining finding IDs: `ARCH-DESIGN-006`.
- Material classification changes: `Pass` -> `Fail — Design Impact` for the expanded SR-013 scope. `PREM-CPMIG-001` and `PREM-CPMIG-002` are `Reachable` through the explicit `AC-018` interruption contract and current/target startup path.
- Recommended recipient: `solution_designer`.
- Remaining risks or uncertainty: Deterministic slug/non-derivable legacy-name conflicts and matching read-only package sources intentionally block before mutation; temporary backups require owner-only privacy and cleanup; the branch remains behind its tracked base; all downstream evidence predating SR-013 remains superseded. No generalized transaction framework, runtime UUID alias, or provider/offering attributes are justified by the finding.

### ARCH-REV-008 — Recovery contract resolved; migration-order integration remains

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Review round and trigger: Round `8`; solution designer delivered cumulative `SR-014` rework for `ARCH-DESIGN-006`, `PREM-CPMIG-001`, and `PREM-CPMIG-002`.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`; prior `ARCH-DESIGN-006`, new `ARCH-DESIGN-007`, retained premises `PREM-CPMIG-001`/`PREM-CPMIG-002`, and new premises `PREM-CPMIG-003`/`PREM-CPMIG-004`.
- Relevant solution revision IDs: `SR-014` resolves the recovery-entry finding within the `SR-013` identity expansion; `SR-010`–`SR-012` remain authoritative for unchanged Qwen/exact-custom behavior.
- Prior authoritative decision: `Fail — Design Impact` at `ARCH-REV-007`.
- Current authoritative decision: `Fail — Design Impact`.
- What changed in the review result or what baseline was established: SR-014 makes interrupted-run recovery actionable without generalizing the domain or transaction model. One startup-only runner method preserves process-local `inFlight`, bypasses only an exact persisted `RUNNING` timestamp, and reuses normal attempt/result recording. The migration PID lock, fresh/journaled/terminal entry matrix, lag-only phases, minimal completion receipt, exact runner-success acknowledgement, and immediate restart coverage close both prior premises. Re-review of the complete startup path found a separate registry-order defect: the readable migration remains immediately after V1 while its coordinator runs only after generic `runPending` has continued through later required migrations. One later migration needs old custom-provider IDs to recover token provider names; another rewrites readable-managed metadata before journal recovery or receipt acknowledgement.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-DESIGN-006` | Open; blocking at `ARCH-REV-007` | Resolved | `SR-014`; `REQ-014`; `AC-018`; supplement runner recovery, entry matrix, phases, receipt handoff, startup gate, and coverage | Exact persisted-`RUNNING` recovery now checks `inFlight`, uses the existing PID-backed provider lock, distinguishes fresh V2/journaled V2 or V3/receipt V3/already-current V3, retains old/new proof through generic runner success, acknowledges only after exact `SUCCEEDED`, and covers every pre/post-V3 and runner-handoff crash point. |
| `ARCH-DESIGN-001`–`ARCH-DESIGN-005` | Resolved/obsolete in earlier rounds | Remain resolved/obsolete | `SR-010`–`SR-014` | SR-014 changes only startup recovery mechanics; exact metadata, Qwen durability/status, and no-profile/no-generalized-schema decisions remain intact. |

- New or remaining finding IDs: `ARCH-DESIGN-007`.
- Material classification changes: `ARCH-DESIGN-006` is resolved. The overall decision remains `Fail — Design Impact` because `PREM-CPMIG-003` and `PREM-CPMIG-004` prove a new current migration prerequisite/gate ordering gap.
- Recommended recipient: `solution_designer`.
- Remaining risks or uncertainty: Deterministic identity/preflight blockers and private-state security remain bounded; no runtime alias, token-history rewrite, generalized migration dependency framework, or provider/offering attribute is justified. The branch remains behind its tracked base and all prior downstream evidence remains superseded.

### ARCH-REV-009 — Final readable-ID registry boundary passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Review round and trigger: Round `9`; solution designer delivered cumulative `SR-015` rework for `ARCH-DESIGN-007`, `PREM-CPMIG-003`, and `PREM-CPMIG-004`.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`; prior finding `ARCH-DESIGN-007`, retained resolved finding `ARCH-DESIGN-006`, and reachable premises `PREM-CPMIG-001`–`PREM-CPMIG-004`.
- Relevant solution revision IDs: `SR-015` resolves the current registry-boundary finding; `SR-014` remains authoritative for interruption recovery, and `SR-010`–`SR-013` remain authoritative for unchanged Qwen, exact-custom-metadata, and readable-identity behavior.
- Prior authoritative decision: `Fail — Design Impact` at `ARCH-REV-008`.
- Current authoritative decision: `Pass`.
- What changed in the review result or what baseline was established: SR-015 preserves every current migration's relative order, appends readable identity after `RunHistoryIndexV2AppDataMigration` as the final required definition, proves five exact terminal prerequisites under the provider lock, gives the existing token provider-name migration a strict migration-only missing/V2/V3 `{id,name}` reader, preserves strict V3 in the V1 migration, and makes the readable coordinator the next startup statement after `runPending()`. AC-019 exercises the complete direct multi-version path, including prior name/selector work, post-V3 process death, immediate recovery, exact runner success, acknowledgement, and strict V3/no-record preservation. This closes both reachable order premises without a generalized scheduler, runtime alias, history rewrite, or transaction framework.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-DESIGN-007` | Open; blocking at `ARCH-REV-008` | Resolved | `SR-015`; `BEH-003`, `BEH-007`; `REQ-015`; `AC-019`; supplement prerequisite/final-boundary and coverage sections; design DS-006/LS-004, registry/startup sequence, file map, and guidance | The target retains current registry order, runs all old-ID consumers/current managed-target writers before readable identity, independently requires the five exact terminal records under the provider lock, appends readable identity last, invokes its coordinator immediately after `runPending()`, and tests the full multi-version/restart path. `PREM-CPMIG-003` and `PREM-CPMIG-004` remain reachable but now have bounded, complete responses. |
| `ARCH-DESIGN-006` | Resolved at `ARCH-REV-008` | Remains resolved | `SR-014`, retained by `SR-015`; `REQ-014`; `AC-018` | SR-015 does not alter startup-only persisted-`RUNNING` re-entry, `inFlight`/PID-lock exclusion, V2/V3 state matrix, lag-only phases, receipt handoff, exact success gate, or immediate-restart coverage. |
| `ARCH-DESIGN-001`–`ARCH-DESIGN-005` | Resolved/obsolete in earlier rounds | Remain resolved/obsolete | `SR-010`–`SR-015` | Exact metadata, Qwen durability/status/catalog, profile removal, and minimal public/domain shapes are unchanged by the migration-order rework. |

- New or remaining finding IDs: None.
- Material classification changes: `Fail — Design Impact` -> `Pass`; `PREM-CPMIG-003` and `PREM-CPMIG-004` remain `Reachable`, but SR-015 responds proportionately and fully.
- Recommended recipient: `implementation_engineer`.
- Remaining risks or uncertainty: Deterministic slug/non-derivable-name conflicts, matching read-only package roots, live PID locks, and malformed private state intentionally block rather than guess. Owner-only privacy and cleanup remain mandatory. The branch remains behind its tracked base, and all implementation/code-review/API-E2E/delivery evidence predating SR-015 is superseded for the readable-identity scope.

### ARCH-REV-010 — Secretless reset and ordinary recreation pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Review round and trigger: Round `10`; solution designer delivered the user-approved `SR-016` material replacement after the user rejected secret migration and crash-perfect recovery in favor of deterministic selector migration plus ordinary provider recreation.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`; prior findings `ARCH-DESIGN-006`, `ARCH-DESIGN-007`, and retained reachable ordering premises `PREM-CPMIG-003`, `PREM-CPMIG-004`.
- Relevant solution revision IDs: `SR-016` is current; `SR-010`–`SR-012` remain authoritative for unchanged Qwen/exact-custom behavior; `SR-013`–`SR-015` and `ARCH-REV-009` are historical only for the superseded secret-preserving transition.
- Prior authoritative decision: `Pass` at `ARCH-REV-009`, superseded as implementation authority by the material product replacement.
- Current authoritative decision: `Pass`.
- What changed in the review result or what baseline was established: SR-016 removes legacy provider/Base-URL and credential preservation. V1 stages secretless V2, valid legacy names produce only a transient old/future selector map, allowlisted selectors receive exact prefix rewrites with byte-identical suffixes, and empty V3 commits last. Old UUID secrets are removal-only best effort; their values are never resolved or transferred. The unchanged create flow re-establishes a provider only after the user re-enters name, Base URL, and key. Missing selectors remain stored/raw-visible and exact launch/resume paths fail without fallback until same-name recreation or reselection. Fixed prerequisites/final placement, atomic per-target writes, ordinary stale retry, and a thin terminal gate are retained; journal/backups/receipt/recovery/runner-bypass machinery and tests are explicitly removed. The replacement is coherent and materially simpler.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-DESIGN-006` | Resolved by `SR-014`; retained through `ARCH-REV-009` | Obsolete by approved replacement | `SR-016`; `BEH-007`; `REQ-014`, `REQ-015`; `AC-018`; supplement optimistic execution/non-goals; design removal plan and tradeoffs | Immediate post-crash convergence, secret preservation, journal/receipt handoff, and special recent-`RUNNING` bypass are no longer approved outcomes. SR-016 explicitly accepts ordinary stale-run delay and deletes the machinery rather than solving the old premise. |
| `ARCH-DESIGN-007` | Resolved at `ARCH-REV-009` | Remains resolved under replacement | `SR-016`; `REQ-015`; `AC-019`; supplement exact ordering; design DS-006/LS-002 and migration sequence | The token provider-name snapshot still consumes the old UUID map and current cleanup migrations still write selector targets, so `PREM-CPMIG-003`/`004` remain reachable. SR-016 retains the migration-only name reader, exact five terminal prerequisites, current relative order, final readable registration, registry invariant, and post-run terminal gate without restoring recovery machinery. |
| `ARCH-DESIGN-001`–`ARCH-DESIGN-005` | Resolved/obsolete in earlier rounds | Remain resolved/obsolete | `SR-010`–`SR-012`, retained by `SR-016` | Exact metadata, Qwen durability/status/catalog, endpoint-profile removal, and minimal public/domain shapes are unchanged by the reset replacement. |

- New or remaining finding IDs: None.
- Material classification changes: Prior `Pass` is superseded but the fresh result is also `Pass`. `ARCH-DESIGN-006` becomes obsolete through approved removal of its governing guarantee; `ARCH-DESIGN-007` remains resolved by the still-required fixed ordering.
- Recommended recipient: `implementation_engineer`.
- Remaining risks or uncertainty: Same-name/exact-suffix recreation may fail and require manual reselection; invalid/colliding legacy names and skipped selector targets remain stale with warnings; ordinary recent-`RUNNING` delay is accepted; old secret cleanup may leave unreachable orphan ciphertext. Dirty SR-015 source/tests and all earlier downstream evidence are superseded. Delivery still owns tracked-base refresh/integration.

### ARCH-REV-011 — Friendly live-Qwen labels pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Review round and trigger: Round `11`; solution designer delivered `SR-017` after the user's DR-009 hands-on testing showed collision-safe `qwen:...` selectors as visible Settings labels.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`; API-REV-009 evidence item `QW-LABEL-009`; no architecture finding ID.
- Relevant solution revision IDs: `SR-017` adds the presentation rule; `SR-016` remains authoritative for readable custom identity/reset; `SR-010`–`SR-012` remain authoritative for exact-only custom metadata and native Qwen configuration/catalog/routing.
- Prior authoritative decision: `Pass` at `ARCH-REV-010` for SR-016.
- Current authoritative decision: `Pass`.
- What changed in the review result or what baseline was established: API-REV-009 and current source prove the live contract is already correctly separated into friendly `name`, collision-safe `modelIdentifier`, exact provider `value`, and `providerType`. SR-017 extends the existing shared `modelSelectionLabel` owner with one Qwen/nonblank-name rule before the generic default-AutoByteus identifier fallback. Settings cards and the shared runtime/binding/media consumers receive the same friendly text while option IDs, persistence, factory lookup, GraphQL, and Qwen request values remain exact. A missing selector has no live row and remains raw/actionable through caller-owned behavior. No new field, component-specific branch, historical label map, catalog/core/server change, or generalized presentation schema is introduced.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-DESIGN-006` | Obsolete at `ARCH-REV-010` | Remains obsolete | `SR-016`, retained by `SR-017` | SR-017 is presentation-only and does not restore credential preservation, private migration recovery, or immediate crash convergence. |
| `ARCH-DESIGN-007` | Resolved under `SR-016` at `ARCH-REV-010` | Remains resolved | `SR-016`, retained by `SR-017`; `PREM-CPMIG-003`, `PREM-CPMIG-004` | The fixed prerequisite set, migration-only name reader, final readable placement, and terminal gate are unchanged. |
| `ARCH-DESIGN-001`–`ARCH-DESIGN-005` | Resolved/obsolete in earlier rounds | Remain resolved/obsolete | `SR-010`–`SR-012`, retained by `SR-017` | Exact metadata, profile removal, Qwen durable configuration/status, and exact catalog/routing boundaries are unchanged. |

- New or remaining finding IDs: None.
- Material classification changes: None. The prior cumulative `Pass` remains valid, and the newly reviewed presentation delta also passes. No new failure/lifecycle premise is needed; `BEH-008` is directly reachable through the exposed Settings/model-selection surfaces and supported user browse/select action.
- Recommended recipient: `implementation_engineer`.
- Remaining risks or uncertainty: A future surface could bypass the shared label owner; a blank Qwen name intentionally falls back to the identifier. API-REV-009/DR-009 remain valid for unchanged identity/wire/setup/routing and SR-016 behavior but are superseded for the target visible label. Focused implementation, review, API/E2E, and delivery evidence must repeat; delivery retains refresh/finalization ownership.
