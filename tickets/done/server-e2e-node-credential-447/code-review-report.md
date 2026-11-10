# Code Review Report — server-e2e-node-credential-447

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001; REQ-003, REQ-005, REQ-007, BEH-002, Non-Goals)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (gated-suite census row, `:55`; fixture child row, `:52`)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001)
- Design Spec Reviewed As Context: `design-spec.md` (Current-State Read form table, D5, D6, D7, Change Scope, Intentional deferrals)
- Supplemental Task Artifacts Reviewed As Context: None
- Relevant Solution Revision IDs: SR-001
- Design Review Report Reviewed As Context: N/A — direct route (Medium / Low), no architecture review
- Architecture Review Revision Record Reviewed As Context: N/A
- Relevant Architecture Review Revision IDs: N/A
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IMP-05 gated scripted-AGY run)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `N/A` (failure-origin round)
- Review Scope Evidence (round >1): N/A
- Trigger: API/E2E round 1 (API-REV-001) Fail on API-11
- Prior Review Round Reviewed: None
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed (failure-origin entry point): `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (failure-origin entry point): `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed (failure-origin entry point): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record Reviewed (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- Failing Scenario IDs: API-11 (REQ-003 / BEH-002 / SCN-002)
- Exact Failing Commands / Execution Mode: `env -i PATH HOME=<resolved temp> TMPDIR NO_COLOR=1 RUN_CODEX_E2E=1 RUN_CODEX_NATIVE_POLICY_LIVE=1 CODEX_NATIVE_POLICY_AUTH_FILE=<temp placeholder> CODEX_NATIVE_POLICY_BINARY=<stand-in answering --version> CODEX_NATIVE_POLICY_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts --no-watch` (no model call, no real Codex)
- Failure Evidence Paths: `evidence/api-e2e/API-11-codex-native-fixture-probe.log` (`:182` "Node request refused NODE_CREDENTIAL_REQUIRED /graphql from 127.0.0.1"), `evidence/api-e2e/API-11-codex-native-fixture-receipt.json` (phases `["owned built Studio ready"]`; `401 !== 200` at fixture `:65` via `:145`, `:148`)

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception`
- Classification evidence or correction required: None. The remedy adds two test files to the change and one TESTING.md sentence, all test code / docs, within the existing harness owners; Medium / Low stands.

## Review Scope

- Changed implementation and behavior reviewed: how the gated Codex native-policy suite's fixture child reaches its own node; the existing D5 mechanism and its helper; the guard's coverage.
- Files / areas reviewed: `autobyteus-server-ts/tests/fixtures/codex-native-multi-agent-system.mjs` (`:9-43`, `:63-66`, `:139-148`), `tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts` (`:61-69`), `tests/e2e/helpers/built-server-launch-credential.ts`, `tests/e2e/shutdown/busy-run-stop-now-fixture.mjs` (`:17`, `:65-70`), `tests/fixtures/project-mutation-http-node.mjs`, `src/node-access/launch-credential-intake.ts`, `tests/architecture/e2e-node-credential-paths.test.ts` (header), `TESTING.md` Node credentials (`:191-209`); census of node-composing `.mjs` under `tests/fixtures` and `tests/e2e`, and of `spawn(` children in `tests/e2e`.
- Explicit exclusions: no general re-review of the suite or the other 15/10 files; FU-002…FU-004 (already recorded by API/E2E, out of scope).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-003 — gated suites that reach their node by the same paths present the credential the same way. The requirement states the rule; the census (`investigation-notes.md:55`) is its evidence, not its boundary. The Codex native-policy suite is a gated server E2E suite whose fixture child composes a node and calls it: form 3 (fixture child node) in DS-003's terms.
- Design-spec behavior map verified against the implementation: DS-003 assumes the *parent* sends the requests ("child node answers the test's request"); D5's helper attaches the credential in the parent process. In this fixture the *child* sends its own GraphQL requests (`gql`, `:63-66`), so it needs the attachment in its own process. The design's mechanism covers it (`attachOwnerCredentialToLoopback`, as `busy-run-stop-now-fixture.mjs:17, 69-70` already does); the census and file mapping missed the file.
- Design review report and round confirmed: N/A (direct route)
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None. BEH-002 already covers it; this is a missed instance, not a new behavior.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| BEH-002 | Confirmed | Test spawns fixture child with an explicit env (`:61-63`) holding no `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL` → child composes `buildStudioServer` from dist (`:37-43`) → listens (`:141`) → `/rest/health` 200 (exempt) → `gql` POST `/graphql` from the child's own `fetch` (`:64`), no attachment installed in the child → gate refuses 401 `NODE_CREDENTIAL_REQUIRED` | — |
| BEH-003 | Confirmed (unchanged) | The gate refused as designed; no product change needed | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-002 | BEH-002, REQ-003, NA-1 | Operational | Engineer running a gated suite | Prove native Codex policy on a real built Studio | `RUN_CODEX_E2E=1 RUN_CODEX_NATIVE_POLICY_LIVE=1` and the command in the test file header (`:10-12`) | Normal | As BEH-002 row above | Today: 401 at the first GraphQL call, before any Codex use; expected: requests admitted | Requirements SCN-002; test file header; API-11 log `:182` | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Fixture child calls its own node with no credential: its env lacks the launch credential and it installs no attachment | SCN-002, REQ-003 | Setting the suite's documented gates | Child `gql` → gate 401 → whole suite fails before Codex | API-11 log `:182`, receipt; code `:61-63`, `:63-66`; no credential code anywhere in the fixture | Promote | This ticket (REQ-003 states the rule; the gap is the same cause the ticket fixes) | Two-file test fix with the existing D5 mechanism (CR-001) |
| C-02 | Order constraint: the launch credential must be read in the child before the dist composition is imported | SCN-002, NA-15 (intake deletes the env var) | Same | `launch-credential-intake.ts:10-11` deletes `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL` on evaluation; it is reached by the fixture's `import(".../build-studio-server.js")` at `:37` | Probe CR-P1 (below): env var present after each of the fixture's imports `:9`, `:13-19`; consumed by the `build-studio-server.js` import | Promote | This ticket (part of CR-001) | Read and attach before `:37`; reading after it yields `undefined` |
| C-03 | Guard should also read `tests/fixtures/` | REQ-005, AC-005, Non-Goals, design Intentional deferrals | — | Rule 1 (`buildStudioServer(` only in the in-process helper) would flag `project-mutation-http-node.mjs`, a correct child node whose parent sends the requests; a correct rule would need "composes a node *and* calls it *without* attaching", a new heuristic | Guard header (`e2e-node-credential-paths.test.ts:14-15` names spawned nodes as not detected); requirements Non-Goals ("not every conceivable way"); design: "a new spawned child without the launch credential, is not detected statically (Non-Goals); TESTING.md names [it]" | Reject | — | Extending the guard would produce a false positive or new heuristic machinery outside the approved guard. The approved defence for this form is the TESTING.md rule, which needs the sentence in CR-002 |
| C-04 | TESTING.md Node credentials does not say that a fixture child that sends its own requests attaches the credential in its own process | REQ-007, AC-007; team rule "when a later stage catches a problem" | — | The rule at `:200-201` tells the *suite* to add `builtServerLaunchEnvironment()` to the child env; followed literally here, the child would still send unattached requests | `TESTING.md:199-201`; this failure | Promote | This ticket (the local check for a problem a later stage caught; REQ-007 paragraph this ticket owns) | One sentence in the same bullet (CR-002) |
| C-05 | Other node-composing or spawned children with the same shape | REQ-003 | — | Census: node-composing `.mjs` are only `project-mutation-http-node.mjs` (parent calls; credentialed by D5), `busy-run-stop-now-fixture.mjs` (attaches itself, `:17, 69-70`) and this fixture; inline child scripts in `.ts` files fall under guard rule 1; `spawn(` children in `tests/e2e` either use `builtServerLaunchEnvironment()`, are built `dist/app.js` started with it, or are non-node workers | `grep -rln "buildStudioServer\|build-studio-server\|dist/app.js"` over `tests/fixtures`, `tests/e2e` `*.mjs`; `grep "spawn("` over `tests/e2e`; API-10 (59 gated AGY suites, none refused for a credential) | Reject | — | No other instance found |

Probe CR-P1 (reviewer, read-only, scratch script removed): in `autobyteus-server-ts`, set `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL=probe-value`, then import the fixture's dist modules in its order. Output: `config/app-config-provider.js present`, each of `:13-19`'s modules `present`, `compositions/build-studio-server.js CONSUMED`.

## Findings

### CR-001 — Gated Codex native-policy fixture child sends its own GraphQL requests without the owner credential (`Local Fix`, implementation)

- Protects: REQ-003, AC-002's intent (a gated run does not fail for a missing credential), BEH-002; candidate C-01, C-02.
- Evidence: API-11 log `:182` and receipt; fixture `:37-43` composes the node, `:63-66` `gql` posts `/graphql` with the child's `fetch`; test `:61-63` child env has no launch credential; no attachment in the fixture.
- Cause: form 3 with the child as the client. D5 attaches the credential in the parent, which here sends nothing to the node; the child needs its own attachment. The census (`investigation-notes.md:55`) searched for kept `fetch` and gateway transports and did not list this suite, so the design's file mapping and the implementation did not include it.
- Required action (same shape as `tests/e2e/shutdown/busy-run-stop-now-fixture.mjs:17, 69-70`):
  1. `codex-native-multi-agent-disabled.e2e.test.ts`: import `builtServerLaunchEnvironment` from `../helpers/built-server-launch-credential.js` and add `...builtServerLaunchEnvironment()` to `env` (`:61-63`), so the child starts as the desktop starts its node (NA-5).
  2. `tests/fixtures/codex-native-multi-agent-system.mjs`: import `attachOwnerCredentialToLoopback` from `../../../test-support/node-access/owner-credential-attachment.mjs`; **before** the `build-studio-server.js` import at `:37` (C-02; simplest right after the static imports), read `process.env.AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL`, fail with a clear message (never the value) if it is missing, and call `attachOwnerCredentialToLoopback(credential)`.
  3. Keep the credential out of the receipt, log and evidence (AC-006). The intake still deletes it from `process.env` at `:37`, so the Codex child the node starts does not inherit it.
- Verification without Codex (user direction respected): rerun API-11. Expect phases past `"owned built Studio ready"` (agent/team definitions created), no `NODE_CREDENTIAL_REQUIRED` in the log, and the run then stopping at the stand-in Codex binary, which is expected for this probe. Grep evidence for `own_` (0 matches).

### CR-002 — TESTING.md Node credentials does not cover a fixture child that calls its own node (`Local Fix`, implementation)

- Protects: REQ-007 / AC-007 (the paragraph this ticket wrote), team rule "When a later stage catches a problem" (the check goes in the testing guide). Candidate C-04.
- Evidence: `TESTING.md:199-201` names only `builtServerLaunchEnvironment()` in the child's environment; that is correct when the parent sends the requests (`project-mutation-node-locality`) but not when the fixture child sends them.
- Required action: in the same bullet, one short global sentence: a fixture that sends requests to the node it composes attaches the launch credential in its own process (`attachOwnerCredentialToLoopback`, `test-support/node-access/owner-credential-attachment.mjs`), reading it before it imports the server composition, which consumes it. Commit as its own `docs(testing): …` commit (TESTING.md "When this file may be updated").

No guard change (C-03 rejected): extending rule 1 to `tests/fixtures/` would flag a correct fixture, and a narrower rule is outside the approved guard (Non-Goals, design deferral).

## Follow-ups

- Follow-ups this review added: None. FU-002…FU-004 (API/E2E) stand as recorded.

## Classification

- `Local Fix`, owned by the implementation engineer (CR-001, CR-002). The ticket's deliverable is the harness and test-file changes; this is a missed instance of the same cause, fixed with the design's own mechanism and an existing repository pattern. No requirement or design decision changes. Failure origin: an incomplete census at the design stage carried into implementation; not detectable by the guard by design (C-03); no source review was on this route.
- Design-artifact note (non-blocking, for the Solution Designer at its next touch of the package): the design spec's form table, gated-files list and Final File Responsibility Mapping, and `investigation-notes.md:55`, do not list this suite. The implementation handoff should record the two added files under REQ-003 / D5 so the package stays traceable.

## Recommended Recipient

- `/software_engineering_team/implementation_engineer` (API/E2E failure-origin review confirmed an implementation-owned defect). After the fix: implementation self-check (API-11 probe), then API/E2E reruns API-11 and the guard/typecheck checks; then the proportional test-code review.

## Residual Risks

- The suite's live half (real Codex, two model turns) is not run in this ticket (user direction: no Codex today; Non-Goals). The fix is proven only to the stand-in Codex boundary; the requests after it use the same attached `fetch`.
- A future fixture child that calls its own node without attaching is still not statically detected (approved residual risk); CR-002's sentence is its defence.

## Latest Authoritative Result

- Review Decision: Fail (failure origin confirmed)
- Review Entry Point: API/E2E Failure-Origin Review
- Supported Product Scenario Gate: Pass
- Material-Premise Gate: Pass (C-02 confirmed by probe CR-P1)
- Score Summary: N/A (failure-origin round)
- Failure Origin: implementation defect (test code this ticket owns): gated fixture child missing from the REQ-003 census; `Local Fix`
- Recommended Recipient: `/software_engineering_team/implementation_engineer`
- Notes: guard extension to `tests/fixtures/` not recommended (C-03).
