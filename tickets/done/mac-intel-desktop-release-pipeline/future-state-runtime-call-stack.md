# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/mac-intel-desktop-release-pipeline/requirements.md`
- Source Artifact: `tickets/in-progress/mac-intel-desktop-release-pipeline/implementation-plan.md`
- Source Design Version: `v1`

## Use Case Index

| use_case_id | Source Type | Requirement ID(s) | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- |
| UC-001 | Requirement | REQ-001 | Existing ARM64 mac build path retained | Yes/N/A/Yes |
| UC-002 | Requirement | REQ-001, REQ-003, REQ-004 | New Intel mac build path generates x64 artifact | Yes/N/A/Yes |
| UC-003 | Requirement | REQ-002, REQ-004 | Release publish includes Intel mac asset | Yes/N/A/Yes |

## Use Case: UC-002 New Intel mac build path

```text
[ENTRY] .github/workflows/release-desktop.yml (workflow_dispatch/tag)
└── jobs.build-macos-x64 (runs-on macos-13)
    ├── checkout + setup steps
    ├── run pnpm build:electron:mac -- --x64 [ASYNC]
    └── upload-artifact name=macos-x64 (dmg, blockmap, latest-mac.yml) [IO]
```

## Use Case: UC-003 Publish includes Intel asset

```text
[ENTRY] jobs.publish-release
└── needs = build-macos-arm64 + build-macos-x64 + build-linux
    ├── download-artifact release-artifacts [IO]
    └── softprops/action-gh-release publishes *.dmg assets [IO]
```
