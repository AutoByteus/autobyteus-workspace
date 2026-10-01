# Code Review Report — Runtime-specific stopped-run model switching

## Review Round Meta And Scope

- **Latest authoritative result: CRR-008, Implementation Re-review, Pass** on IR-005 commit `2c4699a14`. Trigger: CRR-007 F-003 / API-REV-003 F-API-003 saved Application Setup restore failure. CRR-007's Fail is historical for source review; API-REV-003 remains Fail until new executable validation.
- Approved basis: SR-006 REQ-001–008/AC-001–011, SR-009 design, ARCH-REV-003 Pass and MP-002/BEH-007. Read current requirements, investigation and solution record; design and architecture supplements/review; IR-005 handoff/revision; CRR-007 report/revision; API-REV-003 investigation/report/revision/REST/browser evidence; current diff and relevant Application parent/slot/utility paths. Prior unaffected CRR-004/006 source checks are carried proportionately, not used as proof of this correction.
- Classification: `task_size=Medium`, `architectural_risk=High`, independent reviewed route unchanged. No requirement/design ambiguity or new scenario basis.
- Changed production source: only `autobyteus-web/utils/application/applicationLaunchProfile.ts` (8-line localized diff). Changed adjacent durable test: `autobyteus-web/components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts` (66 added/one removed line). No server, GraphQL, catalog, Save owner, provider-history, persistence or launch-readiness policy change. No source/test edits made by this reviewer.
- Independent validation: `pnpm -C autobyteus-web test:nuxt components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts --run` — **3/3 pass**. IR-005 reports combined Application suites 13/13, Nuxt production build, Web guards and diff check Pass; those broader commands were not independently rerun. No direct post-fix Chromium pass or full Web typecheck is claimed.

## Supported Scenario, Forward Path And Candidate Gate

**MP-002 / BEH-007, Supported Normal Scenario.** A user saves an Application Agent resource selection in **Applications → Launch Setup**, then reopens it to inspect the current exact saved Claude `default` and readiness. An Application Team resource follows the same saved-resource-ref utility branch. SR-009 DS-08/ARCH-REV-003 MP-002 and the existing Application Setup contract independently establish the product goal and path; REST/browser evidence from API-REV-003 establishes the valid saved state and former crash. This is not a hypothetical legacy-data condition or test-created entitlement. AC-011 specifically addresses run continuity; MP-002 is the precise Application authority.

**Current source path.** `ApplicationLaunchSetupPanel.vue` loads saved slot views into a Vue `ref` and derives the saved draft selection. `ApplicationExecutionResourceSlotEditor.vue` invokes `resolveEffectiveResourceRef` for that selection. IR-005 replaces `structuredClone` of the reactive saved reference with explicit projection to a detached plain `bundle` or `shared` reference, preserving the fields used by `buildResourceRefKey`, equality and Save. The utility also calls `structuredClone(toRaw(value))` for JSON model config copied from a reactive saved launch override during the IR-003 server-origin profile reread. For the supported server-origin JSON path, `toRaw` removes Vue's outer proxy before deep cloning; it is not an alternate model lookup or migration. Existing `summaryToResourceRef` uses the same discriminated flat reference shape.

The new Team test uses the real Setup parent and slot editor through Save → fresh mount/reopen, verifies reactive saved reference, selected Team key, VALID state and nested non-null model config in the server-origin draft. The Agent test mounts a saved Claude exact-`default` override through those real boundaries, verifies the reactive reference, selected Agent key, exact ID and non-null config. Profile-editor children are stubbed; integrated browser render/readiness still belongs to API/E2E.

| Candidate | Independent basis, path and consequence | Current evidence | Disposition |
| --- | --- | --- | --- |
| C-009 / F-003 | MP-002 saved resource → reactive Setup view → saved selection → slot editor; prior Proxy cloning caused Error 500 on fresh reopen. | IR-005 plain resource-ref projection, JSON config outer-proxy unwrapping, real parent/slot tests including Team Save→reopen and exact-default Agent; independent 3/3 pass. | **Reject as current finding — resolved at source boundary.** Supported scenario remains; post-fix browser outcome is unverified. |

No additional fallback, legacy compatibility branch, synthetic alias handling or provider-context machinery was added. The review makes no claim about arbitrary non-JSON model-config objects outside the supported REST JSON path.

## Structural, Boundary, Legacy And Size Recheck

The fix stays inside the existing Application launch-profile utility and preserves the catalog/GraphQL/current-value boundaries and existing Setup ownership. Flat resource-ref projection is limited to the two contract variants rather than spreading a Vue proxy into transport/draft data. `toRaw` is confined to the existing JSON config clone helper; no broad reactive-state bypass or new data model. No dead old clone remains on the saved ref branch; no schema/version migration or dual read/write. Changed handwritten utility has **384 effective nonempty lines**, under 500, and its positive delta is far below 220. The changed test remains one coherent Application Setup behavior/surface; source-size thresholds do not apply to tests. CRR-007's earlier review-coverage gap is addressed by tracing both resource and non-null config paths through reactive saved views.

## Review Scorecard

Full implementation scorecard revalidated for this local re-review; unaffected SR-009 source evidence is carried from CRR-004/006, and the implicated Application path is rechecked above. Rounded mean **9.2/10; 92/100**, all categories ≥9.0. Scores do not substitute for fresh API/E2E.

| Priority | Category | Score | Evidence / remaining weakness |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.3 | DS-08 saved Application view → ref → slot editor → utility now traced through reopen; browser remains downstream. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | Application utility handles flat ref/JSON config; backend catalog/readiness owners unchanged. |
| 3 | API / Interface / Query / Command Clarity | 9.2 | Bundle/shared reference shape and saved current identity preserved; no transport signature change. |
| 4 | Separation of Concerns and File Placement | 9.0 | Local clone correction remains in owning utility; existing large editors still near structural pressure. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.2 | No second saved/current model representation; explicit reference projection matches contract variants. |
| 6 | Naming Quality and Local Readability | 9.2 | `saved` projection and `toRaw` clone helper make reactive boundary legible. |
| 7 | API/E2E Readiness | 9.1 | Real parent/slot reactive regressions 3/3; live browser must rerun F-API-003. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.2 | Known Proxy clone path removed; Agent exact ID and Team saved config observed in focused tests, not live post-fix. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | No legacy-default shim, migration, dual DTO or old clone path retained. |
| 10 | Cleanup Completeness | 9.3 | Both evidenced reactive clone sites addressed in changed utility; no changed-scope leftover found. |

## Findings, Classification And Latest Authoritative Result

| Finding | Prior status | Current status / evidence |
| --- | --- | --- |
| F-003 / API F-API-003 | CRR-007 open; API-REV-003 Fail | **Resolved at source-review boundary** by plain saved-ref projection/reactive JSON config handling and independent 3/3 Setup test. API failure remains open until fresh browser execution. |
| F-002 / API F-API-002 | Source/API resolved in CRR-006/API-REV-003 | Remains closed; IR-005 did not touch Run panel. |
| F-001 | Historical/obsolete under SR-006 | Not reopened. |

- Review decision: **Pass**; failure classification: N/A; Supported Product Scenario Gate **Pass**; Material-Premise Gate **Pass**; no new finding. Medium/High route retained.
- Recommended recipient: primary `/api_e2e_engineer` for fresh API/E2E, then informational `/implementation_engineer` after primary success.
- Residuals: API-REV-003 remains Fail; prioritize real Chromium Application Agent saved-default Save→reopen, then Team saved restore, current-only model/schema/readiness and pending mobile checks. Prior provider/backend evidence is partial carried evidence, not current overall sign-off. Full Web typecheck toolchain issue remains.
