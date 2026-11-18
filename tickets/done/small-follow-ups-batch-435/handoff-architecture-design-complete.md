# Handoff — Architecture Design Complete (autobyteus-435, SR-001)

## Result

- Classification: `Architecture Design Complete`
- Package identifier: `small-follow-ups-batch-435` (Project Task `autobyteus-435`, project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Solution revision: `SR-001`
- `task_size`: `Medium`; `architectural_risk`: `High` (live-stream lifecycle in all five web stream owners plus a page-wide close on phone session end; phone route contract + page-start restore; GraphQL digest semantics for inactive hosts). Rationale: design-spec § Task Size And Architectural Risk.
- Next expected action: independent architecture review of the package below.

## Original Request

Task autobyteus-435: a batch of 12 small follow-ups — (1) phone page start requests `localhost:8000/health`; (2) Nodes page says "can't reach" for a name the node's Host gate refuses (no CORS on refusals without the user's security decision); (3) dead `diagnosticFromWebSocketClose`; (4) dead `utils/dateUtils.ts`; (5) full screen ignores the camera-cutout strip; (6) viewer route names no run, so a process-death restore lands on Home; (7) keyboard covers the Clipboard sheet's Send in landscape full screen; (8) technical HTTP error words on Android; (9) Retry after a pairing link's first page failed loses the code; (10) a revoked phone's live connections retry for ever (446: "schedule soon"); (11) a Task closed while its host run is stopped leaves rows until reload; (12) the task-execution key is defined three times. Plus the 432 residual: note Android's one-time full-screen hint in the guide.

Constraints: no change to the security rules (autobyteus-403, -416); no CORS on Host-gate refusals; no new Android permission; tests; DESIGN.md and TESTING.md; release only on the user's word. Done when: every item done or dropped with evidence; tests; finalized on the base branch.

## Approval Basis

- Requirements `Approved` by the Solution Designer within the Task's direction; the user was informed in the Solution Designer's conversation on 2026-11-10. No decision is `Needs user`. Decisions DEC-001…013 (requirements doc) record the reasoning, including three corrections of the Task's leads within its direction: item 1's requester is the `ServerLoading` overlay, not the plugin; item 2 is a window-only opaque request (a node-side check would break one-nodes-tab DEC-709 (b) while Remote Collaboration is off, the default); item 10 makes only credential refusals final, so Phone Access off still resumes by itself.
- No item is dropped.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435`
- Branch: `codex/small-follow-ups-batch-435`
- Base: `origin/personal` @ `310fc27452be3d3f44459c89f59c70d8ff40ea02`; finalization target `origin/personal`
- The ticket documents are in `tickets/in-progress/small-follow-ups-batch-435/` (not committed yet).

## Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/solution-revision-record.md`
- Follow-ups: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/follow-ups.md` (FU-001 browser Settings health URL; FU-002 three files already over 500 lines)
- Supplements: none behavior-defining.

## Evidence Highlights

- Item 1 (Read): `app.vue:4-8` mounts `ServerLoading` in every browser (default embedded entry); its mount calls `checkServerHealth()` → `new URL('/health', restBaseUrl)`; `serverStore.initialize()` already skips browsers.
- Item 2 (Measured): Chromium `file://` page — refused name: readable GET fails, `no-cors` GET resolves opaque; closed port: both fail.
- Item 10 (Read + archived runtime): five owners' close rules; catch-up reads refused → `connectionLost()` → retry for ever; no registry closed on session removal.
- Item 11 (Read): in-memory `closedTaskExecutionsIn(root)` makes a stopped host's digest cheap.
- Uncertainty: other cutout devices than the emulator (UNK-001); item 11 not run (as in 446) — API/E2E runs it.

## Reproduction For Implementation

`pnpm -C autobyteus-web test:e2e:mobile-shell` after removing the FU-003 exemption and adding the post-MSP-13 "no refused request from the revoked phone" check: fails on base, must pass after items 1 and 10. Item 2: probe script in design-spec § Concrete Examples.

## Open Risks

- Item 10 changes reconnect behavior for desktop windows too (credential refusal → no retry); network loss, node restart, Phone Access off and network refusal keep retrying.
- Item 6 restore ordering versus the subject-less-view redirect.
- Files already over 500 lines must not grow (design-spec § Guidance).

## Route

- Handoff rules applied (2026-11-10): rule "Architecture Design Complete with task_size=Large or architectural_risk=High … ready for independent architecture review" → `/software_engineering_team/architecture_reviewer`. The direct-implementation rule does not match (risk High).
