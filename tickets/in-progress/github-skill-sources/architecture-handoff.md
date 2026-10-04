# Architecture Handoff — github-skill-sources

## Result
**Architecture Design Complete**; current solution round **SR-008**; requirements **Approved SR-006**; design **Ready for re-review** after ARCH-REV-001 / AR-001 (Design Impact). Classification: **task_size=Large; architectural_risk=High**. No implementation or executable validation has been performed. This is a review-ready design package, not a delivered feature.

## Original Request And Approved Goal
User requested public GitHub imports for standalone skills, analogous to existing agent-package imports with automatic update checks and click-to-update. Screenshot shows existing Manage Skill Sources. User repeatedly confirmed existing local-folder support and duplicate-name policy must remain. They explained the rationale: explicit custom skill/package imports take precedence over forgotten Codex/Claude defaults. Ordinary-source conflicts abort the entire operation with existing conflict details; runtime-default copies are ignored with notices, never deleted/overwritten.

Approved v1: public repository-root HTTPS URL/default branch; root single skill or bounded collections; managed source rows in existing Sources modal; automatic checks when modal opens/manual recheck; explicit whole-source update with local-edit overwrite warning; failures before publication preserve previous usable skills; confirmed removal deletes managed copy only; retain local unlink behavior, name-based agent selections and disabled choices. No private auth/subfolder/branch picker, marketplace, general parser rewrite, unattended installs or live active-run refresh.

## Approval Evidence
**USER-APPROVAL-006**: user message “Yes, let's go.” after complete scope proposal and policy clarifications. Immutable pre-approval-content snapshot SHA256 `65035d7ba2b63e33eef2e8c8bbd72066cfb0f4148eb129fc798aec004d4dccb8`; snapshot's Draft/Ready label is historical, not current approval status. Canonical requirements record explicit approval. No behavior-defining Product supplements; screenshot is supporting existing-state evidence.

## Workspace And Repository Context
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources`
- Branch: `codex/github-skill-sources`
- Base: `origin/personal` @ `278fc7ee8eccf3fdcbdbbe9696f8689e8b1c89c0`, refreshed before worktree creation.
- Finalization target: `origin/personal`; finalization/release/cleanup not performed. Shared checkout has unrelated changes and was untouched.
- Instructions: server/web AGENTS.md and workspace TESTING.md read. Skill documents are under `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/` (not present in worktree). Use existing isolated task workspace; do not reset onto shared checkout.

## Canonical Artifact Paths
1. `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/requirements-doc.md`
2. `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/approved-requirements-sr006.md`
3. `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/investigation-notes.md`
4. `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/design-spec.md`
5. `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/solution-revision-record.md`
6. Historical approval-hold log: `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/approval-request.md`
7. This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/architecture-handoff.md`
8. Original image: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_514fa513d97e4c619c3d3d19d0ab08a1/solution_designer_e97a3e16fbcc4ab0806f269605f49305/context_files/ctx_d256777e369f__image.png`
9. Reviewer-owned report: `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/design-review-report.md`
10. Reviewer-owned history: `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/architecture-review-revision-record.md`
Latest review is **ARCH-REV-001 Fail / AR-001 against SR-007**, committed as 56356b688; not a pass for SR-008. Implementation handoff, code review, API/E2E and delivery artifacts: **N/A — not applicable yet**. Product repository/UI/UX spec: **N/A — not requested**.

## Technical Design Summary And Evidence
- Source lifecycle owner is separate from SkillService's catalog/content ownership. Reuse one existing duplicate validator; add only explicit old-source exclusion on update and managed repository layout discovery.
- New GitHub registry selects complete downloaded generations; unchanged AUTOBYTEUS_SKILLS_PATHS continues to mean local folders. No schema migration/historical startup gate; migration guideline and closest historical skill migration inspected (A-007–009).
- Candidate archives remain off-catalog until a no-await current-catalog check and atomic small registry publication. Metadata observations and removal cannot resurrect stale records. REMOVING is bounded domain state for retrying approved deletion.
- Shared metadata transport is extracted from agent installer; skill archive preparation does not import agent definitions or reuse package-root validation. New direct patched tar 7.5.22, archive/link boundary and no scripts executed; old agent extraction is explicitly out of scope.
- New source DTO/mutations extend Sources UI, retaining local path actions/conflict dialog. Generation-root changes require two separate consumer transitions: transient skill workspace close/rebind and existing runtime materializer DS-008 managed-identity transfer on later-run acquisition. Old holders are retained, old run contexts are not hot-reloaded, and new same-workspace runs can use the current generation without closing the previous run.
- Existing policy/root path/cached workspace observations are source evidence. New technical mechanisms are proposed design, not proven implementation.

## Review Focus / Risks
High risk derives from materially new persistence, API, untrusted archive and concurrency boundaries. Review: no-await publication versus all current mutators, active-generation admission, before/after-commit failure semantics, source removal retry/cleanup truthfulness, safe links/Windows path semantics, stale file workspaces, runtime holder/link transition and effective bootstrap results, registry-error reporting and neutral GitHub extraction regression. All blockers must trace approved REQ/AC/BEH IDs; do not turn unrelated policy/security expansion into an implementation obligation.

Unknowns are implementation/test verification, not unresolved product intent. No source mutation probes, unit tests, archive extraction tests or app UI validation run during design. Read-only installed metadata probe inspected only source-setting count and registry shape; no secrets or production files changed.

## AR-001 Recovery And Expected Next Output
Requested output: **independent architecture re-review of SR-008**, specifically AR-001 closure or remaining technical findings. Requirements are unchanged and remain explicitly approved.

AR-001 premise accepted: user updates skills then starts another conversation using the existing header ＋ and Send with the same workspace while the prior run is still open. Old runtime holder g1 is independent of transient skill_ws caches; deleting the old source tree does not clear that holder. No artificial race needed.

Correction is in canonical design (DS-003/006/008): catalog-assigned managed provenance, stable sourceId+exact-name identity, current-catalog revalidation, serialized owned-link transfer in WorkspaceSkillMaterializer/WorkspaceSkillLinks carrying occurrence holders forward, and effective prepared requests propagated to runtime bootstrap. Different-source identity mismatch and user-owned workspace collision rules remain. Source lifecycle does not enumerate runs or edit runtime registries. No stop-runs/update restriction, eager model refresh, persistent lease journal or changed user intent.

New evidence A-012–015; exact production file mapping and validation include import/start A/update/start B via header ＋/Send with A still live, old tree live/deleted, reverse release order, failures/retry and genuine collision regression. No executable tests performed; this is revised design, not a code fix. AR-001 is addressed by proposal, not marked closed by Solution Designer.

Independent architecture review of the cumulative package is required before any implementation handoff. On material requirement/design findings return precise findings through workflow rules. On pass follow Architecture Reviewer's configured primary route; notify Solution Designer informationally without asking it to duplicate forwarding.

## Routing Decision
Prior SR-007 route was /architecture_reviewer and returned ARCH-REV-001 Fail. SR-008 is Architecture Design Complete with Large/High and unchanged approved requirements. Full re-review context persisted before new get_handoff_rules lookup; actual selected rule/recipient will be recorded below. No implementation recipient notified.

Repository pins: initial authored package ba24cd4ff, route record 33cd78131, reviewer artifacts 56356b688. Current revision changes only Solution Designer-owned documents; reviewer report/history remain read-only. No production files or finalization changed.

SR-008 lookup result: get_handoff_rules returned the same three routes. Exactly one matches: completed/revised approved architecture with task_size=Large or architectural_risk=High → **/architecture_reviewer**. Send this full handoff for re-review; direct implementation and delivery-gap rules do not match.
