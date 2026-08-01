# AutoByteus v1.4.36

## HTML file preview safety and correctness

- Use explicit workspace resource identity for workspace-relative HTML previews.
- Render local or context-free absolute HTML from the already-loaded content Blob instead of sending host paths to the workspace static route.
- Preserve iframe sandboxing and Blob URL cleanup behavior.
- Keep server-side static-route containment enforced for absolute and traversal candidates, with no outside HTML payload exposure.

## Validation

- Frontend focused: 6 files / 80 tests passed.
- Preservation: 3 files / 22 tests passed.
- Server REST: 2 files / 8 tests passed.
- Electron boundary: 4 files / 19 tests passed.
- Browser direct and launcher probes passed in the upstream coverage run.

This is a local unsigned/notarization-disabled ARM64 build validation; release publication remains subject to the final packaged-artifact verification and repository release workflow.
