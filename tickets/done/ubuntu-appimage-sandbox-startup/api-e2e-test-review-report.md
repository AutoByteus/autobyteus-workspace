# API/E2E test-code review — protected Ubuntu AppImage

## Decision and scope

**Pass — CRR-008, 2026-11-19.** Reviewed the cumulative durable QA changes after **API-REV-004 Pass**. No actionable test-code finding. Next owner: **Delivery Engineer** for integrated delivery; this review did not merge or release anything.

- First successful-test review (round 8 in the cumulative review record). **Large / High** unchanged. Product `8f10fa9287`, CRR-007 source pass `cbbdd24b5c`, received QA evidence `105fa7579cfa22838ac465a79653c3a7932c3a18`. Branch `fix/ubuntu-appimage-sandbox-startup` → final target `personal`.
- Context: approved `requirements-doc.md` SR-012; `investigation-notes.md`, `solution-revision-record.md` through SR-016, DS-004 `design-spec.md`, ARCH-REV-004 architecture history, IR-006/007 implementation history, prior `code-review-report.md` CRR-007; cumulative `code-review-revision-record.md`. SR-015 governs isolated native CI. Delivery revision N/A. No prior test-review findings.
- Applied `api-e2e-coverage-investigation.md`, the current cases/AC ledger in `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, and project `TESTING.md`. No guideline conflict/discrepancy. **96.6% is QA's reported validation confidence**, not a score from this review. Broader validation was required and executed.
- No durable test was added in API-REV-004 itself. The earlier cumulative test is not exempt: it was added in `a6e3b04331` and extended in `b4e2610ded`. The final evidence commit did not change product or durable tests. Temporary guest drivers, fault probes, screenshots, CI receipts and ticket logs are execution evidence, not durable tests.

## Durable paths

| Path | Change and supported basis |
| --- | --- |
| `autobyteus-web/linux-install/cmd/writer/main_test.go` | Added, then extended. SCN-004 / BEH-004 (REQ-005/007, AC-004/008): the native writer must admit only eligible signed releases, stage without activation, activate a valid receipt and return an authenticated current identity even if the client missed the activation reply. That is the approved transaction contract, not a workflow invented by the test. |
| `TESTING.md` | Updated project guidance, not an executable test. SCN-005 / AC-003: observe the actual graphical recovery action separately from helper logs, rollback and data preservation. This matches the distinction that mattered in the real refusals. |

## Proportional checks

| Check | Result and evidence |
| --- | --- |
| Scenario grouping, names and navigation | **Pass.** One sequential writer transaction journey: peer/request refusal, signed stage and activate, consumed receipt/replay, writer reopen, restage and disconnected reply. Helpers separate signed payloads, transport and verified status. No unrelated UI or deployment work in the file. |
| Assertions and specificity | **Pass.** Tampered bytes must fail and leave the old signed digest; verified stage alone cannot change it; activation must change it to the expected candidate; consumed/reaped receipts return the typed refusal. After a lost reply, a new status request verifies the signature and must identify the final digest. An absent reply alone cannot pass the test. |
| Fixtures, isolation and determinism | **Pass.** Ephemeral keypair, inert per-version bytes, private temporary image/xattrs and Unix listeners; no actual installed path, account or persistent signer. Socket deadlines and handler completion bound the test; client half-close finishes the request without sleeps. Nonroot prerequisite is explicit and current execution actually ran (not skipped). |
| Real trigger at the tested boundary | **Pass.** Client sends protocol bytes over an actual Unix socket to production `handle`, which reads the kernel peer credentials and invokes the real store. A lost reply is modeled by closing the receive side while still sending the complete activation request. Wrong-peer control uses an intentionally different expected UID, not a mocked credential. It does **not** establish systemd enrollment, a separate OS account, actual GUI behavior or arbitrary fault timing. |
| Duplication, staleness and coverage match | **Pass.** The disconnected-reader addition distinguishes “commit without observed reply” from “no commit”; it doesn't duplicate the happy-path assertion or weaken it. No unexplained disablement or obsolete compatibility test. API-06c and current `evidence/API-06f-current-units.log` record the named test passing; controlled guest/CI cases provide the higher-layer evidence separately. No reviewer rerun needed. |

## Latest authoritative result

**Pass.** No open test findings, follow-ups or required test changes. No source scorecard or size audit was reopened. API-REV-004 independently resolves F-API-03/04 and F-CR-003; CRR-007 remains the source-review authority. Engineering AC-001–006 and AC-008 are supported **within the QA ledger's stated bounds**. AC-007 (integration into personal, final verification and cleanup) remains Delivery-owned.

Native ARM64 proof is packaging/server smoke, not graphical acceptance. Ubuntu desktop runs used test-owned x64 guests, synthetic work and disposable signing trust; prior two-update/fault proofs are reused only for their recorded bytes and unchanged logic. No production trust, publication or deployment implied.
