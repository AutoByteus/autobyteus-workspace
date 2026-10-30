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
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 1
- Review Scope: `N/A` (failure-origin round)
- Trigger: API/E2E Fail, API-REV-001 (confidence 80%), supplemented by API-REV-002 (still Fail, 80%)
- Prior Review Round Reviewed: N/A (no earlier code review on this ticket)
- Latest Authoritative Round: 1
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

## Latest Authoritative Result

- Review Decision: `Fail` (failure origin confirmed)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: N/A (failure-origin round)
- Failure Origin: CR-001 Requirement Gap; CR-002 Design Impact; CR-003 implementation defect (Local Fix)
- Recommended Recipient: Solution Designer
- Notes: everything else API/E2E measured holds. Gemini read the image, audio and video; Grok's capability refusals worked; Work Journal markers; AC-006; the user-produced PDFs, DOCX and ZIP were refused.
