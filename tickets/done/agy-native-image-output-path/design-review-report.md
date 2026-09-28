# Design Review Report — agy-native-image-output-path

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/requirements-doc.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/design-spec.md` (SR-004 revision)
- Supplemental Task Artifacts Reviewed: `probe-evidence/` (probe scripts + NDJSON captures; evidence only). Product/UI supplements: N/A.
- Relevant Solution Revision IDs: SR-001..SR-004
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer "Revised Architecture Design Complete" (SR-004), which resolves ARCH-REV-001
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail — ARCH-001, ARCH-002)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Same code basis as round 1 (worktree @ `fcd3e83a4`, no source changes since). Round 2 rechecked `file-change-output-path.ts` L17–71 against the new result shape `{provider_state, output, file_path}`, and backend `enqueue` catch L112–117 against the never-throw guard.

## Routing Classification Review

- Task size: Small
- Architectural risk: High
- Classification rationale reviewed: The design adds a new dependency on an undocumented AGY file layout that has already changed once (E-010). It also lets a `~/.gemini` file be served through the existing file-change content route (E-014). Both are material external-contract and security impacts.
- Independent Architecture Review required by the classification: Yes
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (round 2; the ARCH-001 row is now aligned)
- Approved requirements / intended behavior understood: Yes. On AGY native `generate_image` DONE, the tool result should show AGY's absolute image path and AGY's tool output text (BEH-001, REQ-001). The read is bounded and contained (REQ-002). If the path cannot be resolved, the result falls back to the unchanged success with `output: null` (REQ-003). The Artifacts entry comes by parity (DEC-001 = B) and parameters are shown (DEC-002).
- Relevant existing behavior and evidence confirmed: Yes. The converter forces `arguments: {}` and `output: null` for native image (converter L83–84, L108–112). The conversation id comes directly from `runtimeContext.conversationId` (backend L25). AGY inherits the server's environment, so both processes share the same HOME and `os.homedir()` is the correct brain root (`agy-stream-process.ts` L34). A `result.file_path` from a generated-output tool becomes a `generated_output` FILE_CHANGE (`file-change-output-path.ts` L59–71). AGY's argument keys (`ImageName`, `Prompt`) do not match the explicit output-path key rule (L17–21). The content route serves projected absolute paths that exist as files (`run-file-changes.ts` L37–50).
- Scope guardrail confirmed: In scope is enriching the result from AGY's single step output file. Out of scope are transcript scanning, copying bytes, turn gating, other tools and other runtimes. Preserved: a successful tool is never downgraded, error/denial redaction is unchanged, and the exact-eight native tool policy is unchanged.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: Yes. No blocking findings remain.
- Remaining material ambiguity: None. REQ-005 and AC-005 were added in SR-004. They restate approved DEC-002 and REQ-001 and do not change intended behavior.

| Behavior ID | Kind | Design Alignment With Approved Intent | Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 / REQ-001 / AC-001 / AC-005 | Changed | Pass (SR-004). The resolved result is `{provider_state, output: <bounded text>, file_path}`, and the reader returns `outputText`. | Pass (E-002..E-006, E-011, E-012; code confirmed) | Pass. `output` and `file_path` avoid the `*output*path*`/`destination` rule (L17–21), and `file_path` gives exactly one `generated_output` entry (L59–71). | Confirmed | — |
| REQ-002 / AC-003 | Changed | Pass | Pass (E-009, E-010) | Pass. The design gives one fixed path built from a UUID id and an integer step, a ≤16 KiB read, O_NOFOLLOW + fstat, and realpath containment of the image inside the conversation dir. | Confirmed | — |
| REQ-003 / AC-002 / SCN-002 | Preserved fallback | Pass | Pass (E-010: the pre-2026-08-11 layout lacks `steps/`) | Pass. The reader returns `{path:null, reason}` and the converter falls back to `output:null` plus a content-free warning. | Confirmed | — |
| REQ-004 / AC-004 (DEC-001 = B) | Changed | Pass | Pass (E-014, E-016; code confirmed) | Pass. No shared-code change. | Confirmed | — |
| REQ-005 / DEC-002 (show args) | Changed | Pass | Pass (converter L84) | Pass. This removes the special case, and `ImageName`/`Prompt` do not trigger the output-path key rule. | Confirmed | — |
| BEH-002 | Preserved | Pass | Pass (converter L95–102) | Pass. The redaction of provider `error`/`output` is kept. | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probe-evidence/` | Pass | Pass (E-002, E-003, E-011, E-012) | Pass | Pass | Pass (evidence only) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design § Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Pass | No Design Issue Found. The gap is in the provider contract plus a prior intentional exclusion (E-001..E-003, E-007). | — |
| Refactor decision is explicit | Pass | No refactor beyond removing the special cases. | — |
| Refactor decision is supported by concrete sections | Pass | Removal plan and the reader as an off-spine owner. | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade Vs Owner | Subject Naming | Ownership | Off-Spine Kept Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Stay Internal | Bypass Risk Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgyStreamEventConverter` | Pass | Pass | Pass | Pass | Takes an injected resolver function type and does not import `fs`. |
| `AgyStepOutputReader` | Pass | Pass | Pass | Pass | Holds all knowledge of the brain layout. Shared processors and the route stay unaware of it. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend → reader (wiring); converter → function type; reader → node fs/path/os | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Shape Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `readAgyNativeImagePath(conversationId, stepIndex, brainRoot?)` | Pass | Pass | Pass (UUID + non-negative int) | Low | Pass. The SR-004 union carries `outputText` and adds `READ_FAILED`, and the converter uses its own `RESOLVER_FAILED` for warnings only. |
| converter `resolveNativeImagePath?: (stepIndex) => resolution` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Artifacts projection / preview | Pass | Pass | N/A | Pass | Reuses the canonical `file_path` (E-015, E-016) |
| AGY step-output reading | Pass | Pass | Pass | Pass | No existing owner does this |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Allocation Clear | Reuse/Extend/Create Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/antigravity/stream` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `~/.gemini` root (also used in the MCP config materializer) | Pass | N/A | N/A | Pass | Two independent uses; extraction is not warranted |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field | Redundant Removed | Overlap Controlled | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Canonical success `result` | Pass | Pass | Pass | N/A | Pass | `file_path` and `output: null` are two explicit shapes. In SR-004 the resolved result is `{provider_state, output, file_path}`. `output` has the same meaning as for other AGY tools (provider output text), and neither key matches the explicit output-path rule. |
| `AgyNativeImagePathResolution` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `stream/agy-step-output-reader.ts` (new) | Pass | Pass | N/A | Pass | — |
| `stream/agy-stream-event-converter.ts` | Pass | Pass | N/A | Pass | — |
| `backend/agy-agent-run-backend.ts` | Pass | Pass | N/A | Pass | Wiring only |
| Tests (reader unit, converter unit, FileChange unit, live e2e) | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear | Folder Matches Boundary | Mixed/Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `antigravity/stream/agy-step-output-reader.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Native-image `args = {}` special case | Pass | Pass | Pass | Pass | — |
| Hard-coded `output: null` + comment | Pass | Pass | Pass | Pass | — |
| Old unit test (L50) / e2e expectation (L102) | Pass | Pass | Pass | Pass | The L31 denial test is adjusted to keep error/output redaction |

## Legacy / Backward-Compatibility Verdict

| Area | Wrapper / Dual-Path Exists | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Pre-2026-08-11 AGY layout | No | Pass | Pass | Old layouts use the generic fallback; there are no version branches |

## Persisted-Data Transition Verdict (When Applicable)

| Stored Subject | Approved Decision | Evidence Sufficient | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Run history tool events | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Old events replay as `output:null`, with no backfill. AGY files are read-only. |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Reader → converter → wiring → FileChange test → live e2e | Pass | Pass (the optional resolver keeps existing call sites unchanged) | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present/Clear | Bad Shape Explained | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Resolved / fallback result | Yes | Pass | Pass (scraping replies, globbing, transcript) | Pass | The SR-004 example includes the `output` text and a key-rule check |

## Material Premise Validation (Only When Needed)

None. The only new fallback machinery (REQ-003 fallback to `output:null`) rests on an established reachable premise: E-010 shows real pre-2026-08-11 conversations without `steps/`, and those can be resumed via `--conversation`. I raised no finding that depends on a hypothetical scenario. The symlink/containment policy is an approved requirement (AC-003), not a reviewer premise.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Output text in the resolved result (ARCH-001) | Approved REQ-001 and BEH-001 require it | Aligned in SR-004 | Resolved |

## Review Decision

`Pass`. The behavior basis is confirmed, the design is ready for implementation, and no in-scope machinery depends on an unsupported premise.

## Findings

None open. Resolution history is in `architecture-review-revision-record.md` (ARCH-REV-002):
- ARCH-001 — Resolved (SR-004, option (a): the resolved result carries `output` text and `file_path`).
- ARCH-002 — Resolved (requirements status, round and decisions, AC-004 and the investigation assumption are now current).

## Classification

N/A — Pass.

## Recommended Recipient

`/implementation_engineer` (primary), then an informational notice to `/solution_designer`.

## Residual Risks

- The AGY layout and wording are undocumented and may drift. This is mitigated by the fallback, the warning and the gated live e2e, and was accepted in SR-002.
- Never-throw: the design now handles this in two places. The reader wraps all fs calls (`READ_FAILED`), and the converter guards the resolver call (`RESOLVER_FAILED`), with a throwing-resolver test in the Change Sequence. Implementation and code review should confirm that no exception can escape `convert` (backend `enqueue` catch, L112–117).
- Minor wording: the design's Persisted Data section mentions only the extra `file_path` on new events. New events also carry `output` text. This does not affect the no-migration decision.
- The containment check is on the image's realpath. `output.txt` uses O_NOFOLLOW on its final component only. This is adequate for the approved AC-003, and I did not assume any further threat model.

## Latest Authoritative Result

- Review Decision: Pass (ARCH-REV-002)
- Material-Premise Gate: Pass
- Notes: ARCH-001 and ARCH-002 are resolved and verified against the SR-004 artifacts. The next step is implementation.
