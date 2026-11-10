# Requirements Document — server-e2e-node-credential-447

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `server-e2e-node-credential-447`
- Request / ticket: Project Task `autobyteus-447` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); urgent follow-up FU-004 of autobyteus-436 (`tickets/done/phone-registered-folders-436/follow-ups.md`)
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-10
- Approved by and reference: SR-001: `Solution Designer within the direction (user informed)`; reference: SR-001 approval note in `solution-revision-record.md` and the Solution Designer's message to the user (2026-11-10). SR-002 (UC-004, REQ-009, REQ-010, AC-009, AC-010): the user's direction "for other errors fix them" (2026-11-10, section User Direction), applied by the Solution Designer, user informed
- Exact approved requirements baseline / solution revision: this document at SR-002
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: Since the autobyteus-437 node gate (every request to a node needs a credential; the MCP gateway needs its own token), 15 server E2E files fail on `personal`: their requests reach their test-owned node with no owner credential (401 `NODE_CREDENTIAL_REQUIRED`) or reach the MCP gateway with no gateway token (401 `MCP_GATEWAY_TOKEN_REQUIRED`). Reproduced on base `310fc27452`: 15 files, 40 tests failed (BEH-001). The server E2E layer therefore no longer protects releases (DESIGN.md rule 11, TESTING.md). Gated suites that share the same request paths carry the same gap (BEH-002).
- Affected actors or systems: the server E2E suite (`pnpm test:e2e`) and the gated suites under `autobyteus-server-ts/tests/e2e/`; every role that runs them (implementation, API/E2E, delivery, release smoke).
- Desired outcome: every server E2E suite talks to its test-owned node as the desktop app talks to its own node (launch owner credential) and to the MCP gateway as an MCP client on the owner's computer does (gateway token), so the suite is green on `personal`; and a new test file cannot fall into the same gap silently.
- Observable definition of success: `pnpm test:e2e` on the finalized `personal` reports no failed file (AC-001); the gated suites with the same gap pass under their gates (AC-002); the node's gate and product code are unchanged (AC-004); a new test written the way the failing ones were written fails early with a message naming the cause and the fix (AC-005).

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | 15 default-run server E2E files fail on base `310fc27452` (40 failed, 2 passed, 20 skipped): their GraphQL/REST requests are refused 401 `NODE_CREDENTIAL_REQUIRED`, their MCP gateway clients 401 `MCP_GATEWAY_TOKEN_REQUIRED` | Each of the 15 files presents the owner credential to its node and the gateway token to the gateway, and passes | What each test asserts about the product (its cases, IDs and expected outcomes) | Investigation notes PROBE-01, Source Log; `evidence/REPRO-01-fifteen-files-base.log` |
| BEH-002 | Operational | SCN-002 | Gated suites (run only with their `RUN_*` gate) reach their node by the same paths (a `fetch` captured before the credential attachment exists, the MCP gateway without its token): 10 files read, not yet reproduced | They present the credential and token the same way and pass under their gates | Gates stay as they are; a skip without the gate is still not a pass | Investigation notes, gated-suite inventory |
| BEH-003 | Contract | SCN-003 | The node refuses every request without a valid credential (NA-1) and the gateway without its token (NA-12); no test-only bypass exists in product code | Unchanged | The whole node access model (NA-1…NA-15, NAS-01…NAS-40) | `autobyteus-server-ts/docs/design/node_access_model.md`; `src/mcp-gateway/mcp-gateway-access.ts` |
| BEH-004 | Operational | SCN-004 | A test file that starts or calls its node without the credential fails late and obscurely ("Cannot read properties of undefined (reading 'agentRuntimes')", "expected 401 to be 200") | Such a test fails early, with a message that names the missing credential and the helper to use | Tests that deliberately send no credential to prove a refusal (node access model suite, remote access suites) keep doing so | REPRO-01 failure texts |
| BEH-006 | Operational | SCN-006 | Other failures the team hit while doing this ticket, not caused by it: (a) default-run `app-data-migrations/remove-built-in-project-task-manager-startup` E-002 asserts the Daily Assistant is never an `@` candidate (`:332`), but autobyteus-455 (`fbc9b3c2e9`, on `personal`) made it an ordinary collaborator; only the Model Router stays out (DEL-01, DEL-02); (b) gated `registered-package-definition-edit` RPE-001/003/006 expect a package Team/Org default to be written into its config file (`:243`, `:277`, `:362`), but since autobyteus-95 that default is a personal setting in `<app-data>/agent-packages/personal-settings.json` (API-10, API-10b); (c) gated `delegated-copy-project-folder` DCF-02's `capsuleOf` (`:58-66`) reads `manifest.json` in an `agy-project` folder the capsule writer has created but not finished (`agy-run-capsule.ts:58-70`), and throws under load; (d) gated `delegated-copy-model-change` DCM-009 (team root) once got `success: false` from `stopDelegatedExecution` right after a runtime switch, under load (`:658`), cause not found | Each passes, fixed at its cause | The product rules those tests check, as they now are (455's collaborator rule, autobyteus-95's personal settings) | `follow-ups.md` FU-002…FU-004 (before SR-002); delivery DEL-01, DEL-02; API/E2E API-10, API-10b |
| BEH-005 | Operational | SCN-005 | Web browser probes that start a node and the release smoke check already carry the credential (autobyteus-437) | Unchanged; confirmed by this ticket's census | Their current helpers (`probe-node-access.mjs`) | Investigation notes, probe and release smoke census |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| The user (release owner) | Releases protected by a green server E2E suite | `pnpm test:e2e` green on `personal` | Release only on the user's word |
| Engineering roles (implementation, API/E2E, delivery) | Run the suite and trust its result | A failure means a product or test defect, not a missing credential | TESTING.md rules (clean environment, one heavy run at a time) |
| Test authors of future suites | Write a suite that talks to a node | The obvious way to start and call a node carries the credential; a wrong way fails early and says why | Test code only (test-support, tests/) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Run the default server E2E suite (`pnpm test:e2e`) on a clean environment and get a green result | SCN-001 |
| UC-002 | Run a gated server E2E suite that talks to its node or the MCP gateway, with its gate set | SCN-002 |
| UC-003 | Write a new server E2E file that starts or calls a test-owned node | SCN-004 |
| UC-004 | The default and deterministic gated server E2E suites run green after this ticket, including the failures the team found along the way that this ticket did not cause (BEH-006) | SCN-006 |

### Out Of Scope

- Any change to the node's gate, route permissions, MCP gateway token rules (BEH-003). No test-only bypass. Other product code changes only if a BEH-006 failure's cause is in product code, and then only after the Solution Designer decides it (REQ-010).
- Product behavior the failing tests assert: if a test, once it carries the credential, fails for a product reason, that failure is reported by its cause (TESTING.md Rule 9), not absorbed here unless it is a cause in the test itself.
- Web browser probes and the release smoke script: confirmed not affected (BEH-005); no change.
- FU-001…FU-003 of autobyteus-436 (phone authorization, stale web spec, phone polling after revocation).
- Making the full server E2E suite a required gate of every ticket (TESTING.md "Green server suites" lists unit, integration and typecheck): a process decision for the user, recorded as a follow-up (DEC-004), not decided here. The narrower rule for changes to what every node request crosses is in scope (REQ-008).

### Non-Goals

- Running live-provider suites against paid providers to prove this change (TESTING.md Gates: the change needs no real-provider proof); the live suites share the mechanism the deterministic suites prove.
- A guard that detects every conceivable way of calling a node without a credential (for example a raw `fastify.inject` without a header, which deliberate refusal tests also use).

### Preserved Behavior Boundary

- BEH-003 entirely (node access model and gateway token unchanged).
- The assertions and scenario IDs of every touched test (BEH-001 preserved column).
- Deliberate no-credential refusal tests (BEH-004 preserved column): `node-access/node-access-model`, `remote-access/*`, `node-files`, `node-desktop` keep passing.
- The test-support credential is never printed or stored in evidence (TESTING.md Node credentials).

### Prerequisites

None open. Delivery DR-001 raised E-002 (BEH-006 a) as a prerequisite; on the user's direction ("for other errors fix them") it is fixed in this ticket instead (REQ-009, SR-002). The Brief Studio importable package that three of the files need is an existing, documented preparation step (`pnpm -C autobyteus-server-ts test:integration:prepare`, named by the suite when missing), not a defect.

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status (written down / sent / delivered) |
| --- | --- | --- | --- | --- |
| PRQ-001 | E-002 fails on `personal` since autobyteus-455 (DEL-01, DEL-02) | REQ-006, AC-001 | Not sent: folded into this ticket on the user's direction (SR-002) | Resolved in scope (REQ-009) |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Each of the 15 failing server E2E files presents its test-owned node's owner credential on every request to that node (HTTP, GraphQL, REST, WebSocket upgrade, `fastify.inject`), as the desktop app does for its own node | BEH-001 | Must | The node refuses everything else (NA-1) | N/A (mechanism exists: `test-support/node-access`, used by passing suites) | Task direction; FU-004 |
| REQ-002 | Each server E2E client of the MCP gateway (`/mcp/gateway`) presents the node's gateway token, obtained as the owner obtains it on that node | BEH-001, BEH-002 | Must | The gateway refuses every client without its token, this computer included (NA-12, NAS-25) | N/A | Task direction; DEC-002 |
| REQ-003 | Gated server E2E suites that reach their node or the gateway by the same paths (BEH-002 inventory) present the credential and token the same way | BEH-002 | Should | Same cause, same remedy; a gated run should not fail for a missing credential the next time someone sets its gate | N/A | DEC-001 |
| REQ-004 | No product code changes (SR-002: unless a REQ-010 cause lies in product code and the Solution Designer decides the change first); the node's gate, the gateway token rules and all refusal behavior stay as they are; the credential support stays test code only | BEH-003 | Must | Task constraint; NA-1, NA-12 | N/A | Task constraints |
| REQ-005 | The way a test file most naturally reaches its node cannot bypass the credential: the credential attachment of a test process is in place before any test code runs, and a test that composes an in-process node outside the shared start path, or bypasses it in a detectable way, fails early with a message that names the missing credential and the helper to use | BEH-004 | Should | The 15 failures went unnoticed across releases and failed with obscure messages; the Task asks to consider a guard | Static detection is limited to known patterns (Non-Goals) | DEC-003 |
| REQ-006 | The default server E2E suite (`pnpm test:e2e`, clean environment, prepared build outputs) runs with no failed file on the branch and, after finalization, on `personal` | BEH-001 | Must | Done-when of the Task | Measured baseline: only these 15 files failed in 436's full run at `97ed263074`; current full run at `310fc27452` recorded in investigation notes | Task "Done when" |
| REQ-007 | The project's testing guide states how a server E2E test presents the gateway token and the credential for `fastify.inject`, next to the existing Node credentials rule | BEH-004 | Should | TESTING.md "Node credentials" names the owner credential helpers only; the gateway token and inject header are the two paths the 15 files missed | N/A | DESIGN.md/TESTING.md project documents rule |
| REQ-009 | The default-run file `remove-built-in-project-task-manager-startup` E-002 checks the current collaborator rule: on a user agent run, the Daily Assistant is an `@` candidate, while the Model Router and the retired Project Task Manager are not; its catalog checks stay as they are | BEH-006 (a) | Must | REQ-006 needs every default-run file green on `personal`; autobyteus-455's rule (`collaborationEligible`) is the product's current behavior (DESIGN.md rule 11) | N/A | User direction "for other errors fix them"; delivery DR-001 |
| REQ-010 | The gated failures the team found (BEH-006 b–d) are fixed at their cause: (b) RPE-001/003/006 assert the saved default where autobyteus-95 keeps it (personal settings) and that a default-only save leaves the package files unchanged; (c) DCF-02's capsule lookup treats a capsule without its manifest as not ready yet; (d) DCM-009's cause is found (the assertion first shows the stop result's outcome and message) and fixed: in the test when the cause is there; a cause in product code returns to the Solution Designer before any product change | BEH-006 (b–d) | Should | The user's direction to fix every error that is not a Codex usage limit | (d) Unclear until reproduced | User direction "for other errors fix them" |
| REQ-008 | The testing guide states the check that would have caught this at its own stage: a change to what every request to a node crosses (the node's request gate, node credentials, the MCP gateway's token) or to the shared server test harness runs the whole server E2E suite before it is handed off | BEH-004 | Should | The failure passed 437's validation and was caught two tickets later (436 API/E2E); the team's project-documents rule puts the check for a problem a later stage caught into the earliest stage's document, usually the testing guide | N/A | Team `project-documents.md` "When a later stage catches a problem"; DEC-004 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-006 | BEH-001 / SCN-001 | Worktree installed and built (`prebuild`, `build`, `test:integration:prepare`); clean environment (`env -i PATH HOME=<temp> TMPDIR`) | `pnpm test:e2e` reports 0 failed files; the 15 files of FU-004 report every case passed or skipped by its own existing gate | A remaining failure is reported with its cause (TESTING.md Rule 9), never closed as pre-existing | Full suite run on the branch, and delivery's run on the integrated state |
| AC-002 | REQ-002, REQ-003 | BEH-002 / SCN-002 | Each deterministic gated suite of the inventory with its gate (scripted AGY CLI, no provider) | Each passes; none shows 401 `NODE_CREDENTIAL_REQUIRED` or `MCP_GATEWAY_TOKEN_REQUIRED` | Live-provider suites of the inventory are not run (Non-Goals); they use the same shared mechanism, proven by AC-001/AC-002 suites and the server typecheck | Gated runs of the deterministic suites |
| AC-003 | REQ-002 | BEH-001 / SCN-001 | An MCP gateway client in a test, on an in-process and on a built server, including across a server restart | The client connects and calls tools with the gateway token; a client without it is still refused 401 `MCP_GATEWAY_TOKEN_REQUIRED` | — | The three `tool-management/mcp-*` files; existing refusal assertions |
| AC-004 | REQ-004 | BEH-003 / SCN-003 | Branch diff against base | No file under `autobyteus-server-ts/src/`, `autobyteus-web/` app code or other product code changes (except one the Solution Designer decided under REQ-010); the node access model suite and the remote access suites pass unchanged | — | Diff review; `node-access-model`, `remote-access/*`, `node-files`, `node-desktop` e2e runs |
| AC-005 | REQ-005 | BEH-004 / SCN-004 | A test file that (a) captures `globalThis.fetch` before starting its node, or (b) composes an in-process node without the shared start path | (a) its requests still carry the credential; (b) the server test run fails with a message naming the file, the missing credential and the helper to use | A deliberate no-credential refusal test is not flagged | A guard check in the server test run, with a case proving it flags a known-bad shape and passes the current tree |
| AC-006 | REQ-004 | BEH-003 | Evidence produced by the branch's runs | No owner credential, gateway token or setup code appears in committed evidence or test output | — | Grep of evidence for `own_…`, `mcpg_…` |
| AC-007 | REQ-007 | BEH-004 | — | TESTING.md "Node credentials" names how to present the gateway token and the inject credential, in its existing global style | — | Docs review |
| AC-009 | REQ-009 | BEH-006 (a) / SCN-006 | The file alone, then the full suite, on the integrated state | E-001…E-004 pass; E-002 sees the Daily Assistant among the candidates and neither the Model Router nor the retired manager | — | DEL-02's command; full `pnpm test:e2e` |
| AC-010 | REQ-010 | BEH-006 (b–d) / SCN-006 | `RUN_AGY_FAILURE_E2E=1` with the scripted AGY CLI | `registered-package-definition-edit` passes; `delegated-copy-project-folder` and `delegated-copy-model-change` pass alone and in the gated set (API-10's command); DCM-009's cause is recorded | A failure that is the user's Codex usage limit is recorded, not fixed (User Direction) | Gated runs |
| AC-008 | REQ-008 | BEH-004 | — | TESTING.md names the whole-suite run for a change to the node gate, node credentials, the gateway token or the shared server test harness, as a rule (not this incident's story) | — | Docs review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | An engineer or delivery role; TESTING.md "Server E2E" | Prove a change on the server's real boundaries | `pnpm test:e2e` | Worktree built, clean environment | Each file starts its test-owned node (in-process, built `dist/app.js`, or a fixture child), calls it over HTTP/GraphQL/WebSocket/MCP, asserts | All files pass | A product failure is reported by its cause | Supported Normal Scenario | TESTING.md test layers; 436 API-05 | REQ-001, REQ-002, REQ-006; AC-001, AC-003 |
| SCN-002 | Operational | Same; a `RUN_*` gate | Prove behavior on scripted or live runtimes | The gate variable and command in the test file header | As SCN-001 plus the gate | As SCN-001 | Passes | Without its gate: skipped (not a pass) | Supported Normal Scenario | TESTING.md Gates | REQ-003; AC-002 |
| SCN-003 | Contract | Node access model NA-1, NA-12 | Every node request and gateway call needs a credential | Any request to a node | — | Gate checks Host, Origin, admission, credential, route | Refusal without a credential | — | Supported Normal Scenario | `node_access_model.md` | REQ-004; AC-004 |
| SCN-004 | Operational | A test author | Add a new server E2E file | Writing a test that starts or calls a node | — | Author starts the node and sends requests | Requests carry the credential, or the run fails early naming the fix | Deliberate refusal tests unaffected | Supported Normal Scenario | DESIGN.md rule 11; Task direction | REQ-005, REQ-007; AC-005, AC-007 |
| SCN-006 | Operational | An engineer or delivery role | Run the default and deterministic gated suites after this ticket | `pnpm test:e2e`; `RUN_AGY_FAILURE_E2E=1` gated runs | Integrated state | As SCN-001 | All pass | Codex usage-limit refusals recorded, not fixed | Supported Normal Scenario | User direction; DEL-01; API-10 | REQ-009, REQ-010; AC-009, AC-010 |
| SCN-005 | Operational | Browser probes, release smoke | Their own node calls | `pnpm -C autobyteus-web test:e2e:<name>`, `python3 scripts/release_smoke.py` | — | Already use the 437 helpers | Unchanged | — | Supported Normal Scenario | Census in investigation notes | Out of scope (no change) |

## UI, Interaction, And Experience Requirements

- Applicable: `No`
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: N/A — not applicable
- Explicitly illustrative fixture content or permitted implementation variation: N/A — not applicable
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: N/A — not applicable
- Product decisions that need the user (with reasoning and recommendation): None

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004, AC-006 | Security | No credential or token printed or stored in evidence; the credential reaches only the test-owned node's loopback port | All runs | Evidence grep; attachment only for loopback ports |
| QR-002 | REQ-005 | Operability | The guard's failure message names the file, the cause and the helper | Guard check | Guard case |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: N/A (test-owned data roots only)
- Loss, reset, rebuild, or regeneration that is acceptable: N/A
- Retention, privacy, compliance, volume, downtime, or operational constraints: Tests use isolated nodes and test-owned data (TESTING.md Rule 2)
- Unknowns requiring downstream investigation: None

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Node access model | Unchanged (NA-1, NA-12) | `autobyteus-server-ts/docs/design/node_access_model.md` | None |
| `@modelcontextprotocol/client` 2.3.1 `StreamableHTTPClientTransport` | Sends headers given in `requestInit.headers` | Its `index.d.mts` (`requestInit?: RequestInit`) | Confirm by running AC-003 |
| Fastify `inject` (light-my-request) | Bypasses `fetch`/`http.request`, so the attachment cannot reach it; a header must be given explicitly | Read; REPRO-01 (`expected 401 to be 200` on inject cases) | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/REPRO-01-fifteen-files-base.log` | Reproduction of the 15 failing files on base `310fc27452` | REQ-001, REQ-002, AC-001 | Current | Evidence, not behavior-defining |

## User Direction (2026-11-10)

- The user, in the Solution Designer's conversation: "for any errors due to token limit, we do not fix them. because i will only be able to get back my token limit tomorrow for codex"; "for other errors fix them".
- Meaning for this ticket: a failure caused by the user's Codex usage limit (a live Codex run refused for quota or rate limit) is recorded with its evidence as not run or blocked by the limit. It is not treated as a defect, worked around or retried today. Every other failure found while doing this ticket is fixed by its cause, in the usual way (TESTING.md Rule 9, Scope Guardrail).
- Impact: no live Codex call is planned (scripted runtime CLIs; paid live suites are not run). "Fix other errors" brings the non-credential failures found during the ticket into scope (SR-002: UC-004, REQ-009, REQ-010).

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Once the 15 files carry the credential and token, their product assertions pass (436's run showed only credential failures, and before 437 they passed) | Otherwise a product defect surfaces, reported by its cause | Implementation runs the 15 files; API/E2E runs the full suite | Partly verified: the 7 fetch-capture files pass once credentialed (PROBE-03); the other 8 by implementation |
| ASM-002 | The Agent Tools MCP host (its own port) ignores an `Authorization` header the attachment may add to loopback requests | `project-mutation-node-locality` and `project-task-search-model-unavailable` call it on loopback | Read: `src/agent-tools/mcp/` has no authorization handling; confirmed by running those files | Open (verified by implementation) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Include the gated suites with the same gap (BEH-002), or only the 15 default-run files? | The Task asks to check that no other suite has the gap | (a) only the 15; (b) also the gated suites. 10 gated files read with the same paths: 5 use the native live harness (fetch captured at construction), `autobyteus-anthropic-prompt-caching-live`, `agent-package-definitions-live-refresh`, `agy-skill-update-notice-roots` (fetch captured before the server starts), `mcp-run-session-cleanup`, `mcp-github-remote-live` (gateway without token) | Same cause, and the root-cause fix (REQ-005, the attachment in place before test code) repairs the capture cases without per-file edits; leaving gated suites broken would surface the same failure at the next gated run. **Include them (b)**; run the deterministic ones (scripted AGY), not the paid live ones | Solution Designer | Decided |
| DEC-002 | How does a test get the MCP gateway token? | A token must be presented (NA-12) | (a) set `AUTOBYTEUS_MCP_GATEWAY_TOKEN` in the node's environment; (b) read it as the owner does, from the owner route that feeds the MCP gateway panel | (b) follows NAS-25 (the owner copies the token from the panel), works the same for in-process and built nodes and across a restart, and needs no environment knob per start path. **(b)**; the mechanics are design's | Solution Designer | Decided |
| DEC-003 | Add a guard against a new test file talking to a node without a credential? | The failures went unnoticed for several releases and fail with obscure messages | (a) none; (b) runtime check in the attachment that throws on a 401 refusal (would break deliberate refusal tests); (c) remove the trap at its root (attachment in place before test code) plus a static check that flags composing an in-process node outside the shared start path, with a clear message | (c): the root-cause fix removes the largest class (9 of 15 files plus the gated ones fail only because the attachment is installed after they capture `fetch`); a narrow static check catches the next most likely copy (an in-process node composed directly), with no false positives on refusal tests. (b) rejected: it changes what deliberate refusal tests observe. **(c)** | Solution Designer | Decided |
| DEC-004 | Make the full server E2E suite a required check of every ticket? | It would have caught this at 437 | TESTING.md lists unit, integration, typecheck as the green suites; the full E2E run takes about 18 minutes (1103 s in 436's run) | Requiring it of every ticket is a cross-ticket cost decision outside this Task's direction: **not decided here**, recorded as a follow-up for the user. The narrower rule the team's project-documents rule requires (the check at the earliest stage that can reproduce this problem: a whole-suite run for a change to what every node request crosses or to the shared harness) is in scope as REQ-008 | Solution Designer (REQ-008); user (the every-ticket rule) | Decided (REQ-008 in scope; the every-ticket rule a follow-up) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | REPRO-01 |
| REQ-002 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-002, AC-003 | SCN-001, SCN-002 | REPRO-01 |
| REQ-003 | UC-002 | BEH-002 | AC-002 | SCN-002 | Gated inventory |
| REQ-004 | UC-001…UC-003 | BEH-003 | AC-004, AC-006 | SCN-003 | — |
| REQ-005 | UC-003 | BEH-004 | AC-005 | SCN-004 | — |
| REQ-006 | UC-001 | BEH-001 | AC-001 | SCN-001 | Full-suite runs |
| REQ-007 | UC-003 | BEH-004 | AC-007 | SCN-004 | — |
| REQ-008 | UC-003 | BEH-004 | AC-008 | SCN-004 | — |
| REQ-009 | UC-004 | BEH-006 | AC-009 | SCN-006 | DEL-01, DEL-02 |
| REQ-010 | UC-004 | BEH-006 | AC-010 | SCN-006 | API-10, API-10b |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001…SCN-004.
- Product and system constraints architecture must preserve: BEH-003 (no product change); deliberate refusal tests; credential never in evidence.
- Decisions intentionally deferred to architecture design: where the attachment is installed early; the gateway token helper and the inject credential shape; the guard's form and placement; per-file changes.
- Technical facts architecture should verify: early installation has no effect on unit/integration tests that register no port; the Agent Tools MCP host ignores an extra `Authorization` header (ASM-002); the MCP SDK sends `requestInit.headers`.
- Known feasibility or integration risks: a test that, once credentialed, fails for a product reason (ASM-001).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded (the user's, or yours within the direction with the user informed): `Yes` (Solution Designer within the direction; no `Needs user` decision)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
