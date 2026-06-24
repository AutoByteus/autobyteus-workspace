# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design/tickets/done/memory-sync-transparency/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design/tickets/done/memory-sync-transparency/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design/tickets/done/memory-sync-transparency/design-spec.md`
- Current Review Round: 2
- Trigger: Re-review after round 1 Design Impact rework from `solution_designer` on 2026-06-24.
- Prior Review Round Reviewed: Round 1 in this same report path.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Re-read requirements, investigation notes, revised design spec, UX story, and the prior design review report. Rechecked current code evidence in `autobyteus-web/components/settings/MemorySyncCard.vue`, `autobyteus-server-ts/src/memory-sync/source/memory-sync-service.ts`, `autobyteus-server-ts/src/api/graphql/types/memory-sync-schema.ts`, and `autobyteus-server-ts/src/api/graphql/types/memory-sync.ts` for the previously identified watcher, status-state, and connection-test boundary issues.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review | N/A | 3 | Fail | No | Design direction was sound, but polling/form synchronization, last-sync error precedence, and saved-token fallback identity needed design clarification. |
| 2 | Re-review after DR-001/DR-002/DR-003 rework | DR-001, DR-002, DR-003 | 0 | Pass | Yes | Revised design resolves prior design-impact findings and is ready for implementation. |

## Reviewed Design Spec

The revised design is actionable and correctly constrained to the user-approved minimal UI transparency scope. It preserves the current Source card layout, avoids duplicate background/interval/manual-vs-background UI, and reuses the existing backend source-state store instead of introducing a new job system.

The prior blocking issues are resolved:

- Polling is now explicitly status-only, low-frequency, lifecycle-bounded, overlap-guarded, and forbidden from hydrating forms or clearing the draft token.
- `Last sync` now has a concrete precedence rule: latest error wins over older success when `jobState === "error" && lastError`.
- Connection testing now has an explicit saved-vs-draft identity boundary: blank token uses fully persisted saved settings; draft token uses full draft URL/source id/token. Mixed draft identity + saved token is rejected.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Revised spec keeps Behavior Change / UX Feature posture. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Missing Invariant plus Boundary/Ownership issue is tied to disconnected action feedback, raw `jobState` rendering, unsafe watcher-driven hydration, and resolver/client token-policy bypass. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Revised spec states limited refactor needed now. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File responsibilities, interface mapping, boundary map, migration sequence, and tests reflect the limited refactor. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | DR-001 | High | Resolved | Design now removes the deep status watcher as steady-state hydration, defines `hydrateFormsFromStatus(reason)`, adds status-only polling, and requires tests proving poll refresh preserves edited fields and pasted tokens. | No remaining design-impact issue. |
| 1 | DR-002 | Medium | Resolved | Design now states exact `Last sync` precedence and includes the prior-success-then-error example plus coverage guidance. | No remaining design-impact issue. |
| 1 | DR-003 | Medium | Resolved | Design now defines explicit `{ mode: "saved" }` and `{ mode: "draft", hubBaseUrl, sourceNodeId, token }` semantics and rejects mixed draft fields + saved token. | No remaining design-impact issue. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Test connection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Manual sync now | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Background sync observed by polling | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Mounted-card status refresh | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend Memory Sync UI | Pass | Pass | Pass | Pass | Local form state, status projection, action result state, and polling lifecycle are now separated. |
| Backend Memory Sync Source | Pass | Pass | Pass | Pass | Existing sync service/state store remain authoritative; new connection-test service owns saved-vs-draft semantics. |
| Backend GraphQL API | Pass | Pass | Pass | Pass | Resolver remains a thin entry facade; schema carries explicit mode input. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Current/last sync label derivation | Pass | Pass | Pass | Pass | Component computed helper is sufficient for one-card scope. |
| Connection test input mode | Pass | Pass | Pass | Pass | Internal discriminated service input avoids optional-field ambiguity. |
| Connection test result projection | Pass | Pass | Pass | Pass | Existing GraphQL result plus local timestamp/copy context is enough. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `MemorySyncSourceStateGql.jobState` + `lastSuccessfulSyncAt` + `lastError` | Pass | Pass | Pass | N/A | Pass | Raw field remains backend state; UI derives current-vs-last using explicit precedence. |
| `TestMemoryHubConnectionInput` | Pass | Pass | Pass | Pass | Pass | Mode-based input tightens identity and avoids draft/saved mixing. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| User-facing `Job state: success/error` wording | Pass | Pass | Pass | Pass | Replaced by `Current job` / `Last sync`. |
| Deep `store.status` watcher as steady-state form hydrator | Pass | Pass | Pass | Pass | Replaced by explicit hydration calls. |
| Top-level `store.info` as primary test result | Pass | Pass | Pass | Pass | Replaced by inline `connectionTestResult`. |
| Mixed draft URL/source id + saved token behavior | Pass | Pass | Pass | Pass | Replaced by saved mode or draft mode. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/MemorySyncCard.vue` | Pass | Pass | N/A | Pass | Owns form/presentation/hydration timing/poll lifecycle; not backend policy. |
| `autobyteus-web/stores/memorySyncStore.ts` | Pass | Pass | N/A | Pass | Owns status/action state and guarded refresh; not form hydration timing. |
| `autobyteus-server-ts/src/memory-sync/source/memory-sync-connection-test-service.ts` | Pass | Pass | N/A | Pass | Owns saved/draft test identity and delegates HTTP to client. |
| `autobyteus-server-ts/src/api/graphql/types/memory-sync-schema.ts` | Pass | Pass | N/A | Pass | Owns explicit mode input shape only. |
| `autobyteus-server-ts/src/api/graphql/types/memory-sync.ts` | Pass | Pass | N/A | Pass | Thin delegation only. |
| Localization message files | Pass | Pass | N/A | Pass | Copy ownership is clear. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend Memory Sync UI -> store -> GraphQL | Pass | Pass | Pass | Pass | Component does not call Apollo directly for polling/actions. |
| GraphQL resolver -> source services | Pass | Pass | Pass | Pass | Resolver must not own token fallback policy. |
| `MemorySyncConnectionTestService` -> config service/client | Pass | Pass | Pass | Pass | Service owns policy; client remains adapter. |
| `MemorySyncService` -> source scanner/planner/state/client | Pass | Pass | Pass | Pass | Existing authoritative sync boundary remains intact. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `MemorySyncConnectionTestService` | Pass | Pass | Pass | Pass | Explicit saved/draft mode prevents resolver bypass/mixed identity. |
| `MemorySyncService` | Pass | Pass | Pass | Pass | Worker/resolver use service; UI/resolver do not mutate state directly. |
| `MemorySyncCard` form hydration | Pass | Pass | Pass | Pass | Polling cannot call form hydration. |
| `memorySyncStore` status refresh | Pass | Pass | Pass | Pass | Store owns status request guard and API projection. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `testMemoryHubConnection(input)` | Pass | Pass | Pass | Low | Pass |
| `MemorySyncConnectionTestService.testConnection` | Pass | Pass | Pass | Low | Pass |
| `startMemorySync()` | Pass | Pass | Pass | Low | Pass |
| `getMemorySyncStatus()` | Pass | Pass | Pass | Low | Pass |
| `memorySyncStore.refreshStatusOnly()` | Pass | Pass | Pass | Low | Pass |
| `MemorySyncCard.hydrateFormsFromStatus(reason)` | Pass | Pass | Pass | Low | Pass |
| `currentJobLabel` / `lastSyncLabel` computed helpers | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/MemorySyncCard.vue` | Pass | Pass | Low | Pass | Existing card is correct UI owner. |
| `autobyteus-web/stores/memorySyncStore.ts` | Pass | Pass | Low | Pass | Existing store is correct status/action owner. |
| `autobyteus-web/graphql/*memorySync*` | Pass | Pass | Low | Pass | Query/mutation docs remain API documents. |
| `autobyteus-server-ts/src/memory-sync/source/memory-sync-connection-test-service.ts` | Pass | Pass | Low | Pass | Source subsystem is correct policy owner. |
| `autobyteus-server-ts/src/api/graphql/types/*` | Pass | Pass | Low | Pass | Transport/API schema/resolver only. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Job status storage | Pass | Pass | N/A | Pass | Existing `LocalFileMemorySyncStateStore` is reused. |
| Sync execution | Pass | Pass | N/A | Pass | Existing `MemorySyncService` remains owner. |
| Background scheduling | Pass | Pass | N/A | Pass | Existing `MemorySyncWorker` remains owner. |
| Hub HTTP health call | Pass | Pass | N/A | Pass | Existing `MemoryHubClient` remains pure adapter. |
| Saved/draft connection-test identity | Pass | Pass | Pass | Pass | New service is justified because resolver/client are wrong owners. |
| Editable form preservation | Pass | Pass | N/A | Pass | Component-local state is correct. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Old `Job state` wording | No | Pass | Pass | Clean-cut user-facing removal. |
| Deep watcher with polling | No | Pass | Pass | Clean-cut watcher removal as steady-state hydration. |
| Plaintext-token-only test behavior | No | Pass | Pass | Clean-cut replacement by saved/draft mode. |
| Full dashboard/activity log | No | Pass | Pass | Explicitly rejected as out of scope. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Backend connection-test service migration | Pass | Pass | Pass | Pass |
| GraphQL mode input migration | Pass | Pass | Pass | Pass |
| Frontend polling + form state migration | Pass | Pass | Pass | Pass |
| Current job / last sync label migration | Pass | Pass | Pass | Pass |
| Localization/tests | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Minimal status copy | Yes | Pass | Pass | Pass | Current-vs-last examples are clear. |
| Running copy | Yes | Pass | Pass | Pass | Avoids manual/background labels. |
| Failure after prior success | Yes | Pass | Pass | Pass | DR-002 resolved. |
| Saved settings test | Yes | Pass | Pass | Pass | DR-003 resolved. |
| Draft token test | Yes | Pass | Pass | Pass | Draft identity is clear. |
| Polling while editing | Yes | Pass | Pass | Pass | DR-001 resolved. |
| No config duplication | Yes | Pass | Pass | Pass | Scope remains minimal. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Mixed draft URL/source id + saved token | Was a round 1 ambiguity. | None; revised design rejects mixed mode and requires save-first or draft token. | Resolved. |
| Polling while editing Source fields | Was a round 1 blocking issue. | None beyond implementing the specified no-hydration polling design and tests. | Resolved. |
| Failure after prior success | Was a round 1 blocking issue. | None beyond implementing specified precedence and tests. | Resolved. |
| Stale `running` after process crash | Existing backend limitation outside approved minimal scope. | Defer deeper recovery; implementation may display `syncing…` until later state changes. | Accepted residual risk. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

- N/A — no unresolved findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Low-frequency polling can miss very fast background runs; accepted because manual sync gives immediate local feedback and polling is intentionally low-traffic.
- Stale `running` after process crash remains an existing backend-state limitation; deeper stale recovery is out of scope.
- Existing GraphQL/API and frontend tests will need updates for explicit saved/draft mode and form-preserving polling.
- Investigation notes still list some earlier open questions, but the revised requirements/design spec now resolve the mixed saved-token case and define the authoritative behavior.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Revised design is implementation-ready. Route cumulative package to `implementation_engineer`.
