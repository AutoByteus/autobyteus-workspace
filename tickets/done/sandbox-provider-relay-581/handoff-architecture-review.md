# Handoff: architecture review of autobyteus-581

- **Package:** `sandbox-provider-relay-581`, SR-003
- **Classification:** Architecture Design Complete. task_size **Large**, architectural_risk **High** (new peer route with credential effects, sandbox network boundary, login tokens, container lifecycle).
- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/sandbox-provider-relay`, branch `codex/sandbox-provider-relay`, base `origin/personal` @ `9f803aa84d`. Finalization target `origin/personal`. Nothing committed yet.
- **Ticket folder:** `tickets/in-progress/sandbox-provider-relay-581/`

## Original request and goal

autobyteus-581 from `/project_task_manager`, with the user's direction from autobyteus-484:
1. A node can send its runtimes' model calls through a **paired relay node** that attaches the credential, so no credential is ever inside it.
2. Agents can create **disposable sandbox nodes** from the server image (paired, relayed, network-limited, mapped folders, expiring) with three tools.

API keys are on. Login tokens are built for Claude, Codex and Grok and off by default; Antigravity is not supported. Implemented on macOS with Docker Desktop; Linux and Windows are designed (follow-up).

## Approval basis

- requirements-doc.md SR-002, **approved by the user** on 2026-11-26 (his answers on DEC-105, DEC-108, DEC-109 and "that's okay for me … let's do it this way").
- The 484 decisions DEC-001 to DEC-019 are the direction ([history-484/requirements-doc.md](history-484/requirements-doc.md)).
- The design needs no separate user approval.

## Documents

| Document | Path |
| --- | --- |
| Requirements | `requirements-doc.md` |
| Investigation (probes P-1 to P-13) | `investigation-notes.md`, `probes/` |
| Design (contract C1–C10, validation V-8 to V-12, platforms) | `design-spec.md` |
| Revision record | `solution-revision-record.md` |
| Follow-ups | `follow-ups.md` (FU-581-01 to 04, not yet sent) |
| History | `history-484/` |

## What I'd like the review to look at hardest

1. **The relay boundary (C4):**
   - the kind in the signed path;
   - the kind-mismatch refusal;
   - the no-fallback rule;
   - the gate's body hash with a raw-body route (32 MiB limit);
   - streaming the reply through the peer client.
2. **`ProviderRelayRouting` as the one owner** of "how a runtime authenticates on this node". Check it is not an empty layer: it holds the C1 decision and pass issuing.
3. **The Codex node pass** (one shared app-server) versus per-run passes elsewhere.
4. **Sandbox network:** a per-sandbox internal network plus the egress container (P-9, P-10), and the Linux in-memory admission of a sandbox subnet (§ Platforms).
5. **Login tokens:** C9 (vault entry from `setup-token`); C10 (read Codex and Grok login files, never renew); U-1 and U-2 (proven live per DEC-108).
6. **Removal plan and the run-pass holder tightening.**

## Open risks

- U-1, U-2: login-token details for Codex and Grok, proven live in validation (DEC-108).
- R-1: Node `NODE_USE_ENV_PROXY` is experimental.
- Codex ChatGPT mode's many side calls must fit C3's allowed paths.
- ASM-001, ASM-002: the desktop's public URL is loopback; release images exist per version.

## Expected next step

Architecture review. On Pass, the reviewer routes to implementation per the team's rules. Findings come back to the Solution Designer.

## Route

2026-11-26: the handoff rules were applied. The rule for "Architecture Design Complete with task_size=Large or architectural_risk=High" matched, and the package was sent to `/architecture_reviewer` (delivered).
