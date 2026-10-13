# Architecture Design Complete — claude-interrupt-resume-fixture-types

## Result / Identity / Approval
- New Project Task **project_task_11c75527-3875-4664-a49c-d1c871064d5c**, stable package `claude-interrupt-resume-fixture-types`, current solution revision **SR-002**.
- Result **Architecture Design Complete**; requirements **Approved SR-001**, design **Ready SR-002**. **task_size=Small / architectural_risk=Low**, narrow four-file fixture/dev-declaration/scoped-check surface, no production contract/persistence/security/concurrency/ownership/deployment changes.
- Approval: Solution Designer within explicitly authorized Task direction; user informed by conversation “The fresh baseline reproduces the same seven TypeScript diagnostics…” (2026-10-13). Exact requirements-doc.md SR-001; no behavior-defining supplement. No Needs user decision/open blocker.
- Original Task Manager `/project_task_manager`, AgentRun `project_task_manager_a5f6d9d306e54970bafdad895bdf731d`, carried user dispatch approval “you can delegate the follow up ticket to the same team”. Earlier backlog-only/non-authorization wording is superseded by that explicit later dispatch.
- New work is separate from completed original repair; no old review Pass/final verification reused for this patch. Product/architecture-review/source-review artifacts **N/A — not applicable/not yet produced** pending configured route.

## Original Request / Goal / Done
Clean the seven baseline TypeScript diagnostics in Claude interrupt/resume E2E fixture/import graph, retain runtime behavior and all assertions/gate, truthful clean scoped compiler result; production typecheck green, target8+1, validated/reviewed proportionately and merged through normal Delivery.
Prior source fixture is finalized repair, original Task project_task_6d944a46-9cd1-4353-880a-3dc07ed3f66c **DONE**; original worktree removed. Original no-ff merge26887250676f and final published b238f2bf20 provide satisfied baseline only. API-F001 was repaired/resolved, CRR-002/API-REV-002 Pass and prior Terminal stay authoritative for *that* completed Task; this follow-up is not a new Fail/blocker on it.
Scope excludes repo-wide test typecheck/CI policy (Task7ea7804f), other stale fixtures (Tasks0c7efc37/aac4b26a), production contracts/API/runtime source, dependency runtime upgrades and release/deployment. Report a newly established different owning problem before expanding. No suppressions, compiler-policy weakening, assertion removal/behavior dilution or gate changes.

## Workspace / Base / Finalization
- Dedicated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types`, branch `codex/claude-interrupt-resume-fixture-types` (tracks origin/personal).
- Fresh fetched base **b238f2bf20624d80a70bdf75c321a36180f15fdc**; finalization target **origin/personal**, merge. No release requested; Delivery still owns explicit new user verification, latest-target integration/rerun, merge/push/cleanup. Prior Task user verification does not finalize this new Task.
- Shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` is dirty/unrelated; untouched. Frozen dependencies and server prebuild completed in dedicated workspace. Untracked application SDK dist must not be staged; stage explicit paths, never git add -A.

## Fresh Evidence / Cause
- Scoped baseline investigation uses same single-target/imported graph and **existing build compiler policy**, full diagnostics/no filtering. New investigation probe exits **1 for any diagnostic** (unlike original introduced-only helper).
- Untouched current base reproduces **7 diagnostics / exit1**: TS7016 ws declarations; TS7006 callback data/error/raw; TS2740 incomplete AgentDefinition; TS2353 canInterrupt key and TS2339 snapshot.can_interrupt. No other scoped diagnostic.
- Serial clean PATH/private HOME/TMPDIR prebuild then exact target command gives **8 passed / 1 live skipped, exit0**, no unhandled marker. This is baseline investigation, not final patch sign-off. Temporary HOME removed; worktree tests/.tmp is test-owned.
- ws runtime8.19.0 / locked transitive **@types/ws8.18.1**, but no server local declaration dependency. Installed real ESM declaration package has correct RawData/Error callbacks. Current AgentDefinition constructor supplies defaults from identical three semantic fields; prompt renderer reads only those fields. Production status payload/projection omit retired keys; actual interrupt uses active AgentRun, not stale projection metadata.
- Old helper's exit0 only means no introduced diagnostics; never continue using that as clean acceptance. User wants zero **total** graph diagnostics.

## Designed Bounded Delta / Expected Output
1. Add exact **@types/ws8.18.1 devDependency** to server and narrow importer lock change; reuse already locked declaration version, no ws/SDK/TypeScript/runtime upgrades.
2. Replace local prompt literal with existing **new AgentDefinition** using same name/description/instructions; demonstrate identical composed prompt. Remove obsolete `canInterrupt: snapshot.can_interrupt===true` from local status projection; don't restore production fields. Callback inference comes from real ws types; explicit current annotations only if needed, no any/never suppression.
3. Add **autobyteus-server-ts/tsconfig.claude-interrupt-resume-e2e.json** extending tsconfig.build.json, rootDir '.', noEmit true; sole include target E2E, exclude dist/node_modules, not tests. All imports compile normally; inherited build compiler flags/strictness unchanged. No hand-filtering/allowlist.
4. Named package command **typecheck:claude-interrupt-resume-e2e** = `pnpm prepare:shared && tsc -p tsconfig.claude-interrupt-resume-e2e.json --noEmit`; server prebuild prerequisites documented alongside optional check in existing target header. Root/global CI/typecheck scripts and global TESTING.md unchanged.
5. Keep eight cases, live gate/deadlines, all scripts/case bodies/matchers and actual child/IO/session/socket/app/private-cwd assertions unchanged. Current configured route must evidence proportionate review of this patch (direct-route self-review if no independent review selected), not use old CRR-002 Pass.
6. Implementation-scoped checks include honest clean command, effective-config/root membership, temporary negative type control failing same command/restored byte-for-byte, prompt equality, static assertion/case/gate/teardown preservation, production typecheck/frozen reproducibility. Independent API/E2E/Delivery execute exact target8+1 and scoped+production checks, inspect cleanup and relevant narrow regressions. Produce their own handoff/revision/validation artifacts; none exist yet for this new Task.

## Approval / Traceability / Classification Limits
BEH-001..003, SCN-001..003, UC-001/002, REQ-001..005, AC-001..006 in approved requirements distinguish scoped operational compiler maintenance, preserved runtime behavior and declared contracts. No new user UI or Product request; persisted data Not Affected. Initial size/risk is based on actual local delta, not previous package's broad evidence inventory.
Escalate any newly needed production/shared type/contract change, broader test/CI policy, runtime version/lock churn, altered prompt/behavior/gate/assertion or suppression before continuing; reclassify/reapprove through Solution Designer. No current material unknown/blocker. Live case still Not Tested, never paid inference/otherOS proof; scoped clean result never claims repo-wide test clean. Original repair remains DONE.

## Canonical New-Task Package / Evidence (Absolute Paths)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/handoff-architecture-design-complete.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/evidence/probe-current-types.cjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/evidence/dependency-install.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/evidence/prebuild.command.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/evidence/prebuild.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/evidence/prebuild.exit`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/evidence/current-base-types.command.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/evidence/current-base-types.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/evidence/current-base-types.exit`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/evidence/current-base-target.command.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/evidence/current-base-target.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/evidence/current-base-target.exit`

## Provided Evidence / Earlier Completed Context (Read Only)
- `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_11c75527-3875-4664-a49c-d1c871064d5c/context/ctx_b1919f50bca8__focused-types-r2.txt`
- `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_11c75527-3875-4664-a49c-d1c871064d5c/context/ctx_470c24b8892c__focused-types-r2.command.json`
- `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_11c75527-3875-4664-a49c-d1c871064d5c/context/ctx_c2ae2a624da3__claude-interrupt-resume-check-target-types.txt`
- `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_11c75527-3875-4664-a49c-d1c871064d5c/context/ctx_232253fb197e__implementation-checks.md`
- `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_11c75527-3875-4664-a49c-d1c871064d5c/context/ctx_d84c85d76328__requirements-doc.md`
- `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_11c75527-3875-4664-a49c-d1c871064d5c/context/ctx_c3de1cffbfe4__api-e2e-execution-coverage-report.md`
- `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_11c75527-3875-4664-a49c-d1c871064d5c/context/ctx_ffb726420052__api-e2e-test-review-report.md`
- `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_11c75527-3875-4664-a49c-d1c871064d5c/context/ctx_a14a5701eca7__code-review-revision-record.md`
- `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_11c75527-3875-4664-a49c-d1c871064d5c/context/ctx_296110586c77__solution-designer-terminal-receipt.md`
- `/Users/normy/autobyteus_org/delivery-receipts/claude-interrupt-resume-fake-cli/tickets/done/claude-interrupt-resume-fake-cli` (immutable finalized original cumulative package).
Old worktree paths in those historical reports are provenance only. Original raw logs/helpers copied to Task attachments remain historical; don't modify old authorities to make this new check pass. Canonical supplement inventory in investigation-notes.md.

## Applied Handoff Rules / Next Action
Full context persisted before lookup. `get_handoff_rules` returned review for Large/High, direct implementation for Small/Medium+Low, and receipt-gap correction. The single matching rule is **Architecture Design Complete + Small/Low → `/software_engineering_team/implementation_engineer`**, selected **direct implementation**. Initial independent architecture/source reviews **N/A — not applicable** under this route; current implementation self-review and independent executable validation remain required. No additional recipient/duplicate forwarding; no bypass via delegate_task. Success is only claimed after send_message_to receipt. Next expected output is implementation-ready tested narrow patch/current self-review/handoff, then independent executable validation and Delivery-owned finalization. No implementation, clean final compile or merge is claimed yet.
