# Requirements Document — AGY native `generate_image` output path

## Document Status
- Status: **Approved** 2026-09-28 (SR-003). Approval reference: user message "Okay, then go ahead. If you think that we can use the design principles to have a good design." following the SR-002 proposal (bounded single-file read, safe fallback, shown path). The user delegated DEC-001/DEC-002 to design judgement; resolved as below.
- DEC-001 resolved → **B by parity**: result uses AutoByteus's canonical `file_path` key (same as its own `generate_image`), so the existing shared pipeline also lists the image in Artifacts; verified no shared-code change needed (E-014/E-016).
- DEC-002 resolved → **show arguments** (recommended option), treating `generate_image` parameters like every other AGY native tool.
- Package: `agy-native-image-output-path`; Current solution round: SR-004 (requirements unchanged since SR-003 approval; SR-004 is hygiene + design alignment)
- Evidence: `investigation-notes.md` (E-001..E-016), `probe-evidence/`
- Supersedes (approved): the "no AGY brain lookup / no path" clause of REQ-002/AC-002 in `tickets/done/agy-runtime-image-codex-prep-20260926/requirements-doc.md`. AGY still owns storage; no copy.

## Problem And Desired Outcome
Antigravity-runtime `generate_image` tool cards show `output: null` although AGY saved the image and knows its path. Desired: the tool result shows the absolute path of the image AGY generated.

## Relevant Current And Desired Behavior
| ID | Current | Desired |
| --- | --- | --- |
| BEH-001 | DONE → `{provider_state:"DONE", output:null}`; parameters hidden | DONE → result includes the AGY-reported absolute image path (and AGY's tool output text) |
| BEH-002 | Error/denial → safe fixed failure | Unchanged |

## Scope Guardrail
- In scope: AGY runtime native `generate_image` success result enrichment, read from AGY's own per-step output record for the same conversation/step.
- Out of scope: copying image bytes, transcript scanning, turn finalization gates, changing AGY storage location, other runtimes, other AGY tools.
- Preserved: tool success is never downgraded because the path is unavailable (falls back to today's `output: null`); error/denial redaction unchanged; exact-eight native tool policy unchanged.

## Requirements
- REQ-001: On native `generate_image` DONE without provider error, AutoByteus reads AGY's step output for that exact conversation and `step_index` and, when it contains an image path, includes `file_path` (absolute) and the output text in the tool result.
- REQ-002: The read is confined to AGY's brain directory for the validated conversation id, size-bounded, and non-blocking for turn completion beyond a single bounded read.
- REQ-003: Missing/unreadable/unrecognised output → unchanged success with `output: null`; no error surfaced to the user.
- REQ-004 (DEC-001 = B): When `file_path` is resolved, the image also appears in the Artifacts tab through the existing shared pipeline.
- REQ-005 (DEC-002): `generate_image` parameters are shown on the tool card like other AGY native tools; error/denial redaction unchanged.

## Acceptance Criteria
- AC-001: Real AGY run "generate a dog image" → Activity tool card result shows the absolute `.jpg` path that exists on disk and matches the path AGY's reply mentions.
- AC-002: Simulated missing `output.txt` → tool still SUCCESS with `output: null`.
- AC-003: Path outside the conversation brain dir or symlinked file is ignored (not shown).
- AC-004: A resolved image yields one Artifacts `generated_output` entry that previews.
- AC-005: Resolved tool result also contains AGY's bounded output text (`output`); STARTED arguments show `ImageName`/`Prompt`.

## Relevant Scenarios
- SCN-001 (Supported Normal): user asks AGY agent for an image; tool card shows path. Also restore/reopen shows same result from history.
- SCN-002 (Supported Edge): AGY version changes the output format → graceful fallback.

## Open Decisions And Questions
- DEC-001 — Resolved: B by parity (see Document Status).
- DEC-002 — Resolved: show arguments.
- No open decisions.

## Readiness Check
Approved basis ready for design (SR-003). Design aligned in SR-004 (ARCH-REV-001 ARCH-001/002).
