# Implementation Revision Record

The current code and `implementation-handoff.md` are authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-architecture-design.md`, initial | N/A | `Initial Baseline` | `SR-001`; ARCH-REV/CRR/API-REV/DR `N/A` | Implemented, ready for direct API/E2E |

## Revision Entries

### IR-001 — Release smoke runner, pinned live models, Antigravity and AutoByteus smoke cases, release/testing docs

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/release-smoke-new-run-skill-links/handoff-architecture-design.md`, initial round
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete at `8f37ab5eb8`. Implementation-scoped checks pass (IMP-01..05, IMP-08). The full live smoke passes for Claude, Codex, Antigravity and AutoByteus; on Grok, new run + restore passes, and the team member and collision cases are blocked by Grok's external free-usage quota (IMP-07).
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..003; REQ-001..008; AC-001..009
- Implementation delta:
  - New `scripts/release_smoke.py` (required-case list, preflight, clean env per step, serial vitest with JSON reports in a temp folder, fail-closed verdict, summary, worktree guard; reads vitest's "Failed Suites" error from the step log) and `scripts/tests/test_release_smoke.py` (21 tests).
  - Live suite: pinned cheapest models with env overrides, an unavailable model fails with the available list, stale candidates and fallback removed, turn-error assertion messages, header notes.
  - Baseline fix (its own commit `8e65be9e6f`, TESTING.md Rule 9): the live suite read only `SEGMENT_CONTENT`. Since autobyteus-139 (`43b685b906`, 2026-10-18) the Team socket sends `SEGMENT_CONTENT_BATCH`, so the team-member case saw empty text on every runtime (IMP-06). Cause in the test; no product defect.
  - AGY suite: E09, E10. Native suite: two release smoke cases; the deterministic LLM records its messages.
  - RELEASE.md "Release smoke check"; TESTING.md row (own `docs(testing)` commit).
- Changed files or areas: `scripts/release_smoke.py`, `scripts/tests/test_release_smoke.py`, `autobyteus-server-ts/tests/e2e/runtime/{workspace-skill-links-live,agy-linked-skills-transport,configured-skill-on-demand-loading}.e2e.test.ts`, `RELEASE.md`, `TESTING.md`, ticket `evidence/`
- Local validation and result: see the handoff's Checks Run, IMP-01..08.
- Next recipient or routing: direct API/E2E per `get_handoff_rules`
- Remaining limitations or risks: Grok's rolling 24 h free-usage quota (a full smoke spends many Grok tokens). Grok's team member and collision cases are not yet re-proven after the baseline fix. A fully green AC-001 run remains for API/E2E.
