# Requirements Document

## Document Status

- Status: `Approved` (SR-006). The user approved the direction on 2026-10-19: one environment variable selects the vault like a database, normal logic is unchanged, and production uses its own vault when the variable is unset.
- Current solution revision ID: `SR-006`
- Package identifier: `test-vault-developer-experience`
- Request / ticket: Project Task `c15a77b2-18b8-4ac6-b3de-8afcba81211e` from `/project_task_manager`; user concern 2026-10-10; user update 2026-10-17; user refinement 2026-10-19 ("use the vault like an API service")
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user. The user decides directly in the Solution Designer conversation.
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approval state and reference:
  - Approved by the Solution Designer within the user's direction, under skill step 2 ("Within the direction").
  - The direction comes from the Task "UPDATE 2026-10-17" and the user's messages of 2026-10-19 in this conversation:
    - (1) use the vault "like an API";
    - (2) "your code automatically uses a test vault … a few lines of code"; drop the shell `ask` command;
    - (3) the location is decided by the test-vault DIR environment variable;
    - (4) the knowledge goes in a global file every team member reads.
  - No decision remains `Needs user`.
  - The user was informed in this conversation's reply of 2026-10-19; that reply is the approval reference.
  - SR-006: the user then approved the "like a database" direction in this conversation (2026-10-19): "I think we should go into this direction". That is the current approval reference.
  - SR-001 and SR-002 were never approved.
- Exact approved requirements baseline / solution revision: this document @ SR-004
- Behavior-defining supplements and their approved versions: `test-vault-evaluation-report.md` @ SR-004

## Problem And Desired Outcome

- Problem:
  - There is no standing test vault.
  - Real keys are copied into each test database: per worktree, per isolated instance, and per live suite from the environment.
  - autobyteus-ts live tests read raw env vars and are stale.
  - 9 server live suites import every `*_API_KEY` from the environment.
  - Agent shells carry the user's production keys, which led to the skill-update-notice incident.
  - Agents need the importer, absolute paths and a TTY hack.
  - Missing or refused credentials can look like passes.
- Affected actors or systems: developer; coding agent (no TTY); autobyteus-ts live tests; server `test:e2e:real`; server gated live E2E; isolated test instances.
- Desired outcome:
  - One standing, isolated test vault is created once by one non-interactive command.
  - Tests and agents are simply pointed at it, and live tests (autobyteus-ts and server) find it automatically.
  - No key travels through the environment, chat or logs.
  - The user's real vault and app data are never touched.
  - Once set up, any team member uses the vault like an API: name a model or provider and get a result or a ready client back, for tests and for investigation/experiments alike. The knowledge sits in one global place every agent reads.
- Observable definition of success:
  - On a machine with the standing test vault, a fresh worktree runs a named autobyteus-ts live test and a server live E2E against it with one documented command each.
  - That needs no import, no absolute path, no TTY and no key in any environment variable.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001, SCN-002 | Each test DB is provisioned with `secrets:import` (absolute URL, TTY `IMPORT`, `script` hack) | One non-interactive command creates/updates the standing test vault at its stable location; status and remove commands exist | General `secrets:import` unchanged (explicit target, TTY, dry-run, `--overwrite`) for non-test databases | W-01..W-04 |
| BEH-002 | Operational | SCN-004 | `test:e2e:real` uses a hidden per-worktree vault; path not printed; single-scenario run exits 1 | Uses a run copy of the standing vault; prints its location; exit reflects the selected scenarios | Preflight report format; run-owned runtime DB | W-08..W-10 |
| BEH-003 | Operational | SCN-003 | autobyteus-ts live tests read env vars, are stale, skip silently | Live tests resolve keys in-process from a run copy of the standing vault through the current resolver contract | Default autobyteus-ts tests credential-free | W-05..W-07 |
| BEH-004 | Operational | SCN-005 | 9 server live suites save every `*_API_KEY` from `process.env` into their test vault | They use a run copy of the standing vault; environment credential aliases are ignored | Their `RUN_*` gates | F-15 |
| BEH-005 | Contract | SCN-003..SCN-006 | Inherited production keys reach autobyteus-ts and server E2E tests | No inherited credential variable is visible to or used by any test | Server unit/integration isolation | F-03, incident |
| BEH-006 | Contract | SCN-003, SCN-004, SCN-005 | Missing key → silent skip; provider refusal → pass | Reported per test with reason; never counted as passed; strict mode fails | Preflight already compliant | F-04 |
| BEH-007 | Operational | SCN-002 | Manual cleanup | Remove command deletes exactly the standing vault pair | — | W-cleanup |
| BEH-009 | Operational | SCN-008 | No supported way for investigation code, probes or integration tests to get a real provider key; earlier tickets used probe scripts reading the server `.env` | In code, a few lines give the caller an API-key resolver backed by the test vault (autobyteus-ts clients), or make the server's own vault runtime use a copy of the test vault (server integration code). Product code then resolves keys exactly as at runtime. The key never leaves the process. | Product runtime resolution through the vault service | Task brief "probe scripts"; user 2026-10-19 |
| BEH-008 | Operational | SCN-007 | Isolated instances are provisioned by importing a key file into each instance DB | An isolated instance can start with a copy of the standing test vault | Existing isolated-instance start/stop/import | docs/isolated-app-instances.md l.279 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Developer | Run real-provider tests | Set up once; one command per run | Explicit opt-in to paid calls |
| Coding agent (no TTY) | Run live tests when asked | Told only "the test vault is at X; set the gate" | Never handles key values |
| User (security owner) | Protect production keys/data | Real vault, `.env` and app data never opened by test tooling | No plaintext keys committed, printed or in env |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Create or update the standing test vault from a secrets file with one non-interactive command | SCN-001 |
| UC-002 | Inspect and remove the standing test vault | SCN-002 |
| UC-003 | Run autobyteus-ts real-provider tests against the test vault | SCN-003 |
| UC-004 | Run the server real-provider E2E against the test vault | SCN-004 |
| UC-005 | Run gated server live E2E suites against the test vault | SCN-005 |
| UC-006 | Run default autobyteus-ts tests credential-free in any shell | SCN-006 |
| UC-007 | Start an isolated test instance with test-vault credentials | SCN-007 |
| UC-008 | Use real providers from code (investigation scripts, probes, new integration tests) through the test vault in a few lines | SCN-008 |

### Out Of Scope

- Live tests that authenticate through CLI logins (Claude, Codex, AGY, Grok).
- Production vault behavior, Settings and runtime secret resolution.
- Behavior of the general `pnpm secrets:import` for non-test databases.
- Deleting old stores in production data (`~/.autobyteus/local-vault`, `server-data/secret-store/*`), existing worktree test DBs, or plaintext keys in `~/.autobyteus/server-data/.env`: listed for the user (DEC-008), never touched by this task.
- New importer aliases.

### Non-Goals

- CI secret distribution; guaranteeing provider entitlement; new providers or scenarios beyond repairing existing live tests.

### Preserved Behavior Boundary

- General importer guarantees (BEH-001 preserved column); preflight report; deterministic test isolation; gitignored test roots; `RUN_*` opt-in gates.
- Default `pnpm test:e2e` and server unit/integration suites unchanged.

### Prerequisites

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | None found. Everything traced (importer service, vault runtime/resolver, test-runtime bootstrap, live helper, autobyteus-ts clients) is either reusable as-is or inside this ticket's functionality: test credential provisioning and the live tests. | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that introduces new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap` and needs explicit user approval.
- Adjacent concerns outside this boundary are non-blocking recommendations or follow-ups, unless they are prerequisites (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | One environment variable, `AUTOBYTEUS_TEST_VAULT` (a vault directory; a location only, never a key), selects the standing test vault, the way `DATABASE_URL` selects a database. `pnpm test-vault setup` creates the vault at `~/.autobyteus-test/vault/` unless the variable names another directory, and prints the exact line to set. The vault is outside production app data and outside worktrees. | BEH-001..005, BEH-008 | Must | "Like a database" | User 2026-10-19 |
| REQ-002 | One non-interactive command creates or updates the standing test vault from an explicitly named owner-private secrets file, without a database URL or prompt. Its output is a value-free summary plus the vault location. Replacing configured keys requires an explicit option. | BEH-001 | Must | One-command setup | User update; DEC-003 |
| REQ-003 | Commands report the vault location and value-free configured/missing secret IDs, and remove exactly the vault DB/key pair. | BEH-001, BEH-007 | Must | Discoverability, cleanup | Brief |
| REQ-004 | Test-vault tooling and all tests refuse locations inside the user's production app data. They never open the user's real vault, `.env` or app data, except a secrets file the user explicitly names to the setup command, which is read once and never modified. | BEH-005 | Must | Rule 2 | User update; DEC-003 |
| REQ-005 | When `AUTOBYTEUS_TEST_VAULT` is set, every normal key lookup reads from the test vault with no change to test or product logic. This covers server processes (test servers, in-process server tests, API/E2E harnesses, isolated Electron instances) and autobyteus-ts code. No import, transfer or helper call is needed per test, run, worktree or instance. | BEH-002..004, BEH-008, BEH-009 | Must | "Set this one variable and it's good to go" | User 2026-10-19 |
| REQ-006 | No credential value travels through process environment variables, command lines, chat, logs or evidence. Tests ignore credential environment aliases and do not expose inherited credential variables to code under test. | BEH-004, BEH-005 | Must | Incident | User update; DEC-004 |
| REQ-007 | Nothing outside `pnpm test-vault setup`/`remove` ever writes to or migrates the standing vault: consumers open it strictly read-only. A save attempted while it is selected (e.g. through Settings) fails with a clear read-only error. | BEH-002..004, BEH-008 | Must | Isolation; one vault for many worktrees | User 2026-10-17 ("read access") |
| REQ-008 | autobyteus-ts live provider tests run against the current client contract and execute real requests when their credential is in the test vault. | BEH-003 | Must | Stale tests | DEC-005 |
| REQ-009 | With the gate set, every absent credential or provider refusal is reported per test with a reason (missing capability and vault location, invalid key, quota, rate limit, model access) and never counted as passed. A strict mode turns them into failures. | BEH-006 | Must | TESTING contract | DEC-006 |
| REQ-010 | `pnpm test:e2e:real` prints the vault location, and a scenario selection exits 0 when all selected scenarios pass. | BEH-002 | Must | F-07, F-08 | — |
| REQ-011 | `pnpm -C autobyteus-ts test` runs the default suite credential-free, unaffected by inherited credential variables. | BEH-005 | Must | F-03, F-05 | — |
| REQ-012 | An isolated Electron test instance started while `AUTOBYTEUS_TEST_VAULT` is set uses the test vault, with no per-instance import or restart. | BEH-008 | Must | User 2026-10-19 ("build the test, the electron instance") | User 2026-10-19 |
| REQ-014 | Investigation and test code uses the test vault with no extra code: with the variable set, autobyteus-ts clients and `LLMFactory.createLLM(id)` resolve keys from it when the caller passes no key resolver. Server code resolves exactly as in production. A missing key is a clear missing-capability error naming the provider and `pnpm test-vault setup`. | BEH-009 | Must | "Your normal logic will automatically use the test vault" | User 2026-10-19 |
| REQ-015 | The global agent instructions file (`AGENTS.md`), which every agent loads, states in a few lines where the test vault is and how to use it, linking to the TESTING.md section. | All | Must | Knowledge available to all team members | User 2026-10-19 |
| REQ-016 | When `AUTOBYTEUS_TEST_VAULT` is not set, behavior is exactly today's: each application uses the vault inside its own database (production default). A server running on the user's real app data (`~/.autobyteus/server-data`) ignores the variable even if inherited, and every server logs which vault it uses (location only). | All | Must | Production safety | User 2026-10-19 ("if you don't set this, it by default uses the production") |
| REQ-013 | TESTING.md holds one section saying where the test vault is, how to create it and how tests select it. secret_management.md, server README, isolated-app guide, isolated-app skill and the test-running skills point to it. Per-database import instructions for tests and stale statements are removed. | All | Must | One message | User update |

## Acceptance Criteria

| AC ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | SCN-001 | Owner-private secrets file; no vault; no TTY | Setup creates the vault at the default location and prints the location and created secret IDs, exit 0, no prompt | Group-readable source → existing source error; unrecognized lines ignored without values | Automated + agent run |
| AC-002 | REQ-002 | SCN-001 | Vault holds a secret | Re-run skips configured IDs; the explicit replace option replaces them | — | Automated |
| AC-003 | REQ-003 | SCN-002 | Vault present / absent | Status shows location and IDs only; remove deletes DB, key and sidecars only; absent → no-op | — | Automated |
| AC-004 | REQ-004 | SCN-001, SCN-002 | Location override inside `~/.autobyteus` or an OS app-data folder | Refused before file access with a stable code | — | Automated |
| AC-005 | REQ-005, REQ-006, REQ-008 | SCN-003 | Vault holds the DeepSeek key; fresh worktree; shell carries production `*_API_KEY` vars | The documented command for `deepseek-llm.test.ts` executes real requests that pass. The test process environment contains no credential variable. The key used is the vault's. | — | Live run (authorized cost) + automated env/resolver test |
| AC-006 | REQ-005, REQ-007, REQ-010 | SCN-004 | Fresh worktree, provisioned vault | Preflight shows the vault location and configured IDs without any import; `--scenarios=deepseek.llm` exits 0 when it passes; the standing vault's bytes are unchanged after the run | Missing → reported missing | Live run + automated |
| AC-007 | REQ-005, REQ-006 | SCN-005 | Vault with the needed key; only the `RUN_*` gate set | A gated server live suite (e.g. skill-update-notice or DeepSeek collaborators) runs with keys from the vault copy. Setting `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` in the shell has no effect on the keys used. | — | Automated (env alias ignored) + live run at user discretion |
| AC-008 | REQ-009 | SCN-003..005 | Gate on; key absent / provider refusal | Reported as skipped with `missing capability <id> (test vault <location>)` or the classified reason; summary lists them; strict mode fails | — | Automated |
| AC-009 | REQ-011 | SCN-006 | Shell with inherited production keys | `pnpm -C autobyteus-ts test` runs; no live provider test executes; tests see no credential variable | — | Automated |
| AC-010 | REQ-012 | SCN-007 | Vault provisioned | Starting an isolated instance with the test-vault option shows the providers configured in Settings without any import; the standing vault is unchanged | Vault missing → clear error naming the setup command | Executable validation |
| AC-011 | REQ-006 | All | Any run of tooling or tests | No secret value in stdout, stderr, logs, evidence, env or committed files | — | Automated canary scan |
| AC-013 | REQ-014, REQ-006 | SCN-008 | Vault holds the DeepSeek key; agent shell with no credential variables | A probe script of at most ~5 lines (import, get resolver, create the DeepSeek client or call `LLMFactory.createLLM`, send a prompt) gets a real completion. A server-side probe that calls the one setup function then resolves the key through the normal product resolver. Neither prints or exposes the key. | Provider whose key is missing → missing-capability error naming the provider and `test-vault setup` | Automated (fake provider) + one live call |
| AC-014 | REQ-015 | All | `AGENTS.md` | Contains a short test-vault entry (location rule, status command, link) consistent with TESTING.md | — | Doc review |
| AC-015 | REQ-016 | All | (a) variable unset; (b) variable set while the server's data dir is `~/.autobyteus/server-data` | (a) the server uses its own DB vault, as today; (b) the server ignores the variable, uses its own vault and logs that it ignored it | — | Automated (location guard) |
| AC-016 | REQ-005, REQ-012 | SCN-004, SCN-005, SCN-007 | Variable set; no import anywhere | A built test server, an in-process server suite and an isolated instance each report the test vault's providers as configured. A Settings save is refused with the read-only error. The standing vault's bytes are unchanged. | Variable set but no vault there → startup fails with `TEST_VAULT_NOT_FOUND` naming `pnpm test-vault setup` | Automated + isolated-instance smoke |
| AC-012 | REQ-013 | All | Docs and skills | One TESTING.md section; others link to it; `script`/per-DB import instructions for tests and the `.env.test` API-key statement are gone | — | Doc review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Coherent Goal | Supported Trigger | Starting Condition | Product-Level Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | User/developer (or an agent asked by the user) | Create the test vault once | Setup command | Secrets file named by the user | Run setup → value-free summary | Standing vault holds keys | Unsafe source/location refused | Supported Normal Scenario | User update | REQ-001..004 |
| SCN-002 | Operational | Developer/agent | Inspect / remove | Status / remove | — | Run | Location + IDs / pair removed | Production location refused | Supported Normal Scenario | Brief | REQ-003, REQ-004 |
| SCN-003 | Operational | Developer/agent | autobyteus-ts real-LLM tests | Documented command + gate | Vault exists | Test resolves keys from a run copy in-process | Real requests; absent capabilities reported | Missing/refused → reported | Supported Normal Scenario | User request; W-05..07 | REQ-005, 006, 008, 009 |
| SCN-004 | Operational | Developer/agent | Server real-provider E2E | `pnpm test:e2e:real[:preflight]` | Vault exists, any worktree | Harness copies vault → server on copy | Scenario results | Missing → reported | Supported Normal Scenario | W-08..10 | REQ-005, 007, 010 |
| SCN-005 | Operational | Developer/agent | Gated server live suites | `RUN_*` gate | Vault exists | Suite uses vault copy | Runs without env keys | — | Supported Normal Scenario | F-15, incident | REQ-005, 006 |
| SCN-006 | Operational | Developer/agent | Default core tests | `pnpm -C autobyteus-ts test` | Any shell | Run | Credential-free | — | Supported Normal Scenario | F-03, F-05 | REQ-011 |
| SCN-008 | Operational | Solution designer / implementation engineer / API-E2E engineer | Use a real provider from code during investigation, a probe or an integration test | Import the test-vault helper in the script/test | Vault exists | Get the resolver (or activate the vault copy for server code), then call product code normally | Real provider response | Missing key → missing-capability error | Supported Normal Scenario | User 2026-10-19; brief ("probe scripts") | REQ-014, AC-013 |
| SCN-007 | Operational | Developer/agent | Isolated instance with model access | `isolated-app start` with test-vault option | Vault exists | Instance starts on a vault copy | Providers configured | Vault missing → error | Supported Normal Scenario | User update | REQ-012 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (CLI/developer tooling). Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-006, AC-011 | Security | Zero credential values in env, argv, output, logs, evidence or committed files | All tooling/tests | Canary scan |
| QR-002 | REQ-004, AC-004 | Security | Zero test-tooling reads/writes of production app data (except the explicitly named setup source, read-only) | All | Automated refusal tests |
| QR-003 | REQ-005, REQ-009 | Security/Operability | Paid calls only with an explicit gate | All live tests | Default runs make no provider call |
| QR-004 | REQ-001, REQ-002, REQ-005 | Operability | 1 setup command per machine; 0 credential commands per worktree, run or isolated instance | — | Walkthrough re-run |
| QR-005 | REQ-007 | Integrity | Standing vault bytes unchanged by any test run | All | Hash check before/after |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` (test-owned only).
- Preserve: production vaults/app data (untouched); existing isolated-instance DBs.
- Acceptable loss: existing per-worktree `autobyteus-server-ts/db/test.db` vaults (test-owned).
- Constraints: vault DB and key owner-only.
- Unknowns: none blocking. Run copies sidestep schema-version skew (a copy is migrated, never the original).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| secret_management.md "no test wrapper / never a test-runner fallback" | Revised for the standing **test** vault only | DEC-001 | Needs approval |
| secure-centralized-secret-provisioning rationale | Tests use the normal application vault lifecycle | F-16 | Preserved by run copies |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `test-vault-evaluation-report.md` | Evaluation and recommended approach (SR-002) | All | Ready for review | Behavior-defining; pending |
| `context/55.png` | Incident screenshot (user evidence) | REQ-006 | Final | Evidence |
| `walkthrough/*.log` | Walkthrough evidence | — | Final | Evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user, not an agent, chooses the setup source file | Rule 2 | User | Accepted (DEC-003) |
| ASM-002 | Live verification uses a few cheap calls (one DeepSeek run per live check); the costly Anthropic caching suite is run only if the user asks | Done criteria; cost | User | Accepted |

## Decisions

Every row carries reasoning first, then the recommendation. `Decided` means decided by the Solution Designer within the user's direction. No row is `Needs user`.

| ID | Question | Reasoning | Decision | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Approach, including revising secret_management.md's "no test wrapper / never a test-runner fallback" for the **test** vault | The user's direction requires that tests "find it automatically" and that nobody imports per test or run, and the old rule forbids exactly that. The rule's purpose (never touch the real vault, no implicit import from `.env`) is kept by REQ-004/REQ-006/REQ-007. | Standing vault + per-run copies + in-process resolver; revise the rule for the test vault only | Solution Designer | Decided |
| DEC-002 | Location | The user said the location is decided by the test-vault DIR variable. A default makes it work with zero config and is the convention for tools (e.g. `~/.<tool>`); it must sit outside `~/.autobyteus` (Rule 2). | `AUTOBYTEUS_TEST_VAULT`; default `~/.autobyteus-test/vault/` when unset | Solution Designer | Decided |
| DEC-003 | Setup source | The Task says "created once from a local secrets file". The user has used the real `server-data/.env` as the source; reading a file the user names, once and read-only, is the user's own act. A test agent must never choose it. | Any owner-private file the user names; docs recommend a dedicated file | Solution Designer | Decided |
| DEC-004 | Env-sourced keys in tests | The user's direction says no key travels through the environment, and the incident was caused by the env helper. | Remove the helper; ignore credential aliases; strip inherited credentials for tests | Solution Designer | Decided |
| DEC-005 | Stale autobyteus-ts live tests | The done criteria need autobyteus-ts real-LLM tests to run; they are this ticket's functionality (ticket-scope "This ticket"). | Repair all live provider tests (~14 files) | Solution Designer | Decided |
| DEC-006 | Absent or refused key | The Task asks for a clear skip/"missing capability" report; TESTING.md says it is never counted as passed. A strict mode serves delivery checks. | Skip with reason + strict mode | Solution Designer | Decided |
| DEC-007 | Isolated instances | The user's update names isolated test instances. | `isolated-app start --test-vault` (copy) | Solution Designer | Decided |
| DEC-008 | Old stores in production data and 3 worktree test DBs | Deleting user data is hard to undo and outside this ticket. Leaving it untouched needs no decision, so this ticket takes no action and lists them. | Untouched; listed in the report for the user | Solution Designer | Decided |
| DEC-010 | When `AUTOBYTEUS_TEST_VAULT` is unset, should anything use a default vault automatically? | The user answered: "if you don't set this, it by default uses the production itself". | No. Unset → each app uses its own DB vault (today's behavior). | User (2026-10-19) | Decided |
| DEC-011 | autobyteus-ts automatic use | The user wants the variable alone to be enough ("set this one, and it's good to go"; "your normal logic will automatically use"). The core library stays vault-agnostic: autobyteus-ts gets an optional process-wide default key resolver that only its test setup installs when the variable is set. The server always passes its own resolver. | Optional default resolver, installed by test setup only | User direction (2026-10-19) / Solution Designer | Decided |
| DEC-009 | Shell `ask` command; global knowledge placement | The user rejected the `ask` command ("why do we need this?") and wants code use. `AGENTS.md` is loaded by every agent and is the global file the user described. | No `ask` command; code API only (REQ-014); `AGENTS.md` entry + TESTING.md section | User (2026-10-19) / Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Supplemental Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001..005, UC-007 | BEH-001..005, 008 | AC-001, AC-006 | SCN-001..005, 007 | F-07 |
| REQ-002 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 | F-06 |
| REQ-003 | UC-002 | BEH-001, 007 | AC-003 | SCN-002 | F-10 |
| REQ-004 | UC-001, UC-002 | BEH-005 | AC-004 | SCN-001, 002 | Rule 2 |
| REQ-005 | UC-003..005 | BEH-002..004 | AC-005..007 | SCN-003..005 | User update |
| REQ-006 | UC-003, UC-005 | BEH-004, 005 | AC-005, AC-007, AC-011 | SCN-003, 005 | F-15, incident |
| REQ-007 | UC-004, UC-005, UC-007 | BEH-002..004, 008 | AC-006, AC-010 | SCN-004, 005, 007 | F-16 |
| REQ-008 | UC-003 | BEH-003 | AC-005 | SCN-003 | F-02 |
| REQ-009 | UC-003..005 | BEH-006 | AC-008 | SCN-003..005 | F-04 |
| REQ-010 | UC-004 | BEH-002 | AC-006 | SCN-004 | F-07, F-08 |
| REQ-011 | UC-006 | BEH-005 | AC-009 | SCN-006 | F-03, F-05 |
| REQ-012 | UC-007 | BEH-008 | AC-010 | SCN-007 | User update |
| REQ-013 | All | All | AC-012 | All | F-11 |
| REQ-014 | UC-008 | BEH-009 | AC-013 | SCN-008 | User 2026-10-19 |
| REQ-015 | All | All | AC-014 | All | User 2026-10-19 |
| REQ-016 | All | All | AC-015 | All | User 2026-10-19 |

## Architecture Phase Input

- Scenarios to map: SCN-001..SCN-008 (after approval).
- Constraints:
  - production paths refused;
  - no credential in env/argv/logs;
  - the standing vault is never mutated by tests;
  - the normal vault lifecycle runs on copies;
  - autobyteus-ts stays storage-neutral;
  - explicit gates;
  - general importer preserved.
- Deferred to design:
  - setup implementation (reuse `LocalEnvironmentSecretImportService` with a fixed target and non-interactive confirmation port);
  - copy mechanism (DB+key pair vs secret tables only);
  - in-process resolver home: workspace `test-support` with server dist vs a shared vault-reader package;
  - replacement of `live-runtime-secret-vault-helpers.ts`;
  - env stripping for autobyteus-ts and server E2E;
  - isolated-app option;
  - avoiding repeated server rebuilds.
- Facts to verify:
  - copying a DB+key pair to another path keeps the vault verifiable (the encryption domain is not bound to the path);
  - Vitest skip-reason reporting;
  - which "test-running skills" exist (isolated-app skill, team skills).
- Risks: R-01..R-04 in the investigation notes.

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

- Approval received: `Yes`. The Solution Designer approved it within the user's direction (skill step 2) on 2026-10-19, and the user was informed in the conversation.
- Exact requirements and supplement approval basis recorded: `Yes` (SR-004)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
