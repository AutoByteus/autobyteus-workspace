# API/E2E test-code review — desktop signing trust

**CRR-003: Pass.** Both durable QA changes test the boundary they claim. Neither uses production signing material. No actionable test-code finding or follow-up. Next owner: Delivery Engineer; this pass does not close custody or authorize a release.

## Review basis

First proportional test review, round 3 in the ticket history, 2026-11-20. **Medium / High** unchanged. Trigger: API-REV-001 **Pass** (QA-reported **96.6%** for independently verifiable scope; broader validation required and executed). Source `291a6c0d33`, CRR-002 `3a693c7d4f`, evidence `6b97deb71e28d15dff339908c672472d9574527f`, branch `fix/desktop-signing-trust` → `origin/personal`.

Authorities/context: approved requirements and investigation SR-001, DS-001, ARCH-REV-001, IR-002 and their revision records, M1; CRR-002 source report and cumulative code-review history. Read QA coverage investigation, execution report, revision record and named execution evidence. Root TESTING.md and RELEASE.md apply; no conflicting guideline or closer scripts rule. No prior test findings; DR N/A. No implementation scorecard, size audit or repeated suite run.

## Cumulative durable delta

| Path | Change | Supported scenario, trigger and proof |
| --- | --- | --- |
| `scripts/desktop-package/desktop-trust-provision.test.mjs` | Updated | SCN-001/003: custody destination becomes occupied between initial inspection and claim. The test invokes real provisioning logic against the existing disposable history/settings fixture; it reserves the private temp-home destination during the history read. It requires the specific reservation refusal, zero recorded remote writes, and the original directory entry and contents intact. This complements the prior **remote claim** conflict test rather than duplicating it. |
| `scripts/tests/test_desktop_release_trust_boundary.py` | Added | SCN-004: a release operator invokes release, beta or prepare against an unofficial origin. All six combinations with/without no-push run the real shell and Node checker. Each must reach the origin-specific refusal with recovery text; after each, symbolic branch, local and bare-remote refs, tracked/untracked status and absence of FETCH_HEAD must match the clean baseline. A missing prerequisite or unrelated nonzero exit does not pass. |

No removed tests or product changes. Temporary read-only probes, packaging outputs and logs are evidence, not durable test files.

## Proportional checks

- **Organization, names and reuse — Pass.** Each change tests one boundary. The Node case reuses the established temp home, history reader and write recorder. The Python test groups equivalent CLI paths with labeled subtests and a common before/after snapshot.
- **Assertions and real entry points — Pass.** Exact production decisions are exercised: preservation before any provisioning write, and refusal before the release tree, refs or beta fetch change. The Python case establishes the unofficial-origin branch, not cryptographic validation of a real release; that different contract is covered separately by API-02/04.
- **Isolation and determinism — Pass.** The reservation is injected during the relevant read, without a sleep or concurrent process. The CLI fixture uses a temporary repo and file-only bare origin, isolated Git configuration, bounded subprocesses and no GitHub credentials. No real backup, founder password manager, tag push or hosted release needed.
- **Coverage and maintenance — Pass.** No stale, unexplained disabled or compatibility-only tests; no assertion weakened. API-01/02 logs record the new Node case within 74 passing tests versus 73 before the delta. API-03 independently exercised the new Python test with its six subcases. The changed assertions and logs were sufficient without another execution.

## Delivery boundary

F-CR-001 remains resolved. Independent public reads now distinguish the M1 provisioning receipt from the later Mac-owned signing witness (run 44685600710, attempt 2, tag v1.5.14-beta.2). Clean Linux packaging/server smoke was x64, unsigned; verification of **both** published signed records is not an independent ARM64 build. No future-settings guarantee is implied by the read-only snapshot.

**No open test findings.** Integration on personal, real founder-saved confirmation, designated custodian's removal/verification receipt and M2 remain outstanding per the latest evidence. Synthetic custody tests are not a substitute for that receipt. No production release, rotation, signing, dispatch or deployment authorized here.
