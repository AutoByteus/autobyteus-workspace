# API-REV-016 Execution Plan — CRR-045 Correlated Standalone-Team Runtime Rerun

## Authority And Gate

- Ticket: `AORG-FLAT-TEAM-001`
- Authority: unchanged `RER-026 / AD-REV-018 / ARCH-REV-016 Pass / IR-032`; `CRR-045` focused origin review
- Source/artifact: `8f9f9ce3f7f4ab9312813de8faf5b651578a7310 / 43ef19f2de69b2c16133577dac40471f75ebd913`
- Prior result: `API-REV-015 / Fail / 92.0%`; `API-FIND-021`
- Classification: `Large / High / reviewed`; local action is API/E2E-owned execution/runtime correction.

## Evidence Rules

1. Preserve the unchanged artifact. Instrument only with passive Node Inspector conditional logpoints and standard all-route HTTP access logging; do not edit source/dist or add timeout/retry/replay behavior.
2. Correlate exact timestamps and identities across provider `item/started`, local MCP HTTP ingress/JSON-RPC ID, dispatcher/executor, task adapter, root FIFO admission/start, durable commit, route/HTTP result and provider `item/completed`.
3. Run one clean standalone Team task only. If initial submission passes, request one revision, resubmit on the same task, accept, settle, restart the application on the same data, Restore through normal history and continue the conversation.
4. Record every case/checkpoint immediately in the canonical ledger and retain the task sidecar/provider trace before and after each transition.
5. Fail fast on a correlated product contradiction; clean only owned resources.

## Planned Cases

| Case | Scope | Expected proof |
| --- | --- | --- |
| REPO-001 | unchanged-artifact/instruction/fixture/resource/instrumentation preflight | exact artifact, 18/18 fixture hashes, no source/dist mutation, owned ports/tabs clear, passive logpoints resolved |
| LIVE-006 | fresh standalone Team one-task lifecycle with correlation | submit reaches/returns through every boundary, durable awaiting_review; request_revision -> same-task resubmit -> accept/settle |
| LIVE-006R | Stop/application SIGTERM/same-data restart/inactive-row Restore/continuation | exact Team/task/provider identity and history persist; accepted task stays settled; real lead continuation succeeds |
| CLEAN-001 | cleanup/integrity | owned roots/tab/processes/ports/secrets/generated outputs removed or stopped; exact source/artifact/diff/fixture intact |

## Runtime Plan

- Exact built server on now-clear owned `127.0.0.1:8596`; retained current-artifact production renderer build on `127.0.0.1:3596`.
- Server starts with Node Inspector on owned `127.0.0.1:9238` and `AUTOBYTEUS_HTTP_ACCESS_LOG_MODE=all`.
- Passive logpoints target only loaded production `dist` statements; conditions emit `[API16_CORR]` JSON to server stderr and always return false, so execution does not pause or mutate application state.
- Isolated copy under `api-e2e-evidence/API-REV-016/runtime/`; normal UI package import; actual AutoByteus `open_tab`.
- Real Codex App Server / `gpt-5.6-sol` / low / Auto approve tools.
