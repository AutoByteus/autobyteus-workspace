# SR-024 Solution Recovery Handoff — AGY Org Member Configured Skill

## Result

**Architecture Design Complete; task_size=Large, architectural_risk=High; independent architecture review required.** Stable package `antigravity-cli-runtime-redesign-20260924`, branch/worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924` / `codex/antigravity-cli-runtime-redesign-20260924`. Initially based on `origin/personal@40b1783f40c072b577ad9d0c5d8fe4f5418c6c38`; Delivery's current integrated user-test branch locally merged `origin/personal@af51ffa485e1f0d6a6f312cc9dfe9cdbc2f55d48` as `15149d03e3265bb4d8473f6a84f1447c4332d27c`. Finalization target remains `origin/personal`, subject to downstream gates and explicit user verification.

## Original request and current trigger

The user originally requested a fresh-base AGY CLI backend redesign, approved the SR-016 behavior basis and SR-021 AGY DONE-to-success mapping, and then tested Delivery Engineer's unsigned 1.4.80 Electron package. They now report that AutoByteus Org “still cannot start” and ask us to check the screenshot error while the app is running. The screenshot is `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_e96aafafa25a423994f2ebfe2dd53ae7/solution_designer_8d9e41ebc0e94d2e9d6e65dc64103aa9/context_files/ctx_6d33e7893c9e__image.png`.

The screenshot actually shows the Org configuration/tree **active**, so the earlier SR-023 `Starting Agent Org…` preflight/health defect is not the observed failure. The selected `/software_engineering_team/solution_designer` member fails on its **first prompt**, “could you check what handoff rules do you have?”, with the UI's exact message: `Failed to prepare agent run 'solution_designer_ad7d806883d744e688bc6227ad24362c'.` No provider ID or raw trace was created for that member.

## Evidence and confidence

- The current packaged Electron backend was PID 13478 on port 29695 with the user's normal data root. Its active Org tree `autobyteus_org_583b6d1d0fe4479ca3378b7bbab96340` has this member on `antigravity_cli`, `gemini-3.8-flash-low`, `PRELOADED_ONLY`, auto-execute on and the existing Temp Workspace. The model is listed by local `agy models`; the workspace exists; its former `.agents` MCP-collision directory is absent and global AGY MCP config has no servers. These eliminate obvious prior causes, not every possible earlier factory failure.
- The mounted `autobyteus-agents` team-local Solution Designer binds the `solution-designer` skill in `agent-config.json`. That private skill contains `design-examples.md` and `design-principles.md` **file symlinks to existing regular files in the same software-engineering team package's `shared/` directory**. The general skill loader accepts the source.
- Current source and the packaged 1.4.80 module `agy-configured-skill-materializer.js` call `rejectSymlinks` recursively before capsule copy. A disposable direct invocation of that **packaged** module with the actual skill path and selected workspace deterministically returned `AGY_SKILL_SOURCE_SYMLINK: .../solution-designer/design-examples.md`. No normal data, source package, workspace or global AGY config was modified by the probe.
- `AgentRunManager.prepareCandidateOnce` wraps non-domain errors in the generic `AgentCreationError` visible in the UI and retains the original only as `cause`. The normal server log did **not** record the actual original cause for this member. Therefore this is **high-confidence causal attribution from same-build deterministic reproduction**, not a directly captured live production stack. Missing raw-trace log entries are expected after pre-init failure, not the root cause.

The current failure is **AGY adapter-specific configured-skill preparation**, not a general Org-creation, selected-model, or Antigravity permission problem. Do not advise deletion of this legitimate shared skill or the Org.

## Approved behavior and design correction

The approved intent remains SR-016 plus SR-021; no renewed user approval is needed for this technical correction. Relevant supported path is SCN-002 / BEH-002 / REQ-002 / AC-002 (team/org member can start with its full applicable identity) and preservation of BEH-005 / REQ-005 / AC-004 (run-owned capsule, no user-workspace overwrite). Product Design N/A — not requested. Older ARCH-REV-004 Pass, IR-008/CRR-013 source Pass, API-REV-008 / 96% execution Pass and CRR-015 changed-test-code Pass applied to SR-023, **not** SR-024.

`design-spec.md` adds **DS-006**: retain per-run capsule isolation and `PRELOADED_ONLY`/`NONE`; record each resolved binding's winning source provenance in the existing ConfiguredAgentSkillResolver, then derive its trusted root: an agent-private skill under a team (the actual case) or a team-shared skill uses that team root; agent-private without team uses agent root; global fallback uses only its own skill root and never borrows team authority. Allow only file symlinks resolving to existing regular files **inside that boundary**; snapshot their bytes into ordinary capsule files, with no symlink left. Reject dangling, cyclic, directory, escaping, nonregular, collision or changed-during-copy sources. Replace the blanket `rejectSymlinks` + generic copy path; do not use unchecked dereferencing or a second skill resolver. Existing successful capsules are immutable and stay readable; failed member has no capsule/provider binding to migrate. No schema/data migration, MCP/config, identity, trace, permission, selected task-workspace or non-AGY runtime policy change.

## Review and downstream verification gate

Architecture Reviewer should assess DS-006's trust-root derivation, source/capsule ownership, TOCTOU/fail-closed copy semantics, classification and preserved approved scope. After a Pass and implementation-source review, API/E2E must test the **actual team-local Solution Designer skill** (both linked shared files) and negative out-of-root/dangling/directory-link/collision cases, `NONE`, unchanged source/workspace/global config and exact restore snapshot. A real disposable full Org must admit a first prompt to this member, produce AGY init/provider ID and visible response. Packaged Electron user verification must be repeated; an active 18-placement tree alone does not test lazy member activation. Do not alter or delete the user's normal Org data. Delivery remains on explicit user-verification hold, not finalization/release.

## Canonical and supplemental files

- Approved requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/requirements-doc.md`
- Current factual investigation and inventory: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/investigation-notes.md` (§SR-024)
- Current authoritative design: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/design-spec.md` (DS-006)
- Cumulative solution history: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/solution-revision-record.md` (SR-024)
- Prior architecture review: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/design-review-report.md` (ARCH-REV-004, prior basis only)
- Prior integrated delivery/user hold: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/handoff-summary.md`
- Product Design artifacts: N/A — not applicable.
- SR-024 independent review, implementation, code review, API/E2E and Delivery receipts: N/A — not yet performed.

## Handoff decision

`get_handoff_rules` matched Architecture Design Complete with Large/High risk to the exact recipient `/architecture_reviewer`. Direct implementation and delivery-receipt-gap rules did not match. Send confirmation is recorded in the agent message result; no duplicate forwarding of ARCH-REV-004's earlier Pass.

## In-review clarification — provenance and package coherence

Architecture Reviewer requested a precise source-origin contract and noted `requirements-doc.md` still identified SR-023. These are corrected in the canonical files on the same SR-024 review basis: the existing configured-skill resolver records which branch actually supplied each resolved `Skill` (`agent_private`, `team_shared`, `global`) plus a canonical trusted root; AGY consumes that binding provenance and validates containment. The actual Solution Designer skill is agent-private **within a team** and uses that team's root for its `shared/` links. A global fallback always uses only its own skill source root regardless of the agent's `sourceInfo`. Requirements remain Approved under SR-021 intended behavior, with SR-024 explicitly named as current design recovery. No reviewer verdict or new handoff is inferred from this clarification.
