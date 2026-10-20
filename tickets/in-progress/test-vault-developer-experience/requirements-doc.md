# Requirements Document

## Document Status

- Status: `Approved` (SR-009)
- Current solution revision ID: `SR-009`
- Package identifier: `test-vault-developer-experience`
- Request / ticket: Project Task `c15a77b2-18b8-4ac6-b3de-8afcba81211e` from `/project_task_manager`. User concern of 2026-10-10, user update of 2026-10-17, user direction in this conversation on 2026-10-19.
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user. The user decides directly in the Solution Designer conversation.
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approval state and reference:
  - **SR-006 (user):** "I think we should go into this direction because the industry has set up a very good standard" (the vault is selected like a database), and "if you don't set this, it by default uses the production itself".
  - **SR-007 (user):** "I think we should write in TESTING.md to set the test vault environment variable. That's important in the requirement."
  - **SR-008 (Solution Designer, within that direction):** resolves architecture review ARCH-REV-001.
    - REQ-005 states which test runs use the test vault (AR-001). This keeps the already-approved preserved boundary "deterministic tests unchanged" and does not change the user's model.
    - REQ-004/AC-004 list the refused folders concretely (AR-002).
    - Superseded wording is aligned (AR-003).
    - One startup failure rule (AR-004, design).
    - The user was informed in the conversation reply of 2026-10-19.
  - **SR-009 (user):** in the code-review conversation on 2026-10-20, relayed with the user's own words by `/software_engineering_team/code_reviewer` (run `code_reviewer_d7dd6fff4f6b4ef5a6afc43d26371de7`):
    - the bar is the database model: set up the test vault once, provide the environment variable, and normal logic never has to know;
    - autobyteus-ts code must reach it outside Vitest too (plain `tsx`/`node` scripts);
    - "do you think we can do it in this ticket? if yes that would be great".
    - REQ-014, AC-009, AC-013, AC-018 and DEC-011 → DEC-013 are revised accordingly. The user was informed in the Solution Designer conversation.
  - SR-001, SR-002, SR-003 and SR-005 were never approved. SR-004's helper-call model was superseded by SR-006.
- Exact approved requirements baseline / solution revision: this document @ SR-009
- Behavior-defining supplements and their approved versions: `test-vault-evaluation-report.md` @ SR-008 (§5.0 is the approved usage model)

## Problem And Desired Outcome

- Problem:
  - There is no standing test vault.
  - Real keys are copied into test databases: per worktree via `secrets:import`, per isolated instance, and per live suite from the environment.
  - autobyteus-ts live tests read raw env vars and are stale.
  - 8 server live suites import every `*_API_KEY` from the environment.
  - Agent shells carry the user's production keys, which led to the skill-update-notice incident.
  - Agents need the importer, absolute paths and a TTY hack.
  - Missing or refused credentials can look like passes.
- Affected actors or systems: developer; coding agent (no TTY); autobyteus-ts live tests; server live suites and `test:e2e:real`; isolated Electron instances; investigation code.
- Desired outcome, in the user's model "like a database":
  - The user creates one standing test vault once.
  - One environment variable, `AUTOBYTEUS_TEST_VAULT`, points at it. Live testing, test servers, isolated instances and investigation code then use it with no other change.
  - When the variable is unset, production behaves as today.
  - No key travels through the environment, chat or logs.
  - The user's real vault and app data are never touched.
  - TESTING.md and `AGENTS.md` tell every agent to set the variable.
- Observable definition of success:
  - On a machine with the test vault, a fresh worktree runs a named autobyteus-ts live test, a server live suite and an isolated instance against it, with the variable plus the test's existing live gate.
  - That needs no import, no absolute path, no TTY and no key in any environment variable.
  - Default deterministic suites give the same results whether or not the variable is set.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001, SCN-002 | Each test DB is provisioned with `secrets:import` (absolute URL, TTY `IMPORT`, `script` hack) | `pnpm test-vault setup` creates/updates the test vault non-interactively and prints the variable to set; `status`, `remove` | General `secrets:import` unchanged for non-test databases | W-01..W-04 |
| BEH-002 | Operational | SCN-004 | `test:e2e:real` uses a hidden per-worktree vault; path not printed; single-scenario run exits 1 | With the variable set, its server reads the test vault read-only; preflight prints the vault location; exit reflects the selected scenarios | Preflight report format | W-08..W-10 |
| BEH-003 | Operational | SCN-003 | autobyteus-ts live tests read env vars, are stale, skip silently | With the variable and the live gate set, clients resolve keys from the test vault (read-only) through the current resolver contract | Default autobyteus-ts tests credential-free | W-05..W-07 |
| BEH-004 | Operational | SCN-005 | 8 server live suites save every `*_API_KEY` from `process.env` into their test vault | With the variable and the suite's gate set, the suite's server code reads the test vault read-only; credential env aliases are ignored | Their `RUN_*` gates | F-15 |
| BEH-005 | Contract | SCN-003..SCN-006, SCN-009 | Inherited production keys reach autobyteus-ts and server E2E tests | No inherited credential variable is visible to or used by any test. Deterministic test runs keep their own vaults even when the selector is exported. | Server unit/integration isolation; default `pnpm test:e2e` results | F-03, incident, ARCH-REV-001 P-001 |
| BEH-006 | Contract | SCN-003, SCN-004, SCN-005 | Missing key → silent skip; provider refusal → pass | Reported per test with reason; never counted as passed; strict mode fails | Preflight already compliant | F-04 |
| BEH-007 | Operational | SCN-002 | Manual cleanup | `pnpm test-vault remove` deletes exactly the vault pair and sidecars | — | W-cleanup |
| BEH-008 | Operational | SCN-007 | Isolated instances need a key import into each instance DB plus a restart | An isolated instance started while the variable is set reads the test vault read-only | Existing isolated-instance start/stop | `docs/isolated-app-instances.md` l.279 |
| BEH-009 | Operational | SCN-008 | Investigation probes read the server `.env` | With the variable (and, in autobyteus-ts, the live gate) set, normal code (`LLMFactory.createLLM(id)`, `new XLLM(model, config)`, server code) resolves keys from the test vault with no extra code | Product runtime resolution path | Task brief; user 2026-10-19 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Developer | Run real-provider tests | Set up once; set one variable | Explicit opt-in to paid calls |
| Coding agent (no TTY) | Run live tests or investigations | Told only "set `AUTOBYTEUS_TEST_VAULT`" plus the test's gate | Never handles key values |
| User (security owner) | Protect production keys and data | Real vault, `.env` and app data never opened by test tooling | No plaintext keys committed, printed or in env |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Create or update the test vault from a secrets file with one non-interactive command | SCN-001 |
| UC-002 | Inspect and remove the test vault | SCN-002 |
| UC-003 | Run autobyteus-ts real-provider tests against the test vault | SCN-003 |
| UC-004 | Run the server real-provider E2E against the test vault | SCN-004 |
| UC-005 | Run gated server live suites against the test vault | SCN-005 |
| UC-006 | Run default autobyteus-ts tests credential-free in any shell | SCN-006 |
| UC-007 | Start an isolated Electron instance that uses the test vault | SCN-007 |
| UC-008 | Use real providers from investigation code with no extra code | SCN-008 |
| UC-009 | Run deterministic suites unchanged while the variable is exported | SCN-009 |

### Out Of Scope

- Live tests that authenticate through CLI logins (Claude, Codex, AGY, Grok).
- Production vault behavior and Settings when the variable is unset, and runtime secret resolution semantics.
- Behavior of the general `pnpm secrets:import` for non-test databases.
- Deleting old stores in production data (`~/.autobyteus/local-vault`, `server-data/secret-store/*`), existing worktree test DBs, or the plaintext keys in `~/.autobyteus/server-data/.env`. These are listed for the user (DEC-008) and never touched by this task.
- New importer aliases.

### Non-Goals

- CI secret distribution; guaranteeing provider entitlement; new providers or scenarios beyond repairing existing live tests.
- Making the selector take effect in deterministic test runs (see REQ-005).

### Preserved Behavior Boundary

- General importer guarantees (BEH-001 preserved column); preflight report; deterministic test isolation; gitignored test roots; `RUN_*` opt-in gates.
- Default `pnpm test:e2e`, server unit/integration and default autobyteus-ts results are unchanged, with or without `AUTOBYTEUS_TEST_VAULT` set (AC-017).

### Prerequisites

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | None found. Everything traced (importer service, vault runtime/resolver, test-runtime bootstrap, live helper, autobyteus-ts clients, Electron env policy) is reusable or inside this ticket's functionality. | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that introduces new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap` and needs explicit user approval.
- Adjacent concerns outside this boundary are non-blocking recommendations or follow-ups, unless they are prerequisites (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | One environment variable, `AUTOBYTEUS_TEST_VAULT` (a vault directory; a location only, never a key), selects the test vault, the way `DATABASE_URL` selects a database. `pnpm test-vault setup` creates the vault at `~/.autobyteus-test/vault/` unless the variable names another directory, and prints the setting to use. The vault is outside production app data and outside worktrees. | BEH-001..005, 008, 009 | Must | "Like a database" | User 2026-10-19 (SR-006) |
| REQ-002 | `pnpm test-vault setup --source <file>` creates or updates the test vault from an explicitly named owner-private secrets file, without a database URL or prompt. Its output is a value-free summary plus the vault location and setting. Replacing configured keys requires an explicit option. | BEH-001 | Must | One-command setup | User 2026-10-17; DEC-003 |
| REQ-003 | `pnpm test-vault status` reports the vault location and value-free configured/missing secret IDs. `pnpm test-vault remove` removes exactly the vault DB/key pair and SQLite sidecars. | BEH-001, BEH-007 | Must | Discoverability, cleanup | Brief |
| REQ-004 | Test-vault tooling refuses a vault location (setup, status, remove, or a selected vault) inside the user's production app data: `~/.autobyteus/**`, and the AutoByteus desktop app's OS data folders, i.e. the Electron `userData` default for app name `autobyteus` (macOS `~/Library/Application Support/autobyteus/**` and `~/Library/Logs/autobyteus/**`; Linux `${XDG_CONFIG_HOME:-~/.config}/autobyteus/**`; Windows `%APPDATA%\autobyteus\**`). Test tooling never opens the user's real vault, `.env` or app data, except a secrets file the user explicitly names to setup, which is read once and never modified. | BEH-005 | Must | TESTING Rule 2 | User 2026-10-17; DEC-003; ARCH-REV-001 AR-002 |
| REQ-005 | When `AUTOBYTEUS_TEST_VAULT` is set, normal key lookups read the test vault with no change to product logic. This holds for: (a) any server the user or tooling starts with the variable, including isolated Electron instances and `pnpm test:e2e:real`; (b) live test runs that opt in through their existing live gate (autobyteus-ts `RUN_LIVE_PROVIDER_TESTS`, the server live suites' `RUN_*` gates); (c) investigation and probe code using autobyteus-ts in any process (Vitest, `tsx`, plain `node`): autobyteus-ts reads the variable itself, like an ORM reads `DATABASE_URL` (REQ-014). Deterministic test runs that the workspace harnesses own keep their own vaults even if the variable is exported: default `pnpm test:e2e`, built test servers started without the live opt-in, server unit/integration, and default autobyteus-ts. No import, transfer or per-test key code is needed. | BEH-002..005, 008, 009 | Must | "Set this one variable and it's good to go"; preserved deterministic isolation | User 2026-10-19 (SR-006); ARCH-REV-001 AR-001 |
| REQ-006 | No credential value travels through process environment variables, command lines, chat, logs or evidence. Tests ignore credential environment aliases and do not expose inherited credential variables to code under test. | BEH-004, BEH-005 | Must | Incident | User 2026-10-17; DEC-004 |
| REQ-007 | Nothing outside `pnpm test-vault setup`/`remove` ever writes to or migrates the test vault: consumers open it strictly read-only. A save attempted while it is selected (e.g. through Settings) fails with a clear read-only error. | BEH-002..004, 008, 009 | Must | One vault for many worktrees | User 2026-10-17 ("read access") |
| REQ-008 | autobyteus-ts live provider tests run against the current client contract and execute real requests when their credential is in the test vault. | BEH-003 | Must | Stale tests | DEC-005 |
| REQ-009 | With the gate set, every absent credential or provider refusal is reported per test with a reason (missing capability and vault location, invalid key, quota, rate limit, model access) and never counted as passed. A strict mode turns them into failures. | BEH-006 | Must | TESTING contract | DEC-006 |
| REQ-010 | `pnpm test:e2e:real` preflight prints which vault is used, and a scenario selection exits 0 when all selected scenarios pass. | BEH-002 | Must | F-07, F-08 | — |
| REQ-011 | `pnpm -C autobyteus-ts test` runs the default suite credential-free, unaffected by inherited credential variables or an exported selector. | BEH-005 | Must | F-03, F-05 | — |
| REQ-012 | An isolated Electron instance started while `AUTOBYTEUS_TEST_VAULT` is set uses the test vault, with no per-instance import or restart. | BEH-008 | Must | "Build the test, the electron instance" | User 2026-10-19 |
| REQ-013 | TESTING.md holds one "Test vault" section that tells every developer and agent who runs tests needing real provider keys to **set `AUTOBYTEUS_TEST_VAULT`**. It gives the exact setting (`AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`, as printed by setup), the one-time setup and status commands, that live runs also need their live gate, and that keys are never taken from `.env` files or environment variables. TESTING.md's **Rules** list states the same as a rule, replacing Rule 4 ("Credentials go through the importer"). Every TESTING.md command example that needs real keys includes the variable. secret_management.md, the server README, the isolated-app guide, the isolated-app skill and the test-running skills point to that section. Per-database import instructions for tests and stale statements are removed. | All | Must | One message; the user: "write in TESTING.md to set the test vault environment variable. That's important in the requirement" | User 2026-10-19 (SR-007) |
| REQ-014 | autobyteus-ts reads `AUTOBYTEUS_TEST_VAULT` itself. When the variable is set, any autobyteus-ts client or `LLMFactory.createLLM(id)` created without a key resolver resolves its key from the test vault, read-only. This works in any process (Vitest, `tsx`, plain `node`) with no setup code, test-support import or extra key code. The forbidden locations (REQ-004) apply on this path too. Applications that manage their own vault (the AutoByteus server) turn this environment default off at startup and always pass their own resolver, so they never read the variable through autobyteus-ts. A missing vault or key is a clear error naming the provider and `pnpm test-vault setup`. Gemini keeps its explicit mode selection (a `GeminiRuntimeResolver`, not a key). | BEH-009 | Must | "Normal logic never has to know whether it's production or test" | User 2026-10-19; user 2026-10-20 (SR-009); ARCH-REV-001 AR-006 |
| REQ-015 | The global agent instructions file (`AGENTS.md`), which every agent loads, states in a few lines to set `AUTOBYTEUS_TEST_VAULT` for real provider keys, and links to the TESTING.md section. | All | Must | Knowledge for all team members | User 2026-10-19 |
| REQ-016 | When `AUTOBYTEUS_TEST_VAULT` is not set, behavior is exactly today's: each application uses the vault inside its own database. A server whose data dir is the user's real `~/.autobyteus/server-data` ignores the variable even if inherited. Every server logs which vault it uses (location only). A selected test vault that cannot be used stops the server with a clear error; it never falls back silently. | All | Must | Production safety; no silent fallback | User 2026-10-19 (SR-006) |

## Acceptance Criteria

| AC ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | SCN-001 | Owner-private secrets file; no vault; no TTY | Setup creates the vault at the default location and prints the location, the `AUTOBYTEUS_TEST_VAULT=…` setting and the created secret IDs; exit 0; no prompt | Group-readable source → existing source error; unrecognized lines ignored without values | Automated + agent run |
| AC-002 | REQ-002 | SCN-001 | Vault holds a secret | Re-run skips configured IDs; the explicit replace option replaces them | — | Automated |
| AC-003 | REQ-003 | SCN-002 | Vault present / absent | Status shows the location and IDs only; remove deletes DB, key and sidecars only; absent → no-op | — | Automated |
| AC-004 | REQ-004 | SCN-001, SCN-002 | Selector or setup location inside any folder listed in REQ-004 (each OS root tested through an injected platform/home) | Refused before any file access with `TEST_VAULT_LOCATION_FORBIDDEN` | — | Automated |
| AC-005 | REQ-005, REQ-006, REQ-008 | SCN-003 | Vault holds the DeepSeek key; fresh worktree; shell carries production `*_API_KEY` vars; variable + `RUN_LIVE_PROVIDER_TESTS=1` | The documented command for `deepseek-llm.test.ts` executes real requests that pass. The test process environment contains no credential variable. The key used is the vault's. | — | Live run (authorized cost) + automated env/resolver test |
| AC-006 | REQ-005, REQ-007, REQ-010 | SCN-004 | Fresh worktree; variable set | Preflight shows the test vault location and configured IDs without any import; `--scenarios=deepseek.llm` exits 0 when it passes; the vault's bytes are unchanged after the run | Missing key → reported missing | Live run + automated |
| AC-007 | REQ-005, REQ-006 | SCN-005 | Vault with the needed key; variable + the suite's `RUN_*` gate | A gated server live suite (e.g. DeepSeek collaborators) runs with keys from the test vault. Setting `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` in the shell has no effect on the keys used. | — | Automated (env alias ignored) + live run at user discretion |
| AC-008 | REQ-009 | SCN-003..005 | Gate on; key absent / provider refusal | Reported as skipped with `missing capability <id> (test vault <location>)` or the classified reason; the summary lists them; strict mode fails | — | Automated |
| AC-009 | REQ-011 | SCN-006 | Shell with inherited production keys and an exported selector, without `RUN_LIVE_PROVIDER_TESTS` | `pnpm -C autobyteus-ts test` runs with the same results as without the selector; no live provider test executes; tests see no credential variable; the setup has removed the selector, so the environment default never opens the vault | — | Automated |
| AC-010 | REQ-012 | SCN-007 | Vault provisioned; variable set | `pnpm isolated-app start …` gives an instance whose Settings show the vault's providers as configured, without any import or restart; a Settings save is refused with the read-only error; the vault is unchanged | Variable set but no vault there → the instance's server fails to start with `TEST_VAULT_NOT_FOUND` naming the setup command | Executable validation (isolated-instance smoke) |
| AC-011 | REQ-006 | All | Any run of tooling or tests | No secret value in stdout, stderr, logs, evidence, env or committed files | — | Automated canary scan |
| AC-012 | REQ-013 | All | Docs and skills | TESTING.md has the "Test vault" section with the set-`AUTOBYTEUS_TEST_VAULT` instruction; its Rules list has the set-the-variable rule in place of the importer rule; every real-key command example in TESTING.md (real-provider E2E, Anthropic caching, DeepSeek collaborators, autobyteus-ts live tests, isolated instances) includes `AUTOBYTEUS_TEST_VAULT`; other docs link to the section; `script`/per-DB import instructions for tests and the `.env.test` API-key statement are gone | — | Doc review (grep) |
| AC-013 | REQ-014, REQ-006 | SCN-008 | Vault holds the DeepSeek key; only `AUTOBYTEUS_TEST_VAULT` set; agent shell with no credential variables | A plain script run with `tsx` (or built and run with `node`) that imports only autobyteus-ts and calls `LLMFactory.createLLM('deepseek-v4-flash')` (or `new DeepSeekLLM(model, config)`) with no resolver gets a real completion, with no test-support import or setup code. The same holds inside a Vitest live run. A server-side probe resolves through the normal product resolver. Nothing prints or exposes the key. | Provider whose key is missing → missing-capability error naming the provider and `pnpm test-vault setup` | Automated (fake provider) + one live call |
| AC-014 | REQ-015 | All | `AGENTS.md` | Contains a short entry telling agents to set `AUTOBYTEUS_TEST_VAULT`, consistent with TESTING.md, with a link | — | Doc review |
| AC-015 | REQ-016 | All | (a) variable unset; (b) variable set while the server's data dir is `~/.autobyteus/server-data` | (a) the server uses its own DB vault, as today; (b) the server ignores the variable, uses its own vault and logs that it ignored it | — | Automated (guard; never started against real data) |
| AC-016 | REQ-005, REQ-007, REQ-016 | SCN-004, SCN-005 | Variable set; no import anywhere | A built test server started with the live opt-in, and an in-process live suite, each report the vault's providers as configured. A Settings save is refused with the read-only error. The vault's bytes are unchanged. | Variable set but the vault is missing, or unusable (locked, corrupt, mismatched key) → startup fails with `TEST_VAULT_NOT_FOUND` / `TEST_VAULT_UNAVAILABLE`; no fallback | Automated |
| AC-018 | REQ-014, REQ-016 | All | AutoByteus server started with `AUTOBYTEUS_TEST_VAULT` in its environment (any source decision) | The server turns off the autobyteus-ts environment default at startup; a client built without a resolver inside the server process gets `MissingApiKeyError` instead of reading the test vault; the server's own resolvers follow `selectSecretVaultSource` only | — | Automated |
| AC-017 | REQ-005, REQ-011 | SCN-009 | `AUTOBYTEUS_TEST_VAULT` exported pointing at a provisioned vault; no live gate | `pnpm test:e2e` and the server unit/integration suites give the same results as without it, including the secret-lifecycle suites that save keys. Their servers and runtimes use their own vaults. | — | Automated (run the vault-lifecycle suites with the selector exported) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Coherent Goal | Supported Trigger | Starting Condition | Product-Level Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | User/developer (or an agent asked by the user) | Create the test vault once | `pnpm test-vault setup` | Secrets file named by the user | Run setup → value-free summary + setting to use | Vault holds keys | Unsafe source/location refused | Supported Normal Scenario | User 2026-10-17 | REQ-001..004 |
| SCN-002 | Operational | Developer/agent | Inspect / remove | `status` / `remove` | — | Run | Location + IDs / pair removed | Forbidden location refused | Supported Normal Scenario | Brief | REQ-003, REQ-004 |
| SCN-003 | Operational | Developer/agent | autobyteus-ts real-LLM tests | Variable + `RUN_LIVE_PROVIDER_TESTS=1` + test command | Vault exists | Clients resolve keys from the vault (read-only) | Real requests; absent capabilities reported | Missing/refused → reported | Supported Normal Scenario | User request; W-05..07 | REQ-005, 006, 008, 009 |
| SCN-004 | Operational | Developer/agent | Server real-provider E2E | Variable + `pnpm test:e2e:real[:preflight]` | Vault exists, any worktree | The run's server reads the vault (read-only) | Scenario results | Missing → reported | Supported Normal Scenario | W-08..10 | REQ-005, 007, 010 |
| SCN-005 | Operational | Developer/agent | Gated server live suites | Variable + `RUN_*` gate | Vault exists | The suite's server code reads the vault (read-only) | Runs without env keys | — | Supported Normal Scenario | F-15, incident | REQ-005, 006 |
| SCN-006 | Operational | Developer/agent | Default core tests | `pnpm -C autobyteus-ts test` | Any shell | Run | Credential-free | — | Supported Normal Scenario | F-03, F-05 | REQ-011 |
| SCN-007 | Operational | Developer/agent | Isolated instance with model access | Variable + `pnpm isolated-app start …` | Vault exists | The instance's server reads the vault (read-only) | Providers configured; saves refused | Vault missing → start error | Supported Normal Scenario | User 2026-10-19 | REQ-012 |
| SCN-008 | Operational | Solution designer / implementation engineer / API-E2E engineer | Use a real provider from investigation code | Variable set; run the probe (`tsx probe.ts`, `node`, or a Vitest live run) | Vault exists | Call product code normally | Real provider response | Missing key → missing-capability error | Supported Normal Scenario | User 2026-10-19 | REQ-014, AC-013 |
| SCN-009 | Operational | Developer/agent in a live-testing shell | Run deterministic suites in the same shell | `pnpm test:e2e` with the selector exported | Selector exported | Run | Same results as without it | — | Supported Normal Scenario | ARCH-REV-001 P-001 | REQ-005, AC-017 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (CLI/developer tooling). Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-006, AC-011 | Security | Zero credential values in env, argv, output, logs, evidence or committed files | All tooling and tests | Canary scan |
| QR-002 | REQ-004, AC-004 | Security | Zero test-tooling reads/writes of production app data (except the explicitly named setup source, read-only) | All | Automated refusal tests |
| QR-003 | REQ-005, REQ-009 | Security/Operability | Paid calls only with an explicit gate | All live tests | Default runs make no provider call |
| QR-004 | REQ-001, REQ-002, REQ-005 | Operability | 1 setup command per machine; 0 credential commands per worktree, run or isolated instance | — | Walkthrough re-run |
| QR-005 | REQ-007 | Integrity | Vault bytes unchanged by any consumer | All | Hash check before/after |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` (test-owned only).
- Preserve: production vaults and app data (untouched); existing isolated-instance DBs.
- Acceptable loss: existing per-worktree `autobyteus-server-ts/db/test.db` vaults (test-owned; no longer needed).
- Constraints: vault DB and key owner-only.
- Unknowns: none blocking. Consumers read only the two secret tables, read-only, and never migrate the vault. Re-running setup from an older worktree against a newer vault is observed in implementation (ARCH-REV-001 P-002).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| secret_management.md ("no test wrapper / never a test-runner fallback"; "no `SECRET_STORE_DATABASE_URL` … default-versus-E2E Store") | Revised to describe the `AUTOBYTEUS_TEST_VAULT` selector and test-vault commands | DEC-001 (user SR-006) | — |
| secure-centralized-secret-provisioning rationale | Tests use the normal application vault lifecycle | F-16 | Preserved: product resolvers and the vault runtime are unchanged; only the store is selected |
| Electron launch policy (`serverRuntimeEnv.ts`) | Production passes the caller env; isolated passes a baseline | A-20 | Server guard (REQ-016); isolated forwarding (REQ-012) |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `test-vault-evaluation-report.md` | Evaluation; approved usage model (§5.0) | All | Final @ SR-008 | Behavior-defining; approved with SR-006/SR-008 |
| `context/55.png` | Incident screenshot (user evidence) | REQ-006 | Final | Evidence |
| `walkthrough/*.log` | Walkthrough evidence | — | Final | Evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user, not an agent, chooses the setup source file | Rule 2 | User | Accepted (DEC-003) |
| ASM-002 | Live verification uses a few cheap calls (DeepSeek); the costly Anthropic caching suite runs only if the user asks | Done criteria; cost | User | Accepted |

## Decisions

Every row carries reasoning first, then the decision. No row is `Needs user`.

| ID | Question | Reasoning | Decision | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Approach | The user chose the database model ("set one variable, normal logic unchanged; unset → production"). The documented "no test wrapper / no default-versus-E2E store" rule is revised for the test vault only; its purpose (never touch the real vault, no implicit `.env` import) is kept by REQ-004/006/007/016. | One selector variable; the read-only test vault is selected by the normal vault runtime; no copies | User (SR-006) | Decided |
| DEC-002 | Location | The user said the location comes from the test-vault variable. A default for setup gives zero config; it must sit outside `~/.autobyteus` (Rule 2). | `AUTOBYTEUS_TEST_VAULT`; setup defaults to `~/.autobyteus-test/vault/` | Solution Designer | Decided |
| DEC-003 | Setup source | The Task says "created once from a local secrets file". Reading a file the user names, once and read-only, is the user's own act. A test agent must never choose it. | Any owner-private file the user names; docs recommend a dedicated file | Solution Designer | Decided |
| DEC-004 | Env-sourced keys in tests | The user's direction says no key travels through the environment, and the incident was caused by the env helper. | Remove the helper; ignore credential aliases; strip inherited credentials | Solution Designer | Decided |
| DEC-005 | Stale autobyteus-ts live tests | The done criteria need autobyteus-ts real-LLM tests to run; they are this ticket's functionality. | Repair all live provider tests (18 files) | Solution Designer | Decided |
| DEC-006 | Absent or refused key | The Task asks for a clear skip/"missing capability" report; TESTING.md says it is never counted as passed. | Skip with reason + strict mode | Solution Designer | Decided |
| DEC-007 | Isolated instances | The user named the Electron instance as a place where "they just set this one". | Isolated launches forward the variable to the instance's server; no option, no import | User (SR-006) / Solution Designer | Decided |
| DEC-008 | Old stores in production data and 3 worktree test DBs | Deleting user data is hard to undo and outside this ticket. | Untouched; listed for the user | Solution Designer | Decided |
| DEC-009 | Shell `ask` command; global knowledge placement | The user rejected the `ask` command and wants code use. `AGENTS.md` is loaded by every agent. | No `ask` command; `AGENTS.md` entry + TESTING.md section | User / Solution Designer | Decided |
| DEC-010 | Variable unset | The user: "if you don't set this, it by default uses the production itself". | Unset → each app uses its own DB vault | User (SR-006) | Decided |
| DEC-011 | autobyteus-ts automatic use | Superseded by DEC-013 (SR-009). The test-setup-only installer did not reach plain scripts. | — | Solution Designer | Superseded |
| DEC-013 | autobyteus-ts reads the selector itself (SR-009) | The user wants normal logic to need nothing, like an ORM reading `DATABASE_URL`, including plain scripts. That requires autobyteus-ts to open the vault itself, so the vault's read side (format, key file, read-only store, location policy, provider credential mapping) gets one owner in autobyteus-ts `secrets/` that the server also uses. Vitest's "spend money" decision stays with the live gate: autobyteus-ts setup removes the selector unless `RUN_LIVE_PROVIDER_TESTS=1`. The server turns the environment default off because it owns its vault. | autobyteus-ts environment default key source; read-side vault format moved to autobyteus-ts; gate kept for Vitest; server disables the default | User (SR-009) / Solution Designer | Decided |
| DEC-012 | Exported selector and deterministic test runs (ARCH-REV-001 AR-001) | The user's model covers live testing, test servers, instances and investigation. The approved preserved boundary keeps deterministic suites unchanged. Some deterministic suites save keys and would be refused, and real keys would trigger network discovery in them. In-process and built-server harnesses can opt in per live run, so there is no conflict with the user's model: live runs already need their gate (explicit opt-in, approved). | The workspace's deterministic harnesses do not apply the selector; live runs opt in through their existing gate; servers started directly with the variable (isolated instances, `test:e2e:real`, manual servers) use it | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Supplemental Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001..005, UC-007, UC-008 | BEH-001..005, 008, 009 | AC-001, AC-006 | SCN-001..005, 007, 008 | F-07 |
| REQ-002 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 | F-06 |
| REQ-003 | UC-002 | BEH-001, 007 | AC-003 | SCN-002 | F-10 |
| REQ-004 | UC-001, UC-002 | BEH-005 | AC-004 | SCN-001, 002 | Rule 2; AR-002 |
| REQ-005 | UC-003..005, UC-007..009 | BEH-002..005, 008, 009 | AC-005..007, AC-016, AC-017 | SCN-003..005, 007..009 | AR-001 |
| REQ-006 | UC-003, UC-005 | BEH-004, 005 | AC-005, AC-007, AC-011 | SCN-003, 005 | F-15, incident |
| REQ-007 | UC-004, UC-005, UC-007, UC-008 | BEH-002..004, 008, 009 | AC-006, AC-010, AC-016 | SCN-004, 005, 007, 008 | — |
| REQ-008 | UC-003 | BEH-003 | AC-005 | SCN-003 | F-02 |
| REQ-009 | UC-003..005 | BEH-006 | AC-008 | SCN-003..005 | F-04 |
| REQ-010 | UC-004 | BEH-002 | AC-006 | SCN-004 | F-07, F-08 |
| REQ-011 | UC-006, UC-009 | BEH-005 | AC-009 | SCN-006 | F-03, F-05 |
| REQ-012 | UC-007 | BEH-008 | AC-010 | SCN-007 | User 2026-10-19 |
| REQ-013 | All | All | AC-012 | All | F-11 |
| REQ-014 | UC-008 | BEH-009 | AC-013, AC-018 | SCN-008 | User 2026-10-19; user 2026-10-20 |
| REQ-015 | All | All | AC-014 | All | User 2026-10-19 |
| REQ-016 | All | All | AC-015, AC-016 | All | User 2026-10-19 |

## Architecture Phase Input

- Scenarios to map: SCN-001..SCN-009.
- Constraints:
  - forbidden locations refused;
  - no credential in env/argv/logs;
  - the vault is read-only for consumers;
  - product resolvers unchanged;
  - autobyteus-ts owns the read side of the vault format and the environment default key source (DEC-013); the server disables that default;
  - explicit gates;
  - general importer preserved;
  - deterministic harnesses do not apply the selector.
- Design decides: the source-selection owner, read-only store, startup failure rule, harness opt-in points, isolated forwarding, and the Prisma-free autobyteus-ts test path.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval received: `Yes`
  - SR-006 and SR-007 by the user;
  - SR-008 clarifications by the Solution Designer within that direction, with the user informed.
- Exact requirements and supplement approval basis recorded: `Yes` (SR-008)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
