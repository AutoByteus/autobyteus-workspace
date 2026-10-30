# Solution Revision Record — read-file-media-merge (autobyteus-328)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial baseline (Task autobyteus-328; 327 decision) | N/A | N/A | Ready for Approval | BEH-001..010, REQ-001..008, AC-001..008 | waits for DEC-001, DEC-002 |
| SR-002 | Requirements | The user's answer, 2026-10-29 | DEC-001, DEC-002 | Ready for Approval | Approved | BEH-008, BEH-010, REQ-006, REQ-008, AC-006 | approved |
| SR-003 | Design | Architecture design on the SR-002 basis | N/A | N/A | Design Ready | REQ-001..008 | `design-spec.md`; Medium / Low |
| SR-004 | Mixed | The user's decision on binary files, 2026-10-29 | DEC-004 | Approved / Design Ready | Approved / Design Ready | BEH-011, REQ-009, AC-009 | FU-001 moved into scope |
| SR-005 | Mixed | CRR-001/CRR-002 (API-REV-001/002 Fail): CR-001, CR-002, CR-003; the user's DEC-005 | CR-001..003 | Approved / Design Ready | Approved / Design Ready | BEH-012, REQ-010, AC-010, DEC-005, DEC-006 | root cause proven and fixed in scope |

## Revision Entries

### SR-001 — Requirements baseline

- Classification: `Initial Baseline`. Basis: the user's option (a) in autobyteus-327; Task autobyteus-328.
- Evidence that changed the plan: unknown tool names are skipped and `read_file` is always present (no breakage without a migration); package roots outside the app's ownership; precedents 290 and 294 → DEC-001 recommends no migration; package timing → DEC-002.
- Approval: pending (DEC-001, DEC-002 need the user).
- Next action: the user's answers, then architecture design.

### SR-002 — The user's approval

- Trigger: the user, 2026-10-29: "The stored agent configuration … belongs to a separate project … it can be done after another tickets … not in this tickets. Yeah, exactly."
- Changed: DEC-001 no migration; DEC-002 public packages in a separate ticket; BEH-008/010, REQ-006/008, AC-006, Out of Scope.
- Approval: `User`, baseline SR-002. Next: architecture design.

### SR-003 — Architecture design

- `design-spec.md` (new): `read_file` reads by kind (media branch in `tools/file/read-file-media.ts`), `ReadMediaFile` removed, Work Journal renderer and Daily Assistant updated; no migration (DEC-001); FU-001, FU-002.
- Classification: `task_size` Medium, `architectural_risk` Low (no persistence, API, web, concurrency or lifecycle change; the tool removal is absorbed by the existing unknown-name rule and the always-present `read_file`).
- Applied handoff-rule outcome: `handoff-architecture-design-complete.md`.

### SR-004 — Binary files refused (FU-001 into scope)

- Trigger: the user, 2026-10-29: "just make reading PDF and other binary not supported only support readable format right?" and "i think it could be done in this ticket no as follow up".
- Changed: BEH-011, REQ-009, AC-009, DEC-004 (user); design: binary check in `read-file.ts` (NUL byte in the first 8,000 bytes, after the media kind, one read), description sentence, Change Scope; FU-001 not sent.
- Classification unchanged (Medium / Low). Downstream: the implementation engineer is told (same route).

### SR-005 — CR-001 root cause (OpenAI `strict` default), CR-002, CR-003

- Trigger: code review CRR-001/CRR-002 of API/E2E API-REV-001/002 (F-1 GPT-5 fills line arguments; F-2 PDFs pass the 8,000-byte sniff; F-3 article).
- Evidence: the tool schema is correct (`evidence/SD-03`: only `path` required); OpenAI SDK 6.22.0 documents Responses `FunctionTool.strict` "Default `true`" (`responses.d.ts` L368); `openai-responses-llm.ts` L148-160 omits it. Experiment `evidence/SD-02-openai-strict-probe.test.ts.txt`: run 1 no credits; run 2 (new key loaded by the user's file, deleted after) — strict omitted: 8/8 calls fill every optional argument; `strict: false`: image reads send only `path` 4/4, text reads only the requested range (Reproduced, `SD-02-openai-strict-probe-run2.json`).
- Decisions: DEC-005 (user): fix in this ticket; BEH-004 refusal stays. DEC-006 (Solution Designer): whole-buffer NUL scan. CR-003 article fix; line-argument descriptions improved; media line-range refusal text says not loaded.
- Requirements: BEH-012, REQ-010, AC-010 (user-approved via DEC-005). Classification: Medium / Low unchanged (one request field, restoring the non-strict behaviour our schema code already intends; Chat Completions and other providers unchanged).
- Next: the revision to implementation.
