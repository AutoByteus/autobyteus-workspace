# Requirements — Optional definition avatars

## Status / Approval
OPTIONAL-AVATAR-20260915-001; Solution Designer; 2026-09-15; **Approved SR-001**.
User explicitly states “avatarUrl ... should be optional” after missing/null=no avatar and supplied-value normal validation were explained. Then requests “lets bootstrap. a ticket to quickly fix this ... applies for all the agents does not matter it belong to independent agent team or agent org right?” Approval applies to missing-avatar behavior across definition families/placements; no approval to tighten existing Agent malformed-value policy or alter unrelated optional fields. Prior ticket approval not reused. No Product or behavior-defining supplements.

Latest explicit confirmation: “for individual, agent team or agent org, this avatarUrl are optional actually right? ... please continue.” This reaffirms all3 families and continuation of this ticket; no additional behavior beyond SR-001.

## Problem / Outcome
Team/Org definitions can be rejected solely because optional presentation metadata avatarUrl is absent. A rejected Org can also hide its owned definitions. Independent Agents already normalize absence to null. Make absence/null equivalent to no avatar for Agents, Teams and Orgs and their supported placements, without source edits or altered reference validation.

## Behavior / Scope / Scenarios
| Behavior / Use case / Scenario | Current | Desired / preserved | Basis |
| --- | --- | --- | --- |
| BEH-001 / UC-001 / SCN-001 | Team input fails when avatarUrl absent | Otherwise valid Team available with omitted/null avatar, existing fallback UI | User imports/reloads authored package and selects Team; prior actual7 missing-avatar exclusions |
| BEH-002 / UC-002 / SCN-002 | Org exact parser requires avatar, owned-source discovery parses parent | Otherwise valid Org loads and owned Agent/Team lookup works with avatar omitted at parent/child; same IDs/ownership | User asks placement independence; normal authored Org load/select/member discovery |
| BEH-003 / UC-003 / SCN-003 | Agent normalizer already accepts missing/null, all supported placements share it | Preserve standalone/Team-local/Org-local/application-owned Agent behavior and supplied value handling | Source-backed existing behavior, user parity request |
All Supported Normal Scenarios: author omits optional image, user registers/reloads package, browses catalog/selects a definition or inspects its member; absence does not prevent usability. Alternate: required consumed fields/unresolved references still make a definition unavailable; providing an avatar retains its existing meaning. This ticket does not redefine invalid input as valid.

### Scope Guardrail
In: optional avatarUrl at normal definition-read boundary for all3 families, existing placements, source nonmutation, truthful catalog/no-avatar presentation and required-value/ref checks. Out: optional Org defaultLaunchConfig or other unrelated fields, broader Org metadata tolerance, avatar upload/URL security redesign, stricter Agent validation, new UI, nested Team support, conversion/migration/reset/runtime lifecycle work, external package edits, release. Prior automatic-definition-migration deletion and software-owned history migration must remain intact. Normal explicit authoring saves unchanged.
Review findings must trace to these REQ/AC/BEH IDs; new policy is a Requirement Gap requiring explicit user approval, not scope invented by reviewer or implementer.

## Requirements / Acceptance / Traceability
- REQ-001 / BEH001,002 / AC-001: otherwise identical valid Team and Org with avatarUrl missing or null both load/admit and return no avatar. Valid supplied avatar preserved; Team/Org existing malformed present-value rejection preserved.
- REQ-002 / BEH002,003 / AC-002: missing avatar does not affect exact-ID resolution or availability of otherwise valid independent, shared, Team-local, Org-local or application-owned Agents/Teams supported by existing source model. Existing Agent normalizer behavior unchanged. Org parent omission must not suppress its valid owned Agents/Teams.
- REQ-003 / BEH001–003 / AC-003: read/import/reload source bytes unchanged. No redundant-null rewrite, migration or provider activation just for reading. Required members/scopes/coordinator/handoffs/launch settings still validate; supplied nested parents remain unavailable, valid siblings independently usable.
- REQ-004 / BEH001–003 / AC-004: existing catalog/detail no-avatar fallback works with the normalized result; supplied avatars remain displayed normally. No new UI design or replacement image requirement.
Each AC uses corresponding SCN001–003 normal import/reload/select as applicable. Verification: codec positive/negative; provider/admission/discovery actual references and stable IDs; source hashes; actual browser catalog/select/fallback at relevant family surfaces. No all-provider launch matrix needed for image metadata.

## Data / Constraints / Supplements
Maintain external and server-authored definitions, ownership, IDs, revisions, run state and existing stored avatars. No loss/reset/rewrite authorized. Canonical serialization may retain null on ordinary user saves; no new requirement to omit it in output. Independent Agent's current normalization of non-string avatar to null remains, not silently tightened to match Team/Org.
Canonical investigation-notes.md is evidence; prior archived TEAM-PACKAGE-READ API report is provenance only, not current acceptance. No material product decision open. Product/UI prototype N/A; existing no-image UI only. Input model unchanged. No time/performance guarantee added.

## Readiness / Architecture Input
Current/desired/preserved behavior, scenarios, scope and measurable ACs recorded, user explicit intent approved: Yes. Readiness blocker None. Confirm all Org parse consumers including owned-source discovery, retain canonical write validation and Agent normalization, classify completed scope after design. Git/release finalization not authorized by this approval. Eventual base origin/requirements/flat-agent-organization-model, NOT personal.
