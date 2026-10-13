# Implementation Revision Record — agy-docker-node-availability-diagnostics

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / `solution-handoff.md` / initial | N/A | `Initial Baseline` | SR-003; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implemented; local checks green; routed per handoff rules |
| IR-002 | User (direct request while testing) / chat / round 2 | N/A | `Local Fix` (user-approved wording change) | SR-003; API-REV-001; CRR N/A; DR N/A | Sign-in reason shortened; checks green |

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

### IR-002 — Shorter sign-in reason (user request)

- Triggering role, report path and round: the user, directly, while testing the menu. They said the reason "looks too long … make the message cleaner". They chose option B, "Not signed in on this node. Run `agy` to sign in.", over "Please sign in: run `agy` on this node." and "Not signed in on this node."
- Triggering finding IDs: N/A
- Classification: `Local Fix`. It is user-approved and changes only REQ-001's fixed text (DEC-005 sign-in wording). The Solution Designer is notified so it can update the requirements text.
- Prior authoritative result: IR-001 sign-in text "Antigravity CLI is not signed in. Run `agy` in this node's terminal and complete sign-in, then try again."
- Current authoritative result: "Not signed in on this node. Run `agy` to sign in." Classification logic, pattern, other texts and UI are unchanged.
- Related solution revision IDs: SR-003 (requirements text update pending with the Solution Designer)
- Related API/E2E revision IDs: API-REV-001
- Related architecture-review, code-review and delivery revision IDs: N/A
- Why recorded: the user changed approved wording during validation.
- Approved behavior or requirement IDs affected: REQ-001 / AC-001 / AC-007 (text only); REQ-006 / AC-008 (docs quote the text).
- Implementation delta: the `DIAGNOSTICS.AGY_SIGN_IN_REQUIRED.message` string. Test expectations and doc quotes were updated, and two doc paragraphs were reflowed.
- Changed files or areas:
  - `antigravity-cli-capability.ts`;
  - tests: `antigravity-cli-capability.test.ts`, `agy-agent-run-backend-factory.test.ts`, `run-model-selection-service.test.ts`, `ChatModelMenu.spec.ts`, and the API/E2E-owned uncommitted `tests/e2e/runtime/agy-runtime-availability-graphql.e2e.test.ts` (expected string only);
  - docs: Docker README, `antigravity_cli_runtime.md`, web `chat.md`.
- Local validation and result:
  - focused server unit tests: 478 passed;
  - the GraphQL E2E file: 3/3;
  - web menu and composable specs: 17 passed;
  - server typecheck and build: passed;
  - rendered check `implementation-evidence/render-r3/`: GraphQL reason is the new text; the row shows the full text in 2 lines with no ellipsis; the reopen re-check and the no-request third open are unchanged; no page errors.
- Next recipient or routing: API/E2E (direct route; Small/Low unchanged) to re-confirm the new text. The Solution Designer is informed about the requirements text.
- Remaining limitations or risks: unchanged from IR-001. The AC-006 run leg is still blocked on provider quota.
