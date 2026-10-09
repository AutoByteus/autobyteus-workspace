# Requirements Document — Gemini Native Cache Hit

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `gemini-native-cache-hit`
- Request / ticket: Project Task from `/project_task_manager` (2026-10-09), raised from the Anthropic prompt-caching Task `e08c9081`
- Requirements owner: Solution Designer
- Date: 2026-10-09
- Approval state and reference: **Approved by the user on 2026-10-09** in the Solution Designer conversation: "Since you'll notice these two places that have problems, then just fix them in this ticket." This followed the user confirming the diagnosis: the native runtime is correct, AGY counting is wrong, and 3.1 Pro prices are wrong.
- Exact approved requirements baseline / solution revision: SR-002. Scope is REQ-001, REQ-002, REQ-004 and REQ-005 (fix-forward). REQ-003 was removed at the user's direction to fix only the two problem places.
- Behavior-defining supplements and their approved versions: None. Evidence is in `investigation-notes.md`.

## Problem And Desired Outcome

- Problem: The Token Meter suggests native Gemini caches far worse than AGY (83% / 66% against ≈99%). Live investigation shows the AGY numbers are inflated: AGY's `input_tokens` excludes cache reads, but we ingest them as if they included them. On a truthful basis, native 3.8 Flash is within about 3–10 points of AGY, and native 3.1 Pro is ahead. The native request prefix is already stable. The remaining native loss is Google-side implicit-caching behaviour. Separately, the Token Meter overprices Gemini 3.1 Pro on every dimension, including cached input.
- Affected actors or systems: users comparing runtimes and costs in the Token Meter; the native Gemini runtime; AGY usage ingestion.
- Desired outcome: an evidence-backed explanation of the gap; truthful cache-hit and token totals for AGY Gemini runs; correct prices for cached (and other) Gemini input; and native Gemini requests guarded to stay cache-friendly.
- Observable definition of success: like-for-like Token Meter cache-hit figures for native and AGY Gemini runs are computed on the same gross basis, native 3.8 Flash is comparable to AGY on that basis, and 3.1 Pro costs match Google's official prices.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Native Gemini sends a deterministic system instruction + tools + append-only history. It reaches 92–95% warm hit back to back, 83–85% over real runs | Unchanged request shape, protected by an automated prefix-stability check | Implicit caching; gross usage semantics; streaming and tool behaviour | F2, F3, E2/E4 |
| BEH-002 | Contract | SCN-002 | AGY usage is ingested as gross-including-cache, so cache misses show as 0 and gross input/total omit cache reads | AGY input is treated as excluding cache: gross = input + cache reads, miss = input | AGY cumulative-snapshot ingestion, idempotency, and other AGY events | F1, live AGY probe |
| BEH-003 | System | SCN-003 | 3.1 Pro priced at 2.25 / 0.225 / 18 (≤200K) and 4.5 / 0.45 / 27 (>200K) | Official prices: 2.00 / 0.20 / 12 (≤200K) and 4.00 / 0.40 / 18 (>200K) | 3.8 Flash prices (already correct) and tier selection by prompt size | F5 |
| BEH-004 | System | — | No explicit context caching | Unchanged (see DEC-003) | — | F6, E5 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User running Gemini agents | Lower cost; trust the Token Meter | Truthful hit and cost per runtime | Configured mode is Vertex Express |
| Token Meter | Accounting and pricing | Correct semantics and prices | Existing ledger semantics (`base_excludes_cache`) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A native Gemini agent run keeps a cache-friendly request prefix across calls | SCN-001 |
| UC-002 | An AGY Gemini run reports truthful gross input, cache-miss and cache-read tokens to the Token Meter | SCN-002 |
| UC-003 | The Token Meter prices native Gemini 3.1 Pro cached input, input and output at official rates | SCN-003 |

### Out Of Scope

- The Anthropic caching Task (`e08c9081`) and the Claude Agent SDK Token Meter Task (`cb40258d`).
- Pricing for AGY model ids (`gemini-3.8-flash-high` and similar stay `price_missing`).
- Google-side implicit cache reliability (random misses, the 4–8 min TTL, and 3.1 Pro misses on Vertex Express).
- Vertex Project / regional-endpoint evaluation (UNK-001).
- The Gemini renderer dropping mid-history system notes (OBS-001; separate-ticket candidate).
- AGY non-Gemini models: they share the converter, and the semantic fix applies to all AGY usage events. No separate pricing work.

### Non-Goals

- Not making native Gemini reach ≈99%. On a truthful basis no runtime does on these models; the ceiling depends on Google's implicit caching.
- No keep-alive or ping traffic to hold caches warm.

### Preserved Behavior Boundary

BEH-001 request content, streaming and tool-calling behaviour; Gemini gross usage parsing; the 3.8 Flash price schedule (introductory → 2027 standard); AGY cumulative snapshot de-duplication.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved REQ, AC or preserved-behavior ID that it protects.
- A finding that would introduce new behavior, policy, migration obligation or compatibility promise is a `Requirement Gap` and needs user approval.
- An adjacent concern is a non-blocking recommendation.
- Reviewer comments do not amend this basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The package documents the root cause of the native-vs-AGY Gemini cache-hit gap per model, with live evidence | BEH-001, BEH-002 | Must | Done-when #1 | Request; F1–F6 |
| REQ-002 | AGY usage is ingested with `input_tokens` excluding cache reads: gross input = input + cache reads, cache miss = input, and cache-hit ratio on the same basis as native | BEH-002 | Must | Like-for-like comparison | F1; live AGY probe |
| REQ-003 | **Removed in SR-002** (user narrowed scope to the two problem places). Native request shape stays unchanged; no new prefix test in this ticket | BEH-001 | — | Native runtime has no defect (F2) | User, 2026-10-09 |
| REQ-004 | Gemini 3.1 Pro Preview catalog prices match Google's official prices for both tiers: input, cached input, output and reasoning output | BEH-003 | Must | Done-when: Token Meter prices cached Gemini input correctly | F5 |
| REQ-005 | Historical records follow the user's DEC-001/DEC-002 decision. The recommended default is fix-forward: new usage only, with no rewrite of existing rows | BEH-002, BEH-003 | Must | Data continuity | DEC-001, DEC-002 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001/002 | Package handed off | The investigation notes state, per model, the corrected AGY figure, the native figure, and the cause of the remaining difference, with probe artifacts | — | Review |
| AC-002 | REQ-002 | SCN-002 | An AGY result usage of input 6,110 and cache_read 307,003 is ingested | Gross input 313,113; cache miss 6,110; cache read 307,003; hit ≈98% | Missing cache_read leaves gross = input and the cache state not reported | Unit test on the converter; ledger integration |
| AC-003 | REQ-002 | SCN-002 | A live AGY Gemini run after the fix | The Token Meter shows gross input ≥ cache reads, and hit < 100% whenever any uncached input was reported | — | Live AGY check (user verification) |
| AC-004 | — | — | — | **Removed in SR-002** together with REQ-003 | — | — |
| AC-005 | REQ-004 | SCN-003 | Native 3.1 Pro usage with prompt ≤200K, and with prompt >200K | Unit prices applied are 2.00 / 0.20 / 12 and 4.00 / 0.40 / 18 respectively | — | Pricing unit test and Token Meter check |
| AC-006 | REQ-004 | SCN-003 | Native 3.8 Flash usage | Prices unchanged (0.75 / 0.075 / 3.75 through 2026; 1.50 / 0.15 / 7.50 from 2027) | — | Existing pricing tests stay green |
| AC-007 | REQ-005 | — | After deployment | Existing rows behave as DEC-001/DEC-002 decided | — | Data check |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Native agent run with a Gemini model | Multi-call tool loop | User message to a native agent | Gemini configured (Vertex Express) | Agent calls the LLM, runs tools, calls the LLM again with the appended history | Cached prefix reused by Google implicit caching | Google may miss (best effort); usage still recorded truthfully | Supported Normal Scenario | E2/E4 | REQ-003, AC-004 |
| SCN-002 | Contract | AGY CLI `result.usage` | Usage reporting per AGY turn | AGY agent run | AGY runtime | AGY completes a turn and emits cumulative usage, which the server ingests | Token Meter shows truthful gross/miss/read | Missing fields stay not-reported | Supported Normal Scenario | Live AGY probe | REQ-002, AC-002/003 |
| SCN-003 | System | Token Meter pricing | Cost estimate for native Gemini usage | Usage recorded for a native run | Model in the catalog | Tier selected by prompt size; component prices applied | Official prices | Unknown model stays `price_missing` | Supported Normal Scenario | Official Vertex/AI Studio pricing | REQ-004, AC-005/006 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (the existing Token Meter displays the corrected data unchanged)
- Product design fields: `N/A — not applicable`

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003 | Performance | No extra provider requests or storage cost added to native Gemini runs | Native Gemini | Code review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`, only if DEC-001 or DEC-002 chooses repair.
- Data or state that must be preserved: all existing token-usage rows. Nothing is deleted.
- Acceptable: with fix-forward, historical AGY rows keep the inflated hit and under-counted gross input, and historical 3.1 Pro costs keep the old prices.
- Constraints: 34 AGY Gemini run records since 2026-08-01, 7 native 3.1 Pro run records, plus analytics facets.
- Unknowns: if repair is chosen, the exact recompute path through run records and daily facets is designed in the architecture phase.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| AGY CLI 1.3.2 `usage` | `input_tokens` excludes `cache_read_tokens`; `total = input + output` | Live probe | Could change in future AGY versions |
| Google implicit caching | Prefix-based, best effort; minimum 6,144 tokens on Vertex for 3.1 Pro / 3.7 / 3.8 Flash; TTL 4–8 min observed | Google docs; E1–E6 | Google-side variance |
| Vertex / AI Studio pricing | 3.1 Pro 2.00/0.20/12 and 4.00/0.40/18; 3.8 Flash 0.75/0.075/3.75 | Official pages, 2026-10-09 | Prices change; 3.8 Flash switches 2027-01-01 (already modelled) |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/gemini-cache-lab.mjs`, `probes/*.jsonl` | Live evidence and a reusable probe | REQ-001, AC-001, AC-004 | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Vertex Express bills at Global prices | Pricing correctness | Official page: Express uses the global endpoint | Accepted |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Historical AGY usage rows: repair or fix-forward? | Old AGY hit/gross stay inflated or under-counted | (a) Fix-forward only (recommended: simple, no migration; AGY rows are `price_missing`, so no cost changes). (b) One-time repair: recompute gross/miss from the stored reported input + cache read on run records and facets | User | **Resolved: (a) fix-forward.** The user directed fixing the two code places only (2026-10-09) |
| DEC-002 | Historical native 3.1 Pro costs: re-price or fix-forward? | Old Token Meter costs stay overstated (≈$35.7 since 2026-08-01) | (a) Fix-forward (recommended). (b) Re-price stored cost fields | User | **Resolved: (a) fix-forward** (same direction) |
| DEC-003 | Implement explicit Gemini context caching? | Done-when mentions "where it pays off" | (a) No (recommended): unavailable on Vertex Express (live 404); implicit already hits the static prefix; storage plus re-creation cost for the growing history. (b) Opt-in explicit caching for AI Studio / Vertex Project only, as a separate task | User | **Resolved: (a) no** (not part of the two fixes) |
| DEC-004 | Accept the corrected like-for-like basis as the "comparable to AGY" measure? | Done-when #2 | Native 3.8 Flash 83.2% vs AGY 86.6% (high) / 93.5% (medium); native 3.1 Pro 66.1% vs AGY 37.0% | User | **Resolved:** the user accepted that the native runtime has no problem and only counting/pricing need fixing |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001 | SCN-001, SCN-002 | probes |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-003 | SCN-002 | AGY probe |
| REQ-003 | — (removed in SR-002) | BEH-001 (preserved, unchanged) | — | SCN-001 | E2/E4 |
| REQ-004 | UC-003 | BEH-003 | AC-005, AC-006 | SCN-003 | pricing pages |
| REQ-005 | UC-002, UC-003 | BEH-002, BEH-003 | AC-007 | — | DEC-001/002 |

## Architecture Phase Input

- Approved scenario IDs to map: SCN-001..003.
- Constraints: no extra provider traffic; reuse the existing `base_excludes_cache` ledger semantic; keep the catalog tier model.
- Deferred to design: the AGY converter change and cumulative-delta verification; the test placement for prefix stability; repair mechanics if DEC-001/002 choose repair.
- Technical facts to verify: the AGY snapshot delta normalizer with `base_excludes_cache` across turns; tier selection for 3.1 Pro at exactly 200K.
- Known risks: future AGY usage-format changes.

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
- Remaining content blocker: user decisions DEC-001..004

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-09)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-002)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
