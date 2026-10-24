# Architecture Review Revision Record — `node-vocabulary` (autobyteus-290)

The latest `design-review-report.md` is authoritative. This record holds the baseline and the review deltas.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `Architecture Design Complete` (SR-003) with the SR-004 addendum | SR-003, SR-004 | N/A | Fail | AR-901, AR-902, AR-903 |
| ARCH-REV-002 | Round 2 / SR-005 answers ARCH-REV-001 | SR-005 | Fail | Fail | AR-901 … AR-903 resolved; AR-904 (new, text) |
| ARCH-REV-003 | Round 3 / the AR-904 text fix | SR-005 | Fail | Pass | AR-904 resolved; N-905 |

## Revision Entries

### ARCH-REV-001 — First review: careful vocabulary work; stored definitions, the compiler claim, Memory Sync's name

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-vocabulary/tickets/in-progress/node-vocabulary/design-review-report.md`
- Review round and trigger: round 1. `Architecture Design Complete` (SR-003, `5b6fd22982`), then the SR-004 addendum (`0b72123468`: Step 1b removes `compatibilityVersion`; the phone apps' saved records become entries). Reviewed at `0b72123468`.
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-review.md`; no prior findings.
- Relevant solution revision IDs: SR-003, SR-004
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What was established:
  - The behavior basis is confirmed, and `Large` / `High` is confirmed.
  - Reviewed under Principle 15 (`autobyteus-agents` `b87a507`) and the updated design examples.
  - The stored-name mapping owners, Step 1b and Step 3's single step pass.
  - The tool rename has an unlisted stored consumer: definitions' `toolNames`. The tool shipped in v1.5.8; exposure matches by name and ignores unknown names.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-901 (Medium, Requirement Gap): a persisted-data decision for stored definitions naming `list_available_nodes`, either a sealed migration or an accepted behavior change, for the user to decide; schedule the PTM package update with the release.
  - AR-902 (Low): list the entry-ID carriers the compiler can't see; make AC-901's check concrete.
  - AR-903 (Low): rename Memory Sync's `sourceNodeId` / "Source node id" in code and UI, keeping its stored and wire names through their owners; FU-002 keeps the semantic question.
  - Non-blocking: N-901 … N-904.
- Material classification changes: none.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RSK-901 (accepted).

### ARCH-REV-002 — Round 2: round-1 findings resolved; two contradictory sentences remain

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-vocabulary/tickets/in-progress/node-vocabulary/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer's SR-005 (commit `2b11eb4169`).
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-review.md` § Round 2; AR-901 … AR-903, N-901 … N-904.
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Fail` (`Design Impact`, text only)
- What changed in the review result: each round-1 item was verified in the requirements and design. A search for leftovers found two places that still state the old decisions.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-901 | Open (Medium, Requirement Gap) | Resolved by the user's decision | REQ-906 exception; Step 3 release note | The user: agent configs are another ticket; no migration, no alias |
| AR-902 | Open (Low) | Resolved | Step 4 carriers (`electronApplication.ts:126-260`, `preload.ts:45-46`, `workspace-shell-window-registry.ts:44`); AC-901 per-identifier list | — |
| AR-903 | Open (Low) | Resolved | REQ-910; Step 5b | `sourceId` / "Source ID" in code, GraphQL, the hub wire and the UI; stored names kept through three owners; FU-002 narrowed |
| N-901 … N-904 | Notes | Done | `GLOSSARY.md` with links from § 1 and `DESIGN.md`; the 426 branch removed; FU-001 marked; the owners named | The Verification line still lags (AR-904) |

- New or remaining finding IDs: AR-904 (Low, text): § Verification points to Step 1's owner list and adds `sourceNodeId` to the word list; REQ-903 and the Scope Guardrail stop saying "agent configs".
- Material classification changes: none (`Large` / `High`).
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RSK-901 (accepted).

### ARCH-REV-003 — Round 3: text aligned; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-vocabulary/tickets/in-progress/node-vocabulary/design-review-report.md`
- Review round and trigger: round 3; the AR-904 fix (commit `f9d826f1b6`).
- Triggering role, report path, and finding IDs: Solution Designer; AR-904.
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: `Fail` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result: § Verification, REQ-903 and the Scope Guardrail were verified at `f9d826f1b6`. A search found no remaining "agent configs that name it" or "two mapping owners". RSK-902's wording still overstates the compiler (N-905, non-blocking).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-904 | Open (Low, text) | Resolved | design-spec § Verification lines 190-195; requirements REQ-903, Scope Guardrail lines 58-59 | Points to Step 1's owners; `sourceNodeId` and `list_available_nodes` constrained; agent configs out of scope per REQ-906 |
| AR-901 … AR-903 | Resolved | Resolved (unchanged) | — | — |

- New or remaining finding IDs: none blocking. N-905 (reword RSK-902).
- Material classification changes: none (`Large` / `High`).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: RSK-901 (accepted).
