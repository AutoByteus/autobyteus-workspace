# Handoff — Architecture Design Complete (grok-release-smoke-551, SR-002)

- From: Solution Designer, 2026-11-22
- To: `/architecture_reviewer`
- Task: Project Task `autobyteus-551` (delegated by `/project_task_manager`)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-release-smoke-551`, `codex/grok-release-smoke-551`; base `origin/personal` @ `df00f97aaa`; finalization target `origin/personal`. Ticket documents are uncommitted in the worktree.
- Classification: `Architecture Design Complete`; `task_size` Medium; `architectural_risk` High (Grok runs trust the run workspace; shared ACP connection contract changes)

## Package (all in `tickets/in-progress/grok-release-smoke-551/`)

- `requirements-doc.md` — Approved by the user 2026-11-22 (SR-001; DEC-003 → (a) process-scoped workspace trust)
- `investigation-notes.md` — evidence for the three causes and the architecture investigation
- `design-spec.md` — the design (SR-002)
- `solution-revision-record.md` — SR-001, SR-002
- `follow-ups.md` — FU-001, FU-002
- `evidence/SD-probes-2026-11-22.md` (P1–P17) and the probe scripts

## The causes and the design in short

1. Time-outs under load: Grok's own start-up took up to 34.6 s; our bounds are 15 s (discovery) / 30 s (`initialize`). Design: start-up bound 90 s at the connection (renaming the reused `INITIALIZE_TIMEOUT_MS` into `AGENT_START_TIMEOUT_MS` and `REQUEST_TIMEOUT_MS`), short process 90 s, Grok CLI probes 3 → 10 s (Antigravity's value).
2. `RUN_MODEL_NOT_OFFERED`: on the first Grok start after ≥ 6 h idle (expired sign-in), Grok answers `initialize` with its built-in list and announces the real one via connection-wide `_x.ai/models/update` ~0.2–1 s later; discovery stopped Grok first. Design: `AcpClientConnection.onConnectionNotification`; `runAcpDiscoveryHandshake(profile, { method, withinMs }, options)` returns `{ initialize, followUp }`, waiting up to 3 s (never past the bound); the Grok capability uses the announced list.
3. AC-104: Grok skips project skills in untrusted folders. Design: Grok run processes get `GROK_FOLDER_TRUST=0` (per process, nothing persisted); discovery processes stay untrusted.

## Points for review

- The 3 s wait on every Grok discovery when no announcement comes (Key Tradeoffs).
- One shared start-up bound for all ACP agents vs per agent.
- Trust scope and its consequences (Risks RSK-002; P17: workspace and user hooks, MCP/LSP, instructions, permission rules).
- Neutrality of the shared ACP layer is kept (method name passed from the Grok side).
