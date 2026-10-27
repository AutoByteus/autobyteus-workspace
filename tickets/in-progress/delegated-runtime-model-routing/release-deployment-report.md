# Delivery / Release / Deployment Report — autobyteus-32 (Model Router core)

## Release / Publication / Deployment Scope

Model Routing (switch, Model Router agent, one-at-a-time routing, decision log and statistics, peer contract), Settings → Model Routing and run Settings rows, durable tests and docs. Finalization target: `origin/personal`. Release: **Beta**, as the user asked ("if everything goes fine. please release a new beta").

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `83e8e12125` (unchanged by the 98 base commits; checked after the merge)
- Deviations from the guide and why: none so far
- Proposed guide fixes: `None`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `d74f75a51a`
- Latest tracked remote base reference checked: `origin/personal` @ `50e93c2108`
- Base advanced since bootstrap: `Yes` (98 commits: embedded browser history, backend port recovery and native command shutdown, MCP secrets, release 1.5.9-beta.10, and more)
- Local checkpoint commit result: `Completed`. `67bb22ce04` holds the design package, review records, test review and follow-ups that were uncommitted.
- Integration method: `Merge` → `357936966c`
- Integration result: `Completed`
  - One conflict, `docs/design-cases.md`: both sides added a Case 9. Both were kept; this ticket's case became Case 11.
  - Four files were auto-merged on both sides: `GLOSSARY.md`, `schema.ts`, `build-studio-server.ts` and `autobyteus-web/package.json`.
  - In `build-studio-server.ts`, the Model Routing release sits inside the base's new `closeProcessResources`, which both shutdown paths call.
- Post-integration executable checks rerun: `Yes` (`evidence/delivery/DEL-01-post-integration-reruns.log`):
  - install, server typecheck and server build: exit 0;
  - model-routing E2E 9/9 and internal-agents E2E 5/5, run alongside the unit suite;
  - two-server E2E 41/41;
  - server unit 7125 passed and 3 failed; the 3 fail on the base too (DEL-02, FU-010);
  - the ticket's web specs 25/25, and all three web guards pass;
  - full web suite: 1 new failure (DEL-F1); the other failures fail on the base too or are a load flake (DEL-03);
  - the merged desktop build in an isolated instance: Model Routing smoke passes, no browser errors (DEL-04).
- Post-integration verification result: **`Blocked`** by DEL-F1
- Delivery edits started only after integrated state was current: `Yes`

## Blocker

- **DEL-F1:** `autobyteus-web/utils/agents/__tests__/builtInAgentDefinitionIds.contract.spec.ts` fails after the merge: expected [`autobyteus-daily-assistant`] to equal [`autobyteus-daily-assistant`, `autobyteus-model-router`].
  - The base added (DI-002) a web mirror of the server's built-in agent IDs (`autobyteus-web/utils/agents/builtInAgentDefinitionIds.ts`), with this contract test. This branch added `MODEL_ROUTER_AGENT_DEFINITION_ID` on the server.
  - Effect: the draft `@` mention list (`draftMentionEligibility.ts`) offers the Model Router while "Show internal agents" is on, and the server refuses it, because built-ins are never `@` candidates.
  - The test passes on the base (`DEL-03`).
- **DEL-F2 (minor, same fix round):** this ticket's copy still says "Setup" where the page's tab is "Configuration":
  - en `decisions.inactiveNote` ("See Setup for why."), `decisions.emptyOffHint` and `overview.emptyOffHint` ("Turn Model Routing on in Setup.");
  - zh-CN "请在“设置”中…", while the tab reads 配置.

  Seen in the merged desktop build (`DEL-04-merged-desktop-decisions-empty.png`).
- Classification: `Local Fix`
- Recommended recipient: the implementation engineer
- Why final handoff could not complete: a post-integration rerun fails, so delivery is blocked until the fix (DEL-F1 is code). The beta waits for it.

## Verification (in progress)

- The critical evidence was opened and holds. Files checked:
  - MR receipt: MR-02 sources and result lines, MR-03 corrected/silent, MR-04 busy, MR-05 blocked, MR-06 signed out, MR-07 hidden/shown, MR-08 tools, MR-09 recovery;
  - RC-39…41;
  - API-13 D-1…D-4;
  - L-05 on five runtimes (`knowledge.lineAdded` true, `routedByRouter` true, no collaboration tools);
  - L-03/04;
  - LR-3 (Claude's four-runtime failure passes alone);
  - API-14 MRD-01…07;
  - API-15.
- **User check needed: `Yes`.** The Task's "Done when" requires "the user has verified it in the desktop app" (verbatim from the code reviewer's handoff). It is not optional.
  - The user asked for a beta. The beta is the build the user can check in their own desktop app; the API-15 guide's steps apply.
  - The terminal receipt waits for the user's check.
