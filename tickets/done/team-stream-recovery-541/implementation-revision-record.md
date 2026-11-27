# Implementation Revision Record — team-stream-recovery-541

The current code and `implementation-handoff.md` are authoritative. This index locates implementation rounds; it is not
proof of downstream acceptance.

## Revision Index

| Revision | Trigger | Findings | Classification | Related | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer`: ARCH-REV-002 Pass, SR-002 with its amendment (N-4, N-5) | N/A (initial) | Initial; Large / High | SR-001, SR-002; ARCH-REV-001, ARCH-REV-002 | Implementation Complete; to code review |
| IR-002 | `/code_reviewer` CRR-002 failure-origin review of API/E2E F-1 | CR-001 (Local Fix); C-3 | Local Fix; Large / High | CRR-001, CRR-002, API-REV-001 | Implementation Complete; to delta code review |

## IR-001 (2026-11-27) — A to E as designed

- **Basis:**
  - requirements SR-002 (REQ-001…008, AC-001…010);
  - `design-spec.md` SR-002 with the N-4 and N-5 amendment (`fe0fd54a41`);
  - the design's Guidance: N-2, N-3 and the AR-001 walks.
- **Commits:**
  - `6dd0950606` A;
  - `29fc65eaaf` B and C;
  - `5a2ddf0fa2` D and E;
  - `12105e8360`, `e0a99d6b6d` and `a9ac2b40df`, the probes;
  - then the docs commit.
- **Delta:** see the handoff's table, D-A1…D-E2. New modules:
  - `teamStreamRecoveryStore`;
  - `teamStreamAutoRecovery` and `plugins/teamStreamRecovery.client.ts`;
  - `agentOrgPendingCommands`, `agentOrgConfigWorkspaces`;
  - the probe fixture `team-stream-gap.mjs` and `mobile-team-stream-recovery-cases.mjs`.

  Removed: `applyActiveRuntimePlaceholder`, `activeRunRecoveryCoordinator` and its spec, the
  `TEAM_STREAM_REOPEN_REQUIRED` throw on send, the English recovery literal and its unused key, the approval handler's
  null branch and `teamRunId`, the old file name, the wire's per-frame timers, and `onStreamRecoveryRequired`'s default.
- **Deviations (no Design Impact):**
  1. D-A1's state is in its own store, because `agentTeamRunStore` would have gone over 500 lines. The direction is
     unchanged.
  2. D-A3's shared attempt commits even when a joining reselect is superseded; the superseded caller selects nothing.
- **Validation:**
  - 38 reproductions fail on the base (IMP-001);
  - the suites, typechecks, guards and sizes (IMP-002);
  - the wire order and SGD-06 ×10 (IMP-003);
  - AC-001 desktop and phone, base vs branch (IMP-004);
  - AC-004 base vs branch (IMP-005);
  - AC-002 desktop and phone (IMP-006).
- **Classification recheck:** Large / High confirmed. Neither escalation trigger fired.
- **Next:** `/code_reviewer`.
- **Observations for the Solution Designer** (in the handoff):
  - the base's fixed-px font audit failure (`NodeRow.vue`, autobyteus-581);
  - the Apollo devtools-timer unhandled error in a full web run;
  - a live Team stream's invalid snapshot never entering `reopen_required`;
  - a gap in the middle of a turn recovering only after the turn ends (the unchanged verified read).

## IR-002 (2026-11-27) — CR-001: focus kept across the recovery commit

- **Trigger:** CRR-002 CR-001. An in-app execution link (a mounted Team's inspection, which does not join the recovery)
  moved the user to another member during an automatic attempt's read; the commit put the read's member back (API/E2E
  SDD-16, F-1).
- **Delta (`376b4bb9c0`):**
  - `teamRunOpenCoordinator.runTeamStreamRecovery` reads the replaced context's focus in `beforeContextCommit`;
  - `keepFocusAcrossRecovery` then loads and focuses that member on the new context (if still in the tree and the focus
    has not moved since), and rebuilds the navigation projection so the run tree's row follows;
  - a failed load keeps the read's member;
  - C-3: the stale `getTeamStreamRecoveryNotice` mock is removed.
- **Validation:**
  - 3 new coordinator specs, 2 of which fail on `9e508b3adf`;
  - adjacent specs and the web typecheck pass;
  - SDD-16 and SDD-17 pass. The first fix without the projection rebuild left the tree row on lead (IMP-007).
- **Residual:** an inspection still loading its member at the commit rejects and keeps the user's earlier focus
  (IMP-007).
- **Next:** `/code_reviewer` (targeted delta review), then API/E2E.
