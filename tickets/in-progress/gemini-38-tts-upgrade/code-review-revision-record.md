# Code Review Revision Record — Gemini 3.8 TTS upgrade

The latest applicable `code-review-report.md` or `api-e2e-test-review-report.md` is authoritative for its entry point. This record indexes completed code-review results.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| `CRR-001` | `code-review-report.md` | Initial implementation review / `IR-001` | N/A | Fail / Local Fix | `CR-001` |
| `CRR-002` | `code-review-report.md` | Source re-review / `IR-002` | Fail / Local Fix | Pass | `CR-001` resolved |
| `CRR-003` | `code-review-report.md` | API/E2E failure-origin / `API-REV-001`, `API-06` | Source Pass | Fail / Unclear | None; `CR-001` stays resolved |
| `CRR-004` | `code-review-report.md` | API/E2E failure-origin / `API-REV-003`, `API-06` | Fail / Unclear | Fail / Unclear, AI Studio quota category | None; `CR-001` stays resolved |
| `CRR-005` | `code-review-report.md` | API/E2E failure-origin / `API-REV-004`, `API-06` | Fail / Unclear | Fail / Unclear, repeated Vertex Express 404; wait | None; `CR-001` stays resolved |
| `CRR-006` | `api-e2e-test-review-report.md` | Proportional successful-test review / `API-REV-005` | No prior test-review result | Fail / Local Fix | `TR-001`; `CR-001` stays resolved |
| `CRR-007` | `api-e2e-test-review-report.md` | Proportional test re-review / `API-REV-006` | Fail / Local Fix | Pass | `TR-001` resolved; `CR-001` stays resolved |

## Revision Entries

### CRR-001 — Initial source-review baseline

- Canonical review report updated: `code-review-report.md` in this ticket directory.
- Review entry point and round: Implementation Review, round 1.
- Triggering role/report/finding: `/implementation_engineer`; `implementation-handoff.md`; no prior finding.
- Relevant solution revisions: `SR-004`, `SR-006`; architecture review: `ARCH-REV-002`; implementation: `IR-001`; API/E2E and delivery: N/A.
- Prior authoritative result: N/A. Current authoritative result: **Fail / Local Fix**.
- Result rationale: Current-only 3.8 catalog, startup setting migration, structured speech metadata, SDK locks, and non-TTS boundaries align with approved design. The WAV validator accepts malformed `fmt` values and returns an unplayable output as success, contrary to `AC-004`.
- Supported scenario/material premise basis: `SCN-002/003` and the explicit playable-or-malformed-error contract promote `CAND-001`; unsupported crash/blank-renderer premises do not drive findings.

#### Prior Finding Resolution

None.

- New/remaining findings: `CR-001`.
- Material score/classification: API/E2E readiness 8.7, runtime correctness 8.2; Local Fix to implementation owner.
- Recommended recipient: `/implementation_engineer`.
- Remaining uncertainty: Real provider and rendered Settings execution remain API/E2E gates after source correction.

### CRR-002 — WAV-format Local Fix verified

- Canonical review report updated: `code-review-report.md` in this ticket directory.
- Review entry point and round: Implementation Review, round 2.
- Triggering role/report/finding: `/implementation_engineer`; current `implementation-handoff.md`, `implementation-revision-record.md` (`IR-002`); `CR-001`.
- Relevant solution revisions: `SR-004`, `SR-006`; architecture review: `ARCH-REV-002`; implementation: `IR-001/002`; API/E2E and delivery: N/A.
- Prior authoritative result: **Fail / Local Fix** (`CRR-001`). Current authoritative result: **Pass**.
- Result rationale: `IR-002` added supported PCM `fmt` and frame-alignment checks before save, plus seven malformed-WAV cases. Reviewer reran 21/21 audio adapter tests, TS/server builds, and the original 46-byte zero-channel/rate probe; the probe now throws instead of returning a URL. Unaffected prior source/structural evidence remains valid.
- Supported scenario/material premise basis: `SCN-002/003` and `AC-004/006` unchanged; `CAND-001` resolved, no new material premise.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `CR-001` | Open / Local Fix | Resolved | `CRR-001`, `IR-002` | `gemini-audio-client.ts:53–91`; seven malformed-WAV tests; focused 21/21 test run and current-built-code original probe rejects invalid WAV. |

- New or remaining findings: None.
- Material score/classification: API/E2E readiness 8.7 → 9.2; runtime correctness 8.2 → 9.3; overall 9.2 → 9.4; Pass.
- Recommended recipient: `/api_e2e_engineer` primary, `/implementation_engineer` informational.
- Remaining uncertainty: Real 3.8 and existing Gemini LLM provider results, plus rendered Settings, remain API/E2E-owned gates.

### CRR-003 — Vertex Express live-audio failure origin

- Canonical review report updated: `code-review-report.md` in this ticket directory.
- Review entry point and round: API/E2E Failure-Origin Review, round 3; **not** proportional successful-test-code review.
- Triggering role/report/scenario: `/api_e2e_engineer`; `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`; `API-06 / SCN-004 / AC-007`, with live-output proof for `AC-004/009` incomplete.
- Relevant solution revisions: `SR-004`, `SR-006`; architecture review: `ARCH-REV-002`; implementation: `IR-002`; API/E2E: `API-REV-001`; delivery: N/A.
- Prior authoritative result: `CRR-002` source **Pass**. Current authoritative result: **Fail / Unclear** for focused live-failure origin; source Pass is not revoked.
- Result rationale: After explicit safe import, Vertex Express 3.8 audio preflight was READY but two provider-stage calls returned HTTP 404/model-unavailable and no audio. Same credential/mode produced a real LLM response. Exact audio ID, adapter path and installed-SDK request were verified deterministically; no local WAV/config error or demonstrated source defect. AI Studio credential was absent, so availability cause remains unresolved.
- Supported scenario/material premise basis: `SCN-002/004` and approved `AC-007` are valid. `FO-001/002` rejected as defect attribution; `FO-003` held for evidence. No speculative fallback or change to approved runtime policy.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `CR-001` | Resolved | Resolved | `IR-002`, `CRR-002`, `API-REV-001` | Deterministic malformed-WAV suite still passes; API-06 failed at provider-stage 404 before response validation. |

- New or remaining finding IDs: None.
- Material score/classification: No source-score change. Focused classification **Unclear** for external access; failed live AC remains failed.
- Recommended recipient: `/solution_designer`.
- Remaining uncertainty: Which supported credential/endpoint grants 3.8 TTS, and whether user wants an evidence-backed solution revision if no access is available. Real speech output has not passed; successful-test review not yet triggered.

### CRR-004 — AI Studio post-top-up quota rejection

- Canonical review report updated: `code-review-report.md` in this ticket directory.
- Review entry point and round: focused API/E2E Failure-Origin Review, round 4; no successful-test-code review.
- Triggering role/report/scenario: `/api_e2e_engineer`; latest `api-e2e-execution-coverage-report.md` and ledger events 32–39; `API-REV-003`, `API-06 / SCN-004 / AC-007`.
- Relevant solution revisions: `SR-004`, `SR-006`, access updates `SR-007/008`; architecture review `ARCH-REV-002`; implementation `IR-002`; API/E2E `API-REV-001–003`; delivery N/A.
- Prior authoritative result: `CRR-003` Fail / Unclear for separate Vertex Express 404; `CRR-002` source Pass. Current result: **Fail / Unclear** for AI Studio 429/quota; source Pass unchanged.
- Result rationale: After user-reported top-up, fresh explicit isolated import configured AI Studio and preflight was READY, yet exact 3.8 TTS call failed twice with no audio; category-only retry returned HTTP 429/quota. This repeats `API-REV-002` AI Studio audio and LLM 429 category. No round-3 source or durable test changes. The provider quota category is observed, but precise project/model/rate/spend/billing condition is not. No implementation/test defect or source-review gap is demonstrated.
- Supported scenario/material-premise basis: approved `SCN-002/004`; `FO-004` rejected as defect attribution; `FO-005` promotes only observed quota-category rejection while holding exact cause. Prior Vertex 404 remains separate and unresolved.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `CR-001` | Resolved | Resolved | `IR-002`, `CRR-002`, `API-REV-003` | Failure occurred before provider audio response/WAV validation; no source edit or contrary regression evidence. |

- New or remaining finding IDs: None.
- Material score/classification: No source-score change. API/E2E stays Fail (82.1%); focused classification Unclear for exact external quota state.
- Recommended recipient: `/solution_designer`.
- Remaining uncertainty: AI Studio project linked to imported key needs verified billing/tier and available model/rate/spend quota (or alternative authorized project); no successful 3.8 speech. Round-2 durable tests await successful API/E2E result for proportional review.

### CRR-005 — One current Vertex Express recheck repeats model-unavailable 404

- Canonical review report updated: `code-review-report.md` in this ticket directory.
- Review entry point and round: focused API/E2E Failure-Origin Review, round 5; no successful-test-code review.
- Triggering role/report/scenario: `/api_e2e_engineer`; latest `api-e2e-execution-coverage-report.md`, ledger events 40–45, `API-REV-004`; `API-06 / SCN-004 / AC-007` and live portions of `AC-004/009`.
- Relevant solution revisions: `SR-004`, `SR-006`, evidence/access coordination `SR-007–009`; architecture review `ARCH-REV-002`; implementation `IR-002`; API/E2E `API-REV-001–004`; delivery N/A.
- Prior authoritative result: `CRR-004` Fail / Unclear for distinct AI Studio 429; prior Vertex `CRR-003` Unclear. Current result: **Fail / Unclear**, one current Vertex Express 404; `CRR-002` source Pass remains intact.
- Result rationale: After fresh explicit dry-run/TTY import to isolated vault, one user-authorized exact 3.8 Flash TTS Vertex Express call reached provider and returned HTTP 404/model-unavailable, no audio. This repeats API-REV-001’s route-specific category but does not prove global Vertex unavailability or a code defect. No source/durable test edit this round; temporary diagnostic reverted; prior real Vertex LLM Pass does not prove TTS access. User explicitly directed stop/wait if same error, so no further paid retry is warranted.
- Supported scenario/material-premise basis: approved `SCN-002/004`; `FO-006` rejected as demonstrated code defect, `FO-007` promotes only observed provider rejection and holds exact cause, `FO-008` rejects another immediate retry. AI Studio 429 remains a distinct historical cause.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `CR-001` | Resolved | Resolved | `IR-002`, `CRR-002`, `API-REV-004` | Failure remains before provider audio response/WAV validation; no source change or contrary regression evidence. |

- New or remaining finding IDs: None.
- Material score/classification: No source-score change. API/E2E remains Fail / 82.1%; focused classification Unclear for exact external Vertex Express access.
- Recommended recipient: `/solution_designer`.
- Remaining uncertainty: exact provider rollout/entitlement/endpoint state for this route/key; no live 3.8 audio pass. Honor user's stop/wait instruction until provider/operator evidence and new user direction. Round-2 durable tests still await successful API/E2E for proportional review.

### CRR-006 — Successful Vertex TTS run; shared audio test assertion needs format guard

- Canonical review report updated: `api-e2e-test-review-report.md` in this ticket directory; `code-review-report.md` remains the authoritative historical source/failure-origin report and was not reopened.
- Review entry point and round: proportional successful API/E2E test-code review, round 1, code-review revision 6.
- Triggering role/report/scenario: `/api_e2e_engineer`; `api-e2e-execution-coverage-report.md` (`API-REV-005` Pass / 95.0%), `API-06 / SCN-004 / AC-007`, cumulative durable test changes from API-REV-001/002.
- Relevant solution revisions: `SR-004`, `SR-006`, `SR-011` (access/evidence-only `SR-007–010` indexed); architecture review `ARCH-REV-002`; implementation `IR-002`; API/E2E `API-REV-001–005`; delivery N/A.
- Prior authoritative result: `CRR-005` failure-origin Fail / Unclear for a historical one-call Vertex 404; `CRR-002` source Pass. No earlier successful-test review result. Current authoritative test-review result: **Fail / Local Fix**; API-REV-005 live Vertex Express speech Pass remains intact.
- Result rationale: The corrected GraphQL selection matches the schema, the new AI Studio audio scenario is correctly scoped, and the exact Vertex 3.8 audio file assertion passed at the real provider boundary. However, the new RIFF/WAVE assertion is unconditional in the shared audio branch, whereas existing supported `openai.audio` uses factory-default MP3; it would turn a successful OpenAI live speech result into a false test failure. This is bounded test-code quality/correctness, not an implementation defect.
- Supported scenario/material-premise basis: approved `SCN-002/004` and preserved non-Google choice (`AC-003`), plus the existing OpenAI audio factory/client default-MP3 contract. Forward path and evidence are in `TR-001`; no test fixture is used to prove the scenario by itself.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `CR-001` | Resolved | Resolved | `IR-002`, `CRR-002`, `API-REV-005` | One real Vertex Express 3.8 TTS call returned adapter-validated nonempty RIFF/WAVE; no contrary source regression. |

- New or remaining finding IDs: `TR-001` open, API/E2E-owned.
- Material score or classification changes: no source-score or API confidence change; proportional test review Fail / Local Fix.
- Recommended recipient: `/api_e2e_engineer`.
- Remaining risks or uncertainty: shared OpenAI live branch was not paid-run during this review; source-level default-MP3 contract is sufficient to establish the false assertion. Future provider availability and historical AI Studio quota remain separate.

### CRR-007 — Provider-aware audio assertions verified

- Canonical review report updated: `api-e2e-test-review-report.md` in this ticket directory; `code-review-report.md` remains the source/failure-origin report and was not reopened.
- Review entry point and round: proportional successful API/E2E test-code review, round 2, code-review revision 7.
- Triggering role/report/finding: `/api_e2e_engineer`; `api-e2e-execution-coverage-report.md` (`API-REV-006` Pass / 95.0%); `CRR-006 / TR-001`.
- Relevant solution revisions: `SR-004`, `SR-006`, evidence-only `SR-011/012` (historical `SR-007–010` retained); architecture review `ARCH-REV-002`; implementation `IR-002`; API/E2E `API-REV-001–006`; delivery N/A.
- Prior authoritative result: `CRR-006` test review **Fail / Local Fix**; `CRR-002` source Pass and `API-REV-005` real Vertex TTS Pass remain intact. Current authoritative test-review result: **Pass**.
- Result rationale: The shared live audio branch reads generated file bytes and now requires nonempty output for every provider, while `assertLiveAudioFileBytes` limits >44-byte RIFF/WAVE checks to Gemini. This preserves the supported OpenAI default MP3 path and Gemini WAV proof. A pure helper/unit test (3/3) covers both branches; relevant audio suites 27/27, server helper/harness 22/22, and scoped no-import preflight 2/2 pass. The incidental test-only AgentRun facade now supplies the required product input normalizer for attachment-free selected flows. No provider call, secret import or production source change occurred in API-REV-006.
- Supported scenario/material-premise basis: `SCN-002/004`, preserved non-Google audio choice (`AC-003`) and the actual OpenAI default-MP3 versus Gemini WAV production contracts. No test caller or synthetic fixture establishes a new product scenario.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `TR-001` | Open / Local Fix | Resolved | `CRR-006`, `API-REV-006` | Format-aware pure helper, shared live test call, synthetic 3/3 and relevant non-paid regression/preflight evidence. |
| `CR-001` | Resolved | Resolved | `IR-002`, `CRR-002`, `API-REV-005/006` | Real API-REV-005 Gemini 3.8 audio returned adapter-validated nonempty WAV; round-6 test-only changes do not alter source. |

- New or remaining finding IDs: None.
- Material score or classification changes: proportional test review Fail / Local Fix → **Pass**; no implementation-source score or API/E2E 95.0% confidence change.
- Recommended recipient: `/delivery_engineer`.
- Remaining risks or uncertainty: API-REV-005 real provider success is key/route/time-specific; separate AI Studio quota and manual listening remain outside this bounded test correction.
