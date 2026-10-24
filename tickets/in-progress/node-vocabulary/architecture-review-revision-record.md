# Architecture Review Revision Record — `node-vocabulary` (autobyteus-290)

The latest `design-review-report.md` is authoritative. This record holds the baseline and the review deltas.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `Architecture Design Complete` (SR-003) with the SR-004 addendum | SR-003, SR-004 | N/A | Fail | AR-901, AR-902, AR-903 |
| ARCH-REV-002 | Round 2 / SR-005 answers ARCH-REV-001 | SR-005 | Fail | Fail | AR-901 … AR-903 resolved; AR-904 (new, text) |
| ARCH-REV-003 | Round 3 / the AR-904 text fix | SR-005 | Fail | Pass | AR-904 resolved; N-905 |
| ARCH-REV-004 | Round 4 / SR-006 (U-3: stored names migrate) | SR-006 | Pass | Fail | AR-905, AR-906 (new) |
| ARCH-REV-005 | Round 5 / SR-007 answers ARCH-REV-004 | SR-007 | Fail | Pass | AR-905, AR-906 resolved; N-910, N-911 |

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

### ARCH-REV-004 — Round 4: sealed migrations sound in shape; hold-back owners and phone keys

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-vocabulary/tickets/in-progress/node-vocabulary/design-review-report.md`
- Review round and trigger: round 4; SR-006 (commit `f92030a027`) widens the scope by the user's U-3, reversing U-1. Project rule commit `b3d9c758f2`.
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-review.md` § Round 4.
- Relevant solution revision IDs: SR-006
- Prior authoritative decision: `Pass` (ARCH-REV-003)
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed in the review result:
  - Reviewed against Principle 5 and the updated Data Migration Guideline.
  - Verified:
    - the startup order (`server-runtime.ts:183-206`);
    - the identity service's lazy creation (`node-identity-service.ts:32-50`);
    - the capability mechanism (`app-data-capability-readiness.ts:15-20`; only two capabilities exist today);
    - the registry reader's tolerance (`nodeRegistryStore.ts:100-158`);
    - the renderer bootstrap plugins;
    - `nodeStore`'s browser-mode-only writes;
    - the phone apps' record fields and storage keys.
  - The four handoff points:
    - (1) the identity hold-back needs a named owner (AR-905);
    - (2) the call sites are identifiable (N-908);
    - (3) the SM-7 scope is confirmed (N-909);
    - (4) "no old name in current code" holds for the server and desktop, but not for the phone keys unless decided (AR-906).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-901 … AR-904 | Resolved | Resolved (unchanged by SR-006) | — | — |
| N-905 | Note | Done | RSK-902 reworded | Design § Risks |

- New or remaining finding IDs:
  - AR-905 (Medium): name the hold-back chain for `node_identity` (the identity service refuses without creating; the status route, `PeerGateway` and `PeerClient`, pairing and GraphQL answers) and `memory_sync` (a new capability: source loop, hub ingestion, GraphQL).
  - AR-906 (Low): decide the phone storage keys under rule 10.
  - Non-blocking: N-906 … N-909.
- Material classification changes: none (`Large` / `High`, now with persisted-data migrations).
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RSK-901 (accepted). Migration fixtures are built from the released writers, since the user declined a real-data read; N-907 makes SM-6 tolerant of older records.

### ARCH-REV-005 — Round 5: hold-back chains and phone keys; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-vocabulary/tickets/in-progress/node-vocabulary/design-review-report.md`
- Review round and trigger: round 5; the Solution Designer's SR-007 (commit `f75d537365`).
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-review.md` § Round 5; AR-905, AR-906, N-906 … N-909.
- Relevant solution revision IDs: SR-007
- Prior authoritative decision: `Fail` (ARCH-REV-004)
- Current authoritative decision: `Pass`
- What changed in the review result: § Hold-back chains and SM-9 / SM-10 were verified. `markCapabilitiesPending` was confirmed (`app-data-capability-readiness.ts:10`). The claim about how probes treat a missing `nodeId` was opened: the web probe and `PeerClient` call it "not an AutoByteus node", not "not identified" (N-910, non-blocking: REQ-913 holds).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-905 | Open (Medium) | Resolved | SR-007; § Hold-back chains | Both capabilities added and configured; `getNodeId` throws and never writes while held back; every consumer's answer and Memory Sync's gates named, with unit cases |
| AR-906 | Open (Low) | Resolved | SR-007; SM-9, SM-10; word list | (a) under rule 10: each app's sealed step renames the keys; record fields unchanged |
| N-906 … N-909 | Notes | Done | SR-007 | Different values fail and hold back; `createdAt` kept; SM-6 copies field by field and fails only on unreadable JSON; call sites `electronApplication.ts:362` and `19.clientDataMigrations.client.ts`; SM-7 confirmed |
| AR-901 … AR-904 | Resolved | Resolved (unchanged) | — | — |

- New or remaining finding IDs: none blocking. N-910 (the probes' message for a held-back node), N-911 (cite the phone call sites and boundary checks).
- Material classification changes: none (`Large` / `High`, with migrations).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: RSK-901 (accepted). The fixtures come from the released writers (no real-data read, by the user's choice).
