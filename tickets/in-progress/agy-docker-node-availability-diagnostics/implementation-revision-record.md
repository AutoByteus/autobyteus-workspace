# Implementation Revision Record — agy-docker-node-availability-diagnostics

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / `solution-handoff.md` / initial | N/A | `Initial Baseline` | SR-003; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implemented; local checks green; routed per handoff rules |

## Revision Entries

### IR-001 — Sign-in classification, neutral "Unavailable" row with reason, re-check on open

- Triggering role, report path and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/solution-handoff.md`, initial round.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation of design SR-003 complete. Small / Low confirmed.
- Related solution revision IDs: SR-003
- Related architecture-review, code-review, API/E2E and delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: REQ-001..004, REQ-006, REQ-007 (local layers); BEH-001..007; AC-001..005, AC-007, AC-008. REQ-005 / AC-006 are preserved; their live Docker proof is still pending downstream.
- Implementation delta:
  - **Server.** `AGY_SIGN_IN_REQUIRED` and the module-private `AGY_SIGN_IN_PATTERN`, applied in `runCommand`'s non-zero `close` path. Reworded `AGY_CLI_UNAVAILABLE` / `AGY_CLI_UNSUPPORTED` texts.
  - **Web.**
    - The `ensureAvailability` snapshot forces a re-check of unavailable kinds.
    - The menu row shows the "Unavailable" label and a 2-line reason; unavailable rows are top-aligned.
    - `chat.model.notInstalled` is replaced by `chat.model.unavailable` (en/zh-CN).
  - **Docs.** Docker README, AGY module doc and web `chat.md`.
- Changed files or areas:
  - server: `antigravity-cli-capability.ts`;
  - web: `useChatModelCatalog.ts`, `ChatModelMenu.vue`, en/zh-CN `chat.ts`;
  - docs: three files;
  - tests: five spec files.
- Local validation and result:
  - focused server unit tests: 486 passed;
  - server typecheck and build: passed;
  - web focused tests: 17 passed;
  - web guards: passed;
  - full server `test:unit`: 5364 passed; full web `test:nuxt`: 4241 passed;
  - rendered check (r1 found a label-alignment defect, fixed; r2 clean).
- Next recipient or routing: per `get_handoff_rules` (Small/Low → direct API/E2E).
- Remaining limitations or risks:
  - RSK-001 upstream wording drift;
  - RSK-002 spawn per open while signed out;
  - zh-CN, current-and-unavailable runtime and Electron shell not rendered;
  - Docker-node live validation not run by implementation.
