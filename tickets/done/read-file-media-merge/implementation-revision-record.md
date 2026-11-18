# Implementation Revision Record — read-file-media-merge (autobyteus-328)

Current code and `implementation-handoff.md` are authoritative. This index locates implementation rounds; it is not proof of downstream acceptance.

## Revision Index
| Revision | Trigger / round | Findings | Classification | Related revisions | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, Architecture Design Complete (SR-003) plus SR-004 (REQ-009), initial | N/A | Initial baseline; Medium / Low | SR-001…SR-004; ARCH-REV, CRR, API-REV and DR N/A | Superseded by IR-002 (API/E2E failed: API-REV-001/002; failure-origin CRR-001/002) |
| IR-002 | Solution Designer SR-005, answering CRR-001/CRR-002 after API/E2E failed | CR-001, CR-002, CR-003 | Rework; Medium / Low confirmed | SR-005 (DEC-005, DEC-006); CRR-001/002; API-REV-001/002 | Superseded by IR-003 (API-REV-003 F-4; CRR round 2 CR-004); CR-001..003 resolved |
| IR-003 | Solution Designer SR-006, answering CRR round 2 (CR-004) | CR-004 | Rework; Medium / Low confirmed | SR-006 (DEC-007, DEC-008); API-REV-003 | Implementation Complete; direct API/E2E ready |

## IR-001 — read_file reads media and refuses other binaries; read_media_file removed
- **Trigger:** the completed design (SR-003) on the approved basis (SR-002: DEC-001, DEC-002), and SR-004 received during implementation (DEC-004: REQ-009 / AC-009 / BEH-011; FU-001 moved into scope). Initial implementation, so there are no finding IDs.
- **Result:** prior authoritative result N/A; current result **Implementation Complete**. Commits `5b9eb0aba7`…`90c6204a3b`, plus baseline fix `16b3e2452d` (logger test, TESTING.md Rule 9).
- **Affected behaviours:** BEH-001…011, REQ-001…009 and AC-001…009, with implementation-scoped evidence for each. The realistic server/app journey with a real model remains API/E2E's.
- **Delta:**
  - `read_file` dispatches media → binary → text. The new `read-file-media.ts` returns a `ContextFile`. One read with an 8,000-byte NUL check; the text path is byte-identical to before.
  - `ReadMediaFile` is removed with its exports, registration and tests; the continuation and live tests are moved.
  - On the server: the Work Journal `read_file` media rendering (recorded `read_media_file` kept) and the Daily Assistant template.
  - Docs: § 2.3 plus 3 file-name updates.
  - No migration, no package change.
- **Validation:**
  - Reproductions fail on the base: 15 media and 5 binary cases.
  - Byte identity: 201,273 comparisons over 67,091 tracked text files, with all 201 NUL files refused.
  - New native-agent scripted-model flow (3 cases) and the AC-006 resolver case.
  - Full `autobyteus-ts` suite in 3 rounds: every changed and new test passed. The out-of-ticket failures and their causes: terminal start timing (FU-003), logger (baseline fix), LM Studio (FU-004).
  - Server `test:unit`: 864 files / 7,303 tests passed.
  - Both typechecks exit 0.
  - The gated Gemini m4a live test was **skipped**: the vault's Gemini credential was refused.
- **Classification recheck:** **Medium / Low confirmed.** One owner gains a 43-line branch file; no persisted data, API, web or lifecycle change. Lightweight self-review complete.
- **Deviations** (handoff § Deviations):
  - the Work Journal fixture is unchanged (it holds keys only);
  - the workspace-confinement case was not moved (the shared trusted-local rule replaces it);
  - the missing, non-regular and line-range messages follow the existing wording;
  - a dead `try` was removed;
  - extra tests were added.
- **Next route:** direct to `/software_engineering_team/api_e2e_engineer`.
- **Remaining limitations:** the real-model native journey through the server or isolated app; Work Journal rendering of a real run; the Gemini m4a live run (needs a valid vault key); the public packages (DEC-002, separate ticket after a stable release). Follow-ups FU-002 (user-attached media dropped silently), FU-003 (terminal start under load) and FU-004 (the LM Studio suite in the default run, and its URL on the user's AutoByteus).

## IR-002 — OpenAI Responses strict: false; whole-file NUL scan; media line-range refusal says not loaded
- **Trigger:** SR-005 (`handoff-architecture-design-complete.md`, section Revision SR-005), answering the failure-origin code review CRR-001/CRR-002. That review classified:
  - CR-001 as a Requirement Gap, resolved by DEC-005 / REQ-010 / AC-010 / BEH-012;
  - CR-002 as a Design Impact, resolved by DEC-006;
  - CR-003 as a Local Fix.
  It followed API/E2E Fail API-REV-001/002 (F-1 GPT-5 media reads refused, F-2 real PDFs read as text, F-3 grammar).
- **Result:** prior authoritative result IR-001 Implementation Complete, failed downstream. Current result **Implementation Complete** at `438e6c1cde` (commits `53d149a4cc`, `815b6e175a`, `438e6c1cde`).
- **Delta:**
  - **CR-001 root cause (REQ-010):** `OpenAIResponsesLLM.normalizeTools` sends each function tool with `strict: false`. A flat Responses-shaped function tool without `strict` gets it too; an explicit `strict` there and hosted tools pass through.
  - **CR-001 message:** the media line-range refusal says the file was not loaded and not to claim to have inspected it. It is checked before the numeric range checks, so `0`/`-1` on media get it too. This moves path resolution before the range checks; for text, only the both-errors case changes which error comes first.
  - **CR-002 (DEC-006):** NUL scan over the whole buffer; still one read.
  - **CR-003:** "an image / an audio / a video".
  - `start_line`/`end_line` descriptions per the design.
  - Docs: `tool_schema_and_configuration.md` (§ 2.3 and the strict paragraph) and the normalizer comment.
- **Validation:**
  - Unit `strict: false` fails 2/2 before the fix and passes after (`IMP-10`).
  - The changed `read_file` tests fail 12 times on the IR-001 code and pass now (`IMP-11`).
  - Byte identity: 201,111 comparisons, all 296 NUL files refused (`IMP-12`).
  - AC-010 live on `gpt-5.4-mini` and `gpt-5.5`: image read with only `path`, answer red; `write_file` without an invented `base_dir` (`IMP-14`).
  - Full `autobyteus-ts`: all changed and new tests pass. 12 terminal failures under load all pass alone; they are FU-003, plus the new FU-006.
  - Affected server suites 179/179; both typechecks exit 0 (`IMP-13`).
- **Classification recheck:** **Medium / Low confirmed.** One request field that the codebase already intended to be off, and local `read_file` changes. Lightweight self-review done.
- **Next route:** direct to `/software_engineering_team/api_e2e_engineer`.
- **Remaining:**
  - API/E2E re-runs SCN-F1, F2 and F3 through the real server, including newer OpenAI models.
  - A sanity pass on other OpenAI tools now that `strict` is off.
  - The Gemini m4a live test (AC-005), blocked on the vault key or quota.
  - The branch is behind `origin/personal` (`8760c83788`); delivery refreshes it.
  - Follow-ups FU-002…FU-006.

## IR-003 — binary only when a NUL byte AND invalid UTF-8 (DEC-007)
- **Trigger:** SR-006, answering CR-004, a Requirement Gap. The whole-file NUL scan (DEC-006) refused 173 readable build logs with stray NULs (API-REV-003 F-4).
- **Result:** IR-002 superseded; CR-001…003 confirmed resolved by API-REV-003. Current result **Implementation Complete** at `063ddf845e`.
- **Delta:**
  - `read-file.ts`: refuse only when `fileBytes.includes(0)` and a strict UTF-8 decode (module-level `TextDecoder('utf-8', { fatal: true })`) throws. Otherwise the bytes are decoded with `toString('utf8')` exactly as before this ticket. Still one read; no window, no format list.
  - Tests rebuilt on realistic samples: a deflated ZIP, gzip, an aarch64 ELF, PDF-like files, the tracked Electron build log, Latin-1 and BOM-less UTF-16. Doc § 2.3 updated.
- **Validation:**
  - Focused 155/155. 3 cases fail on the IR-002 rule.
  - Real macOS PDFs and a real ZIP are refused.
  - Byte identity: 201,744 comparisons, 103 files refused.
  - Full suite: every changed and new test passes; the terminal failures (FU-003) pass alone. Typecheck 0 (`IMP-15`).
- **Residual flagged to the Solution Designer:** a UTF-16 file with a BOM is refused. `FF FE` is invalid UTF-8 and the file has NULs; before this ticket it was returned as garbled text. The no-NUL binary residual is unchanged.
- **Classification:** Medium / Low confirmed. **Next route:** direct to `/software_engineering_team/api_e2e_engineer`.
