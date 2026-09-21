# IR-003 rendered implementation self-check
Actual TeamWorkspaceView / RunningAgentsPanel / shared draft form with synthetic IO fixture, not downstream API acceptance. Owned Nuxt127.0.0.1:50983; fresh headless Chrome. No backend/provider/user profile or persisted run used.

browser.mjs interacted with actual header/group create controls: pending read, failure status with source preserved, same-action retry, canonical budget0 visible in editable ordinary Team draft. Screenshots inspected at1280x850 and760x850: error wrapping, retained header/composer, group status, form layout. results.json records both journeys and zero page errors. fixture.vue documents the explicit simulated resume/model/workspace responses; it is NOT a real Save or server allocation reproduction (durable TeamCanonicalPlus.spec.ts owns the local actual Save→copy→Create serialization path).

Owned server stopped, Chrome closed, temporary pages/__impl-team-copy.vue removed before production build. No actual runtime Send/Create in browser. Current workspace list fixture is synthetic too; no user data loaded. Actual Stop→Save→Back→Plus→Create and new persisted IDs remain API F-003 first.
