# API/E2E Test Review Report — autobyteus-316 (cross-runtime-resume)

## Review Meta

- Review Round: 1 (after API-REV-002, the second API/E2E round; the first API/E2E round failed and went through failure-origin review)
- Trigger: API/E2E validation Pass (API-REV-002); durable tests in `870b075fb4` and `c5043ff766`, probe and reports in `cfe925d5fc` (head)
- Requirements Doc / Investigation Notes / Solution Revision Record / Design Spec Reviewed As Context: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md` (SR-004), `design-spec.md`; supplement `run-runtime-switch-contract.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-001…004)
- Implementation Revision Record: `implementation-revision-record.md` (IR-001, IR-002)
- Original Code Review Report: `code-review-report.md` (CRR-003 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- API/E2E Result: Pass
- Final Validation Confidence: 94.9% (post-repository 90.3%)
- Prior unresolved test-review findings rechecked: None (first test-review round)
- Project testing guideline(s) applied: `TESTING.md` (test-owned roots, private HOME and database, sanitized environment, gated live suites, no run against real data). No conflict or discrepancy found.
- Supported Product Scenario Basis Confirmed: `Yes`. Triggers are the user's actions (settings save, first message, page reload, server restart at a pending switch) and the existing activation retry after a failed attempt. The failure injections (a folder where the segment file goes; a Grok process that ends; the active file cut back to the marker) reproduce already-established scenarios; each case says so in its comment and none of them establishes a scenario by itself.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts` | Added in the first API/E2E round, extended here (RS-01 hard assertions and new wording; new RS-04…RS-08); 649 lines | REQ-001, 002, 010, 011, 013, 014; AC-001, 002, 009, 010; I-3, I-5, I-7, I-8, I-10, I-11 | The agent runtime switch through the built server: native pair with reload chat, stopped-run settings, host with a copy, restart, failed attempt with a native candidate, Grok as target, Grok failure after a durable switch, pending native model edit | Header documents purpose, gates (`RUN_AGY_FAILURE_E2E`, `ANTIGRAVITY_CLI_COMMAND`, `dist/`), command; one scenario per case |
| `autobyteus-server-ts/tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts` | Updated (spy follows file descriptors; two assertions about the manifest changed) | the earlier recent-run projection ticket's bounded-read rule vs. I-10 | The projection reads bounded files only | See O-1 below |
| `autobyteus-web/tests/e2e/runtime-switch-probe.mjs` | Added (265 lines) | REQ-001, 002, 011, 014; AC-001, 002, 010 | Real browser → Nuxt dev → built backend journey RSW-01: settings offer the runtimes, hint and Save bar, marker live, reload shows earlier conversation and marker | Owned temp root, free ports, sanitized env, cleanup in `finally`, `--keep` for inspection |
| `autobyteus-web/package.json` | One script line `test:e2e:runtime-switch` | | Entry for the probe | |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Cases RS-01…RS-08 each name the outcome; the long header lists purpose, gates and command |
| Assertions prove approved requirements instead of incidental details | Pass | Exact record ids per segment (I-7), marker by key (I-3, I-5), metadata equal to the saved original after an undo, byte-identical previous file after a failed attempt, notice position and count from the echoed inputs, reload chat order. The expected values come from the test's own earlier reads, not from the code under test. Mutation checks (watermark ignored, discard skipped, hand-over never pending, pending model counted as current, chat reader active-file only) each fail the intended cases |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | `createRun`, `talk`, `save`, `metadata`, `activeRecords`, `completeSegments`, `obstructArchive` helpers shared across cases |
| Isolation and determinism | Pass | Child server on a synthesized root with private HOME and database; models are scripted (LM Studio stand-in, scripted Antigravity CLI, recorded Grok traffic); waits are condition-based; the server restart is explicit; cleanup in `afterAll`. The first three browser-probe runs failed on the API/E2E engineer's own waits and were fixed before the kept run |
| Large files coherent and navigable | Pass | One surface (the switch on the built server) in 649 lines; the browser probe is its own file |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests | Pass | Gates are documented skips (live-style prerequisites), not disabled tests. Optional tidy: the header's case list stops at RS-06; RS-07 and RS-08 are missing from it |
| Added/updated coverage agrees with coverage investigation and execution evidence | Pass | Eight server cases, the browser probe and the mutation checks match the execution report and the R2 evidence logs |
| Test callers and fixtures exercise an independently established supported scenario | Pass | See the scenario basis above; the markers, segments and notices are asserted as consequences of the user's save and first message |
| Each test enters through its scenario's real trigger | Pass | Settings mutation, WebSocket send, `getRunProjection`, real browser clicks and typing, real server stop/start. Acknowledged simplifications: RS-04 case B cuts the active file back to the marker to stand for the crash window (the comment says so; opening a stopped run does not activate a switch); RS-05/06 put a folder where the segment file goes to make the real archive step fail (the established "activation fails and is sent again" scenario) |

### O-1: the earlier ticket's `recent-run-projection-graphql.e2e.test.ts`

Accepted. Two things changed:
1. The read spy follows file descriptors back to the path they were opened from. This is a fix of the spy: the chat's active-file snapshot reads through a descriptor, which the path-only spy did not see; the assertion that the active file is read is unchanged.
2. Two assertions "the first hydration reads the active file and not the manifest" became "reads only the active file and the manifest; never a compaction segment, nothing else". Both tests still assert that the archive (compaction segment) is not read, that the hashes of all files are unchanged, and the time bound. The manifest is read to find a switched run's `runtime_switch` segments (design §3.7, I-10); it is a small file and the earlier ticket's rule that matters (no large archive is read on first hydration, compaction shows only what follows it) is kept and now stated stricter than before (no other file at all). This is the accepted cost of the design, not a weakened check.

## Findings

None.

Optional tidy, not a finding: add RS-07 and RS-08 to the header of `runtime-switch-native-built-server.e2e.test.ts` when next touched.

## Follow-ups

- Follow-ups this review added: None (FU-009 from CRR-001 unchanged).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the four listed above
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: Production code is unchanged since `1bc6f85506` (confirmed: `git diff 25c1acb705..cfe925d5fc` touches only tests, the probe, `package.json` and ticket documents). Residual risks from API/E2E: the Electron shell, the native and Grok runtimes on real providers, a real process kill (emulated) and the optional `begin` hardening were not covered; confidence is 94.9% against the 95% default target. Delivery carries the release-note and docs points: GraphQL clean cut (`updateStoppedAgentRunSelection`, `runtimeKind` input), the switch begins at the first message after the save, the archived `runtime_switch` segments, and the chat reading them.
