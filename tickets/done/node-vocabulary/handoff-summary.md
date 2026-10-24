# Handoff Summary — node-vocabulary (autobyteus-290)

Status: **finalized into `personal`, no release** (DR-001). **AC-904, the user's check of the Nodes tab and an agent's `list_peer_nodes`, is open.**

- **Ticket:** one vocabulary for nodes across server, web, desktop, iOS and Android.
  - "node ID" replaces `serverInstanceId`/`sourceNodeId`.
  - "Memory Sync source ID" (`memorySyncSourceId`).
  - `list_available_nodes` becomes `list_peer_nodes`.
  - New `GLOSSARY.md`.
  - Stored-name migrations SM-1 … SM-10, each with a backup.
- **Classification:** `Large` / `High`, reviewed route:
  - design SR-008, ARCH-REV-006;
  - implementation IR-002;
  - code review CRR-002;
  - API/E2E API-REV-001, Pass, 95%;
  - test-code review CRR-003.
- **Integration:** the base moved from `c78ffb15a2` to `034bfe51ab`.
  - Checkpoint `7f0ab84222`.
  - Merge `5ce5291fa2`: a `DESIGN.md` documentation conflict, resolved by delivery; the guideline and `package.json` merged correctly.
  - The architecture reviewer's notes after round 6 were committed (`beda3ed8c2`). The untracked 1.9 MB full web-suite log is not committed.
- **Rerun on the merged state (`evidence/delivery/`):**
  - DEL-01: server typecheck and unit suite, 814 files / 6762;
  - DEL-02: web guards and suite, 685 files / 4881;
  - DEL-03: build and prepare;
  - DEL-05: two-server E2E, 37/37 (RC-12 did not hang);
  - DEL-06: upgrade E2E, 3/3;
  - DEL-07: browser probe, NVP-01 … NVP-05 pass.
- **Verification:** AC-901, AC-902, AC-903 and AC-905 proven from the evidence. Delivery opened:
  - API-03 and API-10 (upgrade E2E, also from a fresh clone);
  - API-04, the released build `c78ffb15a2` → this build, 27/27: same node IDs, backups, a third start changes nothing;
  - API-05 and DEL-07 (web registry and session keys);
  - API-07, the packaged desktop list;
  - API-08, iOS and Android keys;
  - API-09, the word list;
  - the scorecard: 95%.

  The evidence holds only field names, no token or hash values. AC-904 is the user's check, open per the user's standing direction to finalize at delivery.
- **Release:** none. For the next release: `release-notes.md` here. Also, N-912: dev or test data that ran the interim, unreleased migrations needs a manual reset (delete `memory-sync/` and `memory/imports/`); released data is unaffected.
- **Follow-ups** to send: FU-002 … FU-007. FU-001 was pulled into this ticket.
- **For the Solution Designer:** two design-text slips, the SM-5 row's typo and ARCH-REV-006's interim name `syncSourceId`.
