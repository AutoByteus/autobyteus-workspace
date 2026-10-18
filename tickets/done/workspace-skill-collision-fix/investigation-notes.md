# Investigation Notes

## Investigation Meta

- Package identifier: `workspace-skill-collision-fix`
- Request / ticket: Project Task `autobyteus-142` (from `/project_task_manager`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix` / `codex/workspace-skill-collision-fix`
- Resolved base remote / branch / revision: `origin/personal` @ `1c718202b2` (fetched 2026-10-18; v1.5.6-beta.2 release record commit; tag `v1.5.6-beta.2` = `1070bbbdf0`)
- Finalization target remote / branch: `origin/personal`; release `v1.5.6-beta.4` (beta, per RELEASE.md). Update 2026-10-18 (PTM): `v1.5.6-beta.3` was taken by autobyteus-136 (released from `origin/personal` @ `65cf41c6b4`, release record `9de0828aaa`) and still contains both start-up bugs; this fix must merge/rebase onto current `origin/personal` (includes `4964c61836`, `65cf41c6b4`) and ship as the next beta, `v1.5.6-beta.4`. The new commits change only `src/skill-update-notices/{domain/skill-update-notice-types.ts,services/skill-update-notice-builder.ts,services/skill-version-diff.ts}` in server `src` — no overlap with the restore inventory.
- Bootstrap result: worktree created with `git worktree add -b codex/workspace-skill-collision-fix … origin/personal`
- Bootstrap blocker: none
- Current solution revision ID: `SR-002` (sections marked *SR-001, superseded* are kept as history)
- Authorities read: `references/requirements-engineering.md` (2026-10-18); design gate: `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md` (2026-10-18)
- Investigation status: complete for SR-001

## Initial Request And Clarifications

- Original request: Task autobyteus-142 (see requirements doc). Reference files: `ctx_5f40b560e411__second-finding-new-runs-cannot-start.md`, `ctx_417d4727dae5__runtime-skill-profile.beta2.js.txt`.
- Clarifications received:
  - PTM addition (2026-10-18): screenshots, `correction-about-intent.md` — the tests on origin/personal assert both failure behaviors; treat them as decisions to revisit and change those tests. User currently runs v1.5.6-beta.1.
  - User (2026-10-18): "for both runtime report the same error… Nothing can be started"; asked who/which ticket introduced it (answered; see History below).
- User-supplied facts: workspace `.claude/skills/*` (and in other projects `.codex/skills/*`) are links to `autobyteus-agents` package skill folders.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-18 | Code | `autobyteus-server-ts/src/agent-execution/backends/shared/runtime-skill-profile.ts` `stage()` | Collision cause | INV-SRC-01: `exists(projectEntry)` (lstat) → policy `fail` throws `Workspace skill path collision…`; no identity check. INV-SRC-04: first statement `fs.realpath(path.dirname(privateParent))` = realpath(memoryDir) → ENOENT for new runs | Fix |
| 2026-10-18 | Code | `shared/prepare-private-runtime-skills.ts` | Entry | Runs for every runtime with ≥1 binding; profile parent `<memoryDir>/runtime-skill-profiles` | — |
| 2026-10-18 | Code | `claude/backend/claude-session-bootstrapper.ts`, `codex/backend/codex-thread-bootstrapper.ts`, `acp/backend/acp-agent-run-backend-factory.ts` + `grok/grok-private-skills.ts` | Callers | Claude, Codex, Grok call `preparePrivateRuntimeSkills` for create and restore | — |
| 2026-10-18 | Code | `antigravity/capsule/agy-configured-skill-linker.ts` | AGY | INV-SRC-05: `entryExists(<workspace>/.agents/skills/<name>)` → `workspace_owned` → policy `fail` throws `AgentCreationError` "the selected workspace already has a skill with this name". Since `e5edfafdfd` (in v1.5.5) | Same rule |
| 2026-10-18 | Code | `shared/workspace-skill-collision-policy.ts` | Policy | `ALL_INSTALLED` → `prefer_workspace`, else `fail` | — |
| 2026-10-18 | Code | `claude/session/claude-session-query-options.ts`, `claude-session-tooling-options.ts`, `claude-sdk-setting-sources.ts`, `claude-private-skill-discovery.ts` | Claude exposure | INV-SRC-06: `hasMaterializedSkills = exposures.length > 0` → adds `Skill` to allowedTools; plugin names `autobyteus-configured:<name>` validated via `supportedCommands`; setting sources `user, project, local` → workspace `.claude/skills` loads natively | Count workspace-provided |
| 2026-10-18 | Code | `codex/thread/codex-private-skill-discovery.ts`, `codex-app-server-client-manager.ts` | Codex exposure | `skills/extraRoots/set [profile.skillsRoot]`; discovery matches each exposure by name + realpath(SKILL.md); throws when not found | Extend to workspace-provided |
| 2026-10-18 | Code | `grok/grok-private-skills.ts` | Grok exposure | `--plugin-dir profile.root`; validates rows with `plugin_name === "autobyteus-configured"` and realpath match | Validate only private ones; workspace ones by name+realpath |
| 2026-10-18 | Code | `git show 2448e166bd` | Regression diff | Removed the local workspace-link materializers (Claude/Codex/Grok); `preparePrivateRuntimeSkills` no longer gated on shared workspace; added the realpath/outside-project block at start of `stage()` | — |
| 2026-10-18 | Code | `git show 2448e166bd^:…/codex-thread-bootstrapper.ts` `planWorkspaceSkillRequests` | Old Codex behavior | Old Codex preflight: when Codex already discovered the catalog's copy natively (all rows for the name = chosen path) → `reconcile-discoverable` (not materialized); other copies → exposed with warning | Follow-up F4 |
| 2026-10-18 | Code | `shared/workspace-skill-materializer.ts`, `workspace-skill-links.ts` (still in tree) | Old local behavior | `same-source-symlink` accepted; `broken-symlink` repaired; non-symlink/foreign link → `workspace-owned` → `fail` throws, `prefer_workspace` skips; release removed link | Now dead in production |
| 2026-10-18 | Code | `grep -rn "skillMaterializer\|WorkspaceSkillMaterializer"` | Dead code | Only `acp-agent-run-backend-factory.ts` union branch + tests reference it; the only ACP factory constructor (`grok-build-agent-run-backend-factory.ts`) passes `privateSkills` | Remove |
| 2026-10-18 | Code | `skill-update-notices/services/run-skill-tracker.ts` | Notices | Tracks catalog folder per run; seen-versions write retries until the run's memory folder exists (confirms memory folder is created later than preparation) | F3 |
| 2026-10-18 | Code | `grep "mkdir(memoryDir"`: `autobyteus-agent-run-backend-factory.ts:182,240`, `agy-run-capsule.ts:41` | Memory folder | AutoByteus and AGY backends create memoryDir themselves; Claude/Codex/Grok do not | Create in profile staging |
| 2026-10-18 | Code | tests: `runtime-skill-profile.test.ts` ("preserves even broken project entries; configured fails"), `private-skill-bootstrappers.test.ts` (CONFIGURED collision), `prepare-private-runtime-skills.test.ts` (missing memory → ENOENT) | Tests asserting the bugs | Confirm correction note | Change |
| 2026-10-18 | Runtime | `ls -la` superrepo `.claude/skills` (read-only) | User setup | `project-task-management -> …/autobyteus-agents/agents/project-task-manager/skills/project-task-management`; `solution-designer -> …/software-engineering-team/agents/solution-designer/skills/solution-designer` | Fixture shape |
| 2026-10-18 | User | Screenshots 1, 2 | Symptom | Claude runtime; error on "continue" (restore) for both skills | AC-002 |
| 2026-10-18 | Doc | `tickets/done/shared-network-workspaces/design-spec.md:664,677`; `autobyteus-nfs/EXTRACTION.md:32` | History | See History | — |

## History: Where The Bugs Came From

- `c57ab71c90` (2026-10-13, ticket `shared-network-workspaces`): created `RuntimeSkillProfile` for shared (NFS) workspaces only, with "any entry at the workspace skill path → fail (configured) / skip (all-installed)". Design spec line 664 intended to "retain project-owned collision semantics", but the old local semantics also accepted a same-source link; that tolerance was not carried into the new profile. Local workspaces still used the old materializer (v1.5.5 unaffected).
- `2448e166bd` (2026-10-16, Task `autobyteus-nfs-1`, standalone NFS extraction; `EXTRACTION.md:32` "private configured-skill profiles are used independent of filesystem for Claude/Codex/Grok"), merged in `55bff1f5ee` (2026-10-18): made the profile the only path on every workspace, deleted the Claude/Codex/Grok workspace materializers, and added the `realpath(memoryDir)` + outside-project check at the start of `stage()` (second bug). Tests were changed to assert both behaviors.
- Released in `v1.5.6-beta.2`; not in `v1.5.6-beta.1` (`git merge-base --is-ancestor 2448e166bd v1.5.6-beta.1` false) nor `v1.5.5`.
- All commits are authored `normy <normy@macbookpro.speedport.ip>` (the machine's git identity used by the agent team); the producing agent is not recorded in git.

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001..003 | System | Start/resume run | backend factory → bootstrapper → `preparePrivateRuntimeSkills` → `RuntimeSkillProfile.stage()` | Any entry → throw (`fail`) | INV-SRC-01 | High (screenshots) |
| BEH-004 | System | New run | same | `ENOENT realpath` | INV-SRC-04, second-finding note | High |
| BEH-005 | System | AGY start | `AgyAgentRunBackendFactory` → `createAgyRunCapsule` → `linkAgyConfiguredSkills` | Any entry → `AgentCreationError` | INV-SRC-05 | High |

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact |
| --- | --- | --- | --- | --- |
| Node script driving `codex app-server` (codex-cli 0.163.0) `skills/list` with `cwds:[<tmp ws>]` in `/tmp/skillprobe.u2vd` | Does Codex load workspace skills natively | Lists `.agents/skills/probe-agents-dir`, `.codex/skills/probe-codex-dir`, and `.codex/skills/probe-linked` (a link) with the link's real path `…/src/probe-linked/SKILL.md`, scope `repo` | Workspace-provided skills work for Codex; discovery by realpath matches a same-source link | Probe stopped by user before the extraRoots duplicate test |

## Structural And Payload Surface Inventory

- Structural surfaces: `RuntimeSkillProfile` (shared), Claude/Codex/Grok consumers of `profile.exposures`, AGY linker, ACP factory dead branch.
- Payload: none. Persistence: none (memory folder created earlier; no format change).
- Potential structural impacts: none to APIs/persistence/security boundaries; profile gains a second list.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-delivery-receipts/skill-path-collision-evidence/user-screenshot-1-error-project-task-management.png | User | Symptom | Claude restore | AC-002 | Evidence | N/A |
| /Users/normy/autobyteus_org/autobyteus-delivery-receipts/skill-path-collision-evidence/user-screenshot-2-error-solution-designer.png | User | Symptom | Claude restore | AC-002 | Evidence | N/A |
| /Users/normy/autobyteus_org/autobyteus-delivery-receipts/skill-path-collision-evidence/correction-about-intent.md | PTM | Tests asserting the bugs | — | AC-004..006 | Evidence | N/A |
| /Users/normy/autobyteus_org/autobyteus-delivery-receipts/skill-path-collision-evidence/second-finding-new-runs-cannot-start.md | PTM | New-run ENOENT | — | AC-006 | Evidence | N/A |
| /Users/normy/autobyteus_org/autobyteus-delivery-receipts/skill-path-collision-evidence/runtime-skill-profile.beta2.js.txt | PTM | Installed beta.2 code | — | — | Evidence | N/A |

## Assumptions, Unknowns, And Risks

> *SR-001, superseded by SR-002:* U-1 and R-1 applied to the SR-001 private-profile patch and no longer apply to the beta.1 restore.

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-1 | Unknown | Grok native discovery of `<cwd>/.grok/skills`; AGY of `<workspace>/.agents/skills` | Workspace-provided skills rely on it | Validation (API/E2E: Grok `_x.ai/skills/list`, AGY real run) | Open |
| R-1 | Risk | Creating the member memory folder during preparation; if a later step fails, an empty memory folder remains | Run listings that infer existence from folders | AGY/AutoByteus already create it early; implementation checks run-history readers tolerate an empty folder | Open (low) |

## Review Of Other Behaviors Dropped By 2448e166bd / 55bff1f5ee

> *SR-001, superseded by SR-002:* the dispositions below (notably D-2 and D-10, and the fix/follow-up column) reflect the SR-001 patch design. Under SR-002 all skill behaviors D-1..D-9 return to beta.1 by restore, and the materializer is restored rather than removed (D-10). The current follow-up list is F1–F6 in `design-spec.md` Change Scope; the F-numbers used under SR-001 do not apply.

| ID | Old (local workspace-link path) | Now | Blocks or confuses start? | Disposition |
| --- | --- | --- | --- | --- |
| D-1 | Same-source workspace link accepted | Refused | Yes | Fix (REQ-001) |
| D-2 | Broken workspace link at the name repaired (relinked) | Refused (configured) / hides skill (all-installed) | Yes | Fix: ignore, never write workspace (REQ-004) |
| D-3 | Memory folder not needed for local runs | ENOENT on new runs | Yes | Fix (REQ-005) |
| D-4 | Claude `Skill` tool enabled when materialized skills existed (incl. same-source accepted ones) | Only when private exposures exist | Yes, once workspace-provided skills are honored | Fix (REQ-006) |
| D-5 | Unresolved skills skipped with warning (and broken link at its path removed) | Skipped with warning; workspace untouched | No | Keep |
| D-6 | Codex: configured skill already discoverable natively from the same path (e.g. `~/.codex/skills`) not re-exposed | Always exposed privately too; Codex may list it twice (same content) | No | Follow-up F4 |
| D-7 | Codex `.agents/skills` not considered by either path | Same | No (duplicate listing only) | Follow-up F1 |
| D-8 | Cleanup removed the run's workspace links when last holder released | Removes the private profile folder; folders under `<memory>/runtime-skill-profiles/` are left if the server is killed | No | Follow-up F2 |
| D-9 | Active-run skill-update notices | Unchanged (catalog-based); a workspace copy (not link) is not what notices track | No | Follow-up F3 |
| D-10 | ACP factory still accepts the old materializer | Dead branch + two dead files + tests | No | Remove in this change (DESIGN Core Principle 7, touched module) |

## SR-002 Evidence (restore direction)

| Date | Source | Command / Reference | Finding |
| --- | --- | --- | --- |
| 2026-10-18 | User | Conversation: "they cannot change our behavior… NFS deals with the file system, they shouldn't do anything to our skill"; "Okay, restore it"; "We shouldn't do anything considering NFS right now"; "the design before the NFS change was actually the correct direction" | Direction: restore beta.1 skill behavior; remove NFS influence |
| 2026-10-18 | Code | `git merge-base --is-ancestor c57ab71c90 v1.5.5` / `v1.5.6-beta.1` → both true; `git show v1.5.6-beta.1:…/prepare-private-runtime-skills.ts` | Private profile existed in v1.5.5/beta.1 but returned `null` unless `configuredSharedWorkspace(workingDirectory)` matched (NFS not live) |
| 2026-10-18 | Code | `git log v1.5.6-beta.1..HEAD -- <each src file of 2448e166bd>` | Only `2448e166bd`, `a2023feff3` (unused imports) and merge `156ea2dacc` touch them |
| 2026-10-18 | Code | `git diff --stat v1.5.6-beta.1 HEAD -- agent-execution runtime-management workspaces compositions terminal-streaming` | 35 files, +66/−596; also `domain/agent-run.ts` (unrelated ticket, not touched) |
| 2026-10-18 | Code | `git show 2448e166bd -- antigravity autobyteus` | AGY: only removed NFS-gated scoped git env; skills unchanged (`--add-dir <workspace>` launch, capsule `.agents/skills` links). AutoByteus: registered-but-unloaded workspace now opened instead of temp fallback (non-skill; F1) |
| 2026-10-18 | Code | `git show 2448e166bd -- claude/claude-workspace-resolver.ts codex/codex-workspace-resolver.ts` | Resolver now rethrows for any registered workspace instead of only shared ones (non-skill local change; F1) |
| 2026-10-18 | Code | `git show HEAD:…/workspace-skill-links.ts` `removeLinkToSource`; materializer `reconcileResolved` | beta.1 adopts an existing same-source link (`same-source-symlink` → ready) and removes it when the last holder releases (F2). Codex skips adoption when it already discovers the same path |
| 2026-10-18 | Code | `git grep` private-profile symbols in `src` and `tests` | Removal list in design spec |
| 2026-10-18 | Worktree | `git status` | Implementation engineer had uncommitted SR-001 work (classifier, deletions of materializer files); held by message, to be discarded |

### Restore Inventory: 2448e166bd source hunks

- Skill (restore): Claude bootstrapper/factory/context/session cleanup/manager/query options and `claude-workspace-skill-materializer.ts`; Codex bootstrapper (preflight)/factory/context/thread cleanup/index/thread manager and `codex-workspace-skill-materializer.ts`; Grok factory and `grok-workspace-skill-materializer.ts`; ACP factory materializer path; provider preparation guard (`ownSkill`, `ownCodexClient`); provider factory builder and process composition wiring; Codex client manager (minus NFS env); `prepare-private-runtime-skills.ts`/`runtime-skill-profile.ts` (remove).
- NFS (keep removed): `workspaces/shared-workspace-binding.ts`, `shared-workspace-mount-observation.ts`, `services/shared-run-workspace-admission.ts` + its use in `agent-run-manager.ts`, `autobyteus/native-shared-workspace.ts`, `runtime-management/shared/scoped-project-git-environment.ts` and its uses (ACP env, Claude query env, Codex client env, AGY env, PTY), workspace-resolver shared checks.

## Notes For Architecture Design

> *SR-001, superseded by SR-002:* the notes below describe the SR-001 classifier design. For SR-002 see "SR-002 Evidence" and "Restore Inventory" above.

- One identity rule must serve the shared profile and the AGY linker; put it in one shared file.
- Consumers read `profile.exposures` as "private links"; keep that meaning and add a separate list for workspace-provided skills.
