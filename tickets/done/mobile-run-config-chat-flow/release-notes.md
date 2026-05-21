# Release Notes: Mobile Configure-Then-Chat Flow

## What's New

- Mobile **Start new** now mirrors the desktop mental model: configure an agent/team run, create it, then send the first message from Chat.
- Draft context files attached before mobile run creation are preserved into the new Chat composer.

## Improvements

- Removed setup-time `First message`, team `First message target`, and the repeated Launch Summary card from mobile Start new.
- Team message targeting now happens from the existing Chat **Message target** control before sending.
- Team draft attachments stay pending at team-run scope across focus changes and flush to the selected focused leaf member on first send.

## Fixes

- Fixed mobile temporary-run promotion after first Chat send so agent and team Chat contexts reconcile to the permanent backend run ids and the composer remains visible.

## Notes / Residual Gaps

- Full Nuxt typecheck remains repository-wide red from unrelated existing diagnostics; focused mobile/config/composer/store suites passed and exact changed-source-path filtering emitted no diagnostics.
