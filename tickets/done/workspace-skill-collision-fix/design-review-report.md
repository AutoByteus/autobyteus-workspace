# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix/tickets/in-progress/workspace-skill-collision-fix/requirements-doc.md` (SR-002, Approved by User 2026-10-18)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix/tickets/in-progress/workspace-skill-collision-fix/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix/tickets/in-progress/workspace-skill-collision-fix/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix/tickets/in-progress/workspace-skill-collision-fix/design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed: none behavior-defining. User evidence folder `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/skill-path-collision-evidence/` is inventoried as evidence only.
- Relevant Solution Revision IDs: `SR-002` (supersedes `SR-001`)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix/tickets/in-progress/workspace-skill-collision-fix/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Architecture Design Complete (SR-002) from `/software_engineering_team/solution_designer`, 2026-10-18
- Prior Review Round Reviewed: N/A (no prior review result)
- Latest Authoritative Round: `1`
- Current-State Evidence Basis (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix`, `HEAD` = `1c718202b2`):
  - `git log v1.5.6-beta.1..HEAD`: 29 commits. The only ones touching the skill-exposure source files are `2448e166bd`, `a2023feff3` (unused imports) and merge `156ea2dacc`. Other commits in that range touch project-tool or agent-run files that are not in the restore inventory.
  - `git diff v1.5.6-beta.1 HEAD -- src/agent-execution/backends src/agent-execution/providers src/compositions src/runtime-management`: read in full. Every skill hunk matches a row in the design's Restore Inventory or Removal Plan. Every NFS hunk (shared-workspace binding, mount observation, admission, `native-shared-workspace.ts`, `scoped-project-git-environment.ts`, resolver gate, AGY/ACP/Claude/Codex env) is listed as "keep removed".
  - At beta.1 the private path existed but was gated: `preparePrivateRuntimeSkills` returned `null` unless `configuredSharedWorkspace(workingDirectory)` matched. Every bootstrapper then took the `workspaceSkillMaterializer.materializeConfiguredWorkspaceSkills` branch. The beta.1 Claude bootstrapper was read lines 55–100.
  - `git grep` on beta.1 for materializer, cleanup and guard symbols (`materializedConfiguredSkills`, `WorkspaceSkillMaterializer`, `get*WorkspaceSkillMaterializer`, `CodexThreadCleanup`, `ownSkill`, `ownCodexClient`): 19 src files. All of them are in the Restore Inventory.
  - `git grep` on HEAD for private-profile symbols: 19 src files. All of them are in the Removal Plan or the Restore Inventory. No consumer exists outside `agent-execution/backends` and `runtime-management/{claude,codex}/client`, and none in skill-update notices or run history.
  - The shared `workspace-skill-materializer.ts`, `workspace-skill-links.ts` and `workspace-skill-collision-policy.ts` are byte-identical between beta.1 and HEAD (no diff). None of them references `memoryDir`.
  - `workspace-skill-links.ts` `removeLinkToSource` and the materializer's `same-source-symlink` / `broken-symlink` / `workspace-owned` / `prefer_workspace` handling confirm the BEH-101 description and the recorded F2 quirk.
  - Worktree status: SR-001 changes are uncommitted. They include staged deletions of `workspace-skill-materializer.ts`, `workspace-skill-links.ts` and their tests, and untracked `workspace-skill-entry.ts` and `workspace-skill-entry.test.ts`. See AR-002.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `Low`
- Classification rationale reviewed: the work spans the Claude, Codex and Grok/ACP backends, provider factory composition, the Codex client manager and the Claude SDK client. It restores or edits about 20 source files, removes about 6, and touches about 15 test files. The target behavior is shipped beta.1 behavior. No new contract, persistence, security or concurrency behavior is added. The restored owners are the beta.1 owners and are byte-identical in tree.
- Independent Architecture Review required by the classification: `Yes` (Large)
- Classification evidence or correction required: none. `Low` risk is justified. The ownership change removes an owner that no supported trigger reaches. It does not introduce a new owner, because the restored owners are unchanged files.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: restore v1.5.6-beta.1 non-shared-workspace skill exposure for Claude, Codex and Grok on every workspace. Remove the NFS-only private profile path. Keep the non-skill NFS removals. Leave Antigravity and AutoByteus unchanged. Add regression tests for same-skill links, brand-new runs and different same-named skills.
- Relevant existing behavior and evidence confirmed: the beta.2 symptoms (collision refusal on any entry; ENOENT from `fs.realpath(path.dirname(privateParent))` on a missing memory dir) come from the HEAD `runtime-skill-profile.ts` `stage()` hunk added by `2448e166bd` and from the removed shared-workspace gate in `prepare-private-runtime-skills.ts`.
- Scope guardrail confirmed: In-Scope UC-101/UC-102; Out of Scope (improvements over beta.1, non-skill NFS extraction, future NFS skill design); Preserved Behavior Boundary (agents without skills, AGY, AutoByteus, non-skill NFS); Review Authority (REQ/AC/BEH IDs; improvements are follow-ups).
- Approved change, preserved behavior, and outside scope understood: Yes. DEC-103 explicitly keeps the beta.1 quirks: adopted same-source link removed at run end (F2), AGY `.agents/skills` refusal (F3), and the message wording.
- Every prospective blocking `Design Impact` finding is traceable: Yes. No blocking findings.
- Remaining material ambiguity: none.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-101 | System | Pass | Pass: beta.1 bootstrappers (non-shared branch), byte-identical materializer, `removeLinkToSource`, Codex `planWorkspaceSkillRequests` preflight in the beta.1 diff | Pass: DS-101/DS-102 trace run create/restore → bootstrapper/ACP factory → (Codex preflight) → materializer → native discovery, and cleanup → materializer release | Confirmed | — |
| BEH-102 | System | Pass | Pass: materializer and links never reference `memoryDir`; the ENOENT source is `stage()` in a file being removed | Pass: removing `preparePrivateRuntimeSkills` from every bootstrapper removes the memory-folder dependency at its source | Confirmed | — |
| BEH-103 | System | Pass | Pass: HEAD grep inventory of private-profile symbols matches the Removal Plan | Pass: AC-106 search criterion is concrete | Confirmed | — |
| BEH-104 | System | Pass | Pass: beta.1..HEAD AGY diff is only the NFS env hunk; materializer/collision-policy (used by AGY) unchanged; AutoByteus diff non-skill (F1) | Pass: AGY/AutoByteus not in the change inventory | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None. No behavior-defining supplements exist. The user evidence files are inventoried in the investigation notes as read-only evidence.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug fix (regression revert) | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Boundary Or Ownership Issue`: `2448e166bd` replaced the normal-workspace owner with an NFS-scoped one; the History section and the beta.1 diff confirm it | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes: restore the beta.1 owner and remove the NFS-only owner. Deferrals F1–F6 are named | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Restore Inventory, Removal Plan and Change Sequence | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-101 | Run create/restore → workspace skill exposure → native discovery | Pass | Pass | Pass (`get*WorkspaceSkillMaterializer` getters are thin facades) | Pass | Pass | Pass (per-runtime profile is off-spine) | Pass |
| DS-102 | Run end / failed preparation → holder release | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

The materializer's acquire/transfer/release registry is a bounded local state machine. It is unchanged from beta.1, so describing it as "as beta.1" is enough.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceSkillMaterializer` | Pass | Pass (`WorkspaceSkillLinks`, registry) | Pass | Pass | Beta.1 callers use only `materializeConfiguredWorkspaceSkills` / `cleanupMaterializedWorkspaceSkills` |
| `ProviderPreparationGuard` | Pass | Pass | Pass | Pass | Restores `ownSkill` and `ownCodexClient`; removes `ownSkillProfile` |
| ACP factory deps | Pass | Pass | Pass | Pass | The two-option union becomes a single required `skillMaterializer`, so the dead alternative is removed |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime backends → materializer/profile getters | Pass | Pass (no `workspaces/shared-workspace-*`, no NFS concept, no reintroduced NFS pieces) | Pass | Pass | — |
| Composition → provider factory builder | Pass | Pass | Pass | Pass | Beta.1 wiring of materializers, `clientManager` and `threadCleanup` |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `materializeConfiguredWorkspaceSkills(...)` | Pass | Pass | Pass (runId + workingDirectory) | Low | Pass |
| `cleanupMaterializedWorkspaceSkills(descriptors)` | Pass | Pass | Pass (descriptor/holderId) | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace skill exposure | Pass | Pass (reuse the in-tree beta.1 materializer) | N/A | Pass | No new pieces |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/shared` | Pass | Pass | Pass | Pass | Materializer, links and policy kept; private profile files removed |
| `agent-execution/backends/{claude,codex,grok,acp}` | Pass | Pass | Pass | Pass | Restore |
| `runtime-management/{claude,codex}/client` | Pass | Pass | Pass | Pass | Private options removed; this goes beyond beta.1 file content by design (DEC-102) |
| `agent-execution/providers`, `compositions` | Pass | Pass | Pass | Pass | Restore |

## Reusable Owned Structures Verdict

N/A. No new shared structure is introduced. The restored structures are unchanged from beta.1.

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Claude/Codex run contexts | Pass | Pass (`privateSkillProfile` removed; `materializedConfiguredSkills` restored) | Pass | N/A | Pass | Removes the dual representation that beta.1 carried |
| ACP factory dependencies | Pass | Pass | Pass | N/A | Pass | Single shape |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Restore Inventory rows (design spec) | Pass | Pass | N/A | Pass | Each row matches a verified beta.1..HEAD hunk |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Re-added per-runtime materializer files and `codex-thread-cleanup.ts` | Pass | Pass | Low | Pass | Beta.1 paths; no new folders |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `runtime-skill-profile.ts`, `prepare-private-runtime-skills.ts` (incl. `privateSkillInstructions`) | Pass | Pass | Pass | Pass | Evidence: their only gate (`configuredSharedWorkspace`) was deleted, and the HEAD grep shows only the callers being restored. `privateSkillInstructions` was appended only on the private branch, so beta.1 non-shared prompts never contained it |
| `acp-private-skill-adapter.ts`, `grok-private-skills.ts`, ACP `privateSkills`/`profile` | Pass | Pass | Pass | Pass | — |
| `codex-private-skill-discovery.ts`, Codex client manager profile key/`extraRoots`, thread-manager profile lease | Pass | Pass | Pass | Pass | — |
| `claude-private-skill-discovery.ts`, `privateSkillPlugin`/`plugins` | Pass | Pass | Pass | Pass | — |
| Context `privateSkillProfile` fields, guard `ownSkillProfile` | Pass | Pass | Pass | Pass | — |
| Private-path-only tests and private cases in shared tests | Pass | Pass | Pass | Pass | "Restore beta.1 version where it exists; otherwise drop private cases" is a clear rule |
| Dead code in touched modules | Pass | N/A | Pass | Pass | The HEAD dead ACP materializer branch is resolved by making the materializer the only path |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Skill exposure | No (target removes the beta.1 dual path, not only the beta.2 one) | Pass | Pass | The rejection log explicitly rejects a flag or `if (false)` gate |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Run memory incl. beta.2 `<memory>/runtime-skill-profiles/` leftovers | Not Affected | Pass | Pass | N/A | Pass | Only `prepare-private-runtime-skills.ts` references `runtime-skill-profiles`. Run contexts are rebuilt by `bootstrapForRestore`, so a beta.2 run resumed on beta.3 re-materializes through the workspace path. Leftover folders are inert (F4) |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Discard SR-001 → restore source → tests → validation → API/E2E | Pass | Pass (none) | Pass (see AR-002 for the step-1 discard list) | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Restore method | Yes | Pass | Pass | Pass | `git show v1.5.6-beta.1:<file>` as the reference; do not hand-write a new variant |
| NFS gate removal | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

None. No finding or mechanism relies on an assumed scenario outside the confirmed behavior basis. The concurrent-holder and adopted-link release behavior is unchanged beta.1 behavior that the requirements already cover (BEH-101, DEC-103).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

Both findings are non-blocking. Neither changes approved behavior.

### AR-001 — Investigation notes keep SR-001 content that contradicts SR-002 (non-blocking)

- Type: Design Impact (artifact coherence), non-blocking
- Severity: Low
- Protected IDs: REQ-101, REQ-103 (accurate implementation guidance)
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence (`investigation-notes.md`):
  - The meta says "Current solution revision ID: `SR-001`" and "Investigation status: complete for SR-001".
  - "Review Of Other Behaviors" D-1..D-10 dispositions cite SR-001 REQ IDs and SR-001 fixes. D-2 says "ignore, never write workspace", but SR-002 restores beta.1 broken-link repair. D-10 calls the materializer branch and "two dead files" removable, but SR-002 makes them the only path.
  - "Structural And Payload Surface Inventory" says "profile gains a second list".
  - R-1 says "Create in profile staging".
  - "Notes For Architecture Design" gives the SR-001 direction ("add a separate list for workspace-provided skills").
  - Follow-up IDs F1/F4 in the notes mean different things than F1–F6 in the design spec.
  - U-1 (Grok `.grok/skills` native discovery) is still "Open". Under SR-002 it is beta.1 behavior, and AC-101 Grok verification covers it.
- Consequence: the design spec and requirements are unambiguous and authoritative, so implementation is not blocked. However, the uncommitted SR-001 work had already deleted the materializer, so an implementer reading D-10 or the SR-001 notes could repeat that mistake.
- Required update: mark the SR-001-only sections as superseded by SR-002, or update them. Align the follow-up numbering with the design spec, and close or retarget U-1 and R-1.
- Proportionality: a documentation annotation only.
- Recommended recipient: `/software_engineering_team/solution_designer` (informational; can be done without blocking implementation)

### AR-002 — Change Sequence step 1 does not name every SR-001 leftover (non-blocking)

- Type: Design Impact (implementation guidance), non-blocking
- Severity: Low
- Protected IDs: REQ-101 (the beta.1 materializer files must be present), AC-107
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence: `git status` shows staged (index) deletions of `src/.../shared/workspace-skill-materializer.ts`, `workspace-skill-links.ts`, `tests/.../workspace-skill-materializer*.test.ts` and `tests/unit/skills/github/runtime-generation.test.ts`. It also shows untracked `src/.../shared/workspace-skill-entry.ts` and `tests/unit/.../shared/workspace-skill-entry.test.ts`. Step 1 names only `workspace-skill-entry.ts`.
- Required update (implementation guidance): discard both the index and the working tree for tracked files (`git restore --staged --worktree` on the server paths, or `git reset --hard HEAD` scoped so the ticket folder survives). Remove both untracked `workspace-skill-entry*` files. Leave unrelated untracked `autobyteus-application-*/dist/` folders alone. Before step 2, confirm with `git diff HEAD --stat` (empty for src/tests) that the restore starts from HEAD.
- Proportionality: a one-line clarification of an existing step.
- Recommended recipient: `/software_engineering_team/implementation_engineer` (apply during step 1); `/software_engineering_team/solution_designer` (optional spec touch-up)

## Classification

N/A for routing. The decision is `Pass`, and the non-blocking findings are classified individually above.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary, per handoff rules), plus an informational notice to `/software_engineering_team/solution_designer`.

## Residual Risks

- Mechanical restore errors across about 20 files. The mitigation is the design's requirement to diff each restored file against `v1.5.6-beta.1` and show that only NFS removals and unused-import differences remain, plus the restored beta.1 tests, the new regression tests and typecheck.
- Tests touched after beta.1 by unrelated tickets (for example project-task tools, `agent-run.test.ts`, agent-status websocket) must not be wholesale reverted. Restore only the skill hunks of `2448e166bd` (`git show 2448e166bd --stat -- autobyteus-server-ts/tests`, 41 files).
- Known beta.1 quirks (F2 adopted-link removal at run end, F3 AGY refusal) ship unchanged by approved decision DEC-103.
- F1 (non-skill local resolver and AutoByteus changes) remains a user decision outside this ticket.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: ARCH-REV-001 for SR-002. Non-blocking findings AR-001 and AR-002 are recorded for the solution designer and the implementation engineer.
