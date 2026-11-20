# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Founder's decision on 483-FU-004, 2026-11-20 | N/A | (round 2: REQ-004 Ready for Approval) | Approved; design Ready | REQ-001..REQ-005 | Show Grok's self-started turns |
| SR-002 | Design | ARCH-REV-001 Fail | AR-001..AR-004 | design Needs Revision | design Ready | design only | Probe 2; prompt_completed ends either origin; renames; one opening step |
| SR-003 | Design | ARCH-REV-002 Fail | AR-005, AR-006, AR-002/003 | design Needs Revision | design Ready | design; AC-006 added (verifies preserved behavior) | One-batch hand-over at the response |

## Revision Entries

### SR-001 — Grok self-started turns (option b)

- Phase and classification: `Initial Baseline` of round 3 (continues `tickets/done/followups-483-517` DEC-003)
- Trigger: the user in the Solution Designer's conversation, 2026-11-20: "If we do not have credits for grok, I would waive for grok"; "Anyways you know the best. I will follow by our reasonable suggestion" → option (b), live check waived without credits.
- Evidence: `evidence/grok-acp-probe.jsonl` (2026-11-18), code reads in investigation notes.
- Status: requirements `Approved` (User); design `Ready`.
- Classification: `Medium` / `High` (shared ACP session turn lifecycle and concurrency).
- Next action: hand off per the rules (architecture review for High).

### SR-002 — Architecture review ARCH-REV-001 (Fail) resolved

- Phase and classification: `Design Impact` (AR-001 Unclear resolved by evidence; AR-002..AR-004)
- Trigger: `design-review-report.md` ARCH-REV-001.
- AR-001: probe 2 (`evidence/grok-acp-probe2.jsonl`, live Grok 1.0.88): a job ending during a client turn is queued by Grok as its own prompt after that turn; its `queue/changed` arrives before the client's `session/prompt` response. Rule: `prompt_completed` ends the active turn of either origin by matching prompt id; the prompt response still ends a client turn if first. Scripted Grok and tests get this order. Cancel of a provider prompt also probed (immediate `turn_completed(cancelled)`).
- AR-002: effects renamed `prompt_running` / `prompt_completed`; the origin is `provider` (Claude's word); GLOSSARY.md "Provider-started turn".
- AR-003: notice content and sender id travel in the effect; payload key `turn_id`.
- AR-004: one private turn-opening step for both origins (resets `callOrdinal`, `userDeniedInTurn`, call boundary); the session allocates provider turn ids; backend comment narrowed.
- Requirements unchanged (no approval impact). Classification unchanged `Medium` / `High`.
- Next action: back to the architecture reviewer.

### SR-003 — Architecture review ARCH-REV-002 (Fail) resolved

- Phase and classification: `Design Impact`
- Trigger: `design-review-report.md` ARCH-REV-002: AR-005 (High: ending the input turn on `prompt_completed` lets AgentRun see the run idle for one batch between frames 211 and 212 and dispatch a held message, which is then refused and failed, or sent as a second concurrent prompt), AR-006 (drop optional item 5; correct the notes row), AR-002/AR-003 leftovers.
- Changes: input turns end on the `session/prompt` response again; `prompt_completed` of the input prompt only marks it completed; a `prompt_running` with another id after that is the pending provider prompt; at the response the session emits one batch [input end, provider TURN_STARTED, notice] and stays `prompting` (DS-002/DS-003 traced, example, scripted case b, new AC-006). Item 5 dropped; notes row corrected. Design spec rewritten so every section uses `prompt_running`/`prompt_completed`, origin `provider`, the effect-carried notice, `backends/grok/…` paths, GLOSSARY.md (Intended Change 6), probe 1 and 2 in the guidance.
- Requirements: AC-006 added — it verifies the preserved input queueing (BEH-002, REQ-003/REQ-005), no new intended behavior; approval unaffected.
- Classification unchanged: `Medium` / `High`.
- Next action: back to the architecture reviewer.

- 2026-11-20 (informational): ARCH-REV-003 **Pass** on SR-003 (covering SR-001..SR-003); the reviewer handed the package to `/implementation_engineer`. Its note applied: `requirements-doc.md` revision ID updated to SR-003.
