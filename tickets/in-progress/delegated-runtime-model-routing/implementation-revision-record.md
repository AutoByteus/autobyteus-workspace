# Implementation Revision Record — delegated-runtime-model-routing (autobyteus-32)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-002 Pass, ARCH-REV-003 Pass), round 1 | N/A | `Initial Baseline` | SR-015, SR-016, ARCH-REV-002, ARCH-REV-003 | Implemented; handed to Code Review |

## Revision Entries

### IR-001 — Model Router core: routing layer, Model Router agent, decision records, peer contract, page and run Settings rows

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/delegated-runtime-model-routing/design-review-report.md`, ARCH-REV-002 (SR-015) and ARCH-REV-003 (SR-016 delta)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: design change sequence steps 1–9 and the docs built; step 10's live-agents fold is
  left to API/E2E; implementation-scoped checks pass (see the handoff's Checks Run).
- Related solution revision IDs: SR-015, SR-016
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation of the approved package.
- Approved behavior or requirement IDs affected: REQ-001..012, REQ-014; DS-001..008; AC-001..009, AC-011, AC-012.
- Implementation delta: launch usability with node facts (U3/U4b while routing is on); the task lifecycle split into
  `prepareNewCopyWork` + `dispatchNewCopy`; the resolver's Model Router layer; the `model-routing` subsystem (router,
  one-at-a-time queue per SR-016, Model Router agent, sessions, request text, decision log, statistics, settings);
  `submit_launch_choices` with its MCP provider; the built-in internal Model Router template; run-config confinement
  (Codex `workspace-write`; Claude user settings only, no shell tools, `PreToolUse` write hook) and the
  `systemRunOwner` marker; internal workspaces; peer contract (`task`, `launches`, `modelRouting`,
  `MODEL_ROUTER_FAILED`, 50 s start bound); run-history launch sources and remote link launches; GraphQL; web page
  (Setup, Decisions, Overview, Runtimes) and run Settings rows (Model Router source, reason, View decision, remote
  rows); CM-12, GLOSSARY, module and web docs.
- Changed files or areas: see the handoff's Key Files Or Areas.
- Local validation and result: server typecheck and full unit suite, web specs of the touched areas, web guards, the
  rendered page on the development stack; see the handoff's Checks Run.
- Next recipient or routing: `code_reviewer` (Large/High).
- Remaining limitations or risks: live confinement, ~45 s tool-call time-outs on Claude SDK/Antigravity/Grok, the
  peer contract across a Docker peer and the desktop-app check are left to API/E2E and the user (see the handoff).
