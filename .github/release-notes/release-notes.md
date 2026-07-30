# AutoByteus 1.4.30

## Trusted-local file tools

- Generic file tools now support absolute local paths outside the selected workspace.
- Relative file paths require an explicit absolute `base_dir` for that invocation.
- Protected AutoByteus internal paths remain denied, including protected descendants and symlink traversal.
- Terminal working-directory authorization remains workspace-contained and separate from file-tool path resolution.

## Validation

- Added protected-path coverage across all five generic file tools.
- Validated the packaged macOS arm64 Electron build and packaged terminal runtime.
- No persisted-data migration is required.
