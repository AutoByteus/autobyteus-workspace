# Solution handoff — saved team workspace path

## Result
- **Classification:** Architecture Design Complete.
- **Package:** `team-workspace-saved-value-warning`; **current revision:** SR-004.
- **Task size:** Medium; **architectural risk:** Low. Evidence and escalation in `design-spec.md`.
- **Approval:** Requirements Approved. User 2026-09-26 replied “Yeah … i meant use the path” to the explicit saved-run path-as-fixed-value proposal after the path-vs-ID rationale. SR-003 records this approval of the narrow saved-Team root/member behavior. No approval exists for a general new-run workspace-ID redesign or Agent Org/standalone behavior change.
- **Route decision:** The exact handoff rules select `/implementation_engineer` for Architecture Design Complete with `task_size=Medium` and `architectural_risk=Low`. Direct implementation route; independent architecture review is not applicable. Implementation self-checks and downstream executable validation still apply.

## Original request and goal
User supplied a screenshot of an existing Software Engineering Team run configuration. The disabled Workspace Directory path was followed by orange “Saved value is unavailable in current options.” and a green `Workspace:` line repeating the path. User asked why, suggested reproducing with frontend/Electron/browser, then asked why a workspace ID is needed when the path is already present. User clarified the desired principle: **use the path**. Goal: in saved Team root/member settings, show the exact saved path once as a fixed read-only value, with neutral context, not an ID-based Existing/New choice, unverified unavailability warning, or duplicate success feedback.

## Canonical artifacts (absolute paths)
- Approved requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-workspace-saved-value-warning/tickets/in-progress/team-workspace-saved-value-warning/requirements-doc.md`
- Investigation and architecture evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-workspace-saved-value-warning/tickets/in-progress/team-workspace-saved-value-warning/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-workspace-saved-value-warning/tickets/in-progress/team-workspace-saved-value-warning/design-spec.md`
- Cumulative solution history: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-workspace-saved-value-warning/tickets/in-progress/team-workspace-saved-value-warning/solution-revision-record.md`
- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-workspace-saved-value-warning/tickets/in-progress/team-workspace-saved-value-warning/solution-handoff.md`
- User screenshot evidence: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_de5090a558f04a2bafc6b12317eeb046/solution_designer_68bb2fd491024de4984de867f2000544/context_files/ctx_a4437bd78d4e__image.png`
- Independent architecture-review artifact: `N/A — not applicable; direct Medium/Low route`.
- Product Design artifact: `N/A — not requested`.

## Evidence and intended behavior boundary
- Directly reproduced in installed `/Applications/AutoByteus.app` by opening an existing Software Engineering Team run → Edit Config. The exact run/path differed from user screenshot but the same New/warning/green-duplicate state was visible. No run was changed.
- Team execution tree contains `workspace_root_path` but no workspace ID/availability. Team projector unconditionally synthesizes null ID + `historical-only`; `WorkspaceSelector` interprets this as New and shows warning/success. No lookup proved the path unavailable. Backend Team launch/restore uses path. Workspace ID serves editable picker/inventory flows, not this saved display.
- Approved IDs: SCN-001–003; BEH-001–003; REQ-001–003; AC-001–003. Fixed saved Team root/member presentation changes; new-launch picker, stopped-run model Save, saved paths/history and Agent Org behavior stay preserved.
- Exact source paths and technical decisions are in the investigation and design. Design uses an internal discriminated presentation union and focused path display; does not change persisted/API contracts. It removes the obsolete Team `historical-only` projection and selector-shaped Team model fields rather than merely hiding text.

## Workspace and finalization context
- Git task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-workspace-saved-value-warning`
- Branch: `codex/team-workspace-saved-value-warning`
- Base: fetched `origin/personal` at `6f00cda64b75ca0097fbc08d862596f90e0e0ad8`; finalization target `origin/personal` / `personal`.
- The installed Electron app was probed read-only; no new frontend/backend was started because the actual app was already running and sufficient for reproduction.

## Constraints, risks and expected output
- No workspace editing/remapping/existence check, no backend or persisted-data change, no new-run ID redesign, no Agent Org/standalone behavior change. Preserve exact path and model Save semantics.
- Risk: shared form model/renderers also serve Agent Org; maintain selector behavior there, including mounted-Team edits. Escalate if a backend contract or broader behavior must change.
- Next expected output: implement approved design in isolated worktree, perform implementation-scoped checks and rendered frontend quality check, then follow the configured downstream review/validation route. Do not infer user approval for expanded behavior.
