# Test Vault Developer Experience: Evaluation Report

Revision SR-009, 2026-10-20 (autobyteus-ts reads the variable itself). Earlier: SR-008, 2026-10-19. The test vault is selected like a database (one environment variable); approved by the user on 2026-10-19 (SR-006/SR-007). SR-008 aligns the details with architecture review ARCH-REV-001.
Worktree: `codex/test-vault-developer-experience` from `origin/personal` @ `d28c56d5d`.
Evidence: [investigation-notes.md](investigation-notes.md), raw logs in [walkthrough/](walkthrough/).
Requirements for approval: [requirements-doc.md](requirements-doc.md).

What changed since SR-001: the user's update of 2026-10-17 and the incident
screenshot (below) add one hard rule: **no key ever travels through the
environment, chat or logs**. The SR-001 recommendation is withdrawn because its
runner passed keys to tests as environment variables. The recommendation below
replaces it.

## 1. Bottom line

There is no standing test vault today. Every test database gets its own copy
of the user's real keys, and several test paths take keys straight from the
environment:

- **autobyteus-ts real-LLM tests never read a vault.** They read plain
  environment variables. 12 live test files are also stale: they crash with
  `TypeError` when a key is present, and when no key is present they skip and
  the run looks green.
- **Nine server live suites pull keys from the environment into their vault.**
  A shared helper, `initializeLiveRuntimeSecretVaultFromEnvironment`, copies
  *every* recognized `*_API_KEY` variable it finds into the test's vault. The
  suites that use it include Anthropic prompt caching, the DeepSeek
  collaborators, the runtime GraphQL suites and skill-update-notice.
- **Agent shells carry the user's production keys.** 13 plaintext `*_API_KEY`
  variables come from the live app's `~/.autobyteus/server-data/.env`. Neither
  autobyteus-ts nor the server E2E suites strip them. A live suite started in
  an agent shell therefore uses the production keys silently. That is the
  skill-update-notice incident.
- **The server real-provider E2E (`pnpm test:e2e:real`) uses a vault, but a
  hidden one per worktree** (`<worktree>/autobyteus-server-ts/db/test.db`). It
  must be provisioned again with `pnpm secrets:import` in every worktree.
  Agents can only do that with a sleep-timed `script` hack.

## 2. The incident (user evidence, 2026-10-17)

![skill-update-notice exchange](context/55.png)

In the skill-update-notice ticket the user wrote: "if you need api key you need to
use pnpm to import the /Users/normy/.autobyteus/server-data/.env for the testing
vault". The agent had **already** started a live run that "took the key from the
environment", and it had to stop that run (`pkill -f "SKILL_NOTICE_E2E_RUNTIMES=autobyteus"`).

Cause, confirmed in code:
- `skill-update-notice-live.e2e.test.ts` says "AutoByteus takes provider keys
  from credential aliases in the environment".
- Its helper saves every `*_API_KEY` from `process.env` into the test vault.
- The agent shell already held the production keys.

The workaround the user had to give is itself the problem this task targets:
- the real `.env` is imported into yet another test database;
- the agent needs to know the importer, an absolute DB path and the TTY workaround.

Original screenshot: Task context file `ctx_b0352f9590d0__55.png`.

## 3. Walkthrough (2026-10-10)

| Step | Command (abbreviated) | Result | Time |
| --- | --- | --- | --- |
| 1 | Write an owner-only key file (`chmod 600`) with `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` | OK. Group/world-readable files are rejected. | — |
| 2 | `pnpm secrets:import -- --source <abs> --database-url file:<abs>/test.db --dry-run` | OK, clear value-free plan | 23 s (rebuilds the server every call) |
| 3 | Same without `--dry-run`, no TTY | **Fails** `IMPORT_CONFIRMATION_REQUIRED`; piping `IMPORT` also fails | — |
| 4 | `echo IMPORT \| script -q /dev/null …` (TESTING.md recipe) | **Fails** `IMPORT_CANCELLED`: stdin EOF arrives before the prompt | — |
| 5 | `(sleep 6; printf 'IMPORT\r'; sleep 8) \| script -q /dev/null …` | Works | ~15 s |
| 6a | `pnpm -C autobyteus-ts test` | **Fails**: `Error: no test specified` | — |
| 6b | autobyteus-ts DeepSeek + OpenAI live tests, clean env | 12 skipped, exit 0; the vault is invisible | — |
| 6c | Same, inherited agent env | Uses **production** keys; 5/5 **crash** (`TypeError`) | — |
| 7 | `pnpm test:e2e:real:preflight` | Good per-scenario report. It silently uses `<worktree>/autobyteus-server-ts/db/test.db` (my vault ignored, path not printed). | 35 s |
| 8 | Import there, then `pnpm test:e2e:real -- --scenarios=deepseek.llm` | Scenario **passed** via the real server; run still **exits 1** (empty compaction suite) | 31 s |
| 9 | Cleanup | Manual `rm`; no command | — |

## 4. Findings

| ID | Area | Finding | Severity |
| --- | --- | --- | --- |
| F-01 | One way? | Four credential paths:<br>• env vars (autobyteus-ts);<br>• env → test vault helper (9 server live suites);<br>• per-worktree vault via importer (`test:e2e:real`);<br>• importer into each isolated instance DB. | High |
| F-02 | autobyteus-ts | 12 live test files are stale against the API-key-resolver contract and crash when a key is present. | High |
| F-03 | Isolation (Rule 2) | Agent shells inherit 13 plaintext production keys. Only the server unit/integration suites strip them. | High |
| F-04 | Reporting | Missing key → silent skip, exit 0. Provider 401/403/429/quota → the test **passes**. | High |
| F-05 | Docs vs code | `pnpm -C autobyteus-ts test` exits 1. | Medium |
| F-06 | Prompt | No supported non-interactive import. The documented `script` recipe fails; only sleep timing works. | High (agents) |
| F-07 | Location | Per-worktree hidden vault with an absolute path, never printed. Keys are re-copied per worktree and per isolated instance. Today 3 worktree test vaults exist, and `secrets:import` evidence appears in 143 ticket folders. | High |
| F-08 | Runner bug | A single non-compaction scenario run exits 1. | Medium |
| F-09 | Speed | Every importer/real-E2E call rebuilds the server (20–35 s). | Low |
| F-10 | Cleanup | No cleanup command; the test DB is created `0644`. | Low |
| F-11 | Discoverability | The flow is spread over 8 docs and the isolated-app skill. Nothing covers autobyteus-ts, and one autobyteus-ts doc still says "`.env.test` contains API keys". | Medium |
| F-12 | Leftovers in production data | Three earlier test-credential stores still sit in production app data; this repo's current code uses none of them:<br>• `~/.autobyteus/local-vault/` (no reference in this repo);<br>• `~/.autobyteus/server-data/secret-store/real-e2e-secret-store.{db,key}` from the removed "Dedicated Real-E2E Store" (replaced 2026-07-27);<br>• `secret-store.{db,key}`.<br>I did not open them. | Info / user decision |
| F-13 | Aliases | `QWEN_API_KEY`, `ZHIPU_API_KEY` and `GOOGLE_CSE_API_KEY` are silently ignored by the importer. | Low |
| F-14 | What works | Importer validation and value-free output, dry-run, the preflight capability report, deterministic-test isolation, and the server's vault-backed `ProviderApiKeyResolver`. | — |
| F-15 | Env → vault helper | `tests/e2e/helpers/live-runtime-secret-vault-helpers.ts` saves every recognized `*_API_KEY` from `process.env`. It is used by 9 live suites. Root cause of the incident. | High |
| F-16 | History | A "Dedicated Real-E2E Store" (a standing, read-only test store) existed until 2026-07-27. It was removed for two reasons:<br>• it lived inside production app data;<br>• the harness read it directly, so tests did not use the normal application vault lifecycle (secure-centralized-secret-provisioning ticket).<br>The proposal below keeps that rule: each run works on a **copy** that the normal server opens. | Design input |

## 5. Approved approach: one test vault, selected like a database

**SR-003 refinement (user, 2026-10-19).** The test vault should feel like an API service:
- set up once;
- afterwards, any team member uses it the way it calls an API, with parameters in and a result out;
- nobody deals with vault mechanics;
- this applies to investigation and experiments by the solution designer or implementation engineer, not only to tests;
- the information lives in one global place every team member reads.

### 5.0 How it is used: like a test database

The user (2026-10-19): "the user just sets this environment variable … for the test
server, for the integration test, for API E2E … the electron instance … it's good
to go. And production, if you don't set this, it by default uses the production
itself."

| | Database (industry standard) | Vault (this design) |
| --- | --- | --- |
| Selector | `DATABASE_URL` | `AUTOBYTEUS_TEST_VAULT` (a directory; never a key) |
| Unset | the app's own database | the vault inside the app's own database (today's production behavior) |
| Set | every query goes to the test database | every key lookup reads the test vault (read-only) |
| Code changes | none | none: server code unchanged; autobyteus-ts reads the variable itself when a client is created without a key resolver, like an ORM reads `DATABASE_URL` (SR-009) |

| Who / when | What they do |
| --- | --- |
| User, once per machine | `pnpm test-vault setup --source <secrets file>`. It prints `export AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`. |
| Server live suites, API-E2E live runs, `pnpm test:e2e:real` | Set `AUTOBYTEUS_TEST_VAULT` (plus the test's existing `RUN_*` gate); run as usual. Deterministic suites keep their own vaults even if the variable is exported. |
| Isolated Electron instance | Set `AUTOBYTEUS_TEST_VAULT`; `pnpm isolated-app start …` |
| autobyteus-ts tests and investigation scripts | Set `AUTOBYTEUS_TEST_VAULT` and `RUN_LIVE_PROVIDER_TESTS=1`; `LLMFactory.createLLM('deepseek-v4-flash')` or `new DeepSeekLLM(model, config)` just works |
| Anyone | `pnpm test-vault status` (location, configured/missing providers) |

Safety:
- the test vault is opened read-only; a Settings save while it is selected is refused;
- a server on your real app data (`~/.autobyteus/server-data`) ignores the variable even if inherited;
- every server logs which vault it uses;
- paid live tests still need their `RUN_*` gate.

**Where the knowledge lives.** A short `AGENTS.md` entry (loaded by every agent) and one TESTING.md section, both saying the same thing: "set `AUTOBYTEUS_TEST_VAULT`".

### 5.1 Details

1. **Setup once.**
   - `pnpm test-vault setup --source <owner-private secrets file>` writes the vault at `$AUTOBYTEUS_TEST_VAULT`, or `~/.autobyteus-test/vault/` when unset. It is non-interactive, needs no database URL and prints the setting to use.
   - `pnpm test-vault status` and `pnpm test-vault remove` inspect and delete the vault.
   - Locations inside your real app data are refused: `~/.autobyteus/**` and the desktop app's OS data folders.
2. **Selected, never copied.**
   - A server started with `AUTOBYTEUS_TEST_VAULT` set opens the test vault **read-only**, in place of the vault inside its own database. The product's key lookup is otherwise unchanged.
   - This applies to `test:e2e:real`, isolated Electron instances, and servers or in-process suites of live runs.
   - Without the variable, or on your real `~/.autobyteus/server-data`, the server uses its own vault, as today.
   - A selected vault that is missing or unusable stops the server with a clear error; it never falls back silently.
3. **Live runs opt in; deterministic runs are unaffected.**
   - Live tests already need their gate (`RUN_LIVE_PROVIDER_TESTS=1` for autobyteus-ts, `RUN_*` for server suites). With the gate and the variable set, they use the test vault.
   - The deterministic harnesses (default `pnpm test:e2e`, built test servers started without the live opt-in, unit/integration, default autobyteus-ts) keep their own vaults even if the variable is exported in your shell, so their results do not change.
4. **autobyteus-ts with no extra code (SR-009).** autobyteus-ts reads `AUTOBYTEUS_TEST_VAULT` itself. In any process (a Vitest live run, `tsx probe.ts`, plain `node`), `LLMFactory.createLLM(id)` and `new XLLM(model, config)` get their key from the test vault, read-only, with no setup code. In Vitest, the paid-call decision stays with `RUN_LIVE_PROVIDER_TESTS=1`: without it, the test setup removes the selector so default runs are unchanged. The AutoByteus server switches this default off and uses its own vault selection. Gemini still takes its mode explicitly.
5. **No key in the environment.**
   - The env → vault helper is removed.
   - Tests strip inherited `*_API_KEY` variables, so production keys cannot reach a test.
6. **Missing capability is visible.** A reasoned skip (`missing capability <secret id> (test vault <path>)`) or a classified provider refusal, never a pass; strict mode fails.
7. **One message.** TESTING.md tells test runners to set `AUTOBYTEUS_TEST_VAULT` (a section, a rule and every real-key example). `AGENTS.md` says the same, and the other docs and skills link to it.
8. **Also fixed:**
   - `pnpm -C autobyteus-ts test` runs and is credential-free;
   - the single-scenario exit bug;
   - the preflight prints which vault is used.

### Trade-offs

- (+)
  - One variable, set once.
  - No per-test, per-run, per-worktree or per-instance import.
  - No copies of your keys anywhere.
  - Product code is unchanged.
  - The vault is never written by tests.
- (−) A new production-code input decides where credentials come from. Mitigations: the real-app-data guard, read-only access, the log line and no silent fallback.
- (−) autobyteus-ts gets an optional process-default key resolver, which is global state set only by test setup.
- (−) Large change: about 75 files across the server, autobyteus-ts, test-support, Electron and docs.
- Keys are decrypted in the test process memory at the moment of use, the same as in the product.

### Alternatives (not recommended)

- **B — standing plaintext key file:** simpler, but keys stay plaintext at rest.
- **C — keep per-database import and only fix the scripts:** keys keep being copied into many databases.
- **SR-005 draft — copy keys into each run's vault:** rejected in favor of read-only selection, which leaves no copies.

## 6. Decisions

All are decided; reasoning is in `requirements-doc.md` § Decisions (DEC-001..DEC-012):
- the approach and production default were decided by the user (SR-006);
- the TESTING.md instruction by the user (SR-007);
- the rest by the Solution Designer within that direction, including DEC-012 (live runs opt in; deterministic runs unaffected).

Out of scope:
- CLI-login runtimes (Claude, Codex, AGY, Grok);
- production vault behavior when the variable is unset;
- importer aliases (document the rename instead).

Old stores in production data and existing worktree test DBs are left for you to delete (DEC-008).

I also recommend, separately from this task, removing the plaintext keys from `~/.autobyteus/server-data/.env` once Settings holds them, because the live app exports them into every agent shell.
