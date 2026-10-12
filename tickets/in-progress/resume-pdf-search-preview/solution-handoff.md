# Architecture Design Complete — resume-pdf-search-preview

## Outcome / request
Fix Files search `resume` → résumé PDF HTTP400 in investor-applications on user's localhost:8001 Docker environment. Delegator `/project_task_manager`, AgentRun `project_task_manager_2f7a8ea2d421446f8f22e4f616528547`; Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`, Task `project_task_1aefbe1a-dfb5-4ec1-b893-8423b09a12dd`.
Result: Architecture Design Complete, R1 approved within task direction by Solution Designer (user informed), SR-002 design complete. `task_size=Small`, `architectural_risk=High`. No source fix/delivery claim yet.

## Evidence-backed cause / intended solution
Read user screenshot personally, then confirmed full workspace ID in production registry and original file metadata. Live logs correlate exact PDF content GET400 with absolute-path denial; not a missing mount, wrong workspace or established PDF corruption. Original pdfinfo succeeds (2pages), original hash recorded.
Installed search strategies return absolute candidates; public WorkspaceFileExplorer forwards them unchanged; frontend creates a search TreeNode and encodes the same absolute path; protected relative-only reader correctly rejects before bytes. Reproduced with actual installed /app modules on own synthetic workspace, asserts absolute-result rejection and relative equivalent success, no live HTTP calls/data changes.
Design: convert/validate absolute candidates once at existing public WorkspaceFileExplorer.searchFiles boundary, emitting workspace-relative strings consistent with tree/file access. Keep strategy/index/cancellation/watchers and all protected content reader rules unchanged. Correct old public-absolute test, add durable search→protected read/browser render regression. This public response semantics correction plus live rollout context is High risk and needs configured review.

## Canonical package (absolute paths)
Root `/home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview`:
- `/home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/requirements-doc.md` (Approved R1/SR-001; approval conversation reference captured).
- `/home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/investigation-notes.md` (complete current/runtime/architecture evidence, screenshot source, original hash and relevant source/consumer inventory).
- `/home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/design-spec.md` (Ready SR-002; Small/High rationale, public method delta, production path/ownership map, safe delivery and checks).
- `/home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/solution-revision-record.md` (SR-001 and SR-002).
- `/home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/baseline-isolated-reproduction.log`.
- `/home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/runtime-failure-excerpts.log`.
- `/home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/installed-module-checksums.txt`.
Independent review artifacts: N/A — not applicable before initial review; no pass inferred. Product artifacts: N/A — not requested. Implementation/validation/delivery artifacts: not yet produced.

## Workspace / base / finalization
Isolated task worktree `/home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview`, branch `codex/resume-pdf-search-preview`. Base remote refs refreshed, `origin/personal` revision `2756d7b298ca5b203ebd2310d172b37a5d381b5c`; finalization target origin/personal under RELEASE.md. Shared checkout's unrelated untracked work is untouched.
Runtime source is NOT this worktree: PID61 executes `/app/autobyteus-server-ts/dist/app.js` on container port8000 with production `/home/autobyteus/data`, reports public URL http://localhost:8001. No docker executable/socket here; exact host image/tag/digest and external desktop frontend build unknown. Do not modify /app or restart process61 during implementation.

## Scope / constraints / gaps
Approved SCN-001–004/REQ-001–004/AC-001–004: fix nested lazy PDF result and consistent shared search-file identity, preserve absolute/traversal/outside path rejections, preserve documents/conversations/unrelated work, honest actual runtime state and cleanup. No résumé edits, path guard relaxation, PDF/native bypass, auth/migration/UI overhaul or automatic public release.
Executable validation must be test-owned clean env/data/ports and current worktree build per TESTING.md. User app is not a sandbox. Baseline isolated probe is root cause evidence, NOT changed-build or PDF render verification.
Downstream expectations: source fix/self-check and independent reviews per configured risk route; API/E2E GraphQL search→protected REST200/MIME/bytes plus real PDF viewer pages/canvas, text identity, safety rejections; then Delivery docs sync/integration, safe rollout coordination to8001, exact deployed build pin or precise blocker, explicit user verification, original checksum unchanged, rollback and cleanup report. If live restart would disrupt ongoing conversations, get user's direct timing/approval and necessary host access rather than silently restart.

## Cleanup at this authoring boundary
Created one task worktree/branch (retained for required downstream work). One own temporary fixture directory removed in finally; no test server/browser/external ticket/delegated agent created. No live service restart, document edits or production data mutations. Delivery owns final worktree/branch/instance cleanup; no claim those are already cleaned.

## Route
Applied get_handoff_rules on2026-10-12: Architecture Design Complete + architectural_risk=High matches only `/software_engineering_team/architecture_reviewer`. Requirements R1 currently approved, aligned SR-002 cumulative package ready for independent review. Direct implementation rule does not match (risk is not Low); receipt-gap rule does not match (no returned delivery receipt). Next action: independent architecture review, then configured review-owned downstream route.
