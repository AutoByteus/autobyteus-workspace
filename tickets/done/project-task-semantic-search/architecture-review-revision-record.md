# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Solution Designer "Architecture Design Complete" (2026-10-18) | SR-004, SR-005 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | Round 2 / Solution Designer re-review request for SR-006 (2026-10-18) | SR-004, SR-006 | Fail (Design Impact) | Pass | AR-001, AR-002, AR-003 (resolved) |
| ARCH-REV-003 | Round 3 / Solution Designer re-review request for SR-007 (FO-001, 2026-10-18) | SR-007 | Pass | Pass | None new (AR-001…AR-003 remain resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review of the semantic-search architecture

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search/tickets/in-progress/project-task-semantic-search/design-review-report.md`
- Review round and trigger: round 1; handoff `architecture-design-handoff.md` from `/software_engineering_team/solution_designer`
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` (SR-005); N/A
- Relevant solution revision IDs: SR-004 (approved requirements), SR-005 (design)
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` — `Design Impact`
- What baseline was established:
  - Behavior basis (BEH-001…BEH-005) confirmed against current code.
  - Classification `Large`/`High` confirmed.
  - All structural verdicts pass: spines, boundaries, dependencies, interfaces, reuse, placement, removal, legacy and persisted data.
  - Three bounded corrections are required.

#### Prior Finding Resolution

None

- New or remaining finding IDs:
  - AR-001 (Medium): the EmbeddingGemma 2 "drop if unverified" contingency contradicts the approved DEC-002 and the spec's own escalation trigger.
  - AR-002 (Low): the REQ-013/AC-014 notice approach is not mapped.
  - AR-003 (Low): the delete hooks must not wait for indexing, and a cancelled job must never write afterwards.
- Material classification changes: none
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: recommendations R-1…R-8 in the report (non-blocking). RSK-002, RSK-004, RSK-005 and RSK-008 are carried forward.

### ARCH-REV-002 — Re-review of SR-006: all round-1 findings resolved

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search/tickets/in-progress/project-task-semantic-search/design-review-report.md`
- Review round and trigger: round 2. Solution Designer re-review request (SR-006), `architecture-design-handoff.md` § "SR-006 Revision".
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` § "Architecture Review Resolution"; AR-001, AR-002, AR-003.
- Relevant solution revision IDs: SR-004 (requirements, unchanged), SR-006 (design revision).
- Prior authoritative decision: `Fail` (Design Impact), ARCH-REV-001.
- Current authoritative decision: `Pass`.
- What changed in the review result:
  - Behavior basis reconfirmed; requirements unchanged.
  - The three findings were verified against the current design spec and the new probe evidence.
  - The R-1…R-8 changes were checked for consistency: no new structure beyond a generation counter and a `scoreIds` option.
  - Unaffected round-1 structural verdicts stand.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium) | Resolved | SR-006 | `probes/egemma2-wasm-q8.json` (WASM r@5 0.957 / r@10 0.986, QR-007 met). Design spec: evidence table row, Final File Mapping (three entries unconditional), Change Sequence step 2, RSK-006/RSK-009 and G2 all route a verification failure to the Solution Designer for the user's decision. The generic empty-modality input rule is in G2. |
| AR-002 | Open (Low) | Resolved | SR-006 | Design spec G11: the prune keeps `LICENSE*`/`NOTICE*`/`package.json`; no `THIRD_PARTY_NOTICES` entry, consistent with `LICENSING.md`; per-model licence and source in the catalog and `embeddings.md`; `check_licensing.py` and the hygiene check run in validation. |
| AR-003 | Open (Low) | Resolved | SR-006 | DS-006 narrative and the `forgetTask`/`forgetProject` interface row: synchronous, never throws, never awaits indexing. DS-003 cancellation: per-collection generations, checked before each store write and cache update; late batches are discarded. |

- New or remaining finding IDs: none
- Material classification changes: none (Large / High unchanged)
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary), `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: RSK-002, RSK-004, RSK-005/RSK-009 and RSK-008, plus the design's implementation-time escalation triggers. See the report's Residual Risks.

### ARCH-REV-003 — Re-review of SR-007: FO-001 default-model and calibration revision

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search/tickets/in-progress/project-task-semantic-search/design-review-report.md`
- Review round and trigger: round 3. The Solution Designer requested re-review of SR-007, which answers code-review failure origin FO-001 / C-08 (`code-review-report.md` round 3, from API/E2E API-REV-001 F-001, case API-L04).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` § "Failure-Origin Resolution (FO-001 → SR-007)"; FO-001 (code review). There are no new architecture-review findings.
- Relevant solution revision IDs: SR-007, a user-approved requirement delta (DEC-002 default → Granite; DEC-011 new; QR-003/QR-004 re-based) and design revision.
- Prior authoritative decision: `Pass` (ARCH-REV-002).
- Current authoritative decision: `Pass`.
- What changed in the review result:
  - The requirements basis moves to SR-007, which the user approved.
  - The design follows the delta: default id, LEAF-IR calibration 0.30/0.045 as the fast option, G2 calibration at scale for the default, optional O-1, and the API/E2E rerun plan.
  - The evidence in `probes/fo-001/` supports the remedy, and the current catalog code holds the Granite values that were evaluated.
  - No structural change; the round 1–2 verdicts stand.
  - New non-blocking residual risks: R-9 (thin calibration margin at scale), R-10 (QR-003 on real-length Tasks), R-11 (QR-004 peak margin), R-12 (stale references in the Solution Designer's documents).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-002) | Resolved (unaffected) | SR-006, SR-007 | The catalog still holds all three approved entries; DEC-002 changes only the default, with the user's approval |
| AR-002 | Resolved (ARCH-REV-002) | Resolved (unaffected) | SR-006 | G11 unchanged |
| AR-003 | Resolved (ARCH-REV-002) | Resolved (unaffected) | SR-006 | DS-003/DS-006 unchanged |

- New or remaining finding IDs: none
- Material classification changes: none (Large / High)
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary), `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: R-9…R-12; RSK-002, RSK-005/RSK-009 and RSK-008; the design's escalation triggers.
