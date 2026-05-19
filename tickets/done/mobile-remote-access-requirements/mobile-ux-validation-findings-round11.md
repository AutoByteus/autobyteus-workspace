# Round 11 Mobile UX Validation Findings — Functional Parity Pass With Polish Follow-Up

## Scope

Round 11 API/E2E validation ran against the latest-base integrated branch `codex/mobile-remote-access-requirements` at HEAD `25ce7ce351cdb0709e20cba3fc00e07993e62156` on 2026-05-19.

The validation used a realistic 390x844 mobile viewport, the local AutoByteus backend at `http://127.0.0.1:29695`, and real Codex App Server execution with `gpt-5.5` for both single-agent and team launch smoke tests. Pairing/session storage was locally fixture-seeded because the currently running local backend returned 404 for the Remote Access pairing/status REST endpoints, while the authorized GraphQL/workspace/run/file APIs were reachable.

## Summary Judgment

The mobile journey is justified for the MVP functional-parity goal. The following desktop-web-equivalent journeys were completed from the phone-first mobile shell:

- Home status/recent work/primary action.
- Continue existing Codex agent run and see the real Codex/GPT-5.5 response.
- Send a follow-up message from mobile after attaching `README.md`; the run responded successfully.
- Continue existing Software Engineering Team run.
- Use the bottom nav one task at a time: Chat, Runs, Files, Activity.
- Browse/search/preview/attach a workspace file.
- View Activity cards, team messages, run/tool-history area, and unsupported terminal notice.
- Start a new ClassRoomSimulation team run with Codex/GPT-5.5 defaults and receive the expected team response.
- Open stale `/mobile/workspace` and see the phone-first unsupported desktop-workspace notice instead of stale desktop UI.
- Open desktop `/workspace` and confirm it did not render the mobile shell.

No new blocking mobile UX or user-journey failure was found in Round 11. The remaining items below are product/UX polish or future design decisions, not immediate implementation blockers unless product chooses to tighten the MVP bar.

## UX-MRA-050 — Runtime/model visibility remains too generic for confident mobile launch

### Observation

Run Setup still shows the runtime/model summary as `Existing desktop defaults`. During validation, the requested real runtime/model was Codex App Server + `gpt-5.5`; to guarantee that from mobile, validation used a browser-only default-launch fixture for the Codex/team definitions. The actual launched runs did use `codex_app_server` and `gpt-5.5`, but a normal phone user cannot verify that value in the mobile Run Setup screen.

### Why it matters

The current behavior is functional if mobile intentionally inherits desktop defaults. However, when a user is about to spend time or tokens launching a real run, `Existing desktop defaults` does not confirm what runtime/model will actually be used.

### Suggestion

Keep the simplified MVP, but improve confidence:

1. Show the resolved runtime/model when available, for example: `Runtime/model: Codex App Server · gpt-5.5`.
2. If resolution is unavailable until launch, use clearer copy: `Uses this agent/team's desktop default runtime/model`.
3. Consider a collapsed `Advanced` section later for phone-side runtime/model override, but this is not required for the current MVP if desktop defaults remain the product decision.

## UX-MRA-051 — Mixed status copy is correct but could be calmer and more actionable

### Observation

The local validation environment reproduced the intended mixed state: authorized work data loaded while the Remote Access status endpoint was unavailable. The UI correctly showed `Node reachable · Phone Access status unavailable` and did not falsely declare the desktop unreachable. Later, a true current-cycle network failure correctly showed Offline/Cannot reach desktop.

### Why it matters

The behavior is correct, but the wording and severity are important because this state can happen during version mismatch or partial endpoint availability. Users should understand that work can continue when catalog/run/file APIs are working.

### Suggestion

Keep the current logic. If polishing copy, emphasize: `Work data is available; status endpoint unavailable` plus a short `Refresh after desktop update` recovery. Avoid making this state feel equivalent to true offline.

## UX-MRA-052 — Activity is now reachable, but long team messages/tool history still need better drill-in ergonomics

### Observation

Activity now has filters, compact summaries, team message details, run/tool history, error/approval chips, and an unsupported terminal/browser/tool-pane notice. This is functional and passes the MVP. Real team handoff messages can still be very long on a phone.

### Why it matters

Long inter-agent messages and tool logs are valuable, but dense reading on mobile is hard. The current UI makes the data reachable; the next polish pass should optimize scanning and drill-in.

### Suggestion

- Keep compact rows as the default.
- Use full-screen detail sheets for long message/log bodies.
- Add `Copy`, `Open full`, and section-level collapse for long entries.
- Keep the unsupported terminal/browser/tool-pane notice short and below the readable history.

## UX-MRA-053 — Attachment visibility works; removal affordance can be more phone-obvious

### Observation

File preview, attach-to-chat, context tray, and attachment send all passed. The composer context tray shows the file count and attached item, with `Clear` and per-file `×` controls.

### Why it matters

The controls are functional, but the small per-file `×` can be easy to miss on touch screens. Accidental attachments should be easy to remove before launch/send.

### Suggestion

Keep the tray near the send/launch decision. Consider a larger touch target or explicit `Remove` text for attached files on phone.

## UX-MRA-054 — Team/new-run setup works; target confirmation should stay visually prominent

### Observation

New team launch worked after intentionally selecting `ClassRoomSimulation`, workspace, prompt, and Codex/GPT-5.5 defaults. When starting from an existing team context, Run Setup correctly carries context-derived defaults, but the final target/workspace/runtime summary is the user's last checkpoint before launch.

### Why it matters

Mobile screens make accidental launch target selection more likely than desktop. The current picker and summary are good enough for MVP; preserving and strengthening that summary will reduce wrong-run launches.

### Suggestion

Keep `Current context` grouping and no arbitrary first-item defaults. Make the launch summary visually emphasize:

- target agent/team,
- workspace,
- runtime/model source or resolved value,
- attached context count.

## Recommendation

Do not treat these as blocking implementation defects. If the team wants a product polish pass before delivery, route this artifact to `solution_designer` for a focused mobile UX follow-up. If the MVP boundary accepts inherited desktop defaults and compact-but-functional Activity/Files behavior, the Round 11 implementation is functionally ready to continue toward delivery.
