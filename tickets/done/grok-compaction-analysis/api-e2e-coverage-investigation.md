# API/E2E Coverage Investigation — Grok Build compaction detection and raw-trace rotation

## Investigation Meta

- Ticket folder: /Users/normy/autobyteus_org/autobyteus-worktrees/grok-compaction-analysis/tickets/in-progress/grok-compaction-analysis/
- Requirements: requirements-doc.md (SR-002, Approved U02). Investigation: investigation-notes.md (G01–G18). Solution record: solution-revision-record.md. Design: design-spec.md. Supplements: probes/, solution-handoff.md.
- Implementation: implementation-handoff.md, implementation-revision-record.md (IR-001, commit 20d4a9441, local only).
- Design review / architecture review / code review: `N/A — not applicable` (direct route).
- API/E2E: api-e2e-revision-record.md, api-e2e-test-case-ledger.md; revision `API-REV-001`; round 1.

## Routing Classification

Medium / Low; direct low-risk → delivery; test-code review `Not Required — direct low-risk route`.

## Requirement Basis

- REQ-G1: each Grok `auto_compact_completed` produces one rotation-eligible boundary and one archive, with tokens and duration; idempotent on duplicates.
- REQ-G2: an automatic compaction is one activity (started → completed); a manual one is a single completed activity.
- REQ-G3: a started compaction whose turn ends first, or a failed/cancelled report, closes as failed with no rotation.
- REQ-G4: `/compact` stays native; load replays are not re-recorded; other runtimes are unchanged.
- DEC-G3: replay plus a gated live E2E (RUN_GROK_E2E=1) with a temporary GROK_HOME low threshold.

## Scenarios And Real Usage

- Designer: automatic, manual `/compact`, interrupt during automatic, cancel during manual (no notification), no-op `/compact`, restore replay.
- Added: RU-1 reopened history after compactions (GraphQL); RU-2 terminate → restore → continue (`session/load` replay must not record anything again).
- Constraint (U01): the user has few Grok credits, so a single live run.

## Boundaries

| Surface | Affected | Evidence |
| --- | --- | --- |
| ACP converter / tracker, session routing | Yes | units with real Grok 1.0.46 traffic through the real ACP connection |
| Grok mapping / payload | Yes | units; live |
| Websocket COMPACTION_STATUS, GraphQL memory/history | Same contract | live E2E (real Studio server) |
| Web rendering | No change | web spec (Grok shapes); the same provider contract was already rendered in packaged-app journeys for Claude (started→failed/completed), Codex (started→failed, started→completed) and AGY (completed-only) |
| Process/lifecycle (restore) | Yes (in-turn rule) | unit restore replay; live restore (added) |

## Project Execution Discovery

- TESTING.md (root; this change adds a Grok compaction live row). Live gate: `RUN_GROK_E2E=1` (GROK_E2E_MODEL, GROK_E2E_REASONING_EFFORT). grok 1.0.46 (~/.grok/bin). The live test uses a temporary GROK_HOME with an auth.json symlink and `auto_compact_threshold_percent = 10`; ~/.grok is only read through the symlink.
- Typecheck: `tsc -p tsconfig.build.json --noEmit` (pre-existing rootDir issue in the `typecheck` script).

## Existing Coverage Inventory

| Path | Validity | Action |
| --- | --- | --- |
| tests/unit/agent-execution/backends/acp/acp-session-update-converter.test.ts | Still Valid | run |
| tests/unit/agent-execution/backends/grok/grok-build-compaction.test.ts | Still Valid | run |
| tests/e2e/runtime/grok-build-compaction-live.e2e.test.ts | Needs Update + needs a live pass | corrected memory query (implementation) not yet run live; add reopened history and restore |
| autobyteus-web agentStatusHandler.spec.ts | Still Valid | add Grok shapes |

## Durable Coverage Changes

| Case | Path | Requirement |
| --- | --- | --- |
| E2E-L1 (update) | grok-build-compaction-live.e2e.test.ts: reopened history via GraphQL (one completed row; work since the latest compaction); terminate → restore → short turn: no repeated operation id, segments grow only with new completions | REQ-G2, REQ-G4, RU-1, RU-2 |
| WEB-1 (add) | agentStatusHandler.spec.ts: Grok automatic, abandoned and manual each one row | REQ-G2, REQ-G3 |

## Execution Plan

1. Units + typecheck.
2. Sweep HEAD vs base ea826a5e4.
3. Web specs.
4. One live run of the updated E2E.

## Broader Validation Decision

`Required` — one live run through the real server (websocket + GraphQL + restore). A desktop journey is not selected: it would cost a second set of Grok credits (the user's constraint), and the web contract is identical to the three runtimes already rendered in packaged-app journeys. The Grok-specific shapes are covered by the web spec.

## Not Tested

| Behavior | Reason |
| --- | --- |
| auto_compact_failed / auto_compact_cancelled live | never observed (G14); unit only |
| Grok process crash during compaction live | not inducible cheaply; unit (interruptTurn covers runtime failure) |

## Decision

Proceed `Yes`; reroute `No`.
