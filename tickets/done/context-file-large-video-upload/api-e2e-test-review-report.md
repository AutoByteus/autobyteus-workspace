# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API/E2E Pass (API-REV-001), durable tests changed in `de0250122`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003)
- Investigation Notes Reviewed As Context: via design spec (unchanged since CRR-001)
- Solution Revision Record Reviewed As Context: unchanged since CRR-001
- Design Spec Reviewed As Context: `design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md`
- Architecture Review Revision Record Reviewed As Context: unchanged since CRR-001
- Implementation Revision Record Reviewed As Context: IR-001 (unchanged)
- Original Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95% (post-repository 87%)
- Prior unresolved test-review findings rechecked: None (first test review). CR-001, a source-review finding, is still open and does not block.
- Project testing guideline(s) applied: root `TESTING.md` (test-file header convention, built server through `startBuiltTestServer`, clean environment for e2e folders, gates, probes own their stack, phone-bundle proof for renderer behavior the phone offers). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-004, SCN-007, SCN-008; QR-001, QR-002, QR-004)

Tests reviewed at `de0250122` (diff `80f958bc5..de0250122`, test files only; no source changed).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/context-files/context-file-size-limits-built-server.e2e.test.ts` | Added | AC-001..004, 006, 008, 013, 015; QR-001, 002, 004 | Limits as the production composition (`dist/app.js`) applies them over real HTTP | 7 default cases (BS-01..07) + gated BS-10 (`RUN_LARGE_CONTEXT_FILE_E2E`) |
| `autobyteus-web/tests/e2e/mobile-context-file-size-cases.mjs` | Added | AC-001, 004..008; REQ-005..009; ASM-001 (headless part) | Phone bundle, zh-CN: attach/send large video, per-limit lines, stale read → 413, cancel, link drop | MSP-53..55, own node `eta` |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated | — | Header entry + one call wiring the new cases | 8 lines |
| `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` | Updated | AC-004, AC-005; REQ-002, REQ-005 | CF-014: Server Settings page refuses invalid values; saved limits apply to an open composer's next pick (zh-CN) | Case list and header updated |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each file header lists its cases with AC/REQ IDs; case names state the outcome |
| Assertions prove approved requirements | Pass | Status + `code` + `maxBytes` on refusals; files on disk by size and SHA-256; exact zh-CN lines from the requirements copy; zero upload requests on a pre-check refusal; agent's recorded input lists the final absolute path under `Reference files:` |
| Fixtures/helpers reuse meaningful repetition | Pass | `test-support/live-e2e` start/cleanup and GraphQL helpers; one `streamUpload` builder (hash, abort, headers); phone cases use the probe's `runCase`/`serverAt`/`waitFor`/`assert` |
| Isolation and determinism fit the boundary | Pass | Own runtime roots, DB and `HOME` per server; small limits keep the default run cheap; dropped-socket cleanup polled with a deadline; the forwarder makes pacing and link loss deterministic on loopback. BS-* share one server in a fixed order and each case removes its drafts; BS-03 restores a value no later case depends on |
| Large files coherent and navigable | Pass | Each new file covers one surface |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests | Pass (minor note TR-001) | Gated BS-10 is skipped by a documented gate, not disabled |
| Coverage agrees with investigation and evidence | Pass | Matches the investigation rows API-02/03/04 and evidence API-02, API-03 |
| Test callers exercise an independently established scenario | Pass | Every case maps to a SCN in the requirements |
| Each test enters through its scenario's real trigger | Pass | Real file input on the phone bundle, real pairing, real Server Settings page, GraphQL `updateServerSetting` (the page's own transport), raw multipart over TCP. Two scripted setups, both justified: (a) MSP-54 answers the phone's single limits read with the earlier limit. The real trigger is a settings change between the read and the upload, and the stub only fixes that timing; the node's 413 and the rendered line are real. (b) MSP-55's forwarder stands in for a phone losing its network, because Chrome's throttle does not slow loopback and Chrome retries a POST once on a reset. BS-02 shows the phone credential is really used: a forged credential sent the same way is refused, so the owner credential attachment does not replace the explicit header |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 (minor, non-blocking) | `context-file-size-limits-built-server.e2e.test.ts` `pairPhone` | `exchange.credential ?? exchange.accessToken ?? exchange.token`: the exchange route returns `credential` (`remote-access/domain/models.ts:81`; the other server tests read `.credential`). The two fallbacks guess at field names that don't exist. The `typeof … === "string"` assertion keeps the test correct either way | Read `exchange.credential` only, the next time the file is touched | Local Fix / `api_e2e_engineer` (does not block) |

## Follow-ups

- Follow-ups this review added: None. F-001 (the web `docs/settings.md` wording) is a documentation item that the API/E2E engineer already gave to delivery.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the four above
- Unresolved finding IDs: TR-001 (minor, does not block); CR-001 (source, minor, does not block, implementation engineer)
- Recommended Recipient: `delivery_engineer`
- Notes: no tests were rerun; the assertions could be judged from the diff and API-02/API-03 evidence. The phone-hardware checks and the real-provider turn remain unverified (vault not set up; no Android device), as the execution report records. RC-001 is delivery's.
