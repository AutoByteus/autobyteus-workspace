# Architecture Design Result — team-reload-stale-member-instructions

## Result / Classification
Architecture Design Complete, SR-003. Requirements Approved (A-001). task_size=Small; architectural_risk=Low. Design is implementation-ready; implementation, executable validation, delivery and release/finalization have not been performed.

## Request / Approved Goal
Original user report: public English Bridge Team's Worker still shows previous agent.md instruction after Agent Package Creator updates source and user clicks Agent Teams Reload. Follow-up authorizes real UI experiments. Real unchanged-worktree packaged app reproduction confirmed updated Team + stale Worker while backend had latest Worker; separate Agents Reload control made Worker current. Then user explicitly approved: “cool. approve. now work on it” (A-001, 2026-10-03).

Approved scope: one successful Agent Teams Reload makes Team and referenced Agent content current before later inspection; includes instructions/description/tools, repeated reload, scoped/shared member freshness, first-load preservation and existing required-read failure/retry behavior. REQ-001–003, AC-001–004, BEH-001–003, SCN-001–003, UC-001–003. No behavior-defining supplements; no Product request. Source files, ownership/visibility/IDs, existing runs/history remain unchanged. No watcher, public package edit, existing-run instruction hot reload, GitHub update policy, schema/migration, new API or visual redesign.

## Completed Technical Solution / Evidence
Keep correction in existing Team store explicit refresh action: after successful existing backend Team refresh mutation, await Agent store's existing public query-only network reload, then keep existing Team network-only query/publication. That backend mutation already refreshes both server catalogs. Team action owns complete sequence/error/finally; Agent public action owns its data/transport/publication. Query-only Team reload used by package coordinators stays unchanged. No component duplicate sequence, second refresh mutation or new generic cache owner. Design explains failed-read partial-state limits and no atomic transaction promise.

Classification evidence: one production store action plus focused tests/docs/validation; existing public contracts and owners reused; no new persistence, security/visibility, runtime, material concurrency/deployment semantics. Post-approval investigation E-015–019 supports dependency/callsite/error/test findings. Escalate to Solution Designer for material contract/ownership/concurrency/persisted/visibility change instead of broadening Small/Low route.

## Canonical Implementation Package (Absolute Paths)
- Requirements / approval: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/requirements-doc.md
- Investigation / supplement authority: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/investigation-notes.md
- Ready design / classification: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/design-spec.md
- Cumulative revisions: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/solution-revision-record.md
- Current full result/handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/architecture-design-result.md
- Earlier investigation result/history: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/investigation-result.md
- Real pre-fix reproduction: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/browser-reproduction-report.md
- Controlled pre-fix probe: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/store-cache-probe.cjs and /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/store-cache-probe.log (historical bug assertions; not expected post-fix pass)
- Source snapshots: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/worker-source.md, /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/worker-source-config.json, /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/creator-simplification-result.md, /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/source-pins.txt
- Real UI excerpts: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/ui-observation-excerpts.md
- Real HTTP snapshots: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-before-edit.json, /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-after-edit-before-reload.json, /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-after-reload-and-control.json
- Linked disposable package fixture: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/reproduction-package/
- Setup/isolation/logs: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/install.log, /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/isolated-build.log, /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/isolated-start.json, /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/isolated-app.log, /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/isolated-stop.json, /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/isolated-list-after-stop.json
- User screenshots: four exact external absolute paths indexed in investigation-notes.md; supplied read-only evidence, not a new normative UI spec.
- Public source (read-only): /Users/normy/autobyteus_org/autobyteus-agents/agent-teams/english-bridge-team
- Independent architecture/code review artifacts: N/A — not applicable to selected Small/Low route, subject to actual rules; no reviews completed.
- Implementation/validation/delivery artifacts: N/A — receiving specialists own those phases.
- Product UI/UX/prototype: N/A — no request/visual change.

## Workspace / Approval / Constraints / Risks
- Task worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions
- Branch: codex/team-reload-stale-member-instructions
- Resolved refreshed base: origin/personal d6f6c7a9ff11f8a3a2f11aabd413de2ef8818b2b
- Finalization target: origin/personal; release/deployment approval not inferred. Delivery will own final integration and user verification.
- Current tracked production source unchanged. Ticket docs/evidence are uncommitted; prior local build generated untracked autobyteus-application-backend-sdk/dist/ and autobyteus-application-sdk-contracts/dist/; do not stage generated build content accidentally. Never git add . / -A.
- Real pre-fix instance iso-53752-8cc8 was stopped gracefully; own temporary root removed and ports released. No owned test process remains. Existing packaged build is pre-fix and must be rebuilt for real changed-build validation.
- Do not operate on user's running app or production data; use only worktree/test-owned sources/instance ports. Public package remains untouched.
- User's exact installed registration/binary still not independently inspected. Correctness of this missing-client-refresh path is reproduced in real unchanged-worktree product and control; it is not merely a mocked hypothesis. No material design blocker remains.

## Expected Next Work
Implement the design's local correction and focused durable self-checks for warmed member freshness, no duplicate backend refresh, sequential completion and errors/retry; preserve initial/scoped/shared behavior. Follow own applicable result-based handoff rules for independent checks/executable API-E2E/delivery. Validator must exercise changed-worktree real UI/source/HTTP journey and preserve/stop its owned instances. Delivery owns docs synchronization and explicit user verification/finalization; do not claim completed fix or reuse pre-fix binary as changed-source proof.

## Routing
Pending current rule lookup. Persist exact selected condition/address and successful handoff confirmation here; do not infer recipient or use delegate_task.

## Selected Rule / Route
2026-10-03 get_handoff_rules succeeded. Single matching rule: “When Solution Designer classifies the completed architecture package as Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low. Include the approved requirements, investigation notes, design spec, solution revision record, classification rationale and selected direct implementation route.” Exact recipient_address: `/implementation_engineer`. Selected direct implementation route skips independent architecture review only; design is complete and implementation self-checks/executable validation/delivery still apply. No Large/High or delivery receipt rule matches. Handoff confirmation pending.

## Handoff Confirmation
send_message_to returned accepted=true, code=DELIVERED to exact `/implementation_engineer`; target_agent_run_id=implementation_engineer_fa4b3b6504fa4561b67533ab60f2a510. Same result file attached via reference_files. Required handoff succeeded; Solution Designer stops here without duplicate forwarding, implementation or polling. Current fix is not yet delivered.
