# Handoff Summary

## Summary Meta

- Ticket: `restart-notice-continue` (Project Task `autobyteus-585`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Date: `2026-11-22`
- Classification: `task_size: Small`, `architectural_risk: Low`, direct route. Architecture review, code review and test-code review: `Not Applicable`.
- Current Status: `Verified from evidence / finalized on personal; no release`
- Branch: `codex/restart-notice-continue`, base `origin/personal` @ `0da6bfbfc1`. Integrated by merge of `a07d6fbac8` (77 commits) as `f2330b7f4e`. Code `75e085d889`; test fix `b42a45e4aa`.

## Delivery Summary

- Part 1, the notice wording, was dropped by the founder (DEC-001: 30 of 31 sampled agents continued after a restart). No server code or notice text changed.
- Part 2: every platform notice is its own light, labelled row in the conversation, never inside the agent's message, on desktop and phone (DEC-002).
  - Rows: the agent's row, the notice row (an icon instead of an avatar, the label as the speaker line, a muted body), then the agent's next row.
  - On the phone, the next row shows the agent's avatar and name again.
- Labels: Application restarted, Skill updated, Tools updated, Agent runtime changed, Background tasks finished, otherwise Platform notice (zh-CN, e.g. 应用已重启). The `[Platform notice — …]` first line is no longer repeated in the body.
- One row per notice live and after a reload. The message's usage line shows once.
- Docs: web `agent_execution_architecture.md` (implementation). At delivery, "card" became "notice row" in server `restart_resume.md` and `tool_list_updates.md`.

## Verification Summary

- Verified from evidence by delivery; no user check needed. AC-001..AC-007 are directly proven; no accepted-risk criteria.
- Key evidence:
  - `evidence/api-e2e/desktop/desktop-notice-row.png`: user, agent with tool card, "Application restarted" row with an icon, no avatar and a CET time, agent reply, usage once.
  - `evidence/api-e2e/phone-msp75-99/MSP-99-wake-notice-live.png`: agent row, "Background tasks finished" row, the agent's avatar and name again.
  - `phone-msp75-99/mobile-shell-probe.json`: MSP-75 rows 1 → 2 → 2 after a reload, inputs and replies `[1, 1, 1]`; MSP-76 (Team) and MSP-77 (Org) 1 row live and after a reload.
  - Full web unit suite 793/793 files; the whole phone suite 91 pass, with MSP-44/45 failing on the base too (FU-001).
- Final confidence: 95%.
- Merged state: web typecheck 86/36 and server typecheck 1000/313 at baseline; the three web guards pass; 751 targeted web tests pass; the notice-row probe passes; the phone probe has no duplicate case IDs (96 cases).
- Secret Gate PASS on the ticket commits and the merged state; artifact hygiene PASS.

## Residual Risks For The User

- The real desktop app was not opened. The probe draws the real feed with a fixture conversation; live delivery is proven on the phone with real restarts.
- The desktop Team and Org views use the same components as the probe, with no separate desktop run.

## Follow-ups

- `follow-ups.md`:
  - FU-001: phone cases MSP-44/45 (heading links) fail on the base too.
  - FU-002: the app has no dark theme, but some conversation components follow the system's dark mode. A notice body becomes pale on white (slate-300, better than the base's near-white). Whether to add a dark theme is a product decision.

## Release

- No release: the user did not ask, which is RELEASE.md's default. `release-notes.md` holds the notes for the next release.
