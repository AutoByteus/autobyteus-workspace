# AutoByteus v1.4.37

## User-visible changes

- Keep Files, team references, navigation, and ordinary controls responsive while runtimes emit very small streaming text deltas.
- Preserve exact live content and semantic ordering by batching presentation work at a runtime-independent bounded cadence and flushing before lifecycle boundaries.
- Show voice-input startup immediately, prevent duplicate starts, and clean up permission or AudioWorklet failures without leaking media resources.
- Keep Composer and Settings voice operations source-isolated so leaving one surface cannot cancel the other's capture or an in-progress transcription.

## Compatibility and data

- No provider-specific branch, backend protocol change, persisted-schema change, or data migration is introduced.
- Existing agent/team memory, raw traces, run history, and managed Voice Input extension assets remain directly usable.

## Validation

- Integrated focused Nuxt boundary: 17 files / 209 tests passed; after a later docs-only base refresh, the 3 critical stream/voice owner files / 84 tests also passed.
- API/E2E authority: `API-REV-001` Pass at 97.4% confidence with every AC-01–AC-07 critical criterion directly proven.
- Sustained native run: 17,439 content events, 121,669 characters over 560.8 seconds; 3 ms p95 timer drift; zero attributable stalls above 500 ms; renderer CPU mean/p95 18.23%/37.3%.
- Active-stream p95 latency: workspace files 39.669 ms; team references 84.686 ms.
- Electron voice lifecycle, Codex/idle controls, persistence controls, production build, guards, localization audit, and proportional durable-test review passed.

The local macOS ARM64 package was verified by the user before repository
finalization. This release uses the repository's documented tag-driven release
workflow; platform signing, publication, and rollout evidence are recorded in
the ticket's delivery report.
