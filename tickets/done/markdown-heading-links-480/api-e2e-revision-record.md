# API/E2E Revision Record — markdown-heading-links-480 (autobyteus-480)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md` IR-001 (direct route), round 1 | SR-002, IR-001 | N/A | Pass / 96% |

## Revision Entries

### API-REV-001: the design's step 4 on the phone viewer, the Files panel, the Skills page and conversations

- Triggering role, report path, and round: Implementation Engineer (`implementation_engineer_44ba59b16f6d4d7fbd956032ecc846ae`), `implementation-handoff.md` IR-001, round 1; code `45e456b8b0`, documents `0afe5ee975`.
- Triggering finding or case IDs: the handoff's "Still yours":
  - the phone viewer and the Skills page;
  - a conversation message with its own Contents, and two with the same headings;
  - broken and relative links on each surface;
  - preserved external, file-action and `mailto:` links.
- Related revision IDs: SR-002, IR-001.
- Why this baseline was recorded: first API/E2E result.
- Coverage decisions or durable test paths changed: new `mobile-heading-links-cases.mjs` (MSP-44…46) and its wiring in `mobile-shell-probe.mjs` (`524e4f9be7`).
- Cases added, changed, removed, or rechecked:
  - reused API-01 (IMP-01…03);
  - new MSP-44, MSP-45, MSP-46;
  - run API-02 (build), API-03 (full phone probe, 46 cases), API-04 (red on base).
- Commands, environment, fixture, or broader-validation delta:
  - the phone probe's own nodes;
  - the desktop `nuxt dev` window and a paired headless phone on alpha;
  - a skill created through public GraphQL;
  - Markdown messages from a delegator (`send_message_to`), because the scripted runtime's answers are quoted;
  - a stub route for the external address.

#### Prior Failure Resolution

None (first round).

- Canonical artifacts and sections updated: investigation, execution report, test progress log, evidence.
- Prior result and confidence: N/A.
- Current result and confidence: Pass, 96%.
- New or remaining failure IDs: none.
- Recommended owner: Delivery Engineer.
- Remaining risks, blocked evidence, or untested scope: Windows/Linux not run; the packaged window's external-link handler (unchanged code) not exercised; FU-001 unchanged.
