# Code Review Report — code-quality-leftovers (autobyteus-357)

## Latest Round: Implementation Review, Targeted Delta (CRR-002)

- Round 2, scope `Targeted Delta Review`.
- Evidence for the scope: the delta `313bff2c8c..534ad1f55e` touches only the files CR-001 and CR-002 named: `useProviderApiKeySectionRuntime.ts`, its spec, and `project-task-context-drafts.ts`. No shared interface or data shape changes. The round-1 evidence for everything else is carried forward.
- Trigger: IR-002 (code `534ad1f55e`; documents `7942e2b250`).
- **CR-001: Resolved.**
  - `hasPartialModelResult` is now "the source is PARTIAL".
  - `hasStaleModelResult` is "STALE_ERROR with rows".
  - `hasUnavailableModelSource` is "ERROR, or STALE_ERROR without rows".
  - The multi-source-only helpers `hasCurrentModelRows`, `hasStaleModelRows` and `hasModelSourceProblem` are gone.
  - I checked equivalence case by case for zero or one source:
    - The old PARTIAL disjunct `cur && problem` reduces to PARTIAL with rows, which the first disjunct already covers.
    - The old stale flag is true exactly for STALE_ERROR with rows.
    - The old unavailable flag is true exactly for ERROR, or STALE_ERROR with zero rows.
    - With no source, all three flags are false, before and after.
  - The spec's fixture takes the one source. The `rows` hint is gone, and the cases cover PARTIAL with and without rows, STALE_ERROR with and without rows, ERROR and READY.
- **CR-002: Resolved.** `resetProjectTaskContextDraftsForTests` is removed; `git grep` finds no reference.
- Checks:
  - IMP-16: 1,466 web tests pass; web typecheck PASS at its baseline (298 test-file errors, as before); server typecheck exits 0; 493 server projects and architecture tests pass; the searches for the removed names are empty.
  - IMP-17: the Settings browser check passes.
- Structural rows that changed: "Dead code removed", "Test scenarios clear", "No stale/compat-only tests" and the legacy verdict's "Dead code removed" are all now `Pass`.
- Score changes: No Legacy Retention 9.4, Cleanup Completeness 9.4, API/E2E Readiness 9.3. Every category is now ≥ 9.2, and the average is 9.4.
- New findings: none. Follow-ups: FU-002 and FU-003 are unchanged.
- Review Decision: `Pass`. Recommended Recipient: API/E2E Engineer, with an informational notice to the implementation engineer. task_size Large / architectural_risk High, unchanged.

---

## Round 1 (CRR-001): Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-002; includes the Solution Designer's uncommitted ARCH-REV-002 receipt)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed As Context: `merged-task-texts.md`; `follow-ups.md`; root `DESIGN.md` rule 11
- Relevant Solution Revision IDs: SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 Pass; untracked)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (untracked)
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Trigger: IR-001 from the implementation engineer. Branch `codex/code-quality-leftovers`, range `ebc5277e52..313bff2c8c`.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Project design files applied: root `DESIGN.md` (rules 7, 9, 11), the Data Migration Guideline's sealed and frozen rules, and `TESTING.md` rule 9 (for the observations).

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Confirmed: the GraphQL `ModelSourceStatus` field is removed, the `BaseLLM` method is removed, and the `ProjectTaskService` owner boundary is split.
- Selected route: `Implementation Review`. Independent source review required: `Yes`.

## Review Scope

- Reviewed: every source change in the range, commit by commit.
  - `ee79a2ac75` (147, 178)
  - `c83890d4e4` (157)
  - `4310db539a` (a baseline test fix)
  - `0eda6aafe4` (54.1, 54.2: production code, the two compaction helpers, the doubles, the live-e2e harness, the provider tests)
  - `7e79df3b05` (54.3, 54.4: server, web store, query, generated types, specs)
  - `030d945076` (125.x, including the frozen prune and the whole `applicationLaunch.ts`)
  - `d7b11c57b6` (159 docs; the referenced files and the `agent_run_id` / `INVALID_TARGET` contract were checked against the source)
- Checks rerun by this review: none. IMP-01…IMP-15 ran on the reviewed commits, and their logs back the handoff's statements.
- Explicit exclusions: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. This is a cleanup with no behavior change; the only contract change is the GraphQL `ModelSourceStatus.modelKind`, removed in one release (DESIGN rule 9).
- Behavior-basis status: `Confirmed`.

| Behavior | Status | Implementation Path And Evidence |
| --- | --- | --- |
| Compaction release step (54.1) | Confirmed | `LlmPhaseSummaryPort.send` has no `finally` release. `BaseLLM.releaseConversation` had no override at the base (`git grep` at `ebc5277e52`: only the default no-op and the single caller). |
| Request label (54.2) | Confirmed | At the base, the only production uses were the two writers and the deny-list (`git grep` at `ebc5277e52`), so no provider ever read it. Agent and summary kwargs are now `{tools}` / `{}`. The attempt ID stays as metadata (`compactionInvocationId`). |
| Provider settings sources (54.3/54.4, DS-002) | Confirmed | The server sends at most one source per provider (`model-catalog-service.ts` 291: `dynamic ? [status(llmKey, …)] : []`). The store now resets and refreshes every source; since every source is the LLM source, this is the same as before. IMP-11 rendered READY, STALE_ERROR and ERROR. |
| Write results (157) | Confirmed | A one-to-one rename across the writer, logs, split, catalog, three coordinators and root managers. Frozen and sealed code keep the released names. The values are runtime results only. |
| Task context drafts (147, DS-001) | Confirmed | The route goes to `getProjectTaskContextDrafts()`. Its default stores equal the process `ProjectTaskService`'s: `initializeProjectTaskServiceProcessInstance` injects neither `store` nor `contextStore`. The checks and reclaim are unchanged and moved into `TaskContextOwnership`. |
| DONE closure release (178) | Confirmed | `release()` still requests every stop without waiting. Only the test-only drain is gone. IMP-14 runs real DONE closure. |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path | Expected Outcome | Independent Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-A | REQ-002, AC-002 | User | User | View and refresh a provider's models | Settings → API keys → provider | Normal | section → store → GraphQL `modelSourceStatuses` → lifecycle | Same sources and statuses | requirements; IMP-11 | Supported Normal Scenario | Use |
| SCN-B | REQ-002 | User | User | Attach context files to a Task | REST context-draft routes | Normal | route → `ProjectTaskContextDrafts` → context store | Same results | IMP-10 (`project-task-boundaries`), IMP-14 | Supported Normal Scenario | Use |
| SCN-C | REQ-002, AC-002 | System | Agent loop | Compaction | Summary port | Normal | summarizer → port → LLM | Same attempts and outcomes | IMP-04/05 | Supported Normal Scenario | Use |
| CON-11 | REQ-006, DESIGN rule 11 | Contract | — | Production code keeps nothing only tests need; tests observe real behavior | — | — | — | — | DESIGN.md rule 11; REQ-006; UC-054 ("the web settings' multi-kind source logic") | Governing contract | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The provider-section spec keeps fixtures with three sources per provider and invents a test-local `rows` hint to say which model rows each "source" gives. Its cases ("current LLM rows plus cold media failures as partial", "mixed current and stale rows") need two or more sources. In the composable, the second disjunct of `hasPartialModelResult` (`hasCurrentModelRows && hasModelSourceProblem`) is reachable only with two or more sources. | CON-11; UC-054; REQ-006 | The server's catalog contract: at most one source per provider | With one source, a READY source with rows has no problem, and PARTIAL is caught by the first disjunct. The second disjunct and these fixtures exercise states the product cannot produce, and the change invented `rows` to keep them alive: a test holding code back. | `model-catalog-service.ts` 291, 322; `useProviderApiKeySectionRuntime.ts` 74–81; spec 52–75, 264–330 | Promote | This ticket (introduced by the change) | Rewrite those cases to the single source the server sends, and remove what then only multi-source input reaches. Behavior is unchanged. |
| C-02 | `resetProjectTaskContextDraftsForTests` is exported and has no caller in `src` or `tests` | CON-11; Principle 7 | — | Dead, test-named production export added by this change. The singleton holds no state beyond its defaults, so no test needs a reset. | `git grep resetProjectTaskContextDraftsForTests` → only its definition | Promote | This ticket | Remove it. The design asked for it (AR-003b), but nothing uses it, and rule 11 and Principle 7 govern. |
| C-03 | `CompactionAttempts` numbers attempts from adjacency, the abort signal and the published attempt budget (handoff Assumption 1) | Test-double accuracy (design-review residual risk 1) | — | Product order: cached up to 2, then transcript up to 3, on one signal. A retry of an operation that ended early on the same signal, without exhausting its budget, could be miscounted. No suite does this; every refactored suite keeps its assertions and passes. | helper; IMP-04/05 | Reject | — | The double reproduces supported paths. The residual risk is noted for future suites, and no label comes back. |
| C-04 | The live-e2e harness now checks "trailing run of summary requests = attempt number parsed from `invocationId`" instead of request-ID identity | AC-006 (live, where credentials allow) | — | Weaker, but observes real requests and real metadata. It runs only with credentials (not run here). | `live-e2e-harness.ts` 926–930 | Reject | — | Proportionate. Listed for API/E2E. |
| C-05 | Two identical compaction helpers (autobyteus-ts, server), differing only in import paths | Design § Concrete Examples ("one helper per package's test support") | — | — | diff of the two files | Reject | — | Design-sanctioned; the packages' test trees are not shared. |
| C-06 | Helpers placed in `tests/helpers/` (and a new `autobyteus-ts/tests/helpers/`) instead of `tests/support/` | Design placement | — | — | handoff Assumption 3 | Reject | — | Follows the server's existing convention; the "no new folders" tension is resolved sensibly. |
| C-07 | 157: the migration tests keep the released names | Data Migration Guideline | — | Their stubs feed frozen writers | handoff Assumption 4 | Reject | — | Correct by the rule "a test value follows the code it feeds". |
| C-08 | Dead code removed beyond the named lines (whole `applicationLaunch.ts`, `team_agent_run`, `normalizeScope`, frozen `buildTeamCommunicationMessageId`, the admission event-name parameter, web `ModelKind`) | Principle 7 | — | Each has no remaining user: `git grep` per exported name; the Codex caller gates on the governed name before admission (`codex-thread.ts` 313). | searches above | Reject (as a concern) | — | Correct. |
| C-09 | `generated/graphql.ts` also picks up additive schema types from earlier tickets | — | — | Generated output; its only deletions are `modelKind` (IMP-15) | IMP-15 | Reject | — | — |
| C-10 | The "Models reloaded" toast after a STALE_ERROR reload; terminal `ps` 500 ms limit under full-suite load | — | — | Pre-existing, in untouched code | IMP-11, IMP-04 | Promote | Follow-up | Recorded as FU-002 and FU-003. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | The drafts concern was split out (not the runtime port); `project-task-service.ts` 494 → 445 | — |
| Matches behavior-defining supplements | Pass | No user-visible change (IMP-11) | — |
| Data-flow spine clarity | Pass | DS-001 route → drafts → context store; DS-002 unchanged apart from the field | — |
| Ownership boundary preservation | Pass | The route depends only on `ProjectTaskContextDrafts`; both services use `TaskContextOwnership` | — |
| Off-spine concern clarity | Pass | `TaskContextOwnership` serves both owners | — |
| Existing capability reuse | Pass | — | — |
| Reusable owned structures | Pass | The shared check lives in one owner; `bestEffortContextCleanup` is shared | — |
| Shared-structure tightness | Pass | `ModelSourceStatus` lost a single-valued field | — |
| Repeated coordination ownership | Pass | — | — |
| Empty indirection | Pass | — | — |
| Separation of concerns / file responsibility | Pass | — | — |
| Ownership-driven dependency | Pass | Matches the design's dependency rules | — |
| Authoritative Boundary Rule | Pass | — | — |
| File placement | Pass | C-06 | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface clarity | Pass | `status(key, modelCount)`; `conversationRequestKwargs(tools)` | — |
| Naming / one vocabulary | Pass | 157 fixes "renamed" for appends; `compactionInvocationId` names what it is | — |
| No unjustified duplication | Pass | C-05 | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files | Fail | One dead export was added (C-02); the multi-source branch is kept alive by tests (C-01) | CR-001, CR-002 |
| Test scenarios clear and requirement-aligned | Fail | The spec cases describe "media sources" the product no longer has (C-01) | CR-001 |
| Test fixtures/helpers coherent | Pass | Release tracker; compaction helpers | — |
| No stale/compat-only tests | Fail | The `rows` hint exists only to keep multi-kind fixtures alive (C-01) | CR-001 |
| API/E2E readiness | Pass after the fixes | — | — |

## Source File Size And Structure Audit

From IMP-12 (`grep -cv '^\s*$'`, base → now), spot-checked.

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `server/src/projects/services/project-task-service.ts` | 494 | 445 | Pass (≤ 470 target met) | Pass | Pass | Pass | — | — |
| `server/src/projects/services/project-task-context-drafts.ts` | 0 | 56 | Pass | Pass | Pass | Pass | — | CR-002 |
| `server/src/projects/services/task-context-ownership.ts` | 0 | 32 | Pass | Pass | Pass | Pass | — | — |
| `web/stores/llmProviderConfig.ts` | 497 | 480 | Pass | Pass | Pass | Pass | — | — |
| `server/.../codex/thread/codex-thread.ts` | 497 | 497 | Pass (not grown) | Pass | Pass | Pass | — | — |
| All other touched source files | — | ≤ 470 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No aliases for the renamed outcomes; `modelKind` is a clean cut |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files | Fail | CR-001, CR-002 |
| Approved persisted-data transition followed | Pass | `Not Affected`; frozen and sealed code keep the released names |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `resetProjectTaskContextDraftsForTests` (`server/src/projects/services/project-task-context-drafts.ts` 61) | `UnusedHelper` | No caller in `src` or `tests` | Added by this change; DESIGN rule 11 and Principle 7 | Remove |
| `hasPartialModelResult`'s second disjunct `(hasCurrentModelRows && hasModelSourceProblem)` (`web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` 80–81), and whatever else only two or more sources reach | `DormantPath` | Server sends ≤ 1 source per provider (`model-catalog-service.ts` 291, 322); only the multi-source spec fixtures reach it | UC-054 ("the web settings' multi-kind source logic"); DESIGN rule 11 | Remove after the spec cases move to single-source states; confirm with the unchanged single-source assertions |

## Docs-Impact Verdict

- Docs impact: `Yes`, and done in the change: the two streaming docs and five related mentions (159), autobyteus-ts docs (54.x), server `llm_management.md` (54.3).
- Delivery still has the stale `docs/features/task_agent_identity_future_improvements.md` that the handoff lists. The requirements ask only to list it.

## Additional Material Premise Validation

None.

## Review Scorecard (Mandatory)

- Overall score: 9.3 / 10 (simple average; not the decision rule).

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001 and DS-002 are clear; dead nodes removed | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | A clean split into drafts and ownership owners | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Narrower `status`, kwargs and GraphQL type | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Headroom met; helper placement reasoned | — | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.4 | Single-valued field removed | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | 157 names fixed; docs current | — | — |
| 7 | API/E2E Readiness | 9.2 | Broad checks pass; live-e2e harness not run without credentials | — | API/E2E runs the harness where credentials allow |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | No behavior change, shown by suites, a browser check and scripted E2E | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.0 | Clean cuts | The multi-source path stays alive only through test fixtures (CR-001) | Fix CR-001 |
| 10 | Cleanup Completeness | 8.8 | Extensive dead-code removal | An unused test-named export added (CR-002); the multi-source fixtures and branch remain (CR-001) | Fix CR-001, CR-002 |

## Findings

### CR-001: Provider-section tests keep multi-source states alive with an invented `rows` hint (Local Fix, implementation)

- Protects: REQ-006 and DESIGN rule 11, and UC-054 ("remove … the web settings' multi-kind source logic"). Candidate C-01.
- Evidence:
  - The server builds at most one source per provider: `model-catalog-service.ts` 291 (`dynamic ? [this.lifecycle.status(llmKey, …)] : []`) and 322 (`sources: []`).
  - `useProviderApiKeySectionRuntime.spec.ts` 52–75: `freshnessSnapshot` takes sources with a test-only `rows: 'LLM' | 'AUDIO' | 'IMAGE'` that is stripped before the snapshot.
  - Spec cases at 264–282 and 308–330 build two or three sources.
  - Production code: `hasPartialModelResult`'s `hasCurrentModelRows && hasModelSourceProblem` (`useProviderApiKeySectionRuntime.ts` 80–81) is reachable only with two or more sources.
- Required action:
  - Rewrite those cases to the single source the server sends (READY, PARTIAL, STALE_ERROR or ERROR, with the matching model rows), and drop the `rows` hint.
  - Remove the composable logic that only two or more sources reach. The case name "LLM rows plus cold media failures" describes media sources that no longer exist.
  - Keep every single-source assertion. No user-visible change (REQ-002).
  - If removing that logic turns out to need more than a local change, report it rather than widening the change.

### CR-002: Unused test-named export `resetProjectTaskContextDraftsForTests` (Local Fix, implementation)

- Protects: REQ-001 (no caller left) and DESIGN rule 11 / Principle 7. Candidate C-02.
- Evidence: `project-task-context-drafts.ts` 61; `git grep` finds no caller.
- Required action: remove it. The design's mention (AR-003b) does not require keeping an export nothing calls.

## Follow-ups

- Follow-ups this review added:
  - FU-002: the reload toast reports success on STALE_ERROR.
  - FU-003: the terminal `ps` 500 ms deadline fails 4 tests under full-suite load.
- Both were found by the implementation engineer and recorded here with evidence. Neither fails this ticket.

## Classification

`Local Fix`, owned by implementation (CR-001, CR-002).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`). Then a targeted-delta source review, then API/E2E.

## Residual Risks

- The `CompactionAttempts` heuristic (C-03): a future suite that retries an operation that ended early on the same signal would need its own operation boundary. The helper's doc says how it numbers attempts.
- The live-e2e harness's order-based summary check (C-04) runs only with test-vault credentials.
- The branch is 11 commits behind `origin/personal`; delivery re-integrates (parallel edits to `project-task-service.ts` and the coordinators are possible).

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (none needed)
- Score Summary: 9.3 average. No Legacy Retention is 9.0 and Cleanup Completeness 8.8, both because of CR-001 and CR-002.
- Failure Origin: N/A
- Recommended Recipient: Implementation Engineer
- Notes: an otherwise careful, well-evidenced cleanup. The two findings are small and local. task_size Large / architectural_risk High, unchanged.
