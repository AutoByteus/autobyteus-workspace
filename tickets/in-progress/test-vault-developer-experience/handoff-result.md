# Handoff: test-vault-developer-experience — SR-010, Architecture Design Complete (SR-009 delta revised after ARCH-REV-003)

- Package: `test-vault-developer-experience` (Project Task `c15a77b2-18b8-4ac6-b3de-8afcba81211e`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user. The user decides directly in the Solution Designer conversation.
- Classification: `Architecture Design Complete`, `task_size = Large`, `architectural_risk = High`
- Approval: requirements @ SR-006 approved by the **user** on 2026-10-19 in the Solution Designer conversation: "I think we should go into this direction because the industry has set up a very good standard" and "if you don't set this, it by default uses the production itself". DEC-011 was decided within that direction.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience`, branch `codex/test-vault-developer-experience`, base `origin/personal` @ `d28c56d5d`, finalization target `origin/personal`. The ticket documents are committed on the branch: design documents at `4bda51cb6d` (this handoff file is updated in the commit after it).
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience/tickets/in-progress/test-vault-developer-experience/`

## Original request and goals

- Make real-provider tests easy and safe: one standing test vault, set up once by a one-command non-interactive setup, found automatically by autobyteus-ts and server live tests, test servers, API/E2E harnesses and isolated Electron instances.
- No key ever travels through the environment, chat or logs.
- The user's real vault and app data are never touched.
- Live tests stay opt-in.
- One message in TESTING.md, `AGENTS.md` and the skills.
- The user's model (2026-10-19): "like a database". One environment variable (`AUTOBYTEUS_TEST_VAULT`) selects the vault, normal logic is unchanged, and when it is unset production uses its own vault.

## SR-010 revision (answers ARCH-REV-003)

- AR-009: only secret ids and a pure `providerSecretId(providerId, slot)` move to autobyteus-ts; the server keeps consumer identities and `ProviderCredentialCatalog` (authorization, search bindings, `isKnownSecretId`), built on it.
- AR-010: wording.
- AR-011: `readSecretEntry` error contract.
- AR-012: AC-018 also on the built server.
- AR-008: A-13 corrected.
- See the review-response rows at the end of `design-spec.md`.

## SR-009 delta

- Trigger: the user's direction relayed by the code reviewer (2026-10-20): autobyteus-ts must reach the test vault from plain scripts too, with "normal logic never has to know".
- Base: IR-001 (`12a23e7b8a`) passed code review CRR-001. API/E2E is holding.
- Change:
  - the vault read side and location policy move to `autobyteus-ts/src/secrets/vault/` (single owner; the server imports it);
  - autobyteus-ts's environment default key source opens the vault named by `AUTOBYTEUS_TEST_VAULT` lazily and read-only;
  - the server disables that default at startup (AC-018);
  - Vitest setup deletes the selector unless `RUN_LIVE_PROVIDER_TESTS=1` (AC-009);
  - the test-support installer and `setDefaultProviderApiKeyResolver` are removed.
- Detail: see "SR-009 Design Delta" at the top of `design-spec.md`.
- Classification: still Large/High → architecture review.

## SR-008 revision (answers ARCH-REV-001)

See the "Architecture Review Response" table at the end of `design-spec.md`.
- AR-001: deterministic workspace harnesses never apply the selector; live runs opt in through their gate; the AC-017 regression proves it.
- AR-002: concrete refused set and two predicates.
- AR-003: documents aligned.
- AR-004: one failure rule (throw at startup).
- AR-005: Prisma-free read path; resolver split.
- AR-006: Gemini explicit mode.

## The design in one paragraph (SR-006 basis, still valid)

- `AUTOBYTEUS_TEST_VAULT=<dir>` holds a location, never a key.
- When it is set, the server's normal vault runtime opens `<dir>/test-vault.db` + `.secret.key` read-only (a `node:sqlite` store behind a new `SecretVaultStore` interface, verify-only bootstrap). The product's `SecretManagementService` and resolvers are reused unchanged. One pure `selectSecretVaultSource` decides this at the two startup sites.
- When it is unset, or the server runs on the real `~/.autobyteus/server-data`, the server uses its own DB vault exactly as today and logs its choice.
- autobyteus-ts gets an optional process-default key resolver, installed only by its test setup (via `test-support/test-vault`) when the selector is set.
- `pnpm test-vault setup|status|remove` manages the vault.
- The env → vault test helper and credential env gates are removed; credential variables are stripped in test processes.
- Electron forwards the selector for isolated launches.

## Documents

- Handoff (this file): `…/handoff-result.md`
- Requirements: `…/requirements-doc.md` (SR-006, Approved)
- Investigation notes: `…/investigation-notes.md` (W-*, F-*, A-01..A-22)
- Solution revision record: `…/solution-revision-record.md` (SR-001..SR-006)
- Design spec: `…/design-spec.md` (SR-006, Ready)
- Supplement: `…/test-vault-evaluation-report.md` (§5.0 approved usage model)
- Other evidence in the ticket folder: `context/55.png` (incident) and `walkthrough/` (baseline logs).

## Review focus I'd suggest

1. The security of a production-code selector: the real-app-data guard (A-20), read-only enforcement, no silent fallback when a selected vault is missing.
2. The autobyteus-ts default resolver slot (global state; only test setup may set it).
3. The test-only dependency path autobyteus-ts tests → `test-support` → server source, and the Vitest self-alias risk (R-A).
4. The `SecretManagementService` store interface change and the extracted `WritableVaultTarget`.

## Open risks

R-A..R-E in the design spec; follow-ups FU-01..FU-04.

## Route

I called `get_handoff_rules` on 2026-10-19. The matching rule is Architecture Design Complete with `task_size = Large` or `architectural_risk = High`, which routes to `/software_engineering_team/architecture_reviewer`. The message was sent to that address.

## Architecture review result (informational)

- 2026-10-19: ARCH-REV-002 **Pass** on SR-008, from `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_de82e19f39ac4442a25216609c2f8983`).
  - AR-001..AR-004 resolved; AR-005/AR-006 accepted.
  - AR-007 (test-support module split for the autobyteus-ts import graph) and AR-008 (A-13 wording) are non-blocking.
- Report: `design-review-report.md`; record: `architecture-review-revision-record.md`.
- The reviewer delivered the implementation handoff to `/software_engineering_team/implementation_engineer`. The Solution Designer does not repeat that handoff.

## Architecture review result (informational, SR-010)

- 2026-10-20: ARCH-REV-004 **Pass** on SR-009/SR-010 (commit `14df2e9005`).
  - AR-009 resolved; AR-010..AR-012 accepted; AR-008 corrected.
  - AR-013 (non-blocking): port the bindings exactly ("OPENAI…AUTOBYTEUS" is shorthand and adds no binding), and give a clear unknown-provider error in the environment default.
- The reviewer delivered the implementation handoff to `/software_engineering_team/implementation_engineer`. The Solution Designer does not repeat it.
- Report: `design-review-report.md`; record: `architecture-review-revision-record.md`.
