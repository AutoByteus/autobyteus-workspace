# Code Review Report — agy-native-image-output-path

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved SR-003; SR-004 current)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (E-001..E-016)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: `implementation-evidence/`, `probe-evidence/`; Product/UI supplements N/A — not applicable
- Relevant Solution Revision IDs: SR-001..SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Trigger: Implementation complete (IR-001) — commits `aad130875`, `c9b51c1f3` on `codex/agy-native-image-output-path` (base `origin/personal@fcd3e83a4`)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A — not applicable (implementation review)
- Delivery Revision Record: N/A — not applicable
- Failing Scenario IDs / Commands / Evidence: N/A — not applicable

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `High` (undocumented provider-internal layout; `~/.gemini` file becomes servable via content route)
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed unchanged. Diff is 3 source files (+1 new 72-line reader), no shared contract/route/UI/persistence change — matches the `Small` sizing; the High-risk drivers are exactly what this review focused on.

## Review Scope

- Changed implementation and behavior reviewed: native `generate_image` DONE enrichment (REQ-001/002/003/004/005), reader containment/bounds policy, never-throw guarantee into the backend queue, removal of the `args = {}` and hard-coded `output:null` special cases.
- Files / areas reviewed:
  - `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-step-output-reader.ts` (new)
  - `…/antigravity/stream/agy-stream-event-converter.ts`
  - `…/antigravity/backend/agy-agent-run-backend.ts` (wiring; `handleMessage`/`enqueue` L103–117 read for exception path)
  - Tests: `agy-step-output-reader.test.ts`, `agy-stream-event-converter.test.ts`, `agy-turn-lifecycle.test.ts`, `file-change-event-processor.test.ts`, `agy-native-image-codex-skill.e2e.test.ts`, `agy-native-image-app-chat.e2e.test.ts`, `agy-failure-transport.e2e.test.ts`, `tests/fixtures/agy-failure-cli.mjs`
- Explicit exclusions: shared FileChangeEventProcessor, content route, history, UI (untouched; verified by diff stat).
- Reviewer re-execution: focused unit suites `tests/unit/agent-execution/backends/antigravity` + `file-change-event-processor.test.ts` → 106 passed / 5 skipped (live-gated); `tsc -p tsconfig.build.json --noEmit` clean. Live e2e not re-run; implementation evidence `implementation-evidence/app-native-image-chat.json` L106/L120–121 shows resolved `file_path` under `~/.gemini/antigravity-cli/brain/<conv>/` and one `generated_output` FILE_CHANGE.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes — show AGY's absolute image path (and bounded output text) on native `generate_image` success; fall back silently to `output:null`; Artifacts entry via existing pipeline; parameters public; error/denial redaction unchanged.
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: round 2, ARCH-REV-002 Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 (REQ-001/004/005, AC-001/004/005) | Confirmed | `AgyStreamProcess` → `AgyAgentRunBackend.enqueue→handleMessage` → `converter.tool()` DONE, no provider error, `nativeImage` → `nativeImageResult(stepIndex)` → injected `(step) => readAgyNativeImagePath(runtimeContext.conversationId, step)` → `{provider_state, output, file_path}` → shared `FileChangeEventProcessor` (`generated_output`). `args` now `agyRecord(info?.parameters) ?? {}` for all tools. Live app-chat evidence confirms end to end. | — |
| REQ-002/003, AC-002/003 (SCN-002) | Confirmed | Reader: UUID + safe-int validation; single `output.txt` opened `O_RDONLY|O_NOFOLLOW`; `fstat` regular + ≤16 KiB; parse; `lstat` reported path regular non-symlink; realpath containment in `realpath(brain/<conv>)`; outer try/catch → `READ_FAILED`. Converter: resolver call in try/catch → `RESOLVER_FAILED`; unresolved → `{provider_state:"DONE", output:null}` + content-free warn. | — |
| BEH-002 | Confirmed | ERROR / DONE-with-provider-error branch unchanged; resolver is not reached (the `nativeImage` success branch is only the third `else if`). Unit test asserts `resolver` not called for ERROR, DONE-with-error, and MCP. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface / Event | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, REQ-001/004/005 | User | AutoByteus user on AGY runtime | Generate an image and see where it was saved | Agent chat → AGY native `generate_image` | Normal | DONE step_update → backend queue → converter → reader → SUCCEEDED `file_path` → FileChangeEventProcessor → Activity + Artifacts; same DONE step, no turn delay | Card shows absolute path + output text; one Artifacts entry previews | Requirements SCN-001; E-004..E-006; live evidence JSON | Supported Normal Scenario | Use |
| SCN-002 | REQ-002/003, AC-002/003 | System | AGY CLI version/layout | Step output missing or wording drift | Resumed pre-2026-08-11 conversation or AGY upgrade | Explicit Edge | same path; reader returns reason → fallback | Tool stays SUCCESS with `output:null`; warn line | Requirements SCN-002; E-010 (real pre-layout conversations) | Supported Explicit Edge Scenario | Use |
| CON-001 | REQ-003, design DS-001 | Contract | Backend queue | No exception from `convert` may stop the run | `enqueue` catch L112–117 stops backend on any throw | Contract | resolver/reader failure → caught in both layers | Run continues; turn completes | Design spec DS-001; design-review residual risk; throwing-resolver unit test | Supported Explicit Edge Scenario | Use |
| CON-002 | AC-003, REQ-002 | Contract | Security posture | Only an image AGY reported for this conversation, not via symlink, may be exposed through the content route | reader policy | Contract | realpath containment + lstat | Symlink/outside path → unresolved | Approved AC-003 | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CR-C-001 | Can any exception escape `convert` via the image path? | CON-001 | Reader I/O failure / resolver bug | Reader: `readBoundedOutput` open errors mapped; `fstat/readSync/closeSync` throws propagate to the outer `try` → `READ_FAILED`; `realpathSync`/2nd `lstatSync` in outer try. Converter: `try { resolve } catch` → `RESOLVER_FAILED`; warn uses only `runId`/`stepIndex`/string reason (non-throwing). | Code L59–107 reader, converter `nativeImageResult`; unit tests "never throws for an unusable brain root", "never lets a throwing resolver escape convert" | Reject (no defect) | Verified guarantee holds in both layers. |
| CR-C-002 | `O_NOFOLLOW` only covers the final component; an intermediate `steps/<n>` or `.system_generated` symlink would be followed | CON-002 | Requires someone to replace AGY-created directories under `~/.gemini` with symlinks | Only `output.txt` text is affected; the reported image still has to pass realpath containment and a non-symlink `lstat`, so nothing outside the conversation can be exposed | Design-review residual risk (accepted); design principles: manual tampering out of scope | Reject | Tampering with AGY's own brain directory is not a supported scenario, and the approved exposure invariant still holds. |
| CR-C-003 | TOCTOU between `lstat`/`realpath` and the later content-route serving | CON-002 | Requires a concurrent local actor swapping files in AGY's brain directory | — | Same as CR-C-002 | Reject | Contrived; the route serves only projected entries (E-014). |
| CR-C-004 | `SAVED_AT` uses the first multiline match, so a user prompt containing a line "Generated image is saved at <abs>" could precede AGY's own line | CON-002 | The user authors their own prompt | Any result must still be a regular, non-symlink file inside the same conversation's brain directory; that is the user's own local data on the user's own server, so no privilege boundary is crossed | Reader containment code; the requirements make the prompt public (DEC-002) | Reject | No coherent goal and no security consequence beyond approved containment. |
| CR-C-005 | The second `lstatSync(realImage).isFile()` after realpath is redundant with the first `lstat` | Engineering contract (readability) | — | No behavioral consequence; one extra syscall per image | Reader L102 | Reject | Harmless defensive re-check at the contained realpath. Not worth churn. |
| CR-C-006 | Tests outside the design's removal list changed: app-chat e2e expectation; fixture `PRIVATE_AGY_SECRET` removed from `generate_image` parameters; lifecycle test dropped the `private-token` assertion | REQ-001, REQ-005 (DEC-002) | Approved behavior change | Parameters are now public by approval. Failure-transport e2e still asserts `PRIVATE_AGY_SECRET\|SECRET_IMAGE\|/private/` absent from the wire and history (L94, L97) via the error/output fields, the diagnostic still holds the secret (L104), and the new assertion checks the public args | Diff; failure-transport e2e L94–104, L177–178 | Reject (no defect) | These are mechanical consequences of approved REQ-001/REQ-005, and redaction coverage is preserved. |
| CR-C-007 | Synchronous fs I/O inside `convert` on the serialized queue | Design interface decision | Once per image generation | ≤16 KiB read + 2–3 stat calls; no turn delay beyond that | Design spec "Synchronous by design"; REQ-002 | Reject | Approved and proportionate. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | "No Design Issue Found". The converter stays the single translator; the new off-spine reader owns the provider-storage lookup | None |
| Matches approved supplemental artifacts | Pass | N/A supplements; matches the design's concrete examples (result shape, warning format) | None |
| Data-flow spine clarity and preservation | Pass | DS-001/DS-002 implemented as mapped; `handleMessage → convert` unchanged | None |
| Ownership boundary preservation | Pass | Converter has no `fs` import; the reader owns layout and policy; backend does wiring only | None |
| Off-spine concern clarity | Pass | The reader serves only the converter via an injected function type | None |
| Existing capability reuse | Pass | Reuses the canonical `file_path` key and the unchanged FileChangeEventProcessor / content route | None |
| Reusable owned structures | Pass | `AgyNativeImagePathResolution` is owned by the reader; the converter imports only the type | None |
| Shared-structure tightness | Pass | Discriminated union: resolved `{path,outputText,reason:null}` or unresolved `{null,null,reason}` | None |
| Repeated coordination ownership | Pass | Fallback policy lives only in `nativeImageResult` | None |
| Empty indirection | Pass | `AgyNativeImagePathResolver` binds conversation identity at the backend. That is real wiring, not pass-through | None |
| Separation of concerns / file responsibility | Pass | New file is ~70 lines and single-purpose | None |
| Ownership-driven dependency | Pass | backend→reader, converter→type only, reader→node built-ins; forbidden shortcuts absent | None |
| Authoritative Boundary Rule | Pass | Shared processors know nothing about the AGY brain; no caller bypasses the converter | None |
| File placement | Pass | `antigravity/stream/` alongside the converter and diagnostic sink, per design | None |
| Flat-vs-over-split layout | Pass | One new file | None |
| Interface boundary clarity | Pass | `(conversationId, stepIndex, brainRoot?)`, explicit identity, `stepIndex`-only resolver at the converter | None |
| Naming quality | Pass | `readAgyNativeImagePath`, `nativeImageResult`, `readBoundedOutput`, and reason codes are descriptive | None |
| No unjustified duplication | Pass | `~/.gemini` root duplication with the MCP materializer is explicitly accepted in the design | None |
| Patch-on-patch complexity | Pass | Special cases removed rather than layered | None |
| Dead/obsolete cleanup | Pass | `args = {}` special case, hard-coded `output:null`, and the stale comment removed; `nativeImage` still needed for the ERROR and success branches | None |
| Test scenarios requirement-aligned | Pass | Reader: identity, missing, symlink/non-regular output, >16 KiB, wording/relative/empty, outside, symlinked image, missing/dir image, unusable root. Converter: resolved, 8 reasons, throwing resolver, parallel, ERROR/DONE-error/MCP not resolved. Pipeline: exactly one `generated_output` | None |
| Test fixtures/helpers coherent | Pass | Temp brain-root helpers; `vi.mock` of the reader in the lifecycle test proves the wiring (`conversationId, 4`) | None |
| No stale/compat-only tests | Pass | Pathless expectations replaced; no dual expectations | None |
| API/E2E readiness | Pass | Live-gated e2e updated with `file_path`, containment, FILE_CHANGE, and content-route byte-equality assertions | None |

## Source File Size And Structure Audit

| Source File | Effective Lines (total) | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `stream/agy-step-output-reader.ts` | 72 (new) | Pass | Pass (+72) | Single concern | Correct | Pass | None |
| `stream/agy-stream-event-converter.ts` | 189 | Pass | Pass (+17/−4) | Unchanged owner | Correct | Pass | None |
| `backend/agy-agent-run-backend.ts` | 137 | Pass | Pass (+5/−2) | Wiring only | Correct | Pass | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | Older AGY layouts fall back to the generic unresolved result; no version branch |
| No legacy old-behavior retention | Pass | Pathless/hidden-args branch removed |
| Dead/obsolete cleanup | Pass | See structural checks |
| Persisted-data transition followed | Pass | `Not Affected` / directly usable; historical `output:null` events replay unchanged; no backfill |
| No dual reads/writes or old-shape fallback | Pass | — |
| Transition mechanics match design | Pass | No migration, as designed |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `No` (low)
- Why: This is internal adapter behavior; the user-visible change is a richer tool card and one Artifacts entry. Delivery may note the `AGY_NATIVE_IMAGE_PATH_UNRESOLVED` diagnostic if AGY runtime docs list warnings.
- Files or areas likely affected: None required.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| (none recorded upstream; fallback premise E-010 pre-layout conversations) | Confirmed | — |

No new or reclassified premises. Candidates CR-C-002..CR-C-004 are rejected in the gate above.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94
- Score calculation note: simple average; not the decision rule.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001/DS-002 implemented exactly; no new sequencing nodes | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Layout knowledge is confined to the reader; the converter stays fs-free; shared code is untouched | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Explicit identity; discriminated union; optional final ctor dependency keeps callers stable | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Small single-purpose file in the right folder | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | Tight union; result shape reuses the canonical `file_path` / `output` keys | — | — |
| 6 | Naming Quality and Local Readability | 9.0 | Clear names; the reader packs several statements onto one line in places | Dense one-line `try`/`catch` and ternary chains in `readBoundedOutput` | Optional: expand for readability (non-blocking) |
| 7 | API/E2E Readiness | 9.5 | Live e2e assertions cover path, containment, FILE_CHANGE, and preview bytes; fake-agy failure e2e updated | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Never-throw verified in both layers; policy matches AC-003; CRLF and trailing-dot handling correct (trim, then strip) | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | No version branches | — | — |
| 10 | Cleanup Completeness | 9.0 | All listed removals done | A redundant second `lstat` on the realpath (CR-C-005, rejected, no deduction beyond noting it) | — |

## Findings

None.

## Classification

N/A — Pass.

## Recommended Recipient

Per handoff rules: primary `/api_e2e_engineer`; informational `/implementation_engineer`.

## Residual Risks

- The AGY step-output layout and wording are undocumented. Drift is mitigated by the fallback, the warning, and the gated live e2e (accepted in SR-002).
- Live e2e results come from implementation evidence and were not re-run by the reviewer. API/E2E should re-run the gated live tests with real `agy` where available.
- The 10 pre-existing unrelated unit failures (codex tool-log correlation, team-run-history catalog, published-artifact projection, provisioning) were reported as baseline. The reviewer did not re-verify them.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10; every category ≥ 9.0
- Failure Origin: N/A
- Recommended Recipient: `/api_e2e_engineer`
- Notes: Focus items (1) never-throw, (2) containment/symlink policy, and (3) the two out-of-list test updates are all verified; see CR-C-001, CR-C-002..004, and CR-C-006.
