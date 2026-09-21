# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-011`
- Package identifier: `APP-STARTUP-LATENCY-20260918-001`
- Request / ticket: Analyze and correct slow application startup on the unreleased flat Agent Organization branch.
- Requirements owner: Solution Designer
- Date: 2026-09-19
- Exact approved requirements baseline: cumulative `SR-010`.
- Approval evidence: the original startup/access policy remains approved (“we should trust that the migration has done correctly, and in the startup we shouldn't try to validate what has already been done by the migration itself”; a missing attachment “is just a runtime error”). The user then approved terminal warning treatment for incomplete legacy data (“It should be marked as succeeded with warning, not failed”), clarified that failure is reserved for conditions that prevent safe normal application operation, explicitly extended that principle to per-root token-row migration failures, agreed that the existing conversion is largely correct and the remaining work is principally status/retry handling, and confirmed the summarized boundary with “yessss.”
- Current approval impact: unchanged. `ARCH-REV-006 / ARCH-F-004` found a technical interface mismatch, not a product-policy gap: the current root-keyed token failure map contains more than the approved malformed/conflicting token-data rejection. `SR-011` clarifies that only a semantically typed, transaction-rolled-back token-data rejection is warning-eligible; structural, database-operational, concurrency/precondition, reread and unknown failures remain fatal. No renewed user approval is required.
- Behavior-defining supplements: N/A. Review and validation artifacts are evidence, not independent behavior specifications.

## Problem And Desired Outcome

- Problem: a normal launch of the latest Electron build from `requirements/flat-agent-organization-model` took about 31 seconds before the embedded server was ready. About 27 seconds were spent exhaustively reading old Team and AgentOrg member trace files and checking historical attachment references before listen.
- Desired startup outcome: perform bounded strict current Team/AgentOrg structural admission without reading the complete historical trace corpus; retain exact owner/path/file validation when an attachment is actually opened.
- Migration outcome problem: the unreleased flat-family migration uses one overall `FAILED` result for both attempt-wide operational failure and isolated legacy-root problems. `FAILED` is retried on every startup, causing repeated ledger writes and warnings even where the application can safely start and unaffected data remains usable.
- Desired migration outcome: record supported isolated data limitations as durable terminal warnings, retain their exact item details, and reserve `FAILED` for an attempt-wide/current-authority condition that cannot establish a safe usable migration result and therefore requires correction/retry.
- Observable success: representative startup performs zero readiness-owned historical raw-trace reads and completes within 10 seconds; valid histories remain available; attachment errors are request-local; the current eight missing-tree items and isolated, explicitly classified malformed/conflicting per-root token-data rejections can produce terminal `SUCCEEDED_WITH_WARNINGS`; attempt-wide failures still produce `FAILED` and dominate warnings.

## Relevant Current And Desired Behavior

| Behavior ID | Current Behavior | Desired Behavior | Preserved Behavior |
| --- | --- | --- | --- |
| `BEH-001` | Pre-listen readiness opens/parses every member raw-trace segment; the reproduced profile reads about 5.5 GiB and blocks readiness for about 27 seconds. | Perform bounded current Team/AgentOrg package admission, matching the original `personal`-branch responsibility extended to both current families, without scanning historical trace payloads. | Required manifests, execution trees, task/message records, family separation and current structural authorities remain strict. |
| `BEH-002` | A malformed, stale or missing attachment locator can exclude an otherwise valid root during startup. | Keep the root visible. Validate exact owner, descriptor, safe path and file existence only when the attachment is opened; return precise `400`/`404` for supported local failures. | No traversal, cross-root access, substitute file, false success or catch-all suppression of unexpected faults. |
| `BEH-003` | The flat-family migration reports `FAILED` for eight missing-tree legacy roots and for malformed/conflicting root token-attribution data, while its current root-keyed failure map also mixes structural and operational faults. | Treat an evidence-backed isolated root limitation as a terminal warning only when (a) the required legacy Team execution tree is absent before planning, or (b) the token repository semantically classifies malformed/conflicting attribution data and its exact root transaction rolls back. Preserve the item as failed/not migrated in details, expose the local limitation, and return `SUCCEEDED_WITH_WARNINGS` when no fatal condition occurs. | Do not call the affected root successfully migrated. Missing-tree sources remain unchanged. A token-failed Org is not silently resumed; its existing `AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY` guard remains local and explicit. Unaffected roots and the application remain available. |
| `BEH-004` | Migration result aggregation does not distinguish root-scoped data limitations from attempt-wide inability to establish a coherent result. | Any attempt-wide/global authority failure remains overall `FAILED` and retryable, and overrides warning items. This includes global history-index discovery/read/commit/reread failure, token-root discovery or database availability failure, global locator orchestration failure, mandatory current-schema failure, and unknown attempt-level failure. | Existing conversion ordering, transactional token conversion, strict postconditions, status schema and generic migration runner remain unchanged. Normal readiness never repeats migration-owned whole-history attachment validation. |

## Scope Guardrail

### In Scope

- Normal cold launch against a substantial established profile.
- Strict current Team/AgentOrg structural admission and exact Team/Org attachment access.
- Removal of recurring readiness-owned historical trace/attachment audit.
- In-place result-classification correction for existing migration `20260901_agent_org_flat_team_families_v1`.
- Warning eligibility for the two source-proven isolated conditions: missing required execution tree before plan creation, and a semantically classified malformed/conflicting per-root token-attribution data rejection after transaction rollback. Root identity or presence in a failure map alone is insufficient.
- Fatal precedence for attempt-wide/global failures and exact lifecycle proof across the first corrected run and later terminal skips.

### Out Of Scope

- A new/corrective migration, shared migration-status/schema/runner redesign, or reclassification of unrelated migrations.
- Repairing, deleting, fabricating or force-migrating the eight incomplete legacy sources.
- Repairing malformed/conflicting token rows or making an affected Org resumable in this ticket.
- Reordering locator/runtime/token/history conversion, adding generic prepare/commit machinery, or claiming cross-store atomicity that the migration does not have.
- Reclassifying per-root locator/runtime writes, rereads, cleanup, dependency failures, malformed trees/sidecars, family collisions, or unknown candidate failures as warnings without separate evidence and approval.
- Production release, signing, notarization, install, rollout, provider performance or general renderer optimization.
- Redesigning context-file APIs beyond the bounded final Team `400`/`404` correction already required by `BEH-002`.

### Non-Goals

- Do not merely show the window earlier while histories remain blocked behind the same scan.
- Do not hide warning details, report an affected root as migrated, or use warning status to bypass exact runtime readiness checks.
- Do not infer warning eligibility from a nonzero `failedCount`, error text, or the mere fact that the process happens to listen.
- Do not suppress attempt-wide faults or convert them to warnings merely to stop retries.
- Do not add a compatibility fallback, persisted readiness cache, background scan or new migration.

### Preserved Behavior Boundary

- Existing valid conversions, source bytes, histories, traces, context files, definitions, configuration, provider state and unrelated database records remain unchanged except for already-authorized valid migration effects and the migration's own corrected ledger/log transition.
- Per-root token conversion remains transactional. If it rejects malformed/conflicting rows, no token-row change for that root is committed.
- The affected token-failed Org remains locally unavailable for execution restore until separately corrected; unrelated data and normal application startup remain available.
- After terminal `SUCCEEDED_WITH_WARNINGS`, later startups do not rerun this migration or change attempts/timestamps/log path/targets.
- Mandatory current schema/service prerequisites and attempt-wide migration authorities remain strict.

## Requirements

| Requirement ID | Requirement | Supported Scenario / Behavior |
| --- | --- | --- |
| `REQ-001` | Embedded-server readiness must not enumerate, open or parse the complete historical raw-trace corpus and must not grow with archived trace bytes. | `SCN-001`; `BEH-001` |
| `REQ-002` | Startup must still validate the current structural authorities needed to admit each Team and AgentOrg root, including family placement and strict execution/task/message package consistency. | `SCN-001`, `SCN-002`; `BEH-001` |
| `REQ-003` | A structurally valid root remains discoverable when a historical attachment is missing, malformed or stale. Exact access returns `400` for malformed/unsafe descriptors or filenames and `404` for shaped but unavailable/mis-correlated owners or absent files; unrelated state remains usable. | `SCN-002`; `BEH-002` |
| `REQ-004` | Historical attachment reads must validate safe stored filename, exact Team/Org/member ownership, resolved execution scope and file existence. Known request-local cases are mapped narrowly; unexpected internal errors propagate. | `SCN-002`; `BEH-002` |
| `REQ-005` | The correction must update the existing unreleased migration in place. It must not introduce a new migration, repair warning items, or rewrite unrelated protected state. | `SCN-003`, `SCN-004`; `BEH-003`, `BEH-004` |
| `REQ-006` | A missing required legacy Team execution tree detected before plan creation is an isolated warning item. It contributes exact detail/`failedCount`, receives no candidate effects, and does not make the overall attempt `FAILED` when no fatal condition occurs. | `SCN-003`, `SCN-004`; `BEH-003` |
| `REQ-007` | Only a semantically classified malformed/conflicting token-attribution data rejection for one exact Org/root is an isolated warning item. Its root transaction remains rolled back; the affected Org continues to fail its existing token-readiness guard locally; unrelated roots and application startup remain usable. Root-ID validation, family/tree structure, SQL/query/update availability, concurrency/precondition, strict-reread and unknown errors are not warning-eligible. | `SCN-004`; `BEH-003` |
| `REQ-008` | An attempt-wide/global authority failure must make the overall migration `FAILED` and retryable and must dominate all warnings. At minimum this covers global history-index discovery/read/commit/reread failure, token-root discovery or database availability failure, global locator orchestration failure, mandatory current-schema failure and unknown attempt-level failure. | `SCN-004`; `BEH-004` |
| `REQ-009` | All currently unsupported item-level categories—per-root locator/runtime/write/reread/cleanup/dependency failure, malformed tree/sidecar, family collision and unknown candidate failure—remain `FAILED` pending separate evidence and approval. | `SCN-004`; `BEH-004` |
| `REQ-010` | The existing `FAILED` ledger may execute once under corrected code. A warning-only result becomes terminal `SUCCEEDED_WITH_WARNINGS`; later startups reuse it without incrementing attempts, rewriting timestamps/log path or touching migration targets. | `SCN-003`; `BEH-003`, `BEH-004` |
| `REQ-011` | Whole-history locator transformation and postcondition validation remain migration-owned. After terminal completion, neither migration runner nor readiness repeats that whole-history work. | `SCN-001`, `SCN-004`; `BEH-001`, `BEH-004` |

## Acceptance Criteria

| Acceptance Criterion ID | Requirement / Behavior / Scenario | Observable Outcome And Verification Intent |
| --- | --- | --- |
| `AC-001` | `REQ-001`; `SCN-001` | Three fresh-process representative launches record zero readiness-owned reads of active/archived raw traces and reach server readiness within 10 seconds on the same machine/profile. |
| `AC-002` | `REQ-001`, `REQ-002`; `SCN-001` | Increasing trace bytes without changing structural authorities does not materially increase readiness reads/time; Team/Org admission still comes from strict current package validation. |
| `AC-003` | `REQ-002`, `REQ-005`; `SCN-001`, `SCN-003` | Valid Agent/Team/AgentOrg histories remain available; invalid structural packages remain excluded. Exact before/after evidence distinguishes authorized migration ledger/log/valid-target effects from forbidden protected-state changes. |
| `AC-004` | `REQ-003`, `REQ-004`; `SCN-002` | Exact Team/Org access proves malformed/unsafe `400`, unavailable owner/file `404`, post-error valid `200`, root/server continuity, traversal denial and unsuppressed unknown faults. |
| `AC-005` | `REQ-006`, `REQ-010`; `SCN-003` | On an isolated clone of the representative profile, the first corrected startup records `SUCCEEDED_WITH_WARNINGS`, retains all eight missing-tree details and `failedCount=8`, creates no additional target, and leaves those sources unchanged. Three later starts keep attempts/timestamps/log path/targets stable. |
| `AC-006` | `REQ-007`, `REQ-010`; `SCN-004` | A malformed/conflicting token-data fixture for one root proves a typed data rejection, SQL transaction rollback, warning detail, the overall result is `SUCCEEDED_WITH_WARNINGS` when otherwise clean, the affected Org's existing readiness guard rejects restore locally, unrelated roots/startup remain usable, and the next run is terminal-skipped. |
| `AC-007` | `REQ-008`, `REQ-009`; `SCN-004` | Separate controls prove global token discovery/database failure, global history-index read/commit/reread failure, global locator orchestration failure and unknown attempt-level failure produce `FAILED`; any one of them dominates simultaneous warnings. Existing unsupported per-root runtime/locator/cleanup/dependency and malformed tree/sidecar/family controls remain `FAILED`. |
| `AC-008` | `REQ-011`; `SCN-004` | A valid legacy-locator fixture is transformed, strict-reread and validated once. Readiness does not repeat the audit in-process, and terminal status prevents later migration reruns. |
| `AC-009` | `REQ-005`–`REQ-010`; `SCN-003`, `SCN-004` | No new migration, shared runner/status change, conversion reorder, repair/reset, provider call, cache or background scan is used. Item detail, affected-root limitation and fatal precedence remain truthful. |

## Relevant Scenarios And Journeys

### `SCN-001` — Normal cold desktop launch with substantial retained history

- Validity: `Supported Normal Scenario`.
- Sequence: launch → run pending migration lifecycle → validate current Team/Org structural authorities → listen → publish histories.
- Expected outcome: valid histories appear without a whole-history raw-trace scan; structurally invalid roots remain excluded with diagnostics.

### `SCN-002` — User opens a historical attachment

- Validity: `Supported Normal Scenario` with supported local error cases.
- Sequence: select attachment → parse descriptor → resolve exact owner/scope → validate filename/path/file → stream bytes or return exact local error.
- Expected outcome: only attempted attachment access fails; the root and unrelated history remain available.

### `SCN-003` — Existing repeated failed record reaches terminal warning

- Validity: `Supported Explicit Edge Scenario` present in the representative profile.
- Sequence: runner observes existing `FAILED` record → corrected migration scans → eight missing-tree sources become warning items → overall status becomes `SUCCEEDED_WITH_WARNINGS` → later startups skip.
- Expected outcome: exact warnings persist without source/target mutation or recurring ledger writes.

### `SCN-004` — One-time migration has mixed root-local and attempt-wide outcomes

- Validity: `Supported Explicit Edge Scenario` governed by the unreleased migration contract.
- Expected outcome: missing-tree and semantically typed malformed/conflicting token-data rejections are warnings; an affected token root remains locally guarded. Root structural errors, database/concurrency/reread/unknown errors and any attempt-wide/global failure remain fatal and retryable; fatal outcomes dominate warnings.
- Evidence basis: existing planner/coordinator/token-transition/repository/run-store sources and `E-021`–`E-028` in `investigation-notes.md`.

## UI, Interaction, And Experience Requirements

- No new screen or visual redesign is required.
- The frontend may show existing loading while mandatory current prerequisites initialize, but it must not wait for a global historical trace scan.
- Warning details remain available through existing migration diagnostics/logging; no silent success presentation.

## Quality And Non-Functional Requirements

- Performance: zero global historical raw-trace reads before readiness is the invariant; representative target is under 10 seconds.
- Correctness: warning eligibility is explicit and source-derived, not inferred from counts/messages.
- Security: no weakening of owner correlation, token readiness, safe-child path enforcement or file-existence checks.
- Observability: distinguish item warning, affected-root local unavailability, attempt-wide failure, terminal skip and genuine startup prerequisite failure.
- Scalability: startup may scale with current root authority count, not historical trace bytes.

## Data Continuity And Acceptable Loss

- Missing-tree sources remain unchanged.
- An approved typed token-data rejection commits no token-row changes for that root; any earlier migration effects stay truthfully represented as incomplete and the affected Org remains locally guarded. Operational/structural exceptions are fatal even when root-keyed.
- No user definition/history/conversation/trace/context-file/settings/credential/workspace/provider loss is accepted.
- Only isolated fixtures and rebuildable task-worktree outputs may be discarded.

## Open Decisions And Questions

- `DEC-001`: Resolved — bad historical attachment is request-local and does not exclude an otherwise valid root.
- `DEC-002`: Resolved — migration owns one-time historical locator conversion; readiness does not repeat it.
- `DEC-003`: Resolved by cumulative `SR-010` approval — overall migration warning is permitted for the two evidence-backed isolated root conditions. Root-local token rejection may leave that Org unavailable, but it does not prevent normal unaffected application use; its exact guard remains. Attempt-wide/global authority failures and all unsupported item categories remain `FAILED` and retryable.
- No unresolved product decision remains.

## Readiness Check

- Relevant current behavior evidence-backed: `Yes`.
- Desired/preserved behavior, scope and non-goals explicit: `Yes`.
- Requirements and acceptance criteria testable and traceable: `Yes`.
- Supported normal and edge scenarios explicit: `Yes`.
- Persisted-state and local-unavailability consequences explicit: `Yes`.
- User approval received for cumulative baseline: `Yes — SR-010, including explicit token-row clarification and final “yessss” confirmation`.
- Approved package ready for revised architecture design/review: `Yes`.
- Remaining requirement blocker: `None`.
