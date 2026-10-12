# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-012`
- Package identifier: `token-meter-accuracy`
- Request / ticket: Project Task `project_task_cb40258d-0311-4675-bdd4-8ff49253b576`
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-09
- Approval state and reference: Approved by the user in conversation on 2026-10-09: "I trust your decisions … decisions should be reflecting the truth … make truthful decisions, reasonable decisions, and then, yeah, I will approve your reasonable decisions and then use the design principles to work on it now." The user delegated DEC-001–DEC-005 to the evidence; each was resolved to the evidence-backed recommendation (see Open Decisions). Earlier direction (REQ-001): "We should use the statistics from the agent SDK itself" and "use their data as much as possible … you need to do enough experiments".
- Exact approved requirements baseline / solution revision: SR-002 of this document (SR-001 content with DEC-001–DEC-005 resolved). SR-003 revises DEC-002 to (b) on new evidence under the user's explicit delegation of these decisions ("I will approve your reasonable decisions … decisions should be reflecting the truth"); reported to the user with the design.
- Behavior-defining supplements and their approved versions: None. Probe files are evidence only.

## Problem And Desired Outcome

- Problem:
  - (A) On Claude Agent SDK runs, "Latest prompt" is the **sum of every model call in the last turn**, not the size of one prompt. In the user's database, 197 of 341 Claude SDK runs show over 100 % (maximum 6,759 %), and 97.3 % on the PTM run was such a sum.
  - (B) Claude Agent SDK and Antigravity usage is recorded only when a turn finishes. A member working through a long turn shows 0 tokens, 0 calls and an unknown model/runtime. On the user's delegated solution designer this lasted 4.5 minutes and ~60 tool calls.
  - Antigravity input is misread as already including cache reads, so its cache reads exceed its gross input (75.7 M vs 5.2 M) and its uncached input reads 0.
  - Codex briefly shows 0 % right after it compacts, and Antigravity and Grok show no "Latest prompt" at all.
- Affected actors or systems: users watching any run on any runtime; the server token-usage module and runtime adapters; the Token Meter UI.
- Desired outcome: the meter takes each runtime's own reported figures and converts them only where needed. It shows the true context in use as of the latest model call, against the scale the runtime itself uses, and updates after every model call for every run kind.
- Observable definition of success: on every runtime the "Latest prompt" equals the runtime's own context figure for the latest call. A running member shows usage, model and runtime after its first model call. Totals still equal the runtime's own cumulative totals.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-003 | Claude SDK latest prompt = turn-wide sum from `result.usage`; scale = model window from `modelUsage` | Latest prompt, scale and compaction threshold are the SDK's own context figures (`getContextUsage`: tokens in use, window, auto-compact threshold), updated after each model call | — | P1–P4, DB |
| BEH-002 | System | SCN-002 | Claude SDK usage recorded only at turn end | Usage recorded per model call as it happens, from the SDK's per-call usage; at turn end, reconciled with the SDK's cumulative totals so lifetime totals equal the SDK's | Turn-end reconciliation with SDK cumulative totals (covers SDK compaction calls); duplicate/regression/resume protections | P1–P3, traces |
| BEH-003 | System | SCN-002, SCN-004 | AGY usage only at turn end, cumulative; input misread as cache-inclusive; no latest prompt | Per-call usage from AGY's per-step reports as they happen; input + cache read = gross; latest prompt = latest call's input + cache read | AGY compaction display | P8, P8b, DB |
| BEH-004 | System | SCN-004 | Codex latest prompt = `last.inputTokens`; after compaction shows 0 | Context in use = Codex's own `last.totalTokens`, over `modelContextWindow` | Per-call live updates; cumulative-total accounting | P5–P7 |
| BEH-005 | System | SCN-004 | Native: per call, correct. Since upstream compaction-prompt-cache-reuse (REQ-007, user-approved 2026-10-09), compaction summary calls are reported as usage | Unchanged, plus (SR-010, user 2026-10-12): during and after a native compaction the "Latest prompt" reading stays unchanged and is replaced only by the next real reading (the agent's next call), never by unknown or by a local estimate | All native accounting and percentages; compaction calls counted as model calls with tokens and cost in totals (upstream REQ-007) | code, DB, DR-002, user 2026-10-12 |
| BEH-006 | System | SCN-004 | Grok: per call; no latest prompt | Latest prompt = latest call's input + cache read + cache write; window shown only if reported | Per-call accounting | code |
| BEH-007 | System | SCN-002 | Usage attribution to standalone/team/delegated/Org runs works once usage arrives | Unchanged; now visible after the first model call | Attribution, roll-ups, team totals | DB |
| BEH-008 | System | SCN-001 | Over-100 % values arise from counting (Claude SDK); genuine overflow also exists (Codex 100.3 % of its 95 % window; Claude SDK 95 % after failed compaction) | Counting artefacts impossible; a genuine runtime-reported overflow is shown truthfully and marked as over the runtime's window | — | P3, P7 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User watching a run | Know how full the context is and what a run costs | True context fill; live usage, model, runtime | No invented numbers |
| Runtime SDK/CLI | Reports usage and context | Its figures are the source | Converted only for field meaning |
| Anthropic / Gemini caching tasks | Price cache reads and writes | Pricing stays theirs | No conflicting meter changes |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | User reads the context fill ("Latest prompt") of any run on any runtime | SCN-001, SCN-004 |
| UC-002 | User watches a running agent (standalone, team member, delegated copy, Org member) and sees usage, model and runtime update per model call | SCN-002 |
| UC-003 | User reads correct gross input, cache hit and cost on Antigravity runs | SCN-004 |
| UC-004 | User understands when each runtime compacts | SCN-003 |

### Out Of Scope

- Pricing catalog values and the cost calculator (owned by the Anthropic prompt-caching and native Gemini caching tasks).
- Native-runtime prompt caching (other tasks).
- Changing any runtime's compaction behaviour or threshold. Configuring the Claude SDK compaction window to match AutoByteus's 80 % is a possible follow-up, not part of this task.
- Codex `cacheWriteInputTokens` (always 0 in probes; follow-up when non-zero is observed).
- Settings > Token Statistics analytics views, beyond receiving the corrected data.
- Repricing historical records.

### Non-Goals

- Fabricating a context window or threshold for runtimes that do not report one (AGY, Grok), except as decided in DEC-003.

### Preserved Behavior Boundary

BEH-005, BEH-007 and the preserved column of BEH-002/BEH-004. Cross-cutting invariant: lifetime token totals for every runtime still equal the runtime's own cumulative totals, with no double counting.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | For every quantity a runtime reports itself (per-call usage, cumulative totals, context in use, context window, compaction threshold), the meter uses the runtime's own figure. AutoByteus only converts field meaning; it never derives a number the runtime already provides, and never sums several calls into a "latest" value. | all | Must | User direction | User 2026-10-09 |
| REQ-002 | Claude Agent SDK "Latest prompt", its scale and its percentage equal the SDK's own context usage for the latest model call (tokens in use, window measured against, percentage). | BEH-001, BEH-008 | Must | Fix A | P1–P4 |
| REQ-003 | Claude Agent SDK usage is recorded after every model call, while the turn runs, from the SDK's per-call usage. | BEH-002 | Must | Fix B | P1, P2 |
| REQ-004 | Claude Agent SDK lifetime totals equal the SDK's cumulative `modelUsage` for the agent's model (DEC-002) after each turn, including SDK compaction calls, with no double counting between per-call and turn-end data. | BEH-002 | Must | Truthful totals | P3 |
| REQ-005 | Antigravity usage is recorded after every model call from its per-step usage. Gross input = input + cache read; latest prompt = latest call's input + cache read. | BEH-003 | Must | Fix AGY | P8, P8b |
| REQ-006 | Codex context in use = Codex's own `last.totalTokens` over `modelContextWindow`, so a compaction update shows the post-compaction size, not 0. | BEH-004 | Must | Codex's own accounting | P6 |
| REQ-007 | Grok Build shows latest prompt = latest call's input + cache read + cache write. | BEH-006 | Should | Coverage | code |
| REQ-008 | A running member of every run kind (standalone, team member, delegated copy, Org member) shows usage, latest model and runtime within one model call of starting. | BEH-007 | Must | Fix B | traces |
| REQ-009 | The meter never shows a counting artefact above 100 %. When a runtime itself reports context in use above its window, the meter shows the true number and marks it as over the runtime's window. | BEH-008 | Must | Truthful display | P3, P7 |
| REQ-010 | When the runtime reports a compaction threshold (Claude SDK; native AutoByteus), the meter shows it with the context bar (see DEC-004). | BEH-001, BEH-005 | Should | Explains compaction | P2, code |
| REQ-011 | Shared-code ownership with the caching tasks: this task does not change pricing catalog values or the cost calculator, and keeps its documentation edits to the runtime-usage and context sections. | — | Must | Coordination | Task |
| REQ-012 | After a compaction completes on a runtime whose new context size is only known from its next model call (native AutoByteus, Claude Agent SDK), the meter keeps showing the previous "Latest prompt" value visibly marked as pre-compaction (greyed), with the note "Compacted — updates on the next model call", until the next real reading arrives. No estimated value is shown. Runtimes that report the post-compaction size themselves (Codex) or report no reading (Antigravity) show no note. | BEH-001, BEH-005 | Should | Avoid the "high % but compacted" confusion after a final-answer compaction | User 2026-10-12: "add it please" / "do it in this ticket" (SR-011) |

## Acceptance Criteria

| AC ID | Requirement IDs | Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Claude SDK turn with ≥3 model calls | Latest prompt and percentage equal the SDK's `getContextUsage` for the last call (e.g. 7,062, not 24,993) | — | Unit test from P1 frames; live E2E |
| AC-002 | REQ-002, REQ-009 | BEH-001, BEH-008 / SCN-001 | Long Claude SDK session | Percentage never exceeds 100 % unless the SDK itself reports tokens in use above its window, then marked as over the window | — | Unit + live |
| AC-003 | REQ-003, REQ-008 | BEH-002 / SCN-002 | Claude SDK member running a multi-call turn (standalone, team member, delegated copy) | Meter shows ≥1 model call, latest model and runtime before the turn ends, and updates per call | — | Server E2E + desktop verification |
| AC-004 | REQ-004 | BEH-002 / SCN-002, SCN-003 | Turn ends, including a turn with SDK auto-compaction | Lifetime totals equal the SDK's cumulative `modelUsage` for the recorded models; no call counted twice | Resume/regression protections unchanged | Unit from P1/P3 frames |
| AC-005 | REQ-005 | BEH-003 / SCN-004 | AGY run with cache reads | Gross input = input + cache read; cache read ≤ gross; usage per call during the turn; latest prompt shown | — | Unit from P8/P8b frames |
| AC-006 | REQ-006 | BEH-004 / SCN-004 | Codex compaction update | Latest context shows post-compaction size (e.g. 68,630), not 0 | — | Unit from P6 frames |
| AC-007 | REQ-007 | BEH-006 | Grok call | Latest prompt populated | — | Unit |
| AC-008 | REQ-010 | BEH-001 / SCN-003 | Claude SDK or native run with compaction enabled | Threshold shown with the bar (Opus 5.5: 967,000 of 1,000,000) | Runtimes without a reported threshold show none | Component test + desktop |
| AC-009 | — | BEH-005, BEH-007 | Existing native/Codex/team totals | Unchanged | — | Existing tests |
| AC-010 | all | all | Desktop app, real runs | User verifies A and B fixed on Claude SDK and spot-checks other runtimes | — | User verification (verified 2026-10-11) |
| AC-011 | REQ-002, REQ-009 | BEH-005 | Native run that compacts (SR-010) | After the compaction summary call the meter counts it as a model call and adds its tokens and cost. "Latest prompt" keeps its previous value while the compaction activity shows, then changes to the new, smaller reading when the agent's next call reports it | A compaction after the agent's final answer keeps the previous value until the next message's first call | Unit (fold: reading kept; 2 calls; totals and cost) + user check of a native compaction in the desktop app |
| AC-012 | REQ-012 | BEH-005, BEH-001 / SCN-003 | Native or Claude SDK run; compaction completes while the meter is open, either automatic or a manual `/compact` | The "Latest prompt" value stays, greyed, with "Compacted — updates on the next model call"; when the run's next model call is reported, the note disappears (saves without a model call, e.g. Claude's turn-end summariser tokens, do not clear it) and the new, smaller value shows normally | Failed or stopped compaction: no note. Codex: no note (its post-compaction reading shows directly). After an app reload before the next call: no note (live-session hint only) | Store/panel unit tests + user check in the desktop app |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Contract | Goal Or Event | Trigger / Entry | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User watching a run | See how full the context is | Token tab, context card | Run with model calls | Open Token tab; read Latest prompt | Runtime's own context figure for latest call | Window unknown → tokens with "limit unavailable" | Supported Normal Scenario | 17.png | REQ-002, REQ-009; AC-001, AC-002 |
| SCN-002 | User | User watching a running member | See live usage of a working member | Select running member/copy, Token tab | Member mid-turn | Member makes calls; meter updates | Usage, model, runtime after first call | — | Supported Normal Scenario | 16.png | REQ-003, REQ-004, REQ-005, REQ-008; AC-003, AC-004 |
| SCN-003 | System | Runtime compaction | Runtime compacts | Context crosses runtime threshold | Long session | Runtime compacts; next call smaller | Meter drops after compaction; threshold visible where reported | Failed SDK compaction keeps context above threshold (shown truthfully) | Supported Normal Scenario | P3, P6 | REQ-010; AC-004, AC-008 |
| SCN-004 | System | Runtime per-call usage | Other runtimes report usage | Each model call | Run on AGY/Codex/Grok/native | Per-call reports | Correct gross/cache/latest prompt | — | Supported Normal Scenario | P5–P8 | REQ-005–REQ-007; AC-005–AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (small additions to the existing context card)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, design repository/root, UI/UX specification, support artifacts: N/A — not applicable
- Product ticket record and folder: N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative details: existing context card; adds an "over the runtime's window" mark (REQ-009) and a compaction-threshold marker/label (REQ-010, DEC-004); tooltip text says the value is the runtime's own context figure for the latest model call.
- Illustrative / permitted variation: marker styling.
- Required states: known window; unknown window; over window; threshold present/absent.
- Unresolved product decisions: None (DEC-004 resolved (a)).

## Quality And Non-Functional Requirements

| Quality ID | Related IDs | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003, REQ-005 | Performance | Per-call recording adds no provider API calls (Claude SDK context read uses the SDK's local summary mode) | Every call | Probe P4; review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`
- Data that must be preserved: lifetime token totals and captured costs of all records.
- Acceptable change: historical Claude SDK latest-prompt values are sums and cannot be recomputed (no per-call history retained). See DEC-005.
- Constraints: no repricing (module rule).
- Unknowns: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence | Uncertainty |
| --- | --- | --- | --- |
| `@anthropic-ai/claude-agent-sdk` 0.3.280 | `getContextUsage`, per-call usage on assistant/`message_delta`, `modelUsage`, `compact_boundary` | P1–P4, `sdk.d.ts` | Partial-messages option changes frame mix (R-001) |
| Codex app server 0.161.0 | `thread/tokenUsage/updated` `last`/`total`/`modelContextWindow` | P5–P7 | Default compaction limit not reported |
| Antigravity CLI 1.3.2 | `step_update` per-call usage; cumulative `result` | P8 | No window/threshold reported |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `investigation-notes.md` | Evidence, probes P1–P8, compaction per runtime | all | Current | Evidence only |
| `probes/` | Repeatable probes and raw outputs | all | Current | Evidence only |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | SDK/CLI field meanings observed at the pinned versions stay stable | Mapping correctness | Unit tests on captured frames | Open |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Claude SDK cost source | REQ-001 vs meter breakdown | (a) Keep the price-list estimate per component. It matched SDK `costUSD` exactly in P1/P2 and keeps the input/cache/output breakdown and Console alignment. (b) Use SDK `costUSD` per model as the total (no breakdown). **Recommended: (a)** | User | Resolved (a): keep per-component price-list estimate; P1/P2 show it equals SDK `costUSD` |
| DEC-002 | Include auxiliary Claude SDK models (e.g. the Haiku helper call) in totals and cost? | Currently excluded; SDK reports them | (a) Include all `modelUsage` rows. (b) Keep the agent's model only. Evidence (AF-10): auxiliary Haiku is 0.03 % of Claude SDK spend (≈ $1.89 of ≈ $7,270) but appears in 290 of 314 runs, and the price list has no Haiku 4.5 entry, so (a) would mark nearly every run's cost as partially unpriced for a negligible amount. | User (delegated) | Resolved (b) in SR-003 (was (a) in SR-002): agent's model only; auxiliary-model exclusion documented in the meter docs |
| DEC-003 | Antigravity has no reported window | Bar scale | (a) Show tokens with "context limit unavailable" (today's behaviour for unknown windows). (b) Use our model catalog's context window. **Recommended: (a)** per REQ-001 | User | Resolved (a): AGY shows tokens with "context limit unavailable" |
| DEC-004 | Show compaction threshold on the bar | Explains when compaction happens | (a) Marker + label "auto-compacts at 967,000" where reported. (b) Tooltip text only. **Recommended: (a)** | User | Resolved (a): threshold marker and label where the runtime reports one |
| DEC-005 | Historical Claude SDK latest-prompt values (sums, up to 6,759 %) | "Never an impossible value" | (a) One-time data change: clear latest-prompt/percentage on Claude SDK records written before the fix ("not available"); totals untouched. (b) Leave them; they refresh on the next call of any continued run. **Recommended: (a)** | User | Resolved (a): clear latest-prompt fields of pre-fix Claude SDK records; totals untouched |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | all | all | AC-001–AC-007 | all | user direction |
| REQ-002 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 | P1–P4 |
| REQ-003 | UC-002 | BEH-002 | AC-003 | SCN-002 | P1, P2 |
| REQ-004 | UC-002 | BEH-002 | AC-004 | SCN-002, SCN-003 | P3 |
| REQ-005 | UC-002, UC-003 | BEH-003 | AC-005 | SCN-004 | P8 |
| REQ-006 | UC-001 | BEH-004 | AC-006 | SCN-004 | P6 |
| REQ-007 | UC-001 | BEH-006 | AC-007 | SCN-004 | code |
| REQ-008 | UC-002 | BEH-007 | AC-003 | SCN-002 | traces |
| REQ-009 | UC-001 | BEH-008 | AC-002 | SCN-001 | P3, P7 |
| REQ-010 | UC-004 | BEH-001, BEH-005 | AC-008 | SCN-003 | P2 |
| REQ-011 | — | — | AC-009 | — | caching task design |

## Architecture Phase Input

- Approved scenario IDs: SCN-001–SCN-004 (once approved).
- Constraints: REQ-001; no double counting (REQ-004); pricing untouched (REQ-011); no added provider calls (QR-001).
- Deferred to design: Claude SDK per-call source (`message_delta` with partial messages vs assistant-message usage + turn-end output correction) and context source (`getContextUsage` after each call); reconciliation of per-call contributions with cumulative `modelUsage`; AGY per-step mapping vs cumulative result; historical data change mechanism (DEC-005).
- Technical facts to verify: existing reconciler/fold handling of mixed per-call and cumulative observations for one run; frontend live path for delegated/Org members.
- Known risks: R-001, R-002, R-003.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-09, conversation)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-002)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
