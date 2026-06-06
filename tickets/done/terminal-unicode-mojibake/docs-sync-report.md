# Docs Sync Report

## Scope

- Ticket: `terminal-unicode-mojibake`
- Trigger: Delivery-stage docs sync after API/E2E validation passed, followed by user-requested rebase onto newly updated `origin/personal` and local Electron rebuild.
- Bootstrap base reference: `origin/personal@c4a7c61394bda6789809473c4e170ce96b2c79ed` (`chore(ticket): record phone setup cleanup`).
- Integrated base reference used for docs sync: `origin/personal@5e188c1c9210be3ff82dd8f9282f2802773446d4` (`docs(ticket): record remove cli tui finalization`) after `git fetch origin personal --prune` on 2026-06-06 and user-requested `git rebase origin/personal`.
- Post-integration verification reference: ticket branch rebased cleanly to `5382e86cf720f972ca269d25890cf176bfe15c7c` (ahead 1 / behind 0 vs `origin/personal`). Post-rebase focused terminal tests, web-boundary guard, `git diff --check`, legacy codec search, and local macOS Electron build passed. Evidence logs are in this ticket folder as `delivery-post-rebase-*.log` and `delivery-evidence/electron-build-20260606-rebased-5e188c1c/`.

## Why Docs Were Updated

- Summary: Long-lived terminal docs explicitly document the terminal WebSocket `data` field as base64-encoded bytes, not browser text; frontend ownership of UTF-8 input encoding and streaming output decoding; and backend forwarding of raw PTY bytes.
- Why this should live in long-lived project docs: The root bug was an ownership/encoding boundary mistake in the terminal transport path. Future maintainers need canonical docs that prevent reintroducing direct `atob(message.data) -> xterm` or `btoa(inputText)` browser-text behavior.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/terminal.md` | Canonical frontend Terminal module documentation and protocol summary. | `Updated` | Retains implementation doc update for `terminalTransportCodec.ts`, base64 terminal bytes, UTF-8 input encoding, and session-scoped streaming output decode. |
| `autobyteus-server-ts/docs/modules/terminal.md` | Canonical backend Terminal WebSocket/PTY lifecycle and protocol module documentation. | `Updated` | Delivery clarification added: payloads are base64 bytes; input is decoded to `Buffer`; output is raw PTY bytes; browser clients need streaming UTF-8 decode. |
| `autobyteus-ts/docs/terminal_tools.md` | Documents agent `run_bash` and server/web interactive terminal backend selection. | `No change` | The ticket does not change stateless agent command execution or backend selection. |
| `autobyteus-web/docs/remote_access.md` | Checked because terminal WebSockets can use remote-access WebSocket URL construction/auth credentials. | `No change` | Auth/base URL behavior, mobile terminal exclusion, and remote-access WebSocket policy are unchanged. |
| `README.md` | Checked top-level product/setup docs for user-facing terminal setup implications. | `No change` | No install command, dependency, environment variable, or top-level setup behavior changed. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/terminal.md` | Frontend terminal protocol / runtime invariant | Added codec utility to module structure and documented base64 terminal bytes plus session-owned streaming UTF-8 output decoding before xterm writes. | Prevents future direct browser binary-string forwarding to xterm. |
| `autobyteus-server-ts/docs/modules/terminal.md` | Backend protocol / validation expectation clarification | Clarified Terminal WebSocket byte semantics and added Unicode/split UTF-8/non-ASCII input validation expectations. | Keeps backend docs aligned with byte-preserving protocol and validated frontend decode ownership. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Terminal WebSocket byte/text boundary | `data` means base64 terminal bytes. Browser input text is UTF-8 encoded before transport; backend writes those bytes to the PTY; backend output is raw PTY bytes; browser output decoding uses one streaming UTF-8 decoder per session. | `requirements.md`, `investigation-notes.md`, `design-spec.md`, `implementation-handoff.md`, `code-review-report.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/terminal.md`, `autobyteus-server-ts/docs/modules/terminal.md` |
| Regression class to preserve | Direct `atob(...)` binary-string-to-xterm and direct `btoa(inputText)` for non-ASCII input are invalid; split UTF-8 chunks require streaming decode. | `investigation-notes.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/terminal.md`, `autobyteus-server-ts/docs/modules/terminal.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Direct production terminal output path `atob(message.data)` as display text | `terminalTransportCodec.ts` converts base64 to bytes; `useTerminalSession.ts` streams UTF-8 decode before xterm callbacks. | `autobyteus-web/docs/terminal.md`; `autobyteus-server-ts/docs/modules/terminal.md` |
| Direct production terminal input path `btoa(data)` on JavaScript input text | `TextEncoder` UTF-8 bytes plus byte-to-base64 transport via `encodeTerminalInput(data)`. | `autobyteus-web/docs/terminal.md`; `autobyteus-server-ts/docs/modules/terminal.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A`
- Rationale: Long-lived docs were updated/reviewed in this delivery package.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is current with rebased `origin/personal@5e188c1c` and the rebuilt local Electron artifacts. Repository finalization, ticket archival, push, merge to `personal`, release, deployment, and cleanup remain paused until explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
