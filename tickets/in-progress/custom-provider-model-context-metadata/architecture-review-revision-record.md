# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Initial architecture review of the approved solution package | `SR-001`–`SR-005` | `N/A` | `Fail` | `ARCH-DESIGN-001`, `ARCH-DESIGN-002`, `ARCH-DESIGN-003` |
| ARCH-REV-002 | Re-review after solution contract rework | `SR-006` | `Fail` | `Pass` | `ARCH-DESIGN-001`, `ARCH-DESIGN-002`, `ARCH-DESIGN-003` resolved |

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
