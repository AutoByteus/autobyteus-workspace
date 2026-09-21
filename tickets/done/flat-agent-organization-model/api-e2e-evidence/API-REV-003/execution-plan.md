# API-REV-003 Cumulative Real-System Validation Plan

## Gate and artifact

- Requirements: `RER-021`
- Architecture: `AD-REV-007`; `ARCH-REV-005 / Pass`
- Implementation: `IR-012`; source `3e38be96596432df8e3f459056d908786b5371bd`
- Source review: `CRR-013 / Pass — cumulative source`, with held-origin gate cleared by `CRR-014`
- Artifact HEAD: `73a2c06eb14e3c5a7d91322aae7f42dbc4de0e0a`
- Prior API/E2E: `API-REV-002 / Fail / 92.3%`

Architecture and Code Review classify prior `API-FIND-008` as `Not Reproduced /
invalidly confounded validation evidence`, with `No Architecture Impact`. The
cumulative rerun is permitted. This round first rechecks the two implementation
fixes and corrected narrow interaction, then re-executes the material Team/Org
package, task, persistence, restart, restore, and lifecycle boundaries.

## Test data and environment

- Reuse the retained validator-authored package
  `api-e2e-fixtures/aorg-api-rev-002-agent-package` only after its complete
  `PACKAGE.sha256` verifies. Import it through the real Settings UI using an
  AutoByteus `open_tab` Chromium tab; do not seed the registry directly.
- Use a new API-REV-003-owned data root, SQLite database, logs, temp workspace,
  ports, browser tab, and server processes.
- Run the built backend and production-built Nuxt renderer.
- Use real Codex App Server execution with `gpt-5.6-sol`, reasoning `low`, for
  material conversations and formal task lifecycles.
- Preserve strict GraphQL, stream/log, provider-trace, filesystem/package, DOM,
  screenshot, and process evidence. Recheck fixture hashes after execution.

## Ordered scenarios

1. **Repository/current-package checks** — fixture schemas/hashes; exact
   API-owned tests; IR-012 focused server/web cohorts; cumulative Team/Org,
   migration, stream, history, task, application-package, and build checks.
2. **Import and configuration** — `PKG-001`–`PKG-005`; real Settings import;
   inspect Agent task tools, flat Team composition, and coordinator-free Orgs.
3. **Standalone Team fresh run** — `TEAM-001`–`TEAM-007`; first prompt,
   ordinary message, fresh Agent task, revision/resubmission/acceptance, exact
   focus, stop, and no orphan work.
4. **Inactive Team admission fix** — stop Team, submit one unique prompt once
   from inactive history, and prove that exact first input is admitted and
   durable without manual retry. Exercise a truthful retryable failure where
   practical without weakening strict admission.
5. **Mixed/direct AgentOrg** — `ORG-001`–`ORG-010`; no-focus launch; direct
   Agent and mounted-Team/Agent focus; ordinary routing; fresh Agent and Team
   tasks; accepted Team surfaces; aggregate status; whole-root Stop.
6. **Stopped Org presentation fix** — Stop the exact active Org from the root
   row and prove the URL/context transitions to the existing configuration or
   inactive presentation, never perpetual `Connecting to Agent Org...`.
7. **Correct narrow journey** — at `390x844`, activate the visible primary-nav
   strip, open the transient drawer, expand the Org tree, select a different
   direct Agent, mounted Team, and nested Agent, and prove exact header/composer
   focus plus no horizontal overflow.
8. **Restart/restore/continue** — gracefully stop the server with Team and Org
   history retained, restart the same data root, refresh history, explicitly
   Restore inactive Team and Org roots, prove prior messages/tasks/identities,
   continue both conversations, stop again, and restart to confirm terminal
   history without resurrection.
9. **Strict provider/persistence/API** — retain Team V2 and Org V1 trees,
   explicit `root_subject_kind`, task sidecars/references, system-only binding
   replacement, conversed binding/content preservation, and fail-closed invalid
   variants through durable suites plus targeted real inspection.
10. **Migration/admission/application** — rerun startup preflight/relaunch,
    strict current-package/degraded startup, Brief Studio pack/import contracts,
    and source-immutability checks.
11. **Cleanup** — stop roots and owned processes, close owned tabs, verify
    ports/processes, recheck hashes, and retain only evidence/data.

## Result rule

Any failing critical acceptance criterion yields `Fail` regardless of the
percentage. `Pass` requires every critical scenario above to have direct or
current durable proof, overall confidence at least 95%, and no category below
90%. Stopped scopes are recorded `Not Tested`; prior evidence is retained only
when the current change cannot affect that boundary and its validity is
reconfirmed.
