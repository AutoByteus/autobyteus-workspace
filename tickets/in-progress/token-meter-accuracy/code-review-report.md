# Code Review Report — token-meter-accuracy

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/requirements-doc.md` (Approved, SR-003 basis)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/investigation-notes.md`. This includes the uncommitted AF-16 row (SR-006, evidence-only).
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/solution-revision-record.md` (SR-001–SR-005 committed; SR-006 uncommitted in the worktree)
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-spec.md` (SR-005, D-1–D-10)
- Supplemental Task Artifacts Reviewed As Context:
  - `probes/`: P2, P6 and P8 were re-read directly; P9 is the RR-2 evidence.
  - `solution-handoff.md`, including the uncommitted SR-006 integration note.
  - `autobyteus-server-ts/docs/design/data_migration_guideline.md`.
  - Repository `DESIGN.md` and `AGENTS.md`.
- Relevant Solution Revision IDs: SR-001–SR-005; SR-006 (evidence-only integration note, no design change)
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md` (round 3, Pass)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): the delta `git diff aa9d949e1..f78921e5f` touches only the files and behavior of CR-F-001:
  - `legacy-token-usage-row.ts`: one migration-owned conditional on three reading fields.
  - One new consolidation test case.
  - One sentence in `token_usage.md`.
  - The handoff and revision record.

  No spine, shared interface or data shape changed, and no fix is layered on an earlier fix. Round-1 evidence for all other checks is carried forward.
- Trigger: implementation engineer IR-002 (Local Fix for CR-F-001, commit `f78921e5f`)
- Prior Review Round Reviewed: 1 (CRR-001, Fail — Local Fix)
- Latest Authoritative Round: 2
- Coverage Investigation / Execution Coverage / API/E2E Revision Record (failure-origin only): N/A
- Delivery Revision Record (delivery re-entry only): N/A
- Failing Scenario IDs / Commands / Evidence: N/A

Reviewed diff: `git diff 927796780..aa9d949e1` in round 1, plus `git diff aa9d949e1..f78921e5f` in round 2. Branch `codex/token-meter-accuracy`, worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. About 50 production files across six packages are changed. They cover the shared observation contract, accounting semantics, a persisted-schema change with a data update, and the Claude SDK frame mix.

## Review Scope

- Changed implementation and behavior reviewed:
  - **Claude SDK:** per-call usage, the context read, the awaited emission (D-10), the turn-end remainder and the tolerant reconciler state.
  - **Other adapters:** AGY per-step usage, Codex `last.totalTokens` and the reading-only save, the Grok prompt and the native threshold.
  - **Fold and pipeline:** the D-4 rules, revision bumped on every save (D-9), facet gating, the aggregate and summary `revision`.
  - **Persistence:** the Prisma column, the clear of pre-fix Claude readings, readiness, and the legacy consolidation payload.
  - **Transport:** the strict shared contracts and their `dist`, GraphQL, and the team/collaboration projectors.
  - **Web:** store freshness guards, the team partial count, and the meter threshold and overflow display.
  - **Docs:** `token_usage.md`.
- Files / areas reviewed: every non-generated production file in the diff, including the full reconciler, tracker, fold, record-state, accumulator, aggregate, AGY converter (`agentResponse`), Codex resolver, legacy payload builder, store and panel. Tests were read for the D-10 order test, R-001, P2/P3/P4/P6 fixture tests, the migration test and the contract tests.
- Reviewer-run checks (2026-10-09, branch HEAD `aa9d949e1`):
  - Targeted server unit suites (`tests/unit/agent-execution/backends/{claude,antigravity,codex,autobyteus}`, `tests/unit/token-usage`, readiness and migration tests): 88 files, 1,035 pass / 6 skipped.
  - Server `typecheck`: clean.
  - Web store and panel specs: 30 pass.
  - Both contract-package test scripts pass. The rebuilt `dist` matches the committed files (no working-tree diff).
- Reviewer-run checks (round 2, HEAD `f78921e5f`):
  - `vitest run tests/unit/app-data-migrations tests/unit/token-usage tests/unit/startup`: 70 files, 470 pass.
  - Server `typecheck`: clean.
- Explicit exclusions: the deterministic and opt-in live E2E suites and desktop verification. These belong to API/E2E and delivery.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (REQ-001–REQ-011, DEC-001–DEC-005, SCN-001–SCN-004).
- Design-spec behavior map verified against the implementation: Yes. The implementation follows D-1–D-10. Its deviations from the design wording are all within intent and justified:
  - The AGY key prefix `agy_step:` avoids digest collisions with the released keys `agy:<conv>:<num_turns>` on continued runs.
  - The Codex identity includes `last.totalTokens`, without which the P6 compaction update would be suppressed as a replay.
  - Dead `selectedDetails` state was removed (Core Principle 7).
- Design review report and round confirmed: ARCH-REV-003 Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `claude-sdk-client.ts` sets `includePartialMessages`. `ClaudeSdkStreamingSession.readContextUsage()` (summary detail, 2 s race, threshold only when `isAutoCompactEnabled`) feeds `ClaudeCallUsageTracker.observe` (reading → latest prompt / window / percent / threshold), which emits `claude_sdk_call`. The result observation carries no reading, so the fold's `latestReading` rule keeps the last call's reading. | — |
| BEH-002 | Confirmed | `ClaudeSession.handleFrame` awaits the tracker for `stream_event` and returns before `turnTracker.observe`. The fold's `claude_sdk_call` branch runs `recordClaudeSdkCall` (live sums) and the generic additive pricing. `reconcileClaudeSdkResult` contributes `max(0, delta − live)`, a restart admits 0, and live sums are consumed per session. The series-restart mark stays on the result path. The test with P4 frames and a 10 ms delayed read orders 4 calls before the result, with totals equal to `modelUsage`. | — |
| BEH-003 | Confirmed | `agy-stream-event-converter.ts` `agentResponse` emits `callUsage` on DONE with usage (`per_call`, `base_excludes_cache`, prompt = input + cache read, window null). The result usage mapping is removed. P8 shows usage only on `agent_response` DONE steps, summing to the cumulative result; P9 confirms resume uniqueness. | — |
| BEH-004 | Confirmed | `codex-thread-token-usage.ts`: prompt = `last.totalTokens`, and `reports_model_call` = last input + output > 0. In the fold, a non-advancing update with a reading is saved with `reports_model_call: false`; without a reading it is suppressed. The `contributes` gate keeps totals untouched, because the zeroed fields cover every `TOKEN_USAGE_TOKEN_FIELDS` entry. | — |
| BEH-005 | Confirmed | `llm-phase.ts` reports `compactionTokenBudget?.triggerThresholdTokens ?? null`; the native bridge sets `reports_model_call: true`. | — |
| BEH-006 | Confirmed | `grok-build-call-usage.ts`: prompt = input + cache read + cache creation, `reports_model_call: true`. Grok is the only ACP profile, so no ACP usage producer is left without the flag. | — |
| BEH-007 | Confirmed | The strict contracts carry `revision`, the threshold and `reports_model_call`. The team and collaboration projectors map them. The web guards compare `revision`, and the team partial count increments only for model calls. Standalone roll-ups update only from fetches (`<` guard). | — |
| BEH-008 | Confirmed | The counting artefact is removed at the source, the aggregate's Claude read-time derivation is removed, and the Prisma migration clears pre-fix Claude readings. The panel shows the over-window mark with a clamped bar. Round 2: `legacyRowToCurrentPayload` gives `claude_agent_sdk` ledger rows null readings, so a direct upgrade from a ledger era no longer rebuilds them (CR-F-001 resolved). | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, BEH-008 | User | User watching a run | Read the context fill | Token tab context card | Normal | adapter → fold → summary → meter | Runtime's own figure, marked if over the window | requirements; P1–P4, P7 | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, BEH-003, BEH-007 | User | User watching a running member | Live usage | Token tab, running member | Normal | DS-001 / DS-003 → DS-004 | Usage, model and runtime after the first call | requirements; screenshot 16 | Supported Normal Scenario | Use |
| SCN-003 | BEH-001, BEH-002, BEH-004 | System | Runtime compaction | Runtime compacts | Context crosses the threshold | Normal | Claude remainder; Codex reading-only save | Totals include the summariser; the reading drops | P3, P6 | Supported Normal Scenario | Use |
| SCN-004 | BEH-003–BEH-006 | System | Runtime per-call usage | Each model call | Adapter event | Normal | DS-003 | Correct gross, cache and prompt | P5–P8 | Supported Normal Scenario | Use |
| SCN-CR-01 | DEC-005 (a), REQ-009, AC-002 | Operational | User upgrading an older install | Upgrade to this release from a ledger-era release (v1.3.77–v1.4.52) | Desktop/server startup: Prisma `migrate deploy`, then registered app-data migrations | Explicit Edge | `20260819…_add_token_usage_run_records` and `20261009120000_token_meter_context_readings` (clears an empty table), then `TokenUsageRunRecordsV1AppDataMigration` folds ledger rows through `legacyRowToCurrentPayload` (`latest_prompt_tokens` passed through, `legacy-token-usage-row.ts:290`), then `applyTokenUsageContribution` stores the last ledger reading | Pre-fix Claude turn-sum readings persist on consolidated rows, which are mostly finished runs that never receive a new call | `data_migration_guideline.md:122-124` ("every released source shape stays supported until a release explicitly declares a minimum upgrade-from version"); no such declaration exists; the existing test "normalizes direct-upgrade rows…" in `token-usage-run-records-v1-app-data-migration.test.ts:170`; ledger-era Claude prompt = turn-level `input + cache creation + cache read` since `fb3914b1c` (first tag v1.3.77); run records first in v1.4.53; implementation handoff § Known Risks acknowledges the path | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Pre-fix Claude readings survive a direct upgrade from a ledger-era release | SCN-CR-01; DEC-005 (a); REQ-009 / AC-002 | Operational upgrade within the supported range | Prisma clear runs before the consolidation, which re-imports ledger readings. Historical Claude runs show the multi-call sum, possibly over 100 %, permanently | See SCN-CR-01 | **Promote** → CR-F-001 (round 2: resolved) | A one-line disposition in the migration-owned legacy payload builder plus a test. No runtime code changes |
| C-02 | Accumulator imports `tokenUsageObservationContributes` from `token-usage-run-record-state.ts` (a fold internal) as well as the fold itself | Design boundary map (fold → record-state; accumulator → fold) | Engineering contract | Pure stateless predicate over the authoritative payload; no state bypass; the same rule the fold applies | `token-usage-run-accumulator.ts:6,54` | Promote as **non-blocking recommendation** | Optional: have the fold result expose `contributes`. No score below 9.0 |
| C-03 | A Codex update without `last` now yields no reading and no model call (previously the cumulative input) | BEH-004 | None at the pinned version | Codex 0.161.0 always sends `last` (P5–P7) | Probes | Reject | Technically possible but unsupported at the pinned contract; REQ-001 forbids deriving the value |
| C-04 | A Claude process crashing mid-turn leaves live sums pending, and the summariser tokens of that turn are not admitted | BEH-002 | Process crash | The resume result re-anchors and consumes the live sums | Handoff § Known Risks | Reject (accepted residual) | Infrastructure failure is out of scope by default; the bounded undercount is in the same class as the existing restart approximation |
| C-05 | `message_delta` without a paired `message_start` is dropped with a warning | BEH-002 | None observed | Its tokens still reach the turn-end remainder through `modelUsage` | P2 frame order | Reject | Not reachable in the observed SDK frame order; the totals invariant is still covered by the remainder |
| C-06 | The partial team aggregate merges `api_cost_status` and currency from non-call events | BEH-007 | Codex compaction or Claude result live event | Zeroed events carry the same priced status as calls (enriched payload or `applyPolicy`); the aggregate is replaced on refetch | `tokenUsageMeterStore.ts:139-215`; fold `zeroTokenUsageContribution` | Reject | No evidenced wrong display |
| C-07 | `claude-session.ts` (487) and `tokenUsageMeterStore.ts` (499) are near the 500-line limit; reconciler change is +137/−88 (>220 delta) | Size guardrail | Engineering contract | The reconciler rewrite is design-mandated and remains a single cohesive owner (258 lines). Both near-limit files are under 500. The query-options extraction is a verified pure move (getters `model`/`workingDirectory`/`permissionMode` read the same `sessionConfig`) | Line counts; diff | Reject as a finding (recorded pressure) | No action now. Future store growth should split by concern |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The contract gained exactly `reports_model_call` and the threshold; obsolete paths were removed; no new subsystem | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Fixtures rebuilt from P2/P3/P4/P6; P8 shape confirmed | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001–DS-005 traced in code; D-10 order preserved by the awaited pump, the dispatch queue and `serializeRun` | — |
| Ownership boundary preservation and clarity | Pass | The tracker owns pairing and emission; the fold owns accounting; the reconciler owns the Claude state; SDK access stays behind the session handle | — |
| Off-spine concern clarity | Pass | The context read is behind `readContextUsage`; pricing is unchanged | — |
| Existing capability/subsystem reuse check | Pass | Reconciler, fold, transports and contracts are extended; only the designed tracker is new | — |
| Reusable owned structures check | Pass | The flat reading group is kept per the design | — |
| Shared-structure/data-model tightness check | Pass | `claude_sdk_main_loop_usage` and `selectedDetails` removed; `usage_report_count` and `revision` are distinct | — |
| Repeated coordination ownership check | Pass | One fold owner for the call, reading and contribution rules | — |
| Empty indirection check | Pass | `claude-session-query-options.ts` owns option assembly (a moved concern, not a pass-through) | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | — | — |
| Ownership-driven dependency check | Pass | No cycles; the tracker never touches the turn tracker | — |
| Authoritative Boundary Rule check | Pass (non-blocking note) | C-02: the accumulator imports one pure predicate from record-state | Optional: expose `contributes` on the fold result |
| File placement check | Pass | The new files sit in `backends/claude/session/` | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `readContextUsage`, `claude_sdk_call` key and `reports_model_call` are singular | — |
| Naming quality and naming-to-responsibility alignment check | Pass | — | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules | Pass | Main-loop type, validator and field, `selectedCacheSplit`, AGY result mapping, aggregate Claude branch and `selectedDetails` removed; repository search finds only a negative test assertion. The deferred projector `stream_event` path is listed as follow-up per the design | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | The D-10 delayed-read test asserts order and totals; R-001 transcript equality; P6 reading-only revision | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `tests/fixtures/claude-sdk-usage/claude-sdk-probe-frames.ts` | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Obsolete main-loop and context-summary tests removed | — |
| API/E2E readiness for the next workflow stage | Pass | Round 2: CR-F-001 is resolved and covered by a consolidation test. API/E2E hints are in the implementation handoff | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | 499 | Pass (at limit) | Pass (+12/−5) | Pass | Pass | Pressure | Split by concern on next growth |
| `…/claude/session/claude-session.ts` | 487 | Pass | Pass (+28/−40) | Pass | Pass | — | — |
| `…/claude/client/claude-sdk-client.ts` | 460 | Pass | Pass | Pass | Pass | — | — |
| `…/workspace/usage/TokenUsageMeterPanel.vue` | 431 | Pass | Pass | Pass | Pass | — | — |
| `…/token-usage/projections/claude-sdk-model-usage-reconciler.ts` | 258 | Pass | Flag (+137/−88), justified | Pass (single owner; design-mandated rewrite) | Pass | — | — |
| `…/claude/session/claude-call-usage-tracker.ts` (new) | 106 | Pass | Pass | Pass | Pass | — | — |
| `…/claude/session/claude-session-query-options.ts` (new, pure move) | ~45 | Pass | Pass | Pass | Pass | — | — |
| Other changed source files | ≤ 380 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The tolerant reconciler decoder is the design-approved generic reader |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Round 2: DEC-005 (a) is applied at both migration boundaries that produce run records (the Prisma SQL clear and the ledger consolidation) |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | The ledger-era knowledge stays inside the registered `token-usage-run-records-v1` migration |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | The second disposition point is recorded in the handoff as within DEC-005 intent |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None in changed scope. The out-of-scope follow-ups (the `claude-text-segment-projector.ts` partial path and the stale `generated/graphql.ts` drift) are recorded in the handoff.

## Docs-Impact Verdict

- Docs impact: `Yes`, and done. `token_usage.md` has its adapter, fold and compaction sections rewritten, with the RR-3 note. Pricing sections are untouched (REQ-011).
- Why: semantics changed for Claude, AGY, Codex and Grok, and for the fold rules.
- Files or areas likely affected: `autobyteus-server-ts/docs/modules/token_usage.md`. `origin/personal` changed the same file (+34 lines) since the base, so delivery must integrate it.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-01 (per-call vs result order) | Confirmed | D-10 implemented; the delayed-read test passes |
| MP-02 (non-call observations must update the live meter) | Confirmed | Revision guards; reading-only save; team partial count |
| MP-03 (non-first-party Claude pricing) | Confirmed (unsupported, non-blocking) | — |
| MP-04 (strict contracts) | Confirmed | Schemas updated; `dist` in sync; contract tests pass |

### `CR-MP-01` — Ledger-era Claude readings are consolidated after the Prisma clear

- Origin: `New`
- Related approved requirement or established contract: DEC-005 (a); REQ-009 / AC-002; `data_migration_guideline.md` § supported upgrade range.
- Relevant behavior ID(s): BEH-008
- Coherent product goal or governing event: a user on an older release upgrades the app; history must show truthful values.
- Scenario validity: `Supported Explicit Edge Scenario`
- Initiating basis kind: `Operational` / `Contract`
- Independent trigger or governing contract: the supported-upgrade-range rule; no minimum upgrade-from version is declared.
- Support evidence:
  - The guideline, lines 122–124.
  - The registered `TokenUsageRunRecordsV1AppDataMigration`, with its direct-upgrade test.
  - Claude ledger readings existed from v1.3.77 (`fb3914b1c`), computed as turn-level input + cache creation + cache read.
- Forward path: startup → Prisma migrations (the clear runs on an empty `token_usage_run_records`) → app-data consolidation → `legacyRowToCurrentPayload` (passes `latest_prompt_tokens`, window and percent for every runtime) → `applyTokenUsageContribution` (`latestReading`) → persisted Claude row with a pre-fix reading.
- Lifecycle preconditions and material consequence: the install holds ledger rows from v1.3.77–v1.4.52. Consolidated finished Claude runs keep the multi-call-sum reading indefinitely, which is the artefact REQ-009 forbids and DEC-005 (a) clears.
- Reachability: `Reachable`
- Review consequence / proportionate response: CR-F-001, a `Local Fix` in the migration-owned builder. Resolved in round 2 (IR-002, `f78921e5f`).

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3
- Overall score (`/100`): 93
- Score calculation note: simple average; not the decision rule.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | DS-001–DS-005 are clean in code; D-10 is enforced and tested | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.0 | The tracker, fold and reconciler have clear owners; SDK access goes through the handle | C-02: the accumulator reaches one record-state predicate | Expose `contributes` on the fold result (optional) |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | Two explicit contract facts; `revision` is separate from the call count; strict DTOs are aligned | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.0 | The tracker and query-options extraction are well placed | The store is at 499 lines | Split the store by concern before further growth |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | Main-loop field and `selectedDetails` removed; one meaning per field | — | — |
| `6` | `Naming Quality and Local Readability` | 9.5 | `ClaudeCallUsageTracker`, `reports_model_call`, `tokenUsageObservationContributes` | — | — |
| `7` | `API/E2E Readiness` | 9.0 | Strong fixture coverage; checks green. Round 2 adds a consolidation test for the direct-upgrade path | Live and desktop runs are still pending (API/E2E stage) | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.0 | Totals, order, reading rules, Codex and AGY are correct for the runtime paths | — | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean-cut removal; tolerant reader only | — | — |
| `10` | `Cleanup Completeness` | 9.0 | Obsolete paths removed. Round 2: DEC-005 is applied at both migration boundaries | Follow-ups (dormant projector path, `generated/graphql.ts` drift) are recorded but out of scope | — |

## Findings

No open findings.

### CR-F-001 — DEC-005 clear is bypassed on a direct upgrade from a ledger-era release

- **Round 2 status: Resolved** (IR-002, `f78921e5f`). Verified:
  - `legacyRowToCurrentPayload` nulls the prompt, window and percent only when `runtime_kind === "claude_agent_sdk"`. Totals, costs and counts are unchanged.
  - The consolidation validation does not compare readings, so it still succeeds.
  - The new test consolidates a released ledger and asserts the outcome. The Claude row (reading 402.5 %) ends with null readings, exact totals and one report. The Codex row keeps 92,942 / 258,400 / 35.97.
  - The handoff records both disposition points. `token_usage.md` has one sentence. No runtime code changed.
- Severity: Medium (was blocking in round 1)
- Classification: `Local Fix`
- Protects: DEC-005 (a) (user-approved disposition), REQ-009 / AC-002 (no counting artefact above 100 %), BEH-008; `data_migration_guideline.md` § supported upgrade range.
- Candidate / premise: C-01, CR-MP-01 (Supported Explicit Edge Scenario, Reachable).
- Evidence:
  - The clear in `prisma/migrations/20261009120000_token_meter_context_readings/migration.sql` runs during Prisma deploy, before the registered `TokenUsageRunRecordsV1AppDataMigration`.
  - `legacy-token-usage-row.ts:290-292` copies the ledger `latest_prompt_tokens`, `effective_context_window_tokens` and `context_window_usage_percent` for every runtime kind.
  - `applyTokenUsageContribution` stores the latest ledger reading.
  - Ledger-era Claude rows (releases v1.3.77–v1.4.52) carry turn-level sums.
  - The implementation handoff's Known Risks names this path and chose "no machinery". That choice contradicts the approved DEC-005 disposition within the supported upgrade range.
- Required action:
  1. In the migration-owned `legacyRowToCurrentPayload`, give `claude_agent_sdk` ledger rows `latest_prompt_tokens`, `effective_context_window_tokens` and `context_window_usage_percent` = `null`, the same disposition as the Prisma clear. Totals, costs and counts stay unchanged.
  2. Extend `tests/unit/app-data-migrations/token-usage-run-records-v1-app-data-migration.test.ts`, or the legacy fold test, with a ledger Claude row that carries a reading. Assert null readings on the consolidated row, unchanged totals and counts, and that a non-Claude row keeps its reading.
  3. Update the handoff: remove the "no machinery" risk and record this second disposition point as a deviation within DEC-005 intent. No runtime code knows about pre-fix rows, so the design's current-only rule holds.
- Why proportionate: one conditional plus one test, both inside an existing registered migration owner. Old shapes stay inside migrations, and no runtime branch is added.

### Non-blocking recommendations

- C-02: consider returning `contributes` from `foldTokenUsageObservation`, so the accumulator depends only on the fold boundary.
- Store size pressure: `tokenUsageMeterStore.ts` is at 499 effective lines.

### Non-blocking recommendations (round 2 status)

Both remain open and non-blocking. The implementation engineer kept the Local Fix minimal.

## Classification

N/A — Pass. Round 1 was a `Local Fix` (CR-F-001), now resolved.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer` (primary). `/software_engineering_team/implementation_engineer` receives an informational pass notification.

## Residual Risks

- RR-1 (accepted), RR-3 (docs note present), RR-4 (identity tradeoff) and RR-5 (fixtures) are unchanged. RR-2 is verified by P9.
- A Claude crash mid-turn leaves a bounded undercount of that turn's summariser tokens (accepted, C-04).
- Integration (SR-006 / AF-16): `origin/personal` has moved to the gemini-native-cache-hit merge, which conflicts in `agy-stream-event-converter.ts` and also changed `token_usage.md`. Delivery should resolve both in favor of D-5 and keep the upstream catalog prices.
- `generated/graphql.ts` base drift (only token-usage hunks applied) is a recorded follow-up.
- Live Claude, Codex and AGY E2E and desktop verification are not yet run (API/E2E and delivery).

## Latest Authoritative Result

- Review Decision: `Pass` (round 2, CRR-002)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (CR-MP-01 was Reachable; its finding CR-F-001 is resolved)
- Score Summary: 9.3 / 10; every category is ≥ 9.0.
- Failure Origin (when applicable): N/A
- Recommended Recipient (when applicable): `/software_engineering_team/api_e2e_engineer`
- Notes:
  - The runtime implementation is sound and well tested.
  - DEC-005 now holds across the supported upgrade range.
  - Task size `Large` and architectural risk `High` are preserved.
  - For API/E2E:
    - run the deterministic `tests/e2e` token-usage and migration suites;
    - run the opt-in live Claude (including auto-compaction), Codex and AGY suites;
    - check the meter live for team, delegated and Org members;
    - migrate a copy of a released-shape profile.

    See the implementation handoff § API / E2E.
