# Handoff — Architecture Design Complete (autobyteus-53, SR-005)

- From: `/software_engineering_team/solution_designer`, 2026-11-19
- To: `/architecture_reviewer` (rule: architectural_risk = High)
- Package: `stopped-run-unavailable-model`. Project Task `autobyteus-53` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager` for the user.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model`, branch `codex/stopped-run-unavailable-model`. Base and finalization target: `origin/personal` @ `8430d9ef12` (fast-forwarded 2026-11-19; no commits of its own yet; the ticket folder is untracked).

## Request and goal

A stopped AutoByteus run whose model is no longer offered (e.g. deleted from LM Studio) can't continue on another AutoByteus model: the menu is empty and every save is refused. It still reproduces on `8430d9ef12` (probe; investigation notes SR-004).

The user's rule (DEC-003, explicit, 2026-11-02 and 2026-11-19):
- an equal or bigger context window → the same session;
- a smaller or unknown window → a fresh session that continues from the work journal, as a runtime switch does.

## Approval basis

- The requirements are Approved at SR-005. The rule is the user's own words; the Task leaves "the replacement rule" to the team.
- The Solution Designer decided the details within that direction (DEC-005..DEC-008) and informed the user on 2026-11-19.
- No behavior-defining supplements.

## Design summary

- Validation (`RunModelSelectionService`) returns an explicit `continuation` (`same_session` / `hand_over`), decided from:
  - the reference model, i.e. the last session's model (`pendingRuntimeSwitch.from` when pending);
  - the target's capacity;
  - the record's `handOver` capability (`available` / `unavailable` / `no_session`).
- The shared switch rule (`applyRuntimeSelection`) applies it. Pending field, activation, archive and notice are reused unchanged (they are runtime-agnostic: A-07..A-11).
- Data: directly usable, no migration.
- Classification: task_size `Medium`, architectural_risk `High`. The shared switch rule and the validation contract change across every surface, the persisted pending switch gets a new state, and "current model while pending" is redefined.

## Points worth the reviewer's attention

- The Principle 15 deviation: keeping the stored name `pendingRuntimeSwitch` for a same-runtime model hand-over, with the glossary updated instead of a migration.
- The rule rewrite must keep every existing undo/re-edit/switch outcome (AC-007; the design checks them against the target shape).
- DEC-005 changes one existing case on purpose: undoing a native→external switch onto a smaller native model now hands over instead of resuming unchecked.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/requirements-doc.md`
- Investigation notes (SR-004 reproduction, SR-005 A-01..A-17): `…/investigation-notes.md`
- Design spec: `…/design-spec.md`
- Solution revision record: `…/solution-revision-record.md`
- Reproduction probe: `…/probes/autobyteus-53-repro.test.ts`

## Open risks

See the design's Risks section. Follow-ups: none.

## Expected output

An architecture review Pass, which sends the package on to implementation, or findings routed per the team's rules.

## Route

- 2026-11-19: sent to `/architecture_reviewer` (run `architecture_reviewer_f8bfd574c60448e088b044ae551b3a68`), DELIVERED. Rule: architectural_risk = High.
- 2026-11-19: sent again at the user's request to `/architecture_reviewer` (run `architecture_reviewer_f8bfd574c60448e088b044ae551b3a68`), DELIVERED. The package is unchanged.

## Round 2 (SR-006, 2026-11-23): revised after ARCH-REV-001

- Base: fast-forwarded to `origin/personal` @ `1f761bc8db`; the probe still reproduces.
- AR-001: REQ-004 and AC-006 now agree with REQ-003 (DEC-009).
  - A third model equal to or bigger than the reference resumes the session.
  - A smaller or unknown-capacity one stays pending from the first model.
  - The case is added to the design's case checks, Data Contract Validation and sequence step 4.
- AR-002: the three launch validators get `handOver: "no_session"`:
  - `agent-org-run-service.ts:157`;
  - `launch-usability-check.ts:158`;
  - `model-routing-settings.ts:137`.

  They are added to Change Scope and the file mapping; the false statement is corrected.
- N-1: citations refreshed. The DEC-008 text goes only in `buildRuntimeSwitchBetween`. The glossary placement is beside "Lost runtime session" / "Session renewal", and "of another agent runtime" is dropped from "Pending agent runtime switch".
- N-2: AC-007 is reworded (E2E RS-* unchanged; the rule's unit tests keep their outcomes, each given its continuation).
- N-3: all three DEC-005 consequences are listed (requirements DEC-005; design Persisted Data).
- Skill update (Principle 17): a new Data Contract section with fields, examples and walks. It includes a read-only scan of this node's data: same-runtime pending switches already exist in two Memory Sync imports.
- Your null-reference suggestion is considered and kept as it is (the reason is in the decision table note).
- Classification is unchanged: Medium / High.
- Sent to `/architecture_reviewer` for round 2.
- 2026-11-23: ARCH-REV-002 Pass; the reviewer handed off to `/implementation_engineer`. No further routing by the Solution Designer.
