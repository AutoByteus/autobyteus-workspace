# Investigation Notes — server-e2e-node-credential-447

## Investigation Meta

- Package identifier: `server-e2e-node-credential-447`
- Request / ticket: Project Task `autobyteus-447` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), FU-004 of autobyteus-436
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447` / `codex/server-e2e-node-credential-447`
- Resolved base remote / branch / revision: `origin/personal` @ `310fc27452be3d3f44459c89f59c70d8ff40ea02` (fetched 2026-11-10)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: worktree created from refreshed `origin/personal`; `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `build`, `test:integration:prepare` all exit 0. An older unrelated worktree `server-e2e-suite-repair` (branch `codex/server-e2e-suite-repair`, 4304 commits behind, v1.4.92 era) exists; not used, not touched.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; 2026-11-10): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; repository `AGENTS.md`, `TESTING.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-server-ts/docs/design/node_access_model.md`
- Authorities read (design reading gate; 2026-11-10): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, `DESIGN.md` (root), `docs/design-cases.md` (Case 2)
- Investigation status: Complete for requirements and design

## Initial Request And Clarifications

- Original request: Task autobyteus-447 (see requirements doc header): make the 15 server E2E files carry the node credential and the MCP gateway token; check other suites (web probes, release smoke); consider a guard; done when the server E2E suite passes on `personal`, finalized.
- Clarifications received: None needed; no comments on the Task (re-read 2026-11-10 before approval).
- User-supplied facts and constraints: no test-only bypass in product code; isolated nodes and test keys; DESIGN.md and TESTING.md; release only on the user's word.
- Initial ambiguity: whether the 15 is the complete list on the current base; whether gated suites share the gap; whether a guard is worthwhile.

## Product And Domain Understanding

- Product area: server test harness (`autobyteus-server-ts/tests/`, `test-support/node-access/`), not product code.
- Affected actors or systems: server E2E suite; gated suites; roles that run them.
- Existing user or operational purpose: server E2E proves real HTTP/GraphQL/WebSocket/MCP boundaries on a test-owned node (TESTING.md test layers).
- Relevant terminology: owner credential, launch credential, MCP gateway token (node access model §1, NA-5, NA-12).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-10 | Doc | `tickets/done/phone-registered-folders-436/follow-ups.md` FU-004; `evidence/api-e2e/API-05-*.log` | The Task's source | 436's full run at `97ed263074`: exactly 15 files failed of 243 (51 tests failed incl. 11 Brief Studio cases), 106 passed, 122 skipped | Confirm on current base |
| 2026-11-10 | Doc | `autobyteus-server-ts/docs/design/node_access_model.md` §2, NA-1, NA-5, NA-12, NA-15, NAS-25 | Contract the tests must meet | Every main-port request needs a credential; the gateway needs its token "from every client, this computer included"; the token is `AUTOBYTEUS_MCP_GATEWAY_TOKEN` or a node-created `mcpg_…` the owner sees in the MCP gateway panel | — |
| 2026-11-10 | Code | `src/mcp-gateway/mcp-gateway-access.ts:28-39` | Gateway refusal | Bearer token compared with `McpGatewayTokenService.getToken()`; otherwise 401 `MCP_GATEWAY_TOKEN_REQUIRED` | — |
| 2026-11-10 | Code | `src/api/rest/mcp-gateway-token.ts:9-10` | Where an owner reads the token | `GET /rest/mcp-gateway/token` (owner routes only, NA-7) returns `{ token, source }` | Test helper reads it here (DEC-002) |
| 2026-11-10 | Code | `src/mcp-gateway/mcp-gateway-token-service.ts:41-50` | Token across restart | Node-created token kept in `<data>/mcp-gateway/token.json`, reloaded after restart | Same token after a restart of a built server |
| 2026-11-10 | Code | `src/node-access/launch-credential-intake.ts:8-11` | How a node takes its launch credential | Module-load intake from `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL`, deleted from env; `node-access-composition.ts:7` imports it, so an in-process composition (and a `dist` fixture child) takes it too | — |
| 2026-11-10 | Code | `test-support/node-access/owner-credential-attachment.mjs:39-79, 85-106` | The test attachment | `install()` patches `globalThis.fetch` and `http.request` **only when first called** by `attachOwnerCredential`/`attachOwnerCredentialToLoopback`; it adds `Bearer <credential>` for registered loopback ports, unless the request already carries `authorization`, a peer signature or `access_token` | Root cause of the capture class (below) |
| 2026-11-10 | Code | `tests/setup/test-launch-credential.ts:14-23` | Setup file of every server test file (`vitest.config.ts` setupFiles) | Creates the credential and sets `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL`; installs nothing | Early install goes here |
| 2026-11-10 | Code | `tests/e2e/helpers/studio-runtime-test-server.ts:33-65` | Shared in-process start | Same start sequence as the two runtime files (prepareBeforeListen, agent tools listen, credential proxy listen, listen, recoverAfterListen), then `attachOwnerCredential(mainUrl)`; fixed silent logging config; first parameter `requestedHost` (7 callers pass a host) | Add a logging option |
| 2026-11-10 | Code | `tests/e2e/helpers/built-server-launch-credential.ts:9-13`; `test-support/live-e2e/test-runtime-bootstrap.mjs:282-340` | Built-server paths | `builtServerLaunchEnvironment()` and `startBuiltTestServer` already hand the credential and attach it | Reuse |
| 2026-11-10 | Code | `tests/e2e/helpers/agent-runtimes-e2e-harness.ts:87-118, 150-155` | GraphQL client of the runtime files | `installVendorSourceStub()` keeps `realFetch = globalThis.fetch` at its call; `createGraphqlClient(url, realFetch)` posts through it | Bypasses a later-installed attachment |
| 2026-11-10 | Code | `tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts:104-122`; `available-agent-runtimes-graphql.e2e.test.ts:~190-200` | Direct composition | `buildStudioServer` + own `listen`, no attachment; trace logging config (`:72-74`) for the secret scan | Use the shared start with a logging option |
| 2026-11-10 | Code | `tests/e2e/runtime/autobyteus-anthropic-stored-config-{resume:71,edit-launch:70}`; `projects/project-task-search-model-unavailable:43`; `update-notifications/agent-runtime-update-notifications:119`; `runtime/{application-reload-repair,application-import-codex-launch,agent-runtimes-running-agents}` (harness `realFetch`) | Fetch captured before the attachment exists | Each captures `globalThis.fetch` at describe time or in the vendor stub, before `startStudioE2eRuntimeServer` installs the patch; their GraphQL goes through the unpatched fetch | Fixed by installing the attachment before test code |
| 2026-11-10 | Code | `tests/e2e/agent-team-runs/task-delegation-api-surface:33,68,75`; `file-explorer/workspace-content-rest:127-199` | `fastify.inject` | `inject` never touches `fetch`/`http.request`; no `authorization` header given | Add the owner header, as `node-files.e2e.test.ts:31` does |
| 2026-11-10 | Code | `tests/e2e/tool-management/mcp-{secrets-in-vault:80, http-redirect-and-transport:67,81, http-auth-remote-server:70,238}` | Gateway clients | `StreamableHTTPClientTransport(<server>/mcp/gateway)` with no `requestInit`; the attachment adds the **owner** credential as `Bearer`, which the gateway compares with its token and refuses | Gateway helper with the token |
| 2026-11-10 | Code | `tests/e2e/projects/project-mutation-node-locality.e2e.test.ts:28-33, 37`; `tests/fixtures/project-mutation-http-node.mjs` | Fixture child | Child env = PATH, HOME, APP_ENV, DATABASE_URL, temp dir, package roots: no launch credential; parent `fetch` to the child's port unattached | Add `builtServerLaunchEnvironment()` to the child env |
| 2026-11-10 | Code | `src/agent-tools/mcp/*.ts` (grep `authorization|bearer`: none) | ASM-002 | The Agent Tools MCP host reads no `Authorization` header; an attached loopback header is ignored | Confirm by running |
| 2026-11-10 | Contract | `@modelcontextprotocol/client` 2.3.1 `dist/index.d.mts:3426` | Gateway client headers | `StreamableHTTPClientTransportOptions.requestInit?: RequestInit`; integration test `tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts:24,208` passes the token this way | Helper passes `requestInit.headers.authorization` |
| 2026-11-10 | Code | census `grep -rl` over `tests/e2e` (commands in Runtime section) | Other suites with the gap | Gated: native live harness `helpers/native-runtime-live-harness.ts:227` (fetch captured at construction, used at `:361`) → 5 live suites; `autobyteus-anthropic-prompt-caching-live:179`; `agent-package-definitions-live-refresh:197` (before start `:221`); `agy-skill-update-notice-roots:142` (before start `:165`); gateway without token: `runtime/mcp-run-session-cleanup:205`, `mcp/mcp-github-remote-live:97`. Not affected: `package-personal-settings` and `update-notifications-live` capture after start; `autobyteus-claude-5-5-live:147` wraps the current fetch | REQ-003 inventory |
| 2026-11-10 | Code | `autobyteus-web/tests/e2e/*.mjs` census; `fixtures/probe-node-access.mjs` | Web probes | Every probe that spawns `dist/app.js` uses `withNodeCredential`/`probeNodeEnvironment` and `attachToProbeProcess`; `electron-launch-profile-probe` reaches the node through the Electron app (main process attaches, NA-8); `isolated-app-lifecycle-probe` calls only `/rest/health` (exempt); `run-expand-motion-live-cases`, `workspace-views-chooser-cases` run inside `delegated-launch-defaults-probe` (`:117-120, 196` attach) | BEH-005: no change |
| 2026-11-10 | Code | `scripts/release_smoke.py:1-45`; its suites `workspace-skill-links-live:125`, `agy-linked-skills-transport:171`, `configured-skill-on-demand-loading` | Release smoke | Runs three server suites; the two that start a node use `startStudioE2eRuntimeServer` and capture no fetch; the third starts no HTTP server | BEH-005: no change |
| 2026-11-10 | Code | `tests/architecture/node-access-boundaries.test.ts` | Guard placement precedent | Server test run already reads source text to enforce node access rules | Guard as an architecture test |
| 2026-11-10 | Doc | `docs/design-cases.md` Case 2 | Design case | 437 traced the shared start helpers but not the other entry forms test files use to reach a node: Case 2's shape | Add "Again in autobyteus-437/447" |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | `pnpm test:e2e` (TESTING.md) | Each file starts a node and calls it | 15 files fail on credential/token refusals | PROBE-01 | Reproduced |
| BEH-002 | Operational | `RUN_*` gates | Same request paths | Same refusals expected under the gate | Census (Read) | Read, not reproduced (gates not set) |
| BEH-003 | Contract | NA-1, NA-12 | Gate before every handler | Refusal without credential/token | node access model; gateway code | Read |
| BEH-004 | Operational | A new test file | Author picks a start/call path | A wrong path fails late, obscure | PROBE-01 messages | Reproduced |
| BEH-005 | Operational | Web probes, release smoke | 437 helpers | Carry the credential | Census | Read |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `test-support/node-access/owner-credential-attachment.mjs` | Test attachment, installed lazily | REQ-005 | Install it from the server setup file, before test code |
| `tests/setup/test-launch-credential.ts` | Per-file credential | REQ-001, REQ-005 | Also installs the attachment |
| `tests/e2e/helpers/studio-runtime-test-server.ts` | Shared in-process start | REQ-001 | Logging option, so every in-process start goes through it |
| `tests/e2e/helpers/` (no gateway helper today) | — | REQ-002 | New gateway client helper |
| `tests/architecture/` | Source-text rules | REQ-005 | Guard test |
| `TESTING.md` "Node credentials", "Rerun by impact" | Testing rules | REQ-007, REQ-008 | Text update |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: TESTING.md, `docs/design-cases.md`.
- Existing readers, writers, or contracts that consume them: engineering roles.
- Evidence paths: above.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: test code only (test-support module, setup file, e2e helpers, e2e files, one architecture test).
- Existing structural surfaces that can support the approved behavior: the attachment, `startStudioE2eRuntimeServer`, `builtServerLaunchEnvironment`, `startBuiltTestServer`, the owner token route.
- Evidence paths: Source Log.

### Potential Structural Impacts To Investigate

- API or external-contract change: None (product untouched).
- Persistence schema or invariant change: None.
- Security or privacy boundary change: None in product; test credential stays loopback-only and out of evidence.
- Concurrency or lifecycle change: None.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: test harness only; the setup file now installs the attachment (affects every server test process; no effect without a registered port).
- Confirmed absent, present, or unknown: confirmed absent for product surfaces.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| PROBE-01: `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run --no-watch <the 15 files>` (before `test:integration:prepare`) | SCN-001 | 15 files failed; Tests 40 failed, 2 passed, 20 skipped; 37 log lines `Node request refused NODE_CREDENTIAL_REQUIRED /graphql from 127.0.0.1`; `MCP_GATEWAY_TOKEN_REQUIRED` from the gateway clients; `expected 401 to be 200/400/404` on inject cases; three Brief Studio files stopped at their documented "importable package missing" check (prepared afterwards) | Reproduced | REQ-001, REQ-002 | `evidence/REPRO-01-fifteen-files-base.log` |
| PROBE-02: `pnpm -C autobyteus-server-ts test:integration:prepare`, then `env -i … pnpm test:e2e` (full suite, base `310fc27452`) | SCN-001 | Exactly the 15 files fail (51 tests); 107 files pass, 123 skipped | Measured | REQ-006 baseline: the 15 are the whole gap | `evidence/PROBE-02-full-e2e-base.log` |
| PROBE-03 (prototype, reverted): attachment installed from the setup file; the seven capture-class files run with no edit | SCN-001, REQ-005 | 7 files, 25 tests pass | Reproduced | Confirms the root-cause fix (D1) | `evidence/PROBE-03-early-install-prototype.log` |

- Temporary diagnostics: PROBE-03's prototype edit (one line in `tests/setup/test-launch-credential.ts`, one export in the attachment) in this worktree only; reverted before handoff (`git status` clean of source changes).
- Reproduction for implementation to start from: PROBE-01's command over the 15 files (after `test:integration:prepare`); it must turn green.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Project Task Manager (Task text) | Suite green; check other suites; consider a guard; no product bypass | Direct | REQ-001…REQ-006 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| `@modelcontextprotocol/client` | 2.3.1 | `requestInit.headers` on the Streamable HTTP transport | d.mts; integration test | None |
| Fastify `inject` | repo version | Does not go through `fetch`/`http.request` | PROBE-01 inject cases | None |

## Persisted Data And State Facts

- Affected stored or external subject: None (test-owned data roots only).
- Location and representative shape: N/A
- Approximate volume: N/A
- Current readers and writers: N/A
- Current unknown/extra-field behavior: N/A
- Required semantics or data that must be preserved: N/A
- Acceptable loss, reset, rebuild, or regeneration: N/A
- Privacy, retention, compliance, downtime, or operational constraints: credential never in evidence.
- Remaining evidence gap: None

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- User's requested outcome, in the user's own terms: N/A
- Requirement / behavior IDs involved: N/A
- Product decision, uncertainty, or experience to understand or evolve: N/A
- Critical journey and states: N/A
- Known constraints and non-goals: N/A
- Relevant existing-product or frontend context supplied or established: N/A
- Product Design request artifact / message reference: N/A
- Established separate design repository/root and ticket reference, when applicable: N/A

## Product Design Findings

N/A — no Product Design request.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/REPRO-01-fifteen-files-base.log` | Solution Designer | PROBE-01 output | 15 files on base | REQ-001, REQ-002, AC-001 | Current | Evidence only |
| `evidence/PROBE-02-full-e2e-base.log` | Solution Designer | Full-suite baseline on base | All server E2E files | REQ-006, AC-001 | Current | Evidence only |
| `evidence/PROBE-03-early-install-prototype.log` | Solution Designer | Root-cause prototype | Capture-class files | REQ-005 | Current | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | Credentialed, the 15 files' product assertions pass | Else a product failure surfaces | Implementation run | Open |
| ASM-002 | Assumption | Agent Tools MCP host ignores an extra loopback `Authorization` | Node-locality fixture after `builtServerLaunchEnvironment()` | Read + implementation run | Open (Read: no auth handling) |
| RSK-001 | Risk | Installing the attachment in every server test process (unit, integration too) changes something there | Shared foundation | It patches only registered loopback ports; implementation reruns `test:unit` and `test:integration` (TESTING.md rerun rule 4) | Open |

## Architecture Investigation Findings

- Root cause (Read, then reproduced by PROBE-03): 437 made the shared start paths attach the credential, but the attachment installs itself on the first attach. A test file that keeps a reference to `globalThis.fetch` before its node starts (describe-scope `realFetch`/`originalFetch`, the vendor-source stub, the native live harness field) holds the unpatched function and calls its own node through it. Nine of the 15 files and eight gated files fail only for this reason. The other default-run failures are entry forms the attachment cannot reach or was never given: a node composed directly (2 files), `fastify.inject` (2 files), a fixture child with no launch credential (1 file), MCP gateway clients with no token (3 files; the attachment's owner bearer is the wrong secret for the gateway).
- This is design Case 2's shape (one entry form traced, the others left open): the gate change was validated through the start helpers it touched, and the other forms test files use to reach a node were not traced.
- Request paths to a node from a server test, by form: (1) `fetch`/`ws` from the test process — attachment; (2) `fastify.inject` — explicit header; (3) child process node — launch credential in its environment (`builtServerLaunchEnvironment`, `startBuiltTestServer`); (4) MCP gateway — gateway token in the client's headers; (5) a Node built-in `WebSocket` — `access_token` query (probe helpers' `ownerSocketUrl`; no server suite in scope uses it).

## Requirement Implications

- The 15-file list is confirmed on the current base (PROBE-01); the full-suite baseline (PROBE-02) shows whether anything else fails.
- The capture class is a harness ordering defect, so the root-cause fix belongs in the shared setup, not in each file (REQ-005, DEC-003).
- Gated suites share the defect (REQ-003, DEC-001).
- The gateway needs its own secret, so the owner attachment alone can never satisfy it (REQ-002, DEC-002).

## Notes For Architecture Design

- Map SCN-001…SCN-004 onto the five request forms above.
- Preserve deliberate refusal tests (they use `inject` with chosen headers or raw TCP, and are not affected by early installation: `node-access-model.e2e.test.ts:3-5, 57-75`).
- Keep the change in test code; no `src/` change.

### PROBE-02 result (full suite, base `310fc27452`)

Measured 2026-11-10, after `test:integration:prepare`, clean environment: `Test Files 15 failed | 107 passed | 123 skipped (245)`, `Tests 51 failed | 483 passed | 608 skipped (1142)`, 827 s. The failed files are exactly FU-004's 15 (the three Brief Studio files now run and fail on the credential like the rest). No other file fails on the current base, so REQ-006 is reached when these 15 pass. Summary: `evidence/PROBE-02-full-e2e-base.log`.

### PROBE-03 result (early-install prototype)

Reproduced 2026-11-10: with only the attachment installed from the setup file (temporary two-file edit, reverted, `git status` clean of source changes), the seven form-1a files pass with no edit of their own: `Test Files 7 passed (7)`, `Tests 25 passed (25)` (`autobyteus-anthropic-stored-config-{resume,edit-launch}`, `project-task-search-model-unavailable`, `agent-runtime-update-notifications`, `application-import-codex-launch`, `application-reload-repair`, `agent-runtimes-running-agents`). This proves the root cause of that class and design D1. ASM-001 holds for these seven. `evidence/PROBE-03-early-install-prototype.log`.

## SR-002 Evidence (2026-11-10)

| Source | Observation | Established |
| --- | --- | --- |
| Delivery DEL-01 (`evidence/delivery/DEL-01-full-e2e-integrated-summary.log`), integrated `5c29d6fca2` | `Test Files 1 failed | 122 passed | 124 skipped (247)`: all 15 FU-004 files pass; one failure, E-002 | Measured (delivery) |
| Delivery DEL-02 (`evidence/delivery/DEL-02-e002-alone.log`) | E-002 fails alone, deterministically: `expected [ 'autobyteus-daily-assistant', …(1) ] to not include 'autobyteus-daily-assistant'` | Reproduced (delivery) |
| `tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts:24, 26, 326-332` | `BUILT_IN_IDS = ["autobyteus-daily-assistant"]`, asserted never an `@` candidate | Read (Solution Designer) |
| `git show fbc9b3c2e9` (autobyteus-455) | Daily Assistant `collaborationEligible: true`; only the Model Router excluded; unit tests, probes and docs updated, this E2E file not | Read |
| API/E2E API-10/API-10b; `registered-package-definition-edit.e2e.test.ts:236-246`; `src/personal-settings/services/personal-settings-service.ts:270` | RPE tests expect `defaultLaunchConfig` in the package file; autobyteus-95 keeps it in `personal-settings.json` | Read + reproduced (API/E2E) |
| `delegated-copy-project-folder.e2e.test.ts:58-66`; `agy-run-capsule.ts:58-70` | Walk reads `manifest.json` in a folder that may not have it yet | Read |
| `delegated-copy-model-change.e2e.test.ts:658` | Asserts `success: true` without showing `outcome`/`message`; once false under load | Read; cause unknown |
