# Code Review Revision Record — Runtime-specific stopped-run model switching

The latest `code-review-report.md` is authoritative for implementation source (CRR-008); `api-e2e-test-review-report.md` is authoritative for the current proportional durable-test result (CRR-009).

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation review / IR-001 | N/A | Fail — Local Fix | F-001 |
| CRR-002 | `code-review-report.md` | Implementation re-review / IR-002 | Fail — Local Fix | Pass | F-001 resolved |
| CRR-003 | `api-e2e-test-review-report.md` | Successful API/E2E durable-test review / API-REV-001 | N/A (test review) | Pass | None |
| CRR-004 | `code-review-report.md` | IR-003 source review / SR-009 | Historical source/test Pass on old basis | Pass | None |
| CRR-005 | `code-review-report.md` | API-REV-002 failure-origin review / F-API-002 | CRR-004 Pass (superseded) | Fail — Local Fix | F-002 |
| CRR-006 | `code-review-report.md` | IR-004 source re-review / F-002 | CRR-005 Fail — Local Fix | Pass | F-002 resolved |
| CRR-007 | `code-review-report.md` | API-REV-003 failure-origin review / F-API-003 | CRR-006 Pass (superseded) | Fail — Local Fix | F-003 |
| CRR-008 | `code-review-report.md` | IR-005 source re-review / F-003 | CRR-007 Fail — Local Fix | Pass | F-003 resolved at source boundary |
| CRR-009 | `api-e2e-test-review-report.md` | Successful API-REV-004 durable-test review | CRR-003 test Pass on old basis | Pass | None |

## Revision Entries

### CRR-001 — Initial independent source-review baseline

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/code-review-report.md`.
- Review entry point and round: Implementation Review, round 1.
- Triggering role, report path, and finding/scenario IDs: Implementation Engineer, `implementation-handoff.md`; SCN-001/005; F-001 established here.
- Relevant solution revision IDs: SR-002, SR-003.
- Relevant architecture-review revision IDs: ARCH-REV-001.
- Relevant implementation revision IDs: IR-001.
- Relevant API/E2E revision IDs: N/A.
- Relevant delivery revision IDs: N/A.
- Prior authoritative result: N/A.
- Current authoritative result: **Fail — Local Fix**; Medium/High route retained.
- What changed in the review result and why: Baseline source review confirms the server runtime policy/contract and clean removal, but identifies one supported stopped-Settings UI path that does not fulfill distinct offered-ID selection.
- Supported product scenario / material-premise basis changes: None upstream; F-001 uses normal SCN-001 catalog alias identities; a prospective in-editor retry requirement was rejected as disproportionate. No speculative provider-history or concurrency premise promoted.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: F-001.
- Material score or classification changes: Initial score 9.1/10 (91/100), with categories 1, 7, 8 below 9.0; Local Fix to implementation owner.
- Recommended recipient: `/implementation_engineer`.
- Remaining risks or uncertainty: Real smaller-window provider continuation, browser/API-E2E, `nuxi typecheck` toolchain issue and unknown out-of-repo GraphQL consumers remain downstream or unproven; none drove the current findings.

### CRR-002 — Exact Claude identifier selection verified

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/code-review-report.md`.
- Review entry point and round: Implementation Review, round 2.
- Triggering role, report path, and finding/scenario IDs: Implementation Engineer IR-002, `implementation-handoff.md`; F-001; SCN-001-A.
- Relevant solution revision IDs: SR-002, SR-003.
- Relevant architecture-review revision IDs: ARCH-REV-001.
- Relevant implementation revision IDs: IR-002 (IR-001 baseline retained).
- Relevant API/E2E revision IDs: N/A.
- Relevant delivery revision IDs: N/A.
- Prior authoritative result: CRR-001 **Fail — Local Fix**.
- Current authoritative result: **Pass**; Medium/High classification retained.
- What changed in the review result and why: Stopped-run picker now filters/group-displays exact server-offered identifiers and removes launch-only alias matching for that surface. Source trace confirms both `default` and explicit sibling can reach the draft; focused tests click both directions with no initial rewrite. This reviewer independently ran the affected component suite, 14/14 passed. Launch-picker behavior, server policy and persistence boundaries are unchanged.
- Supported product scenario / material-premise basis changes: None. SCN-001-A remains supported; its implementation contradiction is resolved. Rejected retry/provider-history machinery remains rejected.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Open, Local Fix | Resolved | IR-002, CRR-001, CRR-002 | `RuntimeModelConfigFields.vue` exact-ID filtering/fallback and stripped `aliasIds`; real picker click tests `default ↔ opus[1m]`; independent component test 14/14 passed. |

- New or remaining finding IDs: None.
- Material score or classification changes: 9.1/10 (91/100) → 9.3/10 (93/100); all categories now ≥9.0; result Pass.
- Recommended recipient: primary `/api_e2e_engineer`, then informational `/implementation_engineer`.
- Remaining risks or uncertainty: Browser stopped-run visual check, real smaller-window provider continuation, full API/E2E, `nuxi typecheck` toolchain issue, and unknown external GraphQL consumers remain downstream/unproven; none blocks source-review pass.

### CRR-003 — Proportional API/E2E durable-test review

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/api-e2e-test-review-report.md` (separate from source report).
- Review entry point and round: Successful API/E2E test-code review, round 1.
- Triggering role, report path, and finding/scenario IDs: API/E2E Engineer API-REV-001, `api-e2e-execution-coverage-report.md`; SCN-002/004; no failing scenario or finding.
- Relevant solution revision IDs: SR-002, SR-003.
- Relevant architecture-review revision IDs: ARCH-REV-001.
- Relevant implementation revision IDs: IR-002.
- Relevant API/E2E revision IDs: API-REV-001.
- Relevant delivery revision IDs: N/A.
- Prior authoritative result: CRR-002 implementation-source Pass; prior proportional test-review result N/A.
- Current authoritative result: **Pass** for two changed durable test files; source report unchanged.
- What changed in the review result and why: The Team unit fixture correctly retargets preserved capacity assertions to AutoByteus and retains Codex persistence cases; built GraphQL E2E checks the approved ID-only public option shape. Changed assertions align with passed focused server (42/42) and GraphQL (3/3) logs. No test quality finding.
- Supported product scenario / material-premise basis changes: None; test fixtures and introspection confirm approved SCN-002/004 and GraphQL contract, not new product scenarios.

#### Prior Finding Resolution

None — no prior test-review finding; source F-001 remains resolved in CRR-002.

- New or remaining finding IDs: None.
- Material score or classification changes: No source scorecard repeated; proportional test review Pass. API-REV-001 remains 94.3% with bounded residuals.
- Recommended recipient: `/delivery_engineer`.
- Remaining risks or uncertainty: As API-REV-001: no CI-durable credentialed full-stack/provider suite, unverified numeric ordering of external capacities, no successful Claude/Antigravity continuation; no universal provider-success claim.

### CRR-004 — SR-009/IR-003 backend offered/current source review

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/code-review-report.md`.
- Review entry point and round: Implementation Review, source round 3; CRR-003 was the separate historical API/E2E test review.
- Triggering role, report path, and finding/scenario IDs: Implementation Engineer IR-003, `implementation-handoff.md`; ARCH-REV-003 resolution of DR-001; SCN-007 and preserved MP-001/002. No new finding ID.
- Relevant solution revision IDs: SR-006 approved intent; SR-008 evidence; SR-009 current design.
- Relevant architecture-review revision IDs: ARCH-REV-002 historical Fail; ARCH-REV-003 current Pass.
- Relevant implementation revision IDs: IR-003.
- Relevant API/E2E revision IDs: N/A for IR-003; API-REV-001 is historical old-basis evidence only.
- Relevant delivery revision IDs: N/A for IR-003; prior delivery artifacts are historical.
- Prior authoritative result: CRR-002 source Pass and CRR-003 test-review Pass on SR-003/IR-002, neither a review of this changed source.
- Current authoritative result: **Pass** on SR-009/IR-003 implementation source; Medium/High classification retained.
- What changed in the review result and why: ClaudeModelCatalog owns proven-default offered-row normalization while retaining exact raw current; shared ModelCatalogService view, changed/unchanged stopped Save, self-contained GraphQL/Web options, definition→Run and Application current paths implement ARCH-REV-003 recovery. Backend catalog/selection focused rerun 24/24 and Web picker/Application component rerun 23/23 passed. No source finding.
- Supported product scenario / material-premise basis changes: Approved SR-006/REQ-008 supersedes the old raw-ID offer premise; SCN-007 and ARCH-REV-003 MP-001/002 are supported and implemented. No unsupported machinery promoted. Codex CWD variance remains a targeted validation risk without evidenced divergence.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Resolved in CRR-002 on old SR-003 basis | Historical/obsolete under SR-006; no current open finding | SR-006, SR-009, IR-003, CRR-002 | Approved REQ-008 now deliberately removes a proven redundant Claude `default` from backend offers; exact saved current is preserved through new catalog/picker path. |

- New or remaining finding IDs: None.
- Material score or classification changes: Current source score **9.2/10; 92/100**, all categories ≥9.0; Pass. Historical scores do not evaluate IR-003.
- Recommended recipient: primary `/api_e2e_engineer`, then informational `/implementation_engineer`.
- Remaining risks or uncertainty: New-basis browser/API/provider validation, Codex workspace-scoped exact-current variance, and Web typecheck toolchain failure remain downstream; prior API-REV-001 is not current sign-off.

### CRR-005 — Agent definition→Run failure origin

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/code-review-report.md`.
- Review entry point and round: API/E2E Failure-Origin Review, round 4; focused, no full scorecard or test-code review.
- Triggering role, report path, and finding/scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md`; API-E2E-010/F-API-002, MP-001/BEH-007; new code-review finding F-002.
- Relevant solution revision IDs: SR-006, SR-009.
- Relevant architecture-review revision IDs: ARCH-REV-003.
- Relevant implementation revision IDs: IR-003.
- Relevant API/E2E revision IDs: API-REV-002.
- Relevant delivery revision IDs: N/A for the current implementation round.
- Prior authoritative result: CRR-004 source **Pass** on IR-003; now superseded for the current package.
- Current authoritative result: **Fail — Local Fix**, implementation-owned; Medium/High classification unchanged.
- What changed in the review result and why: Real Chromium Agent card Run produced HTTP 500 and focused RunConfigPanel suite failed 18/30. The IR-003-added template prop accesses undeclared `agentRunConfigStore`, while the component declares `runConfigStore`. The error prevents the exact-current seed from reaching the Run form. It is an implementation-source defect and a concrete CRR-004 review gap: the changed identifier was directly visible and the prior BEH-007/API-E2E-readiness and runtime-correctness rationale was too broad. No source scorecard is recomputed in this failure-origin round.
- Supported product scenario / material-premise basis changes: None. ARCH-REV-003 MP-001 is a supported normal Agents → Run path, established independently of the failing test; the runtime/source evidence confirms its failure. No new requirement or design change is indicated.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Resolved/obsolete under SR-006 | Historical; not reopened | CRR-001–004, SR-006 | Different old-basis stopped-picker issue; F-API-002 is a new Run-panel binding defect. |

- New or remaining finding IDs: F-002 open; F-API-002 remains the API/E2E failure ID.
- Material score or classification changes: CRR-004's 9.2/10 source Pass and its affected API/E2E-readiness/runtime-correctness rationale are superseded for current delivery. Focused result Fail/Local Fix; no repeated numeric scorecard.
- Recommended recipient: `/implementation_engineer`; require source re-review, then fresh API/E2E.
- Remaining risks or uncertainty: Application/mobile browser untested after the critical failure; API-REV-002 partial passes are not overall sign-off; Web typecheck toolchain issue remains.

### CRR-006 — Agent Run seed binding correction verified

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/code-review-report.md`.
- Review entry point and round: Implementation Re-review, source round 4 after the CRR-005 failure-origin result.
- Triggering role, report path, and finding/scenario IDs: Implementation Engineer IR-004, `implementation-handoff.md`; F-002 / API F-API-002; ARCH-REV-003 MP-001/BEH-007.
- Relevant solution revision IDs: SR-006, SR-009.
- Relevant architecture-review revision IDs: ARCH-REV-003.
- Relevant implementation revision IDs: IR-004.
- Relevant API/E2E revision IDs: API-REV-002 (still Fail until rerun).
- Relevant delivery revision IDs: N/A for the current implementation round.
- Prior authoritative result: CRR-005 **Fail — Local Fix**.
- Current authoritative result: **Pass** at source-review boundary; Medium/High classification retained.
- What changed in the review result and why: IR-004 commit `6ff59d9e4` replaces the undeclared Run-panel template identifier with the declared `runConfigStore`. The existing store seed and child-form prop now align. A new exact Claude `default` Agent-form branch regression asserts the seed and unchanged config ID; this reviewer independently reran the previously failing panel command, **31/31 pass**. No backend/GraphQL/provider/persistence source changed.
- Supported product scenario / material-premise basis changes: None. MP-001 remains a supported normal Agents card → Run path; the known source obstruction is removed. Direct post-fix Chromium/API/E2E remains downstream, not claimed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-002 | Open, Local Fix in CRR-005 | Resolved at source boundary | IR-004, CRR-005/006, API-REV-002 | One-line `RunConfigPanel.vue` declared-store binding correction; exact-default form-prop regression; independent RunConfigPanel 31/31. |
| F-001 | Historical/obsolete | Unchanged | SR-006, CRR-004/005 | Distinct old-basis picker issue; not reopened. |

- New or remaining finding IDs: None in source review. API F-API-002 remains pending fresh execution.
- Material score or classification changes: CRR-005 Fail → Pass; full current scorecard **9.2/10; 92/100**, all categories ≥9.0. No new classification or structural concern.
- Recommended recipient: primary `/api_e2e_engineer`, then informational `/implementation_engineer`.
- Remaining risks or uncertainty: API-REV-002 remains Fail; real Chromium Agent Run plus Application/mobile browser still need fresh current-basis validation. Full Web typecheck toolchain issue remains.

### CRR-007 — Application saved-override restore failure origin

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/code-review-report.md`.
- Review entry point and round: API/E2E Failure-Origin Review, CRR-007; focused, no full scorecard or test-code review.
- Triggering role, report path, and finding/scenario IDs: API/E2E Engineer API-REV-003, `api-e2e-execution-coverage-report.md`; API-E2E-010/F-API-003; ARCH-REV-003 MP-002/BEH-007; new finding F-003.
- Relevant solution revision IDs: SR-006, SR-009.
- Relevant architecture-review revision IDs: ARCH-REV-003.
- Relevant implementation revision IDs: IR-004 (current package); failing clone predates IR-003/004.
- Relevant API/E2E revision IDs: API-REV-003 (Fail); API-REV-002 F-API-002 now closed by direct browser evidence.
- Relevant delivery revision IDs: N/A for this current implementation round.
- Prior authoritative result: CRR-006 source **Pass**, now superseded for current integrated package.
- Current authoritative result: **Fail — Local Fix**, implementation-owned; Medium/High unchanged.
- What changed in the review result and why: Public-imported runnable Application Save persisted a VALID exact-Claude-default Agent override and REST readiness RUNNABLE, but fresh Chromium reopen crashed with DataCloneError. Source trace: `ApplicationLaunchSetupPanel` stores fetched slot views in a Vue `ref`; `buildDraftFromView` selects the saved key; slot editor invokes `resolveEffectiveResourceRef`; its saved-override branch calls `structuredClone` on a reactive resource-ref Proxy. Git history places that branch in July commit `25ad035ca1`, before IR-003/004. It is a pre-existing implementation defect, not introduced by the latest fix, but it breaks current MP-002 behavior. CRR-004/006 missed this existing reactive saved-override path; browser evidence confirms the failure.
- Supported product scenario / material-premise basis changes: None. MP-002 independently establishes Applications Launch Setup/readiness for a saved resource; optional slots are supported by manifest type and actual public import/Save. No new behavior or legacy fallback is prescribed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-002 | Resolved at source boundary CRR-006; API F-API-002 pending rerun | Resolved; API F-API-002 closed | IR-004, CRR-006, API-REV-003 | Fresh 31/31 panel run and real Chromium Agents card→Run with exact default, no 500. |
| F-001 | Historical/obsolete | Unchanged | SR-006, CRR-004–006 | Distinct old-basis picker issue, not reopened. |

- New or remaining finding IDs: F-003 open; API F-API-003 remains Fail.
- Material score or classification changes: CRR-006 Pass → focused Fail/Local Fix; prior numeric source scorecard not repeated and cannot override current failure.
- Recommended recipient: `/implementation_engineer`; require source re-review then API/E2E rerun.
- Remaining risks or uncertainty: Team Application saved restore was not completed after Agent crash; authenticated mobile launch Not Tested; full Web typecheck toolchain issue remains.

### CRR-008 — Reactive Application saved-override correction verified

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/code-review-report.md`.
- Review entry point and round: Implementation Re-review, CRR-008 after CRR-007 focused failure-origin review.
- Triggering role, report path, and finding/scenario IDs: Implementation Engineer IR-005, `implementation-handoff.md`; F-003 / API F-API-003; ARCH-REV-003 MP-002/BEH-007.
- Relevant solution revision IDs: SR-006, SR-009.
- Relevant architecture-review revision IDs: ARCH-REV-003.
- Relevant implementation revision IDs: IR-005.
- Relevant API/E2E revision IDs: API-REV-003 (still Fail until fresh rerun).
- Relevant delivery revision IDs: N/A for this current implementation round.
- Prior authoritative result: CRR-007 **Fail — Local Fix**.
- Current authoritative result: **Pass** at source-review boundary; Medium/High classification retained.
- What changed in the review result and why: IR-005 commit `2c4699a14` replaces the saved reactive reference's `structuredClone` with explicit detached bundle/shared field projection and unwraps reactive REST JSON model config before deep cloning on the server-origin profile reread. Real Application Setup parent/slot regressions exercise Team Save→fresh reopen and saved exact-Claude-default Agent reopen with reactive refs and non-null configs; this reviewer independently reran the focused panel suite, **3/3 pass**. No backend/GraphQL/provider/persistence source changed.
- Supported product scenario / material-premise basis changes: None. MP-002 remains a supported normal Applications Launch Setup saved-resource reopen; source correction resolves the previously evidenced Proxy clone failure. Direct post-fix Chromium outcome is downstream, not claimed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-003 | Open, Local Fix in CRR-007 | Resolved at source boundary | IR-005, CRR-007/008, API-REV-003 | Flat saved-ref projection plus JSON config `toRaw` clone; real parent/slot reactive Agent+Team tests; independent 3/3 pass. |
| F-002 | Source/API resolved in CRR-006/API-REV-003 | Closed, unchanged | IR-004/005, API-REV-003 | IR-005 does not touch Agent Run panel; prior direct browser proof remains. |
| F-001 | Historical/obsolete | Unchanged | SR-006, CRR-004–007 | Distinct old-basis picker issue; not reopened. |

- New or remaining finding IDs: None in source review. API F-API-003 remains pending fresh execution.
- Material score or classification changes: CRR-007 Fail → Pass; full current scorecard **9.2/10; 92/100**, all categories ≥9.0. No structural/requirements reroute.
- Recommended recipient: primary `/api_e2e_engineer`, then informational `/implementation_engineer`.
- Remaining risks or uncertainty: API-REV-003 remains Fail; real Chromium Application Agent/Team saved restore and pending mobile checks require fresh current-basis validation. Full Web typecheck toolchain issue remains.

### CRR-009 — Proportional current-basis API/E2E durable-test review

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/api-e2e-test-review-report.md` (separate from source report).
- Review entry point and round: Successful API/E2E test-code review, round 2; current source report CRR-008 unchanged.
- Triggering role, report path, and finding/scenario IDs: API/E2E Engineer API-REV-004 Pass/94.3%, `api-e2e-execution-coverage-report.md`; approved stopped current/replacement descriptor contract and Team retry behavior; no new finding.
- Relevant solution revision IDs: SR-006, SR-009.
- Relevant architecture-review revision IDs: ARCH-REV-003.
- Relevant implementation revision IDs: IR-005.
- Relevant API/E2E revision IDs: API-REV-002 durable edits, API-REV-004 latest Pass; API-REV-003 F-API-003 closed by fresh browser.
- Relevant delivery revision IDs: N/A for the current review.
- Prior authoritative result: CRR-003 proportional test Pass on the older SR-003 ID-only basis; CRR-008 current source Pass.
- Current authoritative result: **Pass** for two API/E2E-owned durable test diffs; no source scorecard repeated.
- What changed in the review result and why: Built GraphQL E2E replaces obsolete ID-only introspection with SR-009 current/replacement/exact-current descriptor fields; deterministic browser fixture now supplies matching current/replacement descriptors and checks current-only canonical display after Team retry. Test structure, assertions, reuse and determinism are proportionate; API-REV-004 logs show built GraphQL 3/3 and browser 6/6. API/E2E made no new durable edit in API-REV-003/004 and removed none.
- Supported product scenario / material-premise basis changes: None. Approved stopped Settings/Team Save and exact-current descriptor paths independently establish the scenarios; synthetic fixture rows only exercise them.

#### Prior Finding Resolution

None — no prior test-review finding. Source F-003 remains resolved under CRR-008; API F-API-003 and F-API-002 are closed by direct API-REV-004/003 browser evidence.

- New or remaining finding IDs: None.
- Material score or classification changes: Proportional test review Pass, separate from API-REV-004's 94.3% validation confidence and CRR-008's source scorecard. Medium/High route retained.
- Recommended recipient: `/delivery_engineer`.
- Remaining risks or uncertainty: API-REV-004's stated unverified numeric smaller-window provider pair and real-device/mobile Create Run remain bounded; no universal provider success is claimed.
