# Unreleased Feature-Branch Notes

OPTIONAL-AVATAR-20260915-001 — working candidate for requirements/flat-agent-organization-model; not released or finalized.

- Agent, Team and Org definition reads accept omitted/null avatars as no image across supported placements, without rewriting package files.
- Org parent omission no longer hides otherwise valid owned definitions. Existing exact references, required values, strict saves and family-specific malformed-value handling remain unchanged.
- Existing Agent/Team image-or-initials and Org initials presentation preserved; no new image UI, migration or runtime work.

API-REV-001 Pass95.0% scoped confidence; current12flatTeams available,2nestedparents excluded. User accepted; finalization tracked in delivery report. No release/deployment authorized; full scope and limits in API report.
