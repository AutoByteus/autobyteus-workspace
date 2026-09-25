# Code Review Report — Runtime-specific stopped-run model switching

## Review Round Meta

- Review Entry Point: Implementation Review; round 1; latest authoritative round: 1 (`CRR-001`).
- Trigger: IR-001 implementation handoff, commits `e22e36ed5`, `d70592baa`; prior review: N/A.
- Requirements: `requirements-doc.md` (SR-002 approval); investigation: `investigation-notes.md`; solution history: `solution-revision-record.md`; design: `design-spec.md` (SR-003); design supplement: `architecture-design-result.md`; architecture review: `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-001 Pass); implementation: `implementation-handoff.md` and `implementation-revision-record.md` (IR-001). All paths are in this ticket directory.
- Supplemental screenshot: current-state evidence only; no normative prototype. Coverage/API-E2E/delivery artifacts: N/A at this entry point.
- Code review revision record: `code-review-revision-record.md` (`CRR-001`).

## Routing Classification Review

- Task size: **Medium**; architectural risk: **High**; selected route: **Implementation Review**, independently required.
- Classification remains supported by shared server policy, GraphQL contract, three stopped Settings surfaces, and no persistence schema change. No route correction.

## Review Scope

Reviewed the approved scenario/production-path map, architecture premise decisions, changed server selection/capacity/GraphQL source, changed Web picker/copy/query/types, adjacent existing alias presentation and stopped-editor option refresh paths, focused tests, removal list, and IR-001 validation evidence. This was static independent source review, not a claim of browser, full API/E2E, or real-provider continuation execution. Generated `graphql.ts` was checked for synchronized option shape, not scored as handwritten source.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved basis: all current external-runtime catalog identifiers are eligible without a capacity gate; AutoByteus retains verified non-decreasing capacity; stopped lifecycle, fresh catalog/schema Save, atomic multi-scope commit, history/binding and visible error handling remain.
- Design review ARCH-REV-001 and SR-003 map confirmed except BEH-001 on an existing Claude alias presentation path.
- No newly invented behavior or requirement ambiguity. The failing path is directly within SCN-001 and AC-001/002.

| Behavior ID | Status | Forward implementation/lifecycle evidence | Contradiction |
| --- | --- | --- | --- |
| BEH-001 | Contradicted in one Claude alias case | Settings → options service → GraphQL/store → `RuntimeModelConfigFields` → shared grouped picker. Server lists every external ID. | `default` and its sibling collapse to one picker item; selecting between the two cannot emit the other catalog ID (F-001). |
| BEH-002 | Confirmed | Stopped Save owners → `validate/validateMany` → fresh catalog + schema; external capacity skipped. | — |
| BEH-003 | Confirmed | Native options/validator use verified positive native evidence; same-model validation bypasses capacity. | — |
| BEH-004 | Confirmed for source boundary; runtime outcome unverified | Existing writers/restore adapters remain; no Save-time history or provider-binding change. | Representative smaller-window live continuation remains API/E2E risk, not a source finding. |
| BEH-005 | Confirmed for required copy/error states | Runtime-specific help and unavailable status are rendered. | No behavior contradiction promoted. |
| BEH-006 | Confirmed for source boundary | Existing Team/Org planners/atomic writers use per-scope shared validator. | — |

## Supported Product Scenario And Reachability Gate

| Scenario ID | Behavior / contract | Kind; actor and coherent goal | Independent entry | Shape; forward path/lifecycle | Outcome/consequence | Evidence | Validity; use |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001-A | BEH-001; REQ-002, AC-001/002 | User wants to choose an explicit Claude model instead of the SDK `default` alias, or choose `default` instead of a fixed sibling. The identifiers have different saved selection meaning even while resolving to the same current canonical model. | Existing stopped Claude Agent/Team/Org Settings model picker. | Normal: stopped saved run → server catalog/options → grouped Web picker → selection draft → Save → persisted identifier. | An offered replacement must be selectable and saveable; collapsed alias prevents that transition. | Approved SCN-001/REQ-002; Claude presentation intentionally retains separate catalog identities (`claude-sdk-model-selection-presentation.ts:12-45`); Web grouping and picker source below. | Supported Normal Scenario; Use. |
| SCN-005 | BEH-002/005; REQ-004/007 | User encounters a temporary unavailable runtime catalog. | Stopped Settings load. | Explicit edge: options query fails → unavailable message; reentering Settings starts fresh load. | No invented option is saved; recovery remains available by reentry. | Approved SCN-005; service/store/UI source. | Supported Explicit Edge Scenario; Use for error-state check. |
| SCN-004 | BEH-003; REQ-003 | User changes stopped AutoByteus model or same-model settings. | Existing stopped Settings. | Normal: options → native evidence → Save validator. | Verified non-decreasing policy retained. | Requirements, design, source/tests. | Supported Normal Scenario; Use. |
| SCN-006 | BEH-004; REQ-005 | System resumes saved external run after model selection. | Normal next message/restore. | Explicit edge when old history exceeds new window; provider handles or rejects visibly. | No history/binding reset. | Requirements/design and unchanged restore boundary; live provider matrix not yet executed. | Supported Explicit Edge Scenario; Use only for preserved-source check, not provider-success claim. |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation / mechanism | Scenario / contract | Independent trigger | Forward path / lifecycle / consequence | Evidence | Disposition | Reason / proportionate response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | Claude alias folding hides a distinct offered identifier from stopped-run selection. | SCN-001-A | User opens stopped Claude Settings to change `default` ↔ explicit sibling. | Server supplies both IDs; `selectableModelOptions` treats alias as represented; `SearchableGroupedSelect` emits only item ID and suppresses selection when alias already selected; no draft/Save for the desired identifier. | `RuntimeModelConfigFields.vue:194-204,336-341`; `modelSelectionOptions.ts:35-51`; `SearchableGroupedSelect.vue:240-246`; Claude presentation `:12-45`. | Promote | Preserve distinct catalog-ID selection on this existing-run surface while keeping launch alias presentation if desired; add a focused picker test in both directions. |
| C-002 | An in-editor server-options retry could improve recovery. | SCN-005 | Settings catalog temporarily fails. | Error is displayed; closing/reopening Settings invokes fresh options loading. | `RuntimeModelConfigFields.vue:207-213`; `ExistingRunConfigEditor.vue` target watcher; `existingRunConfigStore.ts:124-143`. | Reject | AC-001/008 require clear retry/error, not a dedicated in-editor control; reopening the supported Settings surface retries. Do not prescribe extra UI machinery in this review. |
| C-003 | Add special provider-history compression to guarantee smaller-model continuation. | SCN-006 | No independent contract promises universal success. | Would add Save-time or restore machinery outside approved scope. | REQ-005 non-goal; design; no live matrix evidence. | Reject | Provider may reject visibly; API/E2E must measure, not prescribe speculative compression. |

## Structural / Design Checks

| Check | Result | Evidence / required action |
| --- | --- | --- |
| Task design health assessment present and preserved | Pass | SR-003/IR-001 bounded behavior change and clean removal. |
| Approved supplemental artifacts | Pass | Screenshot used as current-state evidence only. |
| Data-flow spine inventory / preservation | Fail | DS-01/03 breaks for C-001; server ID does not reach distinct selectable draft. F-001. |
| Ownership boundary clarity | Pass | One server selection owner; lifecycle owners still commit. |
| Off-spine concerns | Pass | Native capacity, schema, catalog and copy serve their owners. |
| Existing capability/subsystem reuse | Pass | Existing catalog, picker, store and validator reused. |
| Reusable owned structures | Pass | Shared option shape narrowed once at server and transport mirrors. |
| Shared data-model tightness | Pass | Numeric fields removed; no parallel external option model. |
| Repeated coordination ownership | Pass | Per-scope policy centralized in selection service. |
| Empty indirection | Pass | New copy selector and native evidence resolver have concrete responsibilities. |
| Scope-appropriate SoC/file responsibility | Pass | Server authority, Web presentation and lifecycle writers remain separated. |
| Dependency direction | Pass | No new cycle or policy shortcut identified. |
| Authoritative Boundary Rule | Pass | Callers use selection service rather than its internal native resolver. |
| File placement | Pass | Native evidence in LLM management; copy selector in Web utils. |
| Flat-vs-over-split layout | Pass | No unnecessary new hierarchy. |
| Interface/API/query/command clarity | Pass | Explicit runtime/scope identity and ID-only option DTO. |
| Naming alignment | Pass | Native capacity and runtime model help names match responsibilities. |
| Unjustified duplication | Pass | One validator and shared copy helper. |
| Patch-on-patch complexity | Pass | Obsolete external capacity path removed, not shadowed. |
| Dead/obsolete cleanup | Pass | Old external readers/types/GraphQL fields deleted. |
| Relevant test scenario assertions | Fail | Current alias test asserts collapsed behavior but not REQ-002 distinct offered-ID transition. F-001. |
| Test fixtures/helper reuse | Pass | Focused service/component fixtures are coherent; no source-size rule applied. |
| No stale/compatibility-only tests | Pass | External capacity reader tests removed. |
| API/E2E readiness | Fail | Supported alias picker path unresolved; do not advance. |

## Source File Size And Structure Audit

Changed handwritten implementation source (effective nonempty lines; generated code/tests/docs excluded): server GraphQL type 44; run-selection domain 16; native capacity 17; selection service 101; Claude SDK client 484 (17-line removal, below 500); Web picker 335 (+13/−10, under +220); Agent form 171; Team editor 346; GraphQL query 25; EN/ZH workspace messages 437/436; Web option type 40; copy selector 7. Deleted runtime capacity domain/service and Claude/Codex capacity readers: N/A after deletion. All surviving changed implementation files pass the `>500` hard limit and `>220` positive-delta check. File placement and SoC pass except the behavior-level picker issue C-001; no size-driven split required.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward compatibility / old-behavior retention | Pass | No external capacity fallback or dummy GraphQL numeric fields. |
| Dead cleanup | Pass | Obsolete external capacity readers and tests removed. |
| Persisted transition | Pass | Directly Usable — No Migration; model/history storage shapes unchanged. |
| No dual read/write or request-time old-shape fallback | Pass | None observed. |
| Migration mechanics | Pass | N/A — migration not required. |

Dead/obsolete items requiring further removal: None identified. Docs impact: Yes; implementation updated settings/execution and server LLM docs, but final sync should follow the corrected picker behavior.

## Additional Material Premise Validation

ARCH-REV-001 supported SCN-001–006 basis remains confirmed. No new unsupported lifecycle/failure premise is used. Claude alias distinction C-001 is based on an existing normal catalog/picker contract, not a synthetic concurrency sequence. C-002 is rejected as a machinery requirement because the approved error/retry outcome can use Settings reentry. No speculative recovery machinery is required.

## Review Scorecard

- Overall score: **9.1/10**, **91/100** (simple mean of ten category scores, rounded; the category gaps control the decision).

| Priority | Category | Score | Why / weakness | Improvement |
| --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 8.5 | DS-01/03 is clear server-side but fails at alias-to-draft handoff (C-001). | Preserve selectable offered identifier. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Single policy owner and existing lifecycle owners; no boundary bypass. | No structural change. |
| 3 | API / Interface / Query / Command Clarity | 9.3 | ID-only option contract and explicit scope identity are tight; no interface defect found. | Retain shape. |
| 4 | Separation of Concerns and File Placement | 9.2 | Concerns remain correctly placed; no structural weakness beyond the picker behavior. | Retain boundaries. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.4 | Numeric transport removed cleanly. | Retain shape. |
| 6 | Naming Quality and Local Readability | 9.2 | Readable source and policy-specific copy; no blocking naming weakness. | Retain clarity. |
| 7 | API/E2E Readiness | 8.7 | Offered Claude alias transition lacks an executable UI path (C-001). | Fix and cover before API/E2E. |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.5 | External capacity rule is correct, but one approved Settings selection outcome fails (C-001). | Resolve F-001. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean removal of obsolete readers/fields. | None. |
| 10 | Cleanup Completeness | 9.5 | No remaining dead capacity code found. | None. |

## Findings

### F-001 — Distinct Claude catalog identifiers collapse in the stopped-run picker

- **Classification:** Local Fix; candidate C-001; BEH-001, REQ-002, AC-001/002, SCN-001-A.
- **Evidence:** The Claude SDK catalog retains `default` as a separate identifier even when it currently resolves to an explicit sibling (`claude-sdk-model-selection-presentation.ts:12-45`). The server correctly returns each non-current ID. `modelSelectionOptions.ts:35-51` folds `default` into the sibling. `RuntimeModelConfigFields.vue:194-204` treats the alias as already represented, so no distinct row is added. `SearchableGroupedSelect.vue:240-246` emits only the sibling ID, and emits nothing when the alias is the saved selected value. Thus a stopped run saved with `default` cannot choose the explicit sibling, and a run saved with the sibling cannot choose `default`, despite both being catalog members and server-eligible.
- **Required bounded response:** Make each server-offered identifier selectable on existing stopped-run Settings without rewriting merely by reopening the picker; cover both directions and preserve launch-picker alias presentation where not in scope. Do not add a capacity rule.

## Classification / Recommended Recipient

- Review decision: **Fail**; classification: **Local Fix** (implementation-owned Web behavior/test change, no intended-behavior or architecture change required).
- Recommended recipient: `/implementation_engineer`; return for independent source review after fix, then API/E2E.

## Residual Risks

Real smaller/unknown-window provider continuation, complete API/E2E and rendered browser validation remain downstream, not passed here. `nuxi typecheck` was blocked by a `vue-tsc`/TypeScript toolchain mismatch; Nuxt build and focused tests passed per IR-001, not rerun in this review. Out-of-repo consumers of removed GraphQL numeric fields remain unproven and did not drive a finding.

## Latest Authoritative Result

- Review Decision: **Fail**; Review Entry Point: **Implementation Review**; Supported Product Scenario Gate: **Pass**; Material-Premise Gate: **Pass**.
- Score Summary: **9.1/10, 91/100**; categories 1/7/8 below clean-pass target because of F-001.
- Failure Origin: N/A — pre-API/E2E source review.
- Recommended Recipient: `/implementation_engineer`.
