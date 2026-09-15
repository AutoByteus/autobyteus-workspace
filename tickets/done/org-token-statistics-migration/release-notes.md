# Unreleased Feature-Branch Notes

ORG-TOKEN-MIGRATION-20260915-001 — target `requirements/flat-agent-organization-model` only; not a production release.

- Complete token ownership in existing `20260901_agent_org_flat_team_families_v1`, after the existing token materialization prerequisites.
- Preserve accumulated usage/costs, checkpoints, conversation/thread IDs and history while removing retired Team attribution for exact converted Org members.
- Restrict expensive family-migration history work to nested-Team sources and incomplete work; standalone/flat-Team histories remain excluded. Ordinary invocation can finish remaining token work when history conversion is already empty.
- Reject incompatible current token ownership before Org runtime construction. Existing successful-ledger skipping remains unchanged; no automatic replay/reset or second migration.

Evidence: API-REV-001 reports 402 passing tests/79 files, zero skips; CRR-002 test review Pass. Migration-to-continuation uses real server runtime/SQLite with a scripted external backend and deterministic pricing. No live provider, browser, Electron, user-profile or total-startup performance qualification. Default test-inclusive TypeScript configuration still reports TS6059; source-only/selected-test compiler and server build pass.

No version bump, tag, installation, publication or deployment is included. Any real-profile rerun/ledger preparation requires separate operational approval, stopped writers and matching SQLite-consistent database/memory backups. Do not reset a successful ledger to make this change run automatically.
