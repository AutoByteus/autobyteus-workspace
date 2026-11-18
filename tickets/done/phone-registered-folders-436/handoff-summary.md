# Handoff Summary — phone-registered-folders-436 (autobyteus-436)

## What Ships

On the phone, a file path a conversation names opens read-only wherever the file is on the node's computer, through a new GET-only node route (`/rest/node-files/content?path=<absolute>`) for owner and phone credentials. A missing file and a folder get their own messages. Peers and Memory Sync sources are refused.

## Classification

- `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed` (architecture review; code review CRR-001 Pass; API/E2E API-REV-001 Pass 95%; test-code review CRR-002 Pass).

## Integrated State

- Branch `codex/phone-registered-folders-436`; base `97ed263074` → merged `origin/personal` `a85bf4f38d` (one commit: the beta.10 release record, ticket documents only) as `e8d8b1a073`, method merge, no conflicts.
- Post-integration check: `vitest run tests/e2e/node-files` on the merged state: 5/5 Pass.

## Verification

- From the evidence: AC-001…AC-006 proven, nothing left for the user (see `release-deployment-report.md` § Verification).

## Residual Risks

- C-03: on a Windows node a folder path may read "could not be opened" (no Windows host).
- A large PDF on a real phone was not checked (shown on a headless phone: 18 MB in 721 ms).
- A remote run's file link is covered by a spec only.
- Follow-ups FU-001…FU-004 (`follow-ups.md`); **FU-004 is urgent**: 15 server e2e files send no node credential or MCP token since autobyteus-437. The Solution Designer sends them.

## Release

- Decision: Beta, decided by the user in advance for this ticket, with the same waiver as before: Codex and Grok in the release smoke check only on a usage limit.
