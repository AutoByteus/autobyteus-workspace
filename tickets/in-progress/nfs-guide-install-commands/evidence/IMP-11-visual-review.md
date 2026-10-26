# IMP-11 rendered-result inspection

- Date: 2026-10-24; source `3d95a5c4a16759060983489735e77820661cff53`.
- Environment: Darwin arm64, Node22.23.1, Chrome156.0.8078.47, private HOME/TMP; actual component/localization/styles in isolated Nuxt fixture.
- Command: `node tickets/in-progress/nfs-guide-install-commands/evidence/IMP-11-preview.mjs IMP-11-verified`.
- Final result: **Pass**, four locale/viewport states, nine cards each, exactly one advanced README anchor, eight real clipboard samples; keyboard/timer/denial/null/partial controls pass; zero captured browser errors.
- Directly inspected `IMP-11-verified/en-1280.png` and `IMP-11-verified/zh-390.png`: no standalone download/script-review links or reserved space; desktop two-column and narrow stacked cards retain readable hierarchy, Copy buttons and advanced link. Long commands scroll within cards, not the document. Existing guidance remains visible. Top fixture switches are test-only, not app UI.
- Each state measures only17px existing padding/border below the installer card grid; page scrollWidth equals viewport width. No style correction needed.
- Fixture corrections: first attempt lacks newly reached update-settings query and fails on Apollo error; second passes assertions but is superseded after correcting its nested GraphQL typename. Final fixture uses the actual `AutomaticUpdates` type; earlier logs/results retained.
- Limits: component-level implementation feedback, not actual Nodes composition, Electron/backend/NFS or API/E2E acceptance. No installer executed. Cleanup in IMP-13-cleanup.json.
