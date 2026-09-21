# Architecture Design Complete — OPTIONAL-AVATAR-20260915-001
SR-002 / DS-001 Ready; Approved requirements SR-001 reaffirmed by latest user message; **Small / Low**. First handoff for NEW optional-definition-avatar ticket. Not a reopen of completed Team package/Activity/AORG tickets.

## Original request and scope
After previous actual package validation found7 Teams missing required avatarUrl, user explicitly said avatarUrl should be optional like defaultLaunchConfig, requested new quick-fix ticket for all placements, then reaffirmed individual Agent, Team and Org optionality and “please continue.” Missing/null=no avatar; supplied values retain current family handling. Preserve Agent normalizer (already works), real refs/admission, source nonmutation, current writer/migration behavior. No URL validation overhaul, unrelated optional fields, Org metadata tolerance, new UI, migration/conversion, runtime changes or external package edit.

## Workspace/base
/Users/normy/autobyteus_org/autobyteus-worktrees/optional-definition-avatar; branch codex/optional-definition-avatar. Fresh origin/requirements/flat-agent-organization-model21efd0b6a49d1b771ed6a71b80b7e9e5531f09e4 fetched and worktree creation confirmed. Eventual target same unreleased feature base, NOT personal. No commit/push/merge/release authority inferred. External /Users/normy/autobyteus_org/autobyteus-agents remains read-only. No user-server/runtime/provider/DB actions.

## Findings / design
Agent current normalizer accepts omitted/null avatar across shared, Team-local, Org-local and application-owned reads. Team input reader defaults launch config only, so add avatar omission normalization. Org strict parser used by provider, admission AND owned-source index; absent parent avatar currently suppresses owned discovery. Add one Org input boundary shallow-copying root/defaulting only absent avatar then strict parse; switch those3 raw reads, keep transactional validation/builder strict. No generic Org unknown-key tolerance; defaultLaunchConfig and other required Org fields unchanged.5 production modifications total; no Agent production change anticipated. Complete design maps files/sequence/ownership/ACs and tests. No material design blocker.

## Verification expected / uncertainty
Tests for omitted/null/supplied/malformed present values, source hashes, actual owned-source index and exact IDs, supported placement parity, catalog/fallback UI. Previous7 missing-avatar exclusions are historical evidence only, not this ticket's results; validate actual supplied package count and retain nested exclusion without edits to force green. Agent non-string normalization remains as-is; do not silently tighten. No implementation or executable test result yet. Implementation owns scoped checks; API owns actual import/reload/catalog/select/fallback in owned test environment. No full provider/platform validation requirement for metadata change.

## Cumulative artifacts
All canonical files under /Users/normy/autobyteus_org/autobyteus-worktrees/optional-definition-avatar/tickets/in-progress/optional-definition-avatar:
requirements-doc.md (approval/scenarios/REQ/AC), investigation-notes.md (bootstrap/current source/limitations), design-spec.md (DS-001), solution-revision-record.md (SR001–002), solution-handoff.md (this complete packet).
Historical external supplement: /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-base/tickets/done/tolerant-flat-team-package-reading/api-e2e-execution-coverage-report.md; API-owned prior evidence, read-only.
Product/independent architecture/source review artifacts N/A—not applicable to this small low-risk result. Implementation/API/Delivery results not yet produced. No previous pass reused.

## Routing
Current get_handoff_rules selected sole Architecture Design Complete Small/Low rule → /software_engineering_team/implementation_engineer. Product, High-risk review and delivery-gap rules do not apply. Send this file and cumulative authority to that exact recipient. Transport success only from subsequent tool receipt. No duplicate assignment or parallel review. Finalization is a later Delivery gate, not this handoff.
