# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/token-usage-data-model-analysis.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/data-migration-conventions.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/solution-revision-record.md`
- Triggering Downstream/Rework Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md` and `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/architecture-review-revision-record.md` (`ARCH-REV-011`, `AR-006`, `MP-CR-008`); `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md` (`CRR-018`, `CR-009`, `MP-CR-008`); `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-revision-record.md`; the cumulative implementation/API-E2E/delivery artifacts listed in the SR-012 handoff
- Relevant Solution Revision IDs: `SR-001` through `SR-012`; `SR-012` is current; `SR-008`/`SR-009` remain withdrawn history
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-012`
- Current Review Round: `12`
- Trigger: `SR-012` re-review after `ARCH-REV-011` found that SR-011 disabled the false startup-only manual command but did not expose the approved restart recovery (`AR-006`).
- Prior Review Round Reviewed: Round 11 / `ARCH-REV-011`
- Latest Authoritative Round: `12`
- Current-State Evidence Basis: User-approved/rescoped `REQ-001`–`REQ-027` and `AC-001`–`AC-026`; both supplements; the live-verified SR-007 token result; the retained migration definition and runner/status/GraphQL/Settings path; `CRR-018`; `ARCH-REV-011`; and SR-012's complete closed recovery-action classifier, transport, localization, file inventory, and coverage plan. Existing implementation edits are not used as proof of design sufficiency.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Public migration recovery must truthfully distinguish executable manual retry, executable next-startup retry, and no recovery action. The retained consolidation is required and `STARTUP_ONLY`; in supported failed/pending/stale states it must expose restart guidance, disable manual Retry, and retry through ordinary `runPending()`. The one-row token model and SR-010 audit withdrawal remain unchanged.
- Relevant existing behavior and evidence confirmed: Yes. CRR-018 proved the status-only false-command path. ARCH-REV-011 established that `canRetry=false` alone cannot distinguish restart recovery from terminal/no action. The current runner already owns definition policy, required startup scheduling, persisted status, and active/stale-running evaluation; the existing GraphQL/query/store/Settings path can carry one derived nonpersisted enum.
- Approved change, preserved behavior, and outside scope understood: Yes. Add only a generic closed public recovery action, derive the legacy `canRetry` boolean from it, carry the enum through GraphQL/client state, and localize Settings guidance. Do not change stored migration records, token schema/fold/consolidation, summary representation, historical logs, or audit compaction.
- Remaining material ambiguity, if any: None. The classification matrix covers manually executable states, required startup-only retryable states, unscheduled startup-only definitions, active runs, and terminal states.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | Preserve current one-run persistence and restore gating. |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | Preserve current record-based reads. |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | Preserve created-range/lifetime semantics. |
| BEH-004 | Operational | Pass | Pass | Pass | Confirmed | Preserve bounded same-ID repairs and complete audit removal. |
| BEH-005 | Operational | Pass | Pass | Pass | Confirmed | DS-012 publishes restart recovery only when ordinary startup can execute it; DS-006/DS-009 remain unchanged. |
| BEH-006 | Operational | Pass | Pass | Pass | Confirmed | Runner recovery action -> GraphQL -> localized Settings guidance completes the supported degraded recovery path. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `token-usage-data-model-analysis.md` | Pass | Pass | Pass | Pass | Pass | None. It explains the current runner/UI gap, the closed action, and the audit residual without becoming intended-behavior authority. |
| `data-migration-conventions.md` | Pass | Pass | Pass | Pass | Pass | None. It remains approved normative governance and correctly treats the enum as current capability truthfulness rather than recovery machinery. |

The investigation supplement inventory links both artifacts and clearly records scope, authority, and approval applicability.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The verified token refactor, audit-scope withdrawal, and narrow recovery-presentation correction are separated explicitly. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | CRR-018 and ARCH-REV-011 establish both the false command and unexplained-disabled-control defects through the supported production path. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Add one derived current enum/API/UI contract now; keep audit framework redesign deferred. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Classifier matrix, DS-012, boundaries, files, exact copy, sequence, and focused coverage are concrete and proportionate. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Current runtime write/live path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Bounded current fold | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Current run/member/team reads | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Settings statistics | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Bounded released repairs | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Migration-only consolidation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Degraded/fatal lifecycle | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | New-run versus restore admission | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-009 | Nullable legacy scalar transport | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-012 | Migration recovery presentation and later startup retry | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

DS-012 spans the complete approved path: definition/status/staleness -> runner classification -> GraphQL/client transport -> localized manual/restart/none presentation -> ordinary startup retry where applicable.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Current token runtime/readiness/consolidation | Pass | Pass | Pass | Pass | Prior one-row and migration-only boundaries remain unchanged. |
| `AppDataMigrationRunner` recovery classification | Pass | Pass | Pass | Pass | It alone owns definition/status/staleness classification and derives `canRetry`. |
| GraphQL/client transport | Pass | Pass | Pass | Pass | Maps/carries the enum without policy inference or localized text. |
| Settings presentation | Pass | Pass | Pass | Pass | Localizes only the closed action; no migration-ID/status/requiredOnStartup inference. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Current token runtime and migration-only transition | Pass | Pass | Pass | Pass | Forward-only current and isolated legacy directions remain correct. |
| Runner recovery policy | Pass | Pass | Pass | Pass | Definition/record -> one classifier -> action/derived boolean. |
| GraphQL/web recovery path | Pass | Pass | Pass | Pass | Thin transport and localization depend on runner output; UI policy reconstruction is explicitly rejected. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Current token write/read/readiness interfaces | Pass | Pass | Pass | Low | Pass |
| `classifyRecoveryAction(definition,record)` | Pass | Pass | Pass | Low | Pass |
| `AppDataMigrationStatusSnapshot.recoveryAction` | Pass | Pass | Pass | Low | Pass |
| Derived `canRetry` | Pass | Pass | Pass | Low | Pass |
| `runPending()` / `runMigration()` | Pass | Pass | Pass | Low | Pass |
| GraphQL recovery enum and web record | Pass | Pass | Pass | Low | Pass |

The three-state enum is tight: `MANUAL_RETRY`, `RESTART_TO_RETRY`, and `NONE` correspond to the supported executable entrypoints and lack of one.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Recovery classification | Pass | Pass | N/A | Pass | Strengthen the existing runner/status boundary; no new scheduler or orchestrator. |
| Recovery transport/presentation | Pass | Pass | N/A | Pass | Extend the current GraphQL/query/store/component/localization path. |
| Audit-summary/log concern | Pass | Pass | N/A | Pass | Remains removed and accepted as residual. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Token current runtime/persistence/readiness | Pass | Pass | Pass | Pass | Unchanged. |
| App-data migration domain/runner | Pass | Pass | Pass | Pass | Owns action semantics and execution entrypoints. |
| GraphQL/client state | Pass | Pass | Pass | Pass | Thin nonpersisted transport. |
| Web Settings/localization | Pass | Pass | Pass | Pass | Owns presentation only. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Existing token record/checkpoint/transport structures | Pass | Pass | Pass | Pass | Unchanged. |
| `AppDataMigrationRecoveryAction` | Pass | Pass | Pass | Pass | Domain-owned closed semantic shared through runner/API/web. |
| Derived legacy `canRetry` boolean | Pass | N/A | Pass | Pass | Preserved for the existing command surface, but never independently classified. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenUsageRunRecord` and compact state | Pass | Pass | Pass | Pass | Pass | Unchanged. |
| `AppDataMigrationRecoveryAction` | Pass | Pass | Pass | Pass | Pass | Nonpersisted current status semantic, not scheduler state or free-form text. |
| `recoveryAction` + `canRetry` | Pass | Pass | Pass | Pass | Pass | Boolean is exactly derived from `MANUAL_RETRY`; enum remains sole authority. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Current token and consolidation files | Pass | Pass | Pass | Pass | Preserve SR-007/DS-009. |
| `app-data-migration-types.ts` / runner | Pass | Pass | Pass | Pass | Closed action, classifier, derived boolean, scheduler, and direct guard are cohesive lifecycle concerns. |
| GraphQL app-data migration type | Pass | Pass | Pass | Pass | Registers/maps only the enum and existing boolean. |
| Web query/generated type/store | Pass | Pass | Pass | Pass | Carries the enum unchanged. |
| Settings component/locales/test | Pass | Pass | Pass | Pass | Exact localized guidance and action/no-dispatch behavior are named. |
| Withdrawn audit files/tests/docs | Pass | Pass | N/A | Pass | Complete removal remains explicit. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Current token and migration-only paths | Pass | Pass | Low | Pass | Unchanged. |
| App-data domain/runner/GraphQL | Pass | Pass | Low | Pass | Correct current lifecycle owner/transport. |
| Web query/store/component/locales/test | Pass | Pass | Low | Pass | Existing presentation path is extended without server policy duplication. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Audit summary projection/compactor/log machinery | Pass | N/A | Pass | Pass | Remains fully removed. |
| Audit fixtures/tests/UI assertions | Pass | N/A | Pass | Pass | Focused current recovery coverage replaces none of the withdrawn audit behavior. |
| Status-only retry classification | Pass | Pass | Pass | Pass | Replaced by the runner's closed recovery action and derived boolean. |
| False command/unexplained disabled control | Pass | Pass | Pass | Pass | Manual action, restart guidance, and none states are explicit. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Normal token runtime | No | Pass | Pass | Current-only. |
| Registered migrations | No | Pass | Pass | Historical knowledge remains migration-only. |
| DS-012 | No | Pass | Pass | Current public lifecycle truthfulness, not legacy compatibility. |
| Withdrawn audit expansion | No | Pass | Pass | Removed rather than retained dormant. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Same-ID repairs and token consolidation | Migration Required | Pass | Pass | Pass | Pass | SR-012 changes no stored data or transformation. |
| Current one-row token records | Directly usable current target | Pass | Pass | N/A | Pass | Live-verified. |
| Migration summaries/log paths/historical logs | Not Affected | Pass | Pass | N/A | Pass | Audit removal and no-mutation boundary remain intact. |
| Recovery action | Nonpersisted derived status | Pass | Pass | N/A | Pass | No new record field, journal, or recovery state machine. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Preserve audit removal | Pass | Pass | Pass | Pass |
| Add classifier/domain/API/client shape | Pass | Pass | Pass | Pass |
| Add localized Settings presentation/tests | Pass | Pass | Pass | Pass |
| Preserve direct rejection and automatic startup retry | Pass | Pass | Pass | Pass |
| Renew source/API-E2E/delivery validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-009 adapter transport | Yes | Pass | Pass | Pass | Existing examples remain sufficient. |
| Recovery classification matrix | Yes | Pass | Pass | Pass | Covers anytime/manual, required startup-only/restart, unscheduled, active, warning, and success states. |
| Failed startup-only Settings journey | Yes | Pass | Pass | Pass | Exact English/zh-CN guidance, disabled/no-dispatch action, and later startup execution are specified. |
| Audit scope guard | Yes | Pass | Pass | Pass | Clear and proportionate. |

## Material Premise Validation (Only When Needed)

### MP-CR-008 — Failed startup-only consolidation reaches the supported Settings recovery surface

- Related approved requirement or established contract: REQ-019, REQ-023, REQ-025; AC-017, AC-019; BEH-005, BEH-006.
- Relevant behavior ID(s): BEH-005, BEH-006.
- Initiating basis kind: System and User.
- Independent product-supported initiating trigger or applicable governing contract: Ordinary startup consolidation returns `FAILED` while current schema remains valid; the user opens Settings > Server Migrations.
- Support evidence: The definition is required and `STARTUP_ONLY`; capability-scoped failure leaves Settings healthy; the current status query supplies the row. CRR-018 reproduced the current false-command path, and ARCH-REV-011 established the missing positive restart semantic.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Electron startup -> ServerRuntime -> `runPending()` -> consolidation `FAILED` -> healthy degraded app -> Settings query -> runner `RESTART_TO_RETRY` / derived `canRetry=false` -> GraphQL/client -> localized restart guidance and disabled/no-dispatch Retry -> user restarts -> `runPending()` retries.
- Lifecycle preconditions and material consequence at the claimed point: A later ordinary startup is the only supported executor. The target tells the user that truth without exposing a rejected command or inferring policy in the UI.
- Reachability: `Reachable`.
- Review consequence / proportionate response: SR-012's one closed nonpersisted action, direct mapping, localized guidance, and focused coverage are the minimum coherent response. No persisted state or audit machinery is justified.

### MP-003 — Restored-run replay during incomplete consolidation

- Reachability: `Not Reachable` under the approved restore gate; historically reachable before SR-005.
- Review consequence / proportionate response: Preserve the gate and disjoint retry; add no overlap compatibility machinery.

### MP-004 — Nullable Prisma/SQLite scalar representation

- Reachability: `Reachable` and directly observed.
- Review consequence / proportionate response: Preserve DS-009 and its real-adapter coverage.

### MP-005 / MP-CR-007 — Withdrawn audit compaction and historical-log consequence

- Reachability: The oversized status response remains reachable but explicitly accepted; product consumption of historical log contents remains Not Reachable.
- Review consequence / proportionate response: They cannot drive current machinery. Preserve full audit removal and stored-data non-mutation.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

SR-012 resolves AR-006 and is ready for the narrow implementation correction. The recovery enum is one semantic authority; the runner's entrypoints and staleness rules support every advertised action; GraphQL/web remain thin; Settings supplies exact localized restart guidance; and no withdrawn audit or persisted-data scope returns.

## Findings

None.

## Classification

N/A — no unresolved requirement, design, or evidence gap remains.

## Recommended Recipient

`/implementation_engineer`

Implement SR-012's closed recovery action and presentation contract, preserve the complete SR-010 audit removal and verified token behavior, then route the cumulative package through source review and applicable API/E2E validation before delivery finalization.

## Residual Risks

- The accepted approximately 31 MiB migration-status response and historical audit/log data remain unchanged and out of scope.
- `recoveryAction` must remain the sole semantic authority; `canRetry` must be derived exactly from `MANUAL_RETRY`.
- The classifier must use the same active/stale-running rule as execution and treat absent/default execution policy as manually executable unless `STARTUP_ONLY` is explicit.
- Settings must not infer recovery from migration ID, status, `requiredOnStartup`, or execution policy.
- Existing token migration, DS-009, long-transaction, restore/history gate, allocator/disjointness, bounded-series, SQLite physical-size, and BigInt/API risks remain unchanged.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `SR-012` resolves `AR-006` on reachable `MP-CR-008` with one proportionate nonpersisted recovery action and localized current UI guidance. `CR-009` is fully addressed at design level. AR-001–AR-004 remain resolved; AR-005/MP-005 remain historical/moot; CR-008 remains resolved and all audit machinery stays withdrawn.
