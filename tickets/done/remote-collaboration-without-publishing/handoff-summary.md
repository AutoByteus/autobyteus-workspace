# Handoff Summary — remote-collaboration-without-publishing (autobyteus-245)

Status: **verified; finalized into `personal`** (DR-001). No release.

## Ticket

- Package: `remote-collaboration-without-publishing`, Project Task `autobyteus-245`, part of autobyteus-25 (remote collaboration). With Remote Collaboration on, registered peers can start **any shared Agent** of a node at its catalog address, with no publish step. The run uses the Agent's own default runtime and model, the node's temp workspace and auto-approved tools. Publishing is removed.
- Classification: `task_size=Medium`, `architectural_risk=High`. Route: reviewed:
  - architecture review ARCH-REV-002, Pass;
  - code review CRR-001, Pass, 9.4/10;
  - API/E2E API-REV-001, Pass, 95%;
  - test-code review CRR-002, Pass.
- Revisions: SR-001 … SR-005, ARCH-REV-001 … 002, IR-001, CRR-001 … 002, API-REV-001, DR-001.
- Archived ticket folder: `tickets/done/remote-collaboration-without-publishing/` on `personal`.

## What Changed

- **Shared launch resolver** (`collaborator-launch-resolver.ts`, `collaborator-root-port.ts`): `launchBase()` is `inherited` (the run roots, unchanged behavior) or `defaults_only` (new).
- **`NodeCatalogPort`:** the `defaults_only` base for peers: the temp workspace and auto-approve.
- **`CollaboratorNoDefaultLaunchError`:** raised when an Agent has no usable default.
- **Node B's `RemoteDelegationReceiver`:** resolves the target through `CollaboratorAdmission` (kind first, then launch). It refuses before preparing a run, with `AGENT_NOT_FOUND`, `REMOTE_TEAMS_NOT_SUPPORTED`, `NO_DEFAULT_RUNTIME` or `AGENT_CANNOT_RUN`, and passes the target's name to the delegating agent's text.
- **Contract between nodes:** `address` replaces `publishedAddress`.
- **Removed:** the published-Agent services and store, the launch check, the GraphQL publish API, and the web publish section. The Remote Collaboration tab now shows an "Agents available to peers" note.
- **Tests:** the two-server E2E was rewritten for the new behavior (20 cases), plus unit and web tests.
- **Docs:** CM-12, `remote_collaboration.md`, `agent_communication.md`, `agent_tools.md` and the web `settings.md`, updated in `63f6635b6d` and verified by delivery (`docs-sync-report.md`).

## Integration

- `origin/personal` was still `786055f3d7`, the bootstrap base, and remained so up to finalization. No merge was needed.
- A checkpoint commit `fc385efcab` added the reviewer's uncommitted CRR-001/002 documents (documents only).
- No rerun was needed: the validated code (`e5d0405aef`, test `951793a444`) is exactly what is finalized, on the same base. The API/E2E runs at that state are the integrated-state evidence.

## Verification

- **Judged from the evidence: sufficient.** Every critical criterion AC-201 … AC-208 is directly proven, and nothing needs the user. Details are in `release-deployment-report.md` § Verification.
- **Evidence opened:**
  - both E2E receipts: 20/20 each, clean cleanup;
  - RC-03's no-publishing checks, RC-04's nine refusal records and the test's side-effect assertions, RC-05's run metadata, RC-17 and RC-20;
  - API-21's same-node suites;
  - the browser card (API-22 log and screenshot).
- **Confidence:** 95%, with no category below 90%.

## Release

- `No release`. None was requested; `RELEASE.md` defaults to finalize only. The change ships with the next release, and a beta `1.5.8-beta.5` can be cut on request. That beta would also carry autobyteus-191, which has not been released yet.

## Residual Risks And Follow-ups

- RSK-201: tool calls are always auto-approved for remote runs, and CLI runtimes on B use B's local login for any registered peer. The user accepted this; the tab note and the module docs say it.
- Agent Teams across nodes are autobyteus-247. Until then, a shared Team address is refused with "not supported yet". 247 should also confirm the Team `defaults_only` default recording, an implementation assumption that 245 cannot reach.
- FU-001 (a default workspace in definitions) was already sent. No new follow-ups.
- The optional CRR-002 test notes were not applied: the RC-03 label wording and an extra built-in existence check.
