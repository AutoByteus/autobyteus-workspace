# Implementation Revision Record: follow-ups-of-461-500

## IR-001 (baseline)

- **Trigger:**
  - ARCH-REV-003 Pass (the combined package);
  - ARCH-REV-005 (G-5 added, SR-011 / SR-012);
  - ARCH-REV-006 (the FU-021 environment probe, SR-013);
  - ARCH-REV-007 (SR-014: D-13b labels, D-14 FU-035 sequencing).

  Large / High.
- **Prior result:** N/A (baseline).
- **Upstream revisions:** SR-006 … SR-014; ARCH-REV-001, ARCH-REV-003, ARCH-REV-005, ARCH-REV-006, ARCH-REV-007. CRR / API-REV / DR:
  N/A.
- **Behavior / requirements:**
  - Implemented: REQ-001, REQ-002, REQ-004 … REQ-009, REQ-011 … REQ-014 and REQ-016.
  - REQ-010 (FU-035) is not in IR-001: step 0 is blocked by the Grok usage limit (IMP-011); IR-002 per D-14.
  - REQ-008's watcher part: the D-13b labels are in (`a4e7f18e6d`; IMP-013). AC-005's proof is API/E2E's (Linux 5 of 5).
  - REQ-003 and REQ-015 were dropped by the user.
- **Code delta:** the commits in `implementation-handoff.md` "Current Implementation Summary".
  - The steps run `75ee688dad` … `4277f1945e`.
  - Then `1eed3c4aff` (two files back under 500 lines) and `d8ffc77c8b` (G-5's budget constant, for the dependency
    direction), and `a4e7f18e6d` (SR-014's INCONCLUSIVE label).
- **Focused validation:** IMP-01 … IMP-13 (handoff "Checks Run").
- **Limitations:**
  - FU-035 waits for IR-002; the watcher proof waits for API/E2E's Linux runs.
  - M-6 is not strictly cold.
  - The e2e text updates and the G-5 browser render were not run by me.

## IR-002 (Local Fix for CRR-001)

- **Trigger:** Code Reviewer, `code-review-report.md`, CRR-001: Fail, Local Fix. Findings CR-500-001 and CR-500-002.
- **Prior result:** IR-001, ready for source review. **Current result:** both findings fixed; back to source review
  (Targeted Delta Review).
- **Upstream revisions:** SR-014, ARCH-REV-007, CRR-001. API-REV / DR: N/A.
- **ID note:** D-14 named FU-035's round "IR-002". Revision IDs go in round order, so FU-035's step 0 will be the next
  round after this one (IR-003).
- **Behavior / requirements:** REQ-001 / REQ-002 (AC-001, N3): code names only. No behavior changes.
- **Code delta** (`7eb6f94b9f`):
  - **CR-500-001:**
    - The `copy` field becomes `delegatedRun` in `delegate_task`'s existing-run input (`AssignToExistingDelegatedRunInput`)
      and in the delegation outcome (`TaskDelegationOutcome`), with all their readers.
    - Renamed identifiers:
      - `DelegatedRunRouterState`;
      - `TaskDelegatedRunPlacementLaunchNotes`;
      - `buildExistingDelegatedRunTaskMessage`;
      - `assertDelegatedRunAssignable`;
      - `ExistingAgentDelegatedRunInputSchema` / `ExistingTeamDelegatedRunInputSchema`;
      - `parseExistingDelegatedRunInput`;
      - `EXISTING_DELEGATED_RUN_TASK_ID`.
    - Comments in those files now say "delegated run".
    - The hosting-era comment in `message-recipient-resolution.ts` is replaced.
    - Kept: comments that cite base's behavior, `copyAddress` / `copyKind` (FU-500-04), the visible copy (FU-500-07),
      and the released migrations' frozen code.
    - The remaining comment wording (about 200 lines in modules not otherwise touched) is recorded as **FU-500-08**.
  - **CR-500-002:** the stale "defaults to the process port" line in `agent-run-command-coordinator.ts` is removed.
  - **Optional suggestion taken:** `GLOSSARY.md` lists FU-500-07's visible copy under Known leftovers.
  - **Optional suggestion not taken:** a `CollaboratorAddError` method owning the "{name} can't be delegated to: …"
    text, to keep this round's delta to the two findings.
- **Focused validation:**
  - `pnpm -C autobyteus-server-ts typecheck`: "production errors: 0; test-file errors: 1010 in 316 files (baseline 1010
    in 316 files)", PASS.
  - Units over `tests/unit/{agent-collaboration, remote-collaboration, agent-team-execution, standalone-agent-run-root,
    agent-tools, services, agent-execution, projects, available-agent-runtimes}` and `tests/architecture`: "Test Files
    410 passed | 4 skipped (414)", "Tests 3737 passed | 6 skipped (3743)".
  - `git grep -nE 'Copy[A-Z]|[a-z]Copy\b|assertCopy|CopyRouter' -- autobyteus-server-ts/src` now finds only the
    released migrations' frozen code and `DelegatedCopyOwnFileCompleteV1AppDataMigration` (a released migration's ID).
- **Limitations:** e2e files that read the wire result (`target_agent_run_id`) are unaffected; I didn't rerun them.
