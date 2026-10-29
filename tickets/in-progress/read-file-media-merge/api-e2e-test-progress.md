# API/E2E Test Progress — read-file-media-merge (autobyteus-328)

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-29 21:53 | API-02 | Started | | git grep read_media_file |
| 2026-10-29 21:53 | API-02 | Completed | Pass | only recorded-history renderer, its test/fixture, AC-006 test, docs, old done tickets |
| 2026-10-29 21:53 | API-05 | Started | | temp probe read_file on real/generated documents |
| 2026-10-29 21:54 | API-05 | Completed | Fail | cups/chrome PDF, DOCX, ZIP refused; 2 OS PDFs (first NUL at 32001/42388) returned as garbled text 29857/126833 chars |
| 2026-10-29 21:54 | API-03 | Started | | durable m4a live test, strict, AI Studio |
| 2026-10-29 21:54 | API-03 | Completed | Blocked | AI Studio project quota 0 (429); helper misclassifies as credentials (FU-005) |
| 2026-10-29 21:54 | API-04 | Started | | temp copy of m4a live test in Vertex Express mode |
| 2026-10-29 21:56 | API-04 | Completed | Pass | Vertex Express copy: 1 passed (Gemini transcribed hello from the read_file m4a) |
| 2026-10-29 21:56 | API-06 | Started | | temp server journey R1 Gemini, R2 OpenAI Daily Assistant (+API-07 journal) |
| 2026-10-29 21:59 | API-06 | Checkpoint | | run 1: R1 Gemini red/hello/blue, docs refused, os-keyboard.pdf returned as 29857 chars; R2 gpt-5.4-mini sent start_line/end_line=1 -> all media refused; probe assertions fixed; run 2 adds API-08 matrix |
| 2026-10-29 21:59 | API-08 | Started | | matrix: image read per model/agent, line args and outcome |
| 2026-10-29 22:22 | API-08 | Completed | Fail | gpt-5.4-mini 6/6 image reads with start_line/end_line=1 -> refused, no retry; Gemini 2/2 read; Anthropic 4 not tested (usage limit until 2026-11-01) |
| 2026-10-29 22:22 | API-09 | Started | | text read on gpt-5.4-mini; image on larger OpenAI, Grok, Kimi |
| 2026-10-29 22:29 | API-09 | Completed | Fail | gpt-5.4-mini text read sends start/end 1-200 (works); gpt-5.5 image: 11 attempts all with line args, all refused, then answered 'Red' unseen; grok-4.7 image OK (path only); Kimi not tested (balance) |
| 2026-10-29 22:29 | API-10 | Started | | Grok audio+video capability refusal, with Work Journal |
| 2026-10-29 22:30 | API-10 | Completed | Pass | grok-4.7: audio and video refused with the capability messages; agent says it could not hear/see; journal renders both |
| 2026-10-29 22:30 | API-06 | Completed | Fail | R1 Gemini pass (red/hello/blue; docs refused; os-keyboard.pdf returned as text); R2 gpt-5.4-mini Daily Assistant: all media refused on line args (2 runs) |
| 2026-10-29 22:30 | API-07 | Completed | Pass | journals: media markers for R1; refusals for R2 and API-10 |
| 2026-10-29 22:31 | — | Completed | Fail | round 1 result recorded (F-1, F-2, F-3); committing |
