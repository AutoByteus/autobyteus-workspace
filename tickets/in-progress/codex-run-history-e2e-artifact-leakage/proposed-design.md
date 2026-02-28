# Proposed Design

- Ticket: `codex-run-history-e2e-artifact-leakage`
- Scope: `Medium`
- Stage: `3 - Design Basis`

## Design Goals

1. Prevent future test artifact leakage into normal developer run-history.
2. Preserve runtime behavior for real user runs.
3. Provide explicit, safe remediation for existing leaked E2E entries.
4. Keep concerns separated: test harness isolation vs run-history cleanup utility.

## Current-State Problem Summary

- Codex live E2E tests run with the same persistence root used by normal local server usage.
- Some tests create workspace roots with prefixes like `codex-continue-workspace-e2e-*`.
- Run history persists those paths and frontend groups display them as workspace entries.

## Future-State Design

### A) Test Harness Isolation (Primary Prevention)

- Add Codex live E2E suite-level setup to set a unique temporary app data directory before GraphQL operations.
- Create a per-suite `.env` in that temp app data dir with required runtime config values.
- Route all test-generated memory/run-history artifacts into this temp dir.
- Remove temp dir in suite teardown.

Why this design:
- Prevents cross-contamination with normal developer data.
- Keeps production run-history code unchanged.
- Mirrors existing pattern used by other E2E suites in this repo.

### B) Existing Artifact Remediation (Safe Cleanup)

- Add a targeted cleanup script under repository tooling scope that:
  - reads run-history index,
  - matches only known Codex E2E workspace prefixes,
  - removes corresponding run-history entries/manifests,
  - prints a summary of removed vs skipped entries.
- Keep cleanup explicit/manual (no automatic startup purge).

Why this design:
- Avoids risky automatic data deletion.
- Allows one-time cleanup of already polluted local environments.

## Separation of Concerns

- **E2E test files**: responsible only for test sandbox/environment setup and teardown.
- **Run-history domain services**: unchanged for business behavior; no test-specific filtering logic injected.
- **Cleanup utility**: isolated operational tool, not mixed into runtime request flow.

## Alternatives Considered

1. Frontend filtering by workspace prefix only.
- Rejected: hides data but does not prevent persistence pollution.

2. Backend runtime filtering in listRunHistory for known test prefixes.
- Rejected: mixes test concerns into production data path and may hide legitimate data.

3. Automatic cleanup on server start.
- Rejected: too risky for accidental deletion in shared environments.

## Impacted Files (Planned)

- `autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
- `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
- `autobyteus-server-ts/scripts/` (new cleanup script)
- ticket artifacts for workflow tracking and validation.

## Validation Strategy

- Verify Codex E2E suites write into isolated temp app data roots.
- Verify default memory index does not gain new `codex-continue-workspace-e2e-*` entries after suite run.
- Verify cleanup script removes existing leaked entries safely.
- Run affected backend + frontend tests.

## Risks and Mitigations

- Risk: app config already initialized before test sandbox setup.
  - Mitigation: set custom app data dir before first GraphQL execution in suite lifecycle.
- Risk: cleanup prefix misses variants.
  - Mitigation: maintain an explicit allowed prefix list and document extension process.
- Risk: cleanup deletes valid data.
  - Mitigation: strict prefix matching + dry-run option.
