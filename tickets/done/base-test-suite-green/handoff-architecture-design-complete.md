# Handoff — Architecture Design Complete

- Package: `base-test-suite-green`
- Result: `Architecture Design Complete`
- Current solution revision: `SR-002`
- Classification: `task_size = Medium`, `architectural_risk = Low` (rationale in `design-spec.md` § Task Size And Architectural Risk)
- Route applied: handoff rule "task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer` (direct implementation; independent architecture review not applicable)
- Architecture review artifacts: `N/A — not applicable` (direct route)
- Originating request: Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): fix the pre-existing failing tests on the base branch so the suite is green again; user 2026-10-08: "we definitely need it".

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green`
- Branch: `codex/base-test-suite-green`
- Base: `origin/personal` @ `ebf68c4af8e5fe2e6d893afcf75b0269b2c1ef65` (fetched 2026-10-08)
- Finalization target: `origin/personal`
- Local state: `pnpm install` and server `prebuild`/`build` were done. The application SDKs, devkit and Brief Studio were built for evidence; their `dist/` folders are untracked build output and must not be committed.

## Approval Basis

- Requirements `Approved` by the user in conversation, 2026-10-08: "Based on your investigation … try to fix the one which could be fixable. Let's say if the ones which cannot be fixed, then let it be. Let's go."
- DEC-001 = A: `typecheck` covers production `src` under the build policy; test-file type debt becomes a separate ticket.
- DEC-002 = A: an integration prerequisite prepare/check script.
- DEC-003 = A: unit/integration env isolation; E2E unchanged.
- These were user-directed defaults: the user approved without choosing options, so the recommended options apply.
- REQ-005: a test that cannot be fixed within this ticket is an accepted documented exception (test, cause, why). It is never deleted or skipped.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/solution-revision-record.md`
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/evidence/`
  - `clean-unit-inventory.txt`, `clean-integration-inventory.txt`, `clean-integration-prereqs-built-inventory.txt` (+ `.json`/`.log`)
  - `run-suite-clean-env.sh`, `failure-inventory.py`
  - typecheck logs and probes; prerequisite build logs

## Scope Summary

- `autobyteus-server-ts` only: `tests/unit` (41 failures / 13 files in a clean env, plus 2 env-induced), `tests/integration` (47 failures / 16 files with prerequisites; 42 more without them), and the `typecheck` script (TS6059, which suppresses all type checking).
- No product bug established. All failures are classified as stale tests, missing prerequisites or environment. UNK-001 (the I8 "duplicate and busy ACKs" timeout) must be confirmed during implementation.
- Out of scope: E2E, other packages, a CI gate, test-file type debt, package-root test residue.

## Safety Warning

Agent shells carry the live app's variables (`AUTOBYTEUS_DATA_DIR`, `AUTOBYTEUS_MEMORY_DIR`, `DATABASE_URL`, `DB_NAME`, all pointing at `~/.autobyteus/server-data`). Until the isolation setup is in place, run the suites only through `evidence/run-suite-clean-env.sh` or an equivalent `env -i` wrapper. For the AC-002/AC-004 inherited-env check, point those variables at a disposable sentinel folder, never the real user data (`design-spec.md` § Change Sequence step 6).

## Open Risks

- RISK-001: `origin/personal` moves daily; re-run on the latest base before handoff, and classify any new failures the same way.
- UNK-001: as above.
- An allowlist gap for an opt-in gated suite; derive the knobs from the gated files.

## Expected Output

Implementation per `design-spec.md`:
- baseline-fix commits labelled per TESTING.md Rule 9;
- `TESTING.md` updated;
- full clean unit + integration runs twice, the sentinel inherited-env run, and `typecheck` with a negative probe;
- an implementation handoff listing every fixed test (U*/I*/E* IDs) and any accepted exception with its cause.
