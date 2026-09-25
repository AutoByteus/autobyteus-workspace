# Code Review Report — AGY runtime implementation

## Review round, authority and scope

- **CRR-013 — Pass**, renewed independent implementation-source review of IR-008 at `40641dfca`, SR-023/DS-005, ARCH-REV-004 Pass. **Large / High**; independent source and API/E2E route remains mandatory. Prior source result CRR-009 Pass and API-REV-006/CRR-012 passes covered the pre-SR-023 basis only. Delivery DR-001 remains on explicit user-verification hold; no release or delivery acceptance.
- Approved behavior: `requirements-doc.md` SR-016/SR-021; SR-023 is a technical correction, not changed intended behavior. Context reviewed: `investigation-notes.md` §SR-023, `solution-revision-record.md`, `solution-org-launch-recovery-handoff.md`, `design-spec.md` DS-005, `investigation-result.md`, `design-review-report.md` ARCH-REV-004 and `architecture-review-revision-record.md`, current `implementation-handoff.md`/IR-008 record, previous code review record/report, API-REV-006 and delivery hold evidence.
- Changed scope: Org creation complete-placement preflight; shared model-selection diagnostic; AGY version/help/models child-process discovery; AGY availability, GraphQL and application callers; backend factory preflight; affected unit tests. Unchanged source areas (identity, MCP, trace, permissions, UI) retain prior basis but require affected downstream regression. No implementation edits by reviewer.

## Behavior and supported-scenario basis

| Basis | Independent trigger and forward production path | Status / evidence |
| --- | --- | --- |
| **SCN-002 / BEH-001 / REQ-001 / AC-001**, supported normal user launch | User selects a full 1-root/3-Team/14-Agent AGY Org in exposed workspace UI and presses Run → GraphQL `createAgentOrgRun` → `AgentOrgRunService.create` resolves all placements → one `validateMany` → request-local catalog evidence → bounded async CLI version/help/models → first addressed validation result → configured tree persisted or finite error returned to `role="alert"`. | **Confirmed at source boundary.** The real packaged-backend/browser reproduction eventually activated an 18-placement Org; prior serial synchronous discovery delayed launch. Source now validates all ordered placements and shares equivalent catalog evidence. Real packaged/browser post-fix validation remains downstream. |
| **Supported operational health event** during that launch | Existing Electron/backend health poll requests `/rest/health` while the user-initiated Org preflight awaits provider discovery. | **Confirmed premise MP-004.** Controlled pre-fix catalog/health overlap showed response starvation; async `spawn` now yields the Node event loop, and reviewer reran the fake slow-discovery/concurrent-health unit. The original screenshot alone is not treated as proof of permanent hang or exact health overlap. |
| **REQ-001/AC-001 unavailable model reason**, supported normal error path | Same Run surface with absent/failed AGY CLI or valid catalog missing selected slug → typed safe discovery diagnostic or ordinary model-unavailable result → addressed GraphQL `success:false` message → store `launching` resets in `finally` → panel alert. | **Confirmed at source boundary.** Typed stable messages contain no raw stderr/path/command. Valid catalog lacking slug remains a separate message; final rendered alert must be proved in API/E2E. |
| Existing AGY identity/MCP/workspace/trace and non-AGY contracts | Prior CRR-009/API-REV-006 paths; no changed intended behavior. | No contradiction in IR-008 diff; not re-accepted for changed source without downstream regression. |

The supported basis comes from approved requirements, the exposed Org Run action and actual 18-placement reproduction, plus the existing operational health poll—not from a synthetic test alone. No new behavior ID or renewed user approval is required. No unsupported concurrent user workflow is inferred.

### Candidate finding/mechanism gate

| Candidate | Independent scenario or contract | Path, consequence and evidence | Disposition |
| --- | --- | --- | --- |
| CF-007: retain serial per-placement discovery or synchronous AGY CLI probes | Supported user large-Org launch plus existing health polling; MP-004 | Prior `create` loop called `validate` per placement; AGY `spawnSync` blocked event loop. Real Org eventually activated slowly; controlled health overlap delayed response. DS-005 requires one request-local validation operation and nonblocking bounded process I/O. | **Promote as reviewed correction, not a current finding.** IR-008 implements the proportionate approved mechanism. |
| CF-008: source alone proves rendered large-Org launch/failure UX | Same supported scenario | Unit/build evidence stops before packaged/equivalent backend and browser alert. | **Hold for API/E2E evidence**, not a defect attribution or score deduction. No claim of current product failure or pass. |

ARCH-REV-004 MP-004 remains confirmed; no new or reclassified material premise. A process-global catalog cache, eager member activation, extra recovery loop or AGY-native subagents are neither required nor added.

## Structural and design checks

| Mandatory check | Result | Evidence / action |
| --- | --- | --- |
| Task-design health assessment | Pass | SR-023's bounded refactor addresses evidenced serial/synchronous preflight. |
| Approved supplemental alignment | Pass | DS-005 and SR-023 failure-reason contract matched; no UX/permission/trace change. |
| Data-flow spine clarity | Pass | UI → GraphQL → Org service → shared validator/capability → addressed result → persisted tree or alert remains explicit. |
| Ownership boundary clarity | Pass | Org owns ordered placements/address; model service owns selection and request-local evidence; AGY capability owns child I/O/diagnostics. |
| Off-spine concerns | Pass | Catalog and capability remain owned off-spine services, not parallel Org validators. |
| Existing subsystem reuse | Pass | Reuses `validateMany` and existing availability/GraphQL/application boundaries. |
| Reusable owned structures | Pass | One AGY capability owner and one typed diagnostic table; no repeated child runner. |
| Shared-data tightness | Pass | Optional diagnostic is limited to `model_unavailable`; no new persisted or all-provider kitchen-sink state. |
| Repeated coordination ownership | Pass | Request-local `(runtimeKind, workspaceRootPath)` evidence sharing stays in `RunModelSelectionService`. |
| Empty indirection | Pass | New code is substantive process I/O/validation logic, not a pass-through layer. |
| Separation of concerns | Pass | Org does not parse CLI output; capability does not persist Org or format browser state. |
| Dependency direction | Pass | Orchestration → model/capability; GraphQL/application await service results; no reverse UI/persistence dependency. |
| Authoritative Boundary Rule | Pass | Org calls model validator, not its catalog internals; AGY callers use capability API, not direct `spawnSync`. |
| File placement | Pass | All eight changed source files remain in their owning subsystem paths. |
| Flat/split layout | Pass | No oversized owner or unnecessary new layer. |
| Interface/API shape | Pass | One ordered `validateMany` call; async capability/availability signatures are propagated to source callers. |
| Naming/readability | Pass | `catalogDiagnostic`, `AgyDiscoveryError`, and addressed placement result convey distinct meanings. |
| Duplication | Pass | No per-placement repeated catalog on equivalent context and no duplicated AGY process runner. |
| Patch-on-patch control | Pass | Direct replacement of synchronous AGY probe; no fallback/compatibility mode or global cache. |
| Dead-code cleanup | Pass | AGY direct `spawnSync` calls and duplicate factory probe are removed; other-runtime sync discovery is unchanged/outside this correction. |
| Requirement-aligned tests | Pass | 18 equivalent placements/one catalog, mixed contexts, first address, safe timeout/failure vs missing slug, child bounds and concurrent health. |
| Test fixture/helper coherence | Pass | Fake CLI and integrated Org harness are bounded, reusable and do not claim packaged-browser proof. |
| Stale/compatibility-only tests | Pass | No removed coverage or legacy shim; adjacent Team/application tests remain. |
| API/E2E readiness | Pass | Code builds; real 18-placement/browser/health/error and affected non-AGY checks are explicitly specified as next gate. |

Reviewer independently reran the two highest-signal suites, `antigravity-cli-capability.test.ts` and `agent-org-run-service-model-selection.test.ts`: **21/21 passed**. Implementation's broader focused seven-suite **79/79**, production TypeScript check and full build/bootstrap smoke are recorded as reported, not independently repeated here. `git diff --check` passes. No live packaged/browser validation was run by this reviewer.

## Source-size, compatibility and docs audit

| Changed source file | Effective non-empty lines | Added/deleted | Review |
| --- | ---: | ---: | --- |
| `agy-agent-run-backend-factory.ts` | 100 | 5/7 | Pass; async factory preflight, no duplicate probe. |
| `agent-org-run-service.ts` | 245 | 19/12 | Pass; ordered complete preflight remains in Org owner. |
| `runtime-availability.ts` GraphQL | 31 | 3/3 | Pass; awaits async availability. |
| `application-launch-host-capability-validator.ts` | 175 | 5/2 | Pass; AGY catalog error sanitized, non-AGY behavior retained. |
| `antigravity-model-catalog.ts` | 26 | 1/1 | Pass; awaits capability model list. |
| `run-model-selection-service.ts` | 121 | 7/2 | Pass; AGY-only optional typed diagnostic; ordinary missing slug preserved. |
| `antigravity-cli-capability.ts` | 99 | 95/20 | Pass; bounded async child, stable safe diagnostics. |
| `runtime-availability-service.ts` | 129 | 10/12 | Pass; AGY async provider, existing others unchanged. |

No changed implementation-source file exceeds 500 effective non-empty lines or 220 added/deleted lines. Tests are exempt from source thresholds. No new migration, historical reader, dual mode or persisted-field change; current records are **Directly Usable — No Migration**. No dead/obsolete item remains in changed scope. Docs impact **Yes**: explain finite safe AGY discovery failure and large-Org launch behavior during Delivery's existing docs sync, without declaring validation complete.

## Review scorecard

The prior CRR-009 source scorecard is renewed for the affected SR-023 boundaries. Each category is at clean-pass level; **overall 9.0/10 (90/100)**. Pending live verification is an acceptance gate, not an evidenced source defect.

| Priority | Category | Score | Basis / remaining improvement |
| --- | --- | ---: | --- |
| 1 | Data-flow Spine Inventory and Clarity | 9.0 | Complete Org and error-return path; confirm packaged/browser execution downstream. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.0 | Org, selection and CLI process owners are distinct; no bypass observed. |
| 3 | API / Interface / Query / Command Clarity | 9.0 | Ordered batch and typed diagnostic; live GraphQL alert still requires E2E proof. |
| 4 | Separation of Concerns and File Placement | 9.0 | Existing subsystem locations preserved. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.0 | Optional AGY diagnostic is narrow and transient. |
| 6 | Naming Quality and Local Readability | 9.0 | Stable diagnostic names and placement addresses; compact style is navigable. |
| 7 | API/E2E Readiness | 9.0 | Focused tests/build pass; packaged 18-placement/browser gate remains pending. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.0 | Async bounded probe and one-catalog validation match MP-004; live workload must confirm. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.0 | No global cache, migration, PTY or old-provider fallback introduced. |
| 10 | Cleanup Completeness | 9.0 | AGY sync path and duplicate preflight removed; no changed-scope dead code found. |

## Findings, classification and route

- **New actionable source findings:** None. Prior CR-001–CR-004 and CR-006 remain resolved; CR-005 remains withdrawn as a production attribution. TR-001 remains resolved in separate `api-e2e-test-review-report.md`. No source score deduction is based on unsupported technical possibilities.
- **Latest authoritative result:** **Pass** for IR-008 source, supported-scenario and material-premise gates Pass. No failure classification.
- **Recipient:** `/api_e2e_engineer` for renewed executable validation; after primary handoff, informational Pass to `/implementation_engineer` per team rules.
- **Required downstream boundary:** full real browser → packaged/equivalent backend 18-placement Org, active persisted tree, concurrent health, finite rendered addressed safe failure and valid-catalog missing-slug countercase; affected Team/Org and non-AGY regressions. Delivery stays on explicit user-verification hold; no finalize/release/cleanup.
