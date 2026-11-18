# Architecture Review Revision Record: follow-ups-of-461-500

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / delivery 1 design handoff, with SR-006's scope reduction | SR-005, SR-006 | N/A | Pass | None |
| ARCH-REV-002 | Round 2 / combined package (delivery 1 + 2) | SR-007, SR-008, SR-009 | Pass | Fail | AR-001 |
| ARCH-REV-003 | Round 3 / SR-010, AR-001 answered | SR-010 | Fail | Pass | AR-001 (resolved) |
| ARCH-REV-004 | Round 4 / SR-011, G-5 stored model not offered | SR-011 | Pass | Fail | AR-002 |
| ARCH-REV-005 | Round 5 / SR-012, AR-002 answered | SR-012 | Fail | Pass | AR-002 (resolved) |
| ARCH-REV-006 | Round 6 / SR-013, FU-021 cause completed (test-only) | SR-013 | Pass | Pass | None (two notes) |
| ARCH-REV-007 | Round 7 / SR-014, FU-021 labels and proof; FU-035 sequencing | SR-014 | Pass | Pass | None (one note) |
| ARCH-REV-008 | Round 8 / SR-015, G-5 revised for CRR-003 | SR-015 | Pass | Fail | AR-003 |
| ARCH-REV-009 | Round 9 / SR-016, AR-003 answered | SR-016 | Fail | Pass | AR-003 (resolved) |
| ARCH-REV-010 | Round 10 / SR-017, re-dated migrations after 491's release | SR-017 | Pass | Pass | None |

## Revision Entries

### ARCH-REV-001 — Delivery 1 baseline: FU-020 migration, composition values, naming

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/follow-ups-of-461-500/tickets/in-progress/follow-ups-of-461-500/design-review-report.md`
- Review round and trigger: 1. The Solution Designer handed off SR-005, and SR-006 (the user drops the "task execution" code rename; REQ-003 dropped) arrived during the review.
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-review-sr005.md`; none
- Relevant solution revision IDs: SR-005, SR-006
- Prior authoritative decision: N/A
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established:
  - **The FU-020 migration** passes: folder-and-file admission, the founder's backup, per-file atomic commit, one late-predecessor follow-up, and `requiredOnStartup` without holding anything back.
  - **N1** passes as a recorded deviation.
  - **DR-1 and DR-2** pass: the explicit host values are not empty indirection.
  - **"To verify" items settled by the reviewer:**
    - both hosts initialize `ProjectTaskService` through `composeCollaboration`;
    - `delegated_copy_own_file_complete_v1` is `none`;
    - the coordinator getter's callers are `agent-stream-handler.ts:86, 502`.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material classification changes: none (`Large` / `High` kept after SR-006)
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer
- Remaining risks or uncertainty:
  - M-1's exact folder depths, so a preserved nested child is never rewritten early;
  - N6 callers;
  - the web storage check;
  - the cold-start cost.

### ARCH-REV-002 — Combined package: delivery 2 and SR-008 naming

- Canonical design review report: same path as above
- Review round and trigger: 2. The user combined delivery 1 and delivery 2 into one package (`handoff-architecture-review-sr009.md`, `319e487113`).
- Triggering role, report path, and finding IDs: Solution Designer; the handoff above; AR-001 (new)
- Relevant solution revision IDs: SR-007, SR-008, SR-009
- Prior authoritative decision: `Pass` (ARCH-REV-001, delivery 1)
- Current authoritative decision: `Fail`
- What changed in the review result:
  - SR-008's naming additions pass.
  - G-1 passes, with a note that the record script refuses to write when the registry doesn't start with the existing record.
  - G-3 passes.
  - G-4 / D-10 passes: verified that `parseLaunchConfiguration` ignores unknown keys, so the field is inert.
  - G-2 fails: the rows it keeps exactly are legacy-shaped in the late case, and the current reader rejects them.

#### Prior Finding Resolution

None (ARCH-REV-001 had no findings).

- New or remaining finding IDs: AR-001
- Material classification changes: none. The combined package is `Large` / `High`, and delivery 2 alone is `Small` / `High`.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: the round 1 notes (M-1 folder depths, N6, browser storage, cold cost) and G-1's self-check

### ARCH-REV-003 — SR-010: G-2 rebuilds legacy team index rows

- Canonical design review report: same path as above
- Review round and trigger: 3; SR-010 (`db3766ca65`), answering AR-001
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` G-2 and G-1; AR-001
- Relevant solution revision IDs: SR-010
- Prior authoritative decision: `Fail` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - G-2 keeps only reader-valid rows, rebuilds the rest from the row and the current tree by a field-source table, and writes through the store's normalizer.
  - The fixture asserts listing through the reader.
  - G-1's record script refuses a reordering.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Design Impact) | Resolved | SR-010 | `design-spec.md` G-2: the rule, the field-source table, `writeIndex` through `normalizeRow`, and the AC-010 fixture through the reader |

- New or remaining finding IDs: none
- Material classification changes: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer
- Remaining risks or uncertainty: the frozen store and validator for G-2, and the round 1 notes

### ARCH-REV-004 — SR-011: G-5, a stored model its runtime no longer offers

- Canonical design review report: same path as above
- Review round and trigger: 4. SR-011 (`5141c3b9df`) adds REQ-016 / AC-012 / D-12 from autobyteus-508 FU-001. The base moved to `d8dbeaa9ba`; M-7's "none" for `delegated_runs_own_runs_v1` holds.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` G-5; AR-002 (new)
- Relevant solution revision IDs: SR-011
- Prior authoritative decision: `Pass` (ARCH-REV-003)
- Current authoritative decision: `Fail`
- What changed in the review result: G-5's structure is sound (one check owner, one refusal builder, both start paths, the member-row note). But the check reads the catalog with no deadline, and CLI catalogs do a fresh discovery, so a slow catalog blocks or delays starts, against D-12.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-003) | Resolved | SR-010 | Unchanged by SR-011 |

- New or remaining finding IDs: AR-002
- Material classification changes: none (G-5 is Medium; the package stays `Large` / `High`)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: the round 1 notes and G-2's frozen store

### ARCH-REV-005 — SR-012: G-5's catalog read bounded

- Canonical design review report: same path as above
- Review round and trigger: 5; SR-012 (`9d119380dc`), answering AR-002
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` G-5; AR-002
- Relevant solution revision IDs: SR-012
- Prior authoritative decision: `Fail` (ARCH-REV-004)
- Current authoritative decision: `Pass`
- What changed in the review result: `storedModelOffer` reads with the existing 8 s model-list budget, and a deadline or error means `list_unreadable`. The cost is stated and tested.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-002 | Open (Design Impact) | Resolved | SR-012 | G-5 "Bounded"; `available-agent-runtimes-service.ts:41-43` |

- New or remaining finding IDs: none
- Material classification changes: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer
- Remaining risks or uncertainty: race the whole read (the autobyteus branch ignores the deadline); the earlier notes

### ARCH-REV-006 — SR-013: FU-021, the OS loses file events under load

- Canonical design review report: same path as above
- Review round and trigger: 6; SR-013 (`083adaa2d4`), from the Implementation Engineer's IR-001
- Triggering role, report path, and finding IDs: Solution Designer; `investigation-notes.md` "FU-021, continued"; none
- Relevant solution revision IDs: SR-013
- Prior authoritative decision: `Pass` (ARCH-REV-005)
- Current authoritative decision: `Pass`
- What changed in the review result: the cause was reproduced below our code (raw chokidar and `fs.watch`). The test labels a timeout ENVIRONMENT when a raw probe also gets nothing, with no retry or skip. D-13 and AC-005 are reworded, and FU-500-06 records recovery as a feature.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Material classification changes: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer
- Remaining risks or uncertainty: the proof line under load; optionally a same-window canary

### ARCH-REV-007 — SR-014: FU-021 labelled INCONCLUSIVE, proof on Linux; FU-035 sequenced

- Canonical design review report: same path as above
- Review round and trigger: 7; SR-014 (`537b8dfc53`, `01f51fe06b`), from the Implementation Engineer's IR-001 (IMP-011, IMP-012)
- Triggering role, report path, and finding IDs: Solution Designer; `evidence/implementation/IMP-012-watcher-three-runs-ambient-load.log`; none
- Relevant solution revision IDs: SR-014
- Prior authoritative decision: `Pass` (ARCH-REV-006)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - D-13b never claims a product fault under load: a timeout is labelled ENVIRONMENT or INCONCLUSIVE, and the proof moves to Linux inotify (and a quiet macOS when available). This answers round 6's note 2.
  - D-14 sequences FU-035's live step 0 as IR-002 after Grok's window resets, with nothing waived.
  - Note: align the proof text at `:469-471`.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Material classification changes: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer
- Remaining risks or uncertainty: FU-035 stays open until IR-002's live run

### ARCH-REV-008 — SR-015: G-5's on-demand models, definition first, inherited-layer wording

- Canonical design review report: same path as above
- Review round and trigger: 8; SR-015 (`9a3206da93`), from the code reviewer's CRR-003 (CR-500-003, -004, -005) after API/E2E round 1 failed
- Triggering role, report path, and finding IDs: Solution Designer; `code-review-report.md`; AR-003 (new)
- Relevant solution revision IDs: SR-015
- Prior authoritative decision: `Pass` (ARCH-REV-007)
- Current authoritative decision: `Fail`
- What changed in the review result: R1's owner and order are sound, as are R2 and R3. But R1's `unreadable` rule misses a partial multi-host failure (Ollama and LM Studio report counts only), which gives a false `not_offered` against D-12.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-002 | Resolved (ARCH-REV-005) | Resolved | SR-012, SR-015 | The budget race still wraps the read, now including the on-demand load |

- New or remaining finding IDs: AR-003
- Material classification changes: none
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: bound `listOptions`'s load by the same budget

### ARCH-REV-009 — SR-016: unreadable on any failed host

- Canonical design review report: same path as above
- Review round and trigger: 9; SR-016 (`688fdcbbfa`), answering AR-003
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` "G-5 revision (SR-015)" R1; AR-003
- Relevant solution revision IDs: SR-016
- Prior authoritative decision: `Fail` (ARCH-REV-008)
- Current authoritative decision: `Pass`
- What changed in the review result: `loadOnDemandModel` answers `unreadable` on any failed unit, `listOptions` is bounded by the same budget, and a two-host test is added.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-003 | Open (Design Impact) | Resolved | SR-016 | `design-spec.md:634` (the rule), `:645` (`listOptions` race), `:649` (test) |

- New or remaining finding IDs: none
- Material classification changes: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer
- Remaining risks or uncertainty: host-scoped models go unchecked while a sibling host is down (acceptable under D-12)

### ARCH-REV-010 — SR-017: migrations re-dated after 491's released entry

- Canonical design review report: same path as above
- Review round and trigger: 10; SR-017 (`d11924928f`), the Delivery Engineer's Design Impact (`release-deployment-report.md`)
- Triggering role, report path, and finding IDs: Solution Designer (from the Delivery Engineer); none
- Relevant solution revision IDs: SR-017
- Prior authoritative decision: `Pass` (ARCH-REV-009)
- Current authoritative decision: `Pass`
- What changed in the review result: the two unreleased migrations get new `20261119` IDs after 491's released `20261118` entry. 491 is classified `none` (verified on `origin/personal`: it deletes only two agent-definition folders), the JSON is seeded with beta.1's 46 IDs, and MO-1 is redone in the users' order.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Material classification changes: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer
- Remaining risks or uncertainty: none new
