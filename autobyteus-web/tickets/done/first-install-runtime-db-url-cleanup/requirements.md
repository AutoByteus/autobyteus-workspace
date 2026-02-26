# Requirements - first-install-runtime-db-url-cleanup

## Status
Design-ready

## Goal / Problem
Ensure a brand-new user can start the desktop app successfully, load agent definitions without backend DB init failures, and use the embedded node from LAN when expected.

## Scope Classification
Small

Rationale:
- Change set is localized to runtime env composition and config cleanup.
- No schema or API contract changes.
- Cross-repo touch is limited and mechanical (`DB_NAME` removal).

## In-Scope Use Cases
- UC-001: Fresh install startup initializes server and DB successfully.
- UC-002: Agents page GraphQL query `agentDefinitions` returns successfully (no fetch failure).
- UC-003: Embedded server is reachable via LAN IP when network policy allows.
- UC-004: Legacy `DB_NAME` code/config references are removed; `DATABASE_URL` remains canonical.

## Acceptance Criteria
- Packaged app starts with a clean HOME profile and healthy REST endpoint.
- GraphQL `agentDefinitions` query returns data (including empty list) without initialization errors.
- LAN health check to host LAN IP and internal port succeeds from local host.
- Repository search shows no `DB_NAME` references in active code/docs/scripts under touched projects.
- Targeted tests and build checks pass for changed modules.

## Constraints / Dependencies
- Keep no-backward-compatibility stance for deprecated DB env key usage.
- Keep data backup concerns separate from runtime code cleanup.
- Respect existing repository dirty state outside scoped files.

## Assumptions
- Embedded internal port remains `29695`.
- Node discovery defaults remain unchanged by this ticket.

## Open Questions / Risks
- None blocking for this scope.
