# Handoff — Architecture Review — remote-runs-in-tree (autobyteus-278)

- From: Solution Designer, 2026-10-23. Classification: `Architecture Design Complete`, `task_size=Large`, `architectural_risk=High`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-runs-in-tree`, branch `codex/remote-runs-in-tree`, base `origin/personal` `3b09fbe308`. Finalization target: `origin/personal`. No release unless the user asks.
- Original request: Task autobyteus-278. A run delegated to another node appears under its delegator like a local delegated copy; the user can open it, follow it live and talk to it ("no difference").
- Approval: requirements `Approved` at SR-003 by the user, with his decisions DEC-801, 802, 804, 806, 807. UI/UX package approved by the user (Product-owned): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/remote-runs-in-tree/ui-ux-spec.md` (+ VIS-001 … VIS-021, PA-801 … PA-809).
- Documents (in `tickets/in-progress/remote-runs-in-tree/`):
  - `requirements-doc.md`
  - `investigation-notes.md`
  - `design-spec.md` (SR-004)
  - `solution-revision-record.md`
  - `follow-ups.md` (FU-001: files and terminal, the user's decision)
- Classification evidence:
  - a server-to-server stream (new channel kind);
  - a peer's user reading and driving a run on another node (limited to runs its delegation started);
  - shared stream contracts;
  - the observation lifecycle against root lifecycles on both nodes;
  - three root kinds and three window tree families.
- Please check in particular:
  - A's root as the owner of remote children, with `RemoteRunObservation` shared by the three roots;
  - the frame-to-`agent_presentation` mapping and member addresses;
  - B's directory activation listener as the attach mechanism (DS-006);
  - the phase-1 boundary (no reconnect or catch-up, DEC-807);
  - the REQ-803 clarification.
- Expected output: the architecture review report; on Pass, the reviewer's handoff to implementation.

## Round 2 — 2026-10-23 (SR-005), answering ARCH-REV-001

| Finding | Resolution |
| --- | --- |
| AR-401 | DS-006 rewritten: `observePairedAgents` / `executeOwnerCommand` on each kind's manager behind `RemoteRootDirectory`. Standalone: the host's events through the presentation adapter, re-attached on `onHostReady`; `postToHost`, host interrupt, `stopRoot`. Team: the publisher filtered to members, plus the directory listener; member commands; `terminateTeamRun`. Current-State Read, CM-11 and the B file list corrected |
| AR-402 | Frames `{agentRunId, message}` for the paired agents only; A maps by `agentRunId` to the stored link (mounted addresses) and drops unknown ones |
| AR-403 | An end A didn't initiate runs one summary fetch, which sets the row (reachable false / offline); no reconnect |
| N-401 … N-404 | First frame `{nodeId}` checked; a unit test pins that only the projector maps `remote_agent_presentation`; one `remoteChildOf` helper; REQ-803 wording told to the user |

## Round 3 — 2026-10-23 (SR-006), after CRR-003

| Finding | Resolution |
| --- | --- |
| F-005 (Design Impact) | DS-004a: the owner mark is a content heading `From the owner of node "<name>":` composed by `remoteOwnerUserMessage`; the unread `remote_owner` metadata is removed; a consumer table (agent, B stored conversation and window, A window, title, logs) |
| F-002, F-003, F-004 (Local Fixes, CRR-003) | Owned by implementation, with no design change; listed for the implementation handoff |

## Round 4 — 2026-10-23 (SR-007), FU-004 pulled in by the user

| Item | Resolution |
| --- | --- |
| FU-004 | § Window Retry Rule: `remoteRunsStore.retry` is the one owner of the Retry rule; families register an adapter (`refreshOnStream`, `selectedAgent`, `rereadAgent`); the three per-family copies are removed; behavior unchanged; specs for the rule and per family |

## Round 5 — 2026-10-23 (SR-008), answering ARCH-REV-004

| Finding | Resolution |
| --- | --- |
| AR-404 | § Window Retry Rule: target = selected agent if in the run, else the first not-loaded agent (`isLoaded` adapter query); `rereadAgent` → `false` for a loaded agent; the changes against today are stated per family as intended (standalone/Org and Team), with the Team adapter spec covering them |
| N-405, N-406 | In the DS-004a consumer table (local echo by `message_id`/`dedupe_key`; the title row cited) |
