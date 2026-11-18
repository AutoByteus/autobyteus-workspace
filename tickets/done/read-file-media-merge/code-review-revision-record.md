# Code Review Revision Record — read-file-media-merge (autobyteus-328)

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record indexes the review results.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | API/E2E Failure-Origin Review, round 1 (API-REV-001) | N/A | Fail — Requirement Gap, Design Impact, Local Fix | CR-001, CR-002, CR-003 |
| CRR-002 | `code-review-report.md` | Failure-origin evidence supplement (API-REV-002) | Fail (CRR-001) | Fail — unchanged | CR-001 |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 (API-REV-003) | Fail (CRR-002) | Fail — Requirement Gap | CR-001..CR-003 resolved; CR-004 new |

## Revision Entries

### CRR-001 — Failure origin of API-REV-001 (media line arguments, PDF detection, message grammar)

- Canonical review report updated: `tickets/in-progress/read-file-media-merge/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 1 (direct route; no earlier code review)
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-001), F-1, F-2, F-3
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`
- What changed in the review result and why:
  - F-1 → CR-001, `Requirement Gap`. The approved refusal of line arguments on media (BEH-004, AC-004, and the design's rejected "ignore") blocks every media read by GPT-5 models, which fill optional arguments (API-09).
  - F-2 → CR-002, `Design Impact`. DEC-004's 8,000-byte NUL sniff passes about 20% of sampled real PDFs, which are then returned as garbled text (API-05).
  - F-3 → CR-003, `Local Fix`. "a image" at `read-file.ts` L80.
- Supported product scenario / material-premise basis changes: SCN-F1 (OpenAI GPT-5 native agent reads an image) and SCN-F2 (a user asks for a PDF) are supported normal scenarios. C-04, the text truncation at `end_line: 200`, is rejected as pre-existing model behaviour.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002, CR-003
- Material score or classification changes: N/A (failure-origin round)
- Recommended recipient: Solution Designer. CR-003 is bundled into the following implementation revision.
- Remaining risks or uncertainty:
  - AC-005's AI Studio quota block (user action);
  - Anthropic and Kimi not exercised;
  - the PDF miss rate for user documents is unmeasured.

### CRR-002 — API-REV-002 evidence supplement; classification unchanged

- Canonical review report updated: `code-review-report.md` (meta, CR-001's evidence scope, residual risks)
- Review entry point and round: API/E2E Failure-Origin Review, round 1 supplement
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, API-REV-002 (`b262b5e7a0`), API-11
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-001)
- Current authoritative result: `Fail`, unchanged
- What changed in the review result and why:
  - Neutral file names (API-11 run 3) confirm that media really reach Gemini, Grok and Qwen, removing the answer-revealing-name weakness.
  - LM Studio Qwen, Gemini and Grok send only `path`.
  - F-1 is proven only on `gpt-5.4-mini` and `gpt-5.5`; newer OpenAI models were untested (no credits).
  - Qwen's undelivered audio and video is the pre-existing FU-002, not this ticket.
- Supported product scenario / material-premise basis changes: none. SCN-F1's evidence is now explicitly limited to the two tested models.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open | Open (scope note added) | API-REV-002 | API-11 log and run 3 receipt |
| CR-002 | Open | Open | — | unchanged |
| CR-003 | Open | Open | — | unchanged |

- New or remaining finding IDs: CR-001, CR-002, CR-003
- Material score or classification changes: none
- Recommended recipient: Solution Designer (supplement to CRR-001)
- Remaining risks or uncertainty: newer OpenAI models untested; FU-002 (silent drop on the OpenAI-compatible path) stays a follow-up.

### CRR-003 — Failure origin of F-4: text logs with a stray NUL refused as binary

- Canonical review report updated: `code-review-report.md` (§ Round 2, Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` § Round 2 (API-REV-003), F-4; evidence API-12, API-13
- Relevant solution revision IDs: SR-004, SR-005 (DEC-006)
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-002)
- Current authoritative result: `Fail`, `Requirement Gap`
- What changed in the review result and why: F-1..F-3 are resolved on real providers. F-4 becomes CR-004: the approved premise that text files contain no NUL byte (BEH-011, REQ-009) is false for 173 tracked build logs. The NUL rule therefore refuses readable text that `read_file` returned before (BEH-001). IR-001 already refused 79 of them; DEC-006's whole-file scan refuses all 173.
- Review gap acknowledged: my CR-002 recommendation (whole-file scan) considered only PDFs and widened the regression; I didn't test the NUL-free-text premise against real files.
- Supported product scenario / material-premise basis changes: SCN-F4 (read a build log) is added as a Supported Normal Scenario.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open | Resolved | IR-002, `53d149a4cc`, `815b6e175a` | API-13: 8 of 8 OpenAI models send only `path` and see the image; line ranges still used for text when asked |
| CR-002 | Open | Resolved (as decided in DEC-006), but it caused CR-004 | IR-002, `815b6e175a` | API-05/API-14 round 2: 77 of 79 late-NUL PDFs refused; 2 with no NUL remain (DEC-006 residual) |
| CR-003 | Open | Resolved | IR-002, `815b6e175a` | API-13: the message and articles are right for each kind |

- New or remaining finding IDs: CR-004
- Material score or classification changes: N/A
- Recommended recipient: Solution Designer (with the user's decision)
- Remaining risks or uncertainty: AC-005's AI Studio quota (user action). Any new detection rule needs measuring on the real PDFs, logs and Latin-1 text before acceptance.
