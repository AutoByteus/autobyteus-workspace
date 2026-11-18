# Handoff Summary: large-runs-load-less (autobyteus-358)

- Status: verified from the evidence, proven from a clean clone, archived and finalized on `personal`. No release; none was asked for.
- Classification: `task_size=Large`, `architectural_risk=High`, reviewed route.
  - Source review CRR-007: Pass, 9.5/10. CRR-010 (the integration merge): Pass.
  - API/E2E: API-REV-004 Pass, then API-REV-005 Pass on the integrated head, 94%.
  - Test review: CRR-009 Pass; no new test change after it (CRR-010).
- Revisions: SR-008 / IR-007 / API-REV-005 / CRR-010 / DR-001 (Blocked: integration conflicts), DR-002 (Completed).
- Worktree (removed after finalization): `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less`, branch `codex/large-runs-load-less`.

## What Changed

Large runs load less and open faster:

- The run view carries no message log. Its size no longer grows with the log (AC-001, QR-001).
- The Team tab reads each participant's stored messages when opened (`CollaborationParticipantMessages`). It is merged with live messages by message ID, and a message appears once and in order (AC-002).
- Opening a team or org run loads only the focused member's projection and files; another member loads when opened (AC-003). A hub selection reads its view once (AC-004).
- The startup scan does not depend on log size, and creating a run does not rescan (AC-005).
- A damaged message log is reported with its reason in the Team tab (desktop and phone), and a resume is refused with the reason (AC-006). The app shows that refusal only in the console; that is FU-004.
- A copy with long unbroken tokens opens in proportion to its size (AC-007).

## Integration

- DR-001: `origin/personal` had moved from `efd28d5c4a` to `92fffca77a` (autobyteus-318 hygiene, -337, -285, -357, -345, beta.10). The merge conflicted in 7 files, so delivery aborted it and routed a Local Fix.
- IR-007 merged `92fffca77a` as `bd79cb1601`. CRR-010 passed it, and API/E2E rechecked the integrated head (API-REV-005).
- At delivery, the branch contains `origin/personal` @ `92fffca77a`, so no further merge was needed.

## Clean-Clone Proof (AC-008)

- Setup: `git clone --no-local --branch codex/large-runs-load-less` at `245d43b8b4`; `pnpm install --frozen-lockfile`; build the workspace dependencies; reinstall; build Brief Studio; server `prebuild`; `nuxt prepare`.
- Each check ran on its own and recorded its own exit code (`evidence/DEL-*-clean-clone.log`):

  | Check | Result |
  | --- | --- |
  | DEL-01 server typecheck | production 0; test files 1200/370, at baseline; exit 0 |
  | DEL-02 server `test:unit` | 7,743 passed, 9 skipped |
  | DEL-03 server `test:integration:prepare` + `test:integration` | 500 passed, 69 skipped, **0 failed**. The 6 base failures of FU-001 are fixed by the base (autobyteus-318) |
  | DEL-04 autobyteus-ts unit | 2,104 passed |
  | DEL-05 web typecheck | production 0; test files 99/43, at baseline; exit 0 |
  | DEL-06a/b/c `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | each Passed, exit 0 |
  | DEL-07 web suite | 4,993 passed, 2 skipped (packaged-output checks) |
  | DEL-08 Electron main | 291 passed, 1 skipped |
  | DEL-09 `test:e2e:large-runs-load-less` | LRL-001…005: 5 Pass, 0 Fail |

## Verification From Evidence

- The execution report's Acceptance-Criteria Proof covers AC-001…AC-008 and QR-001…006.
- `evidence/api-e2e/API-r5-integrated-head-recheck.json`, read directly:
  - LRL-001: a six-member Team opens with one projection, one file read and one participant-messages read, for the focused member only; another member loads only when opened.
  - LRL-002: an Org opens with nothing loaded until a member is chosen.
  - LRL-003: a live message appears once.
  - LRL-004: the damaged-log reason ("team_communication_messages_active.jsonl:line 2 is not valid JSON") is shown on desktop and phone, and the resume is refused with it.
  - LRL-005: one reload on stop and resume.
  - Large-hub probe S-001, L-001, L-002, L-012: one list fetch, 0 refetches, 63 rows = 63 stored.
- The clean clone reproduces LRL-001…005.
- No user check is needed.

## Docs

- The change's six docs are verified. The protocol doc carries both sides after IR-007's merge.
- Delivery replaced the nonexistent `TeamCommunicationStore` with `CollaborationParticipantMessages` in two diagrams and a section heading (`autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md`).

## Follow-ups (`follow-ups.md`, sent by the Solution Designer)

- FU-001: resolved by the base; server integration is green.
- FU-002: `assets/css/main.css` is never loaded.
- FU-003: `existingRunConfigStore.ts` is 503 lines, already on the base.
- FU-004: a refused resume's reason is shown only in the console.
- FU-005: a stale interrupt-result probe.
- FU-006: intermittent xterm teardown errors in the full large-hub probe.
- Coverage gap: the in-window reload branch is covered by unit and mutation tests only.

## Release

- Decision: no release (the RELEASE.md default; "No release unless asked").
