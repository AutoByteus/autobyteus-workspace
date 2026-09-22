# Solution Handoff — Offline Org Team Workspace

## Classification and requested next responsibility
- Package identifier: `OFFLINE-ORG-TEAM-WORKSPACE-20260922`.
- Current cumulative revision: **SR-004**; requirements approval baseline **SR-002**.
- Result: **Architecture Design Complete — revised after Design Impact**.
- `task_size=Medium`; `architectural_risk=High`.
- Next responsibility: independent architecture **re-review** of SR-004 against approved SR-002 and explicit disposition of ARCH-REV-001 / AR-F001. Prior authoritative review is Fail on SR-003; this revision is not an independent closure. No implementation, review pass, validation or delivery completion is claimed.

## Original request and user approval
User initially requested analysis: after starting an AgentOrg using its global workspace, let the user change one internal Team's workspace while the Org is offline; Team children should inherit the change and subsequent messages should use it, with no migration expected.

After receiving the proposed mounted-Team/all-configured-children scope, user supplied a screenshot of the existing expanded `/marketing_team` card and wrote: “just as ine this picture, it should allow me to update the workspace of the subteam when its stopped right? when the team global workspace is updated, the agents inside agent team will be udpated as well.in this way, it allows the user to update the agent team workspace in one agent org”. After the screenshot-reading turn was interrupted, user said “continue please”.

Approval reference: `USER-20260922-SCOPE`, captured in requirements SR-002 and revision record. It confirms the presented behavior and existing selector location. No review bypass, repository merge/release or completed implementation is inferred. Product Design was not requested.

## Approved behavior and constraints
- Whole Org must be authoritatively stopped/inactive and eligible; a merely offline/idle child inside a managed Org is insufficient.
- Edit the Workspace Directory control of a configured mounted Team in existing whole-Org Settings. Team default and **all its configured Agents**, including coordinator and those with independent model/runtime settings, receive the chosen path.
- Root Org, direct Org Agents, sibling Team paths and historical task execution snapshots remain unchanged. Fresh delegation after restore derives updated configured-source paths.
- One explicit Save; saved canonical values reopen correctly and ordinary Send continues same run/history in new directory. No Agent/conversation startup just from inspect/Save.
- Preserve models unless explicitly changed through existing editing, runtime family, tool/skill policy, identities, history/Activity, attachments/composer state, provider bindings, handoffs/tasks and unrelated metadata.
- No project-file move/copy/delete, history relocation, historical-reference rewriting, session reset or live editing.
- Exact normative basis: requirements REQ-001–007, AC-001–006, SCN-001–004, BEH-001–006. No unresolved behavior-defining supplement.

## Design summary and evidence
- Existing schema v1 already persists workspaceRootPath on Team and configured Agents; no application-data migration is needed. Identity-based memory storage is separate from workspace.
- Launch inheritance is materialized, not recomputed on restore. Current-owner in-memory probe shows Team-only `/new` produces child `/old`; therefore server must expand the selected Team into all configured child path updates.
- Generalize the Org-specific model-only read/save contract into one config command with separate `modelPatches` and `teamWorkspacePatches`. Reuse the same inactive-root manager gate, immutable projection, model validation, one tree write and strict readback. Remove old Org aggregate endpoint aliases/client path.
- Compose an independent workspace draft into the existing editor/save owner. Reuse current selector, enabling only approved Org Team scopes. Do not use model-link flags for workspace inheritance.
- Validate final selection in destination cwd, preview destination-aware options, and safely adopt new workspaceId/metadata into retained Agent contexts. Missing metadata must not keep the old filesystem target **or fall back to an unrelated launch draft**: selected Org target uses explicit null at RightSideTabs, consumed by a FileExplorerLayout gate covering both tree and editor. Omitted-target defaults elsewhere remain intact. Conversation/composer objects and launch drafts remain intact.
- Existing native/Codex/Claude restore wiring already reads new saved cwd and exact provider identity. Do not add fallback new sessions. Real cross-directory continuation is an explicit downstream validation gate.
- Evidence E01–E36, sources/commands/limitations in canonical investigation. Representative schema fixtures plus current exact readers/writers support no migration; no real user-data bulk inventory performed.

## Review correction and exact re-review request
- Incoming ARCH-REV-001 (round 1) reviewed SR-003 / approved SR-002: **Fail — Design Impact**, one Medium blocking **AR-F001**, REQ-005 / AC-005 / BEH-004. Its independent AR-P001 source trace showed normal History selection retains a launch draft A; clearing B context metadata alone let missing Files IDs fall back to A. No live reproduction was claimed by review or this correction.
- SR-004 keeps approved behavior unchanged; no renewed approval or Product handoff required. Server-owned propagation, one stopped-root Save/readback, no application-data migration and retained continuation are preserved.

| AR-F001 requirement | SR-004 authoritative design change |
| --- | --- |
| Extend DS-002 through meaningful Files effect | Canonical result → guarded retained context → RightSideTabs explicit Org ID/null → FileExplorerLayout gate → both consumers at B or unavailable placeholder |
| Explicit unavailable contract and owners | Layout `workspaceId?: string \| null`: null prevents both child mounts; undefined retains intentional defaulting. RightSideTabs uses existing Org kind discriminants. Terminal already safe and unchanged. |
| Suppress stale fallback, not drafts | Remove selected-Org null→undefined coercion and unconditional descendants for null; use v-if, not v-show/active=false. Reuse listener/session cleanup; no global getter, History, launch-draft or lower-consumer fallback rewrite. |
| Concrete file and test ownership | RightSideTabs.vue, FileExplorerLayout.vue, localization; layout tri-state tests, parent-prop tests, composed RightSideTabs.workspaceTarget.spec.ts regression with real fallback getter/consumers. |
| Retained different workspace regression | A launch draft remains; normal History selects stopped Org; Team Save B + metadata failure; neither tree nor editor displays/initiates work in A, including Cmd/Ctrl+S. Cover already-mounted C cleanup, tab reactivation, read/reopen retry to B and unchanged A draft/context identity. |

Re-review AR-F001 using the revised DS-002 contract, owners/interfaces/file mapping, removal rules, concrete example and validation section. Do not infer a test pass from these plans. Only the independent reviewer may close the finding. Do not clear launch drafts globally or broaden scope.

## Risk and classification rationale
Medium: bounded changes to existing Org configuration/API and frontend edit/publication owners, reusable workspace capability and focused tests, not a new runtime subsystem. Mechanical naming/import changes are included. The correction adds two existing presentation owners and focused tests/text, not a new subsystem.
High: material stopped-config contract and mutable persisted-field invariant changes, child propagation, concurrency/readback preservation, filesystem-target UI publication and unverified external provider cross-directory resume. No low-risk shortcut based on apparently simple UI control.

Risks are validation work, not claimed passes: live provider cross-directory resume (especially retained external session lookup), workspace-contextual options/schema availability, async metadata/stale-response publication. No workspace prerequisite or requirements decision blocks independent review. If evidence requires history migration/reset, different active-edit policy, global/root editing or broad runtime/capability changes, return a Design Impact/Requirement Gap to Solution Designer before expanding scope.

## Workspace, base and finalization
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace`
- Branch: `codex/offline-org-team-workspace`
- Refreshed base remote/branch/revision: `origin/personal`, `da86efe07f7f71e7455db6a866286af0bf0debd7` (fetched before creation).
- Potential finalization target: `origin/personal`, controlled by later Delivery/user gates; no merge or release done/requested here.
- Source unchanged. Package files are persisted untracked in the isolated worktree, not committed; no main checkout changes. Main checkout's pre-existing unrelated edits were left untouched.

## Canonical absolute artifact paths
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/in-progress/offline-org-team-workspace/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/in-progress/offline-org-team-workspace/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/in-progress/offline-org-team-workspace/design-spec.md`
- Cumulative revision index: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/in-progress/offline-org-team-workspace/solution-revision-record.md`
- User screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/in-progress/offline-org-team-workspace/evidence/user-subteam-workspace-control.png`
- Feasibility probe: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/in-progress/offline-org-team-workspace/evidence/current-owner-probe.json`
- Historical initial analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/in-progress/offline-org-team-workspace/analysis-result.md`
- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/in-progress/offline-org-team-workspace/solution-handoff.md`
- Prior independent architecture report: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/in-progress/offline-org-team-workspace/design-review-report.md` — ARCH-REV-001 Fail on SR-003, not a review of current SR-004.
- Architecture review history: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/in-progress/offline-org-team-workspace/architecture-review-revision-record.md` — reviewer owned; unchanged.
- Independent code review, implementation, executable validation, delivery and Product-owned artifacts: **N/A — not applicable**.

## Expected output and authority boundary
Re-review approved SR-002 behavior against SR-004 design and disposition AR-F001, including preservation, server-owned child propagation, one Save/readback, no-migration proof, metadata publication **through both Files consumers**, retained launch-draft regression and real-provider test gates. Apply independent review workflow and handoff rules. Findings that change intent require renewed user approval through Solution Designer. Informational reviewer pass should not ask Solution Designer to duplicate forwarding.

## Handoff rule decision and delivery
SR-003 was previously delivered to Architecture Reviewer and returned as ARCH-REV-001 Fail / Design Impact. After persisting and checking SR-004, called `get_handoff_rules`; selected the single most-specific matching rule: revised Architecture Design Complete with architectural_risk=High and approved requirements → `/architecture_reviewer`. The Medium/Low direct route and delivery-receipt rule do not match. Ordinary re-review message to that exact recipient follows; no delegation or duplicate implementation notification. Delivery success is established only by the send tool confirmation.
