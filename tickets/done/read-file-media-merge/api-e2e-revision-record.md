# API/E2E Revision Record — read-file-media-merge (autobyteus-328)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, IR-001 (direct route) | SR-004, IR-001 | N/A | Fail / 80% |
| API-REV-002 | the user's request (2026-10-30): newer OpenAI models and LM Studio Qwen | — | Fail / 80% | Fail / 80% (unchanged; F-1 to F-3 stand) |
| API-REV-003 | Implementation Engineer, IR-002 (SR-005) | SR-005, IR-002, CRR-001, CRR-002 | Fail / 80% | Fail / 87% (F-1..F-3 resolved; F-4 new) |
| API-REV-004 | Implementation Engineer, IR-003 (SR-006) | SR-006, IR-003, CR-004, DEC-007, DEC-008 | Fail / 87% | Pass / 95.3% |

## Revision Entries

### API-REV-001 — Baseline: real providers through the server; F-1 (OpenAI models fill line arguments), F-2 (late-NUL PDFs read as text), F-3 (wording)

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md`, IR-001.
- Triggering finding or case IDs: the handoff's open items (real-model journey; Gemini m4a live test).
- Related revision IDs: SR-004, IR-001.
- Why recorded: first API/E2E round.
- Coverage decisions or durable test paths changed: none (all probes temporary).
- Cases added, changed, removed, or rechecked: API-01 (reused IMP-01..07), API-02..API-07 as planned; API-08, API-09, API-10 added during execution.
- Commands, environment, fixture, or broader-validation delta: test vault; Gemini through Vertex Express (the AI Studio project has a zero quota); in-process studio server; generated real-format documents.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, execution report, progress log, `follow-ups.md` (FU-005), `evidence/API-*`.
- Prior result and confidence: N/A
- Current result and confidence: Fail, 80%.
- New or remaining failure IDs: F-1, F-2, F-3.
- Recommended owner: failure-origin review (Code Reviewer); preliminary: F-1 and F-2 Solution Designer (user decision), F-3 implementation.
- Remaining risks, blocked evidence, or untested scope: AC-005's durable live test in AI Studio mode (the Google project's quota; the user); Anthropic and Kimi (account limits).

### API-REV-002 — Addendum at the user's request: newer OpenAI models, LM Studio Qwen, neutral file names

- Triggering role, report path, and round: the user, 2026-10-30 ("have you tried with gpt 6.1 terra?", "could you also try to test using lmstudio the default model qwen 3.6").
- Cases added: API-11 (runs 1-3).
- Result: Qwen 3.6 (LM Studio), Gemini 3.8 Flash and Grok 4.7 send only `path` and receive the image (and, for Gemini, audio and video) with neutral file names; Qwen gets audio and video as `SUCCEEDED` tool results but does not receive them (capability `unknown`; the LLM layer's silent drop, FU-002). The newer OpenAI models (`gpt-5.6-terra`, `gpt-6-astra`, `gpt-6-luna`, `gpt-6-sol`) were not tested: the OpenAI test key reports "You have no credits remaining". `gpt-6.1-terra` is not in the catalog.
- Correction: API-06 R1 and API-09 used file names that give the answers (`red.png`, `hello.m4a`, `blue.mp4`); API-11 run 3 repeats with neutral names and confirms delivery.
- Prior result and confidence: Fail, 80%. Current: Fail, 80% (F-1, F-2, F-3 unchanged).
- Remaining: F-1 on newer OpenAI models needs OpenAI credits (the user).

### API-REV-003 — Round 2 for IR-002: F-1, F-2, F-3 resolved; F-4 (text logs with a stray NUL refused)

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` IR-002 (SR-005).
- Related revision IDs: SR-005, IR-002, CRR-001, CRR-002.
- Cases: API-01b (reused IMP-10..14), API-12 (census), API-05 round 2, API-14, API-13.
- Coverage decisions or durable test paths changed: none.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-1 OpenAI models fill line arguments (API-06 R2, API-08, API-09) | Requirement Gap | Resolved by REQ-010 `strict: false`: 8 of 8 OpenAI models send only `path` | API-13 |
| F-2 late-NUL PDFs read as text (API-05) | Design Impact / Requirement Gap | Resolved by DEC-006 for 77 of 79; 2 without NUL remain (stated residual) | API-05 round 2 |
| F-3 `a image` | Local Fix | Resolved | API-14 |

- Correction of round 1: the 201 files refused by the 8,000-byte window included 79 text build logs; round 1 did not look at them.
- Prior result and confidence: Fail, 80%. Current: Fail, 87%.
- New or remaining failure IDs: F-4.
- Recommended owner: failure-origin review (Code Reviewer); preliminary F-4 `Requirement Gap` (Solution Designer, user decision).
- Remaining: AC-005's durable live test in AI Studio mode (the user).

### API-REV-004 — Round 3 for IR-003: F-4 resolved; Pass

- Triggering role and round: Implementation Engineer, IR-003 (SR-006, DEC-007).
- Cases: API-01c (reused IMP-15), API-12 round 3, API-15 (new: binaries and encodings), API-05 round 3 (400 PDFs), API-16 (server journey).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-4 text logs with a stray NUL refused (API-12, API-13) | Requirement Gap | Resolved by DEC-007: 172 of 173 logs read (the other holds raw database bytes); a plain `read_file` agent reads a build log on the real server | API-12 round 3, API-16 |

- Prior result and confidence: Fail, 87%. Current: Pass, 95.3%.
- New or remaining failure IDs: none.
- Recommended owner: Delivery Engineer.
- Remaining risks: an uncompressed ASCII tar and an all-zero file read as text; 2/400 PDFs without NUL; UTF-16 with BOM refused; Anthropic and Kimi untested; the user's open point on the schema wording.
