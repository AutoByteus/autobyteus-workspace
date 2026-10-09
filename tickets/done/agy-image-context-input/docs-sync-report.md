# Docs Sync Report — agy-image-context-input

## Scope

- Ticket: `agy-image-context-input`. Images and files attached in the app now reach Antigravity (AGY) agents as path text, and Send needs typed text or a skill tag.
- Trigger: API/E2E Pass (API-REV-002, 95%) from `/software_engineering_team/api_e2e_engineer`. Direct route: `task_size=Small`, `architectural_risk=Low`, solution revision SR-004.
- Bootstrap base reference: `origin/personal` @ `048ea6cecb3f1999d4201be5b995157a8007d8e7`
- Integrated base reference used for docs sync: `origin/personal` @ `048ea6cec`, unchanged at delivery start (fetched 2026-10-09). The branch was already current.
- Post-integration verification reference: `delivery-evidence/dr1-server-smoke.log` (4 files, 39 tests Pass) and `delivery-evidence/dr1-web-smoke.log` (3 files, 28 tests Pass)

## Why Docs Were Updated

- Summary: AGY now builds its user text from the message plus its context files: an explicit image section that the agent opens with `view_file`, and the shared `Reference files:` section for other files. Composers now need typed text or a skill tag before Send is enabled. Before this change the Chat composer accepted a draft with only context files.
- Why this should live in long-lived project docs: the AGY input shape is a lasting runtime contract. AGY input is text only, and a non-text block ends the session. The Send rule is a lasting composer rule. Both must be documented so that later work neither puts raw image blocks back into AGY input nor brings back attach-only sends.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Owner doc for AGY runtime input | Updated (IR-001/IR-002, verified) | New "User input and context files" section. It matches the integrated code and the SR-004 rule. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Shared context-image handling description | Updated (IR-001, verified) | Notes AGY as the path-based exception, with a link to the AGY section |
| `autobyteus-web/docs/chat.md` | Owner doc for composer Send availability | Updated (delivery) | Adds the text-or-skill-tag rule and names `hasSendableDraft` |
| `autobyteus-web/docs/agent_execution_architecture.md` | Send flow and attachment finalization | No change | Describes send and finalize mechanics, not when Send is available. Still accurate. |
| `autobyteus-web/docs/settings.md` | Duplicate of the send-flow description | No change | Same reason as above |
| `TESTING.md` | Test surface catalogue | Updated (API/E2E, verified) | The AGY fake-CLI and live rows name `agy-context-files-transport.e2e.test.ts` and `agy-context-files-live.e2e.test.ts` (`RUN_AGY_CONTEXT_FILES_E2E=1`) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | New section | `buildAgyUserMessageText`: an image section read with `view_file`, remote URL and data-URL lines, `Reference files:` for other files. Covers the text-required rule, the unchanged stored message and the opt-in live check. | Runtime contract |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Paragraph | AGY is the exception to the shared image-block mapping | Avoids a wrong reading of the shared section |
| `autobyteus-web/docs/chat.md` | Paragraph | Send and Enter need typed text or a skill tag; context files alone never enable Send. `hasSendableDraft` is the one rule for the Chat composer, the New chat surface, the run-view composer and `activeContextStore`. It matches the server's non-empty-input rule. | Records DEC-006 in the composer owner doc |
| `TESTING.md` | Table rows | New AGY context-file E2E files and their gate | Makes the durable checks discoverable |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| AGY text-only input | A non-text stream-json block ends the AGY session. Images are passed as absolute paths, and AGY's native `view_file` gives the model real vision. | `investigation-notes.md`, `probe-evidence/` | `antigravity_cli_runtime.md` |
| Send availability | Text or a skill tag is required in every composer, as decided in DEC-006. The server's empty-input rejection is unchanged. | `requirements-doc.md` (REQ-004), `design-spec.md` (SR-004) | `autobyteus-web/docs/chat.md`, `antigravity_cli_runtime.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `hasSendableDraft(draft, { attachmentsAreSendable })`: attach-only Send in the standalone Chat box | `hasSendableDraft(draft)`: typed text or a skill tag only | `autobyteus-web/docs/chat.md` |
| AGY sending only `message.content` (context files dropped) | `buildAgyUserMessageText(message)` | `antigravity_cli_runtime.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary and release notes, then hold for explicit user verification.
- Notes: none.
