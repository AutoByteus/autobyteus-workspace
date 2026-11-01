# API/E2E Revision Record — automatic-app-node-updates (autobyteus-356)

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 Pass, round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | `Fail` / 86.1% (F-API-001 `Local Fix`; F-API-002 `Local Fix` + `Design Impact` part) |

## Revision Entries

### API-REV-001 — Baseline: real automatic install on isolated copies; real nodes

- Triggering role, report path, and round: code reviewer; `code-review-report.md` (CRR-001); round 1.
- Triggering finding or case IDs: N/A.
- Related revision IDs: SR-003; ARCH-REV-002; IR-001; CRR-001.
- Why recorded: first complete API/E2E result for code `31d38080fc` (review `e8b51df9ad`).
- Coverage decisions or durable test paths changed: none. Temporary harness `evidence/API-356-*`:
  - feed, copy preparation, watch, drive, busy agent;
  - node proxy, nodes, Dockerfile, package maker, release source.
- Cases: API-R1, API-00, API-01..API-10.
- Commands, environment, fixture, or broader-validation delta:
  - a clean checkout of `e8b51df9ad`, with V1 and V2 builds;
  - test copies with their own identity, `LSEnvironment` and an explicit-requirement ad hoc signature, so the real Squirrel install and relaunch stay isolated (discovery in the investigation);
  - test-owned nodes on the published 1.5.11-beta.7 image with a throwaway key.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, report, progress log.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 86.1%.
- New or remaining failure IDs:
  - F-API-001: the sidebar entry says "0 updated" after an automatic app update.
  - F-API-002: after a native install refusal the old version stays open without its server and is not relaunched; the state message is also overwritten by a download error.
- Recommended owner: failure-origin review by the code reviewer.
- Remaining risks, blocked evidence, or untested scope:
  - Windows/Linux;
  - Developer ID signed install (user-only);
  - the quit-bound and catch paths (unit only);
  - switching on while downloaded or staged (unit only).
