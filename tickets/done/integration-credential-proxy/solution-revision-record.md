# Solution Revision Record — integration-credential-proxy (autobyteus-311, step 1)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-311 assigned 2026-10-30 (first step: the GitHub credential proxy, design first) | H-1…H-5 (first copy); 244 V1/V1b | N/A | Ready for Approval | REQ-001…REQ-012, AC-001…AC-008, DEC-001…DEC-009 | Requirements; DEC-001…DEC-004 asked to the user |
| SR-002 | Requirements (approval) | The user, 2026-10-30, after the proxy explanation | — | Ready for Approval | **Approved** | DEC-001…DEC-004 (recommendations) | Architecture phase next |
| SR-003 | Design | Requirements approved (SR-002) | M-1…M-4 | N/A | Design Ready (Large/High) | DS-001…DS-005 | `design-spec.md`; to architecture review |
| SR-004 | Design (revision) + Requirements (one user decision) | ARCH-REV-001 Fail | AR-001…AR-006, M-5 | Design Ready | Needs user decision (DEC-011) | DS-004, DS-005, variables, AC-006, DEC-011 | Two release points; URL and redirect rules; no access log; AC-006 testable; Codex sandbox question to the user |
| SR-005 | Requirements (user decision) | The user answered DEC-011 | — | Needs user decision | Design Ready (Large/High) | DEC-011, Codex row | Automatic network for Codex sandbox runs with integration access; back to architecture review |

## Revision Entries

### SR-001 — Baseline

- Trigger: the Task, its three comments, and the PTM's message relaying the user ("skill plus authentication"; the proxy reads tokens from the vault; "the address is replaced"; "how does an agent use it?").
- Inputs: the first team copy's handover (H-1…H-5), autobyteus-141's text (from the PTM), and 244's `solution-validation.md` (V1, V1b, V6).
- Evidence added:
  - core's per-execution terminal environment seam has no supplier today (`terminal-child-environment.ts`; supplier removed in `2448e166bd`);
  - git ≥ 2.31 accepts config through the environment.
- Approval: not yet. DEC-001…DEC-004 are asked directly in the Solution Designer conversation.
- Next: the user's answers, then the architecture phase (measure UNK-001 and UNK-002 first).

### SR-002 — Requirements approved

- The user asked how curl reaches the proxy, got the explanation (the address is `127.0.0.1`, the server itself; git is redirected by its own `insteadOf`), and then said: "It's really smart, very smart. I think other requirement already clear now. We started to implement this proxy." He also asked whether it runs in the same server process (yes, by design: the proxy is part of the AutoByteus server that holds the vault).
- Recorded as approval with the recommended answers to DEC-001…DEC-004: a GitHub card in Settings; only ticked agents; whatever the token allows, with approval prompts later; no `gh` own commands in this step. The user was told this explicitly so he can correct it.
- Next: the architecture phase. Measure UNK-001 (Codex per-thread shell env) and UNK-002 (git push) first.
- 2026-10-30, the user asked whether the proxy endpoint could be configurable for a company's central proxy. After the two options were explained, he said: "For the current [one], let's keep it simple … I currently have no idea." Recorded as DEC-010: the agent always talks to the node's own proxy. The upstream address is a definition field (default GitHub), with no visible setting in step 1.

### SR-003 — Architecture design

- Authorities: `architecture-design.md`, `design-principles.md`, `DESIGN.md`.
- Measured:
  - M-1: Codex per-thread shell env works;
  - M-2: clone and push with git config from env only;
  - M-3: GitHub git needs Basic `x-access-token`, while the API takes Bearer (corrects the 244 V1b premise, which used a stand-in service);
  - M-4: Docker git 2.43.
- Design: a new `credential-proxy` subsystem shaped like the Agent Tools MCP host:
  - a loopback listener, reusing its gate;
  - run passes issued at backend preparation through one `IntegrationRunAccess` and revoked at the single release point;
  - app-owned GitHub definition with `api` and `git` routes;
  - the token in the vault (`integration.github.token`);
  - `connections.json` holds the login and allowed agents;
  - an activity log;
  - the GitHub card and its GraphQL.
- Classification: Large / High.
- Follow-up FU-001: the Claude api-key is in the Claude child env; for autobyteus-219.

### SR-004 — Revision after ARCH-REV-001

- AR-001: measured M-5. Codex's default `workspace-write` sandbox blocks the shell from `127.0.0.1`; `network_access` per thread or full access works. Codex's own allow-list is experimental. This is a security decision, DEC-011 (Needs user), recommendation (a).
- AR-002: revoke at both release points (resource release, and the failed-activation `deactivateMcp` hook).
- AR-003: the upstream URL is built on the route's fixed origin with path normalization and an origin check; `redirect: "manual"`; same-origin `Location` rewritten through the proxy; `GIT_TERMINAL_PROMPT=0`.
- AR-004: no access-log policy on the proxy listener.
- AR-005: AC-006 restated as testable cases; the same-user copy is R-1.
- AR-006: 401 → 403 on the git route only.
- Requirements status line fixed.

### SR-005 — The user's decision on the Codex sandbox

- The user, 2026-10-30, asked whether auto-execute is already the default, and: "do we add the permission by default so [the user] doesn't need to configure but the permission is added for default is it possible".
- Evidence given: yes, auto-execute is on by default for new runs (cited in DEC-011). With it on, Codex has full access and the proxy works. Only auto-execute-off runs use the sandbox, and per-thread `network_access` fixes them (M-5).
- Recorded as option (a), applied automatically: the user was told so he can correct it.
- Next: back to architecture review (ARCH-REV-002).
- ARCH-REV-002 (2026-10-30): Pass. AR-007 fixed: handoff.md was rewritten for round 2 after the reviewer read it, and requirements L6 now says SR-005. AR-008 added to the design: the docs state that read-only Codex runs can't reach integrations. The reviewer handed the package to the Implementation Engineer.
