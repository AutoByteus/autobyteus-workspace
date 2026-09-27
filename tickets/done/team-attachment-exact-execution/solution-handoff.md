# Architecture Design Complete — startup recovery / SR-004

## Result and urgency
Package docker-image-http400-20260926 / team-attachment-exact-execution. R2 Approved; D2 Ready for fresh independent review. task_size Medium / architectural_risk High. Production v1.4.87 startup incident remains OPEN; API-REV-002 FAIL is the current validation result. This is a completed recovery design, NOT a fixed build or permission to modify installed data.

The original exact-agentRunId attachment refactor remains intended. Released conversion incorrectly assumes every retained Team directory has a tree, although preceding migrations intentionally preserve missing-tree residues. Two new global SUCCEEDED-only startup guards compound the error. Actual installed-copy evidence reproduces this. Previous review/implementation/release passes describe R1/D1, not recovery readiness.

## Approved intended behavior
User explicitly requires missing/incomplete historical packages preserved but not listed/loaded as usable, independently valid runs and new work available, truthful explicit warning dispositions rather than majority-success labels, and cross-root reference isolation. No deletion, fabricated success, ledger reset, or address fallback. Approval was verified in API chat 01a0def0-27cd-7b23-bc09-6749275134d9, user turn 01a0e0ef-aee1-75a0-8424-212cf12d8613, with direct current-chat clarification and urgency. Requirements document records the full approval basis.
User also requires ONE document titled Data Migration Guideline, preferably rename/update existing, source-backed examples, and mandatory future design consultation. User expressly authorizes communication using original specialist thread IDs. No new task execution requested.

## Workspaces and finalization
Software: /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery
Branch codex/team-attachment-startup-recovery; refreshed origin/personal base a35060c58d923311de496e75aa3ea0209708d8b3; finalization target personal.
Companion authoritative agents repo: /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-migration-workflow
Branch codex/team-attachment-migration-workflow; refreshed origin/main base 1b1a75ee57271745424030e9289a699523ff34a6; finalization target main.
Both isolated, uncommitted. No recovery runtime implementation, live-data change, commit, push or release performed by Solution Designer. Shared software checkout's uncommitted API incident evidence is preserved, copied into this cumulative reopened ticket; shared agents checkout's unrelated edits untouched. Delivery must reconcile preserved evidence, not discard it. Old archived/worktree paths map to this package by unchanged relative suffix; original records remain historical.

## Canonical package
/Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution
Required current authorities:
- requirements-doc.md — approved R2, REQ-007..010 / AC-008..011 added; R1 identity intent retained.
- investigation-notes.md — cumulative evidence and source investigation E4-01..06.
- design-spec.md — D2 scoped conversion and independent current admission, file ownership, sequencing, risks and test matrix.
- solution-revision-record.md — cumulative SR-001..004.
- api-e2e-test-review-report.md and api-e2e-revision-record.md — current API-REV-002 FAIL; prior API-REV-001 historical.
- api-e2e-evidence/startup-incident/incident-report.md, installed-inventory.json, installed-migration-records.json, minimal-reproduction.log, copied-memory-reproduction.log, cleanup.json — installed failure and copy-only diagnostic evidence, not corrected-startup proof.
- recovery-evidence/workflow-prevention.md — companion authoritative skill scope/integration requirement.
- recovery-evidence/design-D1-superseded.md, requirements-R1-historical.md, solution-handoff-SR003-historical.md — historical basis, not current authority.
Cumulative design-review-report.md, architecture-review-revision-record.md, implementation-handoff.md, implementation-revision-record.md, implementation-evidence/, code-review-report.md, code-review-revision-record.md, remaining api-e2e-* artifacts/evidence, docs-sync-report.md, handoff-summary.md, release-notes.md, release-deployment-report.md, delivery-revision-record.md, delivery-evidence/ retained. Independent recovery review/implementation/delivery artifacts: not yet produced; original passes must not be repurposed. Product supplements N/A — not applicable.

## Guideline and prevention candidates
/Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/autobyteus-server-ts/docs/design/data_migration_guideline.md
Renames production_data_migration_conventions.md, retains existing policy, adds narrow admission rules, worked Team V2/Org/cross-root/token-usage/v1.4.87 examples, and mandatory worksheet. Maintained server documentation links updated; no competing guide.
Companion modifications are SKILL.md and references/architecture-design.md beneath:
/Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-migration-workflow/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer
Skill validator Pass and both scoped diff checks Pass. Not deployed/active until companion review/integration.

## Migration identity answer
Correct the implementation of existing migration ID 20260926_team_context_file_execution_locators_v1 and ship it in a new application release. Existing runner retries FAILED on startup; a second migration cannot repair an earlier startup blocker merely by existing later in the sequence. Terminal SUCCEEDED/SUCCEEDED_WITH_WARNINGS are not automatically rerun, so current admission must independently validate current data on every startup. No manual ledger edits or restoration over newer writes. Review and verify .87 FAILED retry, terminal-success admission, and any existing journal state explicitly.

## Review focus and expected output
Review D2 against R2, not the superseded D1 blanket policy. Keep this a proportionate correction in existing owners:
1. Explicit retained/excluded dispositions, trustworthy warning vs actual failure; preserve original bytes.
2. Independent current-only scoped admission, cross-root dependent exclusion without hiding unrelated valid roots; no list/direct-restore/file-read bypass or circular catalog validation.
3. Released journal/backup compatibility, interruption/retry safety and same-ID runner behavior; no new generalized recovery subsystem.
4. Both startup entrypoints, actual installed-copy data with all eight residue roots intact, preserved hashes, repeat startup, browser/runtime usability and actual desktop startup proof. Moving suspect roots out of the test copy is diagnostic only, not acceptance.
5. Canonical guideline and mandatory companion workflow consistency, integration tracking.
Record fresh architecture review and applicable onward result. Do not perform live-data repair or publish based on this design alone. Material scope/requirement changes return to Solution Designer. Release authorization and installed deployment remain Delivery-owned gates; user urgency does not waive validation.

## Routing context
AgentTeam get_handoff_rules/send_message_to tools were searched and are unavailable in this execution. No lookup or successful team-address handoff is claimed. Retained Medium/High independent-review contract plus explicit user authorization selects the ORIGINAL architecture-review chat 01a0ded0-a092-7ec1-bdfe-00b3b40645df via send_message_to_thread. Dispatch pending confirmation.
Existing downstream chats, for authorized recovery continuity (do not create duplicate executions): implementation 01a0ded4-7f09-7242-97b4-fa75a85c856f; code review 01a0deea-7dc5-7752-a767-312bf71c6af4; API/E2E 01a0def0-27cd-7b23-bc09-6749275134d9; delivery 01a0df32-0983-7c12-8457-1547bb4075ff. Findings return to current Solution Designer chat 01a0dec1-1b85-7cd1-b467-81c80eb3fc58. Only architecture review receives this primary handoff.
