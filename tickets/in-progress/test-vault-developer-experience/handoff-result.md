# Handoff: test-vault-developer-experience — SR-006, Architecture Design Complete

- Package: `test-vault-developer-experience` (Project Task `c15a77b2-18b8-4ac6-b3de-8afcba81211e`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user. The user decides directly in the Solution Designer conversation.
- Classification: `Architecture Design Complete`, `task_size = Large`, `architectural_risk = High`
- Approval: requirements @ SR-006 approved by the **user** on 2026-10-19 in the Solution Designer conversation: "I think we should go into this direction because the industry has set up a very good standard" and "if you don't set this, it by default uses the production itself". DEC-011 was decided within that direction.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience`, branch `codex/test-vault-developer-experience`, base `origin/personal` @ `d28c56d5d`, finalization target `origin/personal`. The ticket documents are committed on the branch (see the commit below).
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience/tickets/in-progress/test-vault-developer-experience/`

## Original request and goals

- Make real-provider tests easy and safe: one standing test vault, set up once by a one-command non-interactive setup, found automatically by autobyteus-ts and server live tests, test servers, API/E2E harnesses and isolated Electron instances.
- No key ever travels through the environment, chat or logs.
- The user's real vault and app data are never touched.
- Live tests stay opt-in.
- One message in TESTING.md, `AGENTS.md` and the skills.
- The user's model (2026-10-19): "like a database". One environment variable (`AUTOBYTEUS_TEST_VAULT`) selects the vault, normal logic is unchanged, and when it is unset production uses its own vault.

## The design in one paragraph

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
