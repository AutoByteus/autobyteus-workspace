# Solution Revision Record — node-vocabulary (autobyteus-290)

## Revision Index

| SR | Date | Phase | Summary |
| --- | --- | --- | --- |
| SR-001 | 2026-10-24 | Requirements | The audit and the proposed renames |
| SR-002 | 2026-10-24 | Requirements | Approved; held for the naming principle |
| SR-003 | 2026-10-24 | Design | Design complete under Principle 15; Large / High |
| SR-004 | 2026-10-24 | Mixed | The version field removed; phone apps' entries |
| SR-005 | 2026-10-24 | Mixed | ARCH-REV-001 (AR-901 … AR-903, N-901 … N-904) |

## Revision Entries

### SR-001 — Audit and proposal (2026-10-24)

- Trigger: the PTM's delegation of autobyteus-290, with the user's correction.
- Prior status: N/A. Current status: `Ready for Approval`.
- Open: U-1, U-2 (the user).

### SR-002 — Approved; held for the naming principle (2026-10-24)

- The user left U-1 and U-2 to the Solution Designer's recommendation ("I think that you have much better language skill and you also understand our system much better than me now"): U-1 (a) keep stored names, U-2 (a) rename the identity wire field to `nodeId` (iOS `ConnectionValidator.swift` included).
- Status: `Ready for Approval` → `Approved`.
- The user then asked to improve the team's design principles first ("so that we can first work on the principle"). The proposal was sent to the PTM: `/Users/normy/autobyteus_org/autobyteus-task-results/autobyteus-290/naming-principle-proposal.md`. Design is held until the PTM reports the principle has landed.

### SR-003 — Design under Principle 15 (2026-10-24)

- Trigger: the PTM reports the naming principle landed (autobyteus-agents-57, PR #109, `179acb4`); the skill's principles and template were re-read.
- Audit additions: V-08 ("a delegated run is a peer" in the contract), V-09 (the mobile session's `nodeId` = its entry ID), V-10 (Memory Sync's "source node id", a third ID: FU-002). FU-001: `compatibilityVersion`, rule 9.
- Design: six steps, each with no behavior change. A glossary in `collaboration_model.md` § 1 with a `DESIGN.md` pointer. Stored names keep their form through one mapping owner each (U-1); the identity wire field becomes `nodeId` (U-2), with iOS included.
- Classification: `Large` / `High`. Route: architecture review.

### SR-004 — The version field removed; the phone apps' entries (2026-10-24)

- Trigger: the user on FU-001: "The version number like compatibility number, I think we should remove it … it's against our rule". The iOS app checks it (`ConnectionValidator.swift:135`, `>= minimumCompatibilityVersion`), which is a version check rule 9 rules out.
- Changes:
  - REQ-909 and design Step 1b: remove the field and the iOS check; the only intended behavior change.
  - REQ-901 and Step 4 extended to the phone apps' saved node records (iOS and Android `SavedNodeProfile` → `SavedNodeEntry`), found while tracing the field.
- Approval: REQ-909 is the user's request; the entry naming is within the approved direction.
- Route: an addendum to the architecture review in progress.

### SR-005 — ARCH-REV-001 resolved (2026-10-24)

- AR-901 (Requirement Gap, the user's decision): the stored tool selections are out of this ticket. No migration, no alias. REQ-906 states the exception. The Agent Package Creator updates its package in a separate ticket, and a release note covers it.
- AR-902: the Electron string carriers listed in Step 4 with citations; AC-901 made concrete (a list of remaining `nodeId` uses with meanings).
- AR-903: Memory Sync renamed now (REQ-910, Step 5b): `sourceId` / "Source ID" in code, GraphQL, hub wire and UI; stored names through their owners. FU-002 keeps only "should it be the node ID?".
- N-901: a repository-level `GLOSSARY.md` with a `DESIGN.md` pointer. N-902: iOS 426 branch and `incompatibleServer` removed. N-903: FU-001 already marked as pulled in. N-904: every mapping owner named.
- Approval: AR-901 decided by the user (2026-10-24). REQ-910 is within the approved direction (REQ-901's rule applied).
- Route: round 2 of the architecture review.
- SR-005 addendum (ARCH-REV-002, AR-904): § Verification's word list points to Step 1's owners, adds `sourceNodeId` and allows `list_available_nodes` only in the release note. REQ-903 and the Scope Guardrail no longer name agent configs (REQ-906).
- SR-005 addendum (ARCH-REV-003 Pass, 2026-10-24): N-905 (RSK-902 reworded); Step 5b also renames the Memory Sync docs (memory_sync.md, agent_memory.md). The reviewer's round-3 files committed.

### SR-006 — Stored names follow the code (U-3, 2026-10-24)

- Trigger: the user reversed U-1. Stored names must stay in sync with the code, through sealed migrations (quoted at U-3), and the project documents say so now.
- Project documents updated (commit `b3d9c758f2`): `DESIGN.md` rule 10 "Stored names stay in sync with the code" (the old sentence in rule 8 removed), and the Data Migration Guideline (§ 2 item 1, § 3 "Stored names follow the code"). The team's principles are aligned by the PTM's autobyteus-agents-54.
- Requirements: U-3 added; REQ-911 (migrations SM-1 … SM-8), REQ-912 (the documents), REQ-913 (no new node ID on a failed identity migration; remote features held back); AC-905. REQ-905 and AC-901 aligned.
- Design: § Stored Names Migration, with the guideline checklist.
  - Server SM-1 … SM-5 in `app-data-migrations` (new capabilities `node_identity`, `memory_sync`).
  - Client SM-6 … SM-8 in a new sealed `autobyteus-web/client-data-migrations/` (an Electron file runner and a browser-storage runner).
  - The mapping owners are removed; an entry keeps `id` on the record itself. No real user data was read (the user declined); the fixtures come from the released writers.
- Verified: migrations run before services are built (`server-runtime.ts:183-206`); capability hold-back precedent (`token-usage-run-records-v1`, `custom-provider-readable-id`).
- Implementation was told to hold the mapping owners (message 2026-10-24) and continue the plain renames.
- Classification: `Large` / `High` (now with persisted-data migrations on server and client). Route: architecture review.

### SR-007 — ARCH-REV-004 resolved (2026-10-24)

- AR-905: the hold-back chains are named. `markCapabilitiesPending` and `applyCapabilityReadiness` gain `node_identity` and `memory_sync`. `NodeIdentityService` throws one explicit error and never writes while held back; each consumer's answer is named (status route, gateway and client, pairing, GraphQL); fresh install; the Memory Sync gates. Verified at `node-identity-service.ts:32-50`, `app-data-capability-readiness.ts:10-20`.
- AR-906: decided (a) under rule 10 (within the user's U-3 direction). SM-9 (iOS keys) and SM-10 (Android keys) rename "profile" → "entry" through each app's sealed step; record fields unchanged.
- N-906: SM-1 with different values fails and holds back; `createdAt` is kept. N-907: SM-6 copies records field by field and fails only on unreadable JSON. N-908: runner call sites cited. N-909: noted.
- A design mistake of the kind design-examples Case 5 describes (a guarantee claimed without naming its owner and consumers) goes into the Case 7 material for the PTM.
- Route: round 5 of the architecture review.
- SR-007 addendum (ARCH-REV-005 Pass, 2026-10-24): N-910 decided as the status route answering 503 `NODE_IDENTITY_NOT_MIGRATED`, with the web probe (`identity_pending`), PeerClient and the phone apps stating the reason. N-911: the phone call sites and boundary checks cited. The reviewer's files committed.

### SR-008 — `memorySyncSourceId`; design-text corrections (CRR-001, 2026-10-24)

- Trigger: the code reviewer's CRR-001 F-001 (Design Impact). The new name `sourceId` collides with three existing IDs: a skill source (`skills/domain/skill-source.ts:23`), an update notification's source (`update-notifications/domain/update-notification.ts:26`), and a package source (`agent-package-mappers.ts:183`); 145 uses at the base. My SR-005 choice judged the name only against Memory Sync's own files, the mistake design-cases Case 7 records (and Case 6 in the package's case studies).
- Design: Memory Sync's identity is `memorySyncSourceId` ("Memory Sync source ID"; checked: no use at the base). The SM-2 … SM-5 targets become `memorySyncSourceId`, `boundMemorySyncSourceId`, `memory-sync-source.json`, and `shared/memory-sync-source-id.ts`. They are unreleased, so the targets change in place with no extra migration. REQ-910 and Step 5b updated; implementation updates `GLOSSARY.md`.
- Design-text corrections from the implementation's accepted assumptions:
  - 1: pairing doesn't embed the node ID, so it isn't gated;
  - 2: no GraphQL field serves the node ID, so the Nodes tab uses the probe's `identity_pending`;
  - 4: the "Left alone" list no longer names `EMBEDDED_NODE_ID` or the `.v1` key.
- F-002 (`RemotePeerStartedRunViews` → `PeerStartedRunViews`): a Local Fix, owned by implementation.
- Classification unchanged. Route: architecture review of the delta, then implementation, then the code reviewer's Targeted Delta Review of F-001 and F-002.
- SR-008 addendum (2026-10-24): the name is the user's choice of the full feature prefix: `memorySyncSourceId` / "Memory Sync source ID", `boundMemorySyncSourceId`, hub file `memory-sync-source.json` (no abbreviation such as "mem", which has other meanings). Checked: no use of these names at the base.
