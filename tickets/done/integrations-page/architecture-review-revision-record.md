# Architecture Review Revision Record — integrations-page (autobyteus-337)

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / design handed for independent review | SR-006, SR-007, SR-008 | N/A | Fail (Requirement Gap + Design Impact) | AR-001…AR-006 |
| ARCH-REV-002 | Round 2 / SR-009 revision | SR-009 | Fail | Pass | AR-001…AR-006 resolved; AR-007…AR-009 new (non-blocking) |

## Revision Entries

### ARCH-REV-001 — Baseline: stale ACs, import outcome mapping, help-link scheme

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page/tickets/in-progress/integrations-page/design-review-report.md`
- Review round and trigger: Round 1. Solution Designer handoff (Large / High). Design approval `Obtained`.
- Triggering role, report path, and finding IDs: Solution Designer, `handoff.md`; no prior findings.
- Relevant solution revision IDs: SR-006, SR-007, SR-008
- Prior authoritative decision: N/A
- Current authoritative decision: Fail
- Baseline established:
  - The skill-source import, update, remove and auto-update paths were traced.
  - Effective skills and the catalog's precedence rule were read.
  - The manifest contract and the repository layout were read.
  - Point 1: the per-call check is a faithful guard for REQ-005.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - Blocking: AR-001 (ACs/QR-002/design header contradict the approved REQs and UI; alignment only), AR-002 (`ALREADY_IMPORTED` / `NOT_A_LINK_OR_PATH` have no server path; a GitHub duplicate is not an error today), AR-003 (`token.help` links: `https:` only, text nodes, external opener).
  - Fix in the same revision: AR-004 (duplicate integration ID across sources; P-001), AR-005 (proxy refusal texts and their name source after DEC-006), AR-006 (async `removeSkillSource`/`addSkillSource`).
- Material classification changes: None (Large / High).
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: P-002 (a local folder deleted by hand leaves a token), R-2, R-3.

### ARCH-REV-002 — Re-review of SR-009: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page/tickets/in-progress/integrations-page/design-review-report.md` (section "Round 2")
- Review round and trigger: Round 2. SR-009 addresses AR-001…AR-006 within the user-approved intent.
- Relevant solution revision IDs: SR-009
- Prior authoritative decision: Fail
- Current authoritative decision: Pass
- What changed:
  - DS-002 was redrawn with the outcome mapping.
  - DEC-017 is accepted as the Solution Designer's decision within the direction.
  - Every claimed change was verified at its line in the current artifacts.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium) | Resolved | requirements AC-001/AC-002/QR-002/SCN-001; design header | Aligned with REQ-002/REQ-009/r2 |
| AR-002 | Open (Medium) | Resolved | DS-002 mapping table | `ALREADY_IMPORTED {kind}`, `NOT_A_LINK_OR_PATH`, the other codes; new IDs only |
| AR-003 | Open (Medium) | Resolved | Dependency Rules | `https:` only, text nodes, external opener, tested schemes |
| AR-004 | Open (Low) | Resolved | DEC-017; `reservedIds` | Import refusal + catalog keep-one + scoped disconnect |
| AR-005 | Open (Low) | Resolved | "Proxy Refusal Texts" | New texts; manifest name via `nameOf` |
| AR-006 | Open (Low) | Resolved | Interface row | Async signatures and resolvers |

- New or remaining finding IDs: AR-007 (DS-002 bullets vs interface option shape), AR-008 (use the skill catalog's source precedence for "earliest"), AR-009 (requirements L5-6 don't note the SR-009 AC alignment). All are Low and non-blocking.
- Material classification changes: None (Large / High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: R-2 (all-installed agents get access), R-3 (per-call definition read cost), R-4 (a hand-deleted local folder leaves a token).
