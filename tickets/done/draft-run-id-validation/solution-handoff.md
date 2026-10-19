# Solution Handoff — draft-run-id-validation

- Result: `Architecture Design Complete`
- Package: `draft-run-id-validation`; current SR: `SR-003` (design revised for ARCH-REV-001 AR-001 and AR-002)
- Original request: Project Task `project_task_5f097b56-100a-4a94-9fab-fbbe2e1d778f` from `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): "Security hardening (OBS-001): validate draft run IDs so a crafted `..%2F` ID can't reach another agent's draft files." It originates from OBS-001 in `composer-context-file-removal`. The user's decision was "definitely do it now".
- Done when:
  - No draft or context-file route accepts an ID that resolves outside its own owner folder.
  - Traversal gives 400 with `detail` and touches nothing.
  - Existing drafts keep working.
  - Unit and API/E2E tests cover it.
  - The work is merged. Release is the user's decision.
- Root cause: `Missing Invariant`. Three owner-ID fields (`agent_draft.draftRunId`, `team_member_draft.teamDraftId`, `agent_final.runId`) are only trimmed instead of passing `safeIdentity`. The containment guard throws a plain `Error`, which becomes a 500. Re-confirmed live on 2026-10-10: `GET` 200 and `DELETE` 204 cross-owner, and a deep escape gives 500.
- Approval: the user on 2026-10-10: "what is your suggestion, do it as you suggested." DEC-001 (validate `agent_final.runId`), DEC-002 (stored-filename allowlist) and DEC-003 (exact descriptor fields) are all Yes.
- Classification: `task_size = Small`, `architectural_risk = High` (security trust boundary on a shared input contract).
- Workspace:
  - Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation`
  - Branch: `codex/draft-run-id-validation`
  - Base: `origin/personal` @ `d28c56d5de8e5429e73dd7c42b78767cc531180c`
  - Finalization target: `origin/personal`
  - The worktree's git link was pruned externally once and has been recreated on the same branch.

## Artifacts

- Requirements (Approved): `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/investigation-notes.md`
- Design spec (Ready): `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/solution-revision-record.md`
- Prior attempt's handover (evidence): `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_5f097b56-100a-4a94-9fab-fbbe2e1d778f/context/ctx_ae6a85a189a1__handover.md`
- Origin evidence: `tickets/done/composer-context-file-removal/api-e2e-execution-coverage-report.md` (OBS-001) on `origin/personal`
- Prior review artifacts: `design-review-report.md` and `architecture-review-revision-record.md` in the same folder (ARCH-REV-001 Fail on the SR-002 basis; AR-001 and AR-002 resolved in SR-003)
- Product Design: `N/A — not applicable`

## Scope

- In scope: REQ-001..009 and AC-001..009.
- Out of scope:
  - Project-task context routes, which already validate.
  - Per-user or per-agent authorization.
  - Remote-access policy.
  - Release.

## Open risks

- An unknown third-party client sending untrimmed IDs or extra fields would get 400. No such client exists in the repo.
- Migration suites use `assertStoredFilename` and must pass.
- PB-001 (the agent-status-websocket cadence failure) is a pre-existing accepted exception.

## Route

- Rule applied: `architectural_risk = High` → `/software_engineering_team/architecture_reviewer`.
- Next expected action: architecture re-review of the SR-003 revision (D2 wording and example, added tests, removal-plan rows).
