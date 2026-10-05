# Implementation Revision Record — run-settings-ui-unification

The current code on `codex/run-settings-ui-unification` and `implementation-handoff.md` remain
authoritative. This record holds only the initial baseline and later implementation deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-002 Pass | N/A | `Initial Baseline` | SR-006, SR-008, ARCH-REV-002 | Implementation complete; local checks pass with no new failures; sent to code review |

## Revision Entries

### IR-001 — Initial implementation of the run-settings UI unification

- Triggering role, report path, and round: Architecture Reviewer
  (`/software_engineering_team/architecture_reviewer`), `design-review-report.md`, ARCH-REV-002 (Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: the implementation described in `implementation-handoff.md`
  (classification `Large` / `High`, confirmed).
- Related solution revision IDs: SR-006 (requirements), SR-008 (design).
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..BEH-009 (REQ-001..REQ-022, AC-001..AC-019).
- Implementation delta:
  - One start intent, `useRunStart`. It covers Run, "+", the heading switcher and the tree "+".
  - Two draft owners: `chatDraftStore` (Agent/Team, now with Team member overrides) and the new
    `agentOrgLaunchDraftStore` + `agentOrgLaunchService` (Org).
  - New `components/run-settings/*` built on the chat controls:
    - the settings card, member rows/section and the member settings drawer;
    - the members line, the target switcher and the subject header;
    - the Org launch page and the saved-run settings view.
  - Mention-only `@`. Draft candidates come from `draftMentionEligibility`, which mirrors the
    server's CollaboratorCandidatePolicy.
  - First-send mentions are kept for Agent and Team.
  - Other model settings (Codex Fast mode `service_tier`) are a chip or row, separate from thinking.
  - Start-surface tools toggle.
  - The old launch forms, panels, projections, types, dead copy and their specs are removed.
  - The e2e probes that used the removed forms or the `@` target picker are migrated.
- Changed files or areas: `autobyteus-web` only. See `implementation-handoff.md` → Key Files.
- Local validation and result:
  - Full web suite: no new failing files against the recorded baseline.
  - Targeted specs pass; vue-tsc shows no production errors in touched files.
  - The localization audit and both boundary guards pass.
  - Mobile specs: only the baseline-failing `MobileUxRefinement` remains failing.
  - Mocked-boundary probes pass: `fresh-run-auto-approval` (8/8) and `existing-run-model-config` (6/6).
  - Real-server visual checks are recorded in `evidence/implementation/`.
- Next recipient or routing: Code Reviewer (Large/High route).
- Remaining limitations or risks: see `implementation-handoff.md` → Known Risks. In particular,
  first-message mention admission for an Agent first send and a Team first send still needs API/E2E
  with real runtimes.
