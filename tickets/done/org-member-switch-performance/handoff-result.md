# Solution Designer Handoff Result

## Result Classification

- Result: `Architecture Design Complete`
- Package identifier: `org-member-switch-performance`
- Current solution revision: `SR-003`
- task_size: `Small`
- architectural_risk: `Low`
- Route: direct implementation, per handoff rule "task_size=Small or Medium and architectural_risk=Low → /implementation_engineer". Independent architecture review artifacts: `N/A — not applicable` (direct route).

## Original Request

The user reported that in a long-running Agent Org, clicking another member (e.g. api e2e engineer → code reviewer) while the right-side **Org** tab is open is very slow. They asked for a reproduction and the root cause, suspecting raw traces or over-engineering.

## Findings (evidence in investigation notes)

- Reproduced on an isolated snapshot of the user's org with a production build: 3.2–4.2 s per switch with the Org tab, versus 5–51 ms with the Files tab.
- The cause is not raw traces or message count. It is **reference files**. Agents re-attach cumulative file lists, up to 3,136–3,261 per message, so code reviewer's 42 messages carry 41,965 references.
- Per switch, the Messages panel projects the list twice, hashing every reference with crypto-js SHA-256 (~1.5 s), then mounts a row and icon for every reference (~1.3–1.8 s, 188,589 DOM nodes).
- A throwaway spike of the approved mechanics reached 26–82 ms per switch and 254 ms for "Show all 3,136".
- Message count is not a bottleneck (max 241 per member across 877 runs). The user confirmed no message paging.

## Approved Scope

- Approval: user, 2026-10-04 (quote in `requirements-doc.md` Document Status). Option A approved. The producer side (agents' cumulative attachments) is excluded; it belongs to the agent package project. Mobile is excluded.
- Preview count: 20 files. The user's "25 hours" is treated as a speech transcription of the approved mockup's 20. It is one constant (`REFERENCE_PREVIEW_LIMIT`); change it only if the user says otherwise.

## Expected Output From Implementation

Implement `design-spec.md` exactly:
1. `agentOrgReferenceProjection.ts`: memoized on-demand `referenceId` getter, same hash and shape.
2. `CollaborationMessagesSection.vue`: compute `listMessages()` once and pass `rows` to the Panel.
3. `CollaborationMessagesPanel.vue`: required `rows` prop; paperclip file count on every message with references; reference rows only under the selected message, first 20, then "Show all N files"; Show-all resets on message/member/root change but not on same-message live updates.
4. en + zh-CN locale keys `reference_count_label`, `show_all_references`.
5. Spec updates and additions as listed in the design's Change / Refactor Sequence.

Constraints: no caches, stores, `markRaw`/`shallowRef`, virtualization, or server/API changes. If the targets cannot be met without them, return a Design Impact.

Acceptance targets: every switch ≤ 200 ms; ≤ 50 reference rows after a switch; Show all ≤ 300 ms. Harness: `probes/measure.mjs`, `probes/measure-spike.mjs`.

## Artifacts (absolute paths)

- Requirements (Approved): `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/investigation-notes.md`
- Design spec (Ready): `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/solution-revision-record.md`
- Probes: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/probes/` (`measure.mjs`, `measure-spike.mjs`, `minimal-spike.patch`, `reference-projection-bench.mjs`, `analyze-profile.py`, `explore.mjs`)
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/evidence/`
- Architecture review artifacts: `N/A — not applicable`

## Workspace Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance`
- Branch: `codex/org-member-switch-performance`
- Base: `origin/personal` @ `26b555126ebcda7d9fa80d728e24475baba7acb8`
- Finalization target: `origin/personal`
- Worktree state: source clean (spike reverted). Untracked: the ticket folder, and build outputs `autobyteus-application-*/dist/` and `autobyteus-web/dist`/`.nuxt`/`.output` from the reproduction builds (not to be committed). `node_modules` installed.
- Isolated reproduction snapshot: `/tmp/org-switch-repro/data` (org run + one team run; minimal `.env`, no secrets). Start the backend with the installed v1.4.94-beta.2 server on port 29811 and serve a production build built with `BACKEND_*` URLs pointing to it on port 29812 (exact commands in the investigation notes Runtime findings).

## Open Risks / Next Expected Action

- UNK-002: confirm in the Electron app as well as headless Chrome.
- Producer-side ticket (agent package project) and mobile follow-up are outside this package.
- Next: Implementation Engineer implements and self-checks, then routes per its rules.

## Applied Handoff Rules

- `get_handoff_rules` returned three rules. The matching rule is "Small or Medium and Low → `/implementation_engineer`". The architecture-review rule (Large/High) and the delivery-receipt rule do not match.
- Route recorded: `send_message_to` → `/implementation_engineer`.
