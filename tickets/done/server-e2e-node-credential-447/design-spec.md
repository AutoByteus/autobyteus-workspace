# Design Spec — server-e2e-node-credential-447

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (SR-001 design D1–D9 implemented and validated; SR-002 adds D10–D13)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-002 (UC-004, REQ-009, REQ-010 on the user's direction "for other errors fix them", 2026-11-10); SR-001 part: approved by the Solution Designer within the Task's direction (no `Needs user` decision); the user was informed in the Solution Designer's conversation on 2026-11-10 (`solution-revision-record.md` SR-001)
- Behavior-defining supplements and their approval references: None
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/investigation-notes.md`
- Authorities read (design reading gate; 2026-11-10): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, `DESIGN.md` (repository root; rules 1, 5, 11; "Node access and security"), `docs/design-cases.md` (Case 2), `autobyteus-server-ts/docs/design/node_access_model.md`, `TESTING.md`
- Project design-principle conflicts with the general principles, or discrepancies: None

## Current-State Read

Every server test file runs `tests/setup/test-launch-credential.ts` first (`vitest.config.ts` setupFiles): it creates an owner credential and puts it in `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL`, which an in-process composition takes through the launch credential intake (`src/node-access/launch-credential-intake.ts:8-11`). The test process attaches that credential to its own requests through `test-support/node-access/owner-credential-attachment.mjs`, which patches `globalThis.fetch` and `http.request` for registered loopback ports; but it patches them only when the first `attachOwnerCredential*` call runs (`owner-credential-attachment.mjs:39-41, 85-106`), i.e. when a shared start helper (`startStudioE2eRuntimeServer`, `startBuiltTestServer`, `builtServerLaunchEnvironment`) starts a node.

A test file reaches its node in five forms (investigation notes, Architecture Investigation Findings). 437 made the start helpers serve form 1 (`fetch`/`ws` from the test process) and form 3 (a child node via the helpers). The 15 failing files use the forms that were not traced:

| Form | Files (default run) | Why it fails today |
| --- | --- | --- |
| 1a. `fetch` kept before the attachment exists | `autobyteus-anthropic-stored-config-{resume,edit-launch}`, `project-task-search-model-unavailable`, `agent-runtime-update-notifications`, `application-reload-repair`, `application-import-codex-launch`, `agent-runtimes-running-agents` (7) | They hold the unpatched `fetch` (describe-scope `originalFetch`/`realFetch`, or `installVendorSourceStub().realFetch`) and call their own node through it |
| 1b. Node composed directly | `agent-runtimes-graphql`, `available-agent-runtimes-graphql` (2) | `buildStudioServer` + own `listen`: no port registered (also 1a: harness `realFetch`) |
| 2. `fastify.inject` | `task-delegation-api-surface`, `workspace-content-rest` (2) | `inject` bypasses `fetch`/`http.request`; no header given |
| 3. Fixture child node | `project-mutation-node-locality` (1) | Child environment has no launch credential; parent never registers the port |
| 4. MCP gateway client | `mcp-secrets-in-vault`, `mcp-http-redirect-and-transport`, `mcp-http-auth-remote-server` (3) | No gateway token; the attachment's owner bearer is the wrong secret for the gateway (`mcp-gateway-access.ts:33-36`) |

Gated files with the same forms: 1a — the five native live harness suites (`helpers/native-runtime-live-harness.ts:227`), `autobyteus-anthropic-prompt-caching-live`, `agent-package-definitions-live-refresh`, `agy-skill-update-notice-roots`; 4 — `runtime/mcp-run-session-cleanup`, `mcp/mcp-github-remote-live`.

Web probes and the release smoke check already carry the credential (investigation notes, census); unchanged.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: SR-002 adds four test files' fixes (D10–D13), still test code unless D13's cause is in product code (escalation below). SR-001: test code only, about 17 files: one test-support module (+ its `.d.mts`), the setup file, one e2e helper extended and one added, ten e2e files edited (2 runtime, 2 inject, 5 gateway, 1 fixture child), one new architecture test, TESTING.md and `docs/design-cases.md`. Within the existing harness owners; no product module, route or contract.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: no product code, contract, persistence, security boundary, concurrency or deployment change (AC-004). The one shared-foundation change (installing the attachment from the setup file in every server test process) has no effect without a registered loopback port (`owner-credential-attachment.mjs:32-37, 65-67`), and TESTING.md's rerun rule makes implementation rerun unit, integration and E2E for it. The gate is untouched.
- Escalation trigger if implementation or validation discovers new impact: any change needed under `autobyteus-server-ts/src/` or other product code (including D13's cause: return it to the Solution Designer with the evidence before changing product code); a credentialed test that fails for a product reason (report by cause, Rule 9, and return to the Solution Designer if it is outside these files); early installation changing a unit or integration result.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `test-support/node-access/owner-credential-attachment.mjs:39-41, 85-106` | Installs on first attach | D1: install from the setup file | None |
| Code | `tests/setup/test-launch-credential.ts:14-16` | Runs before every test file's code | D1 placement | None |
| PROBE-01 | `evidence/REPRO-01-fifteen-files-base.log` | 15 files, 40 tests fail on credential/token refusals | Whole design | None |
| PROBE-02 | `evidence/PROBE-02-full-e2e-base.log` | Full suite on base: exactly the 15 files fail (51 tests); 107 pass | REQ-006: fixing the 15 greens the suite | None |
| PROBE-03 | `evidence/PROBE-03-early-install-prototype.log` | Early install alone: the 7 form-1a files pass (25 tests), no file edit | D1 | None |
| Code | `tests/e2e/helpers/studio-runtime-test-server.ts:33-65` | Same start sequence as the two runtime files; fixed silent logging | D2 | None |
| Code | `src/api/rest/mcp-gateway-token.ts:9-10`; `src/mcp-gateway/mcp-gateway-token-service.ts:41-50` | Owner route returns the token; persisted across restart | D4 | None |
| Contract | `@modelcontextprotocol/client` 2.3.1 `index.d.mts:3426`; `tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts:24, 208` | `requestInit.headers` reaches the gateway | D4 | None |
| Code | `owner-credential-attachment.mjs:27-30, 50` | A request that already carries `authorization` is left alone | D4 (gateway bearer is not overwritten) | None |
| Code | `tests/e2e/node-files/node-files.e2e.test.ts:31` | Existing inject owner-header shape | D3 | None |
| Code | `tests/e2e/helpers/built-server-launch-credential.ts:9-13` | Env entry + loopback attach for spawned nodes | D5 | ASM-002 (agent tools host ignores the header) |
| Code | `tests/architecture/node-access-boundaries.test.ts` | Precedent for source-text rules in the server test run | D6 placement | None |
| Code | `grep StreamableHTTPClientTransport( tests/e2e` | Gateway transports exist only in the seven gap files (plus `collaboration-root-harness.ts:140`, which targets the Agent Tools host with its own headers); refusal tests use `inject` | D6 rule 2 has no false positive | None |

## Intended Change

Make every way a server test reaches a test-owned node carry the right secret, in test code only: install the owner-credential attachment before any test code runs (the root cause of most failures), route every in-process node through the shared start helper, give `inject` calls the owner header, give the fixture child its launch credential, connect MCP gateway clients through one helper that presents the gateway token, and add a guard test plus TESTING.md rules so the next test file cannot silently miss them.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003. Areas: `test-support/node-access/` (attachment installation), `autobyteus-server-ts/tests/setup/test-launch-credential.ts`, `autobyteus-server-ts/tests/e2e/helpers/` (in-process start option, new gateway client), the ten e2e files of the form table that need an edit, one new architecture test, `TESTING.md`, `docs/design-cases.md`.
- Derived consumers, when a stored or shared structure changes: `startStudioE2eRuntimeServer`'s signature gains an optional second parameter; its seven positional-host callers (`studio-agent-tools-listener.integration`, `studio-server-http-contract.integration`, `memory-sync-held-back-graphql`, `node-files`, `search-files-through-gate`, `request-origin-and-phone-routes`, `node-access-model`) are unchanged. The attachment's exported surface gains `installOwnerCredentialAttachment`; its other importers (`studio-runtime-test-server.ts`, `built-server-launch-credential.ts`, `test-runtime-bootstrap.mjs`, `autobyteus-web/tests/e2e/fixtures/probe-node-access.mjs`) keep working unchanged (the attach functions still install idempotently).
- Deliberately left alone: all product code (`autobyteus-server-ts/src/`, `autobyteus-web/` app); the node access model document (contract unchanged); web probes and `scripts/release_smoke.py` (already correct); the seven form-1a default-run files and the eight form-1a gated files (fixed by D1 with no edit); deliberate refusal tests (`node-access-model`, `remote-access/*`, `node-files`, `node-desktop`); `tests/integration/` (not E2E; its composed servers use `inject` with chosen headers); FU-001…FU-003 of autobyteus-436.
- SR-002 additions (UC-004): `tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` (E-002), `tests/e2e/agent-team-definitions/registered-package-definition-edit.e2e.test.ts` (RPE-001/003/006), `tests/e2e/projects/delegated-copy-project-folder.e2e.test.ts` (`capsuleOf`), `tests/e2e/projects/delegated-copy-model-change.e2e.test.ts` (DCM-009) and whatever D13's cause shows.
- Follow-ups: `follow-ups.md` FU-001 (whether every ticket must run the full server E2E suite; the user's decision, DEC-004). FU-002…FU-004 are folded into this ticket (SR-002).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, REQ-002, REQ-006; AC-001, AC-003 | `pnpm test:e2e` | 15 files fail (PROBE-01) | All pass | DS-001…DS-004 |
| BEH-002 | Operational | REQ-002, REQ-003; AC-002 | `RUN_*` gates | Same forms (census) | Pass under their gates | DS-001, DS-004 |
| BEH-003 | Contract | REQ-004; AC-004, AC-006 | NA-1, NA-12 | Gate refuses without secret | Unchanged | — (no product path changes) |
| BEH-004 | Operational | REQ-005, REQ-007, REQ-008; AC-005, AC-007, AC-008 | A new test file | Fails late, obscure | Root-cause fix + guard + rules | DS-001, DS-005 |
| BEH-005 | Operational | — | Probes, release smoke | Already correct | Unchanged | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/REPRO-01-fifteen-files-base.log` | Reproduction | REQ-001, REQ-002 | Implementation starts from it | Evidence |
| `evidence/PROBE-02-full-e2e-base.log` | Baseline | REQ-006 | Pass/fail comparison | Evidence |
| `evidence/PROBE-03-early-install-prototype.log` | Root-cause prototype | REQ-005 | Confirms D1 | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (test harness)
- Current design issue found: `Yes`
- Structural triggers that fire, each with evidence:
  - Several kinds or forms (Principle 1): one mechanism (the test's credential) serves five request forms; 437 traced two (Current-State Read table).
  - Behavior by absence / ordering (Principle 13): whether a request carries the credential depends on whether the attachment happened to be installed before the test kept its `fetch` (`owner-credential-attachment.mjs:39-41`): the outcome follows from call order, not from an explicit rule.
  - Repeated coordination (Principle 13): two files repeat the in-process start sequence the helper owns (`agent-runtimes-graphql:116-121`, `available-agent-runtimes-graphql:195-200` vs `studio-runtime-test-server.ts:41-50`) and so miss its attachment.
  - Capability-area reuse (Principle 4): the gateway token read belongs with the existing e2e helpers; checked, no existing helper owns it.
  - Ruled out: persisted-data transition (no stored data); vocabulary drift (words as in the node access model and glossary); shared folder (helpers stay in `tests/e2e/helpers/`).
- Root cause classification: `Missing Invariant` — "every request a test sends to its node carries the right secret" is held only by some entry forms; the attachment owner exists but enforces it only after its first use.
- Refactor needed now: `Yes` (small, in the harness)
- Evidence: Current-State Read; PROBE-01; PROBE-03.
- Design response: D1 makes the attachment hold from process start; D2 makes the shared helper the one in-process start path; D3–D5 cover the remaining forms with their one correct secret; D6 guards the forms a static check can see.
- Refactor rationale: fixing each file's capture alone would leave the trap for the next file (and for eight gated files); the invariant belongs to the harness owner.
- Intentional deferrals and residual risk: a new raw `inject` without a header, or a new spawned child without the launch credential, is not detected statically (Non-Goals); TESTING.md names both, and such a test fails on its first run with 401 `NODE_CREDENTIAL_REQUIRED`.

## Terminology

- **Attachment**: the test-support mechanism that adds `Authorization: Bearer <owner credential>` to the test process's loopback requests (as the desktop main process does for its window). Not a product term.
- **Owner credential / launch credential / MCP gateway token**: as in the node access model §1 and NA-12. No new domain word; GLOSSARY.md unchanged.

## Section Fill Order

Followed.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the duplicated in-process start sequence in `agent-runtimes-graphql` and `available-agent-runtimes-graphql` (replaced by the helper); the lazy-only installation in the attachment (replaced by an explicit install the setup calls; the attach functions keep calling it idempotently, which is not a second path).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected` — test code only; test-owned data roots.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-004 | Vitest starts a server test file | Node handler answers the test's `fetch`/`ws` request | Setup file + attachment (credential and its attachment); `startStudioE2eRuntimeServer` (in-process node and its port) | Forms 1a, 1b |
| DS-002 | Primary End-to-End | BEH-001 | Test calls `fastify.inject` | Node handler answers | The test file (it names the header) | Form 2 |
| DS-003 | Primary End-to-End | BEH-001 | Test spawns a node child | Child node answers the test's request | `builtServerLaunchEnvironment` / `startBuiltTestServer` | Form 3 |
| DS-004 | Primary End-to-End | BEH-001, BEH-002 | Test needs an MCP gateway client | Gateway lists/calls tools | `connectMcpGatewayClient` | Form 4 |
| DS-005 | Primary End-to-End | BEH-004 | Server test run | Guard passes, or fails naming file and fix | Architecture guard test | Early, clear failure |

## Primary Execution Spine(s)

- DS-001: `Vitest worker -> setup test-launch-credential.ts (credential in env; installOwnerCredentialAttachment) -> test file (may keep globalThis.fetch: it is already the attached one) -> startStudioE2eRuntimeServer (buildStudioServer takes the launch credential; listen; attachOwnerCredential(port)) -> test fetch/ws -> attachment adds Bearer -> node gate admits -> handler -> assertion`
- DS-002: `test file -> started.fastify.inject({ headers: { authorization: Bearer started.ownerCredential } }) -> node gate admits -> handler -> assertion`
- DS-003: `test file -> spawn(child, { env: { ...env, ...builtServerLaunchEnvironment() } }) (attaches to loopback) -> child: launch credential intake -> node listens -> test fetch -> attachment adds Bearer -> child gate admits -> handler`
- DS-004: `test file -> connectMcpGatewayClient(serverUrl, name) -> GET /rest/mcp-gateway/token (owner credential via attachment) -> new Client + StreamableHTTPClientTransport(<server>/mcp/gateway, requestInit.headers.authorization = Bearer <gateway token>) -> attachment leaves the existing authorization -> gateway access gate admits -> tools/list, tools/call`
- DS-005: `server test run -> tests/architecture/e2e-node-credential-paths.test.ts -> reads tests/e2e/**/*.ts -> rule 1 (direct composition), rule 2 (gateway transport) -> pass, or fail with file + fix`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The setup creates the credential and installs the attachment before the test file's code; whatever `fetch` the file keeps is the attached one; the shared start registers the node's port, so every later request to it carries the credential | Setup, attachment, in-process start, node | Setup/attachment for the credential; helper for the node | Logging option (D2) |
| DS-002 | `inject` never reaches the attachment, so the file passes the owner header itself, as `node-files` does | Test, node | Test file | — |
| DS-003 | The child takes the launch credential from its environment, as the desktop's own node does; `builtServerLaunchEnvironment` also attaches it to loopback | Test, child node | Helper | — |
| DS-004 | The client reads the gateway token as the owner does (the panel's route), then connects with it; the attachment does not overwrite a request that already carries `authorization` | Test, owner route, gateway | Gateway client helper | — |
| DS-005 | A source-text check, like `node-access-boundaries`, runs in the server test run and fails a file that composes a node or opens the gateway outside the helpers | Guard | Guard test | — |

## Spine Actors / Main-Line Nodes

Setup file; attachment; `startStudioE2eRuntimeServer`; `builtServerLaunchEnvironment`/`startBuiltTestServer`; `connectMcpGatewayClient`; the node (unchanged); the guard test.

## Ownership Map

- `tests/setup/test-launch-credential.ts`: owns the process's credential and the moment the attachment is installed (before test code).
- `owner-credential-attachment.mjs`: owns how a test process attaches a credential to loopback requests; installation is idempotent and explicit.
- `startStudioE2eRuntimeServer`: the one in-process start path for E2E; owns the start sequence and registering the port.
- `builtServerLaunchEnvironment` / `startBuiltTestServer`: own child-node credential handover (unchanged).
- `connectMcpGatewayClient`: owns obtaining the gateway token as the owner does and connecting a gateway client with it.
- Guard test: owns the static rules and their messages.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| Manual start sequence + `buildStudioServer` import in `agent-runtimes-graphql.e2e.test.ts:28, 116-122` and `available-agent-runtimes-graphql.e2e.test.ts:38, 195-201` | Duplicates the helper and misses its attachment | `startStudioE2eRuntimeServer("127.0.0.1", { loggingConfig: LOGGING })` | Keep `fastify` from the result |
| Lazy-only `install()` (private) in the attachment | The setup installs explicitly | Exported `installOwnerCredentialAttachment()`, still called by the attach functions | Rename, not a second path |
| Bare `StreamableHTTPClientTransport(<server>/mcp/gateway)` + `new Client` pairs in the 5 gateway files | Replaced by the helper | `connectMcpGatewayClient` | Keep each file's own client name |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Logging config option of the in-process start | DS-001 | `startStudioE2eRuntimeServer` | Let a suite that scans its server output choose trace logging | The two runtime files need it for their secret scans (AR-11) | Without it they would keep their own start sequence |
| Credential redaction in evidence | all | Every suite | Never print the credential/token | NA-8, TESTING.md | — |

## Ownership Boundaries

The node's gate is the product's boundary and is not touched. In the harness, the setup file is the authority for "this process has a credential and attaches it"; e2e files depend on the start helpers and the gateway helper, not on the attachment's internals (they never call `attachOwnerCredential` themselves).

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `startStudioE2eRuntimeServer` | `buildStudioServer`, start sequence, `attachOwnerCredential` | Every e2e file with an in-process node | `buildStudioServer(` in an e2e file (guard rule 1) | Add an option to the helper (as D2 does for logging) |
| `connectMcpGatewayClient` | Token read, transport with headers | Every e2e gateway client | `StreamableHTTPClientTransport(…/mcp/gateway…)` in an e2e file (guard rule 2) | Add an option to the helper |
| `builtServerLaunchEnvironment` / `startBuiltTestServer` | Credential env + loopback attach | Files that spawn nodes | A child env without it (not statically guarded; TESTING.md) | — |

## Dependency Rules

- e2e files → `tests/e2e/helpers/*` → `tests/setup/test-launch-credential.ts`, `test-support/node-access/*`. Never the reverse.
- No test code imports into `src/`'s direction is added; no `src/` file imports test code.
- The guard test reads files; it imports nothing from `tests/e2e`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `installOwnerCredentialAttachment(): void` | Attachment | Patch `fetch`/`http.request` once | — | Idempotent |
| `startStudioE2eRuntimeServer(requestedHost = "127.0.0.1", options: { loggingConfig?: LoggingConfig } = {})` | In-process node | Start, register port | Host string | Default logging unchanged |
| `connectMcpGatewayClient(serverUrl: string \| URL, clientName: string): Promise<Client>` | Gateway client | Read token from `GET /rest/mcp-gateway/token`, connect | Server base URL | Throws `MCP gateway token read failed: <status>` (no token text) when the read is not 200 |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `installOwnerCredentialAttachment` | Yes | Yes | Low | — |
| `startStudioE2eRuntimeServer` | Yes | Yes | Low | — |
| `connectMcpGatewayClient` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Same Meaning And Name Everywhere? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Attachment install | `installOwnerCredentialAttachment` | Yes | Yes (module name `owner-credential-attachment`) | Low | — |
| Gateway client | `connectMcpGatewayClient`, file `mcp-gateway-client.ts` | Yes | Yes ("MCP gateway token", NA-12) | Low | — |
| Guard | `e2e-node-credential-paths.test.ts` | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Attach credential early | `test-support/node-access` + setup | Extend | Owner exists | — |
| In-process start with trace logging | `studio-runtime-test-server.ts` | Extend | Owner exists | — |
| Inject header | — (per call, as `node-files`) | Reuse pattern | One line per call | — |
| Child credential | `built-server-launch-credential.ts` | Reuse | Exists | — |
| Gateway token client | `tests/e2e/helpers/` | Create New | No helper reads the token today | Gateway-specific; not the attachment's job (different secret) |
| Guard | `tests/architecture/` | Create New file | Same kind as `node-access-boundaries` | Different subject (test files, not `src/`) |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `test-support/node-access` | Attachment | DS-001, DS-003, DS-004 | Setup | Extend | Shared with web probes; their behavior unchanged |
| `autobyteus-server-ts/tests/setup` | Per-process credential | DS-001 | — | Extend | — |
| `autobyteus-server-ts/tests/e2e/helpers` | Start paths, gateway client | DS-001, DS-004 | e2e files | Extend / Create | — |
| `autobyteus-server-ts/tests/architecture` | Guard | DS-005 | Server test run | Create file | — |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction changed the draft).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Gateway connect (7 call sites in 5 files) | `tests/e2e/helpers/mcp-gateway-client.ts` | e2e helpers | One token rule | Yes | Yes | A general MCP client factory (the Agent Tools host and remote fake servers keep their own transports) |
| In-process start sequence (helper + 2 copies) | `studio-runtime-test-server.ts` | e2e helpers | One start path | Yes | Yes | A config bag of unrelated options |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `startStudioE2eRuntimeServer` options `{ loggingConfig? }` | Yes | Yes | Low | Host stays the first parameter (7 callers) |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `test-support/node-access/owner-credential-attachment.mjs` (+ `.d.mts`) | test-support | Attachment | Export `installOwnerCredentialAttachment` (the former private `install`); header comment says the server setup installs it before test code | Existing owner | — |
| `autobyteus-server-ts/tests/setup/test-launch-credential.ts` | setup | Setup | Call `installOwnerCredentialAttachment()` after setting the credential; comment why (a `fetch` a test keeps is already the attached one) | Existing owner | Attachment |
| `autobyteus-server-ts/tests/e2e/helpers/studio-runtime-test-server.ts` | e2e helpers | In-process start | Optional `{ loggingConfig }` (default `TEST_LOGGING_CONFIG`) | Existing owner | — |
| `autobyteus-server-ts/tests/e2e/helpers/mcp-gateway-client.ts` (new) | e2e helpers | Gateway client | `connectMcpGatewayClient` | One concern | MCP SDK |
| `tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts`, `available-agent-runtimes-graphql.e2e.test.ts` | e2e | Test | Start via helper with `{ loggingConfig: LOGGING }`; `fastify = started.fastify`; URL from `started.mainUrl` | — | Helper |
| `tests/e2e/agent-team-runs/task-delegation-api-surface.e2e.test.ts`, `file-explorer/workspace-content-rest.e2e.test.ts` | e2e | Test | `inject` calls carry `authorization: Bearer ${ownerCredential}` (keep the `started` result) | — | — |
| `tests/e2e/projects/project-mutation-node-locality.e2e.test.ts` | e2e | Test | `environment()` adds `...builtServerLaunchEnvironment()` | — | Helper |
| `tests/e2e/tool-management/mcp-secrets-in-vault`, `mcp-http-redirect-and-transport`, `mcp-http-auth-remote-server`, `tests/e2e/runtime/mcp-run-session-cleanup`, `tests/e2e/mcp/mcp-github-remote-live` (`.e2e.test.ts`) | e2e | Test | Gateway clients via `connectMcpGatewayClient` | — | Helper |
| `autobyteus-server-ts/tests/architecture/e2e-node-credential-paths.test.ts` (new) | architecture | Guard | Rules 1 and 2 over `tests/e2e/**/*.ts`, messages naming file and fix; a case per rule showing it flags a known-bad sample | One concern | — |
| `TESTING.md` | docs | API/E2E-owned rules | Node credentials paragraph (D7), Choosing-the-path row (D8) | — | — |
| `docs/design-cases.md` | docs | Solution Designer | Case 2: "Again in autobyteus-437 (447)" | — | — |

## Applied Patterns (If Any)

None beyond the existing source-text architecture test pattern.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `test-support/node-access/` | Folder | Attachment | As above | Existing | Product code paths |
| `autobyteus-server-ts/tests/setup/` | Folder | Setup | As above | Existing | Per-suite logic |
| `autobyteus-server-ts/tests/e2e/helpers/mcp-gateway-client.ts` | File | Gateway client | As above | Next to the other e2e start/call helpers | A second credential attachment |
| `autobyteus-server-ts/tests/architecture/e2e-node-credential-paths.test.ts` | File | Guard | As above | Next to `node-access-boundaries.test.ts` | Runtime requests |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `tests/e2e/helpers/` | Off-Spine Concern | Yes | Low | Existing helper folder |
| `tests/architecture/` | Off-Spine Concern | Yes | Low | Existing guard folder |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| D1 setup | `const credential = createTestOwnerCredential(); process.env.AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL = credential; installOwnerCredentialAttachment();` | Each file moving its `const realFetch = globalThis.fetch` below the start call | The invariant lives in one owner, for every current and future file |
| D2 runtime files | `const started = await startStudioE2eRuntimeServer("127.0.0.1", { loggingConfig: LOGGING }); fastify = started.fastify; client = createGraphqlClient(started.mainUrl, sources.realFetch);` | `buildStudioServer(...)` + own `listen` + `attachOwnerCredential` in the file | One start path; the guard keeps it so |
| D3 inject | `app.inject({ method: "POST", url: "/graphql", payload, headers: { authorization: \`Bearer ${started.ownerCredential}\` } })` | Wrapping `fastify.inject` to add the header for every caller | Deliberate refusal tests use `inject` without a credential |
| D4 gateway | `const client = await connectMcpGatewayClient(serverUrl, "mcp-auth-e2e-gateway-client"); try { … } finally { await client.close(); }` | `new StreamableHTTPClientTransport(new URL(\`${serverUrl}/mcp/gateway\`))`; or setting `AUTOBYTEUS_MCP_GATEWAY_TOKEN` in the server env | Reads the token as the owner does (NAS-25), same for in-process and built servers and after restart |
| D6 guard message | `tests/e2e/x.e2e.test.ts composes a node with buildStudioServer: its requests carry no owner credential. Start it with startStudioE2eRuntimeServer (tests/e2e/helpers/studio-runtime-test-server.ts); see TESTING.md, Node credentials.` | A message that only lists files | Names cause and fix |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Test-only bypass of the node gate (env flag, loopback trust) | Would green the suite at once | Rejected (Task constraint, NA-1, NA-14) | Tests present real secrets |
| Keeping the runtime files' own start sequence next to the helper | Smaller diff | Rejected | Helper option (D2) |

## Derived Layering (If Useful)

N/A.

## Design Decisions

- **D1 — Attachment installed from the setup file.** `tests/setup/test-launch-credential.ts` calls `installOwnerCredentialAttachment()` right after setting the credential. Every server test process (unit, integration, E2E) then has the patched `fetch`/`http.request` from its start; it attaches nothing until a port is registered (or the loopback credential is set), so non-E2E tests see no change. Fixes form 1a in 7 default-run and 8 gated files with no edit to them.
- **D2 — One in-process start path.** `startStudioE2eRuntimeServer` gains `options.loggingConfig`; the two runtime files use it. Their `createGraphqlClient(…, sources.realFetch)` then works by D1.
- **D3 — `inject` carries the owner header** in the two inject files, using the helper's `ownerCredential` (pattern of `node-files.e2e.test.ts:31`). No wrapper: refusal tests rely on `inject` sending only what they name.
- **D4 — Gateway client helper.** `connectMcpGatewayClient(serverUrl, clientName)`: `GET <serverUrl>/rest/mcp-gateway/token` through `fetch` (owner credential attached, port registered by the start helper), expect 200, then `new Client({ name: clientName, version: "1.0.0" })` connected with `new StreamableHTTPClientTransport(new URL("/mcp/gateway", serverUrl), { requestInit: { headers: { authorization: \`Bearer ${token}\` } } })`. Never logs the token. The five gateway files use it (7 call sites); the restart case reads the token again after restart (the node keeps it, `mcp-gateway-token-service.ts:46-48`).
- **D5 — Fixture child gets its launch credential.** `project-mutation-node-locality` adds `...builtServerLaunchEnvironment()` to `environment()`; the loopback attachment covers the test's requests to both children (same credential) and the Agent Tools host ignores the header (ASM-002).
- **D6 — Guard test** `tests/architecture/e2e-node-credential-paths.test.ts`: over `autobyteus-server-ts/tests/e2e/**/*.ts`, (1) `buildStudioServer(` only in `tests/e2e/helpers/studio-runtime-test-server.ts`; (2) a `StreamableHTTPClientTransport(` whose argument (up to the matching `)`, across lines) names `mcp/gateway` only in `tests/e2e/helpers/mcp-gateway-client.ts`. Each failure lists file and line with the cause and the helper to use (QR-002). One case per rule runs its detector on an inline bad sample and expects a finding (AC-005). Runs in `test:unit` (`tests/architecture` is in the unit script).
- **D7 — TESTING.md, Node credentials** (REQ-007): state that the setup installs the attachment before test code (so a kept `fetch` carries the credential); start in-process nodes with `startStudioE2eRuntimeServer`, built ones with `startBuiltTestServer`, a self-spawned node or fixture with `builtServerLaunchEnvironment()`; `fastify.inject` needs `authorization: Bearer <ownerCredential>`; the MCP gateway needs its token, not the owner credential: `connectMcpGatewayClient`; the guard test fails the first two shapes. Keep it global and short; remove what becomes obsolete in that paragraph.
- **D8 — TESTING.md, Choosing the path** (REQ-008): a row "The node's request gate, node credentials, the MCP gateway token, or the shared server test harness (`tests/setup/`, `tests/e2e/helpers/`, `test-support/`) | The whole server E2E suite (`pnpm test:e2e`): each suite reaches its node its own way, so a subset proves only the ways it uses". Commit TESTING.md on its own as `docs(testing): <reason>` (TESTING.md "When this file may be updated").
- **D9 — Design case.** `docs/design-cases.md` Case 2: add autobyteus-437 to the title's ticket list and an "Again in autobyteus-437 (found by autobyteus-436 API-05, fixed by autobyteus-447)" bullet: the gate's test support was traced through the start helpers it touched; test files also reach nodes through a kept `fetch`, a directly composed node, `inject`, a fixture child and the MCP gateway (its own secret); fix: attachment from the setup, one path per form, a guard.

## SR-002 Design Decisions (D10–D13)

Current state: branch `codex/server-e2e-node-credential-447` @ `8b7c60e343` (D1–D9 implemented; `origin/personal` `f78b60dddd` merged as `5c29d6fca2`). Delivery's full run on it (DEL-01): one failed file, E-002 below. All 15 FU-004 files pass.

- **D10: E-002 follows autobyteus-455's collaborator rule (REQ-009).** In `remove-built-in-project-task-manager-startup.e2e.test.ts:326-332`, the `@` check on the user agent run `otherRunId` expects these results. `autobyteus-daily-assistant` is a candidate: `collaborationEligible: true` in `src/built-in-agents/built-in-agent-registry.ts` (455). `autobyteus-model-router` and `RETIRED_ID` are not. Update the comment ("AC-009: the Model Router stays out of `@`; the Daily Assistant and the repository manager are ordinary candidates"). `BUILT_IN_IDS` stays for the catalog checks (`:251`, `:302`). Take the Model Router's ID from the same place the test takes the others (a constant beside `BUILT_IN_IDS`; `INSTALLED_BUILT_IN_FOLDERS` already names it). Do not import the product registry to compute what the test asserts.
- **D11: RPE-001/003/006 follow autobyteus-95's personal settings (REQ-010 b).** In `registered-package-definition-edit.e2e.test.ts` (`:243`, `:277`, `:362`), stop expecting `defaultLaunchConfig` in `team-config.json`/`org-config.json`. Instead, assert three things. (1) The save's GraphQL answer and a fresh definition read return the saved default. (2) The default is recorded in `<app-data>/agent-packages/personal-settings.json` for that definition: read its shape from `src/personal-settings/domain/personal-setting-record.ts` and the contract it cites. (3) A default-only save leaves the package's config file byte-identical, while the other edits of the same save (description in `team.md`, members) are still written as today. Keep the RPE scenario IDs.
- **D12: DCF-02's capsule lookup waits for a complete capsule (REQ-010 c).** In `delegated-copy-project-folder.e2e.test.ts` `capsuleOf` (`:58-66`), an `agy-project` folder without `manifest.json` is skipped (not ready), so the `until` loop keeps waiting. The writer creates the folder first and the manifest last (`src/agent-execution/backends/antigravity/capsule/agy-run-capsule.ts:58-70`). Check for other copies of this walk in `tests/e2e` (`grep -rn "agy-project" tests/e2e`) and give each the same rule. If two or more, move it into one helper beside `agy-runtime-error-fixture.ts`.
- **D13: DCM-009 found by its cause (REQ-010 d).** First, make the failing assertion (`delegated-copy-model-change.e2e.test.ts:658`) show the stop result's `outcome` and `message` (assert the whole result object, or add them to the assertion message). Then reproduce under load: API-10's gated set, or the file alongside the other delegated-copy files. Fix by cause. A missing wait in the test (the copy's switched runtime not yet ready to stop) is fixed in the test by waiting for the state the product reports. A cause in product code (for example a stop refused during a runtime switch) is returned to the Solution Designer with the evidence, as a `Design Impact` or `Requirement Gap`, before any product change. If 3 load runs do not reproduce it, record the attempts and the improved assertion, and say so; do not change timing blindly.

## Change / Refactor Sequence

1. D1 (attachment + setup). Run PROBE-01's 15 files: the 7 form-1a files should pass.
2. D2 (helper option, two runtime files).
3. D3, D5.
4. D4 (helper, five gateway files).
5. D6 guard; confirm it passes on the tree and that each self-case flags its sample.
6. Server typecheck (test files are type-checked; baseline must not grow), `test:unit`, `test:integration` (shared harness changed, TESTING.md rerun rule 4).
7. The 15 files, then the full `pnpm test:e2e` (clean env, prepared outputs); the deterministic gated suites: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs` for `mcp-run-session-cleanup`, `agent-package-definitions-live-refresh`, `agy-skill-update-notice-roots`; `mcp-github-remote-live` with `RUN_GITHUB_MCP_E2E=1` and the test vault if `test.github.token` is present (no paid provider; token valid until 2026-11-25), else recorded as not run.
8. D7, D8 (own commit), D9.

SR-002 sequence (on the current branch, after D1–D9):

9. D10; run the E-002 file alone (DEL-02's command).
10. D11, D12; run `registered-package-definition-edit` and `delegated-copy-project-folder` with `RUN_AGY_FAILURE_E2E=1` and the scripted AGY CLI.
11. D13 as described; record each run.
12. Full `pnpm test:e2e` on the branch (clean env, prepared outputs): 0 failed files. Then the deterministic gated set (API-10's command).
13. Server typecheck (test files; baseline must not grow).

## Key Tradeoffs

- Installing in every server test process (D1) versus only in E2E: one setup file serves all server tests today; the patch is inert without a registered port, and a separate E2E-only setup would add a config split for no benefit.
- Reading the token from the owner route (D4) versus setting it in the environment: the route is how the owner gets it (NAS-25) and works for every start path and across restart; the environment would need a knob per start path and would test a less common configuration.
- Static guard (D6) covers the two shapes a check can see without false positives; `inject` and child environments are left to TESTING.md and a first-run 401.

## Risks

- RSK-001 (D1 changes a unit/integration result): mitigated by the rerun in step 6.
- ASM-001 (a credentialed test fails for a product reason): reported by its cause; a cause outside these files returns as described in Task Size escalation.
- ASM-002 (Agent Tools host and the extra header): confirmed by running the two affected files.
- Brief Studio files need `test:integration:prepare` first (existing, documented).

## Guidance For Implementation

- Reproduction to start from: PROBE-01 command over the 15 files (investigation notes), after `pnpm -C autobyteus-server-ts test:integration:prepare`, in a clean environment (`env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR"`). It must turn green.
- Never print or commit a credential or token; grep evidence for `own_` and `mcpg_` before committing (AC-006).
- One heavy run at a time (TESTING.md).
- Stage paths explicitly; TESTING.md change in its own `docs(testing)` commit.
