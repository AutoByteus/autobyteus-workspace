# Investigation Notes

## Investigation Meta

- Package identifier: `test-vault-developer-experience`
- Request / ticket: Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), user concern of 2026-10-10: "test vault setup is not easy enough".
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience` / `codex/test-vault-developer-experience`
- Resolved base remote / branch / revision: `origin/personal` @ `d28c56d5de8e5429e73dd7c42b78767cc531180c` (fetched 2026-10-10; `origin/HEAD -> origin/personal`)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree created from freshly fetched `origin/personal`; `pnpm install --frozen-lockfile` succeeded (10 s).
- Bootstrap blocker: None
- Current solution revision ID: `SR-008`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-10); repository `AGENTS.md`, `TESTING.md` (full, 2026-10-10); `autobyteus-server-ts/docs/modules/secret_management.md` (full, 2026-10-10)
- Investigation status: Evaluation complete and revised on 2026-10-17 for the user update (SR-002). Requirements approved within the user's direction (SR-004, 2026-10-19). Architecture investigation complete (2026-10-19).

## Initial Request And Clarifications

- Original request: Evaluate how hard it is to set up an isolated **test vault** and run (a) autobyteus-ts real-LLM tests and (b) server live/gated E2E against it; record every step, friction, failure and inconsistency; propose improvements with trade-offs; report to the user **before building**; implement only after approval.
- Clarifications received: User update of 2026-10-17 (Task description "UPDATE 2026-10-17" plus screenshot `context/55.png`):
  - one standing test vault, set up once by a one-command non-interactive setup, at a stable location (path and/or one env var) that live tests find automatically;
  - no key ever travels through the environment, chat or logs;
  - isolated test instances get read access or a harness copy, never the real vault or `.env`;
  - skills and TESTING.md say one thing.
- User-supplied facts and constraints: No plaintext keys committed or printed; never touch the user's production vault/data; explicit opt-in for live tests; docs in TESTING.md and secret_management.md; tests for the setup tooling.
- Initial ambiguity: Whether "local vault" means `~/.autobyteus/local-vault` (pointer in the brief) or the current in-database vault. Resolved by evidence: see BEH-008 / F-12.

## Product And Domain Understanding

- Product area: Developer/agent test infrastructure for real-provider tests; secret management (server-owned encrypted vault inside the application SQLite DB).
- Affected actors or systems: human developer; coding agents without a TTY; `autobyteus-ts` live integration tests; server real-provider E2E runner (`test:e2e:real`); server gated live E2E files (`RUN_*_E2E`).
- Existing purpose: Product credentials live in the encrypted vault of the target application DB; the standalone importer is the only provisioning path for a DB other than through Settings.
- Terminology: *test vault* = an application DB + `<db>.secret.key` pair used only by tests. *Key source file* = owner-private `.env`-style file with `*_API_KEY=` lines that the importer reads.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-10 | Doc | `TESTING.md` l.23, l.26, l.57-64, Rules 2/4 | Documented flow | One documented importer command; `pnpm -C autobyteus-ts test` listed as the core test command; `script -q /dev/null …` advised for agents | F-05, F-06 |
| 2026-10-10 | Doc | `autobyteus-server-ts/docs/modules/secret_management.md` l.244-338 | Importer and test DB contract | "There is no local/test wrapper"; "never a startup, UI, API, MCP, or test-runner fallback"; `test:e2e:real` reuses "the dedicated ignored test root" | Prior constraint to revise (DEC-003) |
| 2026-10-10 | Code | `package.json` (root) scripts `secrets:import`, `test:e2e:real*` | Entry points | Both rebuild the server on every call | F-09 |
| 2026-10-10 | Code | `autobyteus-server-ts/src/secret-management/cli/import-local-environment-secrets.ts`, `provisioning/local-environment-secret-import-service.ts` l.176-191 | Confirmation | Execution requires `stdin.isTTY && stderr.isTTY` and the typed phrase `IMPORT`; else `IMPORT_CONFIRMATION_REQUIRED`/`IMPORT_CANCELLED` | F-06 |
| 2026-10-10 | Code | `provisioning/local-environment-source-reader.ts` l.40 | Source rules | Source must be owned by the user and mode `& 077 == 0` | Documented as a prerequisite |
| 2026-10-10 | Code | `provisioning/local-import-credential-alias-registry.ts` | Recognized names | 16 aliases; `QWEN_API_KEY`, `ZHIPU_API_KEY`, `GOOGLE_CSE_API_KEY` not recognized (silently ignored) | F-13 |
| 2026-10-10 | Code | `test-support/live-e2e/run-live-e2e.mjs`, `test-runtime-bootstrap.mjs` | Real E2E target | Vault fixed to `<worktree>/autobyteus-server-ts/db/test.db` (from `.env.test`), must be inside `autobyteus-server-ts/db/`; no option to choose another vault | F-07 |
| 2026-10-10 | Code | `autobyteus-ts/package.json` `"test": "echo \"Error: no test specified\" && exit 1"` | Core test command | `pnpm -C autobyteus-ts test` fails | F-05 |
| 2026-10-10 | Code | `autobyteus-ts/tests/setup.ts`, `vitest.config.ts` | Isolation | Only sets `APP_ENV=test`; no environment isolation (server has `tests/setup/test-environment-isolation.ts`) | F-03 |
| 2026-10-10 | Code | `autobyteus-ts/tests/integration/**` (`grep process.env.*API_KEY`) | Credential source | Every live provider test reads plain env vars (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `VERTEX_AI_*`, `KIMI_API_KEY`, `GLM_API_KEY`, `MISTRAL_API_KEY`, `GROK_API_KEY`, `DASHSCOPE_API_KEY`, `AUTOBYTEUS_API_KEY`…). None reads a vault | F-01 |
| 2026-10-10 | Code | `autobyteus-ts/src/secrets/provider-api-key-resolver.ts`; `src/llm/api/anthropic-llm.ts:239` | Current client contract | Clients require `(model, config, apiKeyResolver)`; commits `62b4c2c3e`, `056455929` | F-02 |
| 2026-10-10 | Code | `grep -rlE "new [A-Za-z]+LLM\([a-zA-Z]+\([^)]*\)\)" tests/integration` | Stale tests | 12 live test files construct LLMs with the pre-resolver signature (anthropic, anthropic-image, openai, openai-image, deepseek, gemini, glm, grok, kimi, mistral, qwen, gemini handler); 2-arg flows (`openai-single-agent-flow`) also omit the resolver | F-02 |
| 2026-10-10 | Code | `autobyteus-ts/tests/integration/helpers/provider-access.ts` | Skip semantics | 401/403/404/429/quota errors → `console.warn` + `return` → the test **passes** | F-04 |
| 2026-10-10 | Code | `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts:56,691`; `agent-initiated-collaborators.e2e.test.ts:87` | Gated server live E2E | Read `ANTHROPIC_API_KEY` / `DEEPSEEK_API_KEY` from env and save into a run-owned vault; cannot consume a provisioned test vault | F-01 |
| 2026-10-10 | Code | `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts:17-60` | Scenario selection | `describe` enabled while the filtered list is empty → Vitest "No test found in suite" | F-08 |
| 2026-10-10 | Command | `git grep -i "local-vault"`; `git log --all -S"local-vault"`; `-S"development.real-test"` | Brief's pointer | No reference in current code, docs or git history of this repo | F-12 |
| 2026-10-10 | Data | `ls -la ~/.autobyteus/local-vault` (listing only) | Brief's pointer | `vault.db`, `root.key`, `clients/development.application.token`, `clients/development.real-test.token`, last written 2026-08-13 | F-12 (not opened) |
| 2026-10-10 | Data | `env \| grep -oE '^[A-Z_]*API_KEY='` in the agent shell; names-only grep of `~/.autobyteus/server-data/.env` | Inherited credentials | Agent shell carries 13 plaintext `*_API_KEY` variables that match the live app's legacy `.env` (ANTHROPIC excluded) | F-03 |
| 2026-10-10 | Doc | `autobyteus-ts/docs/nodejs_architecture.md:38`; no `autobyteus-ts/README*` | Discoverability | Says ".env.test contains API keys for integration tests" (no such file; contradicts vault rule) | F-11 |
| 2026-10-10 | Doc | `tickets/done/agent-isolated-app-recording/requirements-doc.md` DEC-002, AC-014; `investigation-notes.md` P-8 | Prior decision | `--yes` for the importer was dropped (SR-005/006) on probe P-8, which itself used `(sleep 1; printf 'IMPORT\n'; sleep 1) \| script …` | DEC-003 |
| 2026-10-10 | Doc | `git grep secrets:import -- '*.md'` | Discoverability | Flow described in 8 places (TESTING, root README, server README ×2, secret_management, isolated-app guide, web README, electron_packaging, isolated-app skill); none covers autobyteus-ts | F-11 |
| 2026-10-17 | User | Task c15a77b2 description "UPDATE 2026-10-17" and context file `ctx_b0352f9590d0__55.png` (copied to `context/55.png`) | User direction and incident | The agent in skill-update-notice ran a live suite that "took the key from the environment" and had to stop it; the user's workaround was to import the real `server-data/.env` into the testing vault | Shapes REQ-001..REQ-007 |
| 2026-10-17 | Code | `autobyteus-server-ts/tests/e2e/helpers/live-runtime-secret-vault-helpers.ts` (`initializeLiveRuntimeSecretVaultFromEnvironment`) | Incident root cause | Saves every recognized `*_API_KEY` from `process.env` into the test DB vault. Used by 9 live suites (agent-initiated-collaborators, agent-runtime-graphql, all-runtime-send-message-matrix, autobyteus-anthropic-prompt-caching-live, autobyteus-team-runtime-graphql, mixed-task-delegation, mixed-team-runtime-graphql, nested-mixed-team-runtime-graphql; plus skill-update-notice-live in its worktree) | F-15 |
| 2026-10-17 | Code | `active-run-skill-update-notice/.../skill-update-notice-live.e2e.test.ts` l.31-38 | Incident | Header: "AutoByteus takes provider keys from credential aliases in the environment" | F-15 |
| 2026-10-17 | Code | `src/secret-management/secret-vault-runtime.ts`; `resolution/secret-management-provider-api-key-resolver.ts` | Feasibility of in-process test resolver | `SecretVaultRuntime.initialize(ApplicationDatabaseLocation)` plus `SecretManagementProviderApiKeyResolver` already implement an autobyteus-ts `ProviderApiKeyResolver` over a vault at a given location, decrypting at point of use | REQ-005, REQ-006 feasible without env |
| 2026-10-17 | Code/Doc | `git show 3877b39bdc^:autobyteus-server-ts/docs/modules/secret_management.md` §"Dedicated Real-E2E Store"; `tickets/done/secure-centralized-secret-provisioning/live-test-secret-provisioning.md` | History | A standing read-only real-E2E store at `~/.autobyteus/server-data/secret-store/real-e2e-secret-store.{db,key}` (provisioned by hidden TTY input) was removed on 2026-07-27. Rationale: tests must use the normal application DB/vault lifecycle; the old runner opened a harness-only Store; and it lived in production app data | F-16; run copies satisfy the rationale |
| 2026-10-17 | Data | `ls ~/.autobyteus/server-data/secret-store` (listing only) | Leftovers | `real-e2e-secret-store.*` and `secret-store.*` still present | F-12 (DEC-008) |
| 2026-10-17 | Data | `ls autobyteus-worktrees/*/autobyteus-server-ts/db/*.secret.key` | Spread of copied keys | 3 worktree test vaults exist; `secrets:import` evidence in 143 ticket folders | F-07 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | `pnpm secrets:import -- --source <abs> --database-url file:<abs>` | Build server (~20 s) → validate source/target → preview (dry-run) or TTY challenge `IMPORT` → atomic batch | Value-free output; works interactively; no-TTY refused | W-01..W-04 | High |
| BEH-002 | Operational | `pnpm test:e2e:real[:preflight]` | Build server → start built server on fixed per-worktree DB `autobyteus-server-ts/db/test.db` → run capability + compaction suites in a sanitized env | Preflight prints per-scenario configured/missing JSON; never prints the vault path | W-08, W-10 | High |
| BEH-003 | Operational | autobyteus-ts live tests (`vitest run tests/integration/...`) | Gate on `process.env.<ALIAS>` → `describe` or `describe.skip` → construct client directly | No vault; stale constructor; silent skip; access errors pass | W-05..W-07 | High |
| BEH-004 | Operational | Server gated live E2E (`RUN_ANTHROPIC_CACHE_E2E`, `RUN_DEEPSEEK_E2E`) | Gate + env key → test saves key into its own temporary vault | Cannot use a provisioned test vault; developer must put the key on the command line | code refs above | High |
| BEH-005 | Operational | TESTING Rule 2 (never use the user's app/data) | Server unit/integration strip inherited env; autobyteus-ts and server E2E do not | autobyteus-ts silently uses inherited production keys | F-03 | High |
| BEH-006 | Contract | TESTING "missing capabilities are reported, never counted as passed" | Preflight honors it; autobyteus-ts does not (skip=green, access error=pass) | Contradiction | F-04 | High |
| BEH-007 | Operational | Cleanup of a test vault | Manual `rm` of DB, `.secret.key`, journal and runtime dir | No command; DB file created `0644` (key `0600`) | W-cleanup | High |
| BEH-008 | Data | `~/.autobyteus/local-vault` | Not read or written by any code in this repo | Orphaned production-side data from an earlier/other design | F-12 | Medium (org-wide search incomplete) |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `LocalEnvironmentSecretImportService` (`execute(request, confirmationPort)`) | Atomic import with injectable confirmation port (unit tests already inject one) | A non-interactive confirmation is a small, contained change | Reuse for test-vault init; where does `--yes` live |
| `SecretManagementService` / `SecretVaultRepository` | Authorized value-free status and just-in-time resolution | Runners can read test-vault secrets without exposing values | Which consumer identity authorizes test-runner resolution |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Fixed DB under `autobyteus-server-ts/db/`, sanitized child env | Standard test vault must not be the per-run runtime DB | Copy-on-run from the standard vault into the run-owned DB vs direct use (schema skew) |
| `autobyteus-ts` `ProviderApiKeyResolver` | Storage-neutral injection point | autobyteus-ts stays vault-agnostic; a test-only resolver can be injected | Env-backed resolver in tests fed by a clean-env runner |
| `autobyteus-server-ts/tests/setup/test-environment-isolation.ts` | Strips inherited env for server unit/integration | Precedent for autobyteus-ts isolation | Reuse pattern |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Key source file (owner-private `.env` style); test vault DB + `.secret.key`; run-owned runtime `.env`; vitest output.
- Readers/writers: importer (reads source, writes vault); real-E2E runner (reads vault via built server); autobyteus-ts tests (read env).

### Structural Surfaces

- Root `package.json` scripts; `test-support/live-e2e/*`; importer CLI/service; autobyteus-ts `package.json`, `vitest.config.ts`, `tests/setup.ts`, `tests/integration/**`.
- Existing surfaces that support the behavior: importer service with injectable confirmation; preflight capability report; sanitized-environment helper.

### Potential Structural Impacts To Investigate

- API or external-contract change: CLI options (`--yes`), new scripts. No product API.
- Persistence schema or invariant change: None expected (test vault reuses the application DB schema).
- Security or privacy boundary change: Yes — non-interactive import; a test runner reading a vault; refusing production paths.
- Concurrency or lifecycle change: concurrent test runs reading one shared test vault (read-only use).
- Deployment/migration/ownership: shared vault across worktrees at different schema versions (Unknown U-02).
- Confirmed absent/present/unknown: see Unknowns.

## Runtime, Probe, Or Reproduction Findings

Walkthrough performed 2026-10-10 in the task worktree. Key values came from the agent shell's inherited environment (`DEEPSEEK_API_KEY`, `OPENAI_API_KEY`), written to an owner-private temp file; no production file was read for values or written. Logs (ANSI-stripped, scanned for both key values: no match) are in `walkthrough/`.

| Method / Command | Scenario | Observation | Requirement Implication | Artifact |
| --- | --- | --- | --- | --- |
| W-01 `pnpm secrets:import -- --source <tmp>/test-keys.env --database-url file:<tmp>/vault/test.db --dry-run` | Fresh isolated vault, preview | exit 0 in 23 s (includes server build); `INITIALIZATION_REQUIRED`, 2 × `CREATE` | Dry-run is good; build on every call is slow | `walkthrough/01-dry-run.log` |
| W-02 importer execute with `< /dev/null` | Agent, no TTY | `IMPORT_CONFIRMATION_REQUIRED`, exit 1; `echo IMPORT \|` same | Agents cannot import without a PTY trick | `02-no-tty.log` |
| W-03 `echo IMPORT \| script -q /dev/null node …importer…` | Documented agent workaround | Input reaches EOF before the prompt → `^D` → `IMPORT_CANCELLED`, exit 1, nothing written | TESTING.md recipe is incomplete/unreliable | `03-script.log` |
| W-04 `(sleep 6; printf 'IMPORT\r'; sleep 8) \| script -q /dev/null node …` | Timing hack | `READY`, `CONFIGURED 2`, exit 0; `test.db` `0644`, key `0600` | Works only with undocumented sleeps | `04-script-delayed.log` |
| W-05 `pnpm -C autobyteus-ts test` | Documented core test command | `Error: no test specified`, exit 1 | TESTING.md table is wrong for autobyteus-ts | `05-ts-pnpm-test.log` |
| W-06 `env -i PATH HOME TMPDIR vitest run deepseek-llm.test.ts openai-llm.test.ts` | autobyteus-ts with a provisioned vault, clean env | 12 live tests skipped, exit 0 ("1 passed, 12 skipped") | Vault invisible; skip looks green | `06-ts-clean-env.log` |
| W-07 same file with the inherited agent env | Naive agent run | Uses inherited production keys; 5/5 live tests fail `TypeError: Cannot read properties of undefined (reading 'systemMessage')` before any request | Live tests are stale; production keys leak in | `07-ts-inherited-env.log` |
| W-08 `pnpm test:e2e:real:preflight` (empty) | Server, before import | exit 0 in 35 s; creates `<worktree>/autobyteus-server-ts/db/test.db`; per-scenario `missing` lists; vault path not printed | Good report; hidden fixed target | `08-preflight-empty.log` |
| W-09 importer (timing hack) into `<worktree>/autobyteus-server-ts/db/test.db` | Provision the runner's vault | `CONFIGURED 2` | Must re-import per worktree | `09-import-worktree.log` |
| W-10 `pnpm test:e2e:real -- --scenarios=deepseek.llm` | Server live E2E | `deepseek.llm` executed and passed (1.3 s) through the real server; run exit 1 because `real-e2e-compaction-quality` had "No test found in suite" | Single-scenario selection is broken | `10-real-deepseek.log` |
| W-cleanup `rm` of temp dir, worktree `db/test.db*`, `tests/.tmp/live-e2e-runtime` | Cleanup | Manual; no command exists | Need a cleanup command | — |

Not run: the Anthropic prompt-caching live E2E (no `ANTHROPIC_API_KEY` in the agent environment; ~40 Opus calls; reading it from the production `.env` would violate Rule 2). Its key path is established by code (env var → run-owned vault).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (2026-10-10) | Easy test-vault setup; tests (esp. autobyteus-ts real-LLM) use it easily | Direct | REQ-001..REQ-006 | Approach approval |
| Task brief | No plaintext committed/printed; never touch production; explicit opt-in | Direct | QR-001..QR-003 | — |
| Prior ticket `agent-isolated-app-recording` DEC-002 | User chose no `--yes`, TTY via `script` | Prior user decision | Revising needs explicit approval | DEC-003 |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| macOS `script(1)` | BSD script | Forwards piped stdin to the PTY; EOF on stdin can be delivered before the child's prompt | W-03/W-04 | Timing differs per machine |
| Vitest 4 | `describe.skip`, `ctx.skip(reason)` | Empty enabled suite fails the file; skip reasons are reportable | W-10 | — |

## Persisted Data And State Facts

- Affected stored subject: test-owned SQLite DB + `.secret.key` pairs only. Production `~/.autobyteus/**` must remain untouched.
- Location: today `<worktree>/autobyteus-server-ts/db/test.db` (per worktree, gitignored `/db/`), or any absolute path chosen by the operator.
- Volume: a handful of secrets.
- Readers/writers: importer, built server (real-E2E runner).
- Must preserve: existing production vaults; isolated-instance import flow; existing per-worktree test DBs may be discarded (test-owned).
- Acceptable loss: existing test vault contents (re-importable from the key source).
- Remaining evidence gap: U-02 (schema skew for a shared vault).

## Product Design Request Context

- Product Design request in the current input: `Not stated` (developer tooling; no UI).

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `test-vault-evaluation-report.md` | Solution Designer | User-facing evaluation report and approved usage model (§5.0) | Whole request | All | Final @ SR-008 | Behavior-defining; approved with SR-006/SR-008 |
| `walkthrough/*.log` | Solution Designer | Raw walkthrough evidence (value-free) | W-01..W-10 | Evidence | Final | Evidence only |
| `context/55.png` | User (copied from Task context) | Incident screenshot | REQ-006 | Evidence | Final | Evidence only |
| `design-spec.md` | Solution Designer | Architecture design | All | Ready @ SR-006 | Design (no user approval needed) |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-01 | Unknown | Origin of `~/.autobyteus/local-vault` (no reference in this repo; org-wide search did not complete) | User may expect it to be the test vault | Ask user; never modify it in this task | Open |
| U-02 | Unknown | Whether one shared test-vault DB can be read safely by worktrees at different schema/migration versions | Shared location design | Resolved (SR-006): consumers open the vault read-only and read only the two secret tables, so they never migrate it and newer/older worktrees can read it. Re-running setup from an older worktree against a newer vault is observed in implementation (ARCH-REV-001 P-002). | Resolved |
| R-01 | Risk | Non-interactive import weakens the accidental-target guard | Security | Explicit flag + production-path refusal (QR-002) | Open |
| R-02 | Risk | Injecting keys into a child process environment exposes them to that process tree | Security | Clean env, test-owned child only, never logged (QR-001) — same exposure the Anthropic live E2E already accepts | Open |
| R-03 | Risk | Repairing all stale autobyteus-ts live tests may be sizeable (≥12 files) | Scope | Decide coverage in DEC-005 | Open |
| R-04 | Risk | autobyteus-ts live tests depending on built server vault code is a test-only reverse dependency | Layering | Design: workspace `test-support` module vs shared vault-reader package | Open |
| R-02b | Note | SR-001's R-02 (keys in child env) is withdrawn: the user forbids keys in the environment (REQ-006) | — | — | Closed by SR-002 |

## Architecture Investigation Findings

Authorities read for design (2026-10-19), all from `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/`:
- `references/architecture-design.md`
- `references/design-principles.md`
- `references/ticket-scope.md`
- repository `DESIGN.md` (no closer `DESIGN*.md` applies)
- `autobyteus-server-ts/AGENTS.md`

| ID | Source / Command | Observation | Design implication |
| --- | --- | --- | --- |
| A-01 | `src/secret-management/persistence/secret-vault-repository.ts`; `repository_prisma` | The vault repository uses the process-global Prisma client bound to one `DATABASE_URL`. One process can hold only one Prisma-backed vault. | A test process that already uses its own app DB (server E2E), or no DB at all (autobyteus-ts), cannot open the standing vault through Prisma. A non-Prisma read path is needed. |
| A-02 | `src/secret-management/services/secret-vault-inspection-service.ts` | A read-only path already exists: `node:sqlite` `DatabaseSync(path, {readOnly:true})` + `PRAGMA query_only=ON` + `SecretRootKeyFile` | Precedent and building blocks for a read-only vault store; no Prisma, no writes |
| A-03 | `src/secret-management/crypto/secret-vault-crypto.ts` `decryptSecretEntry(rootKey, encryptionDomainId, id, payload)` | Entry keys derive from root key + random domain ID + SecretId. **Not** from the DB path. | A copied or read-only-opened vault decrypts anywhere; nothing is path-bound |
| A-04 | `src/secret-management/services/secret-management-service.ts` | `resolveForUse(consumer)` = catalog authorization + `readEntry` + decrypt + `SecretValue`. It imports the repository **type-only**; its runtime imports are catalog, crypto and `autobyteus-ts/secrets/secret-value.js`. | It can be reused unchanged in behavior over a read-only store if its constructor accepts a store interface. No duplicate decrypt/authorize logic. |
| A-05 | `src/secret-management/resolution/secret-management-provider-api-key-resolver.ts` | `SecretManagementProviderApiKeyResolver(subject, managementProvider)` already implements the autobyteus-ts `ProviderApiKeyResolver` over any `SecretManagementService`, mapping MISSING to `MissingApiKeyError` | The test-vault resolver is this class with a test-vault-backed service provider |
| A-06 | `src/secret-management/bootstrap/secret-vault-bootstrap.ts` | Verifying an established vault (DB identity checks, key read, metadata validation, verifier) sits behind a Prisma transaction lock (`withInitializationLock`) | Extend the bootstrap with a verify-only entry that takes a read-only store, reusing its private validators |
| A-07 | `src/secret-management/provisioning/local-environment-secret-import-service.ts` | The importer's execution-runtime factory owns "open a writable vault for an explicit location": `runMigrations` + `initializePrisma` + `SecretVaultRuntime.initialize` + shutdown. Confirmation goes through an injectable port (TTY + `IMPORT`). | Extract the writable-target opener for reuse by test-vault setup/transfer. Give test-vault setup a confirmation port bound to the validated test-vault target. |
| A-08 | `autobyteus-ts/src/secrets/secret-value.ts`; `grep revealToTrustedConsumer autobyteus-ts/src` | Clients use `secret.revealToTrustedConsumer()` only (duck-typed, no `instanceof SecretValue`) | A `SecretValue` from another module copy works. `MissingApiKeyError` identity matters for classification, so autobyteus-ts tests should alias `autobyteus-ts` → its own `src`. |
| A-09 | `autobyteus-ts/package.json` `exports` → `./dist/*` | Server modules importing `autobyteus-ts/...` resolve to dist by default | autobyteus-ts `vitest.config.ts` adds a self alias to `src`, so tests do not need a dist build and share one class identity |
| A-10 | `test-support/live-e2e/*.ts` import `../../autobyteus-server-ts/src/...` and `../../autobyteus-ts/src/...`; server unit tests import `../../../../test-support/live-e2e/...` | Established workspace pattern: cross-package test glue lives in `test-support/` and imports package sources | `test-support/test-vault/` holds test policy (gates, skip/strict, per-process lifecycle) over the server capability; autobyteus-ts and server tests import it |
| A-11 | `test-support/live-e2e/live-e2e-harness.ts` l.500, l.1253 | Each scenario sets its Gemini mode through Settings; nothing depends on persisted runtime state | `test:e2e:real` can use a run-owned temporary runtime root and DB, removed after the run, instead of the persistent per-worktree `db/test.db` |
| A-12 | `test-support/live-e2e/test-runtime-bootstrap.mjs` `resolveTestDatabaseLocation`, `removeOwnedTestRuntime`, `startBuiltTestServer({databaseUrlOverride, runtimeRoot})` | Run-owned DB/root and fenced cleanup already exist | Reuse; add a provisioning step before the server launch |
| A-13 | `docs/isolated-app-instances.md` l.270-285; `skills/autobyteus-isolated-app/SKILL.md` l.44-49 | Contract today: import into the instance `databaseUrl`, then `isolated-app restart` | `start --test-vault` performs a transfer into that `databaseUrl` and then the existing restart, as a subprocess call to the server CLI (the web scripts do not import the server) |
| A-14 | `autobyteus-server-ts/tests/setup/test-environment-isolation.ts`; TESTING.md "E2E … keep the inherited environment" | Inherited env stays for E2E (CLI logins need HOME etc.) | For E2E, strip only credential variables, not the whole env |
| A-15 | `grep` inventory | 8 server suites + 1 helper use the env→vault helper; 18 autobyteus-ts live files read credential env (the unit test `gemini-helper.test.ts` sets synthetic env only) | Sizing input |
| A-16 | `/Users/normy/autobyteus_org/autobyteus-agents/**` (`grep secrets:import\|API_KEY`) | Team skills do not repeat importer mechanics | No team-skill edits needed; the `AGENTS.md` entry reaches every agent |
| A-17 | `vitest` ^4.0.18 (autobyteus-ts) | `TestContext.skip(note)` supports a reasoned skip | Missing capability / provider refusal is reported as a skip with a reason, never a pass |
| A-18 | `src/server-runtime.ts:169`; `src/standalone-application-host/start-standalone-application-host.ts:145` | The vault runtime is initialized at exactly two startup sites, with the app DB location | One source decision passed at both sites |
| A-19 | `src/config/app-config.ts:470` `get()` | `process.env[key] ?? .env[key]` | The selector works from the env (tests, built servers) and from a data-dir `.env` |
| A-20 | `autobyteus-web/electron/server/serverRuntimeEnv.ts` (`inherit-caller` vs `isolated-baseline`, `buildServerProcessEnv`); `electron/appDataPaths.ts` (`~/.autobyteus/server-data`) | Production launches pass the full caller env to the server; isolated launches pass only a baseline | A server-side real-app-data guard is mandatory; the isolated policy forwards the selector explicitly |
| A-21 | `grep -rln "apiKeyResolver: ProviderApiKeyResolver" autobyteus-ts/src` → 31 files | Every autobyteus-ts client/factory requires an explicit resolver | An optional parameter + process default slot gives "no extra code" in tests |
| A-22 | `app-data-migrations/migrations/custom-provider-readable-id-app-data-migration.ts:235` | Vault removal only for legacy custom-provider data; failure → sanitized warning | A read-only test vault yields at most a warning on legacy test DBs |
| A-23 | `autobyteus-web/electron/main.ts:15-23` `getProtectedProductionPaths()`; `autobyteus-web/package.json` name `autobyteus`; `ls ~/Library/Application Support`, `~/Library/Logs` → `autobyteus` | Electron protects `~/.autobyteus` + `userData`/`sessionData`/`logs`/`crashDumps`; userData default = `<appData>/autobyteus` | REQ-004 refused set, mirrored as a pure server predicate |
| A-24 | `grep -rln "runtime.initialize(" autobyteus-server-ts/tests` → 6 files; env helper used by 8 suites | In-process suites initialize the vault runtime themselves | They pass an explicit source (application, or the live initializer) |
| A-25 | `autobyteus-web/tests/e2e/*.mjs`: 22 probes spawn `dist/app.js` with `...process.env`; `provider-api-key-save-probe.mjs` saves keys | No shared probe env owner | The key-saving probe strips the selector; others: residual R-D; FU-05 |
| A-26 | `test-support/live-e2e/live-e2e-harness.ts:1195-1232` | The real-E2E harness opens an in-process runtime on the run DB; preflight reads the server's GraphQL vault status | The harness uses the live initializer; preflight follows the server's selected source |


## Requirement Implications

Findings F-01..F-14 are summarized in `test-vault-evaluation-report.md` and map to REQ-001..REQ-010 in `requirements-doc.md`.

## Notes For Architecture Design

Superseded by the design (`design-spec.md` @ SR-008). The current constraints are:
- one selector variable, `AUTOBYTEUS_TEST_VAULT`;
- the read-only test vault is selected by the normal vault runtime (no copies, no transfer);
- live runs opt in; deterministic harnesses do not apply the selector;
- autobyteus-ts `src` stays vault-agnostic, with an optional default resolver installed by the test setup;
- forbidden locations are listed in REQ-004.

The SR-001/SR-002 note "inject an env-backed test resolver" is withdrawn (REQ-006).
