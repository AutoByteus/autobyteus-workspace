# Code Review Report — read-file-media-merge (autobyteus-328)

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-004, approved)
- Investigation Notes Reviewed As Context: not needed for the classification
- Solution Revision Record Reviewed As Context: SR-004 (via the requirements and design)
- Design Spec Reviewed As Context: `design-spec.md` (DS-001, Files table, Concrete Examples, Rejection log)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-005)
- Relevant Solution Revision IDs: SR-004
- Design Review Report Reviewed As Context: N/A (direct route, Medium / Low)
- Architecture Review Revision Record Reviewed As Context: N/A
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: 2 (failure-origin)
- Review Scope: `N/A` (failure-origin round)
- Trigger: API/E2E Fail, API-REV-001 (confidence 80%), supplemented by API-REV-002 (still Fail, 80%)
- Prior Review Round Reviewed: N/A (no earlier code review on this ticket)
- Latest Authoritative Round: 2
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md` (API-REV-001)
- Relevant API/E2E Revision IDs: API-REV-001, API-REV-002 (supplement, `b262b5e7a0`, evidence `API-11-*`)
- Delivery Revision Record Reviewed: N/A
- Failing Scenario IDs: F-1 (UC-002 with OpenAI GPT-5 models), F-2 (BEH-011 with real PDFs), F-3 (message grammar)
- Exact Failing Commands / Execution Mode: the real-server journey and real-provider probes (API-06, API-09, API-10) and the real-document probe with its OS PDF sample (API-05). The commands are in the execution report.
- Failure Evidence Paths: `evidence/API-09-receipt.json`, `API-10-receipt.json`, `API-06-server-journey-receipt-run2.json`, `API-05-real-documents-receipt.json`, `API-05-fixtures-and-pdf-sample.log`
- Code read: `autobyteus-ts/src/tools/file/read-file.ts` at `16b3e2452d` (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/read-file-media-merge`, HEAD `f09f93f787`)

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception` (direct route)
- Classification evidence or correction required: none. All three failures sit in one tool, `read_file`, and change no contract, persistence or boundary.

## Review Scope

- Changed implementation and behavior reviewed: only the failing paths. `readFile`'s argument validation (L58-72), the media dispatch and line-range refusal (L76-83) and the binary check (L91-102).
- Explicit exclusions: no full source audit or scorecard (failure-origin round). AC-005's AI Studio quota block (API-03) is environmental and not classified here; FU-005 records the helper's misreport.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes.
  - BEH-002, REQ-002: media reads attach the file.
  - BEH-004, REQ-004, AC-004: line ranges on media are refused.
  - BEH-011, REQ-009, DEC-004: binary files, PDF named, are refused; detection is "a NUL byte in the first 8,000 bytes … no format list".
- Design-spec behavior map verified against the implementation: Yes. The code does what DS-001 and the Files table say, including the rejected alternative "silently ignoring" line ranges on media (Concrete Examples).
- Behavior-basis status: `Contradicted` for F-1 and F-2. The approved rules, as written, defeat approved outcomes in supported use (below). `Confirmed` for everything else.
- Remaining material ambiguity: whether line arguments on media should be ignored or refused (F-1), and how far binary detection should go (F-2). Both are decisions for the Solution Designer.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-002 / BEH-004 | Contradicted | `readFile` checks `start_line`/`end_line >= 1` first (L58-63). A media path with any line argument then throws (L78-81) before `readMediaFileAsContextFile` | API-09: `gpt-5.5` sent line arguments in all 11 calls (`0/0`, `1/1`, `-1/-1`, `1/999999`); `gpt-5.4-mini` in 12 of 12 media reads. Every read was refused, so the image never reached the model |
| BEH-011 | Contradicted | `fileBytes.subarray(0, 8000).includes(0)` (L98) | API-05: 77 of 400 OS-shipped PDFs have their first NUL after byte 8,000 (at 22–47 KB), and 2 have none. Two were returned as text with 1,857 and 33,499 U+FFFD characters. Through the real server, Gemini called one "OK" |
| BEH-003 message | Confirmed (minor wording issue F-3) | L80 picks "an" only for audio | "… is a image file." |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior | Kind | Actor / Initiator | Coherent Goal | Supported Entry Surface | Shape | Forward Production Path | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-F1 | BEH-002, 004 / UC-002 | User | user with a native agent on an OpenAI GPT-5 model (in the catalog: `gpt-5.4`…`gpt-6-sol`) | ask the agent to look at an image | agent run (GraphQL / WebSocket), the Daily Assistant built-in | Normal | model tool call → `readFile` → line-range refusal | the image is attached and seen | API-09 receipts (real provider, real server); OpenAI is a supported native provider | Supported Normal Scenario | Use |
| SCN-F2 | BEH-011 / UC-001 | User | user with a native agent | ask the agent to read a PDF in the workspace | agent run | Normal | `readFile` → 8,000-byte NUL sniff → UTF-8 decode → text result | refused as binary | API-05 receipt (two real PDFs returned as text). The OS PDF sample is a proxy for user documents: 79 of 400 (about 20%) pass the sniff. User-produced Chrome and CUPS PDFs were refused, so the share among user documents is unmeasured, but the consequence is the exact harm BEH-011 removes | Supported Normal Scenario | Use |
| SCN-F3 | BEH-003/004 message | User | as SCN-F1 | — | — | Normal | L80 | grammatical message | the code | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | refusing line arguments on media blocks every media read by GPT-5 models | SCN-F1 | the model fills optional arguments (strict mode off, schema requires only `path`) | refusal → no image → the agent answers UNAVAILABLE or guesses (`gpt-5.5` answered "Red" from the file name) | API-09 | Promote | Requirement Gap | the approved BEH-004 and the design's rejected alternative cause it (CR-001) |
| C-02 | the 8,000-byte NUL sniff misses PDFs whose first NUL comes later | SCN-F2 | a user asks for a PDF | garbled text reaches the model, which may call it fine | API-05 | Promote | Design Impact | the mechanism approved in DEC-004 does not meet BEH-011 (CR-002) |
| C-03 | "a image" | SCN-F3 | — | wording | L80 | Promote | This ticket, Local Fix | CR-003 |
| C-04 | GPT models also send `start_line: 1, end_line: 200` on text reads, so a longer file is truncated | — | — | pre-existing model behaviour; the tool returns what was asked | API-09 text case | Reject | — | not a defect of this change |

## Findings

### CR-001 — Refusing line arguments on media makes `read_file` unusable for media on OpenAI GPT-5 models (F-1)

- Failure origin: `Requirement Gap`. The implementation follows BEH-004 and AC-004 exactly ("start_line/end_line with a media file refused"). The design weighed ignoring line arguments and rejected it (Concrete Examples: "silently ignoring them" is the avoided shape). The failure is the approved rule meeting real model behaviour. It was not detectable in source review, because it depends on how a provider's models fill optional arguments.
- Scope of the evidence:
  - Proven on `gpt-5.4-mini` and `gpt-5.5`.
  - Newer OpenAI models (`gpt-5.6-*`, `gpt-6-*`) were not tested, because the test key ran out of credits (API-11).
  - LM Studio `qwen3.6-35b-a3b`, Gemini 3.8 Flash and Grok 4.7 send only `path` and are unaffected.
  - The finding stands on the proven models; whether newer OpenAI models behave the same is open.
- Consequence: a regression for OpenAI users. `read_media_file` took only `file_path`, so it worked. Now media is never loaded, and one model claimed a result anyway, which is the "claims to have inspected" harm this ticket set out to remove.
- Questions for the Solution Designer (and the user, since BEH-004 changes):
  1. Ignore line arguments for media, as `include_line_numbers` already is?
  2. If so, the range checks at L58-72 must apply to text only. Otherwise `0` and `-1`, which GPT sends, are still refused before the media dispatch.
  3. If some refusal stays, its message should say the file was not loaded and not to claim to have inspected it, as BEH-003's capability refusal does. The current line-range message doesn't, and `gpt-5.5` guessed.

### CR-002 — Binary detection misses PDFs whose first NUL byte is after 8,000 bytes (F-2)

- Failure origin: `Design Impact`. The code matches DEC-004's mechanism, but that mechanism does not deliver BEH-011 ("a PDF … refused") for a measurable share of real PDFs. DEC-004 is recorded as a user decision and says "no format list", so the Solution Designer should judge whether the change needs the user's renewed approval.
- Options, for the owner:
  - **Scan the whole buffer for NUL.** `readFile` already reads the whole file into memory (L93), so this costs one pass and no format list. It catches 77 of the 79 sampled misses and leaves the 2 with no NUL at all. This keeps DEC-004's heuristic and changes only its window.
  - **A known-signature check** (for example `%PDF-`). This catches PDFs regardless of NULs, but it is a format list, which DEC-004 excluded.
  - **Strict UTF-8 decoding.** This refuses every non-UTF-8 file, but changes BEH-001: today Latin-1 text is returned with replacement characters.
  - **Accept the limit** and record it.

### CR-003 — Grammar in the media line-range message (F-3)

- Failure origin: `Implementation defect` (`Local Fix`, implementation). `read-file.ts` L80 uses "an" only for `audio`, so the message reads "is a image file". The handoff quotes "an image". This message may be replaced by CR-001's outcome; if it stays, choose the article for `image` and `audio`.

## Follow-ups

- Follow-ups this review added: none. FU-005, the live-test helper reading quota 429 as a credential error, was added by API/E2E.

## Classification

- CR-001: `Requirement Gap` → Solution Designer.
- CR-002: `Design Impact` → Solution Designer.
- CR-003: `Local Fix` → Implementation Engineer, to be bundled into the revision that follows the Solution Designer's decisions, because CR-001 may remove or reword the same message.

## Recommended Recipient

- Solution Designer (`/software_engineering_team/solution_designer`): "review identifies a Design Impact, Requirement Gap, or Unclear issue". The Solution Designer then routes the revised package, with CR-003, to implementation.

## Residual Risks

- AC-005's live test in AI Studio mode is blocked by a Google project quota of 0. Only the user can provide a key or raise the quota.
- Anthropic and Kimi were not exercised (usage limit, suspended account).
- The PDF sample is OS-shipped files, not user documents. The miss rate for user documents is unmeasured.
- API-11 run 3 used neutral file names, so the answers can't come from the names.
  - Gemini read all three media kinds; Grok and Qwen read the image.
  - This closes API-06/API-09's weakness of answer-revealing names.
- API-11, Qwen through LM Studio:
  - Audio and video load (capability `unknown`, DEC-003), but the OpenAI-compatible path never delivers them, and the agent answered UNAVAILABLE.
  - That is the LLM layer's pre-existing silent drop (FU-002). This ticket doesn't change it.
- F-1 has not been checked on newer OpenAI models.

## Round 2 — Failure Origin of F-4 (API-REV-003)

- Trigger: the API/E2E round for IR-002 is a Fail (API-REV-003, 87%).
  - F-1, F-2 and F-3 are resolved: 8 of 8 OpenAI models send only `path` and see the image; 77 of 79 late-NUL PDFs are refused; the messages are right.
  - New failure: F-4.
- Evidence: `evidence/API-12-nul-file-census.log`, `API-13-round2-receipt.json`, `API-13-round2-journey.log`. Code at `438e6c1cde` (`815b6e175a`: the whole-file NUL scan, DEC-006).
- Prior findings: CR-001, CR-002 and CR-003 are resolved, per API-REV-003's real-provider evidence. The CR-001 fix (`53d149a4cc`, OpenAI Responses tools sent with `strict: false`) is outside this failure-origin entry point and was not re-reviewed here.

### CR-004 — Text files with a stray NUL byte are refused as binary (F-4)

- Scenario (SCN-F4, Supported Normal Scenario): a user asks a native agent to read a build or tool log in the workspace. In real use (API-13), the Daily Assistant was refused and recovered only because it also has `run_bash`; an agent with only `read_file` cannot read the log at all.
- Evidence (API-12):
  - Of 21,147 tracked `.log` files, 173 contain NUL bytes; 167 are Electron build logs. The NUL sits inside readable text, for example `[nuxt] kit:compatibility\x00: 0.388ms`.
  - In the sample shown, a 102 KB log carries 542 NULs (about 0.5%) and a 12.9 MB log carries 542 (about 0.004%).
  - Before this ticket, `read_file` returned these as text.
  - IR-001's 8,000-byte window already refused 79 of them. IR-002's whole-file scan (DEC-006) refuses all 173, which are 94 of its 95 newly refused files.
- Failure origin: `Requirement Gap`.
  - The code does what the approved rule says: refuse any non-media file with a NUL byte (DEC-004, DEC-006).
  - The rule rests on a premise the requirements state twice and the evidence contradicts: "text reads unchanged (text files contain no NUL byte)" (BEH-011, preserved column) and "text files contain none" (REQ-009, feasibility).
  - So two approved behaviours conflict on real files: BEH-001 (text reads unchanged) and BEH-011 (binary refused). Choosing between them, or a rule that serves both, is the user's decision through the Solution Designer. AC-009 tested only NUL-free text, so the acceptance criteria did not expose it.
- Review gap, mine:
  - My round-1 recommendation for CR-002 (scan the whole buffer) weighed only PDFs and widened this regression from 79 to 173 files.
  - The NUL-free-text premise was in the requirements I reviewed against, and I did not test it against the repository's own files.
- Options for the Solution Designer (data from API-05 and API-12):
  1. **A ratio rule:** count NUL bytes plus invalid-UTF-8 sequences in the decoded text, and refuse above a threshold.
     - In these samples the separation is wide: the logs are at 0.5% or less, while the two late-NUL PDFs returned as text carried U+FFFD at about 6% and 26% of their characters.
     - A threshold of a few percent separates them, but it needs measuring on the PDF sample, the census and Latin-1 text before it is fixed. It changes no format list.
  2. **Known binary signatures** (PDF, ZIP/OOXML, gzip, SQLite …) **plus a ratio.** This is closest to "PDF refused", but it is a format list, which DEC-004 excluded.
  3. **Accept the limit:** text with a NUL byte is refused, and the release note says so.
  4. **Return such text with the NULs removed or replaced.** This changes the result text for those files, which BEH-001 preserves byte for byte.
- Proportionate response: no implementation change until the user decides. Whichever rule is chosen should get AC cases built from the real files: one Electron build log, one late-NUL PDF and one Latin-1 text file.

### Classification and routing (round 2)

- CR-004: `Requirement Gap` → Solution Designer (with the user's decision; DEC-004 is a user decision).

## Latest Authoritative Result

- Review Decision: `Fail` (failure origin confirmed)
- Review Entry Point: `API/E2E Failure-Origin Review` (round 2)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: N/A (failure-origin round)
- Failure Origin: CR-004, Requirement Gap. The approved premise "text files contain no NUL byte" is false for real build logs.
- Recommended Recipient: Solution Designer
- Notes:
  - CR-001, CR-002 and CR-003 are resolved, per API-REV-003.
  - AC-005's AI Studio live test still needs the user (quota or key).
