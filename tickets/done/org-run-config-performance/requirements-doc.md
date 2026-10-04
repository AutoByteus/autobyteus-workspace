# Requirements — Org/Team run-configuration performance

## Status / Approval
- Package: `org-run-config-performance`; date: 2026-10-03; owner: Solution Designer.
- **Approved**, requirements baseline **SR-006**, approval/design round **SR-010**. User explicitly confirms the presented cumulative three-change scope; architecture design is complete and ready for independent review.
- Exact approved baseline: **SR-006 / REQ-001–007 / AC-001–007**. Approval reference: `evidence/user-application-scope-approval.json`; frozen presented requirements and hash in `evidence/approved-requirements-sr006.md`.
- Behavior-defining supplements: None. Findings/raw evidence are factual, not intended-behavior authorities.
- Architecture design: **Ready for independent review**, `design-spec.md`, SR-010. Completed classification: **Medium / High** (shared allocator, transport and history-freshness contracts). Independent review/implementation artifacts: **N/A — not applicable yet**.

## Problem And Approved Outcome
User reports slow transitions configuring/running imported **AutoByteus Org** using **Codex / GPT-6.1 Sol**, and slow Team configuration/model options; requests experiments/timing. An unrelated-runtime cold readiness gate is verified. Additional packaged desktop testing verifies post-Run creation/history amplification: repeated history-tree collision/admission reads and heavy history projection; exact live-user workload still not reproduced.

Approved outcome: configure the exact selected runtime/model without unrelated discovery waits, and reduce history-amplified creation/new-row delay, preserving availability verification, unique identities, correct definitions/configuration, structural admission, authoritative history/freshness and execution semantics. No inference-speed or absolute cross-environment latency guarantee is proposed.

## Current / Desired / Preserved Behavior
| ID | Kind; scenarios | Current evidence-backed behavior | Approved desired behavior | Preserved behavior |
| --- | --- | --- | --- | --- |
| BEH-001 | User; SCN-001 | Org Library Run opens configuration and resolves exact owned references/model/schema. Cold Codex readiness waits for all runtime probes. | Independently verified available Codex becomes selectable without unrelated probes completing. | Required fresh owned-reference reads; global/member inheritance/overrides; invalid-configuration guards. |
| BEH-002 | User; SCN-002 | Team configuration shares runtime/model selection. Cold Team config 369 ms, catalog 198 ms in sampled local path. | Same independent Codex-readiness outcome for Team configuration. | Coordinator-led Team semantics, explicit runtime/model/config choices. |
| BEH-003 | User/System; SCN-003 | Org launch creates identity/workspace and publishes history row. ~500 stored roots produce 1.69–2.05s rows; measured collision checks reread 500×10 trees and repeated full history/navigation comparison adds delay. | Reduce repeated history-sized creation/publication work; measure new-row separately from workspace readiness. | Fresh identities and identity consistency, required validation/admission, fresh authoritative history/selection, recipient-free Org launch and exact model/runtime. |
| BEH-004 | User/System; SCN-004 | Runtime rows include unavailable reasons; model loading exposes loading/error states; admission/config guards apply. | Independent readiness must not misrepresent selected-runtime availability or hide its errors. | Existing supported recovery, other runtimes' functionality, schema/admission checks. |
| BEH-005 | Operational; SCN-005 | Isolated passive probes distinguish DOM-ready, HTTP and CLI timing. | Repeatable cold/warm attribution. | User app/runs/data/credentials remain untouched. |

Evidence: `investigation-notes.md` and factual `performance-findings.md` and `launch-row-findings.md` (not competing specifications).

## Actors
Operator needs the intended run configured without avoidable waits. Engineering/validation must preserve supported contracts and report evidence honestly. User retains intended-behavior approval authority.

## Scope Guardrail
### Approved In-Scope Use Cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | AutoByteus Org Library → config → Codex/GPT-6.1 Sol → Run → new history row/workspace | SCN-001,003,004 |
| UC-002 | Team run config → Codex/runtime/model choices | SCN-002,004 |
| UC-003 | Isolated cold/warm phase attribution for these paths | SCN-005 |

Out of scope: inference/first-token optimization, model/runtime/reasoning-default changes, UI redesign, unrelated navigation/rendering refactors, migrations, new security/compatibility policies, release/deployment and user-data cleanup. Remote-specific changes require environment evidence first. Other runtime functionality must not be removed to accelerate Codex. In-scope measurements target the confirmed local desktop node; remote/Docker is not the reported symptom.

Non-goals: guarantee absolute latency across machines/networks/providers, claim catalog reads load model weights, or claim one cold gate explains every reported delay.

Preserved boundary: BEH-001–004; no existing definition, run configuration/history or credential loss/reset. Blocking downstream corrections must trace to approved REQ/AC/BEH. New scope/policy/contract is a Requirement Gap requiring user approval; reviewer proposals do not amend requirements.

## Approved Requirements
| ID | Requirement | Behavior / source |
| --- | --- | --- |
| REQ-001 | Independently verified available Codex shall be selectable in Org/Team config without awaiting unrelated runtime discovery. | BEH-001,002; user performance request, F-001 |
| REQ-002 | Preserve accurate selected-runtime availability/reasons, existing supported recovery and admission; preserve other runtime choices. | BEH-004; existing supported states/contracts |
| REQ-003 | Preserve exact Codex/GPT-6.1 Sol, schema/configuration, inheritance/overrides and required fresh owned-member identity through creation. | BEH-001–003; current Org/Team workflow |
| REQ-004 | Preserve Org workspace/recipient semantics; launch alone shall not submit inference or silently substitute defaults. | BEH-003; docs and observed launch |
| REQ-005 | Report repeatable cold/warm phase evidence with environment, sample counts, errors and residual uncertainty; distinguish actual Run-click→exact new-row readiness, creation request and workspace readiness; distinguish DOM-ready from paint/control latency/inference. | BEH-003,005; explicit timing/new-row request and TESTING.md |
| REQ-006 | Fresh UUID-based Org member allocation shall not scan/read saved Org execution trees to check candidate-ID collisions. Preserve fresh UUID identity generation, identity consistency/data continuity, and required fresh definition/workspace/model/schema and structural-admission checks; these preserved outcomes do not mandate retaining exhaustive historical collision detection. | BEH-003; F-005 and user UUID-scan objection, approved improvement; scope confirmation in SR-010 |
| REQ-007 | Reduce redundant full-history transfer/reprocessing and full navigation-subtree equality work on new-row publication. Preserve authoritative mixed history, fresh updates, selection/expansion and Org hierarchy; do not publish stale data by bypassing freshness guards. | BEH-003; F-006, approved improvement; scope confirmation in SR-010 |

## Approved Acceptance Criteria
| ID | Links | Trigger / expected observable outcome | Verification / alternate |
| --- | --- | --- | --- |
| AC-001 | REQ-001; SCN-001,002 | Cold config with available Codex and an unrelated pending probe: Codex is selectable after its own verification while unrelated discovery remains pending. | Controlled dependency-delay regression plus real isolated Org/Team UI. |
| AC-002 | REQ-002; SCN-004 | Selected runtime/model cannot establish readiness: no false availability/admission; existing reason/loading/error/recovery remains usable. | Scoped failure/recovery regressions; verify other runtime options retain functionality. |
| AC-003 | REQ-003; SCN-001–003 | Valid exact selection with inherited/explicit overrides: created test-owned run retains model/runtime/config and owned-member identity; invalid/unresolved required configuration remains blocked. | Inspect run and existing schema/reference guards. |
| AC-004 | REQ-004; SCN-003 | Run ready Org: workspace opens, recipient remains unselected, no inference submitted by launch alone. | Full test-owned product journey; existing launch error feedback preserved. |
| AC-005 | REQ-005; SCN-003,005 | Comparable test-owned local desktop baseline/changed build: at least 5 cold and 5 warm in-scope phase samples, median/range, build/node/host context, errors and cleanup. | State incomplete broader-symptom reproduction. Current completed baseline has 5 warm/5 cold small and large-history series; changed-build verification still required. No approved absolute budget. |
| AC-006 | REQ-006; SCN-003,005 | Test-owned stress history (~500 saved Orgs, same 10-member launch): zero stored-Org-tree reads for candidate-ID collision lookup during fresh member identity allocation; fresh UUID-based identities, identity consistency/data continuity and required invalid-config/admission protections still hold. | Deterministic work-count regression plus same-condition backend/profile/UI comparison; 500 is a fixture, not a product capacity promise. |
| AC-007 | REQ-007; SCN-003,005 | Successful creation followed by authoritative history publication: exact new row and selection appear without avoidable repeated full snapshots/whole-workspace JSON equality; measured row latency and repeated-work evidence improve over equivalent baseline. | Preserve mixed history/children and concurrent-update freshness; compare 5 cold/5 warm samples, report range and any larger unexplained user delay. No absolute latency guarantee assumed. |

## Relevant Scenarios / Journeys
| ID | Actor / goal / supported trigger | Starting state; product-level sequence | Expected / alternate outcome | Validity / independent evidence |
| --- | --- | --- | --- | --- |
| SCN-001 | Operator configures AutoByteus Org via Library Run | Imported Org; open config, resolve members, select Codex/GPT-6.1 Sol and valid options | Exact launch-ready config; unresolved required definitions/schema guard launch | Supported Normal Scenario; user request, Org docs, isolated UI |
| SCN-002 | Operator configures Team via Library Run | Software Engineering Team; open config, choose runtime/model/options | Launch-ready selected config | Supported Normal Scenario; user request, Team docs, isolated UI |
| SCN-003 | Operator launches configured Org | Ready config with earlier saved runs; click Run Agent Org, new history row and workspace become available (timed separately), subsequently choose Agent/Team | Created Org without automatic recipient/inference; existing launch failure feedback | Supported Normal Scenario; Org docs, actual isolated launch |
| SCN-004 | Selected runtime/model discovery cannot establish readiness | Config open; unavailable runtime or model read error; inspect feedback/use supported recovery | No false readiness or guard bypass | Supported Normal Scenario (existing discovery-error alternate); existing availability rows/loading/error and guards; failure journey not fully exercised here |
| SCN-005 | Investigator measures safely on explicit user request | Test-owned instance/data; cold/warm UI actions, passive capture, owned cleanup | Attributed phase evidence, untouched user data | Supported Normal Scenario (Operational); user request, TESTING.md |

Synthetic public-API idle-run population is evidence only, not an approved bulk-create journey.

## UI / Quality / Data
UI applicable: existing config/transition states only; no proposed visual redesign. Product request, prototype root/ticket/spec, visual references and approval: **N/A — not requested/applicable**.

QR-001 → REQ-001/AC-001: deterministic independence from unrelated slow discovery. QR-002 → REQ-002–004/AC-002–004: preserve availability, freshness/admission and data continuity. QR-003 → REQ-005/AC-005: comparable honest phase evidence. QR-004 → REQ-006/007, AC-006/007: measurable reduction in repeated saved-history work and new-row latency under controlled fixtures, not new capacity/latency policy. No absolute target assumed.

No persistence change proposed. Preserve existing definitions, history, configuration and credentials; no user-data loss acceptable. Only test-owned disposable fixture/run/root cleanup allowed. Architecture, after approval, determines any later transition mechanism.

## Dependencies / Supplements / Assumptions
Runtime CLI/catalogs are external dependencies, not absolute latency guarantees. Initial backend 1.4.92/dev UI 1.4.93 evidence is supplemented by installed packaged 1.4.93 renderer/backend; all are investigation, not changed-build proof. ASM-001: user confirms the affected node is local desktop. Packaged baseline is now measured, but exact live-user history/transcripts/active load remains unmeasured.

Factual supplements: `performance-findings.md`, `launch-row-findings.md`, `evidence/` (complete inventory in investigation notes). No separate behavior approval applies; not normative. Product-owned supplements: N/A.

## Open Decisions
- DEC-001: node resolved by user: **local desktop**. Approximate seconds/exact interval remain unquantified; this limits attribution of broader delay but does not block the deterministic independent-readiness proposal.
- DEC-002: resolved: user explicitly confirms the cumulative runtime-readiness plus creation/history-publication improvement scope; approval captured in SR-010.
- DEC-003: numeric latency budget, if requested, needs confirmed environment; none assumed.

## Traceability / Architecture Input
REQ-001 → UC-001/002 → BEH-001/002 → AC-001 → SCN-001/002.
REQ-002 → UC-001/002 → BEH-004 → AC-002 → SCN-004.
REQ-003 → UC-001/002 → BEH-001–003 → AC-003 → SCN-001–003.
REQ-004 → UC-001 → BEH-003 → AC-004 → SCN-003.
REQ-005 → UC-001/003 → BEH-003/005 → AC-005 → SCN-003/005.
REQ-006 → UC-001/003 → BEH-003 → AC-006 → SCN-003/005.
REQ-007 → UC-001/003 → BEH-003 → AC-007 → SCN-003/005.

Approved in-scope scenarios: SCN-001–005 (normal and operational basis as documented). Preserve BEH-001–004. Structure/API/lifecycle choices are now owned by architecture design; no additional cache/framework is presumed. Existing request-local catalog sharing and observed Apollo dedup are facts, not new fixes.

Readiness: current evidence, desired/preserved behavior, scope, traceable criteria, existing UI states and data continuity are documented. User confirms local desktop. No behavior-defining supplements or new visual design. Unquantified broader latency remains visible rather than assumed solved. **SR-006 intended basis explicitly approved in SR-010. User approval: Yes. Design complete: Yes (`design-spec.md`, Medium / High). Solution package complete for applicable independent review; implementation must wait for that gate.**

Historical approval clarification (SR-006): the earlier objection alone was not approval of the entire package; subsequent explicit approval of all three changes is now captured in SR-010. No saved-history collision scan is proposed for fresh UUID allocation; no supplied/imported/resumed identity policy, structural-admission removal, or mathematical zero-collision guarantee is implied. The selected technical design is now in `design-spec.md`; this approval did not alter intended behavior.
