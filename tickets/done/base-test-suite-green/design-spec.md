# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` at SR-002, approved by the user in conversation on 2026-10-08 ("try to fix the one which could be fixable … if the ones which cannot be fixed, then let it be. Let's go."). DEC-001..003 = recommended option A (user-directed defaults); ASM-001/002 accepted.
- Behavior-defining supplements and their approval references: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/investigation-notes.md`
- Authorities read (design reading gate; 2026-10-08): `references/architecture-design.md`, `design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/DESIGN.md` (same content in the worktree), `TESTING.md`. `design-examples.md` not needed.
- Project design-principle conflicts or discrepancies: none. DESIGN.md rule 4 ("preserve guarantees, not machinery") shapes how the stale tests are fixed: assert the current guarantee, not the removed mechanism.

## Current-State Read

All failures sit in test code and test infrastructure of `autobyteus-server-ts`; production `src` builds and type-checks clean under the production policy (TC-3). The causes are three, all evidence-backed in `investigation-notes.md`:

1. **Stale tests (U1–U13, I1–I15).** Production owners changed intentionally between 2026-04 and 2026-10-08, and the tests' doubles, fixtures, imports or expectations were not updated. No CI runs these suites (RISK-002).
2. **Missing integration build prerequisites.** Some integration tests consume build outputs: the server `dist` watcher runtime (`watcher-runtime-entrypoint.ts` falls back from `src` to `dist`), the application SDK/devkit `dist`, and `applications/brief-studio/dist/importable-package`. `prebuild`/`prepare:shared` builds `autobyteus-ts`, sdk-contracts and backend-sdk, but not frontend-sdk, the devkit or Brief Studio. Building the devkit after `pnpm install` leaves the `autobyteus-app` bin unlinked until a re-install.
3. **Inherited live-app environment (E1, E2, ENV-1..ENV-4).** Vitest workers inherit the agent shell's env. `AppConfig.get` prefers `process.env`, and `autobyteus-ts` `memory/path-resolver.ts` reads `AUTOBYTEUS_MEMORY_DIR` directly.

Plus the `typecheck` script: `tsc -p tsconfig.json` errors on TS6059, which suppresses semantic checking entirely (TC-1, TC-2).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 30 existing test files updated locally (content-like fixes inside existing tests), plus one new test setup file, one new prerequisite script, `vitest.config.ts`, `package.json` scripts, one fixture helper and `TESTING.md`. Everything is inside the server package's existing test ownership. No runtime owner moves.
- Architectural risk: `Low`
- Risk rationale: no production `src`, API, persistence, security, concurrency or deployment change. The new env isolation is test-only and scoped to `tests/unit` and `tests/integration`. Its correctness was demonstrated beforehand by the clean-env runs (`evidence/run-suite-clean-env.sh`), whose only failures were the stale tests. The `typecheck` change makes the script check what `pnpm build` already enforces.
- Escalation trigger: return `Design Impact` to the Solution Designer if a failing test turns out to need a production `src` change that is not small and clearly intended (REQ-005). Do the same if the env isolation breaks an opt-in gated suite in a way that can't be fixed by preserving its declared variables, or if the I8 busy-ACK timeout (UNK-001) reveals a product defect.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Setup-file probe (temporary config, removed) | `expect.getState().testPath` inside a `setupFiles` module | Holds the absolute path of the test file about to run, and setup runs before the test module's imports | Scope env isolation per file to `tests/unit/**` and `tests/integration/**` without vitest `projects` | None |
| Env reference inventory | `grep process.env.* tests/unit tests/integration tests/setup tests/helpers tests/fixtures` | Tests read their own knobs (`RUN_*`, `TEST_*`, `FAKE_*`, `AGY_*`, `CODEX_*`, `CLAUDE_*`, `GROK_BUILD_COMMAND`, `FAKE_GROK_*`, `LMSTUDIO_*`, `IR055_*`, `AUTOBYTEUS_LIVE_E2E_SCENARIOS`, `AUTOBYTEUS_DOWNLOAD_TEST_URL`, `GOOGLE_CLIENT_*`/`GOOGLE_REFRESH_TOKEN` as an MCP gate). Tests that use app variables (`AUTOBYTEUS_MEMORY_DIR`, `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`, `DATABASE_URL`, …) set and restore them themselves. | Allowlist = system essentials + test-owned knobs | Implementation completes the knob list from the gated files' headers |
| Clean-env runs | `evidence/clean-unit*.json`, `evidence/clean-integration-prereqs-built*.json` | With `env -i PATH HOME TMPDIR LANG TERM CI`, only the stale tests fail | Allowlist approach is safe for the default run | — |
| Credential registry | `src/secret-management/provisioning/local-import-credential-alias-registry.ts`, `src/config/app-config-setting-policy.ts` | Canonical credential names exist | Not needed for the allowlist; allowlist removes them by construction | — |
| `prepare:shared` | `autobyteus-server-ts/package.json` | Builds `autobyteus-ts`, sdk-contracts, backend-sdk | Prepare adds frontend-sdk, devkit, Brief Studio and server `build` | — |
| Devkit bin | fresh-worktree build log `evidence/prereq-brief-studio-build.log` | `autobyteus-app: command not found` until re-install | Prepare invokes `node <devkit>/dist/cli.js pack` directly, not the bin shim | Implementation confirms `pack` needs only the cwd |
| Typecheck probes | `evidence/probe-build-src.log` | `tsc -p tsconfig.build.json --noEmit` → 0 errors | `typecheck` uses the production config | — |

## Intended Change

1. Fix each stale test to the current intended contract (per-test plan below).
2. Add a unit/integration test-environment isolation setup file.
3. Add one integration-prerequisite script with `prepare` and `check` modes, plus package scripts that wire it in.
4. Point `typecheck` at the production type policy.
5. Document the commands in `TESTING.md`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior (evidence) | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, REQ-006 / AC-001, AC-006 | `vitest run tests/unit` | 41 stale failures (U1–U13) | 0 failures, test intent preserved | DS-001 |
| BEH-002 | Operational | REQ-003 / AC-003 | `pnpm -C autobyteus-server-ts test:integration` on a fresh worktree | 42 prerequisite-only failures | Prepare command builds them; check fails once, clearly, if missing | DS-002 |
| BEH-003 | Operational | REQ-002 / AC-003 | same, prerequisites present | 47 stale failures (I1–I15) | 0 failures | DS-001 |
| BEH-004 | Operational | REQ-007 / AC-005 | `pnpm -C autobyteus-server-ts typecheck` | TS6059, no checking | Real checking of production `src`, exit 0 | DS-003 |
| BEH-005 | Operational | REQ-004 / AC-002, AC-004 | suites run from an agent shell | inherited env changes results; can reach user data | Results identical to clean env; user data untouched | DS-001 (isolation step) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/clean-unit-inventory.txt`, `evidence/clean-integration-prereqs-built-inventory.txt` | Exact failing tests | REQ-001, REQ-002 | Implementation checklist | Evidence |
| `evidence/run-suite-clean-env.sh` | Clean-env reference runner | REQ-004 | Validation reference for AC-001/002 | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (test-suite repair) plus a small test-infrastructure addition
- Current design issue found: `Yes`, in test infrastructure only
- Structural triggers:
  - *Capability-area reuse*: env handling already lives in `tests/setup/`, so it is extended there. Prerequisite building reuses the existing package build scripts.
  - *Repeated coordination*: three failing files hand-write Team packages without the communication-messages file. One fixture helper gives "a complete current Team package" a single owner.
  - *Empty indirection*: ruled out. The new script owns real policy (ordered builds, artifact list, clear message).
  - Production triggers: none fire. No production owner is touched.
- Root cause classification: `Missing Invariant` (test infrastructure). The suite has no owned guarantee that it runs isolated from the caller's environment, or that its build prerequisites exist. Per-test causes are local drift (stale doubles/expectations).
- Refactor needed now: `No` for production; small test-infra additions only
- Evidence: investigation U1–U13, I1–I15, E1–E2, ENV-1..ENV-4, TC-1..TC-4
- Design response: below
- Intentional deferrals and residual risk:
  - Test-file type errors (1,322) are deferred to a separate ticket (DEC-001 A). Stale doubles can still compile-drift unnoticed until then.
  - No CI gate (RISK-002).
  - Ignored test residue in the package root (ENV-5).

## Terminology

- **Test-owned knob**: an environment variable that a test file or its fixture defines as its own input (opt-in gate, fake-CLI control, fixture path), as opposed to live-app configuration.
- **Integration prerequisites**: build outputs consumed by integration tests. They are the server `dist`, the application SDK and devkit `dist`, and the Brief Studio importable package.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Stale tests are updated to the current contract. They must not re-add removed APIs, shims or compatibility branches to production to make old tests pass (for example, no `FileExplorer` alias export, no `prepareNewAgentRun` wrapper, no absolute-URL option).
- Where a test spied on a removed mechanism (U8 `prepareNewAgentRun`, U12 `initialize()`), it asserts the current guarantee instead: no run is started, and the skill workspace is created and cached.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. Test-only changes; no stored data format changes.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 003, 005 | Developer/agent runs `vitest run tests/unit` or `test:integration` | Pass/fail report | Server vitest configuration | Where isolation and the fixed tests take effect |
| DS-002 | Primary End-to-End | BEH-002 | `test:integration:prepare` / `test:integration` | Prerequisites present, or one clear error | Integration prerequisite script | Separates "not built" from "broken" |
| DS-003 | Primary End-to-End | BEH-004 | `pnpm typecheck` | `tsc` result | `typecheck` script + `tsconfig.build.json` | Meaningful type gate |

## Primary Execution Spine(s)

- DS-001: `Shell (possibly app-spawned) -> vitest (vitest.config.ts) -> fork worker -> setupFiles: test-environment-isolation -> prisma-env -> test file imports and runs -> report`
- DS-002: `pnpm test:integration -> integration-test-prerequisites.mjs check -> (missing: one error naming artifacts + prepare command, exit 1) | (present: vitest run tests/integration -> DS-001)`; `pnpm test:integration:prepare -> integration-test-prerequisites.mjs prepare -> ordered package builds -> devkit CLI pack in applications/brief-studio -> check`
- DS-003: `pnpm typecheck -> pretypecheck (prepare:shared) -> tsc -p tsconfig.build.json --noEmit`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | For a test file under `tests/unit/` or `tests/integration/`, the isolation setup runs first. It reduces `process.env` to system essentials plus test-owned knobs, before any test import, so production code under test sees the same configuration in any shell. `prisma-env` then sets the test database as today. E2E and other test folders are not touched. | vitest config, isolation setup, prisma-env, test file | `vitest.config.ts` setup order | allowlist definition |
| DS-002 | The prerequisite script owns the artifact list and build order. `check` is cheap (existence checks) and runs before the integration suite. `prepare` builds whatever is needed. | script, package builds | `scripts/integration-test-prerequisites.mjs` | artifact list |
| DS-003 | `typecheck` checks exactly the production compilation unit that `pnpm build` compiles, with semantic checking active. | tsc | `package.json` | — |

## Spine Actors / Main-Line Nodes

`vitest.config.ts`; `tests/setup/test-environment-isolation.ts` (new); `tests/setup/prisma-env.ts` (unchanged); `scripts/integration-test-prerequisites.mjs` (new); `package.json` scripts.

## Ownership Map

- `test-environment-isolation.ts` owns the env policy for unit/integration test files: the scope test (path prefix), the allowlist and the reduction. It owns nothing else: no test DB or app-config setup.
- `integration-test-prerequisites.mjs` owns the prerequisite artifact list, the build order and the missing-artifact message.
- Each test file keeps owning its own doubles, and sets and restores the app variables it needs (current practice).
- `tests/fixtures/current-team-run-fixtures.ts` owns "write a complete current Team run package" (new helper).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `package.json` `test:integration`, `test:integration:prepare` | prerequisite script + vitest | Documented commands | Artifact lists or build logic (keep in the script) |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `typecheck` → `tsc -p tsconfig.json --noEmit` | Cannot check anything (TS6059) | `tsc -p tsconfig.build.json --noEmit` | In This Change | `tsconfig.json` stays for editor/vitest `paths`; not used by the script |
| Test references to removed APIs (`FileExplorer`, `prepareNewAgentRun`/`prepareRestore*`, `ApplicationReentryService.reloadAndReenter`, `acquireClient/releaseClient`, static `getInstance` spy, absolute media URLs, `repository_prisma` 1.0.9 pin) | Removed/changed in production | Current APIs/contracts | In This Change | No production shims |

## Return Or Event Spine(s) (If Applicable)

N/A. Synchronous command flows.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Env allowlist | DS-001 | isolation setup | Names kept: system essentials and test-owned knobs | Determinism, Rule 2 | If spread across tests, drift returns |
| Complete Team package fixture | DS-001 | U2, U3, I10 | Writes tree + empty communication messages | Current admission contract | Each test re-learns the contract |

## Ownership Boundaries

- The vitest config is the only place that wires setup files; the isolation file is listed first in `setupFiles`.
- The isolation applies only when `expect.getState().testPath` is under `<package>/tests/unit/` or `<package>/tests/integration/`. All other files (e2e, architecture, skill-improvement, agent-work-traces) are unaffected (DEC-003 A).
- `globalSetup` (prisma reset) is unchanged. It already overrides `DATABASE_URL` for the reset command.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| `integration-test-prerequisites.mjs` | artifact list, build order | package scripts, TESTING.md | Duplicating the artifact list in docs/tests | Extend the script |

## Dependency Rules

- Test setup may import nothing from `src` except, if needed, constants. Prefer self-contained code.
- The prerequisite script uses `pnpm`/`node` child processes only. It must not import server source.
- Production `src` must not change to accommodate tests (except REQ-005).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `node scripts/integration-test-prerequisites.mjs check` | integration prerequisites | Exit 0 if all present; else print the missing artifact paths and `pnpm -C autobyteus-server-ts test:integration:prepare`, exit 1 | none | Fast |
| `node scripts/integration-test-prerequisites.mjs prepare` | same | Build in order, then `check` | none | Idempotent |
| `writeCurrentTeamRunPackage(teamDir, tree)` | complete current Team package (test fixture) | Write the execution tree and an empty `schemaVersion: 1` communication-messages file | `rootTeamRunId` from the tree | Test fixture only |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| prerequisite script modes | Yes | N/A | Low | — |
| `writeCurrentTeamRunPackage` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| isolation setup | `tests/setup/test-environment-isolation.ts` | Yes | Low | — |
| prerequisite script | `scripts/integration-test-prerequisites.mjs` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| env control | `tests/setup/` | Extend | Existing setup home |
| complete Team package | `tests/fixtures/current-team-run-fixtures.ts` | Extend | Already owns current Team fixtures |
| prerequisite builds | package `build` scripts, devkit CLI | Reuse | No new build logic |
| clean-env reference | `evidence/run-suite-clean-env.sh` | Evidence only | Not promoted into the repo; the setup file replaces it |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spine | Decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/setup` | env isolation | DS-001 | Extend |
| `autobyteus-server-ts/scripts` | prerequisite prepare/check | DS-002 | Extend (existing scripts folder) |
| `autobyteus-server-ts/tests/{unit,integration}` | stale test fixes | DS-001 | Modify |
| repo `TESTING.md` | commands | all | Modify |

## Draft File Responsibility Mapping

See Final mapping (no extraction changed the draft).

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Why | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| tree + communication messages write | `tests/fixtures/current-team-run-fixtures.ts` | test fixtures | Needed by U2, U3, I10 (and already hand-written in 9 places) | Yes | Yes | A general history builder. Migrating the 9 existing passing call sites is optional, not required. |
| provider-factory stub with all five runtimes (U5, U6) | Keep local unless both files can import one existing helper | — | Two files only | — | — | — |

## Shared Structure / Data Model Tightness Check

N/A. No shared production structures change.

## Final File Responsibility Mapping

| File | Area | Concern |
| --- | --- | --- |
| `autobyteus-server-ts/tests/setup/test-environment-isolation.ts` (Add) | test setup | For unit/integration files only, delete every `process.env` key not on the allowlist. Allowlist (a): system essentials such as `PATH`, `HOME`, `USER`, `LOGNAME`, `SHELL`, `TMPDIR`/`TMP`/`TEMP`, `LANG`, `LC_*`, `TZ`, `TERM`, `COLORTERM`, `CI`, `NODE_*`, `npm_*`, `PNPM_*`, `VITEST*`, `FORCE_COLOR`, `NO_COLOR`, proxy variables (upper and lower case), `XDG_*`, Windows essentials (`USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, `SystemRoot`, `PATHEXT`, `ComSpec`, `windir`). Allowlist (b): test-owned knobs, `RUN_*`, `TEST_*`, `FAKE_*`, `AGY_*`, `CODEX_*`, `CLAUDE_*`, `LMSTUDIO_*`, `IR055_*`, `GROK_BUILD_COMMAND`, `ANTIGRAVITY_CLI_COMMAND`, `AUTOBYTEUS_LIVE_E2E_SCENARIOS`, `AUTOBYTEUS_DOWNLOAD_TEST_URL`, plus any variable an opt-in gated unit/integration file declares in its header (e.g. the Google MCP gate variables). The final list is derived from the inventory and kept in one exported constant with a comment explaining the policy. |
| `autobyteus-server-ts/vitest.config.ts` (Modify) | config | `setupFiles: ["./tests/setup/test-environment-isolation.ts", "./tests/setup/prisma-env.ts"]` |
| `autobyteus-server-ts/scripts/integration-test-prerequisites.mjs` (Add) | scripts | `check` / `prepare` as specified. Prepare order: `pnpm -C autobyteus-server-ts build` (its prebuild runs `prepare:shared`), `pnpm -C autobyteus-application-frontend-sdk build`, `pnpm -C autobyteus-application-devkit build`, then `node autobyteus-application-devkit/dist/cli.js pack` with cwd `applications/brief-studio` (equivalent to its `build` script, without depending on the bin shim). Checked artifacts: the server `dist/file-explorer/watcher/runtime/watcher-runtime-process.js`, the four SDK/devkit `dist` entrypoints, and `applications/brief-studio/dist/importable-package/applications/brief-studio/application.json`. |
| `autobyteus-server-ts/package.json` (Modify) | scripts | `"typecheck": "tsc -p tsconfig.build.json --noEmit"`; `"test:unit": "vitest run tests/unit"`; `"test:integration": "node ./scripts/integration-test-prerequisites.mjs check && vitest run tests/integration"`; `"test:integration:prepare": "node ./scripts/integration-test-prerequisites.mjs prepare"` |
| `autobyteus-server-ts/tests/fixtures/current-team-run-fixtures.ts` (Modify) | fixtures | add `writeCurrentTeamRunPackage` |
| Test files U1–U13, I1–I15 (Modify) | tests | per-test plan below |
| `TESTING.md` (Modify) | docs | Server row and a short "Server unit/integration baseline" note: commands, prerequisites, env isolation and the opt-in gates; the `typecheck` scope; the pointer to the test-type-debt follow-up |

### Per-test plan (keep each test's intent; follow the current contract)

| ID | Fix |
| --- | --- |
| U1, I14 | Import and construct `WorkspaceFileExplorer`. |
| U2, U3, I10 | Write packages with `writeCurrentTeamRunPackage`. Re-check expected warning text against current code. |
| U4 | Expect `applicationCount: 0`. |
| U5, U6 | Stubs provide `antigravity` and `grok` factories. |
| U7 | Codex client stub implements `beginAcquire(path) -> { acquire, release }`; assert the lease is acquired and released once for `layout.runtimeDir`. |
| U8 | Replace the removed-method spy with the current guarantee that no Agent run is started. Spy on the current AgentRunManager entrypoint(s) that start a run, chosen from the 028cca231 API. |
| U9 | Provide `applicationAgentToolCatalog` in lifecycle deps. Drive the reload/re-entry case through `ApplicationCatalogTransitionService.reloadAndReenter` with the current reentry-participant collaborators, keeping the assertion: existing journal state is inspected and dispatched before activation. |
| U10 | Pin `1.0.10`. Make the synthetic ESM `@prisma/client` peer match a CommonJS peer (default export carrying `PrismaClient`/`Prisma`), so the probe exercises the 1.0.10 loading path. Keep the no-dotenv, no-connect and log-policy assertions. |
| U11, I12, I13 | Expect relative `/rest/files/…` URLs. Resolve against a test base URL wherever a URL object is needed. |
| U12 | Assert `SkillWorkspace.create` with the skill name, the returned and cached instance, and no `initialize()` requirement. |
| U13 | Context provides `state.activeTurn.turnId`. Additionally assert that the event carries that turn ID. |
| E1 | Covered by isolation. Also make the "undefined" case independent of ambient config by setting or clearing the config key inside the test. |
| E2 | Covered by isolation (confirm in AC-002 run). |
| I1 | Re-express the cases through the current AgentRunManager create/restore API (028cca231): create and register through the matching backend factory, and restore paths. |
| I2 | Manager double implements `releaseRetiredRun`. |
| I3 | Fake agent implements `getCompactionRecovery` (returns `null`). |
| I4 | Supply the current `ownLlm` capability input. |
| I5 | Supply the current `ownSession` capability input. |
| I6 | Build the member identity with exactly `agentRunId`, `memberAddress`, `root`. |
| I7, I8 | Status expectations include `recoverableBlock: null`. Fake backends expose `compactionRecovery` (unsupported kind). For I8 "duplicate and busy ACKs", confirm the cause first (UNK-001); apply REQ-005 if it is a product defect. |
| I9 | Mock the current way `ApplicationBundleService` is obtained by the provider. |
| I11 | Initialize (and release in teardown) the `AgentTeamRunManager` process instance the way the current server startup does. |
| I15 | Call `bootstrapForCreate(runContext, guard)` with an accepting preparation guard. |

## Applied Patterns (If Any)

None beyond an allowlist constant.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Responsibility | Must Not Contain |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/setup/test-environment-isolation.ts` | File | env policy for unit/integration | DB setup, app-config init |
| `autobyteus-server-ts/scripts/integration-test-prerequisites.mjs` | File | prerequisite check/prepare | test logic |
| `autobyteus-server-ts/tests/fixtures/current-team-run-fixtures.ts` | File | current Team fixtures (+ package writer) | assertions |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Note |
| --- | --- | --- | --- | --- |
| `tests/setup/` | Off-Spine Concern | Yes | Low | existing |
| `scripts/` | Off-Spine Concern | Yes | Low | existing build scripts live here |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Stale double | Add `grok`/`antigravity` stubs so `AgentRunManager` constructs | Loosen the `AgentRunManager` required-dependency guard | Production guarantee stays |
| Removed API spy | Assert no run starts via the current entrypoint | Re-add `prepareNewAgentRun` as an alias | No compatibility shims |
| Env | Isolation setup + test sets its own key | `if (process.env.X) skip` | No skips to get green |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Export `FileExplorer` alias | One-line fix for U1/I14 | Rejected | Update tests |
| Option to emit absolute media URLs | U11/I12/I13 expectations | Rejected | Update tests |
| Keep strict `tsconfig.json` in `typecheck` with `rootDir` widened | Literal "fix TS6059" | Rejected (DEC-001 A) | Production config |

## Change / Refactor Sequence

1. Add the isolation setup + `vitest.config.ts` wiring. Verify that E1/E2 pass in an inherited-env run.
2. Add the prerequisite script and package scripts. Verify `check` fails clearly on a fresh worktree and `prepare` makes it pass.
3. Change `typecheck`. Verify exit 0, plus a temporary negative probe (a deliberate type error in `src`, then reverted).
4. Fix the stale tests, one commit per cluster, each labelled as a baseline fix (TESTING.md Rule 9), e.g. `test(baseline): …`.
5. Update `TESTING.md`.
6. Full runs: unit and integration twice in a clean env (QR-002); then typecheck. For AC-002/AC-004, run once with the agent-shell variable set, but re-pointed at a test-owned sentinel: `AUTOBYTEUS_DATA_DIR`, `AUTOBYTEUS_MEMORY_DIR`, `DATABASE_URL`/`DB_NAME`, package/skill roots → a disposable folder with seeded marker files. Keep the other live values (flush interval, `GEMINI_SETUP_MODE`, `AUTOBYTEUS_SERVER_HOST`, …). Assert the results equal the clean run and the sentinel is byte-identical afterwards. Never point a verification run at the real `~/.autobyteus`. Note that every agent shell already has live-app variables pointing there. Until the isolation step (1) is in place, run suites only through `evidence/run-suite-clean-env.sh` or an equivalent `env -i` wrapper.
7. Record any unfixable test as a documented exception (test, cause, why out of reach) in the implementation handoff.

## Key Tradeoffs

- **Allowlist vs deny-list.** An allowlist is deterministic by construction and matches the validated clean runs. Its risk is that a gated suite's variable is dropped, which shows up as a skip or visible failure and is fixed by adding the declared name. A deny-list would silently miss future app settings.
- **Production-policy typecheck vs fixing all test types now.** The user accepted A. Test type debt is deferred and visible in the follow-up.
- **Prepare/check script vs auto-build in globalSetup.** Explicit and fast to re-run (A). Running raw `vitest run tests/integration` without the prepare step still shows path-naming errors.

## Risks

- RISK-001: base moves before merge. Delivery re-runs on the latest base.
- UNK-001: I8 timeout cause.
- An allowlist gap for an opt-in gated suite. Mitigation: derive the knob list from the gated files and run one gated file with its gate set, if its external CLI is available. Otherwise record it as not exercised.

## Guidance For Implementation

- Use `investigation-notes.md` U*/I*/E* rows as the checklist; the commit references there identify each current contract.
- Never change production `src` to make a test pass unless REQ-005 applies, and record it if you do.
- Keep evidence logs out of the repository root (TESTING.md). Do not commit build outputs (`dist/` of the SDKs shows as untracked); stage paths explicitly.
- Run the suites with the inherited agent-shell env and in a clean env, since both are acceptance conditions.
