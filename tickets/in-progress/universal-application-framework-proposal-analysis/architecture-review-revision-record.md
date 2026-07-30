# Architecture Review Revision Record

The latest [design-review-report.md](design-review-report.md) is authoritative. This record is the chronological architecture-review navigation and rationale index only.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial approved solution package | SR-001 | N/A | `Fail — Design Impact` | AR-001–AR-004 |
| ARCH-REV-002 | Round 2 / SR-002 rework and refreshed-base review | SR-002 | `Fail — Design Impact` | `Fail — Design Impact` | AR-001–AR-006 |
| ARCH-REV-003 | Round 3 / SR-003 bounded correction | SR-003 | `Fail — Design Impact` | `Pass` | AR-001, AR-005, AR-006 |
| ARCH-REV-004 | Round 4 / SR-004 downstream design-impact re-entry | SR-004 | `Pass` | `Fail — Design Impact` | AR-007; CR-006–CR-008 |
| ARCH-REV-005 | Round 5 / SR-005 AR-007 correction | SR-005 | `Fail — Design Impact` | `Pass` | AR-007; CR-006–CR-008 |
| ARCH-REV-006 | Round 6 / SR-006 after CRR-012 | SR-006 | `Pass`, then downstream `Fail — Design Impact` | `Pass` | CR-009, CR-012 |
| ARCH-REV-007 | Round 7 / withdrawn SR-007 after CRR-016 superseded CRR-015 | SR-007 (withdrawn) | `Pass`, then downstream correction | `Withdrawn — No Decision` | CR-013, APIE2E-F005 |
| ARCH-REV-008 | Round 8 / SR-010 after CRR-020 and API-REV-007 | SR-010 | `ARCH-REV-006 Pass`; round 7 withdrawn; downstream `Fail — Design Impact` | `Pass` | CR-015, APIE2E-F007 |

## Revision Entries

### ARCH-REV-001 — Initial architecture-review baseline

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Review round and trigger: Round 1; initial architecture review requested after the approved solution package was produced.
- Triggering role, report path, and finding IDs: `solution_designer`; initial package with no prior design-review report; finding IDs `N/A` at trigger.
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: `N/A`
- Current authoritative decision: `Fail — Design Impact`
- What changed in the review result or what baseline was established: Established the first architecture-review result. The provider-normalization/current-package/two-composition/no-migration direction was sound, but named readiness, clean-cut frontend migration, composition-critical dependency conversion, and stable behavior traceability were not yet implementation-safe.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001, AR-002, AR-003, AR-004
- Material classification changes: `N/A` -> `Fail — Design Impact`
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: Required startup ownership, iframe-only consumer migration, graph-local construction/cleanup, and behavior-ID alignment required solution rework before implementation.

### ARCH-REV-002 — SR-002 architecture re-review

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Review round and trigger: Round 2; `SR-002` rework after AR-001–AR-004, native command refinements, and refresh to `origin/personal` / task `HEAD` `6caf809303294252c109420b238588f0c68aca6a`.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`; AR-001–AR-004.
- Relevant solution revision IDs: `SR-002`
- Prior authoritative decision: `Fail — Design Impact`
- Current authoritative decision: `Fail — Design Impact`
- What changed in the review result or what baseline was established: AR-002–AR-004 are verified resolved. AR-001 is no longer a generic lifecycle gap, but two refreshed-base consistency defects keep it open. New AR-005 identifies the missing maintained-project packaging adapter for the approved real development commands. New AR-006 identifies a contrary full-server fallback still retained by the approved critical-analysis supplement.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open / blocking | Partially Resolved — remains open | SR-002, ARCH-REV-001 | Named P0–P9/L1/S1–S3/R1–R3/B1–B3 lifecycle and stop design is concrete; design still conflicts on protected-path/Prisma order and six versus seven required tool groups. |
| AR-002 | Open / blocking | Resolved | SR-002, ARCH-REV-001 | Exact public types and source/test/doc/dist/vendor/importable-package migration inventory cover all hosted-only fields/copy. |
| AR-003 | Open / blocking | Resolved | SR-002, ARCH-REV-001 | Exact construction DAG, two narrow cycle seams, Modify/Retain inventory, forbidden fallback policy, and disposal order are actionable. |
| AR-004 | Open | Resolved | SR-002, ARCH-REV-001 | BEH-001–BEH-007 meanings are stable across core artifacts; security evidence uses `SEC-CONSTRAINT-001`. |

- New or remaining finding IDs: AR-001, AR-005, AR-006
- Material classification changes: AR-001 reduced from major structural incompleteness to moderate bounded consistency correction; AR-002–AR-004 resolved; AR-005 and AR-006 added as moderate Design Impact findings.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: After the three bounded corrections, implementation must still prove graph isolation, real maintained-project commands, dual-host static/origin behavior, worker recovery, and vault/Search/event-pipeline cleanup through downstream executable coverage.

### ARCH-REV-003 — SR-003 implementation-ready architecture pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Review round and trigger: Round 3; `SR-003` bounded correction after AR-001, AR-005, and AR-006.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`; AR-001, AR-005, AR-006.
- Relevant solution revision IDs: `SR-003`
- Prior authoritative decision: `Fail — Design Impact`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: Verified one exact protected-path-before-Prisma readiness order and seven-group tool contract, exact maintained-app devkit inputs with retained pack/validate probe evidence and clean-cut builder/mirror deletion, and removal of the approved supplement's contrary broad-server fallback. No new findings were identified; the complete solution package is implementation-ready.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open / blocking | Resolved | SR-003, ARCH-REV-002 | Lifecycle allocation, graph/example, dependency rules, file map, guidance, and SV-C24 now use `AppConfig/database location -> core migration -> protected DB/root-key/sidecar paths -> Prisma -> vault -> app-data migration -> remaining readiness`; P6 contains exactly seven named groups including Search. |
| AR-005 | Open / blocking | Resolved | SR-003, ARCH-REV-002 | Brief Studio and Socratic have an exact identical checked-in devkit mapping for their actual paths, entries, resources, migrations, seven exposures, and output. The cleaned disposable probe packed and validated both; custom builders and generated source mirrors are deleted rather than wrapped. |
| AR-006 | Open / blocking | Resolved | SR-003, ARCH-REV-002 | The approved critical analysis rejects current broad `buildApp()` use in the correction, replacement wording, roadmap, and decision table. Loopback does not authorize the broad server as a fallback or interim stage. |

- New or remaining finding IDs: None.
- Material classification changes: `Fail — Design Impact` -> `Pass`; AR-001, AR-005, and AR-006 resolved; AR-002–AR-004 remain resolved.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: Implementation and API/E2E must prove graph isolation, real `dev`/`dev:studio`/`start`, dual-host static/origin behavior, worker recovery, and event-pipeline/vault/Prisma cleanup. Optimized distribution, offline dependency closure, marketplace isolation, and public-internet operation remain out of scope.

### ARCH-REV-004 — SR-004 effective-configuration correction requires one bounded design repair

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Review round and trigger: Round 4; upstream re-entry after `CRR-010` retained `Fail — Design Impact` for `CR-006`/`CR-007`, carried bounded `CR-008`, and the user established package-owned standalone runtime/model defaults with optional Studio overrides.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`; `CR-006`, `CR-007`, `CR-008`, `APIE2E-BRIEF-003`, `APIE2E-F004`.
- Relevant solution revision IDs: `SR-004`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Fail — Design Impact`
- What changed in the review result or what baseline was established: Verified that DS-011–DS-013 correctly add package-owned standalone defaults, one effective launch-configuration owner, exact precedence/provenance, separate application run readiness, guarded business consumption, and graph-local team-prompt authority. A new product-reachable current-state trace found one incomplete DS-012 branch: Studio can save a shared-team override and later delete that shared team, leaving a valid package plus an unresolvable host override. The target union cannot represent this state without misclassifying the package, violating its complete-configuration invariant, or silently falling back.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-006 | Resolved | Remain Resolved | SR-002–SR-004, ARCH-REV-002, ARCH-REV-003 | SR-004 does not reopen lifecycle ordering, seven-group tool readiness, frontend migration, composition construction/disposal, behavior traceability, maintained-app packaging, or broad-server rejection. |
| CR-006 | Open — Design Impact | Resolved in design except AR-007 branch | CRR-009, CRR-010, SR-004 | DS-011/DS-012 add complete package baselines, one resolution/validation authority, host overlays, provenance, and guarded launch. |
| CR-007 | Open — Design Impact | Partially Resolved | CRR-009, CRR-010, SR-004 | `RUNNABLE` is now non-null and complete, but invalid saved host overrides remain unrepresentable in the closed readiness result. |
| CR-008 | Open — bounded implementation defect | Resolved in design; implementation pending | CRR-009, CRR-010, SR-004 | DS-013 propagates the exact `MemberTeamContextBuilder` through root/subteam manager, persistent/task registries, new/restored handles, and final-prompt semantic proof. |

- New or remaining finding IDs: `AR-007`
- Material classification changes: `Pass` -> `Fail — Design Impact`; prior macro architecture remains sound, and the blocker is confined to invalid persisted host-override resolution within DS-012.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: After AR-007, implementation/API/E2E must prove pure package validation without ambient `AppConfig`, nested precedence/atomic `llmConfig`, runtime-specific credential readiness, fresh standalone package-default execution, Studio override/reset and invalidation, and graph-local final-prompt semantics. Delivery still owns tracked-base integration.

### ARCH-REV-005 — SR-005 resolves invalid host override semantics and passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Review round and trigger: Round 5; `SR-005` rework after AR-007, plus the user-confirmed `codex_app_server` / `gpt-5.6-luna` maintained defaults.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`; `AR-007`, with `CR-006`–`CR-008` retained as the downstream re-entry basis.
- Relevant solution revision IDs: `SR-005`
- Prior authoritative decision: `Fail — Design Impact`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: Verified that aggregate readiness now owns only terminal classification/issues, while per-slot views uniquely project the package baseline, raw saved override/state, effective configuration, reset eligibility, and diagnostics. Package validity is evaluated before host state. Missing selected resources and stale member topology preserve the valid package and row, produce `HOST_REQUIREMENT_MISSING/HOST_OVERRIDE`, null only the affected effective configuration, block `requireRunnable`, and require explicit replacement or Reset/delete. The exact Luna defaults are consistent across the authoritative package and are supported repository model identifiers; host absence remains an explicit capability failure rather than a substitution trigger.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-006 | Resolved | Remain Resolved | SR-002–SR-005, ARCH-REV-002, ARCH-REV-003 | SR-005 does not reopen lifecycle, tool readiness, frontend migration, composition construction/disposal, traceability, maintained packaging, or broad-server rejection. |
| AR-007 | Open — Design Impact | Resolved | SR-005, ARCH-REV-004, SV-010 | DS-012 defines exact package-first evaluation, `HOST_OVERRIDE` issue scope, per-slot invalid state, preserved raw row/baseline, null effective result, blocked guard, explicit replace/reset, and durable shared-resource deletion plus stale-topology cases. |
| CR-006 | Resolved in design except AR-007 branch | Resolved in design | SR-004, SR-005, CRR-009, CRR-010 | One package-baseline/effective configuration owner now covers fresh standalone, valid overrides, invalid overrides, capability checks, and business launch. |
| CR-007 | Partially Resolved | Resolved in design | SR-004, SR-005, CRR-009, CRR-010 | `RUNNABLE` is complete/non-null; package, host-override, and host-capability failures are truthfully separated without configuration duplication. |
| CR-008 | Resolved in design; implementation pending | Remains Resolved in design | SR-004, SR-005, CRR-009, CRR-010 | Exact graph-local builder propagation and final-prompt semantic proof remain unchanged and actionable. |

- New or remaining finding IDs: None.
- Material classification changes: `Fail — Design Impact` -> `Pass`; AR-007 is resolved and all prior architecture findings remain resolved.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: Implementation/source review/API/E2E must prove pure package validation, Luna package/capability behavior, nested precedence and invalid topology handling, explicit Studio replacement/reset without package mutation, graph-local final-prompt semantics, both-host real execution, and preserved lifecycle cleanup. Delivery still owns tracked-base integration.

### ARCH-REV-006 — SR-006 restores authoritative sparse editing and portable package policy

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Review round and trigger: Round 6; upstream re-entry after implementation-source review `CRR-012` returned `Fail — Design Impact` for `CR-012` and retained the bounded portable-policy defect `CR-009`.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`; `CR-009`, `CR-012`.
- Relevant solution revision IDs: `SR-006`
- Prior authoritative decision: architecture `Pass` at `ARCH-REV-005`, followed by downstream `CRR-012` `Fail — Design Impact`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: Verified that SR-006 keeps manifest package baseline, current selected-resource definition baseline, sparse saved override, and post-overlay effective configuration semantically distinct; exposes the stored selected baseline and a closed no-write exact-identity preview for unsaved selections; makes one renamed graph-local builder authoritative for GET/preview/PUT/package validation; removes Studio package/effective inheritance and definition traversal; defines mixed-runtime sparse editing and PUT concurrency authority; and centralizes recursive portable launch-field validation with exact token-count/pricing positives and secret/authorization/token-value/endpoint/workspace negatives. Existing rows remain directly usable and no derived baseline, preview, migration, compatibility path, fallback, or fourth readiness status is introduced.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-007 | Resolved | Remain Resolved | SR-002–SR-006, ARCH-REV-002–ARCH-REV-005 | SR-006 does not reopen lifecycle/tool ordering, frontend migration, composition ownership/disposal, maintained packaging, broad-server rejection, package/default readiness, invalid-row preservation, or graph-local prompt authority. |
| CR-009 | Open bounded policy defect | Resolved in design; implementation pending | CRR-012, SR-006, SV-011 | DS-011 assigns all package launch fields to one recursive schema-aware policy, preserves closed token-count/pricing schemas, rejects nested host/secret semantics with exact path-only diagnostics, and forbids app-specific/compatibility exceptions. |
| CR-010, CR-011 | Resolved in source | Remain resolved and preserved | IR-007, CRR-012, SR-006 | Sparse runtime inheritance and stale-topology diagnosis/explicit replacement remain intact; downstream durable API/E2E reconciliation is still required. |
| CR-012 | Open — Design Impact | Resolved in design; implementation pending | CRR-012, SR-006, SV-011 | DS-012 exposes `selectedResourceBaseline`, adds exact app/slot/ref no-write preview, shares one resource-baseline builder across GET/preview/PUT, removes UI inference, defines refresh/stale-response/mixed-runtime behavior, and makes PUT the final resource/topology authority. |

- New or remaining finding IDs: None.
- Material classification changes: downstream `Fail — Design Impact` -> architecture `Pass`; CR-012 and CR-009 are resolved in design without adding product scope.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: Implementation/source review must prove the new contract, builder rename, policy, preview, UI sparse editing, and removal inventory. API/E2E must replace the obsolete no-context auto-repair test and prove unsaved/saved alternate editing, recursive portable cases, invalid selection/topology, real Luna prompt/provider/events/artifacts, recovery, and cleanup. Delivery still owns tracked-base integration.


### ARCH-REV-007 — WITHDRAWN: superseded SR-007 review

> This entry corrects and retracts the architecture pass originally issued on 2026-07-29. `CRR-016` supersedes the CRR-015 tool-exposure premise. No architecture decision exists for the withdrawn SR-007 content, and the implementation handoff based on it is retracted.

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Review round and trigger: Round 7 withdrawal after `CRR-016` established that Codex/Claude native file tools stay native, the existing Studio Agent Tools route/subsystem is working, and standalone omits only the existing registrar. The CRR-015 Design Impact premise was superseded.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`; `CR-013`, `APIE2E-F005`, `APIE2E-STANDALONE-MCP-001`.
- Relevant solution revision IDs: `SR-007` (withdrawn); `SR-006` remains the latest valid architecture-reviewed solution
- Prior authoritative decision: `ARCH-REV-006` / SR-006 `Pass`; an erroneous SR-007 pass was briefly issued from the superseded CRR-015 premise
- Current authoritative decision: `Withdrawn — No Decision`; `ARCH-REV-006` remains latest valid
- What changed in the review result or what baseline was established: The prior round-7 result is retracted, not revised into another architecture decision. CRR-016 proves `write_file` is a Codex/Claude native tool, not a server Agent Tools MCP adapter; eligible `publish_artifacts` and `send_message_to` use the already-existing Studio route/subsystem. The valid failure is the bounded standalone registrar omission. The broad runtime-authority redesign, gateway `write_file` acceptance, DS-014/SV-012 review conclusions, and related architecture handoff are withdrawn.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-007 | Resolved | Remain resolved through latest valid architecture round | SR-002–SR-006, ARCH-REV-002–ARCH-REV-006 | The withdrawn SR-007 result does not alter the prior valid resolutions. |
| CR-009–CR-012 | Resolved in design/source | Remain resolved and preserved | SR-006, IR-008/IR-009, CRR-014, API-REV-005 | The real standalone proof reaches correct package defaults, readiness, binding, team prompt, and session issuance before the transport failure. |
| CR-013 / APIE2E-F005 | CRR-015 Design Impact premise | Superseded; architecture review withdrawn; `CRR-016` classifies Local Fix | CRR-016 | Native file tools remain native; Studio already registers the established route and standalone omits only its registration. |
| APIE2E-REPO-005 | Unclear / unattributed | Remains separate; no design consequence | API-REV-005, CRR-016 | No production origin is established and SR-007 does not use it as a premise. |

- New or remaining finding IDs: N/A — review withdrawn.
- Material classification changes: the originally issued architecture `Pass` is retracted. CRR-016 supersedes CRR-015 and independently routes the valid failure as `Local Fix`. No architecture classification is issued for SR-007.
- Recommended recipient: None from architecture review; the solution owner controls the CRR-016 bounded reroute.
- Remaining risks or uncertainty: Do not implement the withdrawn runtime redesign or expose native file tools through Agent Tools MCP. Preserve native/server/configured-MCP/external-gateway distinctions; perform only the bounded route registration and corrected API/E2E expectations authorized by CRR-016. `APIE2E-REPO-005` remains separately `Unclear`.

### ARCH-REV-008 — SR-010 graph-local Agent Tools publication authority passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Review round and trigger: Round 8; `SR-010` Design Impact re-entry after real API/E2E `API-REV-007` and focused failure-origin review `CRR-020` / `CR-015` proved that the default publish adapter uses the process-global manager rather than the active application graph.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`; `CR-015`, `APIE2E-STANDALONE-MCP-003`, `APIE2E-F007`.
- Relevant solution revision IDs: `SR-010`; `SR-008`/`SR-009` retained as implemented current-state context; `SR-007` remains withdrawn.
- Prior authoritative decision: `ARCH-REV-006` / `SR-006` `Pass`; `ARCH-REV-007` was withdrawn with no decision; the downstream current result was `CRR-020 Fail — Design Impact`.
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: Verified one composition-owned Agent Tools process authority for the exact registry/catalog/provider/executor/dispatcher family; an explicit general-process session authority; one graph-scoped application session authority; one non-wire authenticated-session publication port; and one graph-owned bind-once deferred port that resolves the real factory/publication cycle. Route/session creation share one family, publication cannot discover a global graph, P6A fails before readiness when unbound, stop revokes scope-owned sessions before closing the port/process owners, and restart creates a fresh scope. The correction preserves actual route/auth/tool-list/message behavior and does not expand provider-native tools, configured MCP, or the external gateway.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-007 | Resolved through `ARCH-REV-006` | Remain resolved | SR-002–SR-006, SR-010 | SR-010 preserves all reviewed lifecycle, package, host, launch/readiness/editing, portable-policy, and prompt-authority decisions. |
| CR-009–CR-014 | Resolved in prior design/source rounds | Remain resolved and preserved | SR-006, SR-008, SR-009; IR-010/IR-011; CRR-019 | API-REV-007 reaches the correct package defaults, route, authenticated actual tool list, graph-local members, and recipient-name handoff before the independent publication-authority failure. |
| CR-015 / APIE2E-F007 | Open — Design Impact | Resolved in design; implementation and executable proof pending | CRR-020, SR-010, SV-015, ARCH-REV-008 | DS-014 gives route registration/session issuance one exact process family, puts the exact graph publication port on the authenticated session, and defines bind/readiness/revoke/close ordering for the construction cycle. |
| APIE2E-REPO-005 | Unclear / unattributed | Remains separate; no architecture consequence | API-REV-007, CRR-020 | No supported failure origin connects it to CR-015; SR-010 does not rely on it. |

- New or remaining finding IDs: None.
- Material classification changes: downstream `Fail — Design Impact` -> architecture `Pass`; CR-015 is resolved in design. The round-7 withdrawal remains historical and is not converted into a pass.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: Source review must verify exact process-family identity, explicit general-process construction, removal of application/default global lookups, and bounded scope revoke/port close. API/E2E must prove deliberately distinct global-versus-graph publication, negative port states, scope restart, unchanged route/security/tool boundaries, and real standalone plus Studio publication/message/handoff/journal/projection. `APIE2E-REPO-005` remains separately `Unclear`.
