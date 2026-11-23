# Handoff: Architecture Design Complete, revised (autobyteus-609, SR-004)

- Result: `Architecture Design Complete` (revised after CRR-002, the failure-origin review of API-REV-001 F-1). Still `Large` / `High`.
- Package, worktree, branch and base: unchanged.
- Branch head: `5c0ca8e496`. The documents are committed; the implementation tree under review was `255a0b0ada`.
- Route: Large/High revised package → `/architecture_reviewer`. CRR-002 then asks for implementation, a targeted source review of the replay and the shared rule, and API/E2E (MSP-102, the whole phone probe, the server suites, the fresh-start build).

## The finding

F-1 (AC-D): a call the user stopped reads "Failed" once the run is read back from the node:
- the phone opened after the stop;
- a desktop reload;
- an earlier-trace card (statusKey `error`).

Live, it reads "Stopped".

## SR-004 (design D-D2, in `design-spec.md`)

- **One rule.** A new node rule, `agent-memory/domain/tool-result-interruption.ts`, `isInterruptedToolResult({ sourceEvent, error })`, decides from what each writer already stores:
  - the sequencer's `TOOL_EXECUTION_INTERRUPTED` / `TURN_INTERRUPTED`;
  - native's `AgentTurnInterruptedEvent`;
  - the journal's two interruption texts.
- **Readers.** The replay's `createToolEvent` reads it (both call sites), and so does the work journal's `interruptedFromError` (outputs unchanged). The sequencer imports the text constant.
- **Conversation status.** Conversation tool entries carry `toolStatus` from the replay. The web's `inferToolStatus` is removed, and hydration uses the node's status.
- **Persisted data:** read-side only. Not Affected; old traces read the same way.
- **Requirements:** AC-D makes read-back explicit, and DEC-010 puts Codex read-back out of scope (FU-008). Approved within the direction, with the user informed.
- **Design case:** docs/design-cases.md Case 26.

## Documents

`requirements-doc.md`, `investigation-notes.md` (SR-004 section), `design-spec.md` (D-D2 at the end; Change Scope consumers), `solution-revision-record.md` (SR-004), `follow-ups.md` (FU-008). Also the reviewer's `code-review-report.md` (CRR-002) and the API/E2E report.
