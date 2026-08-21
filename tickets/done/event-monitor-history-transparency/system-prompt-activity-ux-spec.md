# System Prompt Activity UX Specification

## Status

`Approved design input — SR-014 restores the approved prompt-first presentation`

## Purpose

Define the first new kind in an extensible Activity trajectory: make the exact
application-supplied system instructions inspectable without implementing the
rest of the possible trajectory or changing Event Monitor.

## Trajectory Container Behavior

- **System instructions** is a first-class Activity trajectory entry, not a
  fixed panel header, settings view, or prompt-only side channel.
- Tool, compaction, and system-instruction entries share the Activity surface's
  common identity, run/member scope, time/order, summary, detail-availability,
  loading, error, and accessibility semantics.
- The renderer consumes one provider-neutral system-instruction entry shape.
  Existing run runtime metadata selects the truthful subtitle and scope
  explanation; it does not select a separate Claude, Codex, or native card, and
  no `instruction_boundary` value is stored in the trace.
- Each kind retains a specialized payload and renderer. Prompt text must not be
  placed in a generic JSON blob, and existing tool/compaction detail must not be
  flattened into a prompt-shaped card.
- The surface may use a shared card/disclosure shell and kind-specific body.
  Future kinds can join that structure through their own explicit contract and
  renderer, but no hypothetical future entry is displayed in this slice.
- System-instruction entries follow the existing active-trace and recent-
  Activity retention policy. This slice adds no pinning, archive lookup, or
  separate retained landmark.

## Activity Presentation

### Activity Summary Row

Each selected active-trace instruction version is a compact **System
instructions** trajectory row in its normal chronological Activity position.

- The row is present only while its record remains in the active projected
  trace window. Normal Activity trimming or compaction/rotation may remove it.
- Summary content: runtime, truthful source label, capture time, character
  count, and availability state.
- Character count is presentation-derived as Unicode code points
  (`Array.from(content).length`), not stored in the trace and not measured as
  UTF-8 bytes or UTF-16 code units.
- Recommended default: collapsed. One explicit disclosure opens the complete
  captured text.
- Different captured versions remain separate chronological rows. Consecutive
  identical supplies remain one version; the same text appearing again after a
  different value is a later row.

### Runtime Labels

| Runtime | Required source label meaning | Full-detail authority |
| --- | --- | --- |
| Native AutoByteus | `AutoByteus-supplied · Native configured system prompt` | Final processed prompt passed to `llmInstance.configureSystemPrompt` after native skill-catalog assembly |
| Claude Agent SDK | `AutoByteus-supplied · Claude SDK systemPrompt` | Exact `systemPrompt` argument supplied to the SDK query |
| Codex app server | `AutoByteus-supplied · Codex baseInstructions` | Exact `baseInstructions` supplied to `thread/start` or `thread/resume` |

All runtime copy must describe the record as AutoByteus-supplied instructions,
not as a complete provider-effective prompt. Claude and Codex may add
provider-owned instructions/context; Native provider adapters also serialize
configured prompts and working-context system messages differently.

### Expanded Detail

- Render the complete captured text without silent summarization.
- Preserve line breaks and whitespace.
- Use a readable monospaced detail region with wrapping and an internal maximum
  height/scroll container so the Activity panel and center pane do not resize.
- Allow text selection. Copy/export controls are not added in this slice.
- Show capture time and truthful runtime source immediately above the text.
  The raw-trace record's existing ID may be used internally as the Activity key;
  the UI does not need to expose a second snapshot ID.
- Display the exact recorded content. A redacted-content state is not introduced
  by this slice.

## States

### Loading

- Hydration reads the instruction through the normal active-run projection.
- Expansion uses the detail already projected from that active record; it does
  not load archived trace files.

### Not Yet Captured

- Before the first committed capture, show no system-instruction row.
- Add the row when the first exact capture is committed and published live.

### Absent From Active Trace

- For an older run, trimmed window, or compacted run without a selected active
  instruction record, show no system-instruction row.
- Do not scan archives, rebuild text from the current agent/team definition, or
  infer it from unrelated records.

### Restart / Rehydration

- Restarting the server or browser and reopening a run restores the instruction
  row only when its record remains in the active selected trace window.
- Once normal trimming or compaction/rotation removes it from that window,
  reopening the run does not restore the row.
- Restart does not change runtime/source labels or replace the
  captured text with a newly composed prompt.

### Error

- A malformed instruction record must not prevent tool/compaction Activity from
  rendering. The malformed instruction row may be omitted with a diagnostic;
  no archive or reconstructed fallback is used.
- Runtime capture or publication failure adds no failure-specific Activity row,
  retry badge, rollback state, or publication-status field. Existing valid tool,
  compaction, and system-instruction rows remain independently renderable.

### Long-Run Behavior

- The row follows the existing bounded Activity window and may be evicted by
  later activity.
- While the row remains resident and expanded, ordinary rendering must keep its
  detail contained within the Activity panel.
- Existing live-tail auto-follow behavior remains unchanged.

## Responsive And Accessibility Behavior

- The disclosure is a keyboard-operable control with an accessible name
  containing `System instructions`, runtime, and availability.
- Expanded content belongs to a labeled scrollable region.
- Status and source scope are conveyed in text, not color alone.
- Long lines wrap or scroll inside the detail region without horizontal page
  overflow.
- On narrow/mobile surfaces, the detail may open in a full-width drawer while
  preserving the selected run/member identity.

## Preserved Surfaces

- Existing tool and compaction Activity cards remain unchanged.
- Event Monitor continues to own the user/assistant/Thinking/compact-tool narrative.
- No user-input, request-context, response-status, reasoning, archive-history,
  prompt-editing, copy/export, or telemetry feature is introduced by this slice.
- The Activity structure is prepared for explicit future kinds, but this UX
  specification neither invents nor approves their content or presentation.

## Approval Applicability

The user accepted active-only bounded retention and instructed the solution to
continue after the prompt-first presentation was narrowed. The approved
baseline is a normal collapsed Activity row with explicit access to the complete
exact captured text while the row remains resident. SR-014 makes no presentation
change; it rejects a failure-specific UI/lifecycle premise that is not supported
under repository operating conventions.
