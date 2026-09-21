# Architecture Design Complete — ORG-STOPPED-CONFIG-20260917-001

Current SR-003 / DS-001; Medium / High; requirements SR-001 approved explicitly SR-002 (2026-09-17 user affirmed Team parity, same-runtime equal/larger model or settings changes). No changed intended behavior or additional approval pending.

Original request: screenshots show stopped direct/mounted Org members lack monitor gear/+ while stopped Team and live Org have them. User asks new ticket from feature base and functional configuration parity. Root cause: live-only header+entry conditions and separate wholly read-only Org panel. A header-only patch cannot satisfy approved Save behavior.

Design: focused member config read/edit/save through existing Org lifecycle owner; reuse Team/personal RunModelSelectionService and root-owned canonical tree pattern. Existing manager lane serializes inactive write vs restore; existing atomic writer/readback returns classified failure/uncertainty. Model-only exact-leaf patch; no runtime/workspace/identity change or startup. Renderer draft and config-only publication preserve history/Activity/attachments/selection. Plus retains new Org route. Active/task/application-bound restrictions preserved. No migration, nested-Team recreation or standalone writer bypass.

Workspace /Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-member-header-actions
Branch codex/stopped-org-member-header-actions
Fresh bootstrap base origin/requirements/flat-agent-organization-model @36c149b26c429a0ca6689442fe2aea067533a638
Eventual target origin/requirements/flat-agent-organization-model, NOT personal.
Original personal source reference5645b49d6f51faa60bd3545bc8e3f0e7e3f96793; source comparison only, not old runtime replay.

Canonical artifacts (same directory /Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-member-header-actions/tickets/in-progress/stopped-org-member-header-actions): requirements-doc.md, investigation-notes.md, design-spec.md, solution-revision-record.md, personal-stopped-config-comparison.md, bootstrap-handoff.md and evidence/*.png. Read cumulative package; screenshots are user evidence, not independently rerun UI.

Review focus: REQ-001–006/AC-001–006 full supported UI→save→continuation path; exact root/address/Agent identity; strict same-runtime compatibility reuse; serialization and atomic result/readback; stale renderer and model-only publication; no provider startup; native/external validation boundaries. Medium/High classification is based on durable/API/lifecycle contract change. Designer has not edited production/tests, run tests, touched user data/app, committed/pushed/merged, or assigned implementation. No prior specialist work on this ticket to supersede. No finalization or Electron build authority implied.

Expected next action: independent architecture review under current rules, then normal reviewed implementation/source/API route. API acceptance must use actual Settings/Save and ordinary Send, not an API-only workaround. User app/data remain untouched. Risks and deferred broader policies detailed in design-spec.md.

Routing: current get_handoff_rules returned four routes. Sole applicable rule: Architecture Design Complete with architectural_risk=High → /software_engineering_team/architecture_reviewer. Product, Low-risk direct and delivery-gap routes do not apply. Only that recipient will be notified. Transport not yet claimed.
